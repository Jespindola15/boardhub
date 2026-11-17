import { useEffect, useMemo, useState } from 'react';
import Button from '../../../shared/Button.jsx';
import Modal from '../../../shared/Modal.jsx';
import { Avatar, GameLog, Finished } from '../../../shared/kit/parts.jsx';
import { SUSPECTS, WEAPONS, ROOMS, ROOM_BY_ID, CARD_BY_ID, GRID, CENTER, cellKind, cellKey } from '../data/board.js';
import '../misterio.css';

const CELL = 30;
const ROOM_COLORS = { estudio: '#4a3b5c', vestibulo: '#5c4a3b', salon: '#3b4f5c', biblioteca: '#3b5c4a', billar: '#2f5a3a', comedor: '#5c3b45', invernadero: '#3f5c3b', baile: '#5c533b', cocina: '#5c3b3b' };
const SUS = Object.fromEntries(SUSPECTS.map((s) => [s.id, s]));
const WEA = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
const cardLabel = (id) => {
  const c = CARD_BY_ID[id];
  return c.kind === 'weapon' ? `${WEA[c.ref].icon} ${c.name}` : c.kind === 'room' ? `🚪 ${c.name}` : `👤 ${c.name}`;
};

/** Libreta de detective: se guarda sólo en este navegador. */
function useNotes(key) {
  const [notes, setNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(notes));
    } catch {
      /* sin almacenamiento */
    }
  }, [key, notes]);
  return [notes, setNotes];
}

export default function MisterioTable({ view, send, onNextRound, nextRoundLabel = 'Volver' }) {
  const [dialog, setDialog] = useState(null); // 'suggest' | 'accuse'
  const [notes, setNotes] = useNotes(`boardhub.misterio.notes.${view.players.map((p) => p.id).join('-')}.${view.me}`);
  const legal = view.legal ?? [];
  const has = (t) => legal.find((a) => a.type === t);
  const myTurn = view.currentPlayerId === view.me;
  const me = view.players.find((p) => p.id === view.me);
  const myRoom = view.mySuspect ? view.tokens[view.mySuspect].room : null;
  const destCells = useMemo(() => new Set(view.destinations?.cells ?? []), [view.destinations]);
  const destRooms = useMemo(() => new Set(view.destinations?.rooms ?? []), [view.destinations]);

  useEffect(() => setDialog(null), [view.version]);

  const known = new Set([...view.myCards, ...view.mySeen.map((x) => x.card)]);
  const cycle = (id) => setNotes({ ...notes, [id]: { undefined: 'x', x: 'q', q: 'v', v: undefined }[notes[id]] });

  // Fichas dentro de cada habitación.
  const inRoom = {};
  for (const [sid, t] of Object.entries(view.tokens)) if (t.room) (inRoom[t.room] ??= { s: [], w: [] }).s.push(sid);
  for (const [wid, r] of Object.entries(view.weapons)) (inRoom[r] ??= { s: [], w: [] }).w.push(wid);

  const ls = view.lastSuggestion;
  let hint = '';
  if (view.pendingShow) hint = 'Tenés que mostrar una carta.';
  else if (view.waitingShow) hint = `${view.players.find((p) => p.id === view.waitingShow.shower)?.name} está eligiendo qué carta mostrar…`;
  else if (!myTurn) hint = view.phase === 'playing' ? `Juega ${view.players.find((p) => p.id === view.currentPlayerId)?.name}…` : '';
  else if (me?.out) hint = '';
  else if (view.turn.step === 'start') hint = 'Tirá los dados, usá un pasaje secreto o (si te trajeron) quedate.';
  else if (view.turn.step === 'move') hint = `Sacaste ${view.turn.roll}: tocá un casillero o una habitación resaltada.`;
  else if (view.turn.step === 'suggest') hint = 'Estás en una habitación: hacé una sugerencia.';
  else hint = 'Podés acusar o terminar el turno.';

  const W = GRID * CELL;
  return (
    <div className="ms-layout">
      <div className="ms-main">
        <div className="ms-board">
          <svg viewBox={`-4 -4 ${W + 8} ${W + 8}`} className="ms-svg">
            <rect x="-4" y="-4" width={W + 8} height={W + 8} fill="#1b1410" />
            {Array.from({ length: GRID * GRID }, (_, i) => {
              const x = i % GRID;
              const y = Math.floor(i / GRID);
              if (cellKind(x, y) !== 'hall') return null;
              const k = cellKey(x, y);
              const can = destCells.has(k);
              return <rect key={k} className={`ms-cell ${can ? 'is-target' : ''}`} x={x * CELL + 1} y={y * CELL + 1} width={CELL - 2} height={CELL - 2} rx="3" onClick={() => can && send('MOVE', { to: k })} />;
            })}
            <g>
              <rect x={CENTER[0] * CELL} y={CENTER[1] * CELL} width={(CENTER[2] - CENTER[0] + 1) * CELL} height={(CENTER[3] - CENTER[1] + 1) * CELL} rx="10" fill="#2a1d14" stroke="#8a6a3a" strokeWidth="3" />
              <text x={(CENTER[0] + 2.5) * CELL} y={(CENTER[1] + 2.6) * CELL} className="ms-center">
                ✉️
              </text>
              <text x={(CENTER[0] + 2.5) * CELL} y={(CENTER[1] + 3.6) * CELL} className="ms-center__t">
                EL SOBRE
              </text>
            </g>
            {ROOMS.map((r) => {
              const [x0, y0, x1, y1] = r.rect;
              const can = destRooms.has(r.id);
              const content = inRoom[r.id] ?? { s: [], w: [] };
              return (
                <g key={r.id} className={`ms-room ${can ? 'is-target' : ''} ${myRoom === r.id ? 'is-mine' : ''}`} onClick={() => can && send('MOVE', { to: r.id })}>
                  <rect x={x0 * CELL + 2} y={y0 * CELL + 2} width={(x1 - x0 + 1) * CELL - 4} height={(y1 - y0 + 1) * CELL - 4} rx="8" fill={ROOM_COLORS[r.id]} />
                  <text x={((x0 + x1 + 1) / 2) * CELL} y={y0 * CELL + 22} className="ms-room__name">
                    {r.name}
                  </text>
                  {r.passage && (
                    <text x={x0 * CELL + (r.rect[0] === 0 ? 14 : (x1 - x0 + 1) * CELL - 14)} y={y1 * CELL + 18} className="ms-passage" title="Pasaje secreto">
                      ⇄
                    </text>
                  )}
                  {content.s.map((sid, i) => (
                    <circle key={sid} className="ms-token" cx={x0 * CELL + 22 + i * 24} cy={y0 * CELL + 46} r="9.5" fill={SUS[sid].color} stroke={sid === view.mySuspect ? '#ffd36b' : '#111'} strokeWidth={sid === view.mySuspect ? 3 : 1.5} />
                  ))}
                  {content.w.map((wid, i) => (
                    <text key={wid} x={x0 * CELL + 22 + i * 26} y={y0 * CELL + 82} className="ms-weapon">
                      {WEA[wid].icon}
                    </text>
                  ))}
                  {r.doors.map(([[ix, iy], [ox, oy]]) => (
                    <rect key={`${ix},${iy}`} x={(ix + ox) * CELL * 0.5 + (ix === ox ? 6 : CELL / 2 - 3)} y={(iy + oy) * CELL * 0.5 + (iy === oy ? 6 : CELL / 2 - 3)} width={ix === ox ? CELL - 12 : 6} height={iy === oy ? CELL - 12 : 6} fill="#e8c27a" />
                  ))}
                </g>
              );
            })}
            {Object.entries(view.tokens)
              .filter(([, t]) => t.cell)
              .map(([sid, t]) => {
                const [x, y] = t.cell.split(',').map(Number);
                return <circle key={sid} className="ms-token" cx={x * CELL + CELL / 2} cy={y * CELL + CELL / 2} r="11" fill={SUS[sid].color} stroke={sid === view.mySuspect ? '#ffd36b' : '#111'} strokeWidth={sid === view.mySuspect ? 3 : 1.5} />;
              })}
          </svg>
          {view.turn?.dice && (
            <div className="ms-dice" key={`${view.currentPlayerId}-${view.turn.roll}-${view.version}`}>
              <i>{view.turn.dice[0]}</i>
              <i>{view.turn.dice[1]}</i>
            </div>
          )}
        </div>
        <div className={`kit-turn ${myTurn || view.pendingShow ? 'is-mine' : ''}`}>{hint}</div>
        <div className="ms-actions">
          {has('ROLL') && (
            <Button variant="primary" onClick={() => send('ROLL')}>
              🎲 Tirar los dados
            </Button>
          )}
          {has('PASSAGE') && <Button onClick={() => send('PASSAGE')}>Pasaje secreto a {ROOM_BY_ID[has('PASSAGE').to].name}</Button>}
          {has('STAY') && <Button onClick={() => send('STAY')}>Quedarme en {ROOM_BY_ID[myRoom]?.name}</Button>}
          {has('SUGGEST') && (
            <Button variant="primary" onClick={() => setDialog('suggest')}>
              Sugerir en {ROOM_BY_ID[myRoom]?.name}
            </Button>
          )}
          {has('ACCUSE') && (
            <Button variant="danger" onClick={() => setDialog('accuse')}>
              Acusar
            </Button>
          )}
          {has('END_TURN') && (
            <Button variant="ghost" onClick={() => send('END_TURN')}>
              Terminar turno
            </Button>
          )}
        </div>
        {view.phase === 'finished' && (
          <Finished view={view} onNextRound={onNextRound} nextRoundLabel={nextRoundLabel}>
            {view.solution && (
              <p className="ms-solution">
                Fue {CARD_BY_ID[view.solution.suspect].name}, con {CARD_BY_ID[view.solution.weapon].name}, en {CARD_BY_ID[view.solution.room].name}.
              </p>
            )}
          </Finished>
        )}
      </div>

      <aside className="ms-side">
        <section className="kit-panel ms-players">
          <h4>Investigadores</h4>
          {view.players.map((p) => (
            <div key={p.id} className={`ms-player ${p.id === view.currentPlayerId ? 'is-turn' : ''} ${p.out ? 'is-out' : ''}`}>
              <span className="ms-dot" style={{ background: SUS[p.suspect].color }} />
              <span>
                <strong>{p.name}</strong>
                {p.id === view.me ? ' (vos)' : ''}
                <small>
                  {SUS[p.suspect].name} · {p.cardCount} cartas{p.out && !p.left ? ' · fuera' : ''}
                </small>
              </span>
            </div>
          ))}
        </section>
        {ls && (
          <section className="kit-panel ms-last">
            <h4>Última sugerencia</h4>
            <p>
              <strong>{view.players.find((p) => p.id === ls.by)?.name}</strong>: {SUS[ls.suspect].name}, {WEA[ls.weapon].name}, {ROOM_BY_ID[ls.room].name}.
            </p>
            <p>{ls.shownBy ? `${view.players.find((p) => p.id === ls.shownBy)?.name} mostró una carta.` : 'Nadie pudo refutar.'}</p>
          </section>
        )}
        <section className="kit-panel ms-cards">
          <h4>Tus cartas</h4>
          <div>
            {view.myCards.map((c) => (
              <span key={c} className={`ms-card ms-card--${CARD_BY_ID[c].kind}`}>
                {cardLabel(c)}
              </span>
            ))}
          </div>
          {view.mySeen.length > 0 && (
            <>
              <h4>Te mostraron</h4>
              <div>
                {view.mySeen.map((x, i) => (
                  <span key={i} className={`ms-card ms-card--${CARD_BY_ID[x.card].kind}`} title={`Te la mostró ${view.players.find((p) => p.id === x.from)?.name}`}>
                    {cardLabel(x.card)}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
        <section className="kit-panel ms-notes">
          <h4>Libreta (tocá para marcar: ✗ descartado · ? duda · ✓ sospecho)</h4>
          {[
            ['Personajes', SUSPECTS.map((x) => `s:${x.id}`)],
            ['Armas', WEAPONS.map((x) => `w:${x.id}`)],
            ['Habitaciones', ROOMS.map((x) => `r:${x.id}`)],
          ].map(([title, ids]) => (
            <div key={title} className="ms-notes__group">
              <h5>{title}</h5>
              {ids.map((id) => (
                <button key={id} type="button" className={`ms-note ${known.has(id) ? 'is-known' : ''} is-${notes[id] ?? 'none'}`} onClick={() => cycle(id)}>
                  <span>{CARD_BY_ID[id].name}</span>
                  <b>{known.has(id) ? '✗' : { x: '✗', q: '?', v: '✓' }[notes[id]] ?? ''}</b>
                </button>
              ))}
            </div>
          ))}
        </section>
        <GameLog lines={view.log} />
      </aside>

      {dialog && <CaseDialog kind={dialog} room={myRoom} onClose={() => setDialog(null)} send={send} />}
      {view.pendingShow && (
        <div className="kit-overlay">
          <div className="kit-overlay__box">
            <h2>Mostrale una carta a {view.players.find((p) => p.id === view.pendingShow.by)?.name}</h2>
            <p>Sólo esa persona la va a ver.</p>
            <div className="ms-show">
              {view.pendingShow.matches.map((c) => (
                <Button key={c} variant="primary" onClick={() => send('SHOW_CARD', { cardId: c })}>
                  {cardLabel(c)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaseDialog({ kind, room, onClose, send }) {
  const [suspect, setSuspect] = useState(SUSPECTS[0].id);
  const [weapon, setWeapon] = useState(WEAPONS[0].id);
  const [r, setR] = useState(room ?? ROOMS[0].id);
  const accuse = kind === 'accuse';
  return (
    <Modal title={accuse ? 'Acusación (si te equivocás, quedás fuera)' : `Sugerencia en ${ROOM_BY_ID[room].name}`} onClose={onClose} width={560}>
      <div className="ms-case">
        <label>
          Quién
          <select value={suspect} onChange={(e) => setSuspect(e.target.value)}>
            {SUSPECTS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Con qué
          <select value={weapon} onChange={(e) => setWeapon(e.target.value)}>
            {WEAPONS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.icon} {x.name}
              </option>
            ))}
          </select>
        </label>
        {accuse && (
          <label>
            Dónde
            <select value={r} onChange={(e) => setR(e.target.value)}>
              {ROOMS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <Button variant={accuse ? 'danger' : 'primary'} onClick={() => send(accuse ? 'ACCUSE' : 'SUGGEST', accuse ? { suspect, weapon, room: r } : { suspect, weapon })}>
        {accuse ? 'Acusar' : 'Sugerir'}
      </Button>
    </Modal>
  );
}
