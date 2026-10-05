/**
 * 型別登記處。
 *
 * 核心不知道有哪些元件、事件、指令、資源。各模組用 TypeScript 的
 * 「模組擴充」（declare module）把自己的型別加進來，例如：
 *
 *   declare module '../../core/registry' {
 *     interface ComponentTypes { Position: { x: number; y: number } }
 *   }
 *
 * 這樣核心保持通用，模組之間也不必互相 import 內部檔案。
 */

/** 元件：純資料，掛在實體上。 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ComponentTypes {}

/** 事件：系統用來通知「發生了什麼事」。 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EventTypes {}

/** 指令：外部改變遊戲狀態的唯一方式。 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CommandTypes {}

/** 資源：整個世界只有一份的資料，例如地圖。 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ResourceTypes {}

export type ComponentKey = keyof ComponentTypes & string;
export type EventKey = keyof EventTypes & string;
export type CommandKind = keyof CommandTypes & string;
export type ResourceKey = keyof ResourceTypes & string;
