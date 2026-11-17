import { useEffect, useMemo, useRef, useState } from 'react';
import SpanishCard from '../../../shared/spanish-deck/SpanishCard.jsx';
import Button from '../../../shared/Button.jsx';
import { Avatar, GameLog, Finished } from '../../../shared/kit/parts.jsx';
import { paletteHex } from '../../../shared/playerPalette.js';
import '../chinchon.css';

const TARGET = 101;
const MELD_COLORS = ['#ffd36b', '#2ee6c5', '#ff7aa8', '#8fb4ff'];
const meldLabel = (m) => (m.type === 'run' ? 'Escalera' : 'Grupo');

/** Orden de la mano elegido por el jugador (sólo en su pantalla). */
function useHandOrder(hand, arrangement) {
  const [order, setOrder] = useState([]);
  const autoOrder = useMemo(() => {
    if (!arrangement) return hand.map((c) => c.id);
    return [...arrangement.melds.flatMap((m) => m.cards.map((c) => c.id)), ...arrangement.leftover.map((c) => c.id)];
  }, [hand, arrangement]);
  const ids = hand.map((c) => c.id);
  // Mantener el orden propio: quitar las que ya no están y agregar las nuevas al final.
  const shown = [...order.filter((id) => ids.includes(id)), ...ids.filter((id) => !order.includes(id))];
  return { shown: order.length ? shown : autoOrder, setOrder, group: () => setOrder(autoOrder) };
}

export default function ChinchonTable({ view, send, onNextRound, nextRoundLabel = 'Volver', local }) {
  const me = view.players.find((p) => p.id === view.me);
  const hand = me?.hand ?? [];
  const arr = view.myArrangement;
  const { shown, setOrder, group } = useHandOrder(hand, arr);
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null);
  const prevIds = useRef(new Set());
  const [fresh, setFresh] = useState(new Set());

  const legal = view.legal ?? [];
  const canDraw = legal.find((a) => a.type === 'DRAW');
  const discard = legal.find((a) => a.type === 'DISCARD');
  const cut = legal.find((a) => a.type === 'CUT');
  const myTurn = view.currentPlayerId === view.me && view.phase === 'playing';

  // Animación de la carta recién robada.
  useEffect(() => {
    const ids = new Set(hand.map((c) => c.id));
    const added = [...ids].filter((id) => !prevIds.current.has(id));
    if (prevIds.current.size && added.length <= 2) setFresh(new Set(added));
    prevIds.current = ids;
  }, [hand]);
  useEffect(() => setSelected(null), [view.version]);

  const meldOf = useMemo(() => {
    const m = new Map();
    arr?.melds.forEach((meld, i) => meld.cards.forEach((c) => m.set(c.id, i)));
    return m;
  }, [arr]);

  const byId = new Map(hand.map((c) => [c.id, c]));
  const onDropCard = (targetId) => {
    if (!drag || drag === targetId) return;
    const list = shown.filter((id) => id !== drag);
    list.splice(list.indexOf(targetId), 0, drag);
    setOrder(list);
    setDrag(null);
  };

  const others = view.players.filter((p) => p.id !== view.me);
  const cutOk = selected && cut?.cardIds.includes(selected);
  const discardOk = selected && discard?.cardIds.includes(selected);
  const leftoverPts = arr?.points ?? 0;

  return (
    <div className="ch-layout">
      <div className="ch-table felt">
        <div className="ch-opponents">
          {others.map((p) => (
            <div key={p.id} className={`ch-seat ${view.currentPlayerId === p.id ? 'is-turn' : ''} ${p.out ? 'is-out' : ''}`} style={{ '--pc': paletteHex(p.colorId) }}>
              <Avatar player={p} />
              <div className="ch-seat__info">
                <strong>
                  {p.name} {view.dealerId === p.id && <span className="ch-chip" title="Da las cartas">D</span>}
                </strong>
                <span>{p.left ? 'Abandonó' : p.out ? 'Fuera (pasó 101)' : `${p.score} puntos`}</span>
              </div>
              <div className="ch-fan">
                {Array.from({ length: Math.min(p.handCount, 8) }, (_, i) => (
                  <SpanishCard skin="clasica" key={i} back size="sm" style={{ marginLeft: i ? -34 : 0 }} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="ch-center">
          <button type="button" className="ch-pile" disabled={!canDraw} onClick={() => send('DRAW', { from: 'deck' })} title="Robar del mazo">
            <SpanishCard skin="clasica" back size="lg" />
            <span className="ch-pile__count">{view.deckCount}</span>
            <span className="ch-pile__label">Mazo</span>
          </button>
          <button
            type="button"
            className={`ch-pile ch-pile--discard ${discardOk ? 'is-target' : ''}`}
            disabled={!(canDraw?.from.includes('discard')) && !discardOk}
            onClick={() => (canDraw ? send('DRAW', { from: 'discard' }) : discardOk && send('DISCARD', { cardId: selected }))}
            onDragOver={(e) => discard && e.preventDefault()}
            onDrop={() => drag && discard?.cardIds.includes(drag) && send('DISCARD', { cardId: drag })}
            title={canDraw ? 'Levantar del pozo' : 'Tirar la carta elegida'}
          >
            {view.discardTop ? <SpanishCard skin="clasica" key={view.discardTop.id} card={view.discardTop} size="lg" className="ch-drop-in" /> : <span className="ch-empty">Pozo vacío</span>}
            <span className="ch-pile__label">Pozo</span>
          </button>
          <div className="ch-info">
            <span>Mano {view.round}</span>
            <span>{view.dealerId === view.me ? 'Das vos' : `Da ${view.players.find((p) => p.id === view.dealerId)?.name ?? ''}`}</span>
          </div>
        </div>

        <div className="kit-turn-wrap">
          {view.phase === 'playing' &&
            (myTurn ? (
              <div className="kit-turn is-mine">{view.step === 'draw' ? 'Te toca: robá del mazo o del pozo' : 'Elegí una carta para tirar (o cortar)'}</div>
            ) : (
              <div className="kit-turn">Juega {view.players.find((p) => p.id === view.currentPlayerId)?.name}…</div>
            ))}
        </div>

        {me && !me.out && (
          <div className="ch-me">
            <div className="ch-hand">
              {shown.map((id) => {
                const c = byId.get(id);
                if (!c) return null;
                const mi = meldOf.get(id);
                return (
                  <div
                    key={id}
                    className={`ch-hand__slot ${fresh.has(id) ? 'is-fresh' : ''}`}
                    style={{ '--meld': mi != null ? MELD_COLORS[mi % 4] : 'transparent' }}
                    draggable
                    onDragStart={() => setDrag(id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropCard(id)}
                    onDragEnd={() => setDrag(null)}
                  >
                    <SpanishCard skin="clasica"
                      card={c}
                      size="md"
                      selected={selected === id}
                      onClick={() => setSelected(selected === id ? null : id)}
                      onDoubleClick={() => discard?.cardIds.includes(id) && send('DISCARD', { cardId: id })}
                    />
                    <span className="ch-hand__meld" />
                  </div>
                );
              })}
            </div>
            <div className="ch-actions">
              <div className="ch-melds">
                {arr?.melds.map((m, i) => (
                  <span key={i} className="ch-meld-tag" style={{ '--meld': MELD_COLORS[i % 4] }}>
                    {meldLabel(m)} · {m.cards.length}
                  </span>
                ))}
                <span className={`ch-loose ${leftoverPts <= 5 ? 'is-low' : ''}`}>Sueltas: {leftoverPts} pts</span>
              </div>
              <Button size="sm" variant="ghost" onClick={group}>
                Agrupar juegos
              </Button>
              <Button size="sm" disabled={!discardOk} onClick={() => send('DISCARD', { cardId: selected })}>
                Tirar al pozo
              </Button>
              <Button size="sm" variant="primary" disabled={!cutOk} onClick={() => send('CUT', { cardId: selected })} title="Cortar: la carta va tapada; lo suelto no puede sumar más de 5">
                Cortar con esta carta
              </Button>
            </div>
            {myTurn && view.step === 'discard' && cut && !selected && <p className="ch-hint">Podés cortar: elegí la carta que va tapada.</p>}
          </div>
        )}
        {me?.out && <p className="ch-hint">Quedaste fuera del partido. Podés seguir mirando.</p>}

        {view.phase === 'round-over' && <RoundOver view={view} send={send} />}
        {view.phase === 'finished' && (
          <Finished view={view} onNextRound={onNextRound} nextRoundLabel={nextRoundLabel}>
            <ScoreTable view={view} />
          </Finished>
        )}
      </div>

      <aside className="ch-side">
        <section className="kit-panel">
          <h4>Puntos (a {TARGET})</h4>
          <ul className="ch-scores">
            {view.players.map((p) => (
              <li key={p.id} className={p.out ? 'is-out' : ''}>
                <Avatar player={p} size="sm" />
                <span className="ch-scores__name">{p.name}</span>
                <span className="ch-scores__bar">
                  <i style={{ width: `${Math.min(100, Math.max(0, (p.score / TARGET) * 100))}%`, background: paletteHex(p.colorId) }} />
                </span>
                <strong>{p.score}</strong>
              </li>
            ))}
          </ul>
        </section>
        {view.history?.length > 0 && (
          <section className="kit-panel ch-history">
            <h4>Manos jugadas</h4>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {view.players.map((p) => (
                    <th key={p.id}>{p.name.slice(0, 6)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.history.map((h) => (
                  <tr key={h.round}>
                    <td>{h.round}</td>
                    {view.players.map((p) => (
                      <td key={p.id} className={h.cutterId === p.id ? 'is-cut' : ''}>
                        {h.points[p.id] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <GameLog lines={view.log} />
        {local && <p className="ch-hint">Partida local: cada jugador ve su mano tras la pantalla de cambio.</p>}
      </aside>
    </div>
  );
}

function RoundOver({ view, send }) {
  const rr = view.roundResult;
  const canNext = view.legal?.some((a) => a.type === 'NEXT_ROUND');
  const cutter = view.players.find((p) => p.id === rr?.cutterId);
  return (
    <div className="kit-overlay">
      <div className="kit-overlay__box ch-round">
        <h2>{rr?.chinchonWin ? `¡${cutter?.name} hizo Chin-Chon!` : rr?.exhausted ? 'Se agotó el mazo' : `${cutter?.name} cortó`}</h2>
        <div className="ch-round__list">
          {view.players
            .filter((p) => rr?.results[p.id])
            .map((p) => {
              const r = rr.results[p.id];
              return (
                <div key={p.id} className="ch-round__row">
                  <span className="ch-round__who">
                    <Avatar player={p} size="sm" /> {p.name}
                  </span>
                  <span className="ch-round__cards">
                    {r.melds.map((m, i) => (
                      <span key={i} className="ch-round__meld">
                        {m.cards.map((c) => (
                          <SpanishCard skin="clasica" key={c.id} card={c} size="sm" />
                        ))}
                      </span>
                    ))}
                    {r.layOffs?.length > 0 && (
                      <span className="ch-round__meld is-layoff" title="Cartas acomodadas en juegos ajenos">
                        {r.layOffs.map((l) => (
                          <SpanishCard skin="clasica" key={l.card.id} card={l.card} size="sm" />
                        ))}
                      </span>
                    )}
                    {r.leftover.length > 0 && (
                      <span className="ch-round__meld is-loose">
                        {r.leftover.map((c) => (
                          <SpanishCard skin="clasica" key={c.id} card={c} size="sm" />
                        ))}
                      </span>
                    )}
                  </span>
                  <strong className={r.points < 0 ? 'is-neg' : ''}>{r.points > 0 ? `+${r.points}` : r.points}</strong>
                </div>
              );
            })}
        </div>
        <ScoreTable view={view} />
        {canNext ? (
          <Button variant="primary" size="lg" onClick={() => send('NEXT_ROUND')}>
            Repartir la siguiente mano
          </Button>
        ) : (
          <p className="ch-hint">Esperando la siguiente mano…</p>
        )}
      </div>
    </div>
  );
}

function ScoreTable({ view }) {
  return (
    <div className="ch-final">
      {[...view.players]
        .sort((a, b) => a.score - b.score)
        .map((p) => (
          <span key={p.id} className={p.out ? 'is-out' : ''}>
            <Avatar player={p} size="sm" /> {p.name}: <strong>{p.score}</strong>
            {p.out && !p.left ? ' (fuera)' : ''}
          </span>
        ))}
    </div>
  );
}
