/**
 * Motor de reglas de Magnate — PUNTO DE ENTRADA (no implementado en la Fase 1).
 *
 * Contrato previsto:
 *   applyAction(state, action, rng) -> { ok: true, state, events } | { ok: false, error }
 *
 *  - Función pura: no muta `state`, devuelve uno nuevo.
 *  - `rng` se inyecta para que el servidor controle el azar (dados, mazos) y
 *    para poder reproducir partidas en tests.
 *  - Prohibido importar React, el DOM o Socket.IO desde esta carpeta.
 *    Así el mismo código corre en el navegador y en el servidor Node.
 *
 * Antes de implementarlo hay que cerrar el reglamento (docs/PENDIENTES.md).
 */
export { ACTIONS } from './actionTypes.js';

export function applyAction(_state, action) {
  return {
    ok: false,
    error: { code: 'NOT_IMPLEMENTED', message: `La acción ${action?.type ?? '?'} aún no está implementada (Fase 1).` },
  };
}
