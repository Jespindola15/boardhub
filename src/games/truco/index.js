import { createElement } from 'react';
import GameShell from '../../shared/kit/GameShell.jsx';
import Table from './components/Table.jsx';
import Rules from './components/Rules.jsx';
import Options from './options.jsx';
import * as engine from './engine/index.js';

export default function TrucoScreen({ manifest }) {
  return createElement(GameShell, {
    manifest,
    slug: 'truco',
    accent: '#f2c14e',
    logo: 'TRUCO',
    intro: 'Truco argentino de 2, 4 o 6 jugadores: envido, truco, retruco y vale cuatro. Sin flor y a 30, salvo que elijas otra cosa.',
    engine,
    Table,
    Rules,
    Options,
    defaultOptions: { target: 30, flor: false, picaPica: true },
    checkPlayers: engine.checkPlayers,
    minPlayers: 2,
    maxPlayers: 6,
  });
}
