/**
 * Tope de mesas abiertas a la vez.
 * Corre contra el servidor Node con un tope de 3 o, con BOARDHUB_URL y BOARDHUB_MAX_ROOMS,
 * contra el Worker (`wrangler dev --var MAX_ROOMS:3`, con almacenamiento vacío).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../server/index.js';
import { makeClient, wait } from './helpers/wsclient.js';
import { occupiesSlot, IDLE_GRACE_MS, maxRoomsFrom, DEFAULT_MAX_ROOMS } from '../server/core/limits.js';

const external = process.env.BOARDHUB_URL;
const MAX = Number(process.env.BOARDHUB_MAX_ROOMS ?? 3);
let server;
let api;
let base;

before(async () => {
  if (external) base = external;
  else {
    server = await startServer({ port: 0, dataFile: join(mkdtempSync(join(tmpdir(), 'bh-')), 'rooms.json'), rateLimit: 100000, maxRooms: MAX });
    base = `http://localhost:${server.port}`;
  }
  api = makeClient(base);
});
after(async () => {
  api.closeAll();
  await server?.close();
});

const capacity = async () => (await (await fetch(`${base}/api/rooms`)).json()).capacity;
const createRaw = async (gameId, name) => {
  const res = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId, name, visibility: 'private' }) });
  return { status: res.status, body: await res.json() };
};
async function until(fn, what, ms = 3000) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`no llegó: ${what}`);
    await wait(25);
  }
}

test('qué mesas ocupan lugar', () => {
  const now = 1_000_000_000;
  assert.equal(occupiesSlot({ status: 'lobby', connected: 0, seenAt: now }, now), true, 'recién creada');
  assert.equal(occupiesSlot({ status: 'playing', connected: 2, seenAt: now - 5 * IDLE_GRACE_MS }, now), true, 'con gente conectada');
  assert.equal(occupiesSlot({ status: 'lobby', connected: 0, seenAt: now - IDLE_GRACE_MS - 1 }, now), false, 'vacía hace rato');
  assert.equal(occupiesSlot({ status: 'finished', connected: 4, seenAt: now }, now), false, 'partida terminada');
  assert.equal(maxRoomsFrom(undefined), DEFAULT_MAX_ROOMS);
  assert.equal(maxRoomsFrom('25'), 25);
  assert.equal(maxRoomsFrom('cero'), DEFAULT_MAX_ROOMS);
});

test('con todas las mesas ocupadas no se abre otra hasta que una termine o se cierre', async () => {
  assert.deepEqual(await capacity(), { active: 0, max: MAX });

  // Se llenan las mesas.
  const hosts = [];
  for (let i = 0; i < MAX; i++) {
    const h = await api.host('truco', `Anfitrión ${i}`, {}, 'private');
    assert.ok(h.ok, h.error);
    hosts.push(h);
  }
  assert.deepEqual(await capacity(), { active: MAX, max: MAX });

  // La siguiente se rechaza con un mensaje claro.
  const full = await createRaw('truco', 'Sobra');
  assert.equal(full.status, 429);
  assert.equal(full.body.ok, false);
  assert.equal(full.body.full, true);
  assert.match(full.body.error, new RegExp(`ocupadas las ${MAX} mesas`));
  assert.deepEqual(full.body.capacity, { active: MAX, max: MAX });

  // Termina la partida de la primera mesa: libera su lugar.
  const [h0, h1] = hosts;
  const b = api.client(h0.code);
  assert.ok((await b.call('room:join', { name: 'Beto' })).ok);
  assert.ok((await h0.c.call('room:start')).ok);
  assert.ok((await b.call('game:action', { type: 'LEAVE' })).ok);
  await until(async () => (await capacity()).active === MAX - 1, 'lugar liberado al terminar');
  const again = await createRaw('truco', 'Nueva');
  assert.equal(again.status, 200, again.body.error);
  assert.deepEqual(await capacity(), { active: MAX, max: MAX });

  // Volver a la mesa con la partida terminada se permite aunque esté todo ocupado.
  const back = await b.call('room:return');
  assert.ok(back.ok, back.error);
  await until(async () => (await capacity()).active === MAX + 1, 'la mesa que volvió cuenta otra vez');
  assert.equal((await createRaw('truco', 'Otra')).status, 429);

  // Se cierra una mesa (se levanta su único jugador): libera el lugar.
  assert.ok((await h1.c.call('room:leave')).ok);
  await until(async () => (await capacity()).active === MAX, 'mesa cerrada');
  assert.equal((await createRaw('truco', 'Otra')).status, 429, 'sigue lleno: había una de más');
  assert.ok((await b.call('room:leave')).ok);
  assert.ok((await h0.c.call('room:leave')).ok);
  await until(async () => (await capacity()).active === MAX - 1, 'otra mesa cerrada');
  assert.equal((await createRaw('truco', 'Por fin')).status, 200);
});
