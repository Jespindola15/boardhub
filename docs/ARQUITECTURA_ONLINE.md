# BoardHub — Arquitectura online (todos los juegos)

## Componentes

```
Navegador (cada PC)                    Producción: Cloudflare Worker              Motores (JS puro)
──────────────────                     ───────────────────────────               ─────────────────
#/sala/CODIGO                          worker/index.js   web + POST /api/rooms
  useRoom(code)                        worker/room-do.js 1 Durable Object = 1 sala ─▶ definition.applyAction
   └ WebSocket /ws/CODIGO ◀──────────▶   └ server/core (Room + protocolo)          definition.getPlayerView
                                       Desarrollo/pruebas: server/index.js (Node + ws), mismo núcleo
```

- **Un solo motor y un solo núcleo de salas.** `server/core/room.js` (lógica de una sala) y `server/core/protocol.js` (mensajes) corren igual en Node y en el Durable Object. No hay reglas duplicadas.
- **Contrato de juego** (`definition`): `setup`, `applyAction`, `getPlayerView`, `getPendingDeciders`, `getResult`, `removePlayer`, `validateOptions`. Lo implementan Magnate y Última Carta. Para sumar un juego al online: registrar su `definition` en `server/games.js` y exportar `OnlineTable`, `OptionsEditor` y `RulesModal` desde `src/games/<juego>/online.js` (más `online: true` y `loadOnline` en el catálogo).

## Protocolo (WebSocket nativo)

Cliente → servidor `{ id, ev, payload }` · respuesta `{ re: id, data }` · evento `{ ev, data }`.

| Petición | Respuesta | Notas |
|---|---|---|
| `POST /api/rooms {gameId, name, options}` (HTTP) | `{code, playerId, token}` | Crea la sala; el creador es el anfitrión. |
| `room:join {name}` | `{code, playerId, token}` | Sólo en la sala de espera, con asientos libres y nombre único. |
| `room:resume {token}` | `{code, playerId}` | Reconexión: el token secreto identifica el asiento. |
| `room:options {options}` / `room:start` | — | Sólo el anfitrión. |
| `room:leave` / `room:remove {playerId}` | — | Política de abandono (`removePlayer` del juego). |
| `game:action {clientActionId, type, payload, expectedVersion}` | `{ok, error?, stale?, duplicate?}` | El servidor pone el `playerId`. |
| `sync` / `ping` | — | Reenviar la vista / latido. |

| Evento | Contenido |
|---|---|
| `room:update` | Código, juego, estado, anfitrión, asientos (nombre, conectado), opciones. |
| `game:view` | **Vista privada** del jugador (incluye `legal`/`deciders` cuando el juego los provee). |
| `room:removed` / `room:missing` | Te quitaron de la sala / la sala no existe. |

## Garantías

| Requisito | Cómo |
|---|---|
| Servidor autoritativo | Sólo el servidor ejecuta `applyAction`; el cliente envía intenciones. |
| Identidad | El `playerId` sale de la sesión del socket; se ignora el que mande el cliente. |
| Información privada | A cada socket se le envía sólo `getPlayerView(state, suId)`. El mazo y las manos ajenas no salen del servidor. |
| Azar | `crypto.getRandomValues` en el servidor. |
| Acciones duplicadas | Cada intención lleva `clientActionId`; el servidor guarda las últimas 200 respuestas y repite la misma sin volver a aplicarla. |
| Concurrencia | El Durable Object (y Node) procesa los mensajes de a uno, y cada acción lleva la versión que vio el jugador: si dos actúan a la vez sobre la misma versión, se aplica la primera y la segunda se rechaza sin efecto (`stale`). |
| Tiempo real | Tras cada acción válida, todos reciben su vista al instante; latido; reconexión automática; límite de 60 eventos/s por conexión. |
| Fuera de turno | Lo rechaza el motor. |
| Reconexión | El token se guarda en `localStorage` por sala; al volver, `room:resume` reenvía la vista. |
| Guardar progreso | Workers: almacenamiento del Durable Object en cada cambio. Node: `server/data/rooms.json`. |
| Abandonos | Política de plataforma: `room:leave` o el anfitrión quitando a un desconectado. En la sala de espera se libera el asiento. |
| Salas inactivas | Se borran tras 24 h sin actividad (alarma del Durable Object). |

## Pendiente para fases siguientes
- Registro de auditoría con los valores del azar (para reproducir partidas online).
- Espectadores.
