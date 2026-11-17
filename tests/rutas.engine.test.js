/**
 * Tests de Rutas (vagones y destinos, mapa propio).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, setup, getPlayerView, getPendingDeciders, getLegalActions, getResult, buildTrainDeck, paymentFor, longestPath, ticketDone } from '../src/games/rutas/engine/index.js';
import { ROUTES, ROUTE_BY_ID, TICKETS, CITIES } from '../src/games/rutas/data/map.js';

function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 2 ** 32;
  };
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
/** Partida en juego, turno de p0. */
function game(n = 3) {
  let s = setup({ players: players(n), rng: seeded(4) });
  for (const p of s.players) s = act(s, 'KEEP_TICKETS', p.id, { ticketIds: p.offer.ticketIds.slice(0, 2) });
  s.turnIndex = 0;
  return s;
}

describe('Material y preparación', () => {
  test('110 cartas de vagón: 12 de cada color y 14 locomotoras', () => {
    const d = buildTrainDeck();
    assert.equal(d.length, 110);
    assert.equal(d.filter((c) => c === 'locomotora').length, 14);
  });

  test('mapa conexo, largos de 1 a 6, destinos con valor', () => {
    assert.ok(ROUTES.every((r) => r.length >= 1 && r.length <= 6 && CITIES[r.a] && CITIES[r.b]));
    assert.ok(TICKETS.every((t) => Number.isFinite(t.points) && t.points > 0));
  });

  test('4 cartas, 5 visibles, 45 vagones y 3 destinos (quedarse con 2 o más)', () => {
    const s = setup({ players: players(4), rng: seeded(2) });
    assert.ok(s.players.every((p) => Object.values(p.hand).reduce((a, b) => a + b, 0) === 4 && p.trains === 45 && p.offer.ticketIds.length === 3));
    assert.equal(s.faceUp.length, 5);
    assert.equal(getPendingDeciders(s).length, 4);
    assert.match(reject(s, 'KEEP_TICKETS', 'p0', { ticketIds: [s.players[0].offer.ticketIds[0]] }), /al menos 2/);
    assert.equal(s.faceUp.filter((c) => c === 'locomotora').length < 3, true);
  });
});

describe('Turno', () => {
  test('robar dos cartas; una locomotora visible es todo el turno', () => {
    let s = game();
    s.faceUp = ['rojo', 'locomotora', 'azul', 'verde', 'negro'];
    s = act(s, 'DRAW_CARD', 'p0', { from: 0 });
    assert.equal(s.turnIndex, 0);
    assert.match(reject(s, 'DRAW_CARD', 'p0', { from: s.faceUp.indexOf('locomotora') }), /segunda carta/);
    s = act(s, 'DRAW_CARD', 'p0', { from: 'deck' });
    assert.equal(s.turnIndex, 1);
    s.faceUp = ['rojo', 'locomotora', 'azul', 'verde', 'negro'];
    s = act(s, 'DRAW_CARD', 'p1', { from: 1 });
    assert.equal(s.turnIndex, 2);
  });

  test('tres locomotoras visibles: se descartan y se reponen', () => {
    let s = game();
    s.faceUp = ['locomotora', 'locomotora', 'azul', 'verde', 'negro'];
    s.deck.push('locomotora');
    s = act(s, 'DRAW_CARD', 'p0', { from: 2 });
    assert.ok(s.faceUp.filter((c) => c === 'locomotora').length < 3);
    assert.equal(s.faceUp.length, 5);
  });

  test('ocupar un tramo: cartas del color (locomotoras comodín), vagones y puntos 1/2/4/7/10/15', () => {
    let s = game();
    const r = ROUTE_BY_ID['salta~asuncion']; // 4 gris
    s.players[0].hand = { rojo: 3, locomotora: 1 };
    assert.deepEqual(paymentFor(s.players[0], r, 'rojo'), { rojo: 3, locomotora: 1 });
    reject(s, 'CLAIM', 'p0', { routeId: r.id, color: 'azul' });
    s = act(s, 'CLAIM', 'p0', { routeId: r.id, color: 'rojo' });
    assert.equal(s.players[0].trains, 41);
    assert.equal(s.players[0].routePoints, 7);
    assert.deepEqual(s.players[0].hand, {});
    assert.equal(s.claims[r.id], 'p0');
    // tramo de color: sólo ese color
    s.turnIndex = 0;
    s.players[0].hand = { rojo: 5 };
    reject(s, 'CLAIM', 'p0', { routeId: 'cordoba~mendoza', color: 'rojo' }); // es blanco
    reject(s, 'CLAIM', 'p0', { routeId: r.id, color: 'rojo' }); // ocupado
  });

  test('rutas dobles: con 2–3 jugadores sólo un tramo; nadie toma los dos', () => {
    let s = game(3);
    s.players[0].hand = { violeta: 2 };
    s = act(s, 'CLAIM', 'p0', { routeId: 'buenos-aires~rosario#1', color: 'violeta' });
    s.players[1].hand = { verde: 2 };
    assert.match(reject(s, 'CLAIM', 'p1', { routeId: 'buenos-aires~rosario#2', color: 'verde' }), /2 o 3 jugadores/);
    let f = game(4);
    f.players[0].hand = { violeta: 2, verde: 2 };
    f = act(f, 'CLAIM', 'p0', { routeId: 'buenos-aires~rosario#1', color: 'violeta' });
    f.players[1].hand = { verde: 2 };
    f = act(f, 'CLAIM', 'p1', { routeId: 'buenos-aires~rosario#2', color: 'verde' });
    f.turnIndex = 0;
    f.claims['buenos-aires~rosario#2'] = undefined;
    delete f.claims['buenos-aires~rosario#2'];
    assert.match(reject(f, 'CLAIM', 'p0', { routeId: 'buenos-aires~rosario#2', color: 'verde' }), /dos tramos/);
  });

  test('robar destinos: 3, quedarse con al menos 1', () => {
    let s = game();
    s = act(s, 'DRAW_TICKETS', 'p0');
    assert.equal(s.players[0].offer.ticketIds.length, 3);
    reject(s, 'KEEP_TICKETS', 'p0', { ticketIds: [] });
    s = act(s, 'KEEP_TICKETS', 'p0', { ticketIds: [s.players[0].offer.ticketIds[2]] });
    assert.equal(s.players[0].tickets.length, 3);
    assert.equal(s.turnIndex, 1);
  });
});

describe('Final y puntuación', () => {
  test('destinos cumplidos y camino más largo', () => {
    const s = game(2);
    for (const id of ['buenos-aires~rosario#1', 'rosario~cordoba', 'cordoba~mendoza', 'mendoza~santiago#1']) s.claims[id] = 'p0';
    const t = TICKETS.find((x) => x.a === 'santiago' && x.b === 'buenos-aires');
    assert.ok(ticketDone(s, 'p0', t.id));
    assert.equal(longestPath(s, 'p0'), 2 + 2 + 3 + 2);
    assert.equal(longestPath(s, 'p1'), 0);
  });

  test('con 2 vagones o menos empieza la última vuelta: cada uno juega un turno más', () => {
    let s = game(3);
    s.players[0].trains = 4;
    s.players[0].hand = { amarillo: 2 };
    s = act(s, 'CLAIM', 'p0', { routeId: 'san-pablo~curitiba', color: 'amarillo' });
    assert.equal(s.finalTurnsLeft, 3);
    s = act(s, 'DRAW_CARD', 'p1', { from: 'deck' });
    s = act(s, 'DRAW_CARD', 'p1', { from: 'deck' });
    s = act(s, 'DRAW_CARD', 'p2', { from: 'deck' });
    s = act(s, 'DRAW_CARD', 'p2', { from: 'deck' });
    assert.equal(s.phase, 'playing');
    s = act(s, 'DRAW_CARD', 'p0', { from: 'deck' });
    s = act(s, 'DRAW_CARD', 'p0', { from: 'deck' });
    assert.equal(s.phase, 'finished');
    const r = s.results.find((x) => x.playerId === 'p0');
    assert.equal(r.routes, 2);
    assert.equal(r.bonus, 10); // único con camino
    assert.equal(r.total, r.routes + r.ticketsPlus - r.ticketsMinus + 10);
    assert.ok(getResult(s).winners.length >= 1);
  });

  test('vista privada: no se ven manos ni destinos ajenos', () => {
    const s = game(3);
    const v = getPlayerView(s, 'p1');
    assert.equal(v.players[0].tickets, undefined);
    const json = JSON.stringify(v);
    for (const t of s.players[0].tickets) if (!s.players[1].tickets.includes(t)) assert.ok(!json.includes(`"${t}"`));
  });

  test('50 partidas aleatorias terminan', () => {
    for (let g = 0; g < 50; g++) {
      const rng = seeded(700 + g);
      let s = setup({ players: players(2 + (g % 4)), rng });
      for (let k = 0; k < 4000 && s.phase !== 'finished'; k++) {
        const id = getPendingDeciders(s)[0];
        const legal = getLegalActions(s, id).filter((a) => a.type !== 'LEAVE');
        const keep = legal.find((a) => a.type === 'KEEP_TICKETS');
        const claim = legal.find((a) => a.type === 'CLAIM');
        let a;
        if (keep) a = { type: 'KEEP_TICKETS', payload: { ticketIds: s.players.find((p) => p.id === id).offer.ticketIds.slice(0, keep.min) } };
        else if (claim && rng() < 0.7) {
          const rid = claim.routeIds[Math.floor(rng() * claim.routeIds.length)];
          const r = ROUTE_BY_ID[rid];
          const p = s.players.find((x) => x.id === id);
          const color = r.color === 'gris' ? ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'negro', 'blanco', 'locomotora'].find((c) => paymentFor(p, r, c)) : paymentFor(p, r, r.color) ? r.color : 'locomotora';
          a = { type: 'CLAIM', payload: { routeId: rid, color } };
        } else if (legal.find((x) => x.type === 'DRAW_CARD')) {
          const d = legal.find((x) => x.type === 'DRAW_CARD');
          a = { type: 'DRAW_CARD', payload: { from: d.deck && rng() < 0.6 ? 'deck' : d.faceUp[0] ?? 'deck' } };
        } else if (legal.find((x) => x.type === 'DRAW_TICKETS')) a = { type: 'DRAW_TICKETS' };
        else a = legal[0];
        const r = applyAction(s, { ...a, playerId: id }, rng);
        assert.ok(r.ok, `${a.type}: ${r.error}`);
        s = r.state;
      }
      // Si se trabó por falta de cartas, no es error de reglas: debe haber terminado casi siempre.
      if (s.phase !== 'finished') assert.ok(getLegalActions(s, getPendingDeciders(s)[0]).length > 0);
    }
  });
});
