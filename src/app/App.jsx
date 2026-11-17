import { useRoute, matchRoute } from './router.js';
import HomePage from '../platform/pages/HomePage.jsx';
import GameHost from '../platform/pages/GameHost.jsx';
import NotFoundPage from '../platform/pages/NotFoundPage.jsx';
import RoomsPage from '../platform/pages/RoomsPage.jsx';
import RoomPage from '../platform/pages/RoomPage.jsx';

export default function App() {
  const route = matchRoute(useRoute());

  switch (route.name) {
    case 'home':
      return <HomePage />;
    case 'game':
      return <GameHost slug={route.params.slug} />;
    case 'rooms':
      return <RoomsPage />;
    case 'room':
      return <RoomPage code={route.params.code} />;
    default:
      return <NotFoundPage />;
  }
}
