/**
 * Motor de reglas de Magnate (reglas clásicas completas).
 *
 *   applyAction(state, action, rng?) -> { ok: true, state } | { ok: false, error }
 *
 *  - Puro respecto a la entrada: clona el estado y devuelve uno nuevo.
 *  - `rng` (() => [0,1)) se inyecta para que el servidor controle el azar y
 *    los tests sean reproducibles.
 *  - Sin React, DOM ni red: lo ejecutarán igual el navegador y el servidor.
 *
 * Reglamento: docs/REGLAMENTO_MAGNATE.md
 */
import { ACTIONS } from './actionTypes.js';
import { BOARD, SQUARE_TYPES, BOARD_SIZE, JAIL_INDEX, GO_SALARY, isOwnable } from '../data/board.js';
import { getCard, DECK_NAMES } from '../data/cards.js';
import { HOTEL, TURN_STEPS } from '../state/gameState.js';
import { PLAYER_STATUS } from '../models/player.js';
import {
  JAIL_FINE,
  MAX_JAIL_TURNS,
  computeRent,
  buildBlocker,
  sellBlocker,
  mortgageBlocker,
  unmortgageBlocker,
  unmortgageCost,
  mortgageFee,
  tradeBlocker,
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
    const s = structuredClone(state);
    const handler = HANDLERS[action?.type];
    if (!handler) fail(`Acción desconocida: ${action?.type}`);
    const actor = player(s, action.playerId);
    check(actor && actor.status !== PLAYER_STATUS.BANKRUPT, 'Jugador no válido.');
    checkInterrupts(s, action);
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
/* Quién puede actuar ahora                                            */
/* ------------------------------------------------------------------ */

const DEBT_ACTIONS = new Set([ACTIONS.PAY_DEBT, ACTIONS.DECLARE_BANKRUPTCY, ACTIONS.SELL_BUILDING, ACTIONS.MORTGAGE]);
const AUCTION_ACTIONS = new Set([ACTIONS.PLACE_BID, ACTIONS.PASS_BID]);
const TRADE_ACTIONS = new Set([ACTIONS.RESPOND_TRADE, ACTIONS.CANCEL_TRADE]);

function checkInterrupts(s, action) {
  if (s.debts.length) {
    check(DEBT_ACTIONS.has(action.type), 'Primero hay que saldar la deuda pendiente.');
    check(action.playerId === s.debts[0].debtorId, 'Sólo el jugador endeudado puede actuar ahora.');
    return;
  }
  check(action.type !== ACTIONS.PAY_DEBT, 'No hay deudas pendientes.');
  if (s.auction) {
    check(AUCTION_ACTIONS.has(action.type), 'Hay una subasta en curso.');
    return;
  }
  check(!AUCTION_ACTIONS.has(action.type), 'No hay ninguna subasta en curso.');
  if (s.trade) {
    check(TRADE_ACTIONS.has(action.type), 'Hay una negociación esperando respuesta.');
    return;
  }
  check(!TRADE_ACTIONS.has(action.type), 'No hay ninguna negociación abierta.');
  check(action.playerId === s.turn.playerId, 'No es tu turno.');
}

/** Acciones de jugador "actual" que sólo valen en un paso concreto. */
const requireStep = (s, step) => check(s.turn.step === step, 'Esa acción no corresponde en este momento.');

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const player = (s, id) => s.players.find((p) => p.id === id);
const activePlayers = (s) => s.players.filter((p) => p.status !== PLAYER_STATUS.BANKRUPT);
const money = (n) => `$${n}`;

function log(s, text) {
  s.log.push({ id: `l${s.seq++}`, text });
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
}

const rollDie = (rng) => 1 + Math.floor(rng() * 6);

/**
 * Cobra `amount` de `debtor`. Si no tiene efectivo suficiente se registra
 * una deuda que deberá resolver (vendiendo, hipotecando o declarando bancarrota).
 */
function charge(s, debtor, creditorId, amount, reason) {
  if (amount <= 0) return true;
  if (debtor.money >= amount) {
    debtor.money -= amount;
    if (creditorId) player(s, creditorId).money += amount;
    return true;
  }
  s.debts.push({ debtorId: debtor.id, creditorId, amount, reason });
  const to = creditorId ? player(s, creditorId).name : 'la banca';
  log(s, `${debtor.name} debe ${money(amount)} a ${to} (${reason}) y no tiene efectivo suficiente.`);
  return false;
}

/** Igual que charge, pero deja constancia del pago en el registro. */
function pay(s, debtor, creditorId, amount, reason) {
  if (charge(s, debtor, creditorId, amount, reason) && amount > 0) {
    const to = creditorId ? player(s, creditorId).name : 'la banca';
    log(s, `${debtor.name} paga ${money(amount)} a ${to} (${reason}).`);
  }
}

function sendToJail(s, p) {
  p.position = JAIL_INDEX;
  p.status = PLAYER_STATUS.IN_JAIL;
  p.jailTurns = 0;
  s.turn.doublesInRow = 0;
  s.turn.extraRoll = false;
  if (s.turn.playerId === p.id) {
    s.turn.step = TURN_STEPS.END;
    s.pendingPurchase = null;
  }
  log(s, `${p.name} va a la cárcel.`);
}

function releaseFromJail(p) {
  p.status = PLAYER_STATUS.ACTIVE;
  p.jailTurns = 0;
}

/** Avanza `steps` casillas cobrando Salida si corresponde. */
function moveBy(s, p, steps) {
  const target = (p.position + steps) % BOARD_SIZE;
  if (p.position + steps >= BOARD_SIZE) collectGo(s, p);
  p.position = target;
}

/** Avanza hasta `index` en sentido de juego (cobrando Salida si la pasa). */
function advanceTo(s, p, index) {
  if (index <= p.position) collectGo(s, p);
  p.position = index;
}

function collectGo(s, p) {
  p.money += GO_SALARY;
  log(s, `${p.name} pasa por la Salida y cobra ${money(GO_SALARY)}.`);
}

/* ------------------------------------------------------------------ */
/* Resolución de la casilla de llegada                                 */
/* ------------------------------------------------------------------ */

function resolveLanding(s, p, rng, ctx = {}) {
  const square = BOARD[p.position];
  log(s, `${p.name} cae en ${square.name}.`);

  switch (square.type) {
    case SQUARE_TYPES.GO_TO_JAIL:
      sendToJail(s, p);
      return;
    case SQUARE_TYPES.TAX:
      pay(s, p, null, square.amount, square.name);
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
    log(s, `${square.name} está hipotecada: no se paga alquiler.`);
    return;
  }
  let diceTotal = s.lastRollTotal;
  if (ctx.cardRent === 'utility-10x') {
    const d = [rollDie(rng), rollDie(rng)];
    diceTotal = d[0] + d[1];
    log(s, `${p.name} tira ${d[0]} + ${d[1]} para calcular el alquiler.`);
  }
  const rent = computeRent(s, square.index, { diceTotal, cardRent: ctx.cardRent });
  pay(s, p, own.ownerId, rent, `alquiler de ${square.name}`);
}

function drawCard(s, p, deck, rng) {
  const cardId = s.decks[deck].shift();
  const card = getCard(cardId);
  s.lastCard = { deck, cardId, playerId: p.id, seq: s.seq };
  log(s, `${p.name} roba ${DECK_NAMES[deck]}: «${card.text}»`);
  const e = card.effect;

  if (e.kind === 'jail-free') {
    p.jailFreeCards.push({ deck, cardId });
    return; // no vuelve al mazo hasta que se use
  }
  s.decks[deck].push(cardId);

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
      pay(s, p, null, e.amount, `carta de ${DECK_NAMES[deck]}`);
      break;
    case 'collect-each':
      for (const other of activePlayers(s)) if (other.id !== p.id) pay(s, other, p.id, e.amount, `carta de ${DECK_NAMES[deck]}`);
      break;
    case 'pay-each':
      for (const other of activePlayers(s)) if (other.id !== p.id) pay(s, p, other.id, e.amount, `carta de ${DECK_NAMES[deck]}`);
      break;
    case 'repairs': {
      let total = 0;
      for (const own of Object.values(s.ownership)) {
        if (own.ownerId !== p.id || !own.houses) continue;
        total += own.houses === HOTEL ? e.hotel : own.houses * e.house;
      }
      if (total) pay(s, p, null, total, 'reparaciones');
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
  let i = order.findIndex((p) => p.id === s.turn.playerId);
  for (let n = 0; n < order.length; n++) {
    i = (i + 1) % order.length;
    if (i === 0) s.turn.round += 1;
    if (order[i].status !== PLAYER_STATUS.BANKRUPT) break;
  }
  for (const own of Object.values(s.ownership)) delete own.feePaid;
  s.turn = { ...s.turn, playerId: order[i].id, step: TURN_STEPS.ROLL, doublesInRow: 0, extraRoll: false };
  s.pendingPurchase = null;
  s.dice = null;
  log(s, `Turno de ${order[i].name}.`);
}

/** Tras cada acción: abre subastas en cola, pasa turno si el actual quebró, detecta ganador. */
function settle(s) {
  const alive = activePlayers(s);
  if (alive.length === 1) {
    s.phase = 'finished';
    s.winnerId = alive[0].id;
    s.debts = [];
    s.auction = null;
    s.trade = null;
    log(s, `🏆 ${alive[0].name} gana la partida.`);
    return;
  }
  if (s.debts.length) return;
  if (!s.auction && s.auctionQueue.length) startAuction(s, s.auctionQueue.shift());
  if (s.auction) return;
  if (player(s, s.turn.playerId).status === PLAYER_STATUS.BANKRUPT) advanceTurn(s);
}

/* ------------------------------------------------------------------ */
/* Subastas                                                            */
/* ------------------------------------------------------------------ */

function startAuction(s, index) {
  const alive = activePlayers(s);
  const start = Math.max(0, alive.findIndex((p) => p.id === s.turn.playerId));
  const bidders = [...alive.slice(start), ...alive.slice(0, start)].map((p) => p.id);
  s.auction = { index, highBid: 0, highBidderId: null, bidders, currentBidderId: bidders[0] };
  log(s, `Se subasta ${BOARD[index].name}.`);
}

function nextBidder(a, fromId) {
  const i = a.bidders.indexOf(fromId);
  return a.bidders[(i + 1) % a.bidders.length];
}

function finishAuctionIfDone(s) {
  const a = s.auction;
  const done = a.bidders.length === 0 || (a.bidders.length === 1 && a.bidders[0] === a.highBidderId);
  if (!done) return;
  const sq = BOARD[a.index];
  if (a.highBidderId) {
    const winner = player(s, a.highBidderId);
    winner.money -= a.highBid;
    s.ownership[a.index] = { ownerId: winner.id, houses: 0, mortgaged: false };
    log(s, `${winner.name} gana la subasta de ${sq.name} por ${money(a.highBid)}.`);
  } else {
    log(s, `Nadie pujó por ${sq.name}: sigue siendo de la banca.`);
  }
  s.auction = null;
}

/* ------------------------------------------------------------------ */
/* Bancarrota                                                          */
/* ------------------------------------------------------------------ */

function bankrupt(s, p, creditorId) {
  const creditor = creditorId ? player(s, creditorId) : null;
  // 1) Los edificios vuelven a la banca por la mitad de su coste.
  for (const sq of BOARD) {
    const own = s.ownership[sq.index];
    if (own?.ownerId !== p.id || !own.houses) continue;
    const units = own.houses === HOTEL ? 5 : own.houses;
    p.money += (units * sq.houseCost) / 2;
    if (own.houses === HOTEL) s.bank.hotels += 1;
    else s.bank.houses += own.houses;
    own.houses = 0;
  }
  const owned = BOARD.filter((sq) => s.ownership[sq.index]?.ownerId === p.id);

  if (creditor) {
    creditor.money += Math.max(0, p.money);
    for (const sq of owned) {
      const own = s.ownership[sq.index];
      own.ownerId = creditor.id;
      if (own.mortgaged) {
        own.feePaid = true;
        charge(s, creditor, null, mortgageFee(sq), `interés de hipoteca de ${sq.name}`);
      }
    }
    creditor.jailFreeCards.push(...p.jailFreeCards);
    log(s, `${p.name} quiebra. Todos sus bienes pasan a ${creditor.name}.`);
  } else {
    for (const sq of owned) delete s.ownership[sq.index];
    s.auctionQueue.push(...owned.map((sq) => sq.index));
    for (const c of p.jailFreeCards) s.decks[c.deck].push(c.cardId);
    log(s, `${p.name} quiebra ante la banca. Sus propiedades salen a subasta.`);
  }

  p.money = 0;
  p.jailFreeCards = [];
  p.status = PLAYER_STATUS.BANKRUPT;
  s.debts = s.debts.filter((d) => d.debtorId !== p.id && d.creditorId !== p.id);
  if (s.trade && (s.trade.fromId === p.id || s.trade.toId === p.id)) s.trade = null;
  if (s.turn.playerId === p.id) s.pendingPurchase = null;
}

/* ------------------------------------------------------------------ */
/* Negociaciones                                                       */
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
    const why = tradeBlocker(s, p.id, i);
    if (why) fail(why);
  }
}

function transferOffer(s, from, to, offer) {
  from.money -= offer.money;
  to.money += offer.money;
  to.jailFreeCards.push(...from.jailFreeCards.splice(0, offer.jailCards));
  for (const i of offer.squares) {
    const own = s.ownership[i];
    own.ownerId = to.id;
    if (own.mortgaged) {
      own.feePaid = true;
      pay(s, to, null, mortgageFee(BOARD[i]), `interés de hipoteca de ${BOARD[i].name}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Manejadores                                                         */
/* ------------------------------------------------------------------ */

const HANDLERS = {
  [ACTIONS.ROLL_DICE](s, p, _payload, rng) {
    requireStep(s, TURN_STEPS.ROLL);
    const d = [rollDie(rng), rollDie(rng)];
    const isDouble = d[0] === d[1];
    s.dice = d;
    s.rollSeq = (s.rollSeq ?? 0) + 1;
    s.lastRollTotal = d[0] + d[1];
    s.lastCard = null;
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
        pay(s, p, null, JAIL_FINE, 'multa de la cárcel');
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
    requireStep(s, TURN_STEPS.ROLL);
    check(p.status === PLAYER_STATUS.IN_JAIL, 'No estás en la cárcel.');
    check(p.money >= JAIL_FINE, `Necesitas ${money(JAIL_FINE)}.`);
    p.money -= JAIL_FINE;
    releaseFromJail(p);
    log(s, `${p.name} paga ${money(JAIL_FINE)} y sale de la cárcel.`);
  },

  [ACTIONS.USE_JAIL_CARD](s, p) {
    requireStep(s, TURN_STEPS.ROLL);
    check(p.status === PLAYER_STATUS.IN_JAIL, 'No estás en la cárcel.');
    check(p.jailFreeCards.length > 0, 'No tienes cartas de libertad.');
    const c = p.jailFreeCards.shift();
    s.decks[c.deck].push(c.cardId);
    releaseFromJail(p);
    log(s, `${p.name} usa una carta y sale de la cárcel.`);
  },

  [ACTIONS.BUY_PROPERTY](s, p) {
    requireStep(s, TURN_STEPS.BUY);
    const sq = BOARD[s.pendingPurchase];
    check(p.money >= sq.price, 'No tienes dinero suficiente. Puedes subastarla.');
    p.money -= sq.price;
    s.ownership[sq.index] = { ownerId: p.id, houses: 0, mortgaged: false };
    s.pendingPurchase = null;
    s.turn.step = stepAfterResolution(s);
    log(s, `${p.name} compra ${sq.name} por ${money(sq.price)}.`);
  },

  [ACTIONS.DECLINE_PROPERTY](s) {
    requireStep(s, TURN_STEPS.BUY);
    const index = s.pendingPurchase;
    s.pendingPurchase = null;
    s.turn.step = stepAfterResolution(s);
    startAuction(s, index);
  },

  [ACTIONS.PLACE_BID](s, p, { amount }) {
    const a = s.auction;
    check(a.currentBidderId === p.id, 'No es tu turno de pujar.');
    const bid = Math.floor(Number(amount));
    check(bid > a.highBid, `La puja debe superar ${money(a.highBid)}.`);
    check(bid <= p.money, 'No tienes ese dinero.');
    a.highBid = bid;
    a.highBidderId = p.id;
    a.currentBidderId = nextBidder(a, p.id);
    log(s, `${p.name} puja ${money(bid)}.`);
    finishAuctionIfDone(s);
  },

  [ACTIONS.PASS_BID](s, p) {
    const a = s.auction;
    check(a.currentBidderId === p.id, 'No es tu turno de pujar.');
    const next = a.bidders.length > 1 ? nextBidder(a, p.id) : null;
    a.bidders = a.bidders.filter((id) => id !== p.id);
    a.currentBidderId = next;
    log(s, `${p.name} se retira de la subasta.`);
    finishAuctionIfDone(s);
  },

  [ACTIONS.BUILD](s, p, { index }) {
    const why = buildBlocker(s, p.id, index);
    if (why) fail(why);
    const sq = BOARD[index];
    const own = s.ownership[index];
    p.money -= sq.houseCost;
    if (own.houses === 4) {
      s.bank.hotels -= 1;
      s.bank.houses += 4;
      own.houses = HOTEL;
      log(s, `${p.name} construye un hotel en ${sq.name}.`);
    } else {
      s.bank.houses -= 1;
      own.houses += 1;
      log(s, `${p.name} construye una casa en ${sq.name}.`);
    }
  },

  [ACTIONS.SELL_BUILDING](s, p, { index }) {
    const why = sellBlocker(s, p.id, index);
    if (why) fail(why);
    const sq = BOARD[index];
    const own = s.ownership[index];
    if (own.houses === HOTEL) {
      // El hotel se cambia por 4 casas; si la banca no las tiene, se vende lo que falte.
      const back = Math.min(4, s.bank.houses);
      s.bank.hotels += 1;
      s.bank.houses -= back;
      own.houses = back;
      p.money += ((5 - back) * sq.houseCost) / 2;
      log(s, `${p.name} vende el hotel de ${sq.name}.`);
    } else {
      own.houses -= 1;
      s.bank.houses += 1;
      p.money += sq.houseCost / 2;
      log(s, `${p.name} vende una casa de ${sq.name} por ${money(sq.houseCost / 2)}.`);
    }
  },

  [ACTIONS.MORTGAGE](s, p, { index }) {
    const why = mortgageBlocker(s, p.id, index);
    if (why) fail(why);
    const sq = BOARD[index];
    s.ownership[index].mortgaged = true;
    p.money += sq.mortgage;
    log(s, `${p.name} hipoteca ${sq.name} y recibe ${money(sq.mortgage)}.`);
  },

  [ACTIONS.UNMORTGAGE](s, p, { index }) {
    const why = unmortgageBlocker(s, p.id, index);
    if (why) fail(why);
    const sq = BOARD[index];
    const own = s.ownership[index];
    const cost = own.feePaid ? sq.mortgage : unmortgageCost(sq);
    p.money -= cost;
    own.mortgaged = false;
    delete own.feePaid;
    log(s, `${p.name} levanta la hipoteca de ${sq.name} por ${money(cost)}.`);
  },

  [ACTIONS.PROPOSE_TRADE](s, p, { toId, give, get }) {
    check(s.turn.step !== TURN_STEPS.BUY, 'Decide primero si compras la propiedad.');
    const other = player(s, toId);
    check(other && other.id !== p.id && other.status !== PLAYER_STATUS.BANKRUPT, 'Jugador no válido.');
    const g = normalizeOffer(give);
    const r = normalizeOffer(get);
    check(g.money + g.squares.length + g.jailCards + r.money + r.squares.length + r.jailCards > 0, 'La oferta está vacía.');
    validateOffer(s, p, g);
    validateOffer(s, other, r);
    s.trade = { fromId: p.id, toId: other.id, give: g, get: r };
    log(s, `${p.name} propone un trato a ${other.name}.`);
  },

  [ACTIONS.RESPOND_TRADE](s, p, { accept }) {
    const t = s.trade;
    check(p.id === t.toId, 'Sólo el destinatario puede responder.');
    const from = player(s, t.fromId);
    s.trade = null;
    if (!accept) {
      log(s, `${p.name} rechaza el trato de ${from.name}.`);
      return;
    }
    validateOffer(s, from, t.give);
    validateOffer(s, p, t.get);
    transferOffer(s, from, p, t.give);
    transferOffer(s, p, from, t.get);
    log(s, `${p.name} acepta el trato de ${from.name}.`);
  },

  [ACTIONS.CANCEL_TRADE](s, p) {
    check(p.id === s.trade.fromId, 'Sólo quien propuso el trato puede retirarlo.');
    s.trade = null;
    log(s, `${p.name} retira su propuesta.`);
  },

  [ACTIONS.PAY_DEBT](s, p) {
    const d = s.debts[0];
    check(p.money >= d.amount, `Aún te faltan ${money(d.amount - p.money)}. Vende edificios o hipoteca.`);
    p.money -= d.amount;
    if (d.creditorId) player(s, d.creditorId).money += d.amount;
    s.debts.shift();
    log(s, `${p.name} paga ${money(d.amount)} (${d.reason}).`);
  },

  [ACTIONS.DECLARE_BANKRUPTCY](s, p) {
    const d = s.debts[0];
    bankrupt(s, p, d.creditorId);
  },

  [ACTIONS.RESIGN](s, p) {
    check(!s.debts.length, 'Resuelve antes la deuda pendiente.');
    log(s, `${p.name} abandona la partida.`);
    bankrupt(s, p, null);
  },

  [ACTIONS.END_TURN](s) {
    requireStep(s, TURN_STEPS.END);
    advanceTurn(s);
  },
};

/** Ayuda para la interfaz: ¿quién debe decidir ahora? */
export function getActingPlayerId(state) {
  if (state.phase !== 'playing') return null;
  if (state.debts.length) return state.debts[0].debtorId;
  if (state.auction) return state.auction.currentBidderId;
  if (state.trade) return state.trade.toId;
  return state.turn.playerId;
}

