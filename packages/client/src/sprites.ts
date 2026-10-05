/**
 * 佔位美術：用程式畫出來的像素小人和地磚。正式美術到位後，只要換掉這個檔案。
 * 每個字母代表一種顏色。
 */
const STUDENT = [
  '..HHHHHH..',
  '.HHHHHHHH.',
  '.HSSSSSSH.',
  '.HSESSESH.',
  '..SSSSSS..',
  '...BBBB...',
  '..BBBBBB..',
  '.SBBBBBBS.',
  '.SBBBBBBS.',
  '..BBBBBB..',
  '..LL..LL..',
  '..LL..LL..',
  '..LL..LL..',
];

/** 四位玩家的制服顏色，一眼分得出誰是誰。 */
export const PLAYER_COLORS = ['#3b82c4', '#d9a441', '#4aa66a', '#c25b8a'];

export function studentCanvas(bodyColor: string): HTMLCanvasElement {
  const palette: Record<string, string> = { H: '#2b2118', S: '#e8c39e', E: '#1a1a1a', B: bodyColor, L: '#1d2a44' };
  const c = document.createElement('canvas');
  c.width = STUDENT[0]!.length;
  c.height = STUDENT.length;
  const ctx = c.getContext('2d')!;
  STUDENT.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  });
  return c;
}

/** 影子：腳底下一個扁橢圓。 */
export function shadowCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 10;
  c.height = 4;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(2, 0, 6, 4);
  ctx.fillRect(1, 1, 8, 2);
  return c;
}

/** 區域地板的底色，只是為了在灰盒階段分辨每個區域。 */
export const ZONE_FLOOR: Record<string, string> = {
  dorm: '#3a3f55',
  hall: '#4a3f3a',
  range: '#3f4a4a',
  admin: '#45455a',
  gym: '#3f4f45',
  library: '#4d4538',
  shrine: '#5a4630',
  plaza: '#2f3a30',
};
export const DEFAULT_FLOOR = '#2a3038';
export const WALL_COLOR = '#161b26';
export const WALL_TOP = '#232b3b';
