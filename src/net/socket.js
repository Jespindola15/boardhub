/**
 * Transporte en tiempo real de BoardHub: WebSocket nativo (funciona igual contra el
 * servidor Node y contra el Worker de Cloudflare). Una conexión por sala: /ws/CODIGO.
 *
 * - request(ev, payload) → Promise de la respuesta (con tiempo límite).
 * - Reconexión automática con espera creciente.
 * - Latido cada 15 s: si el servidor no responde, se fuerza la reconexión.
 */
const wsUrl = (code) => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/${code}`;

export function connectRoom(code, { onEvent, onStatus }) {
  let ws = null;
  let closedByUser = false;
  let attempt = 0;
  let seq = 0;
  let heartbeat = null;
  const pending = new Map();

  const failPending = (error) => {
    for (const [id, p] of pending) {
      clearTimeout(p.timer);
      p.resolve({ ok: false, error });
      pending.delete(id);
    }
  };

  function request(ev, payload = {}, timeoutMs = 8000) {
    return new Promise((resolve) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        resolve({ ok: false, error: 'Sin conexión con el servidor: reconectando…' });
        return;
      }
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({ ok: false, error: 'El servidor no responde.', timeout: true });
      }, timeoutMs);
      pending.set(id, { resolve, timer });
      ws.send(JSON.stringify({ id, ev, payload }));
    });
  }

  function open() {
    onStatus?.('connecting');
    ws = new WebSocket(wsUrl(code));
    ws.onopen = () => {
      attempt = 0;
      onStatus?.('open');
      clearInterval(heartbeat);
      heartbeat = setInterval(async () => {
        const r = await request('ping', {}, 6000);
        if (r.timeout) ws?.close();
      }, 15000);
    };
    ws.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.re != null) {
        const p = pending.get(m.re);
        if (p) {
          pending.delete(m.re);
          clearTimeout(p.timer);
          p.resolve(m.data);
        }
      } else if (m.ev) onEvent?.(m.ev, m.data);
    };
    ws.onclose = (e) => {
      clearInterval(heartbeat);
      failPending('Se perdió la conexión: reconectando…');
      if (e.code === 4004) {
        onStatus?.('missing');
        return;
      }
      onStatus?.('closed');
      if (!closedByUser) setTimeout(open, Math.min(8000, 400 * 2 ** attempt++));
    };
  }

  open();
  return {
    request,
    close() {
      closedByUser = true;
      clearInterval(heartbeat);
      ws?.close();
    },
  };
}

/** Crea una sala nueva (HTTP). */
export async function createRoomRequest({ gameId, name, options }) {
  try {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, name, options }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'No se pudo contactar al servidor.' };
  }
}
