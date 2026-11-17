/**
 * Juegos disponibles en línea. Cada uno expone la `definition` común de BoardHub
 * (ver docs/ARQUITECTURA_ONLINE.md). El servidor nunca contiene reglas propias.
 */
import { definition as ultimaCarta } from '../src/games/ultima-carta/engine/index.js';
import { definition as magnate } from '../src/games/magnate/engine/index.js';
import { definition as chinchon } from '../src/games/chinchon/engine/index.js';
import { definition as truco } from '../src/games/truco/engine/index.js';
import { definition as dominio } from '../src/games/dominio/engine/index.js';
import { definition as rutas } from '../src/games/rutas/engine/index.js';
import { definition as colonias } from '../src/games/colonias/engine/index.js';
import { definition as misterio } from '../src/games/misterio/engine/index.js';
import { definition as mazmorras } from '../src/games/mazmorras/engine/index.js';

export const GAMES = {
  [magnate.id]: magnate,
  [ultimaCarta.id]: ultimaCarta,
  [chinchon.id]: chinchon,
  [truco.id]: truco,
  [dominio.id]: dominio,
  [rutas.id]: rutas,
  [colonias.id]: colonias,
  [misterio.id]: misterio,
  [mazmorras.id]: mazmorras,
};
