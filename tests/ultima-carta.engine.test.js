/**
 * Tests del motor de Última Carta frente a la hoja Mattel 41001-0925.
 * Ejecutar: npm test
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction, ACTIONS, setup, getPlayerView, getLegalActions, getPendingDeciders, getResult, isPlayable, MISSED_CALL_PENALTY,
} from '../src/games/ultima-carta/engine/index.js';
import { buildDeck, cardPoints, DECK_SIZE } from '../src/games/ultima-carta/data/cards.js';

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
  assert.equal(r.ok, false, `${type} (${playerId}) debía rechazarse`);
  return r.error;
};
let uid = 1000;
const C = (color, kind, value = null) => ({ id: `t${uid++}`, color, kind, value });
const total = (s) => s.drawPile.length + s.discard.length + s.players.reduce((t, p) => t + p.hand.length, 0);

/** Mesa controlada: carta arriba, manos dadas, turno del jugador 0. */
function table(n, top, hands, opts = {}) {
  const s = setup({ players: players(n), rng: seeded(9), options: opts });
  s.discard = [top];
  s.currentColor = top.color ?? 'red';
  s.turnIndex = 0;
  s.dealerIndex = n - 1;
  s.direction = 1;
  s.awaitingColor = false;
  s.players.forEach((p, i) => (p.hand = hands[i]));
  s.drawPile = buildDeck().slice(0, 40);
  return s;
}

describe('Mazo y preparación', () => {
  test('108 cartas de juego con la composición de la edición', () => {
    const d = buildDeck();
    assert.equal(d.length, DECK_SIZE);
    for (const color of ['red', 'yellow', 'green', 'blue']) {
      const c = d.filter((x) => x.color === color);
      assert.equal(c.filter((x) => x.kind === 'number').length, 19);
      assert.equal(c.filter((x) => x.kind === 'number' && x.value === 0).length, 1);
      for (const k of ['skip', 'reverse', 'draw2']) assert.equal(c.filter((x) => x.kind === k).length, 2);
    }
    assert.equal(d.filter((x) => x.kind === 'wild').length, 4);
    assert.equal(d.filter((x) => x.kind === 'wild4').length, 4);
  });

  test('puntos: número = valor, acción = 20, comodines = 50', () => {
    assert.equal(cardPoints(C('red', 'number', 7)), 7);
    for (const k of ['skip', 'reverse', 'draw2']) assert.equal(cardPoints(C('red', k)), 20);
    assert.equal(cardPoints(C(null, 'wild')), 50);
    assert.equal(cardPoints(C(null, 'wild4')), 50);
  });

  test('2 a 8 jugadores, 7 cartas, mazo completo y repartidor elegido', () => {
    assert.throws(() => setup({ players: players(1) }));
    assert.throws(() => setup({ players: players(9) }));
    for (let n = 2; n <= 8; n++) {
      const s = setup({ players: players(n), rng: seeded(n) });
      assert.equal(total(s), 108);
      assert.ok(s.log[0].text.startsWith('Para repartir'));
      assert.ok(s.discard[0].kind !== 'wild4');
    }
  });

  test('la primera carta nunca es un Roba Cuatro; con Comodín el primer jugador elige color', () => {
    for (let k = 0; k < 300; k++) {
      const s = setup({ players: players(3), rng: seeded(k + 1) });
      assert.notEqual(s.discard[0].kind, 'wild4');
      if (s.discard[0].kind === 'wild') {
        assert.ok(s.awaitingColor);
        const first = s.players[s.turnIndex].id;
        assert.deepEqual(getLegalActions(s, first).map((a) => a.type), ['CHOOSE_COLOR', 'LEAVE']);
        const t = act(s, ACTIONS.CHOOSE_COLOR, first, { color: 'green' });
        assert.equal(t.currentColor, 'green');
        return;
      }
    }
    assert.fail('no apareció un comodín inicial en 300 mezclas');
  });

  test('Reversa inicial: empieza el repartidor y se sigue hacia la derecha', () => {
    for (let k = 0; k < 500; k++) {
      const s = setup({ players: players(4), rng: seeded(k + 1) });
      if (s.discard[0].kind === 'reverse') {
        assert.equal(s.turnIndex, s.dealerIndex);
        assert.equal(s.direction, -1);
        return;
      }
    }
    assert.fail('no apareció una reversa inicial');
  });

  test('Salto inicial salta al de la izquierda del repartidor; Roba Dos inicial le hace robar 2', () => {
    let seenSkip = false;
    let seenDraw = false;
    for (let k = 0; k < 800 && !(seenSkip && seenDraw); k++) {
      const s = setup({ players: players(4), rng: seeded(k + 1) });
      const left = (s.dealerIndex + 1) % 4;
      if (s.discard[0].kind === 'skip') {
        seenSkip = true;
        assert.equal(s.turnIndex, (left + 1) % 4);
      }
      if (s.discard[0].kind === 'draw2') {
        seenDraw = true;
        assert.equal(s.players[left].hand.length, 9);
        assert.equal(s.turnIndex, (left + 1) % 4);
      }
    }
    assert.ok(seenSkip && seenDraw);
  });
});

describe('Jugar y robar', () => {
  test('coincidencia por color, número o símbolo', () => {
    const s = table(2, C('red', 'number', 5), [[C('blue', 'number', 5), C('green', 'number', 1), C('red', 'skip')], [C('red', 'number', 2)]]);
    assert.ok(isPlayable(s, s.players[0].hand[0]));
    assert.ok(!isPlayable(s, s.players[0].hand[1]));
    assert.ok(isPlayable(s, s.players[0].hand[2]));
    reject(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[1].id });
    const t = table(2, C('green', 'skip'), [[C('blue', 'skip'), C('blue', 'number', 1)], [C('red', 'number', 2)]]);
    assert.ok(isPlayable(t, t.players[0].hand[0]));
  });

  test('una sola carta por turno (no se tiran varias iguales)', () => {
    let s = table(3, C('red', 'number', 5), [[C('blue', 'number', 5), C('green', 'number', 5), C('red', 'number', 1)], [C('red', 'number', 2)], [C('red', 'number', 3)]]);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    reject(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
  });

  test('renunciar: se puede robar teniendo una jugable y sólo jugar la robada', () => {
    let s = table(2, C('red', 'number', 1), [[C('red', 'number', 9), C('blue', 'number', 3)], [C('green', 'number', 2)]]);
    s.drawPile.push(C('red', 'number', 8));
    s = act(s, ACTIONS.DRAW_CARD, 'p0');
    assert.ok(s.drawnCardId);
    reject(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.drawnCardId });
    assert.equal(s.turnIndex, 1);
  });

  test('robar una carta no jugable pasa el turno; tras una jugable se puede pasar', () => {
    let s = table(2, C('red', 'number', 1), [[C('blue', 'number', 9)], [C('green', 'number', 2)]]);
    s.drawPile.push(C('yellow', 'number', 3));
    s = act(s, ACTIONS.DRAW_CARD, 'p0');
    assert.equal(s.turnIndex, 1);
    s.drawPile.push(C('red', 'number', 3));
    s.currentColor = 'red';
    s = act(s, ACTIONS.DRAW_CARD, 'p1');
    s = act(s, ACTIONS.PASS, 'p1');
    assert.equal(s.turnIndex, 0);
    reject(s, ACTIONS.PASS, 'p0');
  });

  test('robo sin cartas: se baraja el descarte; si tampoco hay, el turno pasa', () => {
    let s = table(2, C('red', 'number', 1), [[C('blue', 'number', 9)], [C('green', 'number', 2)]]);
    s.drawPile = [];
    s.discard = [C('yellow', 'number', 4), C('yellow', 'number', 6), C('red', 'number', 1)];
    s = act(s, ACTIONS.DRAW_CARD, 'p0');
    assert.equal(s.discard.length, 1);
    assert.equal(s.players[0].hand.length, 2);
    let t = table(2, C('red', 'number', 1), [[C('blue', 'number', 9)], [C('green', 'number', 2)]]);
    t.drawPile = [];
    t = act(t, ACTIONS.DRAW_CARD, 'p0');
    assert.equal(t.players[0].hand.length, 1);
    assert.equal(t.turnIndex, 1);
  });

  test('no hay acumulación: con un Roba Dos encima el siguiente roba, no responde', () => {
    let s = table(3, C('red', 'number', 1), [[C('red', 'draw2'), C('red', 'number', 3)], [C('blue', 'draw2'), C('green', 'number', 1)], [C('red', 'number', 3)]]);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    assert.equal(s.players[1].hand.length, 4);
    assert.equal(s.turnIndex, 2);
    reject(s, ACTIONS.PLAY_CARD, 'p1', { cardId: s.players[1].hand[0].id });
  });
});

describe('Cartas especiales', () => {
  test('Salto, Reversa y Roba Dos con 3 jugadores', () => {
    let s = table(3, C('red', 'number', 1), [[C('red', 'skip'), C('red', 'number', 3)], [C('red', 'number', 4)], [C('red', 'draw2'), C('blue', 'number', 1)]]);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    assert.equal(s.turnIndex, 2);
    s = act(s, ACTIONS.PLAY_CARD, 'p2', { cardId: s.players[2].hand[0].id });
    assert.equal(s.players[0].hand.length, 3);
    assert.equal(s.turnIndex, 1);
    let r = table(3, C('red', 'number', 1), [[C('red', 'reverse'), C('red', 'number', 3)], [C('red', 'number', 4)], [C('blue', 'number', 1)]]);
    r = act(r, ACTIONS.PLAY_CARD, 'p0', { cardId: r.players[0].hand[0].id });
    assert.equal(r.direction, -1);
    assert.equal(r.turnIndex, 2);
  });

  test('2 jugadores: Reversa y Salto hacen volver a jugar; Roba Dos y +4 también', () => {
    let s = table(2, C('red', 'number', 1), [[C('red', 'reverse'), C('red', 'skip'), C('red', 'draw2'), C(null, 'wild4'), C('red', 'number', 9)], [C('green', 'number', 4)]]);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    assert.equal(s.turnIndex, 0);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    assert.equal(s.turnIndex, 0);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    assert.equal(s.players[1].hand.length, 3);
    assert.equal(s.turnIndex, 0);
    s.players[0].hand = s.players[0].hand.filter((c) => c.kind !== 'number'); // sin rojas: +4 legal
    s.players[0].hand.push(C('blue', 'number', 2));
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id, color: 'blue' });
    s = act(s, ACTIONS.ACCEPT_DRAW4, 'p1');
    assert.equal(s.players[1].hand.length, 7);
    assert.equal(s.turnIndex, 0);
  });

  test('comodines: exigen color, se juegan sobre cualquier carta aunque haya otras jugables', () => {
    let s = table(3, C('red', 'number', 1), [[C(null, 'wild'), C('red', 'number', 3)], [C('red', 'number', 4)], [C('blue', 'number', 1)]]);
    reject(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id, color: 'red' });
    assert.equal(s.currentColor, 'red'); // puede repetir el color
  });

  test('+4: se puede jugar con cartas del mismo número de otro color (legal)', () => {
    let s = table(3, C('red', 'number', 5), [[C(null, 'wild4'), C('blue', 'number', 5)], [C('red', 'number', 4)], [C('blue', 'number', 1)]]);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id, color: 'green' });
    s = act(s, ACTIONS.CHALLENGE_DRAW4, 'p1');
    assert.equal(s.players[1].hand.length, 7); // desafío incorrecto: 1 + 6
    assert.equal(s.turnIndex, 2);
  });

  test('+4: desafío correcto (tenía el color) — el infractor roba 4 y la víctima juega', () => {
    let s = table(3, C('red', 'number', 5), [[C(null, 'wild4'), C('red', 'number', 8)], [C('green', 'number', 4)], [C('blue', 'number', 1)]]);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id, color: 'green' });
    assert.deepEqual(getPendingDeciders(s), ['p1']);
    reject(s, ACTIONS.CHALLENGE_DRAW4, 'p2'); // sólo la víctima
    s = act(s, ACTIONS.CHALLENGE_DRAW4, 'p1');
    assert.equal(s.players[0].hand.length, 5);
    assert.equal(s.players[1].hand.length, 1);
    assert.equal(s.turnIndex, 1);
    // la mano se muestra sólo a quien desafió
    assert.equal(getPlayerView(s, 'p1').reveal.ofId, 'p0');
    assert.equal(getPlayerView(s, 'p2').reveal, null);
    s = act(s, ACTIONS.PLAY_CARD, 'p1', { cardId: s.players[1].hand[0].id });
    assert.equal(getPlayerView(s, 'p1').reveal, null);
  });

  test('+4: aceptar — roba 4 y pierde el turno', () => {
    let s = table(3, C('red', 'number', 5), [[C(null, 'wild4'), C('red', 'number', 8)], [C('green', 'number', 4)], [C('blue', 'number', 1)]]);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id, color: 'green' });
    reject(s, ACTIONS.DRAW_CARD, 'p1');
    s = act(s, ACTIONS.ACCEPT_DRAW4, 'p1');
    assert.equal(s.players[1].hand.length, 5);
    assert.equal(s.turnIndex, 2);
  });
});

describe('«¡Última carta!» y penalizaciones', () => {
  const two = () => table(3, C('red', 'number', 1), [[C('red', 'number', 2), C('red', 'number', 3)], [C('green', 'number', 4)], [C('blue', 'number', 1)]]);

  test('sin anunciar, otro jugador lo atrapa: roba 4', () => {
    let s = two();
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    assert.equal(s.vulnerableId, 'p0');
    reject(s, ACTIONS.CATCH, 'p0', { targetId: 'p0' });
    s = act(s, ACTIONS.CATCH, 'p2', { targetId: 'p0' });
    assert.equal(s.players[0].hand.length, 1 + MISSED_CALL_PENALTY);
    reject(s, ACTIONS.CATCH, 'p1', { targetId: 'p0' }); // no dos veces
  });

  test('anunciar al jugar o antes de que lo atrapen evita la penalización', () => {
    let s = two();
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id, announce: true });
    assert.equal(s.vulnerableId, null);
    let t = two();
    t = act(t, ACTIONS.PLAY_CARD, 'p0', { cardId: t.players[0].hand[0].id });
    t = act(t, ACTIONS.CALL_LAST_CARD, 'p0');
    reject(t, ACTIONS.CATCH, 'p2', { targetId: 'p0' });
  });

  test('cuando el siguiente empieza su turno ya no se puede atrapar', () => {
    let s = two();
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    s = act(s, ACTIONS.DRAW_CARD, 'p1');
    reject(s, ACTIONS.CATCH, 'p2', { targetId: 'p0' });
  });
});

describe('Fin de mano, puntuación y victoria', () => {
  test('ganar con un Roba Dos: el siguiente roba y esas cartas cuentan', () => {
    let s = table(3, C('red', 'number', 1), [[C('red', 'draw2')], [C('green', 'number', 4)], [C('blue', 'number', 1)]]);
    s.drawPile.push(C('yellow', 'number', 9), C('yellow', 'skip'));
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    assert.equal(s.phase, 'round-over');
    assert.equal(s.players[0].score, 4 + 9 + 20 + 1);
  });

  test('ganar con un Roba Cuatro: el siguiente roba 4 sin desafío', () => {
    let s = table(3, C('red', 'number', 1), [[C(null, 'wild4')], [C('green', 'number', 4)], [C('blue', 'number', 1)]]);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id, color: 'blue' });
    assert.equal(s.phase, 'round-over');
    assert.equal(s.players[1].hand.length, 5);
    assert.equal(s.pendingDraw4, null);
  });

  test('método principal: gana quien llega a 500 sumando las manos rivales', () => {
    let s = table(2, C('red', 'number', 1), [[C('red', 'number', 2)], [C(null, 'wild')]]);
    s.players[0].score = 460;
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    assert.equal(s.phase, 'finished');
    assert.deepEqual(getResult(s).winners, ['p0']);
    reject(s, ACTIONS.NEXT_ROUND, 'p0');
  });

  test('método alternativo: cada uno suma su mano y al llegar alguien a 500 gana el que menos tiene', () => {
    let s = table(3, C('red', 'number', 1), [[C('red', 'number', 2)], [C(null, 'wild')], [C('blue', 'number', 3)]], { scoring: 'low' });
    s.players[1].score = 470;
    s.players[2].score = 100;
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    assert.equal(s.players[0].score, 0);
    assert.equal(s.players[1].score, 520);
    assert.equal(s.players[2].score, 103);
    assert.deepEqual(getResult(s).winners, ['p0']);
  });

  test('nueva mano: reparte el siguiente', () => {
    let s = table(3, C('red', 'number', 1), [[C('red', 'number', 2)], [C('green', 'number', 4)], [C('blue', 'number', 1)]]);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id });
    const dealer = s.dealerIndex;
    s = act(s, ACTIONS.NEXT_ROUND, 'p1');
    assert.equal(s.dealerIndex, (dealer + 1) % 3);
    assert.equal(s.round, 2);
    assert.equal(total(s), 108);
  });
});

describe('Información privada y robustez', () => {
  test('la vista no incluye manos ajenas, el mazo ni si el +4 fue ilegal', () => {
    let s = setup({ players: players(4), rng: seeded(11) });
    const v = getPlayerView(s, 'p1');
    const json = JSON.stringify(v);
    for (const p of s.players.filter((x) => x.id !== 'p1')) {
      assert.equal(v.players.find((x) => x.id === p.id).hand, undefined);
      for (const c of p.hand) if (!s.discard.some((d) => d.id === c.id) && !s.players[1].hand.some((h) => h.id === c.id)) assert.ok(!json.includes(`"${c.id}"`), 'filtra una carta ajena');
    }
    for (const c of s.drawPile) assert.ok(!json.includes(`"${c.id}"`), 'filtra una carta del mazo');
    assert.equal(v.players.find((x) => x.id === 'p1').hand.length, s.players[1].hand.length);
    s = table(3, C('red', 'number', 5), [[C(null, 'wild4'), C('red', 'number', 8)], [C('green', 'number', 4)], [C('blue', 'number', 1)]]);
    s = act(s, ACTIONS.PLAY_CARD, 'p0', { cardId: s.players[0].hand[0].id, color: 'green' });
    assert.ok(!('illegal' in getPlayerView(s, 'p1').pendingDraw4));
  });

  test('abandonar: la mano vuelve al mazo y el juego sigue; con uno solo, termina', () => {
    let s = setup({ players: players(3), rng: seeded(4) });
    const cur = s.players[s.turnIndex].id;
    s = act(s, ACTIONS.LEAVE, cur);
    assert.equal(total(s), 108);
    assert.notEqual(s.players[s.turnIndex].id, cur);
    const other = s.players.find((p) => !p.left && p.id !== s.players[s.turnIndex].id);
    s = act(s, ACTIONS.LEAVE, other.id);
    assert.equal(s.phase, 'finished');
  });

  test('100 partidas aleatorias completas (2–8 jugadores) conservan las 108 cartas y terminan', () => {
    for (let g = 0; g < 100; g++) {
      const rng = seeded(500 + g);
      let s = setup({ players: players(2 + (g % 7)), rng, options: { scoring: g % 2 ? 'low' : 'winner' } });
      for (let k = 0; k < 20000 && s.phase !== 'finished'; k++) {
        const deciders = getPendingDeciders(s);
        const id = deciders[Math.floor(rng() * deciders.length)];
        const legal = getLegalActions(s, id).filter((a) => a.type !== 'LEAVE');
        // juega casi siempre que puede; a veces renuncia, desafía o pasa
        const play = legal.find((x) => x.type === 'PLAY_CARD');
        const a = play && rng() < 0.9 ? play : legal[Math.floor(rng() * legal.length)];
        let action;
        if (a.type === 'PLAY_CARD') action = { type: a.type, payload: { cardId: a.cardIds[Math.floor(rng() * a.cardIds.length)], color: 'blue', announce: rng() < 0.7 } };
        else if (a.type === 'CATCH') action = { type: a.type, payload: { targetId: a.targetId } };
        else if (a.type === 'CHOOSE_COLOR') action = { type: a.type, payload: { color: 'red' } };
        else action = { type: a.type };
        const r = applyAction(s, { ...action, playerId: id }, rng);
        assert.ok(r.ok, `${action.type}: ${r.error}`);
        s = r.state;
        assert.equal(total(s), 108);
        // atrapar a veces fuera de orden (otro jugador)
        if (s.vulnerableId && rng() < 0.3) {
          const c = s.players.find((p) => p.id !== s.vulnerableId);
          s = applyAction(s, { type: 'CATCH', playerId: c.id, payload: { targetId: s.vulnerableId } }, rng).state;
        }
      }
      assert.equal(s.phase, 'finished', `la partida ${g} no terminó`);
    }
  });
});
