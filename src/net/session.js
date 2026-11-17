/** Sesiones por sala guardadas en el navegador: { token, playerId }. */
const key = (code) => `boardhub.session.${String(code).toUpperCase()}`;

export function saveSession(code, data) {
  try {
    localStorage.setItem(key(code), JSON.stringify(data));
  } catch {
    /* sin almacenamiento: la reconexión no será automática */
  }
}

export function loadSession(code) {
  try {
    return JSON.parse(localStorage.getItem(key(code)) ?? 'null');
  } catch {
    return null;
  }
}

export function clearSession(code) {
  try {
    localStorage.removeItem(key(code));
  } catch {
    /* nada */
  }
}

export function rememberName(name) {
  try {
    localStorage.setItem('boardhub.name', name);
  } catch {
    /* nada */
  }
}

export function lastName() {
  try {
    return localStorage.getItem('boardhub.name') ?? '';
  } catch {
    return '';
  }
}
