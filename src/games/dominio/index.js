import { createElement } from 'react';
import GameShell from '../../shared/kit/GameShell.jsx';
import Table from './components/Table.jsx';
import Rules from './components/Rules.jsx';
import Options from './options.jsx';
import * as engine from './engine/index.js';

export default function DominioScreen({ manifest }) {
  return createElement(GameShell, {
    manifest,
    slug: 'dominio',
    accent: '#ff5c8a',
    logo: 'DOMINIO',
    intro: 'Conquista mundial clásica para 2 a 6 jugadores: refuerzos, cartas, dados y 42 territorios. Gana quien domina el mundo.',
    engine,
    Table,
    Rules,
    Options,
    defaultOptions: { quickSetup: false },
    privateInfo: false,
  });
}
