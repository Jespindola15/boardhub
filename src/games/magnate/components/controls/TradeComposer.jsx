import { useMemo, useState } from 'react';
import Modal from '../../../../shared/Modal.jsx';
import Button from '../../../../shared/Button.jsx';
import Token from '../board/Token.jsx';
import { BOARD } from '../../data/board.js';
import { getGroup } from '../../data/groups.js';
import { getCurrentPlayer, getPlayerSquares } from '../../state/selectors.js';
import { ACTIONS, tradeBlocker } from '../../engine/index.js';
import { formatMoney } from '../format.js';

const emptyOffer = () => ({ money: 0, squares: [], jailCards: 0 });

/** Ventana para que el jugador del turno proponga un trato a otro jugador. */
export default function TradeComposer({ state, send, onClose }) {
  const me = getCurrentPlayer(state);
  const others = state.players.filter((p) => p.id !== me.id && p.status !== 'bankrupt');
  const [toId, setToId] = useState(others[0]?.id);
  const [give, setGive] = useState(emptyOffer);
  const [get, setGet] = useState(emptyOffer);
  const other = others.find((p) => p.id === toId);

  const changeTarget = (id) => {
    setToId(id);
    setGet(emptyOffer());
  };

  const empty = useMemo(
    () => !give.money && !give.squares.length && !give.jailCards && !get.money && !get.squares.length && !get.jailCards,
    [give, get],
  );

  const submit = () => {
    send(ACTIONS.PROPOSE_TRADE, { toId, give, get });
    onClose();
  };

  return (
    <Modal
      title="Negociar"
      onClose={onClose}
      width={820}
      footer={
        <>
          <span className="trade__note">El otro jugador decidirá en el centro del tablero.</span>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={empty || !other} onClick={submit}>
            Proponer trato
          </Button>
        </>
      }
    >
      <div className="trade__targets">
        <span>Negociar con:</span>
        {others.map((p) => (
          <button key={p.id} type="button" className={`trade__target ${p.id === toId ? 'is-active' : ''}`} onClick={() => changeTarget(p.id)}>
            <Token player={p} className="token--tiny" /> {p.name}
          </button>
        ))}
      </div>
      {other && (
        <div className="trade__cols">
          <OfferEditor title={`${me.name} entrega`} player={me} state={state} offer={give} onChange={setGive} />
          <OfferEditor title={`${other.name} entrega`} player={other} state={state} offer={get} onChange={setGet} />
        </div>
      )}
    </Modal>
  );
}

function OfferEditor({ title, player, state, offer, onChange }) {
  const squares = getPlayerSquares(state, player.id);
  const toggle = (i) =>
    onChange({ ...offer, squares: offer.squares.includes(i) ? offer.squares.filter((x) => x !== i) : [...offer.squares, i] });

  return (
    <section className="trade__col">
      <h4>
        <Token player={player} className="token--tiny" /> {title}
      </h4>
      <label className="trade__field">
        Dinero (tiene {formatMoney(player.money)})
        <input
          type="number"
          className="ctx-input"
          min={0}
          max={player.money}
          step={10}
          value={offer.money}
          onChange={(e) => onChange({ ...offer, money: Math.min(player.money, Math.max(0, Number(e.target.value) || 0)) })}
        />
      </label>
      {player.jailFreeCards.length > 0 && (
        <label className="trade__field">
          Cartas de libertad (tiene {player.jailFreeCards.length})
          <input
            type="number"
            className="ctx-input"
            min={0}
            max={player.jailFreeCards.length}
            value={offer.jailCards}
            onChange={(e) => onChange({ ...offer, jailCards: Math.min(player.jailFreeCards.length, Math.max(0, Number(e.target.value) || 0)) })}
          />
        </label>
      )}
      <div className="trade__props">
        {squares.length === 0 && <p className="offer-empty">Sin propiedades.</p>}
        {squares.map((sq) => {
          const blocked = tradeBlocker(state, player.id, sq.index);
          return (
            <label key={sq.id} className={`trade__prop ${blocked ? 'is-blocked' : ''}`} title={blocked ?? ''}>
              <input type="checkbox" disabled={Boolean(blocked)} checked={offer.squares.includes(sq.index)} onChange={() => toggle(sq.index)} />
              <span className="chip-dot" style={{ background: getGroup(sq.group)?.color }} />
              <span className="trade__prop-name">{BOARD[sq.index].name}</span>
              {state.ownership[sq.index].mortgaged && <em>hipotecada</em>}
            </label>
          );
        })}
      </div>
    </section>
  );
}
