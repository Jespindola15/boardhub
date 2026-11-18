/**
 * Lógica de UNA sala, portable: corre igual en Node (desarrollo, pruebas, túnel)
 * y en un Durable Object de Cloudflare (producción). Sólo usa Web Crypto.
 *
 * RoomData (JSON, se guarda tal cual) = {
 *   code, gameId, options, status: 'lobby' | 'playing' | 'finished',
 *   hostId, seats: [{ playerId, name, colorId, token, gone? }],
 *   state, processed: [[clientActionId, result]], updatedAt,
 *   match: número de partida en esta sala (empieza en 1),
 *   votes: { playerId: gameId } para la próxima partida,
 *   results: [{ match, gameId, winners: [playerId], names: [nombre] }] partidas ya jugadas
 * }
 * Al terminar una partida, cualquiera vuelve a la sala (`returnToLobby`): mismas personas y mismo código.
 * Todos votan el próximo juego y el anfitrión lo confirma (`setGame`).
 */
import { GAMES } from '../games.js';

export class RoomError extends Error {}
const fail = (m) => {
  throw new RoomError(m);
};

/** Azar del servidor (criptográfico). Nunca viene del cliente. */
export function serverRng() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
}
const randInt = (n) => Math.floor(serverRng() * n);

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
const PALETTE = ['violet', 'teal', 'amber', 'rose', 'sky', 'lime', 'coral', 'snow', 'gold', 'mint'];
const MAX_REMEMBERED_ACTIONS = 200;

export function newCode() {
  let c = '';
  for (let i = 0; i < 6; i++) c += CODE_ALPHABET[randInt(CODE_ALPHABET.length)];
  return c;
}
export const isValidCode = (code) => /^[A-HJ-NP-Z2-9]{6}$/.test(String(code ?? ''));

const newPlayerId = () => `u${Array.from({ length: 8 }, () => randInt(16).toString(16)).join('')}`;

function cleanName(name) {
  const n = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!n) fail('Escribe un nombre.');
  return n;
}

export class Room {
  /** @param {object} data RoomData @param {{rng?, now?}} env */
  constructor(data, { rng = serverRng, now = () => Date.now() } = {}) {
    this.data = data;
    this.rng = rng;
    this.now = now;
  }

  static create({ code, gameId, name, options, visibility }, env) {
    const game = GAMES[gameId];
    if (!game) fail('Ese juego todavía no se puede jugar en línea.');
    const room = new Room(
      {
        code,
        gameId,
        options: game.validateOptions ? game.validateOptions(options) : {},
        status: 'lobby',
        visibility: visibility === 'public' ? 'public' : 'private',
        hostId: null,
        seats: [],
        state: null,
        processed: [],
        updatedAt: 0,
        match: 1,
        votes: {},
        results: [],
      },
      env,
    );
    const seat = room.addSeat(name);
    room.data.hostId = seat.playerId;
    return { room, seat };
  }

  get game() {
    return GAMES[this.data.gameId];
  }

  touch() {
    this.data.updatedAt = this.now();
  }

  seatByToken(token) {
    const seat = token && this.data.seats.find((s) => s.token === token);
    if (!seat) fail('Tu sesión en esta sala no es válida.');
    return seat;
  }

  addSeat(name) {
    const d = this.data;
    const n = cleanName(name);
    if (d.status !== 'lobby') fail('La partida ya empezó.');
    if (d.seats.length >= this.game.players.max) fail(`La sala está completa (máximo ${this.game.players.max}).`);
    if (d.seats.some((s) => s.name.toLowerCase() === n.toLowerCase())) fail('Ya hay alguien con ese nombre en la sala.');
    const used = new Set(d.seats.map((s) => s.colorId));
    const seat = { playerId: newPlayerId(), name: n, colorId: PALETTE.find((c) => !used.has(c)), token: crypto.randomUUID() };
    d.seats.push(seat);
    this.touch();
    return seat;
  }

  setOptions(playerId, options) {
    const d = this.data;
    if (d.hostId !== playerId) fail('Sólo el anfitrión cambia las opciones.');
    if (d.status !== 'lobby') fail('La partida ya empezó.');
    d.options = this.game.validateOptions ? this.game.validateOptions(options) : {};
    this.touch();
  }

  /** Pública: aparece en el listado de salas abiertas. Privada: sólo con código. */
  setVisibility(playerId, visibility) {
    const d = this.data;
    if (d.hostId !== playerId) fail('Sólo el anfitrión cambia la visibilidad.');
    d.visibility = visibility === 'public' ? 'public' : 'private';
    this.touch();
  }

  /** Entrada para el listado de salas públicas, o null si no debe aparecer. */
  listing() {
    const d = this.data;
    if (d.visibility !== 'public' || d.status !== 'lobby' || !d.seats.length) return null;
    if (d.seats.length >= this.game.players.max) return null;
    const host = d.seats.find((s) => s.playerId === d.hostId) ?? d.seats[0];
    return { code: d.code, gameId: d.gameId, host: host.name, players: d.seats.length, min: this.game.players.min, max: this.game.players.max, updatedAt: d.updatedAt };
  }

  start(playerId) {
    const d = this.data;
    if (d.hostId !== playerId) fail('Sólo el anfitrión puede empezar.');
    if (d.status !== 'lobby') fail('La partida ya empezó.');
    if (d.seats.length < this.game.players.min) fail(`Hacen falta al menos ${this.game.players.min} jugadores.`);
    if (d.seats.length > this.game.players.max) fail(`${this.game.name ?? 'Este juego'} admite como máximo ${this.game.players.max} jugadores.`);
    const countError = this.game.checkPlayers?.(d.seats.length, d.options);
    if (countError) fail(countError);
    d.state = this.game.setup({
      id: d.code,
      players: d.seats.map((s) => ({ id: s.playerId, name: s.name, colorId: s.colorId })),
      options: d.options,
      rng: this.rng,
    });
    d.status = 'playing';
    this.touch();
  }

  /**
   * Aplica una intención. El `playerId` lo pone el servidor.
   * - `clientActionId`: una acción repetida (reintento, doble envío) no se aplica dos veces.
   * - `expectedVersion`: no se aplica una acción decidida sobre un estado que el jugador no vio.
   */
  act(playerId, { clientActionId, type, payload, expectedVersion }) {
    const d = this.data;
    if (d.status !== 'playing') fail('La partida no está en curso.');
    if (clientActionId) {
      const seen = d.processed.find(([id]) => id === clientActionId);
      if (seen) return { ...seen[1], duplicate: true };
    }
    if (expectedVersion != null && expectedVersion !== d.state.version) {
      return { ok: false, stale: true, error: 'La mesa cambió mientras jugabas: revisa y vuelve a intentarlo.' };
    }
    const r = this.game.applyAction(d.state, { type, playerId, payload }, this.rng);
    const result = r.ok ? { ok: true } : { ok: false, error: r.error };
    if (r.ok) {
      d.state = r.state;
      if (this.game.getResult(d.state)) d.status = 'finished';
    }
    if (clientActionId) {
      d.processed.push([clientActionId, result]);
      if (d.processed.length > MAX_REMEMBERED_ACTIONS) d.processed.shift();
    }
    this.touch();
    return result;
  }

  /** Política de plataforma: salir (en la sala de espera libera el asiento; en partida, removePlayer). */
  leave(playerId) {
    const d = this.data;
    if (d.status === 'lobby') {
      d.seats = d.seats.filter((s) => s.playerId !== playerId);
      if (d.votes) delete d.votes[playerId];
      if (d.hostId === playerId) d.hostId = d.seats[0]?.playerId ?? null;
    } else {
      // En partida o con la partida terminada: el asiento queda hasta volver a la sala, y ahí se libera.
      const seat = d.seats.find((s) => s.playerId === playerId);
      if (seat) seat.gone = true;
      if (d.hostId === playerId) d.hostId = d.seats.find((s) => !s.gone)?.playerId ?? null;
    }
    if (d.status === 'playing') {
      const r = this.game.removePlayer(d.state, playerId, this.rng);
      if (r.ok) d.state = r.state;
      if (this.game.getResult(d.state)) d.status = 'finished';
    }
    this.touch();
  }

  /**
   * Partida terminada → sala de espera con las mismas personas y el mismo código.
   * Lo puede pedir cualquiera que siga en la sala. Se guarda el resultado y se limpian los votos.
   */
  returnToLobby(playerId) {
    const d = this.data;
    const me = d.seats.find((s) => s.playerId === playerId && !s.gone);
    if (!me) fail('No estás en esta sala.');
    if (d.status === 'lobby') return; // ya volvió otro jugador
    if (d.status !== 'finished') fail('La partida todavía no terminó.');
    const winners = this.game.getResult(d.state)?.winners ?? [];
    d.results ??= [];
    d.results.push({ match: d.match ?? 1, gameId: d.gameId, winners, names: winners.map((id) => d.seats.find((s) => s.playerId === id)?.name ?? '—') });
    if (d.results.length > 20) d.results.shift();
    d.seats = d.seats.filter((s) => !s.gone);
    if (!d.seats.some((s) => s.playerId === d.hostId)) d.hostId = d.seats[0]?.playerId ?? null;
    d.status = 'lobby';
    d.state = null;
    d.processed = [];
    d.votes = {};
    d.match = (d.match ?? 1) + 1;
    this.touch();
  }

  /** Voto de un jugador por el próximo juego (null lo retira). */
  vote(playerId, gameId) {
    const d = this.data;
    if (!d.seats.some((s) => s.playerId === playerId && !s.gone)) fail('No estás en esta sala.');
    if (d.status !== 'lobby') fail('Se vota en la sala de espera.');
    d.votes ??= {};
    if (gameId == null) delete d.votes[playerId];
    else {
      if (!GAMES[gameId]) fail('Ese juego no se puede jugar en línea.');
      d.votes[playerId] = gameId;
    }
    this.touch();
  }

  /** El anfitrión confirma el juego de la próxima partida (opciones por defecto de ese juego). */
  setGame(playerId, gameId) {
    const d = this.data;
    if (d.hostId !== playerId) fail('Sólo el anfitrión elige el juego.');
    if (d.status !== 'lobby') fail('La partida ya empezó.');
    const game = GAMES[gameId];
    if (!game) fail('Ese juego no se puede jugar en línea.');
    if (gameId === d.gameId) return;
    d.gameId = gameId;
    d.options = game.validateOptions ? game.validateOptions({}) : {};
    this.touch();
  }

  remove(hostId, playerId) {
    const d = this.data;
    if (d.hostId !== hostId) fail('Sólo el anfitrión puede quitar jugadores.');
    if (playerId === hostId) fail('No puedes quitarte a ti mismo; usa "Salir".');
    const target = d.seats.find((s) => s.playerId === playerId);
    if (!target) fail('Ese jugador no está en la sala.');
    if (d.status === 'lobby') {
      d.seats = d.seats.filter((s) => s.playerId !== playerId);
      if (d.votes) delete d.votes[playerId];
    } else this.leave(playerId);
    target.token = null; // su sesión deja de valer
    this.touch();
  }

  get empty() {
    return this.data.seats.length === 0;
  }

  /** Información pública (sin tokens ni estado del juego). */
  publicRoom(online = new Set()) {
    const d = this.data;
    const left = new Set((d.state?.players ?? []).filter((p) => p.left || p.status === 'bankrupt').map((p) => p.id));
    return {
      code: d.code,
      gameId: d.gameId,
      status: d.status,
      visibility: d.visibility ?? 'private',
      hostId: d.hostId,
      options: d.options,
      limits: this.game.players,
      countError: d.seats.length > this.game.players.max ? `Este juego admite como máximo ${this.game.players.max} jugadores.` : this.game.checkPlayers?.(d.seats.length, d.options) ?? null,
      seats: d.seats.map((s) => ({ playerId: s.playerId, name: s.name, colorId: s.colorId, connected: online.has(s.playerId), left: left.has(s.playerId) || Boolean(s.gone) })),
      match: d.match ?? 1,
      votes: d.votes ?? {},
      results: d.results ?? [],
      games: Object.fromEntries(Object.entries(GAMES).map(([id, g]) => [id, { min: g.players.min, max: g.players.max }])),
    };
  }

  viewFor(playerId) {
    return this.data.state ? this.game.getPlayerView(this.data.state, playerId) : null;
  }
}
