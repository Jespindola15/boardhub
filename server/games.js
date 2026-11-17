/**
 * Juegos disponibles en línea. Cada uno expone la `definition` común de BoardHub
 * (ver docs/ARQUITECTURA_ONLINE.md). El servidor nunca contiene reglas propias.
 */
import { definition as ultimaCarta } from '../src/games/ultima-carta/engine/index.js';
import { definition as magnate } from '../src/games/magnate/engine/index.js';

export const GAMES = {
  [magnate.id]: magnate,
  [ultimaCarta.id]: ultimaCarta,
};
