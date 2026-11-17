import './shared.css';

/** Contenedor con estética de "cristal" usado por los paneles laterales. */
export default function Panel({ title, aside, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`bh-panel ${className}`}>
      {(title || aside) && (
        <header className="bh-panel__header">
          {title && <h3 className="bh-panel__title">{title}</h3>}
          {aside && <div className="bh-panel__aside">{aside}</div>}
        </header>
      )}
      <div className={`bh-panel__body ${bodyClassName}`}>{children}</div>
    </section>
  );
}
