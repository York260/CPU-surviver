import { expect, test, type Page } from '@playwright/test';

interface Hook {
  session: { frame(): { curr: { tick: number; entities: { x: number; y: number; playerId?: string }[] } }; localPlayerId: string };
}
const hook = (page: Page) =>
  page.evaluate(() => {
    const h = (window as unknown as { __cpu: Hook }).__cpu;
    const me = h.session.frame().curr.entities.find((e) => e.playerId === h.session.localPlayerId);
    return { tick: h.session.frame().curr.tick, x: me?.x ?? NaN, y: me?.y ?? NaN };
  });

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  (page as unknown as { errors: string[] }).errors = errors;
  await page.goto('/?seed=e2e&name=測試員');
  await page.waitForFunction(() => (window as unknown as { __cpu?: unknown }).__cpu !== undefined);
});

test.afterEach(async ({ page }) => {
  expect((page as unknown as { errors: string[] }).errors).toEqual([]);
});

test('頁面載入後，有畫面、角色和時間在走', async ({ page }) => {
  await expect(page.locator('#game canvas')).toBeVisible();
  const a = await hook(page);
  expect(a.x).not.toBeNaN();
  await page.waitForTimeout(600);
  const b = await hook(page);
  expect(b.tick).toBeGreaterThan(a.tick);
  await page.screenshot({ path: 'test-results/shot-start.png' });
});

test('按住 D 角色會往右走，放開就停下', async ({ page }) => {
  const start = await hook(page);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(200);
  const moved = await hook(page);
  expect(moved.x).toBeGreaterThan(start.x + 25);
  expect(Math.abs(moved.y - start.y)).toBeLessThan(1);
  await page.waitForTimeout(400);
  const stopped = await hook(page);
  expect(stopped.x).toBe(moved.x);
  await page.screenshot({ path: 'test-results/shot-moved.png' });
});

test('方向鍵也能移動', async ({ page }) => {
  const s = await hook(page);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowDown');
  const e = await hook(page);
  expect(e.y).toBeGreaterThan(s.y + 15);
});

test('按 ` 開啟除錯面板，可以暫停和匯出重播', async ({ page }) => {
  await expect(page.locator('#debug')).toBeHidden();
  await page.keyboard.press('Backquote');
  await expect(page.locator('#debug')).toBeVisible();
  await expect(page.locator('#debug')).toContainText('movement');
  await page.locator('[data-act="pause"]').click();
  const t1 = await hook(page);
  await page.waitForTimeout(400);
  const t2 = await hook(page);
  expect(t2.tick).toBe(t1.tick);
  const download = page.waitForEvent('download');
  await page.locator('[data-act="export"]').click();
  expect((await download).suggestedFilename()).toMatch(/^replay-e2e-t\d+\.json$/);
  await page.screenshot({ path: 'test-results/shot-debug.png' });
});

test('在除錯面板關掉移動系統，角色就走不動', async ({ page }) => {
  await page.keyboard.press('Backquote');
  await page.locator('input[data-sys="movement"]').uncheck();
  const s = await hook(page);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  const e = await hook(page);
  expect(e.x).toBe(s.x);
});

test.describe('高解析度螢幕（縮放 200%）', () => {
  test.use({ deviceScaleFactor: 2, viewport: { width: 1024, height: 640 } });

  test('畫布用實際像素繪製，鏡頭是整數倍，文字不會被拉糊', async ({ page }) => {
    const info = await page.evaluate(() => {
      const c = document.querySelector('#game canvas') as HTMLCanvasElement;
      const g = (window as unknown as { __cpu: { game: { scene: { getScene(k: string): { cameras: { main: { zoom: number } } } } } } }).__cpu.game;
      return {
        backing: [c.width, c.height],
        css: [c.clientWidth, c.clientHeight],
        dpr: window.devicePixelRatio,
        zoom: g.scene.getScene('game').cameras.main.zoom,
      };
    });
    expect(info.backing[0]).toBe(Math.round(info.css[0]! * info.dpr));
    expect(info.backing[1]).toBe(Math.round(info.css[1]! * info.dpr));
    expect(Number.isInteger(info.zoom)).toBe(true);
    expect(info.zoom).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: 'test-results/shot-hidpi.png' });
  });

  test('改變視窗大小後，畫布和鏡頭會跟著調整', async ({ page }) => {
    const before = await page.evaluate(() => (document.querySelector('#game canvas') as HTMLCanvasElement).width);
    await page.setViewportSize({ width: 600, height: 400 });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => (document.querySelector('#game canvas') as HTMLCanvasElement).width);
    expect(after).toBeLessThan(before);
    expect(after).toBe(1200);
  });
});
