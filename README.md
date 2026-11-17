# BoardHub Online

Plataforma de juegos de mesa multijugador en el navegador.

| Juego | Estado | Reglamento |
|---|---|---|
| **Magnate** (Monopoly, edición Hasbro G0009) | Jugable en una misma PC, auditado frente al reglamento oficial | [docs/reglas/magnate/](docs/reglas/magnate/) |
| **Comodín** (descarte por colores) | Jugable en una misma PC, reglas clásicas completas | [docs/REGLAMENTO_COMODIN.md](docs/REGLAMENTO_COMODIN.md) |
| Conquista (estrategia territorial), Colonos (colonización y comercio), Ludo | Próximamente | — |

## Ejecutar

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests de los motores de reglas
npm run build      # compila a dist/
```

Rutas: `#/` (inicio y catálogo) · `#/juegos/magnate` · `#/juegos/comodin`.
La partida en curso se guarda en el navegador: si recargas, sigue donde estaba.

## Estructura

```
src/
  app/                 Router hash mínimo y App
  platform/            Plataforma (inicio, catálogo, barra de juego, carga diferida)
  shared/              Button, Panel, Badge, Modal, useLocalGame, paleta de jugadores
  net/                 Comunicación online futura (README)
  games/
    magnate/
      data/            Tablero (40 casillas), grupos, 32 cartas        ← JS puro
      models/          Jugador                                          ← JS puro
      state/           Estado de partida y selectores                   ← JS puro
      engine/          Motor de reglas: applyAction(state, action, rng)  ← JS puro
      components/      Tablero, paneles, controles, configuración (React)
    comodin/
      data/ engine/    Mazo de 108 cartas y motor de reglas              ← JS puro
      components/      Cartas, configuración (React)
tests/                 Tests de los motores (node --test, sin dependencias)
docs/                  Arquitectura, reglamentos, pendientes
```

Los motores no importan React ni el DOM: el futuro servidor Node los usará tal cual.
