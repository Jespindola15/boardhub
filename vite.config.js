import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // En desarrollo, la web habla con el servidor de juego a través de Vite:
    //   npm run server → Node en :3001 (por defecto)
    //   BACKEND=http://localhost:8787 npm run dev → Worker local (npm run worker:dev)
    proxy: {
      '/ws': { target: process.env.BACKEND ?? 'http://localhost:3001', ws: true },
      '/api': { target: process.env.BACKEND ?? 'http://localhost:3001' },
    },
  },
});
