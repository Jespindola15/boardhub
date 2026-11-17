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
    online: true,
    players: { min: 2, max: 8 },
    duration: '60–120 min',
    category: 'Economía',
    art: 'magnate',
    accent: '#ffb547',
    load: () => import('../../games/magnate/index.js'),
    loadOnline: () => import('../../games/magnate/online.js'),
  },
  {
    slug: 'ultima-carta',
    name: 'Última Carta',
    tagline: 'Descarta por color, número o símbolo y quédate sin cartas.',
    description:
      'El clásico juego de cartas de colores con las reglas oficiales: saltos, reversas, roba dos, comodines y el desafío del Roba Cuatro. En línea con salas privadas.',
    status: 'available',
    online: true,
    players: { min: 2, max: 8 },
    duration: '15–40 min',
    category: 'Cartas',
    art: 'comodin',
    accent: '#ef4444',
    load: () => import('../../games/ultima-carta/index.js'),
    loadOnline: () => import('../../games/ultima-carta/online.js'),
  },
  {
    slug: 'colonias',
    name: 'Colonias',
    tagline: 'Recolecta recursos, comercia y expande tus poblados.',
    description: 'Caminos, poblados y ciudades en una isla de hexágonos. Inspirado en Catan (juego básico).',
    status: 'coming-soon',
    players: { min: 3, max: 4 },
    duration: '60–90 min',
    category: 'Estrategia',
    art: 'colonos',
    accent: '#f59b3c',
  },
  {
    slug: 'dominio',
    name: 'Dominio',
    tagline: 'Conquista territorios con ejércitos y dados.',
    description: 'Despliega ejércitos, ataca y domina el mundo. Inspirado en Risk clásico.',
    status: 'coming-soon',
    players: { min: 2, max: 6 },
    duration: '90+ min',
    category: 'Estrategia',
    art: 'conquista',
    accent: '#ff5c8a',
  },
  {
    slug: 'misterio',
    name: 'Misterio',
    tagline: 'Deduce quién, con qué y dónde.',
    description: 'Interroga, descarta pistas y resuelve el caso antes que nadie. Inspirado en Clue/Cluedo.',
    status: 'coming-soon',
    players: { min: 3, max: 6 },
    duration: '45–60 min',
    category: 'Deducción',
    art: 'misterio',
    accent: '#a78bfa',
  },
  {
    slug: 'rutas',
    name: 'Rutas',
    tagline: 'Colecciona vagones y conecta ciudades.',
    description: 'Reclama rutas ferroviarias y completa tus destinos secretos. Inspirado en Ticket to Ride.',
    status: 'coming-soon',
    players: { min: 2, max: 5 },
    duration: '45–60 min',
    category: 'Familiar',
    art: 'rutas',
    accent: '#38bdf8',
  },
];

export function getGameBySlug(slug) {
  return GAMES.find((g) => g.slug === slug) ?? null;
}
