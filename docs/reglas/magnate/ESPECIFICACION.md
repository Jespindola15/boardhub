# Magnate — Especificación de reglas

Edición de referencia: **Hasbro 00009**, reglas clásicas sin Speed Die (© 2004, 2007; ver `AUDITORIA.md`, sección «Fase 1»). Antes se usaba G0009 (2025); las diferencias están marcadas con **00009**. Motor: `src/games/magnate/engine/`.
Pruebas: `tests/magnate.engine.test.js`. Los códigos entre corchetes remiten a la matriz de auditoría.

## 1. Preparación
- De 2 a 8 jugadores. El reglamento 00009 admite 2–8 (la caja dice 2–6). [A10]
- Cada jugador empieza con $1.500 en la Salida. [A1]
- La banca tiene 32 casas y 12 hoteles. Los dos mazos de 16 cartas se barajan. [D7, I1]
- Orden: cada jugador tira dos dados; empieza la suma más alta; los empatados en la cifra más alta vuelven a tirar. Luego se sigue el orden de asientos. [A2]

## 2. Flujo del turno (máquina de estados)

```
           ┌─────────── dobles (y no fue a la cárcel) ───────────┐
           ▼                                                      │
 roll ──ROLL_DICE──▶ resolver casilla ──┬── libre ─▶ buy ─BUY/DECLINE─┤
  │  (preso: PAY_JAIL_FINE / USE_JAIL_CARD / ROLL_DICE)  └── resto ───┤
  │                                                                  ▼
  └──────────────────────────────────────────────────────────────▶ end ──END_TURN──▶ siguiente jugador
```

**Interrupciones**: mientras exista alguna, nadie puede hacer acciones de turno. Se resuelven en este orden:
1. **Deudas** (`debts`): cada deudor paga o quiebra.
2. **Colocación** (`placement`): quien ganó un edificio en subasta lo coloca.
3. **Solicitud por escasez** (`buildingClaim`): los demás constructores posibles responden.
4. **Impuesto a la Renta** (`incomeTax`, **00009**): quien cayó elige monto fijo o 10 %.
5. **Hipotecada recibida** (`mortgageTransfers`, **00009**): quien la recibió la levanta o paga el 10 %.
6. **Subasta** (`auction`): de propiedad o de edificio. Al terminar, se abre la siguiente subasta de la cola (`auctionQueue`), si la hay.

## 3. Acciones legales

| Acción | Quién | Cuándo |
|---|---|---|
| `ROLL_DICE` | Jugador del turno | Paso `roll`, sin interrupciones |
| `PAY_JAIL_FINE` | Jugador del turno, preso | Paso `roll`, antes de tirar, **sólo en los dos turnos siguientes a entrar** (00009) |
| `USE_JAIL_CARD` | Jugador del turno, preso | Paso `roll`, antes de tirar |
| `PAY_INCOME_TAX` `{mode:'flat'\|'percent'}` | Quien cayó en el Impuesto a la Renta | Con `incomeTax` propio (00009) |
| `RESOLVE_MORTGAGE_TRANSFER` `{index, lift}` | Quien recibió una hipotecada | Con traspaso propio pendiente (00009) |
| `BUY_PROPERTY`, `DECLINE_PROPERTY` | Jugador del turno | Paso `buy` |
| `END_TURN` | Jugador del turno | Paso `end` |
| `PLACE_BID`, `PASS_BID` | Participantes de la subasta (no el mejor postor) | Con subasta abierta, sin orden |
| `BUILD`, `SELL_BUILDING`, `MORTGAGE`, `UNMORTGAGE` | Dueño de la propiedad | **En cualquier momento** (también preso o fuera de turno) |
| `PROPOSE_TRADE` | Cualquier jugador en juego | **En cualquier momento** |
| `RESPOND_TRADE` / `CANCEL_TRADE` | Destinatario / autor | En cualquier momento |
| `CLAIM_BUILDING` | Constructores posibles que aún no respondieron | Con solicitud de escasez abierta |
| `PLACE_BUILDING` | Ganador del edificio | Con colocación pendiente |
| `PAY_DEBT` | Deudor | Con deuda propia |
| `DECLARE_BANKRUPTCY` | Deudor | Sólo si efectivo + venta de edificios + hipotecas < deuda total |
| `RESIGN` | Cualquier jugador en juego | En cualquier momento (política de plataforma) |

Restricciones adicionales: un deudor no puede construir ni levantar hipotecas hasta pagar. Quien debe colocar un edificio no puede hacer otras acciones libres antes de colocarlo.

## 4. Casillas
- **Salida**: $200 al pasar o caer, también con cartas. [A4]
- **Propiedad libre**: comprar al precio o subastar. [B1]
- **Propiedad ajena**: alquiler automático; las hipotecadas no cobran; el dueño preso cobra. [C1–C6]
- **Impuesto a la Renta** (00009): el jugador elige, **antes de sumar su patrimonio**, entre $200 o el 10 % de su patrimonio total: efectivo + precio impreso de todas sus propiedades (hipotecadas o no) + precio de compra de sus edificios (hotel = 5 edificios). El 10 % se redondea al dólar más cercano (adaptación: no hay billetes menores a $1). [A9]
- **Impuesto de lujo**: $100 a la banca. [A9]
- **Fortuna / Arca Vecinal**: se toma la carta de arriba, se cumple y vuelve al fondo; la carta de libertad se conserva. [I1–I5]
- **¡A la cárcel!**: directo a la cárcel; el turno termina. [A7]
- **Plaza Libre y Cárcel de visita**: no pasa nada. [A8]

## 5. Alquileres
- Calles: tabla de la ficha. Sin edificios y con el grupo completo, el doble, aunque otra calle del grupo esté hipotecada. [C1, C2]
- Estaciones: 25 / 50 / 100 / 200 según cuántas tenga el dueño, contando las hipotecadas. [C3]
- Servicios: **tirada nueva** de dos dados × 4 (un servicio) o × 10 (dos). [C4]
- Cartas: «estación más cercana» paga el doble; «servicio más cercano» se paga con tirada nueva × 10. [C7]

## 6. Subastas
- Participan todos los jugadores en juego, también el que no quiso comprar y los presos. [B2, B8]
- La puja puede empezar en cualquier monto (**00009**: mínimo $1); cada puja supera la anterior en al menos $1 y no puede exceder el efectivo de quien puja. [B3, B7]
- Las pujas no siguen orden de turno. "No subo" vale hasta la siguiente puja, que reabre la subasta para todos. [B4]
- Termina cuando todos menos el mejor postor dijeron "no subo" después de la última puja. Si nadie pujó, la propiedad sigue en la banca. [B5]

## 7. Construcción
- Requisitos: grupo completo, ninguna calle del grupo hipotecada, construcción pareja, máximo 4 casas y luego un hotel, coste de la ficha y existencias en la banca. [D1–D7]
- **Escasez** [D8]: si la banca tiene menos edificios del tipo pedido que jugadores que podrían construirlo ahora, la petición abre una consulta. Si más interesados de los que hay quieren uno, se subasta un edificio entre ellos (mismas reglas que la subasta). El ganador paga su puja a la banca y lo coloca de inmediato donde sea legal. Si alcanza para todos, la petición original se atiende normalmente.
- Venta a la banca por la mitad y de forma pareja. Un hotel se cambia por 4 casas; **si la banca no tiene 4 casas, el hotel no se puede vender** (decisión D11). [D10, D11]
- No se venden ni intercambian edificios entre jugadores. [D9]

## 8. Hipotecas
- Exigen vender antes los edificios de todo el grupo. Se cobra el valor de la ficha (la mitad del precio). [E1, E2]
- Para levantarla se paga la hipoteca más un 10 % de interés (el coste impreso `unmortgage` ya lo incluye). [E3]
- **00009**: quien recibe una propiedad hipotecada (negociación o bancarrota ante un jugador) decide en el acto: **levantarla** pagando hipoteca + 10 %, o **pagar sólo el 10 %** y conservarla hipotecada; si después la levanta, vuelve a pagar hipoteca + 10 %. Si no tiene efectivo para el 10 %, queda una deuda con la banca. El turno espera esta decisión. [E5, H4]

## 9. Deudas y bancarrota
- Si no hay efectivo suficiente se crea una deuda. Puede haber varias a la vez y de varios deudores. [F1]
- Para pagarla se puede vender, hipotecar o negociar. [F3]
- Bancarrota sólo si el máximo dinero que se puede reunir no alcanza. [F2] Los edificios vuelven a la banca por la mitad de su precio (00009) y:
  - **ante un jugador**: recibe ese efectivo, las propiedades **tal como están** (no se hipoteca nada al quebrar) y las cartas de libertad; por cada hipotecada decide levantarla o pagar el 10 % (ver §8); [F4]
  - **ante la banca**: las propiedades vuelven sin hipoteca y se subastan de inmediato; las cartas vuelven al fondo de su mazo. [F5]
- Gana el último jugador en juego. [F6]

## 10. Cárcel
- Se entra por la casilla, por una carta o por tres dobles; no se cobra la Salida. [G1]
- Para salir: pagar $50 antes de tirar en cualquiera de los **dos turnos siguientes** (00009); usar una carta (propia o comprada); o sacar dobles (se mueve con esa tirada, sin tirada extra). [G2–G4]
- Al tercer intento fallido se pagan $50 (o se genera una deuda) y se mueve con esa tirada. [G5, G7]
- Estando preso se puede cobrar alquiler, pujar, construir, hipotecar y negociar. [G6]

## 11. Negociaciones
- Cualquier jugador propone a cualquier otro, en cualquier momento: dinero, propiedades y cartas de libertad, en ambos sentidos. [H1, H2]
- No se puede incluir una calle si hay edificios en su grupo. [H3]
- Las ofertas quedan abiertas sin detener la partida. Al aceptar se vuelven a validar y se aplican de forma atómica; las demás ofertas sobre esas propiedades se retiran. [H1, H6]

## 12. Adaptaciones digitales aprobadas
- El alquiler se cobra automáticamente (decisión C6).
- La subasta "a viva voz" se juega con pujas y "no subo" explícitos (B4).
- Abandonar = bancarrota ante la banca (decisión F7, política de plataforma).
- Redondeo del 10 % del Impuesto a la Renta al dólar más cercano.

## 13. Reglas de la casa opcionales
Se eligen al crear la partida (`options`). Desactivadas, el juego es el reglamento 00009.

| Opción | Efecto | Estado por defecto en la configuración |
|---|---|---|
| `skipPurchase` | Quien cae en una propiedad libre puede **pasar** sin comprarla ni subastarla; la propiedad sigue en la banca (acción `SKIP_PROPERTY`). El reglamento oficial obliga a comprar o subastar. | **Desactivada** (Fase 1). Nunca se salta una compra sin subasta salvo que se active a propósito. |
