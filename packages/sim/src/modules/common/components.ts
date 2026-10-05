/**
 * 共用元件：很多模組都會用到的基本資料。
 * 差異一律用標籤（Traits）表達，系統只讀標籤，不寫「如果是某種角色就怎樣」的特例。
 */

export interface Position {
  x: number;
  y: number;
}

export type Side = 'human' | 'hive';

export interface Faction {
  side: Side;
}

export interface Traits {
  tags: string[];
}

/** 要畫在畫面上的東西。sprite 是外觀代號，由客戶端決定怎麼畫。 */
export interface Renderable {
  sprite: string;
}

declare module '../../core/registry' {
  interface ComponentTypes {
    Position: Position;
    Faction: Faction;
    Traits: Traits;
    Renderable: Renderable;
  }
}

export function hasTag(traits: Readonly<Traits> | undefined, tag: string): boolean {
  return !!traits && traits.tags.includes(tag);
}
