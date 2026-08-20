# 台灣夜市摸麻將：技術與功能說明

## 1. 專案與檔案責任

本專案是純前端一頁式遊戲，不需要建置工具、套件或後端。牌面使用 Unicode 麻將符號並提供中文 fallback。

模式選擇畫面要求玩家輸入名稱：接受中文、英文與數字，trim 前後空白，最長 12 個字元，空白時顯示「請先輸入玩家名稱」且不能開始。名稱保存在 `localStorage.momajohnPlayerName`，並存於整場 `game.playerName`；HUD 與 GAME OVER 成績單皆顯示名稱。「再玩一次」保留名稱和模式，回主選單保留名稱欄內容。

| 檔案 | 用途 |
|---|---|
| `index.html` | 棋盤、HUD、模式選擇、補牌與共用 Modal |
| `style.css` | 桌面／手機排版、牌面、事件、下注與動畫 |
| `game-config.js` | `SCORE_CONFIG`、`EVENT_DEFINITIONS`、`BET_DEFINITIONS` |
| `game.js` | 狀態、摸牌、判定、事件 handler、下注結算與統計 |
| `README.md` | 執行及自訂事件教學 |

`game-config.js` 必須在 `game.js` 前載入。內容與數值放在 config，流程與 effect handler 放在 `game.js`。

## 2. 模式與牌組

- 標準模式：34 張普通麻將＋事件牌 A／B，共 36 張；正式摸 15 張，剩餘 21 張補牌。
- 狂歡模式：34 張普通麻將＋梅／蘭，共 36 張；正式摸 16 張，剩餘 20 張補牌，不抽事件。
- 三門花色稱萬子、筒子、條子。條子的 internal ID 為相容既有邏輯保留 `suo-1`～`suo-9`。
- 事件牌 internal ID 為 `event-1`、`event-2`，外觀與名稱都顯示「事件」。

棋盤、手牌與補牌來源使用同一組 36 張唯一牌；棋盤事件只改 `drawn` 取得狀態，不修改牌資料或建立重複牌。

## 3. 狀態機與每局資料

狀態包含 `MODE_SELECT`、`READY`、`DRAWING`、`EVENT_CHOICE`、`EVENT_REVEAL`、`BONUS_PENDING`、`BONUS_DRAW`、`ROUND_END`、`GAME_OVER`。`busy` 與 `uiOverlayOpen` 阻止快速連點和 overlay 期間操作。

`createRound()` 固定 `board`、`hand`、`remaining`，並建立 `drawn`、`discarded`、`completedLines`、`activeWaiting`、`announcedWaiting`、`achievements`、倍率、補牌、`activeBets`、`betsSettled`、`everWaited` 等狀態。

## 4. 新計分系統

數值集中於 `SCORE_CONFIG`。

- 正式連線共 14 條：單局第一條 +10、第二條 +20、第三條及之後每條 +30。
- 公式：`基本分 × roundMultiplier × lineMultiplier × nextLineDouble`。
- 萬／筒／條依該局最高級距計算總獎勵：5 張 5、7 張 9、9 張 15，級距不疊加。
- 即時升級採差額計分：5 張先加 5；7 張只再加 `9-5=4`；9 張只再加 `15-9=6`。差額先算基本值再乘 `roundMultiplier`，因此 3x 時依序為 +15、+12、+18。
- 四風 +5、三元 +5；狂歡模式梅＋蘭 +3，皆乘 `roundMultiplier`。
- 標準模式不建立梅蘭進度，也隱藏側欄、手機規則與成績單中的梅蘭資訊。
- 牌型 milestone 每局只計分一次並乘 `roundMultiplier`。
- `addScore()` 確保總分最低為 0；事件與下注直接分數不乘倍率。

事件直接 `ADD_SCORE`、`SUB_SCORE`、`RANDOM_SCORE` 控制在 ±5 內，一般事件使用 ±1～±3、較強事件使用 ±4～±5。高影響事件優先透過加減次數、連線倍率、盤面替換／移除或提前結束表現，確保正式連線與牌型是主要得分來源。

`completedLines` 是已計分歷史。棋盤事件破壞連線後不刪除，因此同一條線重新補齊不會再次領分；已取得的成就分也不倒扣。

## 5. 遊玩次數 1/N

- `totalAttemptsGranted`：總授予次數，初始 6；補牌或事件加次只增加此值。
- `attemptsConsumed`：已消耗次數，只會向前增加。
- `round.attemptStart`：本局開始位置，供進行中維持 1-based 顯示。

HUD 初始 `1 / 6`；一次結束後下一局 `2 / 6`；若獲得一次則為 `2 / 7`。3x 消耗三次，本局顯示起始位置，下一局分子向前跳三。完整結束本局後，`attemptsConsumed >= totalAttemptsGranted` 才 GAME OVER。

## 6. 聽牌與補牌

未完成連線有 5/6 正式取得時形成聽牌。`activeWaiting` 保存有效線，`announcedWaiting` 防止相同線重複 toast，`everWaited` 記錄本局是否曾聽牌供下注判定。

一般摸牌後，`updateWaitingLines()` 先保存 `previousWaitingIds`，再重算 `currentWaitingIds`。只有 `currentWaitingIds - previousWaitingIds` 且尚未存在於 `announcedWaiting` 的 `newWaitingLines` 才播放一般聽牌高亮與 toast；持續維持 5/6 的線不會重播。完成 6/6 的線會在正式連線計分後離開 `activeWaiting`，不再播放聽牌效果。

`BONUS_PENDING` 是獨立的最終確認流程，直接依結束時的完整 `activeWaiting` 使用 `final-waiting-hit`／`final-waiting-gap` 再次高亮，不受一般 `newWaitingLines` 或 `announcedWaiting` 防重複規則限制。

正式牌結束後若仍聽牌，先進入 `BONUS_PENDING`，再從 `remaining` 的 20／21 張選三張。命中任何缺牌會讓 `totalAttemptsGranted` +1。補牌不加入 `drawn`、不觸發事件、不計算正式連線或成就。

補牌牌背、普通牌與事件牌都保留同一個 `.bonus-tile` button 容器，桌面與手機統一使用 `aspect-ratio: 3 / 4`。`revealButton()` 只切換容器內的內容與 revealed 狀態，不再移除 `.bonus-tile` class；grid 欄寬、列高及其他牌的位置不因翻牌改變。Unicode 符號及中文字／事件 fallback 限制在容器約 90% 內並保持置中。

## 7. 單一事件系統

標準模式兩張事件牌共用 `EVENT_DEFINITIONS`。事件至少包含 `id`、`title`、`story`、`triggerType`、`weight`、`effectType`、`value`、`displayEffect`、`enabled`；CHOICE 另有 `options`。

- `DIRECT`：揭曉故事後立即呼叫 handler。
- `CHOICE`：揭曉後顯示 options，玩家選擇後呼叫 option 的 handler。
- `enabled: false` 不參與抽取或機率計算。
- 機率：`event.weight ÷ 所有 enabled event weight 總和 × 100%`。

`EVENT_EFFECT_HANDLERS` 支援：`ADD_SCORE`、`SUB_SCORE`、`ADD_ROUNDS`、`SUB_ROUNDS`、`DOUBLE_NEXT_LINE`、`DOUBLE_FUTURE_LINES`、`HALVE_ROUND_SCORE`、`END_ROUND`、`END_GAME`、`RANDOM_SCORE`、`REPLACE_DRAWN_TILE`、`REMOVE_DRAWN_TILE`、`NONE`。流程不以 event ID 寫特殊分支。

### 五條誤

`REPLACE_DRAWN_TILE` 檢查五條（`suo-5`）是否正式取得。沒有則顯示「五條根本還沒出現」；有則從尚未取得的一條至九條隨機選一張，對 `drawn` 執行 delete/add，讓五條熄滅、新條子亮起。牌組和棋盤陣列不變。完成後重新判定連線、成就與聽牌，歷史得分不倒扣。

### 故意不小心

`REMOVE_DRAWN_TILE` 從已正式取得的普通麻將（排除事件牌）隨機選一張，從 `drawn` 移除並更新棋盤及聽牌。已計分連線、成就及 `completedLines` 不清除。

## 8. 槓桿與下注

主介面只有「下注」入口。大型下注 Modal 內的「本局倍率」是子項目，單選 1x／2x／3x；「額外下注」可複選。設定儲存在 `round.roundMultiplier` 與 `round.activeBets`。第一張牌前可修改，`round.started` 後按鈕顯示「下注已鎖定」，HUD 仍顯示倍率與下注數量。

`BET_DEFINITIONS` 包含 `id`、`title`、`description`、`reward`、`penalty`、`conditionType`、`conditionValue`、`enabled`。

| 下注 | 成功條件 | 成功 | 失敗 |
|---|---|---:|---:|
| 相信國聚 | 東南西北中發白全部正式取得 | +30 | -30 |
| 我一定會連！ | 至少 1 條正式連線 | +15 | -10 |
| 我要聽牌 | 本局曾形成一次 5/6 聽牌 | +10 | -5 |
| 豪賭三線 | 至少 3 條正式連線 | +50 | -20 |

下注只在 `ROUND_END` 由 `settleBets()` 結算一次。正常結束、`END_ROUND`、`END_GAME` 都先依當下盤面結算。下注分數不乘倍率，扣分經 `addScore()`。

### 下注資格與最大風險

`betPenalty()` 一律以 `Math.abs(bet.penalty)` 取得單項最大扣分；無論 config 使用正數或負數 penalty 都能正確判定。`selectedBetRisk(activeBetIds)` 合計所有已選下注的 penalty 絕對值。

- 單項 `penalty > game.score` 時該 checkbox disabled，顯示門檻、目前分數及「分數不足」。
- 每次勾選即重新計算 `selectedBetRisk`；若加入該項會讓總風險超過 `game.score`，該組合不允許成立。
- Modal 即時顯示目前分數、最大可能損失、下注後最低可能剩餘。
- 倍率只受剩餘遊玩次數限制，不計入分數風險。
- 資格只在第一張牌前判定；下注鎖定後，事件途中扣分不取消既有下注。局末仍經 `addScore()`，因此總分最低為 0。

## 9. HUD、Modal 與 Responsive UI

HUD 顯示玩家名稱、模式、總分、本局分數、遊玩次數、倍率與下注數量；六顆局數燈號已移除。手機 HUD 分為玩家／模式、超大總分、次要資訊三層，總分使用約 29～37px responsive 字級，明顯大於本局、次數、倍率和下注。標準模式顯示「事件一覽」，狂歡模式隱藏。

共用 Modal 分為固定 `modal-header`、可捲動 `modal-scroll-content`、固定 `modal-footer`。手機最大高度使用 `94dvh`，中段設 `overflow-y: auto; min-height: 0`，因此成績單很長時「再玩一次」與「回主選單」仍可操作，body 不跟著內容捲動。

Toast 系統接受獨立 `type` 與 `duration`。正式連線、聽牌及一般狀態維持約 1.5 秒；萬／筒／條 milestone、四風、三元與梅蘭等由 `awardOnce()` 產生的 achievement toast 使用約 2.5 秒。toast 仍垂直堆疊，容器限制最大可視高度以避免超出 viewport。

桌面版在 `min-width: 760px` 使用獨立緊湊規則：縮減 body、側欄、卡片、按鈕、棋盤與摸牌區的 padding／gap／字級；棋盤寬度以 `calc((100dvh - 230px) * .78)` 約束，為摸牌區和安全間距預留垂直空間。目標是在 1920×1080 與 1366×768、瀏覽器 100% zoom 時讓 HUD、棋盤、摸牌區及主要按鈕同畫面可見，不影響 759px 以下手機尺寸。

## 10. 統計與成績單

`game.stats` 仍即時維護完整資料，但 GAME OVER 僅顯示四區：總成績、牌型成就、聽牌與補牌、事件／下注總損益。標題由 `game.playerName` 產生「{玩家名稱}的成績單」，空值 fallback 為「玩家的成績單」。

淨損益使用 `formatSignedScore()` 統一顯示正數 `+N`、零 `0`、負數 `-N`：

- `eventNetProfit = eventScoreGain - eventScoreLoss`
- `betNetProfit = betScoreGain - betScoreLoss`

下注統計記錄規則原始 reward／penalty，而非 `addScore()` 因總分最低 0 所截斷的實際變化，因此負損益仍是真實值。

`game.stats` 即時維護：

- 牌型：`wan5/7/9Count`、`tong5/7/9Count`、`tiao5/7/9Count`、四風、三元、梅蘭。
- 事件：`eventTriggeredCount`、`directEventCount`、`choiceEventCount`、事件分數、加次與提前結束。
- 棋盤事件：`boardReplaceEventCount`、`boardRemoveEventCount`。
- 下注：`betsPlaced`、`betsWon`、`betsLost`、`betScoreGain`、`betScoreLoss`，及每個 bet ID 的 `played/won/lost`。
- 既有倍率、連線、成就、聽牌、補牌和最高單局統計。

牌型區只有狂歡模式顯示梅蘭齊聚次數。原始事件、下注及倍率細項保留在 stats 供邏輯使用，但不在精簡成績單展開。

## 11. 維護與驗證

- 新增使用既有 effectType 的事件只改 `game-config.js`；新 effectType 才擴充 `EVENT_EFFECT_HANDLERS`。
- 新增使用既有 conditionType 的下注只改 config；新 conditionType 才擴充 `betConditionMet()`。
- 棋盤事件測試需確認牌 ID 唯一、歷史 `completedLines` 不清除、得分不倒扣。
- 目標裝置應實測 Unicode 字型、iPhone Safari 動態工具列、Android 直立 Modal 捲動與快速連點鎖定。
