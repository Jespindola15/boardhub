import { useCallback, useEffect, useState } from 'react';
import GameTopBar from './components/GameTopBar.jsx';
import Board from './components/board/Board.jsx';
import BoardCenter from './components/board/BoardCenter.jsx';
import PlayersPanel from './components/panels/PlayersPanel.jsx';
import SquareDetail from './components/panels/SquareDetail.jsx';
import TestToolsPanel from './components/panels/TestToolsPanel.jsx';
import GameLog from './components/panels/GameLog.jsx';
import { createMockGame } from './state/mockScenarios.js';
import { BOARD_SIZE } from './data/board.js';
import { PLAYER_STATUS } from './models/player.js';
import './magnate.css';

/**
 * Pantalla de partida de Magnate.
 *
 * Fase 1: el estado proviene de datos simulados. En la Fase 2 se sustituirá
 * por el estado oficial recibido del servidor (ver src/net/README.md); los
 * componentes hijos no cambian porque sólo reciben `state` por props.
 */
export default function MagnateScreen({ manifest }) {
  const [playerCount, setPlayerCount] = useState(6);
  const [scenarioId, setScenarioId] = useState('mid-game');
  const [state, setState] = useState(() => createMockGame(6, 'mid-game'));
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [highlightPlayerId, setHighlightPlayerId] = useState(null);

  useEffect(() => {
    setState(createMockGame(playerCount, scenarioId));
  }, [playerCount, scenarioId]);

  useEffect(() => {
    document.title = `${manifest?.name ?? 'Magnate'} · BoardHub`;
    const onKey = (e) => e.key === 'Escape' && setSelectedIndex(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [manifest]);

  const selectSquare = useCallback((i) => setSelectedIndex((cur) => (cur === i ? null : i)), []);

  /** Herramienta de prueba: recoloca fichas al azar para comprobar la animación. */
  const shuffleTokens = () =>
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.status === PLAYER_STATUS.IN_JAIL || p.status === PLAYER_STATUS.BANKRUPT
          ? p
          : { ...p, position: Math.floor(Math.random() * BOARD_SIZE) },
      ),
    }));

  return (
    <div className="magnate">
      <GameTopBar manifest={manifest} />
      <div className="magnate__layout">
        <aside className="magnate__left">
          <SquareDetail state={state} index={selectedIndex} />
          <TestToolsPanel
            playerCount={playerCount}
            scenarioId={scenarioId}
            onPlayerCount={setPlayerCount}
            onScenario={setScenarioId}
            onShuffle={shuffleTokens}
          />
        </aside>

        <main className="magnate__board">
          <Board
            state={state}
            selectedIndex={selectedIndex}
            onSelectSquare={selectSquare}
            highlightPlayerId={highlightPlayerId}
          >
            <BoardCenter state={state} />
          </Board>
        </main>

        <aside className="magnate__right">
          <PlayersPanel state={state} highlightPlayerId={highlightPlayerId} onHighlight={setHighlightPlayerId} />
          <GameLog entries={state.log} />
        </aside>
      </div>
    </div>
  );
}
