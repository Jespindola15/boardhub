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
 * basedOn: de qué juego clásico sale (referencia; los nombres originales son marcas de sus dueños).
 */
export const GAMES = [
  {
    slug: 'magnate',
    basedOn: 'Basado en Monopoly',
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
    basedOn: 'Basado en UNO',
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
    slug: 'chinchon',
    basedOn: 'Juego tradicional de naipes',
    name: 'Chinchón',
    tagline: 'Arma grupos y escaleras, corta con 5 y no pases de 101.',
    description: 'El clásico de baraja española con comodines: Chin-Chon, cortes con −10 y eliminación al pasar 101. Reglamento de los Juegos Bonaerenses.',
    status: 'available',
    online: true,
    players: { min: 2, max: 4 },
    duration: '30–60 min',
    category: 'Cartas',
    art: 'chinchon',
    accent: '#22c55e',
    load: () => import('../../games/chinchon/index.js'),
    loadOnline: () => import('../../games/chinchon/online.js'),
  },
  {
    slug: 'truco',
    basedOn: 'Juego tradicional de naipes',
    name: 'Truco',
    tagline: 'Envido, truco, retruco y vale cuatro. De a 2, 4 o 6.',
    description: 'Truco argentino con baraja española de 40 cartas: envido, real envido, falta envido, truco y pica-pica para 6. Sin flor y a 30 por defecto.',
    status: 'available',
    online: true,
    players: { min: 2, max: 6 },
    duration: '20–45 min',
    category: 'Cartas',
    art: 'truco',
    accent: '#f2c14e',
    load: () => import('../../games/truco/index.js'),
    loadOnline: () => import('../../games/truco/online.js'),
  },
  {
    slug: 'mazmorras',
    basedOn: 'Basado en Munchkin',
    name: 'Mazmorras y Traiciones',
    tagline: 'Patea puertas, mata monstruos y traiciona a tus amigos.',
    description: 'Juego de cartas de saqueo de mazmorras: monstruos, maldiciones, razas, clases, objetos y combates donde todos pueden meterse. Llega al nivel 10. Cartas propias.',
    status: 'available',
    online: true,
    players: { min: 3, max: 6 },
    duration: '45–90 min',
    category: 'Cartas',
    art: 'mazmorras',
    accent: '#ef6f6c',
    load: () => import('../../games/mazmorras/index.js'),
    loadOnline: () => import('../../games/mazmorras/online.js'),
  },
  {
    slug: 'colonias',
    basedOn: 'Basado en Catan',
    name: 'Colonias',
    tagline: 'Recolecta recursos, comercia y expande tus poblados.',
    description: 'Caminos, poblados y ciudades en una isla de 19 hexágonos: producción, comercio, ladrón y cartas de desarrollo. Reglas del juego básico de colonos.',
    status: 'available',
    online: true,
    load: () => import('../../games/colonias/index.js'),
    loadOnline: () => import('../../games/colonias/online.js'),
    players: { min: 3, max: 4 },
    duration: '60–90 min',
    category: 'Estrategia',
    art: 'colonos',
    accent: '#f59b3c',
  },
  {
    slug: 'dominio',
    basedOn: 'Basado en Risk',
    name: 'Dominio',
    tagline: 'Conquista territorios con ejércitos y dados.',
    description: 'Despliega ejércitos, canjea cartas, tira los dados y domina los 42 territorios. Reglas del clásico de conquista mundial.',
    status: 'available',
    online: true,
    load: () => import('../../games/dominio/index.js'),
    loadOnline: () => import('../../games/dominio/online.js'),
    players: { min: 2, max: 6 },
    duration: '90+ min',
    category: 'Estrategia',
    art: 'conquista',
    accent: '#ff5c8a',
  },
  {
    slug: 'misterio',
    basedOn: 'Basado en Cluedo',
    name: 'Misterio',
    tagline: 'Deduce quién, con qué y dónde.',
    description: 'Recorre la mansión, sugiere, descarta pistas en tu libreta y resuelve el caso antes que nadie. Reglas del clásico de deducción.',
    status: 'available',
    online: true,
    load: () => import('../../games/misterio/index.js'),
    loadOnline: () => import('../../games/misterio/online.js'),
    players: { min: 3, max: 6 },
    duration: '45–60 min',
    category: 'Deducción',
    art: 'misterio',
    accent: '#a78bfa',
  },
  {
    slug: 'rutas',
    basedOn: 'Basado en Ticket to Ride',
    name: 'Rutas',
    tagline: 'Colecciona vagones y conecta ciudades.',
    description: 'Ocupa tramos ferroviarios de Sudamérica y completa tus destinos secretos. Reglas del clásico de vagones y destinos.',
    status: 'available',
    online: true,
    load: () => import('../../games/rutas/index.js'),
    loadOnline: () => import('../../games/rutas/online.js'),
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

/** Aviso de marcas: los juegos originales se nombran sólo como referencia. */
export const TRADEMARK_NOTICE =
  'Monopoly, Risk y Cluedo son marcas de Hasbro; UNO, de Mattel; Catan, de CATAN GmbH; Ticket to Ride, de Days of Wonder; Munchkin, de Steve Jackson Games. Se nombran sólo para indicar en qué juego se basa cada uno. BoardHub no está asociado con esas empresas y usa nombres, textos y dibujos propios.';
