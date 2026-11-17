/**
 * Lecturas derivadas del estado de partida. Funciones puras, sin efectos.
 * Las usa la interfaz y podrá usarlas el motor de reglas.
 */
import { BOARD, isOwnable } from '../data/board.js';
import { HOTEL } from './gameState.js';

export const getPlayer = (state, playerId) => state.players.find((p) => p.id === playerId) ?? null;

export const getCurrentPlayer = (state) => getPlayer(state, state.turn.playerId);

export const getOwnership = (state, squareIndex) => state.ownership[squareIndex] ?? null;

export const getOwner = (state, squareIndex) => {
  const o = getOwnership(state, squareIndex);
  return o ? getPlayer(state, o.ownerId) : null;
};

/** Casillas (objetos del tablero) que posee un jugador, en orden de tablero. */
export const getPlayerSquares = (state, playerId) =>
  BOARD.filter((sq) => isOwnable(sq) && state.ownership[sq.index]?.ownerId === playerId);

/** Jugadores agrupados por casilla: { [squareIndex]: Player[] }, excluyendo bancarrotas. */
export function getPlayersBySquare(state) {
  const map = {};
  for (const p of state.players) {
    if (p.status === 'bankrupt') continue;
    (map[p.position] ??= []).push(p);
  }
  return map;
}

/**
 * Patrimonio aproximado (dinero + valor de propiedades + edificios).
 * Sólo informativo en la UI; el cálculo oficial lo definirá el reglamento.
 */
export function getNetWorth(state, playerId) {
  const player = getPlayer(state, playerId);
  if (!player) return 0;
  return getPlayerSquares(state, playerId).reduce((sum, sq) => {
    const own = state.ownership[sq.index];
    const base = own.mortgaged ? sq.mortgage : sq.price;
    const buildings = own.houses ? (own.houses === HOTEL ? 5 : own.houses) * (sq.houseCost ?? 0) : 0;
    return sum + base + buildings;
  }, player.money);
}
