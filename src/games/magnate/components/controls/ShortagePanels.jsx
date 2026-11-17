import Button from '../../../../shared/Button.jsx';
import Token from '../board/Token.jsx';
import { BOARD } from '../../data/board.js';
import { getPlayer } from '../../state/selectors.js';
import { ACTIONS, legalPlacements } from '../../engine/index.js';
import { useSeat } from '../seat.js';

const label = (type) => (type === 'hotel' ? 'un hotel' : 'una casa');

/** Escasez de edificios: los demás jugadores que podrían construir dicen si también quieren uno. */
export function ClaimPanel({ state, send }) {
  const { canAct } = useSeat();
  const c = state.buildingClaim;
  const requester = getPlayer(state, c.requesterId);
  const stock = c.buildingType === 'hotel' ? state.bank.hotels : state.bank.houses;
  return (
    <div className="ctx-card">
      <div className="ctx-card__head" style={{ '--group': '#2bb24c' }}>
        <span className="ctx-card__kicker">Edificios en escasez</span>
        <strong>
          {requester.name} quiere {label(c.buildingType)} y quedan {stock} en la banca
        </strong>
      </div>
      <p className="ctx-card__text">Si más jugadores lo quieren de los que hay, se subasta al mejor postor.</p>
      <ul className="auction__rows">
        {c.eligible.map((id) => {
          const p = getPlayer(state, id);
          const answered = id in c.responses;
          return (
            <li key={id} className="auction__row-p">
              <Token player={p} className="token--tiny" />
              <span className="auction__name">{p.name}</span>
              {answered || !canAct(id) ? (
                <span className="auction__tag">{!answered ? 'Pensando…' : c.responses[id] ? 'Lo quiere' : 'No lo quiere'}</span>
              ) : (
                <span className="auction__btns">
                  <Button size="sm" variant="primary" onClick={() => send(ACTIONS.CLAIM_BUILDING, { want: true }, id)}>
                    Yo también
                  </Button>
                  <Button size="sm" onClick={() => send(ACTIONS.CLAIM_BUILDING, { want: false }, id)}>
                    No lo quiero
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Quien ganó un edificio en subasta debe colocarlo en una calle donde sea legal. */
export function PlacementPanel({ state, send }) {
  const { canAct } = useSeat();
  const pl = state.placement;
  const p = getPlayer(state, pl.playerId);
  const options = legalPlacements(state, p.id, pl.buildingType);
  return (
    <div className="ctx-card">
      <div className="ctx-card__head" style={{ '--group': '#2bb24c' }}>
        <span className="ctx-card__kicker">Colocar edificio</span>
        <strong>
          {p.name}, ¿dónde colocas {label(pl.buildingType)}?
        </strong>
      </div>
      <div className="auction__quick" hidden={!canAct(p.id)}>
        {options.map((i) => (
          <Button key={i} size="sm" onClick={() => send(ACTIONS.PLACE_BUILDING, { index: i }, p.id)}>
            {BOARD[i].name}
          </Button>
        ))}
      </div>
    </div>
  );
}
