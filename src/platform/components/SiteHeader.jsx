import Logo from './Logo.jsx';
import Button from '../../shared/Button.jsx';
import './platform.css';

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a href="#/" aria-label="BoardHub, inicio">
          <Logo />
        </a>
        <nav className="site-nav" aria-label="Principal">
          <a href="#/" className="site-nav__link is-active">Inicio</a>
          <a href="#catalogo" className="site-nav__link" onClick={scrollToCatalog}>Juegos</a>
          <a href="#/salas" className="site-nav__link">Salas</a>
        </nav>
        <div className="site-header__actions">
          <Button variant="ghost" size="sm" pending pendingNote="El sistema de cuentas llegará más adelante">
            Iniciar sesión
          </Button>
        </div>
      </div>
    </header>
  );
}

function scrollToCatalog(e) {
  e.preventDefault();
  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
}
