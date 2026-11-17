import Panel from '../../../../shared/Panel.jsx';
import { BANK_HOUSES, BANK_HOTELS } from '../../state/gameState.js';
import { BOARD, isOwnable } from '../../data/board.js';

export default function BankPanel({ state }) {
  const unsold = BOARD.filter((sq) => isOwnable(sq) && !state.ownership[sq.index]).length;
  return (
    <Panel title="Banca" className="bank-panel">
      <dl className="bank">
        <div>
          <dt>Casas</dt>
          <dd>
            {state.bank.houses}<small>/{BANK_HOUSES}</small>
          </dd>
        </div>
        <div>
          <dt>Hoteles</dt>
          <dd>
            {state.bank.hotels}<small>/{BANK_HOTELS}</small>
          </dd>
        </div>
        <div>
          <dt>Sin dueño</dt>
          <dd>{unsold}</dd>
        </div>
      </dl>
    </Panel>
  );
}
