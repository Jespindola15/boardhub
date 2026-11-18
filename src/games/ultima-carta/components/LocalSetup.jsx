import { useState } from 'react';
import Button from '../../../shared/Button.jsx';
import { PALETTE } from '../../../shared/playerPalette.js';
import { MIN_PLAYERS, MAX_PLAYERS } from '../engine/index.js';
import ScoringOption from './ScoringOption.jsx';

/** Partida local de Última Carta (2–8 jugadores en la misma PC). */
export default function LocalSetup({ onStart, onBack }) {
  const [names, setNames] = useState(['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4']);
  const [scoring, setScoring] = useState('winner');
  const clean = names.map((n) => n.trim());
  const valid = clean.every(Boolean) && new Set(clean.map((n) => n.toLowerCase())).size === clean.length;

  return (
    <div className="cm-setup cafe-stage">
      <div className="cm-setup__card">
        <span className="cm-logo">ÚLTIMA CARTA</span>
        <h2>Partida en esta PC</h2>
        <p>Al cambiar de jugador aparece una pantalla para pasar la PC sin que nadie vea manos ajenas.</p>
        <ol className="cm-setup__list">
          {names.map((n, i) => (
            <li key={i}>
              <span className="cm-avatar" style={{ background: PALETTE[i].hex }}>
                {(n.trim()[0] ?? '?').toUpperCase()}
              </span>
              <input value={n} maxLength={16} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" disabled={names.length <= MIN_PLAYERS} onClick={() => setNames(names.filter((_, j) => j !== i))} aria-label="Quitar">
                ✕
              </button>
            </li>
          ))}
        </ol>
        <div className="cm-setup__row">
          <Button disabled={names.length >= MAX_PLAYERS} onClick={() => setNames([...names, `Jugador ${names.length + 1}`])}>
            + Agregar jugador ({names.length}/{MAX_PLAYERS})
          </Button>
        </div>
        <ScoringOption value={scoring} onChange={setScoring} />
        <div className="cm-setup__row">
          <Button variant="ghost" onClick={onBack}>
            ← Volver
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={!valid}
            onClick={() => onStart({ players: clean.map((name, i) => ({ id: `p${i + 1}`, name, colorId: PALETTE[i].id })), options: { scoring } })}
          >
            Empezar partida
          </Button>
        </div>
        {!valid && <p className="cm-error">Cada jugador necesita un nombre distinto.</p>}
      </div>
    </div>
  );
}
