import { DurableObject } from 'cloudflare:workers';
import { occupiesSlot } from '../server/core/limits.js';

/** Una sala pública sin novedades por más de este tiempo deja de listarse. */
const STALE_MS = 3 * 60 * 60 * 1000;

/**
 * Listado de salas públicas abiertas (un único Durable Object "main").
 * Cada sala (RoomDO) avisa cuando cambia: upsert(listing) o remove(code).
 */
export class LobbyDO extends DurableObject {
  async rooms() {
    if (!this.cache) this.cache = (await this.ctx.storage.get('rooms')) ?? {};
    return this.cache;
  }

  async upsert(listing) {
    const rooms = await this.rooms();
    rooms[listing.code] = { ...listing, seenAt: Date.now() };
    await this.ctx.storage.put('rooms', rooms);
  }

  async remove(code) {
    const rooms = await this.rooms();
    if (!rooms[code]) return;
    delete rooms[code];
    await this.ctx.storage.put('rooms', rooms);
  }

  /* ---- Tope de mesas abiertas: registro de todas las mesas (públicas y privadas) ---- */
  async registry() {
    if (!this.reg) this.reg = (await this.ctx.storage.get('active')) ?? {};
    return this.reg;
  }

  /** Cuántas mesas ocupan lugar ahora; de paso olvida las que ya no lo ocupan. */
  async capacity(max) {
    const reg = await this.registry();
    const now = Date.now();
    let active = 0;
    let dirty = false;
    for (const [code, e] of Object.entries(reg)) {
      if (occupiesSlot(e, now)) active++;
      else if (e.status === 'finished' || now - e.seenAt > 24 * 60 * 60 * 1000) {
        delete reg[code];
        dirty = true;
      }
    }
    if (dirty) await this.ctx.storage.put('active', reg);
    return { active, max };
  }

  /** Reserva atómica de un lugar para una mesa nueva (un único objeto: no hay carreras). */
  async reserve(code, max) {
    const cap = await this.capacity(max);
    if (cap.active >= max) return { ok: false, ...cap };
    const reg = await this.registry();
    reg[code] = { status: 'lobby', connected: 0, seenAt: Date.now() };
    await this.ctx.storage.put('active', reg);
    return { ok: true, active: cap.active + 1, max };
  }

  /** La mesa avisa su estado (cambió de etapa o de conexiones). */
  async track(code, status, connected) {
    const reg = await this.registry();
    reg[code] = { status, connected, seenAt: Date.now() };
    await this.ctx.storage.put('active', reg);
  }

  async untrack(code) {
    const reg = await this.registry();
    if (!reg[code]) return;
    delete reg[code];
    await this.ctx.storage.put('active', reg);
  }

  async list(game) {
    const rooms = await this.rooms();
    const limit = Date.now() - STALE_MS;
    let dirty = false;
    for (const [code, r] of Object.entries(rooms)) {
      if (r.seenAt < limit) {
        delete rooms[code];
        dirty = true;
      }
    }
    if (dirty) await this.ctx.storage.put('rooms', rooms);
    return Object.values(rooms)
      .filter((r) => !game || r.gameId === game)
      .sort((a, b) => b.seenAt - a.seenAt)
      .slice(0, 100)
      .map(({ seenAt, ...r }) => r);
  }
}
