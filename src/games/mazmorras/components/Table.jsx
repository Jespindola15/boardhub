import { useEffect, useState } from 'react';
import Button from '../../../shared/Button.jsx';
import { Avatar, GameLog, Finished } from '../../../shared/kit/parts.jsx';
import { paletteHex } from '../../../shared/playerPalette.js';
import { CARDS, SLOT_NAMES, RACE_NAMES, CLASS_NAMES, POWERS } from '../data/cards.js';
import '../mazmorras.css';

const KIND = { monster: 'Monstruo', curse: 'Maldición', race: 'Raza', class: 'Clase', enhancer: 'Potenciador', wandering: 'Errante', item: 'Objeto', oneshot: 'Un uso', levelup: 'Sube un nivel' };
const POWER_NAMES = { berserk: 'Furia (guerrero)', turning: 'Exorcismo (clérigo)', flight: 'Hechizo de vuelo (mago)', charm: 'Encantar (mago)', backstab: 'Puñalada (ladrón)' };

export function DungeonCard({ id, selected, onClick, small }) {
  const c = CARDS[id];
  if (!c) return null;
  return (
    <button type="button" className={`mz-card mz-card--${c.deck} mz-card--${c.kind} ${selected ? 'is-sel' : ''} ${small ? 'is-small' : ''}`} onClick={onClick} title={describe(c)}>
      <span className="mz-card__kind">{KIND[c.kind]}</span>
      <strong className="mz-card__name">{c.name}</strong>
      {c.kind === 'monster' && (
        <span className="mz-card__stat">
          Nivel {c.level} · {c.treasures} 💰{c.undead ? ' · 💀' : ''}
        </span>
      )}
      {c.kind === 'item' && (
        <span className="mz-card__stat">
          +{c.bonus} · {SLOT_NAMES[c.slot]}
          {c.big ? ' · grande' : ''}
        </span>
      )}
      {c.kind === 'oneshot' && <span className="mz-card__stat">{c.escape ? 'Escape' : `+${c.bonus} a un bando`}</span>}
      {c.kind === 'enhancer' && <span className="mz-card__stat">{c.bonus > 0 ? `+${c.bonus}` : c.bonus} al monstruo</span>}
      {!small && (c.kind === 'race' || c.kind === 'class' || c.kind === 'curse') && <span className="mz-card__text">{describe(c)}</span>}
      {!small && c.gold ? <span className="mz-card__gold">{c.gold} oro</span> : null}
    </button>
  );
}

function describe(c) {
  if (c.kind === 'monster') return `Desgracia: ${c.bad.text}${Object.keys(c.bonusVs).length ? ` · ${Object.entries(c.bonusVs).map(([k, v]) => `+${v} contra ${RACE_NAMES[k] ?? CLASS_NAMES[k]}`).join(', ')}` : ''}`;
  if (c.kind === 'curse') return c.text;
  if (c.kind === 'race') return POWERS[c.race];
  if (c.kind === 'class') return POWERS[c.cls];
  if (c.kind === 'item') return `${c.only ? `Sólo ${RACE_NAMES[c.only] ?? CLASS_NAMES[c.only]}. ` : ''}${c.run ? '+1 para huir. ' : ''}Vale ${c.gold} de oro.`;
  if (c.kind === 'wandering') return 'Jugala junto con un monstruo de tu mano para sumarlo a un combate.';
  if (c.kind === 'levelup') return 'Subís un nivel (no el 10).';
  return '';
}

export default function MazmorrasTable({ view, send, onNextRound, nextRoundLabel = 'Volver' }) {
  const [sel, setSel] = useState([]);
  const [target, setTarget] = useState(null);
  const [offer, setOffer] = useState(1);
  const legal = view.legal ?? [];
  const has = (t) => legal.find((a) => a.type === t);
  const me = view.players.find((p) => p.id === view.me);
  const cb = view.combat;
  const myTurn = view.currentPlayerId === view.me;
  const others = view.players.filter((p) => p.id !== view.me && !p.left);

  useEffect(() => setSel([]), [view.version]);
  useEffect(() => {
    if (!target || !others.some((p) => p.id === target)) setTarget(others[0]?.id ?? null);
  }, [others.map((p) => p.id).join()]);

  const one = sel.length === 1 ? CARDS[sel[0]] : null;
  const toggle = (id) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  const powers = has('POWER')?.powers ?? [];
  const fighter = cb && view.players.find((p) => p.id === cb.fighterId);
  const helper = cb?.helperId && view.players.find((p) => p.id === cb.helperId);
  const selGold = sel.reduce((t, id) => t + (CARDS[id].gold ?? 0), 0);

  let hint = '';
  if (cb?.helpOffer?.to === view.me) hint = `${fighter.name} te pide ayuda y te ofrece ${cb.helpOffer.treasures} tesoro(s).`;
  else if (cb?.window?.pending.includes(view.me)) hint = `${fighter.name} dice que gana. ¿Te metés? Jugá una carta o pasá.`;
  else if (cb?.window) hint = 'Esperando a ver si alguien se mete…';
  else if (cb) hint = cb.fighterId === view.me ? (cb.totals.winning ? '¡Le ganás! Podés pelear.' : 'No te alcanza: pedí ayuda, usá cartas o huí.') : `${fighter.name} está en combate. Podés ayudar al monstruo… o no.`;
  else if (myTurn) hint = { start: 'Equipate si querés y pateá la puerta.', 'after-door': 'Sin monstruo: buscá problemas (con un monstruo de tu mano) o saqueá la habitación.', end: 'Podés jugar cartas, vender o terminar el turno.', charity: `Tenés demasiadas cartas: elegí ${view.turn.charity} para donar.` }[view.turn.step];
  else hint = `Juega ${view.players.find((p) => p.id === view.currentPlayerId)?.name}…`;

  return (
    <div className="mz-layout">
      <aside className="mz-left">
        <section className="kit-panel">
          <h4>Aventureros · nivel 10 gana</h4>
          {view.players.map((p) => (
            <div key={p.id} className={`mz-player ${p.id === view.currentPlayerId ? 'is-turn' : ''} ${p.left ? 'is-out' : ''}`} style={{ '--pc': paletteHex(p.colorId) }}>
              <Avatar player={p} size="sm" />
              <div className="mz-player__body">
                <strong>
                  {p.name}
                  {p.id === view.me ? ' (vos)' : ''}
                  {p.dead ? ' 💀' : ''}
                </strong>
                <small>
                  {p.race ? RACE_NAMES[CARDS[p.race].race] : 'Humano'}
                  {p.cls ? ` · ${CLASS_NAMES[CARDS[p.cls].cls]}` : ''} · fuerza {p.strength} · 🂠 {p.handCount}
                </small>
                {p.equipped.length > 0 && (
                  <small className="mz-player__items">
                    {p.equipped.map((id) => `${CARDS[id].name} +${CARDS[id].bonus}`).join(' · ')}
                  </small>
                )}
              </div>
              <span className="mz-level">{p.level}</span>
            </div>
          ))}
        </section>
        <GameLog lines={view.log} />
      </aside>

      <div className="mz-main">
        <div className="mz-table">
          <div className="mz-decks">
            <div className="mz-deck mz-deck--door">
              <span>🚪</span>
              <b>{view.doorCount}</b>
              <small>Puertas</small>
            </div>
            <div className="mz-deck mz-deck--treasure">
              <span>💰</span>
              <b>{view.treasureCount}</b>
              <small>Tesoros</small>
            </div>
          </div>
          {cb ? (
            <div className="mz-combat">
              <div className="mz-side mz-side--heroes">
                <h3>Aventureros</h3>
                <p>
                  {fighter.name} ({fighter.strength}){helper ? ` + ${helper.name} (${helper.strength})` : ''}
                  {cb.playerBonus ? ` ${cb.playerBonus > 0 ? '+' : ''}${cb.playerBonus}` : ''}
                </p>
                <span className="mz-total">{cb.totals.players}</span>
              </div>
              <span className={`mz-vs ${cb.totals.winning ? 'is-win' : 'is-lose'}`}>{cb.totals.winning ? '>' : '≤'}</span>
              <div className="mz-side mz-side--monsters">
                <h3>Monstruos</h3>
                <div className="mz-monsters">
                  {cb.monsters.map((m, i) => (
                    <div key={m.cardId} className="mz-monster">
                      <DungeonCard id={m.cardId} />
                      <small>
                        Nivel efectivo {m.level}
                        {m.enhancers.map((e) => ` · ${CARDS[e].name}`).join('')}
                      </small>
                      <small className="mz-bad">Si perdés: {CARDS[m.cardId].bad.text}</small>
                      {one?.kind === 'enhancer' && (
                        <Button size="sm" onClick={() => send('PLAY_ENHANCER', { cardId: one.id, monster: i })}>
                          Potenciar este
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <span className="mz-total">
                  {cb.totals.monsters}
                  {cb.monsterBonus ? <small> (+{cb.monsterBonus})</small> : null}
                </span>
              </div>
            </div>
          ) : (
            <div className="mz-room">
              {view.lastDoor ? (
                <>
                  <small>Puerta abierta</small>
                  <DungeonCard id={view.lastDoor} />
                </>
              ) : (
                <p className="mz-room__empty">Una puerta cerrada te espera…</p>
              )}
            </div>
          )}
          <div className={`kit-turn ${myTurn || cb?.window?.pending.includes(view.me) || cb?.helpOffer?.to === view.me ? 'is-mine' : ''}`}>{hint}</div>
          <div className="mz-actions">
            {has('KICK_DOOR') && (
              <Button variant="primary" onClick={() => send('KICK_DOOR')}>
                🚪 Patear la puerta
              </Button>
            )}
            {has('LOOK_FOR_TROUBLE') && (
              <Button disabled={one?.kind !== 'monster'} onClick={() => send('LOOK_FOR_TROUBLE', { cardId: one.id })}>
                Buscar problemas {one?.kind === 'monster' ? `con ${one.name}` : '(elegí un monstruo)'}
              </Button>
            )}
            {has('LOOT') && <Button onClick={() => send('LOOT')}>Saquear la habitación</Button>}
            {has('FIGHT') && (
              <Button variant="primary" onClick={() => send('FIGHT')}>
                ⚔️ ¡Pelear!
              </Button>
            )}
            {has('RUN') && (
              <Button variant="danger" onClick={() => send('RUN')}>
                Huir
              </Button>
            )}
            {has('ASK_HELP') && (
              <span className="mz-help">
                Pedir ayuda a
                <select value={target ?? ''} onChange={(e) => setTarget(e.target.value)}>
                  {others.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                por
                <input type="number" min="0" max="5" value={offer} onChange={(e) => setOffer(Number(e.target.value))} />
                tesoros
                <Button size="sm" onClick={() => send('ASK_HELP', { to: target, treasures: offer })}>
                  Pedir
                </Button>
              </span>
            )}
            {has('ANSWER_HELP') && (
              <>
                <Button variant="primary" onClick={() => send('ANSWER_HELP', { accept: true })}>
                  Ayudar
                </Button>
                <Button onClick={() => send('ANSWER_HELP', { accept: false })}>No ayudar</Button>
              </>
            )}
            {has('PASS') && (
              <Button variant="ghost" onClick={() => send('PASS')}>
                Paso, que gane
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
              <p>{view.players.map((p) => `${p.name}: nivel ${p.level}`).join(' · ')}</p>
            </Finished>
          )}
        </div>

        {me && (
          <div className="mz-me">
            <div className="mz-gear">
              <h4>Tu equipo</h4>
              <div className="mz-gear__list">
                {me.race && <DungeonCard id={me.race} small />}
                {me.cls && <DungeonCard id={me.cls} small />}
                {me.equipped.map((id) => (
                  <div key={id} className="mz-gear__item">
                    <DungeonCard id={id} small selected={sel.includes(id)} onClick={() => toggle(id)} />
                    {has('UNEQUIP') && (
                      <button type="button" onClick={() => send('UNEQUIP', { cardId: id })}>
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
                {me.carried.map((id) => (
                  <div key={id} className="mz-gear__item is-carried">
                    <DungeonCard id={id} small selected={sel.includes(id)} onClick={() => toggle(id)} />
                    {has('EQUIP') && (
                      <button type="button" onClick={() => send('EQUIP', { cardId: id })}>
                        Equipar
                      </button>
                    )}
                  </div>
                ))}
                {!me.race && !me.cls && !me.equipped.length && !me.carried.length && <small>Sin equipo todavía.</small>}
              </div>
            </div>
            <div className="mz-hand">
              <h4>
                Tu mano ({view.myHand.length}/{me.handLimit})
              </h4>
              <div className="mz-hand__list">
                {view.myHand.map((id) => (
                  <DungeonCard key={id} id={id} selected={sel.includes(id)} onClick={() => toggle(id)} />
                ))}
              </div>
              <div className="mz-hand__actions">
                {one && ['item', 'race', 'class', 'levelup'].includes(one.kind) && has('PLAY_CARD') && view.myHand.includes(one.id) && (
                  <Button size="sm" variant="primary" onClick={() => send('PLAY_CARD', { cardId: one.id })}>
                    {one.kind === 'item' ? 'Poner en juego' : 'Jugar'}
                  </Button>
                )}
                {one?.kind === 'oneshot' && has('PLAY_ONESHOT') && (
                  <>
                    {one.escape ? (
                      <Button size="sm" onClick={() => send('PLAY_ONESHOT', { cardId: one.id })}>
                        Usar: escapar
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => send('PLAY_ONESHOT', { cardId: one.id, side: 'players' })}>
                          +{one.bonus} a los aventureros
                        </Button>
                        <Button size="sm" onClick={() => send('PLAY_ONESHOT', { cardId: one.id, side: 'monsters' })}>
                          +{one.bonus} a los monstruos
                        </Button>
                      </>
                    )}
                  </>
                )}
                {sel.length === 2 && has('PLAY_WANDERING') && sel.some((id) => CARDS[id].kind === 'wandering') && sel.some((id) => CARDS[id].kind === 'monster') && (
                  <Button size="sm" onClick={() => send('PLAY_WANDERING', { cardId: sel.find((id) => CARDS[id].kind === 'wandering'), monsterCardId: sel.find((id) => CARDS[id].kind === 'monster') })}>
                    Sumar monstruo errante
                  </Button>
                )}
                {one?.kind === 'curse' && has('PLAY_CURSE') && (
                  <>
                    <select value={target ?? ''} onChange={(e) => setTarget(e.target.value)}>
                      {view.players
                        .filter((p) => !p.left)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.id === view.me ? 'A mí' : p.name}
                          </option>
                        ))}
                    </select>
                    <Button size="sm" variant="danger" onClick={() => send('PLAY_CURSE', { cardId: one.id, target })}>
                      Maldecir
                    </Button>
                  </>
                )}
                {has('SELL') && sel.length > 0 && sel.every((id) => CARDS[id].gold) && (
                  <Button size="sm" disabled={selGold < 1000} onClick={() => send('SELL', { cardIds: sel })}>
                    Vender ({selGold} oro)
                  </Button>
                )}
                {has('CHARITY') && (
                  <Button size="sm" variant="primary" disabled={sel.length !== has('CHARITY').count} onClick={() => send('CHARITY', { cardIds: sel })}>
                    Donar {sel.length}/{has('CHARITY').count}
                  </Button>
                )}
                {powers.map((pw) =>
                  pw === 'charm' ? (
                    <Button key={pw} size="sm" onClick={() => send('POWER', { power: 'charm' })}>
                      {POWER_NAMES[pw]}: descartar la mano
                    </Button>
                  ) : pw === 'backstab' ? (
                    [cb.fighterId, cb.helperId].filter(Boolean).map((t) => (
                      <Button key={t} size="sm" disabled={sel.length !== 1} onClick={() => send('POWER', { power: 'backstab', cardIds: sel, target: t })}>
                        Puñalada a {view.players.find((p) => p.id === t).name}
                      </Button>
                    ))
                  ) : (
                    <Button key={pw} size="sm" disabled={!sel.length || sel.length > 3} onClick={() => send('POWER', { power: pw, cardIds: sel })}>
                      {POWER_NAMES[pw]} con {sel.length} carta(s)
                    </Button>
                  ),
                )}
              </div>
              {one && <p className="mz-hand__desc">{describe(one)}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
