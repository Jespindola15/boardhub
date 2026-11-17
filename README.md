# BoardHub Online

Plataforma de juegos de mesa multijugador en el navegador.

| Juego | Estado | Reglamento |
|---|---|---|
| **Magnate** (Monopoly, edición Hasbro G0009) | **En línea** con salas privadas y en una misma PC | [docs/reglas/magnate/](docs/reglas/magnate/) |
| **Última Carta** (UNO, Mattel 41001-0925) | **En línea** con salas privadas y en una misma PC | [docs/reglas/ultima-carta/](docs/reglas/ultima-carta/) |
| Colonias (Catan), Dominio (Risk), Misterio (Clue), Rutas (Ticket to Ride) | Próximamente | — |

## Ejecutar

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run server     # servidor de juego en :3001 (necesario para jugar en línea)
npm run dev        # web en http://localhost:5173 (en otra terminal)
npm test           # pruebas de motores y servidor
```

**Publicar en Cloudflare Workers** (siempre encendido, `https://boardhub.<tu-subdominio>.workers.dev`):

```bash
npx wrangler login
npm run deploy
```

Otras opciones (túnel desde tu PC con `npm run compartir`, Docker): `docs/DESPLIEGUE.md`.

Rutas: `#/` · `#/salas` · `#/sala/CODIGO` · `#/juegos/magnate` · `#/juegos/ultima-carta`.
La partida en curso se guarda en el navegador: si recargas, sigue donde estaba.

## Estructura

```
src/
  app/                 Router hash mínimo y App
  platform/            Plataforma (inicio, catálogo, barra de juego, carga diferida)
  shared/              Button, Panel, Badge, Modal, useLocalGame, paleta de jugadores
  net/                 Cliente Socket.IO, sesiones y useRoom (salas online)
  games/
    magnate/
      data/            Tablero (40 casillas), grupos, 32 cartas        ← JS puro
      models/          Jugador                                          ← JS puro
      state/           Estado de partida y selectores                   ← JS puro
      engine/          Motor de reglas: applyAction(state, action, rng)  ← JS puro
      components/      Tablero, paneles, controles, configuración (React)
    ultima-carta/
      data/ engine/    Mazo de 108 cartas y motor con vistas privadas    ← JS puro
      components/      Mesa, cartas, configuración (React)
server/core/           Núcleo de salas y protocolo (compartido)
server/index.js        Servidor Node (desarrollo, pruebas, túnel)
worker/                Cloudflare Worker + Durable Object por sala (producción)
tests/                 Tests de los motores (node --test, sin dependencias)
docs/                  Arquitectura, reglamentos, pendientes
```

Los motores no importan React ni el DOM: el futuro servidor Node los usará tal cual.
