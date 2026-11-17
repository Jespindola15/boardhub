/**
 * Motor de Colonias — reglas del juego básico de colonos en una isla (3–4 jugadores). JS puro.
 * Especificación: docs/reglas/colonias/ESPECIFICACION.md
 */
import { GRAPH, RESOURCES, generateBoard, harborsOfVertex } from './board.js';

export const ACTIONS = {
  PLACE_SETTLEMENT: 'PLACE_SETTLEMENT', // { vertex } (preparación)
  PLACE_ROAD: 'PLACE_ROAD', // { edge } (preparación)
  ROLL: 'ROLL',
  DISCARD: 'DISCARD', // { cards: { recurso: n } }
  MOVE_ROBBER: 'MOVE_ROBBER', // { hex, victim? }
  BUILD_ROAD: 'BUILD_ROAD', // { edge }
  BUILD_SETTLEMENT: 'BUILD_SETTLEMENT', // { vertex }
  BUILD_CITY: 'BUILD_CITY', // { vertex }
  BUY_DEV: 'BUY_DEV',
  PLAY_KNIGHT: 'PLAY_KNIGHT',
  PLAY_ROAD_BUILDING: 'PLAY_ROAD_BUILDING',
  PLAY_YEAR_OF_PLENTY: 'PLAY_YEAR_OF_PLENTY', // { resources: [a, b] }
  PLAY_MONOPOLY: 'PLAY_MONOPOLY', // { resource }
  BANK_TRADE: 'BANK_TRADE', // { give, get }
  OFFER_TRADE: 'OFFER_TRADE', // { to, give: {..}, get: {..} }
  ACCEPT_TRADE: 'ACCEPT_TRADE',
  REJECT_TRADE: 'REJECT_TRADE',
  CANCEL_TRADE: 'CANCEL_TRADE',
  END_TURN: 'END_TURN',
  LEAVE: 'LEAVE',
};

export const COSTS = {
  road: { madera: 1, ladrillo: 1 },
  settlement: { madera: 1, ladrillo: 1, lana: 1, trigo: 1 },
  city: { trigo: 2, mineral: 3 },
  dev: { lana: 1, trigo: 1, mineral: 1 },
};
const PIECES = { road: 15, settlement: 5, city: 4 };
const DEV_DECK = [...Array(14).fill('caballero'), ...Array(5).fill('punto'), ...Array(2).fill('caminos'), ...Array(2).fill('abundancia'), ...Array(2).fill('monopolio')];
export const WIN_POINTS = 10;

class RuleError extends Error {}
const fail = (m) => {
  throw new RuleError(m);
};
const check = (c, m) => {
  if (!c) fail(m);
};

function log(s, text) {
  s.log.push({ id: `l${s.seq++}`, text });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}
const event = (s, data) => (s.lastEvent = { seq: s.seq++, ...data });
const P = (s, id) => s.players.find((p) => p.id === id);
const current = (s) => s.players[s.turnIndex];
const V = (id) => GRAPH.vertices[id];
const E = (id) => GRAPH.edges[id];
const total = (res) => RESOURCES.reduce((t, r) => t + (res[r] ?? 0), 0);
const fmt = (res) =>
  RESOURCES.filter((r) => res[r])
    .map((r) => `${res[r]} ${r}`)
    .join(', ');

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function validateOptions() {
  return {};
}

/* ------------------------------------------------------------------ */
/* Preparación                                                         */
/* ------------------------------------------------------------------ */

export function setup({ id = 'local', players, rng = Math.random }) {
  check(players?.length >= 3 && players.length <= 4, 'Colonias (juego básico) es para 3 o 4 jugadores.');
  const board = generateBoard(rng);
  const desert = Object.keys(board.tiles).find((h) => board.tiles[h].terrain === 'desierto');
  const n = players.length;
  const first = Math.floor(rng() * n);
  const order = Array.from({ length: n }, (_, k) => (first + k) % n);
  const s = {
    gameId: 'colonias',
    id,
    version: 0,
    seq: 1,
    tiles: board.tiles,
    harbors: board.harbors,
    robber: desert,
    buildings: {}, // vértice → { owner, type: 'settlement' | 'city' }
    roads: {}, // arista → owner
    bank: Object.fromEntries(RESOURCES.map((r) => [r, 19])),
    devDeck: shuffle(DEV_DECK, rng),
    players: players.map((p) => ({ id: p.id, name: p.name, colorId: p.colorId, res: Object.fromEntries(RESOURCES.map((r) => [r, 0])), dev: [], knights: 0, left: false })),
    phase: 'setup',
    setupQueue: [...order, ...[...order].reverse()],
    setupStep: 'settlement',
    setupLast: null,
    turnIndex: order[0],
    turn: null,
    dice: null,
    longestRoad: null,
    largestArmy: null,
    winners: [],
    log: [],
    lastEvent: null,
  };
  log(s, `Preparación: ${s.players[order[0]].name} empieza. Cada uno coloca un poblado y un camino; en la segunda vuelta, en orden inverso.`);
  return s;
}

/* ------------------------------------------------------------------ */
/* Utilidades de reglas                                                */
/* ------------------------------------------------------------------ */

const canAfford = (p, cost) => Object.entries(cost).every(([r, n]) => (p.res[r] ?? 0) >= n);
function pay(s, p, cost) {
  for (const [r, n] of Object.entries(cost)) {
    p.res[r] -= n;
    s.bank[r] += n;
  }
}
function give(s, p, r, n) {
  p.res[r] += n;
  s.bank[r] -= n;
}
const countPieces = (s, pid, type) => (type === 'road' ? Object.values(s.roads).filter((o) => o === pid).length : Object.values(s.buildings).filter((b) => b.owner === pid && b.type === type).length);

/** Regla de la distancia: ningún edificio en el vértice ni en los vecinos. */
const distanceOk = (s, vid) => !s.buildings[vid] && V(vid).neighbors.every((n) => !s.buildings[n]);

/** ¿Un camino en esta arista conecta con la red del jugador? */
function roadConnects(s, pid, eid) {
  return E(eid).v.some((v) => {
    const b = s.buildings[v];
    if (b?.owner === pid) return true;
    if (b && b.owner !== pid) return false; // un edificio ajeno corta la conexión
    return V(v).edges.some((e) => e !== eid && s.roads[e] === pid);
  });
}

const settlementConnected = (s, pid, vid) => V(vid).edges.some((e) => s.roads[e] === pid);

/** Camino continuo más largo de un jugador (no se atraviesan edificios ajenos). */
export function longestRoadOf(s, pid) {
  const mine = Object.keys(s.roads).filter((e) => s.roads[e] === pid);
  let best = 0;
  const used = new Set();
  const blocked = (v) => s.buildings[v] && s.buildings[v].owner !== pid;
  const dfs = (v, len) => {
    best = Math.max(best, len);
    if (len > 0 && blocked(v)) return;
    for (const e of V(v).edges) {
      if (s.roads[e] !== pid || used.has(e)) continue;
      used.add(e);
      const w = E(e).v[0] === v ? E(e).v[1] : E(e).v[0];
      dfs(w, len + 1);
      used.delete(e);
    }
  };
  for (const e of mine) for (const v of E(e).v) dfs(v, 0);
  return best;
}

function updateLongestRoad(s) {
  const lens = Object.fromEntries(s.players.filter((p) => !p.left).map((p) => [p.id, longestRoadOf(s, p.id)]));
  const max = Math.max(0, ...Object.values(lens));
  const holder = s.longestRoad;
  if (holder && lens[holder] === max && max >= 5) return;
  const top = Object.keys(lens).filter((id) => lens[id] === max);
  const next = max >= 5 && top.length === 1 ? top[0] : null;
  if (next !== holder) {
    s.longestRoad = next;
    if (next) log(s, `${P(s, next).name} tiene el Gran Camino (${max}).`);
    else if (holder) log(s, 'El Gran Camino queda sin dueño.');
  }
}

function updateLargestArmy(s, p) {
  if (p.knights < 3) return;
  const holder = s.largestArmy ? P(s, s.largestArmy) : null;
  if (!holder || (holder.id !== p.id && p.knights > holder.knights)) {
    s.largestArmy = p.id;
    log(s, `${p.name} tiene el Gran Ejército (${p.knights} caballeros).`);
  }
}

export function publicPoints(s, pid) {
  let pts = 0;
  for (const b of Object.values(s.buildings)) if (b.owner === pid) pts += b.type === 'city' ? 2 : 1;
  if (s.longestRoad === pid) pts += 2;
  if (s.largestArmy === pid) pts += 2;
  return pts;
}
const hiddenPoints = (p) => p.dev.filter((d) => d.type === 'punto').length;
export const totalPoints = (s, p) => publicPoints(s, p.id) + hiddenPoints(p);

function checkWin(s) {
  const p = current(s);
  if (s.phase === 'playing' && totalPoints(s, p) >= WIN_POINTS) {
    s.phase = 'finished';
    s.winners = [p.id];
    log(s, `¡${p.name} llega a ${totalPoints(s, p)} puntos y gana!`);
    event(s, { type: 'game-over', winners: s.winners });
  }
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */

export function applyAction(state, action, rng = Math.random) {
  try {
    const handler = HANDLERS[action?.type];
    check(handler, `Acción desconocida: ${action?.type}`);
    check(state.phase !== 'finished', 'La partida terminó.');
    const s = structuredClone(state);
    const p = P(s, action.playerId);
    check(p && !p.left, 'Jugador no válido.');
    handler(s, p, action.payload ?? {}, rng);
    if (s.phase === 'playing') checkWin(s);
    s.version += 1;
    return { ok: true, state: s };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
}

function requireMain(s, p) {
  check(s.phase === 'playing', 'Todavía es la preparación.');
  check(current(s).id === p.id, 'No es tu turno.');
  check(s.turn.step === 'main', s.turn.step === 'roll' ? 'Primero tirá los dados.' : 'Primero terminá lo pendiente.');
  check(!s.turn.trade, 'Hay una oferta de comercio esperando respuesta.');
}

function nextSetup(s) {
  s.setupQueue.shift();
  if (!s.setupQueue.length) {
    s.phase = 'playing';
    s.turnIndex = s.setupOrderFirst ?? s.turnIndex;
    startTurn(s);
    log(s, '¡Termina la preparación! Empieza la partida.');
    return;
  }
  s.turnIndex = s.setupQueue[0];
  s.setupStep = 'settlement';
}

function startTurn(s) {
  s.turn = { step: 'roll', devPlayed: false, boughtDev: [], freeRoads: 0, trade: null, discards: null };
}

function produce(s, roll) {
  const gains = {};
  for (const r of RESOURCES) {
    const want = {};
    for (const [hid, tile] of Object.entries(s.tiles)) {
      if (tile.number !== roll || hid === s.robber || tile.resource !== r) continue;
      for (const v of GRAPH.hexes[hid].vertices) {
        const b = s.buildings[v];
        if (b && !P(s, b.owner).left) want[b.owner] = (want[b.owner] ?? 0) + (b.type === 'city' ? 2 : 1);
      }
    }
    const need = Object.values(want).reduce((a, b) => a + b, 0);
    if (!need) continue;
    const owners = Object.keys(want);
    if (need > s.bank[r]) {
      // Escasez: si no alcanza para todos, nadie cobra; si es un solo jugador, cobra lo que quede.
      if (owners.length === 1 && s.bank[r] > 0) want[owners[0]] = s.bank[r];
      else {
        log(s, `No alcanza el ${r} del banco: nadie lo cobra.`);
        continue;
      }
    }
    for (const [pid, n] of Object.entries(want)) {
      give(s, P(s, pid), r, n);
      (gains[pid] ??= {})[r] = n;
    }
  }
  return gains;
}

function stealCandidates(s, hex, pid) {
  const set = new Set();
  for (const v of GRAPH.hexes[hex].vertices) {
    const b = s.buildings[v];
    if (b && b.owner !== pid && !P(s, b.owner).left) set.add(b.owner);
  }
  return [...set];
}

function beginRobber(s, after) {
  s.turn.step = 'robber';
  s.turn.afterRobber = after;
}

const HANDLERS = {
  [ACTIONS.PLACE_SETTLEMENT](s, p, { vertex }) {
    check(s.phase === 'setup', 'Ya terminó la preparación.');
    check(current(s).id === p.id, 'No es tu turno.');
    check(s.setupStep === 'settlement', 'Ahora tenés que poner un camino.');
    check(V(vertex), 'Vértice desconocido.');
    check(distanceOk(s, vertex), 'Muy cerca de otro poblado (regla de la distancia).');
    s.buildings[vertex] = { owner: p.id, type: 'settlement' };
    s.setupLast = vertex;
    s.setupStep = 'road';
    const second = s.setupQueue.length <= s.players.length;
    if (second) {
      // Recursos iniciales del segundo poblado.
      const got = {};
      for (const h of V(vertex).hexes) {
        const r = s.tiles[h].resource;
        if (r && s.bank[r] > 0) {
          give(s, p, r, 1);
          got[r] = (got[r] ?? 0) + 1;
        }
      }
      if (total(got)) log(s, `${p.name} recibe ${fmt(got)}.`);
    }
    log(s, `${p.name} funda un poblado.`);
    event(s, { type: 'build', what: 'settlement', vertex, playerId: p.id });
  },

  [ACTIONS.PLACE_ROAD](s, p, { edge }) {
    check(s.phase === 'setup', 'Ya terminó la preparación.');
    check(current(s).id === p.id, 'No es tu turno.');
    check(s.setupStep === 'road', 'Primero poné un poblado.');
    check(E(edge) && !s.roads[edge], 'Lado ocupado o desconocido.');
    check(E(edge).v.includes(s.setupLast), 'El camino tiene que salir del poblado que acabás de poner.');
    s.roads[edge] = p.id;
    event(s, { type: 'build', what: 'road', edge, playerId: p.id });
    if (s.setupOrderFirst == null) s.setupOrderFirst = s.turnIndex;
    nextSetup(s);
  },

  [ACTIONS.ROLL](s, p, _x, rng) {
    check(s.phase === 'playing' && current(s).id === p.id, 'No es tu turno.');
    check(s.turn.step === 'roll', 'Ya tiraste los dados.');
    const d = [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
    const sum = d[0] + d[1];
    s.dice = d;
    log(s, `${p.name} tira ${d[0]} + ${d[1]} = ${sum}.`);
    if (sum === 7) {
      const discards = {};
      for (const x of s.players) if (!x.left && total(x.res) > 7) discards[x.id] = Math.floor(total(x.res) / 2);
      event(s, { type: 'roll', dice: d, playerId: p.id, seven: true });
      if (Object.keys(discards).length) {
        s.turn.step = 'discard';
        s.turn.discards = discards;
        log(s, `Con más de 7 cartas descartan la mitad: ${Object.keys(discards).map((id) => P(s, id).name).join(', ')}.`);
      } else beginRobber(s, 'main');
      return;
    }
    const gains = produce(s, sum);
    for (const [pid, g] of Object.entries(gains)) log(s, `${P(s, pid).name} recibe ${fmt(g)}.`);
    event(s, { type: 'roll', dice: d, playerId: p.id, gains });
    s.turn.step = 'main';
  },

  [ACTIONS.DISCARD](s, p, { cards = {} }) {
    check(s.phase === 'playing' && s.turn.step === 'discard', 'No hay que descartar.');
    const need = s.turn.discards?.[p.id];
    check(need, 'No tenés que descartar.');
    check(RESOURCES.every((r) => (cards[r] ?? 0) >= 0 && (cards[r] ?? 0) <= p.res[r]) && total(cards) === need, `Tenés que descartar exactamente ${need}.`);
    for (const r of RESOURCES) if (cards[r]) {
      p.res[r] -= cards[r];
      s.bank[r] += cards[r];
    }
    delete s.turn.discards[p.id];
    log(s, `${p.name} descarta ${need}.`);
    if (!Object.keys(s.turn.discards).length) beginRobber(s, 'main');
  },

  [ACTIONS.MOVE_ROBBER](s, p, { hex, victim }, rng) {
    check(s.phase === 'playing' && current(s).id === p.id, 'No es tu turno.');
    check(s.turn.step === 'robber', 'Ahora no se mueve el ladrón.');
    check(GRAPH.hexes[hex], 'Hexágono desconocido.');
    check(hex !== s.robber, 'Tenés que mover el ladrón a otro hexágono.');
    const cands = stealCandidates(s, hex, p.id);
    if (cands.length) check(cands.includes(victim), 'Elegí a quién robarle.');
    s.robber = hex;
    log(s, `${p.name} mueve el ladrón.`);
    if (cands.length) {
      const v = P(s, victim);
      const pool = RESOURCES.flatMap((r) => Array(v.res[r]).fill(r));
      if (pool.length) {
        const r = pool[Math.floor(rng() * pool.length)];
        v.res[r] -= 1;
        p.res[r] += 1;
        log(s, `${p.name} le roba una carta a ${v.name}.`);
        event(s, { type: 'steal', from: v.id, to: p.id, resource: r });
      } else log(s, `${v.name} no tiene cartas para robar.`);
    }
    s.turn.step = s.turn.afterRobber ?? 'main';
    s.turn.afterRobber = null;
  },

  [ACTIONS.BUILD_ROAD](s, p, { edge }) {
    check(s.phase === 'playing' && current(s).id === p.id, 'No es tu turno.');
    const free = s.turn.step === 'road-building';
    if (!free) requireMain(s, p);
    check(E(edge) && !s.roads[edge], 'Ese lado ya tiene camino.');
    check(roadConnects(s, p.id, edge), 'El camino tiene que conectar con tus caminos o poblados.');
    check(countPieces(s, p.id, 'road') < PIECES.road, 'No te quedan caminos.');
    if (!free) {
      check(canAfford(p, COSTS.road), 'Te falta madera o ladrillo.');
      pay(s, p, COSTS.road);
    }
    s.roads[edge] = p.id;
    log(s, `${p.name} construye un camino.`);
    event(s, { type: 'build', what: 'road', edge, playerId: p.id });
    updateLongestRoad(s);
    if (free) {
      s.turn.freeRoads -= 1;
      const more = s.turn.freeRoads > 0 && countPieces(s, p.id, 'road') < PIECES.road && Object.keys(GRAPH.edges).some((e) => !s.roads[e] && roadConnects(s, p.id, e));
      if (!more) {
        s.turn.freeRoads = 0;
        s.turn.step = s.turn.afterRoads ?? 'main';
      }
    }
  },

  [ACTIONS.BUILD_SETTLEMENT](s, p, { vertex }) {
    requireMain(s, p);
    check(V(vertex), 'Vértice desconocido.');
    check(distanceOk(s, vertex), 'Muy cerca de otro poblado (regla de la distancia).');
    check(settlementConnected(s, p.id, vertex), 'El poblado tiene que estar junto a uno de tus caminos.');
    check(countPieces(s, p.id, 'settlement') < PIECES.settlement, 'No te quedan poblados.');
    check(canAfford(p, COSTS.settlement), 'Te faltan recursos (madera, ladrillo, lana y trigo).');
    pay(s, p, COSTS.settlement);
    s.buildings[vertex] = { owner: p.id, type: 'settlement' };
    log(s, `${p.name} funda un poblado.`);
    event(s, { type: 'build', what: 'settlement', vertex, playerId: p.id });
    updateLongestRoad(s); // puede cortar el camino de otro
  },

  [ACTIONS.BUILD_CITY](s, p, { vertex }) {
    requireMain(s, p);
    const b = s.buildings[vertex];
    check(b && b.owner === p.id && b.type === 'settlement', 'Las ciudades se hacen sobre un poblado tuyo.');
    check(countPieces(s, p.id, 'city') < PIECES.city, 'No te quedan ciudades.');
    check(canAfford(p, COSTS.city), 'Te faltan recursos (2 trigo y 3 mineral).');
    pay(s, p, COSTS.city);
    b.type = 'city';
    log(s, `${p.name} amplía un poblado a ciudad.`);
    event(s, { type: 'build', what: 'city', vertex, playerId: p.id });
  },

  [ACTIONS.BUY_DEV](s, p) {
    requireMain(s, p);
    check(s.devDeck.length, 'No quedan cartas de desarrollo.');
    check(canAfford(p, COSTS.dev), 'Te faltan recursos (lana, trigo y mineral).');
    pay(s, p, COSTS.dev);
    const type = s.devDeck.pop();
    p.dev.push({ type, turnBought: s.turnCounter ?? 0 });
    s.turn.boughtDev.push(type);
    log(s, `${p.name} compra una carta de desarrollo.`);
    event(s, { type: 'buy-dev', playerId: p.id });
  },

  [ACTIONS.PLAY_KNIGHT](s, p) {
    playDev(s, p, 'caballero', true);
    p.knights += 1;
    log(s, `${p.name} juega un caballero.`);
    updateLargestArmy(s, p);
    beginRobber(s, s.turn.step === 'roll' ? 'roll' : 'main');
  },

  [ACTIONS.PLAY_ROAD_BUILDING](s, p) {
    check(countPieces(s, p.id, 'road') < PIECES.road, 'No te quedan caminos.');
    check(Object.keys(GRAPH.edges).some((e) => !s.roads[e] && roadConnects(s, p.id, e)), 'No tenés dónde construir caminos.');
    playDev(s, p, 'caminos');
    log(s, `${p.name} juega Construcción de caminos.`);
    s.turn.freeRoads = 2;
    s.turn.afterRoads = 'main';
    s.turn.step = 'road-building';
  },

  [ACTIONS.PLAY_YEAR_OF_PLENTY](s, p, { resources = [] }) {
    check(resources.length === 2 && resources.every((r) => RESOURCES.includes(r)), 'Elegí dos recursos.');
    const need = {};
    for (const r of resources) need[r] = (need[r] ?? 0) + 1;
    check(Object.entries(need).every(([r, n]) => s.bank[r] >= n), 'El banco no tiene esos recursos.');
    playDev(s, p, 'abundancia');
    for (const [r, n] of Object.entries(need)) give(s, p, r, n);
    log(s, `${p.name} juega Año de abundancia: ${fmt(need)}.`);
  },

  [ACTIONS.PLAY_MONOPOLY](s, p, { resource }) {
    check(RESOURCES.includes(resource), 'Elegí un recurso.');
    playDev(s, p, 'monopolio');
    let got = 0;
    for (const x of s.players) if (x.id !== p.id) {
      got += x.res[resource];
      p.res[resource] += x.res[resource];
      x.res[resource] = 0;
    }
    log(s, `${p.name} juega Monopolio de ${resource} y se lleva ${got}.`);
    event(s, { type: 'monopoly', playerId: p.id, resource, got });
  },

  [ACTIONS.BANK_TRADE](s, p, { give: gr, get }) {
    requireMain(s, p);
    check(RESOURCES.includes(gr) && RESOURCES.includes(get) && gr !== get, 'Elegí qué das y qué recibís.');
    const rate = bankRate(s, p.id, gr);
    check(p.res[gr] >= rate, `Necesitás ${rate} de ${gr}.`);
    check(s.bank[get] > 0, `El banco no tiene ${get}.`);
    p.res[gr] -= rate;
    s.bank[gr] += rate;
    give(s, p, get, 1);
    log(s, `${p.name} cambia ${rate} ${gr} por 1 ${get} (${rate}:1).`);
  },

  [ACTIONS.OFFER_TRADE](s, p, { to, give: g = {}, get = {} }) {
    requireMain(s, p);
    const t = P(s, to);
    check(t && t.id !== p.id && !t.left, 'Elegí a quién le ofrecés.');
    const clean = (o) => Object.fromEntries(RESOURCES.filter((r) => (o[r] ?? 0) > 0).map((r) => [r, Math.floor(o[r])]));
    const G = clean(g);
    const R = clean(get);
    check(total(G) > 0 && total(R) > 0, 'Un intercambio tiene que dar y recibir algo.');
    check(RESOURCES.every((r) => !(G[r] && R[r])), 'No se da y se pide el mismo recurso.');
    check(Object.entries(G).every(([r, n]) => p.res[r] >= n), 'No tenés lo que ofrecés.');
    s.turn.trade = { from: p.id, to, give: G, get: R };
    log(s, `${p.name} le ofrece a ${t.name}: ${fmt(G)} por ${fmt(R)}.`);
    event(s, { type: 'offer', from: p.id, to });
  },

  [ACTIONS.ACCEPT_TRADE](s, p) {
    const tr = s.turn?.trade;
    check(tr && tr.to === p.id, 'No hay una oferta para vos.');
    const f = P(s, tr.from);
    check(Object.entries(tr.get).every(([r, n]) => p.res[r] >= n), 'No tenés lo que te piden.');
    check(Object.entries(tr.give).every(([r, n]) => f.res[r] >= n), 'Quien ofreció ya no tiene esas cartas.');
    for (const [r, n] of Object.entries(tr.give)) {
      f.res[r] -= n;
      p.res[r] += n;
    }
    for (const [r, n] of Object.entries(tr.get)) {
      p.res[r] -= n;
      f.res[r] += n;
    }
    s.turn.trade = null;
    log(s, `${p.name} acepta el intercambio con ${f.name}.`);
    event(s, { type: 'trade', from: f.id, to: p.id });
  },

  [ACTIONS.REJECT_TRADE](s, p) {
    const tr = s.turn?.trade;
    check(tr && tr.to === p.id, 'No hay una oferta para vos.');
    s.turn.trade = null;
    log(s, `${p.name} rechaza la oferta.`);
  },

  [ACTIONS.CANCEL_TRADE](s, p) {
    const tr = s.turn?.trade;
    check(tr && tr.from === p.id, 'No hay una oferta tuya.');
    s.turn.trade = null;
  },

  [ACTIONS.END_TURN](s, p) {
    requireMain(s, p);
    const n = s.players.length;
    let i = s.turnIndex;
    do i = (i + 1) % n;
    while (s.players[i].left);
    s.turnIndex = i;
    s.turnCounter = (s.turnCounter ?? 0) + 1;
    startTurn(s);
    event(s, { type: 'turn', playerId: current(s).id });
  },

  /** Política de plataforma: quien abandona sale con sus piezas; si queda uno, gana. */
  [ACTIONS.LEAVE](s, p) {
    p.left = true;
    for (const r of RESOURCES) {
      s.bank[r] += p.res[r];
      p.res[r] = 0;
    }
    log(s, `${p.name} abandona la partida.`);
    const rest = s.players.filter((x) => !x.left);
    if (rest.length === 1) {
      s.phase = 'finished';
      s.winners = [rest[0].id];
      return;
    }
    if (s.longestRoad === p.id) s.longestRoad = null;
    if (s.largestArmy === p.id) s.largestArmy = null;
    if (s.turn?.trade && (s.turn.trade.to === p.id || s.turn.trade.from === p.id)) s.turn.trade = null;
    if (s.turn?.discards) {
      delete s.turn.discards[p.id];
      if (s.turn.step === 'discard' && !Object.keys(s.turn.discards).length) beginRobber(s, 'main');
    }
    if (s.phase === 'setup') {
      s.setupQueue = s.setupQueue.filter((i) => !s.players[i].left);
      if (current(s).left) {
        if (!s.setupQueue.length) {
          s.phase = 'playing';
          startTurn(s);
        } else {
          s.turnIndex = s.setupQueue[0];
          s.setupStep = 'settlement';
        }
      }
      return;
    }
    if (current(s).id === p.id) {
      const n = s.players.length;
      let i = s.turnIndex;
      do i = (i + 1) % n;
      while (s.players[i].left);
      s.turnIndex = i;
      startTurn(s);
    }
  },
};

/** Una carta de desarrollo por turno; no la comprada en este turno; el caballero también antes de tirar. */
function playDev(s, p, type, beforeRoll = false) {
  check(s.phase === 'playing' && current(s).id === p.id, 'No es tu turno.');
  check(s.turn.step === 'main' || (beforeRoll && s.turn.step === 'roll'), 'Ahora no podés jugar cartas.');
  check(!s.turn.trade, 'Hay una oferta de comercio esperando respuesta.');
  check(!s.turn.devPlayed, 'Sólo una carta de desarrollo por turno.');
  const boughtNow = s.turn.boughtDev.filter((t) => t === type).length;
  const have = p.dev.filter((d) => d.type === type).length;
  check(have - boughtNow > 0, have ? 'No podés jugar una carta comprada en este turno.' : 'No tenés esa carta.');
  const i = p.dev.findIndex((d) => d.type === type);
  p.dev.splice(i, 1);
  s.turn.devPlayed = true;
  event(s, { type: 'dev', playerId: p.id, card: type });
}

export function bankRate(s, pid, resource) {
  let rate = 4;
  for (const [v, b] of Object.entries(s.buildings)) {
    if (b.owner !== pid) continue;
    for (const h of harborsOfVertex(s.harbors, v)) {
      if (h === '3:1') rate = Math.min(rate, 3);
      else if (h === resource) rate = 2;
    }
  }
  return rate;
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function getPendingDeciders(s) {
  if (s.phase === 'finished') return [];
  if (s.phase === 'playing' && s.turn.step === 'discard') return Object.keys(s.turn.discards);
  if (s.phase === 'playing' && s.turn.trade) return [s.turn.trade.to];
  return [current(s).id];
}

/** Lugares válidos para construir (los usa la interfaz y los tests). */
export function buildSpots(s, pid) {
  const all = Object.keys(GRAPH.vertices);
  if (s.phase === 'setup') {
    if (s.setupStep === 'settlement') return { settlements: all.filter((v) => distanceOk(s, v)), roads: [], cities: [] };
    return { settlements: [], roads: V(s.setupLast).edges.filter((e) => !s.roads[e]), cities: [] };
  }
  const left = (type) => countPieces(s, pid, type) < PIECES[type];
  return {
    settlements: left('settlement') ? all.filter((v) => distanceOk(s, v) && settlementConnected(s, pid, v)) : [],
    roads: left('road') ? Object.keys(GRAPH.edges).filter((e) => !s.roads[e] && roadConnects(s, pid, e)) : [],
    cities: left('city') ? all.filter((v) => s.buildings[v]?.owner === pid && s.buildings[v].type === 'settlement') : [],
  };
}

export function getLegalActions(s, playerId) {
  const p = P(s, playerId);
  if (!p || p.left || s.phase === 'finished') return [];
  const out = [];
  const t = s.turn;
  if (s.phase === 'setup') {
    if (current(s).id === playerId) out.push({ type: s.setupStep === 'settlement' ? ACTIONS.PLACE_SETTLEMENT : ACTIONS.PLACE_ROAD });
  } else if (t.step === 'discard') {
    if (t.discards[playerId]) out.push({ type: ACTIONS.DISCARD, count: t.discards[playerId] });
  } else if (t.trade) {
    if (t.trade.to === playerId) out.push({ type: ACTIONS.ACCEPT_TRADE }, { type: ACTIONS.REJECT_TRADE });
    if (t.trade.from === playerId) out.push({ type: ACTIONS.CANCEL_TRADE });
  } else if (current(s).id === playerId) {
    const canPlay = (type) => !t.devPlayed && p.dev.filter((d) => d.type === type).length > t.boughtDev.filter((x) => x === type).length;
    if (t.step === 'roll') {
      out.push({ type: ACTIONS.ROLL });
      if (canPlay('caballero')) out.push({ type: ACTIONS.PLAY_KNIGHT });
    } else if (t.step === 'robber') out.push({ type: ACTIONS.MOVE_ROBBER });
    else if (t.step === 'road-building') out.push({ type: ACTIONS.BUILD_ROAD, free: true });
    else if (t.step === 'main') {
      if (canAfford(p, COSTS.road)) out.push({ type: ACTIONS.BUILD_ROAD });
      if (canAfford(p, COSTS.settlement)) out.push({ type: ACTIONS.BUILD_SETTLEMENT });
      if (canAfford(p, COSTS.city)) out.push({ type: ACTIONS.BUILD_CITY });
      if (canAfford(p, COSTS.dev) && s.devDeck.length) out.push({ type: ACTIONS.BUY_DEV });
      if (canPlay('caballero')) out.push({ type: ACTIONS.PLAY_KNIGHT });
      if (canPlay('caminos')) out.push({ type: ACTIONS.PLAY_ROAD_BUILDING });
      if (canPlay('abundancia')) out.push({ type: ACTIONS.PLAY_YEAR_OF_PLENTY });
      if (canPlay('monopolio')) out.push({ type: ACTIONS.PLAY_MONOPOLY });
      out.push({ type: ACTIONS.BANK_TRADE }, { type: ACTIONS.OFFER_TRADE }, { type: ACTIONS.END_TURN });
    }
  }
  out.push({ type: ACTIONS.LEAVE });
  return out;
}

export function getPlayerView(s, viewerId) {
  const me = viewerId ? P(s, viewerId) : null;
  const end = s.phase === 'finished';
  return {
    gameId: s.gameId,
    version: s.version,
    phase: s.phase,
    me: viewerId,
    currentPlayerId: end ? null : current(s).id,
    setupStep: s.phase === 'setup' ? s.setupStep : null,
    setupLast: s.setupLast,
    tiles: s.tiles,
    harbors: s.harbors,
    robber: s.robber,
    buildings: s.buildings,
    roads: s.roads,
    bank: s.bank,
    devDeckCount: s.devDeck.length,
    dice: s.dice,
    turn: s.turn ? { step: s.turn.step, devPlayed: s.turn.devPlayed, freeRoads: s.turn.freeRoads, trade: s.turn.trade, discards: s.turn.discards } : null,
    longestRoad: s.longestRoad,
    largestArmy: s.largestArmy,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      colorId: p.colorId,
      left: p.left,
      cards: total(p.res),
      devCount: p.dev.length,
      knights: p.knights,
      points: end ? totalPoints(s, p) : publicPoints(s, p.id),
      roadLength: longestRoadOf(s, p.id),
      pieces: { road: PIECES.road - countPieces(s, p.id, 'road'), settlement: PIECES.settlement - countPieces(s, p.id, 'settlement'), city: PIECES.city - countPieces(s, p.id, 'city') },
    })),
    myRes: me ? me.res : null,
    myDev: me ? me.dev.map((d) => d.type) : [],
    myNewDev: me && s.turn && current(s).id === me.id ? s.turn.boughtDev : [],
    myPoints: me ? totalPoints(s, me) : 0,
    myRates: me ? Object.fromEntries(RESOURCES.map((r) => [r, bankRate(s, me.id, r)])) : null,
    spots: me && current(s)?.id === me.id ? buildSpots(s, me.id) : null,
    stealFrom: me && s.turn?.step === 'robber' && current(s).id === me.id ? Object.fromEntries(Object.keys(GRAPH.hexes).map((h) => [h, stealCandidates(s, h, me.id)])) : null,
    winners: s.winners,
    lastEvent: s.lastEvent,
    log: s.log.slice(-60),
    legal: getLegalActions(s, viewerId),
    deciders: getPendingDeciders(s),
  };
}

export const getResult = (s) => (s.phase === 'finished' ? { winners: s.winners, scores: Object.fromEntries(s.players.map((p) => [p.id, totalPoints(s, p)])) } : null);
export const removePlayer = (s, playerId, rng) => applyAction(s, { type: ACTIONS.LEAVE, playerId }, rng);

export const definition = {
  id: 'colonias',
  players: { min: 3, max: 4 },
  edition: 'Juego básico de colonos (3–4 jugadores)',
  setup,
  applyAction,
  getPlayerView,
  getLegalActions,
  getPendingDeciders,
  getResult,
  removePlayer,
  validateOptions,
};
