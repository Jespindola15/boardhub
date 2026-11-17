# Chinchón — especificación implementada

**Fuente:** reglamento de Chin-Chon de los Juegos Bonaerenses (Provincia de Buenos Aires).
**Código:** `src/games/chinchon/engine/` (motor puro) · tests: `tests/chinchon.engine.test.js`.

## Material
Baraja española de 48 cartas (1 a 12 de oros, copas, espadas y bastos) + 2 comodines = 50 cartas.

## Reglas implementadas
| Regla | Implementación |
|---|---|
| Jugadores | 2 a 4 (el reglamento organiza mesas de 4; con 2–3 se juega igual). |
| Quién da | Cada jugador saca una carta; da la más alta (empates, se repite). Después rota al siguiente. |
| Reparto | 7 cartas a cada uno, de a una, empezando por la derecha del que da. La 8.ª carta se da vuelta: es el pozo. |
| Turno | Robar (mazo o carta de arriba del pozo) y descartar una al pozo. Siempre 7 cartas. Los comodines no se tiran. |
| Grupo | 3 o 4 cartas del mismo número, de palos distintos. |
| Escalera | 3 o más cartas consecutivas del mismo palo; el As va sólo antes del 2 (no hay 12-1). |
| Comodín | Reemplaza una carta; máximo uno por combinación; en la mano vale 20. |
| Cortar | En lugar de descartar: la carta va tapada; lo suelto debe sumar ≤ 5. |
| Bonificaciones | Cortar con todo combinado: −10. Chin-Chon (7 cartas en escalera de un palo) con comodín: −10. Sin comodín: gana el partido (los demás quedan con 101+). |
| Bajar | Corta y baja primero; los demás, en orden desde su derecha, bajan y acomodan cartas sueltas en juegos ya bajados. |
| Mazo agotado | Primera vez: se mezcla el pozo. Segunda: termina la mano sin corte y sin acomodar en juegos ajenos. |
| Eliminación | Quien supera 101 queda afuera (sin reenganche). Gana el último que queda. |
| Todos pasan a la vez | Gana el de menos puntos; si empatan, el que cortó; luego el que era mano. |

## Decisiones donde el reglamento no es explícito (documentadas)
1. **Disposición óptima automática**: al cortar y al bajar, el motor elige la combinación y las cartas acomodadas que menos puntos dejan. Un jugador humano podría equivocarse; aquí nunca pierde puntos por eso.
2. **Identidad del comodín en un grupo**: toma el primer palo libre. Sólo importa para acomodar cartas ajenas (ese palo queda ocupado).
3. **"Pasar 101"**: se queda afuera con **más de** 101 (llegar justo a 101 sigue en juego).
4. **Abandonar** (online): el jugador queda afuera y sus cartas vuelven al mazo.
5. **Orden de la mano**: el jugador puede reordenar arrastrando; el orden es local a su pantalla y no lo ve nadie.
