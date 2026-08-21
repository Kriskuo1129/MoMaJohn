# 《台灣夜市摸麻將》V2 技術與功能規格

- 文件版本：V2
- 建立時間：2026-08-21 11:38:46（Asia/Taipei）
- 實作型態：純前端 HTML / CSS / JavaScript，無框架、無後端、無圖片素材

## 1. 系統組成

| 檔案 | 責任 |
|---|---|
| `index.html` | 畫面結構、HUD、棋盤、操作列與共用 Modal 容器 |
| `style.css` | Responsive 排版、牌面、倍率光效、事件與結算動畫 |
| `game-config.js` | `SCORE_CONFIG`、`EVENT_DEFINITIONS`、`BET_DEFINITIONS` |
| `game.js` | 牌組、回合狀態、判定、事件 handler、結算、統計與渲染 |

程式以 `TILE_DATA` 保持 36 張牌的唯一 ID，普通牌使用 Unicode Mahjong Tile 字元；特殊牌使用文字與 CSS 呈現。

標準模式的 `event-1` 與 `event-2` 在盤面分別顯示「事件 A」與「事件 B」，以獨立 tile ID 維持唯一性，但兩者仍呼叫同一個 weighted event pool。事件 Modal 的 kicker 會保留觸發來源標記。

## 2. 核心遊戲流程

1. 主選單設定玩家、模式後建立遊戲。
2. 每局選擇 1x／2x／3x 槓桿與可選額外下注。
3. 首次正式摸牌時扣除對應遊玩次數。
4. 建立隨機 6×6 棋盤、15 張正式手牌及其餘牌。
5. 逐張摸牌，更新正式取得集合、盤面、連線、聽牌與成就。
6. 事件牌直接抽取 weighted random 事件並執行。
7. 正式牌結束後，若仍聽牌則經 `BONUS_PENDING` 提示進入補牌三選；否則結束該局。
8. `ROUND_END` 依「原始點數 → 倍率 → 額外下注」結算。
9. 顯示獨立單局結果；玩家繼續下一局，或在無剩餘次數時進入 `GAME_OVER`。

主要狀態包含 `READY`、`DRAWING`、`EVENT_REVEAL`、`BONUS_PENDING`、`BONUS_DRAW`、`ROUND_END`、`GAME_OVER`。`busy` 與 `uiOverlayOpen` 額外避免快速連點、Modal 重疊及重複結算。

## 3. 點數資料模型

每局維護：

- `rawPoints`：所有局內點數效果的原始淨值，可為負數。
- `roundMultiplier`：玩家開局選擇的 1／2／3 倍率。
- `finalMultiplier`：實際局末倍率；特殊事件可改為 2／4／6。
- `multipliedPoints`：`rawPoints × finalMultiplier`。
- `betDelta`：額外下注的獨立結算值。
- `finalRoundDelta`：倍率點數與下注合計後，實際對總點數造成的變化。

局內所有正式連線、牌型、特殊成就及一般事件點數只呼叫原始點數累加流程，不立即修改總點數。局末才將 `rawPoints × finalMultiplier` 加入總點數，之後再結算下注。總點數以 0 為下限。

HUD 即時顯示：

- 本局點數：`rawPoints × finalMultiplier`（僅顯示公式改變，內部資料不預乘）
- 總點數：已完成局的累積結果

倍率不在頂部 HUD 重複顯示，由下注狀態按鈕與棋盤光效表現。局數使用既有 `attemptDisplay()` 移至摸牌操作列。

## 4. 點數規則

### 4.1 正式連線

共 14 條：6 橫、6 直、2 斜。每條由固定 line ID 管理，`completedLines` 防止重複領點。

- 同局第一條：+10 原始點
- 同局第二條：+20 原始點
- 同局第三條及之後：每條 +30 原始點

### 4.2 收集牌型

- 萬／筒／條各自計算：第 5 張 +5、第 7 張再 +4、第 9 張再 +6。
- 四風（東南西北）：+5。
- 三元（中發白）：+5。
- 梅蘭：+3。

各門檻與成就每局只發放一次。

### 4.3 特殊成就

- 天聽：正式摸牌前 5 張內首次形成任何 5/6 聽牌，+5；以正式摸牌序號判斷，每局一次。
- 海底撈月：第 15 張正式牌完成本局第一條正式連線，+5；若先前已有連線則不成立。

## 5. 倍率與下注

1x、2x、3x 分別消耗相應遊玩次數。倍率只在局末套用一次，不對個別點數項目即時相乘。

「老闆突然加碼」將整局 `finalMultiplier` 乘 2，結果限定為 2x、4x 或 6x，並立即更新 HUD 與棋盤光效。

額外下注：

| ID | 條件 | 成功 | 失敗 |
|---|---|---:|---:|
| `believe-guoju` | 七張字牌全取得 | +30 | -30 |
| `one-line` | 至少 1 線 | +15 | -10 |
| `waiting` | 曾形成 5/6 | +5 | -5 |
| `three-lines` | 至少 3 線 | +50 | -20 |

選擇下注前檢查總點數能否承擔所選項目的最大損失總和。下注於倍率結算後執行且不乘倍率，每局只結算一次。

## 6. 事件架構

`EVENT_DEFINITIONS` 的核心欄位：

- `id`、`title`、`story`
- `category`：`NORMAL` 或 `SPECIAL`
- `sentiment`：`POSITIVE`、`NEGATIVE`、`NEUTRAL`
- `effectType`、`value`
- `weight`、`displayEffect`、`enabled`

抽取時只納入 `enabled` 事件，再以通用 weighted random 依 `weight` 選擇。所有事件直接執行，不使用 `CHOICE` 或 options。

### 6.1 分類與 UI

- 一般事件：只處理點數；結果正值使用綠色、負值使用紅色，Modal 保持簡潔。
- 特殊事件：處理次數、倍率、棋盤或流程；Modal 加上特殊標記、紫色邊框與柔和光暈。

### 6.2 Effect handlers

- 點數：`ADD_SCORE`、`SUB_SCORE`、`RANDOM_SCORE`、`HALVE_ROUND_SCORE`
- 次數：`ADD_ROUNDS`、`SUB_ROUNDS`
- 倍率：`DOUBLE_FINAL_MULTIPLIER`
- 棋盤：`REPLACE_DRAWN_TILE`、`REMOVE_DRAWN_TILE`、`SWAP_DRAWN_TILE`
- 流程：`END_ROUND`、`END_GAME`、`RESTART_ROUND`

`DOUBLE_NEXT_LINE`、`DOUBLE_FUTURE_LINES` 與選擇型事件流程已移除。

### 6.3 特殊行為

- 偷天換日：從已正式取得與尚未取得的普通牌各取一張交換狀態；特殊牌不列入。交換後重新判定線、牌型與聽牌，但歷史已發點數不倒扣，已完成 line ID 不重複領取。
- 棒球攤重開：回復該局有效成果與事件造成的次數變化，建立全新牌序；保留倍率、下注及已消耗次數，不再次收取成本。實際觸發過的事件統計保留。
- 停電：直接進入正常局末結算。
- 瓦斯桶爆炸：完成當局倍率與下注結算後進入 GAME OVER。

完整事件及權重表見 `EVENTS_BETS_SCORING.md`。目前權重為正面 106／56.1%、負面 65／34.4%、中性 18／9.5%。

## 7. 聽牌與補牌

每次普通正式牌狀態變更後，重新檢查 14 條線。線上已有 5 個正式取得牌且缺 1 個時，加入 `activeWaiting`，缺牌 ID 加入 `bonusMissing`。一般聽牌 toast 以已公告 line ID 防止重複。

第 15 張完成後若仍有有效聽牌：

1. 進入 `BONUS_PENDING`，鎖定遊戲操作。
2. 再次高亮有效聽牌線與缺牌格，顯示最終聽牌確認。
3. 提示結束後只進入一次 `BONUS_DRAW`。
4. 顯示剩餘牌背，由玩家選滿 3 張。
5. 每次選牌立即比對 `bonusMissing`；第一或第二張命中時立即鎖定其他牌並成功，不必選滿三張。只有三張皆未命中才失敗。成功 +1 次，每局最多一次。

補牌不修改正式 drawn、連線、牌型、點數或中央棋盤狀態，抽到事件牌也不觸發事件。

## 8. 單局結算

`ROUND_END` 順序固定：

1. 凍結本局原始點數與最終倍率。
2. 計算並套用倍率點數。
3. 結算各額外下注。
4. 計算本局最終變化與總點數（最低 0）。
5. Modal 只向玩家顯示倍率後本局點數、下注損益（若有）、最終變化與總點數，不顯示內部 rawPoints 或乘法公式。
6. 使用 count-up／count-down 呈現結算前後總點數。

提前結束本局或整場也共用相同流程，避免漏算或重複算下注。

## 9. 統計

成績單記錄包括：總連線、成就、事件原始點數 gain/loss、一般／特殊事件數、正／負／中性事件數、天聽、海底撈月、最高本局原始點數、最高本局結算點數、最高倍率、加碼、重開與偷天換日次數，以及下注成功／失敗與淨結果。

## 10. Responsive 與視覺

- 桌面：HUD 與主棋盤在主要 viewport 內保持可見，操作區維持緊湊。
- 手機：在 375×667 等短 viewport 中縮減 HUD 間距與字級，但保留本局點數最高視覺層級；Modal 主體可捲動，操作按鈕不超出畫面。
- 1x 無特殊光效；2x 使用金黃環境光、3x 使用更強烈的紅橘 On Fire 氣氛、4x 使用紫色高倍率光效、6x 使用範圍與亮度更高的強紫光。光效同時作用於主要遊戲容器與棋盤，並以 CSS 外框、漸層、陰影與低頻呼吸動畫完成，不使用圖片。

## 11. 維護原則

- 數值與事件資料優先放在 `game-config.js`，避免散落於 UI handler。
- 新事件優先沿用既有 `effectType`；只有新效果才新增 handler。
- 所有得點必須經過原始點數入口，總點數只在局末倍率結算與獨立下注結算時改變。
- 所有局末入口應保持冪等，避免快速連點造成重複結算。
- 玩家可見內容一律使用繁體中文與「點數」用語。
