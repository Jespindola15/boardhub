/**
 * Sala reutilizable: al terminar una partida se vuelve a la sala de espera con las mismas personas
 * y el mismo código, se vota el próximo juego y el anfitrión lo confirma.
 * Corre contra el servidor Node o, con BOARDHUB_URL, contra el Worker (`wrangler dev`).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../server/index.js';
import { makeClient, wait } from './helpers/wsclient.js';

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

/** Espera hasta que la condición se cumpla en la última sala recibida por el cliente. */
async function until(c, fn, what, ms = 3000) {
  const t0 = Date.now();
  while (!(c.lastRoom && fn(c.lastRoom))) {
    if (Date.now() - t0 > ms) throw new Error(`no llegó: ${what} (sala: ${JSON.stringify(c.lastRoom)?.slice(0, 300)})`);
    await wait(10);
  }
  return c.lastRoom;
}

const ok = async (c, ev, payload) => {
  const r = await c.call(ev, payload);
  assert.ok(r.ok, `${ev}: ${r.error}`);
  return r;
};
const no = async (c, ev, payload) => {
  const r = await c.call(ev, payload);
  assert.equal(r.ok, false, `${ev} debía rechazarse`);
  return r;
};

test('terminar, volver a la sala, votar, cambiar de juego y jugar otra con las mismas personas', async () => {
  // 1) Truco entre Ana (anfitriona) y Beto, en una sala pública.
  const A = await api.host('truco', 'Ana', {}, 'public');
  assert.ok(A.ok && A.resumed.ok, A.error);
  const a = A.c;
  const b = api.client(A.code);
  const jb = await ok(b, 'room:join', { name: 'Beto' });
  await ok(a, 'room:start');
  await until(a, (r) => r.status === 'playing', 'partida en curso');
  assert.equal((await a.call('room:vote', { gameId: 'magnate' })).ok, false, 'no se vota durante la partida');
  await no(b, 'room:return'); // la partida no terminó

  // 2) Termina: Beto abandona la partida desde el juego (no la sala).
  await ok(b, 'game:action', { type: 'LEAVE' });
  await until(a, (r) => r.status === 'finished', 'partida terminada');
  assert.equal((await api.list('truco')).some((r) => r.code === A.code), false, 'una sala terminada no aparece en la lista');

  // 3) Cualquiera vuelve a la sala: mismas personas, mismo código, partida n.º 2 y resultado guardado.
  await ok(b, 'room:return');
  await ok(a, 'room:return'); // si otro ya volvió, no pasa nada
  const lobby = await until(a, (r) => r.status === 'lobby' && r.match === 2, 'sala de espera');
  await until(b, (r) => r.status === 'lobby' && r.match === 2, 'sala de espera (Beto)');
  assert.equal(lobby.code, A.code);
  assert.deepEqual(lobby.seats.map((s) => s.name), ['Ana', 'Beto']);
  assert.equal(lobby.hostId, A.playerId);
  assert.equal(lobby.results.length, 1);
  assert.equal(lobby.results[0].gameId, 'truco');
  assert.deepEqual(lobby.results[0].names, ['Ana']);
  await wait(50);
  assert.equal(a.lastView, null, 'en la sala de espera no hay mesa');
  assert.ok((await api.list()).some((r) => r.code === A.code), 'vuelve a aparecer en la lista pública');

  // 4) Votación: cada uno vota; se puede cambiar o retirar el voto.
  await ok(a, 'room:vote', { gameId: 'chinchon' });
  await ok(b, 'room:vote', { gameId: 'magnate' });
  await ok(a, 'room:vote', { gameId: 'magnate' });
  await no(a, 'room:vote', { gameId: 'no-existe' });
  let r = await until(a, (x) => Object.keys(x.votes).length === 2 && x.votes[A.playerId] === 'magnate', 'votos');
  assert.deepEqual(r.votes, { [A.playerId]: 'magnate', [jb.playerId]: 'magnate' });
  await ok(b, 'room:vote', { gameId: null });
  r = await until(a, (x) => !(jb.playerId in x.votes), 'voto retirado');
  await ok(b, 'room:vote', { gameId: 'magnate' });

  // 5) Sólo el anfitrión confirma el juego; las opciones vuelven a las de ese juego.
  await no(b, 'room:game', { gameId: 'magnate' });
  await no(a, 'room:game', { gameId: 'no-existe' });
  await ok(a, 'room:game', { gameId: 'magnate' });
  r = await until(a, (x) => x.gameId === 'magnate', 'juego cambiado');
  assert.equal(r.options.skipPurchase, false);
  assert.ok(r.games.magnate && r.games.colonias.min === 3, 'la sala informa los límites de cada juego');
  assert.equal((await api.list('magnate')).find((x) => x.code === A.code)?.gameId, 'magnate');

  // 6) Empieza la segunda partida con un estado nuevo (la versión vuelve a 0).
  await ok(a, 'room:start');
  await until(b, (x) => x.status === 'playing' && x.gameId === 'magnate', 'Magnate en curso');
  const t0 = Date.now();
  while (!(b.lastView?.players && a.lastView?.players)) {
    if (Date.now() - t0 > 3000) throw new Error('no llegó la mesa de Magnate');
    await wait(10);
  }
  assert.equal(b.lastView.version, 0);
  assert.deepEqual(b.lastView.players.map((p) => p.name).sort(), ['Ana', 'Beto']);
  const roll = await (b.lastView.turn.playerId === jb.playerId ? b : a).call('game:action', { type: 'ROLL_DICE' });
  assert.ok(roll.ok, roll.error);

  // 7) Termina Magnate: Ana abandona la sala (no sólo la partida). Beto queda como anfitrión.
  await ok(a, 'room:leave');
  r = await until(b, (x) => x.status === 'finished', 'Magnate terminado');
  assert.equal(r.hostId, jb.playerId, 'el anfitrión pasa a quien sigue en la sala');
  await ok(b, 'room:return');
  r = await until(b, (x) => x.status === 'lobby' && x.match === 3, 'tercera partida');
  assert.deepEqual(r.seats.map((s) => s.name), ['Beto'], 'quien se fue de la sala libera su asiento');
  assert.equal(r.results.length, 2);
  assert.equal(r.results[1].gameId, 'magnate');
  assert.deepEqual(r.results[1].names, ['Beto']);

  // 8) Con un juego que pide más jugadores, la sala avisa y no deja empezar hasta que entre gente.
  await ok(b, 'room:game', { gameId: 'colonias' });
  r = await until(b, (x) => x.gameId === 'colonias', 'Colonias elegido');
  assert.ok(r.seats.length < r.limits.min);
  await no(b, 'room:start');
  const c = api.client(A.code);
  await ok(c, 'room:join', { name: 'Caro' });
  const d = api.client(A.code);
  await ok(d, 'room:join', { name: 'Dani' });
  await ok(b, 'room:start');
  await until(c, (x) => x.status === 'playing' && x.gameId === 'colonias', 'Colonias en curso');
});

test('si quedan más jugadores que los que admite el juego elegido, no deja empezar', async () => {
  const A = await api.host('ultima-carta', 'Uno', {}, 'private');
  for (const n of ['Dos', 'Tres', 'Cuatro', 'Cinco']) await ok(api.client(A.code), 'room:join', { name: n });
  await ok(A.c, 'room:game', { gameId: 'chinchon' }); // 2 a 4
  const r = await until(A.c, (x) => x.gameId === 'chinchon', 'Chinchón elegido');
  assert.match(r.countError ?? '', /máximo 4/);
  await no(A.c, 'room:start');
});
