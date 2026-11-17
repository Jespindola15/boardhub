# Jugar con amigos por internet

El juego en línea necesita que **el servidor de BoardHub** (`server/index.js`, Node + Socket.IO) sea accesible desde internet. Ese mismo proceso sirve la web compilada y el tiempo real (WebSockets).

## Opción 1 — Túnel rápido de Cloudflare (lo más simple, gratis)
Ideal para jugar hoy desde tu PC, sin cuentas ni abrir puertos.

1. Instala `cloudflared` (una sola vez):
   - Windows: `winget install --id Cloudflare.cloudflared`
   - macOS: `brew install cloudflared`
2. En la carpeta del proyecto:
   ```bash
   npm install
   npm run compartir
   ```
3. Aparece una dirección como `https://palabras-al-azar.trycloudflare.com`. Pásala a tus amigos, crea la sala en **Salas** y compárteles el código o el enlace.

Notas:
- La dirección cambia cada vez que ejecutas el comando y deja de funcionar si apagas la PC o cierras la terminal.
- Las partidas se guardan en `server/data/rooms.json`: si reinicias, las salas siguen ahí (los jugadores reconectan solos).

## Opción 2 — Túnel de Cloudflare con dominio propio (dirección fija)
Si tienes un dominio en Cloudflare:
```bash
cloudflared tunnel login
cloudflared tunnel create boardhub
cloudflared tunnel route dns boardhub juegos.tudominio.com
npm run build && npm start            # servidor en :3001
cloudflared tunnel run --url http://localhost:3001 boardhub
```
La dirección `https://juegos.tudominio.com` queda fija. El servidor sigue corriendo en tu PC (o en cualquier máquina tuya).

## Opción 3 — Servidor en la nube (siempre encendido)
El repositorio incluye un `Dockerfile`. En Render, Railway o Fly.io:
- Crea un servicio web desde el repositorio de GitHub usando el Dockerfile.
- Puerto: `3001` (o la variable `PORT` que asigne la plataforma).
- Disco persistente (opcional) montado en `/app/server/data` para conservar las salas entre despliegues.
- Puedes poner Cloudflare delante como DNS/proxy: los WebSockets funcionan.

## ¿Y Cloudflare Workers?
Workers no ejecuta un servidor Node con Socket.IO. Para alojar todo el juego en Cloudflare habría que portar el servidor a **Durable Objects** (una instancia por sala con WebSockets nativos). Los motores de reglas son JS puro y se podrían reutilizar sin cambios; sólo cambiaría la capa de transporte (`server/`). Queda como mejora futura; las opciones 1–3 ya funcionan en tiempo real.

## Tiempo real y sincronización (cómo funciona)
- Cada acción se valida en el servidor y, si es válida, **todos** los jugadores reciben su vista nueva al instante.
- Cada vista lleva un número de versión. El cliente nunca retrocede a una versión anterior y envía la versión que estaba viendo con cada acción: si la mesa cambió mientras tanto (doble clic, dos jugadores a la vez), la acción se rechaza sin efecto y la pantalla se actualiza.
- Reintentos o clics repetidos con el mismo identificador de acción no se aplican dos veces.
- Si se corta la conexión, el cliente reconecta solo y recupera su asiento; al volver a la pestaña se pide la vista actual.
- Latido cada 10 s para detectar desconexiones; el anfitrión puede quitar a quien no vuelve.
