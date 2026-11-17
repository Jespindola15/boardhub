import { useEffect, useState } from 'react';
import GameBar from '../../platform/components/GameBar.jsx';
import Button from '../../shared/Button.jsx';
import useLocalGame from '../../shared/useLocalGame.js';
import { paletteHex } from '../../shared/playerPalette.js';
import Table from './components/Table.jsx';
import LocalSetup from './components/LocalSetup.jsx';
import RulesModal from './components/RulesModal.jsx';
import OnlineStart from './components/OnlineStart.jsx';
import { applyAction, getActingPlayerId, setup, getPlayerView, ACTIONS } from './engine/index.js';
import './ultima-carta.css';

const create = ({ players, options }) => setup({ id: `local-${Date.now()}`, players, options });

/** Entrada del juego: jugar en línea (salas) o en esta PC. */
export default function UltimaCartaScreen({ manifest }) {
  const local = useLocalGame({ storageKey: 'boardhub.ultima-carta.local.v1', applyAction, getActingPlayerId, create });
  const [mode, setMode] = useState(local.state ? 'local' : 'menu');
  const [rules, setRules] = useState(false);

  useEffect(() => {
    document.title = `${manifest?.name ?? 'Última Carta'} · BoardHub`;
  }, [manifest]);

  return (
    <div className="cm">
      <GameBar
        title={manifest?.name ?? 'Última Carta'}
        accent="#ef4444"
        badge={mode === "local" ? "Partida local · misma PC" : null}
        invite={false}
        inGame={mode === 'local' && Boolean(local.state)}
        onQuit={() => {
          local.quit();
          setMode('menu');
        }}
        actions={
          <Button size="sm" variant="ghost" onClick={() => setRules(true)}>
            Reglamento
          </Button>
        }
      />
      {mode === 'menu' && <OnlineStart onLocal={() => setMode('local')} />}
      {mode === 'local' && !local.state && <LocalSetup onStart={local.start} onBack={() => setMode('menu')} />}
      {mode === 'local' && local.state && <LocalTable state={local.state} send={local.send} onNewGame={local.quit} />}
      {rules && <RulesModal onClose={() => setRules(false)} />}
      {local.error && (
        <div className="cm-toast" role="alert" key={local.error}>
          {local.error}
        </div>
      )}
    </div>
  );
}

/** Modo local: la vista es la del jugador que debe decidir, tras la pantalla de "pasar la PC". */
function LocalTable({ state, send, onNewGame }) {
  const acting = getActingPlayerId(state) ?? state.players[0].id;
  const [revealedFor, setRevealedFor] = useState(null);
  const hidden = state.phase === 'playing' && revealedFor !== acting;
  const view = getPlayerView(state, acting);
  const actor = state.players.find((p) => p.id === acting);

  const curtain = hidden ? (
    <div className="cm-curtain">
      <span className="cm-avatar cm-avatar--lg" style={{ background: paletteHex(actor.colorId) }}>
        {actor.name[0].toUpperCase()}
      </span>
      <div>
        <h3>Turno de {actor.name}</h3>
        <p>Pasa la PC a {actor.name}. Los demás, no miren.</p>
      </div>
      <Button variant="primary" size="lg" onClick={() => setRevealedFor(acting)}>
        Soy {actor.name}: ver mis cartas
      </Button>
    </div>
  ) : null;

  return (
    <Table
      view={view}
      hidden={hidden}
      curtain={curtain}
      send={(type, payload) => send(type, payload, acting)}
      onCatch={(targetId) => {
        const catcher = state.players.find((p) => !p.left && p.id !== targetId);
        send(ACTIONS.CATCH, { targetId }, catcher.id);
      }}
      onNextRound={onNewGame}
    />
  );
}
