# BoardHub Online — Fase 1

Plataforma de juegos de mesa multijugador en el navegador. Primer juego: **Magnate**.

> Fase 1 = estructura + interfaz con datos simulados. No hay reglas, servidor ni multijugador todavía.

## Ejecutar

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # compila a dist/
npm run preview    # sirve la versión compilada
```

Rutas: `#/` (inicio y catálogo) · `#/juegos/magnate` (mesa de Magnate).

## Estructura

```
src/
  app/                 Router hash mínimo y App
  platform/            Plataforma general (no conoce reglas de ningún juego)
    catalog/           gamesCatalog.js — registro de juegos
    components/        Logo, SiteHeader, GameCard, GameArt
    pages/             HomePage, GameHost (carga diferida del juego), NotFound
  shared/              Button (con estado "pendiente"), Panel, Badge
  styles/              variables.css (tokens de diseño), base.css
  net/                 Comunicación online futura (sólo README)
  games/magnate/
    data/              board.js (40 casillas), groups.js       ← JS puro
    models/            player.js (colores, fichas, estados)    ← JS puro
    state/             gameState.js, selectors.js, mockScenarios.js ← JS puro
    engine/            Motor de reglas futuro (contrato + acciones) ← JS puro
    components/        board/, panels/, icons/ (React)
    MagnateScreen.jsx  Pantalla de partida
docs/                  ARQUITECTURA.md, PENDIENTES.md
```

Las carpetas marcadas "JS puro" no importan React ni el DOM, así que el servidor
Node podrá importarlas tal cual.

Más detalle en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) y [`docs/PENDIENTES.md`](docs/PENDIENTES.md).
