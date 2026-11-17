/**
 * Mazo de Comodín (108 cartas), equivalente al del clásico juego de descarte de colores.
 * JS puro.
 *
 * Por color (rojo, amarillo, verde, azul): un 0, dos de cada 1–9, dos Salto,
 * dos Reversa y dos Roba Dos. Además 4 Comodines y 4 Comodín Roba Cuatro.
 */
export const COLORS = ['red', 'yellow', 'green', 'blue'];
export const COLOR_NAMES = { red: 'rojo', yellow: 'amarillo', green: 'verde', blue: 'azul' };
export const COLOR_HEX = { red: '#ef4444', yellow: '#facc15', green: '#22c55e', blue: '#3b82f6' };

export const KIND_NAMES = {
  number: 'Número',
  skip: 'Salto',
  reverse: 'Reversa',
  draw2: 'Roba Dos',
  wild: 'Comodín',
  wild4: 'Comodín Roba Cuatro',
};

export function buildDeck() {
  const cards = [];
  let n = 0;
  const add = (color, kind, value = null) => cards.push({ id: `k${n++}`, color, kind, value });
  for (const color of COLORS) {
    add(color, 'number', 0);
    for (let v = 1; v <= 9; v++) {
      add(color, 'number', v);
      add(color, 'number', v);
    }
    for (const kind of ['skip', 'reverse', 'draw2']) {
      add(color, kind);
      add(color, kind);
    }
  }
  for (let i = 0; i < 4; i++) {
    add(null, 'wild');
    add(null, 'wild4');
  }
  return cards;
}

/** Puntos que vale una carta en la mano de un rival al terminar la ronda. */
export function cardPoints(card) {
  if (card.kind === 'number') return card.value;
  if (card.kind === 'wild' || card.kind === 'wild4') return 50;
  return 20;
}

export function cardLabel(card) {
  if (card.kind === 'number') return `${card.value} ${COLOR_NAMES[card.color]}`;
  if (card.color) return `${KIND_NAMES[card.kind]} ${COLOR_NAMES[card.color]}`;
  return KIND_NAMES[card.kind];
}
