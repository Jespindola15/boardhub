/**
 * Motor de Rutas — reglas del clásico juego de vagones y destinos (edición básica),
 * sobre un mapa propio de Sudamérica. JS puro.
 * Especificación: docs/reglas/rutas/ESPECIFICACION.md
 */
import { CITIES, ROUTES, ROUTE_BY_ID, ROUTE_POINTS, TICKETS, COLORS, TRAINS_PER_PLAYER, LONGEST_BONUS } from '../data/map.js';

export const ACTIONS = {
  KEEP_TICKETS: 'KEEP_TICKETS', // { ticketIds }
  DRAW_CARD: 'DRAW_CARD', // { from: 'deck' | number (índice de la carta visible) }
  CLAIM: 'CLAIM', // { routeId, color }
  DRAW_TICKETS: 'DRAW_TICKETS',
  PASS: 'PASS', // sólo si no hay ninguna acción posible
  LEAVE: 'LEAVE',
};

const LOCO = 'locomotora';

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
const cname = (id) => CITIES[id].name;
const TICKET = Object.fromEntries(TICKETS.map((t) => [t.id, t]));

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const buildTrainDeck = () => [...COLORS.flatMap((c) => Array(12).fill(c)), ...Array(14).fill(LOCO)];

export function validateOptions() {
  return {};
}

/* ------------------------------------------------------------------ */
/* Preparación                                                         */
/* ------------------------------------------------------------------ */

export function setup({ id = 'local', players, rng = Math.random }) {
  check(players?.length >= 2 && players.length <= 5, 'Rutas se juega de 2 a 5.');
  const s = {
    gameId: 'rutas',
    id,
    version: 0,
    seq: 1,
    players: players.map((p) => ({ id: p.id, name: p.name, colorId: p.colorId, hand: {}, trains: TRAINS_PER_PLAYER, routePoints: 0, tickets: [], offer: null, left: false })),
    deck: shuffle(buildTrainDeck(), rng),
    discard: [],
    faceUp: [],
    tickets: shuffle(TICKETS.map((t) => t.id), rng),
    claims: {}, // routeId → playerId
    phase: 'choose-tickets', // choose-tickets | playing | finished
    turnIndex: Math.floor(rng() * players.length),
    turn: { drawn: 0 },
    finalTurnsLeft: null,
    results: null,
    winners: [],
    log: [],
    lastEvent: null,
  };
  for (const p of s.players) {
    for (let i = 0; i < 4; i++) addCard(p, s.deck.pop());
    p.offer = { ticketIds: s.tickets.splice(0, 3), min: 2 };
  }
  refillFaceUp(s, rng);
  log(s, 'Cada jugador recibe 4 cartas de vagón y 3 destinos: guarda al menos 2.');
  return s;
}

const addCard = (p, c) => (p.hand[c] = (p.hand[c] ?? 0) + 1);
const handTotal = (p) => Object.values(p.hand).reduce((t, n) => t + n, 0);

function drawFromDeck(s, rng) {
  if (!s.deck.length && s.discard.length) {
    s.deck = shuffle(s.discard, rng);
    s.discard = [];
    log(s, 'Se mezcla el descarte para formar un mazo nuevo.');
  }
  return s.deck.pop() ?? null;
}

/** Repone las 5 cartas visibles; con 3 locomotoras visibles se descartan las 5 y se reponen. */
function refillFaceUp(s, rng) {
  for (let guard = 0; guard < 10; guard++) {
    while (s.faceUp.length < 5) {
      const c = drawFromDeck(s, rng);
      if (!c) break;
      s.faceUp.push(c);
    }
    const locos = s.faceUp.filter((c) => c === LOCO).length;
    if (locos < 3) return;
    // Si no hay suficientes cartas para cambiar, se deja como está.
    if (s.deck.length + s.discard.length < 5) return;
    log(s, 'Tres locomotoras a la vista: se descartan las 5 cartas visibles.');
    s.discard.push(...s.faceUp);
    s.faceUp = [];
  }
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

function requireTurn(s, p) {
  check(s.phase === 'playing', 'Todavía se están eligiendo los destinos iniciales.');
  check(current(s).id === p.id, 'No es tu turno.');
  check(!p.offer, 'Primero elegí qué destinos te quedás.');
}

/** ¿Este tramo está disponible? Respeta las rutas dobles (con 2–3 jugadores sólo se usa una). */
function routeOpen(s, r, pid) {
  if (s.claims[r.id]) return false;
  if (r.pair && s.claims[r.pair]) {
    if (s.claims[r.pair] === pid) return false; // nadie usa los dos tramos de una ruta doble
    if (s.players.length <= 3) return false;
  }
  return true;
}

/** Cómo pagar un tramo con `color`: primero cartas de ese color, después locomotoras. */
export function paymentFor(p, route, color) {
  const need = route.length;
  if (color === LOCO) return (p.hand[LOCO] ?? 0) >= need ? { [LOCO]: need } : null;
  if (route.color !== 'gris' && color !== route.color) return null;
  if (!COLORS.includes(color)) return null;
  const own = Math.min(p.hand[color] ?? 0, need);
  const locos = need - own;
  if ((p.hand[LOCO] ?? 0) < locos) return null;
  const pay = {};
  if (own) pay[color] = own;
  if (locos) pay[LOCO] = locos;
  return pay;
}

const HANDLERS = {
  [ACTIONS.KEEP_TICKETS](s, p, { ticketIds = [] }) {
    check(p.offer, 'No tenés destinos para elegir.');
    if (s.phase === 'playing') check(current(s).id === p.id, 'No es tu turno.');
    const keep = [...new Set(ticketIds)].filter((id) => p.offer.ticketIds.includes(id));
    check(keep.length >= p.offer.min, `Tenés que quedarte con al menos ${p.offer.min}.`);
    const back = p.offer.ticketIds.filter((id) => !keep.includes(id));
    p.tickets.push(...keep);
    s.tickets.push(...back); // los devueltos van al fondo del mazo
    p.offer = null;
    log(s, `${p.name} se queda con ${keep.length} destino${keep.length > 1 ? 's' : ''}.`);
    event(s, { type: 'tickets', playerId: p.id, kept: keep.length });
    if (s.phase === 'choose-tickets') {
      if (s.players.every((x) => !x.offer || x.left)) {
        s.phase = 'playing';
        log(s, `Empieza ${current(s).name}.`);
      }
      return;
    }
    endTurn(s);
  },

  [ACTIONS.DRAW_CARD](s, p, { from }, rng) {
    requireTurn(s, p);
    let card;
    if (from === 'deck') {
      card = drawFromDeck(s, rng);
      check(card, 'No quedan cartas en el mazo.');
      addCard(p, card);
      log(s, `${p.name} roba del mazo.`);
      event(s, { type: 'draw', playerId: p.id, from: 'deck' });
      s.passes = 0;
    } else {
      const i = Number(from);
      check(Number.isInteger(i) && s.faceUp[i], 'Esa carta no está.');
      card = s.faceUp[i];
      if (card === LOCO) check(s.turn.drawn === 0, 'Como segunda carta no podés tomar una locomotora visible.');
      s.faceUp.splice(i, 1);
      addCard(p, card);
      log(s, `${p.name} toma ${card === LOCO ? 'una locomotora' : `una carta ${card}`} visible.`);
      event(s, { type: 'draw', playerId: p.id, from: i, card });
      refillFaceUp(s, rng);
      if (card === LOCO) return endTurn(s); // una locomotora visible es el turno entero
    }
    s.turn.drawn += 1;
    if (s.turn.drawn >= 2 || !canDrawMore(s)) endTurn(s);
  },

  [ACTIONS.CLAIM](s, p, { routeId, color }) {
    requireTurn(s, p);
    check(s.turn.drawn === 0, 'Ya robaste una carta: tenés que robar la segunda.');
    const r = ROUTE_BY_ID[routeId];
    check(r, 'Tramo desconocido.');
    check(routeOpen(s, r, p.id), s.claims[r.id] ? 'Ese tramo ya está ocupado.' : r.pair && s.claims[r.pair] === p.id ? 'No podés ocupar los dos tramos de una ruta doble.' : 'Con 2 o 3 jugadores sólo se usa uno de los tramos dobles.');
    check(p.trains >= r.length, `Te quedan ${p.trains} vagones: no alcanzan.`);
    const pay = paymentFor(p, r, color ?? (r.color === 'gris' ? undefined : r.color));
    check(pay, 'No tenés las cartas para ese tramo.');
    for (const [c, n] of Object.entries(pay)) {
      p.hand[c] -= n;
      if (!p.hand[c]) delete p.hand[c];
      for (let k = 0; k < n; k++) s.discard.push(c);
    }
    s.claims[r.id] = p.id;
    s.passes = 0;
    p.trains -= r.length;
    p.routePoints += ROUTE_POINTS[r.length];
    log(s, `${p.name} ocupa ${cname(r.a)} – ${cname(r.b)} (${r.length}) y suma ${ROUTE_POINTS[r.length]}.`);
    event(s, { type: 'claim', playerId: p.id, routeId: r.id });
    endTurn(s);
  },

  [ACTIONS.DRAW_TICKETS](s, p) {
    requireTurn(s, p);
    check(s.turn.drawn === 0, 'Ya robaste una carta: tenés que robar la segunda.');
    check(s.tickets.length > 0, 'No quedan destinos.');
    p.offer = { ticketIds: s.tickets.splice(0, 3), min: 1 };
    log(s, `${p.name} roba destinos.`);
    event(s, { type: 'draw-tickets', playerId: p.id });
  },

  /** Sin cartas para robar, ni tramos posibles, ni destinos: el turno pasa. Si pasan todos, termina. */
  [ACTIONS.PASS](s, p) {
    requireTurn(s, p);
    check(!getLegalActions(s, p.id).some((a) => a.type === ACTIONS.DRAW_CARD || a.type === ACTIONS.CLAIM || a.type === ACTIONS.DRAW_TICKETS), 'Todavía podés jugar.');
    s.passes = (s.passes ?? 0) + 1;
    log(s, `${p.name} no puede hacer nada y pasa.`);
    if (s.passes >= s.players.filter((x) => !x.left).length) {
      log(s, 'Nadie puede seguir jugando: termina la partida.');
      return finish(s);
    }
    endTurn(s);
  },

  /** Política de plataforma: abandonar = queda fuera; sus tramos siguen ocupados. */
  [ACTIONS.LEAVE](s, p) {
    const wasTurn = s.phase === 'playing' && current(s).id === p.id;
    p.left = true;
    if (p.offer) {
      s.tickets.push(...p.offer.ticketIds);
      p.offer = null;
    }
    log(s, `${p.name} abandona la partida.`);
    const rest = s.players.filter((x) => !x.left);
    if (rest.length === 1) return finish(s);
    if (s.phase === 'choose-tickets' && s.players.every((x) => !x.offer || x.left)) s.phase = 'playing';
    if (s.phase === 'choose-tickets' && current(s).left) s.turnIndex = nextIndex(s);
    if (wasTurn) endTurn(s);
  },
};

function canDrawMore(s) {
  return s.deck.length + s.discard.length > 0 || s.faceUp.some((c) => c !== LOCO);
}

function nextIndex(s) {
  const n = s.players.length;
  let i = s.turnIndex;
  do i = (i + 1) % n;
  while (s.players[i].left);
  return i;
}

function endTurn(s) {
  const p = current(s);
  s.turn = { drawn: 0 };
  if (s.finalTurnsLeft !== null) {
    s.finalTurnsLeft -= 1;
    if (s.finalTurnsLeft <= 0) return finish(s);
  } else if (p.trains <= 2 && !p.left) {
    // Último recorrido: cada jugador, incluido éste, juega un turno más.
    s.finalTurnsLeft = s.players.filter((x) => !x.left).length;
    log(s, `¡A ${p.name} le quedan ${p.trains} vagones! Cada jugador juega un último turno.`);
    event(s, { type: 'last-round', playerId: p.id });
  }
  s.turnIndex = nextIndex(s);
}

/* ------------------------------------------------------------------ */
/* Puntuación final                                                    */
/* ------------------------------------------------------------------ */

function graphOf(s, pid) {
  return ROUTES.filter((r) => s.claims[r.id] === pid);
}

export function ticketDone(s, pid, ticketId) {
  const t = TICKET[ticketId];
  const edges = graphOf(s, pid);
  const seen = new Set([t.a]);
  const stack = [t.a];
  while (stack.length) {
    const u = stack.pop();
    if (u === t.b) return true;
    for (const r of edges) {
      const v = r.a === u ? r.b : r.b === u ? r.a : null;
      if (v && !seen.has(v)) {
        seen.add(v);
        stack.push(v);
      }
    }
  }
  return false;
}

/** Camino continuo más largo (en vagones): no repite tramos, puede repetir ciudades. */
export function longestPath(s, pid) {
  const edges = graphOf(s, pid);
  let best = 0;
  const used = new Set();
  const dfs = (city, len) => {
    best = Math.max(best, len);
    for (const r of edges) {
      if (used.has(r.id)) continue;
      const v = r.a === city ? r.b : r.b === city ? r.a : null;
      if (!v) continue;
      used.add(r.id);
      dfs(v, len + r.length);
      used.delete(r.id);
    }
  };
  for (const c of new Set(edges.flatMap((r) => [r.a, r.b]))) dfs(c, 0);
  return best;
}

function finish(s) {
  s.phase = 'finished';
  const active = s.players.filter((p) => !p.left);
  const rows = s.players.map((p) => {
    const done = p.tickets.filter((t) => ticketDone(s, p.id, t));
    const failed = p.tickets.filter((t) => !done.includes(t));
    return {
      playerId: p.id,
      routes: p.routePoints,
      ticketsPlus: done.reduce((t, id) => t + TICKET[id].points, 0),
      ticketsMinus: failed.reduce((t, id) => t + TICKET[id].points, 0),
      completed: done.length,
      done,
      failed,
      longest: longestPath(s, p.id),
      bonus: 0,
    };
  });
  const maxLong = Math.max(...rows.filter((r) => !P(s, r.playerId).left).map((r) => r.longest));
  for (const r of rows) if (maxLong > 0 && r.longest === maxLong && !P(s, r.playerId).left) r.bonus = LONGEST_BONUS;
  for (const r of rows) r.total = r.routes + r.ticketsPlus - r.ticketsMinus + r.bonus;
  // Gana el de más puntos; desempate: más destinos cumplidos; luego el camino más largo.
  const ranked = rows.filter((r) => active.some((p) => p.id === r.playerId)).sort((a, b) => b.total - a.total || b.completed - a.completed || b.longest - a.longest);
  const top = ranked[0];
  s.winners = ranked.filter((r) => r.total === top.total && r.completed === top.completed && r.longest === top.longest).map((r) => r.playerId);
  s.results = rows;
  log(s, `Fin de la partida. Gana ${s.winners.map((id) => P(s, id).name).join(' y ')} con ${top.total} puntos.`);
  event(s, { type: 'game-over' });
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function getPendingDeciders(s) {
  if (s.phase === 'finished') return [];
  if (s.phase === 'choose-tickets') return s.players.filter((p) => p.offer && !p.left).map((p) => p.id);
  return [current(s).id];
}

export function getLegalActions(s, playerId) {
  const p = P(s, playerId);
  if (!p || p.left || s.phase === 'finished') return [];
  const out = [];
  if (p.offer && (s.phase === 'choose-tickets' || current(s).id === playerId)) out.push({ type: ACTIONS.KEEP_TICKETS, min: p.offer.min });
  else if (s.phase === 'playing' && current(s).id === playerId) {
    const second = s.turn.drawn > 0;
    const faceUp = s.faceUp.map((c, i) => (second && c === LOCO ? null : i)).filter((i) => i !== null);
    if (s.deck.length + s.discard.length > 0 || faceUp.length) out.push({ type: ACTIONS.DRAW_CARD, deck: s.deck.length + s.discard.length > 0, faceUp });
    if (!second) {
      const claimable = ROUTES.filter((r) => routeOpen(s, r, playerId) && p.trains >= r.length && (r.color === 'gris' ? [...COLORS, LOCO].some((c) => paymentFor(p, r, c)) : paymentFor(p, r, r.color) || paymentFor(p, r, LOCO))).map((r) => r.id);
      if (claimable.length) out.push({ type: ACTIONS.CLAIM, routeIds: claimable });
      if (s.tickets.length) out.push({ type: ACTIONS.DRAW_TICKETS });
    }
    if (!out.length) out.push({ type: ACTIONS.PASS });
  }
  out.push({ type: ACTIONS.LEAVE });
  return out;
}

export function getPlayerView(s, viewerId) {
  const me = viewerId ? P(s, viewerId) : null;
  const end = s.phase === 'finished';
  return {
    gameId: s.gameId,
    version: s.version,
    phase: s.phase,
    me: viewerId,
    currentPlayerId: s.phase === 'playing' ? current(s).id : null,
    turn: s.turn,
    faceUp: s.faceUp,
    deckCount: s.deck.length,
    discardCount: s.discard.length,
    ticketDeckCount: s.tickets.length,
    claims: s.claims,
    finalTurnsLeft: s.finalTurnsLeft,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      colorId: p.colorId,
      left: p.left,
      trains: p.trains,
      routePoints: p.routePoints,
      cardCount: handTotal(p),
      ticketCount: p.tickets.length,
      choosing: Boolean(p.offer),
      ...(end ? { tickets: p.tickets } : {}),
    })),
    myHand: me ? me.hand : {},
    myTickets: me ? me.tickets.map((id) => ({ ...TICKET[id], done: ticketDone(s, me.id, id) })) : [],
    myOffer: me?.offer ? { min: me.offer.min, tickets: me.offer.ticketIds.map((id) => TICKET[id]) } : null,
    myLongest: me ? longestPath(s, me.id) : 0,
    smallGame: s.players.length <= 3,
    results: s.results,
    winners: s.winners,
    lastEvent: s.lastEvent,
    log: s.log.slice(-60),
    legal: getLegalActions(s, viewerId),
    deciders: getPendingDeciders(s),
  };
}

export const getResult = (s) => (s.phase === 'finished' ? { winners: s.winners, scores: Object.fromEntries((s.results ?? []).map((r) => [r.playerId, r.total])) } : null);
export const removePlayer = (s, playerId, rng) => applyAction(s, { type: ACTIONS.LEAVE, playerId }, rng);

export const definition = {
  id: 'rutas',
  players: { min: 2, max: 5 },
  edition: 'Vagones y destinos (básico) · mapa propio de Sudamérica',
  setup,
  applyAction,
  getPlayerView,
  getLegalActions,
  getPendingDeciders,
  getResult,
  removePlayer,
  validateOptions,
};
