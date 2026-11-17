import { useEffect, useState } from 'react';

/**
 * Router mínimo basado en el hash de la URL (#/ruta).
 *
 * Se eligió hash routing para no añadir dependencias y para que el build
 * funcione en cualquier hosting estático sin configurar reescrituras.
 * Si más adelante se necesitan rutas anidadas o loaders, se puede sustituir
 * por react-router sin tocar los componentes: sólo usan `navigate` y `useRoute`.
 */

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

export function navigate(path) {
  window.location.hash = path;
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onChange = () => {
      setPath(currentPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return path;
}

/** Devuelve { name, params } a partir de la ruta actual. */
export function matchRoute(path) {
  if (path === '/' || path === '') return { name: 'home', params: {} };

  const game = path.match(/^\/juegos\/([a-z0-9-]+)\/?$/);
  if (game) return { name: 'game', params: { slug: game[1] } };

  return { name: 'not-found', params: {} };
}
