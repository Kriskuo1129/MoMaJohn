# 《台灣夜市摸麻將》V2 工作報告

更新時間：2026-08-21（Asia/Taipei）

## 1. 修改檔案

- `index.html`：HUD 資訊階級與玩家可見「點數」用語。
- `style.css`：HUD、1x／2x／3x／4x／6x 棋盤氣氛、一般／特殊事件、單局結算及手機版樣式。
- `game-config.js`：新點數規則、事件分類／內容／權重與特殊成就設定。
- `game.js`：原始點數模型、局末倍率、事件 handler、成就、統計、重開與單局結算。
- `README.md`：更新至 V2 架構與執行說明。
- `EVENTS_BETS_SCORING.md`：建立可供團隊討論的完整數值表。
- `RELEASE_NOTES_V2.md`：建立玩家版更新說明。
- `TECHNICAL_FUNCTIONAL_SPEC_20260821_113846.md`：建立帶時間戳的 V2 規格新檔；舊規格未覆寫。
- `WORK_REPORT.md`：本報告。

## 2. 新的本局點數資料流

正式連線、牌型、天聽、海底撈月及一般事件先進入 `round.rawPoints`。此值允許為負，局內只更新 HUD 的「本局點數」與「目前結算」，不直接改變 `game.score`。

局末資料流：

`rawPoints → rawPoints × finalMultiplier → 加入總點數 → 獨立結算下注 → 最終總點數`

總點數仍以 0 為下限。

## 3. 倍率套用時機

倍率只在 `settleRoundPoints()` 執行一次。連線及牌型取得時不再預乘，避免個別獎勵乘一次、局末再乘一次的 double multiplier 問題。

HUD 的「目前結算」只是 `rawPoints × finalMultiplier` 預覽，不會提前加入總點數。

## 4. 下注與倍率分離

`settleBets()` 在倍率點數加入總點數後才執行。下注成功獎勵與失敗代價皆直接改變總點數，不乘槓桿，並由 `betsSettled` 保證每局只處理一次。停電及整場結束事件也會走相同局末流程。

## 5. 事件分類

- `NORMAL`：只處理本局原始點數，Modal 以綠／紅結果字區分正負。
- `SPECIAL`：處理次數、倍率、棋盤或流程，使用獨立標記、紫色邊框與光暈。

所有事件均直接執行；選擇型 `CHOICE`、options、`EVENT_CHOICE` 與「老闆說要不要賭一把？」已移除。「好運連線」亦已移除。

## 6. 事件清單與 Weight

一般事件：老闆今天心情很好 16、老闆算錯錢 12、老闆偷偷放水 7、夜市廣播抽中你 7、神秘紅包 10、老闆請你喝飲料 14、神秘大獎 7、口袋發現上次的點數 8、手滑掉進水溝 16、老闆抓到你偷看 9、隔壁小屁孩哭著求你給他點數 13、小偷來了 9。

特殊事件：隔壁攤不玩了 6、免費再來一次 9、夜市神明保佑 5、命運逆轉 2、老闆突然加碼 3、隔壁高手來亂 7、不揪被抓到 6、隔壁瓦斯桶爆炸 1、故意不小心 4、停電 4、五條誤 5、偷天換日 5、隔壁棒球攤的球飛過來 4。

完整效果表見 `EVENTS_BETS_SCORING.md`。

## 7. Weight 實際比例

- 正面：106／189，56.1%
- 負面：65／189，34.4%
- 中性：18／189，9.5%

符合約 55%／35%／10% 的目標。

## 8. Effect handlers

新增：

- `DOUBLE_FINAL_MULTIPLIER`
- `SWAP_DRAWN_TILE`
- `RESTART_ROUND`

調整：

- `ADD_SCORE`、`SUB_SCORE`、`RANDOM_SCORE` 改變本局原始點數。
- `HALVE_ROUND_SCORE` 只減半目前原始點數。
- `ADD_ROUNDS` 與補牌加次數均限制「剩餘次數」最高為 6。
- `END_ROUND`、`END_GAME` 都先完成正常單局結算。

移除：

- `DOUBLE_NEXT_LINE`
- `DOUBLE_FUTURE_LINES`
- 僅供 CHOICE 使用的選項執行流程

## 9. 天聽與海底撈月

- 天聽：`updateWaitingLines()` 發現有效 5/6 且正式摸牌序號不超過 5 時，以 achievement ID `early-waiting` 發放一次 +5。
- 海底撈月：`scoreLines()` 在第 15 張（依模式正式 hand size）產生新線，且該線為本局第一條時，以 `last-tile-first-line` 發放一次 +5。

兩者均加入原始點數並受局末倍率影響；achievement Set 防止重複。

## 10. 此局重來

棒球攤事件先回復被重開局的有效連線、成就、聽牌成果及該局事件造成的次數變化，再建立新的 board／hand／remaining。新的 round 保留原倍率、下注、`attemptStart` 與已消耗次數，因此不會重新扣除遊玩次數。舊局原始點數和所有局內效果作廢；實際已觸發的事件類別統計保留。

## 11. 老闆突然加碼

事件將 `finalMultiplier` 乘 2 並以 6 為上限：1→2、2→4、3→6。它作用於整局最終原始點數，且事件完成時立即更新 HUD 與棋盤 class。

## 12. ROUND END 結算流程

1. 鎖定 `ROUND_END`。
2. 原始點數乘最終倍率並加入總點數。
3. 額外下注獨立結算。
4. 記錄最高單局與倍率統計。
5. 顯示原始點數、倍率算式、倍率結果、下注結果與本局最終變化。
6. 以約 0.9 秒 count 動畫顯示總點數變化。
7. 玩家主動按下一局或查看最終成績。

## 13. UI／Responsive

- 本局點數改為 HUD 最大數字，總點數為第二層，並同列倍率與目前結算。
- 棋盤依有效倍率套用：2x 金、3x 紅橘、4x 紫、6x 強紫。
- 一般／特殊事件 Modal 分流，但避免整張 Modal 使用高飽和紅綠色。
- 單局結算 Modal 中段可捲動，footer 操作按鈕保持可見。
- 375×667 下結算卡實測約高 640px、底部 654px；「下一局」按鈕底部約 638px，未超出 667px viewport。

## 14. 完成的測試

- `node --check game.js`：通過。
- `node --check game-config.js`：通過。
- `git diff --check`：通過，無空白錯誤。
- 靜態搜尋：未發現殘留 `CHOICE`、`EVENT_CHOICE`、`DOUBLE_NEXT_LINE`、`DOUBLE_FUTURE_LINES`。
- 權重程式計算：正 106、負 65、中性 18，合計 189。
- 桌面瀏覽器完整執行狂歡模式一局，共摸 16 張。
- 選擇 2x 後，局內原始 +10 時確認總點數仍為 0、HUD 預估為 +20。
- 進入補牌三選並選滿 3 張；補牌未中時不增加正式牌、線或點數。
- 單局結算確認 `+10 × 2 = +20`，結算後總點數由 0 動畫更新為 20。
- 375×667 手機 viewport 檢查 HUD、棋盤語意內容與單局結算按鈕可見。
- 瀏覽器 console error／warning：0。

## 15. 已知限制

- 事件採 weighted random；本輪人工互動未強制觸發每一個低機率特殊事件。相關 handler、狀態回復與權重已完成靜態逐項檢查。
- Unicode 麻將牌實際字形仍取決於作業系統字型，但專案保留中文 label／ARIA 文字，且沒有新增圖片 fallback。
- 總點數接近 0 時，負值倍率結算會依規格停在 0；單局結果仍顯示原始理論倍率損益，實際總點數變化則受 0 下限保護。

## 16. V2 增量修正：倍率光效、聽牌下注與事件牌識別

- 倍率光效：光效由原本較薄的外框提升為主要遊戲容器與棋盤雙層 glow，加入環境色 radial gradient、強化邊框、內外陰影與約 2.35～3.2 秒的低頻呼吸動畫。1x 維持原貌；2x 為金黃暖光；3x 為強度更高的橘紅 On Fire；4x 為紫色高倍率光；6x 為範圍、亮度與呼吸強度均高於 4x 的強紫光。HUD 倍率文字同步套用對應色彩。既有 `updateHUD()` 會在最終倍率改變時立即切換 class，因此老闆加碼後可直接由 3x 紅橘切換為 6x 強紫。
- 我要聽牌：條件與 `everWaited` 判定不變，reward 由 +10 改為 **+5 點**，penalty 維持 **-5 點**；最大風險仍為 5 點、局末獨立結算且不乘倍率。
- 事件牌識別：`event-1` 的 label／glyph 改為「事件 A／A」，`event-2` 改為「事件 B／B」。牌面保留同一紫色事件牌風格，以黃、藍 accent 區分大型 A／B；tile ID、牌數、事件池、Weight 與觸發流程均未改變。
- 事件 Modal：修改幅度很小，因此已在揭曉前後的 kicker 保留「事件 A」或「事件 B」來源標記，不影響實際抽取事件。
- 測試：JavaScript 語法與 `git diff --check` 通過；文件中未發現舊的聽牌下注 +10。瀏覽器實測 1x class 無動畫與陰影、2x 使用 `board-gold-glow` 雙層金光、3x 使用 `board-fire-glow` 紅橘環境光；4x／6x 對應 class 與 CSS 強度已靜態核對，6x 的外部 glow 範圍與亮度均高於 4x。375×667 實測 `scrollWidth` 與 `clientWidth` 同為 360，沒有水平溢位；事件 A／B 各一張且字面完整落在牌格內。實際第 14 張抽到事件 B 時，Modal 顯示「事件 B・特殊事件」，事件仍由原 weighted pool 抽出「夜市神明保佑」。下注 Modal 實測顯示「成功 +5｜失敗 -5」與門檻 5 點。

## 17. V2 增量修正：HUD、補牌與最終成績

1. HUD 重新排版：頂部改為三欄結構，左側玩家名稱／模式、中間大型本局點數、右側較小的總點數。欄位使用 `minmax()`、`min-width: 0`、ellipsis 與 tabular numbers，避免長名稱及窄畫面疊圖。
2. 移除重複資訊：頂部不再顯示倍率、目前結算及遊玩次數；倍率仍由下注狀態按鈕與棋盤光效呈現。本局狀態按鈕移到下方功能列。
3. 局數操作列：新增 `draw-rounds`，摸牌列固定為「局數 X / Y｜摸牌｜剩餘 N 張」，資料仍由原本的 `attemptDisplay()` 產生，未改動倍率消耗規則。
4. 本局點數顯示：HUD 使用 `rawPoints × finalMultiplier`，所以玩家直接看到倍率後即時結果；內部 `rawPoints` 仍只累積基礎值。
5. 避免重複倍率：`addRoundPoints()` 與 `rawPoints` 完全未改，`settleRoundPoints()` 仍只在 ROUND END 乘一次。此次只修改 `updateHUD()` 的 render 值。
6. 加碼即時刷新：事件執行後既有流程會呼叫 `updateHUD()`；當 `finalMultiplier` 從 3 變 6 時，本局顯示值立即重算並播放短暫 `score-refresh`，棋盤 class 同步由紅橘切換強紫。
7. 補牌提早成功：每次選牌後立即判斷該牌是否位於 `bonusMissing`。第一或第二張命中時立刻停用所有未選牌、標示命中牌、播放成功 glow，並直接進入既有 `resolveBonusDraw()`；只有三張均未命中才判定失敗。`bonusResolved` 仍防止重複加局。
8. ROUND END：玩家畫面不再顯示 rawPoints、乘法公式或倍率前點數，只呈現倍率後「本局點數」、可選的「下注損益」、「本局最終變化」與總點數動畫。
9. GAME OVER 頂部：固定呈現獎盃、玩家名稱與巨大最終點數，移除 `NIGHT MARKET RESULT`、「某某的成績單」及最終總點數標題。
10. 最終統計：總成績只保留連線數、總局數、單局最高點數、補牌成功／嘗試／成功率；牌型成就保留；事件與下注區只保留各自總損益。詳細 stats 仍留在內部供平衡使用。
11. 手機 Responsive：375px 寬度使用三欄 HUD 與三欄摸牌列，左右資訊縮小但不換行，中央摸牌按鈕維持至少 56px 高；GAME OVER 統計改單欄並保持 Modal footer 可操作。
12. 測試：JavaScript 語法與 `git diff --check` 通過。瀏覽器以 12 字元名稱及 375px viewport 實測，HUD 三欄無交疊、頁面 `scrollWidth` 與 `clientWidth` 同為 360；摸牌列依序顯示「局數 1 / 6、摸牌、剩餘 16 張」。3x 局內取得基礎 +5 時 HUD 顯示 +15，證實畫面採倍率後值。完整遊玩兩局後，單局結算未出現原始點數與乘法公式；GAME OVER 只顯示獎盃、玩家名稱、巨大最終點數、四項總成績、牌型成就及兩項損益。補牌實際走過三張未中流程；第一／第二張提早命中分支以程式路徑核對：每次選牌立即比對 `bonusMissing`，命中當下先停用所有按鈕，再由 `bonusResolved` 保證只結算及加局一次。430px 規則與短 viewport 亦完成 computed layout 檢查。
