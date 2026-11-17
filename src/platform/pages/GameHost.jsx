import { lazy, Suspense, useMemo } from 'react';
import { getGameBySlug } from '../catalog/gamesCatalog.js';
import NotFoundPage from './NotFoundPage.jsx';
import Button from '../../shared/Button.jsx';
import Logo from '../components/Logo.jsx';
import { navigate } from '../../app/router.js';
import '../components/platform.css';

const lazyCache = new Map();

function getLazyGame(game) {
  if (!lazyCache.has(game.slug)) lazyCache.set(game.slug, lazy(game.load));
  return lazyCache.get(game.slug);
}

/**
 * Punto de montaje genérico de un juego. La plataforma sólo conoce el
 * manifest del catálogo; el código del juego se carga bajo demanda.
 */
export default function GameHost({ slug }) {
  const game = getGameBySlug(slug);
  const GameScreen = useMemo(() => (game?.load ? getLazyGame(game) : null), [game]);

  if (!game) return <NotFoundPage />;

  if (!GameScreen) {
    return (
      <div className="state-page">
        <Logo size={40} />
        <h1>{game.name}</h1>
        <p>Este juego aparece en el catálogo pero todavía no está disponible.</p>
        <Button variant="primary" onClick={() => navigate('/')}>Volver al catálogo</Button>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="state-page">
          <div className="loader" />
          <p>Preparando la mesa de {game.name}…</p>
        </div>
      }
    >
      <GameScreen manifest={game} />
    </Suspense>
  );
}
