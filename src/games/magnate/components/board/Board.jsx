import { BOARD, isOwnable } from '../../data/board.js';
import { getOwner, getOwnership } from '../../state/selectors.js';
import BoardSquare from './BoardSquare.jsx';
import TokenLayer from './TokenLayer.jsx';
import { GRID_TEMPLATE } from './boardGeometry.js';
import './board.css';

/**
 * Tablero completo: 40 casillas en una cuadrícula 11×11, el centro (children)
 * y la capa de fichas. Siempre cuadrado y lo más grande que permita su contenedor.
 */
export default function Board({ state, selectedIndex, onSelectSquare, highlightPlayerId, children }) {
  return (
    <div className="board-wrap">
      <div className="board" style={{ gridTemplateColumns: GRID_TEMPLATE, gridTemplateRows: GRID_TEMPLATE }}>
        {BOARD.map((square) => {
          const ownership = getOwnership(state, square.index);
          const dimmed =
            Boolean(highlightPlayerId) && !(isOwnable(square) && ownership?.ownerId === highlightPlayerId);
          return (
            <BoardSquare
              key={square.id}
              square={square}
              ownership={ownership}
              owner={getOwner(state, square.index)}
              selected={selectedIndex === square.index}
              dimmed={dimmed}
              onSelect={onSelectSquare}
            />
          );
        })}
        <div className="board__center">{children}</div>
        <TokenLayer state={state} highlightPlayerId={highlightPlayerId} />
      </div>
    </div>
  );
}
