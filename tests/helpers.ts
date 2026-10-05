import {
  createGame,
  createTestMap,
  makeCommand,
  type Command,
  type CommandKind,
  type CommandTypes,
  type Simulation,
} from '@cpu/sim';

export const TEST_PLAYERS = { speed: 72, half: 5 };

export function newGame(seed = 'test-seed', disabled: string[] = []): Simulation {
  return createGame({ seed, map: createTestMap(), players: TEST_PLAYERS, disabled });
}

let seqCounter = 0;
export function cmd<K extends CommandKind>(playerId: string, kind: K, data: CommandTypes[K]): Command {
  return makeCommand(playerId, seqCounter++, kind, data);
}

export function posOf(sim: Simulation, playerId: string): { x: number; y: number } {
  for (const e of sim.world.query('PlayerControl', 'Position')) {
    if (sim.world.get(e, 'PlayerControl')!.playerId === playerId) return { ...sim.world.get(e, 'Position')! };
  }
  throw new Error(`找不到玩家 ${playerId}`);
}
