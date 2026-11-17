/**
 * Catálogo de intenciones que un jugador podrá enviar al servidor.
 * Fase 1: sólo se declaran para fijar el contrato; ninguna está implementada.
 *
 * Forma de una acción: { type, playerId, payload? }
 */
export const ACTIONS = {
  ROLL_DICE: 'ROLL_DICE',
  BUY_PROPERTY: 'BUY_PROPERTY',
  DECLINE_PROPERTY: 'DECLINE_PROPERTY', // abre subasta
  PLACE_BID: 'PLACE_BID',
  PASS_BID: 'PASS_BID',
  PAY_RENT: 'PAY_RENT',
  BUILD: 'BUILD',
  SELL_BUILDING: 'SELL_BUILDING',
  MORTGAGE: 'MORTGAGE',
  UNMORTGAGE: 'UNMORTGAGE',
  PROPOSE_TRADE: 'PROPOSE_TRADE',
  RESPOND_TRADE: 'RESPOND_TRADE',
  PAY_JAIL_FINE: 'PAY_JAIL_FINE',
  USE_JAIL_CARD: 'USE_JAIL_CARD',
  DRAW_CARD: 'DRAW_CARD',
  DECLARE_BANKRUPTCY: 'DECLARE_BANKRUPTCY',
  END_TURN: 'END_TURN',
};
