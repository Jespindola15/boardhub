import { createElement } from 'react';
import GameShell from '../../shared/kit/GameShell.jsx';
import Table from './components/Table.jsx';
import Rules from './components/Rules.jsx';
import * as engine from './engine/index.js';

export default function MisterioScreen({ manifest }) {
  return createElement(GameShell, {
    manifest,
    slug: 'misterio',
    accent: '#a78bfa',
    logo: 'MISTERIO',
    intro: 'Recorré la mansión, hacé sugerencias y deducí quién fue, con qué arma y en qué habitación. Para 3 a 6 detectives.',
    engine,
    Table,
    Rules,
  });
}
