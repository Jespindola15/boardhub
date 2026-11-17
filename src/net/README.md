# `src/net/` — comunicación online (futuro)

Vacío a propósito en la Fase 1. Aquí vivirá el cliente Socket.IO.

Flujo previsto (servidor autoritativo):

```
Cliente                              Servidor (Node + Socket.IO)
  │  room:join {code, name}  ───────▶  valida, asigna asiento
  │  ◀─────── room:state {lobby}
  │  game:action {type, payload} ──▶  engine.applyAction(state, action, rng)
  │                                    ├─ ok    → guarda, version++
  │  ◀─────── game:state {state}       │         difunde a toda la sala
  │  ◀─────── game:error {code}        └─ error → sólo al emisor
```

Reglas:

- El cliente **nunca** modifica el estado de partida; sólo envía intenciones (`engine/actionTypes.js`).
- El estado recibido sustituye al local completo (o se aplica como parche con `version`).
- No se usará PeerJS ni sincronización entre pares para las reglas.
- Módulo previsto: `socketClient.js` + un hook `useGameConnection(roomCode)` que entregue
  `{ state, send, status }` a `MagnateScreen`, reemplazando los datos simulados.
