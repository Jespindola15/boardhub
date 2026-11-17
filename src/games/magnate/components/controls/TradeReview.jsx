import Button from '../../../../shared/Button.jsx';
import { BOARD } from '../../data/board.js';
import { getGroup } from '../../data/groups.js';
import { getPlayer } from '../../state/selectors.js';
import { ACTIONS } from '../../engine/index.js';
import { formatMoney } from '../format.js';

export function OfferList({ offer, state }) {
  const items = [];
  if (offer.money) items.push(<li key="m">{formatMoney(offer.money)}</li>);
  for (const i of offer.squares) {
    const sq = BOARD[i];
    items.push(
      <li key={i}>
        <span className="chip-dot" style={{ background: getGroup(sq.group)?.color }} />
        {sq.name}
        {state.ownership[i]?.mortgaged && <em> (hipotecada)</em>}
      </li>,
    );
  }
  if (offer.jailCards) items.push(<li key="j">{offer.jailCards} carta(s) de libertad</li>);
  return items.length ? <ul className="offer-list">{items}</ul> : <p className="offer-empty">Nada</p>;
}

export default function TradeReview({ state, send }) {
  const t = state.trade;
  const from = getPlayer(state, t.fromId);
  const to = getPlayer(state, t.toId);
  return (
    <div className="ctx-card">
      <div className="ctx-card__head">
        <span className="ctx-card__kicker">Propuesta de {from.name}</span>
        <strong>{to.name}, ¿aceptas el trato?</strong>
      </div>
      <div className="trade-review">
        <div>
          <h5>{to.name} recibe</h5>
          <OfferList offer={t.give} state={state} />
        </div>
        <div>
          <h5>{to.name} entrega</h5>
          <OfferList offer={t.get} state={state} />
        </div>
      </div>
      <p className="ctx-card__text ctx-card__text--small">
        Las propiedades hipotecadas obligan a quien las recibe a pagar un 10 % de interés.
      </p>
      <div className="auction__row">
        <Button variant="primary" onClick={() => send(ACTIONS.RESPOND_TRADE, { accept: true })}>
          Aceptar
        </Button>
        <Button onClick={() => send(ACTIONS.RESPOND_TRADE, { accept: false })}>Rechazar</Button>
        <Button variant="ghost" size="sm" onClick={() => send(ACTIONS.CANCEL_TRADE, {}, from.id)}>
          {from.name} retira la oferta
        </Button>
      </div>
    </div>
  );
}
