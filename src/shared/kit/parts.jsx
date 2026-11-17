import { paletteHex } from '../playerPalette.js';
import Button from '../Button.jsx';
import './kit.css';

export function Avatar({ player, size }) {
  return (
    <span className={`kit-avatar ${size ? `kit-avatar--${size}` : ''}`} style={{ background: paletteHex(player.colorId) }}>
      {(player.name?.[0] ?? '?').toUpperCase()}
    </span>
  );
}

/** Registro de la partida (las últimas líneas primero). */
export function GameLog({ lines = [], title = 'Registro' }) {
  return (
    <section className="kit-panel kit-log">
      <h4>{title}</h4>
      <ol>
        {[...lines].reverse().map((l, i) => (
          <li key={i}>{typeof l === 'string' ? l : l.text}</li>
        ))}
      </ol>
    </section>
  );
}

/** Banner de fin de partida. */
export function Finished({ view, onNextRound, nextRoundLabel = 'Volver', children }) {
  const names = (view.winners ?? []).map((id) => view.players.find((p) => p.id === id)?.name).filter(Boolean);
  const meWin = view.winners?.includes(view.me);
  return (
    <div className="kit-overlay">
      <div className="kit-overlay__box">
        <span className="kit-trophy">🏆</span>
        <h2>{meWin ? '¡Ganaste!' : names.length ? `Gana ${names.join(' y ')}` : 'Fin de la partida'}</h2>
        {children}
        {onNextRound && (
          <Button variant="primary" size="lg" onClick={onNextRound}>
            {nextRoundLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Texto de estado ("Te toca…", "Esperando a…"). */
export function TurnBanner({ view, mine, waiting }) {
  const cur = view.players.find((p) => p.id === (view.deciders?.[0] ?? view.currentPlayerId));
  if (mine) return <div className="kit-turn is-mine">{mine}</div>;
  return <div className="kit-turn">{waiting ?? (cur ? `Esperando a ${cur.name}…` : '')}</div>;
}
