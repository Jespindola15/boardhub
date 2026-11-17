import Panel from '../../../../shared/Panel.jsx';
import Badge from '../../../../shared/Badge.jsx';
import Token from '../board/Token.jsx';
import { getPlayerColor, PLAYER_STATUS, PLAYER_STATUS_LABEL } from '../../models/player.js';
import { getPlayerSquares, getNetWorth } from '../../state/selectors.js';
import { getGroup } from '../../data/groups.js';
import { formatMoney } from '../format.js';

const STATUS_TONE = {
  [PLAYER_STATUS.ACTIVE]: 'ok',
  [PLAYER_STATUS.IN_JAIL]: 'warn',
  [PLAYER_STATUS.BANKRUPT]: 'danger',
  [PLAYER_STATUS.DISCONNECTED]: 'pending',
};

export default function PlayersPanel({ state, highlightPlayerId, onHighlight }) {
  return (
    <Panel
      title="Jugadores"
      aside={<span className="players__count">{state.players.length} / 8</span>}
      className="players-panel"
      bodyClassName="players__list"
    >
      {state.players.map((p, i) => (
        <PlayerCard
          key={p.id}
          player={p}
          order={i + 1}
          state={state}
          isTurn={state.turn.playerId === p.id}
          isHighlighted={highlightPlayerId === p.id}
          onHighlight={onHighlight}
        />
      ))}
    </Panel>
  );
}

function PlayerCard({ player, order, state, isTurn, isHighlighted, onHighlight }) {
  const color = getPlayerColor(player.colorId).hex;
  const squares = getPlayerSquares(state, player.id);
  const bankrupt = player.status === PLAYER_STATUS.BANKRUPT;

  return (
    <article
      className={`pcard ${isTurn ? 'is-turn' : ''} ${bankrupt ? 'is-bankrupt' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
      style={{ '--pcolor': color }}
      onMouseEnter={() => onHighlight(player.id)}
      onMouseLeave={() => onHighlight(null)}
      title="Pasa el cursor para resaltar sus propiedades en el tablero"
    >
      <div className="pcard__turn" aria-hidden="true" />
      <Token player={player} isCurrent={isTurn} className="pcard__token" />
      <div className="pcard__main">
        <div className="pcard__row">
          <span className="pcard__name">
            {player.name}
            {player.isHost && <span className="pcard__host" title="Anfitrión de la sala">★</span>}
          </span>
          <span className={`pcard__money ${player.money < 200 ? 'is-low' : ''}`}>{formatMoney(player.money)}</span>
        </div>
        <div className="pcard__row pcard__row--meta">
          {isTurn ? (
            <Badge tone="brand">▶ Su turno</Badge>
          ) : (
            <Badge tone={STATUS_TONE[player.status]}>{PLAYER_STATUS_LABEL[player.status]}</Badge>
          )}
          <span className="pcard__worth" title="Patrimonio aproximado (dinero + propiedades + edificios)">
            {bankrupt ? '—' : `Total ${formatMoney(getNetWorth(state, player.id))}`}
          </span>
        </div>
        <div className="pcard__props" aria-label={`${squares.length} propiedades`}>
          {squares.length === 0 && <span className="pcard__noprops">Sin propiedades</span>}
          {squares.map((sq) => (
            <span
              key={sq.id}
              className={`pcard__chip ${state.ownership[sq.index].mortgaged ? 'is-mortgaged' : ''}`}
              style={{ background: getGroup(sq.group).color }}
              title={`${sq.name}${state.ownership[sq.index].mortgaged ? ' (hipotecada)' : ''}`}
            />
          ))}
          {player.jailFreeCards > 0 && (
            <span className="pcard__card" title="Carta «Sal de la cárcel»">🗝 {player.jailFreeCards}</span>
          )}
        </div>
      </div>
      <span className="pcard__order">{order}</span>
    </article>
  );
}
