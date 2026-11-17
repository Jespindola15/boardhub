import { useEffect, useMemo, useReducer, useRef } from 'react';
import Token from './Token.jsx';
import { layoutTokens } from './boardGeometry.js';
import { PLAYER_STATUS } from '../../models/player.js';
import { BOARD_SIZE } from '../../data/board.js';

const STEP_MS = 150;
const MAX_WALK = 12; // más lejos que esto (cárcel, cartas) la ficha salta

const positionsOf = (state) => Object.fromEntries(state.players.map((p) => [p.id, p.position]));

/**
 * Capa de fichas superpuesta al tablero.
 * Las fichas se dibujan aquí (no dentro de cada casilla) para poder animar el
 * recorrido casilla a casilla y repartir hasta 8 por casilla sin solaparse.
 */
export default function TokenLayer({ state, highlightPlayerId }) {
  const shown = useRef(positionsOf(state));
  const [, redraw] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const target = positionsOf(state);
    const timer = setInterval(() => {
      const next = { ...shown.current };
      let moving = false;
      for (const [id, to] of Object.entries(target)) {
        const from = next[id] ?? to;
        if (from === to) continue;
        const dist = (to - from + BOARD_SIZE) % BOARD_SIZE;
        next[id] = dist <= MAX_WALK ? (from + 1) % BOARD_SIZE : to;
        if (next[id] !== to) moving = true;
      }
      shown.current = next;
      redraw();
      if (!moving) clearInterval(timer);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [state]);

  const placed = useMemo(() => {
    const bySquare = {};
    for (const p of state.players) {
      if (p.status === PLAYER_STATUS.BANKRUPT) continue;
      const pos = shown.current[p.id] ?? p.position;
      (bySquare[pos] ??= []).push(p);
    }
    const result = [];
    for (const [index, players] of Object.entries(bySquare)) {
      const occupants = players.map((p) => ({
        id: p.id,
        inJail: p.status === PLAYER_STATUS.IN_JAIL && p.position === Number(index),
      }));
      for (const slot of layoutTokens(Number(index), occupants)) {
        result.push({ ...slot, player: players.find((p) => p.id === slot.id) });
      }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, shown.current]);

  return (
    <div className="token-layer" aria-hidden="true">
      {placed.map(({ id, x, y, size, player }) => (
        <Token
          key={id}
          player={player}
          isCurrent={state.turn.playerId === id}
          faded={Boolean(highlightPlayerId) && highlightPlayerId !== id}
          className="token--board"
          style={{ left: `${x}%`, top: `${y}%`, width: `${size}%` }}
        />
      ))}
    </div>
  );
}
