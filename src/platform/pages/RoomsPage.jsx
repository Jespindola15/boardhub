import { useCallback, useEffect, useState } from 'react';
import SiteHeader from '../components/SiteHeader.jsx';
import Button from '../../shared/Button.jsx';
import { GAMES, getGameBySlug } from '../catalog/gamesCatalog.js';
import { createRoom } from '../../net/useRoom.js';
import { listPublicRooms } from '../../net/socket.js';
import { lastName } from '../../net/session.js';
import { navigate, hashQuery } from '../../app/router.js';
import '../components/platform.css';

/** Salas: crear (pública o privada), ver las públicas abiertas o entrar con un código. */
export default function RoomsPage() {
  const onlineGames = GAMES.filter((g) => g.online);
  const wanted = hashQuery().get('juego');
  const [gameId, setGameId] = useState(onlineGames.find((g) => g.slug === wanted)?.slug ?? onlineGames[0]?.slug);
  const [name, setName] = useState(lastName());
  const [visibility, setVisibility] = useState('public');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const r = await createRoom({ gameId, name, options: {}, visibility });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    navigate(`/sala/${r.code}`);
  };

  return (
    <div className="home">
      <SiteHeader active="salas" />
      <main className="home__main rooms">
        <div className="section-head">
          <h2>Salas online</h2>
          <p>Crea una sala pública para que cualquiera se sume, o privada para jugar sólo con quien tenga el código. Sin cuentas.</p>
        </div>
        <div className="rooms__grid">
          <section className="rooms__card">
            <h3>Crear sala</h3>
            <div className="rooms__field">
              Juego
              <div className="rooms__games">
                {onlineGames.map((g) => (
                  <button key={g.slug} type="button" className={`rooms__game ${gameId === g.slug ? 'is-active' : ''}`} style={{ '--accent': g.accent }} onClick={() => setGameId(g.slug)}>
                    <strong>{g.name}</strong>
                    <small>
                      {g.players.min}–{g.players.max} jugadores
                    </small>
                  </button>
                ))}
              </div>
            </div>
            <label className="rooms__field">
              Tu nombre
              <input className="rooms__input" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="rooms__field">
              Visibilidad
              <VisibilityToggle value={visibility} onChange={setVisibility} />
            </div>
            <Button variant="primary" size="lg" disabled={!name.trim() || !gameId || busy} onClick={create}>
              Crear sala {visibility === 'public' ? 'pública' : 'privada'}
            </Button>
            <p className="rooms__note">Las opciones del juego se eligen en la sala, antes de empezar.</p>
          </section>
          <div className="rooms__side">
            <section className="rooms__card">
              <h3>Unirse con código</h3>
              <input
                className="rooms__input rooms__input--code"
                placeholder="ABC123"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && navigate(`/sala/${code}`)}
              />
              <Button size="lg" disabled={code.length !== 6} onClick={() => navigate(`/sala/${code}`)}>
                Entrar a la sala
              </Button>
            </section>
          </div>
        </div>
        {error && <p className="rooms__error">{error}</p>}
        <PublicRooms />
      </main>
    </div>
  );
}

export function VisibilityToggle({ value, onChange, disabled }) {
  return (
    <div className="vis-toggle" role="radiogroup">
      {[
        ['public', 'Pública', 'Aparece en la lista: cualquiera puede entrar.'],
        ['private', 'Privada', 'Sólo entra quien tenga el código.'],
      ].map(([v, label, hint]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} disabled={disabled} className={`vis-toggle__opt ${value === v ? 'is-active' : ''}`} onClick={() => onChange(v)}>
          <strong>{label}</strong>
          <small>{hint}</small>
        </button>
      ))}
    </div>
  );
}

function PublicRooms() {
  const [rooms, setRooms] = useState(undefined);
  const [filter, setFilter] = useState('');
  const load = useCallback(async () => setRooms(await listPublicRooms(filter || undefined)), [filter]);
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <section className="public-rooms">
      <div className="public-rooms__head">
        <h3>Salas públicas abiertas</h3>
        <select className="rooms__input public-rooms__filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos los juegos</option>
          {GAMES.filter((g) => g.online).map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
        <Button size="sm" variant="ghost" onClick={load}>
          Actualizar
        </Button>
      </div>
      {rooms === undefined && <p className="rooms__note">Buscando salas…</p>}
      {rooms === null && <p className="rooms__error">No se pudo contactar al servidor.</p>}
      {rooms?.length === 0 && <p className="rooms__note">No hay salas públicas esperando jugadores. ¡Crea una!</p>}
      {rooms?.length > 0 && (
        <ul className="public-rooms__list">
          {rooms.map((r) => {
            const g = getGameBySlug(r.gameId);
            return (
              <li key={r.code} style={{ '--accent': g?.accent }}>
                <span className="public-rooms__game">{g?.name ?? r.gameId}</span>
                <span className="public-rooms__host">Sala de {r.host}</span>
                <span className="public-rooms__count">
                  {r.players}/{r.max} jugadores
                </span>
                <Button size="sm" variant="primary" onClick={() => navigate(`/sala/${r.code}`)}>
                  Unirse
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
