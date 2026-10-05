import { describe, expect, it } from 'vitest';
import { cmd, newGame, posOf } from '../helpers';

/** 一段固定的操作：兩個人加入，各往不同方向走一陣子，中途換方向。 */
function play(sim: ReturnType<typeof newGame>) {
  sim.step([cmd('a', 'join', { name: '小明' }), cmd('b', 'join', { name: '小華' })]);
  sim.step([cmd('a', 'move', { x: 1, y: 0 }), cmd('b', 'move', { x: -1, y: 1 })]);
  for (let i = 0; i < 80; i++) sim.step();
  sim.step([cmd('a', 'move', { x: 0, y: -1 }), cmd('b', 'move', { x: 1, y: 0 })]);
  for (let i = 0; i < 80; i++) sim.step();
}

describe('可重現性', () => {
  it('同樣的種子和同樣的操作，狀態雜湊完全相同', () => {
    const a = newGame('seed-A');
    const b = newGame('seed-A');
    play(a);
    play(b);
    expect(a.hash()).toBe(b.hash());
  });

  it('同一個 Tick 裡，指令送達的順序不影響結果', () => {
    const a = newGame();
    const b = newGame();
    a.step([cmd('a', 'join', { name: 'A' }), cmd('b', 'join', { name: 'B' })]);
    b.step([cmd('b', 'join', { name: 'B' }), cmd('a', 'join', { name: 'A' })]);
    expect(a.hash()).toBe(b.hash());
  });

  it('不同的操作，結果不同（雜湊真的有在反映狀態）', () => {
    const a = newGame();
    const b = newGame();
    play(a);
    play(b);
    b.step([cmd('a', 'move', { x: 1, y: 1 })]);
    for (let i = 0; i < 5; i++) b.step();
    expect(a.hash()).not.toBe(b.hash());
  });
});

describe('存檔與讀檔', () => {
  it('讀檔後繼續玩，和一路玩下來的結果完全一樣', () => {
    const straight = newGame();
    play(straight);
    straight.step([cmd('a', 'move', { x: 0, y: 1 })]);
    for (let i = 0; i < 40; i++) straight.step();

    const first = newGame();
    play(first);
    const saved = JSON.parse(JSON.stringify(first.serialize()));
    const resumed = newGame();
    resumed.load(saved);
    resumed.step([cmd('a', 'move', { x: 0, y: 1 })]);
    for (let i = 0; i < 40; i++) resumed.step();

    expect(resumed.hash()).toBe(straight.hash());
  });

  it('讀檔不會讓實體變多（setup 不會重複建立東西）', () => {
    const sim = newGame();
    play(sim);
    const count = sim.world.entityCount();
    const other = newGame();
    other.load(JSON.parse(JSON.stringify(sim.serialize())));
    expect(other.world.entityCount()).toBe(count);
  });

  it('種子不同的存檔不能讀', () => {
    const a = newGame('A');
    const b = newGame('B');
    expect(() => b.load(a.serialize())).toThrow(/種子/);
  });
});

describe('玩家移動', () => {
  it('持續按著方向，角色會往那個方向走', () => {
    const sim = newGame();
    sim.step([cmd('a', 'join', { name: 'A' })]);
    const start = posOf(sim, 'a');
    sim.step([cmd('a', 'move', { x: 1, y: 0 })]);
    for (let i = 0; i < 20; i++) sim.step();
    expect(posOf(sim, 'a').x).toBeGreaterThan(start.x + 40);
  });

  it('放開按鍵（送出 0, 0），角色就停下來', () => {
    const sim = newGame();
    sim.step([cmd('a', 'join', { name: 'A' })]);
    sim.step([cmd('a', 'move', { x: 1, y: 0 })]);
    for (let i = 0; i < 10; i++) sim.step();
    sim.step([cmd('a', 'move', { x: 0, y: 0 })]);
    const stopped = posOf(sim, 'a');
    for (let i = 0; i < 10; i++) sim.step();
    expect(posOf(sim, 'a')).toEqual(stopped);
  });

  it('一直往同一個方向走，不會走出地圖或穿牆', () => {
    const sim = newGame();
    sim.step([cmd('a', 'join', { name: 'A' })]);
    const map = sim.world.getResource('map');
    for (const dir of [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }]) {
      sim.step([cmd('a', 'move', dir)]);
      for (let i = 0; i < 400; i++) sim.step();
      const p = posOf(sim, 'a');
      expect(p.x).toBeGreaterThan(0);
      expect(p.y).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(map.width * map.tileSize);
      expect(p.y).toBeLessThan(map.height * map.tileSize);
    }
  });

  it('玩家離開之後，實體被移除', () => {
    const sim = newGame();
    sim.step([cmd('a', 'join', { name: 'A' })]);
    sim.step([cmd('a', 'leave', {})]);
    expect(sim.world.query('PlayerControl')).toHaveLength(0);
  });

  it('同一個玩家重複加入，不會多出一個角色', () => {
    const sim = newGame();
    sim.step([cmd('a', 'join', { name: 'A' })]);
    sim.step([cmd('a', 'join', { name: 'A' })]);
    expect(sim.world.query('PlayerControl')).toHaveLength(1);
  });

  it('四位玩家出生在不同位置', () => {
    const sim = newGame();
    sim.step(['a', 'b', 'c', 'd'].map((id) => cmd(id, 'join', { name: id })));
    const spots = new Set(['a', 'b', 'c', 'd'].map((id) => JSON.stringify(posOf(sim, id))));
    expect(spots.size).toBe(4);
  });
});
