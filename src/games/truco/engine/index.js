/**
 * Motor de Truco argentino. JS puro (sin React ni DOM).
 * Especificación: docs/reglas/truco/ESPECIFICACION.md
 *
 * - 2, 4 o 6 jugadores; equipos alternados (asiento par = equipo 0, impar = equipo 1).
 * - Baraja española de 40 cartas (sin 8 ni 9 ni comodines), 3 cartas por jugador.
 * - Envido, real envido, falta envido; truco, retruco, vale cuatro; irse al mazo.
 * - Flor (opcional, apagada por defecto) y pica-pica para 6 jugadores (opcional).
 *
 * Una "mano" (hand) tiene una lista de participantes ordenada desde el que es mano.
 * Una ronda redonda es una mano con todos; una ronda de pica-pica son tres manos 1 contra 1.
 */
import { buildSpanishDeck, shuffle, cardName } from '../../../shared/spanish-deck/deck.js';

export const ACTIONS = {
  PLAY: 'PLAY', // { cardId }
  TRUCO: 'TRUCO', // canta truco / retruco / vale cuatro (el nivel siguiente)
  ENVIDO: 'ENVIDO', // { kind: 'envido' | 'real' | 'falta' }
  FLOR: 'FLOR',
  CONTRAFLOR: 'CONTRAFLOR',
  CONTRAFLOR_RESTO: 'CONTRAFLOR_RESTO',
  ACHICO: 'ACHICO', // "con flor me achico"
  QUIERO: 'QUIERO',
  NO_QUIERO: 'NO_QUIERO',
  MAZO: 'MAZO', // irse al mazo
  NEXT_HAND: 'NEXT_HAND',
  LEAVE: 'LEAVE',
};

export const TRUCO_NAMES = ['', 'Truco', 'Retruco', 'Vale cuatro'];
const ENVIDO_NAMES = { envido: 'Envido', real: 'Real envido', falta: 'Falta envido' };
const PICA_FALTA = 6;

export const buildDeck = () => buildSpanishDeck({ ranks: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] });

/**
 * Jerarquía: ancho de espadas > ancho de bastos > 7 de espadas > 7 de oros > 3 > 2 >
 * anchos falsos > 12 > 11 > 10 > sietes falsos > 6 > 5 > 4.
 */
export function cardPower(c) {
  if (c.rank === 1 && c.suit === 'espadas') return 14;
  if (c.rank === 1 && c.suit === 'bastos') return 13;
  if (c.rank === 7 && c.suit === 'espadas') return 12;
  if (c.rank === 7 && c.suit === 'oros') return 11;
  return { 3: 10, 2: 9, 1: 8, 12: 7, 11: 6, 10: 5, 7: 4, 6: 3, 5: 2, 4: 1 }[c.rank];
}

/** Valor de envido de una carta: su número; las figuras (10, 11, 12) valen 0. */
const envidoCard = (c) => (c.rank >= 10 ? 0 : c.rank);

/** Tanto de envido: dos del mismo palo = 20 + ambas; si no, la más alta. Máximo 33. */
export function envidoOf(cards) {
  let best = Math.max(...cards.map(envidoCard));
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      if (cards[i].suit === cards[j].suit) best = Math.max(best, 20 + envidoCard(cards[i]) + envidoCard(cards[j]));
  return best;
}

export const hasFlor = (cards) => cards.length === 3 && cards.every((c) => c.suit === cards[0].suit);
export const florOf = (cards) => 20 + cards.reduce((t, c) => t + envidoCard(c), 0);

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
const teamOf = (s, id) => P(s, id).team;
const teamName = (s, t) => s.teamNames[t];

/* ------------------------------------------------------------------ */
/* Opciones y preparación                                              */
/* ------------------------------------------------------------------ */

export function validateOptions(o = {}) {
  return {
    target: Number(o.target) === 15 ? 15 : 30,
    flor: o.flor === true,
    picaPica: o.picaPica !== false,
  };
}

export function checkPlayers(n) {
  return [2, 4, 6].includes(n) ? null : 'El truco se juega de a 2, 4 o 6 (equipos parejos).';
}

export function setup({ id = 'local', players, options, rng = Math.random }) {
  check([2, 4, 6].includes(players?.length), 'El truco se juega de a 2, 4 o 6 jugadores.');
  const opts = validateOptions(options);
  const s = {
    gameId: 'truco',
    id,
    version: 0,
    seq: 1,
    options: opts,
    players: players.map((p, i) => ({ id: p.id, name: p.name, colorId: p.colorId, team: i % 2, hand: [], left: false })),
    teamNames: ['', ''],
    scores: [0, 0],
    dealerIndex: Math.floor(rng() * players.length),
    round: 0,
    roundKind: 'redonda',
    lastRoundKind: null,
    queue: [], // manos pendientes de la ronda (pica-pica: tres duelos)
    hand: null,
    phase: 'playing', // 'playing' | 'hand-over' | 'finished'
    handResult: null,
    winnerTeam: null,
    history: [],
    log: [],
    lastEvent: null,
  };
  s.teamNames = players.length === 2 ? [players[0].name, players[1].name] : ['Equipo A', 'Equipo B'];
  startRound(s, rng);
  return s;
}

/** ¿Corresponde pica-pica? 6 jugadores, opción activa, y algún equipo entre 5 y 24 (a 30). */
function picaActive(s) {
  if (s.players.length !== 6 || !s.options.picaPica || s.options.target !== 30) return false;
  const hi = Math.max(...s.scores);
  return hi >= 5 && hi < 25;
}

function startRound(s, rng) {
  s.round += 1;
  const n = s.players.length;
  if (s.round > 1) s.dealerIndex = (s.dealerIndex + 1) % n;
  const order = Array.from({ length: n }, (_, k) => s.players[(s.dealerIndex + 1 + k) % n].id);
  const deck = shuffle(buildDeck(), rng);
  for (const p of s.players) p.hand = [];
  // Reparto: tres cartas a cada uno, de a una, empezando por el mano.
  for (let c = 0; c < 3; c++) for (const id of order) P(s, id).hand.push(deck.pop());

  const pica = picaActive(s) && s.lastRoundKind === 'redonda';
  s.roundKind = pica ? 'pica-pica' : 'redonda';
  s.lastRoundKind = s.roundKind;
  s.queue = pica ? [0, 1, 2].map((k) => [order[k], order[k + 3]]) : [order];
  log(s, `Ronda ${s.round}${pica ? ' (pica-pica)' : ''}. Da ${s.players[s.dealerIndex].name}.`);
  startHand(s);
}

function startHand(s) {
  const participants = s.queue.shift();
  s.hand = {
    participants,
    duel: s.roundKind === 'pica-pica',
    cards: Object.fromEntries(participants.map((id) => [id, [...P(s, id).hand]])),
    played: Object.fromEntries(participants.map((id) => [id, []])), // cartas jugadas en orden
    tricks: [], // [{ plays: [{playerId, card}], winnerTeam | null (parda), lead }]
    current: [], // jugadas de la baza en curso
    lead: 0, // índice (en participants) de quien abre la baza en curso
    turn: 0,
    truco: { level: 0, holder: null }, // nivel aceptado y equipo que tiene "el quiero"
    envido: { status: 'open', calls: [], result: null }, // open | pending | done | closed
    flor: { status: 'open', result: null },
    pending: null, // { kind: 'truco'|'envido'|'flor', ... , respondTeam }
    suspended: null, // truco en espera cuando "el envido está primero"
    points: [0, 0],
    over: false,
  };
  s.phase = 'playing';
  s.handResult = null;
  const names = participants.map((id) => P(s, id).name);
  if (s.hand.duel) log(s, `Duelo: ${names[0]} contra ${names[1]}. Es mano ${names[0]}.`);
  else log(s, `Es mano ${names[0]}.`);
  event(s, { type: 'deal' });
}

/* ------------------------------------------------------------------ */
/* Utilidades de la mano                                               */
/* ------------------------------------------------------------------ */

const H = (s) => s.hand;
const turnPlayer = (s) => H(s).participants[H(s).turn];
const manoTeam = (s) => teamOf(s, H(s).participants[0]);
const membersOf = (s, team) => H(s).participants.filter((id) => teamOf(s, id) === team);
/** El "pie" de cada equipo: su último jugador en el orden de la mano. */
const pieOf = (s, team) => membersOf(s, team).at(-1);
const hasPlayed = (s, id) => H(s).played[id].length > 0;
const firstTrick = (s) => H(s).tricks.length === 0;
const truccoValue = (level) => [1, 2, 3, 4][level];

/** ¿Este jugador puede cantar/abrir envido ahora? */
function canOpenEnvido(s, id, asResponse) {
  const h = H(s);
  if (h.envido.status !== 'open' || h.flor.status === 'done' || h.flor.status === 'pending') return false;
  if (!firstTrick(s) || hasPlayed(s, id)) return false;
  if (h.truco.level > 0) return false; // el truco ya se aceptó
  if (asResponse) return true; // "el envido está primero": cualquiera de enfrente
  if (h.participants.length > 2 && pieOf(s, teamOf(s, id)) !== id) return false; // en equipo, lo abren los pies
  return true;
}

function canSingFlor(s, id) {
  const h = H(s);
  return s.options.flor && h.flor.status === 'open' && firstTrick(s) && !hasPlayed(s, id) && hasFlor(h.cards[id]) && h.truco.level === 0;
}

/** Valor de la falta envido para el equipo que la gana. */
function faltaValue(s, winnerTeam) {
  if (H(s).duel) return PICA_FALTA;
  const t = s.options.target;
  if (t === 30 && s.scores.every((x) => x < 15)) return t - s.scores[winnerTeam]; // en las malas: la partida
  return t - Math.max(...s.scores);
}

function addPoints(s, team, pts, why) {
  if (pts <= 0) return;
  s.scores[team] += pts;
  H(s).points[team] += pts;
  log(s, `${teamName(s, team)} +${pts} (${why}).`);
  if (s.scores[team] >= s.options.target) {
    s.scores[team] = Math.max(s.scores[team], s.options.target);
    finishGame(s, team);
  }
}

function finishGame(s, team) {
  s.phase = 'finished';
  s.winnerTeam = team;
  if (s.hand) s.hand.over = true;
  log(s, `¡${teamName(s, team)} gana el partido ${s.scores[0]} a ${s.scores[1]}!`);
  event(s, { type: 'game-over', team });
}

/* ------------------------------------------------------------------ */
/* Bazas                                                               */
/* ------------------------------------------------------------------ */

/** Ganador de la mano según las bazas (con pardas), o undefined si sigue. */
export function decideHand(results, manoT) {
  const [r1, r2, r3] = results;
  if (results.length < 2) return undefined;
  if (r1 !== null) {
    if (r2 === r1 || r2 === null) return r1; // ganó la primera y empató o ganó la segunda
    if (results.length < 3) return undefined;
    return r3 === null ? r1 : r3;
  }
  if (r2 !== null) return r2; // primera parda: define la segunda
  if (results.length < 3) return undefined;
  return r3 === null ? manoT : r3; // tres pardas: gana el mano
}

function resolveTrick(s) {
  const h = H(s);
  const plays = h.current;
  const best = Math.max(...plays.map((x) => cardPower(x.card)));
  const top = plays.filter((x) => cardPower(x.card) === best);
  const teams = new Set(top.map((x) => teamOf(s, x.playerId)));
  const winnerTeam = teams.size === 1 ? [...teams][0] : null;
  const leadIdx = h.lead;
  // Gana la baza la primera carta más alta del equipo ganador; en parda abre el mismo que abrió.
  const winnerPlay = winnerTeam === null ? null : top.find((x) => teamOf(s, x.playerId) === winnerTeam);
  h.tricks.push({ plays, winnerTeam, winnerId: winnerPlay?.playerId ?? null, lead: leadIdx });
  h.current = [];
  log(s, winnerTeam === null ? `Baza ${h.tricks.length}: parda.` : `Baza ${h.tricks.length}: la gana ${P(s, winnerPlay.playerId).name}.`);
  event(s, { type: 'trick', n: h.tricks.length, winnerTeam });

  // Si el envido no se jugó, ya no se puede cantar.
  if (h.envido.status === 'open') h.envido.status = 'closed';
  if (h.flor.status === 'open') h.flor.status = 'closed';

  const winner = decideHand(h.tricks.map((t) => t.winnerTeam), manoTeam(s));
  if (winner !== undefined) return endHand(s, winner, 'bazas');
  h.lead = winnerPlay ? h.participants.indexOf(winnerPlay.playerId) : leadIdx;
  h.turn = h.lead;
}

function endHand(s, winnerTeam, how) {
  const h = H(s);
  if (h.over) return;
  h.over = true;
  if (how === 'bazas') addPoints(s, winnerTeam, truccoValue(h.truco.level), h.truco.level ? `${TRUCO_NAMES[h.truco.level]} querido` : 'la mano');
  h.winnerTeam = winnerTeam;
  h.how = how;
  s.history.push({ round: s.round, kind: s.roundKind, participants: h.participants, points: [...h.points] });
  if (s.phase === 'finished') return;
  if (s.queue.length) {
    s.handResult = summary(s);
    s.phase = 'hand-over';
    return;
  }
  s.handResult = summary(s);
  s.phase = 'hand-over';
}

function summary(s) {
  const h = H(s);
  return {
    participants: h.participants,
    winnerTeam: h.winnerTeam,
    how: h.how,
    points: [...h.points],
    envido: h.envido.result,
    flor: h.flor.result,
    trucoLevel: h.truco.level,
    moreDuels: s.queue.length,
  };
}

/* ------------------------------------------------------------------ */
/* Cantos                                                              */
/* ------------------------------------------------------------------ */

function envidoAccepted(calls) {
  return calls.reduce((t, k) => t + (k === 'envido' ? 2 : k === 'real' ? 3 : 0), 0);
}
function envidoRejected(calls) {
  // "No quiero": lo acumulado antes del último canto, o 1 si era el primero.
  if (calls.length === 1) return 1;
  const prev = calls.slice(0, -1);
  if (prev.includes('falta')) return 1; // (no ocurre: después de la falta no hay más cantos)
  return envidoAccepted(prev);
}

function resolveEnvido(s, accepted) {
  const h = H(s);
  const { calls, callerTeam } = h.pending;
  const respondTeam = 1 - callerTeam;
  h.pending = null;
  h.envido.status = 'done';
  if (!accepted) {
    const pts = envidoRejected(calls);
    h.envido.result = { accepted: false, calls, team: callerTeam, points: pts };
    log(s, `${teamName(s, respondTeam)}: no quiero.`);
    addPoints(s, callerTeam, pts, `${ENVIDO_NAMES[calls.at(-1)]} no querido`);
  } else {
    const values = {};
    for (const id of h.participants) values[id] = envidoOf(h.cards[id]);
    const best = [0, 1].map((t) => Math.max(...membersOf(s, t).map((id) => values[id])));
    const winner = best[0] === best[1] ? manoTeam(s) : best[0] > best[1] ? 0 : 1;
    const pts = calls.includes('falta') ? faltaValue(s, winner) : envidoAccepted(calls);
    h.envido.result = { accepted: true, calls, team: winner, points: pts, values, best };
    log(s, `Envido: ${teamName(s, 0)} ${best[0]}, ${teamName(s, 1)} ${best[1]}.`);
    addPoints(s, winner, pts, `${calls.map((k) => ENVIDO_NAMES[k]).join(' + ')} querido`);
  }
  event(s, { type: 'envido', result: h.envido.result });
  if (s.phase === 'finished') return;
  if (h.suspended) {
    h.pending = h.suspended;
    h.suspended = null;
  }
}

function resolveFlor(s, outcome) {
  // outcome: { team, points, compared? }
  const h = H(s);
  h.pending = null;
  h.flor.status = 'done';
  h.envido.status = 'closed';
  h.flor.result = outcome;
  addPoints(s, outcome.team, outcome.points, outcome.why);
  event(s, { type: 'flor', result: outcome });
  if (s.phase === 'finished') return;
  if (h.suspended) {
    h.pending = h.suspended;
    h.suspended = null;
  }
}

function compareFlor(s) {
  const h = H(s);
  const team = [0, 1].map((t) =>
    membersOf(s, t)
      .filter((id) => hasFlor(h.cards[id]))
      .reduce((sum, id) => sum + florOf(h.cards[id]), 0),
  );
  const winner = team[0] === team[1] ? manoTeam(s) : team[0] > team[1] ? 0 : 1;
  return { winner, values: team };
}

const teamHasFlor = (s, team) => membersOf(s, team).some((id) => hasFlor(H(s).cards[id]));

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

function inHand(s, p) {
  check(s.phase === 'playing', 'La mano terminó.');
  check(H(s).participants.includes(p.id), 'No jugás esta mano.');
}

function requireResponder(s, p, kind) {
  const pend = H(s).pending;
  check(pend && (!kind || pend.kind === kind), 'No hay nada que responder.');
  check(teamOf(s, p.id) === pend.respondTeam, 'Le toca responder al otro equipo.');
  return pend;
}

const HANDLERS = {
  [ACTIONS.PLAY](s, p, { cardId }) {
    inHand(s, p);
    const h = H(s);
    check(!h.pending, 'Primero hay que responder el canto.');
    check(turnPlayer(s) === p.id, 'No es tu turno.');
    const card = h.cards[p.id].find((c) => c.id === cardId);
    check(card && !h.played[p.id].some((c) => c.id === cardId), 'No tenés esa carta.');
    h.played[p.id].push(card);
    h.current.push({ playerId: p.id, card });
    log(s, `${p.name} juega ${cardName(card)}.`);
    event(s, { type: 'play', playerId: p.id, card });
    if (h.current.length === h.participants.length) resolveTrick(s);
    else h.turn = (h.turn + 1) % h.participants.length;
  },

  [ACTIONS.TRUCO](s, p) {
    inHand(s, p);
    const h = H(s);
    const team = teamOf(s, p.id);
    const pend = h.pending;
    if (pend?.kind === 'truco') {
      // Subir como respuesta (implica querer el nivel anterior).
      requireResponder(s, p, 'truco');
      check(pend.level < 3, 'No se puede subir más.');
      h.truco = { level: pend.level, holder: team };
      log(s, `${p.name}: ¡quiero ${TRUCO_NAMES[pend.level + 1].toLowerCase()}!`);
      h.pending = { kind: 'truco', level: pend.level + 1, callerTeam: team, respondTeam: 1 - team, callerId: p.id };
    } else {
      check(!pend, 'Primero hay que responder el canto.');
      check(turnPlayer(s) === p.id, 'Sólo se canta en tu turno.');
      check(h.truco.level < 3, 'Ya se cantó vale cuatro.');
      check(h.truco.level === 0 || h.truco.holder === team, 'El quiero lo tiene el otro equipo.');
      const level = h.truco.level + 1;
      log(s, `${p.name}: ¡${TRUCO_NAMES[level]}!`);
      h.pending = { kind: 'truco', level, callerTeam: team, respondTeam: 1 - team, callerId: p.id };
    }
    event(s, { type: 'call', playerId: p.id, call: TRUCO_NAMES[h.pending.level] });
  },

  [ACTIONS.ENVIDO](s, p, { kind }) {
    inHand(s, p);
    check(['envido', 'real', 'falta'].includes(kind), 'Canto no válido.');
    const h = H(s);
    const team = teamOf(s, p.id);
    const pend = h.pending;
    if (pend?.kind === 'envido') {
      requireResponder(s, p, 'envido');
      const calls = [...pend.calls, kind];
      check(validEnvidoChain(calls), 'Ese canto no puede seguir al anterior.');
      h.pending = { kind: 'envido', calls, callerTeam: team, respondTeam: 1 - team, callerId: p.id };
    } else {
      if (pend?.kind === 'truco') {
        // "El envido está primero": responde al truco cantando envido.
        requireResponder(s, p, 'truco');
        check(pend.level === 1 && canOpenEnvido(s, p.id, true), 'Ya no se puede cantar envido.');
        h.suspended = pend;
      } else {
        check(!pend, 'Primero hay que responder el canto.');
        check(turnPlayer(s) === p.id, 'Sólo se canta en tu turno.');
        check(canOpenEnvido(s, p.id, false), h.participants.length > 2 && pieOf(s, team) !== p.id ? 'En equipo, el envido lo abren los pies.' : 'Ya no se puede cantar envido.');
      }
      check(validEnvidoChain([kind]), 'Canto no válido.');
      h.envido.status = 'pending';
      h.pending = { kind: 'envido', calls: [kind], callerTeam: team, respondTeam: 1 - team, callerId: p.id };
    }
    log(s, `${p.name}: ¡${ENVIDO_NAMES[kind]}!`);
    event(s, { type: 'call', playerId: p.id, call: ENVIDO_NAMES[kind] });
  },

  [ACTIONS.FLOR](s, p) {
    inHand(s, p);
    const h = H(s);
    check(s.options.flor, 'Se juega sin flor.');
    check(canSingFlor(s, p.id), 'No podés cantar flor ahora.');
    const team = teamOf(s, p.id);
    const pend = h.pending;
    if (pend) {
      check(teamOf(s, p.id) === pend.respondTeam, 'Le toca responder al otro equipo.');
      check(pend.kind === 'envido' || (pend.kind === 'truco' && pend.level === 1), 'Ahora no se puede cantar flor.');
      if (pend.kind === 'truco') h.suspended = pend;
      else log(s, 'La flor anula el envido.');
    } else check(turnPlayer(s) === p.id, 'Sólo se canta en tu turno.');
    h.envido.status = 'closed';
    log(s, `${p.name}: ¡Flor!`);
    event(s, { type: 'call', playerId: p.id, call: 'Flor' });
    if (!teamHasFlor(s, 1 - team)) return resolveFlor(s, { team, points: 3, why: 'flor' });
    h.flor.status = 'pending';
    h.pending = { kind: 'flor', stage: 'flor', callerTeam: team, respondTeam: 1 - team, callerId: p.id };
  },

  [ACTIONS.ACHICO](s, p) {
    inHand(s, p);
    const pend = requireResponder(s, p, 'flor');
    check(pend.stage === 'flor', 'Ya no se puede achicar.');
    log(s, `${p.name}: con flor me achico.`);
    resolveFlor(s, { team: pend.callerTeam, points: 3, why: 'flor (el rival se achica)' });
  },

  [ACTIONS.CONTRAFLOR](s, p) {
    inHand(s, p);
    const pend = requireResponder(s, p, 'flor');
    check(pend.stage === 'flor' && teamHasFlor(s, teamOf(s, p.id)), 'No podés cantar contraflor.');
    log(s, `${p.name}: ¡Contraflor!`);
    const team = teamOf(s, p.id);
    H(s).pending = { kind: 'flor', stage: 'contraflor', callerTeam: team, respondTeam: 1 - team, callerId: p.id };
  },

  [ACTIONS.CONTRAFLOR_RESTO](s, p) {
    inHand(s, p);
    const pend = requireResponder(s, p, 'flor');
    check(pend.stage !== 'resto' && teamHasFlor(s, teamOf(s, p.id)), 'No podés cantar contraflor al resto.');
    log(s, `${p.name}: ¡Contraflor al resto!`);
    const team = teamOf(s, p.id);
    H(s).pending = { kind: 'flor', stage: 'resto', callerTeam: team, respondTeam: 1 - team, callerId: p.id };
  },

  [ACTIONS.QUIERO](s, p) {
    inHand(s, p);
    const h = H(s);
    const pend = requireResponder(s, p);
    log(s, `${p.name}: ¡Quiero!`);
    if (pend.kind === 'truco') {
      h.truco = { level: pend.level, holder: teamOf(s, p.id) };
      h.pending = null;
      event(s, { type: 'answer', playerId: p.id, answer: 'quiero' });
    } else if (pend.kind === 'envido') {
      resolveEnvido(s, true);
    } else {
      check(pend.stage !== 'flor', 'A la flor se responde con contraflor o achicándose.');
      const { winner, values } = compareFlor(s);
      const points = pend.stage === 'resto' ? faltaValue(s, winner) : 6;
      resolveFlor(s, { team: winner, points, values, why: pend.stage === 'resto' ? 'contraflor al resto' : 'contraflor' });
    }
  },

  [ACTIONS.NO_QUIERO](s, p) {
    inHand(s, p);
    const h = H(s);
    const pend = requireResponder(s, p);
    if (pend.kind === 'truco') {
      log(s, `${p.name}: no quiero.`);
      h.pending = null;
      h.suspended = null;
      addPoints(s, pend.callerTeam, truccoValue(pend.level - 1), `${TRUCO_NAMES[pend.level]} no querido`);
      endHand(s, pend.callerTeam, 'no-quiero');
    } else if (pend.kind === 'envido') {
      resolveEnvido(s, false);
    } else {
      check(pend.stage !== 'flor', 'A la flor se responde con contraflor o achicándose.');
      log(s, `${p.name}: no quiero.`);
      resolveFlor(s, { team: pend.callerTeam, points: pend.stage === 'resto' ? 6 : 3, why: `${pend.stage === 'resto' ? 'contraflor al resto' : 'contraflor'} no querida` });
    }
  },

  [ACTIONS.MAZO](s, p) {
    inHand(s, p);
    const h = H(s);
    const team = teamOf(s, p.id);
    const pend = h.pending;
    if (pend) check(pend.respondTeam === team, 'Esperá la respuesta del otro equipo.');
    else check(turnPlayer(s) === p.id, 'Sólo podés irte al mazo en tu turno.');
    const other = 1 - team;
    log(s, `${p.name} se va al mazo.`);
    if (pend?.kind === 'envido' || pend?.kind === 'flor') {
      // Irse con un canto de tanto pendiente equivale a no quererlo.
      if (pend.kind === 'envido') resolveEnvido(s, false);
      else resolveFlor(s, { team: pend.callerTeam, points: pend.stage === 'resto' ? 6 : 3, why: 'flor no respondida' });
      if (s.phase === 'finished') return;
    }
    const truco = h.pending?.kind === 'truco' ? h.pending : null;
    h.pending = null;
    h.suspended = null;
    // En la primera baza, sin envido jugado, el rival suma además el punto del envido.
    const extra = firstTrick(s) && h.envido.status === 'open' && h.flor.status !== 'done' ? 1 : 0;
    if (extra) {
      h.envido.status = 'closed';
      addPoints(s, other, 1, 'envido no jugado (se fue al mazo)');
      if (s.phase === 'finished') return;
    }
    const pts = truco ? truccoValue(truco.level - 1) : truccoValue(h.truco.level);
    addPoints(s, other, pts, 'se fue al mazo');
    endHand(s, other, 'mazo');
  },

  [ACTIONS.NEXT_HAND](s, _p, _x, rng) {
    check(s.phase === 'hand-over', 'La mano todavía no terminó.');
    if (s.queue.length) startHand(s);
    else startRound(s, rng);
  },

  /** Política de plataforma: abandonar = su equipo pierde el partido. */
  [ACTIONS.LEAVE](s, p) {
    p.left = true;
    log(s, `${p.name} abandona la partida.`);
    finishGame(s, 1 - p.team);
  },
};

function validEnvidoChain(calls) {
  // Secuencias: E, E-E, R, E-R, E-E-R y la falta al final de cualquiera.
  const ok = ['envido', 'envido,envido', 'real', 'envido,real', 'envido,envido,real'];
  const body = calls.at(-1) === 'falta' ? calls.slice(0, -1) : calls;
  if (calls.slice(0, -1).includes('falta')) return false;
  return body.length === 0 || ok.includes(body.join(','));
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function getPendingDeciders(s) {
  if (s.phase === 'finished') return [];
  if (s.phase === 'hand-over') return s.players.filter((p) => !p.left).map((p) => p.id);
  const h = H(s);
  if (h.pending) return membersOf(s, h.pending.respondTeam);
  return [turnPlayer(s)];
}

export function getLegalActions(s, playerId) {
  const p = P(s, playerId);
  if (!p || p.left || s.phase === 'finished') return [];
  if (s.phase === 'hand-over') return [{ type: ACTIONS.NEXT_HAND }, { type: ACTIONS.LEAVE }];
  const h = H(s);
  const out = [];
  if (!h.participants.includes(playerId)) return [{ type: ACTIONS.LEAVE }];
  const team = p.team;
  const pend = h.pending;
  if (pend) {
    if (pend.respondTeam === team) {
      if (pend.kind === 'truco') {
        out.push({ type: ACTIONS.QUIERO }, { type: ACTIONS.NO_QUIERO });
        if (pend.level < 3) out.push({ type: ACTIONS.TRUCO, level: pend.level + 1 });
        if (pend.level === 1 && canOpenEnvido(s, playerId, true)) out.push({ type: ACTIONS.ENVIDO, kinds: ['envido', 'real', 'falta'] });
        if (pend.level === 1 && canSingFlor(s, playerId)) out.push({ type: ACTIONS.FLOR });
      } else if (pend.kind === 'envido') {
        out.push({ type: ACTIONS.QUIERO }, { type: ACTIONS.NO_QUIERO });
        const kinds = ['envido', 'real', 'falta'].filter((k) => validEnvidoChain([...pend.calls, k]));
        if (kinds.length) out.push({ type: ACTIONS.ENVIDO, kinds });
        if (canSingFlor(s, playerId)) out.push({ type: ACTIONS.FLOR });
      } else {
        if (pend.stage === 'flor') {
          out.push({ type: ACTIONS.ACHICO });
          if (teamHasFlor(s, team)) out.push({ type: ACTIONS.CONTRAFLOR }, { type: ACTIONS.CONTRAFLOR_RESTO });
        } else {
          out.push({ type: ACTIONS.QUIERO }, { type: ACTIONS.NO_QUIERO });
          if (pend.stage === 'contraflor') out.push({ type: ACTIONS.CONTRAFLOR_RESTO });
        }
      }
      out.push({ type: ACTIONS.MAZO });
    }
  } else if (turnPlayer(s) === playerId) {
    out.push({ type: ACTIONS.PLAY, cardIds: h.cards[playerId].filter((c) => !h.played[playerId].some((x) => x.id === c.id)).map((c) => c.id) });
    if (h.truco.level < 3 && (h.truco.level === 0 || h.truco.holder === team)) out.push({ type: ACTIONS.TRUCO, level: h.truco.level + 1 });
    if (canOpenEnvido(s, playerId, false)) out.push({ type: ACTIONS.ENVIDO, kinds: ['envido', 'real', 'falta'] });
    if (canSingFlor(s, playerId)) out.push({ type: ACTIONS.FLOR });
    out.push({ type: ACTIONS.MAZO });
  }
  out.push({ type: ACTIONS.LEAVE });
  return out;
}

export function getPlayerView(s, viewerId) {
  const h = H(s);
  const me = viewerId ? P(s, viewerId) : null;
  return {
    gameId: s.gameId,
    version: s.version,
    phase: s.phase,
    me: viewerId,
    myTeam: me?.team ?? null,
    options: s.options,
    round: s.round,
    roundKind: s.roundKind,
    duel: h.duel,
    scores: s.scores,
    teamNames: s.teamNames,
    dealerId: s.players[s.dealerIndex].id,
    players: s.players.map((p) => ({ id: p.id, name: p.name, colorId: p.colorId, team: p.team, left: p.left })),
    hand: {
      participants: h.participants,
      manoId: h.participants[0],
      turnId: s.phase === 'playing' && !h.pending ? turnPlayer(s) : null,
      tricks: h.tricks.map((t) => ({ plays: t.plays, winnerTeam: t.winnerTeam, winnerId: t.winnerId })),
      current: h.current,
      played: h.played,
      remaining: Object.fromEntries(h.participants.map((id) => [id, h.cards[id].length - h.played[id].length])),
      myCards: me && h.participants.includes(viewerId) ? h.cards[viewerId].filter((c) => !h.played[viewerId].some((x) => x.id === c.id)) : [],
      myEnvido: me && h.participants.includes(viewerId) ? envidoOf(h.cards[viewerId]) : null,
      myFlor: me && h.participants.includes(viewerId) && s.options.flor && hasFlor(h.cards[viewerId]),
      truco: h.truco,
      envido: { status: h.envido.status, result: publicEnvido(h.envido.result) },
      flor: { status: h.flor.status, result: h.flor.result },
      pending: h.pending ? { kind: h.pending.kind, level: h.pending.level, calls: h.pending.calls, stage: h.pending.stage, callerId: h.pending.callerId, respondTeam: h.pending.respondTeam } : null,
      suspended: h.suspended ? { level: h.suspended.level } : null,
      points: h.points,
    },
    handResult: s.handResult ? { ...s.handResult, envido: publicEnvido(s.handResult.envido) } : null,
    winnerTeam: s.winnerTeam,
    winners: s.winnerTeam === null ? [] : s.players.filter((p) => p.team === s.winnerTeam).map((p) => p.id),
    history: s.history,
    lastEvent: s.lastEvent,
    log: s.log.slice(-50),
    legal: getLegalActions(s, viewerId),
    deciders: getPendingDeciders(s),
  };
}

/** Del envido sólo se hacen públicos los tantos cantados (el mejor de cada equipo). */
function publicEnvido(r) {
  if (!r) return null;
  const { values, ...rest } = r;
  return rest;
}

export const getResult = (s) => (s.phase === 'finished' ? { winners: s.players.filter((p) => p.team === s.winnerTeam).map((p) => p.id), scores: Object.fromEntries(s.players.map((p) => [p.id, s.scores[p.team]])) } : null);
export const removePlayer = (s, playerId, rng) => applyAction(s, { type: ACTIONS.LEAVE, playerId }, rng);

export const definition = {
  id: 'truco',
  players: { min: 2, max: 6 },
  edition: 'Truco argentino (sin flor por defecto, a 30)',
  setup,
  applyAction,
  getPlayerView,
  getLegalActions,
  getPendingDeciders,
  getResult,
  removePlayer,
  validateOptions,
  checkPlayers,
};
