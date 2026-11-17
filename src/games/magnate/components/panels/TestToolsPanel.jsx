import Panel from '../../../../shared/Panel.jsx';
import Button from '../../../../shared/Button.jsx';
import Badge from '../../../../shared/Badge.jsx';
import { MOCK_SCENARIOS } from '../../state/mockScenarios.js';
import { MIN_PLAYERS, MAX_PLAYERS } from '../../models/player.js';

/**
 * Herramientas de prueba de la interfaz. NO forman parte del juego:
 * permiten comprobar el diseño con 2–8 jugadores y distintas situaciones.
 */
export default function TestToolsPanel({ playerCount, scenarioId, onPlayerCount, onScenario, onShuffle }) {
  const counts = [];
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) counts.push(n);

  return (
    <Panel title="Prueba de interfaz" aside={<Badge tone="warn">Datos simulados</Badge>} className="tools-panel">
      <div className="tools__group">
        <span className="tools__label">Jugadores</span>
        <div className="tools__seg" role="group" aria-label="Número de jugadores">
          {counts.map((n) => (
            <button
              key={n}
              type="button"
              className={`tools__seg-btn ${n === playerCount ? 'is-active' : ''}`}
              onClick={() => onPlayerCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="tools__group">
        <label className="tools__label" htmlFor="scenario">Escenario</label>
        <select id="scenario" className="tools__select" value={scenarioId} onChange={(e) => onScenario(e.target.value)}>
          {MOCK_SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      <Button size="sm" onClick={onShuffle} title="Coloca las fichas en casillas al azar para probar la animación">
        Mover fichas al azar
      </Button>
      <p className="tools__note">Sólo reposiciona fichas para probar la animación; no aplica reglas.</p>
    </Panel>
  );
}
