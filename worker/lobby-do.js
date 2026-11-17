import { DurableObject } from 'cloudflare:workers';

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
