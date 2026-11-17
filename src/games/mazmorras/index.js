import { createElement } from 'react';
import GameShell from '../../shared/kit/GameShell.jsx';
import Table from './components/Table.jsx';
import Rules from './components/Rules.jsx';
import * as engine from './engine/index.js';

export default function MazmorrasScreen({ manifest }) {
  return createElement(GameShell, {
    manifest,
    slug: 'mazmorras',
    accent: '#ef6f6c',
    logo: 'MAZMORRAS',
    intro: 'Pateá puertas, matá monstruos, robá tesoros y traicioná a tus amigos para llegar primero al nivel 10. De 3 a 6 aventureros.',
    engine,
    Table,
    Rules,
  });
}
