import { useState } from 'react';
import Button from '../../../shared/Button.jsx';
import { PALETTE } from '../../../shared/playerPalette.js';
import { MIN_PLAYERS, MAX_PLAYERS } from '../engine/index.js';

/** Configuración de partida local de Comodín (2–10 jugadores). */
export default function ComodinSetup({ onStart }) {
  const [names, setNames] = useState(['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4']);
  const [target, setTarget] = useState(500);

  const clean = names.map((n) => n.trim());
  const valid = clean.every(Boolean) && new Set(clean.map((n) => n.toLowerCase())).size === clean.length;

  const start = () =>
    onStart({
      players: clean.map((name, i) => ({ id: `p${i + 1}`, name, colorId: PALETTE[i].id })),
      targetScore: target,
    });

  return (
    <div className="cm-setup">
      <div className="cm-setup__card">
        <span className="cm-logo">COMODÍN</span>
        <h2>Nueva partida local</h2>
        <p>Cada jugador ve sus cartas por turnos: al cambiar de jugador aparece una pantalla para pasar la PC.</p>
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
          <label className="cm-setup__target">
            Partida a
            <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
              <option value={100}>100 puntos (rápida)</option>
              <option value={250}>250 puntos</option>
              <option value={500}>500 puntos (clásica)</option>
            </select>
          </label>
        </div>
        <Button variant="primary" size="lg" disabled={!valid} onClick={start} className="cm-setup__go">
          Empezar partida
        </Button>
        {!valid && <p className="cm-error">Cada jugador necesita un nombre distinto.</p>}
      </div>
    </div>
  );
}
