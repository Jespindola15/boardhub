/**
 * Cálculos de reglas sin efectos secundarios (alquileres, construcción, hipotecas, liquidación).
 * Edición de referencia: Hasbro G0009. JS puro.
 */
import { BOARD, SQUARE_TYPES, getSquaresByGroup, isOwnable } from '../data/board.js';
import { HOTEL } from '../state/gameState.js';

export const JAIL_FINE = 50;
export const MAX_JAIL_TURNS = 3;
export const AUCTION_MIN_BID = 10; // BUILDINGS / THE BOARD SPACES: "las pujas empiezan en $10"
export const HOUSES_PER_HOTEL = 4;

export const unmortgageCost = (square) => square.unmortgage;

export const ownerOf = (state, index) => state.ownership[index]?.ownerId ?? null;

const findPlayer = (state, id) => state.players.find((p) => p.id === id);

export function ownsWholeGroup(state, playerId, groupId) {
  return getSquaresByGroup(groupId).every((sq) => ownerOf(state, sq.index) === playerId);
}

export const countOwnedOfType = (state, playerId, type) =>
  BOARD.filter((sq) => sq.type === type && ownerOf(state, sq.index) === playerId).length;

/**
 * Alquiler a pagar al caer en `index`.
 * @param {object} ctx { diceTotal, cardRent?: 'double-station' | 'utility-10x' }
 *   Para servicios, `diceTotal` es una tirada NUEVA (G0009: "tira los dados para determinar el alquiler").
 */
export function computeRent(state, index, ctx) {
  const square = BOARD[index];
  const own = state.ownership[index];
  if (!own || own.mortgaged) return 0;

  if (square.type === SQUARE_TYPES.PROPERTY) {
    if (own.houses > 0) return square.rent[own.houses];
    // El alquiler de "grupo completo" se cobra en las calles no hipotecadas aunque otra lo esté.
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

/** Tipo de edificio que pediría construir en `index`: 'house' | 'hotel'. */
export const nextBuildingType = (state, index) => ((state.ownership[index]?.houses ?? 0) === HOUSES_PER_HOTEL ? 'hotel' : 'house');

/**
 * ¿Se puede construir en `index`? Devuelve null o el motivo.
 * `opts.ignoreStock` / `opts.ignoreMoney` sirven para evaluar la escasez y para colocar
 * un edificio ganado en subasta (ya pagado).
 */
export function buildBlocker(state, playerId, index, opts = {}) {
  const square = BOARD[index];
  const own = state.ownership[index];
  const player = findPlayer(state, playerId);
  if (square.type !== SQUARE_TYPES.PROPERTY) return 'Sólo se construye en calles.';
  if (own?.ownerId !== playerId) return 'La calle no es tuya.';
  if (state.debts.some((d) => d.debtorId === playerId)) return 'Primero paga tu deuda.';
  if (!ownsWholeGroup(state, playerId, square.group)) return 'Necesitas el grupo de color completo.';
  if (getSquaresByGroup(square.group).some((sq) => state.ownership[sq.index].mortgaged))
    return 'No se puede construir si alguna calle del grupo está hipotecada.';
  if (own.houses >= HOTEL) return 'Ya tiene hotel.';
  if (own.houses > Math.min(...groupHouses(state, square.group)))
    return 'Construcción pareja: primero edifica en las demás calles del grupo.';
  if (!opts.ignoreStock) {
    if (own.houses === HOUSES_PER_HOTEL && state.bank.hotels < 1) return 'La banca no tiene hoteles.';
    if (own.houses < HOUSES_PER_HOTEL && state.bank.houses < 1) return 'La banca no tiene casas.';
  }
  if (!opts.ignoreMoney && player.money < square.houseCost) return 'No tienes dinero suficiente.';
  return null;
}

export function sellBlocker(state, playerId, index) {
  const square = BOARD[index];
  const own = state.ownership[index];
  if (own?.ownerId !== playerId) return 'La calle no es tuya.';
  if (!own.houses) return 'No hay edificios para vender.';
  if (own.houses < Math.max(...groupHouses(state, square.group)))
    return 'Venta pareja: primero vende en las calles con más edificios.';
  if (own.houses === HOTEL && state.bank.houses < HOUSES_PER_HOTEL)
    return 'El hotel se cambia por 4 casas y la banca no tiene suficientes.';
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
  if (state.debts.some((d) => d.debtorId === playerId)) return 'Primero paga tu deuda.';
  if (findPlayer(state, playerId).money < square.unmortgage) return `Necesitas $${square.unmortgage}.`;
  return null;
}

/** ¿Se puede negociar esta propiedad? (no puede haber edificios en su grupo) */
export function tradeBlocker(state, playerId, index) {
  const square = BOARD[index];
  if (ownerOf(state, index) !== playerId) return 'No pertenece a ese jugador.';
  if (square.type === SQUARE_TYPES.PROPERTY && groupHouses(state, square.group).some((h) => h > 0))
    return `Hay edificios en el grupo de ${square.name}: deben venderse antes de negociarla.`;
  return null;
}

/**
 * Dinero máximo que un jugador puede reunir AHORA vendiendo edificios (respetando la venta
 * pareja y las existencias de la banca) e hipotecando. Simula la liquidación sobre una copia.
 */
export function maxRaisable(state, playerId) {
  const s = structuredClone(state);
  s.debts = [];
  const p = findPlayer(s, playerId);
  let progress = true;
  while (progress) {
    progress = false;
    for (const sq of BOARD) {
      if (s.ownership[sq.index]?.ownerId !== playerId) continue;
      if (!sellBlocker(s, playerId, sq.index)) {
        sellOneBuilding(s, p, sq.index);
        progress = true;
      }
    }
  }
  for (const sq of BOARD) {
    if (!mortgageBlocker(s, playerId, sq.index)) {
      s.ownership[sq.index].mortgaged = true;
      p.money += sq.mortgage;
    }
  }
  return p.money;
}

/** Vende un edificio a la banca (sin validar). Compartido por el motor y la simulación. */
export function sellOneBuilding(s, p, index) {
  const sq = BOARD[index];
  const own = s.ownership[index];
  if (own.houses === HOTEL) {
    s.bank.hotels += 1;
    s.bank.houses -= HOUSES_PER_HOTEL;
    own.houses = HOUSES_PER_HOTEL;
  } else {
    s.bank.houses += 1;
    own.houses -= 1;
  }
  p.money += sq.houseCost / 2;
}

export const totalDebt = (state, playerId) =>
  state.debts.filter((d) => d.debtorId === playerId).reduce((t, d) => t + d.amount, 0);
