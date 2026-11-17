import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket, request } from './socket.js';
import { loadSession, saveSession, clearSession, rememberName } from './session.js';

let counter = 0;
const newActionId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2)}`) + `-${counter++}`;

/**
 * Conexión a una sala online.
 * status: 'connecting' | 'need-join' | 'joined' | 'removed' | 'error'
 * El cliente sólo envía intenciones; el estado llega del servidor (`view`).
 */
export default function useRoom(code) {
  const [status, setStatus] = useState('connecting');
  const [room, setRoom] = useState(null);
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const timer = useRef(null);
  const viewRef = useRef(null);

  const flash = useCallback((msg) => {
    setError(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setError(null), 4000);
  }, []);

  useEffect(() => {
    const s = getSocket();
    const resume = async () => {
      const session = loadSession(code);
      if (!session) {
        setStatus('need-join');
        return;
      }
      const r = await request('room:resume', { code, token: session.token });
      if (r.ok) setStatus('joined');
      else {
        clearSession(code);
        setStatus(r.error?.includes('código') ? 'error' : 'need-join');
        if (r.error?.includes('código')) setError(r.error);
      }
    };
    const onConnect = () => {
      setConnected(true);
      resume(); // también al reconectar tras un corte
    };
    const onDisconnect = () => setConnected(false);
    const onRoom = (r) => r.code === code.toUpperCase() && setRoom(r);
    // Nunca retroceder a una versión anterior (mensajes reordenados o reconexiones).
    const onView = (v) => {
      if (v && viewRef.current && v.version < viewRef.current.version) return;
      viewRef.current = v;
      setView(v);
    };
    // Al volver a la pestaña, pedir la vista actual por si se perdió algo.
    const onVisible = () => document.visibilityState === 'visible' && s.connected && request('sync', {});
    const onRemoved = () => {
      clearSession(code);
      setStatus('removed');
    };
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('room:update', onRoom);
    s.on('game:view', onView);
    s.on('room:removed', onRemoved);
    document.addEventListener('visibilitychange', onVisible);
    if (s.connected) onConnect();
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('room:update', onRoom);
      s.off('game:view', onView);
      s.off('room:removed', onRemoved);
    };
  }, [code]);

  const join = useCallback(
    async (name) => {
      const r = await request('room:join', { code, name });
      if (!r.ok) return flash(r.error);
      rememberName(name);
      saveSession(r.code, { token: r.token, playerId: r.playerId });
      setStatus('joined');
    },
    [code, flash],
  );

  const send = useCallback(
    async (type, payload = {}) => {
      const r = await request('game:action', {
        clientActionId: newActionId(),
        type,
        payload,
        expectedVersion: viewRef.current?.version,
      });
      if (!r.ok) {
        flash(r.error);
        if (r.stale) request('sync', {});
      }
      return r;
    },
    [flash],
  );

  const call = useCallback(
    async (event, payload = {}) => {
      const r = await request(event, payload);
      if (!r.ok) flash(r.error);
      return r;
    },
    [flash],
  );

  const leave = useCallback(async () => {
    await request('room:leave', {});
    clearSession(code);
  }, [code]);

  return { status, room, view, error, connected, join, send, call, leave, me: loadSession(code)?.playerId ?? null };
}

/** Crear sala nueva (desde el catálogo o la página de salas). */
export async function createRoom({ gameId, name, options }) {
  const r = await request('room:create', { gameId, name, options });
  if (r.ok) {
    rememberName(name);
    saveSession(r.code, { token: r.token, playerId: r.playerId });
  }
  return r;
}
