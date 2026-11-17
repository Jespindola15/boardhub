/**
 * DATOS SIMULADOS — sólo para comprobar la interfaz en la Fase 1.
 * No representan partidas reales ni resultan de aplicar reglas.
 */
import { createGameState, HOTEL } from './gameState.js';
import { PLAYER_COLORS, TOKENS, PLAYER_STATUS } from '../models/player.js';
import { JAIL_INDEX } from '../data/board.js';

const NAMES = ['Lucía', 'Mateo', 'Valentina', 'Tomás', 'Camila', 'Joaquín', 'Martina', 'Benjamín'];

export const MOCK_SCENARIOS = [
  { id: 'mid-game', label: 'Partida avanzada' },
  { id: 'start', label: 'Inicio de partida' },
  { id: 'crowded', label: 'Todos en una casilla' },
  { id: 'jail', label: 'Cárcel y visitas' },
];

function basePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: NAMES[i],
    colorId: PLAYER_COLORS[i].id,
    tokenId: TOKENS[i].id,
    isHost: i === 0,
  }));
}

/** Reparto de propiedades de ejemplo: [índice casilla, índice jugador, casas, hipotecada] */
const MID_GAME_OWNERSHIP = [
  [1, 0, 2, false], [3, 0, 2, false],
  [6, 1, 0, false], [8, 1, 0, false], [9, 2, 0, true],
  [11, 2, 3, false], [13, 2, 3, false], [14, 2, 4, false],
  [5, 3, 0, false], [15, 3, 0, false], [25, 3, 0, false],
  [16, 4, 0, false], [19, 4, 0, true],
  [21, 5, HOTEL, false], [23, 5, 4, false], [24, 5, 4, false],
  [12, 6, 0, false], [28, 6, 0, false],
  [26, 7, 1, false], [29, 7, 0, false],
  [31, 0, 0, false], [34, 1, 0, true], [37, 3, 0, false], [39, 4, 0, false],
];

const MID_GAME_POSITIONS = [24, 7, 10, 24, 33, 24, 0, 39];
const MID_GAME_MONEY = [1240, 860, 315, 1720, 540, 2050, 95, 1100];

/**
 * Genera un estado simulado.
 * @param {number} playerCount 2–8
 * @param {string} scenarioId  uno de MOCK_SCENARIOS
 */
export function createMockGame(playerCount = 6, scenarioId = 'mid-game') {
  const state = createGameState({ id: 'mock', players: basePlayers(playerCount) });
  const { players } = state;

  switch (scenarioId) {
    case 'start':
      break;

    case 'crowded':
      players.forEach((p) => (p.position = 24));
      state.turn.playerId = players[1].id;
      break;

    case 'jail':
      players.forEach((p, i) => {
        p.position = JAIL_INDEX;
        if (i % 2 === 0) {
          p.status = PLAYER_STATUS.IN_JAIL;
          p.jailTurns = (i % 3) + 1;
        }
      });
      state.turn.playerId = players[0].id;
      break;

    case 'mid-game':
    default: {
      players.forEach((p, i) => {
        p.position = MID_GAME_POSITIONS[i];
        p.money = MID_GAME_MONEY[i];
      });
      if (players[2]) {
        players[2].status = PLAYER_STATUS.IN_JAIL;
        players[2].jailTurns = 1;
        players[2].jailFreeCards = 1;
      }
      if (players[6]) players[6].status = PLAYER_STATUS.BANKRUPT;
      if (players[7]) players[7].status = PLAYER_STATUS.DISCONNECTED;

      for (const [sq, pi, houses, mortgaged] of MID_GAME_OWNERSHIP) {
        const owner = players[pi];
        if (!owner || owner.status === PLAYER_STATUS.BANKRUPT) continue;
        state.ownership[sq] = { ownerId: owner.id, houses, mortgaged };
      }
      state.turn = { playerId: players[1].id, round: 14, doublesInRow: 0, step: 'awaiting-roll' };
      state.dice = [4, 3];
      state.decks = { chance: { remaining: 9 }, community: { remaining: 11 } };
      state.log = [
        { id: 'l1', text: `${players[0].name} compró Parque Esmeralda.` },
        { id: 'l2', text: `${players[0].name} sacó 4 + 3 y avanzó a Plaza de la Catedral.` },
        { id: 'l3', text: `Turno de ${players[1].name}.` },
      ];
      break;
    }
  }
  return state;
}
