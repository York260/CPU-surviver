import type { GameModule } from '../../core/simulation';

/** 地圖上的區域（單位：格）。id 對應主題檔裡的名稱。 */
export interface Zone {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TileMap {
  id: string;
  width: number;
  height: number;
  tileSize: number;
  /** 長度為 width * height；1 表示不可通行。 */
  solid: number[];
  zones: Zone[];
  /** 玩家出生點（單位：像素）。 */
  spawns: { x: number; y: number }[];
}

declare module '../../core/registry' {
  interface ResourceTypes {
    map: TileMap;
  }
}

/** 地圖外一律視為牆。 */
export function isSolidTile(map: TileMap, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return true;
  return map.solid[ty * map.width + tx] === 1;
}

/** 回傳某個像素位置所在的區域 id；不在任何區域時回傳 undefined。 */
export function zoneAt(map: TileMap, px: number, py: number): string | undefined {
  const tx = Math.floor(px / map.tileSize);
  const ty = Math.floor(py / map.tileSize);
  return map.zones.find((z) => tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h)?.id;
}

export function mapModule(map: TileMap): GameModule {
  validateMap(map);
  return {
    id: 'm01-map',
    setup(world) {
      world.setResource('map', map);
    },
  };
}

export function validateMap(map: TileMap): void {
  if (map.solid.length !== map.width * map.height) {
    throw new Error(`地圖 ${map.id}：solid 長度應為 ${map.width * map.height}，實際是 ${map.solid.length}`);
  }
  if (map.spawns.length === 0) throw new Error(`地圖 ${map.id}：至少需要一個出生點`);
  for (const s of map.spawns) {
    if (isSolidTile(map, Math.floor(s.x / map.tileSize), Math.floor(s.y / map.tileSize))) {
      throw new Error(`地圖 ${map.id}：出生點 (${s.x}, ${s.y}) 在牆裡`);
    }
  }
}
