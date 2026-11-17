import { useState } from 'react';
import Button from '../../../../shared/Button.jsx';
import Dice from './Dice.jsx';
import Token from './Token.jsx';
import SquareIcon from '../icons/SquareIcon.jsx';
import AuctionPanel from '../controls/AuctionPanel.jsx';
import DebtPanel from '../controls/DebtPanel.jsx';
import { ClaimPanel, PlacementPanel } from '../controls/ShortagePanels.jsx';
import { IncomeTaxPanel, MortgageTransferPanel } from '../controls/TaxPanels.jsx';
import CardReveal from '../controls/CardReveal.jsx';
import { getCurrentPlayer, getPlayer } from '../../state/selectors.js';
import { ACTIONS, getActingPlayerId, JAIL_FINE } from '../../engine/index.js';
import { BOARD } from '../../data/board.js';
import { formatMoney } from '../format.js';
import { useSeat } from '../seat.js';

/**
 * Centro del tablero: estado del turno, dados y controles.
 * Muestra sólo las acciones válidas para quien debe decidir ahora.
 */
export default function BoardCenter({ state, send, onOpenTrade, onNewGame }) {
  const current = getCurrentPlayer(state);
  const actingId = getActingPlayerId(state);
  const acting = getPlayer(state, actingId);

  return (
    <div className="center">
      <Deck kind="chance" label="Fortuna" remaining={deckCount(state.decks.chance)} />
      <Deck kind="community" label="Arca Vecinal" remaining={deckCount(state.decks.community)} />

      <div className="center__brand">
        <span className="center__logo">MAGNATE</span>
      </div>

      <div className="center__turn">
        {current && <Token player={current} isCurrent className="token--inline" />}
        <div>
          <div className="center__turn-name">Turno de {current?.name}</div>
          <div className="center__turn-meta">
            Ronda {state.turn.round}
            {acting && actingId !== current?.id && (
              <>
                {' · '}decide <strong style={{ color: 'var(--text-1)' }}>{acting.name}</strong>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="center__dice">
        <Dice values={state.dice} rollKey={state.rollSeq ?? 0} />
      </div>

      <div className="center__context">
        {state.phase === 'finished' ? (
          <Winner state={state} onNewGame={onNewGame} />
        ) : state.debts.length ? (
          <DebtPanel state={state} send={send} />
        ) : state.incomeTax ? (
          <IncomeTaxPanel state={state} send={send} />
        ) : state.mortgageTransfers?.length ? (
          <MortgageTransferPanel state={state} send={send} />
        ) : state.placement ? (
          <PlacementPanel state={state} send={send} />
        ) : state.buildingClaim ? (
          <ClaimPanel state={state} send={send} />
        ) : state.auction ? (
          <AuctionPanel state={state} send={send} />
        ) : (
          <>
            {state.lastCard && <CardReveal card={state.lastCard} />}
            <TurnActions state={state} send={send} player={current} onOpenTrade={onOpenTrade} />
          </>
        )}
      </div>
    </div>
  );
}

function TurnActions({ state, send, player, onOpenTrade }) {
  const [confirmResign, setConfirmResign] = useState(false);
  const { me, online, canAct } = useSeat();
  const mine = canAct(player.id);
  const meAlive = !online || state.players.some((p) => p.id === me && p.status !== 'bankrupt');
  const step = state.turn.step;
  const inJail = player.status === 'in-jail';

  return (
    <div className="center__actions">
      {!mine && <p className="center__waiting">Esperando a {player.name}…</p>}
      <div className="center__primary">
        {mine && step === 'roll' && inJail && (
          <>
            <Button onClick={() => send(ACTIONS.PAY_JAIL_FINE)} disabled={player.money < JAIL_FINE}>
              Pagar {formatMoney(JAIL_FINE)}
            </Button>
            <Button onClick={() => send(ACTIONS.USE_JAIL_CARD)} disabled={!player.jailFreeCards.length}>
              Usar carta ({player.jailFreeCards.length})
            </Button>
            <Button variant="primary" className="span-2" onClick={() => send(ACTIONS.ROLL_DICE)}>
              Tirar dados para sacar dobles ({player.jailTurns + 1}/3)
            </Button>
          </>
        )}
        {mine && step === 'roll' && !inJail && (
          <Button variant="primary" size="lg" className="span-2" onClick={() => send(ACTIONS.ROLL_DICE)}>
            {state.turn.extraRoll ? '¡Dobles! Tirar otra vez' : 'Tirar dados'}
          </Button>
        )}
        {mine && step === 'buy' && <BuyChoice state={state} send={send} player={player} />}
        {mine && step === 'end' && (
          <Button variant="primary" size="lg" className="span-2" onClick={() => send(ACTIONS.END_TURN)}>
            Terminar turno
          </Button>
        )}
      </div>

      <div className="center__secondary" hidden={!meAlive}>
        <Button size="sm" variant="ghost" onClick={onOpenTrade}>
          Negociar
        </Button>
        {confirmResign ? (
          <>
            <Button size="sm" variant="danger" onClick={() => send(ACTIONS.RESIGN, {}, online ? me : player.id)}>
              Confirmar abandono
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmResign(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmResign(true)}>
            Abandonar
          </Button>
        )}
      </div>
      <p className="center__hint">
        Cualquier jugador puede construir, vender, hipotecar y negociar en cualquier momento: clic en una casilla para ver su ficha.
      </p>
    </div>
  );
}

function BuyChoice({ state, send, player }) {
  const sq = BOARD[state.pendingPurchase];
  return (
    <>
      <div className="center__offer span-2">
        <strong>{sq.name}</strong> está a la venta por {formatMoney(sq.price)}
      </div>
      <Button variant="primary" onClick={() => send(ACTIONS.BUY_PROPERTY)} disabled={player.money < sq.price}>
        Comprar
      </Button>
      <Button onClick={() => send(ACTIONS.DECLINE_PROPERTY)}>Subastar</Button>
      {state.options?.skipPurchase && (
        <Button variant="ghost" className="span-2" onClick={() => send(ACTIONS.SKIP_PROPERTY)}>
          Pasar (dejarla en la banca)
        </Button>
      )}
    </>
  );
}

const deckCount = (d) => (typeof d === 'number' ? d : d.length);

function Winner({ state, onNewGame }) {
  const w = getPlayer(state, state.winnerId);
  return (
    <div className="center__winner">
      <Token player={w} isCurrent className="token--winner" />
      <h3>¡{w.name} gana la partida!</h3>
      <p>Es el último jugador que queda en pie, tras {state.turn.round} rondas.</p>
      {onNewGame && (
        <Button variant="primary" size="lg" onClick={onNewGame}>
          Nueva partida
        </Button>
      )}
    </div>
  );
}

function Deck({ kind, label, remaining }) {
  return (
    <div className={`deck deck--${kind}`} title={`${label}: ${remaining} cartas en el mazo`}>
      <span className="deck__card deck__card--3" />
      <span className="deck__card deck__card--2" />
      <span className="deck__card deck__card--1">
        <SquareIcon name={kind === 'chance' ? 'chance' : 'chest'} className="deck__icon" strokeWidth={2} />
        <span className="deck__label">{label}</span>
      </span>
    </div>
  );
}
