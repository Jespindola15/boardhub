import Panel from '../../../../shared/Panel.jsx';
import Button from '../../../../shared/Button.jsx';
import { OfferList } from '../controls/TradeReview.jsx';
import { getPlayer } from '../../state/selectors.js';
import { ACTIONS } from '../../engine/index.js';
import { useSeat } from '../seat.js';

/** Ofertas de negociación abiertas. No detienen la partida; se validan otra vez al aceptarlas. */
export default function OffersPanel({ state, send }) {
  const { canAct, online, me } = useSeat();
  if (!state.trades.length || state.phase !== 'playing') return null;
  return (
    <Panel title={`Ofertas abiertas (${state.trades.length})`} className="offers-panel" bodyClassName="offers__body">
      {state.trades.map((t) => {
        const from = getPlayer(state, t.fromId);
        const to = getPlayer(state, t.toId);
        return (
          <article key={t.id} className="offer">
            <header>
              <strong>{from.name}</strong> → <strong>{to.name}</strong>
            </header>
            <div className="offer__cols">
              <div>
                <h5>{to.name} recibe</h5>
                <OfferList offer={t.give} state={state} />
              </div>
              <div>
                <h5>{to.name} entrega</h5>
                <OfferList offer={t.get} state={state} />
              </div>
            </div>
            <div className="offer__actions">
              {canAct(to.id) && (
                <>
                  <Button size="sm" variant="primary" onClick={() => send(ACTIONS.RESPOND_TRADE, { tradeId: t.id, accept: true }, to.id)}>
                    {online ? 'Aceptar' : `${to.name} acepta`}
                  </Button>
                  <Button size="sm" onClick={() => send(ACTIONS.RESPOND_TRADE, { tradeId: t.id, accept: false }, to.id)}>
                    Rechazar
                  </Button>
                </>
              )}
              {canAct(from.id) && (
                <Button size="sm" variant="ghost" onClick={() => send(ACTIONS.CANCEL_TRADE, { tradeId: t.id }, from.id)}>
                  Retirar
                </Button>
              )}
              {online && me !== to.id && me !== from.id && <span className="offer__wait">Esperando respuesta…</span>}
            </div>
          </article>
        );
      })}
    </Panel>
  );
}
