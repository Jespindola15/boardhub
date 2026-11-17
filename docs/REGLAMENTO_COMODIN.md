# Reglamento de Comodín

Juego de descarte por colores con las reglas clásicas. Motor: `src/games/comodin/engine/`,
tests: `tests/comodin.engine.test.js`.

## Mazo (108 cartas)
- 4 colores (rojo, amarillo, verde, azul). Por color: un 0, dos de cada número del 1 al 9, dos Salto, dos Reversa y dos Roba Dos.
- 4 Comodín y 4 Comodín Roba Cuatro.

## Preparación
- De 2 a 10 jugadores; 7 cartas cada uno. Reparte el jugador anterior al primero y la mano rota cada ronda.
- Se da vuelta la primera carta del mazo:
  - Comodín Roba Cuatro: vuelve al mazo, se baraja y se saca otra.
  - Comodín: el primer jugador elige el color.
  - Salto: el primer jugador pierde el turno.
  - Reversa: el sentido se invierte y empieza quien reparte.
  - Roba Dos: el primer jugador roba 2 y pierde el turno.

## Turno
- Se juega una carta que coincida en color, número o símbolo con la de arriba, o un comodín.
- Si no se puede o no se quiere jugar, se roba una carta. Si esa carta sirve, se puede jugar en el acto (sólo esa); si no, pasa el turno.
- Si el mazo se acaba, se baraja el descarte (salvo la carta de arriba).

## Cartas especiales
| Carta | Efecto |
|---|---|
| Salto | El siguiente jugador pierde el turno. |
| Reversa | Cambia el sentido. Con 2 jugadores, funciona como Salto. |
| Roba Dos | El siguiente roba 2 y pierde el turno. |
| Comodín | Quien la juega elige el color. |
| Comodín Roba Cuatro | Elige el color; el siguiente roba 4 y pierde el turno. Sólo es legal si quien la juega no tiene cartas del color actual. |

**Desafío del Roba Cuatro:** el afectado puede desafiar. Si la jugada era ilegal, quien la jugó roba 4 y el afectado juega normalmente. Si era legal, el afectado roba 6 y pierde el turno.

## «¡Comodín!»
- Al jugar la penúltima carta hay que cantar «¡Comodín!».
- Si no se canta, cualquier otro jugador puede atraparlo antes de que actúe el siguiente: el que no cantó roba 2. Se puede cantar tarde si nadie lo atrapó todavía.

## Puntuación
- Gana la ronda quien se queda sin cartas. Si su última carta es un Roba Dos o un Roba Cuatro, el siguiente igual roba esas cartas.
- Suma los puntos de las manos rivales: números = su valor; Salto, Reversa y Roba Dos = 20; comodines = 50.
- Gana la partida quien llega primero al objetivo (500 por defecto; también 100 o 250).
