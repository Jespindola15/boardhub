# Magnate — Auditoría de fidelidad a Monopoly clásico

## Edición de referencia

| Campo | Valor |
|---|---|
| Juego | Monopoly, *Classic Game with Storage Tray and Larger Tokens* |
| Editorial | Hasbro |
| Código | **G0009** (instrucciones PN00094207, © 1935, 2025) |
| Fuente | https://instructions.hasbro.com/api/download/G0009_en-us_monopoly-board-game-classic-game-with-storage-tray-and-larger-tokens-family-games-8.pdf |
| Tablero y cartas | Edición estándar de EE. UU. vigente: impuesto a la renta $200, impuesto de lujo $100. El mazo de Fortuna y el de Arca Vecinal tienen los efectos de 2008; los textos del Arca se cambiaron en 2021, pero los importes siguen iguales. |
| Jugadores | La caja dice **2–6** (trae 8 fichas). El proyecto pide **2–8**: es la única desviación aceptada, a pedido explícito. |

Citas: las secciones del reglamento se nombran en inglés (SET IT UP, PLAY, THE BOARD SPACES, BUILDINGS, HELP! I CAN'T PAY!, DEALS & TRADES). Las reglas se describen con palabras propias; no se copia el texto.

Leyenda: ✅ correcto · ❌ incorrecto · ⚠️ ambiguo en el reglamento (requiere decisión) · 🔁 adaptación digital (requiere aprobación).

---

## Matriz

### A. Preparación y turno

| # | Regla oficial | Comportamiento actual | Estado | Error | Corrección | Prueba |
|---|---|---|---|---|---|---|
| A1 | $1.500 por jugador (SET IT UP). | $1.500. | ✅ | — | — | Existe implícitamente; agregar una explícita. |
| A2 | Empieza quien saca la tirada más alta y se sigue hacia la izquierda (PLAY). | Empieza el primero de la lista. | ❌ | No hay sorteo de orden. | Tirada inicial automática con dados del servidor; desempate volviendo a tirar entre los empatados. | Falta: `orden inicial por tirada`, `desempate`. |
| A3 | Dos dados; se avanza la suma en sentido horario. | Igual. | ✅ | — | — | `lanzar, mover, comprar…` |
| A4 | Al pasar o caer en la Salida se cobran $200. | Igual, también con cartas. | ✅ | — | — | `pasar por la Salida…` |
| A5 | Con dobles se vuelve a tirar. | Igual. | ✅ | — | — | `dobles dan otra tirada…` |
| A6 | Con tres dobles seguidos se va a la cárcel y no se completa el tercer movimiento. | Igual. | ✅ | — | — | `…tres dobles mandan a la cárcel` |
| A7 | La casilla "Ir a la cárcel" termina el turno aunque hayan salido dobles. | Igual. | ✅ | — | — | Falta un caso con dobles. |
| A8 | Estacionamiento libre: no pasa nada. | Igual. | ✅ | — | — | Falta. |
| A9 | Impuestos: se paga a la banca el importe de la casilla. | $200 y $100. | ✅ | — | — | Falta una prueba explícita. |
| A10 | Rango de jugadores. | 2–8. | ✅* | *Desviación pedida (la caja dice 2–6). | Documentar. | Falta: `rechaza 1 y 9 jugadores`. |

### B. Propiedades, compra y subasta

| # | Regla oficial | Comportamiento actual | Estado | Error | Corrección | Prueba |
|---|---|---|---|---|---|---|
| B1 | Propiedad sin dueño: hay que comprarla o subastarla (THE BOARD SPACES). | Igual. | ✅ | — | — | `rechazar la compra abre una subasta` |
| B2 | Todos pueden pujar, incluido quien cayó en la casilla. | Igual. | ✅ | — | — | Existe. |
| B3 | **La puja empieza en $10.** | La primera puja puede ser de $1. | ❌ | El mínimo inicial está mal. | Primera puja ≥ $10, luego subir al menos $1. | Falta: `puja inicial menor a 10 rechazada`. |
| B4 | **No hay orden de turno**: cualquiera sube en cualquier momento, y la subasta termina cuando nadie quiere subir más. | Pujas por turnos; quien pasa queda fuera para siempre. | ❌ 🔁 | Quien pasa no puede volver a entrar aunque otro suba después. | Subasta abierta: cualquier participante puja cuando quiera. "No subo" vale sólo hasta la próxima puja. Termina cuando todos menos el mejor postor dijeron "no subo" después de la última puja. En el online, el servidor ordena las pujas por llegada. | Falta: `retirarse y volver tras una nueva puja`, `varios jugadores pujan sin orden`, `termina cuando nadie sube`. |
| B5 | Si nadie puja, la propiedad sigue siendo de la banca. | Igual. | ✅ | — | — | Falta. |
| B6 | Un jugador sin efectivo para comprar debe subastar. | Igual (el botón de comprar se desactiva). | ✅ | — | — | Falta: `comprar sin dinero rechazado`. |
| B7 | Nadie puede pujar más que su efectivo. | Igual. | ✅ | — | — | Falta. |
| B8 | Los jugadores **en la cárcel pueden pujar**. | Pueden. | ✅ | — | — | Falta. |

### C. Alquileres

| # | Regla oficial | Comportamiento actual | Estado | Error | Corrección | Prueba |
|---|---|---|---|---|---|---|
| C1 | Calles: alquiler de la ficha; con el grupo completo se cobra el alquiler de "color set" (el doble). | Igual. | ✅ | — | — | `alquiler doble sin edificar…` |
| C2 | Una propiedad hipotecada no cobra; las demás del grupo siguen cobrando el alquiler aumentado. | Igual. | ✅ | — | — | Falta un caso con una hipotecada en el grupo. |
| C3 | Estaciones: $25/50/100/200 según cuántas tenga el dueño. Las no hipotecadas cobran aunque otras lo estén. | Igual (cuenta todas las del dueño). | ✅ | — | — | `estaciones y servicios` |
| C4 | Servicios: **"tira los dados para determinar el alquiler"**: 4× con uno, 10× con dos. | Usa la tirada con la que el jugador llegó a la casilla. | ⚠️ | El texto de esta edición dice tirar; las ediciones anteriores usaban la tirada del movimiento. | **Decisión 1.** | Se adapta a la decisión. |
| C5 | El dueño cobra aunque esté en la cárcel. | Igual. | ✅ | — | — | Falta. |
| C6 | El dueño debe reclamar el alquiler antes de la tirada del siguiente; si no, se pierde. | Se cobra automáticamente. | 🔁 | — | Adaptación digital (cobro automático). **Decisión 2.** | — |
| C7 | Carta "estación más cercana": se paga el doble; carta "servicio más cercano": se tiran los dados y se paga 10×. | Igual. | ✅ | — | — | `cartas: avanzar a la estación…`; falta el del servicio. |

### D. Construcción

| # | Regla oficial | Comportamiento actual | Estado | Error | Corrección | Prueba |
|---|---|---|---|---|---|---|
| D1 | Se construye con el grupo completo. | Igual. | ✅ | — | — | Existe. |
| D2 | **Se puede construir sin esperar el propio turno** (BUILDINGS). | Sólo el jugador del turno. | ❌ | Fuera de turno no se puede. | Acción "en cualquier momento", disponible para cualquier jugador no eliminado. | Falta: `construir fuera de turno`. |
| D3 | Construcción pareja; máximo 4 casas. | Igual. | ✅ | — | — | `grupo completo: … construcción pareja…` |
| D4 | Hotel con 4 casas en todas las calles del grupo; se devuelven las 4 casas. Un hotel por calle. | Igual. | ✅ | — | — | Existe. |
| D5 | No se construye si alguna calle del grupo está hipotecada. | Igual. | ✅ | — | — | Falta. |
| D6 | Coste según la ficha. | Igual. | ✅ | — | — | Existe. |
| D7 | Existencias: 32 casas y 12 hoteles; sin edificios no se compra. | Igual. | ✅ | — | — | Invariante en las partidas aleatorias. |
| D8 | **Escasez: si varios jugadores quieren la última casa u hotel, se subasta** (desde $10, sin orden, se paga a la banca). | No existe. | ❌ | Gana quien construye primero. | Cuando la banca tiene menos edificios que jugadores capaces de construir, una petición de construcción abre una ventana de interés. Si otro jugador también la quiere, se subasta. El ganador debe colocarla de inmediato y respetando las reglas. | Falta: `escasez de casas con dos interesados`. |
| D9 | No se pueden vender ni intercambiar edificios con otros jugadores. | No existe ninguna acción que lo permita. | ✅ | — | — | Falta: `negociar edificios rechazado`. |
| D10 | Vender casas a la banca por la mitad, de forma pareja. | Igual. | ✅ | — | — | Falta una prueba explícita. |
| D11 | Vender un hotel: mitad del coste y **se cambia en el acto por 4 casas**. | Igual. Si la banca no tiene 4 casas, el motor vende también las que falten. | ⚠️ | Esta edición no dice qué pasa si no hay 4 casas. | **Decisión 3.** | Falta: `vender hotel sin casas en la banca`. |

### E. Hipotecas

| # | Regla oficial | Comportamiento actual | Estado | Error | Corrección | Prueba |
|---|---|---|---|---|---|---|
| E1 | Para hipotecar, antes hay que vender todos los edificios del grupo. | Igual. | ✅ | — | — | Falta. |
| E2 | Se cobra el valor de hipoteca de la ficha (la mitad del precio). | Igual. | ✅ | — | — | `hipoteca: …` |
| E3 | Para levantarla se paga el "unmortgage cost" de la ficha. | Hipoteca + 10 %, redondeado hacia arriba. | ✅ | Hay que confirmar contra los valores impresos en las fichas. | Tabla explícita en los datos (no una fórmula). | `…se levanta pagando 110 %` |
| E4 | Se puede hipotecar **en cualquier momento**. | Sólo el jugador del turno o el endeudado. | ❌ | Fuera de turno no se puede. | Acción en cualquier momento. | Falta. |
| E5 | **Una propiedad hipotecada recibida en una negociación: el nuevo dueño la levanta en el acto o más tarde. Esta edición no cobra el 10 % por recibirla.** | Se cobra el 10 % al receptor. | ❌ | Cobra un recargo que esta edición no tiene. | Quitar el recargo. El receptor puede levantarla cuando quiera pagando el coste de la ficha. | Corregir el test actual `negociar una propiedad hipotecada…`. |

### F. Economía, deudas y bancarrota

| # | Regla oficial | Comportamiento actual | Estado | Error | Corrección | Prueba |
|---|---|---|---|---|---|---|
| F1 | Pagos entre jugadores y a la banca. | Igual. | ✅ | — | — | Existe. |
| F2 | Quien no puede pagar debe intentar reunir el dinero vendiendo edificios o hipotecando (HELP!). | Igual, pero puede **declararse en bancarrota aunque le alcance** liquidando. | ❌ | Bancarrota "voluntaria" con bienes suficientes. | Sólo se permite si efectivo + venta de edificios + hipotecas < deuda. | Falta: `bancarrota rechazada si puede liquidar`. |
| F3 | Las negociaciones son posibles **en cualquier momento**, también para reunir dinero. | Con una deuda pendiente sólo se puede vender, hipotecar o pagar. | ❌ | El endeudado no puede vender propiedades a otros jugadores. | Permitir negociaciones con el endeudado (y entre terceros). El endeudado no puede construir ni levantar hipotecas mientras deba. | Falta: `negociar durante una deuda`. |
| F4 | Bancarrota ante un jugador: tras liquidar, el acreedor recibe **las propiedades hipotecadas** y las cartas de libertad, y puede levantar las hipotecas en el acto o más tarde. | Vende los edificios, pero transfiere las propiedades **sin hipotecar** y cobra el 10 % al acreedor. | ❌ | Liquidación incompleta y recargo inexistente. | Liquidación automática completa (vender todo e hipotecar todo), pagar el efectivo al acreedor y transferir las propiedades hipotecadas y las cartas, sin recargo. | Corregir el test `deuda impagable → bancarrota ante otro jugador…`. |
| F5 | Bancarrota ante la banca: las propiedades vuelven a la banca, se cancelan las hipotecas, se subastan de inmediato y las cartas vuelven al fondo de su mazo. | Igual (subastas con el error B3/B4). | ✅/❌ | Hereda los errores de la subasta. | Ver B3/B4. | `bancarrota ante la banca…` |
| F6 | Gana el último jugador que no quebró. | Igual. | ✅ | — | — | Existe + partidas aleatorias. |
| F7 | Abandonar la partida. | Se trata como bancarrota ante la banca. | 🔁 | No es una regla del juego. | Política de plataforma: **Decisión 4.** | — |
| F8 | La banca no se queda sin dinero. | Dinero ilimitado. | ✅ | — | — | — |

### G. Cárcel

| # | Regla oficial | Comportamiento actual | Estado | Error | Corrección | Prueba |
|---|---|---|---|---|---|---|
| G1 | Se entra por la casilla, por carta o por tres dobles; no se cobra la Salida. | Igual. | ✅ | — | — | Existe (casilla y dobles); falta la carta. |
| G2 | Salir pagando $50 al empezar el turno y luego tirar normalmente. | Igual. | ✅ | — | — | Falta. |
| G3 | Usar la carta de libertad (propia **o comprada a otro jugador**) y devolverla al fondo de su mazo. | Igual, pero comprarla sólo es posible en el propio turno. | ✅/❌ | Ligado a F3/H1. | Ver H1. | `carta de libertad…` |
| G4 | Sacar dobles: se sale y se mueve con esa tirada, sin volver a tirar. | Igual. | ✅ | — | — | `salir de la cárcel con dobles…` |
| G5 | Hasta 3 intentos; al tercer fallo se pagan $50 y se mueve con esa tirada. | Igual. | ✅ | — | — | `cárcel: al tercer intento…` |
| G6 | Estando preso **se puede cobrar alquiler, pujar, construir, hipotecar y negociar**. | Cobra y puja; construir, hipotecar y negociar sólo en su turno. | ❌ | Mismo error que D2/E4/H1. | Acciones en cualquier momento. | Falta. |
| G7 | Pagar la multa del tercer intento sin efectivo suficiente. | Genera una deuda y se mueve. | ✅ | — | — | Falta. |

### H. Negociaciones

| # | Regla oficial | Comportamiento actual | Estado | Error | Corrección | Prueba |
|---|---|---|---|---|---|---|
| H1 | **Se puede comprar, vender o negociar en cualquier momento** (DEALS & TRADES). | Sólo propone el jugador del turno, y la partida se detiene hasta la respuesta. | ❌ | Restricción inventada. | Cualquier jugador no eliminado propone a cualquier otro. Las ofertas abiertas no detienen la partida. Al aceptar se vuelve a validar y se aplica de forma atómica. | Falta: `negociar fuera de turno`, `oferta inválida al aceptar`. |
| H2 | Se puede intercambiar dinero, propiedades y cartas de libertad, por el importe que acuerden. | Igual. | ✅ | — | — | Existe. |
| H3 | Antes de negociar una calle hay que vender los edificios de todo su grupo. | Igual. | ✅ | — | — | `no se negocia una propiedad con edificios…` |
| H4 | Las propiedades hipotecadas se negocian al precio acordado (ver E5). | Cobra el 10 %. | ❌ | Ver E5. | — | — |
| H5 | No hay préstamos ni acuerdos de "no cobrarse alquiler". | No existen. | ✅ | — | — | — |
| H6 | Ambas partes confirman y la operación es atómica. | Igual. | ✅ | — | — | Existe. |

### I. Cartas

| # | Regla oficial | Comportamiento actual | Estado | Error | Corrección | Prueba |
|---|---|---|---|---|---|---|
| I1 | Dos mazos de 16, barajados al empezar. | Igual. | ✅ | — | — | Invariante de las 32 cartas. |
| I2 | Se toma la de arriba, se cumple y vuelve al fondo. | Igual. | ✅ | — | — | `carta de cumpleaños…` |
| I3 | La carta de libertad se conserva hasta usarla o venderla. | Igual. | ✅ | — | — | `carta de libertad…` |
| I4 | Efectos de las 32 cartas de la edición (EE. UU. 2008, importes sin cambios en 2021). | Coinciden los 32 efectos e importes. | ✅ | Hay que verificar carta por carta con una tabla. | Test de tabla de efectos. | Falta: `los 32 efectos coinciden con la edición`. |
| I5 | Movimiento por carta: se resuelve la casilla de destino (comprar, alquiler, otra carta). | Igual. | ✅ | — | — | Parcial. |

### J. Integridad del motor

| # | Requisito | Situación | Estado | Corrección | Prueba |
|---|---|---|---|---|---|
| J1 | Rechazar acciones ilegales aunque las mande el frontend. | Todo se valida en el motor. Las acciones "en cualquier momento" hay que rediseñarlas. | ✅ | Mantener al rediseñar. | Ampliar con un *fuzzer* de acciones inválidas. |
| J2 | Reconstruir una partida a partir de las acciones. | Determinista con `rng`, pero sin prueba. | ❌ | Registro de acciones + valores del RNG y función `replay`. | Falta: `reconstrucción del estado`. |
| J3 | No filtrar información oculta (orden de los mazos). | El estado incluye el orden de los mazos. | ❌ | Vista por jugador (fase de arquitectura). | Falta: `la vista no expone el orden del mazo`. |

---

## Resumen

- **17 errores** frente al reglamento G0009: A2, B3, B4, D2, D8, E4, E5, F2, F3, F4, G6, H1, H4, J2, J3, además de F5 y G3 heredados.
- **4 decisiones** pendientes: C4, C6, D11, F7.
- La mayoría de los errores tienen una sola raíz: el motor sólo permite gestionar al jugador del turno, y el reglamento permite **construir, hipotecar y negociar en cualquier momento**.

## Bloques de corrección propuestos

| Bloque | Contenido | Errores |
|---|---|---|
| **1. Acciones en cualquier momento** | Nuevo modelo: acciones de turno (dados, compra, fin) y acciones libres (construir, vender, hipotecar, levantar, negociar) para cualquier jugador; varias ofertas abiertas; reglas durante una deuda. | D2, E4, G6, H1, F3, G3 |
| **2. Subastas fieles** | Puja inicial de $10, subasta abierta sin orden y fin cuando nadie sube. Reutilizable para los edificios. | B3, B4, F5 |
| **3. Hipotecas y bancarrota** | Sin recargo del 10 %, tabla de costes de levantamiento, liquidación automática, bancarrota sólo si no alcanza, traspaso correcto. | E3, E5, H4, F2, F4 |
| **4. Escasez de edificios** | Ventana de interés + subasta de la última casa u hotel. | D8 |
| **5. Orden inicial, decisiones y cartas** | Tirada inicial, lo que se decida en C4/C6/D11/F7 y la tabla de las 32 cartas. | A2, C4, D11, I4 |
| **6. Reconstrucción y pruebas de casos especiales** | Registro de acciones, `replay`, todos los casos especiales que pediste y partidas completas. | J2 (+ J3 en la fase de arquitectura) |

Cada bloque se entrega con sus pruebas pasando y Magnate jugable. La interfaz sólo cambia donde haga falta: por ejemplo, botones de gestión siempre visibles para cada jugador y un panel de ofertas abiertas.

---

## Resultado de la corrección

Decisiones tomadas: **C4** tirada nueva · **C6** cobro automático · **D11** no se vende el hotel si la banca no tiene 4 casas · **F7** abandonar = bancarrota ante la banca.

| Error | Corregido en | Prueba |
|---|---|---|
| A2 orden inicial | `rollForFirstPlayer` (state/gameState.js) | `A2 empieza la tirada más alta…`, `A2 el turno sigue…` |
| B3 puja mínima de $10 | `PLACE_BID` | `B3 la primera puja…` |
| B4 subasta abierta | `auction.participants/passed` | `B4 subasta abierta…`, `B4 el mejor postor…` |
| C4 servicios con tirada nueva | `resolveLanding` | `C4 servicios…` |
| D2/E4/G6 en cualquier momento | acciones libres (sin comprobar turno) | `D2…`, `E4…`, `G6…` |
| D8 escasez | `buildingClaim` + subasta de edificio + `PLACE_BUILDING` | `D8 escasez…` (2 pruebas) |
| D11 hotel sin 4 casas | `sellBlocker` | `D11 vender un hotel…` |
| E3 coste impreso | `unmortgage` en data/board.js | `E3 costes de levantar…` |
| E5/H4 sin recargo | `transferOffer`, `bankrupt` | `E5/H4 negociar una propiedad hipotecada…` |
| F2 bancarrota sólo si no alcanza | `maxRaisable` | `F2 no se puede quebrar…` |
| F3 negociar con deuda | interrupciones no bloquean acciones libres | `F3 negociar durante una deuda…`, `F3 el endeudado no puede construir…` |
| F4 liquidación y traspaso | `liquidateAll` + `bankrupt` | `F4 bancarrota ante un jugador…` |
| F5 subastas tras quebrar ante la banca | cola de subastas abiertas | `F5 bancarrota ante la banca…` |
| H1 negociar en cualquier momento | `trades[]` + revalidación al aceptar | `H1` (3 pruebas), `H6` |
| I4 tabla de efectos | — | `I1/I4 los 32 efectos…` |
| J1 acciones ilegales | ya era correcto, ahora con *fuzzer* | `J1 el motor rechaza…` |
| J2 reconstrucción | determinismo verificado | `J2 reconstrucción…`, `J2 serializar…` |
| J3 orden de los mazos visible | **pendiente** para la fase de vistas privadas (arquitectura) | — |

Resultado: **68 pruebas** de Magnate pasando, incluidas 60 partidas aleatorias completas de 2 a 8 jugadores (56 terminan con un ganador dentro del límite de acciones y todas respetan los invariantes de dinero, edificios y cartas).
