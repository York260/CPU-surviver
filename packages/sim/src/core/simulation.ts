import { EventBus, type GameEvent } from './events';
import { hashString, stableStringify } from './hash';
import { RngRegistry, type RngState } from './rng';
import { createContext, type Command, type System } from './system';
import { DT, type EntityId } from './types';
import { World, type WorldState } from './world';

/**
 * 模組：一組相關的系統，加上初始化工作。
 *
 * setup 只能設定「資源」（例如地圖），不能建立實體。
 * 因為讀檔時也會呼叫 setup，如果在這裡建立實體，讀檔後就會多出一份。
 */
export interface GameModule {
  id: string;
  systems?: System[];
  setup?(world: World): void;
}

export interface SimulationOptions {
  seed: string;
  modules: GameModule[];
  /** 系統執行順序（系統名稱）。沒寫的話，依模組和系統宣告的順序。 */
  schedule?: string[];
  /** 一開始就關閉的系統。 */
  disabled?: string[];
}

export const SIM_STATE_VERSION = 1;

export interface SimState {
  version: number;
  seed: string;
  tick: number;
  world: WorldState;
  rng: Record<string, RngState>;
  events: { previous: GameEvent[]; history: GameEvent[] };
}

/**
 * 模擬器：把模組組起來，一個 Tick 一個 Tick 地推進世界。
 *
 * 同樣的種子 + 同樣的指令 → 同樣的結果。
 */
export class Simulation {
  readonly seed: string;
  private readonly worldRef = new World();
  private readonly bus = new EventBus();
  private readonly rngs: RngRegistry;
  private readonly modules: GameModule[];
  private readonly systems: System[];
  private readonly disabled: Set<string>;
  private readonly recorded: Command[] = [];
  private currentTick = 0;

  constructor(opts: SimulationOptions) {
    this.seed = opts.seed;
    this.rngs = new RngRegistry(opts.seed);
    this.modules = opts.modules;
    this.systems = orderSystems(opts.modules, opts.schedule);
    this.disabled = new Set(opts.disabled ?? []);
    for (const name of this.disabled) this.assertSystem(name);
    for (const m of this.modules) m.setup?.(this.worldRef);
  }

  get tick(): number {
    return this.currentTick;
  }

  /**
   * 世界本體（唯讀用途）。
   * 只有畫面快照、除錯工具可以直接讀；玩法邏輯一律寫在系統裡。
   */
  get world(): World {
    return this.worldRef;
  }

  /** 推進一個 Tick。commands 是這個 Tick 要套用的指令。 */
  step(commands: readonly Command[] = []): void {
    const tick = this.currentTick;
    const ordered = [...commands]
      .map((c) => ({ ...c, tick }))
      .sort((a, b) => (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : a.seq - b.seq));
    this.recorded.push(...ordered);
    for (const sys of this.systems) {
      if (this.disabled.has(sys.name)) continue;
      sys.run(
        createContext(sys, {
          tick,
          dt: DT,
          world: this.worldRef,
          events: this.bus,
          rng: this.rngs,
          commands: ordered,
        }),
      );
    }
    this.bus.endTick();
    this.currentTick++;
  }

  /** 到目前為止套用過的所有指令（用來匯出重播檔）。 */
  recordedCommands(): readonly Command[] {
    return this.recorded;
  }

  listSystems(): { name: string; enabled: boolean }[] {
    return this.systems.map((s) => ({ name: s.name, enabled: !this.disabled.has(s.name) }));
  }

  setSystemEnabled(name: string, enabled: boolean): void {
    this.assertSystem(name);
    if (enabled) this.disabled.delete(name);
    else this.disabled.add(name);
  }

  inspect(e: EntityId): Record<string, unknown> {
    return this.worldRef.inspect(e);
  }

  recentEvents(n: number): readonly GameEvent[] {
    return this.bus.recent(n);
  }

  eventLog(): readonly GameEvent[] {
    return this.bus.log();
  }

  serialize(): SimState {
    return {
      version: SIM_STATE_VERSION,
      seed: this.seed,
      tick: this.currentTick,
      world: this.worldRef.serialize(),
      rng: this.rngs.serialize(),
      events: this.bus.serialize(),
    };
  }

  /** 讀取存檔。模擬器必須用同樣的種子和模組建立。 */
  load(state: SimState): void {
    if (state.version !== SIM_STATE_VERSION) {
      throw new Error(`存檔版本 ${state.version} 和目前版本 ${SIM_STATE_VERSION} 不符`);
    }
    if (state.seed !== this.seed) throw new Error('存檔的種子和模擬器不同');
    this.currentTick = state.tick;
    this.worldRef.load(state.world);
    this.rngs.load(state.rng);
    this.bus.load(state.events);
    for (const m of this.modules) m.setup?.(this.worldRef);
  }

  /** 整個模擬狀態的雜湊值。黃金重播用它來偵測任何意料之外的改變。 */
  hash(): string {
    return hashString(stableStringify(this.serialize()));
  }

  private assertSystem(name: string): void {
    if (!this.systems.some((s) => s.name === name)) throw new Error(`找不到系統「${name}」`);
  }
}

function orderSystems(modules: GameModule[], schedule?: string[]): System[] {
  const all = modules.flatMap((m) => m.systems ?? []);
  const byName = new Map<string, System>();
  for (const s of all) {
    if (byName.has(s.name)) throw new Error(`系統名稱重複：「${s.name}」`);
    byName.set(s.name, s);
  }
  if (!schedule) return all;
  const missing = all.filter((s) => !schedule.includes(s.name)).map((s) => s.name);
  if (missing.length) throw new Error(`排程漏掉了系統：${missing.join('、')}`);
  return schedule.map((name) => {
    const s = byName.get(name);
    if (!s) throw new Error(`排程裡有不存在的系統：「${name}」`);
    return s;
  });
}
