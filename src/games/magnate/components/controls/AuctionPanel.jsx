import { useEffect, useState } from 'react';
import Button from '../../../../shared/Button.jsx';
import Token from '../board/Token.jsx';
import { BOARD } from '../../data/board.js';
import { getGroup } from '../../data/groups.js';
import { getPlayer } from '../../state/selectors.js';
import { ACTIONS } from '../../engine/index.js';
import { formatMoney } from '../format.js';

export default function AuctionPanel({ state, send }) {
  const a = state.auction;
  const sq = BOARD[a.index];
  const bidder = getPlayer(state, a.currentBidderId);
  const leader = a.highBidderId ? getPlayer(state, a.highBidderId) : null;
  const min = a.highBid + 1;
  const [amount, setAmount] = useState(min);

  useEffect(() => setAmount(a.highBid + 1), [a.highBid, a.currentBidderId]);

  const quick = [1, 10, 50, 100].map((d) => a.highBid + d).filter((v) => v <= bidder.money);

  return (
    <div className="ctx-card ctx-card--auction">
      <div className="ctx-card__head" style={{ '--group': getGroup(sq.group)?.color }}>
        <span className="ctx-card__kicker">Subasta</span>
        <strong>{sq.name}</strong>
        <span className="ctx-card__sub">Valor {formatMoney(sq.price)}</span>
      </div>
      <div className="auction__status">
        <span>
          Mejor oferta: <strong>{formatMoney(a.highBid)}</strong> {leader ? `(${leader.name})` : '(sin ofertas)'}
        </span>
        <span className="auction__bidders">
          {a.bidders.map((id) => {
            const p = getPlayer(state, id);
            return <Token key={id} player={p} isCurrent={id === a.currentBidderId} className="token--tiny" />;
          })}
        </span>
      </div>
      <div className="auction__turn">
        Puja <strong>{bidder.name}</strong> · tiene {formatMoney(bidder.money)}
      </div>
      <div className="auction__quick">
        {quick.map((v) => (
          <Button key={v} size="sm" onClick={() => send(ACTIONS.PLACE_BID, { amount: v })}>
            {formatMoney(v)}
          </Button>
        ))}
      </div>
      <div className="auction__row">
        <input
          type="number"
          className="ctx-input"
          min={min}
          max={bidder.money}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Monto de la puja"
        />
        <Button variant="primary" onClick={() => send(ACTIONS.PLACE_BID, { amount: Number(amount) })} disabled={bidder.money < min}>
          Pujar
        </Button>
        <Button onClick={() => send(ACTIONS.PASS_BID)}>Retirarse</Button>
      </div>
    </div>
  );
}
