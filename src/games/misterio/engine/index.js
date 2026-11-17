/**
 * Motor de Misterio — reglas del clásico juego de deducción (quién, con qué y dónde). JS puro.
 * Especificación: docs/reglas/misterio/ESPECIFICACION.md
 */
import { SUSPECTS, WEAPONS, ROOMS, ROOM_BY_ID, CARDS, CARD_BY_ID, cellKind, cellKey, parseCell } from '../data/board.js';

export const ACTIONS = {
  ROLL: 'ROLL',
  MOVE: 'MOVE', // { to: 'x,y' | roomId }
  PASSAGE: 'PASSAGE',
  STAY: 'STAY', // quedarse en la habitación a la que lo llevó una sugerencia
  SUGGEST: 'SUGGEST', // { suspect, weapon }
  SHOW_CARD: 'SHOW_CARD', // { cardId }
  ACCUSE: 'ACCUSE', // { suspect, weapon, room }
  END_TURN: 'END_TURN',
  LEAVE: 'LEAVE',
};

class RuleError extends Error {}
const fail = (m) => {
  throw new RuleError(m);
};
const check = (c, m) => {
  if (!c) fail(m);
};

function log(s, text) {
  s.log.push({ id: `l${s.seq++}`, text });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}
const event = (s, data) => (s.lastEvent = { seq: s.seq++, ...data });
const P = (s, id) => s.players.find((p) => p.id === id);
const current = (s) => s.players[s.turnIndex];
const sname = (id) => SUSPECTS.find((x) => x.id === id).name;
const wname = (id) => WEAPONS.find((x) => x.id === id).name;
const rname = (id) => ROOM_BY_ID[id].name;

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function validateOptions() {
  return {};
}

export function setup({ id = 'local', players, rng = Math.random }) {
  check(players?.length >= 3 && players.length <= 6, 'Misterio se juega de 3 a 6.');
  const pick = (kind) => shuffle(CARDS.filter((c) => c.kind === kind), rng)[0].id;
  const solution = { suspect: pick('suspect'), weapon: pick('weapon'), room: pick('room') };
  const rest = shuffle(CARDS.filter((c) => !Object.values(solution).includes(c.id)).map((c) => c.id), rng);
  const s = {
    gameId: 'misterio',
    id,
    version: 0,
    seq: 1,
    solution,
    // Cada jugador lleva al personaje de su asiento; juega primero la Condesa Carmín.
    players: players.map((p, i) => ({ id: p.id, name: p.name, colorId: p.colorId, suspect: SUSPECTS[i].id, cards: [], seen: [], out: false, left: false })),
    tokens: Object.fromEntries(SUSPECTS.map((x) => [x.id, { cell: cellKey(...x.start), room: null }])),
    weapons: {},
    turnIndex: 0,
    turn: null,
    phase: 'playing',
    suggestion: null,
    lastSuggestion: null,
    winners: [],
    log: [],
    lastEvent: null,
  };
  // Armas: una por habitación, al azar.
  shuffle(ROOMS.map((r) => r.id), rng)
    .slice(0, WEAPONS.length)
    .forEach((room, i) => (s.weapons[WEAPONS[i].id] = room));
  // Reparto en ronda (algunos pueden tener una carta más).
  rest.forEach((c, i) => s.players[i % s.players.length].cards.push(c));
  startTurn(s);
  log(s, 'Hubo un crimen en la mansión. Las tres cartas del caso están en el sobre. ¡A investigar!');
  return s;
}

function startTurn(s) {
  const p = current(s);
  s.turn = { step: 'start', roll: null, leftRoom: null, enteredRoom: false, suggested: false };
  event(s, { type: 'turn', playerId: p.id });
}

function nextTurn(s) {
  const n = s.players.length;
  let i = s.turnIndex;
  for (let k = 0; k < n; k++) {
    i = (i + 1) % n;
    if (!s.players[i].out && !s.players[i].left) break;
  }
  s.turnIndex = i;
  startTurn(s);
}

/* ------------------------------------------------------------------ */
/* Movimiento                                                          */
/* ------------------------------------------------------------------ */

function occupiedCells(s, exceptSuspect) {
  const set = new Set();
  for (const [sid, t] of Object.entries(s.tokens)) if (sid !== exceptSuspect && t.cell) set.add(t.cell);
  return set;
}

/** Destinos posibles con `steps` pasos como máximo: { cells: Set, rooms: Set }. */
export function destinations(s, suspect, steps) {
  const tok = s.tokens[suspect];
  const blocked = occupiedCells(s, suspect);
  const dist = new Map();
  const queue = [];
  const rooms = new Set();
  const start = (cell, d) => {
    if (blocked.has(cell) || dist.has(cell)) return;
    dist.set(cell, d);
    queue.push(cell);
  };
  if (tok.room) {
    for (const [, out] of ROOM_BY_ID[tok.room].doors) if (steps >= 1) start(cellKey(...out), 1);
  } else start(tok.cell, 0);
  const doorsByCell = new Map();
  for (const r of ROOMS) for (const [, out] of r.doors) doorsByCell.set(cellKey(...out), [...(doorsByCell.get(cellKey(...out)) ?? []), r.id]);
  while (queue.length) {
    const c = queue.shift();
    const d = dist.get(c);
    if (d < steps) {
      for (const rid of doorsByCell.get(c) ?? []) if (rid !== tok.room) rooms.add(rid);
      const [x, y] = parseCell(c);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (cellKind(nx, ny) !== 'hall') continue;
        const k = cellKey(nx, ny);
        if (blocked.has(k) || dist.has(k)) continue;
        dist.set(k, d + 1);
        queue.push(k);
      }
    }
  }
  const cells = new Set([...dist.keys()].filter((k) => !(tok.cell === k && !tok.room)));
  return { cells, rooms };
}

function placeInRoom(s, suspect, room) {
  s.tokens[suspect] = { cell: null, room };
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */

export function applyAction(state, action, rng = Math.random) {
  try {
    const handler = HANDLERS[action?.type];
    check(handler, `Acción desconocida: ${action?.type}`);
    check(state.phase !== 'finished', 'La partida terminó.');
    const s = structuredClone(state);
    const p = P(s, action.playerId);
    check(p && !p.left, 'Jugador no válido.');
    handler(s, p, action.payload ?? {}, rng);
    s.version += 1;
    return { ok: true, state: s };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
}

const requireTurn = (s, p) => {
  check(current(s).id === p.id, 'No es tu turno.');
  check(!s.suggestion, 'Esperá que respondan la sugerencia.');
};

const HANDLERS = {
  [ACTIONS.ROLL](s, p, _x, rng) {
    requireTurn(s, p);
    check(s.turn.step === 'start', 'Ya te moviste en este turno.');
    const d = [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
    s.turn.roll = d[0] + d[1];
    s.turn.dice = d;
    s.turn.step = 'move';
    s.turn.leftRoom = s.tokens[p.suspect].room;
    log(s, `${p.name} tira ${d[0]} + ${d[1]} = ${s.turn.roll}.`);
    event(s, { type: 'roll', playerId: p.id, dice: d });
    const dest = destinations(s, p.suspect, s.turn.roll);
    if (!dest.cells.size && !dest.rooms.size) {
      log(s, `${p.name} no puede moverse.`);
      s.turn.step = 'done';
    }
  },

  [ACTIONS.MOVE](s, p, { to }) {
    requireTurn(s, p);
    check(s.turn.step === 'move', 'Primero tirá los dados.');
    const dest = destinations(s, p.suspect, s.turn.roll);
    if (ROOM_BY_ID[to]) {
      check(dest.rooms.has(to), 'No llegás a esa habitación con esa tirada.');
      placeInRoom(s, p.suspect, to);
      s.turn.enteredRoom = true;
      s.turn.step = 'suggest';
      log(s, `${p.name} entra a ${rname(to)}.`);
    } else {
      check(dest.cells.has(to), 'No llegás a ese casillero.');
      s.tokens[p.suspect] = { cell: to, room: null };
      s.turn.step = 'done';
    }
    p.summoned = false;
    event(s, { type: 'move', playerId: p.id, to });
  },

  [ACTIONS.PASSAGE](s, p) {
    requireTurn(s, p);
    check(s.turn.step === 'start', 'El pasaje secreto se usa en lugar de tirar los dados.');
    const room = s.tokens[p.suspect].room;
    const target = room && ROOM_BY_ID[room].passage;
    check(target, 'Desde acá no hay pasaje secreto.');
    placeInRoom(s, p.suspect, target);
    s.turn.enteredRoom = true;
    s.turn.step = 'suggest';
    p.summoned = false;
    log(s, `${p.name} usa el pasaje secreto hacia ${rname(target)}.`);
    event(s, { type: 'move', playerId: p.id, to: target });
  },

  [ACTIONS.STAY](s, p) {
    requireTurn(s, p);
    check(s.turn.step === 'start' && p.summoned && s.tokens[p.suspect].room, 'Sólo podés quedarte si te trajeron con una sugerencia.');
    p.summoned = false;
    s.turn.step = 'suggest';
    log(s, `${p.name} se queda en ${rname(s.tokens[p.suspect].room)}.`);
  },

  [ACTIONS.SUGGEST](s, p, { suspect, weapon }) {
    requireTurn(s, p);
    check(s.turn.step === 'suggest' && !s.turn.suggested, 'Sólo se sugiere al entrar a una habitación.');
    check(SUSPECTS.some((x) => x.id === suspect) && WEAPONS.some((x) => x.id === weapon), 'Elegí un personaje y un arma.');
    const room = s.tokens[p.suspect].room;
    // El sospechoso y el arma se trasladan a la habitación.
    if (s.tokens[suspect].room !== room) {
      placeInRoom(s, suspect, room);
      const owner = s.players.find((x) => x.suspect === suspect);
      if (owner) owner.summoned = true;
    }
    s.weapons[weapon] = room;
    s.turn.suggested = true;
    const cards = [`s:${suspect}`, `w:${weapon}`, `r:${room}`];
    log(s, `${p.name} sugiere: ${sname(suspect)}, con ${wname(weapon)}, en ${rname(room)}.`);
    // Se pregunta en orden, empezando por el de la izquierda (siguiente en el turno).
    const n = s.players.length;
    let shower = null;
    const asked = [];
    for (let k = 1; k < n; k++) {
      const q = s.players[(s.turnIndex + k) % n];
      if (q.left) continue;
      const matches = q.cards.filter((c) => cards.includes(c));
      if (matches.length) {
        shower = { id: q.id, matches };
        break;
      }
      asked.push(q.id);
    }
    s.lastSuggestion = { by: p.id, suspect, weapon, room, passed: asked, shownBy: shower?.id ?? null };
    for (const id of asked) log(s, `${P(s, id).name} no puede refutar.`);
    if (!shower) {
      log(s, 'Nadie pudo refutar la sugerencia.');
      s.turn.step = 'after';
    } else if (shower.matches.length === 1) {
      reveal(s, p, P(s, shower.id), shower.matches[0]);
    } else {
      s.suggestion = { by: p.id, shower: shower.id, matches: shower.matches };
      log(s, `${P(s, shower.id).name} elige qué carta mostrar.`);
    }
    event(s, { type: 'suggest', playerId: p.id, suspect, weapon, room });
  },

  [ACTIONS.SHOW_CARD](s, p, { cardId }) {
    const sg = s.suggestion;
    check(sg && sg.shower === p.id, 'No tenés que mostrar ninguna carta.');
    check(sg.matches.includes(cardId), 'Tenés que mostrar una de las cartas sugeridas.');
    s.suggestion = null;
    reveal(s, P(s, sg.by), p, cardId);
  },

  [ACTIONS.ACCUSE](s, p, { suspect, weapon, room }) {
    requireTurn(s, p);
    check(SUSPECTS.some((x) => x.id === suspect) && WEAPONS.some((x) => x.id === weapon) && ROOM_BY_ID[room], 'Completá la acusación.');
    const ok = s.solution.suspect === `s:${suspect}` && s.solution.weapon === `w:${weapon}` && s.solution.room === `r:${room}`;
    log(s, `${p.name} acusa: ${sname(suspect)}, con ${wname(weapon)}, en ${rname(room)}.`);
    event(s, { type: 'accuse', playerId: p.id, correct: ok });
    if (ok) {
      s.phase = 'finished';
      s.winners = [p.id];
      log(s, `¡Correcto! ${p.name} resolvió el caso.`);
      return;
    }
    p.out = true;
    log(s, `Incorrecto: ${p.name} queda fuera de la investigación (pero sigue mostrando cartas).`);
    const active = s.players.filter((x) => !x.out && !x.left);
    if (active.length === 1) {
      s.phase = 'finished';
      s.winners = [active[0].id];
      log(s, `${active[0].name} es el único investigador que queda: gana.`);
      return;
    }
    if (!active.length) {
      s.phase = 'finished';
      s.winners = [];
      return;
    }
    nextTurn(s);
  },

  [ACTIONS.END_TURN](s, p) {
    requireTurn(s, p);
    check(s.turn.step !== 'start', 'Primero tirá los dados o usá un pasaje.');
    nextTurn(s);
  },

  /** Política de plataforma: quien abandona deja sus cartas a la vista de todos. */
  [ACTIONS.LEAVE](s, p) {
    p.left = true;
    p.out = true;
    for (const x of s.players) if (!x.left) x.seen.push(...p.cards.map((c) => ({ card: c, from: p.id })));
    log(s, `${p.name} abandona: sus cartas quedan a la vista de todos.`);
    if (s.suggestion && (s.suggestion.shower === p.id || s.suggestion.by === p.id)) s.suggestion = null;
    const active = s.players.filter((x) => !x.out && !x.left);
    if (active.length <= 1) {
      s.phase = 'finished';
      s.winners = active.map((x) => x.id);
      return;
    }
    if (current(s).id === p.id) nextTurn(s);
  },
};

function reveal(s, to, from, cardId) {
  to.seen.push({ card: cardId, from: from.id });
  log(s, `${from.name} le muestra una carta a ${to.name}.`);
  s.lastSuggestion.shownBy = from.id;
  s.turn.step = 'after';
  event(s, { type: 'shown', to: to.id, from: from.id });
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function getPendingDeciders(s) {
  if (s.phase === 'finished') return [];
  if (s.suggestion) return [s.suggestion.shower];
  return [current(s).id];
}

export function getLegalActions(s, playerId) {
  const p = P(s, playerId);
  if (!p || p.left || s.phase === 'finished') return [];
  const out = [];
  if (s.suggestion) {
    if (s.suggestion.shower === playerId) out.push({ type: ACTIONS.SHOW_CARD, cardIds: s.suggestion.matches });
  } else if (current(s).id === playerId) {
    const t = s.turn;
    const room = s.tokens[p.suspect].room;
    if (t.step === 'start') {
      out.push({ type: ACTIONS.ROLL });
      if (room && ROOM_BY_ID[room].passage) out.push({ type: ACTIONS.PASSAGE, to: ROOM_BY_ID[room].passage });
      if (p.summoned && room) out.push({ type: ACTIONS.STAY });
    }
    if (t.step === 'move') out.push({ type: ACTIONS.MOVE });
    if (t.step === 'suggest' && !t.suggested) out.push({ type: ACTIONS.SUGGEST, room });
    if (t.step !== 'start') out.push({ type: ACTIONS.END_TURN });
    out.push({ type: ACTIONS.ACCUSE });
  }
  out.push({ type: ACTIONS.LEAVE });
  return out;
}

export function getPlayerView(s, viewerId) {
  const me = viewerId ? P(s, viewerId) : null;
  const end = s.phase === 'finished';
  const dest = me && current(s).id === me.id && s.turn.step === 'move' ? destinations(s, me.suspect, s.turn.roll) : null;
  return {
    gameId: s.gameId,
    version: s.version,
    phase: s.phase,
    me: viewerId,
    currentPlayerId: end ? null : current(s).id,
    turn: s.turn,
    tokens: s.tokens,
    weapons: s.weapons,
    players: s.players.map((p) => ({ id: p.id, name: p.name, colorId: p.colorId, suspect: p.suspect, cardCount: p.cards.length, out: p.out, left: p.left, ...(end ? { cards: p.cards } : {}) })),
    myCards: me ? me.cards : [],
    mySeen: me ? me.seen : [],
    mySuspect: me?.suspect ?? null,
    pendingShow: s.suggestion && s.suggestion.shower === viewerId ? { by: s.suggestion.by, matches: s.suggestion.matches } : null,
    waitingShow: s.suggestion ? { by: s.suggestion.by, shower: s.suggestion.shower } : null,
    lastSuggestion: s.lastSuggestion,
    destinations: dest ? { cells: [...dest.cells], rooms: [...dest.rooms] } : null,
    solution: end ? s.solution : null,
    winners: s.winners,
    lastEvent: s.lastEvent,
    log: s.log.slice(-60),
    legal: getLegalActions(s, viewerId),
    deciders: getPendingDeciders(s),
  };
}

export const getResult = (s) => (s.phase === 'finished' ? { winners: s.winners, scores: {} } : null);
export const removePlayer = (s, playerId, rng) => applyAction(s, { type: ACTIONS.LEAVE, playerId }, rng);

export const definition = {
  id: 'misterio',
  players: { min: 3, max: 6 },
  edition: 'Juego clásico de deducción (quién, con qué y dónde)',
  setup,
  applyAction,
  getPlayerView,
  getLegalActions,
  getPendingDeciders,
  getResult,
  removePlayer,
  validateOptions,
};

export { CARD_BY_ID };
