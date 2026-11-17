import { useEffect, useRef } from 'react';
import Panel from '../../../../shared/Panel.jsx';

export default function GameLog({ entries }) {
  const body = useRef(null);
  useEffect(() => {
    const el = body.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <Panel title="Registro" className="log-panel" bodyClassName="log__body">
      <ol className="log__list" ref={body}>
        {entries.slice(-40).map((e) => (
          <li key={e.id}>{e.text}</li>
        ))}
      </ol>
    </Panel>
  );
}
