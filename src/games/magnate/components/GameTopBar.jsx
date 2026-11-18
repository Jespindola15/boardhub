import { useState } from 'react';
import Logo from '../../../platform/components/Logo.jsx';
import Button from '../../../shared/Button.jsx';
import Badge from '../../../shared/Badge.jsx';
import RulesModal from './panels/RulesModal.jsx';
import { navigate } from '../../../app/router.js';

export default function GameTopBar({ manifest, inGame, onQuit }) {
  const [rules, setRules] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <header className="game-topbar wood">
      <a href="#/" className="game-topbar__home" aria-label="Volver a BoardHub">
        <Logo size={24} />
      </a>
      <span className="game-topbar__sep" />
      <h1 className="game-topbar__title">{manifest?.name ?? 'Magnate'}</h1>
      <Badge tone="ok">Partida local · misma PC</Badge>
      <div className="game-topbar__actions">
        <Button size="sm" variant="ghost" onClick={() => setRules(true)}>
          Reglamento
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate('/salas?juego=magnate')} title="Crear o buscar una sala online de Magnate">
          Jugar online
        </Button>
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
      {rules && <RulesModal onClose={() => setRules(false)} />}
    </header>
  );
}
