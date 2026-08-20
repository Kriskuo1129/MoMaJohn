# 台灣夜市摸麻將

不使用框架、圖片或後端的一頁式瀏覽器遊戲。標準模式每局摸 15 張並包含兩張「事件」牌；狂歡模式使用梅、蘭花牌，每局摸 16 張且不觸發事件。兩種模式皆支援槓桿倍率與額外下注。

模式選擇前必須輸入最多 12 個字元的玩家名稱。名稱會 trim 前後空白並保存在瀏覽器 `localStorage` 的 `momajohnPlayerName`，重新整理後會自動帶入；「再玩一次」與返回主選單也會保留名稱。

## 執行

直接以現代瀏覽器開啟 `index.html`，或在本目錄啟動靜態伺服器：

```bash
python -m http.server 8000
```

再開啟 `http://localhost:8000`。

## 主要檔案

- `index.html`：頁面與 Modal 結構。
- `style.css`：桌面、手機、牌面及動畫。
- `game-config.js`：分數、事件及下注內容設定。
- `game.js`：狀態機與遊戲規則執行。
- `TECHNICAL_FUNCTIONAL_SPEC.md`：完整技術規格。

## 基本規則

- 6×6 棋盤，每張牌唯一；正式牌由單一牌堆依序摸出。
- 連線依本局順序為 +10、+20、第三條起每條 +30。
- 萬、筒、條依該局最高級距計分：5 張 5、7 張 9、9 張 15，不疊加；途中升級只補差額。
- 四風 +5、三元 +5；狂歡模式梅蘭齊聚 +3。
- 槓桿 1x～3x 影響連線與牌型得分，並消耗相同遊玩次數。
- 主按鈕「下注」會開啟設定視窗；倍率是其中一個子項，額外下注可複選。
- 每項下注必須有足夠總分承擔 `penalty`；多選時會合計最大可能損失。全部在局末依最後盤面結算，不受倍率影響。
- 遊玩次數以 `目前 / 總授予` 顯示，例如獲得一次後可由 `2 / 6` 變為 `2 / 7`。
- 事件直接加扣分以 ±1～±5 為主，正式連線與牌型仍是核心得分來源。

## 自訂事件

一般新增事件只需修改 `game-config.js` 的 `EVENT_DEFINITIONS`。`enabled: false` 會停用事件；`weight` 越大越容易抽中。顯示機率會以所有已啟用事件的 weight 總和自動計算。

### DIRECT 範例

```js
{
  id: "my-direct-event",
  title: "老闆送點數",
  story: "老闆今天特別大方。",
  triggerType: "DIRECT",
  effectType: "ADD_SCORE",
  value: 5,
  weight: 10,
  displayEffect: "+5 分",
  enabled: true
}
```

DIRECT 事件揭曉後立刻執行效果。

### CHOICE 範例

```js
{
  id: "my-choice-event",
  title: "要不要收下？",
  story: "老闆遞出一個神秘紅包。",
  triggerType: "CHOICE",
  effectType: "NONE",
  value: null,
  weight: 5,
  displayEffect: "由玩家選擇",
  enabled: true,
  options: [
    { label: "收下", effectType: "ADD_SCORE", value: 3, displayEffect: "+3 分" },
    { label: "不要", effectType: "NONE", value: null, displayEffect: "無事發生" }
  ]
}
```

CHOICE 事件會先顯示故事，再由玩家選擇 option；每個 option 使用相同的 effect handler。

目前可用的 `effectType`：`ADD_SCORE`、`SUB_SCORE`、`ADD_ROUNDS`、`SUB_ROUNDS`、`DOUBLE_NEXT_LINE`、`DOUBLE_FUTURE_LINES`、`HALVE_ROUND_SCORE`、`END_ROUND`、`END_GAME`、`RANDOM_SCORE`、`REPLACE_DRAWN_TILE`、`REMOVE_DRAWN_TILE`、`NONE`。

只要使用上述既有效果，就不必修改 `game.js`。只有新增全新的效果類型時，才需要在 `EVENT_EFFECT_HANDLERS` 增加 handler。
