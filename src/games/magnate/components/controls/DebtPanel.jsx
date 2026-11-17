import { useState } from 'react';
import Button from '../../../../shared/Button.jsx';
import { getPlayer } from '../../state/selectors.js';
import { ACTIONS, maxRaisable, totalDebt } from '../../engine/index.js';
import { formatMoney } from '../format.js';
import { useSeat } from '../seat.js';

/** Deudas pendientes. Puede haber varias a la vez (p. ej. una carta que obliga a pagar a cada jugador). */
export default function DebtPanel({ state, send }) {
  const debtors = [...new Set(state.debts.map((d) => d.debtorId))];
  return (
    <div className="ctx-card ctx-card--debt">
      <div className="ctx-card__head ctx-card__head--danger">
        <span className="ctx-card__kicker">Deuda pendiente</span>
        <strong>El turno sigue cuando se paguen las deudas</strong>
      </div>
      {debtors.map((id) => (
        <DebtorRow key={id} state={state} id={id} send={send} />
      ))}
      <p className="ctx-card__text ctx-card__text--small">
        Para reunir dinero: vende edificios o hipoteca desde la ficha de cada casilla, o negocia con otros jugadores.
      </p>
    </div>
  );
}

function DebtorRow({ state, id, send }) {
  const [confirm, setConfirm] = useState(false);
  const p = getPlayer(state, id);
  const debts = state.debts.filter((d) => d.debtorId === id);
  const first = debts[0];
  const owed = totalDebt(state, id);
  const canRaise = maxRaisable(state, id) >= owed;
  const to = (d) => (d.creditorId ? getPlayer(state, d.creditorId).name : 'la banca');
  const { canAct } = useSeat();

  return (
    <div className="debt-row">
      <div className="debt-row__info">
        <strong>{p.name}</strong> tiene {formatMoney(p.money)} y debe{' '}
        {debts.map((d, i) => (
          <span key={d.id}>
            {i > 0 && ' + '}
            {formatMoney(d.amount)} a {to(d)} <em>({d.reason})</em>
          </span>
        ))}
      </div>
      <div className="auction__row" hidden={!canAct(id)}>
        <Button variant="primary" size="sm" onClick={() => send(ACTIONS.PAY_DEBT, {}, id)} disabled={p.money < first.amount}>
          Pagar {formatMoney(first.amount)} a {to(first)}
        </Button>
        {confirm ? (
          <Button variant="danger" size="sm" onClick={() => send(ACTIONS.DECLARE_BANKRUPTCY, {}, id)}>
            Confirmar bancarrota
          </Button>
        ) : (
          <Button
            variant="danger"
            size="sm"
            disabled={canRaise}
            title={canRaise ? 'Todavía puede reunir el dinero vendiendo o hipotecando' : ''}
            onClick={() => setConfirm(true)}
          >
            Declararse en bancarrota
          </Button>
        )}
      </div>
    </div>
  );
}
