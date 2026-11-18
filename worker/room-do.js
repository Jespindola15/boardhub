import { DurableObject } from 'cloudflare:workers';
import { Room, RoomError } from '../server/core/room.js';
import { handleRequest, messagesFor } from '../server/core/protocol.js';

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

function safeSend(ws, msg) {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* conexión ya cerrada */
  }
}

/**
 * Una sala de BoardHub = un Durable Object.
 * - Estado oficial en su almacenamiento (sobrevive a reinicios y despliegues).
 * - WebSockets con hibernación: el objeto puede "dormirse" sin cortar las conexiones;
 *   cada socket guarda su playerId en su attachment.
 * - Cloudflare entrega los mensajes de a uno: no hay carreras entre jugadores.
 */
export class RoomDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.room = null;
  }

  async load() {
    if (!this.room) {
      const data = await this.ctx.storage.get('room');
      this.room = data ? new Room(data) : null;
    }
    return this.room;
  }

  async save() {
    const code = this.room.data.code;
    if (this.room.empty) {
      await this.ctx.storage.deleteAll();
      this.room = null;
      await this.publish(code, null);
      await this.report(code, null);
      return;
    }
    await this.ctx.storage.put('room', this.room.data);
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
    await this.publish(code, this.room.listing());
    await this.report(code, this.room.data.status);
  }

  lobby() {
    return this.env.LOBBY.get(this.env.LOBBY.idFromName('main'));
  }

  /** Avisa al registro del tope de mesas (sólo si cambió la etapa o las conexiones). */
  async report(code, status) {
    if (!this.env.LOBBY) return;
    const connected = status ? this.ctx.getWebSockets().filter((ws) => ws.readyState === 1).length : 0;
    const key = status ? `${status}:${connected}` : null;
    if (key === this.lastReport) return;
    this.lastReport = key;
    try {
      await (status ? this.lobby().track(code, status, connected) : this.lobby().untrack(code));
    } catch (e) {
      this.lastReport = undefined;
      console.error('registro', e);
    }
  }

  /** Mantiene al día el listado de salas públicas (sólo si cambió). */
  async publish(code, listing) {
    if (!this.env.LOBBY) return;
    const key = listing ? JSON.stringify({ ...listing, updatedAt: 0 }) : null;
    if (key === this.lastListing) return;
    this.lastListing = key;
    try {
      const lobby = this.env.LOBBY.get(this.env.LOBBY.idFromName('main'));
      await (listing ? lobby.upsert(listing) : lobby.remove(code));
    } catch (e) {
      this.lastListing = undefined;
      console.error('lobby', e);
    }
  }

  /** RPC desde el Worker: crear la sala con este código. */
  async create({ code, gameId, name, options, visibility }) {
    if (await this.load()) return { exists: true };
    try {
      const { room, seat } = Room.create({ code, gameId, name, options, visibility });
      this.room = room;
      await this.save();
      return { ok: true, code, playerId: seat.playerId, token: seat.token };
    } catch (e) {
      if (e instanceof RoomError) return { ok: false, error: e.message };
      throw e;
    }
  }

  async fetch() {
    const room = await this.load();
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null });
    if (!room) {
      safeSend(server, { ev: 'room:missing', data: {} });
      server.close(4004, 'sala inexistente');
    } else await this.report(room.data.code, room.data.status);
    return new Response(null, { status: 101, webSocket: client });
  }

  conns() {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws.readyState === 1)
      .map((ws) => ({ ws, ...(ws.deserializeAttachment() ?? {}) }));
  }

  online() {
    return new Set(this.conns().map((c) => c.playerId).filter(Boolean));
  }

  broadcast() {
    if (!this.room) return;
    const on = this.online();
    for (const c of this.conns()) for (const m of messagesFor(this.room, c, on)) safeSend(c.ws, m);
  }

  async webSocketMessage(ws, raw) {
    const room = await this.load();
    if (!room) return;
    let msg;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      return;
    }
    const att = ws.deserializeAttachment() ?? {};
    const conn = { playerId: att.playerId ?? null, rate: att.rate };
    const before = conn.playerId;
    const r = handleRequest(room, conn, msg.ev, msg.payload, { rateLimit: Number(this.env.RATE_LIMIT) || undefined });
    ws.serializeAttachment({ playerId: conn.playerId, rate: conn.rate });
    safeSend(ws, { re: msg.id, data: r.reply });

    if (r.kicked) {
      for (const c of this.conns()) {
        if (c.playerId !== r.kicked) continue;
        safeSend(c.ws, { ev: 'room:removed', data: {} });
        c.ws.serializeAttachment({ playerId: null });
      }
    }
    if (r.changed || before !== conn.playerId) {
      await this.save();
      this.broadcast();
    } else if (r.resend) {
      for (const m of messagesFor(room, conn, this.online())) safeSend(ws, m);
    }
  }

  async webSocketClose(ws) {
    try {
      ws.close();
    } catch {
      /* ya cerrado */
    }
    const room = await this.load();
    if (room) {
      this.broadcast(); // actualizar "conectado/desconectado"
      await this.report(room.data.code, room.data.status);
    }
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }

  /** Limpieza de salas inactivas. */
  async alarm() {
    const room = await this.load();
    if (!room) return;
    if (Date.now() - room.data.updatedAt >= ROOM_TTL_MS && this.conns().length === 0) {
      const code = room.data.code;
      await this.ctx.storage.deleteAll();
      this.room = null;
      await this.publish(code, null);
      await this.report(code, null);
    } else {
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
    }
  }
}
