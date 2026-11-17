/**
 * Motor de reglas de Magnate — edición de referencia Hasbro G0009.
 *
 *   applyAction(state, action, rng?) -> { ok: true, state } | { ok: false, error }
 *
 *  - Puro respecto a la entrada: clona el estado y devuelve uno nuevo.
 *  - Toda la aleatoriedad sale de `rng` (() => [0,1)), que en el online pone el servidor.
 *  - Sin React, DOM ni red.
 *
 * Tipos de acción:
 *  - De TURNO (sólo el jugador del turno y sin interrupciones pendientes):
 *      ROLL_DICE, PAY_JAIL_FINE, USE_JAIL_CARD, BUY_PROPERTY, DECLINE_PROPERTY, END_TURN
 *      (+ SKIP_PROPERTY sólo con la regla de la casa `options.skipPurchase`)
 *  - LIBRES (cualquier jugador en juego, en cualquier momento — G0009 BUILDINGS y DEALS & TRADES):
 *      BUILD, SELL_BUILDING, MORTGAGE, UNMORTGAGE, PROPOSE_TRADE, RESPOND_TRADE, CANCEL_TRADE, RESIGN
 *  - De INTERRUPCIÓN (quien corresponda):
 *      PAY_DEBT, DECLARE_BANKRUPTCY, PLACE_BID, PASS_BID, CLAIM_BUILDING, PLACE_BUILDING
 *
 * Especificación: docs/reglas/magnate/ESPECIFICACION.md
 */
import { ACTIONS } from './actionTypes.js';
import { BOARD, SQUARE_TYPES, BOARD_SIZE, JAIL_INDEX, GO_SALARY, isOwnable } from '../data/board.js';
import { getCard, DECK_NAMES } from '../data/cards.js';
import { HOTEL, TURN_STEPS } from '../state/gameState.js';
import { PLAYER_STATUS } from '../models/player.js';
import {
  JAIL_FINE,
  MAX_JAIL_TURNS,
  AUCTION_MIN_BID,
  HOUSES_PER_HOTEL,
  computeRent,
  buildBlocker,
  sellBlocker,
  mortgageBlocker,
  unmortgageBlocker,
  tradeBlocker,
  maxRaisable,
  sellOneBuilding,
  nextBuildingType,
  totalDebt,
} from './rules.js';

export { ACTIONS };
export * from './rules.js';

class RuleError extends Error {}
const fail = (message) => {
  throw new RuleError(message);
};
const check = (cond, message) => {
  if (!cond) fail(message);
};

export function applyAction(state, action, rng = Math.random) {
  try {
    if (state.phase !== 'playing') fail('La partida ha terminado.');
    const handler = HANDLERS[action?.type];
    if (!handler) fail(`Acción desconocida: ${action?.type}`);
    const s = structuredClone(state);
    const actor = player(s, action.playerId);
    check(actor && actor.status !== PLAYER_STATUS.BANKRUPT, 'Jugador no válido.');
    handler(s, actor, action.payload ?? {}, rng);
    settle(s);
    s.version += 1;
    return { ok: true, state: s };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Permisos                                                            */
/* ------------------------------------------------------------------ */

/** Interrupción que detiene el turno, si la hay. */
export function blockingInterrupt(s) {
  if (s.debts.length) return 'debt';
  if (s.placement) return 'placement';
  if (s.buildingClaim) return 'claim';
  if (s.auction) return 'auction';
  return null;
}

function requireTurnAction(s, p, step) {
  const b = blockingInterrupt(s);
  check(!b, MESSAGES_BLOCK[b]);
  check(p.id === s.turn.playerId, 'No es tu turno.');
  check(s.turn.step === step, 'Esa acción no corresponde en este momento.');
}

const MESSAGES_BLOCK = {
  debt: 'Hay una deuda pendiente: el turno sigue cuando se resuelva.',
  placement: 'Hay que colocar el edificio ganado en la subasta.',
  claim: 'Hay una solicitud de edificios en escasez pendiente.',
  auction: 'Hay una subasta en curso.',
};

/** Acciones libres: el jugador que debe colocar un edificio no puede hacer otra cosa antes. */
function requireFree(s, p) {
  check(!(s.placement && s.placement.playerId === p.id), 'Primero coloca el edificio que ganaste.');
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const player = (s, id) => s.players.find((p) => p.id === id);
const activePlayers = (s) => s.players.filter((p) => p.status !== PLAYER_STATUS.BANKRUPT);
const money = (n) => `$${n}`;

function log(s, text) {
  s.log.push({ id: `l${s.seq++}`, text });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}

const rollDie = (rng) => 1 + Math.floor(rng() * 6);

/** Cobra `amount`. Si no hay efectivo suficiente, registra una deuda. Devuelve true si pagó. */
function charge(s, debtor, creditorId, amount, reason) {
  if (amount <= 0) return true;
  if (debtor.money >= amount) {
    debtor.money -= amount;
    if (creditorId) player(s, creditorId).money += amount;
    const to = creditorId ? player(s, creditorId).name : 'la banca';
    log(s, `${debtor.name} paga ${money(amount)} a ${to} (${reason}).`);
    return true;
  }
  s.debts.push({ id: `d${s.seq++}`, debtorId: debtor.id, creditorId, amount, reason });
  const to = creditorId ? player(s, creditorId).name : 'la banca';
  log(s, `${debtor.name} debe ${money(amount)} a ${to} (${reason}) y no tiene efectivo suficiente.`);
  return false;
}

function sendToJail(s, p) {
  p.position = JAIL_INDEX;
  p.status = PLAYER_STATUS.IN_JAIL;
  p.jailTurns = 0;
  if (s.turn.playerId === p.id) {
    s.turn.doublesInRow = 0;
    s.turn.extraRoll = false;
    s.turn.step = TURN_STEPS.END;
    s.pendingPurchase = null;
  }
  log(s, `${p.name} va a la cárcel.`);
}

function releaseFromJail(p) {
  p.status = PLAYER_STATUS.ACTIVE;
  p.jailTurns = 0;
}

function collectGo(s, p) {
  p.money += GO_SALARY;
  log(s, `${p.name} pasa por la Salida y cobra ${money(GO_SALARY)}.`);
}

function moveBy(s, p, steps) {
  if (p.position + steps >= BOARD_SIZE) collectGo(s, p);
  p.position = (p.position + steps) % BOARD_SIZE;
}

/** Avanza hasta `index` en sentido de juego (cobra la Salida si la pasa o cae en ella). */
function advanceTo(s, p, index) {
  if (index <= p.position) collectGo(s, p);
  p.position = index;
}

/* ------------------------------------------------------------------ */
/* Resolución de casillas                                              */
/* ------------------------------------------------------------------ */

function resolveLanding(s, p, rng, ctx = {}) {
  const square = BOARD[p.position];
  log(s, `${p.name} cae en ${square.name}.`);

  switch (square.type) {
    case SQUARE_TYPES.GO_TO_JAIL:
      sendToJail(s, p);
      return;
    case SQUARE_TYPES.TAX:
      charge(s, p, null, square.amount, square.name);
      return;
    case SQUARE_TYPES.CHANCE:
      drawCard(s, p, 'chance', rng);
      return;
    case SQUARE_TYPES.COMMUNITY:
      drawCard(s, p, 'community', rng);
      return;
    default:
      break;
  }
  if (!isOwnable(square)) return;

  const own = s.ownership[square.index];
  if (!own) {
    s.pendingPurchase = square.index;
    s.turn.step = TURN_STEPS.BUY;
    return;
  }
  if (own.ownerId === p.id) return;
  if (own.mortgaged) {
    log(s, `${square.name} está hipotecada: no se cobra alquiler.`);
    return;
  }
  let diceTotal = 0;
  if (square.type === SQUARE_TYPES.UTILITY) {
    // G0009: "tira los dados para determinar el alquiler" (decisión C4: tirada nueva).
    const d = [rollDie(rng), rollDie(rng)];
    diceTotal = d[0] + d[1];
    s.utilityRoll = d;
    log(s, `${p.name} tira ${d[0]} + ${d[1]} para calcular el alquiler del servicio.`);
  }
  const rent = computeRent(s, square.index, { diceTotal, cardRent: ctx.cardRent });
  charge(s, p, own.ownerId, rent, `alquiler de ${square.name}`);
}

function drawCard(s, p, deck, rng) {
  const cardId = s.decks[deck].shift();
  const card = getCard(cardId);
  s.lastCard = { deck, cardId, playerId: p.id, seq: s.seq };
  log(s, `${p.name} roba ${DECK_NAMES[deck]}: «${card.text}»`);
  const e = card.effect;

  if (e.kind === 'jail-free') {
    p.jailFreeCards.push({ deck, cardId });
    return; // se conserva hasta usarla o negociarla
  }
  s.decks[deck].push(cardId); // vuelve al fondo del mazo

  switch (e.kind) {
    case 'move-to':
      advanceTo(s, p, e.index);
      resolveLanding(s, p, rng);
      break;
    case 'move-nearest': {
      let i = (p.position + 1) % BOARD_SIZE;
      while (BOARD[i].type !== e.type) i = (i + 1) % BOARD_SIZE;
      advanceTo(s, p, i);
      resolveLanding(s, p, rng, { cardRent: e.type === 'station' ? 'double-station' : 'utility-10x' });
      break;
    }
    case 'move-back':
      p.position = (p.position - e.steps + BOARD_SIZE) % BOARD_SIZE;
      resolveLanding(s, p, rng);
      break;
    case 'collect':
      p.money += e.amount;
      break;
    case 'pay':
      charge(s, p, null, e.amount, `carta de ${DECK_NAMES[deck]}`);
      break;
    case 'collect-each':
      for (const other of activePlayers(s)) if (other.id !== p.id) charge(s, other, p.id, e.amount, `carta de ${DECK_NAMES[deck]}`);
      break;
    case 'pay-each':
      for (const other of activePlayers(s)) if (other.id !== p.id) charge(s, p, other.id, e.amount, `carta de ${DECK_NAMES[deck]}`);
      break;
    case 'repairs': {
      let total = 0;
      for (const own of Object.values(s.ownership)) {
        if (own.ownerId !== p.id || !own.houses) continue;
        total += own.houses === HOTEL ? e.hotel : own.houses * e.house;
      }
      if (total) charge(s, p, null, total, 'reparaciones');
      else log(s, `${p.name} no tiene edificios: no paga nada.`);
      break;
    }
    case 'go-to-jail':
      sendToJail(s, p);
      break;
    default:
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Turnos                                                              */
/* ------------------------------------------------------------------ */

const stepAfterResolution = (s) => (s.turn.extraRoll ? TURN_STEPS.ROLL : TURN_STEPS.END);

function advanceTurn(s) {
  const order = s.players;
  const n = order.length;
  const from = order.findIndex((p) => p.id === s.turn.playerId);
  let i = from;
  for (let k = 0; k < n; k++) {
    i = (i + 1) % n;
    if (order[i].status !== PLAYER_STATUS.BANKRUPT) break;
  }
  // Nueva ronda al volver a pasar por la posición del jugador que empezó.
  const first = order.findIndex((p) => p.id === s.turn.firstPlayerId);
  const rel = (x) => (x - first + n) % n;
  if (rel(i) <= rel(from)) s.turn.round += 1;
  s.turn = { ...s.turn, playerId: order[i].id, step: TURN_STEPS.ROLL, doublesInRow: 0, extraRoll: false };
  s.pendingPurchase = null;
  s.dice = null;
  s.utilityRoll = null;
  log(s, `Turno de ${order[i].name}.`);
}

/** Tras cada acción: subastas en cola, turno de un jugador eliminado y ganador. */
function settle(s) {
  const alive = activePlayers(s);
  if (alive.length === 1) {
    s.phase = 'finished';
    s.winnerId = alive[0].id;
    s.debts = [];
    s.auction = null;
    s.auctionQueue = [];
    s.buildingClaim = null;
    s.placement = null;
    s.trades = [];
    log(s, `🏆 ${alive[0].name} gana la partida.`);
    return;
  }
  if (s.debts.length || s.placement || s.buildingClaim || s.auction) return;
  if (s.auctionQueue.length) {
    startPropertyAuction(s, s.auctionQueue.shift());
    return;
  }
  if (player(s, s.turn.playerId).status === PLAYER_STATUS.BANKRUPT) advanceTurn(s);
}

/* ------------------------------------------------------------------ */
/* Subastas (abiertas, sin orden de turno, desde $10)                  */
/* ------------------------------------------------------------------ */

function startPropertyAuction(s, index) {
  s.auction = {
    kind: 'property',
    index,
    highBid: 0,
    highBidderId: null,
    participants: activePlayers(s).map((p) => p.id),
    passed: [],
  };
  log(s, `Se subasta ${BOARD[index].name}. La puja empieza en ${money(AUCTION_MIN_BID)}.`);
}

function startBuildingAuction(s, buildingType, participants) {
  s.auction = { kind: 'building', buildingType, highBid: 0, highBidderId: null, participants, passed: [] };
  log(s, `Escasez: se subasta ${buildingType === 'hotel' ? 'un hotel' : 'una casa'} entre ${participants.map((id) => player(s, id).name).join(', ')}.`);
}

function auctionDone(a) {
  const others = a.participants.filter((id) => id !== a.highBidderId);
  return others.every((id) => a.passed.includes(id));
}

function finishAuctionIfDone(s) {
  const a = s.auction;
  if (!auctionDone(a)) return;
  s.auction = null;

  if (a.kind === 'property') {
    const sq = BOARD[a.index];
    if (a.highBidderId) {
      const w = player(s, a.highBidderId);
      w.money -= a.highBid;
      s.ownership[a.index] = { ownerId: w.id, houses: 0, mortgaged: false };
      log(s, `${w.name} gana la subasta de ${sq.name} por ${money(a.highBid)}.`);
    } else {
      log(s, `Nadie pujó por ${sq.name}: sigue siendo de la banca.`);
    }
    return;
  }

  // Edificio en escasez
  if (!a.highBidderId) {
    log(s, 'Nadie pujó por el edificio: queda en la banca.');
    return;
  }
  const w = player(s, a.highBidderId);
  w.money -= a.highBid;
  if (a.buildingType === 'hotel') s.bank.hotels -= 1;
  else s.bank.houses -= 1;
  s.placement = { playerId: w.id, buildingType: a.buildingType };
  log(s, `${w.name} gana ${a.buildingType === 'hotel' ? 'el hotel' : 'la casa'} por ${money(a.highBid)} y debe colocarlo.`);
  if (!legalPlacements(s, w.id, a.buildingType).length) cancelPlacement(s, 'no tiene dónde colocarlo');
}

/* ------------------------------------------------------------------ */
/* Escasez de edificios (G0009 BUILDINGS: "Not enough buildings?")     */
/* ------------------------------------------------------------------ */

/** Jugadores que ahora mismo podrían construir un edificio de este tipo. */
export function eligibleBuilders(s, buildingType) {
  return activePlayers(s)
    .filter((p) =>
      BOARD.some(
        (sq) =>
          s.ownership[sq.index]?.ownerId === p.id &&
          nextBuildingType(s, sq.index) === buildingType &&
          !buildBlocker(s, p.id, sq.index, { ignoreStock: true }),
      ),
    )
    .map((p) => p.id);
}

export function legalPlacements(s, playerId, buildingType) {
  return BOARD.filter(
    (sq) =>
      s.ownership[sq.index]?.ownerId === playerId &&
      nextBuildingType(s, sq.index) === buildingType &&
      !buildBlocker(s, playerId, sq.index, { ignoreStock: true, ignoreMoney: true }),
  ).map((sq) => sq.index);
}

function cancelPlacement(s, why) {
  const pl = s.placement;
  if (pl.buildingType === 'hotel') s.bank.hotels += 1;
  else s.bank.houses += 1;
  s.placement = null;
  log(s, `El edificio vuelve a la banca (${why}).`);
}

function buildNow(s, p, index) {
  const sq = BOARD[index];
  const own = s.ownership[index];
  p.money -= sq.houseCost;
  if (own.houses === HOUSES_PER_HOTEL) {
    s.bank.hotels -= 1;
    s.bank.houses += HOUSES_PER_HOTEL;
    own.houses = HOTEL;
    log(s, `${p.name} construye un hotel en ${sq.name}.`);
  } else {
    s.bank.houses -= 1;
    own.houses += 1;
    log(s, `${p.name} construye una casa en ${sq.name}.`);
  }
}

function resolveClaim(s) {
  const c = s.buildingClaim;
  if (c.eligible.some((id) => !(id in c.responses))) return;
  s.buildingClaim = null;
  const interested = c.eligible.filter((id) => c.responses[id]);
  const stock = c.buildingType === 'hotel' ? s.bank.hotels : s.bank.houses;
  const requester = player(s, c.requesterId);
  if (interested.length > stock && interested.length > 1) {
    startBuildingAuction(s, c.buildingType, interested);
    return;
  }
  // Alcanza para todos los interesados: se atiende la petición original si sigue siendo legal.
  if (requester && requester.status !== PLAYER_STATUS.BANKRUPT && !buildBlocker(s, requester.id, c.index)) buildNow(s, requester, c.index);
}

/* ------------------------------------------------------------------ */
/* Bancarrota (G0009 HELP! I CAN'T PAY!)                               */
/* ------------------------------------------------------------------ */

/** Liquidación completa: vende todos los edificios a la banca e hipoteca todo. */
function liquidateAll(s, p) {
  for (const sq of BOARD) {
    const own = s.ownership[sq.index];
    if (own?.ownerId !== p.id || !own.houses) continue;
    const units = own.houses === HOTEL ? 5 : own.houses;
    p.money += (units * sq.houseCost) / 2;
    if (own.houses === HOTEL) s.bank.hotels += 1;
    else s.bank.houses += own.houses;
    own.houses = 0;
  }
  for (const sq of BOARD) {
    const own = s.ownership[sq.index];
    if (own?.ownerId === p.id && !own.mortgaged) {
      own.mortgaged = true;
      p.money += sq.mortgage;
    }
  }
}

function bankrupt(s, p, creditorId) {
  liquidateAll(s, p);
  const owned = BOARD.filter((sq) => s.ownership[sq.index]?.ownerId === p.id);
  const creditor = creditorId ? player(s, creditorId) : null;

  if (creditor && creditor.status !== PLAYER_STATUS.BANKRUPT) {
    creditor.money += p.money;
    for (const sq of owned) s.ownership[sq.index].ownerId = creditor.id; // siguen hipotecadas, sin recargo
    creditor.jailFreeCards.push(...p.jailFreeCards);
    log(s, `${p.name} quiebra. ${creditor.name} recibe ${money(p.money)}, sus propiedades hipotecadas y sus cartas.`);
  } else {
    for (const sq of owned) delete s.ownership[sq.index]; // hipotecas canceladas
    s.auctionQueue.push(...owned.map((sq) => sq.index));
    for (const c of p.jailFreeCards) s.decks[c.deck].push(c.cardId);
    log(s, `${p.name} quiebra ante la banca. Sus propiedades salen a subasta.`);
  }

  p.money = 0;
  p.jailFreeCards = [];
  p.status = PLAYER_STATUS.BANKRUPT;
  s.debts = s.debts.filter((d) => d.debtorId !== p.id && d.creditorId !== p.id);
  s.trades = s.trades.filter((t) => t.fromId !== p.id && t.toId !== p.id);
  if (s.turn.playerId === p.id) s.pendingPurchase = null;

  if (s.auction) {
    const a = s.auction;
    a.participants = a.participants.filter((id) => id !== p.id);
    a.passed = a.passed.filter((id) => id !== p.id);
    if (a.highBidderId === p.id) {
      a.highBidderId = null;
      a.highBid = 0;
      a.passed = [];
    }
    if (!a.participants.length) s.auction = null;
    else finishAuctionIfDone(s);
  }
  if (s.buildingClaim) {
    const c = s.buildingClaim;
    c.eligible = c.eligible.filter((id) => id !== p.id);
    delete c.responses[p.id];
    if (!c.eligible.length) s.buildingClaim = null;
    else resolveClaim(s);
  }
  if (s.placement?.playerId === p.id) cancelPlacement(s, `${p.name} quebró`);
}

/* ------------------------------------------------------------------ */
/* Negociaciones (G0009 DEALS & TRADES: en cualquier momento)          */
/* ------------------------------------------------------------------ */

function normalizeOffer(o = {}) {
  return {
    money: Math.max(0, Math.floor(Number(o.money) || 0)),
    squares: [...new Set((o.squares ?? []).map(Number))],
    jailCards: Math.max(0, Math.floor(Number(o.jailCards) || 0)),
  };
}

function validateOffer(s, p, offer) {
  check(p.money >= offer.money, `${p.name} no tiene ${money(offer.money)}.`);
  check(p.jailFreeCards.length >= offer.jailCards, `${p.name} no tiene esas cartas de libertad.`);
  for (const i of offer.squares) {
    check(BOARD[i] && isOwnable(BOARD[i]), 'Propiedad no válida.');
    const why = tradeBlocker(s, p.id, i);
    if (why) fail(why);
  }
}

function transferOffer(s, from, to, offer) {
  from.money -= offer.money;
  to.money += offer.money;
  to.jailFreeCards.push(...from.jailFreeCards.splice(0, offer.jailCards));
  // Las hipotecadas pasan tal cual: el nuevo dueño las levanta cuando quiera (sin recargo en G0009).
  for (const i of offer.squares) s.ownership[i].ownerId = to.id;
}

/* ------------------------------------------------------------------ */
/* Manejadores                                                         */
/* ------------------------------------------------------------------ */

const HANDLERS = {
  /* ---------- Turno ---------- */

  [ACTIONS.ROLL_DICE](s, p, _x, rng) {
    requireTurnAction(s, p, TURN_STEPS.ROLL);
    const d = [rollDie(rng), rollDie(rng)];
    const isDouble = d[0] === d[1];
    s.dice = d;
    s.rollSeq = (s.rollSeq ?? 0) + 1;
    s.lastRollTotal = d[0] + d[1];
    s.lastCard = null;
    s.utilityRoll = null;
    log(s, `${p.name} saca ${d[0]} + ${d[1]}${isDouble ? ' (dobles)' : ''}.`);

    if (p.status === PLAYER_STATUS.IN_JAIL) {
      s.turn.extraRoll = false; // salir con dobles no da otra tirada
      if (isDouble) {
        releaseFromJail(p);
        log(s, `${p.name} sale de la cárcel con dobles.`);
      } else {
        p.jailTurns += 1;
        if (p.jailTurns < MAX_JAIL_TURNS) {
          s.turn.step = TURN_STEPS.END;
          log(s, `${p.name} sigue en la cárcel (${p.jailTurns}/${MAX_JAIL_TURNS}).`);
          return;
        }
        releaseFromJail(p);
        charge(s, p, null, JAIL_FINE, 'multa de la cárcel');
      }
      s.turn.step = TURN_STEPS.END;
      moveBy(s, p, s.lastRollTotal);
      resolveLanding(s, p, rng);
      return;
    }

    if (isDouble) {
      s.turn.doublesInRow += 1;
      if (s.turn.doublesInRow >= 3) {
        log(s, `${p.name} saca tres dobles seguidos.`);
        sendToJail(s, p);
        return;
      }
    }
    s.turn.extraRoll = isDouble;
    s.turn.step = stepAfterResolution(s);
    moveBy(s, p, s.lastRollTotal);
    resolveLanding(s, p, rng);
  },

  [ACTIONS.PAY_JAIL_FINE](s, p) {
    requireTurnAction(s, p, TURN_STEPS.ROLL);
    check(p.status === PLAYER_STATUS.IN_JAIL, 'No estás en la cárcel.');
    check(p.money >= JAIL_FINE, `Necesitas ${money(JAIL_FINE)}.`);
    p.money -= JAIL_FINE;
    releaseFromJail(p);
    log(s, `${p.name} paga ${money(JAIL_FINE)} y sale de la cárcel.`);
  },

  [ACTIONS.USE_JAIL_CARD](s, p) {
    requireTurnAction(s, p, TURN_STEPS.ROLL);
    check(p.status === PLAYER_STATUS.IN_JAIL, 'No estás en la cárcel.');
    check(p.jailFreeCards.length > 0, 'No tienes cartas de libertad.');
    const c = p.jailFreeCards.shift();
    s.decks[c.deck].push(c.cardId);
    releaseFromJail(p);
    log(s, `${p.name} usa una carta y sale de la cárcel.`);
  },

  [ACTIONS.BUY_PROPERTY](s, p) {
    requireTurnAction(s, p, TURN_STEPS.BUY);
    const sq = BOARD[s.pendingPurchase];
    check(p.money >= sq.price, 'No tienes dinero suficiente: hay que subastarla.');
    p.money -= sq.price;
    s.ownership[sq.index] = { ownerId: p.id, houses: 0, mortgaged: false };
    s.pendingPurchase = null;
    s.turn.step = stepAfterResolution(s);
    log(s, `${p.name} compra ${sq.name} por ${money(sq.price)}.`);
  },

  [ACTIONS.DECLINE_PROPERTY](s, p) {
    requireTurnAction(s, p, TURN_STEPS.BUY);
    const index = s.pendingPurchase;
    s.pendingPurchase = null;
    s.turn.step = stepAfterResolution(s);
    startPropertyAuction(s, index);
  },

  /** Regla de la casa `skipPurchase`: pasar sin comprar ni subastar (no es oficial). */
  [ACTIONS.SKIP_PROPERTY](s, p) {
    requireTurnAction(s, p, TURN_STEPS.BUY);
    check(s.options?.skipPurchase, 'El reglamento obliga a comprar o subastar la propiedad.');
    const sq = BOARD[s.pendingPurchase];
    s.pendingPurchase = null;
    s.turn.step = stepAfterResolution(s);
    log(s, `${p.name} no compra ${sq.name}: sigue siendo de la banca.`);
  },

  [ACTIONS.END_TURN](s, p) {
    requireTurnAction(s, p, TURN_STEPS.END);
    advanceTurn(s);
  },

  /* ---------- Subastas ---------- */

  [ACTIONS.PLACE_BID](s, p, { amount }) {
    const a = s.auction;
    check(a, 'No hay ninguna subasta en curso.');
    check(a.participants.includes(p.id), 'No participas en esta subasta.');
    check(a.highBidderId !== p.id, 'Ya tienes la mejor oferta.');
    const bid = Math.floor(Number(amount));
    const min = Math.max(AUCTION_MIN_BID, a.highBid + 1);
    check(Number.isFinite(bid) && bid >= min, `La puja mínima es ${money(min)}.`);
    check(bid <= p.money, 'No tienes ese dinero en efectivo.');
    a.highBid = bid;
    a.highBidderId = p.id;
    a.passed = []; // una nueva puja reabre la subasta para todos
    log(s, `${p.name} puja ${money(bid)}.`);
    finishAuctionIfDone(s);
  },

  [ACTIONS.PASS_BID](s, p) {
    const a = s.auction;
    check(a, 'No hay ninguna subasta en curso.');
    check(a.participants.includes(p.id), 'No participas en esta subasta.');
    check(a.highBidderId !== p.id, 'Tienes la mejor oferta.');
    check(!a.passed.includes(p.id), 'Ya dijiste que no subes.');
    a.passed.push(p.id);
    log(s, `${p.name} no sube.`);
    finishAuctionIfDone(s);
  },

  /* ---------- Construcción, venta e hipotecas (en cualquier momento) ---------- */

  [ACTIONS.BUILD](s, p, { index }) {
    requireFree(s, p);
    check(!s.buildingClaim && !(s.auction?.kind === 'building') && !s.placement, 'Hay una operación de edificios en escasez en curso.');
    const why = buildBlocker(s, p.id, index);
    if (why) fail(why);
    const type = nextBuildingType(s, index);
    const stock = type === 'hotel' ? s.bank.hotels : s.bank.houses;
    const eligible = eligibleBuilders(s, type);
    if (eligible.length > 1 && stock < eligible.length) {
      s.buildingClaim = { buildingType: type, requesterId: p.id, index, eligible, responses: { [p.id]: true } };
      log(s, `${p.name} quiere ${type === 'hotel' ? 'un hotel' : 'una casa'} y quedan ${stock} en la banca: ¿alguien más lo quiere?`);
      resolveClaim(s);
      return;
    }
    buildNow(s, p, index);
  },

  [ACTIONS.CLAIM_BUILDING](s, p, { want }) {
    const c = s.buildingClaim;
    check(c, 'No hay ninguna solicitud de edificios.');
    check(c.eligible.includes(p.id) && !(p.id in c.responses), 'No te corresponde responder.');
    c.responses[p.id] = Boolean(want);
    log(s, `${p.name} ${want ? 'también lo quiere' : 'no lo quiere'}.`);
    resolveClaim(s);
  },

  [ACTIONS.PLACE_BUILDING](s, p, { index }) {
    const pl = s.placement;
    check(pl && pl.playerId === p.id, 'No tienes ningún edificio para colocar.');
    check(legalPlacements(s, p.id, pl.buildingType).includes(Number(index)), 'No se puede colocar ahí.');
    const own = s.ownership[index];
    if (pl.buildingType === 'hotel') {
      own.houses = HOTEL;
      s.bank.houses += HOUSES_PER_HOTEL;
    } else {
      own.houses += 1;
    }
    s.placement = null;
    log(s, `${p.name} coloca ${pl.buildingType === 'hotel' ? 'el hotel' : 'la casa'} en ${BOARD[index].name}.`);
  },

  [ACTIONS.SELL_BUILDING](s, p, { index }) {
    requireFree(s, p);
    const why = sellBlocker(s, p.id, index);
    if (why) fail(why);
    const wasHotel = s.ownership[index].houses === HOTEL;
    sellOneBuilding(s, p, index);
    log(s, `${p.name} vende ${wasHotel ? 'el hotel (lo cambia por 4 casas)' : 'una casa'} de ${BOARD[index].name} por ${money(BOARD[index].houseCost / 2)}.`);
  },

  [ACTIONS.MORTGAGE](s, p, { index }) {
    requireFree(s, p);
    const why = mortgageBlocker(s, p.id, index);
    if (why) fail(why);
    s.ownership[index].mortgaged = true;
    p.money += BOARD[index].mortgage;
    log(s, `${p.name} hipoteca ${BOARD[index].name} y recibe ${money(BOARD[index].mortgage)}.`);
  },

  [ACTIONS.UNMORTGAGE](s, p, { index }) {
    requireFree(s, p);
    const why = unmortgageBlocker(s, p.id, index);
    if (why) fail(why);
    const sq = BOARD[index];
    p.money -= sq.unmortgage;
    s.ownership[index].mortgaged = false;
    log(s, `${p.name} levanta la hipoteca de ${sq.name} por ${money(sq.unmortgage)}.`);
  },

  /* ---------- Negociaciones (en cualquier momento) ---------- */

  [ACTIONS.PROPOSE_TRADE](s, p, { toId, give, get }) {
    requireFree(s, p);
    const other = player(s, toId);
    check(other && other.id !== p.id && other.status !== PLAYER_STATUS.BANKRUPT, 'Jugador no válido.');
    const g = normalizeOffer(give);
    const r = normalizeOffer(get);
    check(g.money + g.squares.length + g.jailCards + r.money + r.squares.length + r.jailCards > 0, 'La oferta está vacía.');
    validateOffer(s, p, g);
    validateOffer(s, other, r);
    s.trades.push({ id: `t${s.seq++}`, fromId: p.id, toId: other.id, give: g, get: r });
    log(s, `${p.name} propone un trato a ${other.name}.`);
  },

  [ACTIONS.RESPOND_TRADE](s, p, { tradeId, accept }) {
    requireFree(s, p);
    const i = s.trades.findIndex((t) => t.id === tradeId);
    check(i >= 0, 'Esa oferta ya no existe.');
    const t = s.trades[i];
    check(p.id === t.toId, 'Sólo el destinatario puede responder.');
    const from = player(s, t.fromId);
    if (!accept) {
      s.trades.splice(i, 1);
      log(s, `${p.name} rechaza el trato de ${from.name}.`);
      return;
    }
    // Se vuelve a validar al aceptar: el estado puede haber cambiado desde la propuesta.
    validateOffer(s, from, t.give);
    validateOffer(s, p, t.get);
    s.trades.splice(i, 1);
    transferOffer(s, from, p, t.give);
    transferOffer(s, p, from, t.get);
    // Otras ofertas que incluían esas propiedades quedan inválidas: se retiran.
    const moved = new Set([...t.give.squares, ...t.get.squares]);
    s.trades = s.trades.filter((o) => ![...o.give.squares, ...o.get.squares].some((x) => moved.has(x)));
    log(s, `${p.name} acepta el trato de ${from.name}.`);
  },

  [ACTIONS.CANCEL_TRADE](s, p, { tradeId }) {
    const i = s.trades.findIndex((t) => t.id === tradeId);
    check(i >= 0, 'Esa oferta ya no existe.');
    check(s.trades[i].fromId === p.id, 'Sólo quien propuso el trato puede retirarlo.');
    s.trades.splice(i, 1);
    log(s, `${p.name} retira su propuesta.`);
  },

  /* ---------- Deudas y bancarrota ---------- */

  [ACTIONS.PAY_DEBT](s, p) {
    const d = s.debts.find((x) => x.debtorId === p.id);
    check(d, 'No tienes deudas pendientes.');
    check(p.money >= d.amount, `Te faltan ${money(d.amount - p.money)}: vende edificios, hipoteca o negocia.`);
    p.money -= d.amount;
    if (d.creditorId) player(s, d.creditorId).money += d.amount;
    s.debts = s.debts.filter((x) => x !== d);
    log(s, `${p.name} paga ${money(d.amount)} (${d.reason}).`);
  },

  [ACTIONS.DECLARE_BANKRUPTCY](s, p) {
    const d = s.debts.find((x) => x.debtorId === p.id);
    check(d, 'Sólo puede quebrar quien tiene una deuda.');
    const owed = totalDebt(s, p.id);
    check(
      maxRaisable(s, p.id) < owed,
      `Todavía puedes reunir el dinero vendiendo edificios o hipotecando (debes ${money(owed)}).`,
    );
    bankrupt(s, p, d.creditorId);
  },

  /** Política de plataforma (no es una regla del juego): abandonar = bancarrota ante la banca. */
  [ACTIONS.RESIGN](s, p) {
    log(s, `${p.name} abandona la partida.`);
    s.debts = s.debts.filter((d) => d.debtorId !== p.id);
    bankrupt(s, p, null);
  },
};

/* ------------------------------------------------------------------ */
/* Consultas para la interfaz y el servidor                            */
/* ------------------------------------------------------------------ */

/** Jugadores de los que se espera una decisión ahora mismo. */
export function getPendingDeciders(state) {
  if (state.phase !== 'playing') return [];
  if (state.debts.length) return [...new Set(state.debts.map((d) => d.debtorId))];
  if (state.placement) return [state.placement.playerId];
  if (state.buildingClaim) return state.buildingClaim.eligible.filter((id) => !(id in state.buildingClaim.responses));
  if (state.auction) {
    const a = state.auction;
    return a.participants.filter((id) => id !== a.highBidderId && !a.passed.includes(id));
  }
  return [state.turn.playerId];
}

/** Primer jugador que debe decidir (útil para el modo "misma PC"). */
export function getActingPlayerId(state) {
  return getPendingDeciders(state)[0] ?? null;
}
