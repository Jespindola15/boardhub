import { memo } from 'react';
import { getGroup } from '../../data/groups.js';
import { SQUARE_TYPES } from '../../data/board.js';
import { getPlayerColor } from '../../models/player.js';
import { HOTEL } from '../../state/gameState.js';
import { gridPosition } from './boardGeometry.js';
import SquareIcon, { iconForSquare } from '../icons/SquareIcon.jsx';
import { formatMoney } from '../format.js';

/**
 * Una casilla del tablero. Componente de presentación: recibe todo por props.
 */
function BoardSquare({ square, ownership, owner, selected, dimmed, onSelect }) {
  const { row, col, side, corner } = gridPosition(square.index);
  const classes = [
    'sq',
    `sq--${square.type}`,
    `sq--${side}`,
    corner ? 'sq--corner' : '',
    selected ? 'is-selected' : '',
    dimmed ? 'is-dimmed' : '',
    ownership?.mortgaged ? 'is-mortgaged' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      style={{ gridRow: row, gridColumn: col }}
      onClick={() => onSelect(square.index)}
      aria-pressed={selected}
      aria-label={square.name}
    >
      {corner ? <CornerContent square={square} /> : <SideContent square={square} ownership={ownership} owner={owner} />}
    </button>
  );
}

function SideContent({ square, ownership, owner }) {
  const group = getGroup(square.group);
  const isProperty = square.type === SQUARE_TYPES.PROPERTY;
  const icon = iconForSquare(square);
  const ownerColor = owner ? getPlayerColor(owner.colorId).hex : null;

  return (
    <div className="sq__content">
      {isProperty && (
        <div className="sq__band" style={{ background: group.color }}>
          <Buildings houses={ownership?.houses ?? 0} />
        </div>
      )}
      {!isProperty && icon && (
        <div className={`sq__icon sq__icon--${square.type}`}>
          <SquareIcon name={icon} />
        </div>
      )}
      <div className="sq__name">{square.name}</div>
      <div className="sq__price">
        {square.price ? formatMoney(square.price) : square.amount ? `Paga ${formatMoney(square.amount)}${square.percent ? ` o ${square.percent} %` : ''}` : ''}
      </div>
      {ownerColor && <div className="sq__owner" style={{ background: ownerColor }} title={`Propietario: ${owner.name}`} />}
      {ownership?.mortgaged && <div className="sq__mortgage">Hipotecada</div>}
    </div>
  );
}

function Buildings({ houses }) {
  if (!houses) return null;
  if (houses === HOTEL) {
    return (
      <span className="sq__buildings" aria-label="Hotel">
        <span className="bld bld--hotel" />
      </span>
    );
  }
  return (
    <span className="sq__buildings" aria-label={`${houses} casas`}>
      {Array.from({ length: houses }, (_, i) => (
        <span key={i} className="bld bld--house" />
      ))}
    </span>
  );
}

function CornerContent({ square }) {
  if (square.type === SQUARE_TYPES.JAIL) {
    return (
      <div className="corner corner--jail">
        <div className="jail__cell">
          <div className="jail__bars" />
          <span className="jail__label">En la cárcel</span>
        </div>
        <span className="jail__visit jail__visit--side">Solo de</span>
        <span className="jail__visit jail__visit--bottom">visita</span>
      </div>
    );
  }
  return (
    <div className={`corner corner--${square.type}`}>
      <SquareIcon name={iconForSquare(square)} className="corner__icon" strokeWidth={2} />
      <span className="corner__name">{square.name}</span>
      {square.subtitle && <span className="corner__sub">{square.subtitle}</span>}
    </div>
  );
}

export default memo(BoardSquare);
