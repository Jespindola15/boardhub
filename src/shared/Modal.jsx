import { useEffect } from 'react';
import './shared.css';

/** Ventana modal sencilla. Se cierra con Esc o clic en el fondo. */
export default function Modal({ title, onClose, children, footer, width = 720 }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="bh-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bh-modal__box" style={{ width: `min(${width}px, 94vw)` }} role="dialog" aria-modal="true" aria-label={title}>
        <header className="bh-modal__head">
          <h3>{title}</h3>
          <button type="button" className="bh-modal__close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="bh-modal__body">{children}</div>
        {footer && <footer className="bh-modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}
