import { cloneData } from './hash';
import type { EventKey, EventTypes } from './registry';

export interface GameEvent<K extends EventKey = EventKey> {
  tick: number;
  type: K;
  data: EventTypes[K];
}

/**
 * 事件匯流排。
 *
 * 規則：這個 Tick 發出的事件，下一個 Tick 才會被其他系統讀到。
 * 這樣系統之間的事件傳遞不受排程順序影響，模組可以放心調整順序。
 *
 * 所有事件同時寫進事件紀錄（log），供倖存報告、群心演化、平衡分析使用。
 */
export class EventBus {
  private current: GameEvent[] = [];
  private previous: GameEvent[] = [];
  private readonly history: GameEvent[] = [];

  emit<K extends EventKey>(tick: number, type: K, data: EventTypes[K]): void {
    const ev = { tick, type, data } as GameEvent;
    this.current.push(ev);
    this.history.push(ev);
  }

  /** 讀取上一個 Tick 發出的某種事件。 */
  read<K extends EventKey>(type: K): GameEvent<K>[] {
    return this.previous.filter((e) => e.type === type) as GameEvent<K>[];
  }

  /** 在每個 Tick 結束時呼叫。 */
  endTick(): void {
    this.previous = this.current;
    this.current = [];
  }

  /** 完整事件紀錄（唯讀）。 */
  log(): readonly GameEvent[] {
    return this.history;
  }

  /** 最近 n 筆事件（除錯面板用）。 */
  recent(n: number): readonly GameEvent[] {
    return this.history.slice(-n);
  }

  serialize(): { previous: GameEvent[]; history: GameEvent[] } {
    return { previous: cloneData(this.previous), history: cloneData(this.history) };
  }

  load(state: { previous: GameEvent[]; history: GameEvent[] }): void {
    this.current = [];
    this.previous = cloneData(state.previous);
    this.history.length = 0;
    this.history.push(...cloneData(state.history));
  }
}
