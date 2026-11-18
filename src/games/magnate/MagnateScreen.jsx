import { useEffect, useState } from 'react';
import GameTopBar from './components/GameTopBar.jsx';
import SetupScreen from './components/setup/SetupScreen.jsx';
import MagnateGame from './MagnateGame.jsx';
import useLocalMagnate from './useLocalMagnate.js';
import Button from '../../shared/Button.jsx';
import { navigate } from '../../app/router.js';
import './magnate.css';

/** Entrada de Magnate: jugar en línea (salas) o en esta PC. */
export default function MagnateScreen({ manifest }) {
  const { state, send, error, start, quit } = useLocalMagnate();
  const [mode, setMode] = useState(state ? 'local' : 'menu');

  useEffect(() => {
    document.title = `${manifest?.name ?? 'Magnate'} · BoardHub`;
  }, [manifest]);

  return (
    <div className="magnate">
      <GameTopBar manifest={manifest} inGame={mode === 'local' && Boolean(state)} onQuit={() => { quit(); setMode('menu'); }} />
      {mode === 'menu' && (
        <div className="setup cafe-stage">
          <div className="setup__card setup__card--menu">
            <header className="setup__head">
              <span className="setup__logo">MAGNATE</span>
              <p>Compra, alquila y negocia hasta dominar la ciudad. De 2 a 8 jugadores.</p>
            </header>
            <Button variant="primary" size="lg" onClick={() => navigate('/salas?juego=magnate')}>
              Abrir o buscar una mesa en línea
            </Button>
            <Button size="lg" onClick={() => setMode('local')}>
              Jugar en esta compu, pasándola
            </Button>
          </div>
        </div>
      )}
      {mode === 'local' && !state && <SetupScreen onStart={start} />}
      {mode === 'local' && state && <MagnateGame state={state} send={send} onNewGame={quit} />}
      {error && (
        <div className="toast" role="alert" key={error}>
          {error}
        </div>
      )}
    </div>
  );
}
