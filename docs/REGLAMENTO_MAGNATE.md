# Reglamento de Magnate

Magnate sigue las reglas clásicas del juego de compra y alquiler de propiedades.
Este documento es la referencia del motor (`src/games/magnate/engine/`). Cada regla
tiene un test en `tests/magnate.engine.test.js`.

## Preparación
- De 2 a 8 jugadores. Cada uno empieza con $1.500 en la Salida.
- La banca tiene 32 casas y 12 hoteles.
- Los mazos de Fortuna y Arca Vecinal (16 cartas cada uno) se barajan al empezar.

## Turno
1. El jugador tira dos dados y avanza la suma.
2. Si saca **dobles**, después de resolver la casilla vuelve a tirar. Si saca **tres dobles seguidos**, va directamente a la cárcel sin mover.
3. Al **pasar o caer** en la Salida cobra $200.
4. Resuelve la casilla de llegada (ver abajo).
5. En cualquier momento de su turno puede construir, vender edificios, hipotecar, levantar hipotecas y negociar.
6. Termina el turno.

## Casillas
| Casilla | Efecto |
|---|---|
| Propiedad, estación o servicio sin dueño | Puede comprarla al precio impreso. Si no la compra (o no puede), **se subasta** entre todos los jugadores, incluido él. |
| Con dueño (otro jugador) | Paga alquiler, salvo que esté hipotecada. El dueño cobra aunque esté en la cárcel. |
| Impuesto a la Renta / al Lujo | Paga $200 / $100 a la banca. |
| Fortuna / Arca Vecinal | Roba la carta superior y la cumple. Vuelve al fondo del mazo. |
| ¡A la cárcel! | Va a la cárcel sin pasar por la Salida. |
| Cárcel (de visita), Plaza Libre | Nada. Plaza Libre no acumula dinero. |

## Alquileres
- **Propiedades**: valor de la tabla. Sin edificios, se **duplica** si el dueño posee todo el grupo de color (aunque alguna esté hipotecada; la hipotecada no cobra).
- **Estaciones**: $25, $50, $100 o $200 según cuántas estaciones tenga el dueño.
- **Servicios**: 4 × dados con un servicio, 10 × dados con los dos.
- Cartas especiales: «estación más cercana» paga el **doble**; «servicio más cercano» se paga tirando de nuevo los dados × 10.

## Subastas
- Empieza pujando el jugador del turno y siguen en orden. Cada puja debe superar la anterior en al menos $1 y no exceder el efectivo del jugador.
- Quien se retira no vuelve a pujar. Gana el último que queda con la mejor oferta.
- Si nadie puja, la propiedad sigue siendo de la banca.

## Construcción
- Hay que tener **todo el grupo** y que ninguna propiedad del grupo esté hipotecada.
- **Construcción pareja**: no se puede poner una casa en una propiedad si otra del grupo tiene menos.
- Con 4 casas se puede construir un hotel: se devuelven las 4 casas a la banca.
- Si la banca no tiene casas u hoteles, no se puede construir (escasez).
- Los edificios se venden a la banca por la mitad de su coste, también de forma pareja. Al vender un hotel se reciben 4 casas; si la banca no tiene 4, se venden también las que falten.

## Hipotecas
- Sólo propiedades sin edificios en todo su grupo. La banca paga la mitad del precio.
- Levantarla cuesta el valor de la hipoteca + 10 %.
- Quien recibe una propiedad hipotecada (negociación o bancarrota) paga el 10 % al recibirla; si la levanta en ese mismo turno, ya no vuelve a pagar ese 10 %.

## Negociaciones
- El jugador del turno propone un trato a otro jugador: dinero, propiedades sin edificios en su grupo y cartas de libertad, en ambos sentidos.
- El otro acepta o rechaza; quien propuso puede retirarlo.

## Cárcel
- Se sale: pagando $50 antes de tirar, usando una carta de libertad, o sacando dobles.
- Se tiene hasta 3 intentos de dobles. Al tercer fallo se pagan $50 y se avanza con esa tirada.
- Salir con dobles **no** da tirada extra.
- La carta de libertad se conserva hasta usarla (o negociarla) y entonces vuelve a su mazo.

## Deudas y bancarrota
- Si un jugador debe más de lo que tiene en efectivo, la partida se detiene hasta que reúna el dinero (vendiendo edificios o hipotecando) y pague.
- Si no puede, se declara en bancarrota:
  - **Ante otro jugador**: los edificios se venden a la banca a mitad de precio y todo su dinero, propiedades y cartas pasan al acreedor (que paga el 10 % de las hipotecadas).
  - **Ante la banca**: los edificios vuelven a la banca y sus propiedades se **subastan**, sin hipoteca.
- Un jugador también puede abandonar voluntariamente (cuenta como bancarrota ante la banca).

## Fin de la partida
Gana el último jugador que no está en bancarrota.

## Diferencias con las reglas oficiales (pendientes de decidir)
- Las negociaciones las inicia el jugador del turno. Las reglas oficiales permiten negociar en cualquier momento; en la versión online se puede habilitar.
- No hay subasta de edificios en escasez (cuando varios jugadores quieren las últimas casas). Gana quien construye primero.
