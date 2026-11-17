/**
 * Pruebas de integración del servidor autoritativo con clientes Socket.IO reales.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io as connect } from 'socket.io-client';
import { startServer } from '../server/index.js';

let server;
let url;
const sockets = [];

before(async () => {
  server = await startServer({ port: 0, dataFile: join(mkdtempSync(join(tmpdir(), 'bh-')), 'rooms.json'), rateLimit: 100000 });
  url = `http://localhost:${server.port}`;
});
after(async () => {
  sockets.forEach((s) => s.close());
  await server.close();
});

/** Cliente de prueba que recuerda la última vista y sala recibidas. */
function client() {
  const s = connect(url, { transports: ['websocket'], forceNew: true });
  sockets.push(s);
  s.lastView = null;
  s.lastRoom = null;
  s.on('game:view', (v) => (s.lastView = v));
  s.on('room:update', (r) => (s.lastRoom = r));
  s.call = (ev, payload) => new Promise((res) => s.emit(ev, payload, res));
  return s;
}
const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));

test('crear sala, unirse, empezar y recibir sólo la mano propia', async () => {
  const a = client();
  const b = client();
  const ra = await a.call('room:create', { gameId: 'ultima-carta', name: 'Ana', options: { scoring: 'winner' } });
  assert.ok(ra.ok, ra.error);
  assert.match(ra.code, /^[A-Z2-9]{6}$/);
  const rb = await b.call('room:join', { code: ra.code.toLowerCase(), name: 'Beto' });
  assert.ok(rb.ok, rb.error);
  assert.equal((await b.call('room:join', { code: ra.code, name: 'ana' })).ok, false); // nombre repetido
  assert.equal((await b.call('room:start', {})).ok, false); // sólo el anfitrión
  assert.ok((await a.call('room:start', {})).ok);
  await wait();
  assert.equal(a.lastRoom.status, 'playing');
  assert.ok(!JSON.stringify(a.lastRoom).includes(ra.token), 'la sala pública no expone tokens');

  const va = a.lastView;
  const vb = b.lastView;
  assert.equal(va.players.find((p) => p.id === ra.playerId).hand.length >= 7, true);
  assert.equal(va.players.find((p) => p.id === rb.playerId).hand, undefined);
  for (const c of va.players.find((p) => p.id === ra.playerId).hand) {
    if (!vb.discardTop.some((d) => d.id === c.id)) assert.ok(!JSON.stringify(vb).includes(`"${c.id}"`), 'B ve una carta de A');
  }
  assert.equal(typeof va.drawCount, 'number');
  assert.equal(va.drawPile, undefined);

  // fuera de turno + identidad: el servidor ignora el playerId del cliente
  const cur = va.currentPlayerId;
  const [turn, other] = cur === ra.playerId ? [a, b] : [b, a];
  const bad = await other.call('game:action', { clientActionId: 'x1', type: 'DRAW_CARD', playerId: cur });
  assert.equal(bad.ok, false);

  // si la carta inicial fue un comodín, primero elegir color
  if (turn.lastView.awaitingColor) assert.ok((await turn.call('game:action', { clientActionId: 'c0', type: 'CHOOSE_COLOR', payload: { color: 'red' } })).ok);

  // acción duplicada: se aplica una sola vez
  const before = turn.lastView.version;
  const r1 = await turn.call('game:action', { clientActionId: 'dup-1', type: 'DRAW_CARD' });
  const r2 = await turn.call('game:action', { clientActionId: 'dup-1', type: 'DRAW_CARD' });
  assert.ok(r1.ok, r1.error);
  assert.ok(r2.duplicate);
  await wait();
  assert.equal(turn.lastView.version, before + 1);

  // reconexión con el token
  const a2 = client();
  const res = await a2.call('room:resume', { code: ra.code, token: ra.token });
  assert.ok(res.ok);
  await wait();
  assert.equal(a2.lastView.me, ra.playerId);
  assert.equal((await client().call('room:resume', { code: ra.code, token: 'falso' })).ok, false);
});

test('partida completa por sockets hasta que alguien gana', async () => {
  const a = client();
  const b = client();
  const ra = await a.call('room:create', { gameId: 'ultima-carta', name: 'Uno', options: {} });
  await b.call('room:join', { code: ra.code, name: 'Dos' });
  await a.call('room:start', {});
  await wait();
  const byId = (id) => (a.lastView.me === id ? a : b);
  let n = 0;
  for (let k = 0; k < 6000; k++) {
    const v = a.lastView;
    if (v.phase === 'finished') break;
    if (v.phase === 'round-over') {
      await a.call('game:action', { clientActionId: `n${n++}`, type: 'NEXT_ROUND' });
      await wait(5);
      continue;
    }
    const s = byId(v.deciders[0]);
    const legal = s.lastView.legal.filter((x) => x.type !== 'LEAVE' && x.type !== 'CATCH');
    const play = legal.find((x) => x.type === 'PLAY_CARD');
    const pick = play ?? legal.find((x) => x.type === 'CHOOSE_COLOR' || x.type === 'ACCEPT_DRAW4') ?? legal[0];
    const payload = pick.type === 'PLAY_CARD' ? { cardId: pick.cardIds[0], color: 'green', announce: true } : pick.type === 'CHOOSE_COLOR' ? { color: 'red' } : {};
    const r = await s.call('game:action', { clientActionId: `a${n++}`, type: pick.type, payload });
    assert.ok(r.ok, `${pick.type}: ${r.error}`);
    await wait(3);
  }
  assert.equal(a.lastView.phase, 'finished');
  assert.equal(a.lastRoom.status, 'finished');
  assert.ok(a.lastView.winners.length >= 1);
});

test('salir durante la partida: el otro gana; el estado se guarda', async () => {
  const a = client();
  const b = client();
  const ra = await a.call('room:create', { gameId: 'ultima-carta', name: 'X', options: {} });
  await b.call('room:join', { code: ra.code, name: 'Y' });
  await a.call('room:start', {});
  await wait();
  assert.ok((await b.call('room:leave', {})).ok);
  await wait();
  assert.equal(a.lastView.phase, 'finished');
  assert.deepEqual(a.lastView.winners, [ra.playerId]);
  assert.ok(server.rooms.serialize().some((r) => r.code === ra.code));
});

test('Magnate en línea: vista sin orden de mazos, permisos y opciones de sala', async () => {
  const a = client();
  const b = client();
  const c = client();
  const ra = await a.call('room:create', { gameId: 'magnate', name: 'Ana', options: { skipPurchase: true } });
  assert.ok(ra.ok, ra.error);
  const rb = await b.call('room:join', { code: ra.code, name: 'Beto' });
  await c.call('room:join', { code: ra.code, name: 'Caro' });
  assert.equal((await b.call('room:options', { options: { skipPurchase: false } })).ok, false); // sólo el anfitrión
  assert.ok((await a.call('room:options', { options: { skipPurchase: true, hack: 1 } })).ok);
  await a.call('room:start', {});
  await wait();
  const v = a.lastView;
  assert.equal(v.me, ra.playerId);
  assert.equal(typeof v.decks.chance, 'number');
  assert.equal(typeof v.decks.community, 'number');
  assert.deepEqual(v.options, { skipPurchase: true });
  assert.equal(v.players.length, 3);
  // fuera de turno
  const cur = v.turn.playerId;
  const notCur = [a, b, c].find((s) => s.lastView.me !== cur);
  const r = await notCur.call('game:action', { clientActionId: 'm1', type: 'ROLL_DICE', expectedVersion: notCur.lastView.version });
  assert.equal(r.ok, false);
  // el jugador del turno tira
  const turn = [a, b, c].find((s) => s.lastView.me === cur);
  const r2 = await turn.call('game:action', { clientActionId: 'm2', type: 'ROLL_DICE', expectedVersion: turn.lastView.version });
  assert.ok(r2.ok, r2.error);
  await wait();
  assert.ok([a, b, c].every((s) => s.lastView.version === turn.lastView.version), 'todos sincronizados en la misma versión');
  void rb;
});

test('sincronización: dos pujas simultáneas sobre la misma versión → sólo una se aplica', async () => {
  const a = client();
  const b = client();
  const ra = await a.call('room:create', { gameId: 'magnate', name: 'P1', options: {} });
  const rb = await b.call('room:join', { code: ra.code, name: 'P2' });
  await a.call('room:start', {});
  await wait();
  // Preparar una subasta abierta directamente en el estado del servidor.
  const room = server.rooms.get(ra.code);
  room.state.auction = { kind: 'property', index: 5, highBid: 0, highBidderId: null, participants: [ra.playerId, rb.playerId], passed: [] };
  await a.call('sync', {});
  await b.call('sync', {});
  await wait();
  const ver = a.lastView.version;
  const [x, y] = await Promise.all([
    a.call('game:action', { clientActionId: 's1', type: 'PLACE_BID', payload: { amount: 50 }, expectedVersion: ver }),
    b.call('game:action', { clientActionId: 's2', type: 'PLACE_BID', payload: { amount: 50 }, expectedVersion: ver }),
  ]);
  assert.equal([x, y].filter((r) => r.ok).length, 1);
  assert.ok([x, y].some((r) => r.stale));
  await wait();
  assert.equal(a.lastView.auction.highBid, 50);
  assert.equal(a.lastView.version, b.lastView.version);
});

test('límite de frecuencia: responde con error en lugar de colgarse', async () => {
  const limited = await startServer({ port: 0, dataFile: null, rateLimit: 5 });
  const s = connect(`http://localhost:${limited.port}`, { transports: ['websocket'], forceNew: true });
  const call = (ev, p) => new Promise((res) => s.emit(ev, p, res));
  const results = await Promise.all(Array.from({ length: 8 }, () => call('room:join', { code: 'ZZZZZZ', name: 'x' })));
  assert.ok(results.some((r) => /Demasiadas/.test(r.error)));
  s.close();
  await limited.close();
});
