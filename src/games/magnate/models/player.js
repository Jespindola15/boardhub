/**
 * Modelo de jugador de Magnate. JS puro y serializable.
 */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const STARTING_MONEY = 1500;

export const PLAYER_STATUS = {
  ACTIVE: 'active',
  IN_JAIL: 'in-jail',
  BANKRUPT: 'bankrupt',
  DISCONNECTED: 'disconnected', // reservado para el modo online
};

export const PLAYER_STATUS_LABEL = {
  [PLAYER_STATUS.ACTIVE]: 'En juego',
  [PLAYER_STATUS.IN_JAIL]: 'En la cárcel',
  [PLAYER_STATUS.BANKRUPT]: 'En bancarrota',
  [PLAYER_STATUS.DISCONNECTED]: 'Desconectado',
};

/** 8 colores identificativos, elegidos para distinguirse bien sobre fondo oscuro y claro. */
export const PLAYER_COLORS = [
  { id: 'violet', name: 'Violeta', hex: '#8b6cff' },
  { id: 'teal', name: 'Turquesa', hex: '#22d3b6' },
  { id: 'amber', name: 'Ámbar', hex: '#ffae2b' },
  { id: 'rose', name: 'Rosa', hex: '#ff4f86' },
  { id: 'sky', name: 'Cielo', hex: '#3fa9ff' },
  { id: 'lime', name: 'Lima', hex: '#9be33a' },
  { id: 'coral', name: 'Coral', hex: '#ff7a45' },
  { id: 'snow', name: 'Nieve', hex: '#e9ecf8' },
];

/** Fichas disponibles. El dibujo de cada una está en components/tokenShapes.jsx. */
export const TOKENS = [
  { id: 'crown', name: 'Corona' },
  { id: 'rocket', name: 'Cohete' },
  { id: 'anchor', name: 'Ancla' },
  { id: 'star', name: 'Estrella' },
  { id: 'diamond', name: 'Diamante' },
  { id: 'bolt', name: 'Rayo' },
  { id: 'heart', name: 'Corazón' },
  { id: 'moon', name: 'Luna' },
];

/**
 * Crea un jugador con valores iniciales válidos.
 * @param {{id:string, name:string, colorId:string, tokenId:string, isHost?:boolean}} input
 */
export function createPlayer({ id, name, colorId, tokenId, isHost = false }) {
  return {
    id,
    name,
    colorId,
    tokenId,
    isHost,
    money: STARTING_MONEY,
    position: 0,
    status: PLAYER_STATUS.ACTIVE,
    jailTurns: 0,
    jailFreeCards: [], // [{ deck, cardId }]
  };
}

export const getPlayerColor = (colorId) => PLAYER_COLORS.find((c) => c.id === colorId) ?? PLAYER_COLORS[0];
export const getToken = (tokenId) => TOKENS.find((t) => t.id === tokenId) ?? TOKENS[0];
