import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { GAMES } from './games.js';

/** Azar del servidor: nunca viene del cliente. */
export const serverRng = () => randomInt(0, 2 ** 32) / 2 ** 32;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
const PALETTE = ['violet', 'teal', 'amber', 'rose', 'sky', 'lime', 'coral', 'snow', 'gold', 'mint'];
const MAX_REMEMBERED_ACTIONS = 200;
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

export class RoomError extends Error {}
const fail = (m) => {
  throw new RoomError(m);
};

function cleanName(name) {
  const n = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!n) fail('Escribe un nombre.');
  return n;
}

/**
 * Gestión de salas, independiente del transporte (se prueba sin sockets).
 *
 * Room = {
 *   code, gameId, options, status: 'lobby' | 'playing' | 'finished',
 *   hostId, seats: [{ playerId, name, colorId, token }],
 *   state, processed: [[clientActionId, result]], updatedAt
 * }
 */
export class RoomManager {
  constructor({ rng = serverRng, now = () => Date.now(), initial = [] } = {}) {
    this.rng = rng;
    this.now = now;
    this.rooms = new Map(initial.map((r) => [r.code, r]));
  }

  newCode() {
    for (;;) {
      let c = '';
      for (let i = 0; i < 6; i++) c += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
      if (!this.rooms.has(c)) return c;
    }
  }

  get(code) {
    const room = this.rooms.get(String(code ?? '').toUpperCase().trim());
    if (!room) fail('No existe una sala con ese código.');
    return room;
  }

  seatByToken(room, token) {
    const seat = room.seats.find((s) => s.token === token);
    if (!seat) fail('Tu sesión en esta sala no es válida.');
    return seat;
  }

  create({ gameId, name, options }) {
    const game = GAMES[gameId];
    if (!game) fail('Ese juego todavía no se puede jugar en línea.');
    const room = {
      code: this.newCode(),
      gameId,
      options: game.validateOptions ? game.validateOptions(options) : {},
      status: 'lobby',
      hostId: null,
      seats: [],
      state: null,
      processed: [],
      updatedAt: this.now(),
    };
    this.rooms.set(room.code, room);
    const seat = this.addSeat(room, name);
    room.hostId = seat.playerId;
    return { room, seat };
  }

  addSeat(room, name) {
    const game = GAMES[room.gameId];
    const n = cleanName(name);
    if (room.status !== 'lobby') fail('La partida ya empezó.');
    if (room.seats.length >= game.players.max) fail(`La sala está completa (máximo ${game.players.max}).`);
    if (room.seats.some((s) => s.name.toLowerCase() === n.toLowerCase())) fail('Ya hay alguien con ese nombre en la sala.');
    const used = new Set(room.seats.map((s) => s.colorId));
    const seat = {
      playerId: `u${randomBytes(4).toString('hex')}`,
      name: n,
      colorId: PALETTE.find((c) => !used.has(c)),
      token: randomUUID(),
    };
    room.seats.push(seat);
    room.updatedAt = this.now();
    return seat;
  }

  join({ code, name }) {
    const room = this.get(code);
    return { room, seat: this.addSeat(room, name) };
  }

  setOptions(room, playerId, options) {
    if (room.hostId !== playerId) fail('Sólo el anfitrión cambia las opciones.');
    if (room.status !== 'lobby') fail('La partida ya empezó.');
    const game = GAMES[room.gameId];
    room.options = game.validateOptions ? game.validateOptions(options) : {};
    room.updatedAt = this.now();
  }

  start(room, playerId) {
    const game = GAMES[room.gameId];
    if (room.hostId !== playerId) fail('Sólo el anfitrión puede empezar.');
    if (room.status !== 'lobby') fail('La partida ya empezó.');
    if (room.seats.length < game.players.min) fail(`Hacen falta al menos ${game.players.min} jugadores.`);
    room.state = game.setup({
      id: room.code,
      players: room.seats.map((s) => ({ id: s.playerId, name: s.name, colorId: s.colorId })),
      options: room.options,
      rng: this.rng,
    });
    room.status = 'playing';
    room.updatedAt = this.now();
  }

  /**
   * Aplica una intención. El `playerId` lo pone el servidor; `clientActionId`
   * evita aplicar dos veces la misma acción (reintentos, doble clic).
   */
  act(room, playerId, { clientActionId, type, payload, expectedVersion }) {
    if (room.status !== 'playing') fail('La partida no está en curso.');
    if (clientActionId) {
      const seen = room.processed.find(([id]) => id === clientActionId);
      if (seen) return { ...seen[1], duplicate: true };
    }
    // Sincronización: no se aplica una acción decidida sobre un estado que el jugador no vio
    // (doble clic, dos jugadores a la vez, red lenta). El cliente recibe la vista nueva y decide otra vez.
    if (expectedVersion != null && expectedVersion !== room.state.version) {
      return { ok: false, stale: true, error: 'La mesa cambió mientras jugabas: revisa y vuelve a intentarlo.' };
    }
    const game = GAMES[room.gameId];
    const r = game.applyAction(room.state, { type, playerId, payload }, this.rng);
    const result = r.ok ? { ok: true } : { ok: false, error: r.error };
    if (r.ok) {
      room.state = r.state;
      if (game.getResult(room.state)) room.status = 'finished';
    }
    if (clientActionId) {
      room.processed.push([clientActionId, result]);
      if (room.processed.length > MAX_REMEMBERED_ACTIONS) room.processed.shift();
    }
    room.updatedAt = this.now();
    return result;
  }

  /** Política de plataforma: salir de la sala (en partida, el juego aplica removePlayer). */
  leave(room, playerId) {
    if (room.status === 'lobby') {
      room.seats = room.seats.filter((s) => s.playerId !== playerId);
      if (!room.seats.length) {
        this.rooms.delete(room.code);
        return;
      }
      if (room.hostId === playerId) room.hostId = room.seats[0].playerId;
    } else if (room.status === 'playing') {
      const game = GAMES[room.gameId];
      const r = game.removePlayer(room.state, playerId, this.rng);
      if (r.ok) room.state = r.state;
      if (game.getResult(room.state)) room.status = 'finished';
      if (room.hostId === playerId) room.hostId = room.seats.find((s) => s.playerId !== playerId)?.playerId ?? null;
    }
    room.updatedAt = this.now();
  }

  /** El anfitrión quita a otro jugador (por ejemplo, desconectado). */
  remove(room, hostId, playerId) {
    if (room.hostId !== hostId) fail('Sólo el anfitrión puede quitar jugadores.');
    if (playerId === hostId) fail('No puedes quitarte a ti mismo; usa "Salir".');
    const target = room.seats.find((s) => s.playerId === playerId);
    if (!target) fail('Ese jugador no está en la sala.');
    if (room.status === 'lobby') room.seats = room.seats.filter((s) => s.playerId !== playerId);
    else this.leave(room, playerId);
    target.token = null; // su sesión deja de valer
  }

  /** Información pública de la sala (sin tokens ni estado del juego). */
  publicRoom(room, online = new Set()) {
    const game = GAMES[room.gameId];
    const left = new Set((room.state?.players ?? []).filter((p) => p.left).map((p) => p.id));
    return {
      code: room.code,
      gameId: room.gameId,
      status: room.status,
      hostId: room.hostId,
      options: room.options,
      limits: game.players,
      seats: room.seats.map((s) => ({ playerId: s.playerId, name: s.name, colorId: s.colorId, connected: online.has(s.playerId), left: left.has(s.playerId) })),
    };
  }

  viewFor(room, playerId) {
    if (!room.state) return null;
    return GAMES[room.gameId].getPlayerView(room.state, playerId);
  }

  sweep() {
    const limit = this.now() - ROOM_TTL_MS;
    for (const [code, room] of this.rooms) if (room.updatedAt < limit) this.rooms.delete(code);
  }

  serialize() {
    return [...this.rooms.values()];
  }
}
