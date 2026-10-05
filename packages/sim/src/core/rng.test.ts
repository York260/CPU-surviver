import { describe, expect, it } from 'vitest';
import { RngRegistry } from './rng';

describe('命名亂數流', () => {
  it('同樣的種子和名稱，產生同樣的序列', () => {
    const a = new RngRegistry('seed-1').stream('spawning');
    const b = new RngRegistry('seed-1').stream('spawning');
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
  });

  it('不同名稱的流互相獨立：多抽一條流，不影響另一條', () => {
    const r1 = new RngRegistry('seed-1');
    const r2 = new RngRegistry('seed-1');
    for (let i = 0; i < 50; i++) r1.stream('abilities').next();
    expect(r1.stream('spawning').next()).toBe(r2.stream('spawning').next());
  });

  it('不同種子，序列不同', () => {
    expect(new RngRegistry('a').stream('x').next()).not.toBe(new RegistryHelper('b').next());
  });

  it('int 的範圍包含兩端，且不會超出', () => {
    const rng = new RngRegistry('range').stream('x');
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rng.int(1, 4);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(4);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });

  it('序列化後再讀回來，會接著原本的位置繼續', () => {
    const r1 = new RngRegistry('save');
    const s = r1.stream('x');
    for (let i = 0; i < 7; i++) s.next();
    const saved = r1.serialize();
    const expected = [s.next(), s.next(), s.next()];
    const r2 = new RngRegistry('save');
    r2.load(saved);
    const t = r2.stream('x');
    expect([t.next(), t.next(), t.next()]).toEqual(expected);
  });
});

class RegistryHelper {
  private s;
  constructor(seed: string) {
    this.s = new RngRegistry(seed).stream('x');
  }
  next() {
    return this.s.next();
  }
}
