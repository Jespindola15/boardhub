/**
 * Definición estática del tablero de Magnate (40 casillas).
 *
 * Reglas de diseño de estos datos:
 *  - JS puro y serializable: lo usará igual el cliente que el servidor autoritativo.
 *  - Sólo describe el tablero. Quién posee qué, casas e hipotecas viven en el
 *    estado de partida (state/), nunca aquí.
 *  - El orden del array = índice de casilla = recorrido en sentido de juego,
 *    empezando en Salida (0).
 *  - Precios, alquileres, costes de edificios e hipotecas: los de la edición G0009.
 *
 * Edición de referencia: Hasbro G0009 (docs/reglas/magnate/EDICION.md).
 *
 * rent (propiedades): [sin casas, 1 casa, 2, 3, 4, hotel]
 * rent (estaciones):  [1 estación, 2, 3, 4]
 * multipliers (servicios): [1 servicio, 2 servicios] × suma de los dados
 */
import { COLOR_GROUPS } from './groups.js';

export const SQUARE_TYPES = {
  GO: 'go',
  PROPERTY: 'property',
  STATION: 'station',
  UTILITY: 'utility',
  TAX: 'tax',
  CHANCE: 'chance',
  COMMUNITY: 'community',
  JAIL: 'jail',
  FREE_PARKING: 'free-parking',
  GO_TO_JAIL: 'go-to-jail',
};

export const BOARD_SIZE = 40;
export const JAIL_INDEX = 10;
export const GO_INDEX = 0;
export const GO_SALARY = 200;

const T = SQUARE_TYPES;

/** Coste de levantar la hipoteca impreso en la ficha: hipoteca + 10 %, redondeado hacia arriba. */
function unmortgageOf(mortgage) {
  return mortgage + Math.ceil(mortgage / 10);
}

const property = (name, group, price, rent) => ({
  type: T.PROPERTY,
  name,
  group,
  price,
  rent,
  houseCost: COLOR_GROUPS[group].houseCost,
  mortgage: price / 2,
  unmortgage: unmortgageOf(price / 2),
});

const station = (name) => ({
  type: T.STATION,
  name,
  group: 'station',
  price: 200,
  rent: [25, 50, 100, 200],
  mortgage: 100,
  unmortgage: 110,
});

const utility = (name, icon) => ({
  type: T.UTILITY,
  name,
  icon,
  group: 'utility',
  price: 150,
  multipliers: [4, 10],
  mortgage: 75,
  unmortgage: 83,
});

const RAW_SQUARES = [
  { type: T.GO, name: 'Salida', subtitle: `Cobra $${GO_SALARY} al pasar` },
  property('Callejón del Puerto', 'brown', 60, [2, 10, 30, 90, 160, 250]),
  { type: T.COMMUNITY, name: 'Arca Vecinal' },
  property('Pasaje Ferroviario', 'brown', 60, [4, 20, 60, 180, 320, 450]),
  { type: T.TAX, name: 'Impuesto a la Renta', amount: 200 },
  station('Estación Norte'),
  property('Avenida Los Álamos', 'lightblue', 100, [6, 30, 90, 270, 400, 550]),
  { type: T.CHANCE, name: 'Fortuna' },
  property('Calle Jacarandá', 'lightblue', 100, [6, 30, 90, 270, 400, 550]),
  property('Paseo del Río', 'lightblue', 120, [8, 40, 100, 300, 450, 600]),

  { type: T.JAIL, name: 'Cárcel', subtitle: 'Solo de visita' },
  property('Plaza Mirador', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  utility('Compañía Eléctrica', 'bolt'),
  property('Bulevar del Ceibo', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  property('Calle Galería', 'pink', 160, [12, 60, 180, 500, 700, 900]),
  station('Estación Central'),
  property('Avenida Costanera', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  { type: T.COMMUNITY, name: 'Arca Vecinal' },
  property('Paseo del Faro', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  property('Calle Marina', 'orange', 200, [16, 80, 220, 600, 800, 1000]),

  { type: T.FREE_PARKING, name: 'Plaza Libre', subtitle: 'Descanso' },
  property('Avenida del Teatro', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  { type: T.CHANCE, name: 'Fortuna' },
  property('Calle de la Ópera', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  property('Plaza de la Catedral', 'red', 240, [20, 100, 300, 750, 925, 1100]),
  station('Estación Sur'),
  property('Avenida Horizonte', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  property('Distrito Girasol', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  utility('Aguas del Valle', 'drop'),
  property('Torre Ámbar', 'yellow', 280, [24, 120, 360, 850, 1025, 1200]),

  { type: T.GO_TO_JAIL, name: '¡A la cárcel!', subtitle: 'Ve directo, sin cobrar' },
  property('Parque Esmeralda', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  property('Avenida Bosque Alto', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  { type: T.COMMUNITY, name: 'Arca Vecinal' },
  property('Colina del Roble', 'green', 320, [28, 150, 450, 1000, 1200, 1400]),
  station('Estación del Puerto'),
  { type: T.CHANCE, name: 'Fortuna' },
  property('Mirador de la Cumbre', 'darkblue', 350, [35, 175, 500, 1100, 1300, 1500]),
  { type: T.TAX, name: 'Impuesto al Lujo', amount: 100 },
  property('Paseo Imperial', 'darkblue', 400, [50, 200, 600, 1400, 1700, 2000]),
];

export const BOARD = Object.freeze(
  RAW_SQUARES.map((sq, index) => Object.freeze({ id: `sq-${index}`, index, ...sq })),
);

/** Casillas que pueden tener dueño. */
export const OWNABLE_TYPES = new Set([T.PROPERTY, T.STATION, T.UTILITY]);

export const isOwnable = (square) => OWNABLE_TYPES.has(square.type);

export const getSquare = (index) => BOARD[index];

export const getSquaresByGroup = (groupId) => BOARD.filter((s) => s.group === groupId);

// Comprobación defensiva en desarrollo: el tablero debe tener exactamente 40 casillas.
if (BOARD.length !== BOARD_SIZE) {
  throw new Error(`El tablero de Magnate debe tener ${BOARD_SIZE} casillas y tiene ${BOARD.length}`);
}
