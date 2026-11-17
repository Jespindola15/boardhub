# Misterio — especificación implementada

**Reglas:** clásico juego de deducción (quién, con qué y dónde), según los reglamentos de Hasbro. Para el movimiento se usa la versión actual ("hasta la cantidad sacada", dos dados).
**Material propio:** 6 personajes (Condesa Carmín, Barón Ocre, Madame Perla, General Oliva, Doctora Índigo, Señor Grafito), 6 armas (abrecartas, trofeo, cuerda, veneno, pistola, llave inglesa), 9 habitaciones y un plano de 24 × 24 diseñado para BoardHub.
**Código:** `src/games/misterio/` · plano: `data/board.js` · tests: `tests/misterio.engine.test.js`.

## Reglas
| Regla | Implementación |
|---|---|
| Jugadores | 3 a 6. Cada uno lleva el personaje de su asiento; empieza la Condesa Carmín. Los personajes sin jugador también están en el tablero y pueden ser convocados. |
| Sobre | Una carta al azar de cada tipo. El resto se reparte en ronda (puede quedar desparejo). |
| Armas | Arrancan una por habitación, al azar. |
| Movimiento | 2 dados; hasta esa cantidad de casilleros, sin diagonales, sin atravesar casilleros ocupados. Entrar por una puerta termina el movimiento. No se vuelve a entrar en el mismo turno a la habitación de la que se salió. |
| Pasajes secretos | Estudio ↔ Cocina y Salón ↔ Invernadero, en lugar de tirar. |
| Sugerencia | Sólo al entrar a una habitación (o al quedarse si te trajo una sugerencia). Personaje y arma se trasladan allí. |
| Refutar | En orden desde el siguiente jugador; el primero que pueda muestra una carta, en privado. Si tiene varias, elige cuál; si tiene una sola, se muestra sola. |
| Acusación | En tu turno. Correcta: ganás. Incorrecta: quedás fuera (seguís refutando). |

## Decisiones
1. **Si queda un solo investigador** (todos los demás acusaron mal), gana él. El reglamento no lo detalla; evita una partida de una sola persona.
2. **Abandonar online**: sus cartas quedan a la vista de todos (así no se pierde información de la partida).
3. **Libreta**: se guarda en el navegador de cada jugador. Las cartas propias y las mostradas se tachan solas.
