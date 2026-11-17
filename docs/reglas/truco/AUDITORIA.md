# Truco — Auditoría de fidelidad (Fase 2)

Configuración auditada: truco argentino tradicional, a 30 puntos (15 malas y 15 buenas), sin flor, 1 contra 1 y 2 contra 2, baraja española de 40 cartas, naipes ilustrados actuales. **El motor no se modificó.**

Pruebas: `tests/truco.audit.test.js` (una por regla). Las marcadas `todo` se informan sin romper la suite:
`DIFERENCIA` = el motor no cumple el reglamento (hay que corregir); `PENDIENTE` = falta el texto oficial para decidir.

## Reglamento seleccionado

**Recomendado: Reglamento Oficial de la Asociación Argentina de Truco (ASART)**, el unificado nacional que exigen los Juegos Evita y el único de los comparados que se juega a 30 y sin flor.
Su texto no se pudo leer (asart.com.ar bloquea la lectura automática). **Documento necesario:** el PDF del Reglamento Oficial de ASART (versión de torneo, sin flor).

| Tema | ASART (recomendado) | Juegos Bonaerenses (GBA) | juegosdesalon / CASI |
|---|---|---|---|
| Acceso al texto | Indirecto (fuentes que lo citan) | PDF oficial | PDF |
| Partido | 30 (15 + 15) | 40 (20 + 20) | 30 (15 + 15), mejor de tres chicos |
| Flor | Sin flor en torneo | Con flor | Con flor |
| Falta envido querida | Los dos en malas: el partido; si no, lo que le falta al puntero (art. 4.3.2) | En malas: lo que le falta al ganador; en buenas: lo que le falta al rival | Lo que le falta al puntero |
| Mazo sin cantos | 2 si no jugó su primera carta; si no, 1 | 2 si se va antes de jugar una carta | 1, cuando se va todo el equipo |
| Empate de envido | Gana el mano | Gana el mano | Gana el más cercano al mano |
| Quién canta envido en parejas | Sin dato | Cualquiera, antes de jugar su carta | Cualquiera, antes de jugar su carta |
| Envido / real / truco | E 2/1, R 3/1, se suman; truco 2/1, 3/2, 4/3 | Igual | Igual |

Fuentes: https://truco.ar/reglas (cita ASART 4.3.2) · https://www.argentina.gob.ar/sites/default/files/2023/04/truco.pdf (Juegos Evita 2023, remite a ASART) · https://juegos.gba.gob.ar/wp-content/uploads/2026/reglamentos/especificos/deportes_adultos_mayores/truco.pdf · https://www.casi.com.ar/sites/default/files/Reglamento%20Truco.pdf

## Matriz

| Código | Regla | Motor actual | Estado |
|---|---|---|---|
| C1 | 40 cartas: 1–7 y 10–12, sin 8, 9 ni comodines | Igual | ✅ |
| C2 | Jerarquía 1E > 1B > 7E > 7O > 3 > 2 > 1 falsos > 12 > 11 > 10 > 7 falsos > 6 > 5 > 4 | Igual | ✅ |
| R1 | 3 cartas, de a una, desde el mano; mano = derecha del que da | Igual | ✅ |
| R2 | El turno de dar pasa a la derecha | Igual | ✅ |
| R3 | Parejas alternadas; pie = último de cada equipo | Igual | ✅ |
| R4 | Primer dador por carta más alta; corte | Al azar; sin corte | 🔁 adaptación |
| O1 | Abre el mano; luego quien ganó la baza | Igual | ✅ |
| P1–P6 | Todas las combinaciones de pardas | Igual | ✅ |
| P7 | Tras parda en la 1.ª abre el mano | Igual | ✅ |
| P8 | Iguales del mismo equipo no son parda | Igual | ✅ |
| P9 | Sin cantos la mano vale 1 | Igual | ✅ |
| E1 | Cálculo del tanto (máx. 33) | Igual | ✅ |
| E2 | Sólo en la 1.ª baza, antes de jugar la carta propia | Igual | ✅ |
| E3 | Querido: E 2, EE 4, R 3, ER 5, EER 7 | Igual | ✅ |
| E4 | No querido: E 1, EE 2, R 1, ER 2, EER 4, F 1, EF 2, RF 3, EEF 4, ERF 5, EERF 7 | Igual | ✅ |
| E5 | Falta con los dos en malas: el partido | Igual | ✅ |
| E6 | Falta en buenas: lo que le falta al puntero | Igual | ✅ |
| E7 | Empate 1 contra 1: el mano | Igual | ✅ |
| E8 | Empate en parejas entre jugadores de distinto equipo | Equipo mano | ⚠️ pendiente ASART |
| E9 | Quién abre el envido en parejas | Sólo los pies | ⚠️ pendiente ASART |
| E10 | Responde cualquiera del equipo rival | Igual | ✅ |
| E11 | «El envido está primero» | Igual | ✅ |
| E12 | Truco querido o retruco: ya no hay envido | Igual | ✅ |
| E13 | Envido-envido-envido | No se admite | ⚠️ pendiente ASART |
| E14 | Nada después de la falta | Igual | ✅ |
| E15 | Al real no se responde envido | Igual | ✅ |
| E16 | El perdedor dice «son buenas» sin mostrar | Publica los dos tantos | ❌ diferencia |
| E17 | Cantar tantos y mostrar cartas | Cálculo automático | 🔁 adaptación |
| T1 | Truco 2, retruco 3, vale cuatro 4 | Igual | ✅ |
| T2 | No querido 1 / 2 / 3; termina la mano | Igual | ✅ |
| T3 | Sólo sube quien quiso | Igual | ✅ |
| T4 | Subir implica querer | Igual | ✅ |
| T5 | Tope vale cuatro | Igual | ✅ |
| T6 | Con canto pendiente no se juega | Igual | ✅ |
| T7 | En parejas responde cualquiera del rival | Igual | ✅ |
| T8 | Cuándo se canta truco | Sólo en el turno propio | 🔁 adaptación |
| M1 | Mazo antes de su 1.ª carta sin cantos: 2 | Igual | ✅ |
| M2 | Después de la 1.ª baza sin truco: 1 | Igual | ✅ |
| M3 | Con truco querido: su valor | Igual | ✅ |
| M4 | Con truco sin responder: como no querido | Igual | ✅ |
| M5 | Con envido jugado no suma su punto | Igual | ✅ |
| M6 | Truco querido en la 1.ª baza: sólo el truco | Suma 1 más | ❌ diferencia |
| M7 | En parejas se va uno solo y el compañero sigue | Se va todo el equipo | ⚠️ pendiente ASART |
| M8 | Sólo en turno o al responder | Igual | ✅ |
| V1 | A 30 y sin flor por defecto | Igual | ✅ |
| V2 | Gana quien llega a 30, en el acto | Igual | ✅ |
| V3 | Falta con el puntero a 1: vale 1 | Igual | ✅ |

Totales: 52 reglas · 43 ✅ · 2 ❌ · 4 ⚠️ · 3 🔁.

## Diferencias a corregir (cuando se apruebe la implementación)

1. **E16**: publicar sólo el tanto del ganador del envido.
2. **M6**: al irse al mazo, sumar el punto del envido sólo si el envido todavía se podía cantar.

Pica-pica, 3 contra 3 y flor quedan fuera de esta fase.
