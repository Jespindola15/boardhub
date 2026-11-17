import SiteHeader from '../components/SiteHeader.jsx';
import GameCard from '../components/GameCard.jsx';
import Button from '../../shared/Button.jsx';
import Badge from '../../shared/Badge.jsx';
import { GAMES } from '../catalog/gamesCatalog.js';
import { navigate } from '../../app/router.js';
import '../components/platform.css';

const STEPS = [
  { n: '01', title: 'Crea una sala privada', text: 'Elige un juego y genera una sala con código para tus amigos.' },
  { n: '02', title: 'Comparte el enlace', text: 'Sin registros ni descargas: se entra directamente desde el navegador.' },
  { n: '03', title: 'Jueguen en tiempo real', text: 'El servidor valida cada jugada y mantiene la partida sincronizada.' },
];

export default function HomePage() {
  const featured = GAMES.find((g) => g.status === 'available');
  const upcoming = GAMES.filter((g) => g.status !== 'available');

  return (
    <div className="home">
      <SiteHeader />

      <main className="home__main">
        <section className="hero">
          <div className="hero__copy">
            <Badge tone="brand">Fase 2 · Juego local</Badge>
            <h1 className="hero__title">
              Juegos de mesa con tus amigos,
              <br />
              <span>directo en el navegador.</span>
            </h1>
            <p className="hero__lead">
              BoardHub es una plataforma de juegos de mesa multijugador. Sin descargas, sin instalaciones y sin
              registro obligatorio. Ya puedes jugar <strong>Magnate</strong> y <strong>Comodín</strong> en una misma PC.
            </p>
            <div className="hero__actions">
              <Button variant="primary" size="lg" onClick={() => navigate('/juegos/magnate')}>
                Jugar Magnate
              </Button>
              <Button size="lg" pending pendingNote="Las salas privadas online llegarán con el servidor">
                Crear sala privada
              </Button>
            </div>
            <ul className="hero__facts">
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
            <p>Cada juego se añade como un módulo independiente con su propio motor de reglas.</p>
          </div>
          <div className="catalog__grid">
            {GAMES.map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
        </section>

        <section className="how">
          <div className="section-head">
            <h2>Así funcionará el juego online</h2>
            <p>
              Hoy se juega en una misma PC pasándose el turno. Las salas online usarán exactamente los mismos motores de
              reglas, ejecutados en el servidor.
            </p>
          </div>
          <ol className="how__steps">
            {STEPS.map((s) => (
              <li key={s.n} className="how__step">
                <span className="how__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <Badge tone="pending">Pendiente</Badge>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="site-footer">
        <span>BoardHub Online · Fase 2</span>
        <span>
          {upcoming.length} juegos más en desarrollo
        </span>
      </footer>
    </div>
  );
}
