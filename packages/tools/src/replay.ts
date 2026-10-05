import { createGame, createTestMap, type Command, type Simulation } from '@cpu/sim';
import { playerTuning } from '@cpu/content';

export const REPLAY_FORMAT_VERSION = 1;

/**
 * 重播檔：用「種子 + 指令紀錄」就能完全重現一局。
 * - 遇到 bug 時，客戶端會匯出這種檔案，傳給開發者就能重現。
 * - 黃金重播：固定的重播檔 + 預期的最終雜湊，任何意料之外的改變都會被抓到。
 */
export interface Replay {
  formatVersion: number;
  /** 說明這份重播在測什麼。 */
  description: string;
  seed: string;
  /** 總共跑多少個 Tick。 */
  ticks: number;
  commands: Command[];
  /** 預期的最終狀態雜湊。 */
  finalHash: string;
}

export type ReplayInput = Omit<Replay, 'finalHash' | 'formatVersion'>;

export function createSimForReplay(seed: string): Simulation {
  return createGame({ seed, map: createTestMap(), players: playerTuning });
}

/** 跑完一份重播，回傳模擬器（可以檢查最終狀態）。 */
export function runReplay(replay: ReplayInput): Simulation {
  const sim = createSimForReplay(replay.seed);
  const byTick = new Map<number, Command[]>();
  for (const c of replay.commands) {
    const list = byTick.get(c.tick) ?? [];
    list.push(c);
    byTick.set(c.tick, list);
  }
  for (let t = 0; t < replay.ticks; t++) sim.step(byTick.get(t) ?? []);
  return sim;
}

/** 把模擬器已經跑過的指令，打包成重播檔（用於「匯出重播」）。 */
export function exportReplay(sim: Simulation, description: string): Replay {
  return {
    formatVersion: REPLAY_FORMAT_VERSION,
    description,
    seed: sim.seed,
    ticks: sim.tick,
    commands: [...sim.recordedCommands()],
    finalHash: sim.hash(),
  };
}

export function parseReplay(text: string): Replay {
  const r = JSON.parse(text) as Replay;
  if (r.formatVersion !== REPLAY_FORMAT_VERSION) {
    throw new Error(`重播檔版本 ${r.formatVersion} 和目前版本 ${REPLAY_FORMAT_VERSION} 不符`);
  }
  return r;
}
