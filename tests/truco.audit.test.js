/**
 * Auditoría del Truco argentino (Fase 2): una prueba por regla, escrita según el reglamento elegido
 * (ver docs/reglas/truco/AUDITORIA.md). NO modifica el motor.
 *
 * Configuración auditada: truco argentino tradicional, a 30 puntos, sin flor, 1 contra 1 y 2 contra 2,
 * baraja española de 40 cartas.
 *
 * Convención:
 *  - Las pruebas normales verifican reglas que el motor ya cumple.
 *  - Las marcadas `todo: 'DIFERENCIA …'` describen lo que dice el reglamento y hoy FALLAN: son las
 *    diferencias a corregir en la fase de implementación (node --test las informa sin romper la suite).
 *  - Las marcadas `todo: 'PENDIENTE …'` fijan el comportamiento actual en una regla donde las fuentes
 *    no coinciden o no hay texto verificable: queda a la espera de la decisión.
 * Códigos entre corchetes = filas de la matriz de auditoría.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, setup, cardPower, envidoOf, decideHand, getPlayerView, getLegalActions, buildDeck, validateOptions } from '../src/games/truco/engine/index.js';

function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 2 ** 32;
  };
}
const players = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, colorId: 'violet' }));
const C = (suit, rank) => ({ id: `${suit[0]}${rank}`, suit, rank, joker: false });
const run = (s, type, playerId, payload) => applyAction(s, { type, playerId, payload }, seeded(3));
const act = (s, type, playerId, payload) => {
  const r = run(s, type, playerId, payload);
  assert.ok(r.ok, `${type} (${playerId}): ${r.error}`);
  return r.state;
};
const reject = (s, type, playerId, payload) => {
  const r = run(s, type, playerId, payload);
  assert.equal(r.ok, false, `${type} (${playerId}) debía rechazarse`);
};
const play = (s, id, card) => act(s, 'PLAY', id, { cardId: card.id });

/**
 * Mesa con cartas fijas: hands[i] = cartas de p<i>. El mano es p0 y el dador el último.
 * Equipos: asientos pares = equipo 0, impares = equipo 1. `scores` = tanteador inicial.
 */
function table(hands, { scores = [0, 0], options = {} } = {}) {
  const n = hands.length;
  const s = setup({ players: players(n), options, rng: seeded(9) });
  s.dealerIndex = n - 1;
  s.round = 1;
  s.roundKind = 'redonda';
  s.queue = [];
  s.scores = [...scores];
  s.players.forEach((p, i) => (p.hand = hands[i]));
  const participants = s.players.map((p) => p.id);
  s.hand = {
    participants,
    duel: false,
    cards: Object.fromEntries(participants.map((id, i) => [id, [...hands[i]]])),
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

// Manos de referencia 1 contra 1 (sin flor: nunca tres del mismo palo).
// p0: 33 de envido (7 y 6 de copas) — p1: 27 (7 y... ) etc.
const H33 = [C('copas', 7), C('copas', 6), C('bastos', 4)]; // envido 33
const H27 = [C('oros', 4), C('oros', 3), C('espadas', 12)]; // envido 27
const H25 = [C('espadas', 5), C('bastos', 12), C('espadas', 10)]; // envido 25

/* ================================================================== */

describe('[C] Cartas y jerarquía', () => {
  test('[C1] baraja española de 40 cartas: 1 a 7 y 10 a 12 de cada palo, sin 8, 9 ni comodines', () => {
    const d = buildDeck();
    assert.equal(d.length, 40);
    for (const suit of ['oros', 'copas', 'espadas', 'bastos'])
      assert.deepEqual(d.filter((c) => c.suit === suit).map((c) => c.rank).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]);
    assert.ok(!d.some((c) => c.joker));
  });

  test('[C2] jerarquía: 1E > 1B > 7E > 7O > 3 > 2 > 1 falsos > 12 > 11 > 10 > 7 falsos > 6 > 5 > 4', () => {
    const order = [[C('espadas', 1)], [C('bastos', 1)], [C('espadas', 7)], [C('oros', 7)], [C('oros', 3), C('copas', 3), C('espadas', 3), C('bastos', 3)], [C('oros', 2), C('bastos', 2)], [C('copas', 1), C('oros', 1)], [C('oros', 12)], [C('copas', 11)], [C('bastos', 10)], [C('copas', 7), C('bastos', 7)], [C('espadas', 6)], [C('oros', 5)], [C('bastos', 4)]];
    for (let i = 0; i < order.length; i++) {
      for (const c of order[i]) assert.equal(cardPower(c), cardPower(order[i][0]), `${c.id} empata con ${order[i][0].id}`);
      if (i) assert.ok(cardPower(order[i - 1][0]) > cardPower(order[i][0]), `${order[i - 1][0].id} > ${order[i][0].id}`);
    }
  });
});

describe('[R] Reparto, mano y pie', () => {
  test('[R1] tres cartas a cada uno; es mano el de la derecha del que da (el siguiente en el orden)', () => {
    for (const n of [2, 4]) {
      const s = setup({ players: players(n), rng: seeded(5) });
      for (const p of s.players) assert.equal(p.hand.length, 3);
      assert.equal(s.hand.participants[0], s.players[(s.dealerIndex + 1) % n].id);
      assert.equal(s.hand.participants.length, n);
    }
  });

  test('[R2] la mano siguiente da el que fue mano (el turno de dar pasa a la derecha)', () => {
    let s = setup({ players: players(4), rng: seeded(5) });
    const firstMano = s.hand.participants[0];
    s = act(s, 'MAZO', s.hand.participants[0]);
    s = act(s, 'NEXT_HAND', 'p0');
    assert.equal(s.players[s.dealerIndex].id, firstMano);
  });

  test('[R3] en 2 contra 2 los compañeros se sientan alternados y el pie es el último de cada equipo', () => {
    const s = setup({ players: players(4), rng: seeded(2) });
    const order = s.hand.participants.map((id) => s.players.find((p) => p.id === id).team);
    assert.deepEqual([order[0] !== order[1], order[1] !== order[2], order[2] !== order[3]], [true, true, true]);
  });
});

describe('[O] Orden de turnos', () => {
  test('[O1] la primera baza la abre el mano y se sigue en orden; la siguiente la abre quien ganó', () => {
    let s = table([[C('copas', 4), C('copas', 5), C('copas', 6)], [C('espadas', 1), C('oros', 4), C('oros', 5)], [C('bastos', 4), C('bastos', 5), C('bastos', 6)], [C('oros', 6), C('espadas', 4), C('espadas', 5)]]);
    reject(s, 'PLAY', 'p1', { cardId: 'e1' });
    s = play(s, 'p0', C('copas', 4));
    reject(s, 'PLAY', 'p2', { cardId: 'b4' });
    s = play(s, 'p1', C('espadas', 1));
    s = play(s, 'p2', C('bastos', 4));
    s = play(s, 'p3', C('oros', 6));
    assert.equal(getPlayerView(s, 'p1').hand.turnId, 'p1'); // ganó p1: abre la segunda
  });
});

describe('[P] Bazas y pardas', () => {
  const A = 0;
  const B = 1;
  test('[P1] gana quien gana dos bazas', () => {
    assert.equal(decideHand([A, A], B), A);
    assert.equal(decideHand([A, B, B], A), B);
  });
  test('[P2] gana la primera y empata la segunda: gana el de la primera', () => assert.equal(decideHand([A, null], B), A));
  test('[P3] gana la primera, pierde la segunda y empata la tercera: gana el de la primera', () => assert.equal(decideHand([A, B, null], B), A));
  test('[P4] parda la primera: define la segunda', () => assert.equal(decideHand([null, B], A), B));
  test('[P5] pardas la primera y la segunda: define la tercera', () => assert.equal(decideHand([null, null, B], A), B));
  test('[P6] tres pardas: gana el equipo mano', () => assert.equal(decideHand([null, null, null], B), B));

  test('[P7] parda en la primera baza: la segunda la abre el mano', () => {
    let s = table([[C('copas', 3), C('oros', 4), C('copas', 5)], [C('oros', 3), C('bastos', 5), C('espadas', 4)]]);
    s = play(s, 'p0', C('copas', 3));
    s = play(s, 'p1', C('oros', 3));
    assert.equal(s.hand.tricks[0].winnerTeam, null);
    assert.equal(getPlayerView(s, 'p0').hand.turnId, 'p0');
  });

  test('[P8] en 2 contra 2, dos cartas iguales del mismo equipo no hacen parda', () => {
    let s = table([[C('copas', 3), C('oros', 4), C('copas', 5)], [C('oros', 2), C('bastos', 5), C('espadas', 4)], [C('oros', 3), C('bastos', 6), C('copas', 6)], [C('bastos', 2), C('copas', 4), C('oros', 5)]]);
    s = play(s, 'p0', C('copas', 3));
    s = play(s, 'p1', C('oros', 2));
    s = play(s, 'p2', C('oros', 3));
    s = play(s, 'p3', C('bastos', 2));
    assert.equal(s.hand.tricks[0].winnerTeam, 0);
  });

  test('[P9] mano completa sin cantos: 1 punto', () => {
    let s = table([[C('espadas', 1), C('bastos', 1), C('copas', 5)], [C('oros', 4), C('bastos', 5), C('espadas', 4)]]);
    s = act(s, 'PLAY', 'p0', { cardId: 'e1' });
    s = act(s, 'PLAY', 'p1', { cardId: 'o4' });
    s = act(s, 'PLAY', 'p0', { cardId: 'b1' });
    s = act(s, 'PLAY', 'p1', { cardId: 'b5' });
    assert.deepEqual(s.scores, [1, 0]);
  });
});

describe('[E] Envido', () => {
  test('[E1] tanto: 20 + dos cartas del mismo palo; figuras 0; sin palo repetido, la carta más alta; máximo 33', () => {
    assert.equal(envidoOf(H33), 33);
    assert.equal(envidoOf(H27), 27);
    assert.equal(envidoOf([C('copas', 12), C('copas', 11), C('oros', 5)]), 20);
    assert.equal(envidoOf([C('copas', 7), C('oros', 5), C('bastos', 12)]), 7);
    assert.equal(envidoOf([C('copas', 12), C('oros', 11), C('bastos', 10)]), 0);
  });

  test('[E2] sólo en la primera baza y antes de jugar la carta propia; el pie lo puede cantar después de que jugó el mano', () => {
    let s = table([H33, H27]);
    s = play(s, 'p0', H33[2]);
    reject(s, 'ENVIDO', 'p0', { kind: 'envido' }); // ya jugó
    s = act(s, 'ENVIDO', 'p1', { kind: 'envido' }); // el pie todavía no jugó
    s = act(s, 'NO_QUIERO', 'p0');
    let t = table([H33, H27]);
    t = play(t, 'p0', H33[2]);
    t = play(t, 'p1', H27[2]);
    reject(t, 'ENVIDO', 'p0', { kind: 'envido' }); // ya pasó la primera baza
  });

  const chain = (calls, accept) => {
    let s = table([H33, H27]);
    let who = 'p0';
    for (const k of calls) {
      s = act(s, 'ENVIDO', who, { kind: k });
      who = who === 'p0' ? 'p1' : 'p0';
    }
    s = act(s, accept ? 'QUIERO' : 'NO_QUIERO', who);
    return s;
  };

  test('[E3] querido: E 2 · E-E 4 · R 3 · E-R 5 · E-E-R 7 (gana p0 con 33)', () => {
    for (const [calls, pts] of [[['envido'], 2], [['envido', 'envido'], 4], [['real'], 3], [['envido', 'real'], 5], [['envido', 'envido', 'real'], 7]])
      assert.deepEqual(chain(calls, true).scores, [pts, 0], calls.join('-'));
  });

  test('[E4] no querido: E 1 · E-E 2 · R 1 · E-R 2 · E-E-R 4 · F 1 · E-F 2 · R-F 3 · E-E-F 4 · E-R-F 5 · E-E-R-F 7', () => {
    const cases = [[['envido'], 1], [['envido', 'envido'], 2], [['real'], 1], [['envido', 'real'], 2], [['envido', 'envido', 'real'], 4], [['falta'], 1], [['envido', 'falta'], 2], [['real', 'falta'], 3], [['envido', 'envido', 'falta'], 4], [['envido', 'real', 'falta'], 5], [['envido', 'envido', 'real', 'falta'], 7]];
    for (const [calls, pts] of cases) {
      const s = chain(calls, false);
      const caller = calls.length % 2 === 1 ? 0 : 1; // el último en cantar
      const exp = [0, 0];
      exp[caller] = pts;
      assert.deepEqual(s.scores, exp, calls.join('-'));
    }
  });

  test('[E5] falta envido: los dos en las malas → gana el partido', () => {
    let s = table([H33, H27], { scores: [10, 14] });
    s = act(s, 'ENVIDO', 'p0', { kind: 'falta' });
    s = act(s, 'QUIERO', 'p1');
    assert.equal(s.scores[0], 30);
    assert.equal(s.phase, 'finished');
  });

  test('[E6] falta envido: alguien en las buenas → lo que le falta al que va ganando', () => {
    let s = table([H33, H27], { scores: [10, 22] });
    s = act(s, 'ENVIDO', 'p0', { kind: 'falta' });
    s = act(s, 'QUIERO', 'p1');
    assert.deepEqual(s.scores, [18, 22]); // 30 − 22 = 8
    let t = table([H27, H33], { scores: [16, 18] });
    t = act(t, 'ENVIDO', 'p0', { kind: 'falta' });
    t = act(t, 'QUIERO', 'p1');
    assert.deepEqual(t.scores, [16, 30]); // gana el puntero: 30 − 18 = 12 → partido
  });

  test('[E7] empate de tantos 1 contra 1: gana el mano', () => {
    let s = table([[C('copas', 7), C('copas', 6), C('bastos', 4)], [C('oros', 7), C('oros', 6), C('espadas', 4)]]);
    s = act(s, 'ENVIDO', 'p0', { kind: 'envido' });
    s = act(s, 'QUIERO', 'p1');
    assert.deepEqual(s.scores, [2, 0]);
  });

  test('[E8] empate en 2 contra 2 entre el 2.º y el 3.º en el orden: gana el que está más cerca del mano', { todo: 'PENDIENTE: el reglamento de juegosdesalon/CASI lo dice así; el motor da el empate al equipo mano. Falta el texto ASART.' }, () => {
    // p1 (equipo B, 2.º) y p2 (equipo A, 3.º) tienen 30; p0 y p3 menos.
    let s = table([[C('copas', 12), C('oros', 4), C('bastos', 5)], [C('copas', 6), C('copas', 4), C('oros', 11)], [C('oros', 7), C('oros', 3), C('copas', 11)], [C('bastos', 12), C('espadas', 2), C('copas', 2)]]);
    s = act(s, 'ENVIDO', 'p0', { kind: 'envido' }); // en este caso el mano no es pie: ver [E9]
    s = act(s, 'QUIERO', 'p1');
    assert.deepEqual(s.scores, [0, 2]);
  });

  test('[E9] 2 contra 2: cualquier jugador puede cantar envido en su turno antes de jugar su primera carta', { todo: 'PENDIENTE: el motor sólo deja abrirlo a los pies (costumbre de mesa). juegosdesalon/CASI permite a cualquiera; falta el texto ASART.' }, () => {
    const s = table([[C('copas', 12), C('oros', 4), C('bastos', 5)], [C('copas', 6), C('copas', 4), C('oros', 11)], [C('oros', 7), C('oros', 3), C('copas', 11)], [C('bastos', 12), C('espadas', 2), C('copas', 2)]]);
    act(s, 'ENVIDO', 'p0', { kind: 'envido' });
  });

  test('[E10] responder el envido: cualquiera del equipo rival, con quiero, no quiero o subiendo', () => {
    let s = table([H33, H27, H25, [C('bastos', 2), C('copas', 2), C('oros', 2)]]);
    s = play(s, 'p0', H33[2]);
    s = play(s, 'p1', H27[2]);
    s = act(s, 'ENVIDO', 'p2', { kind: 'envido' }); // pie del equipo A
    reject(s, 'QUIERO', 'p0'); // no responde el propio equipo
    s = act(s, 'ENVIDO', 'p1', { kind: 'real' }); // responde y sube un jugador del otro equipo que ya jugó
    s = act(s, 'QUIERO', 'p0');
    assert.equal(s.hand.envido.status, 'done');
  });

  test('[E11] "el envido está primero": ante un truco en la primera baza se puede responder envido; después sigue el truco', () => {
    let s = table([H33, H27]);
    s = act(s, 'TRUCO', 'p0');
    s = act(s, 'ENVIDO', 'p1', { kind: 'envido' });
    s = act(s, 'QUIERO', 'p0');
    assert.deepEqual(s.scores, [2, 0]);
    assert.equal(s.hand.pending.kind, 'truco');
    reject(s, 'PLAY', 'p0', { cardId: H33[0].id });
    s = act(s, 'QUIERO', 'p1');
    assert.equal(s.hand.truco.level, 1);
  });

  test('[E12] con el truco ya querido, o ante un retruco, ya no se canta envido', () => {
    let s = table([H33, H27]);
    s = act(s, 'TRUCO', 'p0');
    s = act(s, 'QUIERO', 'p1');
    reject(s, 'ENVIDO', 'p0', { kind: 'envido' });
    let t = table([H33, H27]);
    t = act(t, 'TRUCO', 'p0');
    t = act(t, 'TRUCO', 'p1'); // quiero retruco
    reject(t, 'ENVIDO', 'p0', { kind: 'envido' });
  });

  test('[E13] envido-envido-envido', { todo: 'PENDIENTE: el motor no lo admite; algunas guías lo admiten (6 querido / 4 no querido) y otras no. Falta el texto ASART.' }, () => {
    let s = table([H33, H27]);
    s = act(s, 'ENVIDO', 'p0', { kind: 'envido' });
    s = act(s, 'ENVIDO', 'p1', { kind: 'envido' });
    act(s, 'ENVIDO', 'p0', { kind: 'envido' });
  });

  test('[E14] después de la falta envido no se puede subir más', () => {
    let s = table([H33, H27]);
    s = act(s, 'ENVIDO', 'p0', { kind: 'falta' });
    reject(s, 'ENVIDO', 'p1', { kind: 'envido' });
    reject(s, 'ENVIDO', 'p1', { kind: 'real' });
    reject(s, 'ENVIDO', 'p1', { kind: 'falta' });
  });

  test('[E15] el real envido no se contesta con envido (no se puede bajar)', () => {
    let s = table([H33, H27]);
    s = act(s, 'ENVIDO', 'p0', { kind: 'real' });
    reject(s, 'ENVIDO', 'p1', { kind: 'envido' });
  });

  test('[E16] el equipo que pierde el envido puede decir "son buenas" sin mostrar su tanto', { todo: 'DIFERENCIA: el motor publica el mejor tanto de los dos equipos; el reglamento sólo obliga a mostrar al ganador.' }, () => {
    let s = table([H33, H27]);
    s = act(s, 'ENVIDO', 'p0', { kind: 'envido' });
    s = act(s, 'QUIERO', 'p1');
    const v = getPlayerView(s, 'p0');
    assert.equal(v.hand.envido.result.best?.[1], undefined, 'el rival ve el tanto del perdedor');
  });
});

describe('[T] Truco, retruco y vale cuatro', () => {
  const hands = () => table([[C('espadas', 1), C('bastos', 1), C('copas', 5)], [C('oros', 4), C('bastos', 5), C('espadas', 4)]]);
  const winHand = (s) => {
    for (const [a, b] of [['e1', 'o4'], ['b1', 'b5']]) {
      s = act(s, 'PLAY', 'p0', { cardId: a });
      s = act(s, 'PLAY', 'p1', { cardId: b });
    }
    return s;
  };

  test('[T1] truco querido 2 · retruco 3 · vale cuatro 4', () => {
    let s = act(hands(), 'TRUCO', 'p0');
    s = act(s, 'QUIERO', 'p1');
    assert.deepEqual(winHand(s).scores, [2, 0]);
    let t = act(hands(), 'TRUCO', 'p0');
    t = act(t, 'TRUCO', 'p1');
    t = act(t, 'QUIERO', 'p0');
    assert.deepEqual(winHand(t).scores, [3, 0]);
    let u = act(hands(), 'TRUCO', 'p0');
    u = act(u, 'TRUCO', 'p1');
    u = act(u, 'TRUCO', 'p0');
    u = act(u, 'QUIERO', 'p1');
    assert.deepEqual(winHand(u).scores, [4, 0]);
  });

  test('[T2] rechazos: truco no querido 1 · retruco 2 · vale cuatro 3, y la mano termina', () => {
    let s = act(hands(), 'TRUCO', 'p0');
    s = act(s, 'NO_QUIERO', 'p1');
    assert.deepEqual(s.scores, [1, 0]);
    assert.equal(s.phase, 'hand-over');
    let t = act(hands(), 'TRUCO', 'p0');
    t = act(t, 'TRUCO', 'p1');
    t = act(t, 'NO_QUIERO', 'p0');
    assert.deepEqual(t.scores, [0, 2]);
    let u = act(hands(), 'TRUCO', 'p0');
    u = act(u, 'TRUCO', 'p1');
    u = act(u, 'TRUCO', 'p0');
    u = act(u, 'NO_QUIERO', 'p1');
    assert.deepEqual(u.scores, [3, 0]);
  });

  test('[T3] sólo sube el equipo que quiso; quien cantó no puede subir su propio canto', () => {
    let s = act(hands(), 'TRUCO', 'p0');
    reject(s, 'TRUCO', 'p0');
    s = act(s, 'QUIERO', 'p1');
    reject(s, 'TRUCO', 'p0'); // el quiero lo tiene p1
    s = act(s, 'PLAY', 'p0', { cardId: 'e1' });
    s = act(s, 'TRUCO', 'p1'); // retruco en su turno
    s = act(s, 'QUIERO', 'p0');
    assert.equal(s.hand.truco.level, 2);
  });

  test('[T4] responder subiendo implica querer el canto anterior', () => {
    let s = act(hands(), 'TRUCO', 'p0');
    s = act(s, 'TRUCO', 'p1');
    assert.equal(s.hand.truco.level, 1);
    assert.equal(s.hand.pending.level, 2);
  });

  test('[T5] no hay nada después del vale cuatro', () => {
    let s = act(hands(), 'TRUCO', 'p0');
    s = act(s, 'TRUCO', 'p1');
    s = act(s, 'TRUCO', 'p0');
    reject(s, 'TRUCO', 'p1');
  });

  test('[T6] con un canto sin responder no se juegan cartas', () => {
    const s = act(hands(), 'TRUCO', 'p0');
    reject(s, 'PLAY', 'p0', { cardId: 'e1' });
    reject(s, 'PLAY', 'p1', { cardId: 'o4' });
  });

  test('[T7] en 2 contra 2 responde cualquiera del equipo rival y su respuesta vale por el equipo', () => {
    let s = table([[C('espadas', 1), C('bastos', 1), C('copas', 5)], [C('oros', 4), C('bastos', 5), C('espadas', 4)], [C('copas', 4), C('copas', 6), C('oros', 6)], [C('bastos', 4), C('bastos', 6), C('oros', 5)]]);
    s = act(s, 'TRUCO', 'p0');
    reject(s, 'QUIERO', 'p2');
    s = act(s, 'QUIERO', 'p3');
    assert.equal(s.hand.truco.holder, 1);
  });
});

describe('[M] Irse al mazo', () => {
  const hands = () => table([[C('espadas', 1), C('bastos', 1), C('copas', 5)], [C('oros', 4), C('copas', 6), C('espadas', 4)]]);

  test('[M1] antes de jugar su primera carta y sin cantos: 2 al rival (1 del truco + 1 del envido que resigna)', () => {
    const s = act(hands(), 'MAZO', 'p0');
    assert.deepEqual(s.scores, [0, 2]);
  });

  test('[M2] después de la primera baza y sin truco: 1', () => {
    let s = hands();
    s = act(s, 'PLAY', 'p0', { cardId: 'c5' });
    s = act(s, 'PLAY', 'p1', { cardId: 'c6' }); // gana p1
    s = act(s, 'MAZO', 'p1');
    assert.deepEqual(s.scores, [1, 0]);
  });

  test('[M3] con truco querido: el valor del truco', () => {
    let s = hands();
    s = act(s, 'PLAY', 'p0', { cardId: 'c5' });
    s = act(s, 'PLAY', 'p1', { cardId: 'c6' });
    s = act(s, 'TRUCO', 'p1');
    s = act(s, 'TRUCO', 'p0'); // quiero retruco
    s = act(s, 'QUIERO', 'p1');
    s = act(s, 'MAZO', 'p1');
    assert.deepEqual(s.scores, [3, 0]);
  });

  test('[M4] con truco sin responder: como si no lo quisiera', () => {
    let s = hands();
    s = act(s, 'PLAY', 'p0', { cardId: 'c5' });
    s = act(s, 'PLAY', 'p1', { cardId: 'c6' });
    s = act(s, 'TRUCO', 'p1');
    s = act(s, 'MAZO', 'p0');
    assert.deepEqual(s.scores, [0, 1]);
  });

  test('[M5] con el envido ya jugado, irse en la primera baza no suma el punto del envido', () => {
    let s = hands();
    s = act(s, 'ENVIDO', 'p0', { kind: 'envido' });
    s = act(s, 'NO_QUIERO', 'p1');
    s = act(s, 'MAZO', 'p0');
    assert.deepEqual(s.scores, [1, 1]);
  });

  test('[M6] con el truco ya querido en la primera baza (el envido ya no se puede cantar) suma sólo el truco', { todo: 'DIFERENCIA: el motor suma además 1 por el envido aunque ya no se podía cantar (da 3 en vez de 2).' }, () => {
    let s = hands();
    s = act(s, 'TRUCO', 'p0');
    s = act(s, 'QUIERO', 'p1');
    s = act(s, 'MAZO', 'p0');
    assert.deepEqual(s.scores, [0, 2]);
  });

  test('[M7] en 2 contra 2, si se va uno solo, el compañero sigue jugando', { todo: 'PENDIENTE: el motor retira a todo el equipo (decisión de Fase 0 sin aprobar). juegosdesalon/CASI: el compañero sigue; los puntos se dan cuando se va todo el equipo.' }, () => {
    let s = table([[C('espadas', 1), C('bastos', 1), C('copas', 5)], [C('oros', 4), C('bastos', 5), C('espadas', 4)], [C('copas', 4), C('copas', 6), C('oros', 6)], [C('bastos', 4), C('bastos', 6), C('oros', 5)]]);
    s = act(s, 'PLAY', 'p0', { cardId: 'c5' });
    s = act(s, 'MAZO', 'p1');
    assert.equal(s.phase, 'playing');
  });

  test('[M8] sólo en el turno propio o al tener que responder un canto', () => {
    const s = hands();
    reject(s, 'MAZO', 'p1');
    const t = act(s, 'TRUCO', 'p0');
    reject(t, 'MAZO', 'p0');
    act(t, 'MAZO', 'p1');
  });
});

describe('[V] Puntuación y victoria', () => {
  test('[V1] por defecto: a 30 puntos y sin flor', () => {
    assert.deepEqual({ target: validateOptions({}).target, flor: validateOptions({}).flor }, { target: 30, flor: false });
    const s = table([[C('copas', 7), C('copas', 6), C('copas', 5)], [C('oros', 4), C('oros', 3), C('espadas', 12)]]);
    reject(s, 'FLOR', 'p0');
    assert.ok(!getLegalActions(s, 'p0').some((a) => a.type === 'FLOR'));
  });

  test('[V2] gana el primero que llega a 30, en el acto (aunque falten bazas)', () => {
    let s = table([H33, H27], { scores: [27, 20] });
    s = act(s, 'ENVIDO', 'p0', { kind: 'real' });
    s = act(s, 'QUIERO', 'p1');
    assert.equal(s.phase, 'finished');
    assert.equal(s.winnerTeam, 0);
    assert.equal(s.scores[0], 30);
    reject(s, 'PLAY', 'p0', { cardId: H33[0].id });
  });

  test('[V3] falta envido con el puntero a 1 del final: vale 1 (lo que le falta al que va ganando)', () => {
    let s = table([[C('copas', 7), C('copas', 6), C('espadas', 1)], [C('oros', 4), C('oros', 3), C('bastos', 1)]], { scores: [0, 29] });
    s = act(s, 'ENVIDO', 'p0', { kind: 'falta' });
    s = act(s, 'QUIERO', 'p1');
    assert.deepEqual(s.scores, [1, 29]); // gana el envido el equipo A (33 contra 27) y suma 30 − 29
    assert.equal(s.phase, 'playing');
  });
});
