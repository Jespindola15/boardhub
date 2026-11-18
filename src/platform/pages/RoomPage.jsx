import { lazy, Suspense, useMemo, useState } from 'react';
import useRoom from '../../net/useRoom.js';
import { lastName } from '../../net/session.js';
import { GAMES, getGameBySlug } from '../catalog/gamesCatalog.js';
import GameBar from '../components/GameBar.jsx';
import Button from '../../shared/Button.jsx';
import { paletteHex } from '../../shared/playerPalette.js';
import { navigate } from '../../app/router.js';
import { CafeVisibility } from './RoomsPage.jsx';
import '../components/platform.css';

const cache = new Map();
function onlineModule(game) {
  if (!cache.has(game.slug)) {
    const p = game.loadOnline();
    cache.set(game.slug, {
      Table: lazy(() => p.then((m) => ({ default: m.OnlineTable }))),
      Options: lazy(() => p.then((m) => ({ default: m.OptionsEditor }))),
      Rules: lazy(() => p.then((m) => ({ default: m.RulesModal }))),
    });
  }
  return cache.get(game.slug);
}

const LIGHT_CHIPS = new Set(['snow', 'gold', 'mint', 'lime', 'amber', 'teal']);
const chipStyle = (colorId) => ({ '--chip': paletteHex(colorId) });
const chipClass = (colorId, size = '') => `cafe-chip ${size ? `cafe-chip--${size}` : ''} ${LIGHT_CHIPS.has(colorId) ? 'is-light' : ''}`;

/** Mesa online: sentarse con un nombre, sala de espera (con votación del próximo juego) y partida. */
export default function RoomPage({ code }) {
  const r = useRoom(code);
  const game = r.room ? getGameBySlug(r.room.gameId) : null;
  const mod = useMemo(() => (game?.loadOnline ? onlineModule(game) : null), [game]);
  const [rules, setRules] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const backToTable = () => r.call('room:return');

  const leave = async () => {
    await r.leave();
    navigate('/');
  };

  const inLobby = !r.room || r.room.status === 'lobby' || r.status !== 'joined';

  const bar = (
    <GameBar
      title={game?.name ?? 'Mesa'}
      badge={`Mesa ${code}${r.connected ? '' : ', reconectando…'}`}
      actions={
        <>
          {mod && (
            <Button size="sm" variant="ghost" onClick={() => setRules(true)}>
              Reglamento
            </Button>
          )}
          {r.status === 'joined' &&
            (confirmLeave ? (
              <Button size="sm" variant="danger" onClick={leave}>
                Sí, levantarme de la mesa
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmLeave(true)}>
                Levantarme de la mesa
              </Button>
            ))}
        </>
      }
    />
  );

  let body;
  if (r.status === 'connecting') body = <Centered>Conectando con el servidor…</Centered>;
  else if (r.status === 'removed') body = <Centered>El anfitrión te sacó de la mesa.</Centered>;
  else if (r.status === 'error')
    body = (
      <Centered>
        <p>{r.error ?? 'No se pudo entrar a la mesa.'}</p>
        <Button onClick={() => navigate('/salas')}>Ver mesas abiertas</Button>
      </Centered>
    );
  else if (r.status === 'need-join') body = <JoinForm code={code} onJoin={r.join} error={r.error} />;
  else if (!r.room) body = <Centered>Cargando la mesa…</Centered>;
  else if (r.room.status === 'lobby') body = <Lobby room={r.room} me={r.me} call={r.call} mod={mod} game={game} />;
  else if (r.view && mod)
    body = (
      <Suspense fallback={<Centered>Repartiendo…</Centered>}>
        <div className="room-game">
          <mod.Table view={r.view} send={r.send} onNextRound={backToTable} nextRoundLabel="Volver a la mesa" />
          <DisconnectedBar room={r.room} me={r.me} call={r.call} />
          {r.room.status === 'finished' && (
            <div className="cafe-done wood" role="status">
              <strong>Terminó la partida.</strong>
              <span>Vuelvan a la mesa para elegir otro juego.</span>
              <Button variant="primary" onClick={backToTable}>
                Volver a la mesa
              </Button>
            </div>
          )}
        </div>
      </Suspense>
    );
  else body = <Centered>Esperando el estado de la partida…</Centered>;

  return (
    <div className={`room-page ${inLobby ? 'cafe' : ''}`}>
      {bar}
      {body}
      {rules && mod && (
        <Suspense fallback={null}>
          <mod.Rules onClose={() => setRules(false)} />
        </Suspense>
      )}
      {r.error && r.status === 'joined' && (
        <div className="bh-toast" role="alert" key={r.error}>
          {r.error}
        </div>
      )}
    </div>
  );
}

const Centered = ({ children }) => <div className="cafe-state">{children}</div>;

function JoinForm({ code, onJoin, error }) {
  const [name, setName] = useState(lastName());
  return (
    <div className="cafe-state">
      <div className="cafe-sheet paper">
        <h2>Sentarse en la mesa {code}</h2>
        <label className="cafe-field">
          Tu nombre
          <input autoFocus maxLength={16} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && onJoin(name)} />
        </label>
        <div>
          <Button variant="primary" size="lg" disabled={!name.trim()} onClick={() => onJoin(name)}>
            Sentarse
          </Button>
        </div>
        {error && <p className="cafe-error">{error}</p>}
      </div>
    </div>
  );
}

/** Lugares alrededor de la mesa (elipse), empezando abajo al centro. */
function seatPos(i, n) {
  const a = Math.PI / 2 + (i * 2 * Math.PI) / n;
  return { left: `${50 + Math.cos(a) * 47}%`, top: `${50 + Math.sin(a) * 47}%` };
}

function Lobby({ room, me, call, mod, game }) {
  const isHost = room.hostId === me;
  const host = room.seats.find((s) => s.playerId === room.hostId);
  const link = `${location.origin}${location.pathname}#/sala/${room.code}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* se puede copiar el código a mano */
    }
  };
  const n = room.seats.length;
  const ready = n >= room.limits.min && n <= room.limits.max && !room.countError;
  const places = Math.min(8, Math.max(room.limits.max, n));
  const startLabel = ready ? 'Empezar partida' : room.countError ?? (n < room.limits.min ? `Faltan ${room.limits.min - n} para empezar` : `Este juego admite hasta ${room.limits.max}`);

  return (
    <div className="cafe-lobby">
      <div className="cafe-table-wrap">
        <div className="cafe-table" role="group" aria-label={`Mesa ${room.code}, ${n} sentados`}>
          <div className="cafe-table__felt">
            <span className="cafe-table__game">
              {game?.name ?? room.gameId}
              {room.match > 1 ? `, partida ${room.match}` : ''}
            </span>
            <span className="cafe-table__code" aria-label={`Código ${room.code.split('').join(' ')}`}>
              {room.code}
            </span>
            <Button size="sm" onClick={copy}>
              {copied ? 'Enlace copiado' : 'Copiar enlace para invitar'}
            </Button>
          </div>
          {Array.from({ length: places }, (_, i) => {
            const s = room.seats[i];
            if (!s)
              return (
                <div key={`e${i}`} className="cafe-seat is-empty" style={seatPos(i, places)}>
                  <span className="cafe-seat__empty" />
                  <span className="cafe-seat__name">Libre</span>
                </div>
              );
            return (
              <div key={s.playerId} className={`cafe-seat ${s.connected ? '' : 'is-away'}`} style={seatPos(i, places)} title={s.connected ? 'Conectado' : 'Desconectado'}>
                <span className={chipClass(s.colorId)} style={chipStyle(s.colorId)}>
                  {s.name[0].toUpperCase()}
                </span>
                <span className="cafe-seat__name">
                  {s.name}
                  {s.playerId === me ? ' (tú)' : ''}
                </span>
                {s.playerId === room.hostId && <span className="cafe-seat__tag">Anfitrión</span>}
                {!s.connected && s.playerId !== room.hostId && <span className="cafe-seat__tag">Desconectado</span>}
                {isHost && s.playerId !== me && (
                  <button type="button" className="cafe-seat__kick" onClick={() => call('room:remove', { playerId: s.playerId })}>
                    Sacar
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="cafe-table-actions">
          {isHost ? (
            <Button variant="primary" size="lg" disabled={!ready} onClick={() => call('room:start')}>
              {startLabel}
            </Button>
          ) : (
            <p className="cafe-table-note">{ready ? `Esperando a que ${host?.name ?? 'el anfitrión'} empiece la partida.` : `${startLabel.replace(/\.$/, '')}.`}</p>
          )}
        </div>
      </div>

      <div className="cafe-side">
        <NextGame room={room} me={me} call={call} isHost={isHost} host={host} />

        {mod && (
          <section className="cafe-sheet paper" aria-labelledby="opciones">
            <h2 id="opciones">Opciones de {game?.name}</h2>
            <Suspense fallback={<p className="cafe-sheet__hint">Cargando opciones…</p>}>
              <mod.Options options={room.options} disabled={!isHost} onChange={(options) => call('room:options', { options })} />
            </Suspense>
            {!isHost && <p className="cafe-sheet__hint">Las elige {host?.name ?? 'el anfitrión'}.</p>}
          </section>
        )}

        <section className="cafe-sheet paper" aria-labelledby="acceso">
          <h2 id="acceso">Quién puede entrar</h2>
          <CafeVisibility value={room.visibility ?? 'private'} disabled={!isHost} onChange={(visibility) => call('room:visibility', { visibility })} labelledBy="acceso" />
        </section>

        {room.results?.length > 0 && (
          <section className="cafe-sheet paper" aria-labelledby="anotador">
            <h2 id="anotador">Partidas en esta mesa</h2>
            <ol className="cafe-score">
              {room.results.map((x) => (
                <li key={x.match}>
                  {getGameBySlug(x.gameId)?.name ?? x.gameId}: <span>{x.names.length ? `ganó ${x.names.join(' y ')}` : 'sin ganador'}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

/** Votación del próximo juego: todos votan, el anfitrión confirma. */
function NextGame({ room, me, call, isHost, host }) {
  const games = GAMES.filter((g) => g.online && room.games?.[g.slug]);
  const votes = room.votes ?? {};
  const myVote = votes[me];
  const byGame = (slug) => room.seats.filter((s) => votes[s.playerId] === slug);
  const n = room.seats.length;
  const sorted = [...games].sort((a, b) => byGame(b.slug).length - byGame(a.slug).length);
  const voted = Object.keys(votes).length;

  return (
    <section className="cafe-sheet paper" aria-labelledby="proximo">
      <h2 id="proximo">{room.match > 1 ? 'Próximo juego' : 'Qué jugamos'}</h2>
      <p className="cafe-sheet__hint">
        Todos votan y {isHost ? 'tú eliges' : `elige ${host?.name ?? 'el anfitrión'}`}. Votaron {voted} de {n}.
      </p>
      <ul className="cafe-vote">
        {sorted.map((g) => {
          const who = byGame(g.slug);
          const lim = room.games[g.slug];
          const fits = n >= lim.min && n <= lim.max;
          const current = g.slug === room.gameId;
          return (
            <li key={g.slug} className={`${current ? 'is-current' : ''} ${fits ? '' : 'is-blocked'}`} style={{ '--accent': g.accent }}>
              <span className="cafe-vote__name">
                {g.name}
                {current ? ', elegido' : ''}
              </span>
              <span className="cafe-vote__info">
                {lim.min === lim.max ? `${lim.min}` : `${lim.min} a ${lim.max}`} jugadores{fits ? '' : n < lim.min ? `, faltan ${lim.min - n}` : `, sobran ${n - lim.max}`}
              </span>
              {who.length > 0 && (
                <span className="cafe-vote__chips" aria-label={`Votos: ${who.map((s) => s.name).join(', ')}`}>
                  {who.map((s) => (
                    <span key={s.playerId} className={chipClass(s.colorId, 'xs')} style={chipStyle(s.colorId)} title={s.name}>
                      {s.name[0].toUpperCase()}
                    </span>
                  ))}
                </span>
              )}
              <span className="cafe-vote__btns">
                <span className="cafe-vote__count" aria-hidden="true">
                  {who.length || ''}
                </span>
                {myVote === g.slug ? (
                  <Button size="sm" variant="ghost" onClick={() => call('room:vote', { gameId: null })}>
                    Quitar voto
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => call('room:vote', { gameId: g.slug })}>
                    Votar
                  </Button>
                )}
                {isHost && !current && (
                  <Button size="sm" variant="primary" onClick={() => call('room:game', { gameId: g.slug })}>
                    Elegir
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Aviso de jugadores desconectados durante la partida; el anfitrión puede sacarlos. */
function DisconnectedBar({ room, me, call }) {
  const away = room.seats.filter((s) => !s.connected && !s.left && s.playerId !== me);
  if (!away.length || room.status !== 'playing') return null;
  return (
    <div className="room-away">
      {away.map((s) => (
        <span key={s.playerId}>
          {s.name} se desconectó.
          {room.hostId === me && (
            <Button size="sm" variant="ghost" onClick={() => call('room:remove', { playerId: s.playerId })}>
              Sacarlo de la partida
            </Button>
          )}
        </span>
      ))}
    </div>
  );
}
