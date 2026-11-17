import Modal from '../Modal.jsx';
import './kit.css';

/** Reglamento resumido: sections = [[título, texto | [texto...]]]. */
export default function KitRulesModal({ title, source, sections, onClose }) {
  return (
    <Modal title={title} onClose={onClose} width={780}>
      <div className="kit-rules">
        {source && <p className="kit-rules__source">{source}</p>}
        {sections.map(([h, body]) => (
          <section key={h}>
            <h4>{h}</h4>
            {(Array.isArray(body) ? body : [body]).map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </section>
        ))}
      </div>
    </Modal>
  );
}

export const makeRules = (props) =>
  function Rules({ onClose }) {
    return <KitRulesModal {...props} onClose={onClose} />;
  };
