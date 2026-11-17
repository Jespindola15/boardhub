import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, ACTIONS, createGameState, getActingPlayerId, isPlayable, topCard } from '../src/games/comodin/engine/index.js';

function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 2 ** 32; };
}
const players = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, colorId: 'violet' }));
const act = (s, type, playerId, payload) => {
  const r = applyAction(s, { type, playerId, payload }, seeded(3));
  assert.ok(r.ok, `${type}: ${r.error}`);
  return r.state;
};
/** Prepara una mesa controlada: carta arriba y manos dadas. */
function table(n, top, hands) {
  const s = createGameState({ players: players(n), rng: seeded(9) });
  s.discard = [top];
  s.currentColor = top.color;
  s.turnIndex = 0;
  s.direction = 1;
  s.awaitingColor = false;
  s.players.forEach((p, i) => (p.hand = hands[i]));
  return s;
}
let id = 1000;
const C = (color, kind, value = null) => ({ id: `t${id++}`, color, kind, value });

test('reparte 7 cartas a cada jugador y 108 en total', () => {
  const s = createGameState({ players: players(4), rng: seeded(1) });
  assert.ok(s.players.every((p) => p.hand.length >= 7));
  const total = s.drawPile.length + s.discard.length + s.players.reduce((t, p) => t + p.hand.length, 0);
  assert.equal(total, 108);
});

test('se juega por color o por número', () => {
  const s = table(2, C('red', 'number', 5), [[C('blue', 'number', 5), C('green', 'number', 1)], [C('red', 'number', 2)]]);
  assert.ok(isPlayable(s, s.players[0].hand[0]));
  assert.ok(!isPlayable(s, s.players[0].hand[1]));
  const r = applyAction(s, { type: ACTIONS.PLAY_CARD, playerId: 'p0', payload: { cardId: s.players[0].hand[1].id } });
  assert.equal(r.ok, false);
});

test('salto, reversa y roba dos', () => {
  let s = table(3, C('red', 'number', 1), [[C('red', 'skip'), C('red', 'number', 3)], [C('red', 'number', 4)], [C('red', 'draw2'), C('blue', 'number', 1)]]);
  s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
  assert.equal(s.turnIndex, 2);
  s = act(s, ACTIONS.PLAY_CARD, 'p2', { cardId: s.players[2].hand[0].id });
  assert.equal(s.players[0].hand.length, 3); // robó 2
  assert.equal(s.turnIndex, 1); // p0 saltado
  let r = table(3, C('red', 'number', 1), [[C('red', 'reverse'), C('red', 'number', 3)], [C('red', 'number', 4)], [C('blue', 'number', 1)]]);
  r = act(r, ACTIONS.PLAY_CARD, 'p0', { cardId: r.players[0].hand[0].id });
  assert.equal(r.turnIndex, 2);
});

test('con dos jugadores la reversa funciona como salto', () => {
  let s = table(2, C('red', 'number', 1), [[C('red', 'reverse'), C('red', 'number', 3)], [C('red', 'number', 4)]]);
  s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
  assert.equal(s.turnIndex, 0);
});

test('Roba Cuatro: aceptar, desafío ganado y desafío perdido', () => {
  const make = (extra) => table(3, C('red', 'number', 1), [[C(null, 'wild4'), extra], [C('green', 'number', 4)], [C('blue', 'number', 1)]]);
  // legal (no tenía rojo) → desafío perdido: la víctima roba 6
  let s = make(C('blue', 'number', 7));
  s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id, color: 'green' });
  assert.equal(getActingPlayerId(s), 'p1');
  s = act(s, ACTIONS.CHALLENGE_DRAW4, 'p1');
  assert.equal(s.players[1].hand.length, 7);
  assert.equal(s.turnIndex, 2);
  // ilegal (tenía rojo) → desafío ganado: el infractor roba 4 y la víctima juega
  let t = make(C('red', 'number', 7));
  t = act(t, ACTIONS.PLAY_CARD, 'p0', { cardId: t.players[0].hand[0].id, color: 'green' });
  t = act(t, ACTIONS.CHALLENGE_DRAW4, 'p1');
  assert.equal(t.players[0].hand.length, 5);
  assert.equal(t.turnIndex, 1);
  // aceptar
  let u = make(C('red', 'number', 7));
  u = act(u, ACTIONS.PLAY_CARD, 'p0', { cardId: u.players[0].hand[0].id, color: 'green' });
  u = act(u, ACTIONS.ACCEPT_DRAW4, 'p1');
  assert.equal(u.players[1].hand.length, 5);
  assert.equal(u.turnIndex, 2);
});

test('robar: si la carta sirve se puede jugar; si no, pasa el turno', () => {
  let s = table(2, C('red', 'number', 1), [[C('blue', 'number', 9)], [C('green', 'number', 2)]]);
  s.drawPile.push(C('red', 'number', 8));
  s = act(s, ACTIONS.DRAW_CARD, 'p0');
  assert.ok(s.drawnCardId);
  assert.equal(applyAction(s, { type: ACTIONS.PLAY_CARD, playerId: 'p0', payload: { cardId: s.players[0].hand[0].id } }).ok, false);
  s = act(s, ACTIONS.PASS, 'p0');
  assert.equal(s.turnIndex, 1);
  s.drawPile.push(C('yellow', 'number', 3));
  s = act(s, ACTIONS.DRAW_CARD, 'p1');
  assert.equal(s.turnIndex, 0);
});

test('no cantar «¡Comodín!» permite que te atrapen', () => {
  let s = table(3, C('red', 'number', 1), [[C('red', 'number', 2), C('red', 'number', 3)], [C('green', 'number', 4)], [C('blue', 'number', 1)]]);
  s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
  assert.equal(s.vulnerableId, 'p0');
  s = act(s, ACTIONS.CATCH, 'p2', { targetId: 'p0' });
  assert.equal(s.players[0].hand.length, 3);
  let t = table(2, C('red', 'number', 1), [[C('red', 'number', 2), C('red', 'number', 3)], [C('green', 'number', 4)]]);
  t = act(t, ACTIONS.PLAY_CARD, 'p0', { cardId: t.players[0].hand[0].id, callComodin: true });
  assert.equal(t.vulnerableId, null);
});

test('ganar la ronda suma los puntos de los rivales', () => {
  let s = table(3, C('red', 'number', 1), [[C('red', 'number', 2)], [C('green', 'skip'), C(null, 'wild')], [C('blue', 'number', 7)]]);
  s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
  assert.equal(s.phase, 'round-over');
  assert.equal(s.players[0].score, 20 + 50 + 7);
  s = act(s, ACTIONS.NEXT_ROUND, 'p0');
  assert.equal(s.round, 2);
  assert.equal(s.phase, 'playing');
});

test('partidas aleatorias completas conservan las 108 cartas', () => {
  for (let g = 0; g < 40; g++) {
    const rng = seeded(500 + g);
    let s = createGameState({ players: players(2 + (g % 9)), rng, targetScore: 200 });
    for (let k = 0; k < 4000 && s.phase !== 'finished'; k++) {
      let a;
      if (s.phase === 'round-over') a = { type: ACTIONS.NEXT_ROUND, playerId: s.players[0].id };
      else {
        const id = getActingPlayerId(s);
        const p = s.players.find((x) => x.id === id);
        if (s.awaitingColor) a = { type: ACTIONS.CHOOSE_COLOR, payload: { color: 'blue' } };
        else if (s.pendingDraw4) a = { type: rng() < 0.5 ? ACTIONS.ACCEPT_DRAW4 : ACTIONS.CHALLENGE_DRAW4 };
        else {
          const options = s.drawnCardId ? p.hand.filter((c) => c.id === s.drawnCardId) : p.hand.filter((c) => isPlayable(s, c));
          if (options.length) a = { type: ACTIONS.PLAY_CARD, payload: { cardId: options[0].id, color: 'red', callComodin: rng() < 0.7 } };
          else a = { type: s.drawnCardId ? ACTIONS.PASS : ACTIONS.DRAW_CARD };
        }
        a.playerId = id;
      }
      const r = applyAction(s, a, rng);
      assert.ok(r.ok, `${a.type}: ${r.error}`);
      s = r.state;
      if (s.vulnerableId && rng() < 0.3) {
        const catcher = s.players.find((x) => x.id !== s.vulnerableId);
        s = applyAction(s, { type: ACTIONS.CATCH, playerId: catcher.id, payload: { targetId: s.vulnerableId } }, rng).state;
      }
      const total = s.drawPile.length + s.discard.length + s.players.reduce((t, p) => t + p.hand.length, 0);
      assert.equal(total, 108);
      void topCard;
    }
    assert.equal(s.phase, 'finished', 'la partida debería terminar');
  }
});
