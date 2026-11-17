# Colonias — especificación implementada

**Reglas:** juego básico de colonos en una isla (3–4 jugadores), 5.ª edición del reglamento.
**Código:** `src/games/colonias/engine/` (`board.js` geometría y tablero, `index.js` reglas) · tests: `tests/colonias.engine.test.js`.
Nombres, íconos y dibujo propios.

## Tablero
- 19 hexágonos: 4 bosque (madera), 4 pasto (lana), 4 campo (trigo), 3 cerro (ladrillo), 3 montaña (mineral), 1 desierto.
- Fichas: 2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12 en el orden de la espiral del reglamento (A–R), saltando el desierto.
- Tablero variable: terrenos al azar; si quedan 6 u 8 vecinos se vuelve a mezclar (el reglamento pide que no se toquen).
- 9 puertos sobre la costa (separación 3-4-3 como el marco): 4 genéricos 3:1 y 5 específicos 2:1.
- El ladrón empieza en el desierto. Banco: 19 cartas de cada recurso. 25 cartas de desarrollo.

## Reglas
| Regla | Implementación |
|---|---|
| Preparación | Orden en serpiente (1-2-3-4-4-3-2-1); poblado + camino adyacente; el 2.º poblado da 1 recurso por hexágono vecino. |
| Regla de la distancia | Ningún edificio en un vértice vecino. |
| Producción | Poblado 1, ciudad 2; el hexágono del ladrón no produce. Escasez: si el banco no alcanza para todos, nadie cobra ese recurso (si es un solo jugador, cobra lo que quede). |
| El 7 | Más de 7 cartas: descartar ⌊mitad⌋ (todos a la vez). Mover el ladrón a otro hexágono y robar 1 carta al azar a un jugador con edificio allí. |
| Costos | Camino 🌲🧱 · Poblado 🌲🧱🐑🌾 · Ciudad 🌾🌾⛰️⛰️⛰️ · Desarrollo 🐑🌾⛰️. |
| Límites | 15 caminos, 5 poblados, 4 ciudades. |
| Conexión | Caminos conectados a tu red (un edificio ajeno corta el paso); poblados nuevos junto a un camino propio. |
| Comercio | Banco 4:1; puerto 3:1 o 2:1 del recurso. Entre jugadores sólo con el jugador de turno. |
| Desarrollo | 14 caballeros, 5 puntos, 2 caminos, 2 abundancia, 2 monopolio. Una por turno, no la comprada en ese turno; el caballero puede jugarse antes de tirar. |
| Gran Ejército | 3+ caballeros; pasa a quien tenga más. 2 puntos. |
| Gran Camino | 5+ caminos continuos; pasa a quien lo supere; si se corta y hay empate, queda sin dueño. 2 puntos. |
| Victoria | 10 puntos en tu turno (los puntos ocultos cuentan). |

## Decisiones
1. **Ofertas entre jugadores**: dirigidas a un jugador por vez, que acepta o rechaza. Así cada decisión tiene un responsable claro (también en la PC compartida). No hay contraofertas automáticas: se rechaza y se propone otra.
2. **Abandonar online**: sus piezas quedan en el tablero (siguen bloqueando), sus recursos vuelven al banco y pierde los títulos.
