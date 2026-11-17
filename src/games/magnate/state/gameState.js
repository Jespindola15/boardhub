/**
 * Forma del estado de una partida de Magnate.
 *
 * Este objeto es la "fuente de verdad" que la interfaz se limita a dibujar.
 * En el modo online lo generará y difundirá el servidor autoritativo; el
 * cliente nunca lo modificará directamente, sólo enviará intenciones.
 *
 * Es JSON puro (sin clases, funciones ni Map/Set) para poder enviarse por
 * Socket.IO y guardarse en PostgreSQL/Supabase sin transformaciones.
 *
 * GameState = {
 *   id: string,
 *   version: number,              // se incrementará en cada acción aplicada
 *   phase: 'lobby' | 'playing' | 'finished',
 *   players: Player[],            // orden = orden de turno
 *   turn: { playerId, round, doublesInRow, step },
 *   dice: [number, number] | null,
 *   ownership: { [squareIndex]: { ownerId, houses, mortgaged } }  // houses: 0–4, 5 = hotel
 *   bank: { houses, hotels },
 *   decks: { chance: { remaining }, community: { remaining } },
 *   log: { id, text, at }[],
 *   winnerId: string | null,
 * }
 */
import { createPlayer, MIN_PLAYERS, MAX_PLAYERS } from '../models/player.js';

export const HOTEL = 5;
export const BANK_HOUSES = 32;
export const BANK_HOTELS = 12;

export const TURN_STEPS = {
  AWAITING_ROLL: 'awaiting-roll',
  RESOLVING: 'resolving',
  AWAITING_END: 'awaiting-end',
};

/**
 * Construye un estado inicial válido a partir de la configuración de jugadores.
 * No aplica ninguna regla; sólo da forma a los datos.
 */
export function createGameState({ id = 'local', players }) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`Magnate admite entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores`);
  }
  const built = players.map(createPlayer);
  return {
    id,
    version: 0,
    phase: 'playing',
    players: built,
    turn: { playerId: built[0].id, round: 1, doublesInRow: 0, step: TURN_STEPS.AWAITING_ROLL },
    dice: null,
    ownership: {},
    bank: { houses: BANK_HOUSES, hotels: BANK_HOTELS },
    decks: { chance: { remaining: 16 }, community: { remaining: 16 } },
    log: [],
    winnerId: null,
  };
}
