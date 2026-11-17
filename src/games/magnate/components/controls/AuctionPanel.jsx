import { useState } from 'react';
import Button from '../../../../shared/Button.jsx';
import Token from '../board/Token.jsx';
import { BOARD } from '../../data/board.js';
import { getGroup } from '../../data/groups.js';
import { getPlayer } from '../../state/selectors.js';
import { ACTIONS, AUCTION_MIN_BID } from '../../engine/index.js';
import { formatMoney } from '../format.js';

/**
 * Subasta abierta (G0009): sin orden de turno, desde $10, subiendo al menos $1.
 * Termina cuando todos menos el mejor postor dicen que no suben.
 * En la misma PC, cada fila es un participante.
 */
export default function AuctionPanel({ state, send }) {
  const a = state.auction;
  const isProperty = a.kind === 'property';
  const sq = isProperty ? BOARD[a.index] : null;
  const leader = a.highBidderId ? getPlayer(state, a.highBidderId) : null;
  const min = Math.max(AUCTION_MIN_BID, a.highBid + 1);
  const title = isProperty ? sq.name : a.buildingType === 'hotel' ? 'Último hotel de la banca' : 'Casa en escasez';

  return (
    <div className="ctx-card ctx-card--auction">
      <div className="ctx-card__head" style={{ '--group': isProperty ? getGroup(sq.group)?.color : '#2bb24c' }}>
        <span className="ctx-card__kicker">Subasta abierta</span>
        <strong>{title}</strong>
        <span className="ctx-card__sub">
          {isProperty ? `Valor ${formatMoney(sq.price)} · ` : ''}Puja mínima {formatMoney(min)}
        </span>
      </div>
      <div className="auction__status">
        <span>
          Mejor oferta: <strong>{leader ? `${formatMoney(a.highBid)} · ${leader.name}` : 'sin ofertas'}</strong>
        </span>
      </div>
      <ul className="auction__rows">
        {a.participants.map((id) => (
          <BidderRow key={id} state={state} id={id} min={min} send={send} />
        ))}
      </ul>
      <p className="ctx-card__text ctx-card__text--small">
        Cualquiera puede pujar en cualquier momento. Una nueva puja reabre la subasta para quienes ya habían dicho que no.
      </p>
    </div>
  );
}

function BidderRow({ state, id, min, send }) {
  const a = state.auction;
  const p = getPlayer(state, id);
  const [custom, setCustom] = useState('');
  const isLeader = a.highBidderId === id;
  const passed = a.passed.includes(id);
  const quick = [min, a.highBid + 10, a.highBid + 50].filter((v, i, arr) => v >= min && arr.indexOf(v) === i && v <= p.money);

  return (
    <li className={`auction__row-p ${isLeader ? 'is-leader' : ''} ${passed ? 'is-passed' : ''}`}>
      <Token player={p} className="token--tiny" />
      <span className="auction__name">
        {p.name}
        <small>{formatMoney(p.money)}</small>
      </span>
      {isLeader ? (
        <span className="auction__tag">Mejor oferta</span>
      ) : (
        <span className="auction__btns">
          {quick.map((v) => (
            <Button key={v} size="sm" onClick={() => send(ACTIONS.PLACE_BID, { amount: v }, id)}>
              {formatMoney(v)}
            </Button>
          ))}
          <input
            className="ctx-input ctx-input--sm"
            type="number"
            min={min}
            max={p.money}
            placeholder="Otra"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && custom && send(ACTIONS.PLACE_BID, { amount: Number(custom) }, id)}
            aria-label={`Puja de ${p.name}`}
          />
          <Button size="sm" variant="ghost" disabled={passed} onClick={() => send(ACTIONS.PASS_BID, {}, id)}>
            {passed ? 'No sube' : 'No subo'}
          </Button>
        </span>
      )}
    </li>
  );
}
