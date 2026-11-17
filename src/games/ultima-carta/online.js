import './ultima-carta.css';
import { createElement } from 'react';
import ScoringOption from './components/ScoringOption.jsx';

/** Piezas del juego que usa la sala online de la plataforma. */
export { default as OnlineTable } from './components/Table.jsx';
export { default as RulesModal } from './components/RulesModal.jsx';

/** Editor de opciones con la interfaz común: { options, onChange(options), disabled }. */
export function OptionsEditor({ options, onChange, disabled }) {
  return createElement(ScoringOption, {
    value: options.scoring,
    disabled,
    onChange: (scoring) => onChange({ ...options, scoring }),
  });
}
