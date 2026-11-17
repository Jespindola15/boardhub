# Arquitectura de BoardHub Online

## Capas

| Capa | Ubicación | Depende de | Notas |
|---|---|---|---|
| Plataforma | `src/platform`, `src/app` | `shared` | Inicio, catálogo, navegación. No sabe nada de reglas. |
| Catálogo | `platform/catalog/gamesCatalog.js` | — | Manifest de cada juego + `load()` con `import()` diferido. |
| UI compartida | `src/shared` | — | Botón, panel, badge. |
| Datos del tablero | `games/magnate/data` | — | Estáticos, congelados, serializables. |
| Modelos | `games/magnate/models` | — | Jugador, colores, fichas, estados. |
| Estado de partida | `games/magnate/state` | data, models | Objeto JSON plano + selectores puros. |
| Motor de reglas | `games/magnate/engine` | data, models, state | **Fase 2.** Función pura `applyAction`. |
| Componentes Magnate | `games/magnate/components` | todo lo anterior | Sólo presentación: reciben `state` por props. |
| Red | `src/net` | engine (tipos de acción) | **Fase 2+.** Cliente Socket.IO. |

## Añadir un juego nuevo

1. `src/games/<slug>/index.js` exporta por defecto su pantalla.
2. Entrada en `GAMES` con `status: 'available'` y `load: () => import(...)`.

`GameHost` lo carga en `#/juegos/<slug>` sin más cambios.

## Datos del tablero vs. estado

- `data/board.js` describe **qué es** cada casilla: tipo, nombre, grupo, precio, alquileres, coste de casa, hipoteca.
- `state.ownership[index]` describe **qué le pasa**: dueño, casas (0–4, 5 = hotel), hipotecada.
- Las coordenadas de pantalla no están en los datos; las calcula `components/board/boardGeometry.js` a partir del índice.

## Servidor autoritativo (previsto)

```
cliente ── intención {type, playerId, payload} ──▶ servidor
servidor: engine.applyAction(state, action, rng) → nuevo estado (version++)
servidor ── estado oficial ──▶ todos los clientes de la sala
```

- El cliente nunca modifica el estado de partida. En la Fase 1, la única
  excepción es la herramienta de prueba "Mover fichas al azar", rotulada como tal.
- El azar (dados, mazos) lo genera el servidor con un `rng` inyectado.
- El estado se puede persistir en PostgreSQL/Supabase tal cual (JSON).
- No se usa PeerJS.

## Decisiones técnicas

- **Router hash propio** (30 líneas) en lugar de react-router: cero dependencias y funciona en cualquier hosting estático.
- **Tablero en CSS Grid 11×11** con esquinas de 1,45 casillas. Tipografía en unidades de *container query* (`cqmin`) para que escale con el tablero.
- **Fichas en una capa superpuesta** con posiciones en %: hasta 8 por casilla sin solaparse, y transición CSS al moverse (base de la animación de movimiento).
- **Cárcel** con dos zonas: celda (encarcelados) y franja "de visita".
- **Sin Three.js**: el tablero 2D cubre los requisitos. La geometría está aislada, así que una vista 3D futura sólo reemplazaría la capa de presentación.
- Dependencias: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`. Nada más.
