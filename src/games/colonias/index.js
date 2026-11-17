import { createElement } from 'react';
import GameShell from '../../shared/kit/GameShell.jsx';
import Table from './components/Table.jsx';
import Rules from './components/Rules.jsx';
import * as engine from './engine/index.js';

export default function ColoniasScreen({ manifest }) {
  return createElement(GameShell, {
    manifest,
    slug: 'colonias',
    accent: '#f59b3c',
    logo: 'COLONIAS',
    intro: 'Fundá poblados, construí caminos y ciudades, comerciá y llegá a 10 puntos en una isla de 19 hexágonos. Para 3 o 4 jugadores.',
    engine,
    Table,
    Rules,
  });
}
