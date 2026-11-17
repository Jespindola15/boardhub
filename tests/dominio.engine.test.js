/**
 * Tests de Dominio (conquista mundial clásica).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, setup, getPlayerView, getPendingDeciders, getLegalActions, getResult, reinforcementsFor, isSet, tradeValue, NEUTRAL } from '../src/games/dominio/engine/index.js';
import { TERRITORIES, TERRITORY_IDS, CARDS } from '../src/games/dominio/data/map.js';

function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 2 ** 32;
  };
}
/** Dados fijos: valores 1–6 en orden. */
const dice = (...v) => {
  const q = [...v];
  return () => (q.length ? (q.shift() - 1) / 6 + 0.01 : 0.5);
};
const players = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, colorId: 'violet' }));
const act = (s, type, playerId, payload, rng = seeded(3)) => {
  const r = applyAction(s, { type, playerId, payload }, rng);
  assert.ok(r.ok, `${type} (${playerId}): ${r.error}`);
  return r.state;
};
const reject = (s, type, playerId, payload, rng = seeded(3)) => {
  const r = applyAction(s, { type, playerId, payload }, rng);
  assert.equal(r.ok, false, `${type} debía rechazarse`);
  return r.error;
};

/** Partida ya colocada, turno de p0 en la fase pedida, con el mapa dado (todo lo demás de p1). */
function game(n = 3, owners = {}, step = 'attack') {
  let s = setup({ players: players(n), options: { quickSetup: true }, rng: seeded(7) });
  for (const t of TERRITORY_IDS) s.board[t] = { owner: owners[t]?.[0] ?? 'p1', armies: owners[t]?.[1] ?? 1 };
  s.turnIndex = 0;
  s.turn = { step, toPlace: 0, conquered: false, tradeBonusUsed: false, pendingMove: null, fortified: false, forced: false };
  return s;
}

describe('Mapa y preparación', () => {
  test('42 territorios, 6 continentes, fronteras simétricas, 44 cartas', () => {
    assert.equal(TERRITORY_IDS.length, 42);
    for (const t of TERRITORY_IDS) for (const a of TERRITORIES[t].adj) assert.ok(TERRITORIES[a].adj.includes(t), `${t}-${a}`);
    assert.equal(CARDS.length, 44);
    for (const s of ['infanteria', 'caballeria', 'artilleria']) assert.equal(CARDS.filter((c) => c.symbol === s).length, 14);
  });

  test('ejércitos iniciales: 3→35, 4→30, 5→25, 6→20 y territorios repartidos', () => {
    for (const [n, a] of [[3, 35], [4, 30], [5, 25], [6, 20]]) {
      const s = setup({ players: players(n), rng: seeded(n) });
      const total = s.players.reduce((t, p) => t + p.toPlaceSetup, 0) + TERRITORY_IDS.length;
      assert.equal(total, n * a);
      assert.ok(TERRITORY_IDS.every((t) => s.board[t].armies === 1 && s.board[t].owner));
    }
  });

  test('dos jugadores: 40 cada uno y un ejército neutral que sólo defiende', () => {
    const s = setup({ players: players(2), rng: seeded(5) });
    const neutral = TERRITORY_IDS.filter((t) => s.board[t].owner === NEUTRAL);
    assert.equal(neutral.length, 14);
    assert.equal(neutral.reduce((t, x) => t + s.board[x].armies, 0), 40);
    assert.equal(s.players[0].toPlaceSetup + 14, 40);
  });

  test('colocación inicial de a uno por turno', () => {
    let s = setup({ players: players(3), rng: seeded(2) });
    const first = getPendingDeciders(s)[0];
    const mine = TERRITORY_IDS.find((t) => s.board[t].owner === first);
    reject(s, 'PLACE', first, { territory: mine, count: 2 });
    s = act(s, 'PLACE', first, { territory: mine });
    assert.notEqual(getPendingDeciders(s)[0], first);
    // completar la colocación
    for (let k = 0; k < 200 && s.phase === 'setup'; k++) {
      const id = getPendingDeciders(s)[0];
      s = act(s, 'PLACE', id, { territory: TERRITORY_IDS.find((t) => s.board[t].owner === id) });
    }
    assert.equal(s.phase, 'playing');
    assert.equal(s.turn.step, 'reinforce');
    assert.equal(s.players[s.turnIndex].id, first);
  });
});

describe('Refuerzos y cartas', () => {
  test('territorios / 3 (mínimo 3) + continentes', () => {
    const owners = {};
    TERRITORY_IDS.slice(0, 13).forEach((t) => (owners[t] = ['p0', 1]));
    const s = game(3, owners);
    // 13 territorios = 4; América del Norte (9) +5 y América del Sur (4) +2
    assert.equal(reinforcementsFor(s, 'p0').base, 4);
    assert.equal(reinforcementsFor(s, 'p0').total, 4 + 5 + 2);
    delete owners.argentina;
    assert.equal(reinforcementsFor(game(3, owners), 'p0').total, 4 + 5);
  });

  test('mínimo 3 refuerzos', () => {
    const s = game(3, { alaska: ['p0', 1] });
    assert.equal(reinforcementsFor(s, 'p0').total, 3);
  });

  test('juegos válidos y valores de canje 4, 6, 8, 10, 12, 15, 20…', () => {
    const c = (sym) => ({ symbol: sym });
    assert.ok(isSet([c('infanteria'), c('infanteria'), c('infanteria')]));
    assert.ok(isSet([c('infanteria'), c('caballeria'), c('artilleria')]));
    assert.ok(isSet([c('infanteria'), c('infanteria'), c('comodin')]));
    assert.ok(!isSet([c('infanteria'), c('infanteria'), c('caballeria')]));
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(tradeValue), [4, 6, 8, 10, 12, 15, 20, 25]);
  });

  test('canje: suma ejércitos, +2 en un territorio propio de las cartas; con 5 cartas es obligatorio', () => {
    let s = game(3, { alaska: ['p0', 1], peru: ['p0', 1] }, 'reinforce');
    s.turn.toPlace = 3;
    s.players[0].cards = ['c-alaska', 'c-noroeste', 'c-groenlandia', 'c-comodin-1', 'c-peru'];
    assert.match(reject(s, 'PLACE', 'p0', { territory: 'alaska', count: 1 }), /canjear/);
    const syms = ['c-alaska', 'c-noroeste', 'c-groenlandia'].map((id) => CARDS.find((c) => c.id === id).symbol);
    assert.equal(new Set(syms).size, 3);
    s = act(s, 'TRADE', 'p0', { cardIds: ['c-alaska', 'c-noroeste', 'c-groenlandia'] });
    assert.equal(s.turn.toPlace, 7);
    assert.equal(s.board.alaska.armies, 3);
    s = act(s, 'PLACE', 'p0', { territory: 'peru', count: 7 });
    s = act(s, 'END_REINFORCE', 'p0');
    assert.equal(s.turn.step, 'attack');
  });
});

describe('Ataque', () => {
  test('3 dados contra 2; empates para el defensor', () => {
    let s = game(3, { alaska: ['p0', 5], kamchatka: ['p1', 3] });
    // atacante 6,5,3 ; defensor 5,5 → 6>5 (def pierde), 5=5 (atk pierde)
    s = act(s, 'ATTACK', 'p0', { from: 'alaska', to: 'kamchatka', dice: 3 }, dice(6, 5, 3, 5, 5));
    assert.equal(s.board.alaska.armies, 4);
    assert.equal(s.board.kamchatka.armies, 2);
  });

  test('límites: hacen falta 2 ejércitos, sólo vecinos, dados ≤ ejércitos − 1', () => {
    const s = game(3, { alaska: ['p0', 1], peru: ['p0', 5] });
    assert.match(reject(s, 'ATTACK', 'p0', { from: 'alaska', to: 'kamchatka' }), /al menos 2/);
    assert.match(reject(s, 'ATTACK', 'p0', { from: 'peru', to: 'kamchatka' }), /vecinos/);
    let t = game(3, { alaska: ['p0', 2], kamchatka: ['p1', 1] });
    t = act(t, 'ATTACK', 'p0', { from: 'alaska', to: 'kamchatka', dice: 3 }, dice(6, 1));
    // con 2 ejércitos sólo tira 1 dado; conquista y mueve 1 obligatoriamente
    assert.equal(t.board.kamchatka.owner, 'p0');
    assert.equal(t.board.kamchatka.armies, 1);
    assert.equal(t.board.alaska.armies, 1);
  });

  test('tras conquistar hay que mover al menos tantos como dados tirados', () => {
    let s = game(3, { alaska: ['p0', 6], kamchatka: ['p1', 1] });
    s = act(s, 'ATTACK', 'p0', { from: 'alaska', to: 'kamchatka', dice: 3 }, dice(6, 6, 6, 1));
    assert.deepEqual(s.turn.pendingMove, { from: 'alaska', to: 'kamchatka', min: 3, max: 5 });
    reject(s, 'END_ATTACK', 'p0');
    reject(s, 'MOVE_IN', 'p0', { count: 2 });
    s = act(s, 'MOVE_IN', 'p0', { count: 4 });
    assert.equal(s.board.kamchatka.armies, 4);
    assert.equal(s.board.alaska.armies, 2);
  });

  test('carta al terminar el turno sólo si conquistó', () => {
    let s = game(3, { alaska: ['p0', 6], kamchatka: ['p1', 1] });
    s = act(s, 'END_TURN', 'p0');
    assert.equal(s.players[0].cards.length, 0);
    let t = game(3, { alaska: ['p0', 2], kamchatka: ['p1', 1] });
    t = act(t, 'ATTACK', 'p0', { from: 'alaska', to: 'kamchatka', dice: 1 }, dice(6, 1));
    t = act(t, 'END_TURN', 'p0');
    assert.equal(t.players[0].cards.length, 1);
    assert.equal(t.players[t.turnIndex].id, 'p1');
  });

  test('eliminar a un jugador: se queda sus cartas; con 6+ canjea en el acto', () => {
    const owners = { alaska: ['p0', 10], kamchatka: ['p2', 1] };
    let s = game(3, owners);
    s.players[0].cards = ['c-peru', 'c-brasil'];
    s.players[2].cards = ['c-china', 'c-india', 'c-siam', 'c-japon'];
    s = act(s, 'ATTACK', 'p0', { from: 'alaska', to: 'kamchatka', dice: 3 }, dice(6, 6, 6, 1));
    assert.equal(s.players[2].eliminated, true);
    assert.equal(s.players[0].cards.length, 6);
    s = act(s, 'MOVE_IN', 'p0', { count: 3 });
    assert.equal(s.turn.step, 'reinforce');
    assert.ok(getLegalActions(s, 'p0').some((a) => a.type === 'TRADE'));
    reject(s, 'END_REINFORCE', 'p0');
  });

  test('reagrupar: una vez, entre vecinos, dejando al menos 1, y termina el turno', () => {
    let s = game(3, { alaska: ['p0', 5], alberta: ['p0', 1], peru: ['p0', 2] });
    reject(s, 'FORTIFY', 'p0', { from: 'alaska', to: 'peru', count: 2 });
    reject(s, 'FORTIFY', 'p0', { from: 'alaska', to: 'alberta', count: 5 });
    s = act(s, 'FORTIFY', 'p0', { from: 'alaska', to: 'alberta', count: 4 });
    assert.equal(s.board.alberta.armies, 5);
    assert.equal(s.players[s.turnIndex].id, 'p1');
  });

  test('gana quien controla los 42 territorios', () => {
    const owners = Object.fromEntries(TERRITORY_IDS.map((t) => [t, ['p0', 1]]));
    owners.alaska = ['p0', 4];
    owners.kamchatka = ['p1', 1];
    let s = game(2, owners);
    s = act(s, 'ATTACK', 'p0', { from: 'alaska', to: 'kamchatka', dice: 3 }, dice(6, 6, 6, 1));
    assert.equal(s.phase, 'finished');
    assert.deepEqual(getResult(s).winners, ['p0']);
  });

  test('vista: no se ven las cartas ajenas', () => {
    const s = game(3, {});
    s.players[1].cards = ['c-peru'];
    const v = getPlayerView(s, 'p0');
    assert.equal(v.players[1].cardCount, 1);
    assert.ok(!JSON.stringify(v).includes('c-peru'));
  });

  test('60 partidas aleatorias terminan (colocación automática)', () => {
    for (let g = 0; g < 60; g++) {
      const rng = seeded(300 + g);
      let s = setup({ players: players(2 + (g % 5)), options: { quickSetup: g % 2 === 0 }, rng });
      for (let k = 0; k < 40000 && s.phase !== 'finished'; k++) {
        const id = getPendingDeciders(s)[0];
        const me = s.players.find((p) => p.id === id);
        const mine = TERRITORY_IDS.filter((t) => s.board[t].owner === id);
        let a;
        if (s.phase === 'setup') a = { type: 'PLACE', payload: { territory: mine[Math.floor(rng() * mine.length)] } };
        else if (s.turn.step === 'reinforce') {
          if (me.cards.length >= 3) {
            const cards = me.cards.map((c) => CARDS.find((x) => x.id === c));
            let set = null;
            for (let i = 0; i < cards.length && !set; i++) for (let j = i + 1; j < cards.length && !set; j++) for (let l = j + 1; l < cards.length && !set; l++) if (isSet([cards[i], cards[j], cards[l]])) set = [cards[i].id, cards[j].id, cards[l].id];
            if (set && (me.cards.length >= 5 || rng() < 0.5)) a = { type: 'TRADE', payload: { cardIds: set } };
          }
          if (!a && s.turn.toPlace > 0) {
            const front = mine.filter((t) => TERRITORIES[t].adj.some((x) => s.board[x].owner !== id));
            a = { type: 'PLACE', payload: { territory: (front[0] ?? mine[0]), count: s.turn.toPlace } };
          }
          if (!a) a = { type: 'END_REINFORCE' };
        } else if (s.turn.pendingMove) a = { type: 'MOVE_IN', payload: { count: s.turn.pendingMove.max } };
        else if (s.turn.step === 'attack') {
          const opts = [];
          for (const t of mine) if (s.board[t].armies >= 3) for (const x of TERRITORIES[t].adj) if (s.board[x].owner !== id) opts.push([t, x]);
          if (opts.length && rng() < 0.9) {
            const [from, to] = opts[Math.floor(rng() * opts.length)];
            a = { type: 'ATTACK', payload: { from, to, dice: 3, untilDone: rng() < 0.5 } };
          } else a = { type: 'END_TURN' };
        } else a = { type: 'END_TURN' };
        const r = applyAction(s, { ...a, playerId: id }, rng);
        assert.ok(r.ok, `${a.type}: ${r.error}`);
        s = r.state;
      }
      assert.equal(s.phase, 'finished', `partida ${g} sin terminar`);
    }
  });
});
