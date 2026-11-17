/**
 * Geometría y preparación del tablero de Colonias (juego básico: 19 hexágonos).
 * Hexágonos con punta arriba, coordenadas axiales (q, r) de radio 2. JS puro.
 */

export const RESOURCES = ['madera', 'ladrillo', 'lana', 'trigo', 'mineral'];
export const TERRAIN = { bosque: 'madera', cerro: 'ladrillo', pasto: 'lana', campo: 'trigo', montana: 'mineral', desierto: null };
const TERRAIN_BAG = [...Array(4).fill('bosque'), ...Array(4).fill('pasto'), ...Array(4).fill('campo'), ...Array(3).fill('cerro'), ...Array(3).fill('montana'), 'desierto'];
/** Fichas en el orden de la espiral (A a R del reglamento). */
const TOKENS_SPIRAL = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

export const HEX_SIZE = 60;
const SQ3 = Math.sqrt(3);

/** Hexágonos en orden de espiral desde una esquina (sentido antihorario), terminando en el centro. */
export const HEX_COORDS = (() => {
  const ring = (radius) => {
    const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const out = [];
    let q = -radius;
    let r = radius;
    // empezar en una esquina e ir alrededor
    for (const [dq, dr] of dirs) for (let k = 0; k < radius; k++) {
      out.push([q, r]);
      q += dq;
      r += dr;
    }
    return out;
  };
  return [...ring(2), ...ring(1), [0, 0]];
})();

export const hexId = (q, r) => `h${q}_${r}`;
export const hexCenter = (q, r) => ({ x: HEX_SIZE * SQ3 * (q + r / 2), y: HEX_SIZE * 1.5 * r });

function cornerPoints(q, r) {
  const c = hexCenter(q, r);
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i - 30) * Math.PI) / 180;
    return { x: c.x + HEX_SIZE * Math.cos(a), y: c.y + HEX_SIZE * Math.sin(a) };
  });
}
const key = (p) => `${Math.round(p.x)}_${Math.round(p.y)}`;

/** Grafo fijo: vértices (esquinas), aristas (lados) y sus relaciones. */
export const GRAPH = (() => {
  const vertices = {};
  const edges = {};
  const hexes = {};
  for (const [q, r] of HEX_COORDS) {
    const id = hexId(q, r);
    const pts = cornerPoints(q, r);
    const vids = pts.map((p) => {
      const k = `v${key(p)}`;
      vertices[k] ??= { id: k, x: Math.round(p.x), y: Math.round(p.y), hexes: [], edges: [], neighbors: [] };
      vertices[k].hexes.push(id);
      return k;
    });
    const eids = vids.map((v, i) => {
      const w = vids[(i + 1) % 6];
      const k = `e${[v, w].sort().join('|')}`;
      edges[k] ??= { id: k, v: [v, w].sort(), hexes: [] };
      edges[k].hexes.push(id);
      return k;
    });
    hexes[id] = { id, q, r, ...hexCenter(q, r), vertices: vids, edges: eids };
  }
  for (const e of Object.values(edges)) {
    const [a, b] = e.v;
    vertices[a].edges.push(e.id);
    vertices[b].edges.push(e.id);
    vertices[a].neighbors.push(b);
    vertices[b].neighbors.push(a);
  }
  // Costa: aristas de un solo hexágono, ordenadas alrededor de la isla.
  const coast = Object.values(edges).filter((e) => e.hexes.length === 1);
  const angle = (e) => {
    const [a, b] = e.v.map((v) => vertices[v]);
    return Math.atan2((a.y + b.y) / 2, (a.x + b.x) / 2);
  };
  coast.sort((a, b) => angle(a) - angle(b));
  return { vertices, edges, hexes, coast: coast.map((e) => e.id) };
})();

/** Posiciones de los 9 puertos sobre las 30 aristas de costa (separación 3-4-3 como el marco clásico). */
const HARBOR_SLOTS = [0, 3, 7, 10, 13, 17, 20, 23, 27];
const HARBOR_BAG = ['3:1', '3:1', '3:1', '3:1', 'madera', 'ladrillo', 'lana', 'trigo', 'mineral'];

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tablero variable: terrenos al azar, fichas en espiral saltando el desierto
 * y sin 6 u 8 vecinos (si pasa, se vuelve a mezclar).
 */
export function generateBoard(rng) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const terrains = shuffle(TERRAIN_BAG, rng);
    const tiles = {};
    let t = 0;
    HEX_COORDS.forEach(([q, r], i) => {
      const terrain = terrains[i];
      tiles[hexId(q, r)] = { terrain, resource: TERRAIN[terrain], number: terrain === 'desierto' ? null : TOKENS_SPIRAL[t++] };
    });
    const red = Object.entries(tiles).filter(([, x]) => x.number === 6 || x.number === 8).map(([id]) => id);
    const touching = red.some((a) => red.some((b) => a !== b && GRAPH.hexes[a].vertices.some((v) => GRAPH.hexes[b].vertices.includes(v))));
    if (touching) continue;
    const harbors = {};
    shuffle(HARBOR_BAG, rng).forEach((type, i) => (harbors[GRAPH.coast[HARBOR_SLOTS[i]]] = type));
    return { tiles, harbors };
  }
  throw new Error('No se pudo generar el tablero.');
}

/** Puertos a los que tiene acceso un vértice. */
export function harborsOfVertex(harbors, vid) {
  return GRAPH.vertices[vid].edges.filter((e) => harbors[e]).map((e) => harbors[e]);
}
