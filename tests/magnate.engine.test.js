/**
 * Tests del motor de Magnate frente al reglamento Hasbro 00009 (reglas clásicas, sin Speed Die).
 * Las pruebas "00009 …" cubren las diferencias con la edición G0009 que se usaba antes.
 * Los identificadores (A2, B4, …) remiten a docs/reglas/magnate/AUDITORIA.md.
 * Ejecutar: npm test
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction,
  ACTIONS,
  getActingPlayerId,
  getPendingDeciders,
  maxRaisable,
  sellBlocker,
  buildBlocker,
  mortgageBlocker,
  unmortgageBlocker,
  legalPlacements,
  definition,
} from '../src/games/magnate/engine/index.js';
import { createGameState, BANK_HOUSES, BANK_HOTELS, HOTEL } from '../src/games/magnate/state/gameState.js';
import { BOARD, isOwnable } from '../src/games/magnate/data/board.js';
import { CHANCE_CARDS, COMMUNITY_CARDS } from '../src/games/magnate/data/cards.js';

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
const mkPlayers = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `J${i + 1}`, colorId: 'violet', tokenId: 'star' }));
const newGame = (n = 3) => createGameState({ players: mkPlayers(n), rng: seeded(42), startingPlayerId: 'p1' });

function act(state, type, playerId, payload, rng) {
  const r = applyAction(state, { type, playerId, payload }, rng);
  assert.ok(r.ok, `${type} (${playerId}) falló: ${r.error}`);
  return r.state;
}
function reject(state, type, playerId, payload, rng) {
  const r = applyAction(state, { type, playerId, payload }, rng);
  assert.equal(r.ok, false, `${type} (${playerId}) debía rechazarse`);
  return r.error;
}
const P = (s, id) => s.players.find((p) => p.id === id);
const own = (s, index, ownerId, houses = 0, mortgaged = false) => (s.ownership[index] = { ownerId, houses, mortgaged });

/* ================================================================== */

describe('A. Preparación y turno', () => {
  test('A1 cada jugador empieza con $1.500 en la Salida', () => {
    const s = newGame(4);
    assert.ok(s.players.every((p) => p.money === 1500 && p.position === 0));
  });

  test('A2 empieza la tirada más alta; los empatados vuelven a tirar', () => {
    // p1 = 7, p2 = 12, p3 = 12 → desempate: p2 = 2, p3 = 4 → empieza p3
    const s = createGameState({ players: mkPlayers(3), rng: dice(3, 4, 6, 6, 6, 6, 1, 1, 2, 2) });
    assert.equal(s.turn.playerId, 'p3');
    assert.deepEqual(s.players.map((p) => p.id), ['p1', 'p2', 'p3']); // el orden de asientos no cambia
    assert.ok(s.log.some((l) => l.text.startsWith('Desempate')));
  });

  test('A2 el turno sigue hacia la izquierda desde quien empezó', () => {
    let s = createGameState({ players: mkPlayers(3), rng: seeded(1), startingPlayerId: 'p2' });
    s = act(s, ACTIONS.ROLL_DICE, 'p2', {}, dice(1, 2));
    if (s.turn.step === 'buy') s = act(s, ACTIONS.BUY_PROPERTY, 'p2');
    s = act(s, ACTIONS.END_TURN, 'p2');
    assert.equal(s.turn.playerId, 'p3');
  });

  test('A3 dos dados, se avanza la suma; compra y alquiler', () => {
    let s = newGame();
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // 3
    assert.equal(P(s, 'p1').position, 3);
    s = act(s, ACTIONS.BUY_PROPERTY, 'p1');
    assert.equal(P(s, 'p1').money, 1440);
    s = act(s, ACTIONS.END_TURN, 'p1');
    s = act(s, ACTIONS.ROLL_DICE, 'p2', {}, dice(2, 1));
    assert.equal(P(s, 'p2').money, 1496);
    assert.equal(P(s, 'p1').money, 1444);
  });

  test('A4 pasar por la Salida cobra $200', () => {
    let s = newGame();
    s.players[0].position = 38;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3));
    assert.equal(P(s, 'p1').position, 2);
    assert.ok(s.log.some((l) => l.text.includes('pasa por la Salida y cobra $200')));
  });

  test('A5/A6 dobles dan otra tirada; con tres dobles se va a la cárcel sin mover', () => {
    let s = newGame();
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(3, 3)); // 6
    s = act(s, ACTIONS.DECLINE_PROPERTY, 'p1');
    for (const id of ['p1', 'p2', 'p3']) s = act(s, ACTIONS.PASS_BID, id);
    assert.equal(s.turn.step, 'roll');
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 2)); // 10, sólo de visita
    assert.equal(s.turn.step, 'roll');
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1));
    assert.equal(P(s, 'p1').status, 'in-jail');
    assert.equal(P(s, 'p1').position, 10);
    assert.equal(s.turn.step, 'end');
  });

  test('A7 caer en "¡A la cárcel!" con dobles termina el turno', () => {
    let s = newGame();
    s.players[0].position = 26;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 2));
    assert.equal(P(s, 'p1').status, 'in-jail');
    assert.equal(s.turn.step, 'end');
    reject(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2));
  });

  test('A8 en la Plaza Libre no pasa nada', () => {
    let s = newGame();
    s.players[0].position = 15;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 3));
    assert.equal(P(s, 'p1').position, 20);
    assert.equal(P(s, 'p1').money, 1500);
  });

  test('A9 impuestos: el de lujo se paga directo ($100)', () => {
    let t = newGame();
    t.players[0].position = 36;
    t = act(t, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1));
    assert.equal(P(t, 'p1').money, 1400);
  });

  test('00009 A9 Impuesto a la Renta: elegir $200 o el 10 % del patrimonio, antes de calcularlo', () => {
    let s = newGame();
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3)); // casilla 4
    assert.deepEqual(getPendingDeciders(s), ['p1']);
    reject(s, ACTIONS.END_TURN, 'p1');
    reject(s, ACTIONS.PAY_INCOME_TAX, 'p2', { mode: 'flat' });
    reject(s, ACTIONS.PAY_INCOME_TAX, 'p1', { mode: 'otro' });
    const flat = act(s, ACTIONS.PAY_INCOME_TAX, 'p1', { mode: 'flat' });
    assert.equal(P(flat, 'p1').money, 1300);
    assert.equal(flat.turn.step, 'end');
    // 10 %: efectivo 1500 + precio impreso de las propiedades (hipotecadas también) + edificios
    own(s, 1, 'p1', 2); // $60 + 2 casas × $50
    own(s, 3, 'p1', 2); // $60 + 2 casas × $50
    own(s, 39, 'p1', 0, true); // $400 aunque esté hipotecada
    own(s, 37, 'p2', HOTEL);
    const pct = act(s, ACTIONS.PAY_INCOME_TAX, 'p1', { mode: 'percent' });
    // 1500 + 60 + 100 + 60 + 100 + 400 = 2220 → $222
    assert.equal(P(pct, 'p1').money, 1500 - 222);
  });

  test('00009 A9 el 10 % cuenta un hotel como 5 edificios', () => {
    let s = newGame();
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3));
    P(s, 'p1').money = 1000;
    own(s, 39, 'p1', HOTEL); // $400 + 5 × $200
    own(s, 37, 'p1', HOTEL); // $350 + 5 × $200
    s = act(s, ACTIONS.PAY_INCOME_TAX, 'p1', { mode: 'percent' });
    assert.equal(P(s, 'p1').money, 1000 - 375); // (1000 + 400 + 1000 + 350 + 1000) × 10 %
  });

  test('A10 admite de 2 a 8 jugadores', () => {
    assert.throws(() => createGameState({ players: mkPlayers(1) }));
    assert.throws(() => createGameState({ players: mkPlayers(9) }));
    assert.doesNotThrow(() => createGameState({ players: mkPlayers(8) }));
  });

  test('no se puede actuar fuera de turno', () => {
    reject(newGame(), ACTIONS.ROLL_DICE, 'p2', {}, dice(1, 2));
  });
});

/* ================================================================== */

describe('B. Compra y subastas', () => {
  const toAuction = () => {
    let s = newGame(3);
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 3)); // 5: Estación Norte
    return act(s, ACTIONS.DECLINE_PROPERTY, 'p1');
  };

  test('B1/B2 rechazar la compra abre una subasta en la que participan todos', () => {
    const s = toAuction();
    assert.deepEqual(s.auction.participants, ['p1', 'p2', 'p3']);
    assert.deepEqual(getPendingDeciders(s).sort(), ['p1', 'p2', 'p3']);
  });

  test('00009 B3 la puja puede empezar en cualquier monto ($1)', () => {
    const s = toAuction();
    reject(s, ACTIONS.PLACE_BID, 'p2', { amount: 0 });
    const t = act(s, ACTIONS.PLACE_BID, 'p2', { amount: 1 });
    reject(t, ACTIONS.PLACE_BID, 'p3', { amount: 1 }); // hay que superar la mejor puja
    act(t, ACTIONS.PLACE_BID, 'p3', { amount: 2 });
  });

  test('B4 subasta abierta: se puja sin orden y quien no subió puede volver a pujar', () => {
    let s = toAuction();
    s = act(s, ACTIONS.PLACE_BID, 'p3', { amount: 20 }); // p3 puja primero, sin esperar turno
    s = act(s, ACTIONS.PASS_BID, 'p1');
    s = act(s, ACTIONS.PLACE_BID, 'p2', { amount: 21 }); // sube $1
    assert.deepEqual(s.auction.passed, []); // una nueva puja reabre para todos
    s = act(s, ACTIONS.PLACE_BID, 'p1', { amount: 60 }); // p1 vuelve a entrar
    s = act(s, ACTIONS.PASS_BID, 'p2');
    assert.ok(s.auction, 'falta que p3 diga que no sube');
    s = act(s, ACTIONS.PASS_BID, 'p3');
    assert.equal(s.auction, null);
    assert.equal(s.ownership[5].ownerId, 'p1');
    assert.equal(P(s, 'p1').money, 1440);
  });

  test('B4 el mejor postor no puede pujar contra sí mismo ni "pasar"', () => {
    let s = toAuction();
    s = act(s, ACTIONS.PLACE_BID, 'p2', { amount: 30 });
    reject(s, ACTIONS.PLACE_BID, 'p2', { amount: 40 });
    reject(s, ACTIONS.PASS_BID, 'p2');
  });

  test('B5 si nadie puja, la propiedad sigue siendo de la banca', () => {
    let s = toAuction();
    for (const id of ['p1', 'p2', 'p3']) s = act(s, ACTIONS.PASS_BID, id);
    assert.equal(s.ownership[5], undefined);
    assert.equal(s.turn.step, 'end');
  });

  test('B6 sin efectivo no se puede comprar: hay que subastar', () => {
    let s = newGame();
    s.players[0].money = 100;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 3));
    reject(s, ACTIONS.BUY_PROPERTY, 'p1');
    act(s, ACTIONS.DECLINE_PROPERTY, 'p1');
  });

  test('B7 nadie puja más que su efectivo', () => {
    const s = toAuction();
    s.players[1].money = 50;
    reject(s, ACTIONS.PLACE_BID, 'p2', { amount: 51 });
  });

  test('B8 un jugador en la cárcel puede pujar', () => {
    const s = toAuction();
    s.players[2].status = 'in-jail';
    s.players[2].position = 10;
    act(s, ACTIONS.PLACE_BID, 'p3', { amount: 10 });
  });

  test('la subasta bloquea las acciones de turno', () => {
    const s = toAuction();
    reject(s, ACTIONS.END_TURN, 'p1');
  });
});

/* ================================================================== */

describe('C. Alquileres', () => {
  test('C1 grupo completo sin edificar: alquiler doble', () => {
    let s = newGame(2);
    own(s, 37, 'p2');
    own(s, 39, 'p2');
    s.players[0].position = 35;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3));
    assert.equal(P(s, 'p1').money, 1400);
  });

  test('C2 con una calle del grupo hipotecada, las demás cobran el alquiler aumentado', () => {
    let s = newGame(2);
    own(s, 37, 'p2', 0, true);
    own(s, 39, 'p2');
    s.players[0].position = 35;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3)); // 39
    assert.equal(P(s, 'p1').money, 1400);
    let t = newGame(2);
    own(t, 37, 'p2', 0, true);
    own(t, 39, 'p2');
    t.players[0].position = 34;
    t = act(t, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // 37 hipotecada
    assert.equal(P(t, 'p1').money, 1500);
  });

  test('C3 estaciones según cuántas tenga el dueño (las hipotecadas cuentan)', () => {
    let s = newGame(2);
    own(s, 5, 'p2');
    own(s, 15, 'p2');
    own(s, 25, 'p2', 0, true);
    s.players[0].position = 10;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 3));
    assert.equal(P(s, 'p1').money, 1400);
  });

  test('C4 servicios: se tiran los dados de nuevo (4× con uno, 10× con los dos)', () => {
    let s = newGame(2);
    own(s, 12, 'p2');
    s.players[0].position = 10;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1, 3, 4)); // llega con 2; alquiler 4 × 7
    assert.equal(P(s, 'p1').money, 1500 - 28);
    let t = newGame(2);
    own(t, 12, 'p2');
    own(t, 28, 'p2');
    t.players[0].position = 10;
    t = act(t, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1, 6, 5)); // 10 × 11
    assert.equal(P(t, 'p1').money, 1500 - 110);
  });

  test('C5 el dueño cobra aunque esté en la cárcel', () => {
    let s = newGame(2);
    own(s, 3, 'p2');
    s.players[1].status = 'in-jail';
    s.players[1].position = 10;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2));
    assert.equal(P(s, 'p2').money, 1504);
  });

  test('C7 carta: estación más cercana paga el doble', () => {
    let s = newGame(2);
    own(s, 15, 'p2');
    s.players[0].position = 4;
    s.decks.chance = ['c5', ...s.decks.chance.filter((c) => c !== 'c5')];
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // 7 → 15
    assert.equal(P(s, 'p1').position, 15);
    assert.equal(P(s, 'p1').money, 1450);
  });

  test('C7 carta: servicio más cercano, se tiran los dados y se paga 10×', () => {
    let s = newGame(2);
    own(s, 12, 'p2');
    s.players[0].position = 4;
    s.decks.chance = ['c7', ...s.decks.chance.filter((c) => c !== 'c7')];
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2, 2, 3)); // 7 → servicio 12; 10 × 5
    assert.equal(P(s, 'p1').position, 12);
    assert.equal(P(s, 'p1').money, 1450);
  });
});

/* ================================================================== */

describe('D. Construcción', () => {
  const browns = (s, owner = 'p1') => {
    own(s, 1, owner);
    own(s, 3, owner);
  };

  test('D1/D3/D4 grupo completo, construcción pareja, hotel y alquiler con hotel', () => {
    let s = newGame(2);
    browns(s);
    s = act(s, ACTIONS.BUILD, 'p1', { index: 1 });
    reject(s, ACTIONS.BUILD, 'p1', { index: 1 });
    s = act(s, ACTIONS.BUILD, 'p1', { index: 3 });
    for (let i = 0; i < 3; i++) {
      s = act(s, ACTIONS.BUILD, 'p1', { index: 1 });
      s = act(s, ACTIONS.BUILD, 'p1', { index: 3 });
    }
    assert.equal(s.bank.houses, BANK_HOUSES - 8);
    s = act(s, ACTIONS.BUILD, 'p1', { index: 3 });
    assert.equal(s.ownership[3].houses, HOTEL);
    assert.equal(s.bank.hotels, BANK_HOTELS - 1);
    assert.equal(s.bank.houses, BANK_HOUSES - 4);
    reject(s, ACTIONS.BUILD, 'p1', { index: 3 }); // un hotel por calle
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(4, 6)); // cárcel, sólo de visita
    s = act(s, ACTIONS.END_TURN, 'p1');
    const m = P(s, 'p2').money;
    s = act(s, ACTIONS.ROLL_DICE, 'p2', {}, dice(1, 2));
    assert.equal(P(s, 'p2').money, m - 450);
  });

  test('D1 sin grupo completo no se construye', () => {
    const s = newGame(2);
    own(s, 1, 'p1');
    reject(s, ACTIONS.BUILD, 'p1', { index: 1 });
  });

  test('D2 se puede construir fuera del propio turno', () => {
    const s = newGame(2);
    browns(s, 'p2');
    const t = act(s, ACTIONS.BUILD, 'p2', { index: 1 });
    assert.equal(t.ownership[1].houses, 1);
    assert.equal(P(t, 'p2').money, 1450);
  });

  test('D5 no se construye si alguna calle del grupo está hipotecada', () => {
    const s = newGame(2);
    own(s, 1, 'p1');
    own(s, 3, 'p1', 0, true);
    reject(s, ACTIONS.BUILD, 'p1', { index: 1 });
  });

  test('D7 sin casas en la banca no se puede construir', () => {
    const s = newGame(2);
    browns(s);
    s.bank.houses = 0;
    reject(s, ACTIONS.BUILD, 'p1', { index: 1 });
  });

  test('D8 escasez: dos interesados en la última casa → subasta al mejor postor', () => {
    let s = newGame(2);
    browns(s, 'p1');
    own(s, 37, 'p2');
    own(s, 39, 'p2');
    s.bank.houses = 1;
    s = act(s, ACTIONS.BUILD, 'p1', { index: 1 });
    assert.ok(s.buildingClaim);
    assert.deepEqual(getPendingDeciders(s), ['p2']);
    reject(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // bloquea el turno
    s = act(s, ACTIONS.CLAIM_BUILDING, 'p2', { want: true });
    assert.equal(s.auction.kind, 'building');
    reject(s, ACTIONS.PLACE_BID, 'p1', { amount: 0 });
    s = act(s, ACTIONS.PLACE_BID, 'p1', { amount: 10 });
    s = act(s, ACTIONS.PLACE_BID, 'p2', { amount: 15 });
    s = act(s, ACTIONS.PASS_BID, 'p1');
    assert.deepEqual(s.placement, { playerId: 'p2', buildingType: 'house' });
    assert.deepEqual(legalPlacements(s, 'p2', 'house'), [37, 39]);
    reject(s, ACTIONS.MORTGAGE, 'p2', { index: 37 }); // primero debe colocarla
    s = act(s, ACTIONS.PLACE_BUILDING, 'p2', { index: 39 });
    assert.equal(s.ownership[39].houses, 1);
    assert.equal(P(s, 'p2').money, 1485); // paga la puja, no el coste de la ficha
    assert.equal(s.bank.houses, 0);
  });

  test('D8 escasez: si nadie más la quiere, se construye normalmente', () => {
    let s = newGame(2);
    browns(s, 'p1');
    own(s, 37, 'p2');
    own(s, 39, 'p2');
    s.bank.houses = 1;
    s = act(s, ACTIONS.BUILD, 'p1', { index: 1 });
    s = act(s, ACTIONS.CLAIM_BUILDING, 'p2', { want: false });
    assert.equal(s.ownership[1].houses, 1);
    assert.equal(P(s, 'p1').money, 1450);
  });

  test('D10 venta de casas a mitad de precio y de forma pareja', () => {
    let s = newGame(2);
    own(s, 1, 'p1', 2);
    own(s, 3, 'p1', 1);
    s.bank.houses -= 3;
    reject(s, ACTIONS.SELL_BUILDING, 'p1', { index: 3 });
    s = act(s, ACTIONS.SELL_BUILDING, 'p1', { index: 1 });
    assert.equal(P(s, 'p1').money, 1525);
  });

  test('D11 vender un hotel lo cambia por 4 casas; sin 4 casas en la banca no se puede', () => {
    let s = newGame(2);
    own(s, 37, 'p1', HOTEL);
    own(s, 39, 'p1', HOTEL);
    s.bank.hotels -= 2;
    s = act(s, ACTIONS.SELL_BUILDING, 'p1', { index: 39 });
    assert.equal(s.ownership[39].houses, 4);
    assert.equal(P(s, 'p1').money, 1600);
    const t = newGame(2);
    own(t, 37, 'p1', HOTEL);
    own(t, 39, 'p1', HOTEL);
    t.bank.houses = 3;
    reject(t, ACTIONS.SELL_BUILDING, 'p1', { index: 39 });
  });
});

/* ================================================================== */

describe('E. Hipotecas', () => {
  test('E1 hay que vender los edificios del grupo antes de hipotecar', () => {
    const s = newGame(2);
    own(s, 1, 'p1', 1);
    own(s, 3, 'p1');
    assert.ok(mortgageBlocker(s, 'p1', 3));
  });

  test('E2/E3 se cobra la mitad y se levanta pagando el coste impreso en la ficha', () => {
    let s = newGame(2);
    own(s, 39, 'p1');
    s = act(s, ACTIONS.MORTGAGE, 'p1', { index: 39 });
    assert.equal(P(s, 'p1').money, 1700);
    s = act(s, ACTIONS.UNMORTGAGE, 'p1', { index: 39 });
    assert.equal(P(s, 'p1').money, 1480);
  });

  test('E3 costes de levantar la hipoteca de la edición', () => {
    const expected = { 1: 33, 3: 33, 5: 110, 12: 83, 28: 83, 34: 176, 37: 193, 39: 220 };
    for (const [i, v] of Object.entries(expected)) assert.equal(BOARD[i].unmortgage, v, BOARD[i].name);
    for (const sq of BOARD.filter(isOwnable)) assert.equal(sq.mortgage, sq.price / 2);
  });

  test('E4 se puede hipotecar fuera del propio turno', () => {
    const s = newGame(2);
    own(s, 39, 'p2');
    act(s, ACTIONS.MORTGAGE, 'p2', { index: 39 });
  });

  test('00009 E5/H4 quien recibe una hipotecada en un trato paga el 10 % ya, y al levantarla después paga otra vez hipoteca + 10 %', () => {
    let s = newGame(2);
    own(s, 39, 'p1', 0, true);
    s = act(s, ACTIONS.PROPOSE_TRADE, 'p1', { toId: 'p2', give: { squares: [39] }, get: { money: 100 } });
    s = act(s, ACTIONS.RESPOND_TRADE, 'p2', { tradeId: s.trades[0].id, accept: true });
    assert.equal(s.ownership[39].ownerId, 'p2');
    assert.deepEqual(getPendingDeciders(s), ['p2']);
    reject(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // el turno espera la decisión
    s = act(s, ACTIONS.RESOLVE_MORTGAGE_TRANSFER, 'p2', { index: 39, lift: false });
    assert.equal(P(s, 'p2').money, 1400 - 20); // 10 % de la hipoteca de $200
    assert.equal(s.ownership[39].mortgaged, true);
    s = act(s, ACTIONS.UNMORTGAGE, 'p2', { index: 39 });
    assert.equal(P(s, 'p2').money, 1380 - 220); // hipoteca + 10 % otra vez
  });

  test('00009 E5/H4 o la levanta en el acto pagando hipoteca + 10 %', () => {
    let s = newGame(2);
    own(s, 39, 'p1', 0, true);
    s = act(s, ACTIONS.PROPOSE_TRADE, 'p1', { toId: 'p2', give: { squares: [39] }, get: {} });
    s = act(s, ACTIONS.RESPOND_TRADE, 'p2', { tradeId: s.trades[0].id, accept: true });
    reject(s, ACTIONS.RESOLVE_MORTGAGE_TRANSFER, 'p1', { index: 39, lift: true }); // sólo quien la recibió
    s = act(s, ACTIONS.RESOLVE_MORTGAGE_TRANSFER, 'p2', { index: 39, lift: true });
    assert.equal(P(s, 'p2').money, 1500 - 220);
    assert.equal(s.ownership[39].mortgaged, false);
    assert.equal(s.mortgageTransfers.length, 0);
  });

  test('00009 E5 sin efectivo para el 10 % queda una deuda con la banca', () => {
    let s = newGame(2);
    own(s, 39, 'p1', 0, true);
    own(s, 37, 'p2');
    P(s, 'p2').money = 5;
    s = act(s, ACTIONS.PROPOSE_TRADE, 'p1', { toId: 'p2', give: { squares: [39] }, get: {} });
    s = act(s, ACTIONS.RESPOND_TRADE, 'p2', { tradeId: s.trades[0].id, accept: true });
    reject(s, ACTIONS.RESOLVE_MORTGAGE_TRANSFER, 'p2', { index: 39, lift: true });
    s = act(s, ACTIONS.RESOLVE_MORTGAGE_TRANSFER, 'p2', { index: 39, lift: false });
    assert.equal(s.debts[0].amount, 20);
    assert.equal(s.debts[0].creditorId, null);
  });
});

/* ================================================================== */

describe('F. Deudas y bancarrota', () => {
  test('F2 no se puede quebrar si alcanza liquidando', () => {
    let s = newGame(2);
    own(s, 39, 'p2');
    own(s, 37, 'p1');
    s.players[0].position = 35;
    s.players[0].money = 10;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3)); // alquiler 50
    assert.equal(s.debts.length, 1);
    assert.equal(maxRaisable(s, 'p1'), 185);
    reject(s, ACTIONS.DECLARE_BANKRUPTCY, 'p1');
    s = act(s, ACTIONS.MORTGAGE, 'p1', { index: 37 });
    s = act(s, ACTIONS.PAY_DEBT, 'p1');
    assert.equal(P(s, 'p1').money, 135);
  });

  test('F3 negociar durante una deuda para reunir el dinero', () => {
    let s = newGame(3);
    own(s, 39, 'p2', HOTEL);
    own(s, 37, 'p2', HOTEL);
    own(s, 5, 'p1');
    s.bank.hotels -= 2;
    s.players[0].position = 35;
    s.players[0].money = 0;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3)); // debe 2000
    assert.ok(s.debts.length);
    reject(s, ACTIONS.END_TURN, 'p1');
    s = act(s, ACTIONS.PROPOSE_TRADE, 'p1', { toId: 'p3', give: { squares: [5] }, get: { money: 1400 } });
    s = act(s, ACTIONS.RESPOND_TRADE, 'p3', { tradeId: s.trades[0].id, accept: true });
    assert.equal(P(s, 'p1').money, 1400);
    reject(s, ACTIONS.PAY_DEBT, 'p1');
    assert.ok(maxRaisable(s, 'p1') < 2000);
    s = act(s, ACTIONS.DECLARE_BANKRUPTCY, 'p1');
    assert.equal(P(s, 'p2').money, 1500 + 1400);
  });

  test('F3 el endeudado no puede construir ni levantar hipotecas', () => {
    let s = newGame(2);
    own(s, 39, 'p2');
    own(s, 37, 'p1', 0, true);
    s.players[0].position = 35;
    s.players[0].money = 10;
    own(s, 1, 'p1');
    own(s, 3, 'p1');
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3));
    assert.ok(buildBlocker(s, 'p1', 1));
    assert.ok(unmortgageBlocker(s, 'p1', 37));
  });

  test('00009 F4 bancarrota ante un jugador: edificios a la banca por la mitad, propiedades tal como están y 10 % por cada hipotecada', () => {
    let s = newGame(3);
    own(s, 39, 'p2', HOTEL);
    own(s, 37, 'p2', HOTEL);
    s.bank.hotels -= 2;
    own(s, 1, 'p1', 1);
    own(s, 3, 'p1', 1);
    own(s, 5, 'p1', 0, true); // ya hipotecada
    s.bank.houses -= 2;
    s.players[0].jailFreeCards = [{ deck: 'chance', cardId: 'c9' }];
    s.decks.chance = s.decks.chance.filter((c) => c !== 'c9');
    s.players[0].position = 35;
    s.players[0].money = 300;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 3)); // alquiler de hotel: 2000
    assert.equal(getActingPlayerId(s), 'p1');
    s = act(s, ACTIONS.DECLARE_BANKRUPTCY, 'p1');
    // 300 + casas 2 × $25 = 350 en efectivo; no se hipoteca nada al quebrar
    assert.equal(P(s, 'p2').money, 1500 + 350);
    assert.equal(s.ownership[1].mortgaged, false);
    assert.equal(s.ownership[3].mortgaged, false);
    for (const i of [1, 3, 5]) {
      assert.equal(s.ownership[i].ownerId, 'p2');
      assert.equal(s.ownership[i].houses, 0);
    }
    assert.equal(s.bank.houses, BANK_HOUSES);
    assert.equal(P(s, 'p2').jailFreeCards.length, 1);
    // La Estación hipotecada: el acreedor decide en el acto (bloquea el turno hasta resolverlo).
    assert.deepEqual(getPendingDeciders(s), ['p2']);
    reject(s, ACTIONS.ROLL_DICE, 'p2', {}, dice(1, 2));
    s = act(s, ACTIONS.RESOLVE_MORTGAGE_TRANSFER, 'p2', { index: 5, lift: false });
    assert.equal(P(s, 'p2').money, 1850 - 10); // 10 % de $100
    assert.equal(s.ownership[5].mortgaged, true);
    assert.equal(s.turn.playerId, 'p2');
  });

  test('F5 bancarrota ante la banca: propiedades a subasta sin hipoteca y fin de partida', () => {
    let s = newGame(3);
    own(s, 1, 'p1', 0, true);
    s.players[0].position = 36;
    s.players[0].money = 50;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1)); // impuesto de lujo 100
    s = act(s, ACTIONS.DECLARE_BANKRUPTCY, 'p1');
    assert.equal(s.auction.kind, 'property');
    assert.equal(s.auction.index, 1);
    assert.deepEqual(s.auction.participants, ['p2', 'p3']);
    s = act(s, ACTIONS.PLACE_BID, 'p3', { amount: 10 });
    s = act(s, ACTIONS.PASS_BID, 'p2');
    assert.deepEqual(s.ownership[1], { ownerId: 'p3', houses: 0, mortgaged: false });
    assert.equal(s.turn.playerId, 'p2');
    s = act(s, ACTIONS.RESIGN, 'p2');
    assert.equal(s.phase, 'finished');
    assert.equal(s.winnerId, 'p3');
  });

  test('pagos a varios jugadores con deudas simultáneas (presidente del consorcio)', () => {
    let s = newGame(3);
    s.players[0].money = 60;
    s.players[0].position = 4;
    s.decks.chance = ['c15', ...s.decks.chance.filter((c) => c !== 'c15')];
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // Fortuna: paga 50 a cada uno
    assert.equal(P(s, 'p2').money, 1550);
    assert.equal(s.debts.length, 1);
    assert.equal(s.debts[0].creditorId, 'p3');
  });
});

/* ================================================================== */

describe('G. Cárcel', () => {
  const jailed = (s, id = 'p1') => {
    const p = P(s, id);
    p.status = 'in-jail';
    p.position = 10;
  };

  test('G1 entrar por carta', () => {
    let s = newGame(2);
    s.players[0].position = 4;
    s.decks.chance = ['c11', ...s.decks.chance.filter((c) => c !== 'c11')];
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2));
    assert.equal(P(s, 'p1').status, 'in-jail');
    assert.equal(P(s, 'p1').money, 1500); // no cobra la Salida
  });

  test('G2 pagar $50 al empezar el turno y tirar normalmente', () => {
    let s = newGame(2);
    jailed(s);
    s = act(s, ACTIONS.PAY_JAIL_FINE, 'p1');
    assert.equal(P(s, 'p1').money, 1450);
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2));
    assert.equal(P(s, 'p1').position, 13);
  });

  test('00009 G2 la multa se paga antes de tirar sólo en los dos turnos siguientes; en el tercero hay que tirar', () => {
    let s = newGame(2);
    jailed(s);
    P(s, 'p1').jailTurns = 1;
    act(s, ACTIONS.PAY_JAIL_FINE, 'p1');
    P(s, 'p1').jailTurns = 2;
    reject(s, ACTIONS.PAY_JAIL_FINE, 'p1');
    act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // tercer intento: se tira
  });

  test('G3 carta de libertad comprada a otro jugador', () => {
    let s = newGame(2);
    jailed(s);
    s.players[1].jailFreeCards = [{ deck: 'community', cardId: 'v5' }];
    s.decks.community = s.decks.community.filter((c) => c !== 'v5');
    s = act(s, ACTIONS.PROPOSE_TRADE, 'p1', { toId: 'p2', give: { money: 40 }, get: { jailCards: 1 } });
    s = act(s, ACTIONS.RESPOND_TRADE, 'p2', { tradeId: s.trades[0].id, accept: true });
    s = act(s, ACTIONS.USE_JAIL_CARD, 'p1');
    assert.equal(P(s, 'p1').status, 'active');
    assert.equal(s.decks.community.at(-1), 'v5');
  });

  test('G4 salir con dobles mueve con esa tirada y no da tirada extra', () => {
    let s = newGame(2);
    jailed(s);
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(4, 4)); // 18
    assert.equal(P(s, 'p1').status, 'active');
    assert.equal(P(s, 'p1').position, 18);
    s = act(s, ACTIONS.DECLINE_PROPERTY, 'p1');
    s = act(s, ACTIONS.PASS_BID, 'p1');
    s = act(s, ACTIONS.PASS_BID, 'p2');
    assert.equal(s.turn.step, 'end');
  });

  test('G5 al tercer fallo paga $50 y avanza con esa tirada', () => {
    let s = newGame(2);
    jailed(s);
    P(s, 'p1').jailTurns = 2;
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2));
    assert.equal(P(s, 'p1').status, 'active');
    assert.equal(P(s, 'p1').position, 13);
    assert.equal(P(s, 'p1').money, 1450);
  });

  test('G6 estando preso se puede construir, hipotecar y negociar fuera de turno', () => {
    let s = newGame(2);
    jailed(s, 'p2');
    own(s, 1, 'p2');
    own(s, 3, 'p2');
    own(s, 39, 'p2');
    s = act(s, ACTIONS.BUILD, 'p2', { index: 1 });
    s = act(s, ACTIONS.MORTGAGE, 'p2', { index: 39 });
    act(s, ACTIONS.PROPOSE_TRADE, 'p2', { toId: 'p1', give: { money: 10 }, get: {} });
  });

  test('G7 tercer fallo sin efectivo: deuda con la banca', () => {
    let s = newGame(2);
    jailed(s);
    P(s, 'p1').jailTurns = 2;
    P(s, 'p1').money = 20;
    own(s, 39, 'p1');
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2));
    assert.equal(s.debts[0].amount, 50);
    assert.equal(s.debts[0].creditorId, null);
  });
});

/* ================================================================== */

describe('H. Negociaciones', () => {
  test('H1 cualquier jugador negocia en cualquier momento y la oferta no detiene el turno', () => {
    let s = newGame(3);
    own(s, 5, 'p2');
    s = act(s, ACTIONS.PROPOSE_TRADE, 'p3', { toId: 'p2', give: { money: 250 }, get: { squares: [5] } });
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // el turno sigue
    s = act(s, ACTIONS.RESPOND_TRADE, 'p2', { tradeId: s.trades[0].id, accept: true });
    assert.equal(s.ownership[5].ownerId, 'p3');
  });

  test('H1 la oferta se vuelve a validar al aceptarla', () => {
    let s = newGame(3);
    own(s, 5, 'p2');
    s = act(s, ACTIONS.PROPOSE_TRADE, 'p3', { toId: 'p2', give: { money: 1000 }, get: { squares: [5] } });
    s.players[2].money = 100; // p3 gastó el dinero mientras tanto
    reject(s, ACTIONS.RESPOND_TRADE, 'p2', { tradeId: s.trades[0].id, accept: true });
  });

  test('H1 sólo el destinatario responde y sólo el autor retira', () => {
    let s = newGame(3);
    s = act(s, ACTIONS.PROPOSE_TRADE, 'p1', { toId: 'p2', give: { money: 10 } });
    const id = s.trades[0].id;
    reject(s, ACTIONS.RESPOND_TRADE, 'p3', { tradeId: id, accept: true });
    reject(s, ACTIONS.CANCEL_TRADE, 'p2', { tradeId: id });
    s = act(s, ACTIONS.CANCEL_TRADE, 'p1', { tradeId: id });
    assert.equal(s.trades.length, 0);
  });

  test('H3 no se negocia una calle con edificios en su grupo', () => {
    const s = newGame(2);
    own(s, 1, 'p1', 1);
    own(s, 3, 'p1');
    reject(s, ACTIONS.PROPOSE_TRADE, 'p1', { toId: 'p2', give: { squares: [3] } });
  });

  test('H6 la operación es atómica: aceptar retira otras ofertas sobre las mismas propiedades', () => {
    let s = newGame(3);
    own(s, 5, 'p1');
    s = act(s, ACTIONS.PROPOSE_TRADE, 'p1', { toId: 'p2', give: { squares: [5] }, get: { money: 300 } });
    s = act(s, ACTIONS.PROPOSE_TRADE, 'p1', { toId: 'p3', give: { squares: [5] }, get: { money: 350 } });
    s = act(s, ACTIONS.RESPOND_TRADE, 'p3', { tradeId: s.trades[1].id, accept: true });
    assert.equal(s.trades.length, 0);
    assert.equal(P(s, 'p1').money, 1850);
  });
});

/* ================================================================== */

describe('I. Cartas', () => {
  test('I1/I4 los 32 efectos coinciden con la edición de referencia', () => {
    const fx = (cards) => cards.map((c) => JSON.stringify(c.effect)).sort();
    const chance = [
      { kind: 'move-to', index: 39 }, { kind: 'move-to', index: 0 }, { kind: 'move-to', index: 24 },
      { kind: 'move-to', index: 11 }, { kind: 'move-nearest', type: 'station' }, { kind: 'move-nearest', type: 'station' },
      { kind: 'move-nearest', type: 'utility' }, { kind: 'collect', amount: 50 }, { kind: 'jail-free' },
      { kind: 'move-back', steps: 3 }, { kind: 'go-to-jail' }, { kind: 'repairs', house: 25, hotel: 100 },
      { kind: 'pay', amount: 15 }, { kind: 'move-to', index: 5 }, { kind: 'pay-each', amount: 50 },
      { kind: 'collect', amount: 150 },
    ];
    const community = [
      { kind: 'move-to', index: 0 }, { kind: 'collect', amount: 200 }, { kind: 'pay', amount: 50 },
      { kind: 'collect', amount: 50 }, { kind: 'jail-free' }, { kind: 'go-to-jail' },
      { kind: 'collect', amount: 100 }, { kind: 'collect', amount: 20 }, { kind: 'collect-each', amount: 10 },
      { kind: 'collect', amount: 100 }, { kind: 'pay', amount: 100 }, { kind: 'pay', amount: 50 },
      { kind: 'collect', amount: 25 }, { kind: 'repairs', house: 40, hotel: 115 }, { kind: 'collect', amount: 10 },
      { kind: 'collect', amount: 100 },
    ];
    assert.deepEqual(fx(CHANCE_CARDS), chance.map((e) => JSON.stringify(e)).sort());
    assert.deepEqual(fx(COMMUNITY_CARDS), community.map((e) => JSON.stringify(e)).sort());
  });

  test('I2 la carta vuelve al fondo del mazo; cumpleaños cobra a cada jugador', () => {
    let s = newGame(3);
    s.decks.community = ['v9', ...s.decks.community.filter((c) => c !== 'v9')];
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1));
    assert.equal(P(s, 'p1').money, 1520);
    assert.equal(s.decks.community.at(-1), 'v9');
  });

  test('I3 la carta de libertad se conserva fuera del mazo', () => {
    let s = newGame(2);
    s.decks.community = ['v5', ...s.decks.community.filter((c) => c !== 'v5')];
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 1));
    assert.equal(P(s, 'p1').jailFreeCards.length, 1);
    assert.ok(!s.decks.community.includes('v5'));
  });

  test('I5 reparaciones: $25 por casa y $100 por hotel', () => {
    let s = newGame(2);
    own(s, 1, 'p1', 2);
    own(s, 3, 'p1', HOTEL);
    s.players[0].position = 4;
    s.decks.chance = ['c12', ...s.decks.chance.filter((c) => c !== 'c12')];
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2));
    assert.equal(P(s, 'p1').money, 1500 - 150);
  });

  test('I5 retroceder 3 desde Fortuna resuelve la casilla de destino', () => {
    let s = newGame(2);
    s.players[0].position = 4;
    s.decks.chance = ['c10', ...s.decks.chance.filter((c) => c !== 'c10')];
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(1, 2)); // 7 → 4 (impuesto)
    assert.equal(P(s, 'p1').position, 4);
    assert.deepEqual(s.incomeTax, { playerId: 'p1', index: 4 });
    s = act(s, ACTIONS.PAY_INCOME_TAX, 'p1', { mode: 'flat' });
    assert.equal(P(s, 'p1').money, 1300);
  });
});

/* ================================================================== */
/* J. Integridad: partidas completas, acciones ilegales y reconstrucción */
/* ================================================================== */

function chooseAction(s, rng) {
  const deciders = getPendingDeciders(s);
  const id = deciders[Math.floor(rng() * deciders.length)];
  const p = P(s, id);

  if (s.debts.length) {
    const d = s.debts.find((x) => x.debtorId === id);
    if (p.money >= d.amount) return { playerId: id, type: ACTIONS.PAY_DEBT };
    for (const sq of BOARD) if (s.ownership[sq.index]?.ownerId === id && !sellBlocker(s, id, sq.index)) return { playerId: id, type: ACTIONS.SELL_BUILDING, payload: { index: sq.index } };
    for (const sq of BOARD) if (!mortgageBlocker(s, id, sq.index)) return { playerId: id, type: ACTIONS.MORTGAGE, payload: { index: sq.index } };
    return { playerId: id, type: ACTIONS.DECLARE_BANKRUPTCY };
  }
  if (s.incomeTax) return { playerId: id, type: ACTIONS.PAY_INCOME_TAX, payload: { mode: rng() < 0.5 ? 'flat' : 'percent' } };
  if (s.mortgageTransfers?.length) {
    const t = s.mortgageTransfers.find((x) => x.playerId === id);
    return { playerId: id, type: ACTIONS.RESOLVE_MORTGAGE_TRANSFER, payload: { index: t.index, lift: p.money > 600 && rng() < 0.5 } };
  }
  if (s.placement) return { playerId: id, type: ACTIONS.PLACE_BUILDING, payload: { index: legalPlacements(s, id, s.placement.buildingType)[0] } };
  if (s.buildingClaim) return { playerId: id, type: ACTIONS.CLAIM_BUILDING, payload: { want: rng() < 0.5 } };
  if (s.auction) {
    const bid = Math.max(1, s.auction.highBid + 1 + Math.floor(rng() * 30));
    return bid <= p.money && rng() < 0.45 ? { playerId: id, type: ACTIONS.PLACE_BID, payload: { amount: bid } } : { playerId: id, type: ACTIONS.PASS_BID };
  }
  // Acciones libres de cualquier jugador, a veces
  const r = rng();
  const alive = s.players.filter((x) => x.status !== 'bankrupt');
  const any = alive[Math.floor(rng() * alive.length)];
  if (r < 0.15) {
    // construir donde sea legal (acelera las quiebras), o intentarlo en una casilla al azar
    const legal = BOARD.filter((sq) => !buildBlocker(s, any.id, sq.index)).map((sq) => sq.index);
    const index = legal.length && rng() < 0.8 ? legal[0] : Math.floor(rng() * 40);
    return { playerId: any.id, type: ACTIONS.BUILD, payload: { index } };
  }
  if (r < 0.16) return { playerId: any.id, type: ACTIONS.MORTGAGE, payload: { index: Math.floor(rng() * 40) } };
  if (r < 0.17) return { playerId: any.id, type: ACTIONS.UNMORTGAGE, payload: { index: Math.floor(rng() * 40) } };
  if (r < 0.18) return { playerId: any.id, type: ACTIONS.SELL_BUILDING, payload: { index: Math.floor(rng() * 40) } };
  if (r < 0.2) {
    const mine = BOARD.filter((sq) => s.ownership[sq.index]?.ownerId === any.id).map((sq) => sq.index);
    const other = alive.find((x) => x.id !== any.id);
    if (mine.length && other) return { playerId: any.id, type: ACTIONS.PROPOSE_TRADE, payload: { toId: other.id, give: { squares: [mine[0]] }, get: { money: 40 } } };
  }
  if (r < 0.23 && s.trades.length) {
    const t = s.trades[0];
    return { playerId: t.toId, type: ACTIONS.RESPOND_TRADE, payload: { tradeId: t.id, accept: rng() < 0.5 } };
  }
  const cur = P(s, s.turn.playerId);
  if (s.turn.step === 'buy') return { playerId: cur.id, type: rng() < 0.9 && cur.money >= BOARD[s.pendingPurchase].price ? ACTIONS.BUY_PROPERTY : ACTIONS.DECLINE_PROPERTY };
  if (s.turn.step === 'roll') {
    if (cur.status === 'in-jail' && cur.jailTurns < 2 && cur.money > 200 && rng() < 0.5) return { playerId: cur.id, type: ACTIONS.PAY_JAIL_FINE };
    return { playerId: cur.id, type: ACTIONS.ROLL_DICE };
  }
  return { playerId: cur.id, type: ACTIONS.END_TURN };
}

function checkInvariants(s) {
  for (const p of s.players) assert.ok(p.money >= 0, `dinero negativo: ${p.name} ${p.money}`);
  let houses = 0;
  let hotels = 0;
  for (const o of Object.values(s.ownership)) {
    if (o.houses === HOTEL) hotels++;
    else houses += o.houses;
    assert.notEqual(P(s, o.ownerId).status, 'bankrupt', 'un eliminado conserva propiedades');
    if (o.mortgaged) assert.equal(o.houses, 0, 'hipotecada con edificios');
  }
  if (s.placement) s.placement.buildingType === 'hotel' ? hotels++ : houses++;
  assert.equal(houses + s.bank.houses, BANK_HOUSES, 'casas');
  assert.equal(hotels + s.bank.hotels, BANK_HOTELS, 'hoteles');
  const cards = s.decks.chance.length + s.decks.community.length + s.players.reduce((t, p) => t + p.jailFreeCards.length, 0);
  assert.equal(cards, 32, 'cartas');
}

/** rng que graba sus valores para reproducir la partida. */
function recordingRng(seed) {
  const base = seeded(seed);
  const values = [];
  const rng = () => {
    const v = base();
    values.push(v);
    return v;
  };
  return { rng, values };
}
const replayRng = (values) => {
  let i = 0;
  return () => values[i++];
};

describe('J. Integridad', () => {
  test('J1 60 partidas aleatorias completas (2–8 jugadores) terminan y respetan los invariantes', () => {
    let finished = 0;
    for (let g = 0; g < 60; g++) {
      const rng = seeded(1000 + g);
      let s = createGameState({ players: mkPlayers(2 + (g % 7)), rng });
      for (let step = 0; step < 12000 && s.phase === 'playing'; step++) {
        const a = chooseAction(s, rng);
        const r = applyAction(s, a, rng);
        if (r.ok) s = r.state;
        checkInvariants(s);
      }
      if (s.phase === 'finished') finished++;
    }
    assert.ok(finished >= 30, `sólo terminaron ${finished} de 60 partidas`);
    console.log(`  partidas aleatorias terminadas: ${finished}/60`);
  });

  test('00009 J1 20 partidas de 8 jugadores terminan siempre', () => {
    for (let g = 0; g < 20; g++) {
      const rng = seeded(5000 + g);
      let s = createGameState({ players: mkPlayers(8), rng });
      let step = 0;
      for (; step < 30000 && s.phase === 'playing'; step++) {
        const r = applyAction(s, chooseAction(s, rng), rng);
        if (r.ok) s = r.state;
        checkInvariants(s);
      }
      assert.equal(s.phase, 'finished', `la partida ${g} no terminó en ${step} pasos`);
    }
  });

  test('J1 el motor rechaza acciones ilegales enviadas por cualquier jugador sin alterar el estado', () => {
    const rng = seeded(5);
    let s = createGameState({ players: mkPlayers(4), rng });
    const types = Object.values(ACTIONS);
    for (let k = 0; k < 4000 && s.phase === 'playing'; k++) {
      const before = JSON.stringify(s);
      const junk = {
        type: types[Math.floor(rng() * types.length)],
        playerId: s.players[Math.floor(rng() * 4)].id,
        payload: { index: Math.floor(rng() * 45) - 2, amount: Math.floor(rng() * 3000) - 100, toId: 'p2', tradeId: 'x', want: true, give: { money: -5 } },
      };
      const r = applyAction(s, junk, rng);
      if (!r.ok) assert.equal(JSON.stringify(s), before, 'una acción rechazada modificó el estado');
      else {
        s = r.state;
        checkInvariants(s);
      }
      if (k % 3 === 0) {
        const a = applyAction(s, chooseAction(s, rng), rng);
        if (a.ok) s = a.state;
      }
    }
    reject(s, ACTIONS.ROLL_DICE, 'nadie');
  });

  test('J2 reconstrucción: misma configuración + mismas acciones + mismos valores de azar → mismo estado', () => {
    const { rng, values } = recordingRng(77);
    const players = mkPlayers(5);
    const initial = createGameState({ players, rng });
    const startValues = values.length;
    let s = initial;
    const actions = [];
    const pick = seeded(3);
    for (let k = 0; k < 1500 && s.phase === 'playing'; k++) {
      const a = chooseAction(s, pick);
      const r = applyAction(s, a, rng);
      if (r.ok) {
        actions.push(a);
        s = r.state;
      }
    }
    // Reproducir desde cero
    const rr = replayRng(values);
    let t = createGameState({ players, rng: rr });
    assert.equal(values.length >= startValues, true);
    for (const a of actions) {
      const r = applyAction(t, a, rr);
      assert.ok(r.ok, r.error);
      t = r.state;
    }
    assert.deepEqual(t, s);
  });

  test('J2 el estado sobrevive a serializar y continuar la partida', () => {
    let s = newGame(3);
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 3));
    const restored = JSON.parse(JSON.stringify(s));
    const a = applyAction(s, { type: ACTIONS.BUY_PROPERTY, playerId: 'p1' });
    const b = applyAction(restored, { type: ACTIONS.BUY_PROPERTY, playerId: 'p1' });
    assert.deepEqual(a.state, b.state);
  });
});

describe('Reglas de la casa', () => {
  test('skipPurchase desactivada (oficial): no se puede pasar sin comprar ni subastar', () => {
    let s = newGame(2);
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 3));
    reject(s, ACTIONS.SKIP_PROPERTY, 'p1');
  });

  test('00009 skipPurchase viene apagada por defecto (motor y opciones de sala)', () => {
    assert.equal(newGame().options.skipPurchase, false);
    assert.deepEqual(definition.validateOptions({}), { skipPurchase: false });
    assert.deepEqual(definition.validateOptions(undefined), { skipPurchase: false });
  });

  test('skipPurchase activada: se puede pasar y la propiedad sigue en la banca', () => {
    let s = createGameState({ players: mkPlayers(2), rng: seeded(1), startingPlayerId: 'p1', options: { skipPurchase: true } });
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(2, 3)); // Estación Norte
    reject(s, ACTIONS.SKIP_PROPERTY, 'p2');
    s = act(s, ACTIONS.SKIP_PROPERTY, 'p1');
    assert.equal(s.ownership[5], undefined);
    assert.equal(s.auction, null);
    assert.equal(s.turn.step, 'end');
    assert.equal(P(s, 'p1').money, 1500);
  });

  test('skipPurchase con dobles: después de pasar se vuelve a tirar', () => {
    let s = createGameState({ players: mkPlayers(2), rng: seeded(1), startingPlayerId: 'p1', options: { skipPurchase: true } });
    s = act(s, ACTIONS.ROLL_DICE, 'p1', {}, dice(3, 3)); // 6
    s = act(s, ACTIONS.SKIP_PROPERTY, 'p1');
    assert.equal(s.turn.step, 'roll');
  });
});
