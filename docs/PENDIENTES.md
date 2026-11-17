# Estado y pendientes

## Hecho
Nueve juegos completos, cada uno con reglamento documentado en `docs/reglas/<juego>/`, motor puro con tests, modo en la misma PC (con pantalla para pasar la PC) y salas online:

| Juego | Basado en | Jugadores | Doc |
|---|---|---|---|
| Magnate | Monopoly clásico (Hasbro G0009) | 2–8 | `reglas/magnate/` |
| Última Carta | UNO (Mattel 41001-0925) | 2–8 | `reglas/ultima-carta/` |
| Chinchón | Reglamento Juegos Bonaerenses | 2–4 | `reglas/chinchon/` |
| Truco | Truco argentino (sin flor, a 30 por defecto; flor y pica-pica opcionales) | 2, 4, 6 | `reglas/truco/` |
| Dominio | Risk clásico (dominación mundial) | 2–6 | `reglas/dominio/` |
| Rutas | Ticket to Ride básico, mapa propio de Sudamérica | 2–5 | `reglas/rutas/` |
| Colonias | Catan básico | 3–4 | `reglas/colonias/` |
| Misterio | Clue clásico, personajes y plano propios | 3–6 | `reglas/misterio/` |
| Mazmorras y Traiciones | Munchkin clásico, catálogo de cartas propio | 3–6 | `reglas/mazmorras/` |

- **Salas online públicas y privadas**: al crear se elige la visibilidad (el anfitrión la puede cambiar en la sala). Las públicas aparecen en `#/salas` mientras esperan jugadores (en el Worker, con un Durable Object `LobbyDO`).
- **Servidor**: Cloudflare Worker + Durable Objects (producción) o Node (`npm run server`) para desarrollo y tests.
- **Web en Netlify**: `netlify.toml` compila la web y la apunta al Worker con `VITE_SERVER_URL`.
- Cada sección de "Decisiones" en las especificaciones lista lo que no está explícito en los reglamentos o se simplificó.

## Para actualizar
1. `git push` → Netlify publica la web.
2. `npm run deploy` → Cloudflare actualiza el servidor (necesario cada vez que cambian reglas o se agrega un juego, porque los motores corren en el servidor). Se puede automatizar conectando el repo en Cloudflare → Workers → boardhub → Settings → Builds.

## Ideas a futuro
- Cuentas de usuario e historial de partidas.
- Bots para completar mesas.
- Chat dentro de la sala.
