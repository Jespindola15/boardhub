import { useCallback, useEffect, useRef, useState } from 'react';
import { connectRoom, createRoomRequest } from './socket.js';
import { loadSession, saveSession, clearSession, rememberName } from './session.js';

let counter = 0;
const newActionId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2)}`) + `-${counter++}`;

/**
 * Conexión a una sala online.
 * status: 'connecting' | 'need-join' | 'joined' | 'removed' | 'error'
 * El cliente sólo envía intenciones; el estado oficial llega del servidor (`view`).
 */
export default function useRoom(code) {
  const [status, setStatus] = useState('connecting');
  const [room, setRoom] = useState(null);
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const timer = useRef(null);
  const viewRef = useRef(null);
  const conn = useRef(null);

  const flash = useCallback((msg) => {
    setError(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setError(null), 4000);
  }, []);

  useEffect(() => {
    viewRef.current = null;
    const c = connectRoom(code, {
      onStatus: async (s) => {
        setConnected(s === 'open');
        if (s === 'missing') {
          clearSession(code);
          setError('No hay ninguna mesa con ese código. Puede que se haya cerrado por inactividad.');
          setStatus('error');
        }
        if (s !== 'open') return;
        // Al (re)conectar: recuperar el asiento si hay sesión guardada.
        const session = loadSession(code);
        if (!session) return setStatus('need-join');
        const r = await c.request('room:resume', { token: session.token });
        if (r.ok) setStatus('joined');
        else {
          clearSession(code);
          setStatus('need-join');
        }
      },
      onEvent: (ev, data) => {
        if (ev === 'room:update') setRoom(data);
        else if (ev === 'game:view') {
          // Nunca retroceder a una versión anterior.
          if (data && viewRef.current && data.version < viewRef.current.version) return;
          viewRef.current = data;
          setView(data);
        } else if (ev === 'room:removed') {
          clearSession(code);
          setStatus('removed');
        }
      },
    });
    conn.current = c;
    const onVisible = () => document.visibilityState === 'visible' && c.request('sync');
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      c.close();
    };
  }, [code]);

  const join = useCallback(
    async (name) => {
      const r = await conn.current.request('room:join', { name });
      if (!r.ok) return flash(r.error);
      rememberName(name);
      saveSession(r.code, { token: r.token, playerId: r.playerId });
      setStatus('joined');
    },
    [flash],
  );

  const send = useCallback(
    async (type, payload = {}) => {
      const r = await conn.current.request('game:action', {
        clientActionId: newActionId(),
        type,
        payload,
        expectedVersion: viewRef.current?.version,
      });
      if (!r.ok) {
        flash(r.error);
        if (r.stale) conn.current.request('sync');
      }
      return r;
    },
    [flash],
  );

  const call = useCallback(
    async (event, payload = {}) => {
      const r = await conn.current.request(event, payload);
      if (!r.ok) flash(r.error);
      return r;
    },
    [flash],
  );

  const leave = useCallback(async () => {
    await conn.current.request('room:leave');
    clearSession(code);
  }, [code]);

  return { status, room, view, error, connected, join, send, call, leave, me: loadSession(code)?.playerId ?? null };
}

/** Crear sala nueva (desde el catálogo o la página de salas). */
export async function createRoom({ gameId, name, options, visibility }) {
  const r = await createRoomRequest({ gameId, name, options, visibility });
  if (r.ok) {
    rememberName(name);
    saveSession(r.code, { token: r.token, playerId: r.playerId });
  }
  return r;
}
