import { useEffect, useMemo, useState } from 'react';
import Button from '../../../shared/Button.jsx';
import Modal from '../../../shared/Modal.jsx';
import { Avatar, GameLog, Finished } from '../../../shared/kit/parts.jsx';
import { paletteHex } from '../../../shared/playerPalette.js';
import { CITIES, ROUTES, ROUTE_BY_ID, COLOR_HEX, COLORS, ROUTE_POINTS } from '../data/map.js';
import '../rutas.css';

const LOCO = 'locomotora';
const CARD_ORDER = [...COLORS, LOCO];
/** Ajuste de etiquetas que se pisan. */
const LABEL = { montevideo: [14, 20], 'buenos-aires': [-30, -11], santiago: [-16, -11], mendoza: [12, -11], paramaribo: [18, -11], 'belo-horizonte': [0, -12] };

/** Geometría de los vagones de un tramo. */
function segments(r) {
  const A = CITIES[r.a];
  const B = CITIES[r.b];
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const off = r.lane * 5.5;
  const start = 11;
  const usable = len - 22;
  const gap = 2.2;
  const w = (usable - gap * (r.length - 1)) / r.length;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return Array.from({ length: r.length }, (_, i) => {
    const d = start + i * (w + gap) + w / 2;
    return { x: A.x + ux * d - uy * off, y: A.y + uy * d + ux * off, w, angle };
  });
}
const GEOM = Object.fromEntries(ROUTES.map((r) => [r.id, segments(r)]));

export default function RutasTable({ view, send, onNextRound, nextRoundLabel = 'Volver' }) {
  const [claiming, setClaiming] = useState(null);
  const [keep, setKeep] = useState([]);
  const [hoverTicket, setHoverTicket] = useState(null);
  const legal = view.legal ?? [];
  const drawAct = legal.find((a) => a.type === 'DRAW_CARD');
  const claimAct = legal.find((a) => a.type === 'CLAIM');
  const claimable = new Set(claimAct?.routeIds ?? []);
  const myTurn = view.currentPlayerId === view.me;
  const colorOf = (pid) => paletteHex(view.players.find((p) => p.id === pid)?.colorId);
  const me = view.players.find((p) => p.id === view.me);

  useEffect(() => setKeep(view.myOffer ? view.myOffer.tickets.map((t) => t.id) : []), [view.myOffer?.tickets.map((t) => t.id).join()]);
  useEffect(() => setClaiming(null), [view.version]);

  const highlight = useMemo(() => {
    const t = hoverTicket ?? null;
    return t ? new Set([t.a, t.b]) : new Set();
  }, [hoverTicket]);

  const payOptions = (r) => {
    const hand = view.myHand;
    const loco = hand[LOCO] ?? 0;
    const opts = (r.color === 'gris' ? COLORS : [r.color]).filter((c) => (hand[c] ?? 0) + loco >= r.length && (hand[c] ?? 0) > 0);
    if (loco >= r.length) opts.push(LOCO);
    return opts;
  };
  const tryClaim = (id) => {
    if (!claimable.has(id)) return;
    const r = ROUTE_BY_ID[id];
    const opts = payOptions(r);
    if (opts.length === 1) send('CLAIM', { routeId: id, color: opts[0] });
    else setClaiming({ route: r, opts });
  };

  let hint = '';
  if (view.phase === 'choose-tickets') hint = view.myOffer ? 'Elegí tus destinos iniciales (al menos 2).' : 'Esperando que los demás elijan sus destinos…';
  else if (view.phase === 'playing') {
    if (!myTurn) hint = `Juega ${view.players.find((p) => p.id === view.currentPlayerId)?.name}…`;
    else if (view.myOffer) hint = 'Elegí qué destinos te quedás (al menos 1).';
    else if (view.turn.drawn) hint = 'Robá tu segunda carta (no una locomotora visible).';
    else hint = 'Tu turno: robá 2 cartas, ocupá un tramo (tocalo en el mapa) o robá destinos.';
  }

  return (
    <div className="rt-layout">
      <aside className="rt-left">
        <section className="kit-panel">
          <h4>Jugadores</h4>
          <ul className="rt-players">
            {view.players.map((p) => (
              <li key={p.id} className={`${p.id === view.currentPlayerId ? 'is-turn' : ''} ${p.left ? 'is-out' : ''}`} style={{ '--pc': paletteHex(p.colorId) }}>
                <Avatar player={p} size="sm" />
                <div className="rt-players__body">
                  <span className="rt-players__name">
                    {p.name}
                    {p.id === view.me ? ' (vos)' : ''}
                    {p.choosing && <small> eligiendo…</small>}
                  </span>
                  <span className="rt-players__stats">
                    <span title="Vagones">🚃 {p.trains}</span>
                    <span title="Cartas">🂠 {p.cardCount}</span>
                    <span title="Destinos">🎫 {p.ticketCount}</span>
                  </span>
                </div>
                <strong title="Puntos por tramos">{p.routePoints}</strong>
              </li>
            ))}
          </ul>
          {view.finalTurnsLeft != null && <p className="rt-final">¡Última vuelta! Quedan {view.finalTurnsLeft} turnos.</p>}
        </section>
        <section className="kit-panel rt-tickets">
          <h4>Tus destinos</h4>
          {view.myTickets.length === 0 && <small>Todavía no tenés destinos.</small>}
          {view.myTickets.map((t) => (
            <div key={t.id} className={`rt-ticket ${t.done ? 'is-done' : ''}`} onMouseEnter={() => setHoverTicket(t)} onMouseLeave={() => setHoverTicket(null)}>
              <span>
                {CITIES[t.a].name} → {CITIES[t.b].name}
              </span>
              <strong>{t.points}</strong>
              {t.done && <em>✓</em>}
            </div>
          ))}
          {view.myLongest > 0 && <small>Tu camino continuo más largo: {view.myLongest}</small>}
        </section>
        <GameLog lines={view.log} />
      </aside>

      <div className="rt-main">
        <div className="rt-map">
          <svg viewBox="40 20 860 770" className="rt-svg">
            <defs>
              <radialGradient id="rt-land" cx="50%" cy="40%" r="70%">
                <stop offset="0" stopColor="#24402c" />
                <stop offset="1" stopColor="#0f1d16" />
              </radialGradient>
            </defs>
            <rect x="40" y="20" width="860" height="770" fill="#0b1830" />
            <filter id="rt-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <g filter="url(#rt-blur)" opacity="0.9">
              {Object.values(CITIES).map((c) => (
                <circle key={c.id} cx={c.x} cy={c.y} r="58" fill="#1d3a27" />
              ))}
              {ROUTES.filter((r) => r.lane !== 1).map((r) => (
                <line key={r.id} x1={CITIES[r.a].x} y1={CITIES[r.a].y} x2={CITIES[r.b].x} y2={CITIES[r.b].y} stroke="#1d3a27" strokeWidth="70" />
              ))}
            </g>
            {ROUTES.map((r) => {
              const owner = view.claims[r.id];
              const can = myTurn && claimable.has(r.id);
              const blocked = !owner && r.pair && view.claims[r.pair] && view.smallGame;
              return (
                <g key={r.id} className={`rt-route ${can ? 'is-can' : ''} ${owner ? 'is-owned' : ''} ${blocked ? 'is-blocked' : ''}`} onClick={() => tryClaim(r.id)}>
                  <title>
                    {CITIES[r.a].name} – {CITIES[r.b].name}: {r.length} {r.color === 'gris' ? 'de cualquier color' : r.color} · {ROUTE_POINTS[r.length]} pts
                    {owner ? ` · de ${view.players.find((p) => p.id === owner)?.name}` : ''}
                  </title>
                  {GEOM[r.id].map((g, i) => (
                    <rect
                      key={i}
                      x={g.x - g.w / 2}
                      y={g.y - 4.5}
                      width={g.w}
                      height="9"
                      rx="2"
                      transform={`rotate(${g.angle} ${g.x} ${g.y})`}
                      fill={owner ? colorOf(owner) : COLOR_HEX[r.color]}
                      stroke={owner ? '#fff' : 'rgba(0,0,0,.55)'}
                      strokeWidth={owner ? 1.4 : 1}
                    />
                  ))}
                </g>
              );
            })}
            {Object.values(CITIES).map((c) => (
              <g key={c.id} className={`rt-city ${highlight.has(c.id) ? 'is-hl' : ''}`} transform={`translate(${c.x} ${c.y})`}>
                <circle r="7" />
                <text x={LABEL[c.id]?.[0] ?? 0} y={LABEL[c.id]?.[1] ?? -11}>
                  {c.name}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className={`kit-turn ${myTurn ? 'is-mine' : ''}`}>{hint}</div>
        {view.phase === 'finished' && (
          <Finished view={view} onNextRound={onNextRound} nextRoundLabel={nextRoundLabel}>
            <Results view={view} />
          </Finished>
        )}
      </div>

      <aside className="rt-right">
        <section className="kit-panel rt-market">
          <h4>Cartas de vagón</h4>
          <div className="rt-faceup">
            {view.faceUp.map((c, i) => (
              <button key={`${i}-${c}`} type="button" className={`rt-card rt-card--${c}`} style={{ '--c': COLOR_HEX[c] }} disabled={!drawAct?.faceUp.includes(i)} onClick={() => send('DRAW_CARD', { from: i })} title={c}>
                {c === LOCO ? '🚂' : ''}
              </button>
            ))}
            <button type="button" className="rt-card rt-card--back" disabled={!drawAct?.deck} onClick={() => send('DRAW_CARD', { from: 'deck' })} title="Robar del mazo">
              <span>{view.deckCount + view.discardCount}</span>
            </button>
          </div>
          <Button size="sm" disabled={!legal.some((a) => a.type === 'DRAW_TICKETS')} onClick={() => send('DRAW_TICKETS')}>
            Robar destinos ({view.ticketDeckCount})
          </Button>
          {legal.some((a) => a.type === 'PASS') && (
            <Button size="sm" variant="ghost" onClick={() => send('PASS')}>
              Pasar (no hay jugadas)
            </Button>
          )}
        </section>
        <section className="kit-panel rt-hand">
          <h4>Tu mano {me ? `· ${me.trains} vagones` : ''}</h4>
          <div className="rt-hand__list">
            {CARD_ORDER.filter((c) => view.myHand[c]).map((c) => (
              <span key={c} className={`rt-card rt-card--sm rt-card--${c}`} style={{ '--c': COLOR_HEX[c] }} title={c}>
                {c === LOCO ? '🚂' : ''}
                <b>{view.myHand[c]}</b>
              </span>
            ))}
            {!Object.keys(view.myHand).length && <small>Sin cartas.</small>}
          </div>
        </section>
        <section className="kit-panel rt-scoring">
          <h4>Puntos por tramo</h4>
          <div>
            {Object.entries(ROUTE_POINTS).map(([l, p]) => (
              <span key={l}>
                {l}→{p}
              </span>
            ))}
          </div>
        </section>
      </aside>

      {claiming && (
        <Modal title={`Ocupar ${CITIES[claiming.route.a].name} – ${CITIES[claiming.route.b].name}`} onClose={() => setClaiming(null)} width={420}>
          <p className="rt-modal-p">¿Con qué color pagás? Las locomotoras completan lo que falte.</p>
          <div className="rt-paycolors">
            {claiming.opts.map((c) => (
              <button key={c} type="button" className={`rt-card rt-card--${c}`} style={{ '--c': COLOR_HEX[c] }} onClick={() => send('CLAIM', { routeId: claiming.route.id, color: c })}>
                {c === LOCO ? '🚂' : ''}
                <b>{c}</b>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {view.myOffer && (view.phase === 'choose-tickets' || myTurn) && (
        <div className="kit-overlay">
          <div className="kit-overlay__box rt-offer">
            <h2>Destinos</h2>
            <p>Quedate con al menos {view.myOffer.min}. Si al final no los completás, restan.</p>
            <div className="rt-offer__list">
              {view.myOffer.tickets.map((t) => (
                <label key={t.id} className={`rt-ticket rt-ticket--big ${keep.includes(t.id) ? 'is-on' : ''}`} onMouseEnter={() => setHoverTicket(t)} onMouseLeave={() => setHoverTicket(null)}>
                  <input type="checkbox" checked={keep.includes(t.id)} onChange={() => setKeep(keep.includes(t.id) ? keep.filter((x) => x !== t.id) : [...keep, t.id])} />
                  <span>
                    {CITIES[t.a].name} → {CITIES[t.b].name}
                  </span>
                  <strong>{t.points}</strong>
                </label>
              ))}
            </div>
            <Button variant="primary" size="lg" disabled={keep.length < view.myOffer.min} onClick={() => send('KEEP_TICKETS', { ticketIds: keep })}>
              Quedarme con {keep.length}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Results({ view }) {
  if (!view.results) return null;
  return (
    <table className="rt-results">
      <thead>
        <tr>
          <th />
          <th>Tramos</th>
          <th>Destinos</th>
          <th>Camino</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {[...view.results]
          .sort((a, b) => b.total - a.total)
          .map((r) => {
            const p = view.players.find((x) => x.id === r.playerId);
            return (
              <tr key={r.playerId}>
                <td>
                  <Avatar player={p} size="sm" /> {p.name}
                </td>
                <td>{r.routes}</td>
                <td>
                  +{r.ticketsPlus} / −{r.ticketsMinus}
                </td>
                <td>
                  {r.longest}
                  {r.bonus ? ' (+10)' : ''}
                </td>
                <td>
                  <strong>{r.total}</strong>
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}
