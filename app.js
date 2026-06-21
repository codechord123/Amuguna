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
  "활기차요":   { emoji: "😄", score: 5, tag: "energized" },
};
const moodReplies = {
  "지쳤어요": "많이 지쳤구나… 지치는 건 약해서가 아니라 그동안 너무 오래 애써왔기 때문이에요. 오늘은 쉬는 것도 회복이에요.",
  "우울해요": "마음이 무거운 날이죠. 그 기분, 그럴 만해요. 억지로 밀어내지 않아도 괜찮아요. 곁에 있을게요.",
  "불안해요": "불안한 마음, 알아요. 한 번에 하나씩만 생각해요. 잠깐 호흡 쉼표에서 숨을 고르고 와도 좋아요.",
  "무기력해요": "지금의 무기력은 게으름이 아니라 몸과 마음이 보내는 쉼 신호예요. 아주 작은 움직임 하나면 충분해요.",
  "그럭저럭": "그럭저럭도 충분히 잘하고 있는 거예요. 오늘도 잘 흘러가고 있어요.",
  "괜찮아요": "괜찮다니 다행이에요. 이 가벼움을 오늘 잘 누려봐요 ☺️",
  "활기차요": "활기가 도는 날이네요! 이 좋은 기운, 오늘 마음껏 누려요 ⚡",
};
const plainReplies = {
  "지쳤어요": "지쳤네요. 오늘은 회복을 우선하세요.",
  "우울해요": "기분이 가라앉았네요. 무리하지 마세요.",
  "불안해요": "불안하군요. 호흡부터 한 번 정리해보세요.",
  "무기력해요": "에너지가 낮네요. 아주 작은 것 하나만 하세요.",
  "그럭저럭": "그럭저럭이면 괜찮습니다.",
  "괜찮아요": "괜찮은 날이네요. 이 컨디션을 잘 활용해보세요.",
  "활기차요": "컨디션이 좋네요. 이 기운을 잘 활용하세요.",
};
const energyFaces = { 1: "🪫 바닥이에요", 2: "😔 적어요", 3: "😐 보통", 4: "🙂 괜찮아요", 5: "⚡ 넘쳐요" };

/* 감정 팔레트 — '마음 + 에너지 + 태그'를 하나로 통합한 도구.
   정서 원형모형(Russell 1980): 에너지(각성) × 쾌-불쾌(정서가).
   base = 통계·점수용 기존 7분류, en = 에너지(1-5) */
const EMOTIONS = [
  // 에너지 높음
  { k: "신나요",   e: "🤩", base: "활기차요",   en: 5, band: "high" },
  { k: "설레요",   e: "😆", base: "활기차요",   en: 5, band: "high" },
  { k: "뿌듯해요", e: "😏", base: "괜찮아요",   en: 4, band: "high" },
  { k: "화나요",   e: "😤", base: "불안해요",   en: 5, band: "high" },
  { k: "불안해요", e: "😰", base: "불안해요",   en: 4, band: "high" },
  { k: "초조해요", e: "😣", base: "불안해요",   en: 4, band: "high" },
  { k: "스트레스", e: "😫", base: "불안해요",   en: 4, band: "high" },
  // 에너지 보통
  { k: "괜찮아요", e: "🙂", base: "괜찮아요",   en: 3, band: "mid" },
  { k: "평온해요", e: "😊", base: "괜찮아요",   en: 3, band: "mid" },
  { k: "그럭저럭", e: "😐", base: "그럭저럭",   en: 3, band: "mid" },
  { k: "멍해요",   e: "😶", base: "그럭저럭",   en: 3, band: "mid" },
  { k: "복잡해요", e: "🤔", base: "그럭저럭",   en: 3, band: "mid" },
  // 에너지 낮음
  { k: "지쳤어요",   e: "😮‍💨", base: "지쳤어요",   en: 2, band: "low" },
  { k: "졸려요",     e: "😴",   base: "무기력해요", en: 1, band: "low" },
  { k: "무기력해요", e: "😶‍🌫️", base: "무기력해요", en: 1, band: "low" },
  { k: "우울해요",   e: "🥺",   base: "우울해요",   en: 2, band: "low" },
  { k: "슬퍼요",     e: "😢",   base: "우울해요",   en: 2, band: "low" },
  { k: "외로워요",   e: "😔",   base: "우울해요",   en: 2, band: "low" },
];
const EMO_BANDS = [
  { id: "high", label: "⚡ 에너지가 높아요" },
  { id: "mid",  label: "🌤️ 보통이에요" },
  { id: "low",  label: "🔋 가라앉아 있어요" },
];
function emoByKey(k) { return EMOTIONS.find((x) => x.k === k); }
const CRISIS_WORDS = ["죽고 싶", "죽고싶", "자살", "사라지고 싶", "사라지고싶", "없어지고 싶", "없어지고싶", "죽어버", "살기 싫", "살기싫", "자해", "목숨을"];

/* 햅틱(진동) — 웹 vibrate. iOS Safari는 무시하므로 네이티브(Capacitor Haptics)로 대체 가능 */
const Haptic = {
  on: true,
  tap() { if (this.on && navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} } },
  success() { if (this.on && navigator.vibrate) { try { navigator.vibrate([12, 40, 18]); } catch (e) {} } },
};

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    if (window.Cloud && window.Cloud.markDirty) window.Cloud.markDirty(); // 클라우드 동기화(로그인 시)
    return true;
  } catch (e) {
    const msg = "저장에 실패했어요. 저장 공간이 부족하거나 사생활 보호 모드일 수 있어요. 설정 → 내보내기로 백업해 주세요.";
    if (typeof toast === "function") toast(msg); else alert(msg);
    return false;
  }
}
function loadEntries() { try { return JSON.parse(localStorage.getItem(DB.ENTRIES)) || {}; } catch { return {}; } }
function saveEntries(o) { return safeSet(DB.ENTRIES, JSON.stringify(o)); }
function loadSettings() { try { return JSON.parse(localStorage.getItem(DB.SETTINGS)) || {}; } catch { return {}; } }
function saveSettingsObj(o) { return safeSet(DB.SETTINGS, JSON.stringify(o)); }
function loadChs() { try { return JSON.parse(localStorage.getItem(DB.CH)) || []; } catch { return []; } }
function saveChs(a) { return safeSet(DB.CH, JSON.stringify(a)); }

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
function activateTab(name, { scroll = true } = {}) {
  document.querySelectorAll(".tabbtn").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  Object.entries(tabs).forEach(([k, id]) => { document.getElementById(id).hidden = k !== name; });
  if (name === "stats") renderStats();
  if (name === "challenge") renderChallenge();
  if (name === "today") {
    // 오늘 탭은 '오늘의 여정'만 보이게. 직접 기록 폼은 수정 진입 시에만 노출.
    const cc = document.getElementById("checkin-card");
    cc.hidden = true; cc.classList.add("collapsed");
    document.getElementById("journeyStartCard").hidden = false;
    updateJourneyHero();
  }
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}
tabbar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tabbtn");
  if (!btn) return;
  Sound.tap(); activateTab(btn.dataset.tab);
});
// 지난 기록을 탭/달력에서 눌러 바로 그 날짜를 편집
function openEntryDetail(dateKey) {
  const e = loadEntries()[dateKey]; if (!e) return;
  subEntryDate = dateKey;
  const p = dateKey.split("-");
  openSubpage(`${+p[1]}월 ${+p[2]}일 (${dayOfWeekKo(dateKey)})`, entryDetailHtml(e), "entry");
}
function entryDetailHtml(e) {
  const mood = e.mood ? `${moodMeta[e.mood].emoji} ${e.mood}` : "기분 기록 없음";
  const refl = e.reflection && (e.reflection.good || e.reflection.hard);
  return `
    <p class="detail-stat">${mood}${e.energy ? ` · 에너지 ${e.energy}/5` : ""}</p>
    ${e.note ? `<div class="card"><h2>📝 일기</h2><p class="h-note">${escapeHtml(e.note)}</p></div>` : ""}
    ${e.praise ? `<div class="card"><h2>🌱 잘한 일</h2><p>${escapeHtml(e.praise)}</p></div>` : ""}
    ${refl ? `<div class="card"><h2>🌙 저녁 회고</h2>${e.reflection.good ? `<p>🌤️ ${escapeHtml(e.reflection.good)}</p>` : ""}${e.reflection.hard ? `<p>🌧️ ${escapeHtml(e.reflection.hard)}</p>` : ""}</div>` : ""}
    ${(e.tags && e.tags.length) ? `<div class="hist-tags">${e.tags.map((t) => `<span class="link-tag">#${escapeHtml(t)}</span>`).join("")}</div>` : ""}
    <div class="data-btns" style="margin-top:18px">
      <button class="btn primary" data-eact="edit">✏️ 수정</button>
      <button class="btn danger" data-eact="del">삭제</button>
    </div>`;
}
function openEntryEditor(dateKey) {
  if (dateKey > todayKey()) return;
  activateTab("today");
  // 수정할 때만 기록 폼을 펼쳐 보이고, 여정 히어로는 잠시 감춤
  const cc = document.getElementById("checkin-card");
  document.getElementById("journeyStartCard").hidden = true;
  cc.hidden = false; cc.classList.remove("collapsed");
  entryDate.value = dateKey; loadEntryForm(dateKey);
  cc.scrollIntoView({ behavior: "smooth", block: "start" });
}

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

const tagInput = document.getElementById("tagInput");
const reflectGood = document.getElementById("reflectGood");
const reflectHard = document.getElementById("reflectHard");
const reflectFields = document.getElementById("reflectFields");
function parseTags(s) { return (s || "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean); }
document.getElementById("tagSuggest").addEventListener("click", (e) => {
  const b = e.target.closest(".link-chip"); if (!b) return;
  Sound.tap();
  const cur = parseTags(tagInput.value); const t = b.dataset.tag;
  if (!cur.includes(t)) { cur.push(t); tagInput.value = cur.join(", "); }
});

function resetForm() {
  selectedMood = null;
  document.querySelectorAll(".mood").forEach((m) => { m.classList.remove("selected"); m.setAttribute("aria-pressed", "false"); });
  moodResponse.hidden = true;
  energyRange.value = 3; energyFace.textContent = energyFaces[3];
  journalInput.value = ""; praiseInput.value = ""; tagInput.value = ""; saveMsg.hidden = true;
  reflectGood.value = ""; reflectHard.value = "";
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
  if (t.tags) tagInput.value = t.tags.join(", ");
  if (t.reflection) { reflectGood.value = t.reflection.good || ""; reflectHard.value = t.reflection.hard || ""; }
  todayMore.hidden = false;
}
function loadToday() { entryDate.value = todayKey(); entryDate.max = todayKey(); loadEntryForm(todayKey()); updateJourneyHero(); }

// 첫 화면(오늘의 여정) — 날짜·상태에 맞춰 주제 중심으로 안내
function updateJourneyHero() {
  const card = document.getElementById("journeyStartCard");
  if (!card) return;
  const tk = todayKey(), p = tk.split("-");
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set("journeyEyebrow", `${+p[1]}월 ${+p[2]}일 ${dayOfWeekKo(tk)}요일`);
  const e = loadEntries()[tk];
  const done = !!(e && e.mood);
  card.classList.toggle("done", done);
  if (done) {
    set("journeyEmoji", "🌿");
    set("journeyStartHint", `오늘 ${moodMeta[e.mood].emoji} ${e.mood} 마음을 남겼어요. 잘 해냈어요.`);
    set("journeyStart", "오늘 여정 다시 하기");
    set("journeySub", "원하면 언제든 다시 돌아볼 수 있어요");
  } else {
    set("journeyEmoji", "✨");
    set("journeyStartHint", "한 걸음씩 따라가며 오늘 마음을 남겨봐요.");
    set("journeyStart", "오늘의 여정 시작하기");
    set("journeySub", "3분이면 충분해요 · 한 번에 하나씩");
  }
}
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
  const reflection = { good: reflectGood.value.trim(), hard: reflectHard.value.trim() };
  entries[k] = { date: k, mood: selectedMood, energy: Number(energyRange.value), note, praise: praiseInput.value.trim(), tags: parseTags(tagInput.value), reflection, updatedAt: new Date().toISOString() };
  saveEntries(entries);
  Sound.success(); Haptic.success();
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
  checkBadges();
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
  "오늘 흘린 눈물도 당신을 약하게 만들지 않아요. 오히려 솔직한 거예요.",
  "남들의 속도에 맞추지 않아도 돼요. 당신만의 계절이 있어요.",
  "작은 숨 하나도 살아내는 일이에요. 지금 잘 쉬고 있어요.",
  "어떤 마음이 들든, 그 마음을 느낀 당신이 잘못한 건 아니에요.",
  "오늘의 실수는 내일의 당신을 정의하지 않아요.",
  "지치면 멈춰도 돼요. 멈춤은 포기가 아니라 정비예요.",
  "당신은 '더 나은 사람'이 될 필요 없어요. 이미 충분한 사람이에요.",
  "마음이 흐린 날엔, 해가 사라진 게 아니라 잠시 구름 뒤에 있는 거예요.",
  "오늘 한 걸음도 못 걸었다면, 서 있어 준 것만으로 고마워요.",
  "당신의 속도가 느린 게 아니라, 길이 가팔랐을 뿐이에요.",
  "스스로를 미워하는 마음이 들 땐, 잠깐 그 마음과 거리를 둬요. 당신이 아니에요.",
  "잘 쉬는 것도 책임감 있는 일이에요.",
  "지금 느끼는 무게, 혼자 다 들지 않아도 돼요.",
  "하루를 끝까지 살아낸 당신에게 박수를 보내요.",
  "마음은 날씨 같아서, 이 기분도 반드시 바뀌어요.",
  "당신이 당신에게 가장 든든한 사람이 되어줄 수 있어요.",
  "완벽한 하루가 아니어도, 의미 있는 하루였어요.",
  "버티는 중이라면, 그건 이미 용기를 내고 있다는 뜻이에요.",
  "오늘은 '해야 할 일'보다 '쉬어야 할 마음'을 먼저 살펴요.",
  "당신의 존재는 성취와 상관없이 소중해요.",
  "작은 친절을 자신에게도 나눠줘요. 그럴 자격이 충분해요.",
  "지금 이 순간만큼은, 아무것도 증명하지 않아도 돼요.",
  "넘어진 자리에서 잠깐 앉아 있어도 괜찮아요. 일어날 힘은 다시 와요.",
  "오늘도 마음을 들여다본 당신, 그 다정함이 참 귀해요.",
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
  "통제할 수 있는 것에만 에너지를 쓰세요.",
  "감정을 없애려 하지 말고, 그냥 지나가게 두세요.",
  "잠과 식사가 무너지면 멘탈도 무너집니다. 기본부터 챙기세요.",
  "오늘 못 한 일은 목록에 남겨두고 내일 처리하세요.",
  "완료가 완벽보다 낫습니다.",
  "30분 일하고 5분 쉬세요. 지속이 핵심입니다.",
  "지금 기분은 사실이 아니라 상태일 뿐입니다.",
  "할 일을 3개 이하로 줄이세요.",
  "산책 10분이 생각 정리에 도움이 됩니다.",
  "남과 비교할 데이터는 충분하지 않습니다. 본인 추세만 보세요.",
  "거절도 하나의 선택지입니다.",
  "휴식을 일정에 미리 넣어두세요.",
  "기록은 판단이 아니라 관찰입니다.",
  "작게 시작하고, 작게 유지하세요.",
  "오늘의 성과가 없어도 내일은 옵니다.",
];
const quoteEl = document.getElementById("quote");
const favBtn = document.getElementById("favBtn");
const favOnly = document.getElementById("favOnly");
let currentQuote = "";
function basePool() { return (settings.tone === "plain" ? plainQuotes : quotes).concat(settings.myQuotes || []); }
function activePool() { return (favOnly.checked && (settings.favQuotes || []).length) ? settings.favQuotes : basePool(); }
function updateFavBtn() {
  const fav = (settings.favQuotes || []).includes(currentQuote);
  favBtn.textContent = fav ? "♥" : "♡"; favBtn.classList.toggle("on", fav);
}
function showRandomQuote() {
  const pool = activePool(); if (!pool.length) return;
  let i, tries = 0; do { i = Math.floor(Math.random() * pool.length); tries++; } while (pool[i] === currentQuote && pool.length > 1 && tries < 12);
  currentQuote = pool[i];
  quoteEl.classList.add("swap");
  setTimeout(() => { quoteEl.textContent = "“" + currentQuote + "”"; quoteEl.classList.remove("swap"); updateFavBtn(); }, 230);
}
document.getElementById("quoteBtn").addEventListener("click", () => { Sound.chime(); showRandomQuote(); });
favBtn.addEventListener("click", () => {
  if (!currentQuote) return;
  Sound.tap();
  settings.favQuotes = settings.favQuotes || [];
  const idx = settings.favQuotes.indexOf(currentQuote);
  if (idx >= 0) settings.favQuotes.splice(idx, 1); else settings.favQuotes.push(currentQuote);
  saveSettingsObj(settings); updateFavBtn();
});
favOnly.addEventListener("change", () => { Sound.tap(); showRandomQuote(); });
document.getElementById("myQuoteAdd").addEventListener("click", () => {
  const inp = document.getElementById("myQuoteInput"); const t = inp.value.trim(); if (!t) return;
  settings.myQuotes = settings.myQuotes || [];
  if (!settings.myQuotes.includes(t)) settings.myQuotes.push(t);
  saveSettingsObj(settings); inp.value = ""; Sound.success();
  currentQuote = t; quoteEl.textContent = "“" + t + "”"; updateFavBtn();
  if (subMode === "quotes" && !subpage.hidden) subBody.innerHTML = quoteManageHtml();
});

function quoteManageHtml() {
  const fav = settings.favQuotes || [], mine = settings.myQuotes || [];
  const section = (title, arr, kind) => arr.length
    ? `<p class="manage-h">${title}</p>` + arr.map((q, i) =>
        `<div class="manage-row"><span>${escapeHtml(q)}</span><button class="task-del" data-mk="${kind}" data-mi="${i}" aria-label="삭제">×</button></div>`).join("")
    : "";
  const html = section("♥ 즐겨찾기", fav, "fav") + section("✍️ 내 문구", mine, "my");
  return html || '<p class="empty">아직 즐겨찾기나 내 문구가 없어요.</p>';
}
document.getElementById("manageToggle").addEventListener("click", () => { Sound.tap(); openSubpage("내 문구 · 즐겨찾기", quoteManageHtml(), "quotes"); });

// 호흡 컨트롤러 — 매 초 카운트다운 + 반복 횟수 표시 (4-7-8)
const BREATH_PHASES = [
  { name: "들이쉬기", dur: 4, cls: "inhale", cue: "inhale" },
  { name: "잠깐 멈춰요", dur: 7, cls: "hold", cue: "hold" },
  { name: "내쉬기", dur: 8, cls: "exhale", cue: "exhale" },
];
function makeBreather(circleEl, textEl, base, opts) {
  opts = opts || {};
  const isSleep = opts.sleep || (() => false);
  let running = false, tick = null, pi = 0, remain = 0, cycles = 0;
  function render() { textEl.innerHTML = `${BREATH_PHASES[pi].name}<br><b>${remain}</b>`; }
  function enter(i) {
    pi = i; const ph = BREATH_PHASES[i]; remain = ph.dur;
    circleEl.className = base + " " + ph.cls;
    circleEl.style.transitionDuration = (ph.cls === "hold" ? 0.4 : ph.dur) + "s";
    Sound.breathCue(ph.cue, ph.dur); render();
  }
  const api = {
    isRunning: () => running,
    cycles: () => cycles,
    start() {
      if (running) return;
      try { settings.breathCount = (settings.breathCount || 0) + 1; saveSettingsObj(settings); } catch (e) {}
      Sound.unlock(); Sound.breathStart(); running = true; cycles = 0; enter(0);
      tick = setInterval(() => {
        remain--;
        if (remain <= 0) {
          let next = pi + 1;
          if (next >= BREATH_PHASES.length) {
            next = 0; cycles++;
            if (isSleep() && opts.maxCycles && cycles >= opts.maxCycles) { api.stop(); if (opts.onAutoEnd) opts.onAutoEnd(); return; }
          }
          enter(next);
        } else { render(); Sound.tick(); }   // 숫자 + 카운트 틱 (모든 모드)
      }, 1000);
    },
    stop() {
      running = false; if (tick) { clearInterval(tick); tick = null; }
      Sound.breathStop();
      circleEl.className = base; circleEl.style.transitionDuration = "";
      textEl.innerHTML = cycles > 0 ? `잘했어요<br><b>${cycles}회</b>` : "잘했어요";
    },
  };
  return api;
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
  "지금 손에 닿는 것 5가지 만져보기 ✋", "좋아하는 향 한 번 맡기 🕯️", "발가락을 쥐었다 펴기 10번 🦶",
  "오늘 하늘 색깔 한 번 올려다보기 🌤️", "물 마시고 기지개 켜기 💧", "어깨에 힘 빼고 한숨 길게 내쉬기 😮‍💨",
  "좋아하는 사진 한 장 다시 보기 🖼️", "방 불을 조금 어둡게 해보기 💡", "포근한 담요나 옷 걸치기 🧣",
  "오늘 먹고 싶은 것 하나 정하기 🍫", "창밖 소리 30초 가만히 듣기 👂", "손 따뜻하게 비비기 🤲",
  "할 일 목록에서 하나 지우기(미뤄도 OK) ✔️", "좋아하는 사람에게 안부 한 줄 보내기 💬", "스트레칭으로 목 좌우로 돌리기 🙆‍♀️",
  "지금 기분을 한 단어로 말해보기 🗣️", "따뜻한 물로 손 씻기 🚿", "의자에 기대 1분 멍때리기 🌫️",
  "좋아하는 음료 천천히 한 모금 🥤", "휴대폰 알림 잠깐 꺼두기 🔕", "가장 편한 자세로 2분 눕기 🛋️",
  "오늘의 작은 성공 하나 떠올리기 🌟", "식물이나 창밖 초록 바라보기 🪴", "좋아하는 노래 흥얼거리기 🎶",
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

function resetSetupForm() {
  presetChoice = ""; presetEmoji = "🎯"; cueChoice = "";
  challengeTitle.value = ""; challengeMin.value = ""; intentionPreview.textContent = "";
  document.querySelectorAll(".preset,.cue").forEach((b) => b.classList.remove("selected"));
}
document.getElementById("startChallenge").addEventListener("click", () => {
  const title = challengeTitle.value.trim() || presetChoice;
  if (!title) { alert("어떤 습관을 만들지 골라주세요 🙂"); return; }
  const chs = loadChs();
  chs.push({ id: "c" + Date.now(), emoji: presetEmoji, title, cue: cueChoice, minVersion: challengeMin.value.trim(), startDate: todayKey(), done: {}, celebrated: [] });
  saveChs(chs);
  Sound.success();
  resetSetupForm();
  closeSubpage();
  renderChallenge();
});

document.getElementById("addHabitBtn").addEventListener("click", () => { Sound.tap(); openAddHabit(); });

function challengeStreak(h) {
  let streak = 0, d = new Date();
  if (!h.done[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (h.done[todayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

function renderChallenge() {
  const chs = loadChs();
  const list = document.getElementById("challengeList");
  const summary = document.getElementById("chSummary");
  const chEmpty = document.getElementById("chEmpty");
  if (chs.length === 0) {
    list.innerHTML = ""; summary.hidden = true; chEmpty.hidden = false; return;
  }
  const today = todayKey();
  const doneToday = chs.filter((h) => h.done[today]).length;
  summary.hidden = false;
  summary.textContent = `오늘 ${doneToday} / ${chs.length} 완료 ${doneToday === chs.length ? "🎉 다 해냈어요!" : "🌱"}`;
  list.innerHTML = chs.map((h) => habitCardHtml(h)).join("");
  chEmpty.hidden = true;
}

function habitCardHtml(h) {
  const dayNum = Math.min(daysSince(h.startDate) + 1, CH_TARGET);
  const doneCount = Object.values(h.done).filter(Boolean).length;
  const streak = challengeStreak(h);
  const todayDone = !!h.done[todayKey()];
  return `
  <div class="habit-card" data-id="${h.id}">
    <div class="habit-top">
      <div class="habit-info" data-act="open" role="button" tabindex="0">
        <div class="habit-title">${h.emoji} ${escapeHtml(h.title)} <span class="go">›</span></div>
        <div class="habit-meta">Day ${dayNum}/${CH_TARGET} · 달성 ${doneCount}일 · 연속 ${streak}일</div>
      </div>
      <button class="habit-check ${todayDone ? "done" : ""}" data-act="check" aria-label="오늘 완료 체크">${todayDone ? "✓" : "○"}</button>
    </div>
    <div class="habit-mini-bar"><i style="width:${(doneCount / CH_TARGET) * 100}%"></i></div>
  </div>`;
}

function detailHabitHtml(h) {
  const dayNum = Math.min(daysSince(h.startDate) + 1, CH_TARGET);
  const doneCount = Object.values(h.done).filter(Boolean).length;
  const streak = challengeStreak(h);
  const todayDone = !!h.done[todayKey()];
  const reached = Object.keys(MILESTONES).map(Number).filter((m) => doneCount >= m);
  const ms = reached.length ? MILESTONES[Math.max(...reached)] : "";
  return `
    <p class="detail-stat">Day ${dayNum}/${CH_TARGET} · 달성 ${doneCount}일 · 연속 ${streak}일 · 남은 ${Math.max(CH_TARGET - doneCount, 0)}일</p>
    <div class="ch-progress"><div class="ch-bar" style="width:${(doneCount / CH_TARGET) * 100}%"></div></div>
    <button class="btn ${todayDone ? "" : "primary"} block" data-act="check">${todayDone ? "오늘 완료함 ✓ (취소하려면 누르기)" : "오늘 완료 체크 ✓"}</button>
    ${ms ? `<p class="ch-milestone">${ms}</p>` : ""}
    ${h.cue ? `<p class="habit-cue">⏰ ${escapeHtml(h.cue)}에 하기</p>` : ""}
    ${h.minVersion ? `<p class="habit-min">💡 힘든 날엔 최소만: ${escapeHtml(h.minVersion)}</p>` : ""}
    <div class="ch-grid" data-grid="${h.id}"></div>
    <div class="inline-edit" data-edit hidden>
      <input class="text-input" data-ef="title" value="${escapeHtml(h.title)}" maxlength="40" />
      <input class="text-input" data-ef="cue" value="${escapeHtml(h.cue || "")}" placeholder="언제 할까요 (트리거)" maxlength="20" />
      <input class="text-input" data-ef="min" value="${escapeHtml(h.minVersion || "")}" placeholder="최소 버전 (선택)" maxlength="40" />
      <div class="edit-actions"><button class="btn primary" data-act="savehabit">저장</button><button class="btn" data-act="canceledit">취소</button></div>
    </div>
    <div class="data-btns" style="margin-top:16px">
      <button class="btn" data-act="edit">✏️ 편집</button>
      <button class="btn" data-act="calendar">📅 캘린더에 매일 알림</button>
      <button class="btn" data-act="share">📤 진행 공유</button>
      <button class="btn danger" data-act="giveup">이 습관 그만두기</button>
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

// 목록 카드: 누르면 상세 페이지로 전환, 체크 버튼은 바로 완료 토글
document.getElementById("challengeList").addEventListener("click", (e) => {
  const card = e.target.closest(".habit-card"); if (!card) return;
  const actEl = e.target.closest("[data-act]"); if (!actEl) return;
  const id = card.dataset.id, act = actEl.dataset.act;
  if (act === "open") { Sound.tap(); openHabitDetail(id); }
  else if (act === "check") applyHabitAction("check", id, card);
});
document.getElementById("challengeList").addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const info = e.target.closest(".habit-info"); if (!info) return;
  e.preventDefault(); const card = info.closest(".habit-card"); Sound.tap(); openHabitDetail(card.dataset.id);
});

/* 습관 상세 — 슬라이드 페이지 */
const subpage = document.getElementById("subpage");
const subBody = document.getElementById("subBody");
const subTitle = document.getElementById("subTitle");
let openHabitId = null, subAnim = 0, subMode = null, subEntryDate = null;
function openSubpage(title, html, mode) {
  subAnim++; subMode = mode || null; subTitle.textContent = title; subBody.innerHTML = html; subpage.hidden = false;
  requestAnimationFrame(() => subpage.classList.add("show"));
}
function stowSetup() { // 폼 노드를 탭으로 되돌려 숨김 (리스너 보존)
  if (setup.parentNode === subBody) { setup.hidden = true; document.getElementById("tab-challenge").appendChild(setup); }
}
function closeSubpage() {
  subpage.classList.remove("show"); openHabitId = null; subMode = null;
  const my = ++subAnim;
  setTimeout(() => { if (my !== subAnim) return; subpage.hidden = true; stowSetup(); subBody.innerHTML = ""; }, 300);
}
function openHabitDetail(id) {
  const h = loadChs().find((x) => x.id === id); if (!h) return;
  stowSetup();
  openHabitId = id; openSubpage(`${h.emoji} ${h.title}`, detailHabitHtml(h), "habit"); fillHabitGrid(h);
}
function openAddHabit() {
  resetSetupForm();
  setup.hidden = false;
  subTitle.textContent = "새 습관 만들기";
  subBody.innerHTML = ""; subBody.appendChild(setup);
  subpage.hidden = false; openHabitId = null; subAnim++; subMode = "add";
  requestAnimationFrame(() => subpage.classList.add("show"));
}
function refreshHabitDetail(id) {
  if (subpage.hidden || openHabitId !== id) return;
  const h = loadChs().find((x) => x.id === id); if (!h) return;
  subTitle.textContent = `${h.emoji} ${h.title}`; subBody.innerHTML = detailHabitHtml(h); fillHabitGrid(h);
}
document.getElementById("subBack").addEventListener("click", () => { Sound.tap(); closeSubpage(); });
subBody.addEventListener("click", (e) => {
  if (subMode === "habit") {
    const el = e.target.closest("[data-act]"); if (el && openHabitId) applyHabitAction(el.dataset.act, openHabitId, subBody);
  } else if (subMode === "quotes") {
    const b = e.target.closest("[data-mk]"); if (!b) return;
    const arr = b.dataset.mk === "fav" ? (settings.favQuotes || []) : (settings.myQuotes || []);
    arr.splice(Number(b.dataset.mi), 1); saveSettingsObj(settings); Sound.tap();
    subBody.innerHTML = quoteManageHtml(); updateFavBtn();
  } else if (subMode === "entry") {
    const el = e.target.closest("[data-eact]"); if (!el) return;
    if (el.dataset.eact === "edit") { closeSubpage(); openEntryEditor(subEntryDate); }
    else if (el.dataset.eact === "del") {
      if (!confirm("이 기록을 지울까요?")) return;
      const entries = loadEntries(); delete entries[subEntryDate]; saveEntries(entries);
      Sound.tap(); closeSubpage(); renderStats();
    }
  } else if (subMode === "report") {
    const el = e.target.closest("[data-ract]"); if (!el) return;
    if (el.dataset.ract === "img") { Sound.tap(); const url = el.dataset.kind === "month" ? drawMonthCanvas() : drawWeekCanvas(); const a = document.createElement("a"); a.href = url; a.download = `${el.dataset.kind === "month" ? "월간" : "주간"}리포트_${todayKey()}.png`; a.click(); }
    else if (el.dataset.ract === "share") { Sound.tap(); shareReport(el.dataset.kind); }
  }
});

// 습관 동작 (목록·상세 공용)
function applyHabitAction(act, id, scopeEl) {
  const chs = loadChs(); const h = chs.find((x) => x.id === id); if (!h) return;
  if (act === "check") {
    const k = todayKey();
    h.done[k] = !h.done[k];
    const after = Object.values(h.done).filter(Boolean).length;
    let celebrated = false;
    if (h.done[k] && MILESTONES[after] && !h.celebrated.includes(after)) { h.celebrated.push(after); celebrated = true; }
    saveChs(chs);
    if (h.done[k]) { if (celebrated) { Sound.celebrate(); confetti(); Haptic.success(); } else { Sound.success(); Haptic.tap(); } } else Sound.tap();
    renderChallenge(); refreshHabitDetail(id);
    if (h.done[k]) { const grid = document.querySelector(`[data-grid="${id}"]`); const idx = daysSince(h.startDate); if (grid && grid.children[idx]) grid.children[idx].classList.add("just-done"); }
    checkBadges();
  } else if (act === "edit") {
    const f = scopeEl.querySelector("[data-edit]"); if (f) { f.hidden = !f.hidden; Sound.tap(); }
  } else if (act === "savehabit") {
    const f = scopeEl.querySelector("[data-edit]");
    const title = f.querySelector('[data-ef="title"]').value.trim();
    if (!title) { alert("습관 이름을 비울 수 없어요 🙂"); return; }
    h.title = title; h.cue = f.querySelector('[data-ef="cue"]').value.trim(); h.minVersion = f.querySelector('[data-ef="min"]').value.trim();
    saveChs(chs); Sound.success(); renderChallenge(); refreshHabitDetail(id);
  } else if (act === "canceledit") {
    refreshHabitDetail(id);
  } else if (act === "calendar") {
    Sound.tap(); exportHabitIcs(h);
  } else if (act === "share") {
    Sound.tap(); shareHabit(h);
  } else if (act === "giveup") {
    if (!confirm("이 습관을 그만둘까요? 기록은 사라져요.\n그만둬도 괜찮아요 — 쉬어가는 것도 용기예요.")) return;
    saveChs(chs.filter((x) => x.id !== id)); Sound.tap(); closeSubpage(); renderChallenge();
  }
}

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
  renderMonthly(entries);
  renderBadges();
  renderInsight(entries, list);
  renderCorrelation(entries);
  drawChart(entries);
  renderMoodCalendar(entries);
  renderDist(list);
  renderHistory(list);
}

let calOffset = 0; // 0 = 이번 달, -1 = 지난 달 …
function renderMoodCalendar(entries) {
  const wrap = document.getElementById("moodCal");
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + calOffset);
  const y = base.getFullYear(), m = base.getMonth();
  document.getElementById("calMonth").textContent = `${y}년 ${m + 1}월`;
  document.getElementById("calNext").disabled = calOffset >= 0;
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  let html = "";
  for (let i = 0; i < first; i++) html += `<span class="cal-cell blank"></span>`;
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const e = entries[key];
    const score = e && e.mood ? moodMeta[e.mood].score : 0;
    const isToday = key === todayKey();
    const future = key > todayKey();
    html += `<button class="cal-cell m${score} ${isToday ? "today" : ""}" ${future ? "disabled" : ""} data-cal="${key}" title="${e && e.mood ? e.mood : ""}">${d}</button>`;
  }
  wrap.innerHTML = html;
  wrap.querySelectorAll("[data-cal]").forEach((b) => b.addEventListener("click", () => { Sound.tap(); openEntryEditor(b.dataset.cal); }));
}
document.getElementById("calPrev").addEventListener("click", () => { calOffset--; Sound.tap(); renderMoodCalendar(loadEntries()); });
document.getElementById("calNext").addEventListener("click", () => { if (calOffset < 0) { calOffset++; Sound.tap(); renderMoodCalendar(loadEntries()); } });

/* 기록 탭 서브탭 (요약/그래프/달력/기록) */
function showStatsSeg(seg) {
  document.querySelectorAll("#statsSeg button").forEach((b) => b.classList.toggle("active", b.dataset.seg === seg));
  document.querySelectorAll(".stats-panel").forEach((p) => { p.hidden = p.dataset.panel !== seg; });
  if (seg === "graph") drawChart(loadEntries());        // 보일 때 정확한 폭으로 다시 그림
  if (seg === "calendar") renderMoodCalendar(loadEntries());
}
document.getElementById("statsSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  Sound.tap(); showStatsSeg(b.dataset.seg);
});

/* 쉼 탭 서브탭 (위로 / 명상) */
document.getElementById("restSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  Sound.tap();
  document.querySelectorAll("#restSeg button").forEach((x) => x.classList.toggle("active", x === b));
  document.querySelectorAll(".rest-panel").forEach((p) => { p.hidden = p.dataset.rpanel !== b.dataset.rseg; });
});

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
  if (days.length === 0) { weekData = null; return; }
  const plain = settings.tone === "plain", parts = [];
  parts.push(plain ? `이번 주 ${days.length}일 기록.` : `이번 주 ${days.length}일이나 마음을 남겼어요.`);
  if (avgMood != null) parts.push(`평균 기분 ${avgMood.toFixed(1)}/5${topMood ? `, 가장 자주 ${moodMeta[topMood[0]].emoji} ${topMood[0]}` : ""}.`);
  if (avgEnergy != null) parts.push(`평균 에너지 ${avgEnergy.toFixed(1)}/5.`);
  if (habTotal > 0) parts.push(plain ? `습관 달성 ${habDone}/${habTotal}.` : `습관도 ${habDone}/${habTotal} 칸 채웠어요.`);
  if (!plain) parts.push(days.length >= 5 ? "스스로를 참 잘 돌본 한 주예요 💛" : "조금씩이어도 충분해요. 다음 주도 곁에 있을게요.");
  weekData = { range, summary: parts.join(" "), daysLogged: days.length, avgMood, avgEnergy, habDone, habTotal, topMood: topMood ? topMood[0] : null, moodSeries: keys.map((k) => entries[k] && entries[k].mood ? moodMeta[entries[k].mood].score : null) };
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
document.getElementById("weekDetailBtn").addEventListener("click", () => { Sound.tap(); openReport("week"); });

/* 월간 리포트 */
let monthData = null;
function renderMonthly(entries) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const keys = []; for (let dd = 1; dd <= days; dd++) keys.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
  const recs = keys.map((k) => entries[k]).filter(Boolean);
  const moods = recs.filter((e) => e.mood);
  const avgMood = moods.length ? moods.reduce((s, e) => s + moodMeta[e.mood].score, 0) / moods.length : null;
  const energies = recs.filter((e) => e.energy);
  const avgEnergy = energies.length ? energies.reduce((s, e) => s + e.energy, 0) / energies.length : null;
  const counts = {}; moods.forEach((e) => counts[e.mood] = (counts[e.mood] || 0) + 1);
  const topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const reflections = recs.filter((e) => e.reflection && (e.reflection.good || e.reflection.hard)).length;
  const chs = loadChs(); let habTotal = 0, habDone = 0;
  chs.forEach((h) => keys.forEach((k) => { if (k >= h.startDate && k <= todayKey()) { habTotal++; if (h.done[k]) habDone++; } }));
  if (recs.length === 0) { monthData = null; return; }
  const plain = settings.tone === "plain", parts = [];
  parts.push(plain ? `이번 달 ${recs.length}일 기록.` : `이번 달 ${recs.length}일 마음을 남겼어요.`);
  if (avgMood != null) parts.push(`평균 기분 ${avgMood.toFixed(1)}/5${topMood ? `, 가장 자주 ${moodMeta[topMood[0]].emoji} ${topMood[0]}` : ""}.`);
  if (avgEnergy != null) parts.push(`평균 에너지 ${avgEnergy.toFixed(1)}/5.`);
  if (habTotal > 0) parts.push(plain ? `습관 달성 ${habDone}/${habTotal}.` : `습관도 ${habDone}/${habTotal}칸 채웠어요.`);
  if (reflections > 0) parts.push(`저녁 회고 ${reflections}번.`);
  if (!plain) parts.push("한 달을 차곡차곡 살아냈어요 💛");
  monthData = { label: `${y}년 ${m + 1}월`, summary: parts.join(" "), daysLogged: recs.length, avgMood, avgEnergy, habDone, habTotal, series: keys.map((k) => entries[k] && entries[k].mood ? moodMeta[entries[k].mood].score : null) };
}
function drawMonthCanvas() {
  const c = document.getElementById("monthCanvas"), ctx = c.getContext("2d"), W = 600, H = 340;
  const css = getComputedStyle(document.documentElement);
  const bg = css.getPropertyValue("--card").trim(), ink = css.getPropertyValue("--ink").trim();
  const accent = css.getPropertyValue("--accent").trim(), soft = css.getPropertyValue("--soft").trim(), line = css.getPropertyValue("--line").trim();
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "left";
  ctx.fillText("오늘의 쉼 · 월간 리포트", 32, 52);
  ctx.fillStyle = soft; ctx.font = "16px sans-serif"; ctx.fillText(monthData ? monthData.label : "", 32, 80);
  const lines = [];
  if (monthData) {
    lines.push(`기록 ${monthData.daysLogged}일`);
    if (monthData.avgMood != null) lines.push(`평균 기분 ${monthData.avgMood.toFixed(1)} / 5`);
    if (monthData.avgEnergy != null) lines.push(`평균 에너지 ${monthData.avgEnergy.toFixed(1)} / 5`);
    if (monthData.habTotal > 0) lines.push(`습관 ${monthData.habDone} / ${monthData.habTotal}`);
  }
  ctx.fillStyle = ink; ctx.font = "bold 20px sans-serif";
  lines.forEach((t, i) => ctx.fillText(t, 32, 132 + i * 38));
  if (monthData) {
    const x0 = 300, y0 = 110, w = 268, h = 158, n = monthData.series.length;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, w, h);
    ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.beginPath(); let started = false;
    monthData.series.forEach((v, i) => { if (v == null) { started = false; return; } const x = x0 + w * i / (n - 1), yy = y0 + h - (h * (v - 1) / 4); if (!started) { ctx.moveTo(x, yy); started = true; } else ctx.lineTo(x, yy); });
    ctx.stroke();
  }
  ctx.fillStyle = soft; ctx.font = "14px sans-serif"; ctx.fillText("한 달의 마음 흐름 🌙", 32, 318);
  return c.toDataURL("image/png");
}
document.getElementById("monthDetailBtn").addEventListener("click", () => { Sound.tap(); openReport("month"); });

/* 리포트 상세 페이지 */
function openReport(kind) {
  renderWeekly(loadEntries()); renderMonthly(loadEntries());
  openSubpage(kind === "month" ? "📈 월간 리포트" : "🗓️ 주간 리포트", reportDetailHtml(kind), "report");
}
const SCORE_FACES = ["😣", "😟", "😐", "🙂", "😄"];
function faceForScore(v) { return v == null ? "—" : SCORE_FACES[Math.min(4, Math.max(0, Math.round(v) - 1))]; }
// 인라인 SVG 추이 차트 (기분 실선 + 에너지 점선) — 테마 색상은 CSS 클래스로
function reportChartSvg(keys, entries) {
  const n = keys.length;
  const mood = keys.map((k) => entries[k] && entries[k].mood ? moodMeta[entries[k].mood].score : null);
  const energy = keys.map((k) => entries[k] && entries[k].energy ? entries[k].energy : null);
  if (!mood.some((v) => v != null) && !energy.some((v) => v != null)) return "";
  const W = 320, H = 132, padX = 8, padTop = 10, padBottom = 22;
  const plotW = W - padX * 2, plotH = H - padTop - padBottom;
  const xAt = (i) => padX + (n <= 1 ? plotW / 2 : plotW * i / (n - 1));
  const yAt = (v) => padTop + plotH - plotH * (v - 1) / 4;
  const path = (arr) => { let d = "", pen = false; arr.forEach((v, i) => { if (v == null) { pen = false; return; } const x = xAt(i).toFixed(1), y = yAt(v).toFixed(1); d += pen ? ` L${x} ${y}` : ` M${x} ${y}`; pen = true; }); return d.trim(); };
  const dots = (arr, cls) => arr.map((v, i) => v == null ? "" : `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="2.6" class="${cls}"/>`).join("");
  let grid = ""; for (let v = 1; v <= 5; v += 2) { const y = yAt(v).toFixed(1); grid += `<line x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}" class="rc-grid"/>`; }
  let labels = ""; const step = n <= 7 ? 1 : Math.ceil(n / 6);
  keys.forEach((k, i) => { if (i % step !== 0 && i !== n - 1) return; const p = k.split("-"); labels += `<text x="${xAt(i).toFixed(1)}" y="${H - 6}" class="rc-xlabel">${n <= 7 ? dayOfWeekKo(k) : +p[2]}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" class="rc-svg" role="img" aria-label="기분과 에너지 추이">${grid}<path d="${path(energy)}" class="rc-line rc-energy"/><path d="${path(mood)}" class="rc-line rc-mood"/>${dots(energy, "rc-dot rc-edot")}${dots(mood, "rc-dot rc-mdot")}${labels}</svg>`;
}
function reportDetailHtml(kind) {
  const entries = loadEntries();
  let keys = [];
  if (kind === "month") { const now = new Date(), y = now.getFullYear(), m = now.getMonth(), days = new Date(y, m + 1, 0).getDate(); for (let d = 1; d <= days; d++) keys.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`); }
  else { for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(todayKey(d)); } }
  const recs = keys.map((k) => entries[k]).filter(Boolean);
  const moods = recs.filter((e) => e.mood);
  const avgMood = moods.length ? moods.reduce((s, e) => s + moodMeta[e.mood].score, 0) / moods.length : null;
  const energies = recs.filter((e) => e.energy);
  const avgEnergy = energies.length ? energies.reduce((s, e) => s + e.energy, 0) / energies.length : null;
  const dist = {}; moods.forEach((e) => dist[e.mood] = (dist[e.mood] || 0) + 1);
  const distMax = Object.keys(dist).length ? Math.max(...Object.values(dist)) : 1;
  const distTotal = moods.length || 1;
  const chs = loadChs(); let habTotal = 0, habDone = 0;
  chs.forEach((h) => keys.forEach((k) => { if (k >= h.startDate && k <= todayKey()) { habTotal++; if (h.done[k]) habDone++; } }));
  const habPct = habTotal ? Math.round((habDone / habTotal) * 100) : null;
  const summary = kind === "month" ? monthData : weekData;
  const period = summary ? (summary.range || summary.label || "") : "";

  if (recs.length === 0) {
    return `<p class="detail-stat">${period}</p><div class="card center"><div class="onboard-emoji">🌱</div><p class="empty">아직 이 기간엔 기록이 없어요.<br>오늘의 여정으로 첫 기록을 남겨봐요.</p></div>
    <div class="data-btns"><button class="btn" data-ract="img" data-kind="${kind}">🖼️ 이미지로 저장</button><button class="btn" data-ract="share" data-kind="${kind}">📤 공유</button></div>`;
  }

  const kpi = (emoji, val, label, cls) => `<div class="kpi ${cls || ""}"><span class="kpi-emoji">${emoji}</span><span class="kpi-val">${val}</span><span class="kpi-label">${label}</span></div>`;
  const kpis = [
    kpi("📅", `${recs.length}<i>일</i>`, kind === "month" ? "이번 달 기록" : "이번 주 기록"),
    kpi(avgMood != null ? faceForScore(avgMood) : "—", avgMood != null ? `${avgMood.toFixed(1)}<i>/5</i>` : "—", "평균 기분"),
    kpi("⚡", avgEnergy != null ? `${avgEnergy.toFixed(1)}<i>/5</i>` : "—", "평균 에너지"),
    habPct != null
      ? kpi("🎯", `${habPct}<i>%</i>`, `습관 ${habDone}/${habTotal}`)
      : kpi(Object.keys(dist).length ? moodMeta[Object.entries(dist).sort((a, b) => b[1] - a[1])[0][0]].emoji : "🙂", Object.keys(dist).length ? `${Object.entries(dist).sort((a, b) => b[1] - a[1])[0][1]}<i>일</i>` : "—", "가장 잦은 기분"),
  ].join("");

  const chart = reportChartSvg(keys, entries);
  const chartCard = chart ? `<div class="card"><div class="card-head"><h2>📈 마음 흐름</h2></div>${chart}<div class="rpt-legend"><span><i class="rl-mood"></i>기분</span><span><i class="rl-energy"></i>에너지</span></div></div>` : "";

  const distCard = Object.keys(dist).length ? `<div class="card"><h2>🌈 기분 분포</h2><div class="dist">${Object.keys(moodMeta).filter((m) => dist[m]).map((m) => `<div class="dist-row"><span class="dist-emoji">${moodMeta[m].emoji}</span><div class="dist-bar-wrap"><div class="dist-bar" style="width:${(dist[m] / distMax) * 100}%"></div></div><span class="dist-count">${Math.round((dist[m] / distTotal) * 100)}%</span></div>`).join("")}</div></div>` : "";

  const rows = keys.filter((k) => entries[k]).map((k) => { const e = entries[k], p = k.split("-"); return `<div class="rpt-row"><span>${+p[1]}/${+p[2]} (${dayOfWeekKo(k)})</span><span>${e.mood ? moodMeta[e.mood].emoji + " " + e.mood : "-"}</span><span>${e.energy ? "⚡" + e.energy : ""}</span></div>`; }).join("");
  const daysCard = `<details class="card rpt-days"${kind === "week" ? " open" : ""}><summary>🗓️ 날짜별 기록 (${recs.length}일)</summary><div class="rpt-list">${rows}</div></details>`;

  return `
    <p class="detail-stat">${period}</p>
    ${summary && summary.summary ? `<div class="card rpt-summary"><p class="insight">${summary.summary}</p></div>` : ""}
    <div class="kpi-grid">${kpis}</div>
    ${chartCard}
    ${distCard}
    ${daysCard}
    <div class="data-btns"><button class="btn" data-ract="img" data-kind="${kind}">🖼️ 이미지로 저장</button><button class="btn" data-ract="share" data-kind="${kind}">📤 공유</button></div>`;
}
async function shareReport(kind) {
  const url = kind === "month" ? drawMonthCanvas() : drawWeekCanvas();
  const d = kind === "month" ? monthData : weekData;
  const text = d ? `오늘의 쉼 · ${kind === "month" ? "월간" : "주간"} 리포트 (${d.range || d.label}) — 기록 ${d.daysLogged}일${d.avgMood != null ? `, 평균 기분 ${d.avgMood.toFixed(1)}/5` : ""} 🌿` : "오늘의 쉼 리포트";
  try {
    const file = new File([dataURLtoBlob(url)], "report.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text); alert("리포트 요약을 복사했어요!\n\n" + text);
  } catch (e) {}
}

/* 성취 배지 */
const BADGES = [
  { id: "first", e: "🌱", t: "첫 발걸음", d: "첫 기록을 남겼어요", ok: (D) => D.total >= 1 },
  { id: "week", e: "🗓️", t: "일주일 연속", d: "7일 연속 기록", ok: (D) => D.streak >= 7 },
  { id: "d30", e: "📚", t: "30일의 기록", d: "누적 30일 기록", ok: (D) => D.total >= 30 },
  { id: "habit", e: "🎯", t: "습관 시작", d: "습관을 만들었어요", ok: (D) => D.chs.length >= 1 },
  { id: "habit1", e: "✅", t: "첫 완료", d: "습관을 한 번 완료", ok: (D) => D.chs.some((h) => Object.values(h.done || {}).filter(Boolean).length >= 1) },
  { id: "habit21", e: "🔥", t: "21일의 힘", d: "한 습관 21일 달성", ok: (D) => D.chs.some((h) => Object.values(h.done || {}).filter(Boolean).length >= 21) },
  { id: "grat10", e: "🙏", t: "감사의 습관", d: "잘한 일 10번 기록", ok: (D) => D.list.filter((e) => e.praise && e.praise.trim()).length >= 10 },
  { id: "reflect", e: "🌙", t: "돌아보는 밤", d: "저녁 회고를 남겼어요", ok: (D) => D.list.some((e) => e.reflection && (e.reflection.good || e.reflection.hard)) },
  { id: "energized", e: "😄", t: "활기찬 날", d: "'활기차요'를 기록", ok: (D) => D.list.some((e) => e.mood === "활기차요") },
  { id: "fav", e: "💛", t: "나의 위로", d: "위로 문구를 즐겨찾기", ok: () => (settings.favQuotes || []).length >= 1 },
  { id: "d7", e: "🌿", t: "일주일의 마음", d: "누적 7일 기록", ok: (D) => D.total >= 7 },
  { id: "d100", e: "🏔️", t: "백 일의 여정", d: "누적 100일 기록", ok: (D) => D.total >= 100 },
  { id: "streak14", e: "⚡", t: "2주 연속", d: "14일 연속 기록", ok: (D) => D.streak >= 14 },
  { id: "streak30", e: "👑", t: "한 달 연속", d: "30일 연속 기록", ok: (D) => D.streak >= 30 },
  { id: "habit66", e: "🧠", t: "습관 완성", d: "한 습관 66일 달성", ok: (D) => D.chs.some((h) => Object.values(h.done || {}).filter(Boolean).length >= 66) },
  { id: "habit90", e: "🏆", t: "90일 완주", d: "한 습관 90일 달성", ok: (D) => D.chs.some((h) => Object.values(h.done || {}).filter(Boolean).length >= 90) },
  { id: "breath10", e: "🌬️", t: "숨 고르기", d: "호흡 10번 하기", ok: () => (settings.breathCount || 0) >= 10 },
  { id: "journey5", e: "✨", t: "여정의 동반자", d: "오늘의 여정 5번 완주", ok: () => (settings.journeyCount || 0) >= 5 },
  { id: "tags5", e: "🏷️", t: "감정의 언어", d: "감정 태그 5일 기록", ok: (D) => D.list.filter((e) => e.tags && e.tags.length).length >= 5 },
  { id: "allmoods", e: "🌈", t: "마음의 무지개", d: "7가지 기분 모두 경험", ok: (D) => new Set(D.list.filter((e) => e.mood).map((e) => e.mood)).size >= 7 },
  { id: "earlybird", e: "🐦", t: "이른 새", d: "아침 8시 전에 기록", ok: (D) => D.list.some((e) => e.updatedAt && new Date(e.updatedAt).getHours() < 8) },
  { id: "nightowl", e: "🦉", t: "밤의 위로", d: "새벽(0~5시)에 기록", ok: (D) => D.list.some((e) => e.updatedAt && new Date(e.updatedAt).getHours() < 5) },
];
function badgeData() { const entries = loadEntries(), list = sortedEntries(entries); return { total: list.length, list, streak: calcStreak(entries), chs: loadChs() }; }
function earnedBadgeIds() { const D = badgeData(); return BADGES.filter((b) => b.ok(D)).map((b) => b.id); }
function renderBadges() {
  const earned = new Set(earnedBadgeIds());
  const n = earned.size, total = BADGES.length, pct = Math.round((n / total) * 100);
  const rateEl = document.getElementById("badgeRate");
  if (rateEl) rateEl.textContent = `${n} / ${total}`;
  const fill = document.getElementById("badgeBarFill");
  if (fill) fill.style.width = pct + "%";
  const status = document.getElementById("badgeStatus");
  if (status) status.textContent = n === total
    ? "🎉 모든 배지를 모았어요! 정말 대단해요."
    : n === 0 ? "첫 배지를 향해 한 걸음씩 🌱"
    : `획득률 ${pct}% · ${total - n}개 남았어요`;
  // 획득한 배지를 앞으로 정렬해 성취감을 강조
  const sorted = [...BADGES].sort((a, b) => (earned.has(b.id) ? 1 : 0) - (earned.has(a.id) ? 1 : 0));
  document.getElementById("badgeGrid").innerHTML = sorted.map((b) =>
    `<div class="badge ${earned.has(b.id) ? "earned" : "locked"}" title="${b.d}"><span class="badge-emoji">${b.e}</span><span class="badge-title">${b.t}</span></div>`).join("");
}
/* 습관 ↔ 기분 상관관계 */
function renderCorrelation(entries) {
  const body = document.getElementById("corrBody");
  const moodByDate = {};
  Object.values(entries).forEach((e) => { if (e.date && e.mood) moodByDate[e.date] = moodMeta[e.mood].score; });
  const chs = loadChs();
  if (!chs.length) { body.innerHTML = '<p class="empty">습관을 만들면 기분과의 관계를 분석해드려요.</p>'; return; }
  const today = todayKey(), rows = [];
  chs.forEach((h) => {
    const done = [], not = [];
    Object.keys(moodByDate).forEach((d) => {
      if (d < h.startDate || d > today) return;
      (h.done[d] ? done : not).push(moodByDate[d]);
    });
    if (done.length >= 5 && not.length >= 5) {  // 표본 5+/5+ 이상에서만 (과소표본 과잉해석 방지)
      const ad = done.reduce((s, v) => s + v, 0) / done.length;
      const an = not.reduce((s, v) => s + v, 0) / not.length;
      const sd = (arr, m) => Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
      // Cohen's d (효과크기) — pooled SD 근사
      const pooled = Math.sqrt((sd(done, ad) ** 2 + sd(not, an) ** 2) / 2) || 0.0001;
      const d = (ad - an) / pooled;
      rows.push({ h, ad, an, diff: ad - an, d, n: done.length + not.length });
    }
  });
  if (!rows.length) {
    body.innerHTML = '<p class="empty">조금 더 기록되면 보여드릴게요. (한 날·안 한 날 각각 <b>5일 이상</b> 기분 기록이 모이면 분석해요)</p>';
    return;
  }
  rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const effectLabel = (d) => { const a = Math.abs(d); return a >= 0.8 ? "큰 차이" : a >= 0.5 ? "중간 차이" : a >= 0.2 ? "작은 차이" : "미미한 차이"; };
  body.innerHTML = rows.map(({ h, ad, an, diff, d, n }) => {
    const up = diff >= 0.3, down = diff <= -0.3;
    const sign = diff >= 0 ? "▲" : "▼";
    const msg = up ? `한 날 기분이 평균 <b>${diff.toFixed(1)}점 더 높아요</b> 🌿`
      : down ? `한 날이 오히려 조금 낮았어요. 부담이 됐다면 가볍게 조절해도 좋아요.`
      : `기분 차이는 크지 않아요.`;
    return `<div class="corr-row">
      <div class="corr-top"><span>${h.emoji} ${escapeHtml(h.title)}</span><span class="corr-diff ${up ? "up" : down ? "down" : ""}">${sign}${Math.abs(diff).toFixed(1)}</span></div>
      <div class="corr-detail">한 날 ⌀${ad.toFixed(1)} · 안 한 날 ⌀${an.toFixed(1)} — ${msg}</div>
      <div class="corr-meta">표본 n=${n} · 효과크기(Cohen's d) ${d.toFixed(2)} (${effectLabel(d)})</div>
    </div>`;
  }).join("");
  body.innerHTML += `<p class="sci-note">📚 이 분석은 <b>관찰적 상관</b>이며 인과를 뜻하지 않아요. 효과크기는 Cohen's d 기준(0.2 작음·0.5 중간·0.8 큼; Cohen, 1988), 행동활성화·습관 연구(Mazzucchelli 2010; Lally 2010)에 근거해 해석을 돕습니다.</p>`;
}

function checkBadges() {
  const earned = earnedBadgeIds(), prev = settings.badges || [];
  const fresh = earned.filter((id) => !prev.includes(id));
  if (fresh.length) {
    settings.badges = earned; saveSettingsObj(settings);
    const titles = fresh.map((id) => { const b = BADGES.find((x) => x.id === id); return `${b.e} ${b.t}`; }).join(", ");
    if (typeof toast === "function") toast("🏅 새 배지 획득: " + titles);
    if (Sound.celebrate) Sound.celebrate(); confetti(); Haptic.success();
  } else if (JSON.stringify(prev) !== JSON.stringify(earned)) { settings.badges = earned; saveSettingsObj(settings); }
}

function drawChart(entries) {
  const canvas = document.getElementById("chart");
  const dpr = window.devicePixelRatio || 1, cssW = canvas.clientWidth || 560, cssH = 200;
  canvas.width = cssW * dpr; canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, cssW, cssH);
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

let histShown = 60; // '더 보기'로 늘어남
function renderHistory(list) {
  const ul = document.getElementById("history"); ul.innerHTML = "";
  const q = (document.getElementById("historySearch").value || "").trim().toLowerCase();
  let rev = [...list].reverse();
  if (q) rev = rev.filter((e) =>
    (e.note || "").toLowerCase().includes(q) || (e.praise || "").toLowerCase().includes(q) ||
    (e.mood || "").toLowerCase().includes(q) || (e.tags || []).some((t) => t.toLowerCase().includes(q)));
  document.getElementById("histCount").textContent = q ? `검색 ${rev.length}개` : `총 ${rev.length}개`;
  if (!rev.length) { ul.innerHTML = `<p class="empty">${q ? "검색 결과가 없어요." : "첫 기록을 기다리고 있어요."}</p>`; document.getElementById("histMore").hidden = true; return; }
  const shown = rev.slice(0, histShown);
  shown.forEach((e) => {
    const li = document.createElement("li"); li.className = "editable"; li.dataset.date = e.date; const p = e.date.split("-");
    const dateStr = `${+p[1]}월 ${+p[2]}일 (${dayOfWeekKo(e.date)})`;
    const moodStr = e.mood ? `${moodMeta[e.mood].emoji} ${e.mood}` : "";
    const energyStr = e.energy ? ` · 에너지 ${e.energy}/5` : "";
    const tagsHtml = e.tags && e.tags.length ? `<div class="hist-tags">${e.tags.map((t) => `<span class="link-tag">#${escapeHtml(t)}</span>`).join("")}</div>` : "";
    const r = e.reflection || {};
    const reflectHtml = (r.good || r.hard) ? `<div class="h-reflect">${r.good ? `<p>🌤️ ${escapeHtml(r.good)}</p>` : ""}${r.hard ? `<p>🌧️ ${escapeHtml(r.hard)}</p>` : ""}</div>` : "";
    li.innerHTML = `<button class="h-del" data-date="${e.date}" aria-label="기록 삭제">×</button>
      <div class="h-top"><span class="h-date">${dateStr}</span><span class="h-mood">${moodStr}${energyStr}</span></div>
      ${e.note ? `<p class="h-note">${escapeHtml(e.note)}</p>` : ""}
      ${e.praise ? `<p class="h-praise">🌱 ${escapeHtml(e.praise)}</p>` : ""}
      ${reflectHtml}
      ${tagsHtml}`;
    ul.appendChild(li);
  });
  const more = document.getElementById("histMore");
  more.hidden = rev.length <= histShown;
  more.textContent = `더 보기 (${rev.length - shown.length}개 남음)`;
  ul.querySelectorAll("li.editable").forEach((li) => li.addEventListener("click", (ev) => {
    if (ev.target.closest(".h-del")) return;
    Sound.tap(); openEntryDetail(li.dataset.date);
  }));
  ul.querySelectorAll(".h-del").forEach((b) => b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const entries = loadEntries(); delete entries[b.dataset.date]; saveEntries(entries); Sound.tap(); renderStats();
  }));
}
document.getElementById("historySearch").addEventListener("input", () => { histShown = 60; renderHistory(sortedEntries(loadEntries())); });
document.getElementById("histMore").addEventListener("click", () => { histShown += 60; Sound.tap(); renderHistory(sortedEntries(loadEntries())); });

/* ===================== 설정 ===================== */
const settings = Object.assign(
  { theme: "warm", sfx: true, breathSound: true, haptics: true, reminderOn: false, reminderTime: "21:00", ambientVol: 55, textSize: "m", tone: "warm", myQuotes: [], favQuotes: [], sleepBreath: false, breathCount: 0, journeyCount: 0 },
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
  document.getElementById("hapticToggle").checked = settings.haptics;
  Haptic.on = settings.haptics;
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
document.getElementById("hapticToggle").addEventListener("change", (e) => { settings.haptics = e.target.checked; Haptic.on = settings.haptics; saveSettingsObj(settings); if (settings.haptics) Haptic.tap(); });
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
  const data = JSON.stringify({ entries: loadEntries(), challenges: loadChs() }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = `오늘의쉼_백업_${todayKey()}.json`; a.click(); URL.revokeObjectURL(url);
});
document.getElementById("importBtn").addEventListener("click", () => { Sound.tap(); document.getElementById("importFile").click(); });
document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== "object") throw 0;
    if (data.entries && typeof data.entries === "object") {
      const entries = loadEntries(); Object.entries(data.entries).forEach(([k, v]) => { entries[k] = v; }); saveEntries(entries);
    }
    if (Array.isArray(data.challenges)) {
      const chs = loadChs(); const ids = new Set(chs.map((c) => c.id));
      data.challenges.forEach((c) => { if (c && c.id && !ids.has(c.id)) chs.push(c); }); saveChs(chs);
    }
    Sound.success(); loadToday(); renderChallenge();
    alert("복원 완료! 기존 기록과 합쳤어요 🌿");
  } catch (err) {
    alert("불러오기에 실패했어요. 올바른 백업 파일(JSON)인지 확인해주세요.");
  }
  e.target.value = "";
});
document.getElementById("replayOnboard").addEventListener("click", () => { Sound.tap(); showOnboard(); });

/* 접기/펼치기 카드 (설정·오늘 등 공용) */
document.addEventListener("click", (e) => {
  const h2 = e.target.closest(".card.collapsible > h2"); if (!h2) return;
  h2.parentElement.classList.toggle("collapsed"); Sound.tap();
});
document.getElementById("clearBtn").addEventListener("click", () => {
  if (!confirm("정말 모든 기록을 지울까요? 되돌릴 수 없어요.")) return;
  localStorage.removeItem(DB.ENTRIES); localStorage.removeItem(DB.CH); localStorage.removeItem("projects_v1");
  Sound.tap(); selectedMood = null;
  document.querySelectorAll(".mood").forEach((m) => { m.classList.remove("selected"); m.setAttribute("aria-pressed", "false"); });
  moodResponse.hidden = true; todayMore.hidden = true; journalInput.value = ""; praiseInput.value = "";
  expandedIds.clear(); renderChallenge();
  alert("기록을 모두 비웠어요. 언제든 다시 시작할 수 있어요 🌱");
});

/* 빠른 호흡 — 어디서든 + 수면 모드 */
const breathOverlay = document.getElementById("breathOverlay");
const sleepToggle = document.getElementById("sleepToggle");
let sleepMode = !!settings.sleepBreath;
let wakeLock = null;

async function requestWake() { try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {} }
function releaseWake() { try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {} }
function updateSleepLabel() { sleepToggle.textContent = sleepMode ? "🌙 수면 모드 켜짐 (자동 종료·화면 유지)" : "🌙 수면 모드 끔"; }
updateSleepLabel();

const qbBreather = makeBreather(document.getElementById("qbCircle"), document.getElementById("qbText"), "breath-circle big", {
  sleep: () => sleepMode,
  maxCycles: 12,
  onAutoEnd: () => { releaseWake(); document.getElementById("qbText").innerHTML = "편안한 밤 되세요 🌙"; setTimeout(() => { breathOverlay.hidden = true; }, 2800); },
});
function openBreath() {
  breathOverlay.hidden = false;
  breathOverlay.classList.toggle("sleep", sleepMode);
  Sound.unlock();                // iOS: 사용자 제스처 안에서 오디오 컨텍스트 확실히 재개
  requestWake();                 // 화면을 켜둬 오디오가 끊기지 않게 (특히 모바일)
  if (qbBreather.isRunning()) qbBreather.stop(); // 이전 세션이 남아있으면 정리 후 새로 시작
  qbBreather.start();
  document.getElementById("qbClose").focus();
}
function closeBreath() { qbBreather.stop(); releaseWake(); breathOverlay.hidden = true; }
document.getElementById("quickBreathFab").addEventListener("click", openBreath);
document.getElementById("qbClose").addEventListener("click", closeBreath);
sleepToggle.addEventListener("click", () => {
  Sound.tap();
  sleepMode = !sleepMode; settings.sleepBreath = sleepMode; saveSettingsObj(settings);
  updateSleepLabel(); breathOverlay.classList.toggle("sleep", sleepMode);
});
// 화면 복귀 시 wake lock 재획득
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !breathOverlay.hidden) requestWake(); });

/* ===================== 오늘의 여정 (적응형 단계 기록) ===================== */
const MOOD_ORDER = ["지쳤어요", "우울해요", "불안해요", "무기력해요", "그럭저럭", "괜찮아요", "활기차요"];
const JTAGS = ["피곤", "불안", "보람", "외로움", "평온", "짜증", "설렘", "뿌듯"];
const journey = document.getElementById("journey");
const jBody = document.getElementById("jBody"), jBar = document.getElementById("jBar");
const jPrev = document.getElementById("jPrev"), jNext = document.getElementById("jNext");
let jData = {}, curId = "feel";
// 감정 선택 → 마음(점수)·에너지·태그를 한 번에 채움
function jApplyEmotions() {
  const sel = jData.emotions || [];
  if (!sel.length) { jData.mood = null; jData.tags = []; return; }
  const primary = emoByKey(sel[0]);
  jData.mood = primary.base;
  const ens = sel.map((k) => emoByKey(k).en);
  jData.energy = Math.round(ens.reduce((a, b) => a + b, 0) / ens.length);
  jData.tags = sel.slice(); // 고른 감정이 곧 태그
}
function jSteps() {
  const low = jData.mood && moodMeta[jData.mood].score <= 2;
  const s = ["feel"]; // 마음+에너지+태그 통합 단계
  if (low) s.push("breathe");
  s.push("note", "praise");
  if (loadChs().length) s.push("habits");
  s.push("reflect"); // 저녁 회고는 항상 경로에 포함
  s.push("finish");
  return s;
}
function notePrompt(m) {
  if (!m) return "오늘 하루, 한 줄로 남긴다면?";
  const s = moodMeta[m].score;
  if (s <= 2) return "지금 마음에 가장 걸리는 건 뭐예요? (안 적어도 괜찮아요)";
  if (s >= 4) return "오늘 어떤 순간이 좋았어요?";
  return "오늘 하루, 한 줄로 남긴다면?";
}
function stepHtml(id) {
  if (id === "feel") {
    const sel = jData.emotions || [];
    const bands = EMO_BANDS.map((b) => `
      <p class="emo-band">${b.label}</p>
      <div class="emo-grid">${EMOTIONS.filter((e) => e.band === b.id).map((e) => {
        const idx = sel.indexOf(e.k);
        return `<button class="emo ${idx >= 0 ? "selected" : ""}" data-emo="${e.k}">${e.e}<span>${e.k}</span>${idx === 0 ? '<i class="emo-star">대표</i>' : ""}</button>`;
      }).join("")}</div>`).join("");
    return `<p class="j-q">지금 마음, 어떤가요?</p>
      <p class="hint" style="text-align:center;margin:-10px 0 4px">느껴지는 감정을 골라요. 여러 개도 좋아요 — 첫 감정이 '대표'가 돼요.</p>
      ${bands}
      <p class="mood-response" id="jMoodReply" ${jData.mood ? "" : "hidden"}>${jData.mood ? curReplies()[jData.mood] : ""}</p>`;
  }
  if (id === "breathe") return `<div class="js-emoji">🫧</div><p class="j-q">잠깐, 숨 한 번 고르고 갈까요?</p>
    <p class="hint">코로 천천히 들이쉬고… 입으로 길게 내쉬어요.</p>
    <button class="btn primary block" id="jBreatheBtn" style="margin-top:14px">🌬️ 호흡 시작하기</button>
    <p class="hint" style="text-align:center;margin-top:10px">준비되면 아래 '다음'을 눌러요.</p>`;
  if (id === "note") return `<p class="j-q">${notePrompt(jData.mood)}</p>
    <textarea id="jNote" rows="5" placeholder="편하게 적어요. 비워둬도 괜찮아요.">${escapeHtml(jData.note || "")}</textarea>`;
  if (id === "praise") return `<p class="j-q">오늘 잘한 일이나 고마웠던 일 하나만요 🌱</p>
    <input type="text" id="jPraise" class="text-input" maxlength="120" value="${escapeHtml(jData.praise || "")}" placeholder="아주 사소해도 좋아요">`;
  if (id === "habits") {
    const today = todayKey();
    const chs = loadChs();
    return `<p class="j-q">오늘의 습관, 했나요?</p>
      <div class="j-habits">${chs.map((h) => `<button class="j-habit ${h.done[today] ? "done" : ""}" data-hid="${h.id}"><span>${h.emoji} ${escapeHtml(h.title)}</span><b>${h.done[today] ? "✓" : "○"}</b></button>`).join("")}</div>`;
  }
  if (id === "reflect") return `<p class="j-q">하루를 돌아볼까요?</p>
    <p class="field-label">🌤️ 가장 좋았던 순간</p><input id="jGood" class="text-input" maxlength="120" value="${escapeHtml(jData.good || "")}">
    <p class="field-label">🌧️ 힘들었던 순간</p><input id="jHard" class="text-input" maxlength="120" value="${escapeHtml(jData.hard || "")}">`;
  return `<div class="j-finish"><div class="js-emoji">🌿</div><h3>오늘도 잘 기록했어요</h3>
    <p>${jData.mood ? curReplies()[jData.mood] : "와줘서 고마워요."}</p>
    <p class="hint">아래 버튼을 누르면 저장돼요.</p></div>`;
}
function renderStep() {
  const arr = jSteps(), i = Math.max(0, arr.indexOf(curId));
  jBar.style.width = `${(i / (arr.length - 1)) * 100}%`;
  jPrev.hidden = i <= 0;
  jNext.textContent = curId === "finish" ? "기록 저장하기 💾" : "다음";
  jBody.innerHTML = stepHtml(curId);
  if (curId === "feel") {
    const reply = jBody.querySelector("#jMoodReply");
    const refresh = () => {
      const sel = jData.emotions || [];
      jBody.querySelectorAll(".emo").forEach((btn) => {
        const idx = sel.indexOf(btn.dataset.emo);
        btn.classList.toggle("selected", idx >= 0);
        let star = btn.querySelector(".emo-star");
        if (idx === 0) { if (!star) { star = document.createElement("i"); star.className = "emo-star"; star.textContent = "대표"; btn.appendChild(star); } }
        else if (star) star.remove();
      });
      if (jData.mood) { reply.textContent = curReplies()[jData.mood]; reply.hidden = false; } else { reply.hidden = true; }
    };
    jBody.querySelectorAll(".emo").forEach((b) => b.addEventListener("click", () => {
      Sound.tap();
      jData.emotions = jData.emotions || [];
      const k = b.dataset.emo, i = jData.emotions.indexOf(k);
      if (i >= 0) jData.emotions.splice(i, 1); else jData.emotions.push(k);
      jApplyEmotions(); refresh();
    }));
    refresh();
  } else if (curId === "breathe") {
    const bb = jBody.querySelector("#jBreatheBtn");
    if (bb) bb.addEventListener("click", () => { Sound.tap(); openBreath(); }); // 여정 위에 호흡 오버레이(더 높은 z-index)
  } else if (curId === "habits") {
    jBody.querySelectorAll(".j-habit").forEach((btn) => btn.addEventListener("click", () => {
      const chs = loadChs(); const h = chs.find((x) => x.id === btn.dataset.hid); if (!h) return;
      const k = todayKey(); h.done[k] = !h.done[k]; saveChs(chs);
      btn.classList.toggle("done", h.done[k]); btn.querySelector("b").textContent = h.done[k] ? "✓" : "○";
      h.done[k] ? Sound.success() : Sound.tap();
    }));
  }
  jBody.scrollTop = 0;
}
function collectStep() {
  if (curId === "note") { const r = jBody.querySelector("#jNote"); if (r) jData.note = r.value.trim(); }
  else if (curId === "praise") { const r = jBody.querySelector("#jPraise"); if (r) jData.praise = r.value.trim(); }
  else if (curId === "reflect") { const g = jBody.querySelector("#jGood"), h = jBody.querySelector("#jHard"); if (g) jData.good = g.value.trim(); if (h) jData.hard = h.value.trim(); }
}
function openJourney() {
  Sound.unlock();
  jData = { date: todayKey(), emotions: [] };
  const t = loadEntries()[todayKey()];
  if (t) { jData.mood = t.mood; jData.energy = t.energy; jData.note = t.note; jData.praise = t.praise; if (t.reflection) { jData.good = t.reflection.good; jData.hard = t.reflection.hard; } }
  curId = "feel"; journey.hidden = false; requestAnimationFrame(() => journey.classList.add("show")); renderStep();
}
function closeJourney() { journey.classList.remove("show"); setTimeout(() => { journey.hidden = true; }, 300); }
function saveJourney() {
  const entries = loadEntries(), k = jData.date || todayKey();
  const prev = entries[k] || {};
  entries[k] = {
    date: k, mood: jData.mood, energy: Number(jData.energy || 3),
    note: (jData.note || "").trim(), praise: (jData.praise || "").trim(),
    tags: jData.tags || prev.tags || [], reflection: { good: jData.good || "", hard: jData.hard || "" },
    updatedAt: new Date().toISOString(),
  };
  settings.journeyCount = (settings.journeyCount || 0) + 1; saveSettingsObj(settings);
  saveEntries(entries); Sound.success(); Haptic.success();
  closeJourney(); loadToday(); checkBadges();
  if (detectCrisis(jData.note)) showSafety();
  toast("오늘 기록을 마쳤어요. 고마워요 💛");
}
document.getElementById("journeyStart").addEventListener("click", () => { Sound.tap(); openJourney(); });
document.getElementById("jClose").addEventListener("click", () => { Sound.tap(); closeJourney(); });
jNext.addEventListener("click", () => {
  collectStep();
  if (curId === "feel" && !jData.mood) { alert("지금 느껴지는 감정을 하나 골라주세요 🙂"); return; }
  if (curId === "finish") { saveJourney(); return; }
  const arr = jSteps(), i = arr.indexOf(curId);
  curId = arr[Math.min(i + 1, arr.length - 1)]; Sound.tap(); renderStep();
});
jPrev.addEventListener("click", () => {
  collectStep();
  const arr = jSteps(), i = arr.indexOf(curId);
  curId = arr[Math.max(i - 1, 0)]; Sound.tap(); renderStep();
});

// Esc로 오버레이/카드 닫기 (접근성)
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!journey.hidden) closeJourney();
  else if (!breathOverlay.hidden) closeBreath();
  else if (!subpage.hidden) closeSubpage();
  else if (!onboard.hidden) { finishOnboard(); }
  else { const sc = document.getElementById("safetyCard"); if (!sc.hidden) sc.hidden = true; }
});

/* 첫 제스처에 오디오 unlock */
window.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

/* 서비스워커 */
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

/* 토스트 + 복귀 격려 (리텐션) */
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 5000);
}
function comebackCheck() {
  const list = sortedEntries(loadEntries());
  if (!list.length) return;
  const last = list[list.length - 1].date;
  if (last === todayKey()) return;
  const gap = daysSince(last);
  if (gap >= 4) setTimeout(() => toast(`${gap}일 만이네요. 다시 와줘서 반가워요 🌿 쉬어간 날들도 괜찮아요. 오늘은 기분 하나만 눌러도 충분해요.`), 1300);
}

/* 클라우드 동기화용 훅 (cloud.js가 사용) */
window.__getLocalData = () => ({ entries: loadEntries(), challenges: loadChs(), settings: loadSettings() });
function refreshAll() {
  loadToday();
  if (!document.getElementById("tab-challenge").hidden) renderChallenge();
  if (!document.getElementById("tab-stats").hidden) renderStats();
}
window.__applyData = (data) => {
  if (!data) return;
  try {
    if (data.entries) localStorage.setItem(DB.ENTRIES, JSON.stringify(data.entries));
    if (data.challenges) localStorage.setItem(DB.CH, JSON.stringify(data.challenges));
    if (data.settings) { Object.assign(settings, data.settings); localStorage.setItem(DB.SETTINGS, JSON.stringify(settings)); applySettings(); }
  } catch (e) {}
  refreshAll();
};

/* 영구 저장 요청 — 저장공간 부족 시 브라우저가 데이터를 지우지 않도록 */
if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }

/* 초기화 */
applySettings();
loadToday();
scheduleReminder();
if (!settings.badges) { settings.badges = earnedBadgeIds(); saveSettingsObj(settings); } // 첫 실행은 조용히 시드(스팸 방지)
if (!localStorage.getItem(DB.ONBOARD)) showOnboard();
else comebackCheck();
