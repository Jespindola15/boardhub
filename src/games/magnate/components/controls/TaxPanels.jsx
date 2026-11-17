import Button from '../../../../shared/Button.jsx';
import { BOARD } from '../../data/board.js';
import { getPlayer } from '../../state/selectors.js';
import { ACTIONS, mortgageInterest } from '../../engine/index.js';
import { formatMoney } from '../format.js';
import { useSeat } from '../seat.js';

/**
 * Impuesto a la Renta (00009): se elige entre el monto fijo y el 10 % del patrimonio ANTES de
 * calcularlo, por eso el panel no muestra cuánto sería el 10 %.
 */
export function IncomeTaxPanel({ state, send }) {
  const { canAct } = useSeat();
  const t = state.incomeTax;
  const p = getPlayer(state, t.playerId);
  const sq = BOARD[t.index];
  return (
    <div className="ctx-card">
      <div className="ctx-card__head ctx-card__head--danger">
        <span className="ctx-card__kicker">{sq.name}</span>
        <strong>{p.name} elige cómo pagar</strong>
      </div>
      <p className="ctx-card__text">
        El reglamento obliga a decidir antes de sumar el patrimonio (efectivo, precio impreso de todas las propiedades,
        hipotecadas o no, y costo de los edificios).
      </p>
      <div className="auction__row" hidden={!canAct(p.id)}>
        <Button variant="primary" size="sm" onClick={() => send(ACTIONS.PAY_INCOME_TAX, { mode: 'flat' }, p.id)}>
          Pagar {formatMoney(sq.amount)}
        </Button>
        <Button size="sm" onClick={() => send(ACTIONS.PAY_INCOME_TAX, { mode: 'percent' }, p.id)}>
          Pagar el {sq.percent} % de mi patrimonio
        </Button>
      </div>
      {!canAct(p.id) && <p className="center__waiting">Esperando a {p.name}…</p>}
    </div>
  );
}

/** Propiedades hipotecadas recibidas (negociación o quiebra): levantar ya o pagar el 10 %. */
export function MortgageTransferPanel({ state, send }) {
  const { canAct } = useSeat();
  return (
    <div className="ctx-card">
      <div className="ctx-card__head ctx-card__head--danger">
        <span className="ctx-card__kicker">Propiedad hipotecada recibida</span>
        <strong>Levantar la hipoteca ahora o pagar el 10 % de interés</strong>
      </div>
      <p className="ctx-card__text ctx-card__text--small">
        Si sólo pagas el interés, al levantarla más adelante pagarás de nuevo la hipoteca más el 10 %.
      </p>
      {state.mortgageTransfers.map((t) => {
        const p = getPlayer(state, t.playerId);
        const sq = BOARD[t.index];
        return (
          <div key={t.id} className="debt-row">
            <div className="debt-row__info">
              <strong>{p.name}</strong> recibió <strong>{sq.name}</strong> hipotecada.
            </div>
            <div className="auction__row" hidden={!canAct(p.id)}>
              <Button variant="primary" size="sm" disabled={p.money < sq.unmortgage} onClick={() => send(ACTIONS.RESOLVE_MORTGAGE_TRANSFER, { index: t.index, lift: true }, p.id)}>
                Levantarla: {formatMoney(sq.unmortgage)}
              </Button>
              <Button size="sm" onClick={() => send(ACTIONS.RESOLVE_MORTGAGE_TRANSFER, { index: t.index, lift: false }, p.id)}>
                Pagar el interés: {formatMoney(mortgageInterest(sq))}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
