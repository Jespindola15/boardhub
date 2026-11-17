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
    slug: 'conquista',
    name: 'Conquista',
    tagline: 'Estrategia territorial por turnos.',
    description: 'Despliega ejércitos, forma alianzas y conquista continentes. Inspirado en los clásicos de estrategia tipo Risk.',
    status: 'coming-soon',
    players: { min: 2, max: 6 },
    duration: '90+ min',
    category: 'Estrategia',
    art: 'conquista',
    accent: '#ff5c8a',
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
  {
    slug: 'cartas',
    name: 'Salón de Cartas',
    tagline: 'Juegos de cartas tradicionales online.',
    description: 'Una colección de juegos de cartas clásicos para partidas rápidas entre amigos.',
    status: 'coming-soon',
    players: { min: 2, max: 6 },
    duration: '10–30 min',
    category: 'Cartas',
    art: 'cartas',
    accent: '#7c5cff',
  },
];

export function getGameBySlug(slug) {
  return GAMES.find((g) => g.slug === slug) ?? null;
}
