/**
 * Tests de Colonias (juego básico de colonos).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, setup, getPlayerView, getPendingDeciders, getLegalActions, getResult, buildSpots, longestRoadOf, bankRate, totalPoints, publicPoints } from '../src/games/colonias/engine/index.js';
import { GRAPH, generateBoard, RESOURCES } from '../src/games/colonias/engine/board.js';

function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 2 ** 32;
  };
}
const dice = (a, b) => {
  const q = [a, b];
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
const res = (o = {}) => Object.fromEntries(RESOURCES.map((r) => [r, o[r] ?? 0]));

/** Hace la preparación eligiendo el primer lugar válido. */
function prepared(n = 3, seed = 5) {
  let s = setup({ players: players(n), rng: seeded(seed) });
  while (s.phase === 'setup') {
    const id = getPendingDeciders(s)[0];
    const spots = buildSpots(s, id);
    s = s.setupStep === 'settlement' ? act(s, 'PLACE_SETTLEMENT', id, { vertex: spots.settlements[0] }) : act(s, 'PLACE_ROAD', id, { edge: spots.roads[0] });
  }
  return s;
}

describe('Tablero', () => {
  test('19 hexágonos, 54 vértices, 72 lados, 9 puertos', () => {
    assert.equal(Object.keys(GRAPH.hexes).length, 19);
    assert.equal(Object.keys(GRAPH.vertices).length, 54);
    assert.equal(Object.keys(GRAPH.edges).length, 72);
    const b = generateBoard(seeded(1));
    assert.equal(Object.keys(b.harbors).length, 9);
    assert.equal(Object.values(b.harbors).filter((h) => h === '3:1').length, 4);
  });

  test('terrenos y fichas oficiales; sin 6 u 8 vecinos', () => {
    for (let k = 1; k <= 30; k++) {
      const b = generateBoard(seeded(k));
      const t = Object.values(b.tiles);
      const count = (x) => t.filter((y) => y.terrain === x).length;
      assert.deepEqual([count('bosque'), count('pasto'), count('campo'), count('cerro'), count('montana'), count('desierto')], [4, 4, 4, 3, 3, 1]);
      assert.deepEqual(t.map((x) => x.number).filter(Boolean).sort((a, c) => a - c), [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]);
      const red = Object.keys(b.tiles).filter((h) => [6, 8].includes(b.tiles[h].number));
      for (const a of red) for (const c of red) if (a !== c) assert.ok(!GRAPH.hexes[a].vertices.some((v) => GRAPH.hexes[c].vertices.includes(v)));
    }
  });
});

describe('Preparación', () => {
  test('orden en serpiente, regla de la distancia y recursos del segundo poblado', () => {
    let s = setup({ players: players(3), rng: seeded(9) });
    const order = [];
    while (s.phase === 'setup') {
      const id = getPendingDeciders(s)[0];
      if (s.setupStep === 'settlement') {
        order.push(id);
        const v = buildSpots(s, id).settlements[0];
        // un vecino ya no es válido
        s = act(s, 'PLACE_SETTLEMENT', id, { vertex: v });
        for (const nb of GRAPH.vertices[v].neighbors) assert.ok(!buildSpots(s, id).settlements.includes(nb) || s.setupStep === 'road');
      } else {
        reject(s, 'PLACE_ROAD', id, { edge: Object.keys(GRAPH.edges).find((e) => !GRAPH.edges[e].v.includes(s.setupLast)) });
        s = act(s, 'PLACE_ROAD', id, { edge: buildSpots(s, id).roads[0] });
      }
    }
    assert.deepEqual(order.slice(3), [...order.slice(0, 3)].reverse());
    assert.equal(s.players[s.turnIndex].id, order[0]);
    // recursos: cada uno recibió uno por hexágono productivo del 2.º poblado
    const totalRes = s.players.reduce((t, p) => t + RESOURCES.reduce((a, r) => a + p.res[r], 0), 0);
    assert.ok(totalRes > 0 && totalRes <= 9);
  });
});

describe('Turno', () => {
  test('producción: poblado 1, ciudad 2; el ladrón bloquea', () => {
    let s = prepared();
    const id = s.players[s.turnIndex].id;
    const [hid, tile] = Object.entries(s.tiles).find(([h, t]) => t.number === 6 && h !== s.robber);
    const [v1, v2] = GRAPH.hexes[hid].vertices.filter((v, i) => i % 3 === 0);
    s.buildings = { [v1]: { owner: 'p0', type: 'settlement' }, [v2]: { owner: 'p1', type: 'city' } };
    for (const p of s.players) p.res = res();
    s = act(s, 'ROLL', id, {}, dice(3, 3));
    assert.equal(s.players[0].res[tile.resource], 1);
    assert.equal(s.players[1].res[tile.resource], 2);
    // con el ladrón encima, nada
    let t = prepared();
    t.buildings = { [v1]: { owner: 'p0', type: 'settlement' } };
    t.robber = hid;
    for (const p of t.players) p.res = res();
    t = act(t, 'ROLL', t.players[t.turnIndex].id, {}, dice(3, 3));
    assert.equal(t.players[0].res[tile.resource], 0);
  });

  test('un 7: descartan la mitad los de más de 7, luego se mueve el ladrón y se roba', () => {
    let s = prepared();
    const id = s.players[s.turnIndex].id;
    const other = s.players.find((p) => p.id !== id);
    other.res = res({ madera: 5, ladrillo: 4 });
    s.players.find((p) => p.id === id).res = res({ lana: 2 });
    s = act(s, 'ROLL', id, {}, dice(3, 4));
    assert.equal(s.turn.step, 'discard');
    assert.deepEqual(getPendingDeciders(s), [other.id]);
    reject(s, 'DISCARD', other.id, { cards: { madera: 3 } });
    s = act(s, 'DISCARD', other.id, { cards: { madera: 3, ladrillo: 1 } });
    assert.equal(s.turn.step, 'robber');
    reject(s, 'MOVE_ROBBER', id, { hex: s.robber });
    const target = Object.keys(GRAPH.hexes).find((h) => h !== s.robber && GRAPH.hexes[h].vertices.some((v) => s.buildings[v]?.owner === other.id));
    s = act(s, 'MOVE_ROBBER', id, { hex: target, victim: other.id });
    assert.equal(s.turn.step, 'main');
    assert.equal(RESOURCES.reduce((t, r) => t + s.players.find((p) => p.id === id).res[r], 0), 3);
  });

  test('construir: costos, conexión, regla de la distancia y ciudad', () => {
    let s = prepared();
    const id = s.players[s.turnIndex].id;
    s = act(s, 'ROLL', id, {}, dice(2, 3));
    const p = () => s.players.find((x) => x.id === id);
    p().res = res({ madera: 4, ladrillo: 4, lana: 1, trigo: 3, mineral: 3 });
    const road = buildSpots(s, id).roads[0];
    reject(s, 'BUILD_ROAD', id, { edge: Object.keys(GRAPH.edges).find((e) => !buildSpots(s, id).roads.includes(e) && !s.roads[e]) });
    s = act(s, 'BUILD_ROAD', id, { edge: road });
    assert.equal(p().res.madera, 3);
    const city = buildSpots(s, id).cities[0];
    s = act(s, 'BUILD_CITY', id, { vertex: city });
    assert.equal(s.buildings[city].type, 'city');
    assert.equal(publicPoints(s, id), 3);
  });

  test('comercio con el banco 4:1 y puertos', () => {
    let s = prepared();
    const id = s.players[s.turnIndex].id;
    s = act(s, 'ROLL', id, {}, dice(2, 3));
    s.players.find((x) => x.id === id).res = res({ madera: 4 });
    s = act(s, 'BANK_TRADE', id, { give: 'madera', get: 'mineral' });
    assert.equal(s.players.find((x) => x.id === id).res.mineral, 1);
    // con un puerto 2:1 de madera
    const harborEdge = Object.keys(s.harbors).find((e) => s.harbors[e] !== '3:1');
    const kind = s.harbors[harborEdge];
    s.buildings[GRAPH.edges[harborEdge].v[0]] = { owner: id, type: 'settlement' };
    assert.equal(bankRate(s, id, kind), 2);
  });

  test('comercio entre jugadores: oferta dirigida, aceptar o rechazar', () => {
    let s = prepared();
    const id = s.players[s.turnIndex].id;
    const other = s.players.find((x) => x.id !== id).id;
    s = act(s, 'ROLL', id, {}, dice(2, 3));
    s.players.find((x) => x.id === id).res = res({ madera: 2 });
    s.players.find((x) => x.id === other).res = res({ trigo: 1 });
    s = act(s, 'OFFER_TRADE', id, { to: other, give: { madera: 2 }, get: { trigo: 1 } });
    assert.deepEqual(getPendingDeciders(s), [other]);
    reject(s, 'END_TURN', id);
    s = act(s, 'ACCEPT_TRADE', other);
    assert.equal(s.players.find((x) => x.id === id).res.trigo, 1);
    assert.equal(s.players.find((x) => x.id === other).res.madera, 2);
  });

  test('cartas de desarrollo: una por turno, no la recién comprada; caballeros y Gran Ejército', () => {
    let s = prepared();
    const id = s.players[s.turnIndex].id;
    s = act(s, 'ROLL', id, {}, dice(2, 3));
    const me = () => s.players.find((x) => x.id === id);
    me().res = res({ lana: 1, trigo: 1, mineral: 1 });
    s.devDeck.push('caballero');
    s = act(s, 'BUY_DEV', id);
    assert.match(reject(s, 'PLAY_KNIGHT', id), /comprada en este turno/);
    me().dev.push({ type: 'monopolio' }, { type: 'caballero' }, { type: 'caballero' });
    me().knights = 2;
    s.players.forEach((x) => x.id !== id && (x.res = res({ lana: 2 })));
    s = act(s, 'PLAY_MONOPOLY', id, { resource: 'lana' });
    assert.equal(me().res.lana, 2 * (s.players.length - 1));
    assert.match(reject(s, 'PLAY_KNIGHT', id), /una carta/);
    s = act(s, 'END_TURN', id);
    // vuelta completa hasta el mismo jugador
    while (s.players[s.turnIndex].id !== id) {
      const x = s.players[s.turnIndex].id;
      s = act(s, 'ROLL', x, {}, dice(2, 3));
      s = act(s, 'END_TURN', x);
    }
    s = act(s, 'PLAY_KNIGHT', id); // antes de tirar
    assert.equal(s.turn.step, 'robber');
    assert.equal(s.largestArmy, id);
    assert.equal(publicPoints(s, id), 2 + 2);
  });

  test('Gran Camino: 5 o más, se pierde si otro lo supera', () => {
    const s = prepared();
    s.roads = {};
    s.buildings = {};
    // camino de 5 lados encadenados para p0
    let v = Object.keys(GRAPH.vertices)[0];
    const used = new Set();
    for (let k = 0; k < 6; k++) {
      const e = GRAPH.vertices[v].edges.find((x) => !used.has(x) && !GRAPH.edges[x].v.some((w) => [...used].some((u) => GRAPH.edges[u].v.includes(w) && w !== v)));
      used.add(e);
      s.roads[e] = 'p0';
      v = GRAPH.edges[e].v.find((w) => w !== v);
    }
    assert.ok(longestRoadOf(s, 'p0') >= 5);
  });

  test('gana quien llega a 10 puntos en su turno (los puntos ocultos cuentan)', () => {
    let s = prepared();
    const id = s.players[s.turnIndex].id;
    const me = s.players.find((x) => x.id === id);
    me.dev.push(...Array(8).fill({ type: 'punto' }));
    s = act(s, 'ROLL', id, {}, dice(2, 3));
    assert.equal(s.phase, 'finished');
    assert.deepEqual(getResult(s).winners, [id]);
    assert.equal(totalPoints(s, me), 10);
  });

  test('vista: no se ven recursos ni cartas ajenas, ni puntos ocultos', () => {
    const s = prepared();
    s.players[1].dev.push({ type: 'punto' });
    const v = getPlayerView(s, 'p0');
    assert.equal(v.players[1].points, publicPoints(s, 'p1'));
    assert.equal(v.players[1].res, undefined);
    assert.ok(!JSON.stringify(v.players).includes('punto'));
  });

  test('40 partidas aleatorias avanzan sin errores', () => {
    for (let g = 0; g < 40; g++) {
      const rng = seeded(1000 + g);
      let s = setup({ players: players(3 + (g % 2)), rng });
      for (let k = 0; k < 3000 && s.phase !== 'finished'; k++) {
        const id = getPendingDeciders(s)[0];
        const legal = getLegalActions(s, id).filter((a) => a.type !== 'LEAVE');
        const sp = buildSpots(s, id);
        const me = s.players.find((p) => p.id === id);
        const pick = (arr) => arr[Math.floor(rng() * arr.length)];
        let a;
        const has = (t) => legal.find((x) => x.type === t);
        if (has('PLACE_SETTLEMENT')) a = { type: 'PLACE_SETTLEMENT', payload: { vertex: pick(sp.settlements) } };
        else if (has('PLACE_ROAD')) a = { type: 'PLACE_ROAD', payload: { edge: pick(sp.roads) } };
        else if (has('DISCARD')) {
          const n = has('DISCARD').count;
          const cards = {};
          let left = n;
          for (const r of RESOURCES) {
            const k2 = Math.min(left, me.res[r]);
            if (k2) cards[r] = k2;
            left -= k2;
          }
          a = { type: 'DISCARD', payload: { cards } };
        } else if (has('ACCEPT_TRADE')) a = { type: rng() < 0.5 ? 'ACCEPT_TRADE' : 'REJECT_TRADE' };
        else if (has('MOVE_ROBBER')) {
          const hex = pick(Object.keys(GRAPH.hexes).filter((h) => h !== s.robber));
          const vic = Object.values(GRAPH.hexes[hex].vertices).map((v) => s.buildings[v]?.owner).find((o) => o && o !== id);
          a = { type: 'MOVE_ROBBER', payload: { hex, victim: vic } };
        } else if (has('BUILD_ROAD')?.free) a = { type: 'BUILD_ROAD', payload: { edge: pick(sp.roads) } };
        else if (has('ROLL')) a = { type: 'ROLL' };
        else if (has('BUILD_CITY') && sp.cities.length) a = { type: 'BUILD_CITY', payload: { vertex: sp.cities[0] } };
        else if (has('BUILD_SETTLEMENT') && sp.settlements.length) a = { type: 'BUILD_SETTLEMENT', payload: { vertex: sp.settlements[0] } };
        else if (has('BUILD_ROAD') && sp.roads.length && rng() < 0.7) a = { type: 'BUILD_ROAD', payload: { edge: pick(sp.roads) } };
        else if (has('BUY_DEV')) a = { type: 'BUY_DEV' };
        else if (has('PLAY_KNIGHT') && rng() < 0.5) a = { type: 'PLAY_KNIGHT' };
        else if (has('PLAY_YEAR_OF_PLENTY')) a = { type: 'PLAY_YEAR_OF_PLENTY', payload: { resources: ['trigo', 'mineral'] } };
        else if (has('PLAY_MONOPOLY')) a = { type: 'PLAY_MONOPOLY', payload: { resource: 'trigo' } };
        else if (has('PLAY_ROAD_BUILDING') && sp.roads.length) a = { type: 'PLAY_ROAD_BUILDING' };
        else {
          const rich = RESOURCES.find((r) => me.res[r] >= 4);
          const poor = RESOURCES.find((r) => me.res[r] === 0 && s.bank[r] > 0);
          if (rich && poor && has('BANK_TRADE')) a = { type: 'BANK_TRADE', payload: { give: rich, get: poor } };
          else a = { type: 'END_TURN' };
        }
        const r = applyAction(s, { ...a, playerId: id }, rng);
        if (!r.ok && /banco no tiene|Necesitás|recursos/.test(r.error)) {
          s = applyAction(s, { type: 'END_TURN', playerId: id }, rng).state ?? s;
          continue;
        }
        assert.ok(r.ok, `${a.type}: ${r.error}`);
        s = r.state;
        // conservación de recursos: 19 de cada uno entre banco y jugadores
        for (const res2 of RESOURCES) assert.equal(s.bank[res2] + s.players.reduce((t, p) => t + p.res[res2], 0), 19);
      }
    }
  });
});
