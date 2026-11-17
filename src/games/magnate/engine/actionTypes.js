/**
 * Catálogo de intenciones que un jugador podrá enviar al servidor.
 * Todas las implementa engine/index.js.
 *
 * Forma de una acción: { type, playerId, payload? }
 */
export const ACTIONS = {
  ROLL_DICE: 'ROLL_DICE',
  BUY_PROPERTY: 'BUY_PROPERTY',
  DECLINE_PROPERTY: 'DECLINE_PROPERTY', // abre subasta
  PLACE_BID: 'PLACE_BID',
  PASS_BID: 'PASS_BID',
  BUILD: 'BUILD',
  CLAIM_BUILDING: 'CLAIM_BUILDING', // escasez: ¿también quieres el edificio?
  PLACE_BUILDING: 'PLACE_BUILDING', // colocar el edificio ganado en subasta
  SELL_BUILDING: 'SELL_BUILDING',
  MORTGAGE: 'MORTGAGE',
  UNMORTGAGE: 'UNMORTGAGE',
  PROPOSE_TRADE: 'PROPOSE_TRADE',
  RESPOND_TRADE: 'RESPOND_TRADE',
  CANCEL_TRADE: 'CANCEL_TRADE',
  PAY_DEBT: 'PAY_DEBT',
  RESIGN: 'RESIGN',
  PAY_JAIL_FINE: 'PAY_JAIL_FINE',
  USE_JAIL_CARD: 'USE_JAIL_CARD',
  DECLARE_BANKRUPTCY: 'DECLARE_BANKRUPTCY',
  END_TURN: 'END_TURN',
};
