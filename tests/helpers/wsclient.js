/** Cliente de pruebas para el protocolo de BoardHub (WebSocket nativo de Node). */
export function makeClient(base) {
  const all = [];
  function client(code) {
    const ws = new WebSocket(`${base.replace('http', 'ws')}/ws/${code}`);
    const pending = new Map();
    let seq = 0;
    const c = { ws, lastView: null, lastRoom: null, events: [] };
    c.ready = new Promise((res, rej) => {
      ws.onopen = () => res();
      ws.onerror = (e) => rej(e);
    });
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.re != null) {
        pending.get(m.re)?.(m.data);
        pending.delete(m.re);
      } else {
        c.events.push(m.ev);
        if (m.ev === 'game:view') c.lastView = m.data;
        if (m.ev === 'room:update') c.lastRoom = m.data;
      }
    };
    c.call = async (ev, payload = {}) => {
      await c.ready;
      const id = ++seq;
      return new Promise((res) => {
        pending.set(id, res);
        ws.send(JSON.stringify({ id, ev, payload }));
      });
    };
    c.close = () => ws.close();
    all.push(c);
    return c;
  }
  async function create(gameId, name, options = {}) {
    const res = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId, name, options }) });
    return res.json();
  }
  /** Crea la sala y conecta al creador con su sesión. */
  async function host(gameId, name, options) {
    const r = await create(gameId, name, options);
    const c = client(r.code);
    const resumed = await c.call('room:resume', { token: r.token });
    return { ...r, c, resumed };
  }
  const closeAll = () => all.forEach((c) => c.close());
  return { client, create, host, closeAll };
}
export const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));
