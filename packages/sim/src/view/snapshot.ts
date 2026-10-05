import type { Simulation } from '../core/simulation';
import type { EntityId } from '../core/types';
import type { World } from '../core/world';
import '../modules/common';
import '../modules/players';

/** 畫面需要知道的一個實體。客戶端只靠這些資料繪圖。 */
export interface EntityView {
  id: EntityId;
  sprite: string;
  x: number;
  y: number;
  /** 由哪位玩家控制（如果有的話）。 */
  playerId?: string;
  name?: string;
}

export interface Snapshot {
  tick: number;
  entities: EntityView[];
}

/**
 * 可見性規則：決定某位玩家看不看得到某個實體。
 * 例如之後「每位玩家的異能線索只送給本人」就寫成一條規則。
 */
export type VisibilityRule = (world: World, entity: EntityId, viewerId: string) => boolean;

/**
 * 建立某位玩家看到的畫面快照。
 * 本機模式和連線模式都走這同一條路，客戶端永遠不直接讀世界。
 */
export function buildSnapshot(sim: Simulation, viewerId: string, rules: VisibilityRule[] = []): Snapshot {
  const world = sim.world;
  const entities: EntityView[] = [];
  for (const e of world.query('Position', 'Renderable')) {
    if (!rules.every((rule) => rule(world, e, viewerId))) continue;
    const pos = world.get(e, 'Position')!;
    const view: EntityView = { id: e, sprite: world.get(e, 'Renderable')!.sprite, x: pos.x, y: pos.y };
    const pc = world.get(e, 'PlayerControl');
    if (pc) {
      view.playerId = pc.playerId;
      view.name = pc.name;
    }
    entities.push(view);
  }
  return { tick: sim.tick, entities };
}
