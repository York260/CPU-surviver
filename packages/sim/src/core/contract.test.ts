import { describe, expect, it } from 'vitest';
import { Simulation, type GameModule } from './simulation';
import { ContractError, type System } from './system';

declare module './registry' {
  interface ComponentTypes {
    TestA: { n: number };
    TestB: { n: number };
  }
  interface EventTypes {
    TestPing: { from: string };
  }
}

function sim(...systems: System[]): Simulation {
  const m: GameModule = {
    id: 't',
    systems,
    setup: () => {},
  };
  return new Simulation({ seed: 's', modules: [m] });
}

describe('系統合約', () => {
  it('寫入未宣告的元件會丟出 ContractError', () => {
    const s = sim({ name: 'bad', reads: ['TestA'], run: (ctx) => ctx.write('TestA') });
    expect(() => s.step()).toThrow(ContractError);
  });

  it('只宣告讀取，就不能寫入', () => {
    const s = sim({ name: 'bad', reads: ['TestA'], run: (ctx) => ctx.write('TestA').set(1, { n: 1 }) });
    expect(() => s.step()).toThrow(/寫入元件 TestA/);
  });

  it('讀取未宣告的元件會失敗', () => {
    const s = sim({ name: 'bad', run: (ctx) => ctx.read('TestB') });
    expect(() => s.step()).toThrow(/讀取元件 TestB/);
  });

  it('沒有 structural 就不能建立實體', () => {
    const s = sim({ name: 'bad', run: (ctx) => ctx.spawn() });
    expect(() => s.step()).toThrow(/建立實體/);
  });

  it('未宣告就不能發出或接收事件', () => {
    expect(() => sim({ name: 'a', run: (c) => c.emit('TestPing', { from: 'a' }) }).step()).toThrow(/發出事件/);
    expect(() => sim({ name: 'b', run: (c) => c.events('TestPing') }).step()).toThrow(/接收事件/);
  });

  it('錯誤訊息會指出是哪個系統', () => {
    const s = sim({ name: 'nosy', run: (ctx) => ctx.read('TestA') });
    expect(() => s.step()).toThrow(/\[nosy\]/);
  });
});

describe('事件延遲一個 Tick', () => {
  it('同一個 Tick 發出的事件，要到下一個 Tick 才讀得到，與系統順序無關', () => {
    const seen: number[] = [];
    const sender: System = {
      name: 'sender',
      emits: ['TestPing'],
      run: (ctx) => ctx.emit('TestPing', { from: 'sender' }),
    };
    const listener: System = {
      name: 'listener',
      listens: ['TestPing'],
      run: (ctx) => seen.push(ctx.events('TestPing').length),
    };
    // 兩種排列順序，結果必須一樣
    for (const order of [[sender, listener], [listener, sender]]) {
      seen.length = 0;
      const s = new Simulation({ seed: 's', modules: [{ id: 'm', systems: order }] });
      s.step();
      s.step();
      s.step();
      expect(seen).toEqual([0, 1, 1]);
    }
  });
});

describe('排程檢查', () => {
  it('排程漏掉系統會直接報錯', () => {
    const sys: System = { name: 'x', run: () => {} };
    expect(
      () => new Simulation({ seed: 's', modules: [{ id: 'm', systems: [sys] }], schedule: [] }),
    ).toThrow(/漏掉/);
  });

  it('系統名稱重複會報錯', () => {
    const sys: System = { name: 'x', run: () => {} };
    expect(() => new Simulation({ seed: 's', modules: [{ id: 'm', systems: [sys, sys] }] })).toThrow(/重複/);
  });

  it('關閉的系統不會執行', () => {
    let runs = 0;
    const sys: System = { name: 'x', run: () => void runs++ };
    const s = new Simulation({ seed: 's', modules: [{ id: 'm', systems: [sys] }], disabled: ['x'] });
    s.step();
    expect(runs).toBe(0);
    s.setSystemEnabled('x', true);
    s.step();
    expect(runs).toBe(1);
  });
});
