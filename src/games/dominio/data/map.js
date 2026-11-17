/**
 * Mapa de Dominio: 42 territorios en 6 continentes, con la misma estructura de
 * fronteras que el juego clásico de conquista mundial. Datos puros.
 * x/y: posición en el lienzo del mapa (1000 × 560), dibujo propio.
 */
export const CONTINENTS = {
  na: { name: 'América del Norte', bonus: 5, color: '#f2c14e' },
  sa: { name: 'América del Sur', bonus: 2, color: '#f0784a' },
  eu: { name: 'Europa', bonus: 5, color: '#5aa7f0' },
  af: { name: 'África', bonus: 3, color: '#c98a4b' },
  as: { name: 'Asia', bonus: 7, color: '#69c27a' },
  oc: { name: 'Oceanía', bonus: 2, color: '#b77be0' },
};

/** [id, nombre, continente, x, y, vecinos] */
const RAW = [
  ['alaska', 'Alaska', 'na', 62, 92, ['noroeste', 'alberta', 'kamchatka']],
  ['noroeste', 'Territorio del Noroeste', 'na', 160, 82, ['alaska', 'alberta', 'ontario', 'groenlandia']],
  ['groenlandia', 'Groenlandia', 'na', 320, 52, ['noroeste', 'ontario', 'quebec', 'islandia']],
  ['alberta', 'Alberta', 'na', 132, 146, ['alaska', 'noroeste', 'ontario', 'eeuu-oeste']],
  ['ontario', 'Ontario', 'na', 206, 150, ['noroeste', 'alberta', 'groenlandia', 'quebec', 'eeuu-oeste', 'eeuu-este']],
  ['quebec', 'Quebec', 'na', 278, 146, ['ontario', 'groenlandia', 'eeuu-este']],
  ['eeuu-oeste', 'Estados Unidos Oeste', 'na', 140, 214, ['alberta', 'ontario', 'eeuu-este', 'centroamerica']],
  ['eeuu-este', 'Estados Unidos Este', 'na', 228, 222, ['ontario', 'quebec', 'eeuu-oeste', 'centroamerica']],
  ['centroamerica', 'Centroamérica', 'na', 160, 288, ['eeuu-oeste', 'eeuu-este', 'venezuela']],

  ['venezuela', 'Venezuela', 'sa', 232, 336, ['centroamerica', 'peru', 'brasil']],
  ['peru', 'Perú', 'sa', 228, 414, ['venezuela', 'brasil', 'argentina']],
  ['brasil', 'Brasil', 'sa', 304, 388, ['venezuela', 'peru', 'argentina', 'africa-norte']],
  ['argentina', 'Argentina', 'sa', 254, 488, ['peru', 'brasil']],

  ['islandia', 'Islandia', 'eu', 420, 92, ['groenlandia', 'gran-bretana', 'escandinavia']],
  ['gran-bretana', 'Gran Bretaña', 'eu', 418, 156, ['islandia', 'escandinavia', 'europa-norte', 'europa-oeste']],
  ['escandinavia', 'Escandinavia', 'eu', 500, 86, ['islandia', 'gran-bretana', 'europa-norte', 'ucrania']],
  ['europa-norte', 'Europa del Norte', 'eu', 494, 158, ['gran-bretana', 'escandinavia', 'ucrania', 'europa-sur', 'europa-oeste']],
  ['europa-oeste', 'Europa Occidental', 'eu', 430, 226, ['gran-bretana', 'europa-norte', 'europa-sur', 'africa-norte']],
  ['europa-sur', 'Europa del Sur', 'eu', 506, 220, ['europa-oeste', 'europa-norte', 'ucrania', 'medio-oriente', 'egipto', 'africa-norte']],
  ['ucrania', 'Ucrania', 'eu', 580, 128, ['escandinavia', 'europa-norte', 'europa-sur', 'ural', 'afganistan', 'medio-oriente']],

  ['africa-norte', 'África del Norte', 'af', 448, 316, ['brasil', 'europa-oeste', 'europa-sur', 'egipto', 'africa-este', 'congo']],
  ['egipto', 'Egipto', 'af', 526, 292, ['europa-sur', 'medio-oriente', 'africa-este', 'africa-norte']],
  ['africa-este', 'África Oriental', 'af', 566, 370, ['egipto', 'medio-oriente', 'madagascar', 'sudafrica', 'congo', 'africa-norte']],
  ['congo', 'Congo', 'af', 504, 404, ['africa-norte', 'africa-este', 'sudafrica']],
  ['sudafrica', 'Sudáfrica', 'af', 516, 480, ['congo', 'africa-este', 'madagascar']],
  ['madagascar', 'Madagascar', 'af', 610, 470, ['sudafrica', 'africa-este']],

  ['ural', 'Ural', 'as', 668, 112, ['ucrania', 'siberia', 'china', 'afganistan']],
  ['siberia', 'Siberia', 'as', 736, 80, ['ural', 'yakutsk', 'irkutsk', 'mongolia', 'china']],
  ['yakutsk', 'Yakutsk', 'as', 822, 62, ['siberia', 'kamchatka', 'irkutsk']],
  ['kamchatka', 'Kamchatka', 'as', 918, 74, ['yakutsk', 'irkutsk', 'mongolia', 'japon', 'alaska']],
  ['irkutsk', 'Irkutsk', 'as', 810, 132, ['siberia', 'yakutsk', 'kamchatka', 'mongolia']],
  ['mongolia', 'Mongolia', 'as', 830, 192, ['siberia', 'irkutsk', 'kamchatka', 'japon', 'china']],
  ['japon', 'Japón', 'as', 934, 196, ['kamchatka', 'mongolia']],
  ['afganistan', 'Afganistán', 'as', 654, 196, ['ucrania', 'ural', 'china', 'india', 'medio-oriente']],
  ['china', 'China', 'as', 772, 248, ['ural', 'siberia', 'mongolia', 'afganistan', 'india', 'siam']],
  ['medio-oriente', 'Medio Oriente', 'as', 604, 270, ['ucrania', 'afganistan', 'india', 'europa-sur', 'egipto', 'africa-este']],
  ['india', 'India', 'as', 696, 300, ['medio-oriente', 'afganistan', 'china', 'siam']],
  ['siam', 'Siam', 'as', 790, 326, ['india', 'china', 'indonesia']],

  ['indonesia', 'Indonesia', 'oc', 818, 410, ['siam', 'nueva-guinea', 'australia-oeste']],
  ['nueva-guinea', 'Nueva Guinea', 'oc', 908, 392, ['indonesia', 'australia-este', 'australia-oeste']],
  ['australia-oeste', 'Australia Occidental', 'oc', 846, 490, ['indonesia', 'nueva-guinea', 'australia-este']],
  ['australia-este', 'Australia Oriental', 'oc', 934, 480, ['nueva-guinea', 'australia-oeste']],
];

export const TERRITORIES = Object.fromEntries(RAW.map(([id, name, continent, x, y, adj]) => [id, { id, name, continent, x, y, adj }]));
export const TERRITORY_IDS = RAW.map((r) => r[0]);

/** Cartas: una por territorio con su símbolo (14 de cada) + 2 comodines. */
const SYMBOLS = ['infanteria', 'caballeria', 'artilleria'];
export const CARDS = [
  ...TERRITORY_IDS.map((t, i) => ({ id: `c-${t}`, territory: t, symbol: SYMBOLS[i % 3] })),
  { id: 'c-comodin-1', territory: null, symbol: 'comodin' },
  { id: 'c-comodin-2', territory: null, symbol: 'comodin' },
];

/** Ejércitos iniciales por cantidad de jugadores (reglamento clásico). */
export const STARTING_ARMIES = { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20 };
