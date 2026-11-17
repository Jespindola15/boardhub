/**
 * Baraja española (datos). La usan Chinchón (48 + 2 comodines) y Truco (40 cartas).
 * JS puro.
 */
export const SUITS = ['oros', 'copas', 'espadas', 'bastos'];
export const SUIT_NAMES = { oros: 'oros', copas: 'copas', espadas: 'espadas', bastos: 'bastos' };
export const RANK_NAMES = { 1: 'As', 10: 'Sota', 11: 'Caballo', 12: 'Rey' };

/** @param {{ranks: number[], jokers?: number}} opts */
export function buildSpanishDeck({ ranks, jokers = 0 }) {
  const cards = [];
  for (const suit of SUITS) for (const rank of ranks) cards.push({ id: `${suit[0]}${rank}`, suit, rank, joker: false });
  for (let j = 0; j < jokers; j++) cards.push({ id: `J${j + 1}`, suit: null, rank: 0, joker: true });
  return cards;
}

export function cardName(c) {
  if (c.joker) return 'Comodín';
  return `${RANK_NAMES[c.rank] ?? c.rank} de ${SUIT_NAMES[c.suit]}`;
}

export function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
