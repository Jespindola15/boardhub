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
 *   turn: { playerId, firstPlayerId, round, step, doublesInRow, extraRoll },
 *        step: 'roll' | 'buy' | 'end'           // paso principal del turno
 *   dice: [a, b] | null, lastRollTotal,
 *   ownership: { [index]: { ownerId, houses (0–4, 5 = hotel), mortgaged } },
 *   bank: { houses, hotels },
 *   decks: { chance: string[], community: string[] },  // ids; se roba del principio
 *   pendingPurchase: index | null,
 *   // "Interrupciones" que se resuelven antes de seguir con el paso principal:
 *   debts: [{ id, debtorId, creditorId | null, amount, reason }],
 *   auction: { kind: 'property'|'building', index?, buildingType?, highBid, highBidderId,
 *              participants: id[], passed: id[] } | null,     // subasta abierta, sin orden
 *   auctionQueue: index[],                                     // propiedades de una quiebra ante la banca
 *   buildingClaim: { buildingType, requesterId, index, eligible: id[], responses: {id: bool} } | null,
 *   placement: { playerId, buildingType } | null,               // edificio ganado en subasta
 *   trades: [{ id, fromId, toId, give: Offer, get: Offer }],    // ofertas abiertas
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

/**
 * Orden inicial (G0009 PLAY: "empieza quien saca la tirada más alta y se sigue hacia la izquierda").
 * Los empatados en la tirada más alta vuelven a tirar. El orden de asientos no cambia.
 */
export function rollForFirstPlayer(players, rng) {
  const rolls = [];
  let tied = players.map((p) => p.id);
  while (tied.length > 1) {
    const round = tied.map((id) => {
      const d = [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
      return { id, dice: d, total: d[0] + d[1] };
    });
    rolls.push(round);
    const max = Math.max(...round.map((r) => r.total));
    tied = round.filter((r) => r.total === max).map((r) => r.id);
  }
  return { firstPlayerId: tied[0], rolls };
}

/**
 * Estado inicial de una partida. `rng` permite partidas reproducibles (tests, servidor).
 * `startingPlayerId` sólo se usa en pruebas para fijar quién empieza.
 */
export function createGameState({ id = 'local', players, rng = Math.random, startingPlayerId }) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`Magnate admite entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores`);
  }
  const built = players.map(createPlayer);
  const log = [];
  let firstPlayerId = startingPlayerId;
  if (!firstPlayerId) {
    const r = rollForFirstPlayer(built, rng);
    firstPlayerId = r.firstPlayerId;
    r.rolls.forEach((round, i) =>
      log.push({
        id: `s${i}`,
        text: `${i === 0 ? 'Tirada inicial' : 'Desempate'}: ${round.map((x) => `${built.find((p) => p.id === x.id).name} ${x.total}`).join(', ')}.`,
      }),
    );
  }
  const first = built.find((p) => p.id === firstPlayerId);
  log.push({ id: 'l0', text: `Comienza la partida. Empieza ${first.name}.` });
  return {
    id,
    version: 0,
    phase: 'playing',
    winnerId: null,
    players: built,
    turn: { playerId: first.id, firstPlayerId: first.id, round: 1, step: TURN_STEPS.ROLL, doublesInRow: 0, extraRoll: false },
    dice: null,
    utilityRoll: null,
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
    buildingClaim: null,
    placement: null,
    trades: [],
    lastCard: null,
    log,
    seq: 1,
  };
}
