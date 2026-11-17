/**
 * Motor de Dominio — reglas del juego clásico de conquista mundial (Hasbro, Risk clásico),
 * modalidad "dominación mundial". JS puro.
 * Especificación: docs/reglas/dominio/ESPECIFICACION.md
 */
import { TERRITORIES, TERRITORY_IDS, CONTINENTS, CARDS, STARTING_ARMIES } from '../data/map.js';

export const ACTIONS = {
  PLACE: 'PLACE', // { territory, count }
  TRADE: 'TRADE', // { cardIds: [a, b, c] }
  END_REINFORCE: 'END_REINFORCE',
  ATTACK: 'ATTACK', // { from, to, dice, untilDone? }
  MOVE_IN: 'MOVE_IN', // { count }
  END_ATTACK: 'END_ATTACK',
  FORTIFY: 'FORTIFY', // { from, to, count }
  END_TURN: 'END_TURN',
  LEAVE: 'LEAVE',
};

export const NEUTRAL = 'neutral';
const TRADE_VALUES = [4, 6, 8, 10, 12, 15];
export const tradeValue = (n) => (n < TRADE_VALUES.length ? TRADE_VALUES[n] : 15 + 5 * (n - TRADE_VALUES.length + 1));

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
const T = (id) => TERRITORIES[id];
const tname = (id) => T(id).name;
const owned = (s, pid) => TERRITORY_IDS.filter((t) => s.board[t].owner === pid);
const alive = (s) => s.players.filter((p) => !p.eliminated && !p.left);
const current = (s) => s.players[s.turnIndex];

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const die = (rng) => 1 + Math.floor(rng() * 6);

export function validateOptions(o = {}) {
  return { quickSetup: o.quickSetup === true };
}

/* ------------------------------------------------------------------ */
/* Preparación                                                         */
/* ------------------------------------------------------------------ */

export function setup({ id = 'local', players, options, rng = Math.random }) {
  check(players?.length >= 2 && players.length <= 6, 'Dominio se juega de 2 a 6.');
  const opts = validateOptions(options);
  const n = players.length;
  const s = {
    gameId: 'dominio',
    id,
    version: 0,
    seq: 1,
    options: opts,
    players: players.map((p) => ({ id: p.id, name: p.name, colorId: p.colorId, cards: [], toPlaceSetup: STARTING_ARMIES[n], eliminated: false, left: false })),
    board: Object.fromEntries(TERRITORY_IDS.map((t) => [t, { owner: null, armies: 0 }])),
    deck: shuffle(CARDS.map((c) => c.id), rng),
    discardCards: [],
    tradeCount: 0,
    phase: 'setup', // setup | playing | finished
    turnIndex: 0,
    turn: null,
    winners: [],
    log: [],
    lastEvent: null,
  };
  // Quién empieza: el que saca el dado más alto (se simula con el azar del servidor).
  const first = Math.floor(rng() * n);
  s.turnIndex = first;
  s.firstPlayerId = s.players[first].id;
  log(s, `${s.players[first].name} saca el dado más alto: empieza.`);

  // Reparto de territorios como con las cartas: de a uno, desde el primer jugador.
  const holders = n === 2 ? [s.players[first].id, s.players[1 - first].id, NEUTRAL] : Array.from({ length: n }, (_, k) => s.players[(first + k) % n].id);
  shuffle(TERRITORY_IDS, rng).forEach((t, i) => {
    const owner = holders[i % holders.length];
    s.board[t] = { owner, armies: 1 };
    if (owner !== NEUTRAL) P(s, owner).toPlaceSetup -= 1;
  });
  if (n === 2) {
    // Dos jugadores: un ejército neutral de 40 que sólo defiende (reglamento para 2).
    const neutralTerr = owned(s, NEUTRAL);
    let extra = STARTING_ARMIES[2] - neutralTerr.length;
    while (extra-- > 0) s.board[neutralTerr[Math.floor(rng() * neutralTerr.length)]].armies += 1;
    log(s, 'Partida de dos: hay un ejército neutral que sólo defiende.');
  }
  if (opts.quickSetup) {
    for (const p of s.players) {
      const mine = owned(s, p.id);
      while (p.toPlaceSetup > 0) {
        s.board[mine[Math.floor(rng() * mine.length)]].armies += 1;
        p.toPlaceSetup -= 1;
      }
    }
    log(s, 'Colocación inicial automática.');
    startTurn(s);
  } else {
    log(s, 'Colocación inicial: cada uno pone un ejército por vez en sus territorios.');
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Turnos                                                              */
/* ------------------------------------------------------------------ */

export function reinforcementsFor(s, pid) {
  const terr = owned(s, pid);
  const base = Math.max(3, Math.floor(terr.length / 3));
  const continents = Object.entries(CONTINENTS)
    .filter(([c]) => TERRITORY_IDS.filter((t) => T(t).continent === c).every((t) => s.board[t].owner === pid))
    .map(([c, info]) => ({ id: c, name: info.name, bonus: info.bonus }));
  return { base, continents, total: base + continents.reduce((t, c) => t + c.bonus, 0) };
}

function startTurn(s) {
  s.phase = 'playing';
  const p = current(s);
  const r = reinforcementsFor(s, p.id);
  s.turn = { step: 'reinforce', toPlace: r.total, conquered: false, tradeBonusUsed: false, pendingMove: null, fortified: false, forced: false };
  log(s, `Turno de ${p.name}: recibe ${r.total} ejércitos (${r.base} por territorios${r.continents.map((c) => ` + ${c.bonus} ${c.name}`).join('')}).`);
  event(s, { type: 'turn', playerId: p.id });
}

function nextTurn(s) {
  const n = s.players.length;
  let i = s.turnIndex;
  do i = (i + 1) % n;
  while (s.players[i].eliminated || s.players[i].left);
  s.turnIndex = i;
  startTurn(s);
}

/** ¿Estas tres cartas forman un juego? Tres iguales, una de cada, o dos cualquiera + comodín. */
export function isSet(cards) {
  if (cards.length !== 3) return false;
  const syms = cards.map((c) => c.symbol);
  const wild = syms.filter((x) => x === 'comodin').length;
  if (wild >= 1) return true;
  const set = new Set(syms);
  return set.size === 1 || set.size === 3;
}
const cardById = (id) => CARDS.find((c) => c.id === id);

function checkWin(s) {
  const players = alive(s);
  const remaining = players.filter((p) => owned(s, p.id).length > 0);
  if (remaining.length === 1) {
    s.phase = 'finished';
    s.winners = [remaining[0].id];
    s.turn = null;
    log(s, `¡${remaining[0].name} domina el mundo!`);
    event(s, { type: 'game-over', winners: s.winners });
    return true;
  }
  return false;
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

const requireTurn = (s, p, step) => {
  check(s.phase === 'playing', s.phase === 'setup' ? 'Todavía es la colocación inicial.' : 'La partida terminó.');
  check(current(s).id === p.id, 'No es tu turno.');
  if (step) check(s.turn.step === step, STEP_ERR[step]);
};
const STEP_ERR = {
  reinforce: 'Ya terminaste de reforzar.',
  attack: 'No estás en la fase de ataque.',
  fortify: 'No estás en la fase de reagrupar.',
};
const mustTrade = (s, p) => s.turn.step === 'reinforce' && p.cards.length >= 5;

const HANDLERS = {
  [ACTIONS.PLACE](s, p, { territory, count = 1 }) {
    const t = s.board[territory];
    check(t, 'Territorio desconocido.');
    check(t.owner === p.id, 'Sólo podés poner ejércitos en tus territorios.');
    count = Math.floor(Number(count));
    if (s.phase === 'setup') {
      check(current(s).id === p.id, 'No es tu turno de colocar.');
      check(count === 1, 'En la colocación inicial se pone de a un ejército.');
      t.armies += 1;
      p.toPlaceSetup -= 1;
      event(s, { type: 'place', territory, count: 1, playerId: p.id });
      // siguiente que todavía tenga ejércitos para colocar
      const n = s.players.length;
      for (let k = 1; k <= n; k++) {
        const i = (s.turnIndex + k) % n;
        if (s.players[i].toPlaceSetup > 0 && !s.players[i].left) {
          s.turnIndex = i;
          return;
        }
      }
      // Terminó la colocación: empieza el primer jugador.
      log(s, 'Terminó la colocación inicial. ¡Empieza la guerra!');
      s.turnIndex = s.players.findIndex((x) => x.id === s.firstPlayerId);
      if (s.players[s.turnIndex].left) s.turnIndex = s.players.findIndex((x) => !x.left);
      return startTurn(s);
    }
    requireTurn(s, p, 'reinforce');
    check(!mustTrade(s, p), 'Con 5 o más cartas tenés que canjear primero.');
    check(count >= 1 && count <= s.turn.toPlace, `Podés poner entre 1 y ${s.turn.toPlace}.`);
    t.armies += count;
    s.turn.toPlace -= count;
    log(s, `${p.name} pone ${count} en ${tname(territory)}.`);
    event(s, { type: 'place', territory, count, playerId: p.id });
  },

  [ACTIONS.TRADE](s, p, { cardIds = [] }) {
    requireTurn(s, p, 'reinforce');
    check(new Set(cardIds).size === 3 && cardIds.every((id) => p.cards.includes(id)), 'Elegí tres cartas tuyas.');
    const cards = cardIds.map(cardById);
    check(isSet(cards), 'Esas cartas no forman un juego (tres iguales, una de cada, o con comodín).');
    const value = tradeValue(s.tradeCount);
    s.tradeCount += 1;
    p.cards = p.cards.filter((id) => !cardIds.includes(id));
    s.discardCards.push(...cardIds);
    s.turn.toPlace += value;
    log(s, `${p.name} canjea cartas por ${value} ejércitos.`);
    // +2 en un territorio propio que figure en las cartas (una vez por turno).
    if (!s.turn.tradeBonusUsed) {
      const bonusT = cards.map((c) => c.territory).find((t) => t && s.board[t].owner === p.id);
      if (bonusT) {
        s.board[bonusT].armies += 2;
        s.turn.tradeBonusUsed = true;
        log(s, `+2 ejércitos en ${tname(bonusT)} por tener ese territorio.`);
      }
    }
    event(s, { type: 'trade', playerId: p.id, value });
  },

  [ACTIONS.END_REINFORCE](s, p) {
    requireTurn(s, p, 'reinforce');
    check(!mustTrade(s, p), 'Con 5 o más cartas tenés que canjear.');
    check(s.turn.toPlace === 0, `Todavía te quedan ${s.turn.toPlace} ejércitos por poner.`);
    s.turn.step = 'attack';
    s.turn.forced = false;
  },

  [ACTIONS.ATTACK](s, p, { from, to, dice = 3, untilDone = false }, rng) {
    requireTurn(s, p, 'attack');
    check(!s.turn.pendingMove, 'Primero mové ejércitos al territorio conquistado.');
    const a = s.board[from];
    const d = s.board[to];
    check(a && d, 'Territorio desconocido.');
    check(a.owner === p.id, 'Atacá desde un territorio tuyo.');
    check(d.owner !== p.id, 'No podés atacar tu propio territorio.');
    check(T(from).adj.includes(to), 'Sólo se ataca a territorios vecinos.');
    check(a.armies >= 2, 'Necesitás al menos 2 ejércitos para atacar.');
    let rounds = 0;
    let conquered = false;
    const rolls = [];
    do {
      const nA = Math.min(Math.max(1, Math.floor(dice)), 3, a.armies - 1);
      const nD = Math.min(2, d.armies); // el defensor tira el máximo posible
      const ra = Array.from({ length: nA }, () => die(rng)).sort((x, y) => y - x);
      const rd = Array.from({ length: nD }, () => die(rng)).sort((x, y) => y - x);
      let lostA = 0;
      let lostD = 0;
      for (let i = 0; i < Math.min(nA, nD); i++) {
        if (ra[i] > rd[i]) lostD++;
        else lostA++; // empate: gana el defensor
      }
      a.armies -= lostA;
      d.armies -= lostD;
      rolls.push({ attack: ra, defend: rd, lostA, lostD });
      rounds++;
      if (d.armies === 0) {
        const defender = d.owner;
        d.owner = p.id;
        s.turn.conquered = true;
        conquered = true;
        const min = nA;
        const max = a.armies - 1;
        log(s, `${p.name} conquista ${tname(to)}.`);
        if (min >= max) {
          // Hay que mover justo esa cantidad: se mueve sola.
          d.armies = max;
          a.armies -= max;
        } else s.turn.pendingMove = { from, to, min, max };
        eliminateIfDone(s, p, defender);
        break;
      }
    } while (untilDone && a.armies >= 2 && rounds < 200);
    const last = rolls.at(-1);
    log(s, `${p.name} ataca ${tname(to)} desde ${tname(from)}: ${rolls.length > 1 ? `${rolls.length} tiradas, ` : `[${last.attack.join(' ')}] contra [${last.defend.join(' ')}], `}pierde ${rolls.reduce((t, r) => t + r.lostA, 0)} y el defensor ${rolls.reduce((t, r) => t + r.lostD, 0)}.`);
    event(s, { type: 'attack', from, to, rolls, conquered, playerId: p.id });
    if (s.phase === 'playing') checkWin(s);
  },

  [ACTIONS.MOVE_IN](s, p, { count }) {
    requireTurn(s, p, 'attack');
    const m = s.turn.pendingMove;
    check(m, 'No hay nada que mover.');
    count = Math.floor(Number(count));
    check(count >= m.min && count <= m.max, `Mové entre ${m.min} y ${m.max} ejércitos.`);
    s.board[m.from].armies -= count;
    s.board[m.to].armies += count;
    s.turn.pendingMove = null;
    event(s, { type: 'move', from: m.from, to: m.to, count });
    if (s.turn.forceAfterMove) {
      s.turn.forceAfterMove = false;
      forceTrade(s, p);
    }
  },

  [ACTIONS.END_ATTACK](s, p) {
    requireTurn(s, p, 'attack');
    check(!s.turn.pendingMove, 'Primero mové ejércitos al territorio conquistado.');
    s.turn.step = 'fortify';
  },

  [ACTIONS.FORTIFY](s, p, { from, to, count }, rng) {
    requireTurn(s, p);
    check(s.turn.step === 'attack' || s.turn.step === 'fortify', 'Primero terminá de reforzar.');
    check(!s.turn.pendingMove, 'Primero mové ejércitos al territorio conquistado.');
    const a = s.board[from];
    const b = s.board[to];
    check(a && b && a.owner === p.id && b.owner === p.id, 'Los dos territorios tienen que ser tuyos.');
    check(T(from).adj.includes(to), 'Sólo se reagrupa entre territorios vecinos.');
    count = Math.floor(Number(count));
    check(count >= 1 && count <= a.armies - 1, `Podés mover entre 1 y ${a.armies - 1} (queda al menos uno).`);
    a.armies -= count;
    b.armies += count;
    log(s, `${p.name} reagrupa ${count} de ${tname(from)} a ${tname(to)}.`);
    event(s, { type: 'move', from, to, count });
    endTurn(s, p, rng);
  },

  [ACTIONS.END_TURN](s, p, _x, rng) {
    requireTurn(s, p);
    check(s.turn.step === 'attack' || s.turn.step === 'fortify', 'Primero terminá de reforzar.');
    check(!s.turn.pendingMove, 'Primero mové ejércitos al territorio conquistado.');
    endTurn(s, p, rng);
  },

  /** Política de plataforma: quien abandona deja sus territorios como neutrales. */
  [ACTIONS.LEAVE](s, p) {
    const wasTurn = s.phase !== 'finished' && current(s).id === p.id;
    p.left = true;
    for (const t of owned(s, p.id)) s.board[t].owner = NEUTRAL;
    s.discardCards.push(...p.cards);
    p.cards = [];
    log(s, `${p.name} abandona: sus territorios quedan neutrales.`);
    const rest = alive(s);
    if (rest.length === 1) {
      s.phase = 'finished';
      s.winners = [rest[0].id];
      s.turn = null;
      log(s, `${rest[0].name} gana: no quedan rivales.`);
      return;
    }
    if (wasTurn) {
      if (s.phase === 'setup') {
        const n = s.players.length;
        for (let k = 1; k <= n; k++) {
          const i = (s.turnIndex + k) % n;
          if (s.players[i].toPlaceSetup > 0 && !s.players[i].left) return void (s.turnIndex = i);
        }
        return startTurn(s);
      }
      nextTurn(s);
    }
  },
};

function eliminateIfDone(s, attacker, defenderId) {
  if (defenderId === NEUTRAL || owned(s, defenderId).length > 0) return;
  const d = P(s, defenderId);
  d.eliminated = true;
  attacker.cards.push(...d.cards);
  log(s, `¡${d.name} queda eliminado! ${attacker.name} se queda con sus ${d.cards.length} cartas.`);
  d.cards = [];
  if (checkWin(s)) return;
  // Con 6 o más cartas hay que canjear ya hasta quedar con 4 o menos y poner esos ejércitos.
  if (attacker.cards.length >= 6) {
    if (s.turn.pendingMove) s.turn.forceAfterMove = true;
    else forceTrade(s, attacker);
  }
}

function forceTrade(s, p) {
  s.turn.step = 'reinforce';
  s.turn.toPlace = 0;
  s.turn.forced = true;
  log(s, `${p.name} tiene ${p.cards.length} cartas: debe canjear ahora.`);
}

function endTurn(s, p, rng) {
  if (s.turn.conquered) {
    if (!s.deck.length) {
      s.deck = shuffle(s.discardCards, rng);
      s.discardCards = [];
    }
    if (s.deck.length) {
      p.cards.push(s.deck.pop());
      log(s, `${p.name} recibe una carta por haber conquistado.`);
    }
  }
  nextTurn(s);
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function getPendingDeciders(s) {
  if (s.phase === 'finished') return [];
  return [current(s).id];
}

export function getLegalActions(s, playerId) {
  const p = P(s, playerId);
  if (!p || p.left || s.phase === 'finished') return [];
  const out = [];
  if (current(s).id === playerId) {
    if (s.phase === 'setup') out.push({ type: ACTIONS.PLACE, max: 1 });
    else {
      const st = s.turn.step;
      if (st === 'reinforce') {
        if (p.cards.length >= 3) out.push({ type: ACTIONS.TRADE });
        if (!mustTrade(s, p) && s.turn.toPlace > 0) out.push({ type: ACTIONS.PLACE, max: s.turn.toPlace });
        if (!mustTrade(s, p) && s.turn.toPlace === 0) out.push({ type: ACTIONS.END_REINFORCE });
      } else if (s.turn.pendingMove) out.push({ type: ACTIONS.MOVE_IN, ...s.turn.pendingMove });
      else {
        if (st === 'attack') out.push({ type: ACTIONS.ATTACK }, { type: ACTIONS.END_ATTACK });
        out.push({ type: ACTIONS.FORTIFY }, { type: ACTIONS.END_TURN });
      }
    }
  }
  out.push({ type: ACTIONS.LEAVE });
  return out;
}

export function getPlayerView(s, viewerId) {
  const me = viewerId ? P(s, viewerId) : null;
  return {
    gameId: s.gameId,
    version: s.version,
    phase: s.phase,
    me: viewerId,
    currentPlayerId: s.phase === 'finished' ? null : current(s).id,
    board: s.board,
    turn: s.turn,
    tradeCount: s.tradeCount,
    nextTradeValue: tradeValue(s.tradeCount),
    deckCount: s.deck.length,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      colorId: p.colorId,
      eliminated: p.eliminated,
      left: p.left,
      toPlaceSetup: p.toPlaceSetup,
      cardCount: p.cards.length,
      territories: owned(s, p.id).length,
      armies: owned(s, p.id).reduce((t, x) => t + s.board[x].armies, 0),
      reinforcements: reinforcementsFor(s, p.id).total,
    })),
    myCards: me ? me.cards.map(cardById) : [],
    hasNeutral: TERRITORY_IDS.some((t) => s.board[t].owner === NEUTRAL),
    winners: s.winners,
    lastEvent: s.lastEvent,
    log: s.log.slice(-60),
    legal: getLegalActions(s, viewerId),
    deciders: getPendingDeciders(s),
  };
}

export const getResult = (s) => (s.phase === 'finished' ? { winners: s.winners, scores: Object.fromEntries(s.players.map((p) => [p.id, owned(s, p.id).length])) } : null);
export const removePlayer = (s, playerId, rng) => applyAction(s, { type: ACTIONS.LEAVE, playerId }, rng);

export const definition = {
  id: 'dominio',
  players: { min: 2, max: 6 },
  edition: 'Conquista mundial clásica (dominación del mundo)',
  setup,
  applyAction,
  getPlayerView,
  getLegalActions,
  getPendingDeciders,
  getResult,
  removePlayer,
  validateOptions,
};
