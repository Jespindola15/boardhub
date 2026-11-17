/**
 * Misterio: personajes, armas, habitaciones y plano de la mansión. Diseño propio
 * (nombres y plano no reproducen ninguna edición comercial). Datos puros.
 */
export const SUSPECTS = [
  { id: 'carmin', name: 'Condesa Carmín', color: '#e5484d', start: [7, 0] },
  { id: 'ocre', name: 'Barón Ocre', color: '#e8b13a', start: [16, 0] },
  { id: 'perla', name: 'Madame Perla', color: '#eef1f6', start: [23, 7] },
  { id: 'oliva', name: 'General Oliva', color: '#3fb36b', start: [23, 16] },
  { id: 'indigo', name: 'Doctora Índigo', color: '#5b6cf0', start: [16, 23] },
  { id: 'grafito', name: 'Señor Grafito', color: '#8a8fa8', start: [0, 17] },
];

export const WEAPONS = [
  { id: 'abrecartas', name: 'Abrecartas', icon: '🗡️' },
  { id: 'trofeo', name: 'Trofeo', icon: '🏆' },
  { id: 'cuerda', name: 'Cuerda', icon: '🪢' },
  { id: 'veneno', name: 'Veneno', icon: '🧪' },
  { id: 'pistola', name: 'Pistola', icon: '🔫' },
  { id: 'llave', name: 'Llave inglesa', icon: '🔧' },
];

/** Habitaciones: rectángulo [x0, y0, x1, y1] inclusive, puertas [celda de la habitación, celda de pasillo]. */
export const ROOMS = [
  { id: 'estudio', name: 'Estudio', rect: [0, 0, 5, 3], doors: [[[5, 3], [6, 3]]], passage: 'cocina' },
  { id: 'vestibulo', name: 'Vestíbulo', rect: [9, 0, 14, 6], doors: [[[11, 6], [11, 7]], [[12, 6], [12, 7]], [[9, 4], [8, 4]]] },
  { id: 'salon', name: 'Salón', rect: [18, 0, 23, 5], doors: [[[18, 5], [18, 6]]], passage: 'invernadero' },
  { id: 'biblioteca', name: 'Biblioteca', rect: [0, 6, 5, 10], doors: [[[5, 8], [6, 8]], [[3, 10], [3, 11]]] },
  { id: 'billar', name: 'Sala de billar', rect: [0, 12, 5, 16], doors: [[[2, 12], [2, 11]], [[5, 15], [6, 15]]] },
  { id: 'comedor', name: 'Comedor', rect: [16, 9, 23, 15], doors: [[[16, 11], [15, 11]], [[19, 9], [19, 8]]] },
  { id: 'invernadero', name: 'Invernadero', rect: [0, 19, 5, 23], doors: [[[4, 19], [4, 18]]], passage: 'salon' },
  { id: 'baile', name: 'Salón de baile', rect: [8, 17, 15, 23], doors: [[[8, 19], [7, 19]], [[15, 19], [16, 19]], [[10, 17], [10, 16]], [[13, 17], [13, 16]]] },
  { id: 'cocina', name: 'Cocina', rect: [18, 18, 23, 23], doors: [[[19, 18], [19, 17]]], passage: 'estudio' },
];
export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

export const GRID = 24;
/** Escalera central: no se puede pisar (allí está el sobre del caso). */
export const CENTER = [10, 9, 14, 14];

const inRect = ([x0, y0, x1, y1], x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
export function cellKind(x, y) {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return null;
  if (inRect(CENTER, x, y)) return 'center';
  const room = ROOMS.find((r) => inRect(r.rect, x, y));
  return room ? room.id : 'hall';
}
export const cellKey = (x, y) => `${x},${y}`;
export const parseCell = (k) => k.split(',').map(Number);

export const CARDS = [...SUSPECTS.map((s) => ({ id: `s:${s.id}`, kind: 'suspect', ref: s.id, name: s.name })), ...WEAPONS.map((w) => ({ id: `w:${w.id}`, kind: 'weapon', ref: w.id, name: w.name })), ...ROOMS.map((r) => ({ id: `r:${r.id}`, kind: 'room', ref: r.id, name: r.name }))];
export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));
