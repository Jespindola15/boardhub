import { useState } from 'react';
import Logo from './Logo.jsx';
import Button from '../../shared/Button.jsx';
import Badge from '../../shared/Badge.jsx';
import { navigate } from '../../app/router.js';
import './platform.css';

/**
 * Barra superior común a todas las pantallas de juego.
 * `actions` se inserta antes de los botones estándar.
 */
export default function GameBar({ title, accent = 'var(--brand-3)', inGame, onQuit, actions, badge = 'Partida local · misma PC', onlineSlug }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <header className="game-bar wood">
      <a href="#/" className="game-bar__home" aria-label="Volver a BoardHub">
        <Logo size={24} />
      </a>
      <span className="game-bar__sep" />
      <h1 className="game-bar__title" style={{ color: accent }}>
        {title}
      </h1>
      {badge && <Badge tone="neutral">{badge}</Badge>}
      <div className="game-bar__actions">
        {actions}
        {onlineSlug && (
          <Button size="sm" variant="ghost" onClick={() => navigate(`/salas?juego=${onlineSlug}`)} title="Crear o buscar una sala online de este juego">
            Jugar online
          </Button>
        )}
        {inGame &&
          (confirm ? (
            <>
              <Button size="sm" variant="danger" onClick={() => { setConfirm(false); onQuit(); }}>
                Sí, terminar partida
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
                No
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
              Terminar partida
            </Button>
          ))}
        <Button size="sm" onClick={() => navigate('/')}>
          Salir al catálogo
        </Button>
      </div>
    </header>
  );
}
