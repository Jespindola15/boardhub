import { TRADEMARK_NOTICE } from '../catalog/gamesCatalog.js';
import './platform.css';

/** Pie de las páginas de la plataforma: nombre, derechos y aviso de marcas. */
export default function SiteFooter() {
  return (
    <footer className="cafe-footer">
      <div className="cafe-footer__brand">
        <strong>BoardHub Online</strong>
        <span>© {new Date().getFullYear()} MEDIUP DESIGN - INIBAG. Todos los derechos reservados.</span>
      </div>
      <p className="cafe-footer__legal">{TRADEMARK_NOTICE}</p>
    </footer>
  );
}
