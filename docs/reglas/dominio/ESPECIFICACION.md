# Dominio — especificación implementada

**Fuente:** reglamento clásico de Hasbro (https://www.hasbro.com/common/instruct/risk.pdf), modalidad **dominación mundial**.
**Código:** `src/games/dominio/` · mapa: `data/map.js` · tests: `tests/dominio.engine.test.js`.

## Mapa
42 territorios en 6 continentes, con las mismas fronteras que el mapa clásico (incluida Alaska–Kamchatka). Nombres geográficos genéricos en castellano; dibujo propio (mapa de nodos), sin arte del producto original.
Bonus por continente: América del Norte 5 (9 territorios), América del Sur 2 (4), Europa 5 (7), África 3 (6), Asia 7 (12), Oceanía 2 (4).

## Reglas
| Regla | Implementación |
|---|---|
| Jugadores | 2 a 6. |
| Ejércitos iniciales | 3: 35 · 4: 30 · 5: 25 · 6: 20 · 2: 40 + neutral de 40. |
| Quién empieza | El dado más alto (azar del servidor). |
| Territorios | Se reparten al azar (opción "repartir con las cartas" del reglamento), 1 ejército en cada uno. |
| Colocación | Por turnos, de a un ejército. Opción de sala: colocación automática al azar. |
| Refuerzos | max(3, ⌊territorios / 3⌋) + bonus de continentes completos + canjes. |
| Cartas | 42 de territorio (14 infantería, 14 caballería, 14 artillería) + 2 comodines. Una carta al final del turno si conquistaste al menos un territorio. |
| Juegos | 3 iguales, 1 de cada, o 2 cualquiera + comodín. Valores: 4, 6, 8, 10, 12, 15 y +5 cada canje siguiente. |
| Territorio en la carta | +2 ejércitos en ese territorio si es tuyo, como máximo una vez por turno. |
| Canje obligatorio | Con 5 o más cartas al empezar el turno. |
| Ataque | Origen con ≥ 2 ejércitos, a un vecino enemigo. Atacante 1–3 dados (≤ ejércitos − 1); defensor 1–2 (≤ sus ejércitos). Pares de dados más altos; empate gana el defensor. |
| Conquista | Mover al menos tantos ejércitos como dados de la última tirada (se deja ≥ 1 atrás). |
| Eliminación | Las cartas del eliminado pasan al atacante; con 6 o más, canje inmediato hasta 4 o menos y se colocan en el acto. |
| Reagrupar | Una vez, al final, de un territorio propio a otro **vecino** propio (reglamento clásico), dejando ≥ 1. Termina el turno. |
| Victoria | Controlar los 42 territorios (con 2 jugadores: eliminar al rival; el neutral no hace falta). |

## Decisiones
1. **Dados del defensor**: tira siempre el máximo posible (2 si tiene 2 o más). El reglamento deja elegir; tirar el máximo es casi siempre lo mejor y evita una espera en cada ataque online. Documentado como desviación.
2. **"Atacar hasta el final"**: atajo que repite el ataque con 3 dados (o los que permita) hasta conquistar o quedar con un ejército. Es equivalente a hacer cada tirada a mano.
3. **Neutral (2 jugadores)**: 14 territorios con 1 ejército cada uno y los 26 restantes repartidos al azar entre ellos. Sólo defiende.
4. **Abandonar online**: sus territorios quedan neutrales con sus ejércitos; sus cartas vuelven al mazo.
5. **Bonus de canje**: los +2 se ponen solos en el primer territorio propio de las cartas canjeadas.
