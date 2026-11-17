/**
 * BoardHub en Cloudflare Workers.
 *  - La web compilada (dist/) se sirve como Static Assets.
 *  - POST /api/rooms crea una sala.
 *  - /ws/CODIGO abre el WebSocket de una sala.
 *  - Cada sala es un Durable Object (RoomDO): guarda la partida y mantiene las conexiones.
 * Usa el mismo núcleo (server/core) y los mismos motores que el servidor Node.
 */
import { isValidCode, newCode } from '../server/core/room.js';
export { RoomDO } from './room-do.js';

const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = newCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await stub.create({ code, gameId: body.gameId, name: body.name, options: body.options });
        if (res.exists) continue; // código ya usado: probar otro
        return json(res, res.ok ? 200 : 400);
      }
      return json({ ok: false, error: 'No se pudo crear la sala. Inténtalo de nuevo.' }, 503);
    }

    const ws = url.pathname.match(/^\/ws\/([A-Za-z0-9]{6})\/?$/);
    if (ws) {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Se esperaba un WebSocket.', { status: 426 });
      const code = ws[1].toUpperCase();
      if (!isValidCode(code)) return new Response('Código no válido.', { status: 404 });
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
    }

    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'No encontrado.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
