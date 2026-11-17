/** Piezas de Magnate que usa la sala online de la plataforma. */
import { createElement } from 'react';
import MagnateGame from './MagnateGame.jsx';
import OptionsEditor from './components/setup/OnlineOptions.jsx';
import RulesModal from './components/panels/RulesModal.jsx';
import './magnate.css';

export function OnlineTable({ view, send }) {
  return createElement('div', { className: 'magnate magnate--online' }, createElement(MagnateGame, { state: view, send, me: view.me }));
}
export { OptionsEditor, RulesModal };
