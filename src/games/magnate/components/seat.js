import { createContext, useContext } from 'react';

/**
 * Quién mira la pantalla.
 *  - Modo local (misma PC): me = null → se puede actuar por cualquier jugador.
 *  - Modo online: me = id del jugador → sólo se muestran sus propias decisiones.
 * El servidor valida igual: esto sólo evita mostrar botones que no corresponden.
 */
export const SeatContext = createContext({ me: null });

export function useSeat() {
  const { me } = useContext(SeatContext);
  return { me, online: me != null, canAct: (id) => me == null || me === id };
}
