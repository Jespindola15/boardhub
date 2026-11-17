/**
 * Motor de Chinchón — Reglamento de Chin-Chon de los Juegos Bonaerenses.
 * Especificación: docs/reglas/chinchon/ESPECIFICACION.md
 *
 * Contrato común de BoardHub: setup · applyAction · getPlayerView · getLegalActions ·
 * getPendingDeciders · getResult · removePlayer · validateOptions. JS puro.
 */
import { buildSpanishDeck, shuffle, cardName } from '../../../shared/spanish-deck/deck.js';
import { bestArrangement, chinchonOf, settleHand, pointsOf } from './melds.js';

export const ACTIONS = {
  DRAW: 'DRAW', // { from: 'deck' | 'discard' }
  DISCARD: 'DISCARD', // { cardId }
  CUT: 'CUT', // { cardId } — descarta tapada y corta
  NEXT_ROUND: 'NEXT_ROUND',
  LEAVE: 'LEAVE',
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4; // el reglamento juega en mesas de 4
export const HAND_SIZE = 7;
export const TARGET = 101;
export const MAX_CUT_POINTS = 5;
export const ALL_MELDED_BONUS = -10;

/** 48 cartas (1 a 12 de cada palo) + 2 comodines = 50 (art. 5.1). */
export const buildDeck = () => buildSpanishDeck({ ranks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], jokers: 2 });

class RuleError extends Error {}
const fail = (m) => {
  throw new RuleError(m);
};
const check = (c, m) => {
  if (!c) fail(m);
};

function log(s, text) {
  s.log.push({ id: `l${s.seq++}`, text });
  if (s.log.length > 100) s.log.splice(0, s.log.length - 100);
}
const event = (s, data) => (s.lastEvent = { seq: s.seq++, ...data });

const active = (s) => s.players.filter((p) => !p.out && !p.left);
const current = (s) => s.players[s.turnIndex];

/** Siguiente jugador en juego (el juego avanza hacia la derecha = orden de asientos). */
function nextIndex(s, from) {
  const n = s.players.length;
  let i = from;
  do i = (i + 1) % n;
  while (s.players[i].out || s.players[i].left);
  return i;
}

/* ------------------------------------------------------------------ */
/* Preparación                                                         */
/* ------------------------------------------------------------------ */

/** Primer dador: quien saca la carta más alta (art. 6.4). Los comodines no cuentan; empates repiten. */
function chooseDealer(s, rng) {
  let tied = s.players.map((_, i) => i);
  while (tied.length > 1) {
    const deck = shuffle(buildDeck().filter((c) => !c.joker), rng);
    const draws = tied.map((i) => ({ i, card: deck.pop() }));
    log(s, `Para dar: ${draws.map((d) => `${s.players[d.i].name} ${cardName(d.card)}`).join(', ')}.`);
    const max = Math.max(...draws.map((d) => d.card.rank));
    tied = draws.filter((d) => d.card.rank === max).map((d) => d.i);
  }
  return tied[0];
}

export function setup({ id = 'local', players, rng = Math.random }) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS)
    throw new Error(`Chinchón admite entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores`);
  const s = {
    id,
    gameId: 'chinchon',
    version: 0,
    phase: 'playing',
    options: {},
    players: players.map((p) => ({ id: p.id, name: p.name, colorId: p.colorId, hand: [], score: 0, out: false, left: false })),
    round: 0,
    dealerIndex: 0,
    seq: 1,
    log: [],
    history: [],
    winners: null,
    lastEvent: null,
  };
  s.dealerIndex = chooseDealer(s, rng);
  startRound(s, rng);
  return s;
}
export const createGameState = (cfg) => setup(cfg);

function startRound(s, rng) {
  s.round += 1;
  s.phase = 'playing';
  s.step = 'draw';
  s.reshuffles = 0;
  s.roundResult = null;
  s.table = [];
  s.cutCard = null;
  for (const p of s.players) p.hand = [];
  s.deck = shuffle(buildDeck(), rng);
  s.discard = [];
  // Reparto de a una carta, empezando por la derecha del dador (art. 7.1).
  const order = [];
  for (let k = 0, i = s.dealerIndex; k < s.players.length; k++) {
    i = (i + 1) % s.players.length;
    if (!s.players[i].out && !s.players[i].left) order.push(s.players[i]);
  }
  for (let c = 0; c < HAND_SIZE; c++) for (const p of order) p.hand.push(s.deck.pop());
  // La octava carta se da vuelta: la "mano" puede robar del pozo o del mazo (art. 7.17).
  s.discard.push(s.deck.pop());
  s.turnIndex = nextIndex(s, s.dealerIndex);
  s.mano = s.turnIndex;
  event(s, { type: 'deal', round: s.round });
  log(s, `Mano ${s.round}. Da ${s.players[s.dealerIndex].name}; es mano ${current(s).name}.`);
}

/* ------------------------------------------------------------------ */
/* Fin de la mano                                                      */
/* ------------------------------------------------------------------ */

function finishRound(s, { cutterId = null, cutBonus = 0, chinchonWin = false, exhausted = false }) {
  const results = {};
  let table = [];
  // El que corta baja primero; luego, en orden, desde su derecha (art. 7.9–7.10).
  const startIdx = cutterId ? s.players.findIndex((p) => p.id === cutterId) : s.turnIndex;
  const order = [];
  for (let k = 0, i = startIdx; k < s.players.length; k++, i = (i + 1) % s.players.length) {
    const p = s.players[i];
    if (!p.out && !p.left) order.push(p);
  }
  for (const p of order) {
    if (p.id === cutterId) {
      const arr = s.cutArrangement;
      table = [...table, ...arr.melds.map((m) => ({ ...m, ownerId: p.id }))];
      results[p.id] = { melds: arr.melds, layOffs: [], leftover: arr.leftover, points: cutBonus !== 0 ? cutBonus : arr.points, cut: true };
    } else {
      // Cada uno elige lo que más le conviene: menos puntos (combinaciones + descartes sobre la mesa).
      const r = settleHand(p.hand, table, { allowLayOff: !exhausted && Boolean(cutterId) });
      table = r.table.map((m) => ({ ...m, ownerId: m.ownerId ?? p.id }));
      results[p.id] = { melds: r.melds, layOffs: r.layOffs, leftover: r.leftover, points: r.points };
    }
  }

  if (chinchonWin) {
    for (const p of active(s)) results[p.id].points = p.id === cutterId ? 0 : TARGET;
  }
  for (const p of active(s)) p.score += results[p.id].points;
  s.table = table;
  s.roundResult = { cutterId, chinchonWin, exhausted, results };
  s.history.push({ round: s.round, cutterId, points: Object.fromEntries(active(s).map((p) => [p.id, results[p.id].points])) });
  event(s, { type: 'round-over' });

  const roundPlayers = active(s);
  if (chinchonWin) {
    const w = s.players.find((p) => p.id === cutterId);
    for (const p of roundPlayers) if (p !== w) p.out = true;
    return endGame(s, [w.id], `${w.name} hace Chin-Chon sin comodín y gana el partido.`);
  }

  // Quien supera 101 queda afuera y no puede volver a engancharse (art. 7.13).
  const over = roundPlayers.filter((p) => p.score > TARGET);
  for (const p of over) {
    p.out = true;
    log(s, `${p.name} supera los ${TARGET} puntos y queda afuera.`);
  }
  const alive = active(s);
  if (alive.length === 1) return endGame(s, [alive[0].id], `${alive[0].name} gana el partido.`);
  if (alive.length === 0) {
    // Todos superaron 101: gana el de menos puntos; empate → el que cortó; si no cortó ninguno, la mano (art. 8.5–8.7).
    const min = Math.min(...roundPlayers.map((p) => p.score));
    let tied = roundPlayers.filter((p) => p.score === min);
    if (tied.length > 1) tied = tied.filter((p) => p.id === cutterId).length ? tied.filter((p) => p.id === cutterId) : tied.filter((p) => p === s.players[s.mano]).length ? [s.players[s.mano]] : tied;
    return endGame(s, tied.map((p) => p.id), `Todos superaron ${TARGET}: gana ${tied.map((p) => p.name).join(' y ')}.`);
  }
  s.phase = 'round-over';
}

function endGame(s, winnerIds, text) {
  s.phase = 'finished';
  s.winners = winnerIds;
  log(s, `🏆 ${text}`);
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
    const p = s.players.find((x) => x.id === action.playerId);
    check(p && !p.left, 'Jugador no válido.');
    handler(s, p, action.payload ?? {}, rng);
    s.version += 1;
    return { ok: true, state: s };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
}

function requireTurn(s, p, step) {
  check(s.phase === 'playing', 'La mano terminó.');
  check(!p.out, 'Estás fuera del partido.');
  check(current(s).id === p.id, 'No es tu turno.');
  check(s.step === step, step === 'draw' ? 'Primero tenés que robar.' : 'Ya robaste: ahora descartá o cortá.');
}

const HANDLERS = {
  [ACTIONS.DRAW](s, p, { from }, rng) {
    requireTurn(s, p, 'draw');
    if (from === 'discard') {
      check(s.discard.length, 'El pozo está vacío.');
      const c = s.discard.pop();
      p.hand.push(c);
      log(s, `${p.name} levanta ${cardName(c)} del pozo.`);
    } else {
      check(from === 'deck', 'Origen no válido.');
      if (!s.deck.length) {
        // Mazo agotado (art. 7.12): la primera vez se mezcla el pozo; la segunda termina la mano.
        if (s.reshuffles >= 1 || !s.discard.length) {
          log(s, 'Se agotó el mazo por segunda vez: termina la mano sin descartes.');
          return finishRound(s, { exhausted: true });
        }
        s.deck = shuffle(s.discard, rng);
        s.discard = [];
        s.reshuffles += 1;
        log(s, 'Se agotó el mazo: se mezcla el pozo.');
      }
      p.hand.push(s.deck.pop());
      log(s, `${p.name} roba del mazo.`);
    }
    s.step = 'discard';
    event(s, { type: 'draw', playerId: p.id, from });
  },

  [ACTIONS.DISCARD](s, p, { cardId }) {
    requireTurn(s, p, 'discard');
    const i = p.hand.findIndex((c) => c.id === cardId);
    check(i >= 0, 'No tenés esa carta.');
    check(!p.hand[i].joker, 'Los comodines no se pueden tirar al pozo.');
    const [c] = p.hand.splice(i, 1);
    s.discard.push(c);
    log(s, `${p.name} tira ${cardName(c)}.`);
    event(s, { type: 'discard', playerId: p.id, card: c });
    s.step = 'draw';
    s.turnIndex = nextIndex(s, s.turnIndex);
  },

  [ACTIONS.CUT](s, p, { cardId }) {
    requireTurn(s, p, 'discard');
    const i = p.hand.findIndex((c) => c.id === cardId);
    check(i >= 0, 'No tenés esa carta.');
    check(!p.hand[i].joker, 'Los comodines no se pueden descartar.');
    const rest = p.hand.filter((c) => c.id !== cardId);
    const chin = chinchonOf(rest);
    const arr = chin ? { melds: [chin.meld], leftover: [], points: 0 } : bestArrangement(rest);
    check(arr.points <= MAX_CUT_POINTS, `Para cortar, lo que no combina no puede sumar más de ${MAX_CUT_POINTS} (te quedan ${arr.points}).`);
    // La carta del corte va tapada (art. 7.8): nadie la ve.
    s.cutCard = p.hand[i];
    p.hand = rest;
    s.cutArrangement = arr;
    if (chin && !chin.withJoker) {
      log(s, `¡${p.name} hace CHIN-CHON sin comodín!`);
      return finishRound(s, { cutterId: p.id, chinchonWin: true });
    }
    let bonus = 0;
    if (chin) {
      bonus = ALL_MELDED_BONUS;
      log(s, `${p.name} corta con Chin-Chon con comodín: ${ALL_MELDED_BONUS}.`);
    } else if (arr.leftover.length === 0) {
      bonus = ALL_MELDED_BONUS;
      log(s, `${p.name} corta con todas las cartas combinadas: ${ALL_MELDED_BONUS}.`);
    } else {
      log(s, `${p.name} corta con ${arr.points}.`);
    }
    finishRound(s, { cutterId: p.id, cutBonus: bonus });
  },

  [ACTIONS.NEXT_ROUND](s, _p, _x, rng) {
    check(s.phase === 'round-over', 'La mano todavía no terminó.');
    s.dealerIndex = nextIndex(s, s.dealerIndex);
    startRound(s, rng);
  },

  /** Política de plataforma: abandonar = quedar afuera; su mano vuelve al mazo. */
  [ACTIONS.LEAVE](s, p, _x, rng) {
    const wasTurn = s.phase === 'playing' && current(s).id === p.id;
    s.deck = shuffle([...s.deck, ...p.hand], rng);
    p.hand = [];
    p.left = true;
    p.out = true;
    log(s, `${p.name} abandona el partido.`);
    const alive = active(s);
    if (alive.length === 1) return endGame(s, [alive[0].id], `${alive[0].name} gana: no quedan rivales.`);
    if (s.players[s.dealerIndex].left) s.dealerIndex = nextIndex(s, s.dealerIndex);
    if (wasTurn) {
      s.step = 'draw';
      s.turnIndex = nextIndex(s, s.turnIndex);
    }
  },
};

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function getPendingDeciders(s) {
  if (s.phase === 'finished') return [];
  if (s.phase === 'round-over') return active(s).map((p) => p.id);
  return [current(s).id];
}
export const getActingPlayerId = (s) => getPendingDeciders(s)[0] ?? null;

export function getLegalActions(s, playerId) {
  const p = s.players.find((x) => x.id === playerId);
  if (!p || p.left || s.phase === 'finished') return [];
  if (s.phase === 'round-over') return p.out ? [{ type: ACTIONS.LEAVE }] : [{ type: ACTIONS.NEXT_ROUND }, { type: ACTIONS.LEAVE }];
  const out = [];
  if (!p.out && current(s).id === playerId) {
    if (s.step === 'draw') out.push({ type: ACTIONS.DRAW, from: ['deck', ...(s.discard.length ? ['discard'] : [])] });
    else {
      const discardable = p.hand.filter((c) => !c.joker).map((c) => c.id);
      out.push({ type: ACTIONS.DISCARD, cardIds: discardable });
      const cuttable = discardable.filter((id) => {
        const rest = p.hand.filter((c) => c.id !== id);
        return chinchonOf(rest) || bestArrangement(rest).points <= MAX_CUT_POINTS;
      });
      if (cuttable.length) out.push({ type: ACTIONS.CUT, cardIds: cuttable });
    }
  }
  out.push({ type: ACTIONS.LEAVE });
  return out;
}

/** Vista privada: mi mano completa; de los demás sólo la cantidad. Del pozo sólo la carta de arriba. */
export function getPlayerView(s, viewerId) {
  const me = s.players.find((p) => p.id === viewerId);
  const reveal = s.phase !== 'playing'; // al terminar la mano todos bajan sus juegos
  return {
    gameId: s.gameId,
    version: s.version,
    phase: s.phase,
    round: s.round,
    step: s.step,
    me: viewerId,
    dealerId: s.players[s.dealerIndex]?.id,
    currentPlayerId: s.phase === 'playing' ? current(s).id : null,
    deckCount: s.deck.length,
    discardTop: s.discard[s.discard.length - 1] ?? null,
    discardCount: s.discard.length,
    myArrangement: me && me.hand.length ? bestArrangement(me.hand) : null,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      colorId: p.colorId,
      score: p.score,
      out: p.out,
      left: p.left,
      handCount: p.hand.length,
      ...(p.id === viewerId || reveal ? { hand: p.hand } : {}),
    })),
    roundResult: s.roundResult,
    history: s.history,
    winners: s.winners,
    lastEvent: s.lastEvent,
    log: s.log.slice(-40),
    legal: getLegalActions(s, viewerId),
    deciders: getPendingDeciders(s),
  };
}

export const getResult = (s) => (s.phase === 'finished' ? { winners: s.winners, scores: Object.fromEntries(s.players.map((p) => [p.id, p.score])) } : null);
export const removePlayer = (s, playerId, rng) => applyAction(s, { type: ACTIONS.LEAVE, playerId }, rng);

export const definition = {
  id: 'chinchon',
  players: { min: MIN_PLAYERS, max: MAX_PLAYERS },
  edition: 'Juegos Bonaerenses — Chin-Chon',
  setup,
  applyAction,
  getPlayerView,
  getLegalActions,
  getPendingDeciders,
  getResult,
  removePlayer,
  validateOptions: () => ({}),
};

export { pointsOf };
