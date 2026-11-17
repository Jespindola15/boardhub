# Última Carta — Especificación de reglas

Edición: Mattel 41001-0925 (ver `EDICION.md`). Motor: `src/games/ultima-carta/engine/`.
Pruebas: `tests/ultima-carta.engine.test.js`.

## 1. Preparación
1. Cada jugador roba una carta; reparte quien tiene **más puntos** y los empatados vuelven a robar. Se juntan las cartas y se baraja.
2. Se reparten **7 cartas** a cada jugador. El resto forma el mazo de robo.
3. Se da vuelta la primera carta del mazo para iniciar el descarte:

| Primera carta | Efecto |
|---|---|
| Número | Empieza el jugador a la izquierda del repartidor. |
| Comodín Roba Cuatro | Vuelve al mazo, se baraja y se da vuelta otra. |
| Comodín | El jugador a la izquierda del repartidor elige el color y juega primero. |
| Salto | El jugador a la izquierda del repartidor pierde el turno; empieza el siguiente. |
| Reversa | Empieza **el repartidor** y el juego sigue hacia la derecha. |
| Roba Dos | El jugador a la izquierda del repartidor roba 2 y pierde el turno. |

## 2. Turno
- Se puede jugar una carta que coincida en **color, número o símbolo** con la del descarte (el color vigente si la última fue un comodín), o cualquier comodín.
- El Comodín se puede jugar aunque se tenga otra carta jugable.
- El **Comodín Roba Cuatro sólo es legal si no se tiene ninguna carta del color vigente**. Sí se puede tener cartas del mismo número o símbolo en otro color, y se puede jugar igual de forma ilegal, arriesgando el desafío.
- **Renunciar**: se puede no jugar una carta jugable. Entonces hay que robar una: si sirve, se puede jugar sólo esa; si no, o si no se quiere, el turno pasa.
- Se juega **una sola carta por turno**: no se pueden tirar varias cartas iguales.
- **No se acumulan** Roba Dos ni Roba Cuatro: quien recibe uno roba y pierde el turno, sin poder responder con otro.
- Si se acaba el mazo, se baraja el descarte salvo la carta de arriba.

## 3. Cartas especiales

| Carta | 3 o más jugadores | 2 jugadores |
|---|---|---|
| Salto | El siguiente pierde el turno. | Quien la juega vuelve a jugar. |
| Reversa | Cambia el sentido. | Funciona como Salto: quien la juega vuelve a jugar. |
| Roba Dos | El siguiente roba 2 y pierde el turno. | El rival roba 2 y vuelve a jugar quien la tiró. |
| Comodín | Se elige el color (puede ser el mismo). | Ídem. |
| Comodín Roba Cuatro | Se elige el color; el siguiente roba 4 y pierde el turno (salvo desafío). | El rival roba 4 y vuelve a jugar quien la tiró. |

## 4. Desafío del Comodín Roba Cuatro
- Sólo puede desafiar **quien debe robar las 4 cartas**, antes de robarlas.
- Quien fue desafiado **muestra su mano sólo a quien desafió**: en el online, la mano llega únicamente a ese jugador.
- Si lo jugó de forma ilegal (tenía una carta del color vigente): **él roba 4** y quien desafió juega normalmente.
- Si era legal: **quien desafió roba 6** (4 + 2) y pierde el turno.

## 5. «¡Última carta!» (el "UNO")
- Hay que anunciarlo al jugar la penúltima carta. En la interfaz se marca antes de jugar, o se pulsa el botón después, siempre que nadie lo haya atrapado todavía.
- Si no se anuncia, cualquier otro jugador puede atraparlo **desde que la penúltima carta llega al descarte hasta que el siguiente jugador empieza su turno**. Empezar el turno es robar, jugar o resolver un Roba Cuatro.
- Quien es atrapado **roba 4 cartas**. Si anuncia antes de que lo atrapen, queda a salvo.

## 6. Fin de la mano y puntuación
- La mano termina cuando alguien juega su última carta. Si esa carta es un Roba Dos o un Roba Cuatro, el siguiente igual roba esas cartas, y cuentan para los puntos (sin desafío).
- **Método principal** (opción `scoring: 'winner'`): quien se queda sin cartas suma los puntos de todas las manos rivales. Gana el primero en llegar a **500**.
- **Método alternativo oficial** (opción `scoring: 'low'`): al terminar cada mano, cada jugador suma los puntos de su propia mano. Cuando alguien llega a 500 termina la partida y gana quien tiene **menos** puntos (con empate, ganan todos los empatados).
- En la mano siguiente reparte el siguiente jugador a la izquierda.

## 7. Flujo de estados

```
playing ──(alguien se queda sin cartas)──▶ round-over ──NEXT_ROUND──▶ playing
   │                                             │
   │                                (alguien llega al objetivo)
   ▼                                             ▼
 (dentro de playing)                          finished
   turno normal ──PLAY_CARD──────────────▶ siguiente jugador
        │  └──DRAW_CARD─▶ ¿sirve? ─ sí ─▶ PLAY_CARD (sólo esa) | PASS
        │                         └ no ─▶ siguiente jugador
        ├─ comodín inicial ─▶ CHOOSE_COLOR
        └─ +4 jugado ─▶ víctima: ACCEPT_DRAW4 | CHALLENGE_DRAW4
   en cualquier momento: CALL_LAST_CARD (quien debía anunciar), CATCH (los demás)
```

## 8. Acciones legales

| Acción | Quién | Cuándo |
|---|---|---|
| `CHOOSE_COLOR {color}` | Jugador del turno | Primera carta Comodín, antes de jugar |
| `PLAY_CARD {cardId, color?, announce?}` | Jugador del turno | Carta jugable; tras robar, sólo la robada. `color` obligatorio en comodines |
| `DRAW_CARD` | Jugador del turno | Si todavía no robó en este turno |
| `PASS` | Jugador del turno | Sólo después de robar una carta jugable |
| `ACCEPT_DRAW4` / `CHALLENGE_DRAW4` | Víctima del +4 | Con un +4 pendiente |
| `CALL_LAST_CARD` | Quien quedó con una carta sin anunciar | Mientras nadie lo atrapó y el siguiente no empezó |
| `CATCH {targetId}` | Cualquier otro jugador | Misma ventana |
| `NEXT_ROUND` | Cualquier jugador | Fase `round-over` |
| `LEAVE` | Cualquier jugador | Política de plataforma: su mano se baraja en el mazo y deja de jugar |

## 9. Información privada
Cada jugador ve su propia mano, cuántas cartas tienen los demás, el descarte, el color vigente y cuántas cartas quedan en el mazo. **Nunca ve** las manos ajenas ni el orden del mazo. La única excepción es la mano del desafiado, que se muestra a quien desafió (§4). La función `getPlayerView(state, playerId)` produce exactamente esa vista.
