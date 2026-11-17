import { useMemo } from 'react';
import Token from './Token.jsx';
import { layoutTokens } from './boardGeometry.js';
import { getPlayersBySquare } from '../../state/selectors.js';
import { PLAYER_STATUS } from '../../models/player.js';

/**
 * Capa de fichas superpuesta al tablero.
 *
 * Las fichas no se dibujan dentro de cada casilla sino en esta capa, con
 * posición absoluta calculada por boardGeometry. Ventajas:
 *  - Al cambiar `position`, la ficha se desliza con una transición CSS
 *    (base para la animación de movimiento de la Fase 2).
 *  - Hasta 8 fichas por casilla se reparten en una cuadrícula sin solaparse.
 */
export default function TokenLayer({ state, highlightPlayerId }) {
  const placed = useMemo(() => {
    const bySquare = getPlayersBySquare(state);
    const result = [];
    for (const [index, players] of Object.entries(bySquare)) {
      const occupants = players.map((p) => ({ id: p.id, inJail: p.status === PLAYER_STATUS.IN_JAIL }));
      const layout = layoutTokens(Number(index), occupants);
      for (const slot of layout) result.push({ ...slot, player: players.find((p) => p.id === slot.id) });
    }
    // Orden estable por jugador: React reutiliza el mismo nodo y la transición funciona.
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }, [state]);

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
