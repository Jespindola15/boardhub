import { io } from 'socket.io-client';

let socket = null;

/** Conexión única con el servidor de juego (mismo origen; en desarrollo, a través del proxy de Vite). */
export function getSocket() {
  if (!socket) socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
  return socket;
}

/** Emite y espera la respuesta del servidor (con tiempo límite). */
export function request(event, payload, timeoutMs = 8000) {
  const s = getSocket();
  return new Promise((resolve) => {
    s.timeout(timeoutMs).emit(event, payload, (err, res) => {
      if (err) resolve({ ok: false, error: 'El servidor no responde. ¿Está en marcha?' });
      else resolve(res);
    });
  });
}
