import { createGame, createTestMap, hashString, stableStringify, type Command, type Simulation } from '@cpu/sim';
import { playerTuning } from '@cpu/content';

export const REPLAY_FORMAT_VERSION = 2;

/**
 * 內容版本：會影響模擬結果的內容（目前是玩家手感參數）的雜湊值。
 * 重播檔記下它，內容改了之後，重播就會明確告訴你「版本不同」，而不是只丟一個看不懂的雜湊不符。
 * 之後新增會影響模擬的內容檔（兵種、異能……），要加進這裡。
 */
export function contentVersion(): string {
  return hashString(stableStringify({ players: playerTuning }));
}

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
  /** 錄製時的內容版本。 */
  contentVersion: string;
  /** 總共跑多少個 Tick。 */
  ticks: number;
  commands: Command[];
  /** 預期的最終狀態雜湊。 */
  finalHash: string;
}

export type ReplayInput = Omit<Replay, 'finalHash' | 'formatVersion'>;

export class ContentVersionError extends Error {
  constructor(recorded: string, current: string) {
    super(
      `這份重播是用不同版本的內容錄的（錄製時 ${recorded}，現在 ${current}）。` +
        '通常是 content/ 裡的手感參數改過了。黃金重播請執行 npm run replay:update；匯出的重播檔需要用錄製當時的內容才能重現。',
    );
  }
}

export function createSimForReplay(seed: string): Simulation {
  return createGame({ seed, map: createTestMap(), players: playerTuning });
}

/** 跑完一份重播，回傳模擬器（可以檢查最終狀態）。 */
export function runReplay(replay: ReplayInput): Simulation {
  if (replay.contentVersion !== contentVersion()) {
    throw new ContentVersionError(replay.contentVersion, contentVersion());
  }
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
    contentVersion: contentVersion(),
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
