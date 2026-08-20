const GAME_STATES = Object.freeze({
  MODE_SELECT: "MODE_SELECT", READY: "READY", DRAWING: "DRAWING", EVENT_CHOICE: "EVENT_CHOICE",
  EVENT_REVEAL: "EVENT_REVEAL", BONUS_PENDING: "BONUS_PENDING", BONUS_DRAW: "BONUS_DRAW",
  ROUND_END: "ROUND_END", GAME_OVER: "GAME_OVER"
});

const RULES = Object.freeze({ initialAttempts: 6, bonusChoices: 3 });
const PLAYER_NAME_STORAGE_KEY = "momajohnPlayerName";
const NUMERALS = "一二三四五六七八九";
const SUIT_NAMES = Object.freeze({ wan: "萬子", tong: "筒子", suo: "條子" });

const CORE_TILES = [
  ...Array.from({ length: 9 }, (_, i) => ({ id: `wan-${i + 1}`, label: `${NUMERALS[i]}萬`, glyph: String.fromCodePoint(0x1f007 + i), suit: "wan" })),
  ...Array.from({ length: 9 }, (_, i) => ({ id: `tong-${i + 1}`, label: `${NUMERALS[i]}筒`, glyph: String.fromCodePoint(0x1f019 + i), suit: "tong" })),
  ...Array.from({ length: 9 }, (_, i) => ({ id: `suo-${i + 1}`, label: `${NUMERALS[i]}條`, glyph: String.fromCodePoint(0x1f010 + i), suit: "suo" })),
  { id: "east", label: "東", glyph: "🀀", group: "wind" }, { id: "south", label: "南", glyph: "🀁", group: "wind" },
  { id: "west", label: "西", glyph: "🀂", group: "wind" }, { id: "north", label: "北", glyph: "🀃", group: "wind" },
  { id: "red", label: "中", glyph: "🀄", group: "dragon" }, { id: "green", label: "發", glyph: "🀅", group: "dragon" },
  { id: "white", label: "白", glyph: "🀆", group: "dragon" }
];
const STANDARD_TILES = [...CORE_TILES,
  { id: "event-1", label: "事件", glyph: "事件", special: "event" },
  { id: "event-2", label: "事件", glyph: "事件", special: "event" }
];
const CARNIVAL_TILES = [...CORE_TILES,
  { id: "plum", label: "梅", glyph: "🀢", flower: true },
  { id: "orchid", label: "蘭", glyph: "🀣", flower: true }
];
const GAME_MODE_CONFIG = Object.freeze({
  standard: { id: "standard", label: "標準模式", shortLabel: "標準", handSize: 15, eventsEnabled: true, tiles: STANDARD_TILES },
  carnival: { id: "carnival", label: "狂歡模式", shortLabel: "狂歡 🔥", handSize: 16, eventsEnabled: false, tiles: CARNIVAL_TILES }
});

const elements = Object.fromEntries([
  "board", "draw-stack", "draw-prompt", "draw-progress", "draw-remaining", "total-score", "round-score", "total-lines", "rounds-left", "mobile-multiplier", "mobile-bet-count", "mobile-player-name",
  "desktop-score", "desktop-round-score", "desktop-lines", "desktop-rounds", "round-label", "state-badge",
  "desktop-multiplier", "multiplier-badge", "desktop-bet-count", "desktop-player-name", "player-name-input", "player-name-error", "event-guide-button", "mobile-event-guide", "leverage-button", "mobile-leverage-button",
  "main-menu-button", "mobile-main-menu-button", "mode-select", "game-shell", "mode-label", "mobile-mode-label", "hand-size",
  "mode-rule", "mobile-mode-rule", "flower-rule", "mobile-flower-rule",
  "final-waiting-overlay", "final-waiting-title", "final-waiting-missing",
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

function freshGameState(mode = null, playerName = "") {
  const betStats = Object.fromEntries(BET_DEFINITIONS.map(bet => [bet.id, { played: 0, won: 0, lost: 0 }]));
  return {
    mode, playerName, state: mode ? GAME_STATES.READY : GAME_STATES.MODE_SELECT, score: 0, totalLines: 0,
    totalAttemptsGranted: RULES.initialAttempts, attemptsConsumed: 0, roundsPlayed: 0,
    achievementCount: 0, round: null, busy: false, pendingSpecial: null, uiOverlayOpen: false,
    stats: {
      totalScore: 0, totalLines: 0, roundsPlayed: 0, totalRoundCost: 0,
      multiplier1Count: 0, multiplier2Count: 0, multiplier3Count: 0,
      wan5Count: 0, wan7Count: 0, wan9Count: 0, tong5Count: 0, tong7Count: 0, tong9Count: 0,
      tiao5Count: 0, tiao7Count: 0, tiao9Count: 0,
      fourWindsCount: 0, threeDragonsCount: 0, flowersCount: 0, waitingCount: 0,
      bonusDrawCount: 0, bonusSuccessCount: 0, extraRoundsFromBonus: 0,
      eventTriggeredCount: 0, directEventCount: 0, choiceEventCount: 0,
      boardReplaceEventCount: 0, boardRemoveEventCount: 0,
      extraRoundsFromEvents: 0, eventScoreGain: 0, eventScoreLoss: 0, eventEarlyEndCount: 0, gameOverByEvent: false,
      betsPlaced: 0, betsWon: 0, betsLost: 0, betScoreGain: 0, betScoreLoss: 0, betStats,
      highestRoundScore: 0, highestRoundLines: 0, totalAchievements: 0
    }
  };
}

function createRound() {
  const config = GAME_MODE_CONFIG[game.mode];
  const board = shuffle(config.tiles);
  const order = shuffle(config.tiles);
  return {
    board, hand: order.slice(0, config.handSize), remaining: order.slice(config.handSize), drawIndex: 0, drawn: new Set(), discarded: new Set(), started: false, attemptStart: game.attemptsConsumed,
    completedLines: new Set(), activeWaiting: new Set(), announcedWaiting: new Set(), achievements: new Set(),
    roundScore: 0, roundLines: 0, roundMultiplier: 1, activeBets: [], betsSettled: false, betResults: [], everWaited: false,
    lineMultiplier: 1, nextLineDouble: false,
    bonusMissing: new Set(), bonusCandidates: [], selectedBonusTiles: [], bonusResolved: false, bonusPendingStarted: false
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
  closeFinalWaitingPrompt();
  game.round = createRound();
  game.state = GAME_STATES.DRAWING;
  game.busy = false;
  game.pendingSpecial = null;
  renderBoard();
  elements.message.textContent = "本局預設 ×1；可在第一張牌前設定槓桿與下注";
  updateHUD();
}

function attemptsRemaining() { return Math.max(0, game.totalAttemptsGranted - game.attemptsConsumed); }
function betPenalty(bet) { return Math.abs(Number(bet.penalty) || 0); }
function selectedBetRisk(ids) { return ids.reduce((sum, id) => sum + betPenalty(BET_DEFINITIONS.find(bet => bet.id === id) ?? {}), 0); }
function attemptDisplay() {
  const duringRound = game.round?.started && ![GAME_STATES.ROUND_END, GAME_STATES.GAME_OVER].includes(game.state);
  const numerator = duringRound ? game.round.attemptStart + 1 : Math.min(game.attemptsConsumed + 1, game.totalAttemptsGranted);
  return `${numerator} / ${game.totalAttemptsGranted}`;
}

function openLeverage() {
  if (game.state !== GAME_STATES.DRAWING || game.round.started || game.busy || game.uiOverlayOpen) return;
  game.uiOverlayOpen = true;
  const currentBets = new Set(game.round.activeBets);
  const multiplierOptions = [1, 2, 3].map(multiplier => `<label class="bet-option multiplier-option"><input type="radio" name="round-multiplier" value="${multiplier}" ${game.round.roundMultiplier === multiplier ? "checked" : ""} ${multiplier > attemptsRemaining() ? "disabled" : ""}><b>${multiplier}x</b><span>消耗 ${multiplier} 次${multiplier === 3 ? "・高風險" : ""}</span></label>`).join("");
  const betOptions = BET_DEFINITIONS.filter(bet => bet.enabled).map(bet => {
    const penalty = betPenalty(bet);
    const checked = currentBets.has(bet.id);
    const disabled = !checked && penalty > game.score;
    return `<label class="bet-option${disabled ? " bet-unavailable" : ""}"><input type="checkbox" name="active-bet" value="${bet.id}" data-penalty="${penalty}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}><span><b>${bet.title}</b><small>${bet.description}<br>成功 +${bet.reward}｜失敗 -${penalty}<br>門檻 ${penalty} 分${disabled ? `｜目前 ${game.score}｜🔒 分數不足` : ""}</small></span></label>`;
  }).join("");
  openModal({
    icon: "注", kicker: `遊玩次數 ${attemptDisplay()}・剩餘 ${attemptsRemaining()} 次`, title: "本局下注",
    body: `<div class="betting-panel"><section><h3>本局倍率</h3><p>影響連線與牌型成就，第一次摸牌才消耗次數。</p><div class="multiplier-options">${multiplierOptions}</div></section><section><h3>額外下注</h3><p>可複選；總分必須足以承擔所有下注的最大損失。</p><div class="bet-options">${betOptions}</div></section><aside class="bet-risk-summary"><p>目前分數 <strong data-risk-score>${game.score}</strong></p><p>最大可能損失 <strong data-risk-total>0</strong></p><p>下注後最低可能剩餘 <strong data-risk-remaining>${game.score}</strong></p><p class="bet-risk-message" data-risk-message aria-live="polite"></p></aside></div>`,
    actions: [{ label: "取消", className: "secondary", action: closeLeverage }, { label: "確認下注", action: confirmLeverage }]
  });
  setupBettingControls();
}

function setupBettingControls() {
  const inputs = [...elements.modalBody.querySelectorAll('input[name="active-bet"]')];
  const message = elements.modalBody.querySelector("[data-risk-message]");
  const updateRisk = () => {
    const selected = inputs.filter(input => input.checked).map(input => input.value);
    const risk = selectedBetRisk(selected);
    elements.modalBody.querySelector("[data-risk-total]").textContent = risk;
    elements.modalBody.querySelector("[data-risk-remaining]").textContent = Math.max(0, game.score - risk);
    inputs.forEach(input => {
      if (input.checked) return;
      const unavailable = risk + Number(input.dataset.penalty) > game.score;
      input.disabled = unavailable;
      input.closest(".bet-option")?.classList.toggle("bet-unavailable", unavailable);
    });
  };
  inputs.forEach(input => input.addEventListener("change", () => {
    const selected = inputs.filter(item => item.checked).map(item => item.value);
    if (selectedBetRisk(selected) > game.score) {
      input.checked = false;
      message.textContent = "目前分數不足以承擔這項下注。";
    } else message.textContent = "";
    updateRisk();
  }));
  updateRisk();
}

function confirmLeverage() {
  const multiplier = Number(elements.modalBody.querySelector('input[name="round-multiplier"]:checked')?.value ?? 1);
  if (game.state !== GAME_STATES.DRAWING || game.round.started || multiplier > attemptsRemaining()) return;
  const selectedBets = [...elements.modalBody.querySelectorAll('input[name="active-bet"]:checked')].map(input => input.value);
  if (selectedBetRisk(selectedBets) > game.score) {
    elements.modalBody.querySelector("[data-risk-message]").textContent = "目前分數不足以承擔這組下注。";
    return;
  }
  game.round.roundMultiplier = multiplier;
  game.round.activeBets = selectedBets;
  game.uiOverlayOpen = false;
  closeModal();
  elements.message.textContent = `已設定 ×${multiplier}、下注 ${game.round.activeBets.length} 項；第一次摸牌後鎖定`;
  updateHUD();
}

function closeLeverage() { game.uiOverlayOpen = false; closeModal(); }

function tileContent(tile) {
  if (tile.special) {
    return `<span class="special-face" aria-hidden="true"><b>事</b><small>${tile.label}</small></span>`;
  }
  return `<span class="glyph" aria-hidden="true">${tile.glyph}</span><span class="text-fallback hidden-fallback" aria-hidden="true">${tile.label}</span>`;
}

function tileClass(tile, base) {
  if (!tile.special) return base;
  return `${base} special special-tile event-tile`;
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
  const isBonusTile = button.classList.contains("bonus-tile");
  button.innerHTML = tileContent(tile);
  button.title = tile.label;
  button.className = tileClass(tile, "hand-tile revealed");
  if (isBonusTile) button.classList.add("bonus-tile");
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
  game.attemptsConsumed = Math.min(game.totalAttemptsGranted, game.attemptsConsumed + multiplier);
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
    const base = ordinal === 1 ? SCORE_CONFIG.line.first : ordinal === 2 ? SCORE_CONFIG.line.second : SCORE_CONFIG.line.thirdPlus;
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
    if (count >= 5) awardOnce(`${suit}-5`, SCORE_CONFIG.suit.five, `${name} 5 張！`, SCORE_CONFIG.suit.five);
    if (count >= 7) awardOnce(`${suit}-7`, SCORE_CONFIG.suit.seven - SCORE_CONFIG.suit.five, `${name} 7 張！`, SCORE_CONFIG.suit.seven);
    if (count >= 9) awardOnce(`${suit}-9`, SCORE_CONFIG.suit.nine - SCORE_CONFIG.suit.seven, `${name} 9 張！`, SCORE_CONFIG.suit.nine);
  }
  if (["east", "south", "west", "north"].every(isOfficiallyDrawn)) awardOnce("winds", SCORE_CONFIG.honor.fourWinds, "四風齊聚！");
  if (["red", "green", "white"].every(isOfficiallyDrawn)) awardOnce("dragons", SCORE_CONFIG.honor.threeDragons, "三元到手！");
  if (game.mode === "carnival" && ["plum", "orchid"].every(isOfficiallyDrawn)) awardOnce("flowers", SCORE_CONFIG.honor.flowers, "梅蘭齊聚！");
}

function awardOnce(id, points, label, suitTotalBase = null) {
  if (game.round.achievements.has(id)) return;
  game.round.achievements.add(id);
  game.achievementCount += 1;
  game.stats.totalAchievements += 1;
  const statKey = ({ "wan-5": "wan5Count", "wan-7": "wan7Count", "wan-9": "wan9Count", "tong-5": "tong5Count", "tong-7": "tong7Count", "tong-9": "tong9Count", "suo-5": "tiao5Count", "suo-7": "tiao7Count", "suo-9": "tiao9Count", winds: "fourWindsCount", dragons: "threeDragonsCount", flowers: "flowersCount" })[id];
  if (statKey) game.stats[statKey] += 1;
  const multipliedPoints = points * game.round.roundMultiplier;
  addScore(multipliedPoints);
  const message = suitTotalBase === null
    ? `${label} +${multipliedPoints}`
    : `${label}基礎獎勵${suitTotalBase === SCORE_CONFIG.suit.five ? "" : "提升"}至 ${suitTotalBase} 分（+${multipliedPoints}）`;
  notifyScore(message, { type: "achievement", duration: 2500 });
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
  const previousWaitingIds = new Set(game.round.activeWaiting);
  const waiting = currentWaitingLines();
  const currentWaitingIds = new Set(waiting.map(line => line.id));
  game.round.activeWaiting = currentWaitingIds;
  elements.board.querySelectorAll(".tile.waiting").forEach(cell => cell.classList.remove("waiting"));
  const newlyWaiting = waiting.filter(line => !previousWaitingIds.has(line.id) && !game.round.announcedWaiting.has(line.id));
  newlyWaiting.forEach(line => {
    game.round.announcedWaiting.add(line.id);
    flashLine(line, "waiting");
  });
  if (newlyWaiting.length) {
    game.round.everWaited = true;
    game.stats.waitingCount += newlyWaiting.length;
    const label = newlyWaiting.length === 1 ? "聽牌！" : newlyWaiting.length === 2 ? "雙聽！" : `聽牌 ×${newlyWaiting.length}`;
    notifyScore(label, true);
  }
}

function flashLine(line, className) {
  line.indexes.forEach(index => elements.board.children[index]?.classList.add(className));
  if (className === "line-flash") setTimeout(() => line.indexes.forEach(index => elements.board.children[index]?.classList.remove(className)), 750);
  if (className === "waiting") setTimeout(() => line.indexes.forEach(index => elements.board.children[index]?.classList.remove(className)), 1850);
}

function continueAfterDraw() {
  if (game.state !== GAME_STATES.DRAWING) return;
  if (game.round.drawIndex === GAME_MODE_CONFIG[game.mode].handSize) setTimeout(finishRegularDraws, 250);
}

function findWaitingMissingTiles() {
  const missing = new Set();
  LINE_DEFINITIONS.filter(line => game.round.activeWaiting.has(line.id))
    .forEach(line => lineTileIds(line).filter(id => !isOfficiallyDrawn(id)).forEach(id => missing.add(id)));
  return missing;
}

function finishRegularDraws() {
  if (game.state !== GAME_STATES.DRAWING) return;
  updateWaitingLines();
  game.round.bonusMissing = findWaitingMissingTiles();
  if (game.round.activeWaiting.size > 0 && game.round.bonusMissing.size > 0) startBonusPending();
  else endRound(false, false);
}

function startBonusPending() {
  if (game.state !== GAME_STATES.DRAWING || game.round.bonusPendingStarted) return;
  game.round.bonusPendingStarted = true;
  game.state = GAME_STATES.BONUS_PENDING;
  game.busy = true;
  updateHUD();
  highlightFinalWaitingLines();
  showFinalWaitingPrompt();
  setTimeout(() => {
    if (game.state !== GAME_STATES.BONUS_PENDING) return;
    closeFinalWaitingPrompt();
  }, 1400);
  setTimeout(() => {
    if (game.state !== GAME_STATES.BONUS_PENDING) return;
    clearFinalWaitingHighlight();
    startBonusDraw();
  }, 1650);
}

function highlightFinalWaitingLines() {
  const activeLines = LINE_DEFINITIONS.filter(line => game.round.activeWaiting.has(line.id));
  activeLines.forEach(line => line.indexes.forEach(index => {
    const cell = elements.board.children[index];
    const tileId = game.round.board[index].id;
    cell?.classList.add(isOfficiallyDrawn(tileId) ? "final-waiting-hit" : "final-waiting-gap");
  }));
}

function clearFinalWaitingHighlight() {
  elements.board.querySelectorAll(".final-waiting-hit,.final-waiting-gap").forEach(cell => {
    cell.classList.remove("final-waiting-hit", "final-waiting-gap");
  });
}

function showFinalWaitingPrompt() {
  const waitingCount = game.round.activeWaiting.size;
  const title = waitingCount === 1 ? "聽牌！" : waitingCount === 2 ? "雙聽！" : `聽牌 ×${waitingCount}`;
  const tiles = GAME_MODE_CONFIG[game.mode].tiles;
  const chips = [...game.round.bonusMissing].map(id => {
    const tile = tiles.find(item => item.id === id);
    if (!tile) return "";
    const symbol = tile.special ? "事" : tile.glyph;
    return `<span><b>${symbol}</b><small>${tile.label}</small></span>`;
  }).join("");
  elements.finalWaitingTitle.textContent = title;
  elements.finalWaitingMissing.innerHTML = `<strong>目前聽：</strong>${chips}`;
  elements.finalWaitingOverlay.classList.add("open");
  elements.finalWaitingOverlay.setAttribute("aria-hidden", "false");
  elements.message.textContent = `${title} 最終確認中`;
}

function closeFinalWaitingPrompt() {
  elements.finalWaitingOverlay.classList.remove("open");
  elements.finalWaitingOverlay.setAttribute("aria-hidden", "true");
}

function startBonusDraw() {
  if (game.state !== GAME_STATES.BONUS_PENDING) return;
  game.state = GAME_STATES.BONUS_DRAW;
  game.busy = false;
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
    game.totalAttemptsGranted += 1;
    game.stats.extraRoundsFromBonus += 1;
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
  game.state = GAME_STATES.EVENT_REVEAL;
  game.pendingSpecial = { tile, resolved: false, result: null };
  game.stats.eventTriggeredCount += 1;
  markBoard(tile);
  scoreLines();
  scoreCollections();
  updateWaitingLines();
  updateHUD();
  openModal({
    icon: "事", kicker: "夜市事件牌", title: "事件揭曉中……",
    body: "<p>夜市的霓虹燈閃了三下……</p>", actions: []
  });
  elements.modalIcon.classList.add("deciding");
  setTimeout(revealSpecialEvent, 700);
}

function revealSpecialEvent() {
  if (game.state !== GAME_STATES.EVENT_REVEAL) return;
  const specialEvent = weightedRandom(EVENT_DEFINITIONS.filter(event => event.enabled));
  game.pendingSpecial.eventId = specialEvent.id;
  elements.modalIcon.classList.remove("deciding");
  elements.modalKicker.textContent = specialEvent.triggerType === "CHOICE" ? "事件選擇" : "事件發生";
  elements.modalTitle.textContent = `【${specialEvent.title}】`;
  elements.modalBody.innerHTML = `<p class="event-story">${specialEvent.story}</p>`;
  if (specialEvent.triggerType === "CHOICE") {
    game.state = GAME_STATES.EVENT_CHOICE;
    game.stats.choiceEventCount += 1;
    renderModalActions(specialEvent.options.map(option => ({ label: option.label, action: () => chooseEventOption(specialEvent, option) })));
  } else {
    game.stats.directEventCount += 1;
    const result = executeEvent(specialEvent);
    game.pendingSpecial.result = result;
    elements.modalBody.innerHTML += `<p class="event-effect">${result.effectLabel}</p>`;
    renderModalActions([{ label: "繼續", action: finishSpecialEvent }]);
  }
  updateHUD();
}

function chooseEventOption(event, option) {
  if (game.state !== GAME_STATES.EVENT_CHOICE) return;
  game.state = GAME_STATES.EVENT_REVEAL;
  const result = executeEvent({ ...event, ...option });
  game.pendingSpecial.result = result;
  elements.modalBody.innerHTML += `<p class="event-effect"><strong>${option.label}</strong><br>${result.effectLabel}</p>`;
  renderModalActions([{ label: "繼續", action: finishSpecialEvent }]);
  updateHUD();
}

const EVENT_EFFECT_HANDLERS = {
  ADD_SCORE(event) {
    const before = game.score;
    addScore(event.value);
    const actual = game.score - before;
    if (event.value >= 0) game.stats.eventScoreGain += event.value;
    else game.stats.eventScoreLoss += Math.abs(event.value);
    return { effectLabel: `${actual >= 0 ? "+" : ""}${actual} 分` };
  },
  SUB_SCORE(event) { return EVENT_EFFECT_HANDLERS.ADD_SCORE({ ...event, value: -Math.abs(event.value) }); },
  RANDOM_SCORE(event) {
    const value = event.randomMode === "PICK"
      ? event.value[Math.floor(Math.random() * event.value.length)]
      : Math.floor(Math.random() * (event.value[1] - event.value[0] + 1)) + event.value[0];
    addScore(value);
    if (value >= 0) game.stats.eventScoreGain += value;
    else game.stats.eventScoreLoss += Math.abs(value);
    return { effectLabel: `${value >= 0 ? "+" : ""}${value} 分` };
  },
  ADD_ROUNDS(event) {
    game.totalAttemptsGranted += event.value;
    game.stats.extraRoundsFromEvents += event.value;
    return { effectLabel: `+${event.value} 次（總次數 ${game.totalAttemptsGranted}）` };
  },
  SUB_ROUNDS(event) {
    const removable = Math.min(event.value, attemptsRemaining());
    game.totalAttemptsGranted = Math.max(game.attemptsConsumed, game.totalAttemptsGranted - removable);
    return { effectLabel: `-${removable} 次` };
  },
  HALVE_ROUND_SCORE() {
    const loss = Math.min(game.score, Math.max(0, Math.floor(game.round.roundScore / 2)));
    game.score -= loss;
    game.round.roundScore -= loss;
    game.stats.totalScore = game.score;
    game.stats.eventScoreLoss += loss;
    return { effectLabel: `本局分數減半（-${loss} 分）` };
  },
  DOUBLE_NEXT_LINE() {
    game.round.nextLineDouble = true;
    return { effectLabel: "下一條正式連線分數 ×2" };
  },
  DOUBLE_FUTURE_LINES() {
    game.round.lineMultiplier = 2;
    return { effectLabel: "本局之後正式連線分數 ×2" };
  },
  END_ROUND() { game.stats.eventEarlyEndCount += 1; return { effectLabel: "本局立即結束", endRound: true }; },
  END_GAME() { game.totalAttemptsGranted = game.attemptsConsumed; game.stats.eventEarlyEndCount += 1; game.stats.gameOverByEvent = true; return { effectLabel: "立即結束整場遊戲", gameOver: true }; },
  REPLACE_DRAWN_TILE(event) {
    const fromId = event.value.from;
    if (!isOfficiallyDrawn(fromId)) return { effectLabel: "五條根本還沒出現，老闆白忙一場。" };
    const candidates = CORE_TILES.filter(tile => tile.suit === event.value.targetSuit && tile.id !== fromId && !isOfficiallyDrawn(tile.id));
    if (!candidates.length) return { effectLabel: "所有條子都已取得，無法替換。" };
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    game.round.drawn.delete(fromId);
    game.round.drawn.add(target.id);
    renderBoard();
    animateBoardStateChange(fromId, "tile-state-removed");
    animateBoardStateChange(target.id, "tile-state-added");
    scoreLines(); scoreCollections(); updateWaitingLines();
    game.stats.boardReplaceEventCount += 1;
    return { effectLabel: `五條熄滅，${target.label}亮起！` };
  },
  REMOVE_DRAWN_TILE() {
    const candidates = CORE_TILES.filter(tile => isOfficiallyDrawn(tile.id));
    if (!candidates.length) return { effectLabel: "目前沒有可移除的普通麻將。" };
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    game.round.drawn.delete(target.id);
    renderBoard(); animateBoardStateChange(target.id, "tile-state-removed"); updateWaitingLines();
    game.stats.boardRemoveEventCount += 1;
    return { effectLabel: `${target.label}被偷偷拿走了！` };
  },
  NONE() { return { effectLabel: "無事發生" }; }
};

function animateBoardStateChange(tileId, className) {
  const cell = elements.board.querySelector(`[data-tile-id="${tileId}"]`);
  cell?.classList.add(className);
}

function executeEvent(event) {
  return (EVENT_EFFECT_HANDLERS[event.effectType] ?? EVENT_EFFECT_HANDLERS.NONE)(event);
}

function finishSpecialEvent() {
  if (game.state !== GAME_STATES.EVENT_REVEAL) return;
  const result = game.pendingSpecial.result;
  game.pendingSpecial = null;
  closeModal();
  if (result.gameOver) return endRound(false, false, true);
  if (result.endRound) return endRound(false, false);
  game.state = GAME_STATES.DRAWING;
  updateHUD();
  continueAfterDraw();
}

function betConditionMet(bet) {
  const handlers = {
    ALL_HONORS: () => bet.conditionValue.every(isOfficiallyDrawn),
    MIN_LINES: () => game.round.roundLines >= bet.conditionValue,
    EVER_WAITED: () => game.round.everWaited
  };
  return Boolean(handlers[bet.conditionType]?.());
}

function settleBets() {
  if (game.round.betsSettled) return game.round.betResults;
  game.round.betsSettled = true;
  game.round.betResults = game.round.activeBets.map(id => {
    const bet = BET_DEFINITIONS.find(item => item.id === id);
    if (!bet) return null;
    const won = betConditionMet(bet);
    const requested = won ? bet.reward : -bet.penalty;
    const before = game.score;
    addScore(requested);
    const actual = game.score - before;
    const stat = game.stats.betStats[id];
    game.stats.betsPlaced += 1;
    game.stats[won ? "betsWon" : "betsLost"] += 1;
    game.stats[won ? "betScoreGain" : "betScoreLoss"] += won ? bet.reward : betPenalty(bet);
    stat.played += 1; stat[won ? "won" : "lost"] += 1;
    return { bet, won, points: actual };
  }).filter(Boolean);
  return game.round.betResults;
}

function endRound(hadBonus, bonusSuccess, forceGameOver = false) {
  game.state = GAME_STATES.ROUND_END;
  const betResults = settleBets();
  recordRoundHighs();
  updateHUD();
  const bonusText = hadBonus ? `<p><strong>${bonusSuccess ? "補牌成功！+1 局" : "補牌未中"}</strong></p>` : "";
  const betNet = betResults.reduce((sum, result) => sum + result.points, 0);
  const betText = betResults.length ? `<section class="bet-settlement"><h3>下注結算</h3>${betResults.map(result => `<p><b>${result.bet.title}</b><span>${result.won ? "成功" : "失敗"} ${result.points >= 0 ? "+" : ""}${result.points}</span></p>`).join("")}<strong>下注淨收益：${betNet >= 0 ? "+" : ""}${betNet}</strong></section>` : "";
  const gameEnded = forceGameOver || attemptsRemaining() === 0;
  openModal({
    icon: bonusSuccess ? "＋1" : "🀄", kicker: `第 ${game.roundsPlayed} 局結算`, title: "本局結束",
    body: `${bonusText}<p>本局得分 <strong>${game.round.roundScore}</strong><br>完成連線 <strong>${game.round.roundLines}</strong><br>完成得分成就 <strong>${game.round.achievements.size}</strong></p>${betText}`,
    actions: [{ label: gameEnded ? "查看最終成績" : "下一局", action: gameEnded ? showGameOver : startRound }]
  });
}

function showGameOver() {
  game.state = GAME_STATES.GAME_OVER;
  game.busy = false;
  recordRoundHighs();
  updateHUD();
  openModal({
    icon: "🏆", kicker: "NIGHT MARKET RESULT", title: `${game.playerName || "玩家"}的成績單`,
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
  const flowers = game.mode === "carnival" ? `<br>梅蘭齊聚：<strong>${s.flowersCount}</strong>` : "";
  const eventNetProfit = s.eventScoreGain - s.eventScoreLoss;
  const betNetProfit = s.betScoreGain - s.betScoreLoss;
  return `<div class="report-grid">
    <section><h3>總成績</h3><p>遊戲模式：<strong>${config.label}</strong><br>最終總分：<strong>${game.score}</strong><br>正式連線總數：<strong>${game.totalLines}</strong><br>實際遊玩局數：<strong>${s.roundsPlayed}</strong><br>最高單局分數：<strong>${s.highestRoundScore}</strong><br>最高單局連線數：<strong>${s.highestRoundLines}</strong></p></section>
    <section><h3>牌型成就</h3><p>萬子 5／7／9 張：<strong>${s.wan5Count}／${s.wan7Count}／${s.wan9Count}</strong><br>筒子 5／7／9 張：<strong>${s.tong5Count}／${s.tong7Count}／${s.tong9Count}</strong><br>條子 5／7／9 張：<strong>${s.tiao5Count}／${s.tiao7Count}／${s.tiao9Count}</strong><br>四風：<strong>${s.fourWindsCount}</strong><br>三元：<strong>${s.threeDragonsCount}</strong>${flowers}</p></section>
    <section><h3>聽牌與補牌</h3><p>聽牌次數：<strong>${s.waitingCount}</strong><br>進入補牌次數：<strong>${s.bonusDrawCount}</strong><br>補牌成功次數：<strong>${s.bonusSuccessCount}</strong><br>補牌成功率：<strong>${successRate}%</strong><br>補牌實際增加次數：<strong>${s.extraRoundsFromBonus}</strong></p></section>
    <section><h3>事件／下注總損益</h3><p>事件總損益：<strong>${formatSignedScore(eventNetProfit)}</strong><br>下注總損益：<strong>${formatSignedScore(betNetProfit)}</strong></p></section>
  </div>`;
}

function formatSignedScore(value) { return value > 0 ? `+${value}` : String(value); }

function getProgress() {
  const drawn = GAME_MODE_CONFIG[game.mode].tiles.filter(tile => game.round && isOfficiallyDrawn(tile.id));
  const suits = Object.entries(SUIT_NAMES).map(([suit, name]) => {
    const count = drawn.filter(tile => tile.suit === suit).length;
    const score = count >= 9 ? SCORE_CONFIG.suit.nine : count >= 7 ? SCORE_CONFIG.suit.seven : count >= 5 ? SCORE_CONFIG.suit.five : 0;
    return { label: name, value: `${count} / 9${score ? ` ✓ +${score}` : ""}`, done: count >= 5 };
  });
  const winds = ["east", "south", "west", "north"].filter(id => game.round && isOfficiallyDrawn(id)).length;
  const dragons = ["red", "green", "white"].filter(id => game.round && isOfficiallyDrawn(id)).length;
  const progress = [...suits, { label: "四風", value: `${winds} / 4${winds === 4 ? ` ✓ +${SCORE_CONFIG.honor.fourWinds}` : ""}`, done: winds === 4 }, { label: "三元", value: `${dragons} / 3${dragons === 3 ? ` ✓ +${SCORE_CONFIG.honor.threeDragons}` : ""}`, done: dragons === 3 }];
  if (game.mode === "carnival") { const flowers = ["plum", "orchid"].filter(isOfficiallyDrawn).length; progress.push({ label: "梅蘭", value: `${flowers} / 2${flowers === 2 ? ` ✓ +${SCORE_CONFIG.honor.flowers}` : ""}`, done: flowers === 2 }); }
  return progress;
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
  elements.roundsLeft.textContent = attemptDisplay();
  elements.desktopScore.textContent = game.score;
  elements.desktopRoundScore.textContent = game.round?.roundScore ?? 0;
  elements.desktopLines.textContent = game.totalLines;
  elements.desktopRounds.textContent = attemptDisplay();
  elements.mobilePlayerName.textContent = game.playerName;
  elements.desktopPlayerName.textContent = game.playerName;
  const betCountText = `下注 ${game.round?.activeBets.length ?? 0}`;
  elements.mobileBetCount.textContent = betCountText;
  elements.desktopBetCount.textContent = betCountText;
  elements.drawCount.textContent = game.round?.drawIndex ?? 0;
  const config = GAME_MODE_CONFIG[game.mode];
  elements.roundLabel.textContent = `第 ${game.roundsPlayed + (game.round?.started ? 0 : 1)} 局`;
  elements.stateBadge.textContent = ({ DRAWING: "摸牌中", EVENT_CHOICE: "事件選擇", EVENT_REVEAL: "事件揭曉", BONUS_PENDING: "最終聽牌", BONUS_DRAW: "補牌", ROUND_END: "本局結算", GAME_OVER: "遊戲結束", READY: "準備" })[game.state];
  const multiplierText = `×${game.round?.roundMultiplier ?? 1}`;
  elements.mobileMultiplier.textContent = multiplierText;
  elements.desktopMultiplier.textContent = multiplierText;
  elements.multiplierBadge.textContent = multiplierText;
  elements.modeLabel.textContent = config.label;
  elements.mobileModeLabel.textContent = config.shortLabel;
  elements.handSize.textContent = config.handSize;
  const modeRule = config.eventsEnabled ? `每局 ${config.handSize} 張，包含兩張事件牌` : `每局 ${config.handSize} 張，無事件，專注連線與牌型`;
  elements.modeRule.querySelector("span").textContent = modeRule;
  elements.mobileModeRule.querySelector("span").textContent = modeRule;
  elements.flowerRule.classList.toggle("hidden", game.mode !== "carnival");
  elements.mobileFlowerRule.classList.toggle("hidden", game.mode !== "carnival");
  elements.eventGuideButton.classList.toggle("hidden", !config.eventsEnabled);
  elements.mobileEventGuide.classList.toggle("hidden", !config.eventsEnabled);
  const operationLocked = game.state !== GAME_STATES.DRAWING || game.busy || game.uiOverlayOpen;
  [elements.eventGuideButton, elements.mobileEventGuide, elements.mainMenuButton, elements.mobileMainMenuButton]
    .forEach(button => { button.disabled = operationLocked; });
  const multiplier = game.round?.roundMultiplier ?? 1;
  const leverageLocked = game.state !== GAME_STATES.DRAWING || game.round?.started;
  const betCount = game.round?.activeBets.length ?? 0;
  const leverageLabel = game.round?.started ? "下注已鎖定" : "下注";
  [elements.leverageButton, elements.mobileLeverageButton].forEach(button => {
    button.disabled = leverageLocked;
    button.textContent = leverageLabel;
    button.classList.remove("multiplier-x1", "multiplier-x2", "multiplier-x3", "leverage-locked");
    button.classList.add(`multiplier-x${multiplier}`);
    button.classList.toggle("leverage-locked", Boolean(game.round?.started));
  });
  updateDrawStackUI();
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

function notifyScore(text, options = {}) {
  if (typeof options === "boolean") options = { type: options ? "waiting" : "default" };
  const type = options.type ?? "default";
  const duration = options.duration ?? 1500;
  const toast = document.createElement("div");
  toast.className = `score-toast${type === "waiting" ? " wait-toast" : ""}${type === "achievement" ? " achievement-toast" : ""}`;
  toast.style.setProperty("--toast-duration", `${duration}ms`);
  toast.textContent = text;
  elements.toastStack.append(toast);
  setTimeout(() => toast.remove(), duration + 50);
}

function openModal({ icon, kicker, title, body, actions }) {
  elements.modalIcon.classList.remove("deciding");
  elements.modalIcon.textContent = icon;
  elements.modalKicker.textContent = kicker;
  elements.modalTitle.textContent = title;
  elements.modalBody.innerHTML = body;
  elements.modal.querySelector(".modal-card").classList.toggle("modal-card-wide", /betting-panel|report-grid|event-guide/.test(body));
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
  return event.displayEffect || event.effectType;
}

function buildEventGuideSection(events) {
  const totalWeight = events.reduce((sum, event) => sum + event.weight, 0);
  return `<section class="event-guide-section"><div class="event-guide-list">${events.map(event => {
    const probability = (event.weight / totalWeight * 100).toFixed(1);
    const danger = event.effectType === "END_GAME" ? " danger" : "";
    const options = event.triggerType === "CHOICE" ? `<div class="event-options">${event.options.map(option => `<p><b>${option.label}</b>：${eventEffectDescription(option)}</p>`).join("")}</div>` : "";
    return `<article class="event-guide-item${danger}"><h4>${event.title} <small>${event.triggerType}</small></h4><p>${event.story}</p>${options}<footer><b>${eventEffectDescription(event)}</b><span>Weight ${event.weight}｜${probability}%</span></footer></article>`;
  }).join("")}</div></section>`;
}

function openEventGuide() {
  if (!GAME_MODE_CONFIG[game.mode].eventsEnabled || game.state !== GAME_STATES.DRAWING || game.busy || game.uiOverlayOpen) return;
  game.uiOverlayOpen = true;
  openModal({
    icon: "覽", kicker: "WEIGHTED EVENT GUIDE", title: "事件一覽",
    body: `<div class="event-guide">${buildEventGuideSection(EVENT_DEFINITIONS.filter(event => event.enabled))}</div>`,
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function loadPlayerName() {
  try { return (localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || "").trim().slice(0, 12); }
  catch { return ""; }
}

function savePlayerName(name) {
  try { localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name); }
  catch { /* localStorage unavailable: the current game still keeps the name. */ }
}

function resetGame() {
  const mode = game.mode;
  const playerName = game.playerName;
  game = freshGameState(mode, playerName);
  elements.modeSelect.classList.add("hidden");
  elements.gameShell.classList.remove("hidden");
  startRound();
  enableGlyphFallback();
}

function selectMode(mode) {
  if (!GAME_MODE_CONFIG[mode]) return;
  const playerName = elements.playerNameInput.value.trim().slice(0, 12);
  if (!playerName) {
    elements.playerNameError.textContent = "請先輸入玩家名稱";
    elements.playerNameInput.focus();
    return;
  }
  elements.playerNameInput.value = playerName;
  elements.playerNameError.textContent = "";
  savePlayerName(playerName);
  game = freshGameState(mode, playerName);
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
  elements.playerNameInput.value = game.playerName || loadPlayerName();
  elements.playerNameError.textContent = "";
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
  const playerName = game.playerName || elements.playerNameInput.value.trim().slice(0, 12);
  game = freshGameState(null, playerName);
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
elements.playerNameInput.addEventListener("input", () => {
  elements.playerNameError.textContent = "";
  const playerName = elements.playerNameInput.value.trim().slice(0, 12);
  savePlayerName(playerName);
});
game = freshGameState(null, loadPlayerName());
showModeSelect();
