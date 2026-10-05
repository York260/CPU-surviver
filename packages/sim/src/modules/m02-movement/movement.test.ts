import { describe, expect, it } from 'vitest';
import type { TileMap } from '../m01-map';
import { moveBox, sanitizeIntent } from './movement';

/** 5x5 的小地圖：外圈是牆，中間 (2,2) 有一根柱子。 */
function smallMap(): TileMap {
  const solid = new Array<number>(25).fill(0);
  for (let i = 0; i < 5; i++) {
    solid[i] = 1;
    solid[20 + i] = 1;
    solid[i * 5] = 1;
    solid[i * 5 + 4] = 1;
  }
  solid[2 * 5 + 2] = 1;
  return { id: 't', width: 5, height: 5, tileSize: 16, solid, zones: [], spawns: [{ x: 24, y: 24 }] };
}

describe('移動與碰撞', () => {
  it('空地上照常移動', () => {
    const pos = { x: 24, y: 24 };
    moveBox(smallMap(), pos, 5, 3, 0);
    expect(pos.x).toBeCloseTo(27);
  });

  it('撞牆會貼齊牆面，不會穿過去', () => {
    const pos = { x: 24, y: 24 };
    for (let i = 0; i < 50; i++) moveBox(smallMap(), pos, 5, -4, 0);
    // 左邊牆在 x = 16，碰撞箱半邊長 5
    expect(pos.x).toBeGreaterThanOrEqual(21);
    expect(pos.x).toBeLessThan(21.1);
  });

  it('貼著牆斜走時會沿牆滑動', () => {
    const pos = { x: 21.01, y: 24 };
    moveBox(smallMap(), pos, 5, -4, 3);
    expect(pos.x).toBeGreaterThanOrEqual(21);
    expect(pos.y).toBeGreaterThan(24);
  });

  it('不會穿過中間的柱子', () => {
    const pos = { x: 24, y: 40 };
    // 柱子佔 x 32..48、y 32..48；從左邊往右撞
    for (let i = 0; i < 20; i++) moveBox(smallMap(), pos, 5, 4, 0);
    expect(pos.x + 5).toBeLessThanOrEqual(32);
  });

  it('單次位移超過一格會丟出錯誤，而不是悄悄穿牆', () => {
    expect(() => moveBox(smallMap(), { x: 24, y: 24 }, 5, 20, 0)).toThrow();
  });
});

describe('移動意圖的整理', () => {
  it('超出範圍的值會被夾住', () => {
    expect(sanitizeIntent(5, 0)).toEqual({ x: 1, y: 0 });
  });

  it('斜向移動會正規化，不會比直走快', () => {
    const v = sanitizeIntent(1, 1);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });

  it('NaN 和無限大會被當成 0', () => {
    expect(sanitizeIntent(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({ x: 0, y: 0 });
  });
});
