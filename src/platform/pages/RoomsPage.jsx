import { useCallback, useEffect, useState } from 'react';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import Button from '../../shared/Button.jsx';
import { GAMES, getGameBySlug } from '../catalog/gamesCatalog.js';
import { createRoom } from '../../net/useRoom.js';
import { listPublicRooms } from '../../net/socket.js';
import { lastName } from '../../net/session.js';
import { navigate, hashQuery } from '../../app/router.js';
import '../components/platform.css';

const range = (g) => (g.players.min === g.players.max ? `${g.players.min} jugadores` : `${g.players.min} a ${g.players.max} jugadores`);

/** Salas: abrir una mesa (pública o privada), sentarse con un código o ver las mesas abiertas. */
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
    <div className="cafe cafe-page">
      <SiteHeader active="salas" />
      <main className="cafe-main">
        <div className="cafe-rooms">
          <section className="cafe-sheet paper" aria-labelledby="abrir">
            <h2 id="abrir">Abrir una mesa</h2>
            <div className="cafe-field">
              <span id="juego">Juego</span>
              <div className="cafe-games" role="radiogroup" aria-labelledby="juego">
                {onlineGames.map((g) => (
                  <button key={g.slug} type="button" role="radio" aria-checked={gameId === g.slug} onClick={() => setGameId(g.slug)}>
                    <strong>{g.name}</strong>
                    {g.basedOn && <small className="cafe-origin">{g.basedOn}</small>}
                    <small>{range(g)}</small>
                  </button>
                ))}
              </div>
            </div>
            <label className="cafe-field">
              Tu nombre
              <input maxLength={16} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && create()} />
            </label>
            <div className="cafe-field">
              <span id="vis">Quién puede entrar</span>
              <CafeVisibility value={visibility} onChange={setVisibility} labelledBy="vis" />
            </div>
            <div>
              <Button variant="primary" size="lg" disabled={!name.trim() || !gameId || busy} onClick={create}>
                Abrir la mesa
              </Button>
            </div>
            <p className="cafe-sheet__hint">Las opciones del juego se eligen en la mesa, antes de empezar. Al terminar pueden quedarse y elegir otro juego.</p>
            {error && <p className="cafe-error">{error}</p>}
          </section>

          <section className="cafe-ticket paper" aria-labelledby="sentarse">
            <h2 id="sentarse">Sentarse con un código</h2>
            <p className="cafe-sheet__hint">Pídele a quien abrió la mesa el código de seis letras.</p>
            <input
              className="cafe-code-input"
              aria-label="Código de la mesa"
              placeholder="ABC123"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && navigate(`/sala/${code}`)}
            />
            <div>
              <Button size="lg" disabled={code.length !== 6} onClick={() => navigate(`/sala/${code}`)}>
                Sentarse
              </Button>
            </div>
          </section>
        </div>
        <PublicRooms />
      </main>
      <SiteFooter />
    </div>
  );
}

/** Pública o privada, para las páginas con estilo de mesa. */
export function CafeVisibility({ value, onChange, disabled, labelledBy }) {
  return (
    <div className="cafe-vis" role="radiogroup" aria-labelledby={labelledBy}>
      {[
        ['public', 'Pública', 'Aparece en las mesas abiertas.'],
        ['private', 'Privada', 'Sólo entra quien tenga el código.'],
      ].map(([v, label, hint]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} disabled={disabled} onClick={() => onChange(v)}>
          <strong>{label}</strong>
          <small>{hint}</small>
        </button>
      ))}
    </div>
  );
}

/** Versión usada por los menús de cada juego. */
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
  const [filter, setFilter] = useState(hashQuery().get('juego') ?? '');
  const load = useCallback(async () => setRooms(await listPublicRooms(filter || undefined)), [filter]);
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <section className="cafe-open" aria-labelledby="abiertas">
      <div className="cafe-open__head">
        <h2 id="abiertas">Mesas abiertas</h2>
        <select aria-label="Filtrar por juego" value={filter} onChange={(e) => setFilter(e.target.value)}>
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
      {rooms === undefined && <p className="cafe-note">Buscando mesas…</p>}
      {rooms === null && <p className="cafe-error">No se pudo contactar al servidor. Revisa tu conexión y toca Actualizar.</p>}
      {rooms?.length === 0 && <p className="cafe-note">Ahora no hay mesas públicas esperando gente. Abre una y aparecerá acá.</p>}
      {rooms?.length > 0 && (
        <ul className="cafe-open__list">
          {rooms.map((r) => {
            const g = getGameBySlug(r.gameId);
            return (
              <li key={r.code} className="paper" style={{ '--accent': g?.accent ?? 'var(--cafe-brick)' }}>
                <span className="cafe-open__game">{g?.name ?? r.gameId}</span>
                {g?.basedOn && <span className="cafe-open__info">{g.basedOn}</span>}
                <span className="cafe-open__info">
                  Mesa de {r.host}, {r.players} de {r.max} sentados
                </span>
                <Button size="sm" variant="primary" onClick={() => navigate(`/sala/${r.code}`)}>
                  Sentarse
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
