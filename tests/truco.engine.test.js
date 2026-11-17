/**
 * Tests de Truco argentino.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, setup, cardPower, envidoOf, hasFlor, decideHand, getPlayerView, getPendingDeciders, getLegalActions, getResult, buildDeck } from '../src/games/truco/engine/index.js';

function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 2 ** 32;
  };
}
const players = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, colorId: 'violet' }));
const C = (suit, rank) => ({ id: `${suit[0]}${rank}`, suit, rank, joker: false });
const act = (s, type, playerId, payload) => {
  const r = applyAction(s, { type, playerId, payload }, seeded(3));
  assert.ok(r.ok, `${type} (${playerId}): ${r.error}`);
  return r.state;
};
const reject = (s, type, playerId, payload) => {
  const r = applyAction(s, { type, playerId, payload }, seeded(3));
  assert.equal(r.ok, false, `${type} debía rechazarse`);
  return r.error;
};

/** Mesa con cartas fijas. hands[i] = cartas del jugador p<i>; el mano es p0 (dador = último). */
function table(hands, options = {}) {
  const n = hands.length;
  const s = setup({ players: players(n), options, rng: seeded(9) });
  s.dealerIndex = n - 1;
  s.round = 0;
  s.lastRoundKind = 'pica-pica';
  s.queue = [];
  s.players.forEach((p, i) => (p.hand = hands[i]));
  s.queue = [players(n).map((p) => p.id)];
  // reconstruir la mano sin re-repartir
  const ids = players(n).map((p) => p.id);
  s.hand = null;
  s.round = 1;
  s.roundKind = 'redonda';
  s.queue = [ids];
  // usar el arranque real
  const started = startWith(s);
  return started;
}
function startWith(s) {
  const participants = s.queue.shift();
  s.hand = {
    participants,
    duel: false,
    cards: Object.fromEntries(participants.map((id) => [id, [...s.players.find((p) => p.id === id).hand]])),
    played: Object.fromEntries(participants.map((id) => [id, []])),
    tricks: [],
    current: [],
    lead: 0,
    turn: 0,
    truco: { level: 0, holder: null },
    envido: { status: 'open', calls: [], result: null },
    flor: { status: 'open', result: null },
    pending: null,
    suspended: null,
    points: [0, 0],
    over: false,
  };
  s.phase = 'playing';
  return s;
}

describe('Cartas', () => {
  test('40 cartas, sin 8 ni 9', () => {
    const d = buildDeck();
    assert.equal(d.length, 40);
    assert.ok(!d.some((c) => c.rank === 8 || c.rank === 9));
  });

  test('jerarquía oficial de las cartas', () => {
    const order = [C('espadas', 1), C('bastos', 1), C('espadas', 7), C('oros', 7), C('copas', 3), C('copas', 2), C('copas', 1), C('copas', 12), C('copas', 11), C('copas', 10), C('copas', 7), C('copas', 6), C('copas', 5), C('copas', 4)];
    for (let i = 1; i < order.length; i++) assert.ok(cardPower(order[i - 1]) > cardPower(order[i]), `${order[i - 1].id} > ${order[i].id}`);
    assert.equal(cardPower(C('oros', 1)), cardPower(C('copas', 1))); // anchos falsos iguales
    assert.equal(cardPower(C('bastos', 7)), cardPower(C('copas', 7))); // sietes falsos iguales
    assert.equal(cardPower(C('oros', 3)), cardPower(C('espadas', 3)));
  });

  test('cálculo de envido: mismo palo 20 + cartas, figuras valen 0, máximo 33', () => {
    assert.equal(envidoOf([C('oros', 7), C('oros', 6), C('copas', 5)]), 33);
    assert.equal(envidoOf([C('oros', 12), C('oros', 11), C('copas', 5)]), 20);
    assert.equal(envidoOf([C('oros', 12), C('copas', 7), C('bastos', 5)]), 7);
    assert.equal(envidoOf([C('oros', 12), C('copas', 11), C('bastos', 10)]), 0);
    assert.equal(envidoOf([C('oros', 7), C('oros', 6), C('oros', 5)]), 33);
    assert.ok(hasFlor([C('oros', 7), C('oros', 6), C('oros', 5)]));
  });
});

describe('Bazas y pardas', () => {
  test('resolución de la mano con pardas', () => {
    assert.equal(decideHand([0, 0], 1), 0);
    assert.equal(decideHand([0, null], 1), 0); // gana la primera, parda la segunda
    assert.equal(decideHand([0, 1], 1), undefined);
    assert.equal(decideHand([0, 1, null], 1), 0); // parda la tercera: gana quien ganó la primera
    assert.equal(decideHand([0, 1, 1], 0), 1);
    assert.equal(decideHand([null, 1], 0), 1); // parda la primera: define la segunda
    assert.equal(decideHand([null, null, 0], 1), 0);
    assert.equal(decideHand([null, null, null], 1), 1); // todas pardas: gana el mano
  });

  test('una mano completa 1 contra 1 sin cantos vale 1 punto', () => {
    let s = table([[C('espadas', 1), C('bastos', 1), C('oros', 4)], [C('copas', 4), C('copas', 5), C('copas', 6)]]);
    s = act(s, 'PLAY', 'p0', { cardId: 'e1' });
    reject(s, 'PLAY', 'p0', { cardId: 'b1' }); // no es su turno
    s = act(s, 'PLAY', 'p1', { cardId: 'c4' });
    s = act(s, 'PLAY', 'p0', { cardId: 'b1' }); // ganó la baza: abre la siguiente
    s = act(s, 'PLAY', 'p1', { cardId: 'c5' });
    assert.equal(s.phase, 'hand-over');
    assert.deepEqual(s.scores, [1, 0]);
  });

  test('parda en la primera baza: abre de nuevo el mismo y define la segunda', () => {
    let s = table([[C('oros', 3), C('copas', 4), C('oros', 5)], [C('espadas', 3), C('espadas', 1), C('copas', 6)]]);
    s = act(s, 'PLAY', 'p0', { cardId: 'o3' });
    s = act(s, 'PLAY', 'p1', { cardId: 'e3' });
    assert.equal(s.hand.tricks[0].winnerTeam, null);
    assert.equal(s.hand.participants[s.hand.turn], 'p0');
    s = act(s, 'PLAY', 'p0', { cardId: 'c4' });
    s = act(s, 'PLAY', 'p1', { cardId: 'e1' });
    assert.deepEqual(s.scores, [0, 1]);
  });

  test('en equipo, la baza la gana el equipo con la carta más alta; cartas iguales de equipos distintos = parda', () => {
    let s = table([[C('oros', 4), C('oros', 5), C('oros', 6)], [C('copas', 3), C('copas', 5), C('copas', 6)], [C('espadas', 3), C('espadas', 5), C('espadas', 6)], [C('bastos', 2), C('bastos', 5), C('bastos', 6)]]);
    for (const [id, c] of [['p0', 'o4'], ['p1', 'c3'], ['p2', 'e3'], ['p3', 'b2']]) s = act(s, 'PLAY', id, { cardId: c });
    assert.equal(s.hand.tricks[0].winnerTeam, null);
  });
});

describe('Truco', () => {
  const hands = () => [[C('espadas', 1), C('bastos', 1), C('oros', 4)], [C('copas', 4), C('copas', 5), C('copas', 6)]];

  test('truco querido vale 2; no querido, 1', () => {
    let s = table(hands());
    s = act(s, 'TRUCO', 'p0');
    assert.deepEqual(getPendingDeciders(s), ['p1']);
    reject(s, 'PLAY', 'p0', { cardId: 'e1' });
    s = act(s, 'QUIERO', 'p1');
    s = act(s, 'PLAY', 'p0', { cardId: 'e1' });
    s = act(s, 'PLAY', 'p1', { cardId: 'c4' });
    s = act(s, 'PLAY', 'p0', { cardId: 'b1' });
    s = act(s, 'PLAY', 'p1', { cardId: 'c5' });
    assert.deepEqual(s.scores, [2, 0]);

    let t = table(hands());
    t = act(t, 'TRUCO', 'p0');
    t = act(t, 'NO_QUIERO', 'p1');
    assert.deepEqual(t.scores, [1, 0]);
    assert.equal(t.phase, 'hand-over');
  });

  test('retruco 3 / 2 y vale cuatro 4 / 3; sólo sube quien quiso', () => {
    let s = table(hands());
    s = act(s, 'TRUCO', 'p0');
    s = act(s, 'QUIERO', 'p1');
    s = act(s, 'PLAY', 'p0', { cardId: 'o4' });
    reject(s, 'TRUCO', 'p0'); // p0 no tiene el quiero (y no es su turno)
    s = act(s, 'TRUCO', 'p1'); // retruco
    assert.equal(s.hand.pending.level, 2);
    s = act(s, 'TRUCO', 'p0'); // quiero vale cuatro
    assert.equal(s.hand.truco.level, 2);
    s = act(s, 'NO_QUIERO', 'p1');
    assert.deepEqual(s.scores, [3, 0]);

    let r = table(hands());
    r = act(r, 'TRUCO', 'p0');
    r = act(r, 'TRUCO', 'p1'); // quiero retruco
    r = act(r, 'NO_QUIERO', 'p0');
    assert.deepEqual(r.scores, [0, 2]);
  });
});

describe('Envido', () => {
  // p0: 33 (7 y 6 de oros); p1: 27 (7 y... no) → 20+7 de copas
  const hands = () => [[C('oros', 7), C('oros', 6), C('espadas', 4)], [C('copas', 7), C('copas', 12), C('bastos', 4)]];

  test('envido querido 2 al de más tanto; no querido 1', () => {
    let s = table(hands());
    s = act(s, 'ENVIDO', 'p0', { kind: 'envido' });
    s = act(s, 'QUIERO', 'p1');
    assert.deepEqual(s.scores, [2, 0]);
    assert.deepEqual(s.hand.envido.result.best, [33, 27]);
    let r = table(hands());
    r = act(r, 'ENVIDO', 'p0', { kind: 'envido' });
    r = act(r, 'NO_QUIERO', 'p1');
    assert.deepEqual(r.scores, [1, 0]);
  });

  test('cadenas: envido-envido 4, envido-real 5, envido-envido-real 7; no querido = lo anterior', () => {
    const run = (calls, answer) => {
      let s = table(hands());
      calls.forEach((k, i) => (s = act(s, 'ENVIDO', i % 2 ? 'p1' : 'p0', { kind: k })));
      return act(s, answer, calls.length % 2 ? 'p1' : 'p0').scores;
    };
    assert.deepEqual(run(['envido', 'envido'], 'QUIERO'), [4, 0]);
    assert.deepEqual(run(['envido', 'real'], 'QUIERO'), [5, 0]);
    assert.deepEqual(run(['envido', 'envido', 'real'], 'QUIERO'), [7, 0]);
    assert.deepEqual(run(['real'], 'QUIERO'), [3, 0]);
    assert.deepEqual(run(['envido', 'envido'], 'NO_QUIERO'), [0, 2]); // canta p1 el segundo
    assert.deepEqual(run(['envido', 'envido', 'real'], 'NO_QUIERO'), [4, 0]);
    let s = table(hands());
    s = act(s, 'ENVIDO', 'p0', { kind: 'real' });
    reject(s, 'ENVIDO', 'p1', { kind: 'envido' }); // después del real sólo la falta
  });

  test('empate de tantos: gana el mano', () => {
    let s = table([[C('oros', 7), C('copas', 12), C('espadas', 4)], [C('copas', 7), C('oros', 12), C('bastos', 4)]]);
    s = act(s, 'ENVIDO', 'p0', { kind: 'envido' });
    s = act(s, 'QUIERO', 'p1');
    assert.deepEqual(s.scores, [2, 0]);
    let r = table([[C('oros', 7), C('copas', 12), C('espadas', 4)], [C('copas', 7), C('oros', 12), C('bastos', 4)]]);
    r = act(r, 'PLAY', 'p0', { cardId: 'e4' });
    r = act(r, 'ENVIDO', 'p1', { kind: 'envido' });
    r = act(r, 'QUIERO', 'p0');
    assert.deepEqual(r.scores, [2, 0]); // el mano (p0) gana igual
  });

  test('falta envido: en las malas gana el partido; en las buenas lo que le falta al que va ganando', () => {
    let s = table(hands());
    s.scores = [3, 10];
    s = act(s, 'ENVIDO', 'p0', { kind: 'falta' });
    s = act(s, 'QUIERO', 'p1');
    assert.equal(s.phase, 'finished');
    assert.equal(s.winnerTeam, 0);
    let b = table(hands());
    b.scores = [8, 20];
    b = act(b, 'ENVIDO', 'p0', { kind: 'falta' });
    b = act(b, 'QUIERO', 'p1');
    assert.deepEqual(b.scores, [18, 20]); // 30 − 20 = 10
  });

  test('el envido sólo en la primera baza y antes de jugar la carta propia', () => {
    let s = table(hands());
    s = act(s, 'PLAY', 'p0', { cardId: 'e4' });
    reject(s, 'ENVIDO', 'p0', { kind: 'envido' });
    s = act(s, 'PLAY', 'p1', { cardId: 'b4' });
    // primera baza terminada (parda de cuatros): ya no hay envido
    assert.ok(!getLegalActions(s, s.hand.participants[s.hand.turn]).some((a) => a.type === 'ENVIDO'));
  });

  test('"el envido está primero": se responde al truco con envido y después sigue el truco', () => {
    let s = table(hands());
    s = act(s, 'TRUCO', 'p0');
    s = act(s, 'ENVIDO', 'p1', { kind: 'envido' });
    s = act(s, 'QUIERO', 'p0');
    assert.deepEqual(s.scores, [2, 0]);
    assert.equal(s.hand.pending.kind, 'truco');
    assert.deepEqual(getPendingDeciders(s), ['p1']);
    s = act(s, 'NO_QUIERO', 'p1');
    assert.deepEqual(s.scores, [3, 0]);
  });

  test('en equipo el envido lo abren los pies', () => {
    const h = [[C('oros', 7), C('oros', 6), C('espadas', 4)], [C('copas', 7), C('copas', 1), C('bastos', 4)], [C('oros', 4), C('oros', 5), C('espadas', 5)], [C('copas', 5), C('copas', 6), C('bastos', 5)]];
    let s = table(h);
    assert.match(reject(s, 'ENVIDO', 'p0', { kind: 'envido' }), /pies/);
    s = act(s, 'PLAY', 'p0', { cardId: 'e4' });
    s = act(s, 'PLAY', 'p1', { cardId: 'b4' });
    s = act(s, 'ENVIDO', 'p2', { kind: 'envido' }); // p2 es el pie del equipo 0
    // responde cualquiera del otro equipo
    assert.deepEqual(getPendingDeciders(s), ['p1', 'p3']);
    s = act(s, 'QUIERO', 'p3');
    // equipo 0: max(33, 29) ; equipo 1: max(28, 31)
    assert.deepEqual(s.hand.envido.result.best, [33, 31]);
    assert.deepEqual(s.scores, [2, 0]);
  });
});

describe('Mazo, flor y fin de partida', () => {
  test('irse al mazo sin cantos en la primera baza: 2 puntos al rival (truco + envido)', () => {
    let s = table([[C('oros', 4), C('copas', 5), C('espadas', 6)], [C('copas', 4), C('oros', 5), C('bastos', 6)]]);
    s = act(s, 'MAZO', 'p0');
    assert.deepEqual(s.scores, [0, 2]);
    let t = table([[C('oros', 4), C('copas', 5), C('espadas', 6)], [C('copas', 4), C('oros', 5), C('bastos', 6)]]);
    t = act(t, 'TRUCO', 'p0');
    t = act(t, 'QUIERO', 'p1');
    t = act(t, 'PLAY', 'p0', { cardId: 'o4' });
    t = act(t, 'PLAY', 'p1', { cardId: 'c4' });
    t = act(t, 'MAZO', 'p0');
    assert.deepEqual(t.scores, [0, 2]); // truco querido
  });

  test('sin flor por defecto; con flor: 3 si el rival no tiene, contraflor 6', () => {
    const fl = () => [[C('oros', 7), C('oros', 6), C('oros', 5)], [C('copas', 7), C('copas', 6), C('copas', 1)]];
    assert.equal(reject(table(fl()), 'FLOR', 'p0'), 'Se juega sin flor.');
    let s = table([[C('oros', 7), C('oros', 6), C('oros', 5)], [C('copas', 7), C('espadas', 6), C('copas', 1)]], { flor: true });
    s = act(s, 'FLOR', 'p0');
    assert.deepEqual(s.scores, [3, 0]);
    let c = table(fl(), { flor: true });
    c = act(c, 'FLOR', 'p0');
    c = act(c, 'CONTRAFLOR', 'p1');
    c = act(c, 'QUIERO', 'p0');
    assert.deepEqual(c.scores, [6, 0]); // 38 contra 34
    let a = table(fl(), { flor: true });
    a = act(a, 'FLOR', 'p0');
    a = act(a, 'ACHICO', 'p1');
    assert.deepEqual(a.scores, [3, 0]);
  });

  test('gana el primero en llegar a 30 (o 15)', () => {
    let s = table([[C('espadas', 1), C('bastos', 1), C('oros', 4)], [C('copas', 4), C('copas', 5), C('copas', 6)]]);
    s.scores = [29, 0];
    s = act(s, 'PLAY', 'p0', { cardId: 'o4' });
    s = act(s, 'MAZO', 'p1');
    assert.equal(s.phase, 'finished');
    assert.deepEqual(getResult(s).winners, ['p0']);
    let f = table([[C('espadas', 1), C('bastos', 1), C('oros', 4)], [C('copas', 4), C('copas', 5), C('copas', 6)]], { target: 15 });
    f.scores = [13, 0];
    f = act(f, 'TRUCO', 'p0');
    f = act(f, 'NO_QUIERO', 'p1');
    assert.notEqual(f.phase, 'finished');
    assert.deepEqual(f.scores, [14, 0]);
  });

  test('vista privada: no se ven las cartas ajenas no jugadas', () => {
    const s = setup({ players: players(4), rng: seeded(4) });
    const v = getPlayerView(s, 'p1');
    assert.equal(v.hand.myCards.length, 3);
    const json = JSON.stringify(v);
    for (const id of ['p0', 'p2', 'p3']) for (const c of s.hand.cards[id]) assert.ok(!json.includes(`"${c.id}"`), `p1 ve ${c.id}`);
  });

  test('sólo 2, 4 o 6 jugadores', () => {
    assert.throws(() => setup({ players: players(3) }));
    assert.throws(() => setup({ players: players(5) }));
  });

  test('pica-pica con 6: alterna redonda y tres duelos 1 contra 1 entre 5 y 24 puntos', () => {
    let s = setup({ players: players(6), rng: seeded(11) });
    assert.equal(s.roundKind, 'redonda');
    s.scores = [6, 3];
    s.phase = 'hand-over';
    s.queue = [];
    s = act(s, 'NEXT_HAND', 'p0');
    assert.equal(s.roundKind, 'pica-pica');
    assert.equal(s.hand.participants.length, 2);
    assert.notEqual(s.players.find((p) => p.id === s.hand.participants[0]).team, s.players.find((p) => p.id === s.hand.participants[1]).team);
    assert.equal(s.queue.length, 2);
    // falta envido en pica-pica = 6
    const [a, b] = s.hand.participants;
    s = act(s, 'ENVIDO', a, { kind: 'falta' });
    s = act(s, 'NO_QUIERO', b);
    s = act(s, 'MAZO', a);
    s = act(s, 'NEXT_HAND', 'p0');
    assert.equal(s.hand.participants.length, 2);
    assert.equal(s.queue.length, 1);
  });

  test('120 partidas aleatorias (2, 4 y 6) terminan sin errores', () => {
    for (let g = 0; g < 120; g++) {
      const rng = seeded(500 + g);
      const n = [2, 4, 6][g % 3];
      let s = setup({ players: players(n), options: { flor: g % 2 === 0, target: g % 4 === 0 ? 15 : 30 }, rng });
      for (let k = 0; k < 6000 && s.phase !== 'finished'; k++) {
        const id = getPendingDeciders(s)[0];
        const legal = getLegalActions(s, id).filter((a) => a.type !== 'LEAVE');
        const a = legal[Math.floor(rng() * legal.length)];
        let payload;
        if (a.type === 'PLAY') payload = { cardId: a.cardIds[Math.floor(rng() * a.cardIds.length)] };
        if (a.type === 'ENVIDO') payload = { kind: a.kinds[Math.floor(rng() * a.kinds.length)] };
        const r = applyAction(s, { type: a.type, playerId: id, payload }, rng);
        assert.ok(r.ok, `${a.type}: ${r.error}`);
        s = r.state;
      }
      assert.equal(s.phase, 'finished', `partida ${g} sin terminar`);
      assert.ok(Math.max(...s.scores) >= s.options.target);
    }
  });
});
