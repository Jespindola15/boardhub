import { createElement } from 'react';
import GameShell from '../../shared/kit/GameShell.jsx';
import Table from './components/Table.jsx';
import Rules from './components/Rules.jsx';
import * as engine from './engine/index.js';

export default function RutasScreen({ manifest }) {
  return createElement(GameShell, {
    manifest,
    slug: 'rutas',
    accent: '#38bdf8',
    logo: 'RUTAS',
    intro: 'Juntá cartas de vagón, ocupá tramos y uní las ciudades de tus destinos secretos en un mapa de Sudamérica. De 2 a 5 jugadores.',
    engine,
    Table,
    Rules,
  });
}
