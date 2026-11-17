import { useState } from 'react';
import SiteHeader from '../components/SiteHeader.jsx';
import Button from '../../shared/Button.jsx';
import { GAMES } from '../catalog/gamesCatalog.js';
import { createRoom } from '../../net/useRoom.js';
import { lastName } from '../../net/session.js';
import { navigate, hashQuery } from '../../app/router.js';
import '../components/platform.css';

/** Salas privadas: crear una para un juego con modo online o entrar con un código. */
export default function RoomsPage() {
  const onlineGames = GAMES.filter((g) => g.online);
  const wanted = hashQuery().get('juego');
  const [gameId, setGameId] = useState(onlineGames.find((g) => g.slug === wanted)?.slug ?? onlineGames[0]?.slug);
  const [name, setName] = useState(lastName());
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const r = await createRoom({ gameId, name, options: {} });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    navigate(`/sala/${r.code}`);
  };

  return (
    <div className="home">
      <SiteHeader active="salas" />
      <main className="home__main rooms">
        <div className="section-head">
          <h2>Salas privadas</h2>
          <p>Crea una sala, comparte el código y jueguen cada uno desde su PC. Sin cuentas.</p>
        </div>
        <div className="rooms__grid">
          <section className="rooms__card">
            <h3>Crear sala</h3>
            <label className="rooms__field">
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
            </label>
            <label className="rooms__field">
              Tu nombre
              <input className="rooms__input" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <Button variant="primary" size="lg" disabled={!name.trim() || !gameId || busy} onClick={create}>
              Crear sala
            </Button>
            <p className="rooms__note">Las opciones del juego se eligen en la sala, antes de empezar.</p>
          </section>
          <section className="rooms__card">
            <h3>Unirse con código</h3>
            <input
              className="rooms__input rooms__input--code"
              placeholder="ABC123"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
            <Button size="lg" disabled={code.length !== 6} onClick={() => navigate(`/sala/${code}`)}>
              Entrar a la sala
            </Button>
            <p className="rooms__note">Todos los juegos disponibles se pueden jugar en línea. Cada jugador recibe sólo la información que le corresponde ver.</p>
          </section>
        </div>
        {error && <p className="rooms__error">{error}</p>}
      </main>
    </div>
  );
}
