/**
 * Magnate online: dos clientes WebSocket independientes en la misma sala, contra el servidor real
 * (Node por defecto; con BOARDHUB_URL, por ejemplo el Worker en `wrangler dev`, contra ese servidor).
 *
 * Cada cliente sólo conoce su token y su propia vista, y decide sólo por su jugador. La partida se
 * juega hasta el final y se verifica en cada paso que las dos vistas sean idénticas.
 * Cubre: sincronización de turnos, dados, compras, subastas, pagos, impuestos, hipotecas,
 * traspaso de hipotecadas, reconexión y fin de partida.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../server/index.js';
import { makeClient, wait } from './helpers/wsclient.js';
import { ACTIONS, sellBlocker, mortgageBlocker, buildBlocker, unmortgageBlocker, legalPlacements } from '../src/games/magnate/engine/index.js';
import { BOARD } from '../src/games/magnate/data/board.js';

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

/** Espera a que las vistas de todos los clientes lleguen a la misma versión. */
async function synced(clients, minVersion = 0, ms = 4000) {
  const t0 = Date.now();
  for (;;) {
    const vs = clients.map((c) => c.lastView?.version ?? -1);
    if (vs.every((v) => v === vs[0] && v >= minVersion)) return vs[0];
    if (Date.now() - t0 > ms) throw new Error(`vistas desincronizadas: versiones ${vs.join(' / ')}`);
    await wait(3);
  }
}

/** Las dos vistas tienen que ser iguales salvo el campo `me`. */
function assertSameTable(a, b) {
  const strip = ({ me, ...rest }) => rest;
  assert.deepEqual(strip(a.lastView), strip(b.lastView), 'los dos clientes ven mesas distintas');
}

const owned = (v, id) => BOARD.filter((sq) => v.ownership[sq.index]?.ownerId === id);

/** Política de un jugador, decidida sólo con su propia vista. */
function decide(v, me, cov, rng) {
  const p = v.players.find((x) => x.id === me);
  const debt = v.debts.find((d) => d.debtorId === me);
  if (debt) {
    if (p.money >= debt.amount) return { type: ACTIONS.PAY_DEBT };
    for (const sq of BOARD) if (v.ownership[sq.index]?.ownerId === me && !sellBlocker(v, me, sq.index)) return { type: ACTIONS.SELL_BUILDING, payload: { index: sq.index } };
    for (const sq of BOARD) if (!mortgageBlocker(v, me, sq.index)) return { type: ACTIONS.MORTGAGE, payload: { index: sq.index } };
    return { type: ACTIONS.DECLARE_BANKRUPTCY };
  }
  if (v.incomeTax?.playerId === me) return { type: ACTIONS.PAY_INCOME_TAX, payload: { mode: cov.taxPercent <= cov.taxFlat ? 'percent' : 'flat' } };
  const mt = v.mortgageTransfers?.find((x) => x.playerId === me);
  if (mt) return { type: ACTIONS.RESOLVE_MORTGAGE_TRANSFER, payload: { index: mt.index, lift: cov.transferResolved > 0 && p.money >= BOARD[mt.index].unmortgage } };
  if (v.placement?.playerId === me) return { type: ACTIONS.PLACE_BUILDING, payload: { index: legalPlacements(v, me, v.placement.buildingType)[0] } };
  if (v.buildingClaim) return { type: ACTIONS.CLAIM_BUILDING, payload: { want: rng() < 0.5 } };
  if (v.auction) {
    const bid = v.auction.highBid + 1 + Math.floor(rng() * 40);
    return bid <= p.money && rng() < 0.55 ? { type: ACTIONS.PLACE_BID, payload: { amount: bid } } : { type: ACTIONS.PASS_BID };
  }
  const trade = v.trades.find((t) => t.toId === me);
  if (trade) return { type: ACTIONS.RESPOND_TRADE, payload: { tradeId: trade.id, accept: true } };
  if (v.turn.playerId !== me) return null;

  if (v.turn.step === 'roll') {
    // Acciones libres antes de tirar, para cubrir hipotecas y acelerar el final.
    if (!cov.mortgage) {
      const sq = owned(v, me).find((s) => !mortgageBlocker(v, me, s.index));
      if (sq) return { type: ACTIONS.MORTGAGE, payload: { index: sq.index } };
    }
    if (cov.mortgage && !cov.transferOffered) {
      const sq = owned(v, me).find((s) => v.ownership[s.index].mortgaged);
      const other = v.players.find((x) => x.id !== me && x.status !== 'bankrupt');
      if (sq && other) return { type: ACTIONS.PROPOSE_TRADE, payload: { toId: other.id, give: { squares: [sq.index] }, get: { money: 1 } }, tag: 'transfer' };
    }
    if (cov.transferResolved && !cov.unmortgage && p.money > 400) {
      // 00009: quien recibió la hipotecada pagando sólo el 10 % la levanta después pagando hipoteca + 10 % otra vez.
      const sq = owned(v, me).find((s) => s.index === cov.transferIndex && !unmortgageBlocker(v, me, s.index));
      if (sq) return { type: ACTIONS.UNMORTGAGE, payload: { index: sq.index } };
    }
    if (((cov.taxFlat && cov.taxPercent) || cov.rolls > 400) && p.money > 300 && v.bank.houses > 4 && v.bank.hotels > 1) {
      const sq = BOARD.find((s) => !buildBlocker(v, me, s.index));
      if (sq) return { type: ACTIONS.BUILD, payload: { index: sq.index } };
    }
    if (p.status === 'in-jail' && p.jailTurns < 2 && p.money > 300) return { type: ACTIONS.PAY_JAIL_FINE };
    return { type: ACTIONS.ROLL_DICE };
  }
  if (v.turn.step === 'buy') {
    const sq = BOARD[v.pendingPurchase];
    return cov.auctionsWon < 2 || p.money < sq.price ? { type: ACTIONS.DECLINE_PROPERTY } : { type: ACTIONS.BUY_PROPERTY };
  }
  return { type: ACTIONS.END_TURN };
}

test('Magnate online: dos clientes juegan una partida completa sincronizados, con reconexión', { timeout: 600_000 }, async () => {
  // --- sala, unión y comienzo -------------------------------------------------------------
  const H = await api.host('magnate', 'Ana', {}, 'private');
  assert.ok(H.ok && H.resumed.ok, H.error);
  const b = api.client(H.code);
  const jb = await b.call('room:join', { name: 'Beto' });
  assert.ok(jb.ok, jb.error);
  const tokens = { [H.playerId]: H.token, [jb.playerId]: jb.token };
  assert.ok((await H.c.call('room:start')).ok);
  const clients = { [H.playerId]: H.c, [jb.playerId]: b };
  const both = () => Object.values(clients);
  await synced(both());
  assertSameTable(H.c, b);
  assert.equal(H.c.lastView.options.skipPurchase, false, 'la regla de la casa viene apagada');

  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cov = { rolls: 0, buys: 0, auctionsWon: 0, bids: 0, passes: 0, rents: 0, taxFlat: 0, taxPercent: 0, mortgage: 0, transferOffered: 0, transferResolved: 0, transferLift: 0, unmortgage: 0, reconnect: 0, turnChanges: 0, stale: 0, impostor: 0 };
  let n = 0;
  let lastTurn = H.c.lastView.turn.playerId;

  const send = async (id, a) => {
    const c = clients[id];
    const r = await c.call('game:action', { clientActionId: `${id}-${++n}`, type: a.type, payload: a.payload, expectedVersion: c.lastView.version });
    return r;
  };

  const MAX_STEPS = 4000; // dos jugadores sin grupos completos pueden no quebrar nunca: ahí abandona Beto
  let ending = 'natural';
  for (let step = 0; step <= MAX_STEPS; step++) {
    const v = H.c.lastView;
    if (v.phase === 'finished') break;

    // --- reconexión: Beto se cae a mitad de partida y vuelve con su token ------------------
    if (!cov.reconnect && cov.rolls === 12) {
      const bId = jb.playerId;
      clients[bId].close();
      await wait(50);
      // Mientras Beto no está, Ana sigue recibiendo la mesa y el servidor rechaza acciones sin sesión.
      const ghost = api.client(H.code);
      assert.equal((await ghost.call('game:action', { type: ACTIONS.ROLL_DICE })).ok, false);
      ghost.close();
      const back = api.client(H.code);
      assert.ok((await back.call('room:resume', { token: tokens[bId] })).ok);
      clients[bId] = back;
      await synced(both(), v.version);
      assertSameTable(H.c, back);
      assert.equal(back.lastView.me, bId);
      cov.reconnect++;
      continue;
    }

    // --- un jugador intenta actuar por el otro: el servidor pone el playerId y lo rechaza -----
    if (!cov.impostor && v.turn.step === 'roll' && !v.deciders.some((d) => d !== v.turn.playerId)) {
      const other = Object.keys(clients).find((id) => id !== v.turn.playerId);
      const r = await clients[other].call('game:action', { type: ACTIONS.ROLL_DICE, playerId: v.turn.playerId });
      assert.equal(r.ok, false);
      cov.impostor++;
    }

    const id = v.deciders.find((d) => clients[d]) ?? v.turn.playerId;
    const a = decide(v, id, cov, rng);
    if (!a) throw new Error(`nadie puede actuar (decisores: ${v.deciders.join(', ')})`);
    const before = v.players.map((p) => p.money);
    const r = await send(id, a);
    if (!r.ok) {
      if (r.stale) { cov.stale++; continue; }
      throw new Error(`acción rechazada ${a.type}: ${r.error}`);
    }
    const ver = await synced(both(), v.version + 1);
    assertSameTable(H.c, clients[Object.keys(clients)[1]]);
    const w = H.c.lastView;
    assert.equal(ver, v.version + 1, 'cada acción avanza una versión');

    switch (a.type) {
      case ACTIONS.ROLL_DICE:
        cov.rolls++;
        assert.equal(w.dice.length, 2);
        assert.ok(w.dice.every((d) => d >= 1 && d <= 6));
        if (/alquiler/i.test(w.log.slice(-3).map((l) => l.text ?? l).join(' '))) cov.rents++;
        break;
      case ACTIONS.BUY_PROPERTY:
        cov.buys++;
        assert.equal(w.ownership[v.pendingPurchase].ownerId, id);
        assert.equal(w.players.find((p) => p.id === id).money, v.players.find((p) => p.id === id).money - BOARD[v.pendingPurchase].price);
        break;
      case ACTIONS.PLACE_BID: cov.bids++; break;
      case ACTIONS.PASS_BID:
        cov.passes++;
        if (v.auction.kind !== 'building' && !w.auction && v.auction.highBidderId) cov.auctionsWon++;
        break;
      case ACTIONS.PAY_INCOME_TAX: {
        const paid = before[v.players.findIndex((p) => p.id === id)] - w.players.find((p) => p.id === id).money;
        if (a.payload.mode === 'flat') { cov.taxFlat++; assert.ok(paid === 200 || w.debts.some((d) => d.debtorId === id && d.amount === 200), `impuesto fijo: pagó ${paid}`); } else { cov.taxPercent++; assert.ok(paid >= 0); }
        break;
      }
      case ACTIONS.MORTGAGE: cov.mortgage++; break;
      case ACTIONS.PROPOSE_TRADE: if (a.tag) cov.transferOffered++; break;
      case ACTIONS.RESOLVE_MORTGAGE_TRANSFER:
        cov.transferResolved++;
        cov.transferIndex = a.payload.index;
        if (a.payload.lift) { cov.transferLift++; assert.equal(w.ownership[a.payload.index].mortgaged, false); }
        else {
          assert.equal(w.ownership[a.payload.index].mortgaged, true);
          const paid = before[v.players.findIndex((p) => p.id === id)] - w.players.find((p) => p.id === id).money;
          assert.ok(paid === BOARD[a.payload.index].unmortgage - BOARD[a.payload.index].mortgage || w.debts.length, 'paga el 10 % de interés');
        }
        break;
      case ACTIONS.UNMORTGAGE: {
        cov.unmortgage++;
        const paid = before[v.players.findIndex((p) => p.id === id)] - w.players.find((p) => p.id === id).money;
        assert.equal(paid, BOARD[a.payload.index].unmortgage, 'levantar cuesta hipoteca + 10 %');
        break;
      }
      default:
    }
    if (w.turn.playerId !== lastTurn) {
      cov.turnChanges++;
      lastTurn = w.turn.playerId;
    }

    // Sin final natural en un tiempo razonable: Beto abandona (política de plataforma) y gana Ana.
    if (step === MAX_STEPS && w.phase !== 'finished') {
      assert.ok((await clients[jb.playerId].call('game:action', { type: ACTIONS.RESIGN })).ok);
      await synced(both(), w.version + 1);
      assert.equal(H.c.lastView.winnerId, H.playerId);
      ending = 'abandono';
    }
  }

  // --- fin de partida -----------------------------------------------------------------
  await synced(both());
  const [va, vb] = both().map((c) => c.lastView);
  assert.equal(va.phase, 'finished');
  assert.equal(vb.phase, 'finished');
  assert.equal(va.winnerId, vb.winnerId);
  assert.ok(H.c.lastRoom.status === 'finished' || clients[jb.playerId].lastRoom?.status === 'finished');
  assert.equal((await H.c.call('game:action', { type: ACTIONS.ROLL_DICE })).ok, false, 'no se puede jugar una partida terminada');

  console.log('  cobertura online:', JSON.stringify(cov), 'acciones:', n, 'final:', ending, 'ganador:', va.winnerId);
  for (const k of ['rolls', 'buys', 'auctionsWon', 'bids', 'passes', 'rents', 'taxFlat', 'taxPercent', 'mortgage', 'transferOffered', 'transferResolved', 'unmortgage', 'reconnect', 'turnChanges', 'impostor'])
    assert.ok(cov[k] > 0, `la partida no pasó por: ${k} — ${JSON.stringify(cov)}`);
});
