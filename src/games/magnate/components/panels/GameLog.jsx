import Panel from '../../../../shared/Panel.jsx';
import Badge from '../../../../shared/Badge.jsx';

export default function GameLog({ entries }) {
  return (
    <Panel title="Registro" aside={<Badge tone="pending">Simulado</Badge>} className="log-panel" bodyClassName="log__body">
      {entries.length === 0 ? (
        <p className="log__empty">La partida todavía no tiene movimientos.</p>
      ) : (
        <ol className="log__list">
          {entries.map((e) => (
            <li key={e.id}>{e.text}</li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
