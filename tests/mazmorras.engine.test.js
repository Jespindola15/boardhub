/**
 * Tests de Mazmorras y Traiciones.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, setup, getPlayerView, getPendingDeciders, getLegalActions, getResult, combatTotals, strength } from '../src/games/mazmorras/engine/index.js';
import { CARDS, DOOR_IDS, TREASURE_IDS } from '../src/games/mazmorras/data/cards.js';

function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 2 ** 32;
  };
}
const die = (...v) => {
  const q = [...v];
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
/** Partida con manos vacías, turno de p0. */
function game(n = 3) {
  const s = setup({ players: players(n), rng: seeded(2) });
  for (const p of s.players) p.hand = [];
  s.turnIndex = 0;
  s.turn = { step: 'start', soldDouble: false, kicked: null };
  return s;
}
const top = (s, id) => {
  s.doorDeck = s.doorDeck.filter((x) => x !== id);
  s.doorDeck.push(id);
};

describe('Material', () => {
  test('mazos de puertas y tesoros con cartas propias; 4 + 4 al empezar', () => {
    assert.ok(DOOR_IDS.length >= 60 && TREASURE_IDS.length >= 35);
    const s = setup({ players: players(4), rng: seeded(1) });
    assert.ok(s.players.every((p) => p.hand.length === 8 && p.level === 1));
    assert.throws(() => setup({ players: players(2) }));
  });
});

describe('Turno', () => {
  test('patear la puerta: monstruo → combate; ganar sube nivel y da tesoros', () => {
    let s = game();
    top(s, 'babosa-burocratica'); // nivel 1
    s.players[0].equipped = ['espada-de-plastico']; // 1 + 1 = 2 > 1
    s = act(s, 'KICK_DOOR', 'p0');
    assert.equal(s.turn.step, 'combat');
    assert.ok(combatTotals(s).winning);
    s = act(s, 'FIGHT', 'p0');
    assert.equal(s.players[0].level, 2);
    assert.equal(s.players[0].hand.length, 1);
    assert.equal(s.turn.step, 'end');
  });

  test('empate: pierde salvo el guerrero', () => {
    let s = game();
    top(s, 'babosa-burocratica');
    s = act(s, 'KICK_DOOR', 'p0');
    assert.equal(combatTotals(s).winning, false);
    assert.match(reject(s, 'FIGHT', 'p0'), /No te alcanza/);
    s.players[0].cls = 'clase-guerrero-1';
    assert.equal(combatTotals(s).winning, true);
  });

  test('huir: 5 o más en el dado; si no, la desgracia', () => {
    let s = game();
    top(s, 'rata-recaudadora');
    s.players[0].level = 3;
    s = act(s, 'KICK_DOOR', 'p0');
    s.combat.monsterBonus = 10;
    let fled = act(s, 'RUN', 'p0', {}, die(5));
    assert.equal(fled.players[0].level, 3);
    let caught = act(s, 'RUN', 'p0', {}, die(4));
    assert.equal(caught.players[0].level, 2);
    s.players[0].race = 'raza-elfo-1';
    fled = act(s, 'RUN', 'p0', {}, die(4)); // elfo +1
    assert.equal(fled.players[0].level, 3);
  });

  test('maldición al abrir la puerta se aplica a quien la abrió', () => {
    let s = game();
    top(s, 'maldicion-casco');
    s.players[0].equipped = ['casco-de-olla'];
    s = act(s, 'KICK_DOOR', 'p0');
    assert.deepEqual(s.players[0].equipped, []);
    assert.equal(s.turn.step, 'after-door');
    reject(s, 'END_TURN', 'p0');
    s = act(s, 'LOOT', 'p0');
    assert.equal(s.players[0].hand.length, 1);
  });

  test('buscar problemas con un monstruo de la mano', () => {
    let s = game();
    top(s, 'raza-elfo-1');
    s.players[0].hand = ['babosa-burocratica'];
    s = act(s, 'KICK_DOOR', 'p0');
    s = act(s, 'LOOK_FOR_TROUBLE', 'p0', { cardId: 'babosa-burocratica' });
    assert.equal(s.turn.step, 'combat');
  });

  test('equipo: zonas, manos y objetos grandes', () => {
    let s = game();
    s.players[0].hand = ['casco-de-olla', 'sombrero-con-pluma', 'hacha-gigante', 'espada-de-plastico', 'escalera-de-mano'];
    s = act(s, 'PLAY_CARD', 'p0', { cardId: 'casco-de-olla' });
    s = act(s, 'PLAY_CARD', 'p0', { cardId: 'sombrero-con-pluma' });
    assert.deepEqual(s.players[0].carried, ['sombrero-con-pluma']); // ya tiene casco
    s = act(s, 'PLAY_CARD', 'p0', { cardId: 'hacha-gigante' });
    s = act(s, 'PLAY_CARD', 'p0', { cardId: 'espada-de-plastico' });
    assert.ok(s.players[0].carried.includes('espada-de-plastico')); // manos ocupadas
    assert.match(reject(s, 'PLAY_CARD', 'p0', { cardId: 'escalera-de-mano' }), /grande/);
    assert.equal(strength(s.players[0]), 1 + 1 + 4);
  });

  test('vender: 1000 de oro por nivel, nunca hasta el 10', () => {
    let s = game();
    s.players[0].hand = ['cañon-portatil', 'armadura-de-placas-ruidosa'];
    s = act(s, 'SELL', 'p0', { cardIds: ['cañon-portatil', 'armadura-de-placas-ruidosa'] });
    assert.equal(s.players[0].level, 2);
    let t = game();
    t.players[0].level = 9;
    t.players[0].hand = ['cañon-portatil', 'armadura-de-placas-ruidosa'];
    assert.match(reject(t, 'SELL', 'p0', { cardIds: ['cañon-portatil', 'armadura-de-placas-ruidosa'] }), /nivel 10/);
  });

  test('ayuda: el ayudante suma su fuerza y se lleva los tesoros pactados; el elfo sube', () => {
    let s = game();
    top(s, 'gelatina-pegajosa'); // 3
    s = act(s, 'KICK_DOOR', 'p0');
    s.players[1].level = 3;
    s.players[1].race = 'raza-elfo-1';
    s = act(s, 'ASK_HELP', 'p0', { to: 'p1', treasures: 1 });
    assert.deepEqual(getPendingDeciders(s), ['p1']);
    s = act(s, 'ANSWER_HELP', 'p1', { accept: true });
    s = act(s, 'FIGHT', 'p0');
    assert.equal(s.players[0].level, 2);
    assert.equal(s.players[1].level, 4);
    assert.equal(s.players[1].hand.length, 1);
  });

  test('interferir: ventana para los demás; una carta obliga a volver a pelear', () => {
    let s = game();
    top(s, 'babosa-burocratica');
    s.players[0].level = 3;
    s.players[2].hand = ['pot-antiguo'];
    s = act(s, 'KICK_DOOR', 'p0');
    s = act(s, 'FIGHT', 'p0');
    assert.deepEqual(getPendingDeciders(s), ['p2']);
    s = act(s, 'PLAY_ENHANCER', 'p2', { cardId: 'pot-antiguo', monster: 0 });
    assert.equal(s.combat.window, null);
    assert.equal(combatTotals(s).winning, false);
    s = act(s, 'RUN', 'p0', {}, die(6));
    assert.equal(s.turn.step, 'end');
  });

  test('el nivel 10 sólo matando un monstruo; ahí se gana', () => {
    let s = game();
    s.players[0].level = 9;
    s.players[0].hand = ['sube-nivel-1'];
    assert.match(reject(s, 'PLAY_CARD', 'p0', { cardId: 'sube-nivel-1' }), /nivel 10/);
    top(s, 'babosa-burocratica');
    s = act(s, 'KICK_DOOR', 'p0');
    s = act(s, 'FIGHT', 'p0');
    assert.equal(s.phase, 'finished');
    assert.deepEqual(getResult(s).winners, ['p0']);
  });

  test('caridad: con más de 5 cartas se donan al de menor nivel', () => {
    let s = game();
    s.turn.step = 'end';
    s.players[0].level = 3;
    s.players[0].hand = TREASURE_IDS.slice(0, 7);
    s = act(s, 'END_TURN', 'p0');
    assert.equal(s.turn.step, 'charity');
    s = act(s, 'CHARITY', 'p0', { cardIds: TREASURE_IDS.slice(0, 2) });
    assert.equal(s.players[1].hand.length + s.players[2].hand.length, 2);
    assert.equal(s.players[s.turnIndex].id, 'p1');
  });

  test('muerte: se pierde todo menos nivel, raza y clase; cartas nuevas en el próximo turno', () => {
    let s = game();
    top(s, 'titan-del-tedio');
    s.players[0].level = 4;
    s.players[0].race = 'raza-enano-1';
    s.players[0].equipped = ['casco-de-olla'];
    s.players[0].hand = ['sube-nivel-1'];
    s = act(s, 'KICK_DOOR', 'p0');
    s = act(s, 'RUN', 'p0', {}, die(1));
    assert.equal(s.players[0].dead, true);
    assert.deepEqual(s.players[0].equipped, []);
    assert.equal(s.players[0].level, 4);
    assert.equal(s.players[0].race, 'raza-enano-1');
  });

  test('vista privada: no se ven manos ajenas', () => {
    const s = setup({ players: players(3), rng: seeded(6) });
    const v = getPlayerView(s, 'p0');
    assert.equal(v.players[1].hand, undefined);
    const json = JSON.stringify(v);
    for (const c of s.players[1].hand) if (!s.players[0].hand.includes(c)) assert.ok(!json.includes(`"${c}"`), c);
  });

  test('60 partidas aleatorias avanzan sin errores', () => {
    let finished = 0;
    for (let g = 0; g < 60; g++) {
      const rng = seeded(2000 + g);
      let s = setup({ players: players(3 + (g % 4)), rng });
      for (let k = 0; k < 4000 && s.phase !== 'finished'; k++) {
        const id = getPendingDeciders(s)[0];
        const p = s.players.find((x) => x.id === id);
        const legal = getLegalActions(s, id).filter((a) => a.type !== 'LEAVE');
        const has = (t) => legal.find((a) => a.type === t);
        let a;
        if (has('ANSWER_HELP')) a = { type: 'ANSWER_HELP', payload: { accept: rng() < 0.5 } };
        else if (has('PASS')) a = rng() < 0.2 && p.hand.some((c) => CARDS[c].kind === 'oneshot' && !CARDS[c].escape) ? { type: 'PLAY_ONESHOT', payload: { cardId: p.hand.find((c) => CARDS[c].kind === 'oneshot' && !CARDS[c].escape) ?? 'x', side: 'monsters' } } : { type: 'PASS' };
        else if (has('CHARITY')) a = { type: 'CHARITY', payload: { cardIds: p.hand.slice(0, has('CHARITY').count) } };
        else if (has('FIGHT')) a = { type: 'FIGHT' };
        else if (has('ASK_HELP') && rng() < 0.3) a = { type: 'ASK_HELP', payload: { to: s.players.find((x) => x.id !== id).id, treasures: 1 } };
        else if (has('RUN')) a = { type: 'RUN' };
        else if (has('KICK_DOOR')) {
          const item = p.hand.find((c) => ['item', 'race', 'class'].includes(CARDS[c].kind));
          a = item && rng() < 0.7 ? { type: 'PLAY_CARD', payload: { cardId: item } } : { type: 'KICK_DOOR' };
        } else if (has('LOOK_FOR_TROUBLE') && rng() < 0.3) a = { type: 'LOOK_FOR_TROUBLE', payload: { cardId: p.hand.find((c) => CARDS[c].kind === 'monster') } };
        else if (has('LOOT')) a = { type: 'LOOT' };
        else if (has('END_TURN')) a = { type: 'END_TURN' };
        else a = { type: legal[0].type };
        const r = applyAction(s, { ...a, playerId: id }, rng);
        if (!r.ok && a.type === 'PLAY_CARD') {
          s = applyAction(s, { type: 'KICK_DOOR', playerId: id }, rng).state ?? s;
          continue;
        }
        assert.ok(r.ok, `${a.type}: ${r.error}`);
        s = r.state;
        const all = s.doorDeck.length + s.treasureDeck.length + s.doorDiscard.length + s.treasureDiscard.length + s.players.reduce((t, x) => t + x.hand.length + x.equipped.length + x.carried.length + (x.race ? 1 : 0) + (x.cls ? 1 : 0), 0) + (s.combat ? s.combat.monsters.reduce((t, m) => t + 1 + m.enhancers.length, 0) : 0);
        assert.equal(all, DOOR_IDS.length + TREASURE_IDS.length, `cartas perdidas tras ${a.type}`);
      }
      if (s.phase === 'finished') finished++;
    }
    assert.ok(finished > 20, `terminaron ${finished}`);
  });
});
