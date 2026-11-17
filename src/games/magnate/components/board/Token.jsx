import TokenShape from '../icons/TokenShape.jsx';
import { getPlayerColor } from '../../models/player.js';

/** Ficha de jugador. Se usa en el tablero y, en tamaño fijo, en los paneles. */
export default function Token({ player, isCurrent = false, faded = false, style, className = '' }) {
  const color = getPlayerColor(player.colorId).hex;
  const classes = [
    'token',
    isCurrent ? 'is-current' : '',
    faded ? 'is-faded' : '',
    player.status === 'disconnected' ? 'is-disconnected' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} style={{ '--token-color': color, ...style }} title={player.name}>
      <TokenShape tokenId={player.tokenId} color="rgba(10, 12, 26, 0.88)" size="62%" />
    </span>
  );
}
