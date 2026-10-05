import type { GameModule } from '../../core/simulation';
import type { System } from '../../core/system';
import { isSolidTile, type TileMap } from '../m01-map';
import '../common';

/** 想往哪裡走。x、y 介於 -1 到 1，長度不超過 1。 */
export interface MoveIntent {
  x: number;
  y: number;
}

/** 移動速度（像素／秒）。 */
export interface Speed {
  value: number;
}

/** 碰撞箱：以中心為準的正方形，half 是半邊長（像素）。 */
export interface Collider {
  half: number;
}

declare module '../../core/registry' {
  interface ComponentTypes {
    MoveIntent: MoveIntent;
    Speed: Speed;
    Collider: Collider;
  }
}

const EPS = 0.001;

/** 把輸入整理成合法的移動意圖：每軸夾在 [-1, 1]，長度超過 1 就正規化。 */
export function sanitizeIntent(x: number, y: number): MoveIntent {
  const cx = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
  const cy = Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0;
  const len = Math.sqrt(cx * cx + cy * cy);
  if (len > 1) return { x: cx / len, y: cy / len };
  return { x: cx, y: cy };
}

/**
 * 沿單一軸移動碰撞箱，撞到牆就貼齊牆面。
 * 前提：每次位移小於一格，所以只需要檢查前緣那一排格子，不會穿牆。
 */
function moveAxis(map: TileMap, pos: { x: number; y: number }, half: number, delta: number, axis: 'x' | 'y'): void {
  if (delta === 0) return;
  const ts = map.tileSize;
  if (Math.abs(delta) >= ts) throw new Error(`moveAxis：單次位移 ${delta} 超過一格（${ts}），會穿牆`);
  const other = axis === 'x' ? 'y' : 'x';
  const next = pos[axis] + delta;
  const lead = delta > 0 ? next + half : next - half;
  const leadTile = Math.floor(lead / ts);
  const from = Math.floor((pos[other] - half + EPS) / ts);
  const to = Math.floor((pos[other] + half - EPS) / ts);
  let blocked = false;
  for (let t = from; t <= to; t++) {
    const solid = axis === 'x' ? isSolidTile(map, leadTile, t) : isSolidTile(map, t, leadTile);
    if (solid) {
      blocked = true;
      break;
    }
  }
  if (!blocked) {
    pos[axis] = next;
  } else if (delta > 0) {
    // 往正方向撞牆：移動到剛好貼著牆的位置（已經超過就不動）
    pos[axis] = Math.max(pos[axis], leadTile * ts - half - EPS);
  } else {
    pos[axis] = Math.min(pos[axis], (leadTile + 1) * ts + half + EPS);
  }
}

/** 先走 x 再走 y，這樣貼著牆斜走時會沿牆滑動。 */
export function moveBox(
  map: TileMap,
  pos: { x: number; y: number },
  half: number,
  dx: number,
  dy: number,
): void {
  moveAxis(map, pos, half, dx, 'x');
  moveAxis(map, pos, half, dy, 'y');
}

export const movementSystem: System = {
  name: 'movement',
  reads: ['MoveIntent', 'Speed', 'Collider'],
  writes: ['Position'],
  resources: ['map'],
  run(ctx) {
    const map = ctx.resource('map');
    const intents = ctx.read('MoveIntent');
    const speeds = ctx.read('Speed');
    const colliders = ctx.read('Collider');
    const positions = ctx.write('Position');
    for (const e of ctx.query('Position', 'MoveIntent', 'Speed', 'Collider')) {
      const intent = intents.get(e)!;
      if (intent.x === 0 && intent.y === 0) continue;
      const step = speeds.get(e)!.value * ctx.dt;
      const pos = positions.get(e)!;
      moveBox(map, pos, colliders.get(e)!.half, intent.x * step, intent.y * step);
    }
  },
};

export function movementModule(): GameModule {
  return { id: 'm02-movement', systems: [movementSystem] };
}
