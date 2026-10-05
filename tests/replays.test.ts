import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportReplay, parseReplay, runReplay } from '@cpu/tools';
import { cmd, newGame } from './helpers';

const dir = resolve(import.meta.dirname, 'replays');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('黃金重播', () => {
  it('至少有一份黃金重播', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file}：最終狀態雜湊沒有改變`, () => {
      const replay = parseReplay(readFileSync(resolve(dir, file), 'utf-8'));
      expect(runReplay(replay).hash(), `${replay.description}\n若這次改變是預期中的，請執行 npm run replay:update 並在提交訊息說明原因`).toBe(
        replay.finalHash,
      );
    });
  }

  it('黃金重播真的偵測得到改變：關掉移動系統，雜湊就不同', () => {
    const replay = parseReplay(readFileSync(resolve(dir, files[0]!), 'utf-8'));
    const sim = newGame(replay.seed, ['movement']);
    for (let t = 0; t < replay.ticks; t++) sim.step(replay.commands.filter((c) => c.tick === t));
    expect(sim.hash()).not.toBe(replay.finalHash);
  });
});

describe('匯出重播（遇到 bug 時用）', () => {
  it('匯出的重播檔，重新跑一遍會得到完全相同的狀態', () => {
    const sim = newGame('export-test');
    sim.step([cmd('a', 'join', { name: 'A' }), cmd('b', 'join', { name: 'B' })]);
    sim.step([cmd('a', 'move', { x: 1, y: 0 })]);
    for (let i = 0; i < 100; i++) sim.step();
    sim.step([cmd('b', 'move', { x: 0, y: 1 })]);
    for (let i = 0; i < 100; i++) sim.step();

    const exported = exportReplay(sim, '測試匯出');
    const roundTripped = JSON.parse(JSON.stringify(exported));
    expect(runReplay(roundTripped).hash()).toBe(exported.finalHash);
  });
});
