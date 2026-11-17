/**
 * Tests del motor de reglas de Magnate. Ejecutar: npm test
 * Usa el runner nativo de Node (sin dependencias).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, ACTIONS, getActingPlayerId, liquidationValue, sellBlocker } from '../src/games/magnate/engine/index.js';
import { createGameState, BANK_HOUSES, BANK_HOTELS, HOTEL } from '../src/games/magnate/state/gameState.js';
import { BOARD } from '../src/games/magnate/data/board.js';

/* ---------- utilidades ---------- */

function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 2 ** 32;
  };
}
/** rng que devuelve los dados indicados y luego valores pseudoaleatorios. */
const dice = (...faces) => {
  const q = [...faces];
  const fallback = seeded(7);
  return () => (q.length ? (q.shift() - 1) / 6 + 0.01 : fallback());
};

function newGame(n = 3) {
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `J${i + 1}`, colorId: 'violet', tokenId: 'star' }));
  return createGameState({ players, rng: seeded(42) });
}

function act(state, type, playerId, payload, rng) {
  const r = applyAction(state, { type, playerId, payload }, rng);
  assert.ok(r.ok, `${type} falló: ${r.error}`);
  return r.state;
}
const P = (s, id) => s.players.find((p) => p.id === id);

/* ---------- tests ---------- */

test('lanzar, mover, comprar y cobrar alquiler', () => {
  let s = newGame();
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // 3 → Pasaje Ferroviario
  assert.equal(P(s, 'p1').position, 3);
  assert.equal(s.turn.step, 'buy');
  s = act(s, ACTIONS.BUY_PROPERTY, 'p1');
  assert.equal(P(s, 'p1').money, 1440);
  s = act(s, ACTIONS.END_TURN, 'p1');
  s = act(s, ACTIONS.ROLL_DICE, 'p2', {}, dice(2, 1));
  assert.equal(P(s, 'p2').money, 1496);
  assert.equal(P(s, 'p1').money, 1444);
});

test('no se puede actuar fuera de turno', () => {
  const s = newGame();
  const r = applyAction(s, { type: ACTIONS.ROLL_DICE, playerId: 'p2' }, dice(1, 2));
  assert.equal(r.ok, false);
});

test('pasar por la Salida cobra $200', () => {
  let s = newGame();
  s.players[0].position = 38;
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3)); // 38 + 4 = 2 → Arca Vecinal
  assert.equal(P(s, 'p1').position, 2);
  assert.ok(s.log.some((l) => l.text.includes('Salida')));
});

test('dobles dan otra tirada y tres dobles mandan a la cárcel', () => {
  let s = newGame();
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 2)); // 4 → impuesto
  assert.equal(s.turn.step, 'roll');
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(3, 3)); // 10 → visita
  assert.equal(s.turn.step, 'roll');
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1));
  assert.equal(P(s, 'p1').status, 'in-jail');
  assert.equal(P(s, 'p1').position, 10);
  assert.equal(s.turn.step, 'end');
});

test('cárcel: al tercer intento fallido paga $50 y avanza', () => {
  let s = newGame(2);
  s.players[0].status = 'in-jail';
  s.players[0].position = 10;
  for (let i = 0; i < 2; i++) {
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2));
    assert.equal(P(s, 'p1').status, 'in-jail');
    s = act(s, ACTIONS.END_TURN, 'p1');
    s = act(s, ACTIONS.ROLL_DICE, 'p2', {}, dice(1, 3)); // p2 a 4 (impuesto)
    if (s.turn.step === 'buy') s = act(s, ACTIONS.BUY_PROPERTY, 'p2');
    s = act(s, ACTIONS.END_TURN, 'p2');
  }
  const before = P(s, 'p1').money;
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2));
  assert.equal(P(s, 'p1').status, 'active');
  assert.equal(P(s, 'p1').position, 13);
  assert.equal(P(s, 'p1').money, before - 50);
});

test('salir de la cárcel con dobles no da tirada extra', () => {
  let s = newGame(2);
  s.players[0].status = 'in-jail';
  s.players[0].position = 10;
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(4, 4)); // 18 → Paseo del Faro
  assert.equal(P(s, 'p1').status, 'active');
  s = act(s, ACTIONS.DECLINE_PROPERTY, 'p1');
  s = act(s, ACTIONS.PASS_BID, 'p1');
  s = act(s, ACTIONS.PASS_BID, 'p2');
  assert.equal(s.turn.step, 'end');
});

test('rechazar la compra abre una subasta', () => {
  let s = newGame(3);
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 3)); // 5 → Estación Norte
  s = act(s, ACTIONS.DECLINE_PROPERTY, 'p1');
  assert.ok(s.auction);
  assert.equal(getActingPlayerId(s), 'p1');
  s = act(s, ACTIONS.PLACE_BID, 'p1', { amount: 50 });
  s = act(s, ACTIONS.PLACE_BID, 'p2', { amount: 120 });
  s = act(s, ACTIONS.PASS_BID, 'p3');
  s = act(s, ACTIONS.PASS_BID, 'p1');
  assert.equal(s.auction, null);
  assert.equal(s.ownership[5].ownerId, 'p2');
  assert.equal(P(s, 'p2').money, 1380);
});

test('grupo completo: alquiler doble, construcción pareja y hotel', () => {
  let s = newGame(2);
  s.ownership[1] = { ownerId: 'p1', houses: 0, mortgaged: false };
  s.ownership[3] = { ownerId: 'p1', houses: 0, mortgaged: false };
  // construcción pareja
  s = act(s, ACTIONS.BUILD, 'p1', { index: 1 });
  const r = applyAction(s, { type: ACTIONS.BUILD, playerId: 'p1', payload: { index: 1 } });
  assert.equal(r.ok, false);
  s = act(s, ACTIONS.BUILD, 'p1', { index: 3 });
  for (let i = 0; i < 3; i++) {
    s = act(s, ACTIONS.BUILD, 'p1', { index: 1 });
    s = act(s, ACTIONS.BUILD, 'p1', { index: 3 });
  }
  assert.equal(s.bank.houses, BANK_HOUSES - 8);
  s = act(s, ACTIONS.BUILD, 'p1', { index: 3 }); // hotel
  assert.equal(s.ownership[3].houses, HOTEL);
  assert.equal(s.bank.hotels, BANK_HOTELS - 1);
  assert.equal(s.bank.houses, BANK_HOUSES - 4);
  // alquiler con hotel
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3)); // p1 → 4 impuesto
  s = act(s, ACTIONS.END_TURN, 'p1');
  const m = P(s, 'p2').money;
  s = act(s, ACTIONS.ROLL_DICE, 'p2', {}, dice(1, 2)); // → 3 (hotel)
  assert.equal(P(s, 'p2').money, m - 450);
});

test('alquiler doble sin edificar con grupo completo', () => {
  let s = newGame(2);
  s.ownership[37] = { ownerId: 'p2', houses: 0, mortgaged: false };
  s.ownership[39] = { ownerId: 'p2', houses: 0, mortgaged: false };
  s.players[0].position = 35;
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3)); // 39
  assert.equal(P(s, 'p1').money, 1500 - 100);
});

test('hipoteca: sin alquiler y se levanta pagando 110 %', () => {
  let s = newGame(2);
  s.ownership[39] = { ownerId: 'p1', houses: 0, mortgaged: false };
  s = act(s, ACTIONS.MORTGAGE, 'p1', { index: 39 });
  assert.equal(P(s, 'p1').money, 1700);
  s = act(s, ACTIONS.UNMORTGAGE, 'p1', { index: 39 });
  assert.equal(P(s, 'p1').money, 1700 - 220);
});

test('estaciones y servicios', () => {
  let s = newGame(2);
  for (const i of [5, 15, 25]) s.ownership[i] = { ownerId: 'p2', houses: 0, mortgaged: false };
  s.players[0].position = 10;
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 3)); // 15: 3 estaciones → $100
  assert.equal(P(s, 'p1').money, 1400);

  let u = newGame(2);
  u.ownership[12] = { ownerId: 'p2', houses: 0, mortgaged: false };
  u.ownership[28] = { ownerId: 'p2', houses: 0, mortgaged: false };
  u.players[0].position = 10;
  u = act(u, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1)); // 12: 2 servicios → 10 × 2
  assert.equal(P(u, 'p1').money, 1480);
});

test('cartas: avanzar a la estación más cercana paga el doble', () => {
  let s = newGame(2);
  s.ownership[15] = { ownerId: 'p2', houses: 0, mortgaged: false };
  s.players[0].position = 4;
  s.decks.chance = ['c5', ...s.decks.chance.filter((c) => c !== 'c5')];
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // 7 Fortuna → estación 15
  assert.equal(P(s, 'p1').position, 15);
  assert.equal(P(s, 'p1').money, 1500 - 50);
});

test('carta de cumpleaños cobra a cada jugador y las cartas vuelven al mazo', () => {
  let s = newGame(3);
  s.decks.community = ['v9', ...s.decks.community.filter((c) => c !== 'v9')];
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1)); // 2 Arca Vecinal (dobles)
  assert.equal(P(s, 'p1').money, 1520);
  assert.equal(P(s, 'p2').money, 1490);
  assert.equal(s.decks.community.at(-1), 'v9');
});

test('carta de libertad se guarda, se usa y vuelve al mazo', () => {
  let s = newGame(2);
  s.decks.community = ['v5', ...s.decks.community.filter((c) => c !== 'v5')];
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1));
  assert.equal(P(s, 'p1').jailFreeCards.length, 1);
  assert.ok(!s.decks.community.includes('v5'));
  s.players[0].status = 'in-jail';
  s.turn.step = 'roll';
  s = act(s, ACTIONS.USE_JAIL_CARD, 'p1');
  assert.equal(P(s, 'p1').status, 'active');
  assert.ok(s.decks.community.includes('v5'));
});

test('deuda impagable → bancarrota ante otro jugador transfiere los bienes', () => {
  let s = newGame(3);
  s.ownership[39] = { ownerId: 'p2', houses: HOTEL, mortgaged: false };
  s.ownership[37] = { ownerId: 'p2', houses: HOTEL, mortgaged: false };
  s.ownership[1] = { ownerId: 'p1', houses: 0, mortgaged: true };
  s.players[0].position = 35;
  s.players[0].money = 300;
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3)); // 39, alquiler 2000
  assert.equal(s.debts.length, 1);
  assert.equal(getActingPlayerId(s), 'p1');
  assert.equal(applyAction(s, { type: ACTIONS.END_TURN, playerId: 'p1' }).ok, false);
  assert.equal(applyAction(s, { type: ACTIONS.PAY_DEBT, playerId: 'p1' }).ok, false);
  s = act(s, ACTIONS.DECLARE_BANKRUPTCY, 'p1');
  assert.equal(P(s, 'p1').status, 'bankrupt');
  assert.equal(s.ownership[1].ownerId, 'p2');
  assert.equal(P(s, 'p2').money, 1500 + 300 - 3); // menos 10 % de interés de la hipoteca
  assert.equal(s.turn.playerId, 'p2');
});

test('bancarrota ante la banca: las propiedades se subastan y se detecta ganador', () => {
  let s = newGame(2);
  s.ownership[1] = { ownerId: 'p1', houses: 0, mortgaged: false };
  s.players[0].position = 36;
  s.players[0].money = 80;
  s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1)); // 38 impuesto de lujo, dobles
  assert.equal(s.debts.length, 1);
  s = act(s, ACTIONS.MORTGAGE, 'p1', { index: 1 });
  s = act(s, ACTIONS.PAY_DEBT, 'p1');
  assert.equal(P(s, 'p1').money, 10);
  s = act(s, ACTIONS.RESIGN, 'p1');
  assert.equal(s.phase, 'finished');
  assert.equal(s.winnerId, 'p2');
});

test('negociar una propiedad hipotecada cobra el 10 % al receptor', () => {
  let s = newGame(2);
  s.ownership[39] = { ownerId: 'p1', houses: 0, mortgaged: true };
  s = act(s, ACTIONS.PROPOSE_TRADE, 'p1', { toId: 'p2', give: { squares: [39] }, get: { money: 100 } });
  assert.equal(getActingPlayerId(s), 'p2');
  s = act(s, ACTIONS.RESPOND_TRADE, 'p2', { accept: true });
  assert.equal(s.ownership[39].ownerId, 'p2');
  assert.equal(P(s, 'p2').money, 1500 - 100 - 20);
  // levantarla en el mismo turno cuesta sólo el valor de la hipoteca
  s.turn.playerId = 'p2';
  s = act(s, ACTIONS.UNMORTGAGE, 'p2', { index: 39 });
  assert.equal(P(s, 'p2').money, 1380 - 200);
});

test('no se negocia una propiedad con edificios en su grupo', () => {
  const s = newGame(2);
  s.ownership[1] = { ownerId: 'p1', houses: 1, mortgaged: false };
  s.ownership[3] = { ownerId: 'p1', houses: 0, mortgaged: false };
  const r = applyAction(s, { type: ACTIONS.PROPOSE_TRADE, playerId: 'p1', payload: { toId: 'p2', give: { squares: [3] } } });
  assert.equal(r.ok, false);
});

/* ---------- partidas aleatorias completas: invariantes ---------- */

function botAction(s, rng) {
  const id = getActingPlayerId(s);
  const p = s.players.find((x) => x.id === id);
  if (s.debts.length) {
    if (p.money >= s.debts[0].amount) return { type: ACTIONS.PAY_DEBT };
    for (const sq of BOARD) {
      const own = s.ownership[sq.index];
      if (own?.ownerId === id && own.houses && !sellBlocker(s, id, sq.index))
        return { type: ACTIONS.SELL_BUILDING, payload: { index: sq.index } };
    }
    for (const sq of BOARD) {
      const own = s.ownership[sq.index];
      if (own?.ownerId === id && !own.mortgaged) return { type: ACTIONS.MORTGAGE, payload: { index: sq.index } };
    }
    return { type: ACTIONS.DECLARE_BANKRUPTCY };
  }
  if (s.auction) {
    const bid = s.auction.highBid + 10 + Math.floor(rng() * 40);
    return bid <= p.money && rng() < 0.5 ? { type: ACTIONS.PLACE_BID, payload: { amount: bid } } : { type: ACTIONS.PASS_BID };
  }
  if (s.trade) return { type: ACTIONS.RESPOND_TRADE, payload: { accept: rng() < 0.5 } };
  if (s.turn.step === 'buy') return rng() < 0.75 && p.money >= BOARD[s.pendingPurchase].price ? { type: ACTIONS.BUY_PROPERTY } : { type: ACTIONS.DECLINE_PROPERTY };
  if (s.turn.step === 'roll') {
    if (p.status === 'in-jail' && p.money > 200 && rng() < 0.5) return { type: ACTIONS.PAY_JAIL_FINE };
    return { type: ACTIONS.ROLL_DICE };
  }
  // fin de turno: intentar construir o negociar a veces
  const r = rng();
  if (r < 0.3) {
    const idx = Math.floor(rng() * 40);
    return { type: ACTIONS.BUILD, payload: { index: idx } };
  }
  if (r < 0.35) {
    const mine = BOARD.filter((sq) => s.ownership[sq.index]?.ownerId === id).map((sq) => sq.index);
    const other = s.players.find((x) => x.id !== id && x.status !== 'bankrupt');
    if (mine.length && other) return { type: ACTIONS.PROPOSE_TRADE, payload: { toId: other.id, give: { squares: [mine[0]] }, get: { money: 50 } } };
  }
  return { type: ACTIONS.END_TURN };
}

test('80 partidas aleatorias mantienen los invariantes', () => {
  for (let g = 0; g < 80; g++) {
    const rng = seeded(1000 + g);
    const n = 2 + (g % 7);
    let s = createGameState({
      players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, colorId: 'violet', tokenId: 'star' })),
      rng,
    });
    for (let step = 0; step < 3000 && s.phase === 'playing'; step++) {
      const a = botAction(s, rng);
      const r = applyAction(s, { ...a, playerId: getActingPlayerId(s) }, rng);
      if (!r.ok) {
        if (a.type === ACTIONS.BUILD || a.type === ACTIONS.PROPOSE_TRADE) {
          s = applyAction(s, { type: ACTIONS.END_TURN, playerId: getActingPlayerId(s) }, rng).state ?? s;
          continue;
        }
        assert.fail(`Acción del bot rechazada (${a.type}): ${r.error}`);
      }
      s = r.state;
      // invariantes
      for (const p of s.players) assert.ok(p.money >= 0, `dinero negativo: ${p.name} ${p.money}`);
      let houses = 0;
      let hotels = 0;
      for (const own of Object.values(s.ownership)) {
        if (own.houses === HOTEL) hotels++;
        else houses += own.houses;
        assert.notEqual(s.players.find((p) => p.id === own.ownerId).status, 'bankrupt');
      }
      assert.equal(houses + s.bank.houses, BANK_HOUSES);
      assert.equal(hotels + s.bank.hotels, BANK_HOTELS);
      const cards = s.decks.chance.length + s.decks.community.length + s.players.reduce((t, p) => t + p.jailFreeCards.length, 0);
      assert.equal(cards, 32);
      if (s.debts.length) assert.ok(liquidationValue(s, s.debts[0].debtorId) >= 0);
    }
  }
});
