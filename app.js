// 오늘의 쉼 · app.js
// 모든 데이터는 이 기기(localStorage)에만 저장됩니다.
// 심리학 근거: 자기자비(Neff 2003), 행동활성화(Martell 2010), 습관형성(Lally 2010),
// 실행의도(Gollwitzer 1999), 정서명명(Lieberman 2007), SDT(Deci & Ryan), 감사(Emmons 2003).

/* ===================== 저장소 ===================== */
const DB = { ENTRIES: "entries_v2", SETTINGS: "settings_v2", CH: "challenges_v2", ONBOARD: "onboarded_v1" };
const CH_TARGET = 90;

// 기분 → 점수(1~5) + 태그 (Russell 정동 원형 모형 기반, 점수만이 아니라 라벨로 분기)
const moodMeta = {
  "우울해요":   { emoji: "🥺", score: 1, tag: "low_mood" },
  "무기력해요": { emoji: "😶‍🌫️", score: 2, tag: "low_energy" },
  "지쳤어요":   { emoji: "😮‍💨", score: 2, tag: "exhaustion" },
  "불안해요":   { emoji: "😣", score: 2, tag: "high_arousal" },
  "그럭저럭":   { emoji: "🙂", score: 3, tag: "neutral" },
  "괜찮아요":   { emoji: "☺️", score: 4, tag: "positive" },
};
const moodReplies = {
  "지쳤어요": "많이 지쳤구나… 지치는 건 약해서가 아니라 그동안 너무 오래 애써왔기 때문이에요. 오늘은 쉬는 것도 회복이에요.",
  "우울해요": "마음이 무거운 날이죠. 그 기분, 그럴 만해요. 억지로 밀어내지 않아도 괜찮아요. 곁에 있을게요.",
  "불안해요": "불안한 마음, 알아요. 한 번에 하나씩만 생각해요. 잠깐 호흡 쉼표에서 숨을 고르고 와도 좋아요.",
  "무기력해요": "지금의 무기력은 게으름이 아니라 몸과 마음이 보내는 쉼 신호예요. 아주 작은 움직임 하나면 충분해요.",
  "그럭저럭": "그럭저럭도 충분히 잘하고 있는 거예요. 오늘도 잘 흘러가고 있어요.",
  "괜찮아요": "괜찮다니 다행이에요. 이 가벼움을 오늘 잘 누려봐요 ☺️",
};
const plainReplies = {
  "지쳤어요": "지쳤네요. 오늘은 회복을 우선하세요.",
  "우울해요": "기분이 가라앉았네요. 무리하지 마세요.",
  "불안해요": "불안하군요. 호흡부터 한 번 정리해보세요.",
  "무기력해요": "에너지가 낮네요. 아주 작은 것 하나만 하세요.",
  "그럭저럭": "그럭저럭이면 괜찮습니다.",
  "괜찮아요": "괜찮은 날이네요. 이 컨디션을 잘 활용해보세요.",
};
const energyFaces = { 1: "🪫 바닥이에요", 2: "😔 적어요", 3: "😐 보통", 4: "🙂 괜찮아요", 5: "⚡ 넘쳐요" };
const CRISIS_WORDS = ["죽고 싶", "죽고싶", "자살", "사라지고 싶", "사라지고싶", "없어지고 싶", "없어지고싶", "죽어버", "살기 싫", "살기싫", "자해", "목숨을"];

function loadEntries() { try { return JSON.parse(localStorage.getItem(DB.ENTRIES)) || {}; } catch { return {}; } }
function saveEntries(o) { localStorage.setItem(DB.ENTRIES, JSON.stringify(o)); }
function loadSettings() { try { return JSON.parse(localStorage.getItem(DB.SETTINGS)) || {}; } catch { return {}; } }
function saveSettingsObj(o) { localStorage.setItem(DB.SETTINGS, JSON.stringify(o)); }
function loadChs() { try { return JSON.parse(localStorage.getItem(DB.CH)) || []; } catch { return []; } }
function saveChs(a) { localStorage.setItem(DB.CH, JSON.stringify(a)); }

function todayKey(d) {
  d = d || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(dateStr, n) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n); return todayKey(d); }
function daysSince(startKey) {
  const a = new Date(startKey + "T00:00:00"), b = new Date(todayKey() + "T00:00:00");
  return Math.round((b - a) / 86400000);
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* 구버전 데이터 1회 이전 */
(function migrate() {
  // praiseLog -> entries
  const old = localStorage.getItem("praiseLog");
  if (old) {
    try {
      const list = JSON.parse(old), entries = loadEntries();
      list.forEach((it) => {
        const k = todayKey(new Date(it.date));
        if (!entries[k]) entries[k] = { date: k };
        entries[k].praise = entries[k].praise ? entries[k].praise + " / " + it.text : it.text;
      });
      saveEntries(entries);
    } catch (e) {}
    localStorage.removeItem("praiseLog");
  }
  // challenge_v1 -> challenges_v2 (배열)
  const oldCh = localStorage.getItem("challenge_v1");
  if (oldCh && !localStorage.getItem(DB.CH)) {
    try {
      const c = JSON.parse(oldCh);
      saveChs([{ id: "c" + Date.now(), emoji: "🎯", title: c.title, cue: "", minVersion: "", startDate: c.startDate, done: c.done || {}, celebrated: c.celebrated || [] }]);
    } catch (e) {}
    localStorage.removeItem("challenge_v1");
  }
})();

/* ===================== 인사말 ===================== */
(function greet() {
  const h = new Date().getHours();
  let msg = "안녕, 오늘도 와줘서 고마워요";
  if (h < 6) msg = "늦은 밤이네요. 그래도 잘 버텨줘서 고마워요";
  else if (h < 12) msg = "좋은 아침이에요. 천천히 시작해요";
  else if (h < 18) msg = "오후도 무리하지 말고요";
  else msg = "하루 마무리, 정말 수고 많았어요";
  document.getElementById("greeting").textContent = msg;
})();

/* ===================== 온보딩 ===================== */
const obSlides = [
  { e: "☕", t: "여긴 잘 쉬려고 온 곳이에요", d: "잘하려고 애쓰지 않아도 돼요. 그냥 와준 것만으로 충분해요." },
  { e: "📔", t: "하루 한 줄, 마음만 남겨요", d: "기분 하나만 눌러도 기록은 시작돼요. 일기는 비워둬도 괜찮아요." },
  { e: "🌿", t: "지칠 땐 '쉼' 탭에서 숨 한 번", d: "위로 한마디, 호흡, 잔잔한 소리. 언제든 도망 와도 돼요." },
];
let obIndex = 0;
const onboard = document.getElementById("onboard");
function showOnboard() { obIndex = 0; onboard.hidden = false; renderOb(); }
function renderOb() {
  const s = obSlides[obIndex];
  document.getElementById("obEmoji").textContent = s.e;
  document.getElementById("obTitle").textContent = s.t;
  document.getElementById("obDesc").textContent = s.d;
  document.getElementById("obNext").textContent = obIndex === obSlides.length - 1 ? "시작하기" : "다음";
  document.getElementById("obDots").innerHTML = obSlides.map((_, i) => `<i class="${i === obIndex ? "on" : ""}"></i>`).join("");
}
function finishOnboard() { onboard.hidden = true; localStorage.setItem(DB.ONBOARD, "1"); }
document.getElementById("obNext").addEventListener("click", () => {
  Sound.tap();
  if (obIndex < obSlides.length - 1) { obIndex++; renderOb(); } else finishOnboard();
});
document.getElementById("obSkip").addEventListener("click", finishOnboard);

/* ===================== 탭 전환 ===================== */
const tabbar = document.getElementById("tabbar");
const tabs = { today: "tab-today", rest: "tab-rest", challenge: "tab-challenge", stats: "tab-stats", settings: "tab-settings" };
tabbar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tabbtn");
  if (!btn) return;
  Sound.tap();
  const name = btn.dataset.tab;
  document.querySelectorAll(".tabbtn").forEach((b) => b.classList.toggle("active", b === btn));
  Object.entries(tabs).forEach(([k, id]) => { document.getElementById(id).hidden = k !== name; });
  if (name === "stats") renderStats();
  if (name === "challenge") { renderChallenge(); renderProjects(); }
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ===================== 오늘 기록 ===================== */
const moodGrid = document.getElementById("moodGrid");
const moodResponse = document.getElementById("moodResponse");
const todayMore = document.getElementById("todayMore");
const energyRange = document.getElementById("energyRange");
const energyFace = document.getElementById("energyFace");
const journalInput = document.getElementById("journalInput");
const praiseInput = document.getElementById("praiseInput");
const saveMsg = document.getElementById("saveMsg");
const entryDate = document.getElementById("entryDate");
const checkinTitle = document.getElementById("checkinTitle");
let selectedMood = null;
let currentDate = todayKey();

function curReplies() { return settings.tone === "plain" ? plainReplies : moodReplies; }

function selectMood(mood) {
  selectedMood = mood;
  document.querySelectorAll(".mood").forEach((m) => {
    const on = m.dataset.mood === mood;
    m.classList.toggle("selected", on);
    m.setAttribute("aria-pressed", on ? "true" : "false");
  });
  moodResponse.textContent = curReplies()[mood];
  moodResponse.hidden = false;
  todayMore.hidden = false; // 점진적 노출
}
moodGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".mood");
  if (!btn) return;
  Sound.tap(); selectMood(btn.dataset.mood);
});
energyRange.addEventListener("input", () => { energyFace.textContent = energyFaces[energyRange.value]; });

function resetForm() {
  selectedMood = null;
  document.querySelectorAll(".mood").forEach((m) => { m.classList.remove("selected"); m.setAttribute("aria-pressed", "false"); });
  moodResponse.hidden = true;
  energyRange.value = 3; energyFace.textContent = energyFaces[3];
  journalInput.value = ""; praiseInput.value = ""; saveMsg.hidden = true;
}
function updateCheckinTitle() {
  const p = currentDate.split("-");
  checkinTitle.textContent = currentDate === todayKey() ? "📔 오늘의 기록" : `📔 ${+p[1]}월 ${+p[2]}일 기록`;
}
function loadEntryForm(key) {
  currentDate = key;
  resetForm(); updateCheckinTitle();
  const t = loadEntries()[key];
  if (!t) { todayMore.hidden = (key === todayKey()); return; } // 과거 날짜는 바로 입력 가능
  if (t.mood) selectMood(t.mood);
  if (t.energy) { energyRange.value = t.energy; energyFace.textContent = energyFaces[t.energy]; }
  if (t.note) journalInput.value = t.note;
  if (t.praise) praiseInput.value = t.praise;
  todayMore.hidden = false;
}
function loadToday() { entryDate.value = todayKey(); entryDate.max = todayKey(); loadEntryForm(todayKey()); }
entryDate.addEventListener("change", () => {
  let key = entryDate.value || todayKey();
  if (key > todayKey()) { key = todayKey(); entryDate.value = key; }
  Sound.tap(); loadEntryForm(key);
});

function detectCrisis(text) {
  if (!text) return false;
  const low = text.toLowerCase();
  return CRISIS_WORDS.some((w) => low.includes(w));
}
function showSafety() {
  const c = document.getElementById("safetyCard");
  c.hidden = false;
  c.scrollIntoView({ behavior: "smooth", block: "center" });
}
document.getElementById("safetyClose").addEventListener("click", () => { document.getElementById("safetyCard").hidden = true; });

document.getElementById("saveBtn").addEventListener("click", () => {
  const entries = loadEntries(), k = currentDate;
  const note = journalInput.value.trim();
  entries[k] = { date: k, mood: selectedMood, energy: Number(energyRange.value), note, praise: praiseInput.value.trim(), updatedAt: new Date().toISOString() };
  saveEntries(entries);
  Sound.success();
  const card = document.getElementById("checkin-card");
  card.classList.remove("saved"); void card.offsetWidth; card.classList.add("saved");
  if (k === todayKey()) {
    const streak = calcStreak(entries);
    saveMsg.textContent = streak > 1 ? `기록 완료! 🌟 ${streak}일째 스스로를 돌보고 있어요.` : "오늘의 마음, 잘 담아뒀어요. 고마워요 💛";
  } else {
    const p = k.split("-");
    saveMsg.textContent = `${+p[1]}월 ${+p[2]}일 기록을 채웠어요. 지난 날도 소중해요 🌿`;
  }
  saveMsg.hidden = false;
  setTimeout(() => { saveMsg.hidden = true; }, 4000);
  if (detectCrisis(note)) showSafety();
});

/* ===================== 쉼: 위로 / 호흡 / 미션 / 사운드 ===================== */
// 타당화·자기자비·인지재구성 근거 문구 (심리학 자문)
const quotes = [
  "오늘 하루를 버틴 것만으로도 충분히 잘하고 있어요.",
  "지치는 건 당신이 약해서가 아니라, 그동안 너무 오래 애써왔기 때문이에요.",
  "지금 힘든 마음, 그럴 만해요. 이상한 게 아니에요.",
  "기분이 좋아져야만 움직일 수 있는 건 아니에요. 아주 작은 움직임이 먼저 와도 괜찮아요.",
  "오늘은 아무것도 안 해도 돼요. 쉬는 것도 회복의 일부예요.",
  "잘 해내지 못한 날도, 당신의 가치는 그대로예요.",
  "모든 걸 한 번에 바꾸지 않아도 돼요. 오늘은 한 걸음이면 충분해요.",
  "스스로에게 친구에게 하듯 말해줘도 괜찮아요. '괜찮아, 천천히 해도 돼.'",
  "지금의 무기력은 게으름이 아니라, 몸과 마음이 보내는 쉼 신호예요.",
  "작게 느껴지는 일도 당신에겐 큰 용기였을 거예요.",
  "오늘 느낀 감정을 이름 붙여본 것만으로도, 마음은 조금 정리되고 있어요.",
  "어제보다 나아지지 않아도 괜찮아요. 회복은 직선이 아니에요.",
  "혼자 견디고 있다고 느껴질 때, 사실 많은 사람이 같은 길을 지나가고 있어요.",
  "완벽하지 않아도 돼요. 지금의 당신으로 충분해요.",
  "힘든 마음을 외면하지 않고 들여다본 당신은, 이미 회복을 시작한 거예요.",
  "오늘의 1점짜리 마음도 기록할 가치가 있어요. 그 안에 당신이 있으니까요.",
  "잠시 멈춰도 길은 사라지지 않아요. 숨 한 번 고르고 가요.",
  "당신이 오늘 한 작은 선택들, 그게 모여 당신을 돌보는 일이 돼요.",
  "슬픔이 찾아왔다면, 막지 말고 잠깐 곁에 두어도 괜찮아요. 지나갈 거예요.",
  "지금 이 순간, 앱을 열어 자신을 돌보려 한 것 — 그것부터가 이미 잘한 일이에요.",
  "비교는 마음만 갉아먹어요. 어제의 나와만 견주면 충분해요.",
  "오늘 못한 일은 오늘의 당신이 그만큼 지쳤다는 뜻일 뿐이에요.",
  "감정엔 옳고 그름이 없어요. 그냥 지금의 날씨 같은 거예요.",
  "버티는 것도 엄청난 일을 해내는 중이라는 증거예요.",
  "쉼표는 문장을 멈추는 게 아니라, 더 잘 읽히게 하는 거예요. 당신의 쉼도 그래요.",
  "작은 친절을 남에게 베풀듯, 오늘은 자신에게 베풀어봐요.",
  "괜찮지 않아도 괜찮아요. 그 말, 진심이에요.",
  "지금 할 수 있는 가장 다정한 일은, 자신을 다그치지 않는 거예요.",
];
const plainQuotes = [
  "오늘 할 수 있는 만큼만 했으면 그걸로 충분합니다.",
  "회복엔 시간이 걸립니다. 조급해하지 않아도 됩니다.",
  "기분은 정보입니다. 좋고 나쁨이 아니라 데이터로 보세요.",
  "안 되는 날도 있습니다. 내일 다시 하면 됩니다.",
  "작은 행동 하나가 큰 의지보다 낫습니다.",
  "쉬는 것도 일정의 일부입니다.",
  "완벽하게 하려다 멈추는 것보다, 대충이라도 계속이 낫습니다.",
  "지금 한 가지만 정하고, 나머지는 미뤄도 됩니다.",
  "감정은 지나갑니다. 지금 상태가 영원하지 않습니다.",
  "비교는 도움이 안 됩니다. 어제의 나와만 비교하세요.",
  "할 일을 줄이는 것도 능력입니다.",
  "몸이 보내는 신호를 무시하지 마세요.",
  "충분히 자고 충분히 먹는 것부터 시작하세요.",
  "오늘의 목표는 '버티기'여도 괜찮습니다.",
  "도움을 청하는 건 합리적인 선택입니다.",
];
const quoteEl = document.getElementById("quote");
let lastQuote = -1;
function curQuotes() { return settings.tone === "plain" ? plainQuotes : quotes; }
document.getElementById("quoteBtn").addEventListener("click", () => {
  Sound.chime();
  const pool = curQuotes();
  let i; do { i = Math.floor(Math.random() * pool.length); } while (i === lastQuote && pool.length > 1);
  lastQuote = i;
  quoteEl.classList.add("swap");
  setTimeout(() => { quoteEl.textContent = "“" + pool[i] + "”"; quoteEl.classList.remove("swap"); }, 230);
});

// 호흡 컨트롤러 — 매 초 카운트다운 + 반복 횟수 표시 (4-7-8)
const BREATH_PHASES = [
  { name: "들이쉬기", dur: 4, cls: "inhale", cue: "inhale" },
  { name: "잠깐 멈춰요", dur: 7, cls: "hold", cue: "hold" },
  { name: "내쉬기", dur: 8, cls: "exhale", cue: "exhale" },
];
function makeBreather(circleEl, textEl, base) {
  let running = false, tick = null, pi = 0, remain = 0, cycles = 0;
  function render() { textEl.innerHTML = `${BREATH_PHASES[pi].name}<br><b>${remain}</b>`; }
  function enter(i) {
    pi = i; const ph = BREATH_PHASES[i]; remain = ph.dur;
    circleEl.className = base + " " + ph.cls;
    circleEl.style.transitionDuration = (ph.cls === "hold" ? 0.4 : ph.dur) + "s";
    Sound.breathCue(ph.cue); render();
  }
  return {
    isRunning: () => running,
    start() {
      if (running) return;
      Sound.unlock(); running = true; cycles = 0; enter(0);
      tick = setInterval(() => {
        remain--;
        if (remain <= 0) {
          let next = pi + 1;
          if (next >= BREATH_PHASES.length) { next = 0; cycles++; }
          enter(next);
        } else render();
      }, 1000);
    },
    stop() {
      running = false; if (tick) { clearInterval(tick); tick = null; }
      circleEl.className = base; circleEl.style.transitionDuration = "";
      textEl.innerHTML = cycles > 0 ? `잘했어요<br><b>${cycles}회</b>` : "잘했어요";
    },
  };
}

const restBreather = makeBreather(document.getElementById("breathCircle"), document.getElementById("breathText"), "breath-circle");
const breathBtn = document.getElementById("breathBtn");
breathBtn.addEventListener("click", () => {
  if (restBreather.isRunning()) { restBreather.stop(); breathBtn.textContent = "호흡 시작"; }
  else { restBreather.start(); breathBtn.textContent = "그만하기"; }
});

const missions = [
  "물 한 잔 천천히 마시기 💧", "창문 열고 바깥 공기 30초 느끼기 🌿", "어깨를 크게 한 바퀴 돌리기 🤸",
  "좋아하는 노래 딱 한 곡 듣기 🎧", "스마트폰 내려놓고 1분간 눈 감기 😌", "기지개를 시원하게 한 번 켜기 🙆",
  "따뜻한 차나 커피 한 잔 내리기 ☕", "방 안에서 다섯 걸음만 걷기 🚶", "고마운 사람 한 명 떠올리기 💛",
  "햇빛 드는 곳에 잠깐 앉아 있기 ☀️", "지금 어지러운 것 딱 하나만 정리하기 🧺", "거울 보고 '수고했어' 한마디 건네기 🪞",
  "심호흡 세 번 천천히 하기 🌬️", "세수하고 개운하게 만들기 💦",
];
const missionEl = document.getElementById("mission");
let lastMission = -1;
document.getElementById("missionBtn").addEventListener("click", () => {
  Sound.tap();
  let i; do { i = Math.floor(Math.random() * missions.length); } while (i === lastMission && missions.length > 1);
  lastMission = i; missionEl.textContent = missions[i];
});

const soundGrid = document.getElementById("soundGrid");
soundGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".sound-btn");
  if (!btn) return;
  const type = btn.dataset.sound;
  document.querySelectorAll(".sound-btn").forEach((b) => {
    const on = b === btn && type !== "off";
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  if (type === "off") Sound.stopAmbient(); else Sound.startAmbient(type);
});
document.getElementById("ambientVol").addEventListener("input", (e) => Sound.setAmbientVolume(e.target.value / 100));

// 배경음 꺼짐 타이머 (sleep timer)
let sleepTimer = null;
const timerBtns = document.getElementById("timerBtns");
const timerStatus = document.getElementById("timerStatus");
timerBtns.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  Sound.tap();
  timerBtns.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
  const min = Number(b.dataset.min);
  if (sleepTimer) { clearTimeout(sleepTimer); sleepTimer = null; }
  if (min > 0) {
    sleepTimer = setTimeout(() => {
      Sound.stopAmbient();
      document.querySelectorAll(".sound-btn").forEach((x) => { x.classList.remove("active"); x.setAttribute("aria-pressed", "false"); });
      timerStatus.textContent = "타이머 종료 — 배경음을 껐어요. 잘 자요 🌙";
      timerBtns.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x.dataset.min === "0"));
      sleepTimer = null;
    }, min * 60000);
    timerStatus.textContent = `${min}분 뒤에 배경음이 자동으로 꺼져요.`;
    timerStatus.hidden = false;
  } else { timerStatus.hidden = true; }
});

/* ===================== 90일 챌린지 (복수 습관) ===================== */
const MILESTONES = {
  1: "첫 걸음을 뗐어요! 시작이 가장 어려운 건데, 해냈어요 🌱",
  3: "3일째! 작심삼일의 벽을 넘었어요 💪",
  7: "일주일 완성! 일상에 자리를 잡아가고 있어요 ☀️",
  14: "2주 돌파! 제법 익숙해졌죠? 🌿",
  21: "21일! 습관의 씨앗이 텄어요 🌷",
  30: "한 달 달성! 정말 대단해요 🎉",
  50: "50일! 절반을 훌쩍 넘었어요 🔥",
  66: "66일! 과학이 말하는 '습관이 자리잡는 날'에 도달했어요 🧠✨",
  90: "90일 완주!! 3달을 해낸 당신은 이미 다른 사람이에요. 진심으로 축하해요 🏆",
};
const expandedIds = new Set();
let addingMode = false;
let presetChoice = "", presetEmoji = "🎯", cueChoice = "";

const setup = document.getElementById("challengeSetup");
const presetGrid = document.getElementById("presetGrid");
const cueGrid = document.getElementById("cueGrid");
const challengeTitle = document.getElementById("challengeTitle");
const challengeMin = document.getElementById("challengeMin");
const intentionPreview = document.getElementById("intentionPreview");

function updateIntention() {
  const title = challengeTitle.value.trim() || presetChoice;
  if (!title) { intentionPreview.textContent = ""; return; }
  intentionPreview.textContent = cueChoice ? `나는 '${cueChoice}'에 '${title}'을 한다.` : `나는 매일 '${title}'을 한다.`;
}
presetGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".preset"); if (!btn) return;
  Sound.tap(); presetChoice = btn.dataset.h; presetEmoji = btn.dataset.e || "🎯";
  challengeTitle.value = presetChoice;
  document.querySelectorAll(".preset").forEach((p) => p.classList.toggle("selected", p === btn));
  updateIntention();
});
cueGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".cue"); if (!btn) return;
  Sound.tap();
  const wasSel = btn.classList.contains("selected");
  document.querySelectorAll(".cue").forEach((c) => c.classList.remove("selected"));
  if (!wasSel) { btn.classList.add("selected"); cueChoice = btn.dataset.c; } else cueChoice = "";
  updateIntention();
});
challengeTitle.addEventListener("input", () => {
  document.querySelectorAll(".preset").forEach((p) => p.classList.remove("selected"));
  presetEmoji = "🎯"; updateIntention();
});

document.getElementById("startChallenge").addEventListener("click", () => {
  const title = challengeTitle.value.trim() || presetChoice;
  if (!title) { alert("어떤 습관을 만들지 골라주세요 🙂"); return; }
  const chs = loadChs();
  chs.push({ id: "c" + Date.now(), emoji: presetEmoji, title, cue: cueChoice, minVersion: challengeMin.value.trim(), startDate: todayKey(), done: {}, celebrated: [] });
  saveChs(chs);
  Sound.success();
  // 폼 리셋
  presetChoice = ""; presetEmoji = "🎯"; cueChoice = "";
  challengeTitle.value = ""; challengeMin.value = ""; intentionPreview.textContent = "";
  document.querySelectorAll(".preset,.cue").forEach((b) => b.classList.remove("selected"));
  addingMode = false;
  renderChallenge();
});

document.getElementById("addHabitBtn").addEventListener("click", () => {
  addingMode = true; Sound.tap(); renderChallenge();
  setup.scrollIntoView({ behavior: "smooth", block: "start" });
});

function challengeStreak(h) {
  let streak = 0, d = new Date();
  if (!h.done[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (h.done[todayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

function renderChallenge() {
  const chs = loadChs();
  const list = document.getElementById("challengeList");
  const addBtn = document.getElementById("addHabitBtn");
  const summary = document.getElementById("chSummary");
  const emptyEl = setup.querySelector(".setup-empty");

  if (chs.length === 0) {
    list.innerHTML = ""; addBtn.hidden = true; summary.hidden = true;
    setup.hidden = false; emptyEl.hidden = false; addingMode = false;
    return;
  }

  // 요약
  const today = todayKey();
  const doneToday = chs.filter((h) => h.done[today]).length;
  summary.hidden = false;
  summary.textContent = `오늘 ${doneToday} / ${chs.length} 완료 ${doneToday === chs.length ? "🎉 다 해냈어요!" : "🌱"}`;

  // 카드 목록
  list.innerHTML = chs.map((h) => habitCardHtml(h)).join("");
  chs.forEach((h) => fillHabitGrid(h));

  addBtn.hidden = false;
  setup.hidden = !addingMode;
  emptyEl.hidden = true; // 추가 모드일 땐 빈상태 헤더 숨김
}

function habitCardHtml(h) {
  const dayNum = Math.min(daysSince(h.startDate) + 1, CH_TARGET);
  const doneCount = Object.values(h.done).filter(Boolean).length;
  const streak = challengeStreak(h);
  const todayDone = !!h.done[todayKey()];
  const open = expandedIds.has(h.id);
  const reached = Object.keys(MILESTONES).map(Number).filter((m) => doneCount >= m);
  const ms = reached.length ? MILESTONES[Math.max(...reached)] : "";
  return `
  <div class="habit-card" data-id="${h.id}">
    <div class="habit-top">
      <div class="habit-info" data-act="expand">
        <div class="habit-title">${h.emoji} ${escapeHtml(h.title)}</div>
        <div class="habit-meta">Day ${dayNum}/${CH_TARGET} · 달성 ${doneCount}일 · 연속 ${streak}일</div>
      </div>
      <button class="habit-check ${todayDone ? "done" : ""}" data-act="check" aria-label="오늘 완료 체크">${todayDone ? "✓" : "○"}</button>
    </div>
    <div class="habit-mini-bar"><i style="width:${(doneCount / CH_TARGET) * 100}%"></i></div>
    <div class="habit-detail ${open ? "open" : ""}">
      ${h.cue ? `<p class="habit-cue">⏰ ${escapeHtml(h.cue)}에 하기</p>` : ""}
      ${h.minVersion ? `<p class="habit-min">💡 힘든 날엔 최소만: ${escapeHtml(h.minVersion)}</p>` : ""}
      ${ms ? `<p class="ch-milestone">${ms}</p>` : ""}
      <div class="ch-grid" data-grid="${h.id}"></div>
      <div class="data-btns" style="margin-top:16px">
        <button class="btn" data-act="calendar">📅 캘린더에 매일 알림</button>
        <button class="btn" data-act="share">📤 진행 공유</button>
        <button class="btn danger" data-act="giveup">이 습관 그만두기</button>
      </div>
    </div>
  </div>`;
}

function fillHabitGrid(h) {
  const grid = document.querySelector(`[data-grid="${h.id}"]`);
  if (!grid) return;
  const today = todayKey();
  let html = "";
  for (let i = 0; i < CH_TARGET; i++) {
    const key = addDays(h.startDate, i);
    let cls = "ch-cell";
    if (h.done[key]) cls += " done";
    else if (key === today) cls += " today";
    else if (key < today) cls += " miss";   // 비처벌: 빈 구멍이 아니라 회색
    else cls += " future";
    html += `<div class="${cls}" title="${i + 1}일째"></div>`;
  }
  grid.innerHTML = html;
}

document.getElementById("challengeList").addEventListener("click", (e) => {
  const card = e.target.closest(".habit-card"); if (!card) return;
  const id = card.dataset.id;
  const actEl = e.target.closest("[data-act]"); if (!actEl) return;
  const act = actEl.dataset.act;
  const chs = loadChs(); const h = chs.find((x) => x.id === id); if (!h) return;

  if (act === "expand") {
    if (expandedIds.has(id)) expandedIds.delete(id); else expandedIds.add(id);
    card.querySelector(".habit-detail").classList.toggle("open");
  } else if (act === "check") {
    const k = todayKey();
    h.done[k] = !h.done[k];
    const after = Object.values(h.done).filter(Boolean).length;
    let celebrated = false;
    if (h.done[k] && MILESTONES[after] && !h.celebrated.includes(after)) {
      h.celebrated.push(after); celebrated = true;
    }
    saveChs(chs);
    if (h.done[k]) { if (celebrated) { Sound.celebrate(); confetti(); expandedIds.add(id); } else Sound.success(); }
    else Sound.tap();
    renderChallenge();
    if (h.done[k]) { // 오늘 칸 채움 애니메이션
      const grid = document.querySelector(`[data-grid="${id}"]`);
      const idx = daysSince(h.startDate);
      if (grid && grid.children[idx]) grid.children[idx].classList.add("just-done");
    }
  } else if (act === "calendar") {
    Sound.tap(); exportHabitIcs(h);
  } else if (act === "share") {
    Sound.tap(); shareHabit(h);
  } else if (act === "giveup") {
    if (!confirm("이 습관을 그만둘까요? 기록은 사라져요.\n그만둬도 괜찮아요 — 쉬어가는 것도 용기예요.")) return;
    saveChs(chs.filter((x) => x.id !== id)); expandedIds.delete(id);
    Sound.tap(); renderChallenge();
  }
});

/* 🔌 캘린더(.ics) — 습관을 캘린더 앱에 90일치 매일 알림으로 */
function exportHabitIcs(h) {
  const start = h.startDate.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const [hh, mm] = (settings.reminderTime || "09:00").split(":");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//오늘의 쉼//90일 챌린지//KR", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", "UID:" + h.id + "@oneul-shim", "DTSTAMP:" + stamp,
    "DTSTART;VALUE=DATE:" + start, "RRULE:FREQ=DAILY;COUNT=" + CH_TARGET,
    "SUMMARY:" + h.emoji + " " + h.title,
    "DESCRIPTION:오늘의 쉼 90일 챌린지 — 오늘도 한 칸 채워봐요!" + (h.cue ? " (" + h.cue + ")" : ""),
    "BEGIN:VALARM", "TRIGGER:PT" + (Number(hh) * 60 + Number(mm)) + "M", "ACTION:DISPLAY", "DESCRIPTION:" + h.title, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a"); a.href = url; a.download = `90일챌린지_${h.title}.ics`; a.click();
  URL.revokeObjectURL(url);
}
async function shareHabit(h) {
  const doneCount = Object.values(h.done).filter(Boolean).length;
  const text = `오늘의 쉼 ${h.emoji} '${h.title}' 90일 챌린지 — ${doneCount}일 달성! 함께 해요 💪`;
  try {
    if (navigator.share) await navigator.share({ title: "오늘의 쉼 챌린지", text });
    else { await navigator.clipboard.writeText(text); alert("진행 상황을 클립보드에 복사했어요!\n\n" + text); }
  } catch (e) {}
}

function confetti() {
  const emojis = ["🎉", "✨", "💛", "🌟", "🎊", "🌸"];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement("span");
    s.className = "confetti"; s.textContent = emojis[i % emojis.length];
    s.style.left = Math.random() * 100 + "vw"; s.style.animationDelay = (Math.random() * 0.4) + "s";
    s.style.fontSize = (16 + Math.random() * 18) + "px";
    document.body.appendChild(s); setTimeout(() => s.remove(), 2700);
  }
}

/* ===================== 프로젝트 (목표를 단계로) ===================== */
const PROJ_KEY = "projects_v1";
function loadProjs() { try { return JSON.parse(localStorage.getItem(PROJ_KEY)) || []; } catch { return []; } }
function saveProjs(a) { localStorage.setItem(PROJ_KEY, JSON.stringify(a)); }
const projExpanded = new Set();
let addingProject = false;

function dueLabel(due) {
  const diff = Math.round((new Date(due + "T00:00:00") - new Date(todayKey() + "T00:00:00")) / 86400000);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "오늘 마감";
  return `${-diff}일 지남`;
}
function renderProjects() {
  const projs = loadProjs();
  const list = document.getElementById("projectList");
  const addBtn = document.getElementById("addProjectBtn");
  const setupEl = document.getElementById("projectSetup");
  const emptyEl = setupEl.querySelector(".setup-empty");
  if (projs.length === 0) {
    list.innerHTML = ""; addBtn.hidden = true; setupEl.hidden = false; emptyEl.hidden = false; addingProject = false; return;
  }
  list.innerHTML = projs.map(projCardHtml).join("");
  addBtn.hidden = false; setupEl.hidden = !addingProject; emptyEl.hidden = true;
}
function projCardHtml(p) {
  const total = p.tasks.length, done = p.tasks.filter((t) => t.done).length;
  const pctv = total ? Math.round(100 * done / total) : 0;
  const open = projExpanded.has(p.id);
  const due = p.due ? dueLabel(p.due) : "";
  const overdue = p.due && !(total && done === total) && new Date(p.due + "T00:00:00") < new Date(todayKey() + "T00:00:00");
  return `
  <div class="habit-card" data-pid="${p.id}">
    <div class="habit-top">
      <div class="habit-info" data-pact="expand">
        <div class="habit-title">${p.emoji || "📁"} ${escapeHtml(p.title)}</div>
        <div class="habit-meta">${done}/${total} 완료${due ? ` · <span class="${overdue ? "proj-due overdue" : "proj-due"}">${due}</span>` : ""}</div>
      </div>
      <button class="habit-check pct ${total && done === total ? "done" : ""}" data-pact="expand" aria-label="펼치기">${pctv}%</button>
    </div>
    <div class="habit-mini-bar"><i style="width:${pctv}%"></i></div>
    <div class="habit-detail ${open ? "open" : ""}">
      <ul class="task-list">${p.tasks.map((t, i) => `
        <li class="task-row">
          <button class="task-check ${t.done ? "done" : ""}" data-pact="task" data-ti="${i}" aria-label="완료 체크">${t.done ? "✓" : ""}</button>
          <span class="task-text ${t.done ? "done" : ""}">${escapeHtml(t.text)}</span>
          <button class="task-del" data-pact="taskdel" data-ti="${i}" aria-label="할 일 삭제">×</button>
        </li>`).join("")}</ul>
      <div class="task-add">
        <input type="text" class="text-input" data-padd="${p.id}" placeholder="할 일 추가" maxlength="60" />
        <button class="btn" data-pact="addtask">추가</button>
      </div>
      <div class="data-btns" style="margin-top:14px">
        <button class="btn danger" data-pact="delproj">프로젝트 삭제</button>
      </div>
    </div>
  </div>`;
}
document.getElementById("projectList").addEventListener("click", (e) => {
  const card = e.target.closest(".habit-card"); if (!card) return;
  const pid = card.dataset.pid;
  const el = e.target.closest("[data-pact]"); if (!el) return;
  const act = el.dataset.pact;
  const projs = loadProjs(); const p = projs.find((x) => x.id === pid); if (!p) return;
  if (act === "expand") {
    if (projExpanded.has(pid)) projExpanded.delete(pid); else projExpanded.add(pid);
    card.querySelector(".habit-detail").classList.toggle("open");
  } else if (act === "task") {
    const i = +el.dataset.ti; p.tasks[i].done = !p.tasks[i].done;
    const allDone = p.tasks.length && p.tasks.every((t) => t.done);
    if (p.tasks[i].done && allDone && !p.completed) { p.completed = true; saveProjs(projs); Sound.celebrate(); confetti(); }
    else { if (!allDone) p.completed = false; saveProjs(projs); Sound[p.tasks[i].done ? "success" : "tap"](); }
    projExpanded.add(pid); renderProjects();
  } else if (act === "taskdel") {
    p.tasks.splice(+el.dataset.ti, 1); saveProjs(projs); projExpanded.add(pid); renderProjects(); Sound.tap();
  } else if (act === "addtask") {
    const inp = card.querySelector(`[data-padd="${pid}"]`); const txt = (inp.value || "").trim();
    if (!txt) return;
    p.tasks.push({ text: txt, done: false }); p.completed = false; saveProjs(projs); projExpanded.add(pid); renderProjects(); Sound.tap();
  } else if (act === "delproj") {
    if (!confirm("이 프로젝트를 삭제할까요? 할 일 목록도 사라져요.")) return;
    saveProjs(projs.filter((x) => x.id !== pid)); projExpanded.delete(pid); renderProjects(); Sound.tap();
  }
});
document.getElementById("addProjectBtn").addEventListener("click", () => {
  addingProject = true; Sound.tap(); renderProjects();
  document.getElementById("projectSetup").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("startProject").addEventListener("click", () => {
  const title = document.getElementById("projTitle").value.trim();
  if (!title) { alert("프로젝트 이름을 입력해주세요 🙂"); return; }
  const due = document.getElementById("projDue").value || "";
  const tasks = document.getElementById("projTasks").value.split("\n").map((s) => s.trim()).filter(Boolean).map((t) => ({ text: t, done: false }));
  const projs = loadProjs();
  projs.push({ id: "p" + Date.now(), emoji: "📁", title, due, tasks, completed: false, createdAt: new Date().toISOString() });
  saveProjs(projs); Sound.success();
  document.getElementById("projTitle").value = ""; document.getElementById("projDue").value = ""; document.getElementById("projTasks").value = "";
  addingProject = false; renderProjects();
});

/* ===================== 기록 / 데이터 ===================== */
function sortedEntries(entries) { return Object.values(entries).filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date)); }
function calcStreak(entries) {
  let streak = 0, d = new Date();
  if (!entries[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (entries[todayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
function dayOfWeekKo(key) { return ["일", "월", "화", "수", "목", "금", "토"][new Date(key + "T00:00:00").getDay()]; }

function renderStats() {
  const entries = loadEntries(), list = sortedEntries(entries);
  document.getElementById("streakNum").textContent = calcStreak(entries);
  document.getElementById("totalNum").textContent = list.length;
  const recent = list.slice(-7).filter((e) => e.mood);
  if (recent.length) {
    const avg = recent.reduce((s, e) => s + moodMeta[e.mood].score, 0) / recent.length;
    document.getElementById("avgMood").textContent = avg >= 3.5 ? "🙂 좋아요" : avg >= 2.6 ? "😐 보통" : "😮‍💨 지쳐요";
  } else document.getElementById("avgMood").textContent = "–";
  renderWeekly(entries);
  renderInsight(entries, list);
  drawChart(entries);
  renderDist(list);
  renderHistory(list);
}

/* 주간 리포트 (베타 피드백 #1) */
let weekData = null;
function renderWeekly(entries) {
  const keys = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(todayKey(d)); }
  const days = keys.map((k) => entries[k]).filter(Boolean);
  const moods = days.filter((e) => e.mood);
  const avgMood = moods.length ? moods.reduce((s, e) => s + moodMeta[e.mood].score, 0) / moods.length : null;
  const energies = days.filter((e) => e.energy);
  const avgEnergy = energies.length ? energies.reduce((s, e) => s + e.energy, 0) / energies.length : null;
  const chs = loadChs(); let habTotal = 0, habDone = 0;
  chs.forEach((h) => keys.forEach((k) => { if (k >= h.startDate) { habTotal++; if (h.done[k]) habDone++; } }));
  const counts = {}; moods.forEach((e) => counts[e.mood] = (counts[e.mood] || 0) + 1);
  const topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const range = `${+keys[0].split("-")[1]}/${+keys[0].split("-")[2]} ~ ${+keys[6].split("-")[1]}/${+keys[6].split("-")[2]}`;
  document.getElementById("weekRange").textContent = range;
  const el = document.getElementById("weeklySummary");
  if (days.length === 0) { el.textContent = "이번 주 기록이 아직 없어요. 한 번만 남겨도 다음 주 리포트가 시작돼요 🌱"; weekData = null; return; }
  const plain = settings.tone === "plain", parts = [];
  parts.push(plain ? `이번 주 ${days.length}일 기록.` : `이번 주 ${days.length}일이나 마음을 남겼어요.`);
  if (avgMood != null) parts.push(`평균 기분 ${avgMood.toFixed(1)}/5${topMood ? `, 가장 자주 ${moodMeta[topMood[0]].emoji} ${topMood[0]}` : ""}.`);
  if (avgEnergy != null) parts.push(`평균 에너지 ${avgEnergy.toFixed(1)}/5.`);
  if (habTotal > 0) parts.push(plain ? `습관 달성 ${habDone}/${habTotal}.` : `습관도 ${habDone}/${habTotal} 칸 채웠어요.`);
  if (!plain) parts.push(days.length >= 5 ? "스스로를 참 잘 돌본 한 주예요 💛" : "조금씩이어도 충분해요. 다음 주도 곁에 있을게요.");
  el.textContent = parts.join(" ");
  weekData = { range, daysLogged: days.length, avgMood, avgEnergy, habDone, habTotal, topMood: topMood ? topMood[0] : null, moodSeries: keys.map((k) => entries[k] && entries[k].mood ? moodMeta[entries[k].mood].score : null) };
}

function drawWeekCanvas() {
  const c = document.getElementById("weekCanvas"), ctx = c.getContext("2d"), W = 600, H = 340;
  const css = getComputedStyle(document.documentElement);
  const bg = css.getPropertyValue("--card").trim(), ink = css.getPropertyValue("--ink").trim();
  const accent = css.getPropertyValue("--accent").trim(), soft = css.getPropertyValue("--soft").trim(), line = css.getPropertyValue("--line").trim();
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "left";
  ctx.fillText("오늘의 쉼 · 주간 리포트", 32, 52);
  ctx.fillStyle = soft; ctx.font = "16px sans-serif"; ctx.fillText(weekData ? weekData.range : "", 32, 80);
  const lines = [];
  if (weekData) {
    lines.push(`기록 ${weekData.daysLogged}일`);
    if (weekData.avgMood != null) lines.push(`평균 기분 ${weekData.avgMood.toFixed(1)} / 5`);
    if (weekData.avgEnergy != null) lines.push(`평균 에너지 ${weekData.avgEnergy.toFixed(1)} / 5`);
    if (weekData.habTotal > 0) lines.push(`습관 ${weekData.habDone} / ${weekData.habTotal}`);
  }
  ctx.fillStyle = ink; ctx.font = "bold 20px sans-serif";
  lines.forEach((t, i) => ctx.fillText(t, 32, 132 + i * 38));
  if (weekData) {
    const x0 = 320, y0 = 110, w = 248, h = 158;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, w, h);
    const pts = weekData.moodSeries;
    ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.beginPath(); let started = false;
    pts.forEach((v, i) => { if (v == null) { started = false; return; } const x = x0 + w * i / 6, y = y0 + h - (h * (v - 1) / 4); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); });
    ctx.stroke(); ctx.fillStyle = accent;
    pts.forEach((v, i) => { if (v == null) return; const x = x0 + w * i / 6, y = y0 + h - (h * (v - 1) / 4); ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); });
  }
  ctx.fillStyle = soft; ctx.font = "14px sans-serif"; ctx.fillText("나를 돌본 한 주 🌿", 32, 318);
  return c.toDataURL("image/png");
}
function dataURLtoBlob(d) { const [h, b] = d.split(","); const m = h.match(/:(.*?);/)[1]; const bin = atob(b); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: m }); }
document.getElementById("weekImageBtn").addEventListener("click", () => {
  Sound.tap(); const url = drawWeekCanvas();
  const a = document.createElement("a"); a.href = url; a.download = `주간리포트_${todayKey()}.png`; a.click();
});
document.getElementById("weekShareBtn").addEventListener("click", async () => {
  Sound.tap();
  const url = drawWeekCanvas();
  const text = weekData ? `오늘의 쉼 · 주간 리포트 (${weekData.range}) — 기록 ${weekData.daysLogged}일${weekData.avgMood != null ? `, 평균 기분 ${weekData.avgMood.toFixed(1)}/5` : ""} 🌿` : "오늘의 쉼 주간 리포트";
  try {
    const file = new File([dataURLtoBlob(url)], "weekly.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text); alert("주간 리포트 요약을 복사했어요!\n\n" + text);
  } catch (e) {}
});

function drawChart(entries) {
  const canvas = document.getElementById("chart");
  const dpr = window.devicePixelRatio || 1, cssW = canvas.clientWidth || 560, cssH = 200;
  canvas.width = cssW * dpr; canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, cssW, cssH);
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue("--accent").trim(), energyC = css.getPropertyValue("--energy").trim();
  const line = css.getPropertyValue("--line").trim(), soft = css.getPropertyValue("--soft").trim();
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(todayKey(d)); }
  const padL = 26, padR = 10, padT = 14, padB = 24, w = cssW - padL - padR, h = cssH - padT - padB;
  const x = (i) => padL + (w * i) / (days.length - 1), y = (v) => padT + h - (h * (v - 1)) / 4;
  ctx.strokeStyle = line; ctx.lineWidth = 1;
  for (let v = 1; v <= 5; v += 2) { ctx.beginPath(); ctx.moveTo(padL, y(v)); ctx.lineTo(cssW - padR, y(v)); ctx.stroke(); }
  function plot(getter, color) {
    const pts = days.map((k, i) => { const e = entries[k]; const val = e ? getter(e) : null; return val ? { x: x(i), y: y(val) } : null; });
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.beginPath(); let started = false;
    pts.forEach((p) => { if (!p) { started = false; return; } if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y); });
    ctx.stroke(); ctx.fillStyle = color;
    pts.forEach((p) => { if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill(); } });
  }
  plot((e) => (e.mood ? moodMeta[e.mood].score : null), accent);
  plot((e) => e.energy || null, energyC);
  ctx.fillStyle = soft; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
  const lab = (k) => { const p = k.split("-"); return `${+p[1]}/${+p[2]}`; };
  ctx.fillText(lab(days[0]), x(0), cssH - 8); ctx.fillText(lab(days[days.length - 1]), x(days.length - 1), cssH - 8);
}

// 근거기반 if-then 인사이트
function renderInsight(entries, list) {
  const el = document.getElementById("insight");
  const withMood = list.filter((e) => e.mood);
  if (list.length < 3) {
    el.textContent = "기록이 3일 이상 쌓이면, 당신만의 마음 패턴을 살며시 알려드릴게요. 지금처럼 조금씩이면 충분해요 🌱";
    return;
  }
  const msgs = [];

  // R8: 위기 신호 — 최우선
  const recentNotes = list.slice(-5).map((e) => e.note || "").join(" ");
  if (detectCrisis(recentNotes)) { showSafety(); }

  // R1: 최근 3일 기분 ≤2 → 행동활성화
  const last3 = withMood.slice(-3);
  if (last3.length === 3 && last3.every((e) => moodMeta[e.mood].score <= 2)) {
    msgs.push("요즘 마음이 많이 무거우셨네요. 기분이 나아지길 기다리기보다, 아주 작은 행동 하나가 먼저 도움이 될 수 있어요. '쉼' 탭의 2분 미션을 하나 해볼까요? (행동활성화)");
  }

  // R2: 에너지 낮은데 기분은 보통 이상 → 소진 대응
  const lastBoth = list.slice(-3).filter((e) => e.energy && e.mood);
  if (lastBoth.length && lastBoth.every((e) => e.energy <= 2 && moodMeta[e.mood].score >= 3)) {
    msgs.push("마음은 버티는데 몸이 지쳐 있는 신호예요. 오늘은 호흡 1분이나 충분한 휴식을 먼저 챙겨보세요.");
  }

  // R6: 최근 7일 vs 이전 7일 기분 비교 → 추세
  const last7 = withMood.slice(-7), prev7 = withMood.slice(-14, -7);
  if (last7.length && prev7.length) {
    const a = last7.reduce((s, e) => s + moodMeta[e.mood].score, 0) / last7.length;
    const b = prev7.reduce((s, e) => s + moodMeta[e.mood].score, 0) / prev7.length;
    if (a - b >= 0.5) msgs.push("지난주보다 마음이 한결 나아지고 있어요. 스스로를 꾸준히 돌봐온 작은 변화들이 쌓이고 있어요 ☀️");
    else if (b - a >= 0.5) msgs.push("요즘 조금 더 지쳐 보여요. 스스로를 더 아껴줄 때예요. 무리하지 말아요 🫂");
  }

  // 요일 패턴
  const byDow = {};
  withMood.forEach((e) => { const d = dayOfWeekKo(e.date); (byDow[d] = byDow[d] || []).push(moodMeta[e.mood].score); });
  let worst = null;
  Object.entries(byDow).forEach(([d, arr]) => { if (arr.length < 2) return; const avg = arr.reduce((s, v) => s + v, 0) / arr.length; if (!worst || avg < worst.avg) worst = { d, avg }; });
  if (worst && worst.avg < 3) msgs.push(`'${worst.d}요일'에 유독 힘이 빠지는 편이에요. 그날엔 일정을 조금 비워두면 어때요?`);

  // R7: 감사 공백 + 기분 저조 → 감사 넛지
  const last5 = list.slice(-5);
  const noPraise = last5.length >= 3 && last5.every((e) => !e.praise);
  const lowRecent = withMood.slice(-3).some((e) => moodMeta[e.mood].score <= 2);
  if (noPraise && lowRecent) msgs.push("오늘 아주 사소해도 괜찮은, 고마웠던 일 하나만 적어볼까요? 작은 감사가 마음을 데워줘요. (Emmons & McCullough)");

  el.textContent = msgs.length ? msgs.slice(0, 2).join(" ") : "꾸준히 기록하고 있어요. 이 자체가 자신을 돌보는 멋진 일이에요. 💛";
}

function renderDist(list) {
  const wrap = document.getElementById("dist");
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const recent = list.filter((e) => e.mood && new Date(e.date + "T00:00:00") >= cutoff);
  wrap.innerHTML = "";
  if (!recent.length) { wrap.innerHTML = '<p class="empty">아직 기분 기록이 없어요.</p>'; return; }
  const counts = {}; recent.forEach((e) => { counts[e.mood] = (counts[e.mood] || 0) + 1; });
  const max = Math.max(...Object.values(counts));
  Object.keys(moodMeta).forEach((mood) => {
    const c = counts[mood] || 0; if (!c) return;
    const row = document.createElement("div"); row.className = "dist-row";
    row.innerHTML = `<span class="dist-emoji">${moodMeta[mood].emoji}</span><div class="dist-bar-wrap"><div class="dist-bar" style="width:${(c / max) * 100}%"></div></div><span class="dist-count">${c}</span>`;
    wrap.appendChild(row);
  });
}

function renderHistory(list) {
  const ul = document.getElementById("history"); ul.innerHTML = "";
  const rev = [...list].reverse();
  if (!rev.length) { ul.innerHTML = '<p class="empty">첫 기록을 기다리고 있어요.</p>'; return; }
  rev.slice(0, 30).forEach((e) => {
    const li = document.createElement("li"); const p = e.date.split("-");
    const dateStr = `${+p[1]}월 ${+p[2]}일 (${dayOfWeekKo(e.date)})`;
    const moodStr = e.mood ? `${moodMeta[e.mood].emoji} ${e.mood}` : "";
    const energyStr = e.energy ? ` · 에너지 ${e.energy}/5` : "";
    li.innerHTML = `<button class="h-del" data-date="${e.date}" aria-label="기록 삭제">×</button>
      <div class="h-top"><span class="h-date">${dateStr}</span><span class="h-mood">${moodStr}${energyStr}</span></div>
      ${e.note ? `<p class="h-note">${escapeHtml(e.note)}</p>` : ""}
      ${e.praise ? `<p class="h-praise">🌱 ${escapeHtml(e.praise)}</p>` : ""}`;
    ul.appendChild(li);
  });
  ul.querySelectorAll(".h-del").forEach((b) => b.addEventListener("click", () => {
    const entries = loadEntries(); delete entries[b.dataset.date]; saveEntries(entries); Sound.tap(); renderStats();
  }));
}

/* ===================== 설정 ===================== */
const settings = Object.assign(
  { theme: "warm", sfx: true, breathSound: true, reminderOn: false, reminderTime: "21:00", ambientVol: 55, textSize: "m", tone: "warm" },
  loadSettings()
);
const darkMq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function resolveTheme() { return settings.theme === "auto" ? (darkMq && darkMq.matches ? "dark" : "warm") : settings.theme; }
function applySettings() {
  document.documentElement.setAttribute("data-theme", resolveTheme());
  document.documentElement.setAttribute("data-textsize", settings.textSize);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  document.querySelectorAll(".theme-btn").forEach((b) => b.classList.toggle("active", b.dataset.theme === settings.theme));
  document.querySelectorAll("#textSizeSeg button").forEach((b) => b.classList.toggle("active", b.dataset.size === settings.textSize));
  document.querySelectorAll("#toneSeg button").forEach((b) => b.classList.toggle("active", b.dataset.tone === settings.tone));
  document.getElementById("sfxToggle").checked = settings.sfx;
  document.getElementById("breathSoundToggle").checked = settings.breathSound;
  document.getElementById("reminderToggle").checked = settings.reminderOn;
  document.getElementById("reminderTime").value = settings.reminderTime;
  document.getElementById("ambientVol").value = settings.ambientVol;
  Sound.setSfx(settings.sfx); Sound.setBreath(settings.breathSound); Sound.state.ambientVol = settings.ambientVol / 100;
}
if (darkMq) darkMq.addEventListener("change", () => { if (settings.theme === "auto") { applySettings(); if (!document.getElementById("tab-stats").hidden) drawChart(loadEntries()); } });
document.getElementById("themeGrid").addEventListener("click", (e) => {
  const btn = e.target.closest(".theme-btn"); if (!btn) return;
  settings.theme = btn.dataset.theme; saveSettingsObj(settings); applySettings(); Sound.tap();
  if (!document.getElementById("tab-stats").hidden) drawChart(loadEntries());
});
document.getElementById("textSizeSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  settings.textSize = b.dataset.size; saveSettingsObj(settings); applySettings(); Sound.tap();
});
document.getElementById("toneSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  settings.tone = b.dataset.tone; saveSettingsObj(settings); applySettings(); Sound.tap();
  // 현재 선택된 기분이 있으면 답변 톤 즉시 갱신
  if (selectedMood) { moodResponse.textContent = curReplies()[selectedMood]; }
});
document.getElementById("sfxToggle").addEventListener("change", (e) => { settings.sfx = e.target.checked; saveSettingsObj(settings); Sound.setSfx(settings.sfx); });
document.getElementById("breathSoundToggle").addEventListener("change", (e) => { settings.breathSound = e.target.checked; saveSettingsObj(settings); Sound.setBreath(settings.breathSound); });
document.getElementById("ambientVol").addEventListener("change", (e) => { settings.ambientVol = Number(e.target.value); saveSettingsObj(settings); });

/* 알림 */
let reminderTimer = null;
const reminderMsg = document.getElementById("reminderMsg");
function scheduleReminder() {
  if (reminderTimer) { clearTimeout(reminderTimer); reminderTimer = null; }
  if (!settings.reminderOn) return;
  const [hh, mm] = settings.reminderTime.split(":").map(Number);
  const now = new Date(), next = new Date(); next.setHours(hh, mm, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  reminderTimer = setTimeout(fireReminder, next - now);
}
function fireReminder() {
  const done = !!loadEntries()[todayKey()];
  const body = done ? "오늘도 기록해줘서 고마워요. 푹 쉬어요 🌙" : "오늘 마음은 어땠나요? 한 줄만 남겨도 충분해요 💛";
  if ("Notification" in window && Notification.permission === "granted") new Notification("오늘의 쉼 ☕", { body });
  else { reminderMsg.textContent = body; reminderMsg.hidden = false; setTimeout(() => { reminderMsg.hidden = true; }, 6000); }
  Sound.chime(); scheduleReminder();
}
document.getElementById("reminderToggle").addEventListener("change", async (e) => {
  settings.reminderOn = e.target.checked;
  if (settings.reminderOn && "Notification" in window && Notification.permission === "default") { try { await Notification.requestPermission(); } catch (err) {} }
  saveSettingsObj(settings); scheduleReminder();
  if (settings.reminderOn) { reminderMsg.textContent = `좋아요! 매일 ${settings.reminderTime}에 살며시 알려드릴게요.`; reminderMsg.hidden = false; setTimeout(() => { reminderMsg.hidden = true; }, 4000); }
});
document.getElementById("reminderTime").addEventListener("change", (e) => { settings.reminderTime = e.target.value; saveSettingsObj(settings); scheduleReminder(); });

document.getElementById("exportBtn").addEventListener("click", () => {
  Sound.tap();
  const data = JSON.stringify({ entries: loadEntries(), challenges: loadChs(), projects: loadProjs() }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = `오늘의쉼_백업_${todayKey()}.json`; a.click(); URL.revokeObjectURL(url);
});
document.getElementById("replayOnboard").addEventListener("click", () => { Sound.tap(); showOnboard(); });
document.getElementById("clearBtn").addEventListener("click", () => {
  if (!confirm("정말 모든 기록을 지울까요? 되돌릴 수 없어요.")) return;
  localStorage.removeItem(DB.ENTRIES); localStorage.removeItem(DB.CH); localStorage.removeItem(PROJ_KEY);
  Sound.tap(); selectedMood = null;
  document.querySelectorAll(".mood").forEach((m) => { m.classList.remove("selected"); m.setAttribute("aria-pressed", "false"); });
  moodResponse.hidden = true; todayMore.hidden = true; journalInput.value = ""; praiseInput.value = "";
  expandedIds.clear(); projExpanded.clear(); renderChallenge(); renderProjects();
  alert("기록을 모두 비웠어요. 언제든 다시 시작할 수 있어요 🌱");
});

/* 빠른 호흡 — 어디서든 (베타 피드백: 불안형 요구) */
const breathOverlay = document.getElementById("breathOverlay");
const qbBreather = makeBreather(document.getElementById("qbCircle"), document.getElementById("qbText"), "breath-circle big");
document.getElementById("quickBreathFab").addEventListener("click", () => { breathOverlay.hidden = false; qbBreather.start(); });
document.getElementById("qbClose").addEventListener("click", () => { qbBreather.stop(); breathOverlay.hidden = true; });

/* 첫 제스처에 오디오 unlock */
window.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

/* 서비스워커 */
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

/* 초기화 */
applySettings();
loadToday();
scheduleReminder();
if (!localStorage.getItem(DB.ONBOARD)) showOnboard();
