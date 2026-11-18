import SiteHeader from '../components/SiteHeader.jsx';
import GameArt from '../components/GameArt.jsx';
import Button from '../../shared/Button.jsx';
import { GAMES } from '../catalog/gamesCatalog.js';
import SiteFooter from '../components/SiteFooter.jsx';
import { navigate } from '../../app/router.js';
import '../components/platform.css';

const STEPS = [
  { title: 'Abre una mesa', text: 'Elige el juego y si la mesa es pública o privada. No hace falta cuenta.' },
  { title: 'Comparte el código', text: 'Tus amigos entran con el código de seis letras o con el enlace, desde el navegador.' },
  { title: 'Jueguen', text: 'El servidor reparte, valida cada jugada y cada uno ve sólo lo suyo.' },
  { title: 'Otra vuelta', text: 'Al terminar vuelven a la misma mesa, votan el próximo juego y siguen.' },
];

const players = (g) => (g.players.min === g.players.max ? `${g.players.min}` : `${g.players.min} a ${g.players.max}`);

/** Naipes repartidos en tres filas sueltas: posición, giro y orden de reparto de cada uno. */
const TILT = [-7, 4, -3, 6, -5, 3, -4, 7, -2];
const NUDGE = [[-6, 8], [4, -6], [10, 4], [-8, -4], [6, 10], [-4, -8], [8, 6], [-10, 2], [4, -4]];
function deal(i) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const [dx, dy] = NUDGE[i % NUDGE.length];
  return { '--x': `${(col - 1) * 200 + dx}px`, '--y': `${(row - 1) * 150 + dy}px`, '--r': `${TILT[i % TILT.length]}deg`, '--i': i, zIndex: i };
}

export default function HomePage() {
  const games = GAMES.filter((g) => g.status === 'available');

  return (
    <div className="cafe cafe-page">
      <SiteHeader />

      <main className="cafe-main">
        <section className="cafe-hero">
          <div>
            <h1 className="cafe-hero__title">Arma la mesa con tus amigos.</h1>
            <p className="cafe-hero__lead">
              {games.length} juegos de mesa y de cartas para jugar en el navegador. Abres una mesa, compartes el código y
              juegan, cada uno desde su compu. Sin cuentas ni descargas.
            </p>
            <div className="cafe-hero__actions">
              <Button variant="primary" size="lg" onClick={() => navigate('/salas')}>
                Abrir una mesa
              </Button>
              <Button size="lg" onClick={() => navigate('/salas')}>
                Entrar con un código
              </Button>
            </div>
          </div>
          <div className="cafe-spread" aria-label="Juegos disponibles">
            {games.map((g, i) => (
              <button key={g.slug} type="button" className="cafe-spread__card paper" style={deal(i)} onClick={() => navigate(`/juegos/${g.slug}`)}>
                <span className="cafe-spread__body">
                  <span className="cafe-spread__name">{g.name}</span>
                  <span className="cafe-spread__meta">{g.basedOn ?? `${players(g)} jugadores`}</span>
                </span>
                <span className="cafe-spread__art">
                  <GameArt art={g.art} />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section id="catalogo" className="cafe-section">
          <div className="cafe-section__head">
            <h2>Los juegos</h2>
            <p>Reglas fieles a los clásicos, con nombres y dibujos propios. Todos se juegan en línea o pasando la compu.</p>
          </div>
          <div className="cafe-catalog">
            {games.map((g) => (
              <article key={g.slug} className="cafe-box paper" style={{ '--accent': g.accent }}>
                <div className="cafe-box__art">
                  <GameArt art={g.art} />
                </div>
                <div className="cafe-box__body">
                  <h3 className="cafe-box__title">{g.name}</h3>
                  {g.basedOn && <p className="cafe-box__origin">{g.basedOn}</p>}
                  <p className="cafe-box__meta">
                    {g.category}, {players(g)} jugadores, {g.duration}
                  </p>
                  <p className="cafe-box__desc">{g.tagline}</p>
                  <div className="cafe-box__actions">
                    <Button variant="primary" size="sm" onClick={() => navigate(`/juegos/${g.slug}`)}>
                      Jugar
                    </Button>
                    {g.online && (
                      <Button size="sm" onClick={() => navigate(`/salas?juego=${g.slug}`)}>
                        Ver mesas abiertas
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="cafe-section">
          <div className="cafe-section__head">
            <h2>Cómo se juega en línea</h2>
          </div>
          <ol className="cafe-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="cafe-chip" style={{ '--chip': ['#9e2f28', '#1f4f8a', '#2e6b3a', '#6b3f1d'][i] }} aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
