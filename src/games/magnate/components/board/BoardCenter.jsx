import Button from '../../../../shared/Button.jsx';
import Dice from './Dice.jsx';
import Token from './Token.jsx';
import SquareIcon from '../icons/SquareIcon.jsx';
import { getCurrentPlayer } from '../../state/selectors.js';

/**
 * Centro del tablero: identidad del juego, mazos, dados y controles de turno.
 * Todos los controles de partida están marcados como pendientes en la Fase 1.
 */
export default function BoardCenter({ state }) {
  const current = getCurrentPlayer(state);

  return (
    <div className="center">
      <Deck kind="chance" label="Fortuna" remaining={state.decks.chance.remaining} />
      <Deck kind="community" label="Arca Vecinal" remaining={state.decks.community.remaining} />

      <div className="center__brand">
        <span className="center__logo">MAGNATE</span>
        <span className="center__tag">Compra · Alquila · Negocia</span>
      </div>

      <div className="center__turn">
        {current && <Token player={current} isCurrent className="token--inline" />}
        <div>
          <div className="center__turn-name">Turno de {current?.name ?? '—'}</div>
          <div className="center__turn-meta">Ronda {state.turn.round}</div>
        </div>
      </div>

      <div className="center__dice">
        <Dice values={state.dice} />
        <span className="center__dice-note">{state.dice ? 'Última tirada (simulada)' : 'Sin tirada'}</span>
      </div>

      <div className="center__actions">
        <div className="center__caption">
          Controles de turno <span className="bh-btn__pending">Pendientes · Fase 2</span>
        </div>
        <div className="center__primary">
          <Button variant="primary" showPendingTag={false} pending pendingNote="Los dados se lanzarán en el servidor (Fase 2)">
            Lanzar dados
          </Button>
          <Button showPendingTag={false} pending pendingNote="Compra de propiedades: Fase 2">Comprar</Button>
          <Button showPendingTag={false} pending pendingNote="Subastas: Fase 2">Subastar</Button>
          <Button showPendingTag={false} pending pendingNote="Gestión de turnos: Fase 2">Terminar turno</Button>
        </div>
        <div className="center__secondary">
          <Button size="sm" variant="ghost" showPendingTag={false} pending pendingNote="Construcción de casas y hoteles">Construir</Button>
          <Button size="sm" variant="ghost" showPendingTag={false} pending pendingNote="Hipotecas">Hipotecar</Button>
          <Button size="sm" variant="ghost" showPendingTag={false} pending pendingNote="Negociaciones entre jugadores">Negociar</Button>
          <Button size="sm" variant="ghost" showPendingTag={false} pending pendingNote="Bancarrota y abandono">Rendirse</Button>
        </div>
      </div>
    </div>
  );
}

function Deck({ kind, label, remaining }) {
  return (
    <div className={`deck deck--${kind}`} title={`${label}: ${remaining} cartas (dato simulado)`}>
      <span className="deck__card deck__card--3" />
      <span className="deck__card deck__card--2" />
      <span className="deck__card deck__card--1">
        <SquareIcon name={kind === 'chance' ? 'chance' : 'chest'} className="deck__icon" strokeWidth={2} />
        <span className="deck__label">{label}</span>
      </span>
    </div>
  );
}
