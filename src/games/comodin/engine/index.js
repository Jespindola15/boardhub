/**
 * Motor de reglas de Comodín (juego de descarte por colores, reglas clásicas).
 * Mismo contrato que Magnate:
 *   applyAction(state, { type, playerId, payload }, rng) -> { ok, state } | { ok: false, error }
 * JS puro. Reglamento: docs/REGLAMENTO_COMODIN.md
 */
import { buildDeck, cardPoints, cardLabel, COLORS, COLOR_NAMES } from '../data/cards.js';

export const ACTIONS = {
  PLAY_CARD: 'PLAY_CARD', // { cardId, color?, callComodin? }
  DRAW_CARD: 'DRAW_CARD',
  PASS: 'PASS', // tras robar una carta jugable y decidir no jugarla
  CHOOSE_COLOR: 'CHOOSE_COLOR', // si la carta inicial es un Comodín
  ACCEPT_DRAW4: 'ACCEPT_DRAW4',
  CHALLENGE_DRAW4: 'CHALLENGE_DRAW4',
  CALL_COMODIN: 'CALL_COMODIN', // cantar tarde, antes de que te atrapen
  CATCH: 'CATCH', // { targetId } atrapar a quien no cantó
  NEXT_ROUND: 'NEXT_ROUND',
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const HAND_SIZE = 7;
export const DEFAULT_TARGET = 500;

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
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
}

const current = (s) => s.players[s.turnIndex];
const nextIndex = (s, from = s.turnIndex, steps = 1) =>
  (((from + s.direction * steps) % s.players.length) + s.players.length) % s.players.length;
export const topCard = (s) => s.discard[s.discard.length - 1];

/** ¿Se puede jugar esta carta sobre la mesa actual? */
export function isPlayable(s, card) {
  if (card.kind === 'wild' || card.kind === 'wild4') return true;
  const top = topCard(s);
  if (card.color === s.currentColor) return true;
  if (card.kind === 'number') return top.kind === 'number' && top.value === card.value;
  return card.kind === top.kind;
}

function drawCards(s, player, n, rng) {
  for (let i = 0; i < n; i++) {
    if (!s.drawPile.length) {
      if (s.discard.length <= 1) break; // no quedan cartas: se roba lo que haya
      const top = s.discard.pop();
      s.drawPile = shuffle(s.discard, rng);
      s.discard = [top];
      log(s, 'Se baraja el descarte para formar un nuevo mazo.');
    }
    player.hand.push(s.drawPile.pop());
  }
}

/* ------------------------------------------------------------------ */
/* Creación y rondas                                                   */
/* ------------------------------------------------------------------ */

export function createGameState({ id = 'local', players, rng = Math.random, targetScore = DEFAULT_TARGET }) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS)
    throw new Error(`Comodín admite entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores`);
  const s = {
    id,
    version: 0,
    phase: 'playing',
    players: players.map((p) => ({ ...p, hand: [], score: 0 })),
    targetScore,
    round: 0,
    dealerIndex: players.length - 1,
    seq: 1,
    log: [],
    winnerId: null,
  };
  startRound(s, rng);
  return s;
}

function startRound(s, rng) {
  s.round += 1;
  s.phase = 'playing';
  s.direction = 1;
  s.drawnCardId = null;
  s.pendingDraw4 = null;
  s.awaitingColor = false;
  s.vulnerableId = null;
  s.roundResult = null;
  for (const p of s.players) p.hand = [];
  s.drawPile = shuffle(buildDeck(), rng);
  s.discard = [];
  for (let i = 0; i < HAND_SIZE; i++) for (const p of s.players) p.hand.push(s.drawPile.pop());

  // Carta inicial: un Roba Cuatro vuelve al mazo y se da vuelta otra.
  let first = s.drawPile.pop();
  while (first.kind === 'wild4') {
    s.drawPile.unshift(first);
    s.drawPile = shuffle(s.drawPile, rng);
    first = s.drawPile.pop();
  }
  s.discard.push(first);
  s.currentColor = first.color;
  s.turnIndex = nextIndex(s, s.dealerIndex);
  log(s, `Ronda ${s.round}. Reparte ${s.players[s.dealerIndex].name}. Carta inicial: ${cardLabel(first)}.`);

  switch (first.kind) {
    case 'wild':
      s.awaitingColor = true; // el primer jugador elige el color
      break;
    case 'skip':
      log(s, `${current(s).name} pierde el turno.`);
      s.turnIndex = nextIndex(s);
      break;
    case 'reverse':
      // Con la reversa inicial empieza quien reparte y el sentido se invierte
      // (con 2 jugadores equivale a un salto: también empieza quien reparte).
      s.direction = -1;
      s.turnIndex = s.dealerIndex;
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

function endRound(s, winner) {
  const points = s.players.filter((p) => p !== winner).reduce((t, p) => t + p.hand.reduce((a, c) => a + cardPoints(c), 0), 0);
  winner.score += points;
  s.roundResult = { winnerId: winner.id, points };
  log(s, `${winner.name} se queda sin cartas y gana la ronda: +${points} puntos.`);
  if (winner.score >= s.targetScore) {
    s.phase = 'finished';
    s.winnerId = winner.id;
    log(s, `🏆 ${winner.name} gana la partida con ${winner.score} puntos.`);
  } else {
    s.phase = 'round-over';
  }
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */

export function applyAction(state, action, rng = Math.random) {
  try {
    const s = structuredClone(state);
    const p = s.players.find((x) => x.id === action.playerId);
    check(p, 'Jugador no válido.');
    const handler = HANDLERS[action.type];
    check(handler, `Acción desconocida: ${action.type}`);
    // Cantar o atrapar se permite en cualquier momento de la ronda; lo demás no.
    if (action.type !== ACTIONS.NEXT_ROUND) check(s.phase === 'playing', 'La ronda ha terminado.');
    // Cualquier acción de otro jugador cierra la ventana para atrapar al que no cantó.
    if (s.vulnerableId && action.type !== ACTIONS.CATCH && action.playerId !== s.vulnerableId) s.vulnerableId = null;
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
  check(!s.awaitingColor, 'Primero elige el color.');
  check(!s.pendingDraw4, 'Primero resuelve el Comodín Roba Cuatro.');
}

const HANDLERS = {
  [ACTIONS.CHOOSE_COLOR](s, p, { color }) {
    check(s.awaitingColor && current(s).id === p.id, 'No te toca elegir color.');
    check(COLORS.includes(color), 'Color no válido.');
    s.currentColor = color;
    s.awaitingColor = false;
    log(s, `${p.name} elige el color ${COLOR_NAMES[color]}.`);
  },

  [ACTIONS.PLAY_CARD](s, p, { cardId, color, callComodin }, rng) {
    requireTurn(s, p);
    const idx = p.hand.findIndex((c) => c.id === cardId);
    check(idx >= 0, 'No tienes esa carta.');
    if (s.drawnCardId) check(cardId === s.drawnCardId, 'Tras robar sólo puedes jugar la carta robada.');
    const card = p.hand[idx];
    check(isPlayable(s, card), 'Esa carta no se puede jugar ahora.');
    const isWild = card.kind === 'wild' || card.kind === 'wild4';
    if (isWild) check(COLORS.includes(color), 'Elige un color para el comodín.');

    // ¿El Roba Cuatro es "ilegal"? (tenía una carta del color actual)
    const illegal = card.kind === 'wild4' && p.hand.some((c) => c.id !== card.id && c.color === s.currentColor);

    p.hand.splice(idx, 1);
    s.discard.push(card);
    s.currentColor = isWild ? color : card.color;
    s.drawnCardId = null;
    log(s, `${p.name} juega ${cardLabel(card)}${isWild ? ` y elige ${COLOR_NAMES[color]}` : ''}.`);

    if (p.hand.length === 1) {
      if (callComodin) log(s, `${p.name}: «¡Comodín!»`);
      else s.vulnerableId = p.id;
    }

    const n = s.players.length;
    switch (card.kind) {
      case 'skip':
        s.turnIndex = nextIndex(s, s.turnIndex, 2);
        break;
      case 'reverse':
        s.direction *= -1;
        s.turnIndex = n === 2 ? s.turnIndex : nextIndex(s);
        break;
      case 'draw2': {
        const victim = s.players[nextIndex(s)];
        drawCards(s, victim, 2, rng);
        log(s, `${victim.name} roba 2 y pierde el turno.`);
        s.turnIndex = nextIndex(s, s.turnIndex, 2);
        break;
      }
      case 'wild4': {
        const victimIndex = nextIndex(s);
        s.pendingDraw4 = { fromId: p.id, victimId: s.players[victimIndex].id, illegal };
        s.turnIndex = victimIndex;
        break;
      }
      default:
        s.turnIndex = nextIndex(s);
    }

    if (!p.hand.length) {
      // El efecto del Roba Cuatro final se aplica sin desafío.
      if (s.pendingDraw4) {
        const victim = s.players.find((x) => x.id === s.pendingDraw4.victimId);
        drawCards(s, victim, 4, rng);
        s.pendingDraw4 = null;
      }
      s.vulnerableId = null;
      endRound(s, p);
    }
  },

  [ACTIONS.DRAW_CARD](s, p, _x, rng) {
    requireTurn(s, p);
    check(!s.drawnCardId, 'Ya robaste una carta este turno.');
    drawCards(s, p, 1, rng);
    const card = p.hand[p.hand.length - 1];
    if (card && isPlayable(s, card)) {
      s.drawnCardId = card.id;
      log(s, `${p.name} roba una carta y puede jugarla.`);
    } else {
      log(s, `${p.name} roba una carta y pasa.`);
      s.turnIndex = nextIndex(s);
    }
  },

  [ACTIONS.PASS](s, p) {
    requireTurn(s, p);
    check(s.drawnCardId, 'Sólo puedes pasar después de robar.');
    s.drawnCardId = null;
    s.turnIndex = nextIndex(s);
    log(s, `${p.name} pasa.`);
  },

  [ACTIONS.ACCEPT_DRAW4](s, p, _x, rng) {
    const d = s.pendingDraw4;
    check(d && d.victimId === p.id, 'No hay nada que aceptar.');
    drawCards(s, p, 4, rng);
    s.pendingDraw4 = null;
    s.turnIndex = nextIndex(s);
    log(s, `${p.name} roba 4 cartas y pierde el turno.`);
  },

  [ACTIONS.CHALLENGE_DRAW4](s, p, _x, rng) {
    const d = s.pendingDraw4;
    check(d && d.victimId === p.id, 'No hay nada que desafiar.');
    const offender = s.players.find((x) => x.id === d.fromId);
    s.pendingDraw4 = null;
    if (d.illegal) {
      drawCards(s, offender, 4, rng);
      log(s, `${p.name} desafía y gana: ${offender.name} tenía una carta del color y roba 4.`);
      // la víctima juega normalmente
    } else {
      drawCards(s, p, 6, rng);
      s.turnIndex = nextIndex(s);
      log(s, `${p.name} desafía y pierde: roba 6 cartas y pierde el turno.`);
    }
  },

  [ACTIONS.CALL_COMODIN](s, p) {
    check(s.vulnerableId === p.id, 'No tienes nada que cantar.');
    s.vulnerableId = null;
    log(s, `${p.name}: «¡Comodín!»`);
  },

  [ACTIONS.CATCH](s, p, { targetId }, rng) {
    check(s.vulnerableId && s.vulnerableId === targetId && targetId !== p.id, 'No hay a quién atrapar.');
    const target = s.players.find((x) => x.id === targetId);
    drawCards(s, target, 2, rng);
    s.vulnerableId = null;
    log(s, `${p.name} atrapa a ${target.name} sin cantar «¡Comodín!»: roba 2.`);
  },

  [ACTIONS.NEXT_ROUND](s, _p, _x, rng) {
    check(s.phase === 'round-over', 'La ronda todavía no terminó.');
    s.dealerIndex = (s.dealerIndex + 1) % s.players.length;
    startRound(s, rng);
  },
};

/** ¿Quién debe decidir ahora? (para el modo "misma PC") */
export function getActingPlayerId(s) {
  if (s.phase !== 'playing') return null;
  if (s.pendingDraw4) return s.pendingDraw4.victimId;
  return current(s).id;
}
