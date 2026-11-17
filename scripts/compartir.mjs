/**
 * Comparte BoardHub por internet con un túnel de Cloudflare (gratis, sin abrir puertos).
 *
 *   npm run compartir
 *
 * 1. Compila la web si hace falta.
 * 2. Arranca el servidor de juego en el puerto 3001 (o PORT).
 * 3. Abre un túnel de Cloudflare y muestra la dirección pública https://….trycloudflare.com
 *    que puedes pasar a tus amigos. Admite WebSockets: el juego va en tiempo real.
 *
 * Requiere tener instalado `cloudflared` (ver docs/DESPLIEGUE.md).
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { startServer } from '../server/index.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const isWin = process.platform === 'win32';

if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.log('Compilando la web…');
  const r = spawnSync(isWin ? 'npx.cmd' : 'npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit', shell: isWin });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

await startServer({ port: PORT });
console.log(`\nServidor de BoardHub listo en http://localhost:${PORT}`);

const tunnel = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`], { shell: isWin });

tunnel.on('error', () => {
  console.log(`
No se encontró "cloudflared". Instálalo y vuelve a ejecutar "npm run compartir":
  Windows:  winget install --id Cloudflare.cloudflared
  macOS:    brew install cloudflared
  Linux:    https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

Mientras tanto, el servidor sigue funcionando en http://localhost:${PORT} (red local).`);
});

let shown = false;
const watch = (chunk) => {
  const m = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m && !shown) {
    shown = true;
    console.log(`
┌──────────────────────────────────────────────────────────────┐
  BoardHub está en internet:  ${m[0]}
  Pasa esa dirección a tus amigos. Crea la sala en "Salas".
  Para cerrar, pulsa Ctrl+C.
└──────────────────────────────────────────────────────────────┘
`);
  }
};
tunnel.stdout?.on('data', watch);
tunnel.stderr?.on('data', watch);

const stop = () => {
  tunnel.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
