import { useCallback, useEffect, useRef, useState } from 'react';

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(key, state) {
  try {
    if (state) localStorage.setItem(key, JSON.stringify(state));
    else localStorage.removeItem(key);
  } catch {
    /* sin almacenamiento: la partida sigue en memoria */
  }
}

/**
 * Controlador genérico de partida LOCAL (varios jugadores en la misma PC).
 *
 * Todos los juegos exponen el mismo contrato de motor:
 *   applyAction(state, { type, playerId, payload }) -> { ok, state } | { ok: false, error }
 *   getActingPlayerId(state)
 * El controlador online futuro tendrá la misma forma { state, send, error },
 * pero `send` enviará la intención al servidor en lugar de ejecutar el motor aquí.
 */
export default function useLocalGame({ storageKey, applyAction, getActingPlayerId, create }) {
  const [state, setState] = useState(() => load(storageKey));
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => save(storageKey, state), [storageKey, state]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = useCallback((msg) => {
    setError(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setError(null), 3500);
  }, []);

  /** Ejecuta una acción en nombre de quien debe decidir (o de `asPlayerId`). */
  const send = useCallback(
    (type, payload = {}, asPlayerId) => {
      setState((current) => {
        if (!current) return current;
        const playerId = asPlayerId ?? getActingPlayerId(current) ?? current.players[0].id;
        const result = applyAction(current, { type, playerId, payload });
        if (!result.ok) {
          queueMicrotask(() => flash(result.error));
          return current;
        }
        return result.state;
      });
    },
    [applyAction, getActingPlayerId, flash],
  );

  const start = useCallback((config) => setState(create(config)), [create]);
  const quit = useCallback(() => setState(null), []);

  return { state, send, error, start, quit };
}
