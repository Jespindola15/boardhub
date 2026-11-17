/**
 * Motor de Última Carta — edición de referencia Mattel 41001-0925.
 * Especificación: docs/reglas/ultima-carta/ESPECIFICACION.md
 *
 * Contrato común de BoardHub (lo usan el modo local y el servidor):
 *   setup({ players, options }, rng)        → state
 *   applyAction(state, { type, playerId, payload }, rng) → { ok, state } | { ok: false, error }
 *   getPlayerView(state, playerId)          → vista privada (sin manos ajenas ni mazo)
 *   getLegalActions(state, playerId)        → acciones posibles para ese jugador
 *   getPendingDeciders(state)               → quién debe decidir
 *   getResult(state)                        → null | { winners, scores }
 *   removePlayer(state, playerId, rng)      → { ok, state } (política de plataforma)
 * JS puro.
 */
import { buildDeck, cardPoints, cardLabel, isWild, COLORS, COLOR_NAMES } from '../data/cards.js';

export const ACTIONS = {
  PLAY_CARD: 'PLAY_CARD', // { cardId, color?, announce? }
  DRAW_CARD: 'DRAW_CARD',
  PASS: 'PASS', // tras robar una carta jugable y decidir no jugarla
  CHOOSE_COLOR: 'CHOOSE_COLOR', // primera carta Comodín
  ACCEPT_DRAW4: 'ACCEPT_DRAW4',
  CHALLENGE_DRAW4: 'CHALLENGE_DRAW4',
  CALL_LAST_CARD: 'CALL_LAST_CARD', // anunciar «¡Última carta!» después de jugar
  CATCH: 'CATCH', // { targetId }
  NEXT_ROUND: 'NEXT_ROUND',
  LEAVE: 'LEAVE', // política de plataforma
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8; // la edición admite 10; BoardHub, 8
export const HAND_SIZE = 7;
export const TARGET_SCORE = 500;
export const MISSED_CALL_PENALTY = 4; // edición 41001-0925: CUATRO cartas
export const DEFAULT_OPTIONS = { scoring: 'winner' }; // 'winner' | 'low' (ambos oficiales)

class RuleError extends Error {}
const fail = (m) => {
  throw new RuleError(m);
};
const check = (c, m) => {
  if (!c) fail(m);
};

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function log(s, text) {
  s.log.push({ id: `l${s.seq++}`, text });
  if (s.log.length > 100) s.log.splice(0, s.log.length - 100);
}

/** Último evento visual (para animaciones). No contiene información privada. */
function event(s, data) {
  s.lastEvent = { seq: s.seq++, ...data };
}

const seated = (s) => s.players.filter((p) => !p.left);
const current = (s) => s.players[s.turnIndex];
export const topCard = (s) => s.discard[s.discard.length - 1];

/** Índice del siguiente jugador en juego, `steps` posiciones en el sentido actual. */
function nextIndex(s, from = s.turnIndex, steps = 1) {
  const n = s.players.length;
  let i = from;
  for (let k = 0; k < steps; k++) {
    do i = (((i + s.direction) % n) + n) % n;
    while (s.players[i].left);
  }
  return i;
}

/** ¿Se puede jugar esta carta sobre la mesa actual? */
export function isPlayable(s, card) {
  if (isWild(card)) return true;
  if (card.color === s.currentColor) return true;
  const top = topCard(s);
  if (card.kind === 'number') return top.kind === 'number' && top.value === card.value;
  return card.kind === top.kind;
}

function drawCards(s, player, n, rng) {
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (!s.drawPile.length) {
      if (s.discard.length <= 1) break; // no quedan cartas para barajar
      const top = s.discard.pop();
      s.drawPile = shuffle(s.discard, rng);
      s.discard = [top];
      log(s, 'Se baraja el descarte para formar un nuevo mazo.');
    }
    player.hand.push(s.drawPile.pop());
    drawn++;
  }
  if (drawn) event(s, { type: 'draw', playerId: player.id, count: drawn });
  return drawn;
}

/* ------------------------------------------------------------------ */
/* Preparación                                                         */
/* ------------------------------------------------------------------ */

/** Elección de repartidor: cada uno roba una carta; más puntos reparte; los empatados repiten. */
function chooseDealer(players, rng) {
  let tied = players.map((_, i) => i);
  const rounds = [];
  while (tied.length > 1) {
    const deck = shuffle(buildDeck(), rng);
    const draws = tied.map((i) => ({ i, card: deck.pop() }));
    rounds.push(draws);
    const max = Math.max(...draws.map((d) => cardPoints(d.card)));
    tied = draws.filter((d) => cardPoints(d.card) === max).map((d) => d.i);
  }
  return { dealerIndex: tied[0], rounds };
}

export function setup({ id = 'local', players, options = {}, rng = Math.random }) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS)
    throw new Error(`Última Carta admite entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores`);
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!['winner', 'low'].includes(opts.scoring)) throw new Error('Método de puntuación no válido');
  const s = {
    id,
    gameId: 'ultima-carta',
    version: 0,
    phase: 'playing',
    options: opts,
    players: players.map((p) => ({ id: p.id, name: p.name, colorId: p.colorId, hand: [], score: 0, left: false })),
    round: 0,
    dealerIndex: 0,
    seq: 1,
    log: [],
    winners: null,
    lastEvent: null,
  };
  const { dealerIndex, rounds } = chooseDealer(s.players, rng);
  rounds.forEach((r, k) =>
    log(s, `${k === 0 ? 'Para repartir' : 'Desempate'}: ${r.map((d) => `${s.players[d.i].name} ${cardLabel(d.card)}`).join(', ')}.`),
  );
  s.dealerIndex = dealerIndex;
  startRound(s, rng);
  return s;
}

/** Alias con el nombre usado por Magnate. */
export const createGameState = (cfg) => setup(cfg);

function startRound(s, rng) {
  s.round += 1;
  s.phase = 'playing';
  s.direction = 1;
  s.drawnCardId = null;
  s.pendingDraw4 = null;
  s.awaitingColor = false;
  s.vulnerableId = null;
  s.reveal = null;
  s.roundResult = null;
  for (const p of s.players) p.hand = [];
  s.drawPile = shuffle(buildDeck(), rng);
  s.discard = [];
  const order = [];
  for (let k = 0, i = s.dealerIndex; k < s.players.length; k++) {
    i = (i + 1) % s.players.length;
    if (!s.players[i].left) order.push(s.players[i]);
  }
  for (let c = 0; c < HAND_SIZE; c++) for (const p of order) p.hand.push(s.drawPile.pop());

  let first = s.drawPile.pop();
  while (first.kind === 'wild4') {
    log(s, 'La primera carta es un Comodín Roba Cuatro: vuelve al mazo.');
    s.drawPile.push(first);
    s.drawPile = shuffle(s.drawPile, rng);
    first = s.drawPile.pop();
  }
  s.discard.push(first);
  s.currentColor = first.color;
  s.turnIndex = nextIndex(s, s.dealerIndex); // a la izquierda del repartidor
  event(s, { type: 'deal', round: s.round });
  log(s, `Mano ${s.round}. Reparte ${s.players[s.dealerIndex].name}. Primera carta: ${cardLabel(first)}.`);

  switch (first.kind) {
    case 'wild':
      s.awaitingColor = true; // decisión del proyecto: el primer jugador elige el color
      break;
    case 'skip':
      log(s, `${current(s).name} pierde el turno.`);
      s.turnIndex = nextIndex(s);
      break;
    case 'reverse':
      s.direction = -1; // decisión del proyecto: empieza el repartidor y se sigue hacia la derecha
      s.turnIndex = s.dealerIndex;
      log(s, `Reversa inicial: empieza ${current(s).name}.`);
      break;
    case 'draw2':
      drawCards(s, current(s), 2, rng);
      log(s, `${current(s).name} roba 2 cartas y pierde el turno.`);
      s.turnIndex = nextIndex(s);
      break;
    default:
      break;
  }
}

function handPoints(p) {
  return p.hand.reduce((a, c) => a + cardPoints(c), 0);
}

function endRound(s, winner) {
  const others = seated(s).filter((p) => p !== winner);
  const rivals = others.reduce((t, p) => t + handPoints(p), 0);
  if (s.options.scoring === 'winner') {
    winner.score += rivals;
  } else {
    for (const p of others) p.score += handPoints(p);
  }
  s.roundResult = {
    winnerId: winner.id,
    points: rivals,
    hands: Object.fromEntries(others.map((p) => [p.id, handPoints(p)])),
  };
  log(s, `${winner.name} se queda sin cartas y gana la mano (${rivals} puntos en manos rivales).`);
  event(s, { type: 'round-over', winnerId: winner.id });

  const reached = seated(s).some((p) => p.score >= TARGET_SCORE);
  if (reached) {
    s.phase = 'finished';
    if (s.options.scoring === 'winner') {
      s.winners = [winner.id];
    } else {
      const min = Math.min(...seated(s).map((p) => p.score));
      s.winners = seated(s).filter((p) => p.score === min).map((p) => p.id);
    }
    log(s, `🏆 Gana ${s.winners.map((id) => s.players.find((p) => p.id === id).name).join(' y ')}.`);
  } else {
    s.phase = 'round-over';
  }
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */

export function applyAction(state, action, rng = Math.random) {
  try {
    const handler = HANDLERS[action?.type];
    check(handler, `Acción desconocida: ${action?.type}`);
    check(state.phase !== 'finished', 'La partida ha terminado.');
    const s = structuredClone(state);
    const p = s.players.find((x) => x.id === action.playerId);
    check(p && !p.left, 'Jugador no válido.');
    if (action.type !== ACTIONS.NEXT_ROUND && action.type !== ACTIONS.LEAVE) check(s.phase === 'playing', 'La mano ha terminado.');
    // Empezar el turno (robar, jugar, resolver un +4) cierra la ventana para atrapar al que no anunció.
    const startsTurn = [ACTIONS.PLAY_CARD, ACTIONS.DRAW_CARD, ACTIONS.ACCEPT_DRAW4, ACTIONS.CHALLENGE_DRAW4, ACTIONS.CHOOSE_COLOR].includes(action.type);
    if (s.vulnerableId && startsTurn && p.id !== s.vulnerableId) s.vulnerableId = null;
    // La mano mostrada en un desafío sólo dura hasta la siguiente acción.
    if (s.reveal && action.type !== ACTIONS.CATCH && action.type !== ACTIONS.CALL_LAST_CARD) s.reveal = null;
    handler(s, p, action.payload ?? {}, rng);
    s.version += 1;
    return { ok: true, state: s };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
}

function requireTurn(s, p) {
  check(current(s).id === p.id, 'No es tu turno.');
  check(!s.awaitingColor, 'Primero hay que elegir el color.');
  check(!s.pendingDraw4, 'Primero hay que resolver el Comodín Roba Cuatro.');
}

const HANDLERS = {
  [ACTIONS.CHOOSE_COLOR](s, p, { color }) {
    check(s.awaitingColor && current(s).id === p.id, 'No te toca elegir el color.');
    check(COLORS.includes(color), 'Color no válido.');
    s.currentColor = color;
    s.awaitingColor = false;
    log(s, `${p.name} elige el color ${COLOR_NAMES[color]}.`);
  },

  [ACTIONS.PLAY_CARD](s, p, { cardId, color, announce }, rng) {
    requireTurn(s, p);
    const idx = p.hand.findIndex((c) => c.id === cardId);
    check(idx >= 0, 'No tienes esa carta.');
    if (s.drawnCardId) check(cardId === s.drawnCardId, 'Después de robar sólo puedes jugar la carta robada.');
    const card = p.hand[idx];
    check(isPlayable(s, card), 'Esa carta no se puede jugar ahora.');
    if (isWild(card)) check(COLORS.includes(color), 'Elige un color para el comodín.');

    // Roba Cuatro "ilegal": quien lo juega tenía alguna carta del color vigente.
    const illegal = card.kind === 'wild4' && p.hand.some((c) => c.id !== card.id && c.color === s.currentColor);
    const previousColor = s.currentColor;

    p.hand.splice(idx, 1);
    s.discard.push(card);
    s.currentColor = isWild(card) ? color : card.color;
    s.drawnCardId = null;
    event(s, { type: 'play', playerId: p.id, card });
    log(s, `${p.name} juega ${cardLabel(card)}${isWild(card) ? ` y elige ${COLOR_NAMES[color]}` : ''}.`);

    if (p.hand.length === 1) {
      if (announce) log(s, `${p.name}: «¡Última carta!»`);
      else s.vulnerableId = p.id;
    }

    const twoPlayers = seated(s).length === 2;
    switch (card.kind) {
      case 'skip':
        s.turnIndex = nextIndex(s, s.turnIndex, 2); // con 2 jugadores vuelve a jugar el mismo
        break;
      case 'reverse':
        s.direction *= -1;
        s.turnIndex = twoPlayers ? s.turnIndex : nextIndex(s);
        break;
      case 'draw2': {
        const victim = s.players[nextIndex(s)];
        drawCards(s, victim, 2, rng);
        log(s, `${victim.name} roba 2 y pierde el turno.`);
        s.turnIndex = nextIndex(s, s.turnIndex, 2);
        break;
      }
      case 'wild4': {
        const v = nextIndex(s);
        s.pendingDraw4 = { fromId: p.id, victimId: s.players[v].id, illegal, previousColor };
        s.turnIndex = v;
        break;
      }
      default:
        s.turnIndex = nextIndex(s);
    }

    if (!p.hand.length) {
      // Última carta Roba Cuatro: el siguiente roba sin desafío y las cartas cuentan.
      if (s.pendingDraw4) {
        const victim = s.players.find((x) => x.id === s.pendingDraw4.victimId);
        drawCards(s, victim, 4, rng);
        log(s, `${victim.name} roba 4.`);
        s.pendingDraw4 = null;
      }
      s.vulnerableId = null;
      endRound(s, p);
    }
  },

  [ACTIONS.DRAW_CARD](s, p, _x, rng) {
    requireTurn(s, p);
    check(!s.drawnCardId, 'Ya robaste una carta en este turno.');
    const got = drawCards(s, p, 1, rng);
    const card = got ? p.hand[p.hand.length - 1] : null;
    if (card && isPlayable(s, card)) {
      s.drawnCardId = card.id;
      log(s, `${p.name} roba una carta.`);
    } else {
      log(s, got ? `${p.name} roba una carta y pasa.` : `No quedan cartas para robar: ${p.name} pasa.`);
      s.turnIndex = nextIndex(s);
    }
  },

  [ACTIONS.PASS](s, p) {
    requireTurn(s, p);
    check(s.drawnCardId, 'Sólo puedes pasar después de robar una carta jugable.');
    s.drawnCardId = null;
    s.turnIndex = nextIndex(s);
    log(s, `${p.name} pasa.`);
  },

  [ACTIONS.ACCEPT_DRAW4](s, p, _x, rng) {
    const d = s.pendingDraw4;
    check(d && d.victimId === p.id, 'No hay ningún Roba Cuatro para ti.');
    drawCards(s, p, 4, rng);
    s.pendingDraw4 = null;
    s.turnIndex = nextIndex(s);
    log(s, `${p.name} roba 4 cartas y pierde el turno.`);
  },

  [ACTIONS.CHALLENGE_DRAW4](s, p, _x, rng) {
    const d = s.pendingDraw4;
    check(d && d.victimId === p.id, 'Sólo puede desafiar quien debe robar las 4 cartas.');
    const offender = s.players.find((x) => x.id === d.fromId);
    s.pendingDraw4 = null;
    // El desafiado muestra su mano sólo a quien desafió.
    s.reveal = { toId: p.id, ofId: offender.id, cards: structuredClone(offender.hand), previousColor: d.previousColor };
    if (d.illegal) {
      drawCards(s, offender, 4, rng);
      log(s, `${p.name} desafía y acierta: ${offender.name} tenía una carta del color y roba 4.`);
      // quien desafió juega normalmente (sigue siendo su turno)
    } else {
      drawCards(s, p, 6, rng);
      s.turnIndex = nextIndex(s);
      log(s, `${p.name} desafía y se equivoca: roba 6 cartas y pierde el turno.`);
    }
  },

  [ACTIONS.CALL_LAST_CARD](s, p) {
    check(s.vulnerableId === p.id, 'No tienes nada que anunciar.');
    s.vulnerableId = null;
    log(s, `${p.name}: «¡Última carta!»`);
  },

  [ACTIONS.CATCH](s, p, { targetId }, rng) {
    check(s.vulnerableId && s.vulnerableId === targetId && targetId !== p.id, 'No hay a quién atrapar.');
    const target = s.players.find((x) => x.id === targetId);
    s.vulnerableId = null;
    drawCards(s, target, MISSED_CALL_PENALTY, rng);
    log(s, `${p.name} atrapa a ${target.name} sin anunciar su última carta: roba ${MISSED_CALL_PENALTY}.`);
  },

  [ACTIONS.NEXT_ROUND](s, _p, _x, rng) {
    check(s.phase === 'round-over', 'La mano todavía no terminó.');
    let i = s.dealerIndex;
    do i = (i + 1) % s.players.length;
    while (s.players[i].left);
    s.dealerIndex = i;
    startRound(s, rng);
  },

  /** Política de plataforma: quien se va baraja su mano en el mazo y deja de jugar. */
  [ACTIONS.LEAVE](s, p, _x, rng) {
    const wasCurrent = s.phase === 'playing' && current(s).id === p.id;
    s.drawPile = shuffle([...s.drawPile, ...p.hand], rng);
    p.hand = [];
    p.left = true;
    log(s, `${p.name} abandona la partida.`);
    if (s.vulnerableId === p.id) s.vulnerableId = null;
    if (s.pendingDraw4 && (s.pendingDraw4.victimId === p.id || s.pendingDraw4.fromId === p.id)) s.pendingDraw4 = null;
    const rest = seated(s);
    if (rest.length < MIN_PLAYERS) {
      s.phase = 'finished';
      s.winners = rest.map((x) => x.id);
      log(s, `🏆 ${rest[0].name} gana: no quedan rivales.`);
      return;
    }
    if (s.players[s.dealerIndex].left) s.dealerIndex = nextIndex({ ...s, direction: 1 }, s.dealerIndex);
    if (s.phase === 'playing' && (wasCurrent || s.players[s.turnIndex].left)) {
      s.drawnCardId = null;
      s.turnIndex = nextIndex(s);
    }
  },
};

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function getPendingDeciders(s) {
  if (s.phase === 'finished') return [];
  if (s.phase === 'round-over') return seated(s).map((p) => p.id);
  if (s.pendingDraw4) return [s.pendingDraw4.victimId];
  return [current(s).id];
}

/** Primer jugador que debe decidir (modo "misma PC"). */
export function getActingPlayerId(s) {
  return getPendingDeciders(s)[0] ?? null;
}

/** Acciones posibles para `playerId` (la interfaz no recalcula reglas). */
export function getLegalActions(s, playerId) {
  const p = s.players.find((x) => x.id === playerId);
  const out = [];
  if (!p || p.left || s.phase === 'finished') return out;
  if (s.phase === 'round-over') return [{ type: ACTIONS.NEXT_ROUND }, { type: ACTIONS.LEAVE }];
  if (s.vulnerableId === playerId) out.push({ type: ACTIONS.CALL_LAST_CARD });
  if (s.vulnerableId && s.vulnerableId !== playerId) out.push({ type: ACTIONS.CATCH, targetId: s.vulnerableId });
  if (s.pendingDraw4?.victimId === playerId) out.push({ type: ACTIONS.ACCEPT_DRAW4 }, { type: ACTIONS.CHALLENGE_DRAW4 });
  const isTurn = current(s).id === playerId && !s.pendingDraw4;
  if (isTurn && s.awaitingColor) out.push({ type: ACTIONS.CHOOSE_COLOR });
  if (isTurn && !s.awaitingColor) {
    const playable = p.hand.filter((c) => isPlayable(s, c) && (!s.drawnCardId || c.id === s.drawnCardId)).map((c) => c.id);
    if (playable.length) out.push({ type: ACTIONS.PLAY_CARD, cardIds: playable });
    out.push(s.drawnCardId ? { type: ACTIONS.PASS } : { type: ACTIONS.DRAW_CARD });
  }
  out.push({ type: ACTIONS.LEAVE });
  return out;
}

/**
 * Vista privada de `viewerId`: su mano completa; de los demás, sólo cuántas cartas tienen.
 * El mazo se reduce a su tamaño. `pendingDraw4.illegal` nunca se envía.
 */
export function getPlayerView(s, viewerId) {
  return {
    gameId: s.gameId,
    version: s.version,
    phase: s.phase,
    options: s.options,
    round: s.round,
    dealerId: s.players[s.dealerIndex]?.id,
    direction: s.direction,
    currentPlayerId: s.phase === 'playing' ? current(s).id : null,
    currentColor: s.currentColor,
    discardTop: s.discard.slice(-3),
    discardCount: s.discard.length,
    drawCount: s.drawPile.length,
    awaitingColor: s.awaitingColor,
    drawnCardId: s.players.find((p) => p.id === viewerId)?.hand.some((c) => c.id === s.drawnCardId) ? s.drawnCardId : null,
    pendingDraw4: s.pendingDraw4 ? { fromId: s.pendingDraw4.fromId, victimId: s.pendingDraw4.victimId } : null,
    vulnerableId: s.vulnerableId,
    reveal: s.reveal && s.reveal.toId === viewerId ? s.reveal : null,
    roundResult: s.roundResult,
    winners: s.winners,
    lastEvent: s.lastEvent,
    me: viewerId,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      colorId: p.colorId,
      score: p.score,
      left: p.left,
      handCount: p.hand.length,
      ...(p.id === viewerId ? { hand: p.hand } : {}),
    })),
    log: s.log.slice(-40),
    legal: getLegalActions(s, viewerId),
    deciders: getPendingDeciders(s),
  };
}

export function getResult(s) {
  if (s.phase !== 'finished') return null;
  return { winners: s.winners, scores: Object.fromEntries(s.players.map((p) => [p.id, p.score])) };
}

export function removePlayer(s, playerId, rng) {
  return applyAction(s, { type: ACTIONS.LEAVE, playerId }, rng);
}

/** Definición del juego para el servidor y el modo local. */
export const definition = {
  id: 'ultima-carta',
  players: { min: MIN_PLAYERS, max: MAX_PLAYERS },
  edition: 'Mattel 41001-0925',
  setup,
  applyAction,
  getPlayerView,
  getLegalActions,
  getPendingDeciders,
  getResult,
  removePlayer,
  validateOptions(options = {}) {
    return { scoring: options.scoring === 'low' ? 'low' : 'winner' };
  },
};
