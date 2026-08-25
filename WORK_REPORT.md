# 《台灣夜市摸麻將》（MoMaJohn）工作報告

更新時間：2026-08-22（Asia/Taipei）

## 1. 修改檔案

- `index.html`：HUD 資訊階級與玩家可見「點數」用語。
- `style.css`：HUD、1x／2x／3x／4x／6x 棋盤氣氛、一般／特殊事件、單局結算及手機版樣式。
- `game-config.js`：新點數規則、事件分類／內容／權重與特殊成就設定。
- `game.js`：倍率前數值模型、局末倍率、事件 handler、成就、統計、重開與單局結算。
- `README.md`：更新架構與執行說明。
- `EVENTS_BETS_SCORING.md`：建立可供團隊討論的完整數值表。
- `RELEASE_NOTES.md`：建立玩家版更新說明。
- `TECHNICAL_FUNCTIONAL_SPEC.md`：整合為唯一技術與功能規格；後續不再建立時間戳副本。
- `WORK_REPORT.md`：本報告。

## 2. 新的本局點數資料流

正式連線、牌型、天聽、海底撈月及一般事件先進入 `round.rawPoints`。此值允許為負，HUD 將它乘上有效倍率後顯示為「本局點數」，局內不直接改變 `game.score`。

局末資料流：

`rawPoints → rawPoints × finalMultiplier → 加入總點數 → 獨立結算下注 → 最終總點數`

總點數仍以 0 為下限。

## 3. 倍率套用時機

倍率只在 `settleRoundPoints()` 執行一次。連線及牌型取得時不再預乘，避免個別獎勵乘一次、局末再乘一次的 double multiplier 問題。

HUD 的「目前結算」只是 `rawPoints × finalMultiplier` 預覽，不會提前加入總點數。

## 4. 下注與倍率分離

`settleBets()` 在倍率點數加入總點數後才執行。下注成功獎勵與失敗代價皆直接改變總點數，不乘槓桿，並由 `betsSettled` 保證每局只處理一次。停電及整場結束事件也會走相同局末流程。

## 5. 事件分類

- `NORMAL`：只處理本局倍率前數值，Modal 以綠／紅結果字區分正負。
- `SPECIAL`：處理次數、倍率、棋盤或流程，使用獨立標記、紫色邊框與光暈。

所有事件均直接執行；選擇型 `CHOICE`、options、`EVENT_CHOICE` 與「老闆說要不要賭一把？」已移除。「好運連線」亦已移除。

## 6. 事件清單與 Weight

一般事件：老闆今天心情很好 16、老闆算錯錢 12、老闆偷偷放水 7、夜市廣播抽中你 7、神秘紅包 10、老闆請你喝飲料 14、神秘大獎 7、口袋發現上次的點數 8、手滑掉進水溝 16、老闆抓到你偷看 9、隔壁小屁孩哭著求你給他點數 13、小偷來了 9。

特殊事件：隔壁攤不玩了 6、免費再來一次 9、夜市神明保佑 5、命運逆轉 2、老闆突然加碼 6、隔壁高手來亂 7、不揪被抓到 6、隔壁瓦斯桶爆炸 1、故意不小心 4、停電 4、五條誤 5、偷天換日 5、隔壁棒球攤的球飛過來 4。

完整效果表見 `EVENTS_BETS_SCORING.md`。

## 7. Weight 實際比例

- 正面：109／192，56.8%
- 負面：65／192，33.9%
- 中性：18／192，9.4%

比例依本次唯一的 Weight 調整照實記錄，未修改其他事件權重。

## 8. Effect handlers

新增：

- `DOUBLE_FINAL_MULTIPLIER`
- `SWAP_DRAWN_TILE`
- `RESTART_ROUND`

調整：

- `ADD_SCORE`、`SUB_SCORE`、`RANDOM_SCORE` 改變本局倍率前數值。
- `HALVE_ROUND_SCORE` 只減半目前倍率前數值。
- `ADD_ROUNDS` 與補牌加次數均限制「剩餘次數」最高為 6。
- `END_ROUND`、`END_GAME` 都先完成正常單局結算。

移除：

- `DOUBLE_NEXT_LINE`
- `DOUBLE_FUTURE_LINES`
- 僅供 CHOICE 使用的選項執行流程

## 9. 天聽與海底撈月

- 天聽：`updateWaitingLines()` 發現有效 5/6 且正式摸牌序號不超過 5 時，以 achievement ID `early-waiting` 發放一次 +5。
- 海底撈月：`scoreLines()` 在第 15 張（依模式正式 hand size）產生新線，且該線為本局第一條時，以 `last-tile-first-line` 發放一次 +5。

兩者均加入倍率前數值並受局末倍率影響；achievement Set 防止重複。

## 10. 此局重來

棒球攤事件先回復被重開局的有效連線、成就、聽牌成果及該局事件造成的次數變化，再建立新的 board／hand／remaining。新的 round 保留原倍率、下注、`attemptStart` 與已消耗次數，因此不會重新扣除遊玩次數。舊局倍率前數值和所有局內效果作廢；實際已觸發的事件類別統計保留。

## 11. 老闆突然加碼

事件將 `finalMultiplier` 乘 2 並以 6 為上限：1→2、2→4、3→6。它作用於整局最終倍率前數值，且事件完成時立即更新 HUD 與棋盤 class。

## 12. ROUND END 結算流程

1. 鎖定 `ROUND_END`。
2. 倍率前數值乘最終倍率並加入總點數。
3. 額外下注獨立結算。
4. 記錄最高單局與倍率統計。
5. 顯示倍率前數值、倍率算式、倍率結果、下注結果與本局最終變化。
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
- 權重程式計算：正 109、負 65、中性 18，合計 192。
- 桌面瀏覽器完整執行狂歡模式一局，共摸 16 張。
- 選擇 2x 後，局內倍率前 +30 時確認總點數仍為 0、HUD 預估為 +60。
- 進入補牌三選並選滿 3 張；補牌未中時不增加正式牌、線或點數。
- 單局結算確認 `+30 × 2 = +60`，證實倍率只套用一次。
- 375×667 手機 viewport 檢查 HUD、棋盤語意內容與單局結算按鈕可見。
- 瀏覽器 console error／warning：0。

## 15. 已知限制

- 事件採 weighted random；本輪人工互動未強制觸發每一個低機率特殊事件。相關 handler、狀態回復與權重已完成靜態逐項檢查。
- Unicode 麻將牌實際字形仍取決於作業系統字型，但專案保留中文 label／ARIA 文字，且沒有新增圖片 fallback。
- 總點數接近 0 時，負值倍率結算會依規格停在 0；單局結果仍顯示原始理論倍率損益，實際總點數變化則受 0 下限保護。

## 16.  增量修正：倍率光效、聽牌下注與事件牌識別

- 倍率光效：光效由原本較薄的外框提升為主要遊戲容器與棋盤雙層 glow，加入環境色 radial gradient、強化邊框、內外陰影與約 2.35～3.2 秒的低頻呼吸動畫。1x 維持原貌；2x 為金黃暖光；3x 為強度更高的橘紅 On Fire；4x 為紫色高倍率光；6x 為範圍、亮度與呼吸強度均高於 4x 的強紫光。HUD 倍率文字同步套用對應色彩。既有 `updateHUD()` 會在最終倍率改變時立即切換 class，因此老闆加碼後可直接由 3x 紅橘切換為 6x 強紫。
- 我要聽牌：條件與 `everWaited` 判定不變，reward 由 +10 改為 **+5 點**，penalty 維持 **-5 點**；最大風險仍為 5 點、局末獨立結算且不乘倍率。
- 事件牌識別：`event-1` 的 label／glyph 改為「事件 A／A」，`event-2` 改為「事件 B／B」。牌面保留同一紫色事件牌風格，以黃、藍 accent 區分大型 A／B；tile ID、牌數、事件池、Weight 與觸發流程均未改變。
- 事件 Modal：修改幅度很小，因此已在揭曉前後的 kicker 保留「事件 A」或「事件 B」來源標記，不影響實際抽取事件。
- 測試：JavaScript 語法與 `git diff --check` 通過；文件中未發現舊的聽牌下注 +10。瀏覽器實測 1x class 無動畫與陰影、2x 使用 `board-gold-glow` 雙層金光、3x 使用 `board-fire-glow` 紅橘環境光；4x／6x 對應 class 與 CSS 強度已靜態核對，6x 的外部 glow 範圍與亮度均高於 4x。375×667 實測 `scrollWidth` 與 `clientWidth` 同為 360，沒有水平溢位；事件 A／B 各一張且字面完整落在牌格內。實際第 14 張抽到事件 B 時，Modal 顯示「事件 B・特殊事件」，事件仍由原 weighted pool 抽出「夜市神明保佑」。下注 Modal 實測顯示「成功 +5｜失敗 -5」與門檻 5 點。

## 17.  增量修正：HUD、補牌與最終成績

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
12. 測試：JavaScript 語法與 `git diff --check` 通過。瀏覽器以 12 字元名稱及 375px viewport 實測，HUD 三欄無交疊、頁面 `scrollWidth` 與 `clientWidth` 同為 360；摸牌列依序顯示「局數 1 / 6、摸牌、剩餘 16 張」。3x 局內取得基礎 +5 時 HUD 顯示 +15，證實畫面採倍率後值。完整遊玩兩局後，單局結算未出現倍率前數值與乘法公式；GAME OVER 只顯示獎盃、玩家名稱、巨大最終點數、四項總成績、牌型成就及兩項損益。補牌實際走過三張未中流程；第一／第二張提早命中分支以程式路徑核對：每次選牌立即比對 `bonusMissing`，命中當下先停用所有按鈕，再由 `bonusResolved` 保證只結算及加局一次。430px 規則與短 viewport 亦完成 computed layout 檢查。

## 18. 手機下注、整合狀態與說明

1. 手機下注位置：新增只在手機顯示的同步下注按鈕，放在 HUD 與 `.play-area` 之間；桌面仍使用原操作列按鈕。兩個入口共用同一函式與狀態，不會產生兩份下注資料。
2. 手機順序：實際 DOM 與 computed layout 均為 HUD → 下注 → 棋盤 → 摸牌 → 說明 → 回主選單。倍率光效留在 `.play-area`，下注按鈕使用較高 stacking context，不被 glow 遮擋。
3. 摸牌後唯讀：`openLeverage()` 依 `round.started` 切換。未開始時 render radio／checkbox 與確認按鈕；開始後只 render `finalMultiplier`、鎖定下注名稱及關閉按鈕，完全不建立 input，因此不能修改但仍可查看。老闆加碼後再次開啟會直接讀取最新 `finalMultiplier`。
4. 狀態整合：下注視窗下方直接使用 `roundLines`、`activeWaiting`、`everWaited`、既有 `renderProgress()` 與 achievement Set，顯示連線、聽牌、三門花色、四風、三元、適用模式的梅蘭、天聽與海底撈月。已下注的連線或聽牌目標使用輕量邊框強調。
5. 移除入口：主畫面不再有本局狀態、點數獲得方式或事件一覽的獨立按鈕。手機摸牌下方及桌面次要操作都只保留說明與回主選單，桌面另保留下注。
6. 說明整合：`openHelp()` 組合點數、牌型、特殊成就、倍率、下注摘要及由 `EVENT_DEFINITIONS` 動態建立的事件一覽，避免複製事件資料。
7. 狂歡模式：`eventsEnabled` 為 false 時不 render 事件 section，不留下空標題或空白區塊。
8. 版本命名：已清除 UI、CSS 註解、README、規則、技術規格、更新說明與本報告內的版本代號；玩家更新文件改名為 `RELEASE_NOTES.md`。
9. 技術用語：玩家 UI 已清除不適用的工程式點數舊稱；技術文件只以 `rawPoints：內部倍率前數值` 說明實作。
10. 牌型 Toast：花色門檻統一顯示自然文案，例如「萬子 5 張！ +5 點」，不再顯示基礎或工程式說明。
11. Responsive 測試：375×667、390×844、430×932 均無水平捲動；三種尺寸皆確認下注底部 sheet 可捲動、關閉按鈕可見。375px 實測 sheet 高 614px、中央內容 client 407px／scroll 594px，footer 未被遮住。
12. 功能測試：第一張前倍率 radio 可編輯；第一張後按鈕仍 enabled，唯讀視窗 input 數量為 0，正確顯示「下注 · 2x」、2x、本局沒有額外下注及狀態。標準模式說明同時含點數與事件，狂歡模式只含點數。萬子 5 張 Toast 實測為「萬子 5 張！ +5 點」，全文不含禁用字樣。桌面版確認手機下注按鈕隱藏，操作列只顯示下注、說明、回主選單。

## 19. TEST1129 測試劇本模式

1. 名稱先依既有流程 `trim()`，再以 `playerName === "TEST1129"` 精確判定；只在標準模式啟用。
2. `game.testScenarioRoundIndex` 依實際開始的牌局遞增，補牌或事件增加次數不會插入、重複或延後劇本。
3. `TEST_SCENARIOS` 集中描述六局目標；`buildTestScenarioRound()` 在 `createRound()` 階段建立固定 board、hand 與 remaining。
4. 建立時檢查 hand ID 不重複，並驗證 hand 與 remaining 合併後仍為完整 36 個唯一 ID；所有牌都來自標準模式牌組。
5. Scenario 1 實機結果：萬子九張門檻正常累加，局末聽東；補牌第一格為東，玩家點擊後立即成功並取得 +1 次。單局共有 5 項點數成就。
6. Scenario 2 實機結果：條子九張門檻正常累加，局末聽東；前三格依序為一萬、二萬、三萬，三張皆未命中並顯示補牌失敗。
7. Scenario 3 實機結果：筒子九張門檻正常累加，局末聽東；第一格東命中並取得 +1 次。
8. Scenario 4 將一萬至五萬放在前五張、六萬放在第十五張，同列配置在棋盤第一列。前五張自然顯示「天聽！ +5 點」，前十四張維持零正式連線，第十五張顯示「連線成功！ +30 點」及「海底撈月！ +5 點」。
9. Scenario 5 使用第一橫列、第一直行與反斜線共用交點，把三張各自的完成牌排在第 13～15 張；正式 `scoreLines()` 依序給予 +30、+60、+90，總連線倍率前數值 180，完成線數仍為 3。
10. Scenario 6 將事件 A 固定在第八張；揭曉階段只對本劇本指定既有 `explosion` ID，仍由 `executeEvent()` 與 `END_GAME` handler 完成本局結算及 GAME OVER。
11. 測試模式的倍率選項不因暫時剩餘次數不足而鎖定；首次摸牌時只對測試 session 補足本局消耗，前五局局末若歸零則保留下一劇本所需的一次，不改變正式玩家限制。
12. 補牌與事件增加次數仍寫入既有 `totalAttemptsGranted` 與統計，但 scenario index 完全獨立。
13. 「再玩一次」實測回到局數 1 / 6，棋盤第一列重新為一萬至五萬與東；回主選單亦透過 fresh game state 重置。
14. 一般玩家 `KRIS` 連續重載兩次取得不同棋盤排列；正式 `shuffle()`、補牌 remaining 與 weighted event 路徑未被替換。狂歡模式不符合啟用條件。
15. `game.js` 與 `game-config.js` JavaScript syntax check 通過；瀏覽器完整跑完六局後 console 無 error 或 warning。

## 20. 觸控、國聚、連線與事件權重增量修改

1. `touch-action: manipulation` 套用於 `.game-shell`、`.play-area`、`.draw-button`、`.tile`、`.hand-tile`／`.bonus-tile`、`.leverage-button`、`.bet-option`、`.guide-button` 與 `.modal-actions button`。未使用 `user-scalable=no` 或 `maximum-scale=1`，Modal 捲動區仍為 `overflow-y: auto`。
2. 以 375×667 Chromium 手機 viewport 驗證上述操作元件的 computed `touch-action` 均為 `manipulation`；下注 Modal 實際由 `scrollTop 0` 滑至 `436`，且頁面無水平溢位。此環境無法取代 iPhone Safari、iPhone Chrome 與 Android Chrome 實機，因此實機 double-tap zoom 最終驗收仍待真機確認；採用的標準 CSS 不封鎖雙指縮放。
3. 「相信國聚」改為東、南、西、北、中、發、白中正式取得任意 5 張即成功；+30／-30、最大風險 30、複選、資格檢查、局末結算及不乘倍率均未更動。判定以取得數量 `>= 5` 實作，因此 4 張失敗，5／6／7 張成功。
4. 正式連線倍率前數值改為第一條 +30、第二條 +60、第三條 +90。
5. 第四條及之後共用 `SCORE_CONFIG.line.thirdPlus`，每條仍為 +90；`completedLines` Set 與 line ID 防重複機制未更動。
6. 「老闆突然加碼」Weight 由 3 改為 6；效果 handler 未改，仍為整局 `finalMultiplier × 2` 且上限 6x，weighted random 抽取流程也未改為固定觸發。
7. Enabled 事件新分布為正面 109／192（56.8%）、負面 65／192（33.9%）、中性 18／192（9.4%）；除「老闆突然加碼」外未調整其他 Weight。
8. TEST1129 已同步。Scenario 4 實際完成第一線後，本局內容包含連線 +30 與海底撈月 +5；Scenario 5 實際走正式 `scoreLines()`，第 13～15 張 Toast 依序顯示 +30、+60、+90，三條連線倍率前數值合計 180。該劇本另有既有牌型成就，因此整局 HUD 最終值不等同純連線小計。
9. 正式 RNG 未發現任何依總點數、本局點數、300 點、倍率、下注、前局表現或連線數控牌的邏輯。非 TEST1129 的 `createRound()` 仍分別以 `shuffle(config.tiles)` 建立 board 與正式抽牌 order；只有明確的 TEST1129 劇本會建立固定 board／hand／remaining。
10. 使用 bundled Node 執行 `node --check game.js` 與 `node --check game-config.js` 均通過；`git diff --check` 通過。最終瀏覽器重載後，玩家說明包含 30／60／90 與國聚任意 5 張，console error／warning 為 0。
