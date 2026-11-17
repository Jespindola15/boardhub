/**
 * Catálogo de juegos de la plataforma.
 *
 * Para incorporar un juego nuevo:
 *   1. Crear src/games/<slug>/ con un index.js que exporte por defecto el
 *      componente de pantalla del juego.
 *   2. Añadir aquí una entrada con status 'available' y `load`.
 * La plataforma (página principal, GameHost, router) no necesita cambios.
 *
 * status: 'available' | 'coming-soon'
 */
export const GAMES = [
  {
    slug: 'magnate',
    name: 'Magnate',
    tagline: 'Compra, alquila y negocia hasta dominar la ciudad.',
    description:
      'Juego clásico de compra y alquiler de propiedades. Reúne grupos de colores, construye y lleva a tus rivales a la bancarrota.',
    status: 'available',
    players: { min: 2, max: 8 },
    duration: '60–120 min',
    category: 'Economía',
    art: 'magnate',
    accent: '#ffb547',
    load: () => import('../../games/magnate/index.js'),
  },
  {
    slug: 'comodin',
    name: 'Comodín',
    tagline: 'Descarta por color o número y quédate sin cartas.',
    description:
      'El clásico juego de cartas de colores: saltos, reversas, roba dos y comodines. Gana quien se queda primero sin cartas.',
    status: 'available',
    players: { min: 2, max: 10 },
    duration: '15–40 min',
    category: 'Cartas',
    art: 'comodin',
    accent: '#ef4444',
    load: () => import('../../games/comodin/index.js'),
  },
  {
    slug: 'conquista',
    name: 'Conquista',
    tagline: 'Estrategia territorial por turnos con objetivos secretos.',
    description: 'Despliega ejércitos, ataca con dados y cumple tu objetivo secreto. Inspirado en los clásicos de estrategia como el TEG.',
    status: 'coming-soon',
    players: { min: 2, max: 6 },
    duration: '90+ min',
    category: 'Estrategia',
    art: 'conquista',
    accent: '#ff5c8a',
  },
  {
    slug: 'colonos',
    name: 'Colonos',
    tagline: 'Recolecta recursos, comercia y expande tus poblados.',
    description: 'Construye caminos, poblados y ciudades en una isla de hexágonos. Inspirado en los juegos de colonización y comercio.',
    status: 'coming-soon',
    players: { min: 3, max: 4 },
    duration: '60–90 min',
    category: 'Estrategia',
    art: 'colonos',
    accent: '#f59b3c',
  },
  {
    slug: 'ludo',
    name: 'Ludo',
    tagline: 'Carrera de fichas, dados y mucha suerte.',
    description: 'El clásico de recorrido: saca tus fichas de casa y llévalas a la meta antes que nadie.',
    status: 'coming-soon',
    players: { min: 2, max: 4 },
    duration: '20–40 min',
    category: 'Familiar',
    art: 'ludo',
    accent: '#2ee6c5',
  },
];

export function getGameBySlug(slug) {
  return GAMES.find((g) => g.slug === slug) ?? null;
}
