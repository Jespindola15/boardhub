# Truco argentino — especificación implementada

**Fuentes:** trucoargentino.com.ar/reglas · truco.ar/reglas · trucoargento.com.ar/reglamento.
**Código:** `src/games/truco/engine/index.js` · tests: `tests/truco.engine.test.js`.
**Por defecto:** sin flor, a 30 puntos, pica-pica activado para 6 jugadores.

## Mesa
- 2 (1 contra 1), 4 (2 contra 2) o 6 (3 contra 3). Compañeros alternados: asientos pares = un equipo, impares = el otro (online: por orden de llegada a la sala).
- Baraja española de 40 cartas (sin 8, 9 ni comodines). 3 cartas por jugador. Da cada ronda el siguiente; es mano el de la derecha del que da.

## Jerarquía
Ancho de espadas > ancho de bastos > 7 de espadas > 7 de oros > 3 > 2 > anchos falsos (1 de copas y oros) > 12 > 11 > 10 > sietes falsos > 6 > 5 > 4. Cartas del mismo valor empatan.

## Bazas y pardas
Gana la mano el equipo que gana dos bazas. La baza la gana el equipo de la carta más alta; si la carta más alta está en los dos equipos, es parda. Tras una parda vuelve a abrir quien abrió esa baza.
| Bazas | Gana |
|---|---|
| Gana 1.ª y 2.ª, o gana 1.ª y parda 2.ª | el de la 1.ª |
| Gana 1.ª, pierde 2.ª, parda 3.ª | el de la 1.ª |
| Parda 1.ª | el de la 2.ª (si es parda, el de la 3.ª) |
| Tres pardas | el equipo mano |

## Truco
Querido / no querido: truco 2 / 1 · retruco 3 / 2 · vale cuatro 4 / 3. Sin truco, la mano vale 1. Sólo sube el equipo que dijo "quiero". Responder subiendo implica querer.

## Envido
- Sólo en la primera baza, antes de jugar la carta propia y antes de que el truco se acepte. En 2 contra 2 y 3 contra 3 lo **abren los pies** (último de cada equipo en el orden de la mano); responde cualquiera del equipo rival.
- Tanto: 20 + las dos cartas del mismo palo (figuras = 0); si no hay dos del mismo palo, la carta más alta. Máximo 33. Empate: gana el equipo mano. El equipo compara su mejor tanto.
- Cadenas válidas: E, E-E, R, E-R, E-E-R, y la falta al final de cualquiera. Querido: E 2, EE 4, R 3, ER 5, EER 7. No querido: lo acumulado antes del último canto, o 1 si era el primero.
- Falta envido: lo que le falta al que va ganando para llegar al total. A 30, si los dos están en las malas (< 15), la falta gana el partido. En los duelos de pica-pica vale 6.
- **"El envido está primero"**: ante un truco en la primera baza, el que responde puede cantar envido; se resuelve el envido y el truco queda esperando respuesta.

## Irse al mazo
El rival suma el valor del truco en ese momento (si había un truco sin responder, como si no se quisiera). Si es en la primera baza y el envido no se jugó, suma además 1 (en total 2 sin cantos). En equipo se va todo el equipo (decisión: simplifica el turno; algunas mesas permiten irse a uno solo).

## Flor (opcional)
Tres cartas del mismo palo. Se canta en la primera baza antes de jugar; anula el envido. Si el rival no tiene flor: 3. Si tiene: "con flor me achico" 3; contraflor querida 6 / no querida 3; contraflor al resto querida = la falta / no querida 6. Las flores de los compañeros se suman. Empate: el mano.

## Pica-pica (6 jugadores, opcional, partidas a 30)
Mientras el equipo que va ganando tenga entre 5 y 24 puntos, se alternan manos redondas (los seis) con rondas de pica-pica: tres duelos 1 contra 1 entre rivales enfrentados (1.º con 4.º, 2.º con 5.º, 3.º con 6.º en el orden de la mano). **Decisión:** los duelos se juegan uno tras otro (en la mesa real son simultáneos) para que cada jugador decida en su momento. Llegar al total termina el partido en el acto.

## Plataforma
- Abandonar la partida online: su equipo pierde.
- Cada jugador sólo ve sus cartas y las jugadas; del envido sólo se hacen públicos los tantos de cada equipo.
