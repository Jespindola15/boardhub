# BoardHub — Arquitectura online (todos los juegos)

## Componentes

```
Navegador (cada PC)                         Servidor (Node + Socket.IO)              Motor del juego (JS puro)
──────────────────                          ───────────────────────────              ─────────────────────────
#/sala/CODIGO                               server/index.js   HTTP + sockets         src/games/<juego>/engine
  useRoom(code) ──── intenciones ────────▶  server/rooms.js   salas y asientos  ───▶   definition.applyAction
                ◀─── sala + vista propia ─  server/store.js   guardado en disco ◀───   definition.getPlayerView
```

- **Un solo motor.** El servidor importa el mismo motor que usa el modo local. No hay reglas duplicadas.
- **Contrato de juego** (`definition`):
  - `setup(config, rng)`
  - `applyAction(state, action, rng)`
  - `getPlayerView(state, id)`
  - `getLegalActions(state, id)`
  - `getPendingDeciders(state)`
  - `getResult(state)`
  - `removePlayer(state, id, rng)`

  Lo implementan Magnate y Última Carta. Para sumar un juego al online basta con registrar su `definition` en `server/games.js` y exportar `OnlineTable`, `OptionsEditor` y `RulesModal` desde `src/games/<juego>/online.js` (más `online: true` y `loadOnline` en el catálogo).

## Protocolo

| Evento cliente → servidor | Respuesta | Notas |
|---|---|---|
| `room:create {gameId, name, options}` | `{code, playerId, token}` | El creador es el anfitrión. |
| `room:join {code, name}` | `{code, playerId, token}` | Sólo en la sala de espera, con asientos libres y nombre único. |
| `room:resume {code, token}` | `{code, playerId}` | Reconexión: el token secreto identifica el asiento. |
| `room:start` | — | Sólo el anfitrión, con el mínimo de jugadores. |
| `room:leave` | — | En partida, aplica `removePlayer` (política de plataforma). |
| `room:remove {playerId}` | — | El anfitrión quita a un jugador desconectado. |
| `game:action {clientActionId, type, payload, expectedVersion}` | `{ok, error?, stale?}` | El servidor pone el `playerId` y rechaza acciones decididas sobre una versión vieja. |
| `sync` | — | Reenvía la sala y la vista actuales. |

| Evento servidor → cliente | Contenido |
|---|---|
| `room:update` | Código, juego, estado, anfitrión, asientos (nombre y si está conectado), opciones. |
| `game:view` | **Vista privada** de ese jugador + `legal` (acciones que puede hacer) + `version`. |

## Garantías

| Requisito | Cómo |
|---|---|
| Servidor autoritativo | Sólo el servidor ejecuta `applyAction`; el cliente envía intenciones. |
| Identidad | El `playerId` sale de la sesión del socket; se ignora el que mande el cliente. |
| Información privada | A cada socket se le envía sólo `getPlayerView(state, suId)`. El mazo y las manos ajenas no salen del servidor. |
| Azar | `crypto.randomInt` en el servidor. |
| Acciones duplicadas | Cada intención lleva `clientActionId`; el servidor guarda las últimas 200 respuestas y repite la misma sin volver a aplicarla. |
| Concurrencia | Node procesa los eventos de a uno y cada acción lleva la versión que vio el jugador: si dos actúan a la vez sobre la misma versión, se aplica la primera y la segunda se rechaza sin efecto (`stale`). |
| Tiempo real | Tras cada acción válida, todos reciben su vista al instante; latido cada 10 s; compresión de mensajes grandes; límite de 60 eventos/s por conexión. |
| Fuera de turno | Lo rechaza el motor. |
| Reconexión | El token se guarda en `localStorage` por sala; al volver, `room:resume` reenvía la vista. |
| Guardar progreso | Cada cambio se escribe en `server/data/rooms.json`, con escritura atómica y agrupada; al reiniciar, el servidor recupera las salas. |
| Abandonos | Política de plataforma: `room:leave` o el anfitrión quitando a un desconectado. En la sala de espera se libera el asiento. |
| Salas inactivas | Se borran tras 24 h sin actividad. |

## Pendiente para fases siguientes
- Persistencia en PostgreSQL o Supabase, reemplazando `server/store.js`.
- Límites de frecuencia por socket y registro de auditoría con los valores del azar.
