import { Simulation, type GameModule } from './core/simulation';
import { mapModule, type TileMap } from './modules/m01-map';
import { movementModule } from './modules/m02-movement';
import { playersModule, type PlayerConfig } from './modules/players';

export interface GameConfig {
  seed: string;
  map: TileMap;
  players: PlayerConfig;
  disabled?: string[];
}

/** I0 的系統執行順序。新增系統時，在這裡決定它排在哪裡。 */
export const DEFAULT_SCHEDULE = ['players', 'movement'];

export function createGameModules(config: GameConfig): GameModule[] {
  return [mapModule(config.map), playersModule(config.players), movementModule()];
}

/** 用目前所有模組組出一局遊戲。伺服器、客戶端、工具都透過這裡建立模擬器。 */
export function createGame(config: GameConfig): Simulation {
  return new Simulation({
    seed: config.seed,
    modules: createGameModules(config),
    schedule: DEFAULT_SCHEDULE,
    disabled: config.disabled ?? [],
  });
}
