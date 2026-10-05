import { cloneData } from './hash';
import type { ComponentKey, ComponentTypes, ResourceKey, ResourceTypes } from './registry';
import type { EntityId } from './types';

/** 一種元件的資料表：實體 ID → 元件資料。 */
export type Store<K extends ComponentKey> = Map<EntityId, ComponentTypes[K]>;

/** 世界的可序列化狀態。 */
export interface WorldState {
  nextId: number;
  entities: EntityId[];
  components: Record<string, [EntityId, unknown][]>;
}

/**
 * 世界：存放實體和元件。
 *
 * 只負責資料，不包含任何玩法邏輯。系統不直接拿到 World，
 * 而是透過 SystemContext 存取，好讓排程器檢查讀寫權限。
 */
export class World {
  private nextId = 1;
  private readonly alive = new Set<EntityId>();
  private readonly stores = new Map<ComponentKey, Map<EntityId, unknown>>();
  private readonly resources = new Map<ResourceKey, unknown>();

  spawn(): EntityId {
    const id = this.nextId++;
    this.alive.add(id);
    return id;
  }

  destroy(e: EntityId): void {
    if (!this.alive.delete(e)) return;
    for (const store of this.stores.values()) store.delete(e);
  }

  isAlive(e: EntityId): boolean {
    return this.alive.has(e);
  }

  store<K extends ComponentKey>(key: K): Store<K> {
    let s = this.stores.get(key);
    if (!s) {
      s = new Map();
      this.stores.set(key, s);
    }
    return s as Store<K>;
  }

  set<K extends ComponentKey>(e: EntityId, key: K, value: ComponentTypes[K]): void {
    if (!this.alive.has(e)) throw new Error(`World.set：實體 ${e} 不存在`);
    this.store(key).set(e, value);
  }

  get<K extends ComponentKey>(e: EntityId, key: K): ComponentTypes[K] | undefined {
    return this.store(key).get(e);
  }

  has(e: EntityId, key: ComponentKey): boolean {
    return this.store(key).has(e);
  }

  remove(e: EntityId, key: ComponentKey): void {
    this.store(key).delete(e);
  }

  /** 回傳同時擁有所有指定元件的實體，依 ID 由小到大排序，保證結果可重現。 */
  query(...keys: ComponentKey[]): EntityId[] {
    if (keys.length === 0) return [...this.alive].sort((a, b) => a - b);
    const [first, ...rest] = keys as [ComponentKey, ...ComponentKey[]];
    const out: EntityId[] = [];
    for (const e of this.store(first).keys()) {
      if (rest.every((k) => this.store(k).has(e))) out.push(e);
    }
    return out.sort((a, b) => a - b);
  }

  /** 列出某個實體身上所有元件（除錯用）。 */
  inspect(e: EntityId): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of [...this.stores.keys()].sort()) {
      const v = this.stores.get(key)?.get(e);
      if (v !== undefined) out[key] = v;
    }
    return out;
  }

  entityCount(): number {
    return this.alive.size;
  }

  setResource<K extends ResourceKey>(key: K, value: ResourceTypes[K]): void {
    this.resources.set(key, value);
  }

  getResource<K extends ResourceKey>(key: K): ResourceTypes[K] {
    if (!this.resources.has(key)) throw new Error(`World.getResource：找不到資源「${key}」`);
    return this.resources.get(key) as ResourceTypes[K];
  }

  hasResource(key: ResourceKey): boolean {
    return this.resources.has(key);
  }

  /**
   * 序列化實體與元件。
   * 資源不在這裡序列化：地圖之類的資源由內容檔重建，不隨存檔保存。
   */
  serialize(): WorldState {
    const components: Record<string, [EntityId, unknown][]> = {};
    for (const key of [...this.stores.keys()].sort()) {
      const store = this.stores.get(key) as Map<EntityId, unknown>;
      if (store.size === 0) continue;
      components[key] = [...store.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([e, v]) => [e, cloneData(v)]);
    }
    return {
      nextId: this.nextId,
      entities: [...this.alive].sort((a, b) => a - b),
      components,
    };
  }

  load(state: WorldState): void {
    this.alive.clear();
    this.stores.clear();
    this.nextId = state.nextId;
    for (const e of state.entities) this.alive.add(e);
    for (const key of Object.keys(state.components).sort()) {
      const store = this.store(key as ComponentKey) as Map<EntityId, unknown>;
      for (const [e, v] of state.components[key] ?? []) store.set(e, cloneData(v));
    }
  }
}
