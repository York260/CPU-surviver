import {
  TICK_RATE,
  buildSnapshot,
  createGame,
  createTestMap,
  makeCommand,
  type Command,
  type CommandKind,
  type CommandTypes,
  type Simulation,
  type Snapshot,
  type TileMap,
} from '@cpu/sim';
import { playerTuning } from '@cpu/content';

/**
 * 連線階段：畫面和模擬之間的唯一介面。
 *
 * I0 只有本機版（LocalSession，模擬器就跑在瀏覽器裡）。
 * I1 會新增 NetworkSession，同樣實作這個介面，畫面程式碼完全不用改。
 * 畫面只做兩件事：送出輸入、讀取快照，永遠不直接修改遊戲狀態。
 */
export interface GameSession {
  readonly localPlayerId: string;
  readonly map: TileMap;
  /** 送出移動輸入（x、y 介於 -1 到 1）。 */
  sendMove(x: number, y: number): void;
  /** 依照經過的真實時間推進（毫秒）。 */
  advance(deltaMs: number): void;
  /** 取得插值用的前後兩個快照，以及兩者之間的進度 alpha（0 到 1）。 */
  frame(): { prev: Snapshot; curr: Snapshot; alpha: number };
}

export interface DebugHandle {
  readonly sim: Simulation;
  paused: boolean;
  speed: number;
  /** 暫停時手動前進一個 Tick。 */
  stepOnce(): void;
}

const TICK_MS = 1000 / TICK_RATE;
/** 一次畫面更新最多追趕幾個 Tick，避免分頁切走再回來時狂跑。 */
const MAX_STEPS_PER_ADVANCE = 10;

export class LocalSession implements GameSession, DebugHandle {
  readonly sim: Simulation;
  readonly map: TileMap;
  readonly localPlayerId: string;
  paused = false;
  speed = 1;

  private accumulator = 0;
  private seq = 0;
  private pending: Command[] = [];
  private prev: Snapshot;
  private curr: Snapshot;

  constructor(opts: { seed: string; playerName: string; playerId?: string }) {
    this.map = createTestMap();
    this.localPlayerId = opts.playerId ?? 'local';
    this.sim = createGame({ seed: opts.seed, map: this.map, players: playerTuning });
    this.queue('join', { name: opts.playerName });
    this.sim.step(this.pending);
    this.pending = [];
    this.curr = buildSnapshot(this.sim, this.localPlayerId);
    this.prev = this.curr;
  }

  sendMove(x: number, y: number): void {
    this.queue('move', { x, y });
  }

  advance(deltaMs: number): void {
    if (this.paused) return;
    this.accumulator += Math.min(deltaMs, 250) * this.speed;
    let steps = 0;
    while (this.accumulator >= TICK_MS && steps < MAX_STEPS_PER_ADVANCE) {
      this.runTick();
      this.accumulator -= TICK_MS;
      steps++;
    }
    if (steps === MAX_STEPS_PER_ADVANCE) this.accumulator = 0;
  }

  stepOnce(): void {
    this.runTick();
    this.prev = this.curr;
  }

  frame(): { prev: Snapshot; curr: Snapshot; alpha: number } {
    return { prev: this.prev, curr: this.curr, alpha: this.paused ? 1 : Math.min(1, this.accumulator / TICK_MS) };
  }

  private queue<K extends CommandKind>(kind: K, data: CommandTypes[K]): void {
    this.pending.push(makeCommand(this.localPlayerId, this.seq++, kind, data));
  }

  private runTick(): void {
    this.sim.step(this.pending);
    this.pending = [];
    this.prev = this.curr;
    this.curr = buildSnapshot(this.sim, this.localPlayerId);
  }
}
