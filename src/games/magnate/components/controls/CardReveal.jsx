import { getCard, DECK_NAMES } from '../../data/cards.js';
import SquareIcon from '../icons/SquareIcon.jsx';

/** Muestra la última carta robada. */
export default function CardReveal({ card }) {
  const data = getCard(card.cardId);
  return (
    <div className={`card-reveal card-reveal--${card.deck}`} key={card.seq}>
      <SquareIcon name={card.deck === 'chance' ? 'chance' : 'chest'} className="card-reveal__icon" strokeWidth={2.2} />
      <div>
        <span className="card-reveal__deck">{DECK_NAMES[card.deck]}</span>
        <p className="card-reveal__text">{data.text}</p>
      </div>
    </div>
  );
}
