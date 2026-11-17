import { lazy, Suspense, useMemo, useState } from 'react';
import useRoom from '../../net/useRoom.js';
import { lastName } from '../../net/session.js';
import { getGameBySlug } from '../catalog/gamesCatalog.js';
import GameBar from '../components/GameBar.jsx';
import Button from '../../shared/Button.jsx';
import Badge from '../../shared/Badge.jsx';
import { paletteHex } from '../../shared/playerPalette.js';
import { navigate } from '../../app/router.js';
import { VisibilityToggle } from './RoomsPage.jsx';
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

/** Sala online: unirse con nombre, sala de espera y partida. */
export default function RoomPage({ code }) {
  const r = useRoom(code);
  const game = r.room ? getGameBySlug(r.room.gameId) : null;
  const mod = useMemo(() => (game?.loadOnline ? onlineModule(game) : null), [game]);
  const [rules, setRules] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const leave = async () => {
    await r.leave();
    navigate('/');
  };

  const bar = (
    <GameBar
      title={game?.name ?? 'Sala'}
      accent={game?.accent}
      badge={`Sala ${code}${r.connected ? '' : ' · reconectando…'}`}
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
                Confirmar: salir de la sala
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmLeave(true)}>
                Salir de la sala
              </Button>
            ))}
        </>
      }
    />
  );

  let body;
  if (r.status === 'connecting') body = <Centered>Conectando con el servidor…</Centered>;
  else if (r.status === 'removed') body = <Centered>El anfitrión te quitó de la sala.</Centered>;
  else if (r.status === 'error') body = <Centered>{r.error ?? 'No se pudo entrar a la sala.'}</Centered>;
  else if (r.status === 'need-join') body = <JoinForm code={code} onJoin={r.join} error={r.error} />;
  else if (!r.room) body = <Centered>Cargando sala…</Centered>;
  else if (r.room.status === 'lobby') body = <Lobby room={r.room} me={r.me} call={r.call} mod={mod} />;
  else if (r.view && mod)
    body = (
      <Suspense fallback={<Centered>Cargando mesa…</Centered>}>
        <div className="room-game">
          <mod.Table view={r.view} send={r.send} onNextRound={() => navigate('/salas')} nextRoundLabel="Volver a las salas" />
          <DisconnectedBar room={r.room} me={r.me} call={r.call} />
        </div>
      </Suspense>
    );
  else body = <Centered>Esperando el estado de la partida…</Centered>;

  return (
    <div className="room-page">
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

const Centered = ({ children }) => <div className="state-page">{children}</div>;

function JoinForm({ code, onJoin, error }) {
  const [name, setName] = useState(lastName());
  return (
    <div className="state-page">
      <div className="room-card">
        <h2>Unirse a la sala {code}</h2>
        <input className="rooms__input" autoFocus placeholder="Tu nombre" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && onJoin(name)} />
        <Button variant="primary" size="lg" disabled={!name.trim()} onClick={() => onJoin(name)}>
          Entrar
        </Button>
        {error && <p className="rooms__error">{error}</p>}
      </div>
    </div>
  );
}

function Lobby({ room, me, call, mod }) {
  const isHost = room.hostId === me;
  const link = `${location.origin}${location.pathname}#/sala/${room.code}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el usuario puede copiar el código a mano */
    }
  };
  const enough = room.seats.length >= room.limits.min && !room.countError;

  return (
    <div className="state-page">
      <div className="room-card room-card--lobby">
        <span className="room-code">{room.code}</span>
        <p>Comparte este código o el enlace con tus amigos.</p>
        <Button size="sm" onClick={copy}>
          {copied ? '¡Enlace copiado!' : 'Copiar enlace de invitación'}
        </Button>
        <div className="room-vis">
          Visibilidad de la sala
          <VisibilityToggle value={room.visibility ?? 'private'} disabled={!isHost} onChange={(visibility) => call('room:visibility', { visibility })} />
        </div>
        <h3>
          Jugadores {room.seats.length}/{room.limits.max}
        </h3>
        <ul className="room-seats">
          {room.seats.map((s) => (
            <li key={s.playerId}>
              <span className="bh-avatar" style={{ background: paletteHex(s.colorId) }}>
                {s.name[0].toUpperCase()}
              </span>
              <span className="room-seats__name">
                {s.name}
                {s.playerId === me && <small> (tú)</small>}
              </span>
              {s.playerId === room.hostId && <Badge tone="brand">Anfitrión</Badge>}
              <span className={`room-dot ${s.connected ? 'is-on' : ''}`} title={s.connected ? 'Conectado' : 'Desconectado'} />
              {isHost && s.playerId !== me && (
                <button type="button" className="room-kick" onClick={() => call('room:remove', { playerId: s.playerId })} title="Quitar de la sala">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {mod && (
          <Suspense fallback={null}>
            <mod.Options options={room.options} disabled={!isHost} onChange={(options) => call('room:options', { options })} />
          </Suspense>
        )}
        {isHost ? (
          <Button variant="primary" size="lg" disabled={!enough} onClick={() => call('room:start')}>
            {enough ? 'Empezar partida' : room.countError ?? `Hacen falta ${room.limits.min} jugadores`}
          </Button>
        ) : (
          <p className="rooms__note">Esperando a que el anfitrión empiece la partida…</p>
        )}
      </div>
    </div>
  );
}

/** Aviso de jugadores desconectados durante la partida; el anfitrión puede quitarlos. */
function DisconnectedBar({ room, me, call }) {
  const away = room.seats.filter((s) => !s.connected && !s.left && s.playerId !== me);
  if (!away.length) return null;
  return (
    <div className="room-away">
      {away.map((s) => (
        <span key={s.playerId}>
          {s.name} se desconectó.
          {room.hostId === me && (
            <Button size="sm" variant="ghost" onClick={() => call('room:remove', { playerId: s.playerId })}>
              Quitar de la partida
            </Button>
          )}
        </span>
      ))}
    </div>
  );
}
