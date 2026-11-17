/**
 * Servidor autoritativo de BoardHub (Node + Socket.IO).
 * - Desarrollo: `npm run server` (puerto 3001); Vite reenvía /socket.io.
 * - Producción: `npm run build && npm start` sirve también la web compilada.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { RoomManager, RoomError } from './rooms.js';
import { createFileStore } from './store.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

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

export function startServer({ port = 3001, dataFile = join(ROOT, 'server', 'data', 'rooms.json'), rng, rateLimit = 60 } = {}) {
  const store = createFileStore(dataFile);
  const rooms = new RoomManager({ rng, initial: store.load() });
  const http = createServer((req, res) => serveStatic(req, res));
  const io = new Server(http, {
    cors: { origin: true },
    // Detección rápida de desconexiones y compresión de vistas grandes.
    pingInterval: 10000,
    pingTimeout: 8000,
    perMessageDeflate: { threshold: 2048 },
  });

  /** playerId → Set de sockets conectados (puede haber varias pestañas). */
  const online = new Map();
  const onlineSet = () => new Set([...online.entries()].filter(([, s]) => s.size).map(([id]) => id));

  function broadcast(room) {
    const pub = rooms.publicRoom(room, onlineSet());
    io.to(room.code).emit('room:update', pub);
    for (const seat of room.seats) {
      const view = rooms.viewFor(room, seat.playerId);
      for (const sid of online.get(seat.playerId) ?? []) io.to(sid).emit('game:view', view);
    }
    store.save(rooms.serialize());
  }

  function bind(socket, room, seat) {
    socket.data.code = room.code;
    socket.data.playerId = seat.playerId;
    socket.join(room.code);
    if (!online.has(seat.playerId)) online.set(seat.playerId, new Set());
    online.get(seat.playerId).add(socket.id);
  }

  /** Envuelve un manejador: errores de sala → respuesta { ok:false, error }. */
  const RATE_LIMIT = rateLimit;
  const handle = (fn) =>
    function (payload, ack) {
    const reply = typeof ack === 'function' ? ack : () => {};
    const rate = this.data.rate;
    const t = Date.now();
    if (t - rate.windowStart > 1000) {
      rate.windowStart = t;
      rate.count = 0;
    }
    if (++rate.count > RATE_LIMIT) {
      reply({ ok: false, error: 'Demasiadas acciones seguidas: espera un momento.' });
      return;
    }
    try {
      reply(fn(payload ?? {}) ?? { ok: true });
    } catch (e) {
      if (e instanceof RoomError) reply({ ok: false, error: e.message });
      else {
        console.error(e);
        reply({ ok: false, error: 'Error interno del servidor.' });
      }
    }
  };

  io.on('connection', (socket) => {
    // Límite de frecuencia por conexión (ventana de 1 s); se responde con error, nunca se deja colgado.
    socket.data.rate = { windowStart: Date.now(), count: 0 };

    const mine = () => {
      if (!socket.data.code) throw new RoomError('No estás en ninguna sala.');
      return rooms.get(socket.data.code);
    };

    socket.on('room:create', handle(({ gameId, name, options }) => {
      const { room, seat } = rooms.create({ gameId, name, options });
      bind(socket, room, seat);
      broadcast(room);
      return { ok: true, code: room.code, playerId: seat.playerId, token: seat.token };
    }));

    socket.on('room:join', handle(({ code, name }) => {
      const { room, seat } = rooms.join({ code, name });
      bind(socket, room, seat);
      broadcast(room);
      return { ok: true, code: room.code, playerId: seat.playerId, token: seat.token };
    }));

    socket.on('room:resume', handle(({ code, token }) => {
      const room = rooms.get(code);
      const seat = rooms.seatByToken(room, token);
      bind(socket, room, seat);
      broadcast(room);
      return { ok: true, code: room.code, playerId: seat.playerId };
    }));

    socket.on('room:options', handle(({ options }) => {
      const room = mine();
      rooms.setOptions(room, socket.data.playerId, options);
      broadcast(room);
    }));

    socket.on('room:start', handle(() => {
      const room = mine();
      rooms.start(room, socket.data.playerId);
      broadcast(room);
    }));

    socket.on('room:leave', handle(() => {
      const room = mine();
      rooms.leave(room, socket.data.playerId);
      online.get(socket.data.playerId)?.delete(socket.id);
      socket.leave(room.code);
      socket.data.code = null;
      if (rooms.rooms.has(room.code)) broadcast(room);
    }));

    socket.on('room:remove', handle(({ playerId }) => {
      const room = mine();
      rooms.remove(room, socket.data.playerId, playerId);
      for (const sid of online.get(playerId) ?? []) io.sockets.sockets.get(sid)?.emit('room:removed');
      broadcast(room);
    }));

    socket.on('game:action', handle(({ clientActionId, type, payload, expectedVersion }) => {
      const room = mine();
      const result = rooms.act(room, socket.data.playerId, { clientActionId, type, payload, expectedVersion });
      if (result.ok && !result.duplicate) broadcast(room);
      return result;
    }));

    socket.on('sync', handle(() => {
      // El cliente pide la vista actual (p. ej. tras volver de segundo plano).
      const room = mine();
      socket.emit('room:update', rooms.publicRoom(room, onlineSet()));
      socket.emit('game:view', rooms.viewFor(room, socket.data.playerId));
    }));

    socket.on('disconnect', () => {
      const { playerId, code } = socket.data;
      if (!playerId) return;
      online.get(playerId)?.delete(socket.id);
      if (code && rooms.rooms.has(code)) broadcast(rooms.get(code));
    });
  });

  const sweeper = setInterval(() => rooms.sweep(), 60 * 60 * 1000);
  sweeper.unref();

  return new Promise((resolve) => {
    http.listen(port, () =>
      resolve({
        port: http.address().port,
        rooms,
        close: () =>
          new Promise((done) => {
            store.flush();
            clearInterval(sweeper);
            io.close(() => done());
          }),
      }),
    );
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT) || 3001;
  startServer({ port }).then(({ port: p }) => console.log(`BoardHub server escuchando en http://localhost:${p}`));
}
