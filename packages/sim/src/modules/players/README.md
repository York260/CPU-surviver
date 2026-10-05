# players 玩家

**責任：** 玩家的加入、離開與移動輸入。把「指令」轉成實體與意圖。

| 項目 | 內容 |
|---|---|
| 指令 | `join`、`move`、`leave` |
| 事件 | `PlayerJoined`、`PlayerLeft` |
| 寫 | `PlayerControl`、`Position`、`MoveIntent`、`Speed`、`Collider`、`Faction`、`Traits`、`Renderable` |
| 資源 | `map` |
| 系統 | `players`（structural） |

## 規則
- 同一個 `playerId` 重複加入會被忽略。
- 出生點依加入順序輪流使用地圖的出生點。
- 名字由 `sanitizeName` 整理：最長 16 字，空的用預設名。
- 玩家身上的差異只用標籤表達（現在只有 `hands`），其他系統只讀標籤。
