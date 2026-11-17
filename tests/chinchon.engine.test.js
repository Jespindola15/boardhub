/**
 * Tests de Chinchón (reglamento de los Juegos Bonaerenses).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, ACTIONS, setup, getPlayerView, getLegalActions, getPendingDeciders, getResult, buildDeck } from '../src/games/chinchon/engine/index.js';
import { bestArrangement, chinchonOf, candidateMelds, layOffOnto, settleHand } from '../src/games/chinchon/engine/melds.js';

function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 2 ** 32; };
}
const players = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, colorId: 'violet' }));
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
const C = (suit, rank) => ({ id: `${suit[0]}${rank}`, suit, rank, joker: false });
const J = (n = 1) => ({ id: `J${n}`, suit: null, rank: 0, joker: true });
const total = (s) => s.deck.length + s.discard.length + (s.cutCard ? 1 : 0) + s.players.reduce((t, p) => t + p.hand.length, 0);

/** Mesa controlada: turno de p0 en paso `step`, manos dadas. */
function table(hands, { step = 'discard', discard = [C('copas', 12)] } = {}) {
  const s = setup({ players: players(hands.length), rng: seeded(5) });
  s.players.forEach((p, i) => (p.hand = hands[i]));
  s.turnIndex = 0;
  s.mano = 0;
  s.step = step;
  s.discard = discard;
  s.deck = buildDeck().filter((c) => !hands.flat().some((h) => h.id === c.id) && !discard.some((d) => d.id === c.id));
  return s;
}

describe('Baraja y reparto', () => {
  test('50 cartas: 48 españolas (1 a 12) + 2 comodines', () => {
    const d = buildDeck();
    assert.equal(d.length, 50);
    assert.equal(d.filter((c) => c.joker).length, 2);
    assert.equal(new Set(d.map((c) => c.id)).size, 50);
  });

  test('7 cartas por jugador, una boca arriba en el pozo y el resto en el mazo', () => {
    for (const n of [2, 3, 4]) {
      const s = setup({ players: players(n), rng: seeded(n) });
      assert.ok(s.players.every((p) => p.hand.length === 7));
      assert.equal(s.discard.length, 1);
      assert.equal(total(s), 50);
      assert.equal(s.turnIndex, (s.dealerIndex + 1) % n); // es mano el de la derecha del dador
    }
    assert.throws(() => setup({ players: players(5) }));
  });
});

describe('Combinaciones', () => {
  test('grupos de 3 y 4 cartas iguales', () => {
    assert.equal(bestArrangement([C('oros', 7), C('copas', 7), C('bastos', 7)]).points, 0);
    assert.equal(bestArrangement([C('oros', 7), C('copas', 7), C('bastos', 7), C('espadas', 7)]).points, 0);
    assert.equal(bestArrangement([C('oros', 7), C('copas', 7)]).points, 14);
  });

  test('escaleras válidas e inválidas', () => {
    assert.equal(bestArrangement([C('oros', 4), C('oros', 5), C('oros', 6)]).points, 0);
    assert.equal(bestArrangement([C('oros', 7), C('oros', 8), C('oros', 9), C('oros', 10)]).points, 0);
    assert.equal(bestArrangement([C('oros', 4), C('copas', 5), C('oros', 6)]).points, 15); // palos distintos
    assert.equal(bestArrangement([C('oros', 4), C('oros', 6), C('oros', 7)]).points, 17); // no consecutivas
    assert.equal(bestArrangement([C('oros', 1), C('oros', 2), C('oros', 3)]).points, 0);
    assert.equal(bestArrangement([C('oros', 11), C('oros', 12), C('oros', 1)]).points, 24); // el As no da la vuelta
  });

  test('comodín: completa un juego, sólo uno por combinación y vale 20 en la mano', () => {
    assert.equal(bestArrangement([C('oros', 4), J(), C('oros', 6)]).points, 0);
    assert.equal(bestArrangement([C('oros', 7), C('copas', 7), J()]).points, 0);
    assert.equal(bestArrangement([C('oros', 4), J(1), J(2)]).points, 44); // no hay 2 comodines por juego
    assert.equal(bestArrangement([J()]).points, 20);
    // con dos comodines, uno en cada combinación
    const two = bestArrangement([C('oros', 4), C('oros', 5), J(1), C('copas', 9), C('bastos', 9), J(2)]);
    assert.equal(two.points, 0);
  });

  test('no se superponen combinaciones: cada carta en un solo juego', () => {
    // 5 de oros sirve para escalera 3-4-5 o para trío de 5; no para ambos
    const hand = [C('oros', 3), C('oros', 4), C('oros', 5), C('copas', 5), C('bastos', 5)];
    assert.equal(bestArrangement(hand).points, 7); // trío de 5 → quedan 3+4
  });

  test('Chin-Chon: siete cartas en escalera, con y sin comodín', () => {
    const run = [1, 2, 3, 4, 5, 6, 7].map((r) => C('espadas', r));
    assert.deepEqual(chinchonOf(run).withJoker, false);
    const withJ = [1, 2, 3, J(), 5, 6, 7].map((r) => (typeof r === 'number' ? C('espadas', r) : r));
    assert.equal(chinchonOf(withJ).withJoker, true);
    assert.equal(chinchonOf([1, 2, 3, 4, 5, 6].map((r) => C('espadas', r)).concat(C('oros', 7))), null);
  });

  test('descartes sobre la mesa: escaleras por los extremos, grupos hasta 4, comodín con identidad fija', () => {
    const run = candidateMelds([C('oros', 4), C('oros', 5), C('oros', 6)]).find((m) => m.type === 'run');
    assert.ok(layOffOnto(run, C('oros', 7)));
    assert.ok(layOffOnto(run, C('oros', 3)));
    assert.equal(layOffOnto(run, C('oros', 9)), null);
    assert.equal(layOffOnto(run, J()), null); // comodines no se ponen en juegos ajenos
    const grp = candidateMelds([C('oros', 7), C('copas', 7), J()]).find((m) => m.type === 'group' && m.joker);
    const jokerSuit = grp.joker.suit;
    const others = ['oros', 'copas', 'espadas', 'bastos'].filter((x) => x !== 'oros' && x !== 'copas' && x !== jokerSuit);
    assert.equal(layOffOnto(grp, C(jokerSuit, 7)), null); // ese palo lo ocupa el comodín
    assert.ok(layOffOnto(grp, C(others[0], 7)));
    const full = layOffOnto(grp, C(others[0], 7));
    assert.equal(layOffOnto(full, C('oros', 7)), null);
  });
});

describe('Turnos', () => {
  test('robar del mazo o del pozo y descartar: siempre 7 cartas', () => {
    let s = setup({ players: players(3), rng: seeded(8) });
    const id = s.players[s.turnIndex].id;
    reject(s, ACTIONS.DISCARD, id, { cardId: s.players[s.turnIndex].hand[0].id }); // primero robar
    s = act(s, ACTIONS.DRAW, id, { from: 'discard' });
    assert.equal(s.players.find((p) => p.id === id).hand.length, 8);
    reject(s, ACTIONS.DRAW, id, { from: 'deck' });
    const card = s.players.find((p) => p.id === id).hand.find((c) => !c.joker);
    s = act(s, ACTIONS.DISCARD, id, { cardId: card.id });
    assert.equal(s.players.find((p) => p.id === id).hand.length, 7);
    assert.notEqual(s.players[s.turnIndex].id, id);
    assert.equal(total(s), 50);
  });

  test('los comodines no se tiran al pozo', () => {
    const s = table([[J(), C('oros', 1), C('oros', 2), C('oros', 3), C('copas', 4), C('copas', 5), C('copas', 6), C('bastos', 9)], [C('espadas', 1)]]);
    reject(s, ACTIONS.DISCARD, 'p0', { cardId: 'J1' });
  });

  test('mazo agotado: se mezcla el pozo; la segunda vez termina la mano sin descartes', () => {
    let s = setup({ players: players(2), rng: seeded(12) });
    s.deck = [];
    const id = s.players[s.turnIndex].id;
    s.discard = [C('copas', 9), C('copas', 10)].filter((c) => !s.players.some((p) => p.hand.some((h) => h.id === c.id)));
    const n = s.discard.length;
    s = act(s, ACTIONS.DRAW, id, { from: 'deck' });
    assert.equal(s.reshuffles, 1);
    assert.equal(s.discard.length, 0);
    assert.equal(s.deck.length, n - 1);
    s.deck = [];
    s.step = 'draw';
    s = act(s, ACTIONS.DRAW, id, { from: 'deck' });
    assert.equal(s.phase === 'round-over' || s.phase === 'finished', true);
    assert.equal(s.roundResult.exhausted, true);
    assert.ok(Object.values(s.roundResult.results).every((r) => r.layOffs.length === 0));
  });
});

describe('Cortar', () => {
  const cutHand = () => [C('oros', 1), C('oros', 2), C('oros', 3), C('copas', 7), C('bastos', 7), C('espadas', 7), C('copas', 2), C('bastos', 12)];

  test('corte válido con 5 puntos o menos sueltos (la carta va tapada)', () => {
    let s = table([cutHand(), [C('oros', 4), C('oros', 5), C('copas', 10), C('copas', 11), C('bastos', 1), C('bastos', 2), C('bastos', 3)]]);
    s = act(s, ACTIONS.CUT, 'p0', { cardId: 'b12' });
    assert.equal(s.roundResult.cutterId, 'p0');
    assert.equal(s.roundResult.results.p0.points, 2);
    assert.equal(s.cutCard.id, 'b12');
    assert.notEqual(s.discard.at(-1)?.id, 'b12');
    // p1 descarta 4 y 5 de oros sobre la escalera de p0 y baja 1-2-3 de bastos: le quedan 10 + 11
    assert.equal(s.roundResult.results.p1.points, 21);
    assert.equal(total(s), 50);
  });

  test('corte inválido con más de 5 puntos', () => {
    const s = table([[C('oros', 1), C('oros', 2), C('oros', 3), C('copas', 7), C('bastos', 7), C('espadas', 7), C('copas', 9), C('bastos', 12)], [C('espadas', 1)]]);
    assert.match(reject(s, ACTIONS.CUT, 'p0', { cardId: 'b12' }), /más de 5/);
    assert.ok(!getLegalActions(s, 'p0').some((a) => a.type === 'CUT' && a.cardIds.includes('b12')));
  });

  test('corte con todas combinadas: -10', () => {
    let s = table([[C('oros', 1), C('oros', 2), C('oros', 3), C('copas', 7), C('bastos', 7), C('espadas', 7), C('oros', 7), C('bastos', 12)], [C('espadas', 1), C('copas', 1)]]);
    s = act(s, ACTIONS.CUT, 'p0', { cardId: 'b12' });
    assert.equal(s.roundResult.results.p0.points, -10);
    assert.equal(s.players[0].score, -10);
  });

  test('Chin-Chon con comodín: -10', () => {
    let s = table([[C('espadas', 1), C('espadas', 2), J(), C('espadas', 4), C('espadas', 5), C('espadas', 6), C('espadas', 7), C('copas', 12)], [C('oros', 3)]]);
    s = act(s, ACTIONS.CUT, 'p0', { cardId: 'c12' });
    assert.equal(s.players[0].score, -10);
    assert.equal(s.phase, 'round-over');
  });

  test('Chin-Chon sin comodín: gana el partido y los demás reciben 101', () => {
    let s = table([[1, 2, 3, 4, 5, 6, 7].map((r) => C('bastos', r)).concat(C('copas', 12)), [C('oros', 3)], [C('oros', 4)]]);
    s = act(s, ACTIONS.CUT, 'p0', { cardId: 'c12' });
    assert.equal(s.phase, 'finished');
    assert.deepEqual(getResult(s).winners, ['p0']);
    assert.ok(s.players.slice(1).every((p) => p.score >= 101));
  });

  test('quien no corta y baja todo anota 0', () => {
    const r = settleHand([C('oros', 9), C('oros', 10), C('oros', 11)], []);
    assert.equal(r.points, 0);
  });
});

describe('Puntuación y fin del partido', () => {
  test('quien supera 101 queda afuera; el último que queda gana', () => {
    let s = table([[C('oros', 1), C('oros', 2), C('oros', 3), C('copas', 7), C('bastos', 7), C('espadas', 7), C('copas', 2), C('bastos', 12)], [C('copas', 11), C('copas', 12)]]);
    s.players[1].score = 90;
    s = act(s, ACTIONS.CUT, 'p0', { cardId: 'b12' });
    assert.equal(s.players[1].out, true);
    assert.equal(s.phase, 'finished');
    assert.deepEqual(s.winners, ['p0']);
  });

  test('si todos superan 101 a la vez, gana el de menos puntos; empate → el que cortó', () => {
    let s = table([[C('oros', 1), C('oros', 2), C('oros', 3), C('copas', 7), C('bastos', 7), C('espadas', 7), C('copas', 2), C('bastos', 12)], [C('copas', 11), C('copas', 12)], [C('oros', 12)]]);
    s.players[0].score = 101;
    s.players[1].score = 90;
    s.players[2].score = 100;
    s = act(s, ACTIONS.CUT, 'p0', { cardId: 'b12' });
    // p0: 103, p1: 113, p2: 112 → todos > 101 → gana p0
    assert.deepEqual(s.winners, ['p0']);
  });

  test('vista privada: no se ven manos ajenas ni la carta del corte', () => {
    const s = setup({ players: players(3), rng: seeded(21) });
    const v = getPlayerView(s, 'p1');
    assert.equal(v.players.find((p) => p.id === 'p0').hand, undefined);
    assert.equal(v.deck, undefined);
    const json = JSON.stringify(v);
    for (const c of s.players[0].hand) if (v.discardTop?.id !== c.id) assert.ok(!json.includes(`"${c.id}"`));
  });

  test('80 partidas aleatorias completas (2–4 jugadores) conservan las 50 cartas y terminan', () => {
    for (let g = 0; g < 80; g++) {
      const rng = seeded(900 + g);
      let s = setup({ players: players(2 + (g % 3)), rng });
      for (let k = 0; k < 20000 && s.phase !== 'finished'; k++) {
        const id = getPendingDeciders(s)[0];
        const legal = getLegalActions(s, id).filter((a) => a.type !== 'LEAVE');
        let a;
        const cut = legal.find((x) => x.type === 'CUT');
        if (s.phase === 'round-over') a = { type: 'NEXT_ROUND' };
        else if (cut) a = { type: 'CUT', payload: { cardId: cut.cardIds[0] } };
        else if (legal[0].type === 'DRAW') a = { type: 'DRAW', payload: { from: rng() < 0.3 && legal[0].from.includes('discard') ? 'discard' : 'deck' } };
        else {
          // descarta la carta que menos ayuda (la más alta que quede suelta)
          const p = s.players.find((x) => x.id === id);
          const arr = getPlayerView(s, id).myArrangement;
          const loose = arr.leftover.filter((c) => !c.joker).sort((x, y) => y.rank - x.rank);
          const cardId = loose[0]?.id ?? legal[0].cardIds[0];
          a = { type: 'DISCARD', payload: { cardId } };
          void p;
        }
        const r = applyAction(s, { ...a, playerId: id }, rng);
        assert.ok(r.ok, `${a.type}: ${r.error}`);
        s = r.state;
        if (s.phase === 'playing') assert.equal(total(s), 50);
      }
      assert.equal(s.phase, 'finished', `la partida ${g} no terminó`);
    }
  });
});
