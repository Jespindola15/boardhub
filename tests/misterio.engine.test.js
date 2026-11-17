/**
 * Tests de Misterio (deducción clásica).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, setup, getPlayerView, getPendingDeciders, getLegalActions, getResult, destinations } from '../src/games/misterio/engine/index.js';
import { CARDS, ROOMS, SUSPECTS, WEAPONS, cellKind, cellKey, GRID } from '../src/games/misterio/data/board.js';

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
const reject = (s, type, playerId, payload) => {
  const r = applyAction(s, { type, playerId, payload }, seeded(3));
  assert.equal(r.ok, false, `${type} debía rechazarse`);
  return r.error;
};

describe('Material y plano', () => {
  test('21 cartas: 6 personajes, 6 armas, 9 habitaciones; sobre con una de cada', () => {
    assert.equal(CARDS.length, 21);
    const s = setup({ players: players(4), rng: seeded(2) });
    assert.ok(s.solution.suspect.startsWith('s:') && s.solution.weapon.startsWith('w:') && s.solution.room.startsWith('r:'));
    const dealt = s.players.flatMap((p) => p.cards);
    assert.equal(dealt.length, 18);
    assert.ok(!dealt.some((c) => Object.values(s.solution).includes(c)));
    assert.deepEqual(s.players.map((p) => p.cards.length).sort(), [4, 4, 5, 5]);
  });

  test('todas las puertas dan a un pasillo y todos los pasillos están conectados', () => {
    for (const r of ROOMS) for (const [inside, out] of r.doors) {
      assert.equal(cellKind(...inside), r.id);
      assert.equal(cellKind(...out), 'hall');
    }
    const halls = [];
    for (let x = 0; x < GRID; x++) for (let y = 0; y < GRID; y++) if (cellKind(x, y) === 'hall') halls.push(cellKey(x, y));
    const seen = new Set([halls[0]]);
    const q = [halls[0]];
    while (q.length) {
      const [x, y] = q.shift().split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = cellKey(x + dx, y + dy);
        if (cellKind(x + dx, y + dy) === 'hall' && !seen.has(k)) {
          seen.add(k);
          q.push(k);
        }
      }
    }
    assert.equal(seen.size, halls.length);
    for (const x of SUSPECTS) assert.equal(cellKind(...x.start), 'hall');
  });
});

describe('Turno', () => {
  test('tirar y moverse hasta la cantidad sacada; entrar a una habitación', () => {
    let s = setup({ players: players(3), rng: seeded(5) });
    s = act(s, 'ROLL', 'p0', {}, dice(3, 4));
    const d = destinations(s, 'carmin', 7);
    assert.ok(d.cells.size > 0);
    assert.ok(d.rooms.has('estudio') || d.rooms.has('vestibulo'));
    const room = [...d.rooms][0];
    s = act(s, 'MOVE', 'p0', { to: room });
    assert.equal(s.tokens.carmin.room, room);
    assert.equal(s.turn.step, 'suggest');
    reject(s, 'MOVE', 'p0', { to: room });
  });

  test('no se llega más lejos que la tirada', () => {
    let s = setup({ players: players(3), rng: seeded(5) });
    s = act(s, 'ROLL', 'p0', {}, dice(1, 1));
    assert.match(reject(s, 'MOVE', 'p0', { to: '7,10' }), /No llegás/);
  });

  test('pasaje secreto entre esquinas opuestas', () => {
    let s = setup({ players: players(3), rng: seeded(5) });
    s.tokens.carmin = { cell: null, room: 'estudio' };
    s = act(s, 'PASSAGE', 'p0');
    assert.equal(s.tokens.carmin.room, 'cocina');
  });

  test('sugerencia: trae al sospechoso y el arma; refuta el primero a la izquierda que pueda', () => {
    let s = setup({ players: players(3), rng: seeded(5) });
    s.tokens.carmin = { cell: null, room: 'estudio' };
    s.players[0].cards = [];
    s.players[1].cards = [];
    s.players[2].cards = ['s:ocre', 'w:cuerda'];
    s.turn.step = 'suggest';
    s = act(s, 'SUGGEST', 'p0', { suspect: 'ocre', weapon: 'cuerda' });
    assert.equal(s.tokens.ocre.room, 'estudio');
    assert.equal(s.weapons.cuerda, 'estudio');
    assert.equal(s.players[1].summoned, true); // p1 lleva al Barón Ocre
    assert.deepEqual(getPendingDeciders(s), ['p2']);
    reject(s, 'SHOW_CARD', 'p2', { cardId: 'r:salon' });
    s = act(s, 'SHOW_CARD', 'p2', { cardId: 'w:cuerda' });
    assert.deepEqual(s.players[0].seen, [{ card: 'w:cuerda', from: 'p2' }]);
    const v1 = getPlayerView(s, 'p1');
    assert.equal(v1.mySeen.length, 0);
    assert.ok(!JSON.stringify(v1).includes('"w:cuerda"') || v1.myCards.includes('w:cuerda'));
  });

  test('quien fue traído por una sugerencia puede quedarse y sugerir', () => {
    let s = setup({ players: players(3), rng: seeded(5) });
    s.tokens.carmin = { cell: null, room: 'estudio' };
    s.turn.step = 'suggest';
    s.players.forEach((p) => (p.cards = []));
    s = act(s, 'SUGGEST', 'p0', { suspect: 'ocre', weapon: 'cuerda' });
    s = act(s, 'END_TURN', 'p0');
    assert.ok(getLegalActions(s, 'p1').some((a) => a.type === 'STAY'));
    s = act(s, 'STAY', 'p1');
    assert.equal(s.turn.step, 'suggest');
  });

  test('acusación correcta gana; incorrecta queda afuera pero sigue refutando', () => {
    let s = setup({ players: players(3), rng: seeded(5) });
    const sol = { suspect: s.solution.suspect.slice(2), weapon: s.solution.weapon.slice(2), room: s.solution.room.slice(2) };
    const wrongRoom = ROOMS.find((r) => r.id !== sol.room).id;
    let t = act(s, 'ACCUSE', 'p0', { ...sol, room: wrongRoom });
    assert.equal(t.players[0].out, true);
    assert.equal(t.turnIndex, 1);
    t = act(t, 'ACCUSE', 'p1', sol);
    assert.equal(t.phase, 'finished');
    assert.deepEqual(getResult(t).winners, ['p1']);
    assert.ok(getPlayerView(t, 'p0').solution);
  });

  test('vista privada: no se ven cartas ajenas ni el sobre', () => {
    const s = setup({ players: players(4), rng: seeded(8) });
    const v = getPlayerView(s, 'p0');
    assert.equal(v.solution, null);
    const json = JSON.stringify(v);
    for (const c of [...s.players[1].cards, ...Object.values(s.solution)]) if (!s.players[0].cards.includes(c)) assert.ok(!json.includes(`"${c}"`), c);
  });

  test('60 partidas aleatorias terminan', () => {
    for (let g = 0; g < 60; g++) {
      const rng = seeded(40 + g);
      let s = setup({ players: players(3 + (g % 4)), rng });
      for (let k = 0; k < 3000 && s.phase !== 'finished'; k++) {
        const id = getPendingDeciders(s)[0];
        const legal = getLegalActions(s, id).filter((a) => a.type !== 'LEAVE');
        const has = (t) => legal.find((a) => a.type === t);
        let a;
        if (has('SHOW_CARD')) a = { type: 'SHOW_CARD', payload: { cardId: has('SHOW_CARD').cardIds[0] } };
        else if (has('SUGGEST')) a = { type: 'SUGGEST', payload: { suspect: SUSPECTS[Math.floor(rng() * 6)].id, weapon: WEAPONS[Math.floor(rng() * 6)].id } };
        else if (has('MOVE')) {
          const me = s.players.find((p) => p.id === id);
          const d = destinations(s, me.suspect, s.turn.roll);
          const rooms = [...d.rooms];
          const cells = [...d.cells];
          a = { type: 'MOVE', payload: { to: rooms.length ? rooms[0] : cells[Math.floor(rng() * cells.length)] } };
        } else if (has('ROLL')) a = has('PASSAGE') && rng() < 0.5 ? { type: 'PASSAGE' } : { type: 'ROLL' };
        else if (rng() < 0.05) {
          a = { type: 'ACCUSE', payload: { suspect: SUSPECTS[Math.floor(rng() * 6)].id, weapon: WEAPONS[Math.floor(rng() * 6)].id, room: ROOMS[Math.floor(rng() * 9)].id } };
        } else a = { type: 'END_TURN' };
        const r = applyAction(s, { ...a, playerId: id }, rng);
        assert.ok(r.ok, `${a.type}: ${r.error}`);
        s = r.state;
      }
      assert.equal(s.phase, 'finished');
    }
  });
});
