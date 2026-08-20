const GAME_STATES = Object.freeze({
  MODE_SELECT: "MODE_SELECT", READY: "READY", DRAWING: "DRAWING", EVENT_CHOICE: "EVENT_CHOICE",
  EVENT_REVEAL: "EVENT_REVEAL", BONUS_DRAW: "BONUS_DRAW",
  ROUND_END: "ROUND_END", GAME_OVER: "GAME_OVER"
});

const RULES = Object.freeze({ maxRounds: 6, bonusChoices: 3 });
const NUMERALS = "一二三四五六七八九";
const SUIT_NAMES = Object.freeze({ wan: "萬子", tong: "筒子", suo: "索子" });

const CORE_TILES = [
  ...Array.from({ length: 9 }, (_, i) => ({ id: `wan-${i + 1}`, label: `${NUMERALS[i]}萬`, glyph: String.fromCodePoint(0x1f007 + i), suit: "wan" })),
  ...Array.from({ length: 9 }, (_, i) => ({ id: `tong-${i + 1}`, label: `${NUMERALS[i]}筒`, glyph: String.fromCodePoint(0x1f019 + i), suit: "tong" })),
  ...Array.from({ length: 9 }, (_, i) => ({ id: `suo-${i + 1}`, label: `${NUMERALS[i]}索`, glyph: String.fromCodePoint(0x1f010 + i), suit: "suo" })),
  { id: "east", label: "東", glyph: "🀀", group: "wind" }, { id: "south", label: "南", glyph: "🀁", group: "wind" },
  { id: "west", label: "西", glyph: "🀂", group: "wind" }, { id: "north", label: "北", glyph: "🀃", group: "wind" },
  { id: "red", label: "中", glyph: "🀄", group: "dragon" }, { id: "green", label: "發", glyph: "🀅", group: "dragon" },
  { id: "white", label: "白", glyph: "🀆", group: "dragon" }
];
const STANDARD_TILES = [...CORE_TILES,
  { id: "chance", label: "機會", glyph: "機會", special: "chance" },
  { id: "destiny", label: "命運", glyph: "命運", special: "destiny" }
];
const CARNIVAL_TILES = [...CORE_TILES,
  { id: "plum", label: "梅", glyph: "🀢", flower: true },
  { id: "orchid", label: "蘭", glyph: "🀣", flower: true }
];
const GAME_MODE_CONFIG = Object.freeze({
  standard: { id: "standard", label: "標準模式", shortLabel: "標準", handSize: 15, eventsEnabled: true, tiles: STANDARD_TILES },
  carnival: { id: "carnival", label: "狂歡模式", shortLabel: "狂歡 🔥", handSize: 16, eventsEnabled: false, tiles: CARNIVAL_TILES }
});

const CHANCE_EVENTS = [
  { id: "boss-happy", title: "老闆今天心情很好", story: "老闆剛好中了發票，今天看誰都順眼。", effectType: "score", value: 200, weight: 20 },
  { id: "wrong-change", title: "老闆算錯錢", story: "老闆找錢找多了，而且他完全沒有發現。", effectType: "score", value: 500, weight: 15 },
  { id: "neighbor-leaves", title: "隔壁攤不玩了", story: "隔壁玩家突然說要去買雞排，把剩下的局數送給你。", effectType: "rounds", value: 2, weight: 5 },
  { id: "free-round", title: "免費再來一次", story: "老闆說你長得很面熟，今天算你一局免費的。", effectType: "rounds", value: 1, weight: 15 },
  { id: "boss-helps", title: "老闆偷偷放水", story: "老闆趁沒人注意，偷偷幫你把獎金加了一點。", effectType: "score", value: 800, weight: 8 },
  { id: "broadcast", title: "夜市廣播抽中你", story: "廣播突然叫到你的號碼，你莫名其妙中了活動獎。", effectType: "score", value: 1000, weight: 5 },
  { id: "lucky-line", title: "好運連線", story: "旁邊阿伯看了你一眼，說你今天面相會連線。", effectType: "nextLineDouble", value: 2, weight: 8 },
  { id: "red-envelope", title: "神秘紅包", story: "地上出現一個不知道誰掉的紅包，裡面居然是夜市點數。", effectType: "randomScore", value: [300, 1000], weight: 10 },
  { id: "bubble-tea", title: "珍奶加料不用錢", story: "老闆把最後一勺珍珠全倒給你，好運也跟著滿出來。", effectType: "score", value: 300, weight: 18 }
];

const DESTINY_EVENTS = [
  { id: "drain", title: "手滑掉進水溝", story: "你剛摸到的幸運突然跟著麻將一起掉進水溝。", effectType: "score", value: -300, weight: 18 },
  { id: "caught", title: "老闆抓到你偷看", story: "老闆：少年欸，你是不是偷看牌？", effectType: "score", value: -500, weight: 15 },
  { id: "expert", title: "隔壁高手來亂", story: "隔壁高手突然開始大聲指揮，把你搞得完全不會摸。", effectType: "halveRoundScore", value: 0.5, weight: 10 },
  { id: "jackpot", title: "神秘大獎", story: "老闆從桌子下面拿出一個連他自己都忘記的紅包。", effectType: "score", value: 1500, weight: 8 },
  { id: "temple", title: "夜市神明保佑", story: "附近宮廟遶境經過，鑼鼓一響，今晚運氣突然變好了。", effectType: "rounds", value: 2, weight: 5 },
  { id: "double-round", title: "老闆突然加碼", story: "老闆拍桌大喊：這局接下來的連線全部算兩倍！", effectType: "roundLineDouble", value: 2, weight: 7 },
  { id: "blackout", title: "停電", story: "啪！整條夜市突然停電，老闆摸黑宣布這局到此為止。", effectType: "endRound", value: true, weight: 6 },
  { id: "rain", title: "大雨來了", story: "豪雨突然灌進夜市，大家忙著收攤，你少了一次機會。", effectType: "loseRound", value: 1, weight: 9 },
  { id: "explosion", title: "隔壁瓦斯桶爆炸", story: "碰！！！隔壁攤位傳來巨響，所有人拔腿就跑！", effectType: "gameOver", value: true, weight: 1 },
  { id: "reversal", title: "命運逆轉", story: "你以為完蛋了，結果老闆突然說剛才那局不算，還多送兩局。", effectType: "rounds", value: 3, weight: 3 },
  { id: "wallet", title: "錢包躲在口袋裡", story: "你找了半天的錢包竟然一直在口袋裡，虛驚一場還翻出點數。", effectType: "score", value: 700, weight: 12 },
  { id: "pickpocket", title: "人潮中被扒走點數", story: "你只顧著看麻將，回神時獎券已少了一大疊。", effectType: "score", value: -800, weight: 5 }
];

const elements = Object.fromEntries([
  "board", "draw-stack", "draw-prompt", "draw-progress", "draw-remaining", "total-score", "round-score", "total-lines", "rounds-left", "round-lights", "mobile-multiplier",
  "desktop-score", "desktop-round-score", "desktop-lines", "desktop-rounds", "round-label", "state-badge",
  "desktop-multiplier", "multiplier-badge", "event-guide-button", "mobile-event-guide", "leverage-button", "mobile-leverage-button",
  "main-menu-button", "mobile-main-menu-button", "mode-select", "game-shell", "mode-label", "mobile-mode-label", "hand-size",
  "mode-rule", "mobile-mode-rule",
  "bonus-modal", "bonus-waiting", "bonus-instruction", "bonus-count", "bonus-grid", "bonus-result",
  "draw-count", "message", "progress-list", "mobile-progress-list",
  "toast-stack", "modal", "modal-icon", "modal-kicker", "modal-title", "modal-body", "modal-actions"
].map(id => [id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), document.querySelector(`#${id}`)]));

function buildLines() {
  const lines = [];
  for (let row = 0; row < 6; row += 1) lines.push({ id: `row-${row}`, indexes: Array.from({ length: 6 }, (_, col) => row * 6 + col) });
  for (let col = 0; col < 6; col += 1) lines.push({ id: `col-${col}`, indexes: Array.from({ length: 6 }, (_, row) => row * 6 + col) });
  lines.push({ id: "diag-main", indexes: Array.from({ length: 6 }, (_, i) => i * 7) });
  lines.push({ id: "diag-reverse", indexes: Array.from({ length: 6 }, (_, i) => (i + 1) * 5) });
  return lines;
}

const LINE_DEFINITIONS = buildLines();
let game;

function freshGameState(mode = null) {
  return {
    mode, state: mode ? GAME_STATES.READY : GAME_STATES.MODE_SELECT, score: 0, totalLines: 0, roundsLeft: 6, roundsPlayed: 0,
    achievementCount: 0, round: null, busy: false, pendingSpecial: null, uiOverlayOpen: false,
    stats: {
      totalScore: 0, totalLines: 0, roundsPlayed: 0, totalRoundCost: 0,
      multiplier1Count: 0, multiplier2Count: 0, multiplier3Count: 0,
      wan5Count: 0, wan7Count: 0, tong5Count: 0, tong7Count: 0, suo5Count: 0, suo7Count: 0,
      fourWindsCount: 0, threeDragonsCount: 0, waitingCount: 0,
      bonusDrawCount: 0, bonusSuccessCount: 0, extraRoundsFromBonus: 0,
      chanceDrawCount: 0, chanceAcceptedCount: 0, chanceDiscardedCount: 0,
      destinyDrawCount: 0, destinyAcceptedCount: 0, destinyDiscardedCount: 0,
      extraRoundsFromEvents: 0, eventScoreGain: 0, eventScoreLoss: 0, gameOverByEvent: false,
      highestRoundScore: 0, highestRoundLines: 0, totalAchievements: 0
    }
  };
}

function createRound() {
  const config = GAME_MODE_CONFIG[game.mode];
  const board = shuffle(config.tiles);
  const order = shuffle(config.tiles);
  return {
    board, hand: order.slice(0, config.handSize), remaining: order.slice(config.handSize), drawIndex: 0, drawn: new Set(), discarded: new Set(), started: false,
    completedLines: new Set(), activeWaiting: new Set(), announcedWaiting: new Set(), achievements: new Set(),
    roundScore: 0, roundLines: 0, roundMultiplier: 1, lineMultiplier: 1, nextLineDouble: false,
    bonusMissing: new Set(), bonusCandidates: [], selectedBonusTiles: [], bonusResolved: false
  };
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function weightedRandom(events, random = Math.random()) {
  const total = events.reduce((sum, event) => sum + event.weight, 0);
  let cursor = random * total;
  for (const event of events) {
    cursor -= event.weight;
    if (cursor < 0) return event;
  }
  return events[events.length - 1];
}

function startRound() {
  closeModal();
  closeBonusModal();
  game.round = createRound();
  game.state = GAME_STATES.DRAWING;
  game.busy = false;
  game.pendingSpecial = null;
  renderBoard();
  elements.message.textContent = "本局預設 ×1；可在第一張牌前開槓桿";
  updateHUD();
}

function openLeverage() {
  if (game.state !== GAME_STATES.DRAWING || game.round.started || game.busy || game.uiOverlayOpen) return;
  game.uiOverlayOpen = true;
  const options = [1, 2, 3].map(multiplier => ({
    label: `${multiplier} 倍｜首次摸牌消耗 ${multiplier} 次${multiplier === 3 ? "｜高風險！" : ""}`,
    disabled: multiplier > game.roundsLeft,
    action: () => selectRoundMultiplier(multiplier)
  }));
  openModal({
    icon: "槓", kicker: `目前剩餘：${game.roundsLeft} 次`, title: "選擇本局槓桿",
    body: "<p>現在只設定倍率，不扣次數。第一次正式摸牌時才會消耗。</p>",
    actions: [...options, { label: "取消", className: "secondary", action: closeLeverage }]
  });
}

function selectRoundMultiplier(multiplier) {
  if (game.state !== GAME_STATES.DRAWING || game.round.started || multiplier > game.roundsLeft) return;
  game.round.roundMultiplier = multiplier;
  game.uiOverlayOpen = false;
  closeModal();
  elements.message.textContent = `已設定 ×${multiplier}，第一次摸牌時將消耗 ${multiplier} 次`;
  updateHUD();
}

function closeLeverage() { game.uiOverlayOpen = false; closeModal(); }

function tileContent(tile) {
  if (tile.special) {
    const symbol = tile.special === "chance" ? "？" : "★";
    return `<span class="special-face" aria-hidden="true"><b>${symbol}</b><small>${tile.label}</small></span>`;
  }
  return `<span class="glyph" aria-hidden="true">${tile.glyph}</span><span class="text-fallback hidden-fallback" aria-hidden="true">${tile.label}</span>`;
}

function tileClass(tile, base) {
  if (!tile.special) return base;
  const specialClass = tile.special === "chance" ? "chance-tile" : "destiny-tile";
  return `${base} special special-tile ${specialClass}`;
}

function boardTileStateClass(tile) {
  if (game.round.discarded.has(tile.id)) return "tile-discarded";
  if (game.round.drawn.has(tile.id)) return "tile-acquired marked";
  return "tile-unclaimed";
}

function renderBoard() {
  elements.board.replaceChildren();
  game.round.board.forEach((tile, index) => {
    const cell = document.createElement("div");
    const stateClass = boardTileStateClass(tile);
    cell.className = `${tileClass(tile, "tile")} ${stateClass}`;
    cell.dataset.tileId = tile.id;
    cell.innerHTML = tileContent(tile);
    cell.title = tile.label;
    cell.setAttribute("role", "gridcell");
    const stateLabel = stateClass.includes("discarded") ? "已丟掉" : stateClass.includes("acquired") ? "已取得" : "尚未取得";
    cell.setAttribute("aria-label", `${tile.label}，${stateLabel}`);
    cell.setAttribute("aria-rowindex", Math.floor(index / 6) + 1);
    cell.setAttribute("aria-colindex", index % 6 + 1);
    elements.board.append(cell);
  });
}

function revealButton(button, tile) {
  button.innerHTML = tileContent(tile);
  button.title = tile.label;
  button.className = tileClass(tile, "hand-tile revealed");
  button.setAttribute("aria-label", tile.label);
  button.disabled = true;
}

function nextFormalTile() {
  return game.round.hand[game.round.drawIndex] ?? null;
}

async function drawTile() {
  if (game.state !== GAME_STATES.DRAWING || game.busy || game.uiOverlayOpen) return;
  const tile = nextFormalTile();
  if (!tile || elements.drawStack.disabled) return;
  game.busy = true;
  startRoundCostIfNeeded();
  game.round.drawn.add(tile.id);
  await animateStackTile(tile);
  game.round.drawIndex += 1;
  if (!tile.special) {
    markBoard(tile);
    scoreLines();
    scoreCollections();
    updateWaitingLines();
  }
  game.busy = false;
  updateHUD();
  elements.message.textContent = `摸到${tile.label}，剩下 ${GAME_MODE_CONFIG[game.mode].handSize - game.round.drawIndex} 張`;
  if (tile.special) return openEventChoice(tile);
  continueAfterDraw();
}

function startRoundCostIfNeeded() {
  if (game.round.started) return;
  const multiplier = game.round.roundMultiplier;
  game.round.started = true;
  game.roundsLeft = Math.max(0, game.roundsLeft - multiplier);
  game.roundsPlayed += 1;
  game.stats.roundsPlayed += 1;
  game.stats.totalRoundCost += multiplier;
  game.stats[`multiplier${multiplier}Count`] += 1;
  updateHUD();
}

function animateStackTile(tile) {
  const source = elements.drawStack.getBoundingClientRect();
  const target = elements.board.querySelector(`[data-tile-id="${tile.id}"]`).getBoundingClientRect();
  const clone = document.createElement("div");
  clone.className = tileClass(tile, "hand-tile revealed flying-tile");
  clone.innerHTML = tileContent(tile);
  Object.assign(clone.style, { left: `${source.left}px`, top: `${source.top}px`, width: `${source.width}px`, height: `${source.height}px` });
  document.body.append(clone);
  clone.style.transform = "rotateY(88deg) scale(.94)";
  requestAnimationFrame(() => {
    clone.style.transform = `translate(${target.left - source.left}px,${target.top - source.top}px) scale(${target.width / source.width}) rotateY(0)`;
    clone.style.opacity = ".3";
  });
  return new Promise(resolve => setTimeout(() => { clone.remove(); resolve(); }, 320));
}

function markBoard(tile) {
  const cell = elements.board.querySelector(`[data-tile-id="${tile.id}"]`);
  cell.classList.remove("tile-unclaimed", "tile-discarded");
  cell.classList.add("marked", "tile-acquired");
  cell.setAttribute("aria-label", `${tile.label}，已取得`);
}

function lineTileIds(line) { return line.indexes.map(index => game.round.board[index].id); }
function isOfficiallyDrawn(id) { return game.round.drawn.has(id) && !game.round.discarded.has(id); }

function scoreLines() {
  const newLines = LINE_DEFINITIONS.filter(line => !game.round.completedLines.has(line.id) && lineTileIds(line).every(isOfficiallyDrawn));
  for (const line of newLines) {
    game.round.completedLines.add(line.id);
    game.round.activeWaiting.delete(line.id);
    const ordinal = game.round.roundLines + 1;
    const base = ordinal === 1 ? 1000 : ordinal === 2 ? 1500 : 2000;
    const nextMultiplier = game.round.nextLineDouble ? 2 : 1;
    const points = base * game.round.roundMultiplier * game.round.lineMultiplier * nextMultiplier;
    game.round.nextLineDouble = false;
    game.round.roundLines += 1;
    game.totalLines += 1;
    game.stats.totalLines += 1;
    addScore(points);
    const label = ordinal === 1 ? "連線成功！" : ordinal === 2 ? "雙線！" : "三線以上！";
    notifyScore(`${label} +${points}`);
    flashLine(line, "line-flash");
  }
}

function scoreCollections() {
  const drawnTiles = GAME_MODE_CONFIG[game.mode].tiles.filter(tile => isOfficiallyDrawn(tile.id));
  for (const [suit, name] of Object.entries(SUIT_NAMES)) {
    const count = drawnTiles.filter(tile => tile.suit === suit).length;
    if (count >= 5) awardOnce(`${suit}-5`, 200, `${name}集滿 5 張！`);
    if (count >= 7) awardOnce(`${suit}-7`, 300, `${name}集滿 7 張！`);
  }
  if (["east", "south", "west", "north"].every(isOfficiallyDrawn)) awardOnce("winds", 500, "四風齊聚！");
  if (["red", "green", "white"].every(isOfficiallyDrawn)) awardOnce("dragons", 500, "三元到手！");
}

function awardOnce(id, points, label) {
  if (game.round.achievements.has(id)) return;
  game.round.achievements.add(id);
  game.achievementCount += 1;
  game.stats.totalAchievements += 1;
  const statKey = ({ "wan-5": "wan5Count", "wan-7": "wan7Count", "tong-5": "tong5Count", "tong-7": "tong7Count", "suo-5": "suo5Count", "suo-7": "suo7Count", winds: "fourWindsCount", dragons: "threeDragonsCount" })[id];
  if (statKey) game.stats[statKey] += 1;
  const multipliedPoints = points * game.round.roundMultiplier;
  addScore(multipliedPoints);
  notifyScore(`${label} +${multipliedPoints}`);
}

function addScore(points) {
  const previous = game.score;
  game.score = Math.max(0, game.score + points);
  game.round.roundScore += game.score - previous;
  game.stats.totalScore = game.score;
}

function currentWaitingLines() {
  return LINE_DEFINITIONS.filter(line => {
    if (game.round.completedLines.has(line.id)) return false;
    const ids = lineTileIds(line);
    if (ids.filter(isOfficiallyDrawn).length !== 5) return false;
    const missingId = ids.find(id => !isOfficiallyDrawn(id));
    return !GAME_MODE_CONFIG[game.mode].tiles.find(tile => tile.id === missingId)?.special;
  });
}

function updateWaitingLines() {
  const waiting = currentWaitingLines();
  const waitingIds = new Set(waiting.map(line => line.id));
  game.round.activeWaiting = waitingIds;
  elements.board.querySelectorAll(".tile.waiting").forEach(cell => cell.classList.remove("waiting"));
  const newlyWaiting = waiting.filter(line => !game.round.announcedWaiting.has(line.id));
  newlyWaiting.forEach(line => {
    game.round.announcedWaiting.add(line.id);
    flashLine(line, "waiting");
  });
  if (newlyWaiting.length) {
    game.stats.waitingCount += newlyWaiting.length;
    const label = newlyWaiting.length === 1 ? "聽牌！" : newlyWaiting.length === 2 ? "雙聽！" : `聽牌 ×${newlyWaiting.length}`;
    notifyScore(label, true);
  }
}

function flashLine(line, className) {
  line.indexes.forEach(index => elements.board.children[index]?.classList.add(className));
  if (className === "line-flash") setTimeout(() => line.indexes.forEach(index => elements.board.children[index]?.classList.remove(className)), 750);
}

function continueAfterDraw() {
  if (game.state !== GAME_STATES.DRAWING) return;
  if (game.round.drawIndex === GAME_MODE_CONFIG[game.mode].handSize) setTimeout(finishRegularDraws, 250);
}

function findWaitingMissingTiles() {
  const missing = new Set();
  currentWaitingLines().forEach(line => lineTileIds(line).filter(id => !isOfficiallyDrawn(id)).forEach(id => missing.add(id)));
  return missing;
}

function finishRegularDraws() {
  if (game.state !== GAME_STATES.DRAWING) return;
  game.round.bonusMissing = findWaitingMissingTiles();
  if (game.round.bonusMissing.size > 0) startBonusDraw();
  else endRound(false, false);
}

function startBonusDraw() {
  game.state = GAME_STATES.BONUS_DRAW;
  game.round.selectedBonusTiles = [];
  game.round.bonusCandidates = [];
  game.stats.bonusDrawCount += 1;
  openBonusModal();
  elements.message.textContent = `聽牌！進入 ${game.round.remaining.length} 張補牌`;
  updateHUD();
  notifyScore("聽牌！獲得補牌機會", true);
}

function openBonusModal() {
  const tiles = GAME_MODE_CONFIG[game.mode].tiles;
  elements.bonusWaiting.innerHTML = [...game.round.bonusMissing].map(id => {
    const tile = tiles.find(item => item.id === id);
    return `<span class="waiting-chip"><b>${tile.glyph}</b><small>${tile.label}</small></span>`;
  }).join("");
  elements.bonusInstruction.textContent = `請從剩餘 ${game.round.remaining.length} 張中選擇 3 張`;
  elements.bonusCount.textContent = "已選 0 / 3";
  elements.bonusResult.textContent = "";
  elements.bonusGrid.replaceChildren();
  game.round.remaining.forEach((tile, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hand-tile bonus-tile";
    button.dataset.index = index;
    button.setAttribute("aria-label", `補牌牌背 ${index + 1}`);
    button.addEventListener("click", selectBonusTile);
    elements.bonusGrid.append(button);
  });
  elements.bonusModal.classList.add("open");
  elements.bonusModal.setAttribute("aria-hidden", "false");
}

function closeBonusModal() {
  elements.bonusModal.classList.remove("open");
  elements.bonusModal.setAttribute("aria-hidden", "true");
}

function selectBonusTile(event) {
  if (game.state !== GAME_STATES.BONUS_DRAW || game.round.bonusResolved) return;
  const button = event.currentTarget;
  if (button.disabled) return;
  const tile = game.round.remaining[Number(button.dataset.index)];
  revealButton(button, tile);
  button.classList.add("selected");
  game.round.selectedBonusTiles.push(tile);
  elements.bonusCount.textContent = `已選 ${game.round.selectedBonusTiles.length} / 3`;
  if (game.round.selectedBonusTiles.length === 3) {
    game.round.bonusCandidates = [...game.round.selectedBonusTiles];
    elements.bonusGrid.querySelectorAll("button").forEach(item => { item.disabled = true; });
    setTimeout(resolveBonusDraw, 450);
  }
}

function resolveBonusDraw() {
  if (game.state !== GAME_STATES.BONUS_DRAW || game.round.bonusResolved) return;
  game.round.bonusResolved = true;
  const success = game.round.bonusCandidates.some(tile => !tile.special && game.round.bonusMissing.has(tile.id));
  if (success) {
    game.stats.bonusSuccessCount += 1;
    const before = game.roundsLeft;
    game.roundsLeft = Math.min(6, game.roundsLeft + 1);
    game.stats.extraRoundsFromBonus += game.roundsLeft - before;
  }
  const hits = game.round.bonusCandidates.filter(tile => !tile.special && game.round.bonusMissing.has(tile.id));
  hits.forEach(tile => {
    const index = game.round.remaining.findIndex(item => item.id === tile.id);
    elements.bonusGrid.querySelector(`[data-index="${index}"]`)?.classList.add("bonus-hit");
  });
  updateHUD();
  const hitLabel = hits.map(tile => tile.label).join("、");
  elements.bonusResult.innerHTML = success
    ? `<strong>${hits.length > 1 ? "雙重命中！" : "補牌成功！"}</strong><br>你摸中了：${hitLabel}<br>獲得 +1 次！`
    : `<strong>補牌失敗，差一點！</strong><br>你需要的是：${[...game.round.bonusMissing].map(id => GAME_MODE_CONFIG[game.mode].tiles.find(tile => tile.id === id)?.label).join("、")}`;
  elements.message.textContent = success ? "補牌成功！額外獲得 1 次！" : "補牌失敗，差一點！";
  notifyScore(success ? "補牌成功！額外獲得 1 次！" : "補牌失敗，差一點！", true);
  setTimeout(() => { closeBonusModal(); endRound(true, success); }, 1500);
}

function openEventChoice(tile) {
  game.state = GAME_STATES.EVENT_CHOICE;
  game.pendingSpecial = { tile, resolved: false };
  game.stats[`${tile.special}DrawCount`] += 1;
  updateHUD();
  openModal({
    icon: tile.special === "chance" ? "？" : "！", kicker: "夜市特殊牌", title: `你摸到了【${tile.label}】`,
    body: `<p>接受後才會揭曉今晚發生什麼事。<br>也可以丟掉，不承擔任何效果。</p>`,
    actions: [
      { label: "丟掉", className: "secondary", action: discardSpecial },
      { label: "接受", action: acceptSpecial }
    ]
  });
}

function discardSpecial() {
  if (game.state !== GAME_STATES.EVENT_CHOICE || game.pendingSpecial.resolved) return;
  game.pendingSpecial.resolved = true;
  const tile = game.pendingSpecial.tile;
  game.stats[`${tile.special}DiscardedCount`] += 1;
  game.round.discarded.add(tile.id);
  const cell = elements.board.querySelector(`[data-tile-id="${tile.id}"]`);
  cell.classList.remove("marked", "tile-acquired", "tile-unclaimed");
  cell.classList.add("tile-discarded");
  cell.setAttribute("aria-label", `${tile.label}，已丟掉`);
  updateWaitingLines();
  game.pendingSpecial = null;
  closeModal();
  game.state = GAME_STATES.DRAWING;
  updateHUD();
  elements.message.textContent = "特殊牌已丟掉，沒有發生任何效果";
  continueAfterDraw();
}

function acceptSpecial() {
  if (game.state !== GAME_STATES.EVENT_CHOICE || game.pendingSpecial.resolved) return;
  game.pendingSpecial.resolved = true;
  game.state = GAME_STATES.EVENT_REVEAL;
  const tile = game.pendingSpecial.tile;
  game.stats[`${tile.special}AcceptedCount`] += 1;
  markBoard(tile);
  scoreLines();
  scoreCollections();
  updateWaitingLines();
  elements.modalIcon.classList.add("deciding");
  elements.modalTitle.textContent = tile.special === "chance" ? "看看今晚會發生什麼……" : "命運決定中……";
  elements.modalBody.innerHTML = "<p>夜市的霓虹燈閃了三下……</p>";
  elements.modalActions.replaceChildren();
  updateHUD();
  setTimeout(() => revealSpecialEvent(tile), 700);
}

function revealSpecialEvent(tile) {
  if (game.state !== GAME_STATES.EVENT_REVEAL) return;
  const eventPool = tile.special === "chance" ? CHANCE_EVENTS : DESTINY_EVENTS;
  const specialEvent = weightedRandom(eventPool);
  const result = executeEvent(specialEvent);
  game.pendingSpecial.eventId = specialEvent.id;
  game.pendingSpecial.result = result;
  elements.modalIcon.classList.remove("deciding");
  elements.modalKicker.textContent = tile.special === "chance" ? "機會降臨" : "命運揭曉";
  elements.modalTitle.textContent = `【${specialEvent.title}】`;
  elements.modalBody.innerHTML = `<p class="event-story">${specialEvent.story}</p><p class="event-effect">${result.effectLabel}</p>`;
  renderModalActions([{ label: "繼續", action: finishSpecialEvent }]);
  updateHUD();
}

const EVENT_EFFECT_HANDLERS = {
  score(event) {
    const before = game.score;
    addScore(event.value);
    const actual = game.score - before;
    if (actual >= 0) game.stats.eventScoreGain += actual;
    else game.stats.eventScoreLoss += Math.abs(actual);
    return { effectLabel: `${actual >= 0 ? "+" : ""}${actual} 分` };
  },
  randomScore(event) {
    const value = Math.floor(Math.random() * (event.value[1] - event.value[0] + 1)) + event.value[0];
    addScore(value);
    game.stats.eventScoreGain += value;
    return { effectLabel: `+${value} 分` };
  },
  rounds(event) {
    const before = game.roundsLeft;
    game.roundsLeft = Math.min(6, game.roundsLeft + event.value);
    const actual = game.roundsLeft - before;
    game.stats.extraRoundsFromEvents += actual;
    return { effectLabel: `+${actual} 局（上限 6）` };
  },
  loseRound(event) {
    const before = game.roundsLeft;
    game.roundsLeft = Math.max(0, game.roundsLeft - event.value);
    return { effectLabel: `-${before - game.roundsLeft} 局` };
  },
  halveRoundScore() {
    const loss = Math.min(game.score, Math.max(0, Math.floor(game.round.roundScore / 2)));
    game.score -= loss;
    game.round.roundScore -= loss;
    game.stats.totalScore = game.score;
    game.stats.eventScoreLoss += loss;
    return { effectLabel: `本局分數減半（-${loss} 分）` };
  },
  nextLineDouble() {
    game.round.nextLineDouble = true;
    return { effectLabel: "下一條正式連線分數 ×2" };
  },
  roundLineDouble() {
    game.round.lineMultiplier = 2;
    return { effectLabel: "本局之後正式連線分數 ×2" };
  },
  endRound() { return { effectLabel: "本局立即結束", endRound: true }; },
  gameOver() { game.roundsLeft = 0; game.stats.gameOverByEvent = true; return { effectLabel: "立即結束整場遊戲", gameOver: true }; }
};

function executeEvent(event) {
  return EVENT_EFFECT_HANDLERS[event.effectType](event);
}

function finishSpecialEvent() {
  if (game.state !== GAME_STATES.EVENT_REVEAL) return;
  const result = game.pendingSpecial.result;
  game.pendingSpecial = null;
  closeModal();
  if (result.gameOver) return showGameOver();
  if (result.endRound) return endRound(false, false);
  game.state = GAME_STATES.DRAWING;
  updateHUD();
  continueAfterDraw();
}

function endRound(hadBonus, bonusSuccess) {
  game.state = GAME_STATES.ROUND_END;
  recordRoundHighs();
  updateHUD();
  const bonusText = hadBonus ? `<p><strong>${bonusSuccess ? "補牌成功！+1 局" : "補牌未中"}</strong></p>` : "";
  openModal({
    icon: bonusSuccess ? "＋1" : "🀄", kicker: `第 ${game.roundsPlayed} 局結算`, title: "本局結束",
    body: `${bonusText}<p>本局得分 <strong>${game.round.roundScore}</strong><br>完成連線 <strong>${game.round.roundLines}</strong><br>完成得分成就 <strong>${game.round.achievements.size}</strong></p>`,
    actions: [{ label: game.roundsLeft > 0 ? "下一局" : "查看最終成績", action: game.roundsLeft > 0 ? startRound : showGameOver }]
  });
}

function showGameOver() {
  game.state = GAME_STATES.GAME_OVER;
  game.busy = false;
  recordRoundHighs();
  updateHUD();
  openModal({
    icon: "🏆", kicker: "NIGHT MARKET RESULT", title: "夜市摸麻將成績單",
    body: buildScoreReport(),
    actions: [{ label: "再玩一次", action: resetGame }, { label: "回主選單", className: "secondary", action: returnToMainMenu }]
  });
}

function recordRoundHighs() {
  if (!game.round) return;
  game.stats.highestRoundScore = Math.max(game.stats.highestRoundScore, game.round.roundScore);
  game.stats.highestRoundLines = Math.max(game.stats.highestRoundLines, game.round.roundLines);
  game.stats.totalScore = game.score;
  game.stats.totalLines = game.totalLines;
}

function buildScoreReport() {
  const s = game.stats;
  const config = GAME_MODE_CONFIG[game.mode];
  const successRate = s.bonusDrawCount ? (s.bonusSuccessCount / s.bonusDrawCount * 100).toFixed(1) : "0.0";
  const counts = [s.multiplier1Count, s.multiplier2Count, s.multiplier3Count];
  const favorite = counts.every(value => value === 0) ? "—" : `${counts.indexOf(Math.max(...counts)) + 1}x`;
  const earlyEnd = s.gameOverByEvent ? '<p class="report-warning">本場因特殊事件提前結束</p>' : "";
  const eventSection = config.eventsEnabled ? `<section><h3>機會／命運</h3><p>機會 摸到／接受／丟掉：<strong>${s.chanceDrawCount}／${s.chanceAcceptedCount}／${s.chanceDiscardedCount}</strong><br>命運 摸到／接受／丟掉：<strong>${s.destinyDrawCount}／${s.destinyAcceptedCount}／${s.destinyDiscardedCount}</strong><br>事件增加次數：<strong>${s.extraRoundsFromEvents}</strong><br>事件加分：<strong>+${s.eventScoreGain}</strong><br>事件扣分：<strong>-${s.eventScoreLoss}</strong></p></section>` : "";
  return `<div class="report-grid">
    <section><h3>總成績</h3><p>遊戲模式：<strong>${config.label}</strong><br>每局摸牌：<strong>${config.handSize}</strong> 張<br>最終總分 <strong>${game.score}</strong><br>正式連線 <strong>${game.totalLines}</strong> 條<br>實際遊玩 <strong>${s.roundsPlayed}</strong> 局<br>總消耗次數 <strong>${s.totalRoundCost}</strong><br>最高單局分數 <strong>${s.highestRoundScore}</strong><br>最高單局連線 <strong>${s.highestRoundLines}</strong></p>${earlyEnd}</section>
    <section><h3>牌型成就</h3><p>萬子 5／7 張：<strong>${s.wan5Count}／${s.wan7Count}</strong><br>筒子 5／7 張：<strong>${s.tong5Count}／${s.tong7Count}</strong><br>索子 5／7 張：<strong>${s.suo5Count}／${s.suo7Count}</strong><br>四風／三元：<strong>${s.fourWindsCount}／${s.threeDragonsCount}</strong><br>成就總數：<strong>${s.totalAchievements}</strong></p></section>
    <section><h3>聽牌與補牌</h3><p>形成聽牌：<strong>${s.waitingCount}</strong><br>進入補牌：<strong>${s.bonusDrawCount}</strong><br>補牌成功：<strong>${s.bonusSuccessCount}</strong><br>成功率：<strong>${successRate}%</strong><br>實際增加次數：<strong>${s.extraRoundsFromBonus}</strong></p></section>
    ${eventSection}
    <section><h3>倍率統計</h3><p>1x：<strong>${s.multiplier1Count}</strong> 局<br>2x：<strong>${s.multiplier2Count}</strong> 局<br>3x：<strong>${s.multiplier3Count}</strong> 局<br>最常使用：<strong>${favorite}</strong></p></section>
  </div>`;
}

function getProgress() {
  const drawn = GAME_MODE_CONFIG[game.mode].tiles.filter(tile => game.round && isOfficiallyDrawn(tile.id));
  const suits = Object.entries(SUIT_NAMES).map(([suit, name]) => {
    const count = drawn.filter(tile => tile.suit === suit).length;
    const score = count >= 7 ? 500 : count >= 5 ? 200 : 0;
    return { label: name, value: `${Math.min(count, 7)} / 7${score ? ` ✓ +${score}` : ""}`, done: count >= 5 };
  });
  const winds = ["east", "south", "west", "north"].filter(id => game.round && isOfficiallyDrawn(id)).length;
  const dragons = ["red", "green", "white"].filter(id => game.round && isOfficiallyDrawn(id)).length;
  return [...suits, { label: "四風", value: `${winds} / 4${winds === 4 ? " ✓ +500" : ""}`, done: winds === 4 }, { label: "三元", value: `${dragons} / 3${dragons === 3 ? " ✓ +500" : ""}`, done: dragons === 3 }];
}

function renderProgress() {
  const html = getProgress().map(item => `<div class="progress-item${item.done ? " done" : ""}"><b>${item.label}</b><span>${item.value}</span></div>`).join("");
  elements.progressList.innerHTML = html;
  elements.mobileProgressList.innerHTML = html;
}

function updateHUD() {
  if (!game) return;
  elements.totalScore.textContent = game.score;
  elements.roundScore.textContent = game.round?.roundScore ?? 0;
  elements.totalLines.textContent = game.totalLines;
  elements.roundsLeft.textContent = game.roundsLeft;
  elements.desktopScore.textContent = game.score;
  elements.desktopRoundScore.textContent = game.round?.roundScore ?? 0;
  elements.desktopLines.textContent = game.totalLines;
  elements.desktopRounds.textContent = game.roundsLeft;
  elements.drawCount.textContent = game.round?.drawIndex ?? 0;
  const config = GAME_MODE_CONFIG[game.mode];
  elements.roundLabel.textContent = `第 ${game.roundsPlayed + (game.round?.started ? 0 : 1)} 局`;
  elements.stateBadge.textContent = ({ DRAWING: "摸牌中", EVENT_CHOICE: "事件選擇", EVENT_REVEAL: "事件揭曉", BONUS_DRAW: "補牌", ROUND_END: "本局結算", GAME_OVER: "遊戲結束", READY: "準備" })[game.state];
  const multiplierText = `×${game.round?.roundMultiplier ?? 1}`;
  elements.mobileMultiplier.textContent = multiplierText;
  elements.desktopMultiplier.textContent = multiplierText;
  elements.multiplierBadge.textContent = multiplierText;
  elements.modeLabel.textContent = config.label;
  elements.mobileModeLabel.textContent = config.shortLabel;
  elements.handSize.textContent = config.handSize;
  const modeRule = config.eventsEnabled ? `每局 ${config.handSize} 張，包含機會／命運` : `每局 ${config.handSize} 張，無事件，專注連線與牌型`;
  elements.modeRule.querySelector("span").textContent = modeRule;
  elements.mobileModeRule.querySelector("span").textContent = modeRule;
  elements.eventGuideButton.classList.toggle("hidden", !config.eventsEnabled);
  elements.mobileEventGuide.classList.toggle("hidden", !config.eventsEnabled);
  const multiplier = game.round?.roundMultiplier ?? 1;
  const leverageLocked = game.state !== GAME_STATES.DRAWING || game.round?.started;
  const leverageLabel = game.round?.started ? `${multiplier}x` : multiplier === 1 ? "開槓桿" : `${multiplier}x · 可調整`;
  [elements.leverageButton, elements.mobileLeverageButton].forEach(button => {
    button.disabled = leverageLocked;
    button.textContent = leverageLabel;
    button.classList.remove("multiplier-x1", "multiplier-x2", "multiplier-x3", "leverage-locked");
    button.classList.add(`multiplier-x${multiplier}`);
    button.classList.toggle("leverage-locked", Boolean(game.round?.started));
  });
  updateDrawStackUI();
  elements.roundLights.replaceChildren();
  for (let i = 0; i < 6; i += 1) {
    const light = document.createElement("i");
    light.className = `round-light${i < game.roundsLeft ? " on" : ""}`;
    elements.roundLights.append(light);
  }
  elements.roundLights.setAttribute("aria-label", `剩餘 ${game.roundsLeft} 局`);
  renderProgress();
}

function updateDrawStackUI() {
  if (!game.round) return;
  const total = GAME_MODE_CONFIG[game.mode].handSize;
  const drawn = game.round.drawIndex;
  const remaining = Math.max(0, total - drawn);
  const prompt = remaining === 0 ? "本局摸牌完成" : drawn === 0 ? "點擊牌堆開始本局" : remaining === 1 ? "最後一張" : "再摸一張";
  elements.drawPrompt.textContent = prompt;
  elements.drawProgress.textContent = `已摸 ${drawn} / ${total}`;
  elements.drawRemaining.textContent = `剩餘 ${remaining} 張`;
  elements.drawStack.setAttribute("aria-label", remaining ? `摸牌牌堆，剩餘 ${remaining} 張，${prompt}` : "本局摸牌完成，牌堆已空");
  elements.drawStack.disabled = remaining === 0 || game.state !== GAME_STATES.DRAWING || game.busy || game.uiOverlayOpen;
  elements.drawStack.classList.remove("stack-thick", "stack-thin", "stack-single", "stack-empty");
  elements.drawStack.classList.add(remaining === 0 ? "stack-empty" : remaining === 1 ? "stack-single" : remaining <= 4 ? "stack-thin" : "stack-thick");
}

function notifyScore(text, waiting = false) {
  const toast = document.createElement("div");
  toast.className = `score-toast${waiting ? " wait-toast" : ""}`;
  toast.textContent = text;
  elements.toastStack.append(toast);
  setTimeout(() => toast.remove(), 1500);
}

function openModal({ icon, kicker, title, body, actions }) {
  elements.modalIcon.classList.remove("deciding");
  elements.modalIcon.textContent = icon;
  elements.modalKicker.textContent = kicker;
  elements.modalTitle.textContent = title;
  elements.modalBody.innerHTML = body;
  renderModalActions(actions);
  elements.modal.classList.add("open");
  elements.modal.setAttribute("aria-hidden", "false");
  elements.modalActions.querySelector("button")?.focus();
}

function renderModalActions(actions) {
  elements.modalActions.replaceChildren();
  actions.forEach(action => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    if (action.className) button.className = action.className;
    button.disabled = Boolean(action.disabled);
    button.addEventListener("click", action.action, { once: true });
    elements.modalActions.append(button);
  });
}

function eventEffectDescription(event) {
  const descriptions = {
    score: `${event.value >= 0 ? "+" : ""}${event.value} 分`,
    randomScore: `隨機 +${event.value[0]}～+${event.value[1]} 分`,
    rounds: `+${event.value} 次（上限 6）`, loseRound: `失去 ${event.value} 次`,
    halveRoundScore: "本局目前分數 -50%", nextLineDouble: "下一條正式連線 ×2",
    roundLineDouble: "本局後續正式連線 ×2", endRound: "立即結束本局",
    gameOver: "立即 GAME OVER"
  };
  return descriptions[event.effectType];
}

function buildEventGuideSection(title, events) {
  const totalWeight = events.reduce((sum, event) => sum + event.weight, 0);
  return `<section class="event-guide-section"><h3>${title}</h3><div class="event-guide-list">${events.map(event => {
    const probability = (event.weight / totalWeight * 100).toFixed(1);
    const danger = event.effectType === "gameOver" ? " danger" : "";
    return `<article class="event-guide-item${danger}"><h4>${event.title}</h4><p>${event.story}</p><footer><b>${eventEffectDescription(event)}</b><span>Weight ${event.weight}｜${probability}%</span></footer></article>`;
  }).join("")}</div></section>`;
}

function openEventGuide() {
  if (!GAME_MODE_CONFIG[game.mode].eventsEnabled || game.state !== GAME_STATES.DRAWING || game.busy || game.uiOverlayOpen) return;
  game.uiOverlayOpen = true;
  openModal({
    icon: "覽", kicker: "WEIGHTED EVENT GUIDE", title: "機會／命運事件一覽",
    body: `<div class="event-guide">${buildEventGuideSection("機會", CHANCE_EVENTS)}${buildEventGuideSection("命運", DESTINY_EVENTS)}</div>`,
    actions: [{ label: "關閉並繼續遊戲", action: closeEventGuide }]
  });
}

function closeEventGuide() {
  game.uiOverlayOpen = false;
  closeModal();
}

function closeModal() {
  elements.modal.classList.remove("open");
  elements.modal.setAttribute("aria-hidden", "true");
}

function enableGlyphFallback() {
  if (!document.fonts?.check) {
    document.documentElement.classList.add("no-mahjong-glyphs");
    return;
  }
  const fontFamilies = ["Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2"];
  const supported = fontFamilies.some(font => document.fonts.check(`32px "${font}"`, "🀇"));
  document.documentElement.classList.toggle("no-mahjong-glyphs", !supported);
  if (!supported) document.querySelectorAll(".hidden-fallback").forEach(item => item.classList.remove("hidden-fallback"));
}

function resetGame() {
  const mode = game.mode;
  game = freshGameState(mode);
  elements.modeSelect.classList.add("hidden");
  elements.gameShell.classList.remove("hidden");
  startRound();
  enableGlyphFallback();
}

function selectMode(mode) {
  if (!GAME_MODE_CONFIG[mode]) return;
  game = freshGameState(mode);
  elements.modeSelect.classList.add("hidden");
  elements.gameShell.classList.remove("hidden");
  startRound();
  enableGlyphFallback();
}

function showModeSelect() {
  closeModal();
  closeBonusModal();
  elements.gameShell.classList.add("hidden");
  elements.modeSelect.classList.remove("hidden");
}

function requestMainMenu() {
  if (game.state === GAME_STATES.GAME_OVER) return returnToMainMenu();
  if (game.busy || game.uiOverlayOpen || game.state !== GAME_STATES.DRAWING) return;
  game.uiOverlayOpen = true;
  openModal({
    icon: "↩", kicker: "返回主選單", title: "確定離開目前遊戲？",
    body: "<p>目前遊戲進度與成績將會消失。</p>",
    actions: [{ label: "繼續遊戲", className: "secondary", action: cancelMainMenu }, { label: "確定返回", action: returnToMainMenu }]
  });
}

function cancelMainMenu() { game.uiOverlayOpen = false; closeModal(); }

function returnToMainMenu() {
  game = freshGameState(null);
  showModeSelect();
}

elements.eventGuideButton.addEventListener("click", openEventGuide);
elements.mobileEventGuide.addEventListener("click", openEventGuide);
elements.leverageButton.addEventListener("click", openLeverage);
elements.mobileLeverageButton.addEventListener("click", openLeverage);
elements.drawStack.addEventListener("click", drawTile);
elements.mainMenuButton.addEventListener("click", requestMainMenu);
elements.mobileMainMenuButton.addEventListener("click", requestMainMenu);
document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => selectMode(button.dataset.mode)));
game = freshGameState(null);
showModeSelect();
