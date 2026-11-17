/**
 * Integración del servidor Node (mismo núcleo y protocolo que el Worker de Cloudflare)
 * con clientes WebSocket reales.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../server/index.js';
import { makeClient, wait } from './helpers/wsclient.js';

// Con BOARDHUB_URL (p. ej. el Worker en `wrangler dev`) las pruebas corren contra ese servidor.
const external = process.env.BOARDHUB_URL;
let server;
let api;

before(async () => {
  if (external) {
    api = makeClient(external);
    return;
  }
  server = await startServer({ port: 0, dataFile: join(mkdtempSync(join(tmpdir(), 'bh-')), 'rooms.json'), rateLimit: 100000 });
  api = makeClient(`http://localhost:${server.port}`);
});
after(async () => {
  api.closeAll();
  await server?.close();
});

test('crear sala, unirse, empezar y recibir sólo la mano propia', async () => {
  const A = await api.host('ultima-carta', 'Ana', { scoring: 'winner' });
  assert.ok(A.ok && A.resumed.ok, A.error);
  assert.match(A.code, /^[A-Z2-9]{6}$/);
  const b = api.client(A.code);
  const rb = await b.call('room:join', { name: 'Beto' });
  assert.ok(rb.ok, rb.error);
  assert.equal((await api.client(A.code).call('room:join', { name: 'ana' })).ok, false);
  assert.equal((await b.call('room:start')).ok, false);
  assert.ok((await A.c.call('room:start')).ok);
  await wait();
  const a = A.c;
  assert.equal(a.lastRoom.status, 'playing');
  assert.ok(!JSON.stringify(a.lastRoom).includes(A.token), 'la sala pública no expone tokens');

  const va = a.lastView;
  const vb = b.lastView;
  assert.ok(va.players.find((p) => p.id === A.playerId).hand.length >= 7);
  assert.equal(va.players.find((p) => p.id === rb.playerId).hand, undefined);
  for (const c of va.players.find((p) => p.id === A.playerId).hand)
    if (!vb.discardTop.some((d) => d.id === c.id)) assert.ok(!JSON.stringify(vb).includes(`"${c.id}"`), 'B ve una carta de A');

  const cur = va.currentPlayerId;
  const [turn, other] = cur === A.playerId ? [a, b] : [b, a];
  assert.equal((await other.call('game:action', { clientActionId: 'x1', type: 'DRAW_CARD', playerId: cur })).ok, false);
  if (turn.lastView.awaitingColor) assert.ok((await turn.call('game:action', { clientActionId: 'c0', type: 'CHOOSE_COLOR', payload: { color: 'red' } })).ok);
  await wait();
  const before = turn.lastView.version;
  const r1 = await turn.call('game:action', { clientActionId: 'dup-1', type: 'DRAW_CARD' });
  const r2 = await turn.call('game:action', { clientActionId: 'dup-1', type: 'DRAW_CARD' });
  assert.ok(r1.ok, r1.error);
  assert.ok(r2.duplicate);
  await wait();
  assert.equal(turn.lastView.version, before + 1);

  const a2 = api.client(A.code);
  assert.ok((await a2.call('room:resume', { token: A.token })).ok);
  await wait();
  assert.equal(a2.lastView.me, A.playerId);
  assert.equal((await api.client(A.code).call('room:resume', { token: 'falso' })).ok, false);
});

test('sala inexistente: el servidor lo avisa y cierra', async () => {
  const c = api.client('ZZZZZZ');
  await wait(150);
  assert.ok(c.events.includes('room:missing'));
});

test('partida completa de Última Carta por WebSocket hasta que alguien gana', async () => {
  const A = await api.host('ultima-carta', 'Uno');
  const b = api.client(A.code);
  await b.call('room:join', { name: 'Dos' });
  await A.c.call('room:start');
  await wait();
  const a = A.c;
  const byId = (id) => (a.lastView.me === id ? a : b);
  /** Espera a que ambos clientes vean la misma versión, posterior a `v`. */
  const synced = async (v) => {
    for (let i = 0; i < 200 && !(a.lastView.version > v && a.lastView.version === b.lastView.version); i++) await wait(2);
  };
  let n = 0;
  for (let k = 0; k < 6000; k++) {
    const v = a.lastView;
    if (v.phase === 'finished') break;
    if (v.phase === 'round-over') {
      const v0 = a.lastView.version;
      await a.call('game:action', { clientActionId: `n${n++}`, type: 'NEXT_ROUND' });
      await synced(v0);
      continue;
    }
    const s = byId(v.deciders[0]);
    const legal = s.lastView.legal.filter((x) => x.type !== 'LEAVE' && x.type !== 'CATCH');
    const play = legal.find((x) => x.type === 'PLAY_CARD');
    const pick = play ?? legal.find((x) => x.type === 'CHOOSE_COLOR' || x.type === 'ACCEPT_DRAW4') ?? legal[0];
    const payload = pick.type === 'PLAY_CARD' ? { cardId: pick.cardIds[0], color: 'green', announce: true } : pick.type === 'CHOOSE_COLOR' ? { color: 'red' } : {};
    const v0 = a.lastView.version;
    const r = await s.call('game:action', { clientActionId: `a${n++}`, type: pick.type, payload });
    assert.ok(r.ok, `${pick.type}: ${r.error}`);
    await synced(v0);
  }
  assert.equal(a.lastView.phase, 'finished');
  assert.equal(a.lastRoom.status, 'finished');
});

test('salir durante la partida: el otro gana; el estado se guarda', async () => {
  const A = await api.host('ultima-carta', 'X');
  const b = api.client(A.code);
  await b.call('room:join', { name: 'Y' });
  await A.c.call('room:start');
  await wait();
  assert.ok((await b.call('room:leave')).ok);
  await wait();
  assert.equal(A.c.lastView.phase, 'finished');
  assert.deepEqual(A.c.lastView.winners, [A.playerId]);
  if (server) assert.ok(server.rooms.has(A.code));
});

test('Magnate en línea: vista sin orden de mazos, permisos, opciones y sincronización', async () => {
  const A = await api.host('magnate', 'Ana', { skipPurchase: true });
  const b = api.client(A.code);
  const c = api.client(A.code);
  await b.call('room:join', { name: 'Beto' });
  await c.call('room:join', { name: 'Caro' });
  assert.equal((await b.call('room:options', { options: { skipPurchase: false } })).ok, false);
  assert.ok((await A.c.call('room:options', { options: { skipPurchase: true, hack: 1 } })).ok);
  await A.c.call('room:start');
  await wait();
  const all = [A.c, b, c];
  const v = A.c.lastView;
  assert.equal(typeof v.decks.chance, 'number');
  assert.deepEqual(v.options, { skipPurchase: true });
  const cur = v.turn.playerId;
  const notCur = all.find((s) => s.lastView.me !== cur);
  assert.equal((await notCur.call('game:action', { clientActionId: 'm1', type: 'ROLL_DICE', expectedVersion: notCur.lastView.version })).ok, false);
  const turn = all.find((s) => s.lastView.me === cur);
  const r2 = await turn.call('game:action', { clientActionId: 'm2', type: 'ROLL_DICE', expectedVersion: turn.lastView.version });
  assert.ok(r2.ok, r2.error);
  await wait();
  assert.ok(all.every((s) => s.lastView.version === turn.lastView.version), 'todos en la misma versión');
});

test('dos pujas simultáneas sobre la misma versión → sólo una se aplica', { skip: Boolean(external) }, async () => {
  const A = await api.host('magnate', 'P1');
  const b = api.client(A.code);
  const rb = await b.call('room:join', { name: 'P2' });
  await A.c.call('room:start');
  await wait();
  const room = server.rooms.get(A.code);
  room.data.state.auction = { kind: 'property', index: 5, highBid: 0, highBidderId: null, participants: [A.playerId, rb.playerId], passed: [] };
  await A.c.call('sync');
  await b.call('sync');
  await wait();
  const ver = A.c.lastView.version;
  const [x, y] = await Promise.all([
    A.c.call('game:action', { clientActionId: 's1', type: 'PLACE_BID', payload: { amount: 50 }, expectedVersion: ver }),
    b.call('game:action', { clientActionId: 's2', type: 'PLACE_BID', payload: { amount: 50 }, expectedVersion: ver }),
  ]);
  assert.equal([x, y].filter((r) => r.ok).length, 1);
  assert.ok([x, y].some((r) => r.stale));
  await wait();
  assert.equal(A.c.lastView.auction.highBid, 50);
  assert.equal(A.c.lastView.version, b.lastView.version);
});

test('límite de frecuencia: responde con error en lugar de colgarse', { skip: Boolean(external) }, async () => {
  const limited = await startServer({ port: 0, dataFile: null, rateLimit: 5 });
  const api2 = makeClient(`http://localhost:${limited.port}`);
  const A = await api2.host('ultima-carta', 'L');
  const results = await Promise.all(Array.from({ length: 8 }, () => A.c.call('ping')));
  assert.ok(results.some((r) => /Demasiadas/.test(r.error ?? '')));
  api2.closeAll();
  await limited.close();
});

test('dos acciones simultáneas sobre la misma versión (cualquier servidor) → sólo una se aplica', async () => {
  const A = await api.host('magnate', 'R1');
  const b = api.client(A.code);
  await b.call('room:join', { name: 'R2' });
  await A.c.call('room:start');
  await wait(150);
  const turn = [A.c, b].find((s) => s.lastView.me === s.lastView.turn.playerId);
  const ver = turn.lastView.version;
  const rs = await Promise.all([
    turn.call('game:action', { clientActionId: 'r1', type: 'ROLL_DICE', expectedVersion: ver }),
    turn.call('game:action', { clientActionId: 'r2', type: 'ROLL_DICE', expectedVersion: ver }),
  ]);
  assert.equal(rs.filter((r) => r.ok).length, 1);
  await wait(150);
  assert.equal(A.c.lastView.version, ver + 1);
  assert.equal(b.lastView.version, ver + 1);
});
