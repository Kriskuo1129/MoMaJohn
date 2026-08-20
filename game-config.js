/*
 * === 事件設定區 ===
 *
 * 要新增事件：複製 EVENT_DEFINITIONS 裡任一事件物件，再修改 title、story、
 * triggerType、weight、effectType、value、displayEffect、enabled 即可。
 * CHOICE 事件請另外修改 options。只使用既有 effectType 時，不必修改 game.js。
 * weight 越大越常出現；enabled: false 的事件不會被抽中，也不列入機率計算。
 */

const SCORE_CONFIG = Object.freeze({
  line: Object.freeze({ first: 10, second: 20, thirdPlus: 30 }),
  // 花色數值是「該門目前總獎勵值」，不是每個 milestone 的額外加分。
  suit: Object.freeze({ five: 5, seven: 9, nine: 15 }),
  honor: Object.freeze({ fourWinds: 5, threeDragons: 5, flowers: 3 })
});

const EVENT_DEFINITIONS = [
  { id: "boss-happy", title: "老闆今天心情很好", story: "老闆剛好中了發票，看誰都順眼。", triggerType: "DIRECT", effectType: "ADD_SCORE", value: 2, weight: 20, displayEffect: "+2 分", enabled: true },
  { id: "wrong-change", title: "老闆算錯錢", story: "老闆找錢找多了，而且他完全沒有發現。", triggerType: "DIRECT", effectType: "ADD_SCORE", value: 3, weight: 15, displayEffect: "+3 分", enabled: true },
  { id: "neighbor-leaves", title: "隔壁攤不玩了", story: "隔壁玩家突然去買雞排，把剩下的次數送給你。", triggerType: "DIRECT", effectType: "ADD_ROUNDS", value: 2, weight: 5, displayEffect: "+2 次", enabled: true },
  { id: "free-round", title: "免費再來一次", story: "老闆說你長得很面熟，今天算你一次免費的。", triggerType: "DIRECT", effectType: "ADD_ROUNDS", value: 1, weight: 15, displayEffect: "+1 次", enabled: true },
  { id: "boss-helps", title: "老闆偷偷放水", story: "老闆趁沒人注意，偷偷幫你把獎金加了一點。", triggerType: "DIRECT", effectType: "ADD_SCORE", value: 4, weight: 8, displayEffect: "+4 分", enabled: true },
  { id: "broadcast", title: "夜市廣播抽中你", story: "廣播突然叫到你的號碼，你莫名其妙中了活動獎。", triggerType: "DIRECT", effectType: "ADD_SCORE", value: 5, weight: 5, displayEffect: "+5 分", enabled: true },
  { id: "lucky-line", title: "好運連線", story: "旁邊阿伯看了你一眼，說你今天面相會連線。", triggerType: "DIRECT", effectType: "DOUBLE_NEXT_LINE", value: 2, weight: 8, displayEffect: "下一條正式連線 ×2", enabled: true },
  { id: "red-envelope", title: "神秘紅包", story: "地上出現一個不知道誰掉的紅包，裡面居然是夜市點數。", triggerType: "DIRECT", effectType: "RANDOM_SCORE", value: [1, 5], weight: 10, displayEffect: "隨機 +1～+5 分", enabled: true },
  { id: "bubble-tea", title: "珍奶加料不用錢", story: "老闆把最後一勺珍珠全倒給你，好運也跟著滿出來。", triggerType: "DIRECT", effectType: "ADD_SCORE", value: 2, weight: 18, displayEffect: "+2 分", enabled: true },
  { id: "drain", title: "手滑掉進水溝", story: "你剛摸到的幸運突然跟著麻將一起掉進水溝。", triggerType: "DIRECT", effectType: "SUB_SCORE", value: 2, weight: 18, displayEffect: "-2 分", enabled: true },
  { id: "caught", title: "老闆抓到你偷看", story: "老闆：少年欸，你是不是偷看牌？", triggerType: "DIRECT", effectType: "SUB_SCORE", value: 3, weight: 15, displayEffect: "-3 分", enabled: true },
  { id: "expert", title: "隔壁高手來亂", story: "隔壁高手突然開始大聲指揮，把你搞得完全不會摸。", triggerType: "DIRECT", effectType: "HALVE_ROUND_SCORE", value: 0.5, weight: 10, displayEffect: "本局目前分數減半", enabled: true },
  { id: "jackpot", title: "神秘大獎", story: "老闆從桌子下面拿出一個連他自己都忘記的紅包。", triggerType: "DIRECT", effectType: "ADD_SCORE", value: 5, weight: 8, displayEffect: "+5 分", enabled: true },
  { id: "temple", title: "夜市神明保佑", story: "附近宮廟遶境經過，鑼鼓一響，今晚運氣突然變好了。", triggerType: "DIRECT", effectType: "ADD_ROUNDS", value: 2, weight: 5, displayEffect: "+2 次", enabled: true },
  { id: "double-round", title: "老闆突然加碼", story: "老闆拍桌大喊：這局接下來的連線全部算兩倍！", triggerType: "DIRECT", effectType: "DOUBLE_FUTURE_LINES", value: 2, weight: 7, displayEffect: "本局後續正式連線 ×2", enabled: true },
  { id: "blackout", title: "停電", story: "啪！整條夜市突然停電，老闆摸黑宣布這局到此為止。", triggerType: "DIRECT", effectType: "END_ROUND", value: true, weight: 6, displayEffect: "立即結束本局", enabled: true },
  { id: "rain", title: "大雨來了", story: "豪雨突然灌進夜市，大家忙著收攤，你少了一次機會。", triggerType: "DIRECT", effectType: "SUB_ROUNDS", value: 1, weight: 9, displayEffect: "失去 1 次", enabled: true },
  { id: "explosion", title: "隔壁瓦斯桶爆炸", story: "碰！！！隔壁攤位傳來巨響，所有人拔腿就跑！", triggerType: "DIRECT", effectType: "END_GAME", value: true, weight: 1, displayEffect: "立即 GAME OVER", enabled: true },
  { id: "reversal", title: "命運逆轉", story: "你以為完蛋了，結果老闆突然說剛才不算，還多送三次。", triggerType: "DIRECT", effectType: "ADD_ROUNDS", value: 3, weight: 3, displayEffect: "+3 次", enabled: true },
  { id: "wallet", title: "錢包躲在口袋裡", story: "你找了半天的錢包竟然一直在口袋裡，虛驚一場還翻出點數。", triggerType: "DIRECT", effectType: "ADD_SCORE", value: 4, weight: 12, displayEffect: "+4 分", enabled: true },
  { id: "pickpocket", title: "人潮中被扒走點數", story: "你只顧著看麻將，回神時獎券已少了一疊。", triggerType: "DIRECT", effectType: "SUB_SCORE", value: 5, weight: 5, displayEffect: "-5 分", enabled: true },
  { id: "five-tiao-mistake", title: "五條誤", story: "老闆拿起牌看了一眼：『啊？這不是五條喔？』", triggerType: "DIRECT", effectType: "REPLACE_DRAWN_TILE", value: { from: "suo-5", targetSuit: "suo" }, weight: 4, displayEffect: "將五條換成另一張未取得條子", enabled: true },
  { id: "on-purpose-accident", title: "故意不小心", story: "老闆突然把旁邊的東西掃到地上。你低頭看的瞬間……咦？怎麼少了一張？", triggerType: "DIRECT", effectType: "REMOVE_DRAWN_TILE", value: 1, weight: 1, displayEffect: "隨機移除一張已取得普通麻將", enabled: true },
  { id: "double-or-nothing", title: "老闆說要不要賭一把？", story: "贏了有獎，輸了別怪老闆。", triggerType: "CHOICE", effectType: "NONE", value: null, weight: 5, displayEffect: "由玩家選擇", enabled: true, options: [
    { label: "來啊！", effectType: "RANDOM_SCORE", value: [-5, 5], randomMode: "PICK", displayEffect: "隨機 -5 或 +5 分" },
    { label: "算了", effectType: "NONE", value: null, displayEffect: "無事發生" }
  ] }
];

const BET_DEFINITIONS = [
  { id: "believe-guoju", title: "相信國聚", description: "我相信這局可以把所有國字摸齊！", reward: 30, penalty: 30, conditionType: "ALL_HONORS", conditionValue: ["east", "south", "west", "north", "red", "green", "white"], enabled: true },
  { id: "one-line", title: "我一定會連！", description: "本局至少完成 1 條正式連線。", reward: 15, penalty: 10, conditionType: "MIN_LINES", conditionValue: 1, enabled: true },
  { id: "waiting", title: "我要聽牌", description: "本局曾經至少形成一次 5/6 聽牌。", reward: 10, penalty: 5, conditionType: "EVER_WAITED", conditionValue: true, enabled: true },
  { id: "three-lines", title: "豪賭三線", description: "高風險：本局完成至少 3 條正式連線。", reward: 50, penalty: 20, conditionType: "MIN_LINES", conditionValue: 3, enabled: true }
];
