/** 實體就是一個數字 ID。 */
export type EntityId = number;

/** 邏輯層每秒執行的 Tick 數。 */
export const TICK_RATE = 20;

/** 每個 Tick 代表的秒數。 */
export const DT = 1 / TICK_RATE;
