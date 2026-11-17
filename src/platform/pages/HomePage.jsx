import SiteHeader from '../components/SiteHeader.jsx';
import GameCard from '../components/GameCard.jsx';
import Button from '../../shared/Button.jsx';
import Badge from '../../shared/Badge.jsx';
import { GAMES } from '../catalog/gamesCatalog.js';
import { navigate } from '../../app/router.js';
import '../components/platform.css';

const STEPS = [
  { n: '01', title: 'Crea una sala', text: 'Elige un juego y abre una sala pública (cualquiera puede sumarse) o privada (sólo con el código).' },
  { n: '02', title: 'Comparte el código', text: 'Sin registros ni descargas: tus amigos entran directo desde el navegador.' },
  { n: '03', title: 'Jueguen en tiempo real', text: 'El servidor valida cada jugada y mantiene la partida sincronizada.' },
];

export default function HomePage() {
  const featured = GAMES.find((g) => g.status === 'available');
  const available = GAMES.filter((g) => g.status === 'available');
  const online = GAMES.filter((g) => g.online);

  return (
    <div className="home">
      <SiteHeader />

      <main className="home__main">
        <section className="hero">
          <div className="hero__copy">
            <Badge tone="brand">Salas online disponibles</Badge>
            <h1 className="hero__title">
              Juegos de mesa con tus amigos,
              <br />
              <span>directo en el navegador.</span>
            </h1>
            <p className="hero__lead">
              BoardHub es una plataforma de juegos de mesa multijugador. Sin descargas, sin instalaciones y sin
              registro obligatorio. {available.length} juegos para jugar en línea con tus amigos o todos en la misma PC: {available.map((g) => g.name).join(', ')}.
            </p>
            <div className="hero__actions">
              <Button variant="primary" size="lg" onClick={() => navigate('/salas')}>
                Crear o unirse a una sala
              </Button>
              <Button size="lg" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
                Ver los juegos
              </Button>
            </div>
            <ul className="hero__facts">
              <li><strong>{available.length}</strong> juegos</li>
              <li><strong>2–8</strong> jugadores</li>
              <li><strong>0</strong> instalaciones</li>
              <li><strong>PC</strong> navegador de escritorio</li>
            </ul>
          </div>
          <div className="hero__featured">{featured && <GameCard game={featured} featured />}</div>
        </section>

        <section id="catalogo" className="catalog">
          <div className="section-head">
            <h2>Catálogo de juegos</h2>
            <p>Reglas fieles a los clásicos, con nombres y arte propios. Todos se juegan online o en una misma PC.</p>
          </div>
          <div className="catalog__grid">
            {GAMES.map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
        </section>

        <section className="how">
          <div className="section-head">
            <h2>Así funciona el juego online</h2>
            <p>
              El servidor ejecuta las reglas y cada jugador sólo recibe lo que le corresponde ver. Disponible en
              línea para los {online.length} juegos.
            </p>
          </div>
          <ol className="how__steps">
            {STEPS.map((s) => (
              <li key={s.n} className="how__step">
                <span className="how__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <Badge tone="ok">Disponible</Badge>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="site-footer">
        <span>BoardHub Online</span>
        <span>
          {available.length} juegos · {online.length} con salas online
        </span>
      </footer>
    </div>
  );
}
