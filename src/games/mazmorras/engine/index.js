/**
 * Motor de Mazmorras y Traiciones — reglas del clásico juego de saqueo de mazmorras
 * (edición básica), con un catálogo de cartas propio. JS puro.
 * Especificación: docs/reglas/mazmorras/ESPECIFICACION.md
 */
import { CARDS, DOOR_IDS, TREASURE_IDS, WIN_LEVEL, RACE_NAMES, CLASS_NAMES } from '../data/cards.js';

export const ACTIONS = {
  KICK_DOOR: 'KICK_DOOR',
  LOOK_FOR_TROUBLE: 'LOOK_FOR_TROUBLE', // { cardId }
  LOOT: 'LOOT',
  PLAY_CARD: 'PLAY_CARD', // { cardId } objeto, raza, clase o "sube un nivel"
  EQUIP: 'EQUIP', // { cardId }
  UNEQUIP: 'UNEQUIP', // { cardId }
  SELL: 'SELL', // { cardIds }
  PLAY_CURSE: 'PLAY_CURSE', // { cardId, target }
  ASK_HELP: 'ASK_HELP', // { to, treasures }
  ANSWER_HELP: 'ANSWER_HELP', // { accept }
  PLAY_ONESHOT: 'PLAY_ONESHOT', // { cardId, side: 'players' | 'monsters' }
  PLAY_ENHANCER: 'PLAY_ENHANCER', // { cardId, monster }
  PLAY_WANDERING: 'PLAY_WANDERING', // { cardId, monsterCardId }
  POWER: 'POWER', // { power, cardIds, target? }
  FIGHT: 'FIGHT',
  PASS: 'PASS',
  RUN: 'RUN',
  END_TURN: 'END_TURN',
  CHARITY: 'CHARITY', // { cardIds }
  LEAVE: 'LEAVE',
};

class RuleError extends Error {}
const fail = (m) => {
  throw new RuleError(m);
};
const check = (c, m) => {
  if (!c) fail(m);
};

function log(s, text) {
  s.log.push({ id: `l${s.seq++}`, text });
  if (s.log.length > 150) s.log.splice(0, s.log.length - 150);
}
const event = (s, data) => (s.lastEvent = { seq: s.seq++, ...data });
const P = (s, id) => s.players.find((p) => p.id === id);
const current = (s) => s.players[s.turnIndex];
const C = (id) => CARDS[id];
const active = (s) => s.players.filter((p) => !p.left);
const raceOf = (p) => (p.race ? C(p.race).race : null);
const classOf = (p) => (p.cls ? C(p.cls).cls : null);

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
/* Mazos                                                               */
/* ------------------------------------------------------------------ */

function draw(s, deck, rng) {
  const pile = deck === 'door' ? 'doorDeck' : 'treasureDeck';
  const disc = deck === 'door' ? 'doorDiscard' : 'treasureDiscard';
  if (!s[pile].length) {
    s[pile] = shuffle(s[disc], rng);
    s[disc] = [];
  }
  return s[pile].pop() ?? null;
}
function discard(s, id) {
  if (!id) return;
  (C(id).deck === 'door' ? s.doorDiscard : s.treasureDiscard).push(id);
}
function deal(s, p, doors, treasures, rng) {
  for (let i = 0; i < doors; i++) {
    const c = draw(s, 'door', rng);
    if (c) p.hand.push(c);
  }
  for (let i = 0; i < treasures; i++) {
    const c = draw(s, 'treasure', rng);
    if (c) p.hand.push(c);
  }
}

/* ------------------------------------------------------------------ */
/* Preparación                                                         */
/* ------------------------------------------------------------------ */

export function setup({ id = 'local', players, rng = Math.random }) {
  check(players?.length >= 3 && players.length <= 6, 'Mazmorras y Traiciones se juega de 3 a 6.');
  const s = {
    gameId: 'mazmorras',
    id,
    version: 0,
    seq: 1,
    players: players.map((p) => ({ id: p.id, name: p.name, colorId: p.colorId, level: 1, hand: [], equipped: [], carried: [], race: null, cls: null, dead: false, left: false })),
    doorDeck: shuffle(DOOR_IDS, rng),
    treasureDeck: shuffle(TREASURE_IDS, rng),
    doorDiscard: [],
    treasureDiscard: [],
    turnIndex: Math.floor(rng() * players.length),
    turn: null,
    combat: null,
    phase: 'playing',
    winners: [],
    log: [],
    lastEvent: null,
  };
  for (const p of s.players) deal(s, p, 4, 4, rng);
  log(s, 'Cada aventurero recibe 4 cartas de puerta y 4 de tesoro. ¡Primero en llegar al nivel 10 gana!');
  startTurn(s, rng);
  return s;
}

function startTurn(s, rng) {
  const p = current(s);
  s.turn = { step: 'start', soldDouble: false, kicked: null };
  s.combat = null;
  if (p.dead) {
    p.dead = false;
    deal(s, p, 4, 4, rng);
    log(s, `${p.name} vuelve a la vida con cartas nuevas.`);
  }
  event(s, { type: 'turn', playerId: p.id });
}

function nextTurn(s, rng) {
  const n = s.players.length;
  let i = s.turnIndex;
  do i = (i + 1) % n;
  while (s.players[i].left);
  s.turnIndex = i;
  startTurn(s, rng);
}

/* ------------------------------------------------------------------ */
/* Equipo y fuerza                                                     */
/* ------------------------------------------------------------------ */

const handsUsed = (items) => items.reduce((t, id) => t + (C(id).slot === 'hand1' ? 1 : C(id).slot === 'hand2' ? 2 : 0), 0);

/** Motivo por el que no se puede equipar, o null. */
function equipProblem(p, id, list = p.equipped) {
  const c = C(id);
  if (c.only && c.only !== raceOf(p) && c.only !== classOf(p)) return `Sólo lo puede usar un ${RACE_NAMES[c.only] ?? CLASS_NAMES[c.only]}.`;
  const others = list.filter((x) => x !== id);
  if (['head', 'armor', 'feet'].includes(c.slot) && others.some((x) => C(x).slot === c.slot)) return 'Ya tenés algo equipado en esa zona.';
  if ((c.slot === 'hand1' || c.slot === 'hand2') && handsUsed(others) + (c.slot === 'hand2' ? 2 : 1) > 2) return 'No te quedan manos libres.';
  return null;
}
const bigCount = (p) => [...p.equipped, ...p.carried].filter((id) => C(id).big).length;
const usable = (p, id) => !C(id).only || C(id).only === raceOf(p) || C(id).only === classOf(p);
const itemBonus = (p) => p.equipped.reduce((t, id) => t + (usable(p, id) ? C(id).bonus : 0), 0);
export const strength = (p) => p.level + itemBonus(p);
const handLimit = (p) => (raceOf(p) === 'enano' ? 6 : 5);

function monsterLevel(s, m) {
  const c = C(m.cardId);
  let lv = c.level + m.enhancers.reduce((t, e) => t + C(e).bonus, 0);
  for (const pid of [s.combat.fighterId, s.combat.helperId].filter(Boolean)) {
    const p = P(s, pid);
    for (const [k, v] of Object.entries(c.bonusVs)) if (raceOf(p) === k || classOf(p) === k) lv += v;
  }
  return Math.max(1, lv);
}

export function combatTotals(s) {
  const cb = s.combat;
  if (!cb) return null;
  const f = P(s, cb.fighterId);
  const h = cb.helperId ? P(s, cb.helperId) : null;
  const players = strength(f) + (h ? strength(h) : 0) + cb.playerBonus;
  const monsters = cb.monsters.reduce((t, m) => t + monsterLevel(s, m), 0) + cb.monsterBonus;
  const tieWins = classOf(f) === 'guerrero';
  return { players, monsters, winning: players > monsters || (players === monsters && tieWins) };
}

/* ------------------------------------------------------------------ */
/* Desgracias y maldiciones                                            */
/* ------------------------------------------------------------------ */

function loseSlot(s, p, slot) {
  let lost;
  if (slot === 'any') lost = [...p.equipped].sort((a, b) => C(b).bonus - C(a).bonus).slice(0, 1);
  else if (slot === 'hands') lost = p.equipped.filter((id) => ['hand1', 'hand2'].includes(C(id).slot));
  else lost = p.equipped.filter((id) => C(id).slot === slot);
  for (const id of lost) {
    p.equipped = p.equipped.filter((x) => x !== id);
    discard(s, id);
  }
  return lost;
}

function applyBad(s, p, bad, rng) {
  switch (bad.type) {
    case 'level':
      p.level = Math.max(1, p.level - bad.n);
      break;
    case 'slot': {
      const lost = loseSlot(s, p, bad.slot);
      if (!lost.length) log(s, `${p.name} no tenía nada que perder ahí.`);
      break;
    }
    case 'cards': {
      const n = Math.min(bad.n, p.hand.length);
      for (let i = 0; i < n; i++) {
        const k = Math.floor(rng() * p.hand.length);
        discard(s, p.hand.splice(k, 1)[0]);
      }
      if (bad.alsoSlot) loseSlot(s, p, bad.alsoSlot);
      break;
    }
    case 'race':
      discard(s, p.race);
      p.race = null;
      fixEquipment(s, p);
      break;
    case 'class':
      discard(s, p.cls);
      p.cls = null;
      fixEquipment(s, p);
      break;
    case 'death':
      for (const id of [...p.hand, ...p.equipped, ...p.carried]) discard(s, id);
      p.hand = [];
      p.equipped = [];
      p.carried = [];
      p.dead = true;
      log(s, `💀 ${p.name} muere: pierde todo menos nivel, raza y clase.`);
      break;
    default:
  }
}

/** Tras perder raza/clase, lo que ya no se puede usar pasa a "llevado" (sin bonus). */
function fixEquipment(s, p) {
  for (const id of [...p.equipped]) if (C(id).only && equipProblem(p, id)) {
    p.equipped = p.equipped.filter((x) => x !== id);
    p.carried.push(id);
  }
  if (raceOf(p) !== 'enano') {
    const bigs = [...p.equipped, ...p.carried].filter((id) => C(id).big);
    for (const id of bigs.slice(1)) {
      p.equipped = p.equipped.filter((x) => x !== id);
      p.carried = p.carried.filter((x) => x !== id);
      discard(s, id);
      log(s, `${p.name} no puede cargar más de un objeto grande: descarta ${C(id).name}.`);
    }
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
    s.version += 1;
    return { ok: true, state: s };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
}

const myTurn = (s, p) => current(s).id === p.id;
const fromHand = (p, id, kind) => {
  check(p.hand.includes(id), 'No tenés esa carta en la mano.');
  if (kind) check([].concat(kind).includes(C(id).kind), 'Esa carta no sirve para eso.');
  p.hand = p.hand.filter((x) => x !== id);
  return C(id);
};
const inCombat = (s) => Boolean(s.combat);
const busy = (s) => s.combat?.helpOffer || s.turn.step === 'charity';

function startCombat(s, p, monsterId, fromKick) {
  s.combat = { fighterId: p.id, helperId: null, helperTreasures: 0, monsters: [{ cardId: monsterId, enhancers: [] }], playerBonus: 0, monsterBonus: 0, runBonus: 0, powers: { berserk: 0, turning: 0, flight: 0 }, backstabs: [], helpOffer: null, window: null, fromKick };
  s.turn.step = 'combat';
  const m = C(monsterId);
  log(s, `${p.name} enfrenta a ${m.name} (nivel ${m.level}).`);
  event(s, { type: 'combat', playerId: p.id, monster: monsterId });
}

/** Quién podría interferir ahora (tiene cartas que se juegan en combate). */
function canInterfere(s, p) {
  if (p.left || p.id === s.combat.fighterId || p.id === s.combat.helperId) return false;
  const kinds = p.hand.map((id) => C(id).kind);
  if (kinds.includes('oneshot') || kinds.includes('enhancer')) return true;
  if (kinds.includes('wandering') && kinds.includes('monster')) return true;
  if (classOf(p) === 'ladron' && p.hand.length) return true;
  return false;
}

function resetWindow(s) {
  if (s.combat?.window) {
    s.combat.window = null;
    log(s, 'Alguien se metió en el combate: hay que volver a pelear.');
  }
}

function resolveWin(s, rng, { charm = false } = {}) {
  const cb = s.combat;
  const f = P(s, cb.fighterId);
  const h = cb.helperId ? P(s, cb.helperId) : null;
  let treasures = 0;
  let levels = 0;
  for (const m of cb.monsters) {
    treasures += Math.max(0, C(m.cardId).treasures + m.enhancers.reduce((t, e) => t + C(e).treasures, 0));
    levels += C(m.cardId).levels;
    discard(s, m.cardId);
    m.enhancers.forEach((e) => discard(s, e));
  }
  if (!charm) {
    f.level += levels;
    log(s, `¡${f.name} gana el combate y sube ${levels} nivel${levels > 1 ? 'es' : ''}!`);
    if (h && raceOf(h) === 'elfo' && h.level < WIN_LEVEL - 1) {
      h.level += 1;
      log(s, `${h.name} es elfo y sube un nivel por ayudar.`);
    }
  } else log(s, `${f.name} encanta al monstruo y se lleva su tesoro.`);
  const toHelper = h ? Math.min(cb.helperTreasures, treasures) : 0;
  for (let i = 0; i < treasures; i++) {
    const c = draw(s, 'treasure', rng);
    if (!c) break;
    (i < toHelper ? h : f).hand.push(c);
  }
  log(s, `Botín: ${treasures} tesoro${treasures === 1 ? '' : 's'}${toHelper ? ` (${toHelper} para ${h.name})` : ''}.`);
  event(s, { type: 'win', playerId: f.id, treasures });
  s.combat = null;
  s.turn.step = 'end';
  if (f.level >= WIN_LEVEL) {
    f.level = WIN_LEVEL;
    s.phase = 'finished';
    s.winners = [f.id];
    log(s, `🏆 ¡${f.name} llega al nivel 10 y gana!`);
  }
}

function resolveRun(s, rng) {
  const cb = s.combat;
  const runners = [cb.fighterId, cb.helperId].filter(Boolean).map((id) => P(s, id));
  const rolls = [];
  for (const m of cb.monsters) {
    const mc = C(m.cardId);
    for (const r of runners) {
      if (r.dead) continue;
      const bonus = (raceOf(r) === 'elfo' ? 1 : 0) + r.equipped.reduce((t, id) => t + (C(id).run ?? 0), 0) + (r.id === cb.fighterId ? cb.runBonus : 0);
      const d = 1 + Math.floor(rng() * 6);
      const ok = d + bonus >= 5;
      rolls.push({ playerId: r.id, monster: m.cardId, die: d, bonus, ok });
      log(s, `${r.name} intenta huir de ${mc.name}: ${d}${bonus ? ` + ${bonus}` : ''} → ${ok ? 'escapa' : `no escapa. ${mc.bad.text}`}`);
      if (!ok) applyBad(s, r, mc.bad, rng);
    }
    discard(s, m.cardId);
    m.enhancers.forEach((e) => discard(s, e));
  }
  event(s, { type: 'run', rolls });
  s.combat = null;
  s.turn.step = 'end';
}

const HANDLERS = {
  [ACTIONS.KICK_DOOR](s, p, _x, rng) {
    check(myTurn(s, p) && s.turn.step === 'start', 'Ahora no podés abrir la puerta.');
    const id = draw(s, 'door', rng);
    check(id, 'No quedan puertas.');
    const c = C(id);
    s.turn.kicked = id;
    log(s, `${p.name} patea la puerta: ¡${c.name}!`);
    event(s, { type: 'door', playerId: p.id, cardId: id });
    if (c.kind === 'monster') return startCombat(s, p, id, true);
    if (c.kind === 'curse') {
      log(s, `${c.text}`);
      applyBad(s, p, c.effect, rng);
      discard(s, id);
    } else p.hand.push(id);
    s.turn.step = 'after-door';
  },

  [ACTIONS.LOOK_FOR_TROUBLE](s, p, { cardId }) {
    check(myTurn(s, p) && s.turn.step === 'after-door', 'Sólo después de abrir una puerta sin monstruo.');
    fromHand(p, cardId, 'monster');
    log(s, `${p.name} busca problemas.`);
    startCombat(s, p, cardId, false);
  },

  [ACTIONS.LOOT](s, p, _x, rng) {
    check(myTurn(s, p) && s.turn.step === 'after-door', 'Sólo después de abrir una puerta sin monstruo.');
    const id = draw(s, 'door', rng);
    if (id) p.hand.push(id);
    log(s, `${p.name} saquea la habitación (roba una puerta boca abajo).`);
    s.turn.step = 'end';
  },

  [ACTIONS.PLAY_CARD](s, p, { cardId }) {
    const c = C(cardId);
    check(c && p.hand.includes(cardId), 'No tenés esa carta en la mano.');
    if (c.kind === 'levelup') {
      check(p.level < WIN_LEVEL - 1, 'El nivel 10 sólo se alcanza matando un monstruo.');
      fromHand(p, cardId);
      p.level += 1;
      discard(s, cardId);
      log(s, `${p.name} juega ${c.name} y sube al nivel ${p.level}.`);
      return;
    }
    check(myTurn(s, p) && !inCombat(s) && !busy(s), 'Esto se juega en tu turno, fuera de combate.');
    if (c.kind === 'race' || c.kind === 'class') {
      fromHand(p, cardId);
      const key = c.kind === 'race' ? 'race' : 'cls';
      discard(s, p[key]);
      p[key] = cardId;
      fixEquipment(s, p);
      log(s, `${p.name} ahora es ${c.name}.`);
      return;
    }
    check(c.kind === 'item', 'Esa carta no se juega así.');
    check(!c.big || raceOf(p) === 'enano' || bigCount(p) === 0, 'Sólo podés tener un objeto grande (salvo los enanos).');
    fromHand(p, cardId);
    if (equipProblem(p, cardId) === null) {
      p.equipped.push(cardId);
      log(s, `${p.name} se equipa ${c.name} (+${c.bonus}).`);
    } else {
      p.carried.push(cardId);
      log(s, `${p.name} lleva ${c.name} (sin equipar).`);
    }
  },

  [ACTIONS.EQUIP](s, p, { cardId }) {
    check(myTurn(s, p) && !inCombat(s) && !busy(s), 'El equipo se cambia en tu turno, fuera de combate.');
    check(p.carried.includes(cardId), 'No llevás ese objeto.');
    const why = equipProblem(p, cardId);
    check(!why, why);
    p.carried = p.carried.filter((x) => x !== cardId);
    p.equipped.push(cardId);
  },

  [ACTIONS.UNEQUIP](s, p, { cardId }) {
    check(myTurn(s, p) && !inCombat(s) && !busy(s), 'El equipo se cambia en tu turno, fuera de combate.');
    check(p.equipped.includes(cardId), 'No tenés ese objeto equipado.');
    p.equipped = p.equipped.filter((x) => x !== cardId);
    p.carried.push(cardId);
  },

  [ACTIONS.SELL](s, p, { cardIds = [] }) {
    check(myTurn(s, p) && !inCombat(s) && !busy(s), 'Se vende en tu turno, fuera de combate.');
    const ids = [...new Set(cardIds)];
    check(ids.length, 'Elegí qué vender.');
    let gold = 0;
    let doubled = null;
    for (const id of ids) {
      check(p.hand.includes(id) || p.equipped.includes(id) || p.carried.includes(id), 'No tenés esa carta.');
      check(C(id).gold, `${C(id).name} no se puede vender.`);
      gold += C(id).gold;
    }
    if (raceOf(p) === 'mediano' && !s.turn.soldDouble) {
      doubled = ids.reduce((best, id) => (C(id).gold > (best ? C(best).gold : 0) ? id : best), null);
      gold += C(doubled).gold;
    }
    const levels = Math.floor(gold / 1000);
    check(levels >= 1, `Con ${gold} de oro no alcanza para un nivel (1000).`);
    check(p.level + levels <= WIN_LEVEL - 1, 'Vendiendo no se puede llegar al nivel 10.');
    for (const id of ids) {
      p.hand = p.hand.filter((x) => x !== id);
      p.equipped = p.equipped.filter((x) => x !== id);
      p.carried = p.carried.filter((x) => x !== id);
      discard(s, id);
    }
    if (doubled) s.turn.soldDouble = true;
    p.level += levels;
    log(s, `${p.name} vende objetos por ${gold} de oro y sube ${levels} nivel${levels > 1 ? 'es' : ''}${doubled ? ' (mediano: uno al doble)' : ''}.`);
  },

  [ACTIONS.PLAY_CURSE](s, p, { cardId, target }, rng) {
    const t = P(s, target);
    check(t && !t.left, 'Elegí a quién maldecir.');
    check(!busy(s), 'Esperá un momento.');
    const c = fromHand(p, cardId, 'curse');
    log(s, `${p.name} maldice a ${t.name}: ${c.name}. ${c.text}`);
    applyBad(s, t, c.effect, rng);
    discard(s, cardId);
    event(s, { type: 'curse', from: p.id, to: t.id, cardId });
    resetWindow(s);
  },

  [ACTIONS.ASK_HELP](s, p, { to, treasures = 0 }) {
    const cb = s.combat;
    check(cb && cb.fighterId === p.id, 'No estás peleando.');
    check(!cb.helperId && !cb.helpOffer && !cb.window, 'Ahora no podés pedir ayuda.');
    const t = P(s, to);
    check(t && !t.left && t.id !== p.id, 'Elegí a quién pedirle ayuda.');
    cb.helpOffer = { to, treasures: Math.max(0, Math.floor(treasures)) };
    log(s, `${p.name} le pide ayuda a ${t.name} y le ofrece ${cb.helpOffer.treasures} tesoro${cb.helpOffer.treasures === 1 ? '' : 's'}.`);
  },

  [ACTIONS.ANSWER_HELP](s, p, { accept }) {
    const cb = s.combat;
    check(cb?.helpOffer?.to === p.id, 'Nadie te pidió ayuda.');
    if (accept) {
      cb.helperId = p.id;
      cb.helperTreasures = cb.helpOffer.treasures;
      log(s, `${p.name} acepta ayudar.`);
    } else log(s, `${p.name} no quiere ayudar.`);
    cb.helpOffer = null;
  },

  [ACTIONS.PLAY_ONESHOT](s, p, { cardId, side }) {
    const cb = s.combat;
    check(cb && !cb.helpOffer, 'Sólo en combate.');
    const c = C(cardId);
    check(c?.kind === 'oneshot' && p.hand.includes(cardId), 'No tenés esa carta.');
    if (c.escape) {
      check([cb.fighterId, cb.helperId].includes(p.id), 'Sólo quien pelea puede usarla.');
      fromHand(p, cardId);
      discard(s, cardId);
      log(s, `${p.name} usa ${c.name}: ¡escapan sin consecuencias!`);
      for (const m of cb.monsters) {
        discard(s, m.cardId);
        m.enhancers.forEach((e) => discard(s, e));
      }
      s.combat = null;
      s.turn.step = 'end';
      return;
    }
    check(side === 'players' || side === 'monsters', 'Elegí a qué bando ayuda.');
    fromHand(p, cardId);
    discard(s, cardId);
    if (side === 'players') cb.playerBonus += c.bonus;
    else cb.monsterBonus += c.bonus;
    log(s, `${p.name} usa ${c.name}: +${c.bonus} para ${side === 'players' ? 'los aventureros' : 'los monstruos'}.`);
    event(s, { type: 'oneshot', playerId: p.id, cardId, side });
    resetWindow(s);
  },

  [ACTIONS.PLAY_ENHANCER](s, p, { cardId, monster = 0 }) {
    const cb = s.combat;
    check(cb && !cb.helpOffer, 'Sólo en combate.');
    check(cb.monsters[monster], 'Elegí el monstruo.');
    const c = fromHand(p, cardId, 'enhancer');
    cb.monsters[monster].enhancers.push(cardId);
    log(s, `${p.name} juega ${c.name} sobre ${C(cb.monsters[monster].cardId).name} (${c.bonus > 0 ? '+' : ''}${c.bonus}).`);
    event(s, { type: 'enhancer', playerId: p.id, cardId });
    resetWindow(s);
  },

  [ACTIONS.PLAY_WANDERING](s, p, { cardId, monsterCardId }) {
    const cb = s.combat;
    check(cb && !cb.helpOffer, 'Sólo en combate.');
    check(C(cardId)?.kind === 'wandering' && p.hand.includes(cardId), 'No tenés un monstruo errante.');
    check(C(monsterCardId)?.kind === 'monster' && p.hand.includes(monsterCardId), 'Elegí un monstruo de tu mano.');
    p.hand = p.hand.filter((x) => x !== cardId && x !== monsterCardId);
    discard(s, cardId);
    cb.monsters.push({ cardId: monsterCardId, enhancers: [] });
    log(s, `${p.name} suma un monstruo errante: ${C(monsterCardId).name}.`);
    event(s, { type: 'wandering', playerId: p.id, cardId: monsterCardId });
    resetWindow(s);
  },

  [ACTIONS.POWER](s, p, { power, cardIds = [], target }, rng) {
    const cb = s.combat;
    check(cb && !cb.helpOffer, 'Los poderes se usan en combate.');
    const ids = [...new Set(cardIds)];
    check(ids.every((id) => p.hand.includes(id)), 'Elegí cartas de tu mano.');
    const fighting = [cb.fighterId, cb.helperId].includes(p.id);
    const spend = () => {
      p.hand = p.hand.filter((x) => !ids.includes(x));
      ids.forEach((id) => discard(s, id));
    };
    if (power === 'berserk') {
      check(classOf(p) === 'guerrero' && fighting, 'Sólo un guerrero que pelea.');
      check(ids.length >= 1 && cb.powers.berserk + ids.length <= 3, 'Hasta 3 cartas por combate.');
      spend();
      cb.powers.berserk += ids.length;
      cb.playerBonus += ids.length;
      log(s, `${p.name} entra en furia: +${ids.length}.`);
    } else if (power === 'turning') {
      check(classOf(p) === 'clerigo' && fighting, 'Sólo un clérigo que pelea.');
      check(cb.monsters.some((m) => C(m.cardId).undead), 'Sólo contra muertos vivientes.');
      check(ids.length >= 1 && cb.powers.turning + ids.length <= 3, 'Hasta 3 cartas por combate.');
      spend();
      cb.powers.turning += ids.length;
      cb.playerBonus += 3 * ids.length;
      log(s, `${p.name} exorciza: +${3 * ids.length}.`);
    } else if (power === 'flight') {
      check(classOf(p) === 'mago' && p.id === cb.fighterId, 'Sólo un mago que pelea.');
      check(ids.length >= 1 && cb.powers.flight + ids.length <= 3, 'Hasta 3 cartas por combate.');
      spend();
      cb.powers.flight += ids.length;
      cb.runBonus += ids.length;
      log(s, `${p.name} prepara el hechizo de vuelo: +${ids.length} para huir.`);
    } else if (power === 'charm') {
      check(classOf(p) === 'mago' && p.id === cb.fighterId, 'Sólo un mago que pelea.');
      check(cb.monsters.length === 1, 'Sólo contra un monstruo solo.');
      check(p.hand.length >= 3, 'Necesitás al menos 3 cartas en la mano.');
      p.hand.forEach((id) => discard(s, id));
      p.hand = [];
      return resolveWin(s, rng, { charm: true });
    } else if (power === 'backstab') {
      check(classOf(p) === 'ladron', 'Sólo un ladrón.');
      check([cb.fighterId, cb.helperId].includes(target) && target !== p.id, 'Elegí a quien pelea.');
      check(!cb.backstabs.includes(`${p.id}>${target}`), 'Ya apuñalaste a esa persona en este combate.');
      check(ids.length === 1, 'Descartá una carta.');
      spend();
      cb.backstabs.push(`${p.id}>${target}`);
      cb.playerBonus -= 2;
      log(s, `${p.name} apuñala a ${P(s, target).name}: −2.`);
      resetWindow(s);
    } else fail('Poder desconocido.');
  },

  [ACTIONS.FIGHT](s, p, _x, rng) {
    const cb = s.combat;
    check(cb && cb.fighterId === p.id, 'No estás peleando.');
    check(!cb.helpOffer && !cb.window, 'Esperá.');
    check(combatTotals(s).winning, 'No te alcanza: pedí ayuda, usá cartas o huí.');
    const pending = s.players.filter((x) => canInterfere(s, x)).map((x) => x.id);
    if (!pending.length) return resolveWin(s, rng);
    cb.window = { pending };
    log(s, `${p.name} dice que gana. ¿Alguien se mete?`);
  },

  [ACTIONS.PASS](s, p, _x, rng) {
    const w = s.combat?.window;
    check(w && w.pending.includes(p.id), 'No hace falta que pases.');
    w.pending = w.pending.filter((x) => x !== p.id);
    if (!w.pending.length) {
      if (combatTotals(s).winning) resolveWin(s, rng);
      else {
        s.combat.window = null;
      }
    }
  },

  [ACTIONS.RUN](s, p, _x, rng) {
    const cb = s.combat;
    check(cb && cb.fighterId === p.id, 'No estás peleando.');
    check(!cb.helpOffer, 'Esperá la respuesta.');
    log(s, `${p.name} intenta huir.`);
    resolveRun(s, rng);
  },

  [ACTIONS.END_TURN](s, p, _x, rng) {
    check(myTurn(s, p), 'No es tu turno.');
    check(s.turn.step === 'end' || s.turn.step === 'after-door', s.turn.step === 'start' ? 'Primero abrí una puerta.' : 'Primero terminá el combate.');
    if (s.turn.step === 'after-door') fail('Buscá problemas o saqueá la habitación.');
    const excess = p.hand.length - handLimit(p);
    if (excess > 0) {
      s.turn.step = 'charity';
      s.turn.charity = excess;
      log(s, `${p.name} tiene demasiadas cartas: debe donar ${excess}.`);
      return;
    }
    nextTurn(s, rng);
  },

  [ACTIONS.CHARITY](s, p, { cardIds = [] }, rng) {
    check(myTurn(s, p) && s.turn.step === 'charity', 'No hace falta donar.');
    const ids = [...new Set(cardIds)];
    check(ids.length === s.turn.charity && ids.every((id) => p.hand.includes(id)), `Elegí ${s.turn.charity} cartas de tu mano.`);
    p.hand = p.hand.filter((x) => !ids.includes(x));
    const others = active(s).filter((x) => x.id !== p.id);
    const low = Math.min(...others.map((x) => x.level));
    if (p.level <= low) {
      ids.forEach((id) => discard(s, id));
      log(s, `${p.name} es de los de menor nivel: descarta ${ids.length}.`);
    } else {
      const lows = others.filter((x) => x.level === low);
      ids.forEach((id, i) => lows[i % lows.length].hand.push(id));
      log(s, `${p.name} dona ${ids.length} carta${ids.length > 1 ? 's' : ''} a ${lows.map((x) => x.name).join(' y ')}.`);
    }
    nextTurn(s, rng);
  },

  /** Política de plataforma: quien abandona descarta todo; si queda uno, gana. */
  [ACTIONS.LEAVE](s, p, _x, rng) {
    p.left = true;
    for (const id of [...p.hand, ...p.equipped, ...p.carried]) discard(s, id);
    p.hand = [];
    p.equipped = [];
    p.carried = [];
    log(s, `${p.name} abandona la mazmorra.`);
    const rest = active(s);
    if (rest.length === 1) {
      s.phase = 'finished';
      s.winners = [rest[0].id];
      return;
    }
    const cb = s.combat;
    if (cb) {
      if (cb.helpOffer?.to === p.id) cb.helpOffer = null;
      if (cb.helperId === p.id) cb.helperId = null;
      if (cb.window) {
        cb.window.pending = cb.window.pending.filter((x) => x !== p.id);
        if (!cb.window.pending.length) cb.window = null;
      }
    }
    if (current(s).id === p.id) {
      if (cb) {
        for (const m of cb.monsters) {
          discard(s, m.cardId);
          m.enhancers.forEach((e) => discard(s, e));
        }
      }
      nextTurn(s, rng);
    }
  },
};

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function getPendingDeciders(s) {
  if (s.phase === 'finished') return [];
  const cb = s.combat;
  if (cb?.helpOffer) return [cb.helpOffer.to];
  if (cb?.window) return cb.window.pending;
  return [current(s).id];
}

export function getLegalActions(s, playerId) {
  const p = P(s, playerId);
  if (!p || p.left || s.phase === 'finished') return [];
  const out = [];
  const cb = s.combat;
  const kinds = new Set(p.hand.map((id) => C(id).kind));
  if (cb?.helpOffer) {
    if (cb.helpOffer.to === playerId) out.push({ type: ACTIONS.ANSWER_HELP });
  } else if (cb) {
    if (cb.window?.pending.includes(playerId)) out.push({ type: ACTIONS.PASS });
    if (kinds.has('oneshot')) out.push({ type: ACTIONS.PLAY_ONESHOT });
    if (kinds.has('enhancer')) out.push({ type: ACTIONS.PLAY_ENHANCER });
    if (kinds.has('wandering') && kinds.has('monster')) out.push({ type: ACTIONS.PLAY_WANDERING });
    const fighting = [cb.fighterId, cb.helperId].includes(playerId);
    const powers = [];
    if (classOf(p) === 'guerrero' && fighting && cb.powers.berserk < 3 && p.hand.length) powers.push('berserk');
    if (classOf(p) === 'clerigo' && fighting && cb.powers.turning < 3 && p.hand.length && cb.monsters.some((m) => C(m.cardId).undead)) powers.push('turning');
    if (classOf(p) === 'mago' && playerId === cb.fighterId && p.hand.length) {
      if (cb.powers.flight < 3) powers.push('flight');
      if (cb.monsters.length === 1 && p.hand.length >= 3) powers.push('charm');
    }
    if (classOf(p) === 'ladron' && !fighting && p.hand.length) powers.push('backstab');
    if (powers.length) out.push({ type: ACTIONS.POWER, powers });
    if (cb.fighterId === playerId && !cb.window) {
      if (!cb.helperId) out.push({ type: ACTIONS.ASK_HELP });
      if (combatTotals(s).winning) out.push({ type: ACTIONS.FIGHT });
      out.push({ type: ACTIONS.RUN });
    }
  } else if (myTurn(s, p)) {
    const st = s.turn.step;
    if (st === 'charity') out.push({ type: ACTIONS.CHARITY, count: s.turn.charity });
    else {
      if (st === 'start') out.push({ type: ACTIONS.KICK_DOOR });
      if (st === 'after-door') {
        if (kinds.has('monster')) out.push({ type: ACTIONS.LOOK_FOR_TROUBLE });
        out.push({ type: ACTIONS.LOOT });
      }
      if (st === 'end') out.push({ type: ACTIONS.END_TURN });
      out.push({ type: ACTIONS.PLAY_CARD }, { type: ACTIONS.SELL });
      if (p.carried.length) out.push({ type: ACTIONS.EQUIP });
      if (p.equipped.length) out.push({ type: ACTIONS.UNEQUIP });
    }
  }
  if (kinds.has('curse') && !busy(s)) out.push({ type: ACTIONS.PLAY_CURSE });
  if (kinds.has('levelup') && p.level < WIN_LEVEL - 1) out.push({ type: ACTIONS.PLAY_CARD, levelup: true });
  out.push({ type: ACTIONS.LEAVE });
  return out;
}

export function getPlayerView(s, viewerId) {
  const me = viewerId ? P(s, viewerId) : null;
  const cb = s.combat;
  return {
    gameId: s.gameId,
    version: s.version,
    phase: s.phase,
    me: viewerId,
    currentPlayerId: s.phase === 'finished' ? null : current(s).id,
    turn: s.turn,
    combat: cb
      ? {
          ...cb,
          monsters: cb.monsters.map((m) => ({ ...m, level: monsterLevel(s, m) })),
          totals: combatTotals(s),
        }
      : null,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      colorId: p.colorId,
      level: p.level,
      strength: strength(p),
      race: p.race,
      cls: p.cls,
      equipped: p.equipped,
      carried: p.carried,
      handCount: p.hand.length,
      handLimit: handLimit(p),
      dead: p.dead,
      left: p.left,
    })),
    myHand: me ? me.hand : [],
    doorCount: s.doorDeck.length,
    treasureCount: s.treasureDeck.length,
    lastDoor: s.turn?.kicked ?? null,
    winners: s.winners,
    lastEvent: s.lastEvent,
    log: s.log.slice(-60),
    legal: getLegalActions(s, viewerId),
    deciders: getPendingDeciders(s),
  };
}

export const getResult = (s) => (s.phase === 'finished' ? { winners: s.winners, scores: Object.fromEntries(s.players.map((p) => [p.id, p.level])) } : null);
export const removePlayer = (s, playerId, rng) => applyAction(s, { type: ACTIONS.LEAVE, playerId }, rng);

export const definition = {
  id: 'mazmorras',
  players: { min: 3, max: 6 },
  edition: 'Saqueo de mazmorras clásico (juego básico), cartas propias',
  setup,
  applyAction,
  getPlayerView,
  getLegalActions,
  getPendingDeciders,
  getResult,
  removePlayer,
  validateOptions,
};
