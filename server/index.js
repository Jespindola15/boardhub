/**
 * Servidor de BoardHub para Node (desarrollo local, pruebas y túnel de Cloudflare).
 * En producción se usa el Worker de Cloudflare (worker/), con el MISMO núcleo y protocolo.
 *
 *   npm run server     → :3001 (la web en desarrollo usa el proxy de Vite)
 *   npm start          → sirve también la web compilada (dist/)
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Room, RoomError, newCode, isValidCode } from './core/room.js';
import { handleRequest, messagesFor } from './core/protocol.js';
import { createFileStore } from './store.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  if (path.includes('..')) path = '';
  for (const candidate of [join(DIST, path), join(DIST, 'index.html')]) {
    try {
      const body = await readFile(candidate);
      res.writeHead(200, { 'Content-Type': TYPES[extname(candidate)] ?? 'application/octet-stream' });
      res.end(body);
      return;
    } catch {
      /* siguiente candidato */
    }
  }
  res.writeHead(404);
  res.end('BoardHub: compila la web con "npm run build".');
}

function readJson(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => (body += c.length < 10000 ? c : ''));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

export function startServer({ port = 3001, dataFile = join(ROOT, 'server', 'data', 'rooms.json'), rng, rateLimit } = {}) {
  const store = createFileStore(dataFile);
  /** code → Room */
  const rooms = new Map(store.load().map((d) => [d.code, new Room(d, { rng })]));
  /** code → Set<{ ws, playerId, rate }> */
  const conns = new Map();

  const persist = () => store.save([...rooms.values()].map((r) => r.data));
  const online = (code) => new Set([...(conns.get(code) ?? [])].map((c) => c.playerId).filter(Boolean));
  const send = (conn, msg) => conn.ws.readyState === 1 && conn.ws.send(JSON.stringify(msg));

  function broadcast(room) {
    const set = conns.get(room.data.code) ?? new Set();
    const on = online(room.data.code);
    for (const c of set) for (const m of messagesFor(room, c, on)) send(c, m);
    persist();
  }

  const http = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/api/rooms')) {
      const game = new URL(req.url, 'http://x').searchParams.get('game');
      const list = [...rooms.values()]
        .map((r) => r.listing())
        .filter((l) => l && (!game || l.gameId === game))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 100);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, rooms: list }));
      return;
    }
    if (req.method === 'POST' && req.url === '/api/rooms') {
      const body = await readJson(req);
      res.setHeader('Content-Type', 'application/json');
      try {
        let code;
        do code = newCode();
        while (rooms.has(code));
        const { room, seat } = Room.create({ code, gameId: body.gameId, name: body.name, options: body.options, visibility: body.visibility }, { rng });
        rooms.set(code, room);
        persist();
        res.end(JSON.stringify({ ok: true, code, playerId: seat.playerId, token: seat.token }));
      } catch (e) {
        res.statusCode = e instanceof RoomError ? 400 : 500;
        res.end(JSON.stringify({ ok: false, error: e instanceof RoomError ? e.message : 'Error interno del servidor.' }));
      }
      return;
    }
    serveStatic(req, res);
  });

  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: { threshold: 2048 } });
  http.on('upgrade', (req, socket, head) => {
    const m = req.url.match(/^\/ws\/([A-Za-z0-9]{6})(?:\?.*)?$/);
    const code = m?.[1].toUpperCase();
    if (!code || !isValidCode(code)) return socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => {
      if (!rooms.has(code)) {
        ws.send(JSON.stringify({ ev: 'room:missing', data: { code } }));
        ws.close(4004, 'sala inexistente');
        return;
      }
      const conn = { ws, playerId: null };
      if (!conns.has(code)) conns.set(code, new Set());
      conns.get(code).add(conn);
      ws.isAlive = true;
      ws.on('pong', () => (ws.isAlive = true));

      ws.on('message', (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }
        const room = rooms.get(code);
        if (!room) return;
        const before = conn.playerId;
        const r = handleRequest(room, conn, msg.ev, msg.payload, rateLimit ? { rateLimit } : undefined);
        send(conn, { re: msg.id, data: r.reply });
        if (r.kicked) for (const c of conns.get(code)) if (c.playerId === r.kicked) {
          send(c, { ev: 'room:removed', data: {} });
          c.playerId = null;
        }
        if (r.changed || before !== conn.playerId) broadcast(room);
        else if (r.resend) for (const m2 of messagesFor(room, conn, online(code))) send(conn, m2);
        if (room.empty) rooms.delete(code);
      });

      ws.on('close', () => {
        conns.get(code)?.delete(conn);
        const room = rooms.get(code);
        if (room && conn.playerId) broadcast(room);
      });
    });
  });

  // Latido: detecta conexiones muertas cada 10 s.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
    const limit = Date.now() - ROOM_TTL_MS;
    for (const [code, room] of rooms) if (room.data.updatedAt < limit && !conns.get(code)?.size) rooms.delete(code);
  }, 10000);
  heartbeat.unref();

  return new Promise((resolve) => {
    http.listen(port, () =>
      resolve({
        port: http.address().port,
        rooms,
        close: () =>
          new Promise((done) => {
            store.flush();
            clearInterval(heartbeat);
            for (const ws of wss.clients) ws.terminate();
            wss.close();
            http.close(() => done());
          }),
      }),
    );
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT) || 3001;
  startServer({ port }).then(({ port: p }) => console.log(`BoardHub server escuchando en http://localhost:${p}`));
}
