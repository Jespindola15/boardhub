import { BOARD } from '../../data/board.js';
import { getGroup } from '../../data/groups.js';
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

