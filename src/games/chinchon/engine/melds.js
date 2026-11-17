/**
 * Combinaciones de Chinchón (reglamento Juegos Bonaerenses, art. 5 y 7). JS puro.
 *
 * - Grupo: 3 o 4 cartas del mismo número, de palos distintos.
 * - Escalera: 3 o más cartas consecutivas del mismo palo. El As sólo va con 2 y 3 (no se da la vuelta).
 * - Comodín: reemplaza cualquier carta faltante; como máximo UNO por combinación; adopta una identidad fija.
 * - En la mano, cada comodín vale 20 puntos; las demás cartas, su número.
 */
import { SUITS } from '../../../shared/spanish-deck/deck.js';

export const JOKER_POINTS = 20;
export const MAX_RANK = 12;

export const cardPoints = (c) => (c.joker ? JOKER_POINTS : c.rank);
export const pointsOf = (cards) => cards.reduce((t, c) => t + cardPoints(c), 0);

/**
 * Todas las combinaciones posibles con estas cartas.
 * Meld = { type: 'group'|'run', cards: [card...], suit?, rank?, low?, high?, joker?: { cardId, rank, suit } }
 * En las escaleras `cards` va ordenado por número (el comodín ocupa su lugar).
 */
export function candidateMelds(hand) {
  const jokers = hand.filter((c) => c.joker);
  const naturals = hand.filter((c) => !c.joker);
  const out = [];

  // Grupos
  const byRank = new Map();
  for (const c of naturals) (byRank.get(c.rank) ?? byRank.set(c.rank, []).get(c.rank)).push(c);
  for (const [rank, cs] of byRank) {
    for (const subset of subsets(cs)) {
      if (subset.length >= 3 && subset.length <= 4) out.push({ type: 'group', rank, cards: subset });
      if (subset.length >= 2 && subset.length <= 3) {
        const free = SUITS.filter((s) => !subset.some((c) => c.suit === s));
        for (const j of jokers.slice(0, 1)) {
          // Identidad del comodín: el primer palo libre (cualquiera es equivalente para la mano propia).
          out.push({ type: 'group', rank, cards: [...subset, j], joker: { cardId: j.id, rank, suit: free[0] } });
        }
      }
    }
  }

  // Escaleras
  for (const suit of SUITS) {
    const have = new Map(naturals.filter((c) => c.suit === suit).map((c) => [c.rank, c]));
    for (let low = 1; low <= MAX_RANK - 2; low++) {
      for (let high = low + 2; high <= MAX_RANK; high++) {
        const missing = [];
        for (let r = low; r <= high; r++) if (!have.has(r)) missing.push(r);
        if (missing.length === 0) {
          out.push({ type: 'run', suit, low, high, cards: range(low, high).map((r) => have.get(r)) });
        } else if (missing.length === 1 && jokers.length) {
          const j = jokers[0];
          out.push({
            type: 'run',
            suit,
            low,
            high,
            cards: range(low, high).map((r) => (r === missing[0] ? j : have.get(r))),
            joker: { cardId: j.id, rank: missing[0], suit },
          });
        }
      }
    }
  }
  // El segundo comodín puede usarse en otra combinación: repetir con el otro comodín.
  if (jokers.length === 2) {
    const alt = candidateMelds(hand.filter((c) => c.id !== jokers[0].id)).filter((m) => m.joker);
    out.push(...alt);
  }
  return out;
}

function range(a, b) {
  const r = [];
  for (let i = a; i <= b; i++) r.push(i);
  return r;
}

function subsets(list) {
  const out = [];
  const n = list.length;
  for (let mask = 1; mask < 1 << n; mask++) out.push(list.filter((_, i) => mask & (1 << i)));
  return out;
}

/**
 * Todas las particiones de la mano en combinaciones disjuntas (incluida la vacía).
 * Devuelve [{ melds, leftover, points }].
 */
export function allArrangements(hand) {
  const cands = candidateMelds(hand);
  const results = [];
  const seen = new Set();
  const rec = (start, used, chosen) => {
    const key = chosen.map((m) => m.cards.map((c) => c.id).sort().join('.')).sort().join('|');
    if (!seen.has(key)) {
      seen.add(key);
      const leftover = hand.filter((c) => !used.has(c.id));
      results.push({ melds: [...chosen], leftover, points: pointsOf(leftover) });
    }
    for (let i = start; i < cands.length; i++) {
      const m = cands[i];
      if (m.cards.some((c) => used.has(c.id))) continue;
      m.cards.forEach((c) => used.add(c.id));
      chosen.push(m);
      rec(i + 1, used, chosen);
      chosen.pop();
      m.cards.forEach((c) => used.delete(c.id));
    }
  };
  rec(0, new Set(), []);
  return results;
}

/** Mejor ordenamiento propio (menos puntos sueltos). */
export function bestArrangement(hand) {
  return allArrangements(hand).sort((a, b) => a.points - b.points || a.melds.length - b.melds.length)[0];
}

/** ¿Las 7 cartas forman una sola escalera? (Chin-Chon). Devuelve null | { withJoker } */
export function chinchonOf(hand) {
  if (hand.length !== 7) return null;
  const run = candidateMelds(hand).find((m) => m.type === 'run' && m.cards.length === 7);
  if (!run) return null;
  return { withJoker: Boolean(run.joker), meld: run };
}

/* ------------------------------------------------------------------ */
/* Descartes sobre combinaciones de la mesa (art. 7.10 y 7.11)         */
/* ------------------------------------------------------------------ */

/** Identidades (número/palo) que ocupa una combinación de la mesa. */
function occupied(meld) {
  return meld.cards.map((c) => (c.joker ? { rank: meld.joker.rank, suit: meld.joker.suit } : { rank: c.rank, suit: c.suit }));
}

/** ¿Se puede agregar esta carta (natural) a la combinación? Devuelve la combinación nueva o null. */
export function layOffOnto(meld, card) {
  if (card.joker) return null; // los comodines no se colocan en juegos ajenos (art. 5.3)
  const occ = occupied(meld);
  if (meld.type === 'group') {
    if (meld.cards.length >= 4 || card.rank !== meld.rank) return null;
    if (occ.some((o) => o.suit === card.suit)) return null; // el palo del comodín ya está "ocupado" (art. 7.11)
    return { ...meld, cards: [...meld.cards, card] };
  }
  if (card.suit !== meld.suit) return null;
  if (card.rank === meld.low - 1 && card.rank >= 1) return { ...meld, low: card.rank, cards: [card, ...meld.cards] };
  if (card.rank === meld.high + 1 && card.rank <= MAX_RANK) return { ...meld, high: card.rank, cards: [...meld.cards, card] };
  return null;
}

/**
 * Coloca la mayor cantidad posible de puntos de `cards` sobre `table` (búsqueda exhaustiva;
 * las manos son chicas). Devuelve { table, placed: [{cardId, card, meldIndex}], leftover, points }.
 */
export function bestLayOff(table, cards) {
  let best = { table, placed: [], leftover: cards, points: pointsOf(cards) };
  const rec = (tbl, remaining, placed) => {
    const pts = pointsOf(remaining);
    if (pts < best.points) best = { table: tbl, placed: [...placed], leftover: remaining, points: pts };
    for (const card of remaining) {
      for (let i = 0; i < tbl.length; i++) {
        const next = layOffOnto(tbl[i], card);
        if (!next) continue;
        const t2 = tbl.slice();
        t2[i] = next;
        placed.push({ cardId: card.id, card, meldIndex: i });
        rec(t2, remaining.filter((c) => c !== card), placed);
        placed.pop();
      }
    }
  };
  rec(table, cards, []);
  return best;
}

/**
 * Para un jugador que no cortó: elige sus combinaciones y descartes sobre la mesa para
 * dejar la menor cantidad de puntos (lo que más le conviene). `allowLayOff` = false cuando
 * la mano termina por mazo agotado (art. 7.12).
 */
export function settleHand(hand, table, { allowLayOff = true } = {}) {
  let best = null;
  for (const arr of allArrangements(hand)) {
    const base = [...table, ...arr.melds];
    const lay = allowLayOff ? bestLayOff(base, arr.leftover) : { table: base, placed: [], leftover: arr.leftover, points: arr.points };
    if (!best || lay.points < best.points) best = { melds: arr.melds, layOffs: lay.placed, table: lay.table, leftover: lay.leftover, points: lay.points };
    if (best.points === 0) break;
  }
  return best;
}
