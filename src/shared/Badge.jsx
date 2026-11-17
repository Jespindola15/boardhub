import './shared.css';

/** Etiqueta compacta. tone: 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'pending' */
export default function Badge({ children, tone = 'neutral', className = '' }) {
  return <span className={`bh-badge bh-badge--${tone} ${className}`}>{children}</span>;
}
