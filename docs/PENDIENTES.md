# Estado y pendientes

## Hecho (Fase 2)
- **Magnate**: motor con las reglas clásicas completas (ver `REGLAMENTO_MAGNATE.md`), 19 tests incluidos 80 partidas aleatorias completas que verifican invariantes (dinero nunca negativo, 32 casas / 12 hoteles, 32 cartas).
- **Magnate**: interfaz jugable en la misma PC: configuración de 2–8 jugadores, dados animados, fichas que recorren casilla a casilla, compra, subastas, deudas, bancarrota, negociación, construcción e hipotecas desde la ficha de cada casilla, cartas, registro y ganador.
- **Comodín**: motor completo (desafío del Roba Cuatro, «¡Comodín!» y atrapar, puntuación por rondas) con 9 tests, e interfaz con pantalla de privacidad para pasar la PC.
- Controlador local genérico (`shared/useLocalGame.js`) con guardado automático en el navegador.

## Diferencias con las reglas oficiales
Ver la última sección de `REGLAMENTO_MAGNATE.md` (negociar sólo en tu turno; sin subasta de edificios en escasez).

## Próximos juegos
1. **Conquista** (estrategia territorial con objetivos secretos, tipo TEG).
2. **Colonos** (hexágonos, recursos y comercio, tipo Catan).
3. **Ludo**.

## Online (pendiente)
- Servidor Node + Socket.IO autoritativo que ejecute los mismos motores.
- Salas privadas con código; cada jugador ve sólo su mano (Comodín) en su propio navegador.
- Persistencia (PostgreSQL / Supabase) y reconexión.
