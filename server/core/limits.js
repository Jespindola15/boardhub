/**
 * Tope de mesas abiertas a la vez (igual en Node y en Cloudflare).
 *
 * Una mesa ocupa un lugar mientras no terminó su partida y hay alguien conectado,
 * o tuvo actividad en los últimos minutos. Al terminar la partida, o si queda vacía
 * un rato, libera el lugar (aunque siga existiendo y se pueda volver a ella).
 */
export const DEFAULT_MAX_ROOMS = 20;
export const IDLE_GRACE_MS = 10 * 60 * 1000;

/** @param {{ status: string, connected: number, seenAt: number }} entry */
export function occupiesSlot(entry, now = Date.now()) {
  if (!entry || entry.status === 'finished') return false;
  return entry.connected > 0 || now - entry.seenAt < IDLE_GRACE_MS;
}

export const maxRoomsFrom = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_ROOMS;
};

export const fullMessage = (max) =>
  `Están ocupadas las ${max} mesas. Cuando termine o se cierre alguna vas a poder abrir otra; mientras, puedes sentarte en una mesa abierta.`;
