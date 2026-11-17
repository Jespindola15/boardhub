# Mazmorras y Traiciones — especificación implementada

**Reglas:** las del clásico juego de cartas de saqueo de mazmorras, **edición básica (1.ª edición clásica, no la 2.ª de 2026)**, para 3 a 6 jugadores.
**Catálogo:** propio (`src/games/mazmorras/data/cards.js`): 65 puertas (28 monstruos, 8 maldiciones, 9 razas, 12 clases, 5 potenciadores, 3 monstruos errantes) y 38 tesoros (26 objetos, 7 de un uso, 5 "sube un nivel"). Nombres y textos originales; ninguna carta reproduce las del producto comercial.
**Código:** `src/games/mazmorras/engine/index.js` · tests: `tests/mazmorras.engine.test.js`.

## Reglas
| Regla | Implementación |
|---|---|
| Inicio | Nivel 1; 4 puertas + 4 tesoros. |
| Victoria | Nivel 10, sólo matando un monstruo ("sube un nivel" y vender no llegan al 10). |
| Turno | Patear la puerta → combate / maldición / a la mano. Sin monstruo: buscar problemas o saquear. Caridad al final. |
| Fuerza | Nivel + bonus de objetos equipados utilizables. |
| Combate | Gana si supera a la suma de los monstruos (+ potenciadores, + bonus contra su raza/clase, + objetos de un uso). Guerrero gana empates. |
| Ayuda | Un ayudante por combate, con tesoros pactados; el ayudante elfo sube 1 nivel (sin llegar al 10). |
| Interferir | Potenciadores, monstruos errantes (con un monstruo de la mano), objetos de un uso a cualquier bando, puñalada del ladrón, maldiciones. |
| Botín | Un nivel por monstruo (algunos 2); tesoros = suma de los monstruos ± potenciadores; el ayudante recibe primero lo pactado. |
| Huir | Un dado por monstruo y por luchador: 5+ escapa (elfo +1, calzado veloz +1, hechizo de vuelo). Si no, desgracia del monstruo. |
| Muerte | Pierde mano y equipo; conserva nivel, raza y clase; recibe 4 + 4 cartas al empezar su próximo turno. |
| Equipo | Cabeza, armadura y calzado (uno de cada), dos manos, un objeto grande (enanos: sin límite). Objetos de clase/raza sin el requisito: se llevan sin bonus. |
| Vender | En tu turno: 1000 de oro = 1 nivel, sin vuelto. Mediano: uno al doble por turno. |
| Caridad | Mano máxima 5 (enano 6). El sobrante va al de menor nivel (repartido si empatan); si sos el de menor nivel, se descarta. |

## Decisiones (documentadas)
1. **Ventana para interferir**: cuando quien pelea dice "¡Pelear!", sólo deciden los jugadores que tienen cartas para meterse (de un uso, potenciador, errante + monstruo, o ladrón con cartas). Si alguien interfiere, se vuelve a la pelea. Reemplaza el "esperar unos segundos" de la mesa real con un turno claro, también en la PC compartida.
2. **Maldiciones de la mano**: se pueden jugar en cualquier momento (no durante una pregunta de ayuda ni la caridad), sobre cualquier jugador.
3. **Al morir**, las cartas se descartan en lugar de que los demás elijan para saquear (evita una ronda de elecciones; el reparto aleatorio del original no cambia el equilibrio de forma relevante).
4. **No implementado del original** (por simplicidad, sin cambiar el núcleo): cambiar de sexo, robar del ladrón, resurrección del clérigo, volver a tirar del mediano al huir, "dos razas/dos clases" (no hay esas cartas en el catálogo).
5. **Abandonar online**: sus cartas se descartan; si queda uno solo, gana.
