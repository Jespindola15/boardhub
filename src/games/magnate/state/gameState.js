/**
 * Estado de una partida de Magnate.
 *
 * Es la "fuente de verdad" que la interfaz se limita a dibujar. Sólo el motor
 * (engine/) lo transforma. En el modo online lo mantendrá el servidor.
 * JSON puro: se puede enviar por Socket.IO y guardar sin transformaciones.
 *
 * GameState = {
 *   id, version, phase: 'playing' | 'finished', winnerId,
 *   players: Player[],                         // orden = orden de turno
 *   turn: { playerId, round, step, doublesInRow, extraRoll },
 *        step: 'roll' | 'buy' | 'end'           // paso principal del turno
 *   dice: [a, b] | null, lastRollTotal,
 *   ownership: { [index]: { ownerId, houses (0–4, 5 = hotel), mortgaged, feePaid? } },
 *   bank: { houses, hotels },
 *   decks: { chance: string[], community: string[] },  // ids; se roba del principio
 *   pendingPurchase: index | null,
 *   // "Interrupciones" que se resuelven antes de seguir con el paso principal:
 *   debts: [{ debtorId, creditorId | null, amount, reason }],
 *   auction: { index, highBid, highBidderId, bidders: id[], currentBidderId } | null,
 *   auctionQueue: index[],
 *   trade: { fromId, toId, give: Offer, get: Offer } | null,
 *        Offer = { money, squares: index[], jailCards: number }
 *   lastCard: { deck, cardId, playerId, seq } | null,
 *   log: [{ id, text }], seq,
 * }
 */
import { createPlayer, MIN_PLAYERS, MAX_PLAYERS } from '../models/player.js';
import { CHANCE_CARDS, COMMUNITY_CARDS } from '../data/cards.js';

export const HOTEL = 5;
export const BANK_HOUSES = 32;
export const BANK_HOTELS = 12;

export const TURN_STEPS = { ROLL: 'roll', BUY: 'buy', END: 'end' };

export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Estado inicial de una partida. `rng` permite partidas reproducibles (tests, servidor). */
export function createGameState({ id = 'local', players, rng = Math.random }) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`Magnate admite entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores`);
  }
  const built = players.map(createPlayer);
  return {
    id,
    version: 0,
    phase: 'playing',
    winnerId: null,
    players: built,
    turn: { playerId: built[0].id, round: 1, step: TURN_STEPS.ROLL, doublesInRow: 0, extraRoll: false },
    dice: null,
    lastRollTotal: 0,
    ownership: {},
    bank: { houses: BANK_HOUSES, hotels: BANK_HOTELS },
    decks: {
      chance: shuffle(CHANCE_CARDS.map((c) => c.id), rng),
      community: shuffle(COMMUNITY_CARDS.map((c) => c.id), rng),
    },
    pendingPurchase: null,
    debts: [],
    auction: null,
    auctionQueue: [],
    trade: null,
    lastCard: null,
    log: [{ id: 'l0', text: `Comienza la partida. Empieza ${built[0].name}.` }],
    seq: 1,
  };
}
