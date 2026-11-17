import useLocalGame from '../../shared/useLocalGame.js';
import { applyAction, getActingPlayerId } from './engine/index.js';
import { createGameState } from './state/gameState.js';

const create = (players) => createGameState({ id: `local-${Date.now()}`, players });

/** Partida local de Magnate (misma PC). */
export default function useLocalMagnate() {
  return useLocalGame({ storageKey: 'boardhub.magnate.local.v2', applyAction, getActingPlayerId, create });
}
