/**
 * 命名亂數流。
 *
 * 每個模組向登記處要一條自己名字的亂數流，例如 rng.stream('spawning')。
 * 每條流的初始狀態由「局種子 + 流名稱」決定，彼此獨立：
 * 在 A 模組多抽一次亂數，不會改變 B 模組抽到的結果。
 */

export type RngState = [number, number, number, number];

/** 把字串雜湊成四個 32 位元整數（cyrb128）。 */
export function hash128(str: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** 一條亂數流（sfc32 演算法），狀態可以序列化。 */
export class Rng {
  private s: RngState;

  constructor(state: RngState) {
    this.s = [...state];
  }

  /** 回傳 [0, 1) 之間的浮點數。 */
  next(): number {
    let [a, b, c, d] = this.s;
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    this.s = [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
    return (t >>> 0) / 4294967296;
  }

  /** 回傳 [min, max] 之間的整數（含兩端）。 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** 從陣列中挑一個。 */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick：陣列是空的');
    return items[this.int(0, items.length - 1)] as T;
  }

  getState(): RngState {
    return [...this.s];
  }
}

/** 管理一局之中所有命名亂數流。 */
export class RngRegistry {
  private streams = new Map<string, Rng>();

  constructor(private readonly seed: string) {}

  stream(name: string): Rng {
    let rng = this.streams.get(name);
    if (!rng) {
      const state = hash128(`${this.seed}:${name}`);
      // 先空轉幾次，讓相近的種子拉開差距
      rng = new Rng(state);
      for (let i = 0; i < 12; i++) rng.next();
      this.streams.set(name, rng);
    }
    return rng;
  }

  serialize(): Record<string, RngState> {
    const out: Record<string, RngState> = {};
    for (const name of [...this.streams.keys()].sort()) {
      out[name] = (this.streams.get(name) as Rng).getState();
    }
    return out;
  }

  load(states: Record<string, RngState>): void {
    this.streams.clear();
    for (const name of Object.keys(states).sort()) {
      this.streams.set(name, new Rng(states[name] as RngState));
    }
  }
}
