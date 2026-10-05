# M00 核心

**責任：** 世界（實體與元件）、系統排程、固定 Tick、命名亂數流、事件匯流排與事件紀錄、序列化與狀態雜湊。

**不負責：** 任何玩法。核心不知道有「玩家」或「蟲」，只提供讓模組組合起來的骨架。

## 重要規則
- **型別登記處**（`registry.ts`）：元件、事件、指令、資源的型別，由各模組用 `declare module` 加進來，核心不寫死。
- **系統合約**（`system.ts`）：系統必須宣告 `reads / writes / emits / listens / commands / resources / structural`。執行時存取未宣告的東西，會丟出 `ContractError`，並指出是哪個系統。
- **事件延遲一個 Tick**：這個 Tick 發出的事件，下個 Tick 才讀得到，所以系統排列順序不會影響事件傳遞。
- **指令排序**：同一個 Tick 的指令依 `(playerId, seq)` 排序，所以網路送達順序不影響結果。
- **可重現**：只認 Tick、不讀現實時間；亂數一律用 `ctx.rng("名稱")`，每個名稱是獨立的流。
- **資源不進存檔**：地圖之類由內容檔重建。`setup` 只能設定資源，不能建立實體（否則讀檔會重複建立）。

## 公開 API
`Simulation`（`step`、`serialize`、`load`、`hash`、`setSystemEnabled`、`inspect`）、`makeCommand`、`RngRegistry`、`stableStringify`、`hashString`。

## 測試
`contract.test.ts`、`rng.test.ts`，以及 `tests/scenarios/determinism.test.ts`。
