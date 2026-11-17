/**
 * Grupos de color de Magnate.
 * JS puro: sin dependencias de React ni del DOM (reutilizable en el servidor).
 */
export const COLOR_GROUPS = {
  brown: { id: 'brown', name: 'Barrio Viejo', color: '#9a6a46', size: 2, houseCost: 50 },
  lightblue: { id: 'lightblue', name: 'Ribera', color: '#7fd1f5', size: 3, houseCost: 50 },
  pink: { id: 'pink', name: 'Distrito de las Artes', color: '#e45fae', size: 3, houseCost: 100 },
  orange: { id: 'orange', name: 'Costa Dorada', color: '#f59b3c', size: 3, houseCost: 100 },
  red: { id: 'red', name: 'Centro Histórico', color: '#e8473f', size: 3, houseCost: 150 },
  yellow: { id: 'yellow', name: 'Barrio Solar', color: '#f2d43a', size: 3, houseCost: 150 },
  green: { id: 'green', name: 'Colinas Verdes', color: '#2fae6a', size: 3, houseCost: 200 },
  darkblue: { id: 'darkblue', name: 'Cumbre Imperial', color: '#3a5ce0', size: 2, houseCost: 200 },
};

/** Grupos "especiales" (no construibles) para colorear UI de estaciones y servicios. */
export const SPECIAL_GROUPS = {
  station: { id: 'station', name: 'Estaciones', color: '#c9cee8', size: 4 },
  utility: { id: 'utility', name: 'Servicios', color: '#9fe7d9', size: 2 },
};

export function getGroup(groupId) {
  return COLOR_GROUPS[groupId] ?? SPECIAL_GROUPS[groupId] ?? null;
}
