/**
 * Mazos de cartas de Magnate: 16 de Fortuna y 16 del Arca Vecinal.
 * Textos propios; los efectos replican los del juego clásico.
 *
 * Efectos (campo `effect`):
 *  { kind: 'move-to', index }              avanza hasta la casilla (cobra Salida si pasa)
 *  { kind: 'move-nearest', type }          avanza a la estación/servicio más cercano
 *  { kind: 'move-back', steps }            retrocede (no cobra Salida)
 *  { kind: 'collect', amount }             cobra de la banca
 *  { kind: 'pay', amount }                 paga a la banca
 *  { kind: 'collect-each', amount }        cobra a cada jugador
 *  { kind: 'pay-each', amount }            paga a cada jugador
 *  { kind: 'repairs', house, hotel }       paga por cada casa / hotel
 *  { kind: 'go-to-jail' }
 *  { kind: 'jail-free' }                   el jugador conserva la carta
 * JS puro.
 */

export const CHANCE_CARDS = [
  { id: 'c1', text: 'Te invitan a una gala en el Paseo Imperial. Avanza hasta allí.', effect: { kind: 'move-to', index: 39 } },
  { id: 'c2', text: 'Avanza hasta la Salida y cobra $200.', effect: { kind: 'move-to', index: 0 } },
  { id: 'c3', text: 'Avanza hasta la Plaza de la Catedral. Si pasas por la Salida, cobra $200.', effect: { kind: 'move-to', index: 24 } },
  { id: 'c4', text: 'Avanza hasta la Plaza Mirador. Si pasas por la Salida, cobra $200.', effect: { kind: 'move-to', index: 11 } },
  { id: 'c5', text: 'Avanza hasta la estación más cercana. Si tiene dueño, paga el doble del alquiler. Si no, puedes comprarla.', effect: { kind: 'move-nearest', type: 'station' } },
  { id: 'c6', text: 'Avanza hasta la estación más cercana. Si tiene dueño, paga el doble del alquiler. Si no, puedes comprarla.', effect: { kind: 'move-nearest', type: 'station' } },
  { id: 'c7', text: 'Avanza hasta el servicio más cercano. Si tiene dueño, tira los dados y paga 10 veces el resultado. Si no, puedes comprarlo.', effect: { kind: 'move-nearest', type: 'utility' } },
  { id: 'c8', text: 'Tus acciones reparten dividendos. Cobra $50.', effect: { kind: 'collect', amount: 50 } },
  { id: 'c9', text: 'Queda libre de la cárcel. Guarda esta carta hasta usarla o venderla.', effect: { kind: 'jail-free' } },
  { id: 'c10', text: 'Te equivocaste de camino. Retrocede tres casillas.', effect: { kind: 'move-back', steps: 3 } },
  { id: 'c11', text: 'Ve directamente a la cárcel, sin pasar por la Salida y sin cobrar $200.', effect: { kind: 'go-to-jail' } },
  { id: 'c12', text: 'Reformas generales en tus edificios: paga $25 por cada casa y $100 por cada hotel.', effect: { kind: 'repairs', house: 25, hotel: 100 } },
  { id: 'c13', text: 'Multa por exceso de velocidad. Paga $15.', effect: { kind: 'pay', amount: 15 } },
  { id: 'c14', text: 'Haz un viaje hasta la Estación Norte. Si pasas por la Salida, cobra $200.', effect: { kind: 'move-to', index: 5 } },
  { id: 'c15', text: 'Te eligen presidente del consorcio. Paga $50 a cada jugador.', effect: { kind: 'pay-each', amount: 50 } },
  { id: 'c16', text: 'Vence tu préstamo de construcción. Cobra $150.', effect: { kind: 'collect', amount: 150 } },
];

export const COMMUNITY_CARDS = [
  { id: 'v1', text: 'Avanza hasta la Salida y cobra $200.', effect: { kind: 'move-to', index: 0 } },
  { id: 'v2', text: 'Error del banco a tu favor. Cobra $200.', effect: { kind: 'collect', amount: 200 } },
  { id: 'v3', text: 'Consulta médica. Paga $50.', effect: { kind: 'pay', amount: 50 } },
  { id: 'v4', text: 'Vendes unas acciones. Cobra $50.', effect: { kind: 'collect', amount: 50 } },
  { id: 'v5', text: 'Queda libre de la cárcel. Guarda esta carta hasta usarla o venderla.', effect: { kind: 'jail-free' } },
  { id: 'v6', text: 'Ve directamente a la cárcel, sin pasar por la Salida y sin cobrar $200.', effect: { kind: 'go-to-jail' } },
  { id: 'v7', text: 'Vence tu fondo de vacaciones. Cobra $100.', effect: { kind: 'collect', amount: 100 } },
  { id: 'v8', text: 'Te devuelven impuestos. Cobra $20.', effect: { kind: 'collect', amount: 20 } },
  { id: 'v9', text: '¡Es tu cumpleaños! Cobra $10 a cada jugador.', effect: { kind: 'collect-each', amount: 10 } },
  { id: 'v10', text: 'Vence tu seguro de vida. Cobra $100.', effect: { kind: 'collect', amount: 100 } },
  { id: 'v11', text: 'Gastos de hospital. Paga $100.', effect: { kind: 'pay', amount: 100 } },
  { id: 'v12', text: 'Cuota escolar. Paga $50.', effect: { kind: 'pay', amount: 50 } },
  { id: 'v13', text: 'Cobras una asesoría. Recibe $25.', effect: { kind: 'collect', amount: 25 } },
  { id: 'v14', text: 'Arreglo de veredas: paga $40 por cada casa y $115 por cada hotel.', effect: { kind: 'repairs', house: 40, hotel: 115 } },
  { id: 'v15', text: 'Ganaste el segundo premio de un concurso de belleza. Cobra $10.', effect: { kind: 'collect', amount: 10 } },
  { id: 'v16', text: 'Recibes una herencia. Cobra $100.', effect: { kind: 'collect', amount: 100 } },
];

export const DECKS = { chance: CHANCE_CARDS, community: COMMUNITY_CARDS };
export const DECK_NAMES = { chance: 'Fortuna', community: 'Arca Vecinal' };

const byId = new Map([...CHANCE_CARDS, ...COMMUNITY_CARDS].map((c) => [c.id, c]));
export const getCard = (id) => byId.get(id);
