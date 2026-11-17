import { useEffect, useMemo, useState } from 'react';
import Button from '../../../shared/Button.jsx';
import { Avatar, GameLog, Finished } from '../../../shared/kit/parts.jsx';
import { paletteHex } from '../../../shared/playerPalette.js';
import { TERRITORIES, TERRITORY_IDS, CONTINENTS } from '../data/map.js';
import '../dominio.css';

const NEUTRAL_COLOR = '#8a8fa8';
const SYMBOL = { infanteria: '♟', caballeria: '♞', artilleria: '✹', comodin: '★' };
const SYMBOL_NAME = { infanteria: 'Infantería', caballeria: 'Caballería', artilleria: 'Artillería', comodin: 'Comodín' };

/** Aristas del mapa (una por par). Alaska–Kamchatka cruza el borde del mapa. */
const EDGES = (() => {
  const out = [];
  for (const t of TERRITORY_IDS) for (const a of TERRITORIES[t].adj) if (t < a) out.push([t, a]);
  return out;
})();

export default function DominioTable({ view, send, onNextRound, nextRoundLabel = 'Volver' }) {
  const [sel, setSel] = useState(null); // territorio de origen
  const [target, setTarget] = useState(null);
  const [count, setCount] = useState(1);
  const [cards, setCards] = useState([]);
  const [dice, setDice] = useState(3);
  const myTurn = view.currentPlayerId === view.me;
  const step = view.phase === 'setup' ? 'setup' : view.turn?.step;
  const pm = view.turn?.pendingMove;
  const colorOf = (owner) => (owner === 'neutral' ? NEUTRAL_COLOR : paletteHex(view.players.find((p) => p.id === owner)?.colorId));
  const legal = view.legal ?? [];
  const can = (t) => legal.some((a) => a.type === t);

  useEffect(() => {
    setSel(null);
    setTarget(null);
  }, [step, view.currentPlayerId]);
  useEffect(() => setCards((c) => c.filter((id) => view.myCards.some((x) => x.id === id))), [view.myCards]);
  useEffect(() => {
    if (pm) setCount(pm.max);
  }, [pm]);
  useEffect(() => {
    if (step === 'reinforce') setCount(view.turn.toPlace || 1);
  }, [step, view.turn?.toPlace]);

  const b = view.board;
  const mine = (t) => b[t].owner === view.me;
  const reachable = useMemo(() => {
    if (!sel) return new Set();
    const adj = TERRITORIES[sel].adj;
    if (step === 'attack') return new Set(adj.filter((x) => b[x].owner !== view.me));
    if (step === 'fortify' || step === 'attack-fortify') return new Set(adj.filter((x) => b[x].owner === view.me));
    return new Set();
  }, [sel, step, b, view.me]);

  const fortifyMode = myTurn && step === 'fortify';
  const attackMode = myTurn && step === 'attack' && !pm;
  const clickT = (t) => {
    if (!myTurn) return;
    if (step === 'setup') return mine(t) && send('PLACE', { territory: t, count: 1 });
    if (step === 'reinforce') return mine(t) && can('PLACE') && send('PLACE', { territory: t, count: Math.min(count, view.turn.toPlace) });
    if (pm) return;
    if (attackMode || fortifyMode) {
      if (mine(t) && (!sel || !(fortifyMode && reachable.has(t)))) {
        if (b[t].armies < 2) return setSel(null);
        setSel(t);
        setTarget(null);
        return;
      }
      if (sel && reachable.has(t)) {
        setTarget(t);
        setCount(Math.max(1, b[sel].armies - 1));
        return;
      }
      if (sel && attackMode && mine(t) && TERRITORIES[sel].adj.includes(t)) {
        setTarget(t);
        setCount(Math.max(1, b[sel].armies - 1));
      }
    }
  };

  const ev = view.lastEvent;
  const lastAttack = ev?.type === 'attack' ? ev : null;
  const me = view.players.find((p) => p.id === view.me);
  const isFortifyTarget = target && sel && mine(target);
  const maxDice = sel ? Math.min(3, b[sel].armies - 1) : 3;

  let hint = '';
  if (!myTurn) hint = view.phase === 'finished' ? '' : `Juega ${view.players.find((p) => p.id === view.currentPlayerId)?.name}…`;
  else if (step === 'setup') hint = `Colocación inicial: tocá uno de tus territorios para poner 1 ejército (te quedan ${me?.toPlaceSetup}).`;
  else if (step === 'reinforce') hint = view.myCards.length >= 5 ? 'Tenés 5 o más cartas: canjeá un juego.' : view.turn.toPlace ? `Poné ${view.turn.toPlace} ejércitos: elegí cuántos y tocá un territorio tuyo.` : 'Listo: pasá a atacar.';
  else if (pm) hint = 'Conquistaste: elegí cuántos ejércitos mover.';
  else if (step === 'attack') hint = sel ? (target ? '' : 'Tocá un territorio enemigo vecino (o uno tuyo para reagrupar).') : 'Ataque: tocá un territorio tuyo con 2 o más ejércitos.';
  else if (step === 'fortify') hint = 'Reagrupar: elegí origen y un territorio tuyo vecino, o terminá el turno.';

  return (
    <div className="dm-layout">
      <div className="dm-main">
        <div className="dm-map">
          <svg viewBox="0 0 1000 560" className="dm-svg">
            <defs>
              <filter id="dm-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="16" />
              </filter>
              <radialGradient id="dm-sea" cx="50%" cy="50%" r="75%">
                <stop offset="0" stopColor="#123053" />
                <stop offset="1" stopColor="#081426" />
              </radialGradient>
            </defs>
            <rect width="1000" height="560" fill="url(#dm-sea)" />
            <g filter="url(#dm-blur)" opacity="0.55">
              {TERRITORY_IDS.map((t) => (
                <circle key={t} cx={TERRITORIES[t].x} cy={TERRITORIES[t].y} r="44" fill={CONTINENTS[TERRITORIES[t].continent].color} />
              ))}
            </g>
            <g className="dm-edges">
              {EDGES.map(([a, c]) => {
                const A = TERRITORIES[a];
                const C = TERRITORIES[c];
                if (Math.abs(A.x - C.x) > 500) {
                  const [l, r] = A.x < C.x ? [A, C] : [C, A];
                  return (
                    <g key={a + c}>
                      <line x1={l.x} y1={l.y} x2={0} y2={l.y - 4} />
                      <line x1={r.x} y1={r.y} x2={1000} y2={r.y - 4} />
                    </g>
                  );
                }
                return <line key={a + c} x1={A.x} y1={A.y} x2={C.x} y2={C.y} />;
              })}
            </g>
            {sel && target && <line className="dm-arrow" x1={TERRITORIES[sel].x} y1={TERRITORIES[sel].y} x2={TERRITORIES[target].x} y2={TERRITORIES[target].y} />}
            {TERRITORY_IDS.map((t) => {
              const T = TERRITORIES[t];
              const owner = b[t].owner;
              const flash = (ev?.type === 'attack' && (ev.from === t || ev.to === t)) || (ev?.type === 'place' && ev.territory === t);
              const cls = ['dm-terr', mine(t) ? 'is-mine' : '', sel === t ? 'is-sel' : '', target === t ? 'is-target' : '', reachable.has(t) ? 'is-reach' : '', flash ? 'is-flash' : ''].join(' ');
              return (
                <g key={t} className={cls} transform={`translate(${T.x} ${T.y})`} onClick={() => clickT(t)}>
                  <title>
                    {T.name} · {CONTINENTS[T.continent].name}
                  </title>
                  <circle r="19" fill={colorOf(owner)} stroke={CONTINENTS[T.continent].color} strokeWidth="3" />
                  <text className="dm-armies" y="5">
                    {b[t].armies}
                  </text>
                  <text className="dm-name" y="33">
                    {T.name.length > 16 ? T.name.replace('Estados Unidos', 'EE. UU.').replace('Territorio del', 'T. del') : T.name}
                  </text>
                </g>
              );
            })}
          </svg>
          {lastAttack && (
            <div className="dm-dice" key={ev.seq}>
              <span className="dm-dice__row">
                {lastAttack.rolls.at(-1).attack.map((d, i) => (
                  <i key={i} className="dm-die dm-die--a">
                    {d}
                  </i>
                ))}
              </span>
              <span className="dm-dice__vs">vs</span>
              <span className="dm-dice__row">
                {lastAttack.rolls.at(-1).defend.map((d, i) => (
                  <i key={i} className="dm-die dm-die--d">
                    {d}
                  </i>
                ))}
              </span>
              {lastAttack.rolls.length > 1 && <small>{lastAttack.rolls.length} tiradas</small>}
              {lastAttack.conquered && <strong>¡Conquistado!</strong>}
            </div>
          )}
        </div>

        <div className="dm-controls">
          <div className={`kit-turn ${myTurn ? 'is-mine' : ''}`}>{hint}</div>
          {myTurn && step === 'reinforce' && view.turn.toPlace > 0 && can('PLACE') && (
            <label className="dm-count">
              Poner <input type="range" min="1" max={view.turn.toPlace} value={Math.min(count, view.turn.toPlace)} onChange={(e) => setCount(Number(e.target.value))} /> <strong>{Math.min(count, view.turn.toPlace)}</strong>
            </label>
          )}
          {myTurn && step === 'reinforce' && can('END_REINFORCE') && (
            <Button variant="primary" onClick={() => send('END_REINFORCE')}>
              Pasar a atacar
            </Button>
          )}
          {myTurn && pm && (
            <>
              <label className="dm-count">
                Mover a {TERRITORIES[pm.to].name}{' '}
                <input type="range" min={pm.min} max={pm.max} value={count} onChange={(e) => setCount(Number(e.target.value))} /> <strong>{count}</strong>
              </label>
              <Button variant="primary" onClick={() => send('MOVE_IN', { count })}>
                Mover
              </Button>
            </>
          )}
          {attackMode && sel && target && !isFortifyTarget && (
            <>
              <span className="dm-dicepick">
                Dados:
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" disabled={n > maxDice} className={Math.min(dice, maxDice) === n ? 'is-on' : ''} onClick={() => setDice(n)}>
                    {n}
                  </button>
                ))}
              </span>
              <Button variant="primary" onClick={() => send('ATTACK', { from: sel, to: target, dice: Math.min(dice, maxDice) })}>
                Atacar {TERRITORIES[target].name}
              </Button>
              <Button onClick={() => send('ATTACK', { from: sel, to: target, dice: 3, untilDone: true })} title="Tira con el máximo de dados hasta conquistar o quedarse con 1">
                Atacar hasta el final
              </Button>
            </>
          )}
          {(fortifyMode || (attackMode && isFortifyTarget)) && sel && target && (
            <>
              <label className="dm-count">
                Reagrupar <input type="range" min="1" max={b[sel].armies - 1} value={Math.min(count, b[sel].armies - 1)} onChange={(e) => setCount(Number(e.target.value))} /> <strong>{Math.min(count, b[sel].armies - 1)}</strong>
              </label>
              <Button variant="primary" onClick={() => send('FORTIFY', { from: sel, to: target, count: Math.min(count, b[sel].armies - 1) })}>
                Reagrupar y terminar turno
              </Button>
            </>
          )}
          {myTurn && can('END_ATTACK') && (
            <Button variant="ghost" onClick={() => send('END_ATTACK')}>
              Terminar ataques
            </Button>
          )}
          {myTurn && can('END_TURN') && (
            <Button variant="ghost" onClick={() => send('END_TURN')}>
              Terminar turno
            </Button>
          )}
        </div>
        {view.phase === 'finished' && (
          <Finished view={view} onNextRound={onNextRound} nextRoundLabel={nextRoundLabel}>
            <p>Dominación mundial.</p>
          </Finished>
        )}
      </div>

      <aside className="dm-side">
        <section className="kit-panel">
          <h4>Jugadores</h4>
          <ul className="dm-players">
            {view.players.map((p) => (
              <li key={p.id} className={`${p.id === view.currentPlayerId ? 'is-turn' : ''} ${p.eliminated || p.left ? 'is-out' : ''}`} style={{ '--pc': paletteHex(p.colorId) }}>
                <Avatar player={p} size="sm" />
                <span className="dm-players__name">
                  {p.name}
                  {p.id === view.me ? ' (vos)' : ''}
                </span>
                <span title="Territorios">🏳 {p.territories}</span>
                <span title="Ejércitos">⚔ {p.armies}</span>
                <span title="Cartas">🂠 {p.cardCount}</span>
              </li>
            ))}
            {view.hasNeutral && (
              <li style={{ '--pc': NEUTRAL_COLOR }}>
                <span className="kit-avatar kit-avatar--sm" style={{ background: NEUTRAL_COLOR }}>
                  N
                </span>
                <span className="dm-players__name">Neutral</span>
              </li>
            )}
          </ul>
        </section>
        {view.phase !== 'setup' && (
          <section className="kit-panel dm-cards">
            <h4>
              Tus cartas · próximo canje {view.nextTradeValue}
            </h4>
            <div className="dm-cards__list">
              {view.myCards.length === 0 && <small>Conquistá al menos un territorio en tu turno para ganar una carta.</small>}
              {view.myCards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`dm-card ${cards.includes(c.id) ? 'is-on' : ''}`}
                  onClick={() => setCards(cards.includes(c.id) ? cards.filter((x) => x !== c.id) : [...cards, c.id].slice(-3))}
                  title={SYMBOL_NAME[c.symbol]}
                >
                  <span className="dm-card__sym">{SYMBOL[c.symbol]}</span>
                  <span>{c.territory ? TERRITORIES[c.territory].name : 'Comodín'}</span>
                </button>
              ))}
            </div>
            {can('TRADE') && (
              <Button size="sm" variant="primary" disabled={cards.length !== 3} onClick={() => send('TRADE', { cardIds: cards })}>
                Canjear 3 cartas
              </Button>
            )}
          </section>
        )}
        <section className="kit-panel dm-legend">
          <h4>Continentes</h4>
          {Object.entries(CONTINENTS).map(([id, c]) => (
            <span key={id}>
              <i style={{ background: c.color }} /> {c.name} <strong>+{c.bonus}</strong>
            </span>
          ))}
        </section>
        <GameLog lines={view.log} />
      </aside>
    </div>
  );
}
