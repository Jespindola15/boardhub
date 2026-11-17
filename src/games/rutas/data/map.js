/**
 * Mapa propio de Rutas: Sudamérica. Ciudades, tramos y destinos diseñados para BoardHub
 * (no reproducen ningún mapa comercial). Datos puros.
 */

/** [id, nombre, longitud, latitud] — se proyectan a un lienzo de 900 × 800. */
const CITY_RAW = [
  ['caracas', 'Caracas', -66.9, 10.5],
  ['maracaibo', 'Maracaibo', -71.6, 10.6],
  ['bogota', 'Bogotá', -74.1, 4.7],
  ['medellin', 'Medellín', -75.6, 6.6],
  ['quito', 'Quito', -78.5, -0.2],
  ['guayaquil', 'Guayaquil', -79.9, -2.6],
  ['georgetown', 'Georgetown', -58.2, 6.8],
  ['paramaribo', 'Paramaribo', -55.2, 5.8],
  ['manaos', 'Manaos', -60.0, -3.1],
  ['belem', 'Belém', -48.5, -1.5],
  ['fortaleza', 'Fortaleza', -38.5, -3.7],
  ['recife', 'Recife', -34.9, -8.1],
  ['salvador', 'Salvador', -38.5, -13.0],
  ['brasilia', 'Brasilia', -47.9, -15.8],
  ['belo-horizonte', 'Belo Horizonte', -43.9, -19.9],
  ['rio', 'Río de Janeiro', -42.2, -22.9],
  ['san-pablo', 'San Pablo', -46.6, -23.9],
  ['curitiba', 'Curitiba', -49.3, -26.4],
  ['porto-alegre', 'Porto Alegre', -51.2, -30.0],
  ['montevideo', 'Montevideo', -55.6, -34.9],
  ['buenos-aires', 'Buenos Aires', -58.4, -34.6],
  ['rosario', 'Rosario', -60.7, -32.6],
  ['cordoba', 'Córdoba', -64.2, -31.4],
  ['mendoza', 'Mendoza', -68.8, -32.9],
  ['santiago', 'Santiago', -71.6, -33.4],
  ['antofagasta', 'Antofagasta', -70.4, -23.6],
  ['salta', 'Salta', -65.4, -24.8],
  ['asuncion', 'Asunción', -57.6, -25.3],
  ['la-paz', 'La Paz', -68.1, -16.5],
  ['santa-cruz', 'Santa Cruz', -63.2, -17.8],
  ['lima', 'Lima', -77.0, -12.0],
  ['cusco', 'Cusco', -72.0, -13.5],
  ['iquitos', 'Iquitos', -73.3, -3.7],
  ['cuiaba', 'Cuiabá', -56.1, -15.6],
  ['bahia-blanca', 'Bahía Blanca', -62.3, -38.7],
  ['neuquen', 'Neuquén', -68.1, -38.95],
  ['puerto-montt', 'Puerto Montt', -72.9, -41.5],
  ['comodoro', 'Comodoro Rivadavia', -67.5, -45.9],
  ['rio-gallegos', 'Río Gallegos', -69.2, -51.6],
  ['ushuaia', 'Ushuaia', -68.3, -54.8],
];

const project = (lon, lat) => ({ x: Math.round(60 + (lon + 81) * 17.5), y: Math.round(40 + (12 - lat) * 10.8) });
export const CITIES = Object.fromEntries(CITY_RAW.map(([id, name, lon, lat]) => [id, { id, name, ...project(lon, lat) }]));

export const COLORS = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'negro', 'blanco'];
export const COLOR_HEX = {
  rojo: '#e5484d',
  naranja: '#f5913a',
  amarillo: '#f2d43a',
  verde: '#3fb36b',
  azul: '#3f7fe0',
  violeta: '#9b5de5',
  negro: '#2a2d3a',
  blanco: '#eef1f6',
  gris: '#9aa1b2',
  locomotora: 'conic-gradient(#e5484d, #f2d43a, #3fb36b, #3f7fe0, #9b5de5, #e5484d)',
};

/** [a, b, largo, color, colorDelSegundoTramo?] — si hay segundo color, es una ruta doble. */
const ROUTE_RAW = [
  ['maracaibo', 'caracas', 3, 'azul'],
  ['maracaibo', 'bogota', 3, 'naranja'],
  ['maracaibo', 'medellin', 3, 'gris'],
  ['medellin', 'bogota', 2, 'gris'],
  ['caracas', 'bogota', 5, 'rojo'],
  ['caracas', 'georgetown', 4, 'verde', 'blanco'],
  ['georgetown', 'paramaribo', 2, 'gris'],
  ['paramaribo', 'belem', 6, 'negro'],
  ['georgetown', 'manaos', 5, 'amarillo'],
  ['caracas', 'manaos', 6, 'violeta'],
  ['medellin', 'quito', 4, 'blanco'],
  ['bogota', 'quito', 4, 'verde'],
  ['quito', 'guayaquil', 2, 'gris', 'gris'],
  ['bogota', 'iquitos', 5, 'gris'],
  ['quito', 'iquitos', 4, 'naranja'],
  ['iquitos', 'manaos', 6, 'azul'],
  ['guayaquil', 'lima', 6, 'amarillo'],
  ['iquitos', 'lima', 5, 'negro'],
  ['iquitos', 'cusco', 5, 'rojo'],
  ['lima', 'cusco', 3, 'violeta', 'verde'],
  ['cusco', 'la-paz', 3, 'naranja'],
  ['la-paz', 'antofagasta', 4, 'gris'],
  ['manaos', 'belem', 6, 'rojo'],
  ['manaos', 'cuiaba', 6, 'verde'],
  ['belem', 'fortaleza', 5, 'naranja'],
  ['fortaleza', 'recife', 3, 'gris', 'gris'],
  ['recife', 'salvador', 4, 'blanco'],
  ['belem', 'brasilia', 6, 'azul'],
  ['salvador', 'brasilia', 5, 'amarillo'],
  ['salvador', 'belo-horizonte', 5, 'negro'],
  ['brasilia', 'belo-horizonte', 3, 'rojo'],
  ['brasilia', 'cuiaba', 4, 'violeta'],
  ['brasilia', 'san-pablo', 4, 'verde', 'naranja'],
  ['belo-horizonte', 'rio', 2, 'azul', 'violeta'],
  ['rio', 'san-pablo', 2, 'negro', 'rojo'],
  ['san-pablo', 'curitiba', 2, 'amarillo'],
  ['curitiba', 'porto-alegre', 3, 'naranja', 'blanco'],
  ['porto-alegre', 'montevideo', 4, 'azul'],
  ['montevideo', 'buenos-aires', 1, 'gris', 'gris'],
  ['buenos-aires', 'rosario', 2, 'violeta', 'verde'],
  ['rosario', 'cordoba', 2, 'amarillo'],
  ['cordoba', 'mendoza', 3, 'blanco'],
  ['mendoza', 'santiago', 2, 'negro', 'gris'],
  ['santiago', 'antofagasta', 5, 'verde'],
  ['antofagasta', 'salta', 3, 'rojo'],
  ['salta', 'la-paz', 4, 'violeta'],
  ['salta', 'cordoba', 4, 'azul'],
  ['salta', 'asuncion', 4, 'gris'],
  ['asuncion', 'santa-cruz', 4, 'negro'],
  ['santa-cruz', 'la-paz', 3, 'amarillo'],
  ['santa-cruz', 'cuiaba', 4, 'rojo'],
  ['cuiaba', 'asuncion', 5, 'blanco'],
  ['asuncion', 'curitiba', 4, 'violeta'],
  ['asuncion', 'rosario', 5, 'naranja'],
  ['asuncion', 'porto-alegre', 4, 'verde'],
  ['buenos-aires', 'bahia-blanca', 3, 'rojo', 'negro'],
  ['bahia-blanca', 'neuquen', 3, 'azul'],
  ['cordoba', 'bahia-blanca', 4, 'gris'],
  ['mendoza', 'neuquen', 3, 'naranja'],
  ['neuquen', 'puerto-montt', 3, 'gris'],
  ['santiago', 'puerto-montt', 5, 'amarillo'],
  ['neuquen', 'comodoro', 4, 'violeta'],
  ['bahia-blanca', 'comodoro', 5, 'blanco'],
  ['puerto-montt', 'comodoro', 4, 'negro'],
  ['comodoro', 'rio-gallegos', 3, 'verde'],
  ['puerto-montt', 'rio-gallegos', 6, 'rojo'],
  ['rio-gallegos', 'ushuaia', 2, 'gris'],
  ['lima', 'la-paz', 5, 'azul'],
  ['fortaleza', 'brasilia', 6, 'gris'],
  ['cusco', 'santa-cruz', 5, 'blanco'],
];

export const ROUTES = [];
for (const [a, b, length, color, second] of ROUTE_RAW) {
  const base = `${a}~${b}`;
  if (second) {
    ROUTES.push({ id: `${base}#1`, a, b, length, color, pair: `${base}#2`, lane: -1 });
    ROUTES.push({ id: `${base}#2`, a, b, length, color: second, pair: `${base}#1`, lane: 1 });
  } else ROUTES.push({ id: base, a, b, length, color, pair: null, lane: 0 });
}
export const ROUTE_BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

/** Puntos por tramo según su largo (como en el clásico). */
export const ROUTE_POINTS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15 };

/** Destinos: pares de ciudades; el valor es el camino más corto (en vagones) entre ambas. */
const TICKET_PAIRS = [
  ['caracas', 'buenos-aires'],
  ['bogota', 'la-paz'],
  ['lima', 'rio'],
  ['quito', 'santiago'],
  ['maracaibo', 'lima'],
  ['georgetown', 'brasilia'],
  ['manaos', 'buenos-aires'],
  ['belem', 'montevideo'],
  ['recife', 'porto-alegre'],
  ['fortaleza', 'rio'],
  ['salvador', 'asuncion'],
  ['la-paz', 'buenos-aires'],
  ['cusco', 'salta'],
  ['iquitos', 'cuiaba'],
  ['santiago', 'buenos-aires'],
  ['mendoza', 'montevideo'],
  ['cordoba', 'san-pablo'],
  ['antofagasta', 'asuncion'],
  ['santa-cruz', 'rio'],
  ['neuquen', 'rosario'],
  ['puerto-montt', 'buenos-aires'],
  ['comodoro', 'santiago'],
  ['ushuaia', 'mendoza'],
  ['rio-gallegos', 'bahia-blanca'],
  ['guayaquil', 'la-paz'],
  ['medellin', 'manaos'],
  ['paramaribo', 'recife'],
  ['curitiba', 'salta'],
  ['brasilia', 'lima'],
  ['georgetown', 'rio'],
  ['bahia-blanca', 'asuncion'],
  ['quito', 'belem'],
  ['maracaibo', 'manaos'],
  ['ushuaia', 'buenos-aires'],
  ['lima', 'montevideo'],
];

function shortest(a, b) {
  const dist = { [a]: 0 };
  const done = new Set();
  while (true) {
    let u = null;
    for (const [k, v] of Object.entries(dist)) if (!done.has(k) && (u === null || v < dist[u])) u = k;
    if (u === null) return Infinity;
    if (u === b) return dist[u];
    done.add(u);
    for (const r of ROUTES) {
      if (r.lane === 1) continue;
      const v = r.a === u ? r.b : r.b === u ? r.a : null;
      if (v && (dist[v] === undefined || dist[u] + r.length < dist[v])) dist[v] = dist[u] + r.length;
    }
  }
}

export const TICKETS = TICKET_PAIRS.map(([a, b], i) => ({ id: `t${i + 1}`, a, b, points: shortest(a, b) }));

export const TRAINS_PER_PLAYER = 45;
export const LONGEST_BONUS = 10;
