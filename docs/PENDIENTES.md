# Estado y pendientes

## Hecho (Fase 2)
- **Magnate**: motor auditado y corregido frente a Hasbro G0009 (`docs/reglas/magnate/`): 68 pruebas, incluidas 60 partidas aleatorias completas, rechazo de acciones ilegales y reconstrucción del estado.
- **Magnate**: interfaz jugable en la misma PC: configuración de 2–8 jugadores, dados animados, fichas que recorren casilla a casilla, compra, subastas, deudas, bancarrota, negociación, construcción e hipotecas desde la ficha de cada casilla, cartas, registro y ganador.
- **Comodín**: motor completo (desafío del Roba Cuatro, «¡Comodín!» y atrapar, puntuación por rondas) con 9 tests, e interfaz con pantalla de privacidad para pasar la PC.
- Controlador local genérico (`shared/useLocalGame.js`) con guardado automático en el navegador.

## Adaptaciones aprobadas de Magnate
Ver la sección 12 de `docs/reglas/magnate/ESPECIFICACION.md`.

## Pendiente de Magnate antes del online
- Vistas privadas: el estado contiene el orden de los mazos (J3), que no debe llegar a los clientes.

## Próximos juegos
1. **Conquista** (estrategia territorial con objetivos secretos, tipo TEG).
2. **Colonos** (hexágonos, recursos y comercio, tipo Catan).
3. **Ludo**.

## Online (pendiente)
- Servidor Node + Socket.IO autoritativo que ejecute los mismos motores.
- Salas privadas con código; cada jugador ve sólo su mano (Comodín) en su propio navegador.
- Persistencia (PostgreSQL / Supabase) y reconexión.
