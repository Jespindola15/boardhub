/**
 * Cálculos de reglas sin efectos secundarios (alquileres, construcción, hipotecas).
 * JS puro.
 */
import { BOARD, SQUARE_TYPES, getSquaresByGroup, isOwnable } from '../data/board.js';
import { HOTEL } from '../state/gameState.js';

export const JAIL_FINE = 50;
export const MORTGAGE_INTEREST = 0.1;
export const MAX_JAIL_TURNS = 3;

// Aritmética entera para evitar errores de coma flotante (200 × 1,1 = 220,00000000000003).
export const mortgageFee = (square) => Math.ceil(square.mortgage / 10);
export const unmortgageCost = (square) => square.mortgage + Math.ceil(square.mortgage / 10);

export const ownerOf = (state, index) => state.ownership[index]?.ownerId ?? null;

export function ownsWholeGroup(state, playerId, groupId) {
  return getSquaresByGroup(groupId).every((sq) => ownerOf(state, sq.index) === playerId);
}

export const countOwnedOfType = (state, playerId, type) =>
  BOARD.filter((sq) => sq.type === type && ownerOf(state, sq.index) === playerId).length;

/**
 * Alquiler a pagar al caer en `index`.
 * @param {object} ctx { diceTotal, cardRent?: 'double-station' | 'utility-10x' }
 */
export function computeRent(state, index, ctx) {
  const square = BOARD[index];
  const own = state.ownership[index];
  if (!own || own.mortgaged) return 0;

  if (square.type === SQUARE_TYPES.PROPERTY) {
    if (own.houses > 0) return square.rent[own.houses];
    return square.rent[0] * (ownsWholeGroup(state, own.ownerId, square.group) ? 2 : 1);
  }
  if (square.type === SQUARE_TYPES.STATION) {
    const n = countOwnedOfType(state, own.ownerId, SQUARE_TYPES.STATION);
    const rent = square.rent[n - 1];
    return ctx.cardRent === 'double-station' ? rent * 2 : rent;
  }
  if (square.type === SQUARE_TYPES.UTILITY) {
    if (ctx.cardRent === 'utility-10x') return ctx.diceTotal * 10;
    const n = countOwnedOfType(state, own.ownerId, SQUARE_TYPES.UTILITY);
    return ctx.diceTotal * square.multipliers[n - 1];
  }
  return 0;
}

const groupHouses = (state, groupId) => getSquaresByGroup(groupId).map((sq) => state.ownership[sq.index]?.houses ?? 0);

/** ¿Se puede construir una casa (u hotel) en `index`? Devuelve null o un motivo. */
export function buildBlocker(state, playerId, index) {
  const square = BOARD[index];
  const own = state.ownership[index];
  if (square.type !== SQUARE_TYPES.PROPERTY) return 'Sólo se construye en propiedades de color.';
  if (own?.ownerId !== playerId) return 'La propiedad no es tuya.';
  if (!ownsWholeGroup(state, playerId, square.group)) return 'Necesitas el grupo de color completo.';
  if (getSquaresByGroup(square.group).some((sq) => state.ownership[sq.index].mortgaged))
    return 'No puedes construir si alguna propiedad del grupo está hipotecada.';
  if (own.houses >= HOTEL) return 'Ya tiene hotel.';
  if (own.houses > Math.min(...groupHouses(state, square.group)))
    return 'Debes construir de forma pareja: primero en las demás propiedades del grupo.';
  if (own.houses === 4 && state.bank.hotels < 1) return 'La banca no tiene hoteles disponibles.';
  if (own.houses < 4 && state.bank.houses < 1) return 'La banca no tiene casas disponibles.';
  const player = state.players.find((p) => p.id === playerId);
  if (player.money < square.houseCost) return 'No tienes dinero suficiente.';
  return null;
}

export function sellBlocker(state, playerId, index) {
  const square = BOARD[index];
  const own = state.ownership[index];
  if (own?.ownerId !== playerId) return 'La propiedad no es tuya.';
  if (!own.houses) return 'No hay edificios para vender.';
  if (own.houses < Math.max(...groupHouses(state, square.group)))
    return 'Debes vender de forma pareja: primero en las propiedades con más edificios.';
  return null;
}

export function mortgageBlocker(state, playerId, index) {
  const square = BOARD[index];
  const own = state.ownership[index];
  if (!isOwnable(square) || own?.ownerId !== playerId) return 'La propiedad no es tuya.';
  if (own.mortgaged) return 'Ya está hipotecada.';
  if (square.type === SQUARE_TYPES.PROPERTY && groupHouses(state, square.group).some((h) => h > 0))
    return 'Primero vende los edificios de todo el grupo.';
  return null;
}

export function unmortgageBlocker(state, playerId, index) {
  const square = BOARD[index];
  const own = state.ownership[index];
  if (own?.ownerId !== playerId) return 'La propiedad no es tuya.';
  if (!own.mortgaged) return 'No está hipotecada.';
  const cost = own.feePaid ? square.mortgage : unmortgageCost(square);
  const player = state.players.find((p) => p.id === playerId);
  if (player.money < cost) return `Necesitas ${cost} para levantar la hipoteca.`;
  return null;
}

/** Dinero máximo que un jugador puede reunir vendiendo edificios e hipotecando. */
export function liquidationValue(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  let total = player.money;
  for (const sq of BOARD) {
    const own = state.ownership[sq.index];
    if (own?.ownerId !== playerId) continue;
    if (own.houses) total += ((own.houses === HOTEL ? 5 : own.houses) * sq.houseCost) / 2;
    if (!own.mortgaged) total += sq.mortgage;
  }
  return total;
}

/** ¿Se puede negociar esta casilla? (no debe haber edificios en su grupo) */
export function tradeBlocker(state, playerId, index) {
  const square = BOARD[index];
  if (ownerOf(state, index) !== playerId) return 'No pertenece a ese jugador.';
  if (square.type === SQUARE_TYPES.PROPERTY && groupHouses(state, square.group).some((h) => h > 0))
    return `Hay edificios en el grupo de ${square.name}: deben venderse antes de negociarla.`;
  return null;
}
