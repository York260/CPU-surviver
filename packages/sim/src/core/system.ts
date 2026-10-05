import type { EventBus, GameEvent } from './events';
import type {
  CommandKind,
  CommandTypes,
  ComponentKey,
  ComponentTypes,
  EventKey,
  EventTypes,
  ResourceKey,
  ResourceTypes,
} from './registry';
import type { Rng, RngRegistry } from './rng';
import type { EntityId } from './types';
import type { World } from './world';

/** 指令：外部（玩家輸入、網路）改變遊戲狀態的唯一入口。 */
export interface Command<K extends CommandKind = CommandKind> {
  tick: number;
  playerId: string;
  /** 同一位玩家的指令流水號，用來在同一個 Tick 內排序。 */
  seq: number;
  kind: K;
  data: CommandTypes[K];
}

/** 建立一個指令。指令種類和資料的對應由編譯器檢查。tick 由模擬器在套用時填入。 */
export function makeCommand<K extends CommandKind>(
  playerId: string,
  seq: number,
  kind: K,
  data: CommandTypes[K],
): Command {
  return { tick: 0, playerId, seq, kind, data } as Command;
}

/**
 * 系統的宣告。
 *
 * reads / writes / emits / listens / commands 就是這個系統的「合約」。
 * 排程器會在執行時檢查：存取未宣告的東西會直接丟出錯誤，
 * 讓模組之間的耦合一定看得見。
 */
export interface System {
  name: string;
  reads?: ComponentKey[];
  writes?: ComponentKey[];
  /** 可以建立或刪除實體。 */
  structural?: boolean;
  resources?: ResourceKey[];
  emits?: EventKey[];
  listens?: EventKey[];
  commands?: CommandKind[];
  run(ctx: SystemContext): void;
}

/** 系統唯讀的元件表。 */
export interface ReadStore<K extends ComponentKey> {
  get(e: EntityId): Readonly<ComponentTypes[K]> | undefined;
  has(e: EntityId): boolean;
}

/** 系統可寫的元件表。 */
export interface WriteStore<K extends ComponentKey> extends ReadStore<K> {
  get(e: EntityId): ComponentTypes[K] | undefined;
  set(e: EntityId, value: ComponentTypes[K]): void;
  delete(e: EntityId): void;
}

/** 系統在執行時拿到的唯一入口。 */
export interface SystemContext {
  readonly tick: number;
  readonly dt: number;
  read<K extends ComponentKey>(key: K): ReadStore<K>;
  write<K extends ComponentKey>(key: K): WriteStore<K>;
  query(...keys: ComponentKey[]): EntityId[];
  spawn(): EntityId;
  destroy(e: EntityId): void;
  resource<K extends ResourceKey>(key: K): ResourceTypes[K];
  emit<K extends EventKey>(type: K, data: EventTypes[K]): void;
  events<K extends EventKey>(type: K): GameEvent<K>[];
  commands<K extends CommandKind>(kind: K): Command<K>[];
  rng(stream: string): Rng;
}

export class ContractError extends Error {}

/** 依照系統宣告建立一個會檢查權限的 SystemContext。 */
export function createContext(
  sys: System,
  deps: {
    tick: number;
    dt: number;
    world: World;
    events: EventBus;
    rng: RngRegistry;
    commands: readonly Command[];
  },
): SystemContext {
  const reads = new Set<string>([...(sys.reads ?? []), ...(sys.writes ?? [])]);
  const writes = new Set<string>(sys.writes ?? []);
  const resources = new Set<string>(sys.resources ?? []);
  const emits = new Set<string>(sys.emits ?? []);
  const listens = new Set<string>(sys.listens ?? []);
  const cmds = new Set<string>(sys.commands ?? []);
  const fail = (what: string): never => {
    throw new ContractError(`[${sys.name}] 未宣告就使用：${what}`);
  };
  const { world } = deps;

  return {
    tick: deps.tick,
    dt: deps.dt,
    read(key) {
      if (!reads.has(key)) fail(`讀取元件 ${key}`);
      const s = world.store(key);
      return { get: (e) => s.get(e), has: (e) => s.has(e) };
    },
    write(key) {
      if (!writes.has(key)) fail(`寫入元件 ${key}`);
      const s = world.store(key);
      return {
        get: (e) => s.get(e),
        has: (e) => s.has(e),
        set: (e, v) => world.set(e, key, v),
        delete: (e) => s.delete(e),
      };
    },
    query(...keys) {
      for (const k of keys) if (!reads.has(k)) fail(`查詢元件 ${k}`);
      return world.query(...keys);
    },
    spawn() {
      if (!sys.structural) fail('建立實體（structural）');
      return world.spawn();
    },
    destroy(e) {
      if (!sys.structural) fail('刪除實體（structural）');
      world.destroy(e);
    },
    resource(key) {
      if (!resources.has(key)) fail(`資源 ${key}`);
      return world.getResource(key);
    },
    emit(type, data) {
      if (!emits.has(type)) fail(`發出事件 ${type}`);
      deps.events.emit(deps.tick, type, data);
    },
    events(type) {
      if (!listens.has(type)) fail(`接收事件 ${type}`);
      return deps.events.read(type);
    },
    commands(kind) {
      if (!cmds.has(kind)) fail(`處理指令 ${kind}`);
      return deps.commands.filter((c) => c.kind === kind) as Command<typeof kind>[];
    },
    rng(stream) {
      return deps.rng.stream(stream);
    },
  };
}
