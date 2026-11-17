import Panel from '../../../../shared/Panel.jsx';
import Badge from '../../../../shared/Badge.jsx';
import Button from '../../../../shared/Button.jsx';
import {
  ACTIONS,
  buildBlocker,
  sellBlocker,
  mortgageBlocker,
  unmortgageBlocker,
  unmortgageCost,
} from '../../engine/index.js';
import SquareIcon, { iconForSquare } from '../icons/SquareIcon.jsx';
import Token from '../board/Token.jsx';
import { getGroup } from '../../data/groups.js';
import { getSquare, SQUARE_TYPES, getSquaresByGroup, GO_SALARY } from '../../data/board.js';
import { getOwner, getOwnership } from '../../state/selectors.js';
import { HOTEL } from '../../state/gameState.js';
import { formatMoney } from '../format.js';

const RENT_LABELS = ['Alquiler', 'Con 1 casa', 'Con 2 casas', 'Con 3 casas', 'Con 4 casas', 'Con hotel'];

const DESCRIPTIONS = {
  [SQUARE_TYPES.GO]: `Punto de partida. Cada vez que pasas por aquí cobras ${formatMoney(GO_SALARY)}.`,
  [SQUARE_TYPES.JAIL]: 'Si caes aquí sólo estás de visita. Los jugadores encarcelados esperan dentro de la celda.',
  [SQUARE_TYPES.FREE_PARKING]: 'Casilla de descanso. No ocurre nada al caer aquí.',
  [SQUARE_TYPES.GO_TO_JAIL]: 'Vas directamente a la cárcel sin pasar por Salida y sin cobrar.',
  [SQUARE_TYPES.CHANCE]: 'Roba una carta de Fortuna y sigue sus instrucciones.',
  [SQUARE_TYPES.COMMUNITY]: 'Roba una carta del Arca Vecinal y sigue sus instrucciones.',
};

/** Ficha informativa de la casilla seleccionada. */
export default function SquareDetail({ state, index, send }) {
  if (index == null) {
    return (
      <Panel title="Casilla" className="detail-panel">
        <div className="detail__empty">
          <span className="detail__empty-icon">⌖</span>
          <p>Haz clic en cualquier casilla del tablero para ver su información.</p>
        </div>
      </Panel>
    );
  }

  const square = getSquare(index);
  const group = getGroup(square.group);
  const owner = getOwner(state, index);
  const ownership = getOwnership(state, index);

  return (
    <Panel title={`Casilla ${index}`} className="detail-panel" aside={<TypeBadge type={square.type} />}>
      <div className="deed" key={index}>
        <header className="deed__head" style={group ? { '--group': group.color } : undefined}>
          {square.type !== SQUARE_TYPES.PROPERTY && iconForSquare(square) && (
            <SquareIcon name={iconForSquare(square)} className="deed__icon" />
          )}
          {group && <span className="deed__group">{group.name}</span>}
          <h4 className="deed__name">{square.name}</h4>
        </header>

        {square.type === SQUARE_TYPES.PROPERTY && <PropertyBody square={square} />}
        {square.type === SQUARE_TYPES.STATION && <StationBody square={square} />}
        {square.type === SQUARE_TYPES.UTILITY && <UtilityBody square={square} />}
        {square.type === SQUARE_TYPES.TAX && (
          <p className="deed__text">
            Al caer aquí pagas <strong>{formatMoney(square.amount)}</strong> a la banca.
          </p>
        )}
        {DESCRIPTIONS[square.type] && <p className="deed__text">{DESCRIPTIONS[square.type]}</p>}

        {square.price && (
          <div className="deed__owner">
            {owner ? (
              <>
                <Token player={owner} className="token--inline-sm" />
                <span>
                  Propiedad de <strong>{owner.name}</strong>
                </span>
                <span className="deed__owner-state">
                  {ownership.mortgaged && <Badge tone="danger">Hipotecada</Badge>}
                  {ownership.houses === HOTEL && <Badge tone="danger">Hotel</Badge>}
                  {ownership.houses > 0 && ownership.houses < HOTEL && (
                    <Badge tone="ok">{ownership.houses} {ownership.houses === 1 ? 'casa' : 'casas'}</Badge>
                  )}
                </span>
              </>
            ) : (
              <span className="deed__free">Disponible en la banca · {formatMoney(square.price)}</span>
            )}
          </div>
        )}
        {owner && <ManageActions state={state} square={square} ownership={ownership} owner={owner} send={send} />}
      </div>
    </Panel>
  );
}

function PropertyBody({ square }) {
  const groupSize = getSquaresByGroup(square.group).length;
  return (
    <>
      <table className="deed__table">
        <tbody>
          {square.rent.map((r, i) => (
            <tr key={i} className={i === 0 ? 'is-base' : ''}>
              <td>{RENT_LABELS[i]}</td>
              <td>{formatMoney(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="deed__facts">
        <div><dt>Precio</dt><dd>{formatMoney(square.price)}</dd></div>
        <div><dt>Casa / hotel</dt><dd>{formatMoney(square.houseCost)}</dd></div>
        <div><dt>Hipoteca</dt><dd>{formatMoney(square.mortgage)}</dd></div>
        <div><dt>Levantarla</dt><dd>{formatMoney(square.unmortgage)}</dd></div>
      </dl>
      <p className="deed__note">Grupo de {groupSize} propiedades. Con el grupo completo y sin edificar, el alquiler se duplica (también si otra calle del grupo está hipotecada).</p>
    </>
  );
}

function StationBody({ square }) {
  return (
    <>
      <table className="deed__table">
        <tbody>
          {square.rent.map((r, i) => (
            <tr key={i} className={i === 0 ? 'is-base' : ''}>
              <td>Con {i + 1} {i === 0 ? 'estación' : 'estaciones'}</td>
              <td>{formatMoney(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="deed__facts">
        <div><dt>Precio</dt><dd>{formatMoney(square.price)}</dd></div>
        <div><dt>Hipoteca</dt><dd>{formatMoney(square.mortgage)}</dd></div>
      </dl>
    </>
  );
}

function UtilityBody({ square }) {
  return (
    <>
      <table className="deed__table">
        <tbody>
          <tr className="is-base"><td>Con 1 servicio</td><td>{square.multipliers[0]} × tirada nueva</td></tr>
          <tr><td>Con 2 servicios</td><td>{square.multipliers[1]} × tirada nueva</td></tr>
        </tbody>
      </table>
      <dl className="deed__facts">
        <div><dt>Precio</dt><dd>{formatMoney(square.price)}</dd></div>
        <div><dt>Hipoteca</dt><dd>{formatMoney(square.mortgage)}</dd></div>
      </dl>
    </>
  );
}

/**
 * Gestión de la propiedad por su dueño. G0009 permite construir, vender e hipotecar
 * en cualquier momento, también fuera del propio turno. El motor valida cada acción.
 */
function ManageActions({ state, square, ownership, owner, send }) {
  if (state.phase !== 'playing') return null;
  const build = square.type === 'property' ? buildBlocker(state, owner.id, square.index) : 'No se construye aquí.';
  const sell = square.type === 'property' ? sellBlocker(state, owner.id, square.index) : 'No hay edificios.';
  const mort = mortgageBlocker(state, owner.id, square.index);
  const unmort = unmortgageBlocker(state, owner.id, square.index);
  const act = (type) => send(type, { index: square.index }, owner.id);

  return (
    <div className="deed__manage">
      <span className="deed__manage-who">Gestiona {owner.name}</span>
      {square.type === 'property' && (
        <Button size="sm" onClick={() => act(ACTIONS.BUILD)} disabled={Boolean(build)} title={build ?? ''}>
          {ownership.houses === 4 ? 'Construir hotel' : 'Construir casa'} · {formatMoney(square.houseCost)}
        </Button>
      )}
      {square.type === 'property' && (
        <Button size="sm" onClick={() => act(ACTIONS.SELL_BUILDING)} disabled={Boolean(sell)} title={sell ?? ''}>
          Vender edificio · +{formatMoney(square.houseCost / 2)}
        </Button>
      )}
      {!ownership.mortgaged ? (
        <Button size="sm" onClick={() => act(ACTIONS.MORTGAGE)} disabled={Boolean(mort)} title={mort ?? ''}>
          Hipotecar · +{formatMoney(square.mortgage)}
        </Button>
      ) : (
        <Button size="sm" onClick={() => act(ACTIONS.UNMORTGAGE)} disabled={Boolean(unmort)} title={unmort ?? ''}>
          Levantar hipoteca · {formatMoney(unmortgageCost(square))}
        </Button>
      )}
      {(build || sell || mort) && <span className="deed__manage-why">{square.type === 'property' && build ? build : ''}</span>}
    </div>
  );
}

const TYPE_LABEL = {
  property: 'Propiedad',
  station: 'Estación',
  utility: 'Servicio',
  tax: 'Impuesto',
  chance: 'Evento',
  community: 'Evento',
  go: 'Esquina',
  jail: 'Esquina',
  'free-parking': 'Esquina',
  'go-to-jail': 'Esquina',
};

function TypeBadge({ type }) {
  return <Badge tone="neutral">{TYPE_LABEL[type]}</Badge>;
}
