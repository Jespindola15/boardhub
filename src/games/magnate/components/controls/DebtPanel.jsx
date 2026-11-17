import { useState } from 'react';
import Button from '../../../../shared/Button.jsx';
import { getPlayer } from '../../state/selectors.js';
import { ACTIONS, liquidationValue } from '../../engine/index.js';
import { formatMoney } from '../format.js';

export default function DebtPanel({ state, send }) {
  const [confirm, setConfirm] = useState(false);
  const d = state.debts[0];
  const debtor = getPlayer(state, d.debtorId);
  const creditor = d.creditorId ? getPlayer(state, d.creditorId) : null;
  const missing = Math.max(0, d.amount - debtor.money);
  const canRaise = liquidationValue(state, debtor.id) >= d.amount;

  return (
    <div className="ctx-card ctx-card--debt">
      <div className="ctx-card__head ctx-card__head--danger">
        <span className="ctx-card__kicker">Deuda pendiente</span>
        <strong>
          {debtor.name} debe {formatMoney(d.amount)} a {creditor ? creditor.name : 'la banca'}
        </strong>
        <span className="ctx-card__sub">{d.reason}</span>
      </div>
      <p className="ctx-card__text">
        {missing > 0
          ? `Le faltan ${formatMoney(missing)}. Vende edificios o hipoteca propiedades desde la ficha de cada casilla.`
          : 'Ya tiene el dinero suficiente para pagar.'}
        {!canRaise && ' Aun vendiendo todo no alcanza: sólo queda declararse en bancarrota.'}
      </p>
      <div className="auction__row">
        <Button variant="primary" onClick={() => send(ACTIONS.PAY_DEBT)} disabled={missing > 0}>
          Pagar {formatMoney(d.amount)}
        </Button>
        {confirm ? (
          <Button variant="danger" onClick={() => send(ACTIONS.DECLARE_BANKRUPTCY)}>
            Confirmar bancarrota
          </Button>
        ) : (
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Declararse en bancarrota
          </Button>
        )}
      </div>
    </div>
  );
}
