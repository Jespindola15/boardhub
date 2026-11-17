import Logo from './Logo.jsx';
import Button from '../../shared/Button.jsx';
import { navigate } from '../../app/router.js';
import './platform.css';

export default function SiteHeader({ active = 'inicio' }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a href="#/" aria-label="BoardHub, inicio">
          <Logo />
        </a>
        <nav className="site-nav" aria-label="Principal">
          <a href="#/" className={`site-nav__link ${active === 'inicio' ? 'is-active' : ''}`}>
            Inicio
          </a>
          <a href="#/" className="site-nav__link" onClick={goToCatalog}>
            Juegos
          </a>
          <a href="#/salas" className={`site-nav__link ${active === 'salas' ? 'is-active' : ''}`}>
            Salas
          </a>
        </nav>
        <div className="site-header__actions">
          <Button variant="primary" size="sm" onClick={() => navigate('/salas')}>
            Crear o unirse a una sala
          </Button>
        </div>
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
