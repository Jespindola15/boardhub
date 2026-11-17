import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // En desarrollo, la web habla con el servidor de juego (npm run server) a través de Vite.
    proxy: { '/socket.io': { target: 'http://localhost:3001', ws: true } },
  },
});
