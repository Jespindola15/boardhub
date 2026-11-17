import GameArt from './GameArt.jsx';
import Badge from '../../shared/Badge.jsx';
import Button from '../../shared/Button.jsx';
import { navigate } from '../../app/router.js';
import './platform.css';

export default function GameCard({ game, featured = false }) {
  const available = game.status === 'available';

  return (
    <article
      className={`game-card ${available ? 'is-available' : 'is-soon'} ${featured ? 'is-featured' : ''}`}
      style={{ '--accent': game.accent }}
    >
      <div className="game-card__art">
        <GameArt art={game.art} />
        <div className="game-card__badges">
          {available ? <Badge tone="ok">Disponible</Badge> : <Badge tone="pending">Próximamente</Badge>}
          {game.online && <Badge tone="brand">Online</Badge>}
        </div>
      </div>
      <div className="game-card__body">
        <div className="game-card__meta">
          <span>{game.category}</span>
          <span>·</span>
          <span>
            {game.players.min}–{game.players.max} jugadores
          </span>
          <span>·</span>
          <span>{game.duration}</span>
        </div>
        <h3 className="game-card__title">{game.name}</h3>
        <p className="game-card__desc">{featured ? game.description : game.tagline}</p>
        <div className="game-card__actions">
          {available ? (
            <>
              <Button variant="primary" onClick={() => navigate(`/juegos/${game.slug}`)}>
                Jugar
              </Button>
              {game.online && (
                <Button variant="ghost" onClick={() => navigate(`/salas?juego=${game.slug}`)}>
                  Salas online
                </Button>
              )}
            </>
          ) : (
            <Button pending pendingNote="Este juego todavía no está disponible">
              Jugar
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
