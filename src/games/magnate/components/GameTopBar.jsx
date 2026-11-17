import Logo from '../../../platform/components/Logo.jsx';
import Button from '../../../shared/Button.jsx';
import Badge from '../../../shared/Badge.jsx';
import { navigate } from '../../../app/router.js';

export default function GameTopBar({ manifest }) {
  return (
    <header className="game-topbar">
      <a href="#/" className="game-topbar__home" aria-label="Volver a BoardHub">
        <Logo size={24} />
      </a>
      <span className="game-topbar__sep" />
      <h1 className="game-topbar__title">{manifest?.name ?? 'Magnate'}</h1>
      <Badge tone="warn">Partida local de prueba</Badge>
      <Badge tone="pending">Sala: sin conexión</Badge>
      <div className="game-topbar__actions">
        <Button size="sm" variant="ghost" pending pendingNote="El reglamento se documentará antes del motor de reglas">
          Reglamento
        </Button>
        <Button size="sm" variant="ghost" pending pendingNote="Las salas privadas llegarán con el servidor">
          Invitar amigos
        </Button>
        <Button size="sm" onClick={() => navigate('/')}>
          Salir al catálogo
        </Button>
      </div>
    </header>
  );
}
