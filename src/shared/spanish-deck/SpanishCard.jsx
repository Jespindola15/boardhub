import './spanish-card.css';

/** Palos dibujados con formas propias (no reproducen ninguna baraja comercial). */
function Pip({ suit, size = 18 }) {
  switch (suit) {
    case 'oros':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="#f5b72b" stroke="#a0640b" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="4.5" fill="none" stroke="#a0640b" strokeWidth="1.4" />
        </svg>
      );
    case 'copas':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 4 H19 C19 10 16 13 12 13 C8 13 5 10 5 4 Z" fill="#e0454b" stroke="#8b1d22" strokeWidth="1.4" />
          <path d="M12 13 V18 M8 20 H16" stroke="#8b1d22" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'espadas':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2 L14.5 14 H9.5 Z" fill="#4f7fd9" stroke="#1d3f8b" strokeWidth="1.2" />
          <path d="M7 15 H17 M12 15 V21" stroke="#1d3f8b" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'bastos':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21 L10 6 C10 3 14 3 14 6 L15 21 Z" fill="#3fa35b" stroke="#1d5e2e" strokeWidth="1.3" />
          <circle cx="11" cy="10" r="1" fill="#1d5e2e" />
          <circle cx="13" cy="14" r="1" fill="#1d5e2e" />
        </svg>
      );
    default:
      return null;
  }
}

const FACE = { 10: 'S', 11: 'C', 12: 'R' };

/**
 * Carta de baraja española.
 * props: card, back, selected, dim, onClick, size ('sm'|'md'|'lg'), label (p. ej. identidad del comodín)
 */
const SUIT_ROW = { oros: 0, copas: 1, espadas: 2, bastos: 3 };
/** Posición de una carta en la lámina ilustrada (12 columnas × 5 filas; el dorso en la fila 5, columna 2). */
const spritePos = (col, row) => `${(col / 11) * 100}% ${(row / 4) * 100}%`;

/**
 * skin: 'propia' (dibujo vectorial de BoardHub) | 'clasica' (ilustraciones de baraja española, public/naipes).
 */
export default function SpanishCard({ card, back = false, selected = false, dim = false, onClick, size = 'md', label, className = '', style, draggable, onDragStart, onDragOver, onDrop, onDoubleClick, skin = 'propia' }) {
  const classic = skin === 'clasica' && !card?.joker;
  if (back || !card) {
    if (skin === 'clasica') return <span className={`sp-card sp-card--classic sp-card--${size} ${className}`} style={{ ...style, backgroundPosition: spritePos(1, 4) }} aria-label="Carta boca abajo" />;
    return <span className={`sp-card sp-card--back sp-card--${size} ${className}`} style={style} />;
  }
  if (classic) {
    const Tag = onClick ? 'button' : 'span';
    const cls = ['sp-card', 'sp-card--classic', `sp-card--${size}`, selected ? 'is-selected' : '', dim ? 'is-dim' : '', onClick ? 'is-clickable' : '', className].filter(Boolean).join(' ');
    const name = `${card.rank} de ${card.suit}`;
    return (
      <Tag
        type={onClick ? 'button' : undefined}
        className={cls}
        style={{ ...style, backgroundPosition: spritePos(card.rank - 1, SUIT_ROW[card.suit]) }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        title={name}
        aria-label={name}
      />
    );
  }
  const Tag = onClick ? 'button' : 'span';
  const cls = ['sp-card', `sp-card--${size}`, card.joker ? 'sp-card--joker' : `sp-card--${card.suit}`, selected ? 'is-selected' : '', dim ? 'is-dim' : '', onClick ? 'is-clickable' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={cls}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      title={card.joker ? 'Comodín' : undefined}
    >
      {card.joker ? (
        <>
          <span className="sp-card__joker">★</span>
          <span className="sp-card__joker-text">COMODÍN</span>
          {label && <span className="sp-card__as">{label}</span>}
        </>
      ) : (
        <>
          <span className="sp-card__corner">
            {FACE[card.rank] ?? card.rank}
            <Pip suit={card.suit} size={11} />
          </span>
          <span className="sp-card__center">
            <span className="sp-card__rank">{FACE[card.rank] ? card.rank : card.rank}</span>
            <Pip suit={card.suit} size={size === 'sm' ? 16 : 26} />
          </span>
          <span className="sp-card__corner sp-card__corner--br">
            {FACE[card.rank] ?? card.rank}
            <Pip suit={card.suit} size={11} />
          </span>
        </>
      )}
    </Tag>
  );
}
