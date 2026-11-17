/**
 * Mazo de Última Carta: las 108 cartas de juego de la edición Mattel 41001-0925.
 * Las 4 cartas en blanco de la edición no se incluyen (ver docs/reglas/ultima-carta/EDICION.md).
 * JS puro.
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

export const DECK_SIZE = 108;

export function buildDeck() {
  const cards = [];
  let n = 0;
  const add = (color, kind, value = null) => cards.push({ id: `k${n++}`, color, kind, value });
  for (const color of COLORS) {
    add(color, 'number', 0); // un 0 por color
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

export const isWild = (card) => card.kind === 'wild' || card.kind === 'wild4';

/** Puntos de la sección SCORING. */
export function cardPoints(card) {
  if (card.kind === 'number') return card.value;
  if (isWild(card)) return 50;
  return 20;
}

export function cardLabel(card) {
  if (card.kind === 'number') return `${card.value} ${COLOR_NAMES[card.color]}`;
  if (card.color) return `${KIND_NAMES[card.kind]} ${COLOR_NAMES[card.color]}`;
  return KIND_NAMES[card.kind];
}
