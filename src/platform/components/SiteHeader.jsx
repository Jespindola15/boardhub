import Logo from './Logo.jsx';
import Button from '../../shared/Button.jsx';
import { navigate } from '../../app/router.js';
import './platform.css';

/** Riel de madera con la marca y la navegación. */
export default function SiteHeader({ active = 'inicio' }) {
  return (
    <header className="cafe-header wood">
      <div className="cafe-header__inner">
        <a href="#/" aria-label="BoardHub, inicio">
          <Logo />
        </a>
        <nav className="cafe-nav" aria-label="Principal">
          <a href="#/" aria-current={active === 'inicio' ? 'page' : undefined}>
            Inicio
          </a>
          <a href="#/" onClick={goToCatalog}>
            Juegos
          </a>
          <a href="#/salas" aria-current={active === 'salas' ? 'page' : undefined}>
            Salas
          </a>
        </nav>
        <Button variant="primary" size="sm" onClick={() => navigate('/salas')}>
          Abrir una mesa
        </Button>
      </div>
    </header>
  );
}

function goToCatalog(e) {
  e.preventDefault();
  const el = document.getElementById('catalogo');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
  else {
    navigate('/');
    setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }), 80);
  }
}
