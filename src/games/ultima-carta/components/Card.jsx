import { COLOR_HEX } from '../data/cards.js';

/** Símbolo central de cada tipo de carta (dibujo propio). */
function Symbol({ card, size = 'big' }) {
  if (card.kind === 'number') return <span className={`ccard__num ccard__num--${size}`}>{card.value}</span>;
  if (card.kind === 'draw2') return <span className={`ccard__num ccard__num--${size}`}>+2</span>;
  if (card.kind === 'wild4') return <span className={`ccard__num ccard__num--${size}`}>+4</span>;
  if (card.kind === 'skip')
    return (
      <svg viewBox="0 0 24 24" className={`ccard__icon ccard__icon--${size}`} aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M6.5 17.5 L17.5 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  if (card.kind === 'reverse')
    return (
      <svg viewBox="0 0 24 24" className={`ccard__icon ccard__icon--${size}`} aria-hidden="true">
        <path d="M5 9 H17 L14 6 M19 15 H7 L10 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return null; // wild: sólo el rombo de colores
}

function WildGem() {
  return (
    <svg viewBox="0 0 40 40" className="ccard__gem" aria-hidden="true">
      <path d="M20 2 L38 20 L20 20 Z" fill={COLOR_HEX.red} />
      <path d="M38 20 L20 38 L20 20 Z" fill={COLOR_HEX.blue} />
      <path d="M20 38 L2 20 L20 20 Z" fill={COLOR_HEX.green} />
      <path d="M2 20 L20 2 L20 20 Z" fill={COLOR_HEX.yellow} />
    </svg>
  );
}

/**
 * Carta de Última Carta. `back` dibuja el dorso.
 * `playable` resalta la carta; `onClick` la vuelve interactiva.
 */
export default function Card({ card, back = false, playable = false, dim = false, onClick, size = 'md', chosenColor, style, className = '' }) {
  if (back) {
    return (
      <span className={`ccard ccard--back ccard--${size} ${className}`} style={style}>
        <span className="ccard__back-mark">C</span>
      </span>
    );
  }
  const wild = !card.color;
  const classes = ['ccard', `ccard--${size}`, wild ? 'ccard--wild' : '', playable ? 'is-playable' : '', dim ? 'is-dim' : '', onClick ? 'is-clickable' : '', className]
    .filter(Boolean)
    .join(' ');
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={classes}
      style={{ '--card-color': wild ? '#1b1d2e' : COLOR_HEX[card.color], ...style }}
      onClick={onClick}
    >
      <span className="ccard__corner ccard__corner--tl">
        <Symbol card={card} size="small" />
      </span>
      <span className="ccard__face">
        {wild ? (
          <>
            <WildGem />
            {card.kind === 'wild4' && <Symbol card={card} />}
          </>
        ) : (
          <Symbol card={card} />
        )}
      </span>
      <span className="ccard__corner ccard__corner--br">
        <Symbol card={card} size="small" />
      </span>
      {wild && chosenColor && <span className="ccard__chosen" style={{ background: COLOR_HEX[chosenColor] }} />}
    </Tag>
  );
}
