import { useCallback, useEffect, useState } from 'react';
import Board from './components/board/Board.jsx';
import BoardCenter from './components/board/BoardCenter.jsx';
import PlayersPanel from './components/panels/PlayersPanel.jsx';
import SquareDetail from './components/panels/SquareDetail.jsx';
import GameLog from './components/panels/GameLog.jsx';
import BankPanel from './components/panels/BankPanel.jsx';
import OffersPanel from './components/panels/OffersPanel.jsx';
import TradeComposer from './components/controls/TradeComposer.jsx';
import { SeatContext } from './components/seat.js';
import { getPendingDeciders } from './engine/index.js';
import './magnate.css';
import './components/controls/controls.css';

/**
 * Mesa de Magnate. Dibuja un estado (local) o una vista (online) y envía intenciones.
 *  - me: null en local; id del jugador en online.
 *  - send(type, payload, asPlayerId?): en online `asPlayerId` se ignora (lo pone el servidor).
 */
export default function MagnateGame({ state, send, me = null, onNewGame }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [highlightPlayerId, setHighlightPlayerId] = useState(null);
  const [tradeOpen, setTradeOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setSelectedIndex(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Al caer en una propiedad en venta o abrirse una subasta, mostrar su ficha.
  useEffect(() => {
    if (state.pendingPurchase != null) setSelectedIndex(state.pendingPurchase);
    else if (state.auction?.kind === 'property') setSelectedIndex(state.auction.index);
  }, [state.pendingPurchase, state.auction?.index]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectSquare = useCallback((i) => setSelectedIndex((cur) => (cur === i ? null : i)), []);
  const deciders = state.deciders ?? getPendingDeciders(state);

  return (
    <SeatContext.Provider value={{ me }}>
      <div className="magnate__layout">
        <aside className="magnate__left">
          <SquareDetail state={state} index={selectedIndex} send={send} />
          <OffersPanel state={state} send={send} />
          <BankPanel state={state} />
        </aside>

        <main className="magnate__board">
          <Board state={state} selectedIndex={selectedIndex} onSelectSquare={selectSquare} highlightPlayerId={highlightPlayerId}>
            <BoardCenter state={state} send={send} onOpenTrade={() => setTradeOpen(true)} onNewGame={onNewGame} />
          </Board>
        </main>

        <aside className="magnate__right">
          <PlayersPanel
            state={state}
            deciders={deciders}
            highlightPlayerId={highlightPlayerId}
            onHighlight={setHighlightPlayerId}
            onSelectSquare={setSelectedIndex}
          />
          <GameLog entries={state.log} />
        </aside>
      </div>
      {tradeOpen && <TradeComposer state={state} send={send} onClose={() => setTradeOpen(false)} />}
    </SeatContext.Provider>
  );
}
