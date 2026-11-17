import { useCallback, useEffect, useState } from 'react';
import GameTopBar from './components/GameTopBar.jsx';
import Board from './components/board/Board.jsx';
import BoardCenter from './components/board/BoardCenter.jsx';
import PlayersPanel from './components/panels/PlayersPanel.jsx';
import SquareDetail from './components/panels/SquareDetail.jsx';
import GameLog from './components/panels/GameLog.jsx';
import BankPanel from './components/panels/BankPanel.jsx';
import OffersPanel from './components/panels/OffersPanel.jsx';
import TradeComposer from './components/controls/TradeComposer.jsx';
import SetupScreen from './components/setup/SetupScreen.jsx';
import useLocalMagnate from './useLocalMagnate.js';
import { getPendingDeciders } from './engine/index.js';
import './magnate.css';
import './components/controls/controls.css';

/**
 * Pantalla de Magnate. La partida la controla `useLocalMagnate` (misma PC).
 * Cuando exista el servidor se sustituirá por un controlador online con la
 * misma interfaz { state, send } y esta pantalla no cambiará.
 */
export default function MagnateScreen({ manifest }) {
  const { state, send, error, start, quit } = useLocalMagnate();
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [highlightPlayerId, setHighlightPlayerId] = useState(null);
  const [tradeOpen, setTradeOpen] = useState(false);

  useEffect(() => {
    document.title = `${manifest?.name ?? 'Magnate'} · BoardHub`;
    const onKey = (e) => e.key === 'Escape' && setSelectedIndex(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [manifest]);

  // Al caer en una propiedad en venta, mostrar su ficha automáticamente.
  useEffect(() => {
    if (state?.pendingPurchase != null) setSelectedIndex(state.pendingPurchase);
    else if (state?.auction?.kind === 'property') setSelectedIndex(state.auction.index);
  }, [state?.pendingPurchase, state?.auction?.index]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectSquare = useCallback((i) => setSelectedIndex((cur) => (cur === i ? null : i)), []);

  if (!state) {
    return (
      <div className="magnate">
        <GameTopBar manifest={manifest} inGame={false} />
        <SetupScreen onStart={start} />
      </div>
    );
  }

  return (
    <div className="magnate">
      <GameTopBar manifest={manifest} inGame onQuit={quit} />
      <div className="magnate__layout">
        <aside className="magnate__left">
          <SquareDetail state={state} index={selectedIndex} send={send} />
          <OffersPanel state={state} send={send} />
          <BankPanel state={state} />
        </aside>

        <main className="magnate__board">
          <Board state={state} selectedIndex={selectedIndex} onSelectSquare={selectSquare} highlightPlayerId={highlightPlayerId}>
            <BoardCenter state={state} send={send} onOpenTrade={() => setTradeOpen(true)} onNewGame={quit} />
          </Board>
        </main>

        <aside className="magnate__right">
          <PlayersPanel
            state={state}
            deciders={getPendingDeciders(state)}
            highlightPlayerId={highlightPlayerId}
            onHighlight={setHighlightPlayerId}
            onSelectSquare={setSelectedIndex}
          />
          <GameLog entries={state.log} />
        </aside>
      </div>

      {tradeOpen && <TradeComposer state={state} send={send} onClose={() => setTradeOpen(false)} />}
      {error && (
        <div className="toast" role="alert" key={error}>
          {error}
        </div>
      )}
    </div>
  );
}
