# Publicar BoardHub

## Opción recomendada — Cloudflare Workers (siempre encendido, gratis)
BoardHub queda en `https://boardhub.<tu-subdominio>.workers.dev` (por ejemplo `https://boardhub.inibag.workers.dev`), sin depender de tu PC.

- La web compilada se sirve como **Static Assets** del Worker.
- Cada sala es un **Durable Object**: guarda la partida y mantiene los WebSockets de sus jugadores. Las salas sobreviven a reinicios y despliegues; se borran tras 24 h sin actividad.
- Usa el mismo núcleo (`server/core/`) y los mismos motores de reglas que el servidor Node.

### Primera vez
```bash
npm install
npx wrangler login      # abre el navegador para autorizar tu cuenta de Cloudflare
npm run deploy          # compila la web y publica el Worker
```
Al terminar, Wrangler muestra la dirección pública. Cada vez que cambies algo: `npm run deploy`.

### Dominio propio (opcional)
En el panel de Cloudflare: **Workers & Pages → boardhub → Settings → Domains & Routes → Add → Custom domain** (por ejemplo `juegos.tudominio.com`).

### Probar el Worker en tu PC antes de publicar
```bash
npm run worker:dev                          # Worker local en http://localhost:8787 (web + salas)
BOARDHUB_URL=http://127.0.0.1:8787 npm run test:worker   # las pruebas de integración contra el Worker
```
(En Windows PowerShell: `$env:BOARDHUB_URL="http://127.0.0.1:8787"; npm run test:worker`.)

### Ver registros en vivo
```bash
npx wrangler tail
```

## Alternativas
- **Túnel rápido desde tu PC** (sin publicar nada): `npm run compartir` (requiere `cloudflared`). La dirección cambia cada vez.
- **Servidor Node en la nube**: el `Dockerfile` sirve para Render, Railway o Fly.io.

## Tiempo real y sincronización (igual en Node y en Workers)
- Protocolo propio sobre **WebSocket nativo**: una conexión por sala (`/ws/CODIGO`).
- Cada acción se valida en el servidor; si es válida, **todos** reciben su vista nueva al instante.
- Cada vista tiene número de versión. El cliente nunca retrocede de versión y envía la versión que veía: si la mesa cambió mientras tanto (doble clic, dos jugadores a la vez), la acción se rechaza sin efecto y la pantalla se actualiza.
- Los reintentos con el mismo identificador de acción no se aplican dos veces.
- Reconexión automática con espera creciente; al reconectar o volver a la pestaña se recupera el asiento y la vista.
- Latido cada 15 s desde el cliente (y cada 10 s desde el servidor Node) para detectar conexiones caídas.
- Límite de 60 acciones por segundo por conexión.
