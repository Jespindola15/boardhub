/**
 * Protocolo de BoardHub sobre WebSocket (mismo en Node y en Cloudflare).
 *
 * Cliente → servidor:  { id, ev, payload }
 * Servidor → cliente:  { re: id, data }       respuesta a una petición
 *                      { ev, data }           evento: 'room:update' | 'game:view' | 'room:removed'
 *
 * Una conexión WebSocket pertenece a UNA sala (URL /ws/CODIGO).
 * Peticiones: room:join {name} · room:resume {token} · room:options {options} · room:visibility {visibility} · room:start
 *             room:leave · room:remove {playerId} · game:action {...} · sync · ping
 * La creación de salas es por HTTP: POST /api/rooms {gameId, name, options, visibility}.
 * Salas públicas abiertas: GET /api/rooms[?game=slug].
 */
import { RoomError } from './room.js';

export const RATE_LIMIT_PER_SECOND = 60;

/**
 * Procesa una petición de `conn` ({ playerId, rate }) sobre `room`.
 * Devuelve { reply, changed, kicked? } — el llamador responde, guarda y difunde.
 */
export function handleRequest(room, conn, ev, payload = {}, { rateLimit = RATE_LIMIT_PER_SECOND } = {}) {
  const t = Date.now();
  conn.rate ??= { windowStart: t, count: 0 };
  if (t - conn.rate.windowStart > 1000) conn.rate = { windowStart: t, count: 0 };
  if (++conn.rate.count > rateLimit) return { reply: { ok: false, error: 'Demasiadas acciones seguidas: espera un momento.' } };

  const me = () => {
    if (!conn.playerId) throw new RoomError('Primero entra a la sala.');
    return conn.playerId;
  };

  try {
    switch (ev) {
      case 'ping':
        return { reply: { ok: true, t } };
      case 'room:join': {
        const seat = room.addSeat(payload.name);
        conn.playerId = seat.playerId;
        return { reply: { ok: true, code: room.data.code, playerId: seat.playerId, token: seat.token }, changed: true };
      }
      case 'room:resume': {
        const seat = room.seatByToken(payload.token);
        conn.playerId = seat.playerId;
        return { reply: { ok: true, code: room.data.code, playerId: seat.playerId }, changed: true };
      }
      case 'room:options':
        room.setOptions(me(), payload.options);
        return { reply: { ok: true }, changed: true };
      case 'room:visibility':
        room.setVisibility(me(), payload.visibility);
        return { reply: { ok: true }, changed: true };
      case 'room:start':
        room.start(me());
        return { reply: { ok: true }, changed: true };
      case 'room:leave': {
        room.leave(me());
        conn.playerId = null;
        return { reply: { ok: true }, changed: true };
      }
      case 'room:remove':
        room.remove(me(), payload.playerId);
        return { reply: { ok: true }, changed: true, kicked: payload.playerId };
      case 'game:action': {
        const result = room.act(me(), payload);
        return { reply: result, changed: result.ok && !result.duplicate };
      }
      case 'sync':
        me();
        return { reply: { ok: true }, resend: true };
      default:
        return { reply: { ok: false, error: `Petición desconocida: ${ev}` } };
    }
  } catch (e) {
    if (e instanceof RoomError) return { reply: { ok: false, error: e.message } };
    console.error(e);
    return { reply: { ok: false, error: 'Error interno del servidor.' } };
  }
}

/** Mensajes a enviar a una conexión tras un cambio. */
export function messagesFor(room, conn, online) {
  const out = [{ ev: 'room:update', data: room.publicRoom(online) }];
  if (conn.playerId) out.push({ ev: 'game:view', data: room.viewFor(conn.playerId) });
  return out;
}
