import { useEffect, useState } from 'react';
import Button from '../../../shared/Button.jsx';
import Modal from '../../../shared/Modal.jsx';
import { Avatar, GameLog, Finished } from '../../../shared/kit/parts.jsx';
import { paletteHex } from '../../../shared/playerPalette.js';
import { GRAPH, HEX_SIZE, RESOURCES } from '../engine/board.js';
import '../colonias.css';

export const ICON = { madera: '🌲', ladrillo: '🧱', lana: '🐑', trigo: '🌾', mineral: '⛰️' };
const TERRAIN_COLOR = { bosque: '#2f7d3a', cerro: '#b8562e', pasto: '#8fcf5a', campo: '#e8c547', montana: '#8b8f9e', desierto: '#d9c38f' };
const TERRAIN_ICON = { bosque: '🌲', cerro: '🧱', pasto: '🐑', campo: '🌾', montana: '⛰️', desierto: '🏜️' };
const DEV_NAME = { caballero: 'Caballero', punto: 'Punto de victoria', caminos: 'Construcción de caminos', abundancia: 'Año de abundancia', monopolio: 'Monopolio' };
const PIPS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const COST_TEXT = { road: '🌲🧱', settlement: '🌲🧱🐑🌾', city: '🌾🌾⛰️⛰️⛰️', dev: '🐑🌾⛰️' };

const hexPoints = (h) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i - 30) * Math.PI) / 180;
    return `${h.x + (HEX_SIZE - 2) * Math.cos(a)},${h.y + (HEX_SIZE - 2) * Math.sin(a)}`;
  }).join(' ');

export default function ColoniasTable({ view, send, onNextRound, nextRoundLabel = 'Volver' }) {
  const [mode, setMode] = useState(null); // 'road' | 'settlement' | 'city'
  const [robberHex, setRobberHex] = useState(null);
  const [dialog, setDialog] = useState(null); // 'bank' | 'offer' | 'plenty' | 'monopoly'
  const legal = view.legal ?? [];
  const has = (t) => legal.find((a) => a.type === t);
  const myTurn = view.currentPlayerId === view.me;
  const step = view.phase === 'setup' ? `setup-${view.setupStep}` : view.turn?.step;
  const colorOf = (pid) => paletteHex(view.players.find((p) => p.id === pid)?.colorId);
  const spots = view.spots;

  useEffect(() => {
    setMode(null);
    setRobberHex(null);
  }, [view.version]);

  // Modo de construcción automático en preparación y con caminos gratis.
  const activeMode = step === 'setup-settlement' && myTurn ? 'setup-settlement' : step === 'setup-road' && myTurn ? 'setup-road' : step === 'road-building' && myTurn ? 'road' : mode;
  const vertexTargets = new Set(activeMode === 'settlement' || activeMode === 'setup-settlement' ? spots?.settlements ?? [] : activeMode === 'city' ? spots?.cities ?? [] : []);
  const edgeTargets = new Set(activeMode === 'road' || activeMode === 'setup-road' ? spots?.roads ?? [] : []);
  const robberMode = myTurn && step === 'robber';

  const clickVertex = (v) => {
    if (!vertexTargets.has(v)) return;
    if (activeMode === 'setup-settlement') send('PLACE_SETTLEMENT', { vertex: v });
    else if (activeMode === 'settlement') send('BUILD_SETTLEMENT', { vertex: v });
    else if (activeMode === 'city') send('BUILD_CITY', { vertex: v });
  };
  const clickEdge = (e) => {
    if (!edgeTargets.has(e)) return;
    if (activeMode === 'setup-road') send('PLACE_ROAD', { edge: e });
    else send('BUILD_ROAD', { edge: e });
  };
  const clickHex = (h) => {
    if (!robberMode || h === view.robber) return;
    const cands = view.stealFrom?.[h] ?? [];
    if (cands.length <= 1) send('MOVE_ROBBER', { hex: h, victim: cands[0] });
    else setRobberHex(h);
  };

  const me = view.players.find((p) => p.id === view.me);
  const res = view.myRes ?? {};
  const discardNeed = view.turn?.discards?.[view.me];
  const trade = view.turn?.trade;

  let hint = '';
  if (view.phase === 'setup') hint = myTurn ? (view.setupStep === 'settlement' ? 'Preparación: elegí dónde fundar tu poblado.' : 'Preparación: poné un camino junto a ese poblado.') : `Coloca ${view.players.find((p) => p.id === view.currentPlayerId)?.name}…`;
  else if (step === 'discard') hint = discardNeed ? `Salió 7: descartá ${discardNeed} cartas.` : 'Salió 7: esperando descartes…';
  else if (!myTurn) hint = trade?.to === view.me ? 'Te hicieron una oferta.' : `Juega ${view.players.find((p) => p.id === view.currentPlayerId)?.name}…`;
  else if (step === 'roll') hint = 'Tirá los dados (o jugá un caballero antes).';
  else if (step === 'robber') hint = 'Mové el ladrón: tocá un hexágono.';
  else if (step === 'road-building') hint = `Construcción de caminos: poné ${view.turn.freeRoads} camino${view.turn.freeRoads > 1 ? 's' : ''} gratis.`;
  else if (trade) hint = 'Esperando respuesta a tu oferta…';
  else hint = mode ? `Elegí dónde construir (${{ road: 'camino', settlement: 'poblado', city: 'ciudad' }[mode]}).` : 'Construí, comerciá o jugá una carta. Después, terminá el turno.';

  return (
    <div className="co-layout">
      <div className="co-main">
        <div className="co-board">
          <svg viewBox="-330 -300 660 600" className="co-svg">
            <defs>
              <radialGradient id="co-sea" cx="50%" cy="50%" r="60%">
                <stop offset="0.55" stopColor="#1d5a86" />
                <stop offset="1" stopColor="#0c2740" />
              </radialGradient>
            </defs>
            <circle r="330" fill="url(#co-sea)" />
            {Object.entries(view.harbors).map(([eid, type]) => {
              const [a, b] = GRAPH.edges[eid].v.map((v) => GRAPH.vertices[v]);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const len = Math.hypot(mx, my);
              const hx = mx + (mx / len) * 34;
              const hy = my + (my / len) * 34;
              return (
                <g key={eid} className="co-harbor">
                  <line x1={a.x} y1={a.y} x2={hx} y2={hy} />
                  <line x1={b.x} y1={b.y} x2={hx} y2={hy} />
                  <circle cx={hx} cy={hy} r="17" />
                  <text x={hx} y={hy + (type === '3:1' ? 4 : -1)}>{type === '3:1' ? '3:1' : ICON[type]}</text>
                  {type !== '3:1' && (
                    <text x={hx} y={hy + 11} className="co-harbor__rate">
                      2:1
                    </text>
                  )}
                </g>
              );
            })}
            {Object.values(GRAPH.hexes).map((h) => {
              const t = view.tiles[h.id];
              const canRob = robberMode && h.id !== view.robber;
              return (
                <g key={h.id} className={`co-hex ${canRob ? 'is-target' : ''}`} onClick={() => clickHex(h.id)}>
                  <polygon points={hexPoints(h)} fill={TERRAIN_COLOR[t.terrain]} />
                  <text x={h.x} y={h.y - 22} className="co-hex__icon">
                    {TERRAIN_ICON[t.terrain]}
                  </text>
                  {t.number && (
                    <g className={`co-token ${t.number === 6 || t.number === 8 ? 'is-red' : ''} ${view.dice && view.dice[0] + view.dice[1] === t.number ? 'is-rolled' : ''}`}>
                      <circle cx={h.x} cy={h.y + 8} r="18" />
                      <text x={h.x} y={h.y + 13}>{t.number}</text>
                      <text x={h.x} y={h.y + 22} className="co-token__pips">
                        {'•'.repeat(PIPS[t.number])}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            {(() => {
              const h = GRAPH.hexes[view.robber];
              return (
                <g className="co-robber" key={view.robber} transform={`translate(${h.x + 26} ${h.y - 2})`}>
                  <ellipse cx="0" cy="18" rx="11" ry="4" fill="rgba(0,0,0,.4)" />
                  <path d="M-8 18 Q-10 0 0 -4 Q10 0 8 18 Z" fill="#2a2d3a" stroke="#000" />
                  <circle cx="0" cy="-9" r="6.5" fill="#2a2d3a" stroke="#000" />
                </g>
              );
            })()}
            {Object.values(GRAPH.edges).map((e) => {
              const [a, b] = e.v.map((v) => GRAPH.vertices[v]);
              const owner = view.roads[e.id];
              const target = edgeTargets.has(e.id);
              if (!owner && !target) return null;
              return (
                <g key={e.id} className={`co-edge ${target ? 'is-target' : ''}`} onClick={() => clickEdge(e.id)}>
                  {target && <line className="co-edge__hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />}
                  <line x1={a.x + (b.x - a.x) * 0.14} y1={a.y + (b.y - a.y) * 0.14} x2={b.x - (b.x - a.x) * 0.14} y2={b.y - (b.y - a.y) * 0.14} stroke={owner ? colorOf(owner) : '#fff'} />
                </g>
              );
            })}
            {Object.values(GRAPH.vertices).map((v) => {
              const b = view.buildings[v.id];
              const target = vertexTargets.has(v.id);
              if (!b && !target) return null;
              return (
                <g key={v.id} className={`co-vertex ${target ? 'is-target' : ''}`} transform={`translate(${v.x} ${v.y})`} onClick={() => clickVertex(v.id)}>
                  {b?.type === 'settlement' && <path d="M-9 8 V-2 L0 -11 L9 -2 V8 Z" fill={colorOf(b.owner)} stroke="#111" strokeWidth="1.6" />}
                  {b?.type === 'city' && <path d="M-13 9 V-4 L-6 -11 L1 -4 V-1 H13 V9 Z" fill={colorOf(b.owner)} stroke="#111" strokeWidth="1.6" />}
                  {target && <circle r="8" />}
                </g>
              );
            })}
          </svg>
          {view.dice && (
            <div className="co-dice" key={view.lastEvent?.seq}>
              <i>{view.dice[0]}</i>
              <i>{view.dice[1]}</i>
            </div>
          )}
        </div>
        <div className={`kit-turn ${myTurn || discardNeed ? 'is-mine' : ''}`}>{hint}</div>
        {view.phase === 'finished' && (
          <Finished view={view} onNextRound={onNextRound} nextRoundLabel={nextRoundLabel}>
            <p>
              {view.players
                .map((p) => `${p.name}: ${p.points}`)
                .join(' · ')}
            </p>
          </Finished>
        )}
      </div>

      <aside className="co-side">
        <section className="kit-panel">
          <h4>Jugadores · a 10 puntos</h4>
          <ul className="co-players">
            {view.players.map((p) => (
              <li key={p.id} className={`${p.id === view.currentPlayerId ? 'is-turn' : ''} ${p.left ? 'is-out' : ''}`} style={{ '--pc': paletteHex(p.colorId) }}>
                <Avatar player={p} size="sm" />
                <div className="co-players__body">
                  <span>
                    {p.name}
                    {p.id === view.me ? ' (vos)' : ''}
                    {view.longestRoad === p.id && <em title="Gran Camino (+2)">🛣️</em>}
                    {view.largestArmy === p.id && <em title="Gran Ejército (+2)">⚔️</em>}
                  </span>
                  <small>
                    🂠 {p.cards} · 📜 {p.devCount} · ⚔ {p.knights} · 🛣 {p.roadLength}
                  </small>
                </div>
                <strong>{p.id === view.me ? view.myPoints : p.points}</strong>
              </li>
            ))}
          </ul>
        </section>
        {view.myRes && (
          <section className="kit-panel co-hand">
            <h4>Tus recursos</h4>
            <div className="co-res">
              {RESOURCES.map((r) => (
                <span key={r} className={`co-rescard co-rescard--${r} ${res[r] ? '' : 'is-zero'}`} title={r}>
                  {ICON[r]}
                  <b>{res[r]}</b>
                </span>
              ))}
            </div>
            {view.myDev.length > 0 && (
              <div className="co-devs">
                {Object.entries(view.myDev.reduce((m, d) => ({ ...m, [d]: (m[d] ?? 0) + 1 }), {})).map(([d, n]) => (
                  <span key={d} className="co-dev">
                    {DEV_NAME[d]} ×{n}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}
        <section className="kit-panel co-actions">
          <h4>Acciones</h4>
          <div className="co-actions__grid">
            {has('ROLL') && (
              <Button variant="primary" onClick={() => send('ROLL')}>
                🎲 Tirar los dados
              </Button>
            )}
            {step === 'main' && myTurn && !trade && (
              <>
                <Button size="sm" className={mode === 'road' ? 'is-on' : ''} disabled={!has('BUILD_ROAD') || !spots?.roads.length} onClick={() => setMode(mode === 'road' ? null : 'road')}>
                  Camino {COST_TEXT.road}
                </Button>
                <Button size="sm" className={mode === 'settlement' ? 'is-on' : ''} disabled={!has('BUILD_SETTLEMENT') || !spots?.settlements.length} onClick={() => setMode(mode === 'settlement' ? null : 'settlement')}>
                  Poblado {COST_TEXT.settlement}
                </Button>
                <Button size="sm" className={mode === 'city' ? 'is-on' : ''} disabled={!has('BUILD_CITY') || !spots?.cities.length} onClick={() => setMode(mode === 'city' ? null : 'city')}>
                  Ciudad {COST_TEXT.city}
                </Button>
                <Button size="sm" disabled={!has('BUY_DEV')} onClick={() => send('BUY_DEV')}>
                  Carta {COST_TEXT.dev}
                </Button>
                <Button size="sm" onClick={() => setDialog('bank')}>
                  Comerciar con el banco
                </Button>
                <Button size="sm" onClick={() => setDialog('offer')}>
                  Ofrecer a un jugador
                </Button>
              </>
            )}
            {has('PLAY_KNIGHT') && (
              <Button size="sm" onClick={() => send('PLAY_KNIGHT')}>
                Jugar caballero
              </Button>
            )}
            {has('PLAY_ROAD_BUILDING') && (
              <Button size="sm" onClick={() => send('PLAY_ROAD_BUILDING')}>
                Jugar Construcción de caminos
              </Button>
            )}
            {has('PLAY_YEAR_OF_PLENTY') && (
              <Button size="sm" onClick={() => setDialog('plenty')}>
                Jugar Año de abundancia
              </Button>
            )}
            {has('PLAY_MONOPOLY') && (
              <Button size="sm" onClick={() => setDialog('monopoly')}>
                Jugar Monopolio
              </Button>
            )}
            {has('CANCEL_TRADE') && (
              <Button size="sm" variant="ghost" onClick={() => send('CANCEL_TRADE')}>
                Retirar oferta
              </Button>
            )}
            {has('END_TURN') && (
              <Button variant="ghost" onClick={() => send('END_TURN')}>
                Terminar turno
              </Button>
            )}
          </div>
        </section>
        <section className="kit-panel co-bank">
          <h4>Banco · {view.devDeckCount} cartas de desarrollo</h4>
          <div>
            {RESOURCES.map((r) => (
              <span key={r}>
                {ICON[r]} {view.bank[r]}
              </span>
            ))}
          </div>
        </section>
        <GameLog lines={view.log} />
      </aside>

      {robberHex && (
        <Modal title="¿A quién le robás?" onClose={() => setRobberHex(null)} width={380}>
          <div className="co-pick">
            {view.stealFrom[robberHex].map((pid) => {
              const p = view.players.find((x) => x.id === pid);
              return (
                <Button key={pid} onClick={() => send('MOVE_ROBBER', { hex: robberHex, victim: pid })}>
                  <Avatar player={p} size="sm" /> {p.name} ({p.cards} cartas)
                </Button>
              );
            })}
          </div>
        </Modal>
      )}
      {discardNeed && <DiscardDialog need={discardNeed} res={res} onDone={(cards) => send('DISCARD', { cards })} />}
      {trade?.to === view.me && <OfferDialog view={view} trade={trade} send={send} />}
      {dialog === 'bank' && <BankDialog view={view} res={res} onClose={() => setDialog(null)} send={send} />}
      {dialog === 'offer' && <OfferComposer view={view} res={res} onClose={() => setDialog(null)} send={send} />}
      {dialog === 'plenty' && <PickDialog title="Año de abundancia: elegí 2 recursos" count={2} onClose={() => setDialog(null)} onDone={(resources) => send('PLAY_YEAR_OF_PLENTY', { resources })} />}
      {dialog === 'monopoly' && <PickDialog title="Monopolio: elegí un recurso" count={1} onClose={() => setDialog(null)} onDone={([resource]) => send('PLAY_MONOPOLY', { resource })} />}
    </div>
  );
}

function Counter({ value, onChange, max }) {
  return (
    <span className="co-counter">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>
        −
      </button>
      <b>{value}</b>
      <button type="button" disabled={max != null && value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </span>
  );
}

function DiscardDialog({ need, res, onDone }) {
  const [cards, setCards] = useState({});
  const n = Object.values(cards).reduce((a, b) => a + b, 0);
  return (
    <div className="kit-overlay">
      <div className="kit-overlay__box">
        <h2>Descartá {need} cartas</h2>
        <div className="co-trade-rows">
          {RESOURCES.map((r) => (
            <label key={r}>
              {ICON[r]} {r} ({res[r]})
              <Counter value={cards[r] ?? 0} max={res[r]} onChange={(v) => setCards({ ...cards, [r]: v })} />
            </label>
          ))}
        </div>
        <Button variant="primary" size="lg" disabled={n !== need} onClick={() => onDone(cards)}>
          Descartar {n}/{need}
        </Button>
      </div>
    </div>
  );
}

function BankDialog({ view, res, onClose, send }) {
  const [give, setGive] = useState(RESOURCES.find((r) => res[r] >= view.myRates[r]) ?? 'madera');
  const [get, setGet] = useState(RESOURCES.find((r) => r !== give) ?? 'trigo');
  const rate = view.myRates[give];
  return (
    <Modal title="Comerciar con el banco" onClose={onClose} width={460}>
      <div className="co-trade-rows">
        <label>
          Doy {rate} de
          <select value={give} onChange={(e) => setGive(e.target.value)}>
            {RESOURCES.map((r) => (
              <option key={r} value={r}>
                {ICON[r]} {r} (tenés {res[r]}, {view.myRates[r]}:1)
              </option>
            ))}
          </select>
        </label>
        <label>
          Recibo 1 de
          <select value={get} onChange={(e) => setGet(e.target.value)}>
            {RESOURCES.filter((r) => r !== give).map((r) => (
              <option key={r} value={r}>
                {ICON[r]} {r} (banco {view.bank[r]})
              </option>
            ))}
          </select>
        </label>
      </div>
      <Button variant="primary" disabled={res[give] < rate || give === get} onClick={() => send('BANK_TRADE', { give, get: get === give ? RESOURCES.find((r) => r !== give) : get })}>
        Cambiar {rate} {ICON[give]} por 1 {ICON[get]}
      </Button>
    </Modal>
  );
}

function OfferComposer({ view, res, onClose, send }) {
  const others = view.players.filter((p) => p.id !== view.me && !p.left);
  const [to, setTo] = useState(others[0]?.id);
  const [give, setGive] = useState({});
  const [get, setGet] = useState({});
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  return (
    <Modal title="Ofrecer un intercambio" onClose={onClose} width={560}>
      <label className="co-to">
        A
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.cards} cartas)
            </option>
          ))}
        </select>
      </label>
      <div className="co-offer">
        <div>
          <h5>Doy</h5>
          {RESOURCES.map((r) => (
            <label key={r}>
              {ICON[r]} <Counter value={give[r] ?? 0} max={res[r]} onChange={(v) => setGive({ ...give, [r]: v })} />
            </label>
          ))}
        </div>
        <div>
          <h5>Pido</h5>
          {RESOURCES.map((r) => (
            <label key={r}>
              {ICON[r]} <Counter value={get[r] ?? 0} onChange={(v) => setGet({ ...get, [r]: v })} />
            </label>
          ))}
        </div>
      </div>
      <Button
        variant="primary"
        disabled={!to || !sum(give) || !sum(get)}
        onClick={() => {
          send('OFFER_TRADE', { to, give, get });
          onClose();
        }}
      >
        Enviar oferta
      </Button>
    </Modal>
  );
}

function OfferDialog({ view, trade, send }) {
  const from = view.players.find((p) => p.id === trade.from);
  const fmt = (o) =>
    Object.entries(o)
      .map(([r, n]) => `${n} ${ICON[r]}`)
      .join(' ');
  const res = view.myRes ?? {};
  const can = Object.entries(trade.get).every(([r, n]) => res[r] >= n);
  return (
    <div className="kit-overlay">
      <div className="kit-overlay__box">
        <h2>{from?.name} te ofrece</h2>
        <p className="co-offer-line">
          Te da <strong>{fmt(trade.give)}</strong> a cambio de <strong>{fmt(trade.get)}</strong>
        </p>
        <div className="kit-row">
          <Button variant="primary" disabled={!can} onClick={() => send('ACCEPT_TRADE')}>
            Aceptar
          </Button>
          <Button variant="danger" onClick={() => send('REJECT_TRADE')}>
            Rechazar
          </Button>
        </div>
        {!can && <p className="kit-error">No tenés lo que te piden.</p>}
      </div>
    </div>
  );
}

function PickDialog({ title, count, onClose, onDone }) {
  const [picked, setPicked] = useState([]);
  return (
    <Modal title={title} onClose={onClose} width={460}>
      <div className="co-pick co-pick--row">
        {RESOURCES.map((r) => (
          <Button key={r} onClick={() => setPicked([...picked, r].slice(-count))}>
            {ICON[r]} {r}
          </Button>
        ))}
      </div>
      <p className="co-picked">Elegiste: {picked.map((r) => ICON[r]).join(' ') || '—'}</p>
      <Button
        variant="primary"
        disabled={picked.length !== count}
        onClick={() => {
          onDone(picked);
          onClose();
        }}
      >
        Confirmar
      </Button>
    </Modal>
  );
}
