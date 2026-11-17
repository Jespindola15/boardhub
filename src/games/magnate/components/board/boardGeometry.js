/**
 * Geometría del tablero: traduce un índice de casilla (0–39) a su posición
 * en una cuadrícula 11×11 y a un rectángulo en % del tablero.
 *
 * Es la única pieza que sabe "dónde se dibuja" cada casilla; los datos del
 * tablero no contienen coordenadas.
 *
 * Recorrido: Salida en la esquina inferior derecha, avanzando hacia la
 * izquierda, luego hacia arriba, a la derecha y hacia abajo.
 */
import { JAIL_INDEX } from '../../data/board.js';

/** Ancho de una esquina expresado en "casillas normales". */
export const CORNER_UNITS = 1.45;
export const TOTAL_UNITS = CORNER_UNITS * 2 + 9;

export const SIDES = { BOTTOM: 'bottom', LEFT: 'left', TOP: 'top', RIGHT: 'right' };

/** Posición en la cuadrícula CSS (líneas 1-based). */
export function gridPosition(index) {
  if (index <= 10) return { row: 11, col: 11 - index, side: SIDES.BOTTOM, corner: index % 10 === 0 };
  if (index <= 20) return { row: 11 - (index - 10), col: 1, side: SIDES.LEFT, corner: index === 20 };
  if (index <= 30) return { row: 1, col: 1 + (index - 20), side: SIDES.TOP, corner: index === 30 };
  return { row: 1 + (index - 30), col: 11, side: SIDES.RIGHT, corner: false };
}

const trackStart = (n) => (n === 1 ? 0 : n === 11 ? CORNER_UNITS + 9 : CORNER_UNITS + (n - 2));
const trackSize = (n) => (n === 1 || n === 11 ? CORNER_UNITS : 1);
const pct = (units) => (units / TOTAL_UNITS) * 100;

/** Rectángulo de la casilla en % del tablero: { x, y, w, h }. */
export function squareRect(index) {
  const { row, col } = gridPosition(index);
  return { x: pct(trackStart(col)), y: pct(trackStart(row)), w: pct(trackSize(col)), h: pct(trackSize(row)) };
}

/** Valor para grid-template-columns / rows. */
export const GRID_TEMPLATE = `${CORNER_UNITS}fr repeat(9, 1fr) ${CORNER_UNITS}fr`;

/* ------------------------------------------------------------------ */
/* Disposición de varias fichas dentro de una casilla                  */
/* ------------------------------------------------------------------ */

/** Diámetro de ficha (en % del tablero) según cuántas comparten casilla. */
function tokenSizeFor(count) {
  if (count <= 1) return 3.6;
  if (count <= 2) return 3.3;
  if (count <= 4) return 3;
  if (count <= 6) return 2.7;
  return 2.45;
}

/** Cuadrícula (columnas × filas) para N fichas en una casilla lateral. */
function gridFor(count, horizontal) {
  const pairs = count <= 1 ? [1, 1] : count <= 2 ? [1, 2] : count <= 4 ? [2, 2] : count <= 6 ? [2, 3] : [2, 4];
  // En casillas de los lados izquierdo/derecho la casilla es ancha: se transpone.
  return horizontal ? { cols: pairs[1], rows: pairs[0] } : { cols: pairs[0], rows: pairs[1] };
}

function gridSlots(count, cols, rows, area) {
  const slots = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    slots.push({
      x: area.x + (area.w * (c + 0.5)) / cols,
      y: area.y + (area.h * (r + 0.5)) / rows,
    });
  }
  return slots;
}

// Zonas de la esquina de la Cárcel (coordenadas relativas 0–1 dentro de la esquina).
const JAIL_VISIT_SLOTS = [
  [0.16, 0.14], [0.16, 0.34], [0.16, 0.54], [0.16, 0.74],
  [0.36, 0.86], [0.56, 0.86], [0.76, 0.86], [0.9, 0.86],
];
const JAIL_CELL_AREA = { x: 0.36, y: 0.04, w: 0.6, h: 0.6 };

/**
 * Calcula la posición (centro, en % del tablero) de cada ficha.
 * @param {Array<{id:string, inJail:boolean}>} occupants fichas en la casilla, en orden estable
 * @returns {Array<{id, x, y, size}>}
 */
export function layoutTokens(index, occupants) {
  const rect = squareRect(index);
  const { side, corner } = gridPosition(index);
  const toBoard = (rx, ry) => ({ x: rect.x + rx * rect.w, y: rect.y + ry * rect.h });

  if (index === JAIL_INDEX) {
    const jailed = occupants.filter((o) => o.inJail);
    const visiting = occupants.filter((o) => !o.inJail);
    const size = 2.35;
    const cell = gridSlots(jailed.length, 3, Math.max(1, Math.ceil(jailed.length / 3)), JAIL_CELL_AREA);
    return [
      ...jailed.map((o, i) => ({ id: o.id, size, ...toBoard(cell[i].x, cell[i].y) })),
      ...visiting.map((o, i) => {
        const [rx, ry] = JAIL_VISIT_SLOTS[i % JAIL_VISIT_SLOTS.length];
        return { id: o.id, size, ...toBoard(rx, ry) };
      }),
    ];
  }

  const n = occupants.length;
  const size = tokenSizeFor(n);
  let cols;
  let rows;
  if (corner) {
    cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
    rows = Math.ceil(n / cols);
  } else {
    ({ cols, rows } = gridFor(n, side === SIDES.LEFT || side === SIDES.RIGHT));
  }
  // Área útil dentro de la casilla (deja margen para no tapar la banda de color).
  const area = corner ? { x: 0.14, y: 0.14, w: 0.72, h: 0.72 } : { x: 0.06, y: 0.06, w: 0.88, h: 0.88 };
  const slots = gridSlots(n, cols, rows, area);
  return occupants.map((o, i) => ({ id: o.id, size, ...toBoard(slots[i].x, slots[i].y) }));
}
