# Rutas — especificación implementada

**Reglas:** las del clásico juego de vagones y destinos, edición básica.
**Mapa:** propio (Sudamérica, 40 ciudades, 82 tramos, 35 destinos). No reproduce el mapa de ninguna edición comercial.
**Código:** `src/games/rutas/` · mapa: `data/map.js` · tests: `tests/rutas.engine.test.js`.

## Material
- 2 a 5 jugadores, 45 vagones cada uno.
- 110 cartas de vagón: 12 de cada color (rojo, naranja, amarillo, verde, azul, violeta, negro, blanco) + 14 locomotoras.
- Destinos: el valor de cada destino es el largo del camino más corto entre las dos ciudades (calculado del mapa).

## Reglas
| Regla | Implementación |
|---|---|
| Preparación | 4 cartas de vagón; 5 visibles; 3 destinos, quedarse ≥ 2 (todos eligen a la vez). |
| Turno | Una acción: robar 2 cartas, ocupar un tramo o robar 3 destinos (quedarse ≥ 1). |
| Locomotora visible | Si se toma, es la única carta del turno; no se puede tomar como segunda. Las del mazo no tienen restricción. |
| 3 locomotoras visibles | Se descartan las 5 y se reponen (si hay cartas suficientes). |
| Ocupar | Tantas cartas del color del tramo como su largo (gris: cualquier color, todas iguales); locomotoras como comodín. |
| Rutas dobles | Nadie ocupa los dos tramos; con 2–3 jugadores sólo se usa uno. |
| Puntos | Largo 1: 1 · 2: 2 · 3: 4 · 4: 7 · 5: 10 · 6: 15. |
| Fin | Al terminar un turno con ≤ 2 vagones, cada jugador (incluido él) juega un turno más. |
| Final | Destinos cumplidos +valor, no cumplidos −valor; camino continuo más largo +10 (empate: a todos). |
| Desempate | Más destinos cumplidos; luego camino más largo. |

## Decisiones
1. **Pago**: el jugador elige el color; el motor usa primero cartas de ese color y completa con locomotoras (lo óptimo).
2. **Mazo agotado**: se mezcla el descarte. Si no queda ninguna acción posible, el jugador pasa; si pasan todos seguidos, la partida termina y se puntúa.
3. **Abandonar online**: el jugador queda fuera; sus tramos siguen ocupados y no puntúa para ganar.
