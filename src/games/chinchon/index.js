import { createElement } from 'react';
import GameShell from '../../shared/kit/GameShell.jsx';
import Table from './components/Table.jsx';
import Rules from './components/Rules.jsx';
import * as engine from './engine/index.js';

export default function ChinchonScreen({ manifest }) {
  return createElement(GameShell, {
    manifest,
    slug: 'chinchon',
    accent: '#22c55e',
    logo: 'CHINCHÓN',
    intro: 'El clásico de baraja española para 2 a 4 jugadores: armá grupos y escaleras, cortá con 5 o menos y no pases de 101.',
    engine,
    Table,
    Rules,
  });
}
