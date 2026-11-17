# Estado y pendientes

## Hecho (Fase 2)
- **Magnate**: motor auditado y corregido frente a Hasbro G0009 (`docs/reglas/magnate/`): 68 pruebas, incluidas 60 partidas aleatorias completas, rechazo de acciones ilegales y reconstrucción del estado.
- **Magnate**: interfaz jugable en la misma PC: configuración de 2–8 jugadores, dados animados, fichas que recorren casilla a casilla, compra, subastas, deudas, bancarrota, negociación, construcción e hipotecas desde la ficha de cada casilla, cartas, registro y ganador.
- **Última Carta** (antes Comodín): motor fiel a Mattel 41001-0925 con vistas privadas (29 pruebas) y **juego en línea**: servidor autoritativo, salas por código, reconexión, acciones duplicadas, guardado en disco (3 pruebas de integración).
- Controlador local genérico (`shared/useLocalGame.js`) con guardado automático en el navegador.

## Adaptaciones aprobadas de Magnate
Ver la sección 12 de `docs/reglas/magnate/ESPECIFICACION.md`.


## Próximos juegos
1. **Colonias** (Catan, juego base 3–4).
2. **Dominio** (Risk clásico).
3. **Misterio** (Clue) y **Rutas** (Ticket to Ride).

## Online (pendiente)
- Persistencia en PostgreSQL / Supabase (hoy: archivo JSON).
- Servidor permanente (hoy: túnel de Cloudflare desde la PC, o Docker en la nube; ver `docs/DESPLIEGUE.md`).
- Port opcional a Cloudflare Durable Objects.
