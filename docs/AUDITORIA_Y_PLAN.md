# BoardHub — Auditoría técnica y plan de arquitectura

Estado auditado: rama `main`, commit `6a311fd`. Este documento no cambia código. Es la propuesta que hay que aprobar antes de seguir.

---

## 1. Diagnóstico técnico

### 1.1 Lo que está bien y se conserva

| Área | Estado |
|---|---|
| Separación motor / interfaz | Los motores de Magnate y Comodín son JS puro: no importan React ni el DOM. Se pueden ejecutar en Node tal cual. |
| Contrato de acciones | Ambos usan `applyAction(state, { type, playerId, payload }, rng) → { ok, state } \| { ok: false, error }`. Es la base correcta para un servidor autoritativo. |
| Inmutabilidad | Cada acción clona el estado (`structuredClone`) y devuelve uno nuevo. Las acciones inválidas no dejan el estado a medio cambiar. |
| Azar inyectable | El `rng` se recibe como parámetro. Los tests ya fijan los dados y los mazos. |
| Estado serializable | El estado es JSON plano, sin clases ni funciones. Se puede guardar y transmitir sin conversiones. |
| Tests | 28 tests con el runner nativo de Node. Incluyen 120 partidas completas aleatorias que comprueban invariantes y verifican que la partida termina. |
| Plataforma | Catálogo con carga diferida por juego, router mínimo y componentes compartidos. Agregar un juego no obliga a tocar la plataforma. |

### 1.2 Lo que falta para la arquitectura pedida

| Requisito | Situación actual | Gravedad |
|---|---|---|
| Estado público y estado privado por jugador | **No existe.** El estado completo incluye información oculta: el orden de los mazos de Fortuna y Arca Vecinal en Magnate, y todas las manos y el mazo en Comodín. Si se envía tal cual a los clientes, cualquiera puede ver cartas ajenas o anticipar las próximas. | **Crítica para el online** |
| Consultar acciones disponibles | No existe `getLegalActions`. La interfaz repite parte de la lógica: los `*Blocker` de Magnate y `isPlayable` de Comodín, más reglas propias en los componentes. Esto puede desincronizarse del motor. | Alta |
| Quién puede actuar | `getActingPlayerId` devuelve **un solo** jugador. Varios juegos tienen decisiones simultáneas o fuera de turno: subastas, construir y negociar en cualquier momento (Monopoly), atrapar a quien no cantó (UNO), descartes por el ladrón y ofertas de comercio (Catan), refutar sugerencias (Clue). | Alta |
| Identidad del jugador | El controlador local (`useLocalGame`) actúa **en nombre** de quien debe decidir. En el online, el `playerId` debe salir de la sesión del servidor y nunca del cliente. | Alta (se resuelve en el servidor) |
| Victoria y resultado | Hay `phase`/`winnerId` en cada motor, pero no una función común `getResult` con ganadores, ranking y motivo. | Media |
| Guardar y recuperar | Se guarda en `localStorage` sin versión de esquema. Un cambio de formato rompería las partidas guardadas. | Media |
| Eventos para la interfaz | El registro es un array de frases en español dentro del estado. Sirve para leer, pero no para animar (dados, movimientos, cartas) ni para filtrar lo que ve cada jugador. | Media |
| Aleatoriedad del servidor | El valor por defecto es `Math.random`. El servidor debe usar `crypto` y registrar los resultados para poder auditar y reproducir partidas. | Media |
| Duplicados y carreras | `state.version` existe, pero no se comprueba ninguna versión esperada ni un identificador de acción. | Media (se resuelve en el servidor) |

### 1.3 Fidelidad de reglas: Magnate (Monopoly)

El motor cubre el flujo completo y la partida termina. Pero hay puntos que **no siguen el reglamento oficial** o que **no se verificaron contra una edición concreta**:

| # | Punto | Situación | Acción |
|---|---|---|---|
| M1 | **Edición** | Las cifras y las cartas coinciden con la edición estándar estadounidense moderna (impuesto de lujo $100, impuesto a la renta $200 fijo, carta de cumpleaños). Nunca se verificaron contra un reglamento concreto. | Elegir la edición y verificar carta por carta. |
| M2 | Construir, vender y negociar | Sólo los permite al jugador del turno. El reglamento permite comprar casas y negociar entre jugadores en cualquier momento, también fuera del propio turno. | Corregir. |
| M3 | Negociar durante una deuda | Está bloqueado: con una deuda sólo se puede vender, hipotecar o pagar. El reglamento permite reunir dinero vendiendo propiedades a otros jugadores. | Corregir. |
| M4 | Recibir una propiedad hipotecada | Se cobra el 10 % y se descuenta si se levanta la hipoteca **en el turno actual**. Si quien la recibe no es el jugador del turno, pierde esa opción. El reglamento le da la elección en el momento de recibirla. | Corregir: decisión inmediata del receptor. |
| M5 | Escasez de edificios | Si varios jugadores quieren las últimas casas u hoteles de la banca, el reglamento indica subastarlos. No está implementado. | Implementar. |
| M6 | Subastas | El reglamento describe una subasta a viva voz. El motor usa pujas por turnos y quien pasa queda fuera. Es una **adaptación digital** inevitable, pero debe documentarse y decidirse explícitamente. | Decidir y documentar. |
| M7 | Alquiler doble con grupo completo | No se verificó qué dice la edición elegida cuando una propiedad del grupo está hipotecada. | Verificar. |
| M8 | Vender un hotel con escasez de casas | El motor vende "lo que falte" por su cuenta. Hay que confirmar el procedimiento del reglamento. | Verificar. |
| M9 | Cobro de alquiler | El reglamento obliga al dueño a reclamarlo antes de la tirada siguiente; el motor lo cobra solo. Es una convención digital universal. | Documentar como adaptación. |
| M10 | Abandonar | Es una política de la plataforma, no una regla del juego. Hoy se trata como bancarrota ante la banca. | Decidir como política. |

### 1.4 Fidelidad de reglas: Comodín → **Última Carta** (UNO)

| # | Punto | Situación | Acción |
|---|---|---|---|
| U1 | Edición | Se siguieron las reglas clásicas de Mattel, sin fijar un reglamento concreto. | Elegir la edición y verificar. |
| U2 | Objetivo de 100 o 250 puntos | **Es una variante, no una regla.** El reglamento oficial juega a 500. | Quitar o marcarla como variante opcional. |
| U3 | Desafío del Roba Cuatro | El reglamento dice que quien desafía **ve la mano** del acusado. El motor sólo resuelve el resultado. En el online esa mano debe mostrarse **sólo** a quien desafía. | Implementar con vista privada. |
| U4 | "Atrapar" al que no cantó | En la interfaz local, el botón actúa en nombre del "primer otro jugador". En el online lo pulsa quien quiera, y gana el primero que llega al servidor. | Se resuelve con el servidor. |
| U5 | Privacidad | Todas las manos están en el estado. | Vista privada por jugador. |
| U6 | Nombre | Hay que pasar de Comodín a Última Carta. | Renombrar sin romper las partidas guardadas. |

### 1.5 Catálogo frente a la nueva lista

| Nueva lista | En el catálogo hoy | Cambio |
|---|---|---|
| Magnate (Monopoly) | Magnate | — |
| Última Carta (UNO) | Comodín | Renombrar. |
| Colonias (Catan básico) | Colonos | Renombrar. |
| Dominio (Risk clásico) | Conquista (descrito como tipo TEG) | Renombrar y corregir la referencia: es Risk, no TEG. |
| Misterio (Clue/Cluedo) | — | Agregar como "próximamente". |
| Rutas (Ticket to Ride) | — | Agregar como "próximamente". |
| — | Ludo | No está en la lista. ¿Se quita? |

---

## 2. Arquitectura recomendada

### 2.1 Vista general

```
                 ┌───────────────── navegador (cada PC) ─────────────────┐
                 │  apps/web (React)                                      │
                 │   ├─ plataforma: catálogo, salas, unirse con código    │
                 │   └─ juegos: sólo dibujan la vista y envían intenciones │
                 │        useGameSession(transport) → { view, actions, send }
                 └────────────────────────┬───────────────────────────────┘
                                          │ Socket.IO (intenciones ↑ / vistas ↓)
                 ┌────────────────────────┴───────────────────────────────┐
                 │  apps/server (Node + Socket.IO)   ← AUTORITATIVO        │
                 │   ├─ RoomManager: código, asientos, reconexión          │
                 │   ├─ GameSession: estado oficial, versión, RNG, registro │
                 │   └─ Persistencia: PostgreSQL / Supabase                 │
                 └────────────────────────┬───────────────────────────────┘
                                          │ importa
                 ┌────────────────────────┴───────────────────────────────┐
                 │  packages/engine-core   contrato común + utilidades     │
                 │  packages/games/<juego> motor puro de cada juego        │
                 └─────────────────────────────────────────────────────────┘
```

**Modo local** (misma PC): el mismo `GameSession` corre en el navegador detrás de un `LocalTransport`. Así Magnate sigue funcionando durante toda la migración, y el código del juego es idéntico en local y en online.

### 2.2 Estructura de carpetas (npm workspaces, sin dependencias nuevas)

```
boardhub/
  apps/
    web/                      ← el proyecto Vite actual (src/ se mueve aquí)
    server/                   ← Node + Socket.IO (fase 3)
  packages/
    engine-core/              ← contrato, RNG, errores, utilidades de test
    games/
      magnate/                ← data/ models/ state/ engine/ + definition.js
      ultima-carta/
      colonias/ dominio/ misterio/ rutas/   (cuando toque)
  docs/
    reglas/<juego>/           ← especificación de cada juego
  tests/ (o dentro de cada paquete)
```

### 2.3 Contrato común de un juego (`GameDefinition`)

Cada juego exporta un objeto con esta forma. Es JS con tipos en JSDoc; el proyecto sigue en JavaScript.

```js
export default {
  id: 'magnate',
  rulesVersion: '1.0.0',            // versión de NUESTRA implementación
  edition: { reference: '…', year: …, notes: '…' },  // reglamento de referencia
  players: { min: 2, max: 8 },
  stateVersion: 3,                  // esquema del estado guardado

  /** Crear partida */
  setup({ players, options }, rng) → state,

  /** Vistas: lo que puede ver cada uno */
  getPublicView(state) → view,               // espectadores y registro
  getPlayerView(state, playerId) → view,     // incluye su información privada

  /** Quién puede actuar ahora (puede ser más de uno) */
  getActivePlayers(state) → playerId[],

  /** Acciones legales para un jugador, con sus opciones */
  getLegalActions(state, playerId) → [{ type, options? }],

  /** Validar sin aplicar (mismo motivo que daría applyAction) */
  validateAction(state, action) → null | { code, message },

  /** Aplicar: puro, determinista dado el rng */
  applyAction(state, action, rng) → { state, events: Event[] },

  /** Resultado */
  getResult(state) → null | { winners: id[], ranking?: id[], reason },

  /** Abandono o desconexión prolongada (política de plataforma) */
  removePlayer(state, playerId, reason, rng) → { state, events },

  /** Guardado */
  migrate(savedState, fromVersion) → state,
};
```

**Eventos.** `applyAction` devuelve eventos como `{ type: 'DICE_ROLLED', data, visibility: 'public' | { to: [ids] } }`. La interfaz los usa para animar y para el registro; el servidor los filtra por jugador antes de enviarlos. El texto del registro se genera en el cliente a partir del evento, no dentro del motor.

**Determinismo.** El motor sólo usa el `rng` recibido. El servidor usa `crypto.randomInt` y guarda cada valor consumido junto con la acción. Así cualquier partida se puede reproducir y auditar.

### 2.4 Servidor autoritativo

| Necesidad | Diseño |
|---|---|
| Salas privadas | Código de 6 caracteres sin letras ambiguas. La sala guarda el juego, sus opciones, los asientos y quién es el anfitrión. |
| Unirse y elegir nombre | `room:join { code, name }`. El servidor asigna asiento y devuelve un **token de sesión** secreto, que el cliente guarda en `localStorage`. |
| Reconexión | `room:resume { token }` recupera el asiento y reenvía la vista actual. |
| Identidad | El `playerId` de cada acción lo pone el servidor a partir del socket. **Se ignora cualquier `playerId` que mande el cliente.** |
| Validación | El servidor ejecuta `applyAction`; si es inválida, responde el error sólo al emisor. |
| Acciones duplicadas | Cada intención lleva un `clientActionId` único. El servidor recuerda los últimos y responde lo mismo si llega repetido. |
| Carreras | Cada intención lleva la `expectedVersion` que vio el cliente. Si cambió, se rechaza con "el estado cambió, revisa". Una cola por sala procesa las acciones de a una. |
| Fuera de turno | Lo resuelve el motor: `getActivePlayers` y `validateAction`. |
| Información privada | Sólo se envía `getPlayerView(state, id)` a cada socket. Los mazos, las manos ajenas y el sobre de Misterio **nunca salen del servidor**. |
| Sincronización | Después de cada acción: vista nueva + eventos filtrados + `version`. El cliente sustituye su vista; no aplica reglas por su cuenta. |
| Guardar progreso | Una foto del estado cada N acciones + el registro de acciones (con los valores del RNG) en PostgreSQL. Permite recuperar después de reiniciar el servidor. |
| Abandonos | Desconexión → plazo de gracia (por ejemplo 2 minutos) → el anfitrión decide entre esperar, quitar al jugador (`removePlayer`) o pausar. **Es política de plataforma**, se muestra como tal y no se mezcla con las reglas. |

### 2.5 Cliente

- `useGameSession(transport)` devuelve `{ view, legalActions, activePlayers, send, error, connection }`.
- `LocalTransport` (misma PC) y `SocketTransport` (online) exponen la misma interfaz.
- Los componentes habilitan los botones según `legalActions` y **no** recalculan reglas. Los `*Blocker` de Magnate pasan a ser parte del motor: devuelven el motivo para mostrarlo en la interfaz.
- En el modo local se conservan las pantallas de "pasa la PC" para los juegos con información oculta.

---

## 3. Riesgos detectados

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Filtración de información oculta** (mazos, manos, sobre de Misterio) | Rompe el juego online | Vistas por jugador obligatorias en el contrato y tests que verifiquen que ninguna vista contiene datos privados ajenos. |
| **Edición ambigua** ("Risk clásico", "Clue" y "Monopoly" tienen varias ediciones con reglas distintas) | Mezclar reglas de ediciones distintas | Fijar por escrito la edición de cada juego **antes** de implementarlo (ver preguntas al final). |
| **Copiar textos del reglamento** | Riesgo de derechos de autor | Las especificaciones se redactan con palabras propias y citan sección y página, sin copiar el texto. |
| **Mapa de Ticket to Ride** | La red de ciudades, longitudes y colores de rutas es un diseño protegible; un mapa propio cambiaría el equilibrio del juego | Decidir antes de esa fase, con asesoramiento si el proyecto va a ser público. |
| **Mapa y territorios de Risk** | Los territorios se basan en geografía real (bajo riesgo), pero el agrupamiento de 42 territorios y 6 continentes es reconocible | Igual que el anterior: decidir en su fase. |
| **Decisiones simultáneas** (subastas, comercio en Catan, refutar en Clue, atrapar en UNO) | Carreras y estados inconsistentes | Cola por sala, `expectedVersion` y `getActivePlayers` con varios jugadores. |
| **Adaptaciones digitales inevitables** (subasta a viva voz, reclamar el alquiler, negociación libre) | Diferencias con "la sensación" del juego físico | Lista explícita de adaptaciones por juego, aprobada por vos; nunca decididas en silencio. |
| **Partidas largas y abandonos** (Monopoly y Risk duran horas) | Salas abandonadas | Persistencia, reconexión y política de abandono. |
| **Hosting** | Socket.IO necesita un proceso siempre activo (no funciona en funciones *serverless* como las de Vercel) | Render, Railway o Fly.io para el servidor y Supabase para la base de datos. |
| **Migración de Magnate** | Romper lo que ya funciona | Migración por pasos con los tests actuales como red de seguridad y pruebas de reproducción de partidas. |

---

## 4. Plan de migración sin romper Magnate

Cada paso deja Magnate jugable y con todos los tests pasando.

| Paso | Qué se hace | Cómo se comprueba |
|---|---|---|
| 0 | **Congelar el comportamiento**: grabar 50 partidas reproducibles (semilla + acciones + estado final). | Tests de reproducción que comparan el estado final. |
| 1 | Workspaces: mover `src/` a `apps/web` y el motor de Magnate a `packages/games/magnate`. Dejar re-exportaciones en las rutas viejas. | `npm test`, `npm run build` y las mismas partidas grabadas. |
| 2 | `engine-core` + `definition.js` de Magnate como **adaptador** sobre el motor actual: `getPlayerView` oculta el orden de los mazos, más `getLegalActions`, `getActivePlayers` y `getResult`. | Tests nuevos del contrato, incluido el de privacidad. |
| 3 | `GameSession` + `LocalTransport` + `useGameSession`. Magnate pasa a consumir la vista y las acciones legales. `useLocalMagnate` se borra **sólo** cuando haya paridad. | Prueba en el navegador + tests. |
| 4 | Eventos en lugar de frases: el registro se genera en el cliente. | Tests + revisión visual. |
| 5 | Corregir la fidelidad de Magnate (M1–M10) con la edición elegida, un test por regla citando la sección del reglamento. | Tests de reglas + partidas aleatorias. |

---

## 5. Plan por fases (cada una se aprueba antes de seguir)

| Fase | Contenido | Entregable para aprobar |
|---|---|---|
| **F0** | Esta auditoría | Este documento y las decisiones de la sección 6. |
| **F1 Núcleo** | Migración pasos 0–4. Sin cambios visibles en Magnate. | Magnate idéntico, sobre la nueva arquitectura. |
| **F2 Magnate fiel** | Especificación de reglas, flujo de turnos y acciones legales por estado, corrección de M1–M10, tests. | `docs/reglas/magnate/` + tests + partida jugable. |
| **F3 Online** | Servidor, salas con código, nombres, reconexión, persistencia, duplicados, abandonos. Magnate online de punta a punta. | Partida entre dos PCs reales. |
| **F4 Última Carta** | Renombre, especificación oficial, U1–U6, vistas privadas, online. | Especificación + tests + partida online. |
| **F5–F8** | Un juego por fase (orden recomendado abajo), siguiendo los 8 pasos de tu pedido: edición, investigación, especificación, flujo de turnos, acciones legales, implementación, tests y partida que termina. | Por cada juego: especificación aprobada **antes** de programar, y luego el juego. |

**Orden recomendado para los juegos nuevos**, de menor a mayor riesgo técnico:

1. **Dominio (Risk)**: un turno por jugador, dados y cartas; ideal para estrenar mapas.
2. **Rutas (Ticket to Ride)**: información oculta simple; el cálculo de la ruta más larga es un buen desafío de algoritmos (antes hay que decidir el tema del mapa).
3. **Colonias (Catan)**: comercio entre jugadores, descartes simultáneos y tablero hexagonal.
4. **Misterio (Clue)**: la información privada más delicada (quién refuta y con qué carta).

### Entregables de cada juego

1. `docs/reglas/<juego>/EDICION.md`: reglamento de referencia exacto (editorial, año, número de jugadores).
2. `ESPECIFICACION.md`: todas las reglas, excepciones y casos especiales, con cita de sección.
3. `FLUJO.md`: máquina de estados del turno.
4. `ACCIONES.md`: tabla de estado × acción legal × quién puede hacerla.
5. `ADAPTACIONES.md`: lo que el formato digital obliga a cambiar, aprobado por vos.
6. Motor + vistas privadas + tests: uno por regla, más partidas aleatorias completas y de privacidad.
7. Interfaz.

---

## 6. Decisiones que necesito antes de empezar la F1

1. **Edición de Magnate**: propongo la edición estándar de EE. UU. vigente de Hasbro, que es con la que ya coinciden las cifras y las cartas.
2. **Edición de Última Carta**: reglamento oficial actual de Mattel, a 500 puntos.
3. **Edición de Dominio**: ¿Risk clásico de 1959/1975 (canje de cartas creciente: 4, 6, 8, 10, 12, 15…) o la edición de 2008 o posterior?
4. **Edición de Misterio**: ¿Clue clásico de EE. UU. (3–6 jugadores, 9 habitaciones) o la versión británica de Cluedo?
5. **Rutas**: ¿Ticket to Ride original, mapa de EE. UU., 2–5 jugadores? ¿Y qué hacemos con el mapa (ver riesgos)?
6. **Colonias**: Catan juego base, 3–4 jugadores, sin la ampliación para 5–6. ¿5.ª o 6.ª edición?
7. **Ludo**: ¿lo quitamos del catálogo?
8. **Abandonos**: ¿te parece bien el plazo de gracia + decisión del anfitrión como política general?
