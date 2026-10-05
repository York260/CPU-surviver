import type { TileMap, Zone } from './map';

/**
 * I0 用的測試地圖：用程式產生的校區灰盒。
 * 配置是虛構的，只大致呈現「建築圍著一片空地」的感覺。I1 會換成 Tiled 畫的地圖。
 */
export function createTestMap(): TileMap {
  const width = 60;
  const height = 40;
  const tileSize = 16;
  const solid = new Array<number>(width * height).fill(0);
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && y >= 0 && x < width && y < height) solid[y * width + x] = v;
  };

  // 外圍圍牆
  for (let x = 0; x < width; x++) {
    set(x, 0, 1);
    set(x, height - 1, 1);
  }
  for (let y = 0; y < height; y++) {
    set(0, y, 1);
    set(width - 1, y, 1);
  }

  type Door = 'top' | 'bottom' | 'left' | 'right';
  const zones: Zone[] = [];
  const building = (id: string, x: number, y: number, w: number, h: number, door: Door) => {
    for (let i = x; i < x + w; i++) {
      set(i, y, 1);
      set(i, y + h - 1, 1);
    }
    for (let j = y; j < y + h; j++) {
      set(x, j, 1);
      set(x + w - 1, j, 1);
    }
    // 兩格寬的門
    const cx = x + Math.floor(w / 2) - 1;
    const cy = y + Math.floor(h / 2) - 1;
    if (door === 'top') [cx, cx + 1].forEach((i) => set(i, y, 0));
    if (door === 'bottom') [cx, cx + 1].forEach((i) => set(i, y + h - 1, 0));
    if (door === 'left') [cy, cy + 1].forEach((j) => set(x, j, 0));
    if (door === 'right') [cy, cy + 1].forEach((j) => set(x + w - 1, j, 0));
    zones.push({ id, x, y, w, h });
  };

  building('dorm', 4, 4, 14, 10, 'bottom');
  building('hall', 24, 4, 14, 9, 'bottom');
  building('range', 44, 4, 8, 13, 'left');
  building('admin', 4, 20, 12, 11, 'right');
  building('gym', 42, 22, 14, 13, 'left');
  building('library', 20, 30, 13, 7, 'top');

  // 土地公廟：小小一間，正面開放（聖域規則在之後的迭代加入）
  for (let i = 36; i < 40; i++) set(i, 32, 1);
  set(36, 33, 1);
  set(39, 33, 1);
  zones.push({ id: 'shrine', x: 36, y: 32, w: 4, h: 3 });

  // 升旗場：中央空地
  zones.push({ id: 'plaza', x: 21, y: 16, w: 18, h: 11 });

  const spawns = [
    { x: 30 * tileSize + 8, y: 21 * tileSize + 8 },
    { x: 32 * tileSize + 8, y: 21 * tileSize + 8 },
    { x: 30 * tileSize + 8, y: 23 * tileSize + 8 },
    { x: 32 * tileSize + 8, y: 23 * tileSize + 8 },
  ];

  return { id: 'test-campus', width, height, tileSize, solid, zones, spawns };
}
