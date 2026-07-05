// 오늘의 쉼 · app.js
// 모든 데이터는 이 기기(localStorage)에만 저장됩니다.
// 심리학 근거: 자기자비(Neff 2003), 행동활성화(Martell 2010), 습관형성(Lally 2010),
// 실행의도(Gollwitzer 1999), 정서명명(Lieberman 2007), SDT(Deci & Ryan), 감사(Emmons 2003).

/* ===================== 저장소 ===================== */
const DB = { ENTRIES: "entries_v2", SETTINGS: "settings_v2", CH: "challenges_v2", ONBOARD: "onboarded_v1", JDRAFT: "journey_draft_v1", TOMB: "tombstones_v1" };
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
// 안전 접근자 — 알 수 없는/손상된 mood 값(레거시·클라우드 병합·import)에도 크래시 없이 동작
function mInfo(m) { return moodMeta[m] || { emoji: "·", score: 3, tag: "unknown" }; }
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
   카테고리는 직관적으로 긍정·보통·부정(정서가)으로 묶고,
   각 감정의 en(에너지 1-5)은 기록에 함께 저장된다(정서 원형모형, Russell 1980).
   base = 통계·점수용 기존 7분류 */
// v = 정서가(valence) 0~100 — 감정과 긍부정 점수를 일치시키는 기준값.
//     감정을 고르면 다이얼 점수가 고른 감정들의 평균 v로 맞춰진다.
// v(정서가 0~100)는 정서 원형모형(Russell, 1980)의 '쾌–불쾌' 축이며,
// 공개 규준치(ANEW: Bradley&Lang 1999, Warriner et al. 2013, 9점 척도)를
// (x-1)/8*100 로 환산해 맞췄다. en(활력 1~5)은 직교하는 '각성' 축이라,
// 정서가가 비슷한 감정(예: 불안·스트레스·화남)은 점수를 비슷하게 두고 활력으로 구분한다.
const EMOTIONS = [
  // 긍정 — 쾌. 고각성(신남·설렘)부터 저각성(평온)까지
  { k: "행복해요", e: "😄", base: "활기차요", en: 4, band: "pos", v: 92 }, // happy 8.4
  { k: "신나요",   e: "🤩", base: "활기차요", en: 5, band: "pos", v: 90 }, // excited 8.0
  { k: "뿌듯해요", e: "😏", base: "괜찮아요", en: 4, band: "pos", v: 86 }, // proud 8.0
  { k: "설레요",   e: "😆", base: "활기차요", en: 5, band: "pos", v: 85 }, // thrilled 7.7
  { k: "고마워요", e: "🥰", base: "괜찮아요", en: 4, band: "pos", v: 84 }, // grateful 7.9
  { k: "평온해요", e: "😊", base: "괜찮아요", en: 3, band: "pos", v: 76 }, // calm/serene 7.0
  { k: "괜찮아요", e: "🙂", base: "괜찮아요", en: 3, band: "pos", v: 66 }, // content/fine 6.3
  // 보통 — 중립 부근
  { k: "그럭저럭", e: "😐", base: "그럭저럭", en: 3, band: "neu", v: 52 }, // so-so 5.2
  { k: "멍해요",   e: "😶", base: "그럭저럭", en: 2, band: "neu", v: 47 }, // dazed/blank 4.7
  { k: "복잡해요", e: "🤔", base: "그럭저럭", en: 3, band: "neu", v: 44 }, // conflicted 4.5
  // 부정 — 불쾌. 고각성(불안·분노) ≈ 비슷한 점수, 활력으로 구분 / 우울 권역이 가장 낮음
  { k: "졸려요",     e: "😴",   base: "무기력해요", en: 1, band: "neg", v: 41 }, // sleepy 4.3 (저각성·약한 불쾌)
  { k: "지쳤어요",   e: "😮‍💨", base: "지쳤어요",   en: 1, band: "neg", v: 33 }, // exhausted 3.6
  { k: "초조해요",   e: "😣",   base: "불안해요",   en: 4, band: "neg", v: 30 }, // nervous 3.3
  { k: "불안해요",   e: "😰",   base: "불안해요",   en: 4, band: "neg", v: 27 }, // anxious 3.0
  { k: "스트레스",   e: "😫",   base: "불안해요",   en: 4, band: "neg", v: 26 }, // stressed 2.9
  { k: "화나요",     e: "😤",   base: "불안해요",   en: 5, band: "neg", v: 26 }, // angry 2.8
  { k: "무기력해요", e: "😶‍🌫️", base: "무기력해요", en: 1, band: "neg", v: 22 }, // helpless 2.4 (우울 권역 인접 → 불안보다 낮음)
  { k: "외로워요",   e: "😔",   base: "우울해요",   en: 1, band: "neg", v: 19 }, // lonely 2.4
  { k: "슬퍼요",     e: "😢",   base: "우울해요",   en: 1, band: "neg", v: 15 }, // sad 2.1
  { k: "우울해요",   e: "🥺",   base: "우울해요",   en: 1, band: "neg", v: 12 }, // depressed 1.8
];
const EMO_BANDS = [
  { id: "pos", label: "🌟 긍정적인 마음" },
  { id: "neu", label: "🌤️ 그저 그런 마음" },
  { id: "neg", label: "🌧️ 힘든 마음" },
];
function emoByKey(k) { return EMOTIONS.find((x) => x.k === k); }
// 위기 신호 어휘 — 공백 제거·소문자화 후 부분일치로 비교(아래 detectCrisis). 재현율(놓치지 않음) 우선.
// 직접 표현뿐 아니라 간접·완곡 표현, 영어까지 포함. 부정문("죽고 싶지 않아")은 detectCrisis에서 제외.
const CRISIS_WORDS = [
  // 직접
  "죽고싶", "죽고파", "죽어버리", "죽어야겠", "죽는게나", "확죽", "콱죽",
  "자살", "자살충동", "목숨을끊", "목숨끊", "스스로목숨",
  // 삶을 멈추고 싶은 마음(간접)
  "살기싫", "살고싶지않", "더이상살", "더는못살", "그만살고싶", "살이유가없", "살의미가없",
  "사라지고싶", "없어지고싶", "사라져버리고싶", "없어져버리고싶",
  "태어나지말", "안태어났으면", "태어나지않았으면", "세상에없었으면", "이세상에없",
  "깨지않았으면", "안깨어났으면", "영원히잠들",
  // 자해/수단
  "자해", "긋고싶", "손목긋", "손목을긋", "유서", "목매달", "목맬",
  // 영어
  "killmyself", "iwanttodie", "wanttodie", "endmylife", "enditall", "suicide", "suicidal", "selfharm",
];

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
// 습관 객체 정화 — 가져오기/클라우드/구버전 등 외부 출처 데이터의 XSS·오염 차단.
// emoji·id는 escape 없이 innerHTML/속성에 들어가므로 위험 문자를 제거하고, 문자열 길이를 제한.
function cleanHabit(h) {
  if (!h || typeof h !== "object") return null;
  const id = (typeof h.id === "string" ? h.id.replace(/[^A-Za-z0-9_-]/g, "") : "") || ("c" + Date.now());
  const emoji = ((typeof h.emoji === "string" ? h.emoji : "🎯").replace(/[<>&"'`]/g, "").slice(0, 8)) || "🎯";
  const done = {}, doneAt = {};
  if (h.done && typeof h.done === "object") for (const k in h.done) { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && h.done[k]) done[k] = true; } // 완료(true)만 보존, 구버전 false는 정리
  if (h.doneAt && typeof h.doneAt === "object") for (const k in h.doneAt) { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof h.doneAt[k] === "string") doneAt[k] = h.doneAt[k].slice(0, 40); } // 완료 토글 시각(기기 간 최신성 병합용)
  return {
    id, emoji,
    title: (typeof h.title === "string" ? h.title : "").slice(0, 120),
    cue: (typeof h.cue === "string" ? h.cue : "").slice(0, 200),
    minVersion: (typeof h.minVersion === "string" ? h.minVersion : "").slice(0, 200),
    startDate: (typeof h.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.startDate)) ? h.startDate : todayKey(),
    done, doneAt,
    celebrated: Array.isArray(h.celebrated) ? h.celebrated.filter((n) => typeof n === "number") : [],
  };
}
function loadChs() { try { const a = JSON.parse(localStorage.getItem(DB.CH)); return Array.isArray(a) ? a.map(cleanHabit).filter((h) => h && h.title) : []; } catch { return []; } }
function saveChs(a) { return safeSet(DB.CH, JSON.stringify(a)); }
// 삭제 묘비(tombstone) — 기기 간 동기화 시 '삭제'가 부활하지 않도록 삭제 시각을 기록
function loadTomb() { try { const t = JSON.parse(localStorage.getItem(DB.TOMB)) || {}; return { entries: t.entries || {}, habits: t.habits || {} }; } catch { return { entries: {}, habits: {} }; } }
function saveTomb(t) { return safeSet(DB.TOMB, JSON.stringify(t)); }
function tombstoneEntry(k) { const t = loadTomb(); t.entries[k] = new Date().toISOString(); saveTomb(t); }
function tombstoneHabit(id) { const t = loadTomb(); t.habits[id] = new Date().toISOString(); saveTomb(t); }

function todayKey(d) {
  d = d || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(dateStr, n) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n); return todayKey(d); }
function daysSince(startKey) {
  const a = new Date(startKey + "T00:00:00"), b = new Date(todayKey() + "T00:00:00");
  return Math.round((b - a) / 86400000);
}
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); } // 손상 데이터(비문자열)에도 안전

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
  { e: "✨", t: "'오늘의 여정'으로 기록해요", d: "동그라미를 돌려 오늘 기분을 0~100점으로, 감정도 골라요. 한 걸음씩 따라가면 끝나요." },
  { e: "📊", t: "기록이 쌓이면 나를 알게 돼요", d: "기분·활력 흐름, 요일 패턴, 감정과 습관의 관계까지 '기록' 탭이 분석해줘요." },
  { e: "🌿", t: "지칠 땐 '쉼' 탭에서 숨 한 번", d: "위로 한마디, 호흡 명상, 잔잔한 소리. 언제든 도망 와도 돼요." },
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
const tabs = { today: "tab-today", calendar: "tab-calendar", rest: "tab-rest", challenge: "tab-challenge", stats: "tab-stats", settings: "tab-settings" };
function activateTab(name, { scroll = true } = {}) {
  document.querySelectorAll(".tabbtn").forEach((b) => { const on = b.dataset.tab === name; b.classList.toggle("active", on); b.setAttribute("aria-selected", on ? "true" : "false"); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  Object.entries(tabs).forEach(([k, id]) => { document.getElementById(id).hidden = k !== name; });
  if (name === "stats") renderStats();
  if (name === "calendar") renderMoodCalendar(loadEntries());
  if (name === "challenge") renderChallenge();
  if (name === "today") { updateJourneyHero(); updateTodayStats(); renderTodayHabitGlance(); }
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
  const sc = entryScore(e);
  const moodTxt = e.mood ? `${mInfo(e.mood).emoji} ${e.mood}` : "기분 기록 없음";
  const refl = e.reflection && (e.reflection.good || e.reflection.hard);
  const hs = (b, s) => `<div class="hs"><b>${b}</b><span>${s}</span></div>`;
  const tags = (e.tags && e.tags.length) ? `<div class="hist-tags" style="margin-top:var(--s3)">${e.tags.map((t) => `<span class="link-tag">#${escapeHtml(t)}</span>`).join("")}</div>` : "";
  // 한 페이지 한눈에 — 게이지(점수) + 기분/활력/태그 + 일기·잘한일·회고
  return `
    <div class="card rpt-hero">
      <div class="gauge-wrap">${sc != null ? moodGaugeSvg(sc) : '<div class="gauge-empty">기분<br>없음</div>'}</div>
      <div class="rpt-hero-side"><p class="rpt-hero-cap">${moodTxt}</p><div class="hero-stats">${hs(e.energy || "—", "활력/5")}${hs((e.tags && e.tags.length) || 0, "감정 태그")}</div></div>
    </div>
    ${tags ? `<div class="card">${tags}</div>` : ""}
    ${e.note ? `<div class="card"><h2>📝 일기</h2><p class="h-note">${escapeHtml(e.note)}</p></div>` : ""}
    ${e.praise ? `<div class="card"><h2>🌱 잘한 일</h2><p class="h-note">${escapeHtml(e.praise)}</p></div>` : ""}
    ${refl ? `<div class="card"><h2>🌙 저녁 회고</h2>${e.reflection.good ? `<p class="h-note">🌤️ ${escapeHtml(e.reflection.good)}</p>` : ""}${e.reflection.hard ? `<p class="h-note" style="margin-top:8px">🌧️ ${escapeHtml(e.reflection.hard)}</p>` : ""}</div>` : ""}
    ${(!e.note && !e.praise && !refl) ? '<p class="empty">이날은 기분만 남겼어요.</p>' : ""}
    <div class="data-btns" style="margin-top:18px">
      <button class="btn primary" data-eact="edit">✏️ 수정</button>
      <button class="btn danger" data-eact="del">삭제</button>
    </div>`;
}
function openEntryEditor(dateKey) {
  if (dateKey > todayKey()) return;
  // 기록·수정 모두 '오늘의 여정'과 같은 입력(다이얼)으로 통일 — 달력/기록과 싱크 일치
  openJourney(dateKey);
}

/* ===================== 오늘 화면 ===================== */
// 입력은 '오늘의 여정' 하나로 통일됨(옛 직접기록 폼 제거).
function curReplies() { return settings.tone === "plain" ? plainReplies : moodReplies; }
function parseTags(s) { return (s || "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean); }
function loadToday() { updateJourneyHero(); updateTodayStats(); renderTodayHabitGlance(); }

// 첫 화면 통계 + 응원 — 동기 부여
function updateTodayStats() {
  const card = document.getElementById("todayStats");
  if (!card) return;
  const entries = loadEntries(), tk = todayKey();
  const list = sortedEntries(entries);
  const streak = calcStreak(entries);
  const prevBest = syncBestStreak(streak);   // 신기록이면 직전 최고값(>=0) 반환
  const best = settings.bestStreak || 0;
  const keys = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(todayKey(d)); }
  const week = keys.filter((k) => entries[k] && entries[k].mood).length;
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  set("tsStreak", streak);
  set("tsWeek", `${week}<i>/7</i>`);
  set("tsTotal", list.length);
  const doneToday = !!(entries[tk] && entries[tk].mood);
  const plain = settings.tone === "plain"; // 담백 모드: 손실 프레이밍·기록경쟁·축하 압박을 덜어낸 담담한 문구
  let cheer;
  if (list.length === 0) cheer = plain ? "오늘 첫 기록을 남겨보세요." : "환영해요! 오늘 첫 마음을 남겨볼까요? 🌱";
  else if (doneToday && prevBest >= 0 && streak >= 3) {
    cheer = plain ? `오늘까지 ${streak}일째 기록했어요.` : `🏆 신기록! ${streak}일 연속 — 지금까지 중 가장 길어요!`;
    if (!plain && typeof confetti === "function") setTimeout(confetti, 200);
  }
  else if (!doneToday) cheer = plain
    ? (streak >= 1 ? `${streak}일째 기록 중이에요. 오늘도 편할 때 남겨보세요.` : "오늘 기분을 기록해보세요.")
    : (streak >= 1 ? `🔥 ${streak}일 연속 중! 오늘 기록하면 ${streak + 1}일로 이어져요` : (best >= 3 ? `최고 ${best}일까지 해냈던 당신! 오늘 다시 시작해 신기록에 도전해요 💪` : "오늘 마음을 남기고 다시 시작해 봐요 💛"));
  else if (streak >= 7) cheer = plain ? `${streak}일째 꾸준히 기록 중이에요.` : `${streak}일 연속이라니 정말 대단해요! 스스로를 꾸준히 돌보고 있어요 👑`;
  else if (week >= 5) cheer = plain ? "이번 주 자주 기록했어요." : "이번 주 정말 잘 챙겼어요. 이 리듬, 그대로 좋아요 ☀️";
  else cheer = plain ? "오늘 기록했어요." : (best >= 3 ? `오늘도 해냈어요 💛 (최고 ${best}일 연속 기록 보유 중)` : "오늘도 해냈어요. 이 작은 기록들이 모여 큰 변화가 돼요 💛");
  set("tsCheer", cheer);
  // 주간 목표 진행(목표경사 효과) — 7일 중 며칠
  const wf = document.getElementById("wkGoalFill");
  if (wf) { wf.style.width = Math.round(week / 7 * 100) + "%"; wf.style.background = week >= 7 ? "var(--success)" : week >= 5 ? "var(--accent)" : "var(--accent-deep)"; }
  set("wkGoalCap", week >= 7 ? "목표 달성! 🎉" : `목표 ${week}/7`);
}

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
    set("journeyStartHint", `오늘 ${mInfo(e.mood).emoji} ${e.mood} 마음을 남겼어요. 잘 해냈어요.`);
    set("journeyStart", "오늘 여정 다시 하기");
    const ins = quickInsight(); // 데이터 인사이트를 첫 화면에 노출
    set("journeySub", ins || "원하면 언제든 다시 돌아볼 수 있어요");
  } else {
    set("journeyEmoji", "✨");
    set("journeyStartHint", "한 걸음씩 따라가며 오늘 마음을 남겨봐요.");
    set("journeyStart", "오늘의 여정 시작하기");
    set("journeySub", "3분이면 충분해요 · 한 번에 하나씩");
  }
  // 첫 주 온보딩 미션 — 습관 형성 가속(작은 목표)
  const total = sortedEntries(loadEntries()).length;
  if (total < 3) set("journeySub", `🌱 첫 주 미션 · 3일 기록하기 (${total}/3) — 작게 시작해요`);
}
// 위기 신호 직후의 부정 표현 — "죽고 싶지 않아", "자해 안 해" 등은 위기로 보지 않음
const CRISIS_NEG = /^(지않|진않|지는않|지말|지마|하지않|안[하해했할함]|은아니|는아니|아니)/;
function detectCrisis(text) {
  if (!text) return false;
  const norm = String(text).toLowerCase().replace(/\s+/g, ""); // 공백 제거로 띄어쓰기 변형도 포착
  for (const w of CRISIS_WORDS) {
    let i = norm.indexOf(w);
    while (i !== -1) {
      if (!CRISIS_NEG.test(norm.slice(i + w.length))) return true; // 부정문이 아니면 위기로 판단
      i = norm.indexOf(w, i + 1);
    }
  }
  return false;
}
function showSafety() {
  const c = document.getElementById("safetyCard");
  c.hidden = false;
  c.scrollIntoView({ behavior: "smooth", block: "center" });
}
document.getElementById("safetyClose").addEventListener("click", () => { document.getElementById("safetyCard").hidden = true; });
document.getElementById("safetyBreath").addEventListener("click", () => { Sound.tap(); openBreath(); }); // 위기 → 호흡으로 바로 진정

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
// 문장이 끝나면 다음 문장은 한 줄 아래에 (쉼표는 그대로 둠)
function formatQuote(t) {
  return escapeHtml((t || "").trim())
    .replace(/([.!?。…])\s+/g, "$1<br>")   // 문장 끝 + 다음 문장 → 줄바꿈
    .replace(/(<br>\s*)+$/g, "");           // 마지막 줄바꿈 제거
}
function showRandomQuote() {
  const pool = activePool(); if (!pool.length) return;
  let i, tries = 0; do { i = Math.floor(Math.random() * pool.length); tries++; } while (pool[i] === currentQuote && pool.length > 1 && tries < 12);
  currentQuote = pool[i];
  quoteEl.classList.add("swap");
  setTimeout(() => { quoteEl.innerHTML = "“" + formatQuote(currentQuote) + "”"; quoteEl.classList.remove("swap"); updateFavBtn(); }, 230);
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
  currentQuote = t; quoteEl.innerHTML = "“" + formatQuote(t) + "”"; updateFavBtn();
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
  let running = false, tick = null, pre = null, pi = 0, remain = 0, cycles = 0;
  function render() { textEl.innerHTML = `${BREATH_PHASES[pi].name}<br><b>${remain}</b>`; }
  function enter(i) {
    pi = i; const ph = BREATH_PHASES[i]; remain = ph.dur;
    circleEl.className = base + " " + ph.cls;
    circleEl.style.transitionDuration = (ph.cls === "hold" ? 0.4 : ph.dur) + "s";
    Sound.breathCue(ph.cue, ph.dur); render();
    if (opts.onPhase) { try { opts.onPhase(ph.cls, i); } catch (e) {} } // 단계 전환 훅(햅틱·파티클 등 juice)
  }
  function loop() {
    remain--;
    if (remain <= 0) {
      let next = pi + 1;
      if (next >= BREATH_PHASES.length) {
        next = 0; cycles++;
        if (isSleep() && opts.maxCycles && cycles >= opts.maxCycles) { api.stop(); if (opts.onAutoEnd) opts.onAutoEnd(); return; }
      }
      enter(next);
    } else { render(); Sound.tick(); }   // 숫자 + 카운트(둥근 사운드)
  }
  const api = {
    isRunning: () => running,
    cycles: () => cycles,
    start() {
      if (running) return;
      try { settings.breathCount = (settings.breathCount || 0) + 1; saveSettingsObj(settings); } catch (e) {}
      Sound.unlock(); running = true; cycles = 0;
      // 시작 전 예비 카운트 3 · 2 · 1 (마음의 준비)
      let n = 3;
      circleEl.className = base + " ready"; circleEl.style.transitionDuration = "0.5s";
      textEl.innerHTML = `곧 시작해요<br><b>${n}</b>`; Sound.countTick(n);
      pre = setInterval(() => {
        n--;
        if (n <= 0) { clearInterval(pre); pre = null; Sound.breathStart(); enter(0); tick = setInterval(loop, 1000); }
        else { textEl.innerHTML = `곧 시작해요<br><b>${n}</b>`; Sound.countTick(n); }
      }, 1000);
    },
    stop() {
      running = false;
      if (pre) { clearInterval(pre); pre = null; }
      if (tick) { clearInterval(tick); tick = null; }
      Sound.breathStop();
      circleEl.className = base + " med-idle"; circleEl.style.transitionDuration = ""; // med-idle: 종료 메시지가 보이도록(코스믹 비주얼)
      textEl.innerHTML = cycles > 0 ? `잘했어요<br><b>${cycles}회</b>` : "잘했어요";
      if (typeof checkBadges === "function") checkBadges(); // 호흡 배지 즉시 반영
    },
  };
  return api;
}

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
  "양손을 깍지 껴 위로 쭉 뻗기 🙌", "차가운 물 한 모금 마시기 🧊", "오늘 입은 옷 색깔 의식해 보기 👕",
  "좋아하는 책 한 문단만 읽기 📖", "지금 들리는 소리 3가지 찾기 🔊", "창문 열어 환기 1분 🪟",
  "발바닥을 바닥에 꾹 붙여보기 🦶", "어제보다 잘한 것 하나 칭찬하기 👏", "기지개 켜며 하품 한 번 😪",
  "좋아하는 간식 한 입 음미하기 🍪", "휴대폰 화면 밝기 낮추기 🌗", "오늘 날씨를 한 문장으로 적기 ⛅",
  "손목·발목 천천히 돌리기 🔄", "거울 보며 미소 한 번 😊", "미뤄둔 일 딱 1분만 시작하기 ⏱️",
  "좋아하는 사람 사진 한 장 보기 🖼️", "따뜻한 차 천천히 우리기 🍵", "눈을 감고 10까지 세기 🔢",
  "오늘 감사한 것 하나 소리 내 말하기 🗣️", "방 안 물건 하나 제자리에 두기 🧹", "심장 박동에 1분 집중하기 💓",
  "좋아하는 향수·로션 바르기 🧴", "잠깐 맨발로 서 있기 🦶", "내일의 나에게 한 줄 응원 쓰기 ✉️",
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
  if (type === "off") Sound.stopAmbient(); else { Sound.startAmbient(type); settings.lastAmbient = type; }
  settings.ambientType = type; saveSettingsObj(settings); // 선택 기억 → 다음에 자동 재생
  if (typeof medSyncAmbIcon === "function") medSyncAmbIcon();
});
document.getElementById("ambientVol").addEventListener("input", (e) => Sound.setAmbientVolume(e.target.value / 100));
// 선택해 둔 배경음을 자동 재생 (명상 진입·호흡 시작 등 사용자 제스처 내에서)
function autoAmbient() {
  if (settings.ambientType && settings.ambientType !== "off" && Sound.state.ambientType === "off") {
    Sound.startAmbient(settings.ambientType);
    document.querySelectorAll(".sound-btn").forEach((b) => { const on = b.dataset.sound === settings.ambientType; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  }
}

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
  if (typeof renderTodayHabitGlance === "function") { renderTodayHabitGlance(); renderSummaryHabitGlance(); }
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

// 달성일 집계 — 90일 창(startDate~+89) 안의 완료만 센다(창 밖 잔여 키로 인한 통계 왜곡 방지)
function habitDoneCount(h) {
  const d = new Date(h.startDate + "T00:00:00"); let c = 0;
  for (let i = 0; i < CH_TARGET; i++) { if (h.done[todayKey(d)]) c++; d.setDate(d.getDate() + 1); }
  return c;
}
function habitCardHtml(h) {
  const dayNum = Math.min(daysSince(h.startDate) + 1, CH_TARGET);
  const doneCount = habitDoneCount(h);
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
    <div class="habit-mini-bar"><i style="width:${Math.min(100, (doneCount / CH_TARGET) * 100)}%"></i></div>
  </div>`;
}

function detailHabitHtml(h) {
  const dayNum = Math.min(daysSince(h.startDate) + 1, CH_TARGET);
  const doneCount = habitDoneCount(h);
  const streak = challengeStreak(h);
  const todayDone = !!h.done[todayKey()];
  const reached = Object.keys(MILESTONES).map(Number).filter((m) => doneCount >= m);
  const ms = reached.length ? MILESTONES[Math.max(...reached)] : "";
  return `
    <p class="detail-stat">Day ${dayNum}/${CH_TARGET} · 달성 ${doneCount}일 · 연속 ${streak}일 · 남은 ${Math.max(CH_TARGET - doneCount, 0)}일</p>
    <div class="ch-progress"><div class="ch-bar" style="width:${Math.min(100, (doneCount / CH_TARGET) * 100)}%"></div></div>
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
      const entries = loadEntries(); delete entries[subEntryDate]; saveEntries(entries); tombstoneEntry(subEntryDate);
      if (window.Cloud && window.Cloud.markDirty) window.Cloud.markDirty();
      Sound.tap(); closeSubpage(); renderStats();
    }
  } else if (subMode === "report") {
    const el = e.target.closest("[data-ract]"); if (!el) return;
    if (el.dataset.ract === "img") { Sound.tap(); showImagePreview(el.dataset.kind); }
    else if (el.dataset.ract === "share") { Sound.tap(); shareReport(el.dataset.kind); }
  }
});

// 습관 동작 (목록·상세 공용)
function applyHabitAction(act, id, scopeEl) {
  const chs = loadChs(); const h = chs.find((x) => x.id === id); if (!h) return;
  if (act === "check") {
    const k = todayKey();
    const willBeDone = !h.done[k];
    h.doneAt = h.doneAt || {}; h.doneAt[k] = new Date().toISOString(); // 토글 시각 기록(기기 간 최신성 병합)
    if (willBeDone) h.done[k] = true; else delete h.done[k];           // 해제는 키 삭제(union 병합에 의한 부활 방지)
    const after = habitDoneCount(h);                                    // 90일 창 기준 집계(창 밖 키 왜곡 방지)
    let celebrated = false;
    if (willBeDone && MILESTONES[after] && !h.celebrated.includes(after)) { h.celebrated.push(after); celebrated = true; }
    saveChs(chs);
    if (willBeDone) { if (celebrated) { Sound.celebrate(); confetti(); Haptic.success(); } else { Sound.success(); Haptic.tap(); } } else Sound.tap();
    renderChallenge(); refreshHabitDetail(id);
    if (willBeDone) { const grid = document.querySelector(`[data-grid="${id}"]`); const idx = daysSince(h.startDate); if (grid && grid.children[idx]) grid.children[idx].classList.add("just-done"); }
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
    saveChs(chs.filter((x) => x.id !== id)); tombstoneHabit(id);
    if (window.Cloud && window.Cloud.markDirty) window.Cloud.markDirty();
    Sound.tap(); closeSubpage(); renderChallenge();
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
  const doneCount = habitDoneCount(h);
  const text = `오늘의 쉼 ${h.emoji} '${h.title}' 90일 챌린지 — ${doneCount}일 달성! 함께 해요 💪`;
  try {
    if (navigator.share) await navigator.share({ title: "오늘의 쉼 챌린지", text });
    else { await navigator.clipboard.writeText(text); alert("진행 상황을 클립보드에 복사했어요!\n\n" + text); }
  } catch (e) {}
}

function confetti() {
  if (settings && settings.tone === "plain") return; // 담백 모드: 축하 연출 생략(압박감 완화)
  try { if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch (e) {} // 모션 최소화 존중
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
// 연속 기록 — '연속 보호'(주 1회): 최근 30일 기록 7일당 보호 1개(최대 2)를 선적립해,
// 가장 최근의 공백(어제 하루 결석)도 보호로 메워져 성실한 사용자의 연속이 억울하게 끊기지 않는다
function calcStreak(entries) {
  let streak = 0, d = new Date();
  let recent = 0; { const t = new Date(); for (let i = 0; i < 30; i++) { const kk = todayKey(t); if (entries[kk] && entries[kk].mood) recent++; t.setDate(t.getDate() - 1); } }
  let freezes = Math.min(2, Math.floor(recent / 7));
  if (!entries[todayKey(d)]) d.setDate(d.getDate() - 1); // 오늘 아직이면 어제부터 센다(오늘은 위기, 아직 기회 있음)
  while (true) {
    const k = todayKey(d);
    if (entries[k] && entries[k].mood) { streak++; }
    else if (streak > 0 && freezes > 0) { freezes--; }   // 빈 날 1일을 보호로 메움
    else break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
function dayOfWeekKo(key) { return ["일", "월", "화", "수", "목", "금", "토"][new Date(key + "T00:00:00").getDay()]; }
// 최고 연속 기록 — 연속이 끊겨도 '최고 기록'은 남아 성취가 사라지지 않음(손실회피). 신기록이면 직전값 반환
function syncBestStreak(streak) {
  const prev = settings.bestStreak || 0;
  if (streak > prev) { settings.bestStreak = streak; saveSettingsObj(settings); return prev; }
  return -1;
}

// 기분 점수(0-100) — 여정 다이얼 값 우선, 없으면 분류에서 환산
function entryScore(e) { return e && e.score != null ? e.score : (e && e.mood ? moodToScore(e.mood) : null); }
function renderStats() {
  const entries = loadEntries(), list = sortedEntries(entries);
  // 첫 사용자 빈 화면 안내 — 기록 0개면 잠긴 지표 대신 안내+CTA 하나만
  const hero = document.getElementById("statsEmptyHero");
  if (hero) hero.hidden = list.length > 0;
  const _st = calcStreak(entries); syncBestStreak(_st);
  document.getElementById("streakNum").textContent = _st;
  document.getElementById("totalNum").textContent = list.length;
  const sb = document.getElementById("statBadge");
  if (sb) sb.textContent = `${earnedBadgeIds().length}/${BADGES.length}`;
  renderAnalyzeKpis(entries, list);
  renderDiscoveries(entries, list);
  renderWeekly(entries);
  renderMonthly(entries);
  renderWeekGlance(entries);
  renderSummaryHabitGlance();
  renderCapture(entries);
  renderBadges();
  renderInsight(entries, list);
  renderCorrelation(entries);
  renderHabitHeatmap();
  renderHabitSummary();
  renderWordWeb(entries);
  renderTagInsight(entries);
  renderRhythm(entries);
  renderGratitude(list);
  renderDist(list);
  if (typeof applyStatLayout === "function") applyStatLayout(); // 사용자 맞춤 순서/숨김 반영
}
// 기록 구성 — 여정의 각 항목을 최근 30일 동안 며칠 남겼는지(정리)
function renderCapture(entries) {
  const el = document.getElementById("captureBody"); if (!el) return;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const recs = Object.values(entries).filter((e) => e.date && new Date(e.date + "T00:00:00") >= cutoff);
  if (!recs.length) { el.innerHTML = '<p class="empty">여정을 시작하면 기록 구성이 채워져요 🌱</p>'; return; }
  const total = recs.length;
  const rows = [
    { e: "🎯", k: "기분 점수", n: recs.filter((x) => x.mood).length },
    { e: "🏷️", k: "감정 태그", n: recs.filter((x) => x.tags && x.tags.length).length },
    { e: "📝", k: "일기", n: recs.filter((x) => x.note && x.note.trim()).length },
    { e: "🌱", k: "잘한 일", n: recs.filter((x) => x.praise && x.praise.trim()).length },
    { e: "🌙", k: "저녁 회고", n: recs.filter((x) => x.reflection && (x.reflection.good || x.reflection.hard)).length },
  ];
  el.innerHTML = rows.map((r) => `<div class="dist-row"><span class="cap-name">${r.e} ${r.k}</span><div class="dist-bar-wrap"><div class="dist-bar" style="width:${Math.round(r.n / total * 100)}%"></div></div><span class="dist-count">${r.n}</span></div>`).join("");
}
// 잘한 일(감사) 모아보기 — 여정의 감사 데이터를 한곳에(분석/회고)
function renderGratitude(list) {
  const el = document.getElementById("gratList"); if (!el) return;
  const seen = new Set();
  const items = list.filter((e) => e.praise && e.praise.trim()).reverse()
    .filter((e) => { const key = e.praise.trim(); if (seen.has(key)) return false; seen.add(key); return true; }); // 같은 문구 중복 제거
  if (!items.length) { el.innerHTML = '<p class="empty">여정에서 \'잘한 일\'을 적으면 여기에 모여요 🌱</p>'; return; }
  el.innerHTML = items.slice(0, 10).map((e) => { const p = e.date.split("-"); return `<div class="grat-item"><span class="grat-date">${+p[1]}/${+p[2]}</span><span class="grat-text">${escapeHtml(e.praise)}</span></div>`; }).join("");
}

let calOffset = 0; // 0 = 이번 달, -1 = 지난 달 …
function renderMoodCalendar(entries) {
  const wrap = document.getElementById("moodCal");
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + calOffset);
  const y = base.getFullYear(), m = base.getMonth();
  document.getElementById("calMonth").textContent = `${y}년 ${m + 1}월`;
  document.getElementById("calNext").disabled = calOffset >= 0;
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const tk = todayKey();
  let html = "";
  for (let i = 0; i < first; i++) html += `<span class="cal-cell blank"></span>`;
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const e = entries[key];
    const score = e && e.mood ? mInfo(e.mood).score : 0;
    const isToday = key === tk;
    const future = key > tk;
    html += `<button class="cal-cell m${score} ${isToday ? "today" : ""}" ${future ? "disabled" : ""} data-cal="${key}" title="${e && e.mood ? e.mood : ""}">${d}</button>`;
  }
  wrap.innerHTML = html;
  wrap.querySelectorAll("[data-cal]").forEach((b) => b.addEventListener("click", () => {
    Sound.tap(); const k = b.dataset.cal;
    if (loadEntries()[k]) openEntryDetail(k);   // 기록 있으면 요약(한눈에) → 거기서 수정
    else openEntryEditor(k);                     // 빈 날은 바로 기록(여정)
  }));
}
document.getElementById("calPrev").addEventListener("click", () => { calOffset--; Sound.tap(); renderMoodCalendar(loadEntries()); });
document.getElementById("calNext").addEventListener("click", () => { if (calOffset < 0) { calOffset++; Sound.tap(); renderMoodCalendar(loadEntries()); } });
document.getElementById("weekReportBtn").addEventListener("click", () => { Sound.tap(); openReport("week"); });

/* 기록 탭 서브탭 (요약/분석) */
function showStatsSeg(seg) {
  document.querySelectorAll("#statsSeg button").forEach((b) => b.classList.toggle("active", b.dataset.seg === seg));
  document.querySelectorAll(".stats-panel").forEach((p) => { p.hidden = p.dataset.panel !== seg; });
}
document.getElementById("statsSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  Sound.tap(); showStatsSeg(b.dataset.seg);
});
const _allAnalysisToggle = document.getElementById("allAnalysisToggle");
if (_allAnalysisToggle) _allAnalysisToggle.addEventListener("click", () => {
  const box = document.getElementById("allAnalysis"); const open = box.hidden;
  box.hidden = !open; Sound.tap();
  _allAnalysisToggle.setAttribute("aria-expanded", open ? "true" : "false");
  _allAnalysisToggle.textContent = open ? "모든 분석 접기 ▴" : "모든 분석 자세히 보기 ▾";
});

/* 분석 카드 맞춤 — 보고 싶은 분석을 '메인'으로 올리거나(고정), 순서 변경/숨김 (자유도) */
const STAT_SEC_DEFAULT = ["rhythm", "capture", "tags", "dist", "grat", "habitsum", "corr", "heat", "web"];
const STAT_SEC_NAME = { rhythm: "마음 리듬", capture: "기록 구성", tags: "자주 느낀 감정", dist: "마음 흐름·분포", grat: "잘한 일 모아보기", habitsum: "습관 요약", corr: "습관과 기분", heat: "습관 실천 매트릭스", web: "생각의 지도" };
let statEditing = false;
function statOrder() {
  const saved = (settings.statOrder || []).filter((id) => STAT_SEC_DEFAULT.includes(id));
  const rest = STAT_SEC_DEFAULT.filter((id) => !saved.includes(id)); // 새 섹션은 뒤에 자동 추가
  return saved.concat(rest);
}
function findSecCard(id) { return document.querySelector(`#statPinned > [data-sec="${id}"], #allAnalysis > [data-sec="${id}"]`); }
function applyStatLayout() {
  const drawer = document.getElementById("allAnalysis"), pinBox = document.getElementById("statPinned");
  if (!drawer || !pinBox) return;
  const hidden = settings.statHidden || [], pinned = settings.statPinned || [];
  const order = statOrder();
  order.forEach((id) => {
    const card = findSecCard(id); if (!card) return;
    const isHidden = hidden.includes(id), isPinned = pinned.includes(id) && !isHidden;
    // 컨테이너 배치: 메인 고정 → statPinned, 그 외 → 드로어(allAnalysis). 순서대로 append.
    (isPinned ? pinBox : drawer).appendChild(card);
    // 고정 카드는 펼쳐서 바로 보이게, 드로어로 내려가면 다시 접음
    if (card.classList.contains("collapsible")) card.classList.toggle("collapsed", !isPinned);
    card.classList.toggle("sec-hidden", isHidden && !statEditing);
    card.classList.toggle("sec-dim", isHidden && statEditing);
    card.classList.toggle("sec-pinned", isPinned);
    // 편집 컨트롤 바 (카드 맨 위)
    let bar = card.querySelector(":scope > .sec-ctrl");
    if (statEditing) {
      if (!bar) { bar = document.createElement("div"); bar.className = "sec-ctrl"; }
      card.insertBefore(bar, card.firstChild);
      bar.innerHTML = `<span class="sec-ctrl-name">${STAT_SEC_NAME[id]}</span>`
        + `<button class="sec-btn ${isPinned ? "on" : ""}" data-act="pin" data-secid="${id}" aria-pressed="${isPinned}" aria-label="메인에 올리기">📌</button>`
        + `<button class="sec-btn" data-act="up" data-secid="${id}" aria-label="위로">▲</button>`
        + `<button class="sec-btn" data-act="down" data-secid="${id}" aria-label="아래로">▼</button>`
        + `<button class="sec-btn" data-act="vis" data-secid="${id}" aria-pressed="${isHidden}" aria-label="보임/숨김">${isHidden ? "🚫" : "👁"}</button>`;
    } else if (bar) { bar.remove(); }
  });
  drawer.classList.toggle("stat-editing", statEditing);
  pinBox.classList.toggle("stat-editing", statEditing);
  // 고정된 게 하나도 없으면 안내(편집 중에만)
}
function moveStat(id, dir) {
  const order = statOrder();
  const i = order.indexOf(id); if (i < 0) return;
  const j = i + dir; if (j < 0 || j >= order.length) return;
  order.splice(i, 1); order.splice(j, 0, id);
  const prev = captureStatRects();
  settings.statOrder = order; saveSettingsObj(settings); applyStatLayout();
  playStatFlip(prev);
}
function toggleStatVis(id) {
  const hidden = (settings.statHidden || []).slice();
  const i = hidden.indexOf(id);
  if (i >= 0) hidden.splice(i, 1); else hidden.push(id);
  const prev = captureStatRects();
  settings.statHidden = hidden; saveSettingsObj(settings); applyStatLayout();
  playStatFlip(prev);
}
function toggleStatPin(id) {
  const pinned = (settings.statPinned || []).slice();
  const i = pinned.indexOf(id);
  if (i >= 0) pinned.splice(i, 1); else { pinned.push(id); // 메인에 올리면 숨김은 해제
    settings.statHidden = (settings.statHidden || []).filter((x) => x !== id); }
  const prev = captureStatRects();
  settings.statPinned = pinned; saveSettingsObj(settings); applyStatLayout();
  playStatFlip(prev);
  const card = findSecCard(id); // 방금 올린/내린 카드에 살짝 강조 펄스
  if (card) { card.classList.remove("sec-pulse"); void card.offsetWidth; card.classList.add("sec-pulse"); }
}
// FLIP 애니메이션 — 분석 카드가 자리를 옮길 때 '슬라이드'로 부드럽게 (라이브러리 없이)
function captureStatRects() {
  const m = {};
  document.querySelectorAll("#statPinned > [data-sec], #allAnalysis > [data-sec]").forEach((c) => {
    const id = c.getAttribute("data-sec"); try { m[id] = c.getBoundingClientRect(); } catch (e) {}
  });
  return m;
}
function playStatFlip(prev) {
  if (!prev) return;
  document.querySelectorAll("#statPinned > [data-sec], #allAnalysis > [data-sec]").forEach((c) => {
    const id = c.getAttribute("data-sec"), a = prev[id]; if (!a) return;
    let b; try { b = c.getBoundingClientRect(); } catch (e) { return; }
    const dx = a.left - b.left, dy = a.top - b.top;
    if (!dx && !dy) return;
    c.style.transition = "none"; c.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => { c.style.transition = "transform 0.34s cubic-bezier(0.22,0.61,0.36,1)"; c.style.transform = ""; });
    setTimeout(() => { c.style.transition = ""; c.style.transform = ""; }, 400);
  });
}
const _statEditBtn = document.getElementById("statEditBtn");
if (_statEditBtn) _statEditBtn.addEventListener("click", () => {
  Sound.tap(); statEditing = !statEditing;
  _statEditBtn.setAttribute("aria-pressed", statEditing ? "true" : "false");
  _statEditBtn.classList.toggle("on", statEditing);
  _statEditBtn.textContent = statEditing ? "✓ 완료" : "🔧 맞춤";
  const hint = document.getElementById("statEditHint"); if (hint) hint.hidden = !statEditing;
  // 편집 중에는 드로어를 펼쳐서 모든 카드 헤더가 보이도록
  const box = document.getElementById("allAnalysis");
  if (statEditing && box && box.hidden) { box.hidden = false; _allAnalysisToggle.setAttribute("aria-expanded", "true"); _allAnalysisToggle.textContent = "모든 분석 접기 ▴"; }
  applyStatLayout();
});
// 편집 컨트롤 클릭 — 고정 영역·드로어 둘 다 커버하려고 그래프 패널에 위임
const _statGraphPanel = document.querySelector('.stats-panel[data-panel="graph"]');
if (_statGraphPanel) _statGraphPanel.addEventListener("click", (e) => {
  const b = e.target.closest(".sec-btn"); if (!b) return;
  e.stopPropagation(); Sound.tap();
  const id = b.dataset.secid, act = b.dataset.act;
  if (act === "pin") toggleStatPin(id);
  else if (act === "up") moveStat(id, -1);
  else if (act === "down") moveStat(id, 1);
  else if (act === "vis") toggleStatVis(id);
});
// 첫 화면 통계 숫자 → 기록 탭 해당 뷰로 점프 (편의 연결)
document.getElementById("todayStats").addEventListener("click", (e) => {
  const it = e.target.closest("[data-jump]"); if (!it) return;
  Sound.tap();
  const j = it.dataset.jump;
  if (j === "weekreport") { activateTab("stats"); showStatsSeg("summary"); openReport("week"); }
  else if (j === "calendar" || j === "log") { activateTab("calendar"); }   // 달력은 별도 탭으로
  else { activateTab("stats"); showStatsSeg(j); }
});
// 인사이트 → 바로 행동(호흡·미션·위로)으로 이동 (연결성)
const _insightActions = document.getElementById("insightActions");
if (_insightActions) _insightActions.addEventListener("click", (e) => {
  const b = e.target.closest("[data-go]"); if (!b) return;
  Sound.tap();
  const go = b.dataset.go;
  if (go === "breath") { openBreath(); return; }
  activateTab("rest");
  const seg = document.querySelector('#restSeg button[data-rseg="comfort"]'); if (seg) seg.click();
  if (go === "mission") document.getElementById("missionBtn").click();
  if (go === "comfort") document.getElementById("quoteBtn").click();
});

/* 쉼 탭 서브탭 (위로 / 명상) */
document.getElementById("restSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  Sound.tap();
  document.querySelectorAll("#restSeg button").forEach((x) => x.classList.toggle("active", x === b));
  document.querySelectorAll(".rest-panel").forEach((p) => { p.hidden = p.dataset.rpanel !== b.dataset.rseg; });
  if (b.dataset.rseg === "meditate") autoAmbient(); // 명상 들어오면 선택한 배경음 자동 재생
});

/* 주간 리포트 (베타 피드백 #1) */
let weekData = null;
function renderWeekly(entries) {
  const keys = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(todayKey(d)); }
  const days = keys.map((k) => entries[k]).filter(Boolean);
  const moods = days.filter((e) => e.mood);
  const avgMood = moods.length ? moods.reduce((s, e) => s + entryScore(e), 0) / moods.length : null; // 0-100
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
  if (avgMood != null) parts.push(`평균 기분 ${Math.round(avgMood)}/100${topMood ? `, 가장 자주 ${mInfo(topMood[0]).emoji} ${topMood[0]}` : ""}.`);
  if (avgEnergy != null) parts.push(`평균 에너지 ${avgEnergy.toFixed(1)}/5.`);
  if (habTotal > 0) parts.push(plain ? `습관 달성 ${habDone}/${habTotal}.` : `습관도 ${habDone}/${habTotal} 칸 채웠어요.`);
  if (!plain) parts.push(days.length >= 5 ? "스스로를 참 잘 돌본 한 주예요 💛" : "조금씩이어도 충분해요. 다음 주도 곁에 있을게요.");
  weekData = { range, summary: parts.join(" "), daysLogged: days.length, avgMood, avgEnergy, habDone, habTotal, topMood: topMood ? topMood[0] : null, moodSeries: keys.map((k) => entries[k] ? entryScore(entries[k]) : null) };
}

function dataURLtoBlob(d) { const [h, b] = d.split(","); const m = h.match(/:(.*?);/)[1]; const bin = atob(b); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: m }); }
const _weekDetailBtn = document.getElementById("weekDetailBtn");
if (_weekDetailBtn) _weekDetailBtn.addEventListener("click", () => { Sound.tap(); openReport("week"); });

/* 월간 리포트 */
let monthData = null;
function renderMonthly(entries) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const keys = []; for (let dd = 1; dd <= days; dd++) keys.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
  const recs = keys.map((k) => entries[k]).filter(Boolean);
  const moods = recs.filter((e) => e.mood);
  const avgMood = moods.length ? moods.reduce((s, e) => s + entryScore(e), 0) / moods.length : null; // 0-100
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
  if (avgMood != null) parts.push(`평균 기분 ${Math.round(avgMood)}/100${topMood ? `, 가장 자주 ${mInfo(topMood[0]).emoji} ${topMood[0]}` : ""}.`);
  if (avgEnergy != null) parts.push(`평균 에너지 ${avgEnergy.toFixed(1)}/5.`);
  if (habTotal > 0) parts.push(plain ? `습관 달성 ${habDone}/${habTotal}.` : `습관도 ${habDone}/${habTotal}칸 채웠어요.`);
  if (reflections > 0) parts.push(`저녁 회고 ${reflections}번.`);
  if (!plain) parts.push("한 달을 차곡차곡 살아냈어요 💛");
  monthData = { label: `${y}년 ${m + 1}월`, summary: parts.join(" "), daysLogged: recs.length, avgMood, avgEnergy, habDone, habTotal, series: keys.map((k) => entries[k] ? entryScore(entries[k]) : null) };
}
// 전체 페이지 리포트 이미지 — 진단·처방·하이라이트까지 담은 세로 카드(높이 자동)
function drawReportCanvas(kind) {
  const entries = loadEntries();
  let keys = [], prevKeys = [];
  if (kind === "month") {
    const now = new Date(), yy = now.getFullYear(), mm = now.getMonth(), dz = new Date(yy, mm + 1, 0).getDate();
    for (let dd = 1; dd <= dz; dd++) keys.push(`${yy}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
    const pm = new Date(yy, mm - 1, 1), py = pm.getFullYear(), pmo = pm.getMonth(), pdz = new Date(py, pmo + 1, 0).getDate();
    for (let dd = 1; dd <= pdz; dd++) prevKeys.push(`${py}-${String(pmo + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
  } else {
    for (let i = 6; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); keys.push(todayKey(dt)); }
    for (let i = 13; i >= 7; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); prevKeys.push(todayKey(dt)); }
  }
  const cur = periodStats(keys, entries), prev = periodStats(prevKeys, entries);
  const period = (kind === "month" ? (monthData && monthData.label) : (weekData && weekData.range)) || "";
  const unit = kind === "month" ? "달" : "주";
  let trend = "flat";
  if (cur.scores.length >= 4) { const hh = Math.floor(cur.scores.length / 2); const a = cur.scores.slice(0, hh).reduce((s, v) => s + v, 0) / hh; const b = cur.scores.slice(hh).reduce((s, v) => s + v, 0) / (cur.scores.length - hh); trend = b - a >= 8 ? "up" : a - b >= 8 ? "down" : "flat"; }
  const diag = richDiagnose(cur, entries, keys);
  const sols = selectSolutions(diag, trend, keys[keys.length - 1]).map((s) => s.txt);
  const ha = computeHabitAnalysis(keys, prevKeys, entries);
  const habLines = ha ? ha.rows.slice(0, 3).map((r) => {
    const bits = [`🔥${r.streak}`];
    if (r.delta != null && Math.abs(r.delta) >= 1) bits.push(`${r.delta > 0 ? "▲" : "▼"}${Math.abs(r.delta)}`);
    if (r.momentum != null && r.momentum >= 10) bits.push("📈");
    else if (r.momentum != null && r.momentum <= -10) bits.push("📉");
    return { name: `${r.h.emoji || "✅"} ${r.h.title}`, rate: `${r.rate}%`, sub: bits.join(" ") };
  }) : [];
  const habInsight = ha ? (habitInsightLines(ha, unit)[0] || "").replace(/<[^>]+>/g, "") : "";
  const dMood = (cur.avgMood != null && prev.avgMood != null) ? Math.round(cur.avgMood - prev.avgMood) : null;
  const headline = (dMood != null && Math.abs(dMood) >= 3) ? (dMood > 0 ? `지난 ${unit}보다 기분이 ▲${dMood}점 좋아졌어요` : `지난 ${unit}보다 ▼${-dMood}점 가라앉았어요`) : "";
  const bestTxt = cur.best ? `🌟 가장 좋았던 날 ${cur.best.e.date.slice(5).replace("-", "/")} · ${Math.round(cur.best.sc)}점` : "";
  const worstTxt = (cur.worst && (!cur.best || cur.worst.e.date !== cur.best.e.date)) ? `🌧️ 가장 힘들었던 날 ${cur.worst.e.date.slice(5).replace("-", "/")} · ${Math.round(cur.worst.sc)}점` : "";
  const css = getComputedStyle(document.documentElement);
  const cardC = css.getPropertyValue("--card").trim() || "#fffefc", ink = css.getPropertyValue("--ink").trim() || "#322a25", ink2 = css.getPropertyValue("--ink-2").trim() || "#6a5c53", soft = css.getPropertyValue("--soft").trim() || "#877668", accentDeep = css.getPropertyValue("--accent-deep").trim() || "#cd5c41", line = css.getPropertyValue("--line").trim() || "#ece1d6";
  const S = 2, W = 380, padX = 22, contentW = W - padX * 2;
  const c = document.getElementById(kind === "month" ? "monthCanvas" : "weekCanvas");
  const ctx = c.getContext("2d");
  const wrap = (text, x, y, maxW, lh, render) => { let ln = ""; for (const ch of text) { if (ctx.measureText(ln + ch).width > maxW && ln) { if (render) ctx.fillText(ln, x, y); y += lh; ln = ch; } else ln += ch; } if (ln) { if (render) ctx.fillText(ln, x, y); y += lh; } return y; };
  const run = (render) => {
    let y = 36; ctx.textAlign = "left";
    ctx.font = "bold 21px sans-serif"; if (render) { ctx.fillStyle = accentDeep; ctx.fillText(`오늘의 쉼 · ${kind === "month" ? "월간" : "주간"} 리포트`, padX, y); }
    y += 20; ctx.font = "12px sans-serif"; if (render) { ctx.fillStyle = soft; ctx.fillText(period, padX, y); }
    y += 26; ctx.font = "11px sans-serif"; if (render) { ctx.fillStyle = soft; ctx.fillText("평균 기분", padX, y); }
    y += 36; ctx.font = "bold 42px sans-serif"; const numStr = `${Math.round(cur.avgMood || 0)}`; if (render) { ctx.fillStyle = scoreColor(cur.avgMood || 0); ctx.fillText(numStr, padX, y); }
    const numW = ctx.measureText(numStr).width; ctx.font = "13px sans-serif"; if (render) { ctx.fillStyle = soft; ctx.fillText("/100", padX + numW + 5, y); }
    if (dMood != null) { ctx.font = "bold 12px sans-serif"; if (render) { ctx.fillStyle = dMood > 0 ? accentDeep : soft; ctx.fillText(`${dMood > 0 ? "▲" : dMood < 0 ? "▼" : "–"}${Math.abs(dMood)} 지난 ${unit}`, padX + numW + 44, y); } }
    y += 22; const stats = [`기록 ${cur.days}일`]; if (cur.avgEnergy != null) stats.push(`활력 ${cur.avgEnergy.toFixed(1)}/5`); if (cur.habPct != null) stats.push(`습관 ${cur.habPct}%`);
    ctx.font = "13px sans-serif"; if (render) { ctx.fillStyle = ink2; ctx.fillText(stats.join("    ·    "), padX, y); }
    y += 22; if (render) { ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(W - padX, y); ctx.stroke(); } y += 24;
    if (headline) { ctx.font = "bold 13px sans-serif"; if (render) ctx.fillStyle = accentDeep; y = wrap("💡 " + headline, padX, y, contentW, 19, render); y += 14; }
    if (diag) { ctx.font = "bold 15px sans-serif"; if (render) ctx.fillStyle = ink; y = wrap(`🩺 ${diag.label}`, padX, y, contentW, 21, render); y += 5; ctx.font = "13px sans-serif"; if (render) ctx.fillStyle = ink2; y = wrap(diag.dx, padX, y, contentW, 20, render); y += 18; }
    ctx.font = "bold 15px sans-serif"; if (render) { ctx.fillStyle = ink; ctx.fillText("💊 맞춤 처방", padX, y); } y += 24;
    sols.forEach((s) => { ctx.font = "13px sans-serif"; if (render) ctx.fillStyle = ink2; y = wrap("•  " + s, padX, y, contentW, 20, render); y += 10; });
    if (bestTxt || worstTxt) { y += 6; if (render) { ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(W - padX, y); ctx.stroke(); } y += 22; ctx.font = "13px sans-serif"; if (render) ctx.fillStyle = ink2; if (bestTxt) { if (render) ctx.fillText(bestTxt, padX, y); y += 21; } if (worstTxt) { if (render) ctx.fillText(worstTxt, padX, y); y += 21; } }
    if (habLines.length) {
      y += 6; if (render) { ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(W - padX, y); ctx.stroke(); } y += 22;
      ctx.font = "bold 15px sans-serif"; const avgTxt = ha.avgDelta != null && Math.abs(ha.avgDelta) >= 1 ? `  (${ha.avgDelta > 0 ? "▲" : "▼"}${Math.abs(ha.avgDelta)})` : "";
      if (render) { ctx.fillStyle = ink; ctx.fillText(`🎯 습관 분석 · 평균 ${ha.avgRate}%${avgTxt}`, padX, y); } y += 23;
      habLines.forEach((hl) => {
        ctx.font = "13px sans-serif"; if (render) { ctx.fillStyle = ink2; ctx.fillText(hl.name, padX, y); ctx.textAlign = "right"; ctx.fillStyle = soft; ctx.fillText(`${hl.rate}  ${hl.sub}`, W - padX, y); ctx.textAlign = "left"; } y += 20;
      });
      if (habInsight) { y += 2; ctx.font = "12px sans-serif"; if (render) ctx.fillStyle = soft; y = wrap("💡 " + habInsight, padX, y, contentW, 18, render); }
      y += 8;
    }
    y += 10; ctx.font = "11px sans-serif"; if (render) { ctx.fillStyle = soft; ctx.fillText("오늘의 쉼 · 나를 돌본 기록 🌿", padX, y); } y += 24;
    return y;
  };
  const totalH = Math.ceil(run(false));
  c.width = W * S; c.height = totalH * S;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(S, S);
  ctx.fillStyle = cardC; ctx.fillRect(0, 0, W, totalH);
  run(true);
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
// 평균 기분 게이지 링 (0-100) — 리포트 히어로 비주얼
function moodGaugeSvg(v) {
  const R = 52, C = 2 * Math.PI * R, off = C * (1 - Math.max(0, Math.min(100, v)) / 100), col = scoreColor(v);
  return `<div class="gauge"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="g-track" cx="60" cy="60" r="${R}"/><circle class="g-fill" cx="60" cy="60" r="${R}" stroke="${col}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 60 60)"/></svg><div class="g-center"><span class="g-emoji">${scoreEmoji(v)}</span><span class="g-num" style="color:${col}">${Math.round(v)}</span><span class="g-unit">/100</span></div></div>`;
}
// 인라인 SVG 추이 차트 (기분 실선 + 에너지 점선) — 테마 색상은 CSS 클래스로
function reportChartSvg(keys, entries) {
  const n = keys.length;
  const mood = keys.map((k) => entries[k] ? entryScore(entries[k]) : null);       // 0-100 (기분 한 축만 — 활력선은 노이즈라 제거)
  if (!mood.some((v) => v != null)) return "";
  const W = 340, H = 178, padL = 22, padR = 16, padT = 20, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xAt = (i) => padL + (n <= 1 ? plotW / 2 : plotW * i / (n - 1));
  const yAt = (v) => padT + plotH - plotH * v / 100;
  // 연속 구간을 점 배열로 — 결측은 끊는다
  const segsOf = (arr) => { const segs = []; let cur = []; arr.forEach((v, i) => { if (v == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push({ x: xAt(i), y: yAt(v), v, i }); }); if (cur.length) segs.push(cur); return segs; };
  // 카멀롬-롬 부드러운 곡선
  const curve = (p) => {
    if (p.length === 1) return `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)} l0.01 0`;
    let d = `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };
  const moodSegs = segsOf(mood);
  const moodLine = moodSegs.map(curve).join(" ");
  const baseY = (padT + plotH).toFixed(1);
  const area = moodSegs.filter((p) => p.length > 1).map((p) => `${curve(p)} L${p[p.length - 1].x.toFixed(1)} ${baseY} L${p[0].x.toFixed(1)} ${baseY} Z`).join(" ");
  // 옅은 점선 가로 그리드 + 작은 눈금
  let grid = "", ylab = "";
  [0, 50, 100].forEach((v) => { const y = yAt(v).toFixed(1); grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="rc-grid"/>`; ylab += `<text x="${padL - 6}" y="${(+y + 3).toFixed(1)}" class="rc-ylabel">${v}</text>`; });
  // 핵심 포인트만 — 최고·최저·마지막
  const valid = mood.map((v, i) => v == null ? null : { v, i }).filter(Boolean);
  let pts = "";
  if (valid.length) {
    const peak = valid.reduce((a, b) => b.v > a.v ? b : a), valley = valid.reduce((a, b) => b.v < a.v ? b : a), last = valid[valid.length - 1];
    const seen = new Set();
    const addPt = (m, lab) => { if (!m || seen.has(m.i)) return; seen.add(m.i); const x = xAt(m.i).toFixed(1), y = yAt(m.v).toFixed(1); pts += (lab ? `<text x="${x}" y="${(+y - 9).toFixed(1)}" class="rc-ptlab">${Math.round(m.v)}</text>` : "") + `<circle cx="${x}" cy="${y}" r="3.6" class="rc-pt"/>`; };
    addPt(peak, true); addPt(valley, true); addPt(last, false);
  }
  // x 라벨 (드물게)
  let labels = ""; const step = n <= 7 ? 1 : Math.ceil(n / 5);
  keys.forEach((k, i) => { if (i % step !== 0 && i !== n - 1) return; const p = k.split("-"); labels += `<text x="${xAt(i).toFixed(1)}" y="${H - 10}" class="rc-xlabel">${n <= 7 ? dayOfWeekKo(k) : +p[2]}</text>`; });
  const defs = `<defs><linearGradient id="rcArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" class="rc-area-top"/><stop offset="100%" class="rc-area-bot"/></linearGradient><linearGradient id="rcStroke" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" class="rc-stroke-top"/><stop offset="100%" class="rc-stroke-bot"/></linearGradient></defs>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="rc-svg" role="img" aria-label="기분 흐름">${defs}${grid}${ylab}${area ? `<path d="${area}" fill="url(#rcArea)" stroke="none"/>` : ""}<path d="${moodLine}" class="rc-glow" fill="none"/><path d="${moodLine}" class="rc-mood" stroke="url(#rcStroke)" fill="none"/>${pts}${labels}</svg>`;
}
// 리포트 솔루션 — 데이터에 맞춘 과학 논문 기반 추천 (근거 DB: docs/SCIENCE.md)
const REPORT_PAPERS = {
  ba: "행동활성화 (Mazzucchelli, Kane & Rees, 2010, Clinical Psychology Review)",
  breath: "느린 호흡과 자율신경 (Zaccaro et al., 2018, Frontiers in Human Neuroscience)",
  ii: "실행의도 (Gollwitzer, 1999, American Psychologist) · 습관 형성 (Lally et al., 2010, EJSP)",
  gratitude: "감사 일기 (Emmons & McCullough, 2003, JPSP)",
  selfcomp: "자기자비 (Neff, 2003, Self and Identity)",
  savoring: "음미하기 (Bryant, 2003, Journal of Mental Health)",
  labeling: "정서 명명 (Lieberman et al., 2007, Psychological Science)",
  sleep: "수면과 정서 (Baglioni et al., 2016, Sleep Medicine Reviews)",
  help: "사회적 지지·도움 요청 (Cohen & Wills, 1985, Psychological Bulletin)",
  strength: "강점 활용 (Seligman et al., 2005, American Psychologist)",
  grounding: "마음챙김·그라운딩 불안 감소 (Hofmann et al., 2010, J. Consulting and Clinical Psychology)",
  connect: "사회적 연결·행동활성화 (Cohen & Wills, 1985; Mazzucchelli et al., 2010)",
  boundary: "직무요구–자원 모형 (Bakker & Demerouti, 2007, J. Managerial Psychology)",
  plan: "문제해결치료 (Nezu, 2004, J. Clinical Psychology)",
  move: "운동과 우울 감소 (Schuch et al., 2016, J. Psychiatric Research)",
  nature: "자연 노출과 정서·반추 감소 (Bratman et al., 2015, PNAS)",
  express: "표현적 글쓰기 (Pennebaker & Beall, 1986, J. Abnormal Psychology)",
};
// 진단 구간 — 평균 기분(0-100)을 5단계로 구분. 각 구간의 진단(dx)·기본 처방(rx 키 목록)
const DIAG_BANDS = [
  { max: 20,  key: "crisis", label: "많이 힘든 시기", tone: "low",  dx: "마음이 오래 가라앉아 있어요. 혼자 견디지 않아도 괜찮아요.",       rx: ["help", "ba", "selfcomp"] },
  { max: 40,  key: "low",    label: "지쳐 있는 시기", tone: "low",  dx: "에너지가 바닥에 가까워요. 회복을 가장 앞에 두어도 돼요.",         rx: ["ba", "breath", "sleep"] },
  { max: 60,  key: "mid",    label: "그럭저럭 유지",  tone: "mid",  dx: "큰 기복 없이 잘 버티고 있어요. 작은 루틴이 흐름을 지켜줘요.",     rx: ["ii", "gratitude"] },
  { max: 80,  key: "good",   label: "안정적인 시기",  tone: "good", dx: "마음이 비교적 안정적이에요. 지금의 좋은 흐름을 이어가요.",       rx: ["savoring", "ii"] },
  { max: 101, key: "great",  label: "활기찬 시기",    tone: "good", dx: "활력이 도는 좋은 시기예요. 이 기운을 나누고 음미해봐요.",         rx: ["savoring", "strength"] },
];
// 처방 카탈로그 — 각 처방을 '문장형'으로, 6가지 변형을 두어 매번 다르게 출력(반복 방지)
const RX = {
  help: { c: REPORT_PAPERS.help, s: [
    "혼자 견디지 않아도 돼요 — 마음이 2주 넘게 무겁다면, 가까운 사람이나 전문가에게 한 번 이야기 꺼내보는 것부터 시작해요.",
    "지금의 힘듦을 누군가에게 말하는 건 약함이 아니라 용기예요. 신뢰하는 한 사람에게 ‘요즘 좀 힘들다’ 한마디만 건네봐요.",
    "혼자 감당하기 버거운 날엔 정신건강의학과나 상담센터의 문을 두드려도 괜찮아요 — 도움을 받는 것도 나를 돌보는 방법이에요.",
    "‘이 정도는 참아야지’ 하며 미루지 마세요 — 마음이 보내는 신호를 나누는 것도 회복의 한 걸음이에요.",
    "당장 전문가가 부담된다면, 믿을 만한 친구에게 ‘그냥 들어줘’ 하고 털어놓는 것부터 해봐도 좋아요.",
    "힘들다고 말한다고 약해지는 게 아니에요. 오히려 입 밖에 꺼내는 순간 무게의 절반이 덜어져요.",
  ] },
  ba: { c: REPORT_PAPERS.ba, s: [
    "기분이 나아지길 기다리기보다 5분짜리 작은 행동(샤워·짧은 산책) 하나를 먼저 해보면, 마음이 그 뒤를 따라와요.",
    "오늘 ‘딱 하나’만 정해 몸을 움직여 보세요 — 설거지 한 칸, 창문 열기처럼 사소해도 충분해요.",
    "무기력할수록 생각보다 행동이 먼저예요. 가장 쉬운 일 하나를 골라 ‘시작’ 버튼만 눌러봐요.",
    "침대에서 일어나기 힘든 날엔 ‘이불 개기’ 하나만 목표로 삼아보세요 — 작은 성취가 다음 행동을 끌어와요.",
    "하고 싶은 마음이 안 생겨도 괜찮아요. 동기는 행동 다음에 따라오는 경우가 더 많거든요.",
    "10분 타이머를 맞추고 딱 그 시간만 움직여 보세요. 끝나도 멈춰도 되니 부담이 줄어요.",
  ] },
  breath: { c: REPORT_PAPERS.breath, s: [
    "잠들기 전 4초 들이쉬고 7초 멈췄다 8초 내쉬기를 5분만 반복하면, 곤두선 신경이 한결 풀려요.",
    "숨이 얕아진다 싶으면 배가 부풀도록 천천히 들이쉬고 더 길게 내쉬어 보세요 — 긴장이 서서히 내려가요.",
    "딱 1분만 ‘내쉬는 숨’에 집중해 보세요. 길게 내쉬는 것만으로도 심박과 마음이 함께 느려져요.",
    "긴장될 때 어깨를 귀까지 올렸다가 ‘후—’ 하고 떨구며 숨을 내쉬어 보세요. 몸이 풀리면 마음도 따라 풀려요.",
    "한 손은 가슴, 한 손은 배에 얹고 배가 더 많이 움직이도록 숨 쉬어 보세요 — 복식호흡이 안정 신호를 보내요.",
    "신호등·엘리베이터를 기다리는 자투리 시간에 길게 세 번만 내쉬어도, 하루의 긴장이 조금씩 빠져나가요.",
  ] },
  sleep: { c: REPORT_PAPERS.sleep, s: [
    "취침·기상 시각을 일정하게 맞추고 자기 전 화면을 줄이면, 다음 날 기분의 바닥이 한 칸 올라가요.",
    "잠이 안 와도 같은 시각에 눕고 같은 시각에 일어나 보세요 — 리듬이 잡히면 회복이 따라와요.",
    "자기 한 시간 전부터 조명을 낮추고 화면을 멀리하면, 몸이 ‘이제 쉴 시간’이라고 알아차려요.",
    "낮에 햇빛을 10분만 쬐어도 밤 수면의 질이 올라가요 — 점심 후 짧은 산책을 권해요.",
    "잠들기 어려우면 침대에선 ‘자는 것’만 하고, 안 오면 잠시 일어났다 졸릴 때 다시 누워보세요.",
    "카페인은 오후 2시 이후로 줄여보세요. 저녁의 작은 선택이 밤의 깊이를 바꿔요.",
  ] },
  ii: { c: REPORT_PAPERS.ii, s: [
    "새 습관은 ‘[이미 하는 행동] 다음에 [새 행동]’으로 시점을 못 박아두면 실천율이 크게 올라가요 — 예: 양치 후 스트레칭 1분.",
    "할까 말까 고민이 줄도록, 습관을 기존 일과에 ‘붙여’ 보세요. 커피 내린 뒤 물 한 컵처럼요.",
    "‘언제·어디서 할지’를 미리 정해두면 의지력에 덜 기대게 돼요. 오늘 한 습관의 신호 행동을 정해봐요.",
    "‘작게 시작’이 핵심이에요. 스쿼트 1개, 책 한 줄처럼 우습도록 작게 정하면 빠지는 날이 줄어요.",
    "습관을 눈에 보이게 두세요 — 운동화를 현관에, 영양제를 식탁에 놓는 것만으로 실천이 쉬워져요.",
    "해낸 날엔 작게 표시해 보세요. 이어지는 ‘체인’을 보는 것만으로도 계속하고 싶어져요.",
  ] },
  gratitude: { c: REPORT_PAPERS.gratitude, s: [
    "잠들기 전 오늘 고마웠던 일을 구체적으로 한 줄만 적어보세요 — 2주만 이어가도 마음의 기본값이 달라져요.",
    "‘무엇이’ 좋았는지보다 ‘왜’ 좋았는지까지 한 줄 적으면, 그 감정이 더 오래 남아요.",
    "아주 사소한 것 하나(따뜻한 커피, 맑은 하늘)라도 적어두면, 뇌가 좋은 것에 더 잘 머물게 돼요.",
    "오늘 나를 스쳐 간 친절 하나(양보, 인사)를 떠올려 적어보세요 — 세상이 조금 덜 차갑게 느껴져요.",
    "‘당연한 것’ 중 하나를 골라 감사로 바꿔보세요. 따뜻한 물, 무사한 하루처럼요.",
    "힘든 날일수록 ‘그래도 ___는 다행이야’ 한 줄을 찾아보면, 시야가 한 뼘 넓어져요.",
  ] },
  selfcomp: { c: REPORT_PAPERS.selfcomp, s: [
    "힘든 자신을 다그치기보다, 같은 일을 겪는 친구에게 하듯 다정하게 말해주세요 — 자기자비는 회복탄력성을 키워요.",
    "‘이만하면 충분해’ 한마디를 스스로에게 건네봐요. 완벽하지 않아도 오늘의 나를 인정하는 게 회복의 시작이에요.",
    "실수한 날일수록 ‘그럴 수 있어’라고 마음에 손을 얹어주세요 — 비난보다 따뜻함이 다음을 더 잘 살게 해요.",
    "‘나만 이래’라는 생각이 들면, 같은 어려움을 겪는 수많은 사람을 떠올려 보세요 — 당신은 혼자가 아니에요.",
    "가슴에 손을 얹고 ‘많이 애썼다’ 한마디를 건네보세요. 자기 위로는 연습할수록 자연스러워져요.",
    "오늘의 부족함을 점수 매기지 말고, ‘그럴 만한 하루였다’고 받아들여 주세요.",
  ] },
  savoring: { c: REPORT_PAPERS.savoring, s: [
    "좋았던 순간을 떠올려 그때의 장면·소리·감정까지 적어두면, 그 기쁨이 훨씬 더 오래 머물러요.",
    "기분 좋은 일이 생기면 잠깐 멈춰 ‘아, 좋다’ 하고 5초만 더 음미해 보세요 — 긍정 정서가 깊어져요.",
    "오늘의 작은 행복 하나를 사진이나 한 줄로 남겨두면, 나중에 다시 꺼내 누릴 수 있어요.",
    "좋은 순간엔 휴대폰을 잠시 내려놓고 그 장면을 눈에 담아보세요 — 온전히 느낄 때 더 깊이 남아요.",
    "행복했던 일을 가까운 사람에게 이야기해 보세요. 나눌수록 기쁨이 한 번 더 커져요.",
    "오늘 가장 좋았던 1분을 떠올려 ‘다시 보기’ 하듯 천천히 음미해 봐요.",
  ] },
  strength: { c: REPORT_PAPERS.strength, s: [
    "내가 잘하는 것·좋아하는 것 하나를 오늘 일부러 써먹어 보세요 — 강점을 쓰는 날은 활력과 몰입이 올라가요.",
    "‘나다운’ 일 한 가지를 오늘 일정에 넣어보세요. 잘하는 걸 할 때 에너지가 채워져요.",
    "최근 뿌듯했던 순간을 떠올려, 그때 발휘한 강점을 오늘 한 번 더 꺼내 써봐요.",
    "누군가 ‘넌 참 ___해’라고 했던 칭찬을 떠올려, 그 강점을 오늘 한 번 써봐요.",
    "잘하는 일로 작은 도움을 베풀어 보세요 — 강점을 나눌 때 보람과 활력이 함께 와요.",
    "에너지가 도는 지금, 미뤄둔 ‘하고 싶던 일’ 하나에 손을 대보면 흐름이 더 좋아져요.",
  ] },
  grounding: { c: REPORT_PAPERS.grounding, s: [
    "긴장이 올라올 땐 눈에 보이는 것 5개, 들리는 소리 4개를 천천히 세며 지금-여기로 돌아와 보세요 — 과각성이 빠르게 가라앉아요.",
    "불안이 커질 때 발바닥이 바닥에 닿는 감각에 가만히 주의를 두면, 생각의 소용돌이에서 한 발 빠져나올 수 있어요.",
    "손에 잡히는 물건 하나의 촉감·온도에 30초만 집중해 보세요 — 곤두선 마음이 의외로 빨리 누그러져요.",
    "차가운 물로 손목을 30초 적셔보세요 — 감각 자극이 과열된 마음을 빠르게 식혀줘요.",
    "발끝부터 정수리까지 몸을 천천히 훑으며 ‘지금 여기 있다’고 알아차려 보세요.",
    "주변에서 같은 색 물건 3개를 찾아보세요. 주의가 바깥으로 향하면 불안의 고리가 끊겨요.",
  ] },
  connect: { c: REPORT_PAPERS.connect, s: [
    "오늘 괜찮은 한 사람에게 짧게 안부를 건네보세요 — 외로움엔 작은 연결 한 번이 큰 완충이 돼요.",
    "‘잘 지내?’ 한 줄 메시지면 충분해요. 마음이 가라앉을수록 사람과의 가는 끈 하나가 큰 힘이 돼요.",
    "혼자 있는 시간이 길었다면, 잠깐 누군가와 같은 공간에 있어 보는 것만으로도 마음이 데워져요.",
    "꼭 깊은 대화가 아니어도 돼요. 좋아하는 사람의 사진을 보거나 옛 대화를 읽는 것만으로도 위안이 돼요.",
    "반려동물·식물처럼 말 없는 존재와의 교감도 외로움을 덜어줘요 — 잠깐 곁에 머물러 보세요.",
    "온라인이라도 비슷한 마음을 나누는 곳에 한 줄 남겨보세요. 연결은 형태보다 ‘닿음’이 중요해요.",
  ] },
  rest: { c: REPORT_PAPERS.sleep, s: [
    "소진된 날엔 쉬는 게 곧 회복이에요 — 죄책감 없이 딱 10분, 의도적으로 아무것도 하지 않아 보세요.",
    "‘더 해야 한다’는 마음이 들 때일수록 멈춤이 필요해요. 오늘 한 가지 일을 의식적으로 내일로 미뤄봐요.",
    "몸이 무거운 날은 게으름이 아니라 신호예요. 5분 눈 감고 숨만 쉬는 시간을 스스로에게 허락해요.",
    "할 일 목록에 ‘쉬기’를 한 줄 적어 넣어보세요 — 휴식도 엄연한 일정이에요.",
    "완벽히 끝내려는 마음을 잠시 내려놓고, ‘80%면 충분’이라고 스스로에게 허락해요.",
    "잠깐 누워 천장을 바라보는 시간도 회복이에요. 멍때림은 뇌의 정비 시간이거든요.",
  ] },
  boundary: { c: REPORT_PAPERS.boundary, s: [
    "끝나는 시각을 정하고 그 뒤엔 업무 알림을 꺼두는 작은 ‘경계’ 하나가, 소진으로 번지는 걸 막아줘요.",
    "일과 나 사이에 선을 하나 그어보세요 — 퇴근 후 ‘딱 한 가지’는 일 얘기를 하지 않기처럼요.",
    "모든 요청에 ‘네’ 하지 않아도 돼요. 오늘 하나는 정중히 미루거나 거절해보면 숨 쉴 틈이 생겨요.",
    "메시지에 즉답하지 않아도 괜찮아요. ‘나중에 답할게’ 한마디가 내 리듬을 지켜줘요.",
    "도와달라는 부탁이 버거우면 ‘지금은 어려워’라고 짧게 말해보세요 — 거절도 연습이에요.",
    "퇴근 후엔 업무 앱을 화면에서 치워두세요. 보이지 않으면 마음도 덜 끌려가요.",
  ] },
  plan: { c: REPORT_PAPERS.plan, s: [
    "막연한 걱정 하나를 골라 ‘내가 할 수 있는 다음 한 걸음’만 적어보면, 통제할 수 없던 불안이 다룰 수 있는 일이 돼요.",
    "머릿속 걱정을 종이에 다 꺼내 적고 ‘지금 할 수 있는 것/없는 것’으로 나눠보세요 — 부담이 절반으로 줄어요.",
    "큰 문제일수록 잘게 쪼개요. 오늘은 ‘첫 5분 분량’만 해보기로 정해봐요.",
    "걱정이 맴돌면 ‘걱정 시간’ 10분을 따로 정해 그때만 생각해 보세요 — 나머지 시간이 한결 가벼워져요.",
    "‘바꿀 수 있는 것’과 ‘바꿀 수 없는 것’을 나눠 적고, 바꿀 수 있는 것 하나에만 힘을 써봐요.",
    "할 일이 많을 땐 가장 작은 것부터 지워보세요. 하나를 끝낸 감각이 다음을 끌어와요.",
  ] },
  labeling: { c: REPORT_PAPERS.labeling, s: [
    "지금 느끼는 감정에 정확한 이름을 붙여보는 것만으로도, 그 감정의 강도가 누그러져요.",
    "‘나는 지금 ___해’라고 한 문장으로 적어보세요 — 감정에 이름이 생기면 다루기가 한결 쉬워져요.",
    "기록하는 것 자체가 힘이에요. 오늘의 마음을 한 줄 남긴 당신은 이미 잘 돌보고 있어요.",
    "‘좋다/나쁘다’ 말고 더 구체적인 단어(서운함·뿌듯함·막막함)로 적어보면, 마음이 또렷해져요.",
    "감정을 날씨처럼 표현해 보세요 — ‘오늘은 흐리고 가끔 비’ 같은 식으로요.",
    "지금 마음을 0~100 숫자로도 적어두면, 변화의 흐름이 눈에 보여요.",
  ] },
  move: { c: REPORT_PAPERS.move, s: [
    "기분이 가라앉을 땐 10분만 걸어봐요 — 가벼운 운동은 약하지 않은 항우울 효과가 있어요.",
    "격하지 않아도 돼요. 스트레칭이나 가벼운 산책만으로도 기분이 한 톤 밝아져요.",
    "몸을 움직이면 생각의 반추가 끊겨요. 지금 자리에서 일어나 기지개부터 켜봐요.",
    "햇빛 아래 짧은 걷기는 기분과 수면을 함께 챙겨줘요.",
    "운동은 ‘완수’가 아니라 ‘시작’이 핵심이에요. 신발만 신고 현관을 나서봐요.",
    "좋아하는 음악과 함께 5분 몸을 흔들어봐요 — 즐거운 움직임이 가장 오래가요.",
  ] },
  nature: { c: REPORT_PAPERS.nature, s: [
    "잠깐이라도 바깥 공기를 쐬어 보세요 — 자연 속 짧은 시간이 스트레스 호르몬을 낮춰줘요.",
    "창밖 나무나 하늘을 1분만 바라봐도 마음이 조금 트여요.",
    "가까운 공원·하천을 천천히 걸어봐요. 초록을 보는 것만으로 반추가 줄어든다는 연구가 있어요.",
    "화분 하나를 돌보는 것도 자연과의 연결이에요 — 작은 생명을 살피며 마음도 가라앉아요.",
    "점심시간엔 실내 대신 바깥에서 5분 햇볕을 쬐어봐요.",
    "주말엔 잠깐이라도 자연이 있는 곳으로 발걸음을 옮겨봐요. 기분의 환기가 돼요.",
  ] },
  express: { c: REPORT_PAPERS.express, s: [
    "마음이 복잡하면 20분간 ‘검열 없이’ 떠오르는 대로 적어보세요 — 표현적 글쓰기는 정서 정리에 도움돼요.",
    "힘든 일을 ‘사실 + 그때 감정 + 지금 생각’ 순서로 적으면 머리가 한결 정리돼요.",
    "누구에게도 안 보낼 편지를 써보세요. 못다 한 말을 적는 것만으로 마음이 가벼워져요.",
    "오늘 감정을 한 문단만 적어봐요 — 쓰는 동안 감정의 강도가 내려가요.",
    "걱정을 종이에 다 ‘쏟아내고’ 덮어두세요. 머릿속에서 종이로 옮기면 부담이 줄어요.",
    "적은 글을 며칠 뒤 다시 읽어보면, 그때의 나를 더 다정히 이해하게 돼요.",
  ] },
  ctx_work: { c: REPORT_PAPERS.boundary, s: [
    "업무가 끝나는 시각을 ‘선언’해 보세요 — ‘6시 이후엔 노트북을 닫는다’ 같은 규칙 하나가 소진을 늦춰줘요.",
    "할 일을 ‘오늘 꼭 / 하면 좋은 / 안 해도 되는’ 세 칸으로 나눠 보세요. 다 하려 하지 않아도 돼요.",
    "회의·업무 사이에 2분 ‘전환 의식’(물 한 잔·창밖 보기)을 끼워 넣으면 긴장이 덜 쌓여요.",
    "퇴근 후엔 업무 알림을 꺼두세요 — 보이지 않으면 마음도 덜 끌려가요.",
    "상사·동료의 평가는 ‘내 일부’일 뿐 ‘나 전부’가 아니에요. 일과 자기 가치를 분리해봐요.",
    "오늘 하나는 정중히 거절하거나 미뤄보세요. 모든 요청에 ‘네’ 하지 않아도 괜찮아요.",
  ] },
  ctx_study: { c: REPORT_PAPERS.plan, s: [
    "공부는 ‘시간’이 아니라 ‘작은 분량’으로 정해요 — ‘25분 한 챕터’처럼요.",
    "시험 불안은 자연스러워요. ‘완벽’ 대신 ‘오늘 한 단원’이라는 통제 가능한 목표로 바꿔봐요.",
    "잘 안 풀리는 과목은 가장 쉬운 문제부터 손대 보세요. 작은 성공이 다음을 끌어와요.",
    "결과를 떠올리며 불안할 땐, ‘지금 할 수 있는 다음 한 걸음’만 종이에 적어봐요.",
    "공부 사이 짧은 산책·스트레칭이 집중력을 되살려요 — 쉼도 공부의 일부예요.",
    "남과 비교하지 말고 어제의 나와 비교해요. 한 줄이라도 나아갔다면 충분해요.",
  ] },
  ctx_rel: { c: REPORT_PAPERS.connect, s: [
    "서운함이 쌓였다면, 비난 대신 ‘나는 ___할 때 속상했어’라고 ‘나-전달법’으로 표현해봐요.",
    "모든 관계를 다 붙들지 않아도 돼요. 나를 편하게 하는 사람에게 에너지를 더 써요.",
    "갈등이 머릿속을 맴돌면, 하고 싶은 말을 먼저 적어 정리한 뒤 전해봐요.",
    "기대가 클수록 실망도 커요 — 상대도 나처럼 불완전하다는 걸 떠올려봐요.",
    "오늘 고마운 사람 한 명에게 짧게 마음을 표현해보세요. 좋은 관계는 작은 표현으로 자라요.",
    "혼자 삭이기 버거우면, 믿을 만한 제3자에게 털어놓는 것만으로도 정리가 돼요.",
  ] },
  ctx_money: { c: REPORT_PAPERS.plan, s: [
    "막연한 돈 걱정은 숫자로 적어보면 줄어요 — 이번 달 ‘꼭 나갈 돈’만 먼저 적어봐요.",
    "지금 ‘바꿀 수 있는 것’ 하나(작은 지출 줄이기 등)에만 집중하고, 나머지는 잠시 내려놔요.",
    "돈 문제는 흔히 ‘혼자만의 잘못’처럼 느껴지지만 그렇지 않아요. 필요하면 도움받을 곳을 찾아봐요.",
    "‘걱정 시간’ 10분을 정해 그때만 가계 생각을 하고, 나머지 시간은 비워둬요.",
    "오늘 할 수 있는 가장 작은 한 걸음(영수증 정리·자동이체 점검)부터 시작해봐요.",
    "돈이 곧 내 가치가 아니에요 — 지금의 어려움이 나를 규정하지 않게 해요.",
  ] },
  ctx_future: { c: REPORT_PAPERS.plan, s: [
    "막막함은 ‘너무 멀리’ 보기 때문일 때가 많아요. 이번 주에 할 수 있는 한 가지만 정해봐요.",
    "‘정답’을 한 번에 찾으려 말고, 작은 실험(정보 찾기·한 사람에게 묻기)부터 해봐요.",
    "불확실함은 누구에게나 불편해요. 통제할 수 있는 것 하나에 힘을 모아봐요.",
    "비교는 SNS 속 ‘편집된 삶’과의 싸움이에요 — 나만의 속도를 인정해줘요.",
    "진로 고민은 머리로만 풀기 어려워요. 종이에 쭉 적어 ‘생각의 무게’를 덜어내봐요.",
    "지금의 불안은 ‘잘 살고 싶은 마음’의 다른 얼굴이에요. 그 마음을 다정히 봐줘요.",
  ] },
  ctx_parenting: { c: REPORT_PAPERS.help, s: [
    "‘좋은 부모’ 기준을 낮춰도 돼요 — 완벽함보다 ‘충분히 괜찮은 돌봄’이면 충분해요.",
    "돌봄은 끝이 없어요. 잠깐이라도 ‘나만의 10분’을 확보해 숨을 돌려봐요.",
    "도움을 청하는 건 무능이 아니에요. 한 사람에게라도 짐을 나눠봐요.",
    "아이의 감정과 내 감정을 분리해봐요 — 내가 다 책임지지 않아도 괜찮아요.",
    "지친 날엔 집안일 하나를 의식적으로 내려놓아요. 오늘은 ‘이만하면 됐다’로 충분해요.",
    "나를 돌봐야 아이도 돌볼 수 있어요. 자기 돌봄은 이기적인 게 아니에요.",
  ] },
  ctx_health: { c: REPORT_PAPERS.sleep, s: [
    "몸이 보내는 신호를 무시하지 말아요 — 증상이 이어지면 병원에서 확인하는 게 가장 빠른 안심이에요.",
    "아픈 날은 회복이 최우선이에요. 해야 할 일 하나를 미루고 몸을 먼저 챙겨요.",
    "작은 움직임(가벼운 스트레칭·산책)이 컨디션과 기분을 함께 끌어올려요.",
    "물·끼니·잠 같은 기본을 먼저 채워봐요 — 기분의 토대는 의외로 몸에 있어요.",
    "통증·피로가 마음까지 가라앉힐 수 있어요. 몸이 힘든 거지 내가 약한 게 아니에요.",
    "오늘 몸에 다정한 것 한 가지(따뜻한 차·반신욕)를 해줘봐요.",
  ] },
};
// ── 처방 DB 확장: 기존 처방에 변형 추가(반복 방지·다양성) ──
const RX_MORE = {
  help: [
    "‘이 정도는 견뎌야지’ 하며 미루지 말아요 — 마음이 보내는 신호를 나누는 것도 회복이에요.",
    "당장 전문가가 부담되면, 109(자살예방·24시간)·129(보건복지)처럼 익명 상담부터 시작해도 돼요.",
    "가까운 사람에게 ‘해결은 안 해줘도 돼, 그냥 들어줘’라고 부탁해봐요.",
    "힘듦을 입 밖에 꺼내는 순간 무게의 절반이 덜어져요. 오늘 한 사람에게 말해봐요.",
    "도움받는 건 의존이 아니라 회복의 기술이에요. 잘 받는 사람이 오래 버텨요.",
    "지금 너무 캄캄하다면, 혼자 결정하지 말고 내일 아침 누군가와 이야기하기로 미뤄둬요.",
    "상담은 ‘큰 문제’가 있어야 가는 곳이 아니에요. 지칠 때 정비하러 가는 곳이에요.",
    "‘말해도 달라질 게 없다’는 생각이 들 때가, 사실 도움이 가장 필요한 때예요.",
  ],
  ba: [
    "할 일을 ‘5분 버전’으로 줄여봐요 — 운동 대신 스트레칭 1분, 청소 대신 책상 한 칸.",
    "잘하려 말고 ‘하기만’ 해봐요. 완성도는 나중 문제예요.",
    "아침에 침대에서 할 첫 행동 하나를 미리 정해두면 시작이 쉬워져요.",
    "기분이 따라오길 기다리지 말고, 몸을 먼저 한 칸 움직여봐요.",
    "‘하기 싫다’와 ‘안 한다’ 사이에서, 아주 작게 한 발만 떼어봐요.",
    "성취감을 위해 일부러 ‘이미 한 일’도 목록에 적고 지워봐요.",
    "오늘의 미션을 ‘딱 하나’로 줄이면, 그 하나를 해낼 확률이 올라가요.",
    "좋아하는 일과 해야 할 일을 짝지어 보세요 — 음악 들으며 설거지처럼요.",
  ],
  breath: [
    "들숨 4초·날숨 6초로 2분만 — 날숨을 길게 하면 심장이 먼저 진정돼요.",
    "코로 들이쉬고 입으로 ‘후’ 하고 촛불 끄듯 내쉬어봐요.",
    "긴장되면 숨을 ‘참지 말고’ 더 천천히 흘려보내요.",
    "한숨도 괜찮아요 — 의식적으로 크게 두 번 내쉬면 몸이 풀려요.",
    "숫자를 세며 호흡하면 잡생각이 끼어들 틈이 줄어요.",
    "어깨를 올렸다 ‘툭’ 떨구며 내쉬는 걸 세 번 반복해봐요.",
    "자기 전 누워서 배에 손을 얹고 배가 오르내리게 숨 쉬어봐요.",
    "긴장된 순간엔 ‘지금 숨 한 번’만 떠올려도 충분해요.",
  ],
  sleep: [
    "기상 시각을 먼저 고정해봐요 — 일어나는 시각이 잠드는 시각을 잡아줘요.",
    "자기 전 ‘오늘 끝’ 의식(불 줄이기·스트레칭)을 만들어봐요.",
    "잠이 안 오면 시계를 보지 말아요. 시간 계산이 더 깨워요.",
    "낮잠은 20분 이내로 — 길어지면 밤잠을 빌려 쓰는 거예요.",
    "침대는 ‘잠자는 곳’으로만 — 누워서 폰 하는 습관을 조금씩 줄여봐요.",
    "자기 전 따뜻한 물로 손발을 데우면 잠이 더 잘 와요.",
    "잠 못 든 밤을 자책하지 말아요. 누워 쉬는 것만으로도 회복이 돼요.",
    "아침 햇빛 5분이 그날 밤 멜라토닌을 준비시켜요.",
  ],
  ii: [
    "‘월·수·금 저녁’처럼 요일·시간을 못 박으면 빠지는 날이 줄어요.",
    "습관 하나를 이미 굳은 습관 뒤에 붙여봐요 — 양치 뒤 물 한 컵.",
    "‘실패해도 다음 날 다시’ 규칙 하나면 작심삼일을 넘겨요.",
    "처음엔 우습도록 작게 — ‘책 한 줄’이면 충분해요.",
    "할 일을 눈에 보이게 두면(운동화 현관에) 실천이 쉬워져요.",
    "해낸 날을 달력에 표시해 ‘끊기지 않는 줄’을 만들어봐요.",
    "‘안 한 날’에 벌점 대신, ‘한 날’에 작은 보상을 줘봐요.",
    "환경을 바꾸면 의지가 덜 들어요 — 야식이 안 보이게 치우기처럼.",
  ],
  gratitude: [
    "잠들기 전, 오늘 ‘그래도 다행이었던 것’ 하나를 떠올려봐요.",
    "받은 친절 하나를 적어두면 세상이 조금 덜 차갑게 느껴져요.",
    "‘당연한 것’ 하나를 감사로 바꿔봐요 — 따뜻한 물, 무사한 하루.",
    "고마운 사람에게 그 마음을 직접 전하면 두 배로 따뜻해져요.",
    "사진 한 장으로 오늘의 좋은 순간을 남겨봐요.",
    "힘든 날일수록 ‘그럼에도’ 뒤에 한 가지를 찾아봐요.",
    "작은 것에 감사할수록 뇌가 좋은 것을 더 잘 찾아요.",
    "감사는 ‘많이’보다 ‘구체적으로’가 효과가 커요.",
  ],
  selfcomp: [
    "친구가 같은 일을 겪었다면 뭐라 말해줄지, 그 말을 나에게 해줘요.",
    "‘나만 이래’ 대신 ‘누구나 그래’를 떠올려봐요 — 당신은 혼자가 아니에요.",
    "가슴에 손을 얹고 ‘많이 애썼어’ 한마디를 건네봐요.",
    "실수한 날일수록 ‘그럴 수 있어’라고 손을 얹어줘요.",
    "완벽 대신 ‘이만하면 충분’을 오늘의 기준으로 삼아봐요.",
    "스스로를 부르는 말투를 부드럽게 바꿔봐요 — 다그치는 코치 말고 다정한 친구로.",
    "지금의 부족함은 ‘과정’이지 ‘나라는 사람’이 아니에요.",
    "힘든 자신을 미워하는 대신, 그냥 ‘안아준다’고 상상해봐요.",
  ],
  savoring: [
    "좋은 순간엔 폰을 내려놓고 그 장면을 눈에 담아봐요.",
    "행복을 가까운 사람에게 이야기하면 한 번 더 커져요.",
    "오늘 가장 좋았던 1분을 ‘다시 보기’ 하듯 천천히 떠올려봐요.",
    "맛·향·소리 같은 감각으로 좋은 순간을 더 깊이 느껴봐요.",
    "기대도 음미예요 — 다가올 즐거운 일을 미리 그려봐요.",
    "좋았던 날의 사진을 모아 ‘행복 폴더’를 만들어봐요.",
    "‘이 순간이 지나간다’는 걸 알면 지금이 더 소중해져요.",
    "작은 성취도 ‘잘했다’ 소리 내어 칭찬해봐요.",
  ],
  strength: [
    "누군가 해준 칭찬을 떠올려, 그 강점을 오늘 한 번 써봐요.",
    "잘하는 일로 작은 도움을 베풀면 보람과 활력이 함께 와요.",
    "에너지가 도는 지금, 미뤄둔 ‘하고 싶던 일’에 손대봐요.",
    "‘나다운 순간’이 언제였는지 떠올려 그걸 오늘 만들어봐요.",
    "약점 고치기보다 강점 키우기가 더 즐겁고 효과적이에요.",
    "오늘의 컨디션을 의미 있는 일 하나에 투자해봐요.",
    "내 강점 3개를 적어두고, 막힐 때 꺼내 써봐요.",
    "좋아하는 일에 30분만 몰입해도 하루가 달라져요.",
  ],
  grounding: [
    "보이는 것 5·들리는 것 4·만져지는 것 3을 천천히 세어봐요.",
    "발바닥이 바닥에 닿는 감각에 가만히 머물러봐요.",
    "차가운 물로 손목을 적시면 과열된 마음이 식어요.",
    "같은 색 물건 3개를 찾으면 주의가 바깥으로 옮겨가요.",
    "손에 잡히는 물건의 촉감·온도에 30초 집중해봐요.",
    "‘지금 나는 여기 안전하게 있다’고 천천히 말해봐요.",
    "향(커피·핸드크림)을 깊게 한 번 맡아 현재로 돌아와봐요.",
    "발끝부터 정수리까지 몸을 훑으며 긴장한 곳을 풀어봐요.",
  ],
  connect: [
    "‘잘 지내?’ 한 줄이면 충분해요. 먼저 닿는 용기를 내봐요.",
    "좋아하는 사람의 사진·옛 대화를 보는 것만으로도 위안이 돼요.",
    "반려동물·식물과의 교감도 외로움을 덜어줘요.",
    "혼자 있는 시간이 길었다면 잠깐 사람들 속에 머물러봐요.",
    "비슷한 마음을 나누는 온라인 공간에 한 줄 남겨봐요.",
    "도움을 ‘주는’ 연결도 좋아요 — 누군가를 작게 도와봐요.",
    "약속이 부담되면 ‘15분만’으로 가볍게 잡아봐요.",
    "마음 통하는 한 사람만 있어도 충분해요. 그 한 명에게 기대봐요.",
  ],
  rest: [
    "할 일 목록에 ‘쉬기’를 한 줄 적어 넣어봐요 — 휴식도 일정이에요.",
    "‘80%면 충분’이라고 스스로에게 허락해봐요.",
    "5분 눈 감고 숨만 쉬는 시간을 가져봐요 — 멍때림은 뇌의 정비예요.",
    "오늘 한 가지 일을 의식적으로 내일로 미뤄봐요.",
    "쉬는 데 죄책감이 든다면, 그게 바로 쉬어야 한다는 신호예요.",
    "‘아무것도 안 하는 시간’을 일부러 비워둬봐요.",
    "몸이 무거운 날은 게으름이 아니라 회복 요청이에요.",
    "잠깐의 낮잠·눕기도 훌륭한 회복이에요.",
  ],
  boundary: [
    "끝나는 시각을 정하고 그 뒤엔 알림을 꺼둬봐요.",
    "메시지에 즉답하지 않아도 돼요 — ‘나중에 답할게’면 충분해요.",
    "버거운 부탁엔 ‘지금은 어려워’라고 짧게 말해봐요.",
    "‘딱 한 가지’는 나를 위해 지키는 규칙으로 정해봐요.",
    "거절은 관계를 끊는 게 아니라 나를 지키는 거예요.",
    "할 일과 안 할 일의 경계를 종이에 그어봐요.",
    "남의 감정까지 다 책임지지 않아도 괜찮아요.",
    "‘예스’ 전에 3초만 멈춰 정말 원하는지 물어봐요.",
  ],
  plan: [
    "막연한 걱정 하나를 ‘다음 한 걸음’으로 바꿔 적어봐요.",
    "‘바꿀 수 있는 것/없는 것’을 나눠 적고 앞엣것에만 힘써요.",
    "큰 일은 ‘첫 5분 분량’만 잘라 시작해봐요.",
    "‘걱정 시간’ 10분을 정해 그때만 생각해봐요.",
    "할 일이 많을 땐 가장 작은 것부터 지워봐요.",
    "최악·최선·현실, 세 시나리오를 적으면 불안이 작아져요.",
    "결정이 어려우면 ‘되돌릴 수 있는지’부터 따져봐요.",
    "머릿속 걱정을 전부 종이에 ‘쏟아내고’ 덮어둬봐요.",
  ],
  labeling: [
    "‘좋다/나쁘다’ 말고 구체적인 단어(서운함·막막함)로 적어봐요.",
    "감정을 날씨처럼 표현해봐요 — ‘흐리고 가끔 비’.",
    "지금 마음을 0~100 숫자로 적어 변화를 눈으로 봐요.",
    "‘나는 지금 ___해’ 한 문장이면 마음이 한결 또렷해져요.",
    "감정 뒤의 ‘바람’을 찾아봐요 — 화 뒤엔 존중받고 싶음이 있어요.",
    "여러 감정이 섞였다면 하나씩 이름표를 붙여봐요.",
    "몸의 어디가 그 감정을 느끼는지 적어봐요(가슴이 답답 등).",
    "이름 붙이는 순간, 감정에 휘둘리기보다 바라보게 돼요.",
  ],
  move: [
    "10분만 걸어봐요 — 가벼운 운동은 약하지 않은 항우울 효과가 있어요.",
    "스트레칭·산책만으로도 기분이 한 톤 밝아져요.",
    "지금 일어나 기지개부터 — 움직이면 생각의 반추가 끊겨요.",
    "햇빛 아래 걷기는 기분과 수면을 함께 챙겨줘요.",
    "신발만 신고 현관을 나서봐요 — 시작이 핵심이에요.",
    "좋아하는 음악과 5분 몸을 흔들어봐요.",
    "계단 한 층, 한 정거장 걷기처럼 일상에 움직임을 끼워봐요.",
    "운동을 ‘기분약’이라 생각하고 아주 작게 처방해봐요.",
  ],
  nature: [
    "잠깐 바깥 공기를 쐬어봐요 — 짧은 자연 시간이 스트레스를 낮춰요.",
    "창밖 하늘·나무를 1분만 바라봐도 마음이 트여요.",
    "가까운 공원을 천천히 걸으면 반추가 줄어요.",
    "화분 하나를 돌보는 것도 자연과의 연결이에요.",
    "점심엔 실내 대신 바깥에서 햇볕 5분.",
    "물소리·새소리 같은 자연 소리를 들어봐요.",
    "맨발로 잔디·흙을 잠깐 밟아봐요.",
    "주말엔 잠깐이라도 초록이 있는 곳으로 가봐요.",
  ],
  express: [
    "20분간 검열 없이 떠오르는 대로 적어봐요.",
    "‘사실+감정+지금 생각’ 순서로 적으면 머리가 정리돼요.",
    "안 보낼 편지를 써서 못다 한 말을 꺼내봐요.",
    "감정 한 문단만 적어도 강도가 내려가요.",
    "걱정을 종이에 ‘쏟아내고’ 덮어둬봐요.",
    "며칠 뒤 다시 읽으면 그때의 나를 더 이해하게 돼요.",
    "손글씨로 적으면 더 천천히, 더 깊이 정리돼요.",
    "‘오늘의 한 줄’만이라도 꾸준히 남겨봐요.",
  ],
  ctx_work: [
    "‘오늘 꼭/하면 좋은/안 해도 되는’ 세 칸으로 일을 나눠봐요.",
    "회의 사이 2분 전환 의식(물 한 잔)을 끼워봐요.",
    "평가는 ‘내 일부’일 뿐 ‘나 전부’가 아니에요.",
    "퇴근 후 업무 앱을 화면에서 치워둬봐요.",
    "‘완벽한 보고’보다 ‘제때 보고’가 나을 때가 많아요.",
    "쉬는 시간을 캘린더에 ‘회의’처럼 박아둬봐요.",
    "혼자 끙끙대지 말고 한 가지는 동료에게 물어봐요.",
    "끝낸 일에 ‘수고했다’ 한마디를 스스로에게 건네요.",
  ],
  ctx_study: [
    "‘25분 집중·5분 휴식’으로 잘라 공부해봐요.",
    "‘완벽’ 대신 ‘오늘 한 단원’으로 목표를 바꿔봐요.",
    "가장 쉬운 문제부터 손대 작은 성공을 쌓아봐요.",
    "결과 불안엔 ‘지금 할 한 걸음’만 적어봐요.",
    "공부 사이 짧은 산책이 집중력을 되살려요.",
    "남과 비교 말고 어제의 나와 비교해요.",
    "암기는 ‘몰아서’보다 ‘나눠서’가 오래가요.",
    "시험은 실력의 한 단면일 뿐, 당신 전부가 아니에요.",
  ],
  ctx_rel: [
    "비난 대신 ‘나는 ___할 때 속상했어’로 표현해봐요.",
    "나를 편하게 하는 사람에게 에너지를 더 써요.",
    "할 말을 먼저 적어 정리한 뒤 전해봐요.",
    "상대도 나처럼 불완전하다는 걸 떠올려봐요.",
    "고마운 사람에게 짧게 마음을 표현해봐요.",
    "혼자 삭이기 버거우면 제3자에게 털어놔봐요.",
    "거리 두기도 관계의 기술이에요 — 잠시 쉬어가도 돼요.",
    "‘이해’가 안 되면 ‘인정’만 해도 충분할 때가 있어요.",
  ],
  ctx_money: [
    "이번 달 ‘꼭 나갈 돈’만 먼저 적어봐요.",
    "‘바꿀 수 있는 것’ 하나(작은 지출)에만 집중해요.",
    "돈 문제는 혼자만의 잘못이 아니에요 — 도움받을 곳을 찾아봐요.",
    "‘걱정 시간’ 10분에만 가계 생각을 몰아둬봐요.",
    "영수증 정리·자동이체 점검 같은 작은 한 걸음부터.",
    "돈이 곧 내 가치는 아니에요.",
    "비교를 부르는 정보(쇼핑·SNS)를 잠시 멀리해봐요.",
    "작은 ‘안 쓴 돈’도 성취로 적어봐요.",
  ],
  ctx_future: [
    "‘너무 멀리’ 말고 이번 주에 할 한 가지만 정해봐요.",
    "정답을 한 번에 찾지 말고 작은 실험부터 해봐요.",
    "통제할 수 있는 것 하나에 힘을 모아봐요.",
    "SNS 속 ‘편집된 삶’과 비교하지 말아요.",
    "진로 고민은 종이에 쭉 적어 무게를 덜어내봐요.",
    "지금의 불안은 ‘잘 살고 싶은 마음’의 다른 얼굴이에요.",
    "‘5년 뒤’보다 ‘다음 한 달’을 그려봐요.",
    "믿을 만한 사람에게 진로 이야기를 꺼내봐요.",
  ],
  ctx_parenting: [
    "‘완벽한 부모’ 말고 ‘충분히 괜찮은 부모’면 돼요.",
    "잠깐이라도 ‘나만의 10분’을 확보해봐요.",
    "도움을 청하는 건 무능이 아니에요.",
    "아이 감정과 내 감정을 분리해봐요.",
    "지친 날엔 집안일 하나를 내려놓아요.",
    "나를 돌봐야 아이도 돌볼 수 있어요.",
    "비교 육아 정보를 잠시 꺼봐요 — 우리 속도가 있어요.",
    "오늘 ‘그래도 해낸 것’ 하나를 인정해줘요.",
  ],
  ctx_health: [
    "증상이 이어지면 병원에서 확인하는 게 가장 빠른 안심이에요.",
    "아픈 날은 회복이 최우선 — 할 일 하나를 미뤄요.",
    "가벼운 움직임이 컨디션과 기분을 함께 올려줘요.",
    "물·끼니·잠 같은 기본부터 채워봐요.",
    "몸이 힘든 거지 내가 약한 게 아니에요.",
    "오늘 몸에 다정한 것 하나(따뜻한 차)를 해줘요.",
    "통증 일기를 적어두면 진료 때 큰 도움이 돼요.",
    "회복엔 시간이 필요해요 — 나를 재촉하지 말아요.",
  ],
};
Object.keys(RX_MORE).forEach((k) => { if (RX[k]) RX[k].s = RX[k].s.concat(RX_MORE[k]); });
// ── 신규 처방 팩: 맥락 7종 + 감정 테마 전용 9종 ──
Object.assign(RX, {
  ctx_conflict: { c: REPORT_PAPERS.connect, s: [
    "다툼이 머릿속을 맴돌면, 하고 싶은 말을 먼저 적어 정리해봐요.",
    "감정이 가라앉기 전엔 결정을 미뤄요 — ‘내일 다시 이야기하자’도 좋은 말이에요.",
    "이기려 하기보다 ‘무엇을 원하는지’를 서로 확인해봐요.",
    "상대의 말 한 줄을 ‘그렇게 느꼈구나’ 하고 먼저 받아줘봐요.",
    "내 잘못 1할을 먼저 인정하면 대화의 문이 열려요.",
    "지금 화는 정당해도, 표현 방식은 고를 수 있어요.",
    "갈등 뒤엔 나를 다독여줘요 — 부딪히는 건 관심이 있다는 뜻이기도 해요.",
    "‘옳고 그름’보다 ‘관계’가 더 중요할 때가 있어요.",
    "잠깐 자리를 떠 숨을 고른 뒤 다시 마주해도 돼요.",
    "사과는 지는 게 아니라 관계를 지키는 거예요.",
  ] },
  ctx_love: { c: REPORT_PAPERS.connect, s: [
    "기대를 말하지 않으면 서운함이 돼요 — 원하는 걸 부드럽게 표현해봐요.",
    "상대의 마음을 추측으로 단정하지 말고 직접 물어봐요.",
    "연애가 내 전부가 되지 않게, 나만의 세계도 돌봐요.",
    "헤어짐의 아픔은 사랑한 만큼의 크기예요 — 자책하지 말아요.",
    "‘좋은 사람인가’보다 ‘함께일 때 내가 어떤 사람이 되는가’를 봐요.",
    "혼자여도 충분한 사람이 둘일 때도 건강해요.",
    "설렘이 식는 건 끝이 아니라 다른 단계로 가는 신호일 수 있어요.",
    "상대를 바꾸려 하기보다 내가 견딜 수 있는 선을 정해봐요.",
    "이별 뒤엔 연락처·사진을 잠시 멀리 두는 것도 회복이에요.",
    "사랑받을 자격을 증명하지 않아도, 당신은 그대로 충분해요.",
  ] },
  ctx_family: { c: REPORT_PAPERS.connect, s: [
    "가족이라도 안 맞을 수 있어요 — 다름을 인정하면 덜 부딪혀요.",
    "명절·모임이 버겁다면 머무는 시간을 미리 정해둬봐요.",
    "부모님의 말이 다 옳지는 않아요. 사랑과 간섭을 분리해봐요.",
    "‘착한 딸·아들’ 역할을 잠시 내려놔도 돼요.",
    "기대에 다 맞추려 하지 말고, 할 수 있는 만큼만 해요.",
    "가족 사이 거리 두기도 건강한 선택일 수 있어요.",
    "어릴 적 상처는 지금의 내 잘못이 아니에요.",
    "하고 싶은 말이 있으면 ‘나’를 주어로 차분히 전해봐요.",
    "도움이 필요하면 형제·친척과 짐을 나눠봐요.",
    "나를 지키는 선을 긋는 건 불효가 아니에요.",
  ] },
  ctx_appearance: { c: REPORT_PAPERS.selfcomp, s: [
    "거울 속 ‘결점 찾기’ 대신, 오늘 잘 기능해준 몸에 고마워해봐요.",
    "외모 비교는 보정된 이미지와의 싸움이에요 — 질 수밖에 없는 게임이죠.",
    "몸은 ‘전시물’이 아니라 나를 살게 하는 ‘집’이에요.",
    "다이어트 강박이 들면, ‘건강’과 ‘처벌’을 구분해봐요.",
    "오늘 입어서 편한 옷을 골라 나를 편하게 해줘요.",
    "‘이 정도면 괜찮아’를 거울 앞에서 한 번 말해봐요.",
    "SNS의 외모 콘텐츠를 잠시 줄여봐요 — 비교가 줄면 마음이 편해져요.",
    "내 가치는 몸무게 숫자로 정해지지 않아요.",
    "몸에 다정한 행동 하나(스트레칭·반신욕)를 해줘요.",
    "남의 시선보다 내 편안함을 먼저 골라봐요.",
  ] },
  ctx_loss: { c: REPORT_PAPERS.selfcomp, s: [
    "상실의 슬픔엔 정해진 기한이 없어요 — 서두르지 말아요.",
    "그리움은 사랑이 남긴 흔적이에요. 억지로 지우지 않아도 돼요.",
    "괜찮은 척하지 않아도 돼요. 울고 싶을 땐 울어요.",
    "떠난 이에게 못다 한 말을 편지로 적어봐요.",
    "오늘 하루를 버틴 것만으로도 충분히 잘하고 있어요.",
    "좋았던 기억을 떠올리는 것도 애도의 한 방식이에요.",
    "혼자 견디기 버거우면 비슷한 상실을 겪은 모임을 찾아봐요.",
    "슬픔이 너무 깊고 길면, 전문가의 도움을 받아도 좋아요.",
    "회복은 ‘잊는 것’이 아니라 ‘안고 살아가는 것’이에요.",
    "오늘은 나에게 가장 다정한 사람이 되어줘요.",
  ] },
  ctx_change: { c: REPORT_PAPERS.plan, s: [
    "변화엔 적응 시간이 필요해요 — 며칠 어색한 건 당연해요.",
    "새 환경에선 ‘익숙한 것 하나’를 곁에 둬 안정감을 만들어봐요.",
    "한꺼번에 다 적응하려 말고 하루 하나씩 익혀봐요.",
    "불안은 ‘잘 해내고 싶은 마음’이에요. 자신을 다그치지 말아요.",
    "새 루틴을 작게 정해두면 변화가 덜 흔들려요.",
    "도움을 청할 사람·창구를 미리 하나 알아둬봐요.",
    "‘예전이 좋았다’는 마음도 자연스러워요 — 천천히 가요.",
    "통제할 수 있는 것(짐 정리·동선)부터 손대봐요.",
    "낯섦은 시간이 해결해줘요. 지금의 불편을 너무 평가하지 말아요.",
    "변화의 끝엔 ‘새로 익숙해진 나’가 기다리고 있어요.",
  ] },
  ctx_phone: { c: REPORT_PAPERS.boundary, s: [
    "자기 전 1시간은 화면을 멀리해 잠과 마음을 지켜봐요.",
    "SNS는 ‘남의 하이라이트’예요 — 내 일상과 비교하지 말아요.",
    "알림을 꺼두면 주의가 내 시간으로 돌아와요.",
    "무의식적 스크롤이 늘면, 앱을 화면 첫 페이지에서 치워봐요.",
    "‘5분만’이 길어지면 타이머를 맞춰 끊어봐요.",
    "비교가 심한 계정은 잠시 뮤트해봐요.",
    "폰 대신 손에 쥘 다른 것(책·차 한 잔)을 마련해봐요.",
    "하루 한 번 ‘무폰 시간’을 정해 마음을 비워봐요.",
    "잠들기 전 침대 밖에 폰을 두면 수면이 깊어져요.",
    "온라인 연결보다 오프라인 한 사람과의 시간을 늘려봐요.",
  ] },
  theme_anxiety: { c: REPORT_PAPERS.grounding, s: [
    "긴장이 잦은 요즘, 가장 먼저 ‘몸’을 진정시켜봐요 — 마음은 그 뒤에 따라와요.",
    "불안은 ‘위험을 대비하려는 마음’이에요. 미워하지 말고 ‘고마워, 이제 쉬어’ 해줘요.",
    "최악의 상상이 올라오면 ‘그래서 지금 할 일은?’로 질문을 바꿔봐요.",
    "걱정의 90%는 일어나지 않아요 — 통제할 수 있는 1할에 집중해봐요.",
    "긴장될 때 카페인을 줄이면 몸의 각성이 한결 내려가요.",
    "‘완벽’이라는 기준이 불안을 키워요. ‘충분히’로 바꿔봐요.",
    "불안 목록을 적어 ‘지금/나중/통제불가’로 나눠봐요.",
    "지금 이 순간은 대체로 안전해요 — 발밑의 안전을 느껴봐요.",
    "긴장이 잦은 시기엔 일정을 조금 비워 여백을 만들어요.",
    "‘잘 될까’ 대신 ‘해보고 조정하자’로 생각을 열어둬봐요.",
  ] },
  theme_anger: { c: REPORT_PAPERS.breath, s: [
    "화가 올라오면 ‘반응’ 전에 6초만 숨을 골라봐요 — 충동의 파도가 지나가요.",
    "화 뒤엔 대개 ‘존중받고 싶음’이 숨어 있어요. 진짜 바람을 찾아봐요.",
    "뜨거울 때 한 결정은 식은 뒤 후회되기 쉬워요 — 잠시 미뤄요.",
    "몸의 열을 식혀봐요 — 찬물 세수, 잠깐의 바깥 공기.",
    "분노를 글로 ‘쏟아낸’ 뒤, 보낼지 말지는 내일 정해요.",
    "상대의 행동과 내 가치를 분리해봐요 — 그건 ‘그의 문제’일 수 있어요.",
    "정당한 화라도 표현 방식은 고를 수 있어요.",
    "운동으로 그 에너지를 흘려보내봐요 — 화는 몸으로 풀려요.",
    "‘나는 지금 화가 난다’고 이름 붙이면 휘둘림이 줄어요.",
    "참기만 하지도, 터뜨리지도 말고 ‘차분히 말하기’를 연습해봐요.",
  ] },
  theme_sadness: { c: REPORT_PAPERS.ba, s: [
    "가라앉은 날엔 ‘기분 회복’을 기다리지 말고 아주 작은 행동을 먼저 해봐요.",
    "우울할 땐 시야가 좁아져요 — ‘지금 느낌’이 ‘사실 전부’는 아니에요.",
    "빛을 쬐어봐요 — 커튼을 열고 햇볕 아래 잠깐 머물러요.",
    "오늘은 ‘잘 살기’ 말고 ‘잘 버티기’를 목표로 해도 돼요.",
    "슬픔을 밀어내지 말고, 곁에 두고 차 한 잔 같이 마셔봐요.",
    "혼자 가라앉지 않게, 한 사람에게 가는 끈 하나를 연결해봐요.",
    "몸을 씻고 옷을 갈아입는 것만으로도 기분이 한 칸 올라가요.",
    "좋아하던 것(음악·산책)을 ‘재미없어도’ 한 번 해봐요.",
    "지금의 무거움은 영원하지 않아요 — 파도처럼 지나가요.",
    "오늘 살아낸 당신에게 ‘수고했다’고 말해줘요.",
  ] },
  theme_lonely: { c: REPORT_PAPERS.connect, s: [
    "외로움은 ‘연결이 필요하다’는 신호예요 — 부끄러워할 일이 아니에요.",
    "깊은 대화가 아니어도 돼요. 짧은 인사 한 번이 시작이에요.",
    "혼자 있는 시간을 ‘나와 친해지는 시간’으로 바꿔봐요.",
    "비슷한 마음을 나누는 모임·커뮤니티를 찾아봐요.",
    "먼저 안부를 묻는 용기가 외로움의 고리를 끊어요.",
    "반려동물·식물과의 교감도 큰 위안이 돼요.",
    "‘아무도 날 모른다’ 싶을 때, 일기에라도 마음을 꺼내봐요.",
    "외로움이 깊을 땐 사람 많은 곳에 잠깐 머물러봐요.",
    "나를 외롭게 둔 자신을 탓하지 말아요 — 누구나 그럴 때가 있어요.",
    "연결은 ‘양’보다 ‘닿음’이에요. 한 사람이면 충분해요.",
  ] },
  theme_burnout: { c: REPORT_PAPERS.sleep, s: [
    "소진은 게으름이 아니라 너무 오래 애쓴 흔적이에요.",
    "회복을 ‘일정’으로 넣어봐요 — 쉼이 곧 다음의 연료예요.",
    "‘해야 할 것’ 목록에서 오늘 하나를 지워봐요.",
    "잘 자는 것부터 — 수면이 소진 회복의 1순위예요.",
    "모든 걸 80%로만 해도 무너지지 않아요.",
    "잠깐의 ‘아무것도 안 하기’를 죄책감 없이 허락해봐요.",
    "에너지를 ‘꼭 필요한 곳’에만 아껴 써봐요.",
    "몸의 신호(두통·피로)를 더 미루지 말고 들어줘요.",
    "자연 속 짧은 시간이 바닥난 에너지를 조금 채워줘요.",
    "지금은 ‘채우는 시기’예요 — 비워졌다고 자책하지 말아요.",
  ] },
  theme_foggy: { c: REPORT_PAPERS.express, s: [
    "머리가 멍할 땐 생각을 ‘꺼내 적어’ 바깥에 두어봐요.",
    "복잡할수록 ‘지금 가장 중요한 하나’만 골라봐요.",
    "결정을 미뤄도 돼요 — 또렷할 때 정해도 늦지 않아요.",
    "한 번에 하나씩 — 멀티태스킹이 안개를 더 짙게 해요.",
    "짧은 산책·물 한 잔이 흐린 머리를 환기해줘요.",
    "‘해야 할 일’을 종이에 나열만 해도 머리가 가벼워져요.",
    "잠·끼니가 부족하면 머리가 멍해져요 — 기본부터 챙겨요.",
    "생각이 안 잡히면 5분 타이머로 ‘딱 이것만’ 해봐요.",
    "멍함도 뇌가 쉬려는 신호일 수 있어요 — 잠깐 쉬어요.",
    "복잡한 마음을 누군가에게 말하면 저절로 정리되기도 해요.",
  ] },
  theme_joy: { c: REPORT_PAPERS.savoring, s: [
    "기쁜 지금을 천천히 음미해봐요 — 좋은 순간은 빨리 지나가요.",
    "이 좋은 기운으로 미뤄둔 ‘하고 싶던 일’에 손대봐요.",
    "행복을 가까운 사람과 나누면 두 배가 돼요.",
    "오늘의 좋은 순간을 기록해 ‘행복 저금’을 해봐요.",
    "잘 풀리는 비결을 적어두면 다음에 또 쓸 수 있어요.",
    "기쁠 때 베푸는 작은 친절은 더 오래 남아요.",
    "지금의 활력을 의미 있는 목표 하나에 투자해봐요.",
    "‘이래도 되나’ 싶을 만큼 좋아도 괜찮아요 — 충분히 누려요.",
    "좋은 컨디션을 몸에도 써봐요 — 가벼운 운동으로 더 끌어올려요.",
    "오늘의 나에게 ‘잘 지내줘서 고마워’라고 말해줘요.",
  ] },
  theme_calm: { c: REPORT_PAPERS.gratitude, s: [
    "잔잔한 지금을 ‘당연’이 아니라 ‘감사’로 느껴봐요.",
    "평온한 날일수록 좋은 루틴을 하나 더 다져봐요.",
    "이 안정감을 만든 것이 무엇인지 적어두면 다시 만들 수 있어요.",
    "여유가 있을 때 미뤄둔 ‘작은 정리’를 해두면 든든해져요.",
    "평온할 때 감사 일기를 시작하면 꾸준히 이어가기 쉬워요.",
    "고요한 마음으로 가까운 사람에게 다정함을 전해봐요.",
    "안정될 때 ‘힘든 날의 나’에게 줄 위로를 미리 적어둬봐요.",
    "지금의 균형을 지키는 ‘나만의 비결’을 떠올려봐요.",
    "평온도 연습이에요 — 오늘의 고요를 천천히 음미해요.",
    "잘 지내는 지금의 나를 충분히 칭찬해줘요.",
  ] },
  theme_mixed: { c: REPORT_PAPERS.labeling, s: [
    "여러 감정이 섞였다면 하나씩 이름을 붙여 정리해봐요.",
    "복잡한 마음은 ‘옳다/그르다’ 말고 그냥 ‘있구나’ 해줘요.",
    "상반된 감정이 함께일 수 있어요 — 둘 다 진짜예요.",
    "지금 가장 큰 감정 하나만 골라 돌봐줘봐요.",
    "마음이 뒤죽박죽일 땐 글로 ‘쏟아내기’가 도움이 돼요.",
    "감정의 ‘날씨’를 적어봐요 — 흐림·맑음·소나기처럼.",
    "정리가 안 되면 누군가에게 말하며 풀어봐요.",
    "혼란스러운 날도 기록해두면 나중에 패턴이 보여요.",
    "한 번에 다 이해하려 말고, 오늘은 ‘느끼기’만 해도 돼요.",
    "섞인 마음을 안고도 하루를 살아낸 당신이 대단해요.",
  ] },
});
if (typeof window !== "undefined") { try { window.__rxCount = Object.values(RX).reduce((a, r) => a + (r.s ? r.s.length : 0), 0); } catch (e) {} }
// 감정 태그 → 임상 테마 (정서가·각성 묶음)
const EMO_TO_THEME = {
  "화나요": "anger",
  "스트레스": "anxiety", "불안해요": "anxiety", "초조해요": "anxiety",
  "우울해요": "sadness", "슬퍼요": "sadness",
  "외로워요": "lonely",
  "지쳤어요": "burnout", "무기력해요": "burnout", "졸려요": "burnout",
  "멍해요": "foggy", "복잡해요": "foggy",
  "신나요": "joy", "설레요": "joy", "행복해요": "joy",
  "뿌듯해요": "calm", "고마워요": "calm", "평온해요": "calm", "괜찮아요": "calm",
  "그럭저럭": "mixed",
};
// 테마별 진단·기본 처방 (세분화)
const DX_THEMES = {
  anxiety: { label: "긴장·불안이 잦아요", dx: "고각성(긴장) 상태가 자주 보여요. 몸의 각성을 낮추는 걸 먼저 해봐요.", rx: ["grounding", "breath", "nature", "plan"] },
  anger:   { label: "분노·짜증이 올라와요", dx: "화가 자주 치밀어요. 충동과 결정 사이에 ‘틈’을 만드는 게 도움이 돼요.", rx: ["breath", "move", "plan", "boundary"] },
  sadness: { label: "마음이 가라앉아 있어요", dx: "저조·우울감이 두드러져요. 작은 활동과 연결이 회복을 도와요.", rx: ["ba", "move", "connect", "selfcomp"] },
  lonely:  { label: "외로움이 자주 느껴져요", dx: "혼자라는 느낌이 커요. 아주 가는 연결 하나가 큰 완충이 돼요.", rx: ["connect", "ba", "express", "selfcomp"] },
  burnout: { label: "소진·낮은 활력", dx: "에너지가 고갈된 소진 신호예요. 회복과 수면을 가장 앞에 둬요.", rx: ["rest", "sleep", "nature", "ba"] },
  foggy:   { label: "생각이 뒤엉켜 있어요", dx: "머리가 멍하고 복잡해요. 꺼내 적어 정리하면 한결 또렷해져요.", rx: ["express", "plan", "rest"] },
  joy:     { label: "기쁨이 차오르는 시기", dx: "활기·설렘이 우세해요. 이 좋은 정서를 음미하고 넓혀봐요.", rx: ["savoring", "strength", "gratitude"] },
  calm:    { label: "잔잔하고 안정적이에요", dx: "평온·만족이 우세해요. 지금의 자원을 감사로 단단히 다져요.", rx: ["gratitude", "savoring", "strength"] },
  mixed:   { label: "여러 감정이 섞여 있어요", dx: "감정이 뒤섞여 있어요. 이름을 붙여 정리하면 한결 가벼워져요.", rx: ["express", "labeling", "gratitude"] },
};
// 일기 키워드 → 맥락 테마 (세분화)
const KEYWORD_THEME = {
  work:      ["직장", "회사", "업무", "야근", "상사", "마감", "프로젝트", "출근", "퇴근", "업무량"],
  study:     ["시험", "공부", "학교", "성적", "과제", "발표", "논문", "수업", "학업"],
  rel:       ["관계", "친구", "사람들", "동료", "지인"],
  conflict:  ["다툼", "싸움", "갈등", "말다툼", "틀어"],
  love:      ["연애", "애인", "남친", "여친", "연인", "헤어", "짝사랑", "썸"],
  family:    ["가족", "엄마", "아빠", "부모", "시댁", "처가", "형제", "명절", "남편", "아내"],
  sleep:     ["수면", "불면", "피곤", "졸려", "새벽", "잠"],
  health:    ["몸살", "병원", "두통", "건강", "통증", "체력", "아픔"],
  appearance:["외모", "다이어트", "몸무게", "거울", "체중"],
  selfcrit:  ["자책", "한심", "실패", "부족함", "열등감"],
  money:     ["월급", "대출", "경제", "생활비", "지출"],
  future:    ["미래", "진로", "불확실", "막막", "취업"],
  parenting: ["육아", "아기", "아이", "아이들", "돌봄", "재우"],
  loss:      ["상실", "사별", "떠나보", "잃었", "장례"],
  change:    ["이사", "변화", "적응", "전학", "이직"],
  phone:     ["스마트폰", "핸드폰", "sns", "인스타", "유튜브", "틱톡", "스크롤"],
};
const KW_RX = { work: "ctx_work", study: "ctx_study", rel: "ctx_rel", conflict: "ctx_conflict", love: "ctx_love", family: "ctx_family", sleep: "sleep", health: "ctx_health", appearance: "ctx_appearance", selfcrit: "selfcomp", money: "ctx_money", future: "ctx_future", parenting: "ctx_parenting", loss: "ctx_loss", change: "ctx_change", phone: "ctx_phone" };
const KW_LABEL = { work: "요즘 ‘일·직장’ 부담이 자주 보여요", study: "‘학업·시험’ 압박이 비쳐요", rel: "‘관계’가 마음에 자주 올라와요", conflict: "‘갈등·다툼’이 마음에 남아 있어요", love: "‘연애’ 고민이 비쳐요", family: "‘가족’ 일이 마음에 올라와요", sleep: "‘수면·피로’ 언급이 잦아요", health: "‘몸·건강’ 이야기가 보여요", appearance: "‘외모·몸’에 대한 마음이 보여요", selfcrit: "스스로를 탓하는 표현이 보여요", money: "‘경제적 부담’이 비쳐요", future: "‘미래·진로’ 고민이 보여요", parenting: "‘육아·돌봄’의 무게가 느껴져요", loss: "‘상실·이별’의 슬픔이 느껴져요", change: "‘변화·적응’의 부담이 보여요", phone: "‘스마트폰·SNS’ 사용이 자주 보여요" };
function dominantEmoTheme(tagCounts) {
  const sc = {};
  Object.entries(tagCounts || {}).forEach(([t, n]) => { const th = EMO_TO_THEME[t]; if (th) sc[th] = (sc[th] || 0) + n; });
  let best = null, bv = 0; Object.entries(sc).forEach(([k, v]) => { if (v > bv) { bv = v; best = k; } });
  return bv > 0 ? best : null;
}
function keywordThemes(entries, keys) {
  // 맥락은 사용자가 '쓴' 부담에서만 — 일기(note)와 힘들었던 순간(reflection.hard)만. 잘한 일/좋았던 순간(긍정)은 제외
  const toks = new Set();
  keys.map((k) => entries[k]).filter(Boolean).forEach((e) => {
    const txt = [e.note, e.reflection && e.reflection.hard].filter(Boolean).join(" ");
    if (txt.trim()) tokenizeKo(txt).forEach((t) => toks.add(t));
  });
  const cnt = {};
  Object.entries(KEYWORD_THEME).forEach(([theme, words]) => {
    let c = 0;
    toks.forEach((tok) => { if (words.some((w) => tok === w || (tok.startsWith(w) && tok.length - w.length <= 1) || (w.startsWith(tok) && w.length - tok.length <= 1))) c++; });
    if (c) cnt[theme] = c;
  });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
}
// 세분 진단 — 기분 구간(심각도) × 감정 테마 × 일기 키워드 맥락 → 진단 + 처방
function richDiagnose(cur, entries, keys) {
  if (cur.avgMood == null) return null;
  const band = DIAG_BANDS.find((b) => cur.avgMood < b.max) || DIAG_BANDS[DIAG_BANDS.length - 1];
  const theme = dominantEmoTheme(cur.tagCounts);
  const base = (theme && DX_THEMES[theme]) ? DX_THEMES[theme] : null;
  const label = base ? base.label : band.label;
  const parts = [base ? base.dx : band.dx];
  if (band.key === "crisis") parts.push("특히 낮은 시기라 무리하지 않는 게 가장 중요해요.");
  if (cur.sd != null && cur.sd >= 22) parts.push("기복도 큰 편이에요.");
  const kws = keywordThemes(entries, keys);
  const negBand = band.key === "crisis" || band.key === "low" || band.key === "mid";
  const topKw = negBand ? kws[0] : null;                       // 힘든 구간에서만, 가장 강한 맥락 1개만
  if (topKw && KW_LABEL[topKw]) parts.push(KW_LABEL[topKw] + ".");
  const baseRx = (theme && RX["theme_" + theme]) ? ["theme_" + theme].concat(base ? base.rx : band.rx) : (base ? base.rx : band.rx);
  const rx = [];
  if (band.key === "crisis") rx.push("help");                 // 위기 최우선
  if (baseRx[0]) rx.push(baseRx[0]);                          // 감정 테마 전용 처방 우선
  if (topKw && KW_RX[topKw]) rx.push(KW_RX[topKw]);           // 일기 맥락 처방(상위 보장, 1개)
  baseRx.slice(1).forEach((k) => rx.push(k));                 // 나머지 기본 처방
  if (cur.avgEnergy != null && cur.avgEnergy < 2.6) rx.push("breath"); // 데이터 신호
  if (cur.habPct != null && cur.habPct < 50) rx.push("ii");
  if (cur.gratCount === 0 && cur.days >= 3) rx.push("gratitude");
  return { band, label, dx: parts.join(" "), rx };
}
// 기간 통계 — 리포트 알고리즘의 코어 (현재/직전 기간을 같은 방식으로 계산)
function periodStats(keys, entries) {
  const recs = keys.map((k) => entries[k]).filter(Boolean);
  const moods = recs.filter((e) => e.mood);
  const scores = moods.map((e) => entryScore(e));
  const avgMood = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const sd = scores.length > 1 ? Math.sqrt(scores.reduce((s, v) => s + (v - avgMood) ** 2, 0) / scores.length) : null;
  const energies = recs.filter((e) => e.energy);
  const avgEnergy = energies.length ? energies.reduce((s, e) => s + e.energy, 0) / energies.length : null;
  const chs = loadChs(); let habTotal = 0, habDone = 0; const perHab = [];
  chs.forEach((h) => { let t = 0, dn = 0; keys.forEach((k) => { if (k >= h.startDate && k <= todayKey()) { t++; habTotal++; if (h.done[k]) { dn++; habDone++; } } }); if (t > 0) perHab.push({ h, t, d: dn }); });
  const habPct = habTotal ? Math.round((habDone / habTotal) * 100) : null;
  const gratCount = recs.filter((e) => e.praise && e.praise.trim()).length;
  const reflectCount = recs.filter((e) => e.reflection && (e.reflection.good || e.reflection.hard)).length;
  const tagCounts = {}; moods.forEach((e) => (e.tags || []).forEach((t) => tagCounts[t] = (tagCounts[t] || 0) + 1));
  const dist = {}; moods.forEach((e) => dist[e.mood] = (dist[e.mood] || 0) + 1);
  let best = null, worst = null;
  moods.forEach((e) => { const sc = entryScore(e); if (best == null || sc > best.sc) best = { e, sc }; if (worst == null || sc < worst.sc) worst = { e, sc }; });
  return { recs, days: recs.length, moods, scores, avgMood, sd, avgEnergy, habTotal, habDone, habPct, perHab, gratCount, reflectCount, tagCounts, dist, best, worst };
}
// 처방 선택 — 진단 처방 후보에서 상위 3개. 1순위(가장 중요)는 고정, 나머지는 기간 시드로
// 회전시켜 같은 사용자라도 주마다 다른 처방이 노출되게(방대한 DB를 실제로 순환 활용)
function selectSolutions(diag, trend, seedKey) {
  const cand = []; const push = (k) => { if (RX[k] && !cand.includes(k)) cand.push(k); };
  if (diag) diag.rx.forEach(push);
  if (trend === "down") push("selfcomp");
  if (!cand.length) push("labeling");
  const seed = parseInt((seedKey || todayKey()).replace(/-/g, ""), 10) || 0;
  const head = cand.slice(0, 1), tail = cand.slice(1);
  const off = tail.length ? seed % tail.length : 0;
  const rotated = head.concat(tail.slice(off), tail.slice(0, off));
  return rotated.slice(0, 3).map((k, i) => { const r = RX[k]; return { txt: r.s[(seed + i) % r.s.length], c: r.c, k }; });
}
// 습관 분석 코어 — 리포트(요약)용 심화 지표. 습관별로 달성률·지난 기간 대비 증감·현재 연속·
// 후반 모멘텀(전반 대비)·가장 잘 지키는 요일·기분 연관(한 날 vs 안 한 날)을 한 번에 계산.
function computeHabitAnalysis(keys, prevKeys, entries) {
  const chs = (typeof loadChs === "function") ? loadChs() : [];
  if (!chs.length) return null;
  const tk = todayKey();
  const dowName = ["일", "월", "화", "수", "목", "금", "토"];
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const moodBy = {}; keys.forEach((k) => { const e = entries[k]; if (e && e.mood) moodBy[k] = entryScore(e); });
  const half = Math.floor(keys.length / 2);
  const rows = chs.map((h) => {
    let t = 0, dn = 0; const dow = [0, 0, 0, 0, 0, 0, 0], dowTot = [0, 0, 0, 0, 0, 0, 0];
    let fhT = 0, fhD = 0, shT = 0, shD = 0;
    keys.forEach((k, idx) => {
      if (k < h.startDate || k > tk) return;
      t++; const done = !!(h.done && h.done[k]);
      const di = new Date(k + "T00:00:00").getDay();
      dowTot[di]++; if (done) { dn++; dow[di]++; }
      if (idx < half) { fhT++; if (done) fhD++; } else { shT++; if (done) shD++; }
    });
    if (t === 0) return null;
    const rate = Math.round(dn / t * 100);
    let pt = 0, pd = 0; prevKeys.forEach((k) => { if (k < h.startDate || k > tk) return; pt++; if (h.done && h.done[k]) pd++; });
    const prevRate = pt ? Math.round(pd / pt * 100) : null;
    const delta = prevRate != null ? rate - prevRate : null;
    let streak = 0; for (let i = 0; ; i++) { const dd = new Date(); dd.setDate(dd.getDate() - i); const k = todayKey(dd); if (k < h.startDate) break; if (h.done && h.done[k]) streak++; else if (i === 0) continue; else break; }
    let bestDow = null, bestR = -1; for (let i = 0; i < 7; i++) { if (dowTot[i] >= 2) { const r = dow[i] / dowTot[i]; if (r > bestR) { bestR = r; bestDow = i; } } }
    const fh = fhT >= 2 ? fhD / fhT : null, sh = shT >= 2 ? shD / shT : null;
    const momentum = (fh != null && sh != null) ? Math.round((sh - fh) * 100) : null;
    const dnM = [], ntM = []; keys.forEach((k) => { if (moodBy[k] == null || k < h.startDate) return; (h.done && h.done[k] ? dnM : ntM).push(moodBy[k]); });
    const moodDiff = (dnM.length >= 5 && ntM.length >= 5) ? Math.round(avg(dnM) - avg(ntM)) : null;
    return { h, t, dn, rate, prevRate, delta, streak, bestDow: bestDow != null ? dowName[bestDow] : null, momentum, moodDiff };
  }).filter(Boolean);
  if (!rows.length) return null;
  rows.sort((a, b) => b.rate - a.rate);
  const avgRate = Math.round(rows.reduce((s, r) => s + r.rate, 0) / rows.length);
  const prevRows = rows.filter((r) => r.prevRate != null);
  const prevAvgRate = prevRows.length ? Math.round(prevRows.reduce((s, r) => s + r.prevRate, 0) / prevRows.length) : null;
  const avgDelta = prevAvgRate != null ? avgRate - prevAvgRate : null;
  const byMomentum = rows.filter((r) => r.momentum != null);
  const improved = byMomentum.slice().sort((a, b) => b.momentum - a.momentum)[0] || null;
  const declined = byMomentum.slice().sort((a, b) => a.momentum - b.momentum)[0] || null;
  const moodLinked = rows.filter((r) => r.moodDiff != null && r.moodDiff >= 5).sort((a, b) => b.moodDiff - a.moodDiff)[0] || null;
  const perfect = rows.filter((r) => r.rate === 100);
  return { rows, avgRate, prevAvgRate, avgDelta, mostConsistent: rows[0], improved, declined, moodLinked, perfect };
}
// 습관 분석 결론 문장들 — 가장 꾸준한 습관·살아나는/주춤하는 습관·기분과 이어진 습관·완벽 달성
function habitInsightLines(ha, unit) {
  if (!ha) return [];
  const nm = (r) => `${r.h.emoji || "✅"} <b>${escapeHtml(r.h.title)}</b>`;
  const periodTxt = unit === "달" ? "이번 달" : "이번 주";
  const lines = [];
  if (ha.mostConsistent) lines.push(`가장 꾸준한 습관은 ${nm(ha.mostConsistent)} · <b>${ha.mostConsistent.rate}%</b>예요.`);
  if (ha.improved && ha.improved.momentum >= 15) lines.push(`${nm(ha.improved)}이(가) ${periodTxt} 후반 들어 살아나고 있어요 (▲${ha.improved.momentum}%).`);
  else if (ha.declined && ha.declined.momentum <= -15) lines.push(`${nm(ha.declined)}은(는) 후반 들어 주춤했어요 (▼${-ha.declined.momentum}%) — 힘든 날엔 최소 버전부터 다시 시작해요.`);
  if (ha.moodLinked) lines.push(`${nm(ha.moodLinked)} 한 날 기분이 평균 <b>${ha.moodLinked.moodDiff}점</b> 더 좋았어요. <small class="ins-caveat">(관찰된 상관일 뿐, 인과는 아니에요)</small>`);
  if (ha.perfect.length) lines.push(`${ha.perfect.map(nm).join(", ")} ${ha.perfect.length > 1 ? "모두 " : ""}완벽하게 지켰어요 🎉`);
  return lines;
}
// 습관 분석 카드(요약 리포트 본문) — 결론 문장 + 습관별 막대(증감·연속·모멘텀·요일·기분)
function habitReportCard(ha, unit) {
  if (!ha) return "";
  const lines = habitInsightLines(ha, unit).slice(0, 3);
  const insHtml = lines.length ? `<div class="hrep-ins">${lines.map((t) => `<p class="hrep-ins-row"><span>💡</span><span>${t}</span></p>`).join("")}</div>` : "";
  const avgChip = ha.avgDelta != null && Math.abs(ha.avgDelta) >= 1 ? ` <span class="kpi-delta ${ha.avgDelta >= 1 ? "up" : "down"}">${ha.avgDelta > 0 ? "▲" : "▼"}${Math.abs(ha.avgDelta)} 지난 ${unit}</span>` : "";
  const rowsHtml = ha.rows.map((r) => {
    const dChip = (r.delta != null && Math.abs(r.delta) >= 1) ? `<i class="hrep-delta ${r.delta > 0 ? "up" : "down"}">${r.delta > 0 ? "▲" : "▼"}${Math.abs(r.delta)}</i>` : `<i class="hrep-delta flat"></i>`;
    const sub = [];
    sub.push(`🔥${r.streak}일`);
    if (r.momentum != null && r.momentum >= 10) sub.push("📈 오름세");
    else if (r.momentum != null && r.momentum <= -10) sub.push("📉 주춤");
    if (r.bestDow) sub.push(`${r.bestDow}요일↑`);
    if (r.moodDiff != null && r.moodDiff >= 5) sub.push(`기분 +${r.moodDiff}`);
    return `<div class="hrep-row">`
      + `<div class="hrep-line"><span class="hsum-name">${r.h.emoji || "✅"} ${escapeHtml(r.h.title)}</span>`
      + `<div class="hsum-bar-wrap"><div class="hsum-bar" style="width:${r.rate}%"></div></div>`
      + `<span class="hsum-rate">${r.rate}%</span>${dChip}</div>`
      + `<p class="hrep-sub">${sub.join(" · ")}</p></div>`;
  }).join("");
  return `<div class="card hrep-card"><div class="card-head"><h2>🎯 습관 분석</h2><span class="hrep-avg">평균 ${ha.avgRate}%${avgChip}</span></div>`
    + insHtml + rowsHtml
    + `<p class="hint" style="margin-top:10px">막대=이번 ${unit} 달성률 · 칩=지난 ${unit} 대비 · 🔥=현재 연속 · 📈오름세/📉주춤=후반 흐름 · 기분=한 날이 안 한 날보다.</p></div>`;
}
function reportDetailHtml(kind) {
  const entries = loadEntries();
  let keys = [], prevKeys = [];
  if (kind === "month") {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth(), days = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= days; d++) keys.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    const pm = new Date(y, m - 1, 1), py = pm.getFullYear(), pmo = pm.getMonth(), pdays = new Date(py, pmo + 1, 0).getDate();
    for (let d = 1; d <= pdays; d++) prevKeys.push(`${py}-${String(pmo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  } else {
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(todayKey(d)); }
    for (let i = 13; i >= 7; i--) { const d = new Date(); d.setDate(d.getDate() - i); prevKeys.push(todayKey(d)); }
  }
  const cur = periodStats(keys, entries), prev = periodStats(prevKeys, entries);
  const summary = kind === "month" ? monthData : weekData;
  const period = summary ? (summary.range || summary.label || "") : "";
  const unit = kind === "month" ? "달" : "주";

  if (cur.recs.length === 0) {
    return `<p class="detail-stat">${period}</p><div class="card center"><div class="onboard-emoji">🌱</div><p class="empty">아직 이 기간엔 기록이 없어요.<br>오늘의 여정으로 첫 기록을 남겨봐요.</p></div>
    <div class="data-btns"><button class="btn" data-ract="img" data-kind="${kind}">🖼️ 이미지로 저장</button><button class="btn" data-ract="share" data-kind="${kind}">📤 공유</button></div>`;
  }

  const delta = (a, b) => (a == null || b == null) ? null : a - b;
  const arrow = (d, unitTxt) => d == null ? "" : ` <small class="kpi-delta ${d >= 1 ? "up" : d <= -1 ? "down" : "flat"}">${d > 0 ? "▲" : d < 0 ? "▼" : "–"}${Math.abs(Math.round(d))}${unitTxt || ""}</small>`;
  const dMood = delta(cur.avgMood, prev.avgMood);

  // 히어로 — 평균 기분 게이지 + 핵심 지표(지난 기간 대비 델타 포함)
  const sdlt = (dd, u) => dd == null ? "" : `<i class="hs-delta ${dd >= 1 ? "up" : dd <= -1 ? "down" : "flat"}">${dd > 0 ? "▲" : dd < 0 ? "▼" : "–"}${Math.abs(Math.round(dd))}${u || ""}</i>`;
  const hs = (b, s, dd, u) => `<div class="hs"><b>${b}</b><span>${s}</span>${sdlt(dd, u)}</div>`;
  const hasPrev = prev.days > 0;
  const heroStats = [
    hs(`${cur.days}`, "기록일", hasPrev ? cur.days - prev.days : null, "일"),
    hs(cur.avgEnergy != null ? cur.avgEnergy.toFixed(1) : "—", "활력/5", (cur.avgEnergy != null && prev.avgEnergy != null) ? cur.avgEnergy - prev.avgEnergy : null),
    cur.habPct != null ? hs(`${cur.habPct}%`, "습관", (prev.habPct != null) ? cur.habPct - prev.habPct : null, "%") : hs(`${cur.gratCount}`, "잘한 일"),
  ].join("");
  const deltaChip = dMood != null ? `<span class="kpi-delta ${dMood >= 1 ? "up" : dMood <= -1 ? "down" : "flat"}">${dMood > 0 ? "▲" : dMood < 0 ? "▼" : "–"}${Math.abs(Math.round(dMood))} 지난 ${unit}</span>` : "";
  const heroCard = `<div class="card rpt-hero">
    <div class="gauge-wrap">${cur.avgMood != null ? moodGaugeSvg(cur.avgMood) : '<div class="gauge-empty">기록<br>없음</div>'}</div>
    <div class="rpt-hero-side"><p class="rpt-hero-cap">평균 기분 ${deltaChip}</p><div class="hero-stats">${heroStats}</div></div>
  </div>`;

  const chart = reportChartSvg(keys, entries);
  const chartCard = chart ? `<div class="card"><div class="card-head"><h2>📈 마음 흐름</h2></div>${chart}</div>` : "";

  // 하이라이트 — 가장 좋았던/힘들었던 날
  const dayLine = (o, emoji, kindTxt) => { if (!o) return ""; const p = o.e.date.split("-"); const snip = (o.e.note || o.e.praise || (o.e.reflection && (o.e.reflection.good || o.e.reflection.hard)) || "").trim(); return `<div class="hl-row"><span class="hl-emoji">${emoji}</span><div class="hl-body"><p class="hl-top">${kindTxt} · ${+p[1]}/${+p[2]} (${dayOfWeekKo(o.e.date)}) <b>${Math.round(o.sc)}점</b></p>${snip ? `<p class="hl-note">${escapeHtml(snip.slice(0, 60))}</p>` : ""}</div></div>`; };
  const hlCard = (cur.best && cur.worst && cur.best.e.date !== cur.worst.e.date) ? `<div class="card"><h2>✨ 이 기간 하이라이트</h2>${dayLine(cur.best, "🌟", "가장 좋았던 날")}${dayLine(cur.worst, "🌧️", "가장 힘들었던 날")}</div>` : "";

  // 추세 → 솔루션
  let trend = "flat";
  if (cur.scores.length >= 4) { const hh = Math.floor(cur.scores.length / 2); const a = cur.scores.slice(0, hh).reduce((s, v) => s + v, 0) / hh; const b = cur.scores.slice(hh).reduce((s, v) => s + v, 0) / (cur.scores.length - hh); trend = b - a >= 8 ? "up" : a - b >= 8 ? "down" : "flat"; }
  const diag = richDiagnose(cur, entries, keys);
  const habAnalysis = computeHabitAnalysis(keys, prevKeys, entries);
  const habCard = habitReportCard(habAnalysis, unit);
  const solItems = selectSolutions(diag, trend, keys[keys.length - 1]);
  const diagCard = diag ? `<div class="card diag-card ${diag.band.tone}"><span class="diag-ico">🩺</span><div class="diag-body"><p class="diag-label">이번 ${unit} 진단 · ${diag.label} <b>${Math.round(cur.avgMood)}점</b></p><p class="diag-dx">${diag.dx}</p></div></div>` : "";
  const solCard = `<div class="card sol-card"><h2>💊 맞춤 처방</h2><p class="hint">위 진단(기분 구간 × 감정 × 일기 맥락)에 맞춘 추천이에요. 검증된 심리·행동과학 연구에 근거해요.</p>${solItems.map((s) => `<div class="sol"><p class="sol-b">${s.txt}</p><p class="sol-c">📚 ${s.c}</p></div>`).join("")}<p class="sol-disclaimer">ℹ️ ‘진단·처방’은 이해를 돕는 비유적 표현이에요. 의료적 진단·치료가 아니라 셀프케어 참고용이며, 힘들 땐 전문가의 도움을 받아요.</p></div>`;

  // --- 자세히(접기): 안정성 · (월간)주차별 · 습관별 달성 · 날짜별 ---
  let stabSec = "";
  if (cur.sd != null) { const lvl = cur.sd < 12 ? "안정적이에요" : cur.sd < 22 ? "보통이에요" : "기복이 큰 편이에요"; stabSec = `<div class="rpt-sec"><h3>📐 기분 안정성</h3><p class="insight">변동 폭은 <b>${lvl}</b> (표준편차 ${Math.round(cur.sd)}점). ${cur.sd >= 22 ? "기복이 클 땐 규칙적인 수면·호흡이 도움이 돼요." : "꾸준한 흐름을 잘 유지하고 있어요."}</p></div>`; }
  let weekBreakSec = "";
  if (kind === "month") {
    const wk = [[], [], [], [], []];
    keys.forEach((k) => { const day = +k.split("-")[2]; const wi = Math.min(4, Math.floor((day - 1) / 7)); if (entries[k] && entries[k].mood) wk[wi].push(entryScore(entries[k])); });
    const wrows = wk.map((arr, i) => arr.length ? { i, avg: arr.reduce((a, b) => a + b, 0) / arr.length } : null).filter(Boolean);
    if (wrows.length >= 2) weekBreakSec = `<div class="rpt-sec"><h3>📅 주차별 평균 기분</h3><div class="dist">${wrows.map((r) => `<div class="dist-row"><span class="cap-name">${r.i + 1}주차</span><div class="dist-bar-wrap"><div class="dist-bar" style="width:${Math.round(r.avg)}%;background:${scoreColor(r.avg)}"></div></div><span class="dist-count">${Math.round(r.avg)}</span></div>`).join("")}</div></div>`;
  }
  const drows = keys.filter((k) => entries[k]).map((k) => { const e = entries[k], p = k.split("-"); return `<div class="rpt-row"><span>${+p[1]}/${+p[2]} (${dayOfWeekKo(k)})</span><span>${e.mood ? mInfo(e.mood).emoji + " " + e.mood : "-"}</span><span>${entryScore(e) != null ? Math.round(entryScore(e)) + "점" : ""}</span></div>`; }).join("");
  const daysSec = `<div class="rpt-sec"><h3>🗓️ 날짜별 기록 (${cur.days}일)</h3><div class="rpt-list">${drows}</div></div>`;
  const moreInner = stabSec + weekBreakSec + daysSec;
  const moreCard = moreInner ? `<details class="card rpt-more"><summary>📂 자세히 보기</summary>${moreInner}</details>` : "";

  // 핵심 한 줄 — 추세 + 가장 영향 준 습관 (결론 먼저)
  const hbits = [];
  if (dMood != null && Math.abs(dMood) >= 3) hbits.push(dMood > 0 ? `지난 ${unit}보다 기분이 <b>▲${Math.round(dMood)}점</b> 좋아졌어요` : `지난 ${unit}보다 <b>▼${Math.round(-dMood)}점</b> 가라앉았어요`);
  { const mbd = {}; keys.forEach((k) => { const e = entries[k]; if (e && e.mood) mbd[k] = entryScore(e); });
    let bH = null;
    (loadChs() || []).forEach((hh) => { const dn = [], nt = []; keys.forEach((k) => { if (mbd[k] == null || k < hh.startDate) return; (hh.done && hh.done[k] ? dn : nt).push(mbd[k]); }); if (dn.length >= 3 && nt.length >= 3) { const ad = dn.reduce((s, v) => s + v, 0) / dn.length, an = nt.reduce((s, v) => s + v, 0) / nt.length, df = ad - an; if (df >= 5 && (!bH || df > bH.df)) bH = { h: hh, df }; } });
    if (bH) hbits.push(`${bH.h.emoji} <b>${escapeHtml(bH.h.title)}</b> 한 날 기분이 더 좋았어요`); }
  const headlineCard = hbits.length ? `<div class="card rpt-headline"><span class="rh-ico">💡</span><p>${hbits.slice(0, 2).join(" · ")}</p></div>` : "";

  return `
    <p class="detail-stat">${period}</p>
    ${headlineCard}
    ${heroCard}
    ${chartCard}
    ${hlCard}
    ${habCard}
    ${diagCard}
    ${solCard}
    ${moreCard}
    <div class="data-btns"><button class="btn" data-ract="img" data-kind="${kind}">🖼️ 이미지로 저장</button><button class="btn" data-ract="share" data-kind="${kind}">📤 공유</button></div>`;
}
// 리포트 이미지 미리보기 — iOS/PWA에서 강제 다운로드가 막혀도 '길게 눌러 저장'이 되도록 실제 이미지를 띄운다
function showImagePreview(kind) {
  const url = drawReportCanvas(kind);
  let ov = document.getElementById("imgPreview");
  if (!ov) { ov = document.createElement("div"); ov.id = "imgPreview"; ov.className = "img-preview"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); document.body.appendChild(ov); }
  const label = kind === "month" ? "월간" : "주간";
  ov.innerHTML = `<div class="ip-backdrop" data-ipclose></div>
    <div class="ip-sheet">
      <p class="ip-title">${label} 리포트 미리보기</p>
      <img class="ip-img" src="${url}" alt="${label} 리포트 이미지" />
      <p class="ip-hint">이미지를 길게 눌러 ‘사진에 저장’하거나, 아래 버튼을 쓰세요.</p>
      <div class="ip-btns">
        <button class="btn primary" data-ipact="share">📤 공유</button>
        <button class="btn" data-ipact="download">⬇️ 저장</button>
      </div>
      <button class="btn ip-close" data-ipclose>닫기</button>
    </div>`;
  ov.classList.add("show");
  ov.onclick = (e) => {
    if (e.target.closest("[data-ipclose]")) { ov.classList.remove("show"); return; }
    const act = e.target.closest("[data-ipact]"); if (!act) return; Sound.tap();
    if (act.dataset.ipact === "share") { shareReport(kind); }
    else { const a = document.createElement("a"); a.href = url; a.download = `${label}리포트_${todayKey()}.png`; document.body.appendChild(a); a.click(); a.remove(); }
  };
}
async function shareReport(kind) {
  const url = drawReportCanvas(kind);
  const d = kind === "month" ? monthData : weekData;
  const text = d ? `오늘의 쉼 · ${kind === "month" ? "월간" : "주간"} 리포트 (${d.range || d.label}) — 기록 ${d.daysLogged}일${d.avgMood != null ? `, 평균 기분 ${Math.round(d.avgMood)}/100` : ""} 🌿` : "오늘의 쉼 리포트";
  try {
    const file = new File([dataURLtoBlob(url)], "report.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text); alert("리포트 요약을 복사했어요!\n\n" + text);
  } catch (e) {}
}

/* 성취 배지 — 카테고리별 분류 */
const BADGE_CATS = [
  { id: "record",  label: "📒 기록" },
  { id: "streak",  label: "🔥 꾸준함" },
  { id: "habit",   label: "🎯 습관" },
  { id: "mind",    label: "🧘 마음챙김" },
  { id: "emotion", label: "🎨 감정" },
  { id: "care",    label: "💛 돌봄·감사" },
  { id: "special", label: "✨ 특별" },
];
const BADGES = [
  // 기록
  { id: "first", e: "🌱", t: "첫 발걸음", d: "첫 기록을 남겼어요", cat: "record", ok: (D) => D.total >= 1 },
  { id: "d7", e: "🌿", t: "일주일의 마음", d: "누적 7일 기록", cat: "record", ok: (D) => D.total >= 7 },
  { id: "d14", e: "📅", t: "이주의 기록", d: "누적 14일 기록", cat: "record", ok: (D) => D.total >= 14 },
  { id: "d30", e: "📚", t: "30일의 기록", d: "누적 30일 기록", cat: "record", ok: (D) => D.total >= 30 },
  { id: "d50", e: "📖", t: "오십 일", d: "누적 50일 기록", cat: "record", ok: (D) => D.total >= 50 },
  { id: "d100", e: "🏔️", t: "백 일의 여정", d: "누적 100일 기록", cat: "record", ok: (D) => D.total >= 100 },
  { id: "d200", e: "🗻", t: "이백 일", d: "누적 200일 기록", cat: "record", ok: (D) => D.total >= 200 },
  { id: "d365", e: "🎆", t: "일 년의 기록", d: "누적 365일 기록", cat: "record", ok: (D) => D.total >= 365 },
  { id: "note10", e: "✏️", t: "글쓰기 시작", d: "일기 10번 작성", cat: "record", ok: (D) => D.list.filter((e) => e.note && e.note.trim()).length >= 10 },
  { id: "note50", e: "✍️", t: "기록가", d: "일기 50번 작성", cat: "record", ok: (D) => D.list.filter((e) => e.note && e.note.trim()).length >= 50 },
  { id: "note100", e: "📕", t: "작가의 마음", d: "일기 100번 작성", cat: "record", ok: (D) => D.list.filter((e) => e.note && e.note.trim()).length >= 100 },
  // 꾸준함
  { id: "streak3", e: "🌤️", t: "사흘 연속", d: "3일 연속 기록", cat: "streak", ok: (D) => D.streak >= 3 },
  { id: "week", e: "🗓️", t: "일주일 연속", d: "7일 연속 기록", cat: "streak", ok: (D) => D.streak >= 7 },
  { id: "streak14", e: "⚡", t: "2주 연속", d: "14일 연속 기록", cat: "streak", ok: (D) => D.streak >= 14 },
  { id: "streak30", e: "👑", t: "한 달 연속", d: "30일 연속 기록", cat: "streak", ok: (D) => D.streak >= 30 },
  { id: "streak60", e: "💫", t: "두 달 연속", d: "60일 연속 기록", cat: "streak", ok: (D) => D.streak >= 60 },
  { id: "streak100", e: "🌌", t: "백 일 연속", d: "100일 연속 기록", cat: "streak", ok: (D) => D.streak >= 100 },
  // 습관
  { id: "habit", e: "🎯", t: "습관 시작", d: "습관을 만들었어요", cat: "habit", ok: (D) => D.chs.length >= 1 },
  { id: "habit1", e: "✅", t: "첫 완료", d: "습관을 한 번 완료", cat: "habit", ok: (D) => D.chs.some((h) => Object.values(h.done || {}).filter(Boolean).length >= 1) },
  { id: "habit7", e: "🗒️", t: "일주일 습관", d: "한 습관 7회 완료", cat: "habit", ok: (D) => D.chs.some((h) => Object.values(h.done || {}).filter(Boolean).length >= 7) },
  { id: "habit2", e: "🎲", t: "두 가지 습관", d: "습관 2개 이상 운영", cat: "habit", ok: (D) => D.chs.length >= 2 },
  { id: "habit3done", e: "💪", t: "하루 세 습관", d: "하루에 습관 3개 완료", cat: "habit", ok: (D) => { const m = {}; D.chs.forEach((h) => Object.keys(h.done || {}).forEach((d) => { if (h.done[d]) m[d] = (m[d] || 0) + 1; })); return Object.values(m).some((c) => c >= 3); } },
  { id: "habit21", e: "🔥", t: "21일의 힘", d: "한 습관 21일 달성", cat: "habit", ok: (D) => D.chs.some((h) => Object.values(h.done || {}).filter(Boolean).length >= 21) },
  { id: "habit66", e: "🧠", t: "습관 완성", d: "한 습관 66일 달성", cat: "habit", ok: (D) => D.chs.some((h) => Object.values(h.done || {}).filter(Boolean).length >= 66) },
  { id: "habit90", e: "🏆", t: "90일 완주", d: "한 습관 90일 달성", cat: "habit", ok: (D) => D.chs.some((h) => Object.values(h.done || {}).filter(Boolean).length >= 90) },
  // 마음챙김
  { id: "journey_first", e: "🚪", t: "여정의 시작", d: "오늘의 여정 첫 완주", cat: "mind", ok: () => (settings.journeyCount || 0) >= 1 },
  { id: "journey5", e: "✨", t: "여정의 동반자", d: "오늘의 여정 5번 완주", cat: "mind", ok: () => (settings.journeyCount || 0) >= 5 },
  { id: "journey20", e: "🧭", t: "여정 베테랑", d: "오늘의 여정 20번 완주", cat: "mind", ok: () => (settings.journeyCount || 0) >= 20 },
  { id: "journey50", e: "🛤️", t: "여정의 길잡이", d: "오늘의 여정 50번 완주", cat: "mind", ok: () => (settings.journeyCount || 0) >= 50 },
  { id: "breath10", e: "🌬️", t: "숨 고르기", d: "호흡 10번 하기", cat: "mind", ok: () => (settings.breathCount || 0) >= 10 },
  { id: "breath30", e: "🧘", t: "호흡 마스터", d: "호흡 30번 하기", cat: "mind", ok: () => (settings.breathCount || 0) >= 30 },
  { id: "breath50", e: "🌊", t: "호흡 고수", d: "호흡 50번 하기", cat: "mind", ok: () => (settings.breathCount || 0) >= 50 },
  { id: "breath100", e: "🪷", t: "호흡 달인", d: "호흡 100번 하기", cat: "mind", ok: () => (settings.breathCount || 0) >= 100 },
  { id: "reflect", e: "🌙", t: "돌아보는 밤", d: "저녁 회고를 남겼어요", cat: "mind", ok: (D) => D.list.some((e) => e.reflection && (e.reflection.good || e.reflection.hard)) },
  // 감정
  { id: "energized", e: "😄", t: "활기찬 날", d: "'활기차요'를 기록", cat: "emotion", ok: (D) => D.list.some((e) => e.mood === "활기차요") },
  { id: "allmoods", e: "🌈", t: "마음의 무지개", d: "7가지 기분 모두 경험", cat: "emotion", ok: (D) => new Set(D.list.filter((e) => e.mood).map((e) => e.mood)).size >= 7 },
  { id: "tags5", e: "🏷️", t: "감정의 언어", d: "감정 태그 5일 기록", cat: "emotion", ok: (D) => D.list.filter((e) => e.tags && e.tags.length).length >= 5 },
  { id: "tags20", e: "🎨", t: "감정의 화가", d: "감정 태그 20일 기록", cat: "emotion", ok: (D) => D.list.filter((e) => e.tags && e.tags.length).length >= 20 },
  { id: "tags50", e: "🖼️", t: "감정의 거장", d: "감정 태그 50일 기록", cat: "emotion", ok: (D) => D.list.filter((e) => e.tags && e.tags.length).length >= 50 },
  { id: "score100", e: "🌟", t: "최고의 날", d: "기분 100점을 기록", cat: "emotion", ok: (D) => D.list.some((e) => e.score >= 100) },
  { id: "pos10", e: "☀️", t: "맑은 날들", d: "기분 좋은 날(60점↑) 10번", cat: "emotion", ok: (D) => D.list.filter((e) => e.score != null ? e.score >= 60 : (e.mood && mInfo(e.mood).score >= 4)).length >= 10 },
  { id: "score_track", e: "📈", t: "섬세한 기록", d: "기분 점수 10일 기록", cat: "emotion", ok: (D) => D.list.filter((e) => e.score != null).length >= 10 },
  // 돌봄·감사
  { id: "grat10", e: "🙏", t: "감사의 습관", d: "잘한 일 10번 기록", cat: "care", ok: (D) => D.list.filter((e) => e.praise && e.praise.trim()).length >= 10 },
  { id: "praise30", e: "💝", t: "감사 부자", d: "잘한 일 30번 기록", cat: "care", ok: (D) => D.list.filter((e) => e.praise && e.praise.trim()).length >= 30 },
  { id: "praise50", e: "🎁", t: "감사의 달인", d: "잘한 일 50번 기록", cat: "care", ok: (D) => D.list.filter((e) => e.praise && e.praise.trim()).length >= 50 },
  { id: "fav", e: "💛", t: "나의 위로", d: "위로 문구를 즐겨찾기", cat: "care", ok: () => (settings.favQuotes || []).length >= 1 },
  { id: "fav5", e: "💖", t: "위로 수집가", d: "위로 문구 5개 즐겨찾기", cat: "care", ok: () => (settings.favQuotes || []).length >= 5 },
  // 특별
  { id: "earlybird", e: "🐦", t: "이른 새", d: "아침 8시 전에 기록", cat: "special", ok: (D) => D.list.some((e) => e.updatedAt && new Date(e.updatedAt).getHours() < 8) },
  { id: "nightowl", e: "🦉", t: "밤의 위로", d: "새벽(0~5시)에 기록", cat: "special", ok: (D) => D.list.some((e) => e.updatedAt && new Date(e.updatedAt).getHours() < 5) },
  { id: "weekend", e: "🌅", t: "주말에도", d: "토·일 모두 기록한 적 있어요", cat: "special", ok: (D) => { const s = new Set(D.list.filter((e) => e.mood).map((e) => new Date(e.date + "T00:00:00").getDay())); return s.has(0) && s.has(6); } },
  { id: "myquote", e: "🖊️", t: "나만의 한마디", d: "나만의 문구를 추가", cat: "special", ok: () => (settings.myQuotes || []).length >= 1 },
];
// 레벨 — 획득한 배지 수가 목표에 도달하면 레벨업
const LEVELS = [
  { min: 0,  name: "씨앗",     emoji: "🌰" },
  { min: 3,  name: "새싹",     emoji: "🌱" },
  { min: 6,  name: "잎새",     emoji: "🍃" },
  { min: 10, name: "꽃봉오리", emoji: "🌷" },
  { min: 15, name: "꽃",       emoji: "🌸" },
  { min: 21, name: "나무",     emoji: "🌳" },
  { min: 28, name: "숲",       emoji: "🌲" },
  { min: 36, name: "별빛",     emoji: "🌟" },
  { min: 45, name: "우주",     emoji: "🌌" },
];
function levelInfo(n) {
  let idx = 0; LEVELS.forEach((l, i) => { if (n >= l.min) idx = i; });
  const cur = LEVELS[idx], next = LEVELS[idx + 1];
  const prog = next ? Math.min(100, Math.round(((n - cur.min) / (next.min - cur.min)) * 100)) : 100;
  return { idx, level: idx + 1, cur, next, prog };
}
function badgeData() { const entries = loadEntries(), list = sortedEntries(entries); return { total: list.length, list, streak: calcStreak(entries), chs: loadChs() }; }
function earnedBadgeIds() { const D = badgeData(); return BADGES.filter((b) => b.ok(D)).map((b) => b.id); }
function renderBadges() {
  const earned = new Set(earnedBadgeIds());
  const n = earned.size, total = BADGES.length, pct = Math.round((n / total) * 100);
  const lv = levelInfo(n);
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set("badgeRate", `배지 ${n}/${total}`);
  set("levelEmoji", lv.cur.emoji);
  set("levelName", `Lv.${lv.level} ${lv.cur.name}`);
  set("levelNext", lv.next ? `다음 '${lv.next.name}'까지 배지 ${lv.next.min - n}개` : "최고 레벨 달성! 🎉");
  const fill = document.getElementById("badgeBarFill");
  if (fill) fill.style.width = lv.prog + "%"; // 다음 레벨까지의 진행도
  set("badgeStatus", n === total
    ? "🎉 모든 배지를 모았어요! 정말 대단해요."
    : n === 0 ? "첫 배지를 향해 한 걸음씩 🌱"
    : `획득률 ${pct}% · ${total - n}개 남았어요`);
  const nb = document.getElementById("badgeNext");
  if (nb) { const nextB = BADGES.find((b) => !earned.has(b.id)); nb.innerHTML = nextB ? `🎯 다음 배지 <b>${nextB.e} ${nextB.t}</b> · ${nextB.d}` : "✨ 더 이상 모을 배지가 없어요!"; }
  // 카테고리 탭(세그) — 선택한 카테고리만 표시
  const seg = document.getElementById("badgeSeg");
  if (seg) seg.innerHTML = BADGE_CATS.map((c) => {
    const items = BADGES.filter((b) => b.cat === c.id);
    const got = items.filter((b) => earned.has(b.id)).length;
    return `<button data-bcat="${c.id}" class="${c.id === badgeCat ? "active" : ""}">${c.label} ${got}/${items.length}</button>`;
  }).join("");
  const badgeHtml = (b) => `<button class="badge ${earned.has(b.id) ? "earned" : "locked"}" data-bid="${b.id}" aria-label="${b.t} — ${b.d}"><span class="badge-emoji">${b.e}</span><span class="badge-title">${b.t}</span></button>`;
  const items = BADGES.filter((b) => b.cat === badgeCat);
  const sorted = [...items].sort((a, b) => (earned.has(b.id) ? 1 : 0) - (earned.has(a.id) ? 1 : 0));
  document.getElementById("badgeGrid").innerHTML = `<div class="badge-grid">${sorted.map(badgeHtml).join("")}</div>`;
}
let badgeCat = "record";
document.getElementById("badgeSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-bcat]"); if (!b) return;
  Sound.tap(); badgeCat = b.dataset.bcat; renderBadges();
});
// 배지 탭 → 설명 즉시 표시 (토스트 큐를 거치지 않아 지연 없음)
document.getElementById("badgeGrid").addEventListener("click", (e) => {
  const el = e.target.closest(".badge[data-bid]"); if (!el) return;
  const b = BADGES.find((x) => x.id === el.dataset.bid); if (!b) return;
  Sound.tap();
  const got = new Set(earnedBadgeIds()).has(b.id);
  const d = document.getElementById("badgeDetail");
  if (d) { d.innerHTML = `<b>${b.e} ${b.t}</b> <span class="${got ? "bd-got" : "bd-no"}">${got ? "획득 ✓" : "아직"}</span> — ${b.d}`; d.classList.remove("pulse"); void d.offsetWidth; d.classList.add("pulse"); }
});
/* 습관 ↔ 기분 상관관계 */
function renderCorrelation(entries) {
  const body = document.getElementById("corrBody");
  const moodByDate = {};
  Object.values(entries).forEach((e) => { if (e.date && e.mood) moodByDate[e.date] = entryScore(e); }); // 0-100
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
    const up = diff >= 6, down = diff <= -6;
    const sign = diff >= 0 ? "▲" : "▼";
    const msg = up ? `한 날 기분이 평균 <b>${Math.round(diff)}점 더 높아요</b> 🌿`
      : down ? `한 날이 오히려 조금 낮았어요. 부담이 됐다면 가볍게 조절해도 좋아요.`
      : `기분 차이는 크지 않아요.`;
    return `<div class="corr-row">
      <div class="corr-top"><span>${h.emoji} ${escapeHtml(h.title)}</span><span class="corr-diff ${up ? "up" : down ? "down" : ""}">${sign}${Math.round(Math.abs(diff))}</span></div>
      <div class="corr-detail">한 날 ⌀${Math.round(ad)} · 안 한 날 ⌀${Math.round(an)} — ${msg}</div>
      <div class="corr-meta">표본 n=${n} · 효과크기(Cohen's d) ${d.toFixed(2)} (${effectLabel(d)})</div>
    </div>`;
  }).join("");
  body.innerHTML += `<p class="sci-note">📚 이 분석은 <b>관찰적 상관</b>이며 인과를 뜻하지 않아요. 효과크기는 Cohen's d 기준(0.2 작음·0.5 중간·0.8 큼; Cohen, 1988), 행동활성화·습관 연구(Mazzucchelli 2010; Lally 2010)에 근거해 해석을 돕습니다.</p>`;
}
// 습관 실천 매트릭스 — 최근 14일 × 습관별 실천 히트맵 (옵시디언/깃 잔디 기법)
// 생각의 지도 — 일기·회고 단어 연결망(옵시디언식). 토크나이즈 + 동시출현 + 포스 레이아웃 (실시간 AI 불필요)
const KO_STOP = new Set(["그냥", "너무", "정말", "진짜", "오늘", "내일", "어제", "그리고", "그래서", "하지만", "근데", "그런데", "조금", "약간", "매우", "아주", "그게", "거의", "계속", "자꾸", "왠지", "뭔가", "이런", "저런", "그런", "어떤", "무슨", "많이", "조금씩", "하루", "사람", "생각", "마음", "기분", "느낌", "그래", "역시", "되게", "엄청", "진짜로", "그치만", "이제", "아직", "벌써", "다시", "내가", "나는", "나도", "너무너무", "그냥저냥", "열심히", "이번", "그때", "한번", "조금더", "정도", "여러", "이거", "저거", "그거", "우리", "너희", "약간씩", "어차피", "혹시", "아무", "위해", "통해", "대해"]);
// 의존명사(곳·것·거·수…) + 1글자 조사 = 내용 없는 2글자 토큰('곳이','것을'…) 정밀 제거.
// 형태소 분석기 없이 '아이·휴가·포도'(의존명사 아님)는 보존하면서 '곳이'류만 걸러냄.
const KO_BOUND = new Set(["곳", "것", "거", "수", "때", "데", "중", "줄", "점", "등", "뿐", "채", "바", "축", "측", "분"]);
const KO_JOSA1 = new Set(["은", "는", "이", "가", "을", "를", "에", "의", "도", "만", "와", "과", "로", "랑", "요", "야", "지"]);
function isBoundJosa(w) { return w.length === 2 && KO_BOUND.has(w[0]) && KO_JOSA1.has(w[1]); }
function stripJosa(w) {
  if (w.length <= 2) return w;
  const j = ["으로서", "으로써", "에서는", "에게서", "이라는", "에서도", "으로", "에게", "한테", "에서", "까지", "부터", "보다", "처럼", "만큼", "라고", "이라고", "은", "는", "이", "가", "을", "를", "에", "의", "도", "만", "와", "과", "로"];
  for (const s of j) { if (w.length - s.length >= 2 && w.endsWith(s)) return w.slice(0, -s.length); }
  return w;
}
// 가벼운 동사/형용사(내용 적음) — 기본형으로 환원돼도 노드에선 제외
const KO_LIGHT_VERB = new Set(["하다", "되다", "있다", "없다", "같다", "싶다", "그렇다", "이렇다", "저렇다", "어떻다", "드리다", "시키다", "버리다"]);
// ㅆ받침 축약 과거(거의 항상 동사) → 어간 끝 음절 복원
const VERB_CONTRACT = { "했": "하", "갔": "가", "왔": "오", "봤": "보", "됐": "되", "줬": "주", "썼": "쓰", "잤": "자", "났": "나", "탔": "타", "섰": "서", "켰": "켜", "폈": "펴", "쳤": "치", "셨": "시", "꼈": "끼", "웠": "우" };
// 동사·형용사 활용형을 기본형(어간+다)으로. 명사 훼손을 막으려 '과거(았/었/였)·축약과거'처럼
// 명사가 절대 갖지 않는 형태만 환원한다(고정밀). 그 외(명사·현재형)는 건드리지 않음.
function lemmaKo(w) {
  if (w.length < 2) return w;
  const m = w.match(/^(.+?)(았|었|였)(.*)$/);          // 명시적 과거 음절
  if (m && m[1].length >= 1) return m[1] + "다";
  const m2 = w.match(/^(.*)(했|갔|왔|봤|됐|줬|썼|잤|났|탔|섰|켰|폈|쳤|셨|꼈|웠)(어요|어|다|지|고|네|는데|으니|어서)?$/); // 축약 과거
  if (m2) return m2[1] + VERB_CONTRACT[m2[2]] + "다";
  return w;
}
// 중요한 1글자 명사(돈·일·집…)는 길이 필터에서 살리고, '돈이/돈을'도 '돈'으로 복원.
const KO_KEEP1 = new Set(["돈", "일", "집", "잠", "밥", "몸", "술", "글", "꿈", "빚", "약", "책", "옷", "길", "힘", "땀", "봄", "빵", "꽃", "짐", "숲", "땅", "말", "비", "복", "정"]);
const KO_JOSA_SET = new Set(["으로서", "으로써", "에서는", "에게서", "으로", "에게", "한테", "에서", "까지", "부터", "처럼", "만큼", "이랑", "은", "는", "이", "가", "을", "를", "에", "의", "도", "만", "와", "과", "로", "랑"]);
// 일기에 잦은 1글자 동사 어간(연결어미까지 기본형화). 명사 충돌이 적은 것만 화이트리스트.
const KO_VERB1 = new Set(["벌", "울", "살", "놀", "쉬", "빌", "졸"]);
const KO_CONN = new Set(["어", "아", "여", "었", "았", "였", "고", "지", "게", "니", "면", "서", "자", "어요", "아요", "었어", "았어", "어서", "아서", "어야", "아야", "는데", "으니", "으면", "어라", "려고", "는다"]);
function tokenizeKo(txt) {
  const raw = txt.toLowerCase().replace(/[^가-힣a-z0-9\s]/g, " ").split(/\s+/);
  const out = [];
  for (let t of raw) {
    t = stripJosa(t.trim()); if (!t) continue;
    // 1글자 동사 어간 + 연결어미('벌어'→'벌다') — 화이트리스트라 명사('언어' 등) 안전
    if (t.length >= 2 && KO_VERB1.has(t[0]) && KO_CONN.has(t.slice(1))) { const lv = t[0] + "다"; if (!KO_LIGHT_VERB.has(lv)) out.push(lv); continue; }
    // 중요 1글자 명사 복원('돈'·'돈이'·'돈으로' → '돈')
    if (KO_KEEP1.has(t)) { out.push(t); continue; }
    if (t.length >= 2 && KO_KEEP1.has(t[0]) && KO_JOSA_SET.has(t.slice(1))) { out.push(t[0]); continue; }
    // 동사/형용사 과거형 → 기본형으로 보존(가벼운 동사는 제외)
    const lem = lemmaKo(t);
    if (lem !== t && lem.endsWith("다")) { if (lem.length >= 2 && !KO_STOP.has(lem) && !KO_LIGHT_VERB.has(lem)) out.push(lem); continue; }
    // 명사 등 일반 토큰: 어미 조각(요·서·게·고…로 끝남)·의존명사·숫자 제거
    if (t.length >= 2 && !KO_STOP.has(t) && !isBoundJosa(t) && !/^\d+$/.test(t) && !/^[a-z]$/.test(t) && !/[다요서게고죠네음임며좀]$/.test(t)) out.push(t);
  }
  return out;
}
function layoutGraph(nodes, edges, W, H) {
  const n = nodes.length; if (!n) return;
  const k = Math.sqrt((W * H) / n);                 // 이상 거리(노드 간 간격)
  nodes.forEach((nd, i) => { const a = 2 * Math.PI * i / n; nd.x = W / 2 + Math.cos(a) * W * 0.34; nd.y = H / 2 + Math.sin(a) * H * 0.34; });
  let temp = W * 0.16;
  for (let it = 0; it < 340; it++) {
    nodes.forEach((v) => { v.dx = 0; v.dy = 0; });
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {   // 반발(강하게) — 뭉침 방지
      const v = nodes[i], u = nodes[j];
      let dx = v.x - u.x, dy = v.y - u.y, dist = Math.hypot(dx, dy) || 0.01;
      const f = k * k / dist * 2.0, fx = dx / dist * f, fy = dy / dist * f;
      v.dx += fx; v.dy += fy; u.dx -= fx; u.dy -= fy;
    }
    edges.forEach((e) => {                                          // 인력(약하게) — 가깝지만 겹치지 않게
      const v = nodes[e.a], u = nodes[e.b];
      let dx = v.x - u.x, dy = v.y - u.y, dist = Math.hypot(dx, dy) || 0.01;
      const f = dist * dist / k * (0.14 + Math.min(2, e.w) * 0.05);
      const fx = dx / dist * f, fy = dy / dist * f;
      v.dx -= fx; v.dy -= fy; u.dx += fx; u.dy += fy;
    });
    nodes.forEach((v) => {
      let d = Math.hypot(v.dx, v.dy) || 0.01;
      v.x += v.dx / d * Math.min(d, temp); v.y += v.dy / d * Math.min(d, temp);
      v.x += (W / 2 - v.x) * 0.005; v.y += (H / 2 - v.y) * 0.005;   // 약한 중심 중력
      v.x = Math.max(22, Math.min(W - 22, v.x)); v.y = Math.max(20, Math.min(H - 26, v.y));
    });
    temp *= 0.985;
  }
}
// TextRank — 단어 동시출현 그래프에 PageRank. '연결이 많은 중심 단어'를 띄움(빈번한 핵심어를 죽이지 않음).
function textRank(words, adjW) {
  const N = words.length; if (!N) return {};
  const idx = {}; words.forEach((w, i) => idx[w] = i);
  const outw = words.map((w) => { let s = 0; const nb = adjW[w] || {}; for (const k in nb) s += nb[k]; return s; });
  let pr = new Array(N).fill(1 / N); const d = 0.85;
  for (let it = 0; it < 30; it++) {
    const np = new Array(N).fill((1 - d) / N);
    for (let i = 0; i < N; i++) { const nb = adjW[words[i]] || {}; if (outw[i] <= 0) continue; for (const k in nb) { const j = idx[k]; if (j != null) np[j] += d * pr[i] * nb[k] / outw[i]; } }
    pr = np;
  }
  const res = {}; words.forEach((w, i) => res[w] = pr[i]); return res;
}
// Louvain(1차 지역이동) — 모듈러리티 최적화로 노드를 주제 묶음(커뮤니티)으로 군집화.
function louvainCommunities(n, edges) {
  if (!n) return [];
  const deg = new Array(n).fill(0), nbr = Array.from({ length: n }, () => ({})); let m2 = 0;
  edges.forEach(({ a, b, w }) => { const ww = w || 1; deg[a] += ww; deg[b] += ww; m2 += 2 * ww; nbr[a][b] = (nbr[a][b] || 0) + ww; nbr[b][a] = (nbr[b][a] || 0) + ww; });
  const comm = new Array(n).fill(0).map((_, i) => i);
  if (m2 === 0) return comm.map(() => 0);
  const tot = deg.slice();
  let improved = true, guard = 0;
  while (improved && guard++ < 40) {
    improved = false;
    for (let i = 0; i < n; i++) {
      const ci = comm[i]; tot[ci] -= deg[i];
      const wTo = {}; for (const j in nbr[i]) { const cj = comm[j]; wTo[cj] = (wTo[cj] || 0) + nbr[i][j]; }
      let best = ci, bestGain = (wTo[ci] || 0) - tot[ci] * deg[i] / m2;
      for (const c in wTo) { const gain = wTo[c] - tot[c] * deg[i] / m2; if (gain > bestGain) { bestGain = gain; best = +c; } }
      tot[best] += deg[i]; if (best !== ci) { comm[i] = best; improved = true; }
    }
  }
  const map = {}; let k = 0; return comm.map((c) => { if (map[c] == null) map[c] = k++; return map[c]; });
}
const CLUSTER_COLORS = ["#6fc3ad", "#e8a87c", "#9ab0e0", "#e6c25a", "#c79ad6", "#86c98e", "#e8949f", "#8fd0d6", "#d8b48f", "#a0a8c8"];
function clusterColor(c) { const L = CLUSTER_COLORS.length; return CLUSTER_COLORS[(((c || 0) % L) + L) % L]; }
// 주제 묶음 범례 — 군집별 대표 단어(가장 자주 쓴 단어)를 색칩으로. 군집이 2개 이상일 때만.
function wwClusterLegend(nodes) {
  const by = {};
  nodes.forEach((nd) => { (by[nd.comm] = by[nd.comm] || []).push(nd); });
  const comms = Object.keys(by);
  if (comms.length < 2) return "";
  const chips = comms.map((c) => { const rep = by[c].slice().sort((a, b) => b.f - a.f)[0]; return `<span class="ww-cl"><i style="background:${clusterColor(+c)}"></i>${escapeHtml(rep.w)}</span>`; }).join("");
  return `<div class="ww-clusters">${chips}</div>`;
}
// Cytoscape를 필요할 때만 로드(초기 로딩 가볍게 유지). SW가 precache하므로 오프라인도 OK.
let _cyLoading = false;
function ensureCytoscape(cb) {
  if (window.cytoscape) return cb(true);
  if (_cyLoading) return; // 로딩 중이면 onload에서 다시 그림
  _cyLoading = true;
  const s = document.createElement("script"); s.src = "vendor/cytoscape.min.js";
  s.onload = () => { _cyLoading = false; cb(true); };
  s.onerror = () => { _cyLoading = false; cb(false); };
  document.head.appendChild(s);
}
function renderWordWeb(entries) {
  const el = document.getElementById("wordWeb"); if (!el) return;
  const docs = [];
  Object.values(entries).forEach((e) => {
    const txt = [e.note, e.praise, e.reflection && e.reflection.good, e.reflection && e.reflection.hard].filter(Boolean).join(" ");
    if (!txt.trim()) return;
    const ws = [...new Set(tokenizeKo(txt))];
    if (ws.length) docs.push({ words: ws, score: entryScore(e), date: e.date || "" });
  });
  if (docs.length < 2) { el.innerHTML = '<p class="empty">일기·회고를 더 적으면 자주 쓴 단어들의 연결망을 그려드려요 🕸️</p>'; el._wwData = null; return; }
  docs.sort((a, b) => a.date < b.date ? -1 : 1); // 오래된 → 최근
  // 노드 선정 = 빈도 + 최근 가중치. 새로 쓴 단어가 오래된 단어에 묻혀 안 보이는 문제를 막는다.
  const freq = {}, mSum = {}, mN = {}, wt = {}, adjW = {};
  docs.forEach((d, i) => {
    const rec = 1 + (docs.length > 1 ? i / (docs.length - 1) : 0); // 최근 글일수록 최대 2배 가중
    d.words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; wt[w] = (wt[w] || 0) + rec; if (d.score != null) { mSum[w] = (mSum[w] || 0) + d.score; mN[w] = (mN[w] || 0) + 1; } });
    // 전체 단어 동시출현(같은 글) → TextRank용 인접 가중치
    const us = d.words;
    for (let a = 0; a < us.length; a++) for (let b = a + 1; b < us.length; b++) {
      (adjW[us[a]] = adjW[us[a]] || {})[us[b]] = (adjW[us[a]][us[b]] || 0) + 1;
      (adjW[us[b]] = adjW[us[b]] || {})[us[a]] = (adjW[us[b]][us[a]] || 0) + 1;
    }
  });
  // 노드 선정 = TextRank(중심성) × 최근 가중치. 흔하기만 한 단어 대신 '중심적인 단어'를 띄움.
  const allWords = Object.keys(freq);
  const pr = textRank(allWords, adjW);
  const recF = (w) => (wt[w] / freq[w]); // 1~2 (최근일수록↑)
  const top = allWords.sort((a, b) => (pr[b] * recF(b)) - (pr[a] * recF(a))).slice(0, 16);
  if (top.length < 3) { el.innerHTML = '<p class="empty">단어가 더 모이면 연결망을 보여드려요 🕸️</p>'; el._wwData = null; return; }
  const idx = {}; top.forEach((w, i) => idx[w] = i);
  const nodes = top.map((w) => ({ w, f: freq[w], score: mN[w] ? mSum[w] / mN[w] : 50 }));
  const ew = {};
  docs.forEach((d) => { const us = d.words.filter((w) => idx[w] != null); for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) { const a = idx[us[i]], b = idx[us[j]], key = a < b ? a + "-" + b : b + "-" + a; ew[key] = (ew[key] || 0) + 1; } });
  let edges = Object.entries(ew).map(([key, w]) => { const [a, b] = key.split("-").map(Number); return { a, b, w }; });
  edges.sort((a, b) => b.w - a.w); const drawDirect = edges.slice(0, 28); // 직접 동시출현(같은 날 함께 쓴 단어)
  // 2차 연결(분포 유사도): 직접 동시출현이 없어도 '공통 이웃'이 많으면 의미상 관련 → 약한 점선 연결
  // 예) '돈'과 '벌다'가 둘 다 '회사·야근'과 함께 쓰였다면, 서로 안 만났어도 이어줌.
  const nbr = top.map((w) => new Set(adjW[w] ? Object.keys(adjW[w]) : []));
  const directKey = new Set(drawDirect.map((e) => e.a + "-" + e.b));
  const sim = [];
  for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) {
    if (directKey.has(i + "-" + j)) continue;
    let common = 0; nbr[j].forEach((w) => { if (nbr[i].has(w)) common++; });
    if (common >= 2) sim.push({ a: i, b: j, w: common, sim: true });
  }
  sim.sort((a, b) => b.w - a.w);
  const drawEdges = drawDirect.concat(sim.slice(0, 14)); // 직접 + 2차(상위 14)
  const deg = nodes.map(() => 0); drawEdges.forEach((e) => { deg[e.a]++; deg[e.b]++; }); const maxDeg = Math.max(1, ...deg);
  const maxF = Math.max(...nodes.map((nd) => nd.f));
  // Louvain 군집 → 주제 묶음별 색. (직접+2차 연결 기준으로 묶어 관련 단어가 같은 색)
  const comm = louvainCommunities(nodes.length, drawEdges);
  nodes.forEach((nd, i) => nd.comm = comm[i] || 0);
  el._wwData = { nodes, edges, drawEdges, deg, maxF, maxDeg };
  // 인터랙티브(Cytoscape)가 가능하면 그걸로, 아니면 SVG로 폴백(오프라인·테스트 안전)
  if (window.cytoscape) { renderWordWebCy(el); return; }
  renderWordWebSvg(el);
  ensureCytoscape((ok) => { if (ok && el.isConnected && el._wwData) renderWordWebCy(el); });
}
function renderWordWebSvg(el) {
  const dt = el._wwData; if (!dt) return;
  const { nodes, edges, drawEdges, deg, maxF, maxDeg } = dt;
  const W = 320, H = 300; layoutGraph(nodes, edges, W, H);
  const maxW = Math.max(1, ...drawEdges.map((e) => e.w));
  const edgeSvg = drawEdges.map((e) => {
    const a = nodes[e.a], b = nodes[e.b], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const nx = -(b.y - a.y), ny = (b.x - a.x), nl = Math.hypot(nx, ny) || 1, bend = Math.hypot(b.x - a.x, b.y - a.y) * 0.12;
    const cx = (mx + nx / nl * bend).toFixed(1), cy = (my + ny / nl * bend).toFixed(1);
    return `<path class="ww-edge${e.sim ? " ww-edge-sim" : ""}" data-a="${e.a}" data-b="${e.b}" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${cx} ${cy} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" stroke-width="${(0.5 + e.w / maxW * 2.4).toFixed(1)}" fill="none"/>`;
  }).join("");
  const nodeSvg = nodes.map((nd, i) => {
    const r = (6 + nd.f / maxF * 9 + deg[i] / maxDeg * 7), fs = (8.5 + nd.f / maxF * 4.5).toFixed(1);
    const major = i < 8;
    return `<g class="ww-node${major ? " major" : ""}" data-wi="${i}"><circle cx="${nd.x.toFixed(1)}" cy="${nd.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${clusterColor(nd.comm)}"/><text x="${nd.x.toFixed(1)}" y="${(nd.y + r + 9).toFixed(1)}" class="ww-label" font-size="${fs}">${escapeHtml(nd.w)}</text></g>`;
  }).join("");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="ww-svg" role="img" aria-label="일기 단어 연결망">${edgeSvg}${nodeSvg}</svg>${wwClusterLegend(nodes)}<p class="hint" style="margin-top:8px">원=단어 · <b>색=주제 묶음</b> · <b>실선</b>=함께 쓴 단어 · <b>점선</b>=비슷한 맥락(공통 이웃). 단어를 누르면 관련 단어만 또렷해져요.</p>`;
  const svg = el.querySelector(".ww-svg");
  svg.addEventListener("click", (ev) => {
    const g = ev.target.closest(".ww-node");
    if (!g) { svg.classList.remove("focused"); svg.querySelectorAll(".on").forEach((x) => x.classList.remove("on")); return; }
    const wi = +g.dataset.wi, nb = new Set([wi]);
    drawEdges.forEach((e) => { if (e.a === wi) nb.add(e.b); if (e.b === wi) nb.add(e.a); });
    svg.classList.add("focused");
    svg.querySelectorAll(".ww-node").forEach((nn) => nn.classList.toggle("on", nb.has(+nn.dataset.wi)));
    svg.querySelectorAll(".ww-edge").forEach((ee) => ee.classList.toggle("on", +ee.dataset.a === wi || +ee.dataset.b === wi));
    Sound.tap();
  });
}
// 인터랙티브 연결망 — 드래그·확대축소·탭하면 이웃 강조 (옵시디언 느낌)
function renderWordWebCy(el) {
  const dt = el._wwData; if (!dt || !window.cytoscape) { renderWordWebSvg(el); return; }
  const { nodes, drawEdges, deg, maxF, maxDeg } = dt;
  if (el._cy) { try { el._cy.destroy(); } catch (e) {} el._cy = null; }
  el.innerHTML = `<div class="ww-cy" id="wwCy"></div>${wwClusterLegend(nodes)}<p class="hint" style="margin-top:8px">원=단어(클수록 자주·연결 많음) · <b>색=주제 묶음</b>(자동 군집) · 선=같은 날 함께 쓴 단어. 드래그·확대하고, 단어를 누르면 <b>관련된 단어만</b> 선으로 이어 보여줘요. 빈 곳을 누르면 전체로.</p>`;
  const host = el.querySelector("#wwCy");
  const cs = getComputedStyle(document.documentElement);
  const ink = (cs.getPropertyValue("--ink") || "#4a4a42").trim();
  const bg = (cs.getPropertyValue("--bg") || "#ffffff").trim();
  const edgeCol = (cs.getPropertyValue("--line-strong") || "#cdd6cf").trim();
  const accent = (cs.getPropertyValue("--accent") || "#5ec8b0").trim();
  const maxW = Math.max(1, ...drawEdges.map((e) => e.w));
  const els = nodes.map((nd, i) => ({ data: { id: "n" + i, label: nd.w, col: clusterColor(nd.comm), size: Math.round(18 + nd.f / maxF * 24 + deg[i] / maxDeg * 16) } }))
    .concat(drawEdges.map((e, i) => ({ data: { id: "e" + i, source: "n" + e.a, target: "n" + e.b, w: (1 + e.w / maxW * 4), sim: e.sim ? 1 : 0 } })));
  const cy = window.cytoscape({
    container: host, elements: els,
    style: [
      { selector: "node", style: { "background-color": "data(col)", "width": "data(size)", "height": "data(size)", "label": "data(label)", "font-size": 11, "font-family": "inherit", "color": ink, "text-valign": "bottom", "text-margin-y": 3, "text-outline-width": 2, "text-outline-color": bg, "min-zoomed-font-size": 6, "transition-property": "opacity, background-color", "transition-duration": "0.2s" } },
      { selector: "edge", style: { "width": "data(w)", "line-color": edgeCol, "curve-style": "bezier", "opacity": 0.5, "transition-property": "opacity, line-color, width", "transition-duration": "0.25s" } },
      { selector: "edge[sim = 1]", style: { "line-style": "dashed", "opacity": 0.32, "width": 1.5 } }, // 2차 연결(비슷한 맥락)은 점선
      { selector: "node.ww-faded", style: { "opacity": 0.1, "text-opacity": 0.1 } },
      { selector: "edge.ww-hide", style: { "opacity": 0, "events": "no" } },     // 그룹핑 아닌 선은 완전히 숨김
      { selector: "edge.ww-hl", style: { "line-color": accent, "opacity": 0.95, "width": 3 } }, // 그룹핑 선만 강조
      { selector: "node.ww-pick", style: { "border-width": 3, "border-color": accent } },
    ],
    layout: { name: "cose", animate: false, padding: 16, nodeRepulsion: 9000, idealEdgeLength: 70, gravity: 0.35, numIter: 700 },
    minZoom: 0.4, maxZoom: 2.6, wheelSensitivity: 0.2, autoungrabify: false,
  });
  el._cy = cy;
  cy.on("tap", "node", (ev) => {
    const n = ev.target;
    const incident = n.connectedEdges();          // 누른 단어에 직접 이어진 선 = '그룹핑'
    const group = n.closedNeighborhood().nodes();  // 누른 단어 + 직접 연결된 단어들
    cy.batch(() => {
      cy.nodes().addClass("ww-faded"); group.removeClass("ww-faded");
      cy.edges().addClass("ww-hide").removeClass("ww-hl"); // 일단 모든 선 숨김
      incident.removeClass("ww-hide").addClass("ww-hl");   // 그룹핑 선만 다시 표시·강조
      cy.nodes().removeClass("ww-pick"); n.addClass("ww-pick");
    });
    // 인터랙티브 감성: 선택한 그룹으로 부드럽게 포커스 + 노드 펄스
    try { cy.animate({ fit: { eles: n.closedNeighborhood(), padding: 48 } }, { duration: 420, easing: "ease-in-out-cubic" }); } catch (e) {}
    try { n.animate({ style: { "border-width": 9 } }, { duration: 170 }).animate({ style: { "border-width": 3 } }, { duration: 320 }); } catch (e) {}
    if (window.Sound) Sound.tap();
  });
  cy.on("tap", (ev) => {
    if (ev.target !== cy) return;
    cy.batch(() => { cy.nodes().removeClass("ww-faded ww-pick"); cy.edges().removeClass("ww-hide ww-hl"); });
    try { cy.animate({ fit: { eles: cy.elements(), padding: 18 } }, { duration: 380, easing: "ease-in-out-cubic" }); } catch (e) {}
  });
  // 접힌 카드/숨은 패널에서 0크기로 초기화될 수 있어, 보일 때 크기를 다시 잡는다
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => { if (host.offsetWidth > 4 && host.offsetHeight > 4) { try { cy.resize(); cy.fit(undefined, 18); } catch (e) {} } });
    ro.observe(host);
  } else { setTimeout(() => { try { cy.resize(); cy.fit(undefined, 18); } catch (e) {} }, 300); }
}
function renderHabitHeatmap() {
  const el = document.getElementById("habitHeatmap"); if (!el) return;
  const chs = loadChs();
  if (!chs.length) { el.innerHTML = '<p class="empty">습관을 만들면 실천 흐름을 한눈에 보여드려요.</p>'; return; }
  const N = 14, days = [];
  for (let i = N - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(todayKey(d)); }
  const dowNames = ["일", "월", "화", "수", "목", "금", "토"];
  const head = `<div class="hm-row hm-head"><span class="hm-name"></span><div class="hm-cells">${days.map((k) => {
    const d = new Date(k + "T00:00:00");
    return `<span class="hm-dlabel">${d.getDate() === 1 || k === days[0] ? (d.getMonth() + 1) + "/" + d.getDate() : ""}</span>`;
  }).join("")}</div></div>`;
  const rows = chs.map((h) => {
    const cells = days.map((k) => {
      const before = k < h.startDate;
      const done = !!(h.done && h.done[k]);
      const cls = before ? "hm-na" : done ? "hm-on" : "hm-off";
      const lbl = before ? "" : done ? "✓" : "";
      return `<span class="hm-cell ${cls}" title="${k} ${done ? "실천" : before ? "" : "미실천"}">${lbl}</span>`;
    }).join("");
    const total = days.filter((k) => k >= h.startDate).length;
    const did = days.filter((k) => k >= h.startDate && h.done && h.done[k]).length;
    const rate = total ? Math.round(did / total * 100) : 0;
    return `<div class="hm-row"><span class="hm-name">${h.emoji} ${escapeHtml(h.title)}<i class="hm-rate">${rate}%</i></span><div class="hm-cells">${cells}</div></div>`;
  }).join("");
  el.innerHTML = `<div class="hm">${head}${rows}</div><p class="hint" style="margin-top:10px">진한 칸 = 실천한 날 · 최근 ${N}일</p>`;
}
// 분석 탭 '나에 대한 발견' — 의미 있는 발견을 결론 문장 + 근거 그래픽 카드로 자동 노출
function renderDiscoveries(entries, list) {
  const el = document.getElementById("discoveries"); if (!el) return;
  const moods = list.filter((e) => e.mood);
  if (moods.length < 3) { el.innerHTML = '<div class="card disc disc-empty"><p class="empty">기록이 3일 이상 쌓이면 나에 대한 발견을 찾아드려요 🌱</p></div>'; return; }
  const tk = todayKey(), cards = [];
  const barPair = (aLab, aVal, bLab, bVal) => {
    const mx = Math.max(aVal, bVal, 1);
    const row = (lab, val) => `<div class="db-row"><span class="db-lab">${lab}</span><div class="db-track"><i style="width:${Math.round(val / mx * 100)}%;background:${scoreColor(val)}"></i></div><b>${Math.round(val)}</b></div>`;
    return `<div class="disc-bars">${row(aLab, aVal)}${row(bLab, bVal)}</div>`;
  };
  const chip = (txt, val) => `<div class="disc-chip" style="background:${scoreColor(val)}">${txt}</div>`;
  // 1) 추세 (이번 주 vs 지난 주)
  const wk = [], pv = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); wk.push(todayKey(d)); }
  for (let i = 13; i >= 7; i--) { const d = new Date(); d.setDate(d.getDate() - i); pv.push(todayKey(d)); }
  const avg = (ks) => { const v = ks.map((k) => entries[k] && entries[k].mood ? entryScore(entries[k]) : null).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const aw = avg(wk), pw = avg(pv);
  if (aw != null && pw != null) { const d = aw - pw; if (Math.abs(d) >= 5) { const up = d > 0; cards.push({ sal: 60 + Math.abs(d), icon: up ? "📈" : "📉", title: up ? "이번 주, 지난주보다 기분이 좋아졌어요" : "이번 주는 조금 가라앉았어요", sub: up ? "잘 지내고 있다는 신호예요" : "스스로를 더 아껴줄 때예요 🫂", viz: barPair("지난주", pw, "이번주", aw), tone: up ? "good" : "soft" }); } }
  // 2) 가장 도움된 습관 (표본 5+/5+)
  const moodByDate = {}; moods.forEach((e) => moodByDate[e.date] = entryScore(e));
  const chs = (typeof loadChs === "function") ? loadChs() : [];
  chs.forEach((hh) => {
    const done = [], not = [];
    Object.keys(moodByDate).forEach((dt) => { if (dt < hh.startDate || dt > tk) return; (hh.done && hh.done[dt] ? done : not).push(moodByDate[dt]); });
    if (done.length >= 5 && not.length >= 5) {
      const ad = done.reduce((s, v) => s + v, 0) / done.length, an = not.reduce((s, v) => s + v, 0) / not.length, diff = ad - an;
      if (diff >= 6) cards.push({ sal: 70 + diff, icon: hh.emoji || "✅", title: `${escapeHtml(hh.title)} 한 날, 기분이 더 좋아요`, sub: `한 날 평균 ${Math.round(ad)}점 · 안 한 날 ${Math.round(an)}점`, viz: barPair("안 한 날", an, "한 날", ad), tone: "good" });
    }
  });
  // 3) 가장 평온한 요일×시간대 (표본 2+)
  const buckets = [{ k: "아침", lo: 5, hi: 11 }, { k: "오후", lo: 12, hi: 17 }, { k: "저녁", lo: 18, hi: 21 }, { k: "밤", lo: 22, hi: 4 }];
  const days = ["일", "월", "화", "수", "목", "금", "토"], slot = {};
  moods.forEach((e) => {
    if (!e.updatedAt || !e.date) return;
    const h = new Date(e.updatedAt).getHours();
    const bk = buckets.find((x) => x.lo <= x.hi ? (h >= x.lo && h <= x.hi) : (h >= x.lo || h <= x.hi));
    if (!bk) return; const di = new Date(e.date + "T00:00:00").getDay(), key = di + "|" + bk.k;
    (slot[key] = slot[key] || { s: 0, n: 0 }); slot[key].s += entryScore(e); slot[key].n++;
  });
  const slots = Object.entries(slot).map(([k, v]) => ({ k, avg: v.s / v.n, n: v.n })).filter((s) => s.n >= 2);
  if (slots.length) { slots.sort((x, y) => y.avg - x.avg); const t = slots[0], [di, bk] = t.k.split("|"); cards.push({ sal: 40 + (t.avg - 50), icon: "🗓️", title: `${days[di]}요일 ${bk}에 가장 평온해요`, sub: "이 시간을 나를 위해 비워두면 좋아요", viz: chip(`${days[di]} ${bk} · ⌀${Math.round(t.avg)}점`, t.avg), tone: "good" }); }
  // 4) 으뜸 감정 (최근 30일) — 감정은 점수와 분리, '빈도'만. 색은 감정 고유 정서가.
  const cut = new Date(); cut.setDate(cut.getDate() - 30); const tagC = {};
  moods.forEach((e) => { if (new Date(e.date + "T00:00:00") < cut) return; (e.tags || []).forEach((t) => tagC[t] = (tagC[t] || 0) + 1); });
  const tags = Object.entries(tagC).map(([t, n]) => ({ t, n })).filter((x) => x.n >= 2);
  if (tags.length) { tags.sort((x, y) => y.n - x.n); const t = tags[0]; const em = emoByKey(t.t); const cv = em && em.v != null ? em.v : 50; cards.push({ sal: 25 + t.n, icon: "🏷️", title: `요즘 자주 느낀 감정은 '${escapeHtml(t.t)}'`, sub: `최근 30일 ${t.n}번 느꼈어요`, viz: chip(`#${escapeHtml(t.t)} · ${t.n}회`, cv), tone: "" }); }
  // 5) 꾸준함
  const streak = calcStreak(entries); if (streak >= 3) cards.push({ sal: 30 + streak, icon: "🔥", title: `${streak}일 연속 기록 중이에요`, sub: "꾸준함이 마음 회복의 가장 큰 힘이에요", viz: "", tone: "good" });
  cards.sort((a, b) => b.sal - a.sal);
  const top = cards.slice(0, 4);
  if (!top.length) { el.innerHTML = '<div class="card disc disc-empty"><p class="empty">아직 뚜렷한 패턴은 없어요. 꾸준히 기록하면 곧 발견이 쌓여요 🌿</p></div>'; return; }
  el.innerHTML = top.map((c) => `<div class="card disc ${c.tone || ""}"><div class="disc-head"><span class="disc-ico">${c.icon}</span><div class="disc-body"><p class="disc-title">${c.title}</p><p class="disc-sub">${c.sub}</p></div></div>${c.viz || ""}</div>`).join("");
}
// 분석 탭 핵심 지표 4종 — 한눈에 들어오는 요약 숫자
function renderAnalyzeKpis(entries, list) {
  const el = document.getElementById("analyzeKpis"); if (!el) return;
  const moods = list.filter((e) => e.mood);
  const wk = [], pv = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); wk.push(todayKey(d)); }
  for (let i = 13; i >= 7; i--) { const d = new Date(); d.setDate(d.getDate() - i); pv.push(todayKey(d)); }
  const avg = (ks) => { const v = ks.map((k) => entries[k] && entries[k].mood ? entryScore(entries[k]) : null).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const a = avg(wk), b = avg(pv);
  const moodVal = a != null ? `<span style="color:${scoreColor(a)}">${Math.round(a)}</span>` : "—";
  let deltaHtml = "";
  if (a != null && b != null) { const d = Math.round(a - b); deltaHtml = `<i class="as-delta ${d > 0 ? "up" : d < 0 ? "down" : "flat"}">${d > 0 ? "▲" : d < 0 ? "▼" : "–"}${Math.abs(d)}</i>`; }
  const recDays = wk.filter((k) => entries[k] && entries[k].mood).length;
  const ens = wk.map((k) => entries[k]).filter((e) => e && e.energy);
  const enVal = ens.length ? (ens.reduce((s, e) => s + e.energy, 0) / ens.length).toFixed(1) : "—";
  const cut = new Date(); cut.setDate(cut.getDate() - 30);
  const tagCount = {};
  moods.forEach((e) => { if (new Date(e.date + "T00:00:00") < cut) return; (e.tags || []).forEach((t) => tagCount[t] = (tagCount[t] || 0) + 1); });
  const topTag = Object.entries(tagCount).sort((x, y) => y[1] - x[1])[0];
  const tile = (val, label) => `<div class="as-kpi"><span class="as-k-val">${val}</span><span class="as-k-lab">${label}</span></div>`;
  el.innerHTML = tile(moodVal + deltaHtml, "평균 기분") + tile(recDays + "일", "이번 주 기록") + tile(enVal, "평균 활력") + tile(topTag ? escapeHtml(topTag[0]) : "—", "으뜸 감정");
}
// 이번 주 한눈에 — 미니 통계 + 스파크라인
function renderWeekGlance(entries) {
  const el = document.getElementById("wgBody"); if (!el) return;
  const keys = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(todayKey(d)); }
  const recs = keys.map((k) => entries[k]).filter(Boolean);
  const moods = recs.filter((e) => e.mood);
  const rng = document.getElementById("wgRange");
  if (rng) { const a = keys[0].split("-"), b = keys[6].split("-"); rng.textContent = `${+a[1]}/${+a[2]} ~ ${+b[1]}/${+b[2]}`; }
  if (!moods.length) { el.innerHTML = '<p class="empty">이번 주 기록이 쌓이면 한눈에 요약해드려요 🌱</p>'; return; }
  const avg = moods.reduce((s, e) => s + entryScore(e), 0) / moods.length;
  const counts = {}; moods.forEach((e) => counts[e.mood] = (counts[e.mood] || 0) + 1);
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const en = recs.filter((e) => e.energy);
  const avgEn = en.length ? (en.reduce((s, e) => s + e.energy, 0) / en.length).toFixed(1) : "—";
  const chs = (typeof loadChs === "function") ? loadChs() : [];
  let ht = 0, hd = 0; chs.forEach((h) => keys.forEach((k) => { if (k >= h.startDate) { ht++; if (h.done && h.done[k]) hd++; } }));
  const habPct = ht ? Math.round(hd / ht * 100) : null;
  const hs = (b, s) => `<div class="hs"><b>${b}</b><span>${s}</span></div>`;
  el.innerHTML = `<div class="rpt-hero" style="margin:0">
    <div class="gauge-wrap">${moodGaugeSvg(avg)}</div>
    <div class="rpt-hero-side"><p class="rpt-hero-cap">이번 주 평균 기분</p><div class="hero-stats">${hs(recs.length, "기록일")}${hs(avgEn, "활력")}${habPct != null ? hs(`${habPct}%`, "습관") : hs(mInfo(top).emoji, "대표")}</div></div>
  </div>`;
}
// 습관 분석 한 줄 — 한눈에 카드/홈에서 가장 의미 있는 인사이트 1개 (기분 연관 > 모멘텀 > 꾸준함)
function topHabitInsight(ha) {
  if (!ha) return "";
  const nm = (r) => `${r.h.emoji || "✅"} <b>${escapeHtml(r.h.title)}</b>`;
  if (ha.moodLinked) return `${nm(ha.moodLinked)} 한 날 기분이 평균 <b>${ha.moodLinked.moodDiff}점</b> 더 좋았어요 <small class="ins-caveat">(상관일 뿐, 인과 아님)</small>`;
  if (ha.improved && ha.improved.momentum >= 15) return `${nm(ha.improved)} 요즘 더 살아나고 있어요 (▲${ha.improved.momentum}%)`;
  if (ha.declined && ha.declined.momentum <= -15) return `${nm(ha.declined)} 요즘 주춤해요 — 힘든 날엔 최소 버전부터`;
  if (ha.perfect && ha.perfect.length) return `${ha.perfect.map(nm).join(", ")} 최근 ${ha.perfect.length > 1 ? "모두 " : ""}꾸준히 지키고 있어요 🎉`;
  if (ha.mostConsistent) return `가장 꾸준한 습관은 ${nm(ha.mostConsistent)} · <b>${ha.mostConsistent.rate}%</b>`;
  return "";
}
// 최근 N일(현재)·직전 N일(비교) 키 배열 — 글랜스 인사이트용 분석 윈도
function recentWindowKeys(n) {
  const keys = [], prevKeys = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(todayKey(d)); }
  for (let i = 2 * n - 1; i >= n; i--) { const d = new Date(); d.setDate(d.getDate() - i); prevKeys.push(todayKey(d)); }
  return { keys, prevKeys };
}
// 습관 한눈에 — 오늘 화면·요약 서브탭 공용. 오늘 완료 체크 + 진행/연속 + 습관 분석 인사이트 한 줄.
function renderHabitGlanceInto(listId, countId) {
  const list = document.getElementById(listId); if (!list) return false;
  const wrap = list.closest("[data-hg-wrap]") || list.closest(".card");
  const chs = (typeof loadChs === "function") ? loadChs() : [];
  if (!chs.length) { if (wrap) wrap.hidden = true; return false; }
  if (wrap) wrap.hidden = false;
  const tk = todayKey();
  const doneToday = chs.filter((h) => h.done && h.done[tk]).length;
  const cnt = document.getElementById(countId);
  if (cnt) cnt.textContent = `오늘 ${doneToday}/${chs.length}${doneToday === chs.length ? " 🎉" : ""}`;
  // 분석 인사이트 — 최근 14일 데이터로 가장 의미 있는 한 줄
  const w = recentWindowKeys(14);
  const ha = computeHabitAnalysis(w.keys, w.prevKeys, (typeof loadEntries === "function") ? loadEntries() : {});
  const insTxt = topHabitInsight(ha);
  const insHtml = insTxt ? `<p class="hg-insight">💡 ${insTxt}</p>` : "";
  list.innerHTML = insHtml + chs.map((h) => {
    const doneCount = Object.values(h.done || {}).filter(Boolean).length;
    const todayDone = !!(h.done && h.done[tk]);
    let streak = 0; for (let i = 0; ; i++) { const d = new Date(); d.setDate(d.getDate() - i); const k = todayKey(d); if (k < h.startDate) break; if (h.done && h.done[k]) streak++; else if (i === 0) continue; else break; }
    const pct = Math.min(100, Math.round(doneCount / CH_TARGET * 100));
    return `<div class="hg-row">`
      + `<button class="hg-check ${todayDone ? "done" : ""}" data-hgcheck="${h.id}" aria-pressed="${todayDone}" aria-label="${escapeHtml(h.title)} 오늘 완료 ${todayDone ? "취소" : "체크"}">${todayDone ? "✓" : "○"}</button>`
      + `<div class="hg-info" data-hgopen="${h.id}" role="button" tabindex="0" aria-label="${escapeHtml(h.title)} 상세 보기">`
      + `<div class="hg-title">${h.emoji || "✅"} ${escapeHtml(h.title)}</div>`
      + `<div class="hg-bar"><i style="width:${pct}%"></i></div></div>`
      + `<span class="hg-meta">🔥${streak} · ${doneCount}/${CH_TARGET}</span></div>`;
  }).join("");
  return true;
}
function renderTodayHabitGlance() { renderHabitGlanceInto("todayHabitList", "todayHabitCount"); }
function renderSummaryHabitGlance() { renderHabitGlanceInto("summaryHabitList", "summaryHabitCount"); }
function refreshHabitGlances() { renderTodayHabitGlance(); renderSummaryHabitGlance(); }
// 습관 한눈에 카드 동작 — 오늘 완료 토글(어느 화면에서든) · 이름 누르면 상세
document.addEventListener("click", (e) => {
  const chk = e.target.closest("[data-hgcheck]");
  if (chk) { applyHabitAction("check", chk.dataset.hgcheck); return; }
  const open = e.target.closest("[data-hgopen]");
  if (open) { Sound.tap(); openHabitDetail(open.dataset.hgopen); }
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const open = e.target.closest("[data-hgopen]");
  if (open) { e.preventDefault(); Sound.tap(); openHabitDetail(open.dataset.hgopen); }
});
// 습관 요약 — 습관별 실천률(최근 30일) · 현재 연속 · 가장 잘 지키는 요일 (실천 패턴 분석)
function renderHabitSummary() {
  const el = document.getElementById("habitSummary"); if (!el) return;
  const chs = (typeof loadChs === "function") ? loadChs() : [];
  if (!chs.length) { el.innerHTML = '<p class="empty">습관을 만들면 실천률·연속·요일 패턴을 정리해드려요.</p>'; return; }
  const dowName = ["일", "월", "화", "수", "목", "금", "토"];
  const rows = chs.map((h) => {
    let total = 0, done = 0;
    for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() - i); const k = todayKey(d); if (k < h.startDate) continue; total++; if (h.done && h.done[k]) done++; }
    const rate = total ? Math.round(done / total * 100) : 0;
    let streak = 0; for (let i = 0; ; i++) { const d = new Date(); d.setDate(d.getDate() - i); const k = todayKey(d); if (k < h.startDate) break; if (h.done && h.done[k]) streak++; else if (i === 0) continue; else break; }
    const dow = [0, 0, 0, 0, 0, 0, 0];
    Object.keys(h.done || {}).forEach((k) => { if (h.done[k]) { const dt = new Date(k + "T00:00:00"); if (!isNaN(dt)) dow[dt.getDay()]++; } });
    const bestDow = dow.some((x) => x > 0) ? dowName[dow.indexOf(Math.max(...dow))] : null;
    return { h, rate, streak, bestDow };
  });
  rows.sort((a, b) => b.rate - a.rate);
  el.innerHTML = rows.map((r) => `<div class="hsum-row"><span class="hsum-name">${r.h.emoji || "✅"} ${escapeHtml(r.h.title)}</span>`
    + `<div class="hsum-bar-wrap"><div class="hsum-bar" style="width:${r.rate}%"></div></div>`
    + `<span class="hsum-rate">${r.rate}%</span>`
    + `<span class="hsum-meta">🔥${r.streak}${r.bestDow ? ` · ${r.bestDow}↑` : ""}</span></div>`).join("")
    + `<p class="hint" style="margin-top:10px">실천률=최근 30일 · 🔥=현재 연속 · 요일↑=가장 잘 지키는 요일.</p>`;
}
// 마음 리듬 — 요일(7) × 시간대(4) 평균 기분 히트맵 (요일별·시간대별 막대를 한 그래픽으로 통합)
// 가장자리 숫자로 요일·시간대 한계평균까지 제공 (Tufte식 punch-card + margins)
function renderRhythm(entries) {
  const el = document.getElementById("rhythmGrid"); if (!el) return;
  const buckets = [{ k: "아침", e: "🌅", lo: 5, hi: 11 }, { k: "오후", e: "☀️", lo: 12, hi: 17 }, { k: "저녁", e: "🌇", lo: 18, hi: 21 }, { k: "밤", e: "🌙", lo: 22, hi: 4 }];
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const cell = buckets.map(() => days.map(() => ({ sum: 0, n: 0 })));
  let total = 0;
  Object.values(entries).forEach((e) => {
    if (!e.mood || !e.date || !e.updatedAt) return;
    const h = new Date(e.updatedAt).getHours();
    const bi = buckets.findIndex((b) => b.lo <= b.hi ? (h >= b.lo && h <= b.hi) : (h >= b.lo || h <= b.hi));
    if (bi < 0) return;
    const di = new Date(e.date + "T00:00:00").getDay();
    cell[bi][di].sum += entryScore(e); cell[bi][di].n++; total++;
  });
  if (total < 3) { el.innerHTML = '<p class="empty">기록이 더 쌓이면 요일·시간대별 마음 리듬을 보여드려요 🌱</p>'; return; }
  const rowAvg = buckets.map((_, bi) => { let s = 0, n = 0; days.forEach((_, di) => { s += cell[bi][di].sum; n += cell[bi][di].n; }); return n ? s / n : null; });
  const colAvg = days.map((_, di) => { let s = 0, n = 0; buckets.forEach((_, bi) => { s += cell[bi][di].sum; n += cell[bi][di].n; }); return n ? s / n : null; });
  const cellHtml = (avg, n, label, marg) => avg == null
    ? `<span class="rh-cell rh-empty${marg ? " rh-marg" : ""}"></span>`
    : `<span class="rh-cell${marg ? " rh-marg" : ""}" style="background:${scoreColor(avg)}"${label ? ` title="${label}"` : ""}>${Math.round(avg)}</span>`;
  let html = '<div class="rhythm"><span class="rh-corner"></span>';
  days.forEach((d, i) => html += `<span class="rh-dh${i === 0 || i === 6 ? " rh-we" : ""}">${d}</span>`);
  buckets.forEach((b, bi) => {
    html += `<span class="rh-tl">${b.e}<i>${b.k}</i>${rowAvg[bi] != null ? `<b>${Math.round(rowAvg[bi])}</b>` : ""}</span>`;
    days.forEach((d, di) => { const c = cell[bi][di]; html += cellHtml(c.n ? c.sum / c.n : null, c.n, c.n ? `${b.k} ${d}요일 · ${c.n}회 · 평균 ${Math.round(c.sum / c.n)}점` : "", false); });
  });
  html += '<span class="rh-tl rh-ml">전체<i>요일</i></span>';
  days.forEach((d, di) => html += cellHtml(colAvg[di], 0, colAvg[di] != null ? `${d}요일 평균 ${Math.round(colAvg[di])}점` : "", true));
  html += "</div>";
  el.innerHTML = html;
}
// 감정 빈도 — 감정 축(점수와 독립). 어떤 감정을 얼마나 '자주' 느꼈는지 막대로 표기.
// 색은 그 감정의 고유 긍·부정(intrinsic valence)이라 점수 축과 섞이지 않음.
function renderTagInsight(entries) {
  const el = document.getElementById("tagInsight"); if (!el) return;
  const cnt = {};
  Object.values(entries).forEach((e) => { if (!e.tags || !e.tags.length) return; e.tags.forEach((t) => cnt[t] = (cnt[t] || 0) + 1); });
  const rows = Object.entries(cnt).map(([t, n]) => { const em = emoByKey(t); return { t, n, e: em ? em.e : "·", v: em && em.v != null ? em.v : 50 }; });
  if (rows.length < 2) { el.innerHTML = '<p class="empty">감정 태그가 더 쌓이면 자주 느낀 감정을 빈도로 보여드려요.</p>'; return; }
  const total = rows.reduce((s, r) => s + r.n, 0);
  rows.sort((a, b) => b.n - a.n);
  const max = rows[0].n;
  el.innerHTML = `<div class="freq">` + rows.slice(0, 12).map((r) => {
    const col = scoreColor(r.v), pct = Math.round(r.n / total * 100);
    return `<div class="dist-row"><span class="cap-name">${r.e} ${escapeHtml(r.t)}</span><div class="dist-bar-wrap"><div class="dist-bar" style="width:${Math.max(6, Math.round(r.n / max * 100))}%;background:${col}"></div></div><span class="dist-count">${r.n}<small>회·${pct}%</small></span></div>`;
  }).join("") + `</div><p class="hint" style="margin-top:10px">막대 길이 = 그 감정을 느낀 <b>빈도</b> · 색 = 그 감정의 긍·부정(빨강 낮음 ~ 초록 높음). 기분 점수와는 <b>별개</b>로 집계돼요.</p>`;
}

function checkBadges() {
  const earned = earnedBadgeIds(), prev = settings.badges || [];
  const fresh = earned.filter((id) => !prev.includes(id));
  if (fresh.length) {
    const prevLevel = levelInfo(prev.length).level, newLevel = levelInfo(earned.length).level;
    settings.badges = earned; saveSettingsObj(settings);
    const titles = fresh.map((id) => { const b = BADGES.find((x) => x.id === id); return `${b.e} ${b.t}`; }).join(", ");
    if (typeof toast === "function") toast("🏅 새 배지 획득: " + titles);
    if (Sound.celebrate) Sound.celebrate(); confetti(); Haptic.success();
    if (newLevel > prevLevel) { // 목표 도달로 레벨업
      const lv = levelInfo(earned.length);
      setTimeout(() => { if (typeof toast === "function") toast(`${lv.cur.emoji} 레벨 업! Lv.${lv.level} '${lv.cur.name}' 달성 🎉`); confetti(); }, 1500);
    }
  } else if (JSON.stringify(prev) !== JSON.stringify(earned)) { settings.badges = earned; saveSettingsObj(settings); }
}


// 근거기반 if-then 인사이트
function renderInsight(entries, list) {
  const el = document.getElementById("insight");
  if (!el) return; // 분석 탭 인사이트 카드 제거됨(첫 화면·완료 화면에서만 사용)
  if (list.length < 3) {
    el.textContent = "기록이 3일 이상 쌓이면, 당신만의 마음 패턴을 살며시 알려드릴게요. 지금처럼 조금씩이면 충분해요 🌱";
    return;
  }
  // 위기 신호 — 최우선 (이 화면에서만 안전 카드 노출)
  const recentNotes = list.slice(-5).map((e) => [e.note, e.reflection && e.reflection.hard, e.reflection && e.reflection.good, e.praise].filter(Boolean).join(" ")).join(" ");
  if (detectCrisis(recentNotes)) showSafety();
  const msgs = computeInsightMsgs(entries, list);
  el.textContent = msgs.length ? msgs.slice(0, 2).join(" ") : "꾸준히 기록하고 있어요. 이 자체가 자신을 돌보는 멋진 일이에요. 💛";
}
// 데이터 기반 인사이트 메시지 목록 (여러 곳에서 재사용)
function computeInsightMsgs(entries, list) {
  const withMood = list.filter((e) => e.mood);
  const msgs = [];

  // R1: 최근 3일 기분 ≤2 → 행동활성화
  const last3 = withMood.slice(-3);
  if (last3.length === 3 && last3.every((e) => mInfo(e.mood).score <= 2)) {
    msgs.push("요즘 마음이 많이 무거우셨네요. 기분이 나아지길 기다리기보다, 아주 작은 행동 하나가 먼저 도움이 될 수 있어요. '쉼' 탭의 2분 미션을 하나 해볼까요? (행동활성화)");
  }

  // R2: 에너지 낮은데 기분은 보통 이상 → 소진 대응
  const lastBoth = list.slice(-3).filter((e) => e.energy && e.mood);
  if (lastBoth.length && lastBoth.every((e) => e.energy <= 2 && mInfo(e.mood).score >= 3)) {
    msgs.push("마음은 버티는데 몸이 지쳐 있는 신호예요. 오늘은 호흡 1분이나 충분한 휴식을 먼저 챙겨보세요.");
  }

  // R6: 최근 7일 vs 이전 7일 기분 비교 → 추세
  const last7 = withMood.slice(-7), prev7 = withMood.slice(-14, -7);
  if (last7.length && prev7.length) {
    const a = last7.reduce((s, e) => s + mInfo(e.mood).score, 0) / last7.length;
    const b = prev7.reduce((s, e) => s + mInfo(e.mood).score, 0) / prev7.length;
    if (a - b >= 0.5) msgs.push("지난주보다 마음이 한결 나아지고 있어요. 스스로를 꾸준히 돌봐온 작은 변화들이 쌓이고 있어요 ☀️");
    else if (b - a >= 0.5) msgs.push("요즘 조금 더 지쳐 보여요. 스스로를 더 아껴줄 때예요. 무리하지 말아요 🫂");
  }

  // 요일 패턴
  const byDow = {};
  withMood.forEach((e) => { const d = dayOfWeekKo(e.date); (byDow[d] = byDow[d] || []).push(mInfo(e.mood).score); });
  let worst = null;
  Object.entries(byDow).forEach(([d, arr]) => { if (arr.length < 2) return; const avg = arr.reduce((s, v) => s + v, 0) / arr.length; if (!worst || avg < worst.avg) worst = { d, avg }; });
  if (worst && worst.avg < 3) msgs.push(`'${worst.d}요일'에 유독 힘이 빠지는 편이에요. 그날엔 일정을 조금 비워두면 어때요?`);

  // R7: 감사 공백 + 기분 저조 → 감사 넛지
  const last5 = list.slice(-5);
  const noPraise = last5.length >= 3 && last5.every((e) => !e.praise);
  const lowRecent = withMood.slice(-3).some((e) => mInfo(e.mood).score <= 2);
  if (noPraise && lowRecent) msgs.push("오늘 아주 사소해도 괜찮은, 고마웠던 일 하나만 적어볼까요? 작은 감사가 마음을 데워줘요. (Emmons & McCullough)");

  return msgs;
}
// 첫 화면·완료 화면에 보여줄 한 줄 인사이트 (없으면 null)
function quickInsight() {
  const entries = loadEntries(), list = sortedEntries(entries);
  if (list.length < 3) return null;
  const msgs = computeInsightMsgs(entries, list);
  return msgs.length ? msgs[0] : null;
}

// 마음 흐름·분포 — 점수 축 하나의 이야기: 최근 30일 흐름(시간) + 그 날들이 채워진 비율(분포)
// (감정 축은 '자주 느낀 감정' 카드가 담당 — 두 카드가 겹치지 않게 역할 분리)
function renderDist(list) {
  const wrap = document.getElementById("dist");
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const recent = list.filter((e) => e.mood && new Date(e.date + "T00:00:00") >= cutoff);
  if (!recent.length) { wrap.innerHTML = '<p class="empty">아직 기분 기록이 없어요.</p>'; return; }
  const entries = loadEntries();
  const keys = []; for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(todayKey(d)); }
  const chart = reportChartSvg(keys, entries);
  const counts = {}; recent.forEach((e) => { counts[e.mood] = (counts[e.mood] || 0) + 1; });
  const total = recent.length;
  const order = Object.keys(moodMeta).filter((m) => counts[m]);
  const col = (m) => scoreColor((mInfo(m).score - 1) / 4 * 100);
  const seg = order.map((m) => `<div class="db-seg" style="width:${(counts[m] / total) * 100}%;background:${col(m)}" title="${m} ${Math.round(counts[m] / total * 100)}%"></div>`).join("");
  const legend = order.sort((a, b) => counts[b] - counts[a]).map((m) => `<span class="db-leg"><i style="background:${col(m)}"></i>${mInfo(m).emoji} ${m} <b>${Math.round(counts[m] / total * 100)}%</b></span>`).join("");
  wrap.innerHTML = `${chart}<p class="fd-cap">위 흐름의 ${total}일이 이렇게 채워졌어요</p><div class="dist-stack">${seg}</div><div class="db-legend">${legend}</div>`;
}

/* ===================== 설정 ===================== */
const settings = Object.assign(
  { theme: "warm", sfx: true, breathSound: true, haptics: true, reminderOn: false, reminderTime: "21:00", ambientVol: 55, ambientType: "off", textSize: "m", tone: "warm", myQuotes: [], favQuotes: [], sleepBreath: false, breathCount: 0, journeyCount: 0, bestStreak: 0, statOrder: null, statHidden: [], statPinned: [] },
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
  document.querySelectorAll(".sound-btn").forEach((b) => { const on = settings.ambientType && settings.ambientType !== "off" && b.dataset.sound === settings.ambientType; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  Sound.setSfx(settings.sfx); Sound.setBreath(settings.breathSound); Sound.state.ambientVol = settings.ambientVol / 100;
}
if (darkMq) darkMq.addEventListener("change", () => { if (settings.theme === "auto") applySettings(); });
document.getElementById("themeGrid").addEventListener("click", (e) => {
  const btn = e.target.closest(".theme-btn"); if (!btn) return;
  settings.theme = btn.dataset.theme; saveSettingsObj(settings); applySettings(); Sound.tap();
});
document.getElementById("textSizeSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  settings.textSize = b.dataset.size; saveSettingsObj(settings); applySettings(); Sound.tap();
});
document.getElementById("toneSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  settings.tone = b.dataset.tone; saveSettingsObj(settings); applySettings(); Sound.tap();
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
  const tk = todayKey();
  const done = !!loadEntries()[tk];
  // 오늘 아직 안 한 습관을 함께 안내 (맥락 알림)
  const undone = loadChs().filter((h) => tk >= h.startDate && !h.done[tk]);
  const streak = calcStreak(loadEntries());
  let body;
  if (!done) body = streak >= 2 ? `🔥 ${streak}일 연속 중이에요! 오늘 한 줄이면 ${streak + 1}일로 이어져요 💛` : "오늘 마음은 어땠나요? 한 줄만 남겨도 충분해요 💛";
  else if (undone.length) {
    const h = undone[0];
    body = `오늘 기록 고마워요 🌿 ${h.emoji} ${h.title}${h.cue ? ` (${h.cue})` : ""}, 아직이라면 지금 어때요?`;
  } else body = "오늘도 다 해냈어요. 푹 쉬어요 🌙";
  if ("Notification" in window && Notification.permission === "granted") {
    const n = new Notification("오늘의 쉼 ☕", { body });
    n.onclick = () => { try { window.focus(); } catch (e) {} activateTab("today"); if (!done) openJourney(); n.close(); };
  } else {
    reminderMsg.textContent = body + (done ? "" : "  ›  눌러서 시작하기");
    reminderMsg.hidden = false; reminderMsg.style.cursor = done ? "default" : "pointer";
    reminderMsg.onclick = done ? null : () => { activateTab("today"); openJourney(); };
    setTimeout(() => { reminderMsg.hidden = true; }, 8000);
  }
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
  settings.lastExport = todayKey(); saveSettingsObj(settings);
});
document.getElementById("importBtn").addEventListener("click", () => { Sound.tap(); document.getElementById("importFile").click(); });
document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (file.size > 8 * 1024 * 1024) throw new Error("파일이 너무 커요");
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== "object" || (!data.entries && !data.challenges)) throw new Error("형식이 올바르지 않아요");
    let nEntry = 0, nCh = 0;
    if (data.entries && typeof data.entries === "object") {
      const entries = loadEntries();
      Object.entries(data.entries).forEach(([k, v]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== "object") return; // 날짜 키·객체만
        entries[k] = {
          date: k,
          mood: typeof v.mood === "string" ? v.mood : undefined,
          score: (typeof v.score === "number" && v.score >= 0 && v.score <= 100) ? v.score : undefined,
          energy: (typeof v.energy === "number") ? Math.max(1, Math.min(5, v.energy)) : undefined,
          note: typeof v.note === "string" ? v.note.slice(0, 4000) : "",
          praise: typeof v.praise === "string" ? v.praise.slice(0, 500) : "",
          tags: Array.isArray(v.tags) ? v.tags.filter((t) => typeof t === "string").slice(0, 30) : [],
          reflection: (v.reflection && typeof v.reflection === "object") ? { good: String(v.reflection.good || "").slice(0, 500), hard: String(v.reflection.hard || "").slice(0, 500) } : { good: "", hard: "" },
          updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : new Date().toISOString(),
        };
        nEntry++;
      });
      saveEntries(entries);
    }
    if (Array.isArray(data.challenges)) {
      const chs = loadChs(); const ids = new Set(chs.map((c) => c.id));
      data.challenges.forEach((c) => { const h = cleanHabit(c); if (h && h.title && !ids.has(h.id)) { chs.push(h); ids.add(h.id); nCh++; } });
      saveChs(chs);
    }
    if (!nEntry && !nCh) throw new Error("복원할 기록이 없어요");
    Sound.success(); loadToday(); renderChallenge();
    alert(`복원 완료! 기록 ${nEntry}개${nCh ? ` · 습관 ${nCh}개` : ""}를 기존 데이터와 합쳤어요 🌿`);
  } catch (err) {
    alert(`불러오기에 실패했어요. 올바른 백업 파일(JSON)인지 확인해주세요.\n(${err && err.message ? err.message : "형식 오류"})`);
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
  clearJDraft();
  Sound.tap();
  expandedIds.clear(); renderChallenge(); loadToday();
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

const qbCircleEl = document.getElementById("qbCircle");
const qbViz = qbCircleEl ? qbCircleEl.querySelector(".cb-viz") : null;
const qbBreather = makeBreather(qbCircleEl, document.getElementById("qbText"), "cb-stage", {
  sleep: () => sleepMode,
  maxCycles: 12,
  onPhase: (cls) => { if (cls === "hold") Haptic.success(); else Haptic.tap(); }, // juice — 단계 전환 미세 햅틱
  onAutoEnd: () => { releaseWake(); document.getElementById("qbText").innerHTML = "편안한 밤 되세요 🌙"; if (!sleepMode) Sound.chime(); setTimeout(() => { breathOverlay.hidden = true; }, 2800); },
});
function openBreath() {
  breathOverlay.hidden = false;
  breathOverlay.classList.toggle("sleep", sleepMode);
  Sound.unlock();                // iOS: 사용자 제스처 안에서 오디오 컨텍스트 확실히 재개
  autoAmbient();                 // 선택한 배경음 자동 재생
  requestWake();                 // 화면을 켜둬 오디오가 끊기지 않게 (특히 모바일)
  if (qbBreather.isRunning()) qbBreather.stop(); // 이전 세션이 남아있으면 정리 후 새로 시작
  qbBreather.start();
  syncAppInert();
  document.getElementById("qbClose").focus();
}
function closeBreath() { qbBreather.stop(); releaseWake(); breathOverlay.hidden = true; syncAppInert(); }
document.getElementById("qbClose").addEventListener("click", closeBreath);
sleepToggle.addEventListener("click", () => {
  Sound.tap();
  sleepMode = !sleepMode; settings.sleepBreath = sleepMode; saveSettingsObj(settings);
  updateSleepLabel(); breathOverlay.classList.toggle("sleep", sleepMode);
});
// 화면 복귀 시 wake lock 재획득
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !breathOverlay.hidden) requestWake(); });

/* 명상 가이드 — 전체화면 전환 + 단계 애니메이션으로 따라하기 → 호흡으로 연결 */
// 중앙은 발광 구체에 집중 — 단계마다 이모지(연꽃 등) 없이 비워 몰입감을 높임
const MED_STEPS = [
  { t: "편안한 자세", b: "의자나 바닥에 앉아 어깨의 힘을 스르륵 빼요.", e: "" },
  { t: "시선 내려놓기", b: "눈을 살며시 감거나, 한 곳을 부드럽게 바라봐요.", e: "" },
  { t: "호흡 관찰", b: "코로 숨이 들어오고 나가는 감각을 그저 느껴요.", e: "" },
  { t: "생각은 흘려보내기", b: "잡생각이 들면 '생각났네' 하고 다시 호흡으로.", e: "" },
  { t: "이제 함께 호흡", b: "동그라미를 따라 4초 들이쉬고·7초 멈추고·8초 내쉬어요.", e: "" },
];
const MED_STEP_MS = 5500;
const medOverlay = document.getElementById("medOverlay");
const medCircle = document.getElementById("medCircle"), medCircleText = document.getElementById("medCircleText");
const medCaption = document.getElementById("medCaption"), medStepTitle = document.getElementById("medStepTitle"), medStepBody = document.getElementById("medStepBody");
const medDots = document.getElementById("medDots"), medNextBtn = document.getElementById("medNext");
const medSwipeHint = document.getElementById("medSwipeHint");
let medIdx = 0, medTimer = null, medPhase = "teach";
function breathCycleSec() { return BREATH_PHASES[0].dur + BREATH_PHASES[1].dur + BREATH_PHASES[2].dur; } // 사용자 패턴 반영
let medMinutes = Math.min(60, Math.max(1, settings.medMinutes || 5));
let medActive = false; // 호흡 세션이 실제로 시작됐는지(누적 기록 중복 방지)
const medViz = medCircle ? medCircle.querySelector(".cb-viz") : null;
const medGlow = () => (document.documentElement.getAttribute("data-theme") === "dark" ? "rgba(255,224,140,0.92)" : "rgba(120,142,205,0.95)");
function medCycleTarget() { return Math.max(2, Math.round(medMinutes * 60 / breathCycleSec())); }
function renderMedStat() {
  const el = document.getElementById("medStat"); if (!el) return;
  const mins = Math.round((settings.medSeconds || 0) / 60), sess = settings.medSessions || 0;
  el.textContent = sess > 0 ? `🧘 지금까지 ${mins}분 · ${sess}회 명상했어요` : "오늘 첫 명상을 시작해보세요";
}
function medRecord() {
  if (!medActive || !medBreather) return;
  medActive = false;
  const c = medBreather.cycles ? medBreather.cycles() : 0;
  if (c <= 0) return;
  settings.medSeconds = (settings.medSeconds || 0) + c * breathCycleSec();
  settings.medSessions = (settings.medSessions || 0) + 1;
  saveSettingsObj(settings); renderMedStat();
  if (typeof checkBadges === "function") checkBadges();
}
const medOpts = {
  sleep: () => true, maxCycles: medCycleTarget(), // sleep:true는 maxCycles 자동 종료를 켜는 용도(시각 효과와 무관)
  onPhase: (cls) => { if (cls === "hold") Haptic.success(); else Haptic.tap(); }, // juice — 단계 전환 미세 햅틱(파티클은 완료 때만)
  onAutoEnd: () => { medPhase = "done"; medClockStop(); medCaption.classList.remove("show"); void medCaption.offsetWidth; medStepTitle.textContent = "잘하셨어요 🌿"; medStepBody.textContent = "천천히 눈을 떠도 좋아요."; medCaption.classList.add("show"); medCircle.className = "cb-stage med-idle"; medCircleText.textContent = ""; medNextBtn.textContent = "닫기"; Haptic.success(); Sound.chime(); if (window.Anim) Anim.sparkle(medViz || medCircle, { count: 22, spread: 150 }); },
};
const medBreather = medOverlay ? makeBreather(medCircle, medCircleText, "cb-stage", medOpts) : null;
// 시간 직접 조절(스텝퍼) + 야간 모드 + 남은 시간 카운트다운
let medNight = !!settings.medNight;
const medStepEl = document.getElementById("medStep");
const medMinValEl = document.getElementById("medMinVal");
const medNightToggle = document.getElementById("medNightToggle");
const medClockEl = document.getElementById("medClock");
let medClockTimer = null, medRemain = 0;
function renderMedSetup() { if (medMinValEl) medMinValEl.textContent = medMinutes; if (medNightToggle) medNightToggle.checked = medNight; }
if (medStepEl) medStepEl.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-d]"); if (!b) return;
  Sound.tap(); Haptic.tap();
  medMinutes = Math.min(60, Math.max(1, medMinutes + (+b.dataset.d)));
  settings.medMinutes = medMinutes; saveSettingsObj(settings); renderMedSetup();
});
if (medNightToggle) medNightToggle.addEventListener("change", (e) => {
  medNight = e.target.checked; settings.medNight = medNight; saveSettingsObj(settings);
  if (medOverlay) medOverlay.classList.toggle("sleep", medNight);
});
function fmtClock(s) { s = Math.max(0, s | 0); const m = (s / 60) | 0, ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }
function medClockStart() {
  if (!medClockEl) return;
  medRemain = medCycleTarget() * breathCycleSec();
  medClockEl.hidden = false; medClockEl.textContent = fmtClock(medRemain);
  if (medClockTimer) clearInterval(medClockTimer);
  medClockTimer = setInterval(() => { medRemain -= 1; if (medClockEl) medClockEl.textContent = fmtClock(medRemain); if (medRemain <= 0) { clearInterval(medClockTimer); medClockTimer = null; } }, 1000);
}
function medClockStop() { if (medClockTimer) { clearInterval(medClockTimer); medClockTimer = null; } if (medClockEl) medClockEl.hidden = true; }
renderMedSetup(); renderMedStat();

// 호흡 패턴(4·7·8) 직접 조절 — BREATH_PHASES를 사용자 설정으로 갱신(명상·빠른호흡 공통)
const BR_MIN = { in: 2, hold: 1, ex: 2 }, BR_MAX = 20;
let brIn = Math.min(BR_MAX, Math.max(BR_MIN.in, settings.brIn || 4));
let brHold = Math.min(BR_MAX, Math.max(BR_MIN.hold, settings.brHold || 7));
let brEx = Math.min(BR_MAX, Math.max(BR_MIN.ex, settings.brEx || 8));
function applyBreathPattern() {
  BREATH_PHASES[0].dur = brIn; BREATH_PHASES[1].dur = brHold; BREATH_PHASES[2].dur = brEx;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("patIn", brIn); set("patHold", brHold); set("patEx", brEx);
  document.querySelectorAll(".cb-seg.s-in").forEach((e) => (e.textContent = `들이쉬기 ${brIn}초`));
  document.querySelectorAll(".cb-seg.s-hold").forEach((e) => (e.textContent = `멈춤 ${brHold}초`));
  document.querySelectorAll(".cb-seg.s-out").forEach((e) => (e.textContent = `내쉬기 ${brEx}초`));
  const qbh = document.getElementById("qbHint"); if (qbh) qbh.textContent = `동그라미를 따라 천천히 (${brIn}·${brHold}·${brEx})`;
}
const medPatternEl = document.getElementById("medPattern");
if (medPatternEl) medPatternEl.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-p]"); if (!b) return;
  Sound.tap(); Haptic.tap();
  const d = +b.dataset.d, p = b.dataset.p;
  if (p === "in") brIn = Math.min(BR_MAX, Math.max(BR_MIN.in, brIn + d));
  else if (p === "hold") brHold = Math.min(BR_MAX, Math.max(BR_MIN.hold, brHold + d));
  else brEx = Math.min(BR_MAX, Math.max(BR_MIN.ex, brEx + d));
  settings.brIn = brIn; settings.brHold = brHold; settings.brEx = brEx; saveSettingsObj(settings);
  applyBreathPattern();
});
applyBreathPattern();

// 명상 오버레이 하단 사운드 컨트롤(세션 중에도 배경음 on/off + 볼륨)
const medAmbBtn = document.getElementById("medAmbBtn"), medVol = document.getElementById("medVol");
function medSyncAmbIcon() { if (medAmbBtn) medAmbBtn.textContent = (Sound.state.ambientType && Sound.state.ambientType !== "off") ? "🔊" : "🔈"; }
if (medAmbBtn) medAmbBtn.addEventListener("click", () => {
  Sound.unlock();
  if (Sound.state.ambientType && Sound.state.ambientType !== "off") { Sound.stopAmbient(); settings.ambientType = "off"; }
  else { const t = (settings.lastAmbient && settings.lastAmbient !== "off") ? settings.lastAmbient : "rain"; Sound.startAmbient(t); settings.ambientType = t; settings.lastAmbient = t; }
  saveSettingsObj(settings); medSyncAmbIcon();
  document.querySelectorAll(".sound-btn").forEach((b) => { const on = b.dataset.sound === settings.ambientType; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
});
if (medVol) {
  medVol.value = settings.ambientVol != null ? settings.ambientVol : 55;
  medVol.addEventListener("input", (e) => { const v = Number(e.target.value); Sound.setAmbientVolume(v / 100); settings.ambientVol = v; const av = document.getElementById("ambientVol"); if (av) av.value = v; });
  medVol.addEventListener("change", () => saveSettingsObj(settings));
}
function medRenderDots() { if (medDots) medDots.innerHTML = MED_STEPS.map((_, i) => `<i class="${i === medIdx ? "on" : ""}"></i>`).join(""); }
function medShow(i) {
  medIdx = i; const s = MED_STEPS[i];
  medCaption.classList.remove("show"); void medCaption.offsetWidth; // 애니메이션 재생
  medStepTitle.textContent = s.t; medStepBody.textContent = s.b; medCircleText.textContent = s.e;
  medCaption.classList.add("show"); medRenderDots();
  // 진행 버튼이 '스킵'으로 오해되지 않게 — 마지막 슬라이드에서만 호흡 시작 라벨
  medNextBtn.textContent = i < MED_STEPS.length - 1 ? "다음 →" : "호흡 시작 →";
}
function medResetTimer() { if (medTimer) clearInterval(medTimer); medTimer = setInterval(medAdvance, MED_STEP_MS); }
function medAdvance() { if (medIdx < MED_STEPS.length - 1) medShow(medIdx + 1); else medStartBreathing(); }
// 드래그/탭으로 단계 이동 (원활하게 넘기기)
function medGoto(i) {
  if (medPhase !== "teach") return;
  if (i >= MED_STEPS.length) { medStartBreathing(); return; }
  medShow(Math.max(0, i)); medResetTimer();
}
function medStartBreathing() {
  if (medPhase === "breathe") return;
  medPhase = "breathe";
  if (medTimer) { clearInterval(medTimer); medTimer = null; }
  if (medDots) medDots.innerHTML = "";
  if (medSwipeHint) medSwipeHint.hidden = true;
  medNextBtn.textContent = "그만하기";
  medCaption.classList.remove("show"); void medCaption.offsetWidth;
  medStepTitle.textContent = "함께 숨을 골라요"; medStepBody.textContent = `${brIn}초 들이쉬고·${brHold}초 멈추고·${brEx}초 내쉬어요`;
  medCaption.classList.add("show");
  medCircle.classList.remove("med-idle");
  medOpts.maxCycles = medCycleTarget(); medActive = true; // 선택한 시간만큼 자동 종료
  medClockStart(); // 화면에 남은 시간 카운트다운
  autoAmbient(); medBreather.start();
}
function openMedGuide() {
  if (!medOverlay) return;
  medOverlay.hidden = false; Sound.unlock();
  medOverlay.classList.toggle("sleep", medNight); // 야간 모드 → 어두운 우주 팔레트
  if (medNight) requestWake();                    // 화면 켜둠(야간 명상)
  medPhase = "teach"; medIdx = 0; medNextBtn.textContent = "건너뛰고 호흡 시작 →";
  medCircle.className = "cb-stage med-idle"; medCircleText.textContent = "";
  medClockStop();
  if (medVol) medVol.value = settings.ambientVol != null ? settings.ambientVol : 55;
  medSyncAmbIcon();
  if (medSwipeHint) medSwipeHint.hidden = false;
  medShow(0); medResetTimer();
  syncAppInert(); const mc = document.getElementById("medClose"); if (mc) mc.focus();
}
function closeMedGuide() {
  if (medTimer) { clearInterval(medTimer); medTimer = null; }
  medClockStop(); medRecord(); releaseWake(); // 시계 정지 + 진행한 만큼 누적 기록(중복 방지) + 화면 잠금 복귀
  try { medBreather && medBreather.stop(); } catch (e) {}
  medPhase = "teach"; if (medOverlay) medOverlay.hidden = true;
  syncAppInert();
}
if (medNextBtn) medNextBtn.addEventListener("click", () => { Sound.tap(); if (medPhase === "teach") medGoto(medIdx + 1); else closeMedGuide(); }); // 단계별 진행 → 마지막에 호흡 시작
const _medClose = document.getElementById("medClose");
if (_medClose) _medClose.addEventListener("click", () => { Sound.tap(); closeMedGuide(); });
const _medStartBtn = document.getElementById("medStartBtn");
if (_medStartBtn) _medStartBtn.addEventListener("click", () => { Sound.tap(); openMedGuide(); });
// 드래그(스와이프)·탭으로 단계 넘기기 — 교육 단계에서만
let _medDownX = null;
if (medOverlay) {
  medOverlay.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) { _medDownX = null; return; } _medDownX = e.clientX; });
  medOverlay.addEventListener("pointerup", (e) => {
    if (_medDownX == null || medPhase !== "teach") { _medDownX = null; return; }
    const dx = e.clientX - _medDownX; _medDownX = null;
    if (dx < -40) medGoto(medIdx + 1);
    else if (dx > 40) medGoto(medIdx - 1);
    else medGoto(medIdx + 1); // 가볍게 탭해도 다음
  });
}

/* ===================== 오늘의 여정 (적응형 단계 기록) ===================== */
const MOOD_ORDER = ["지쳤어요", "우울해요", "불안해요", "무기력해요", "그럭저럭", "괜찮아요", "활기차요"];
const JTAGS = ["피곤", "불안", "보람", "외로움", "평온", "짜증", "설렘", "뿌듯"];
const journey = document.getElementById("journey");
const jBody = document.getElementById("jBody"), jBar = document.getElementById("jBar");
const jPrev = document.getElementById("jPrev"), jNext = document.getElementById("jNext");
let jData = {}, curId = "feel";
// 100점 기분 점수 ↔ 기존 분류/에너지 매핑 (통계 호환)
function scoreToMood(s) { return s < 20 ? "우울해요" : s < 40 ? "지쳤어요" : s < 60 ? "그럭저럭" : s < 80 ? "괜찮아요" : "활기차요"; }
function scoreLabel(s) { return s < 20 ? "많이 힘들어요" : s < 40 ? "지쳐 있어요" : s < 60 ? "그럭저럭이에요" : s < 80 ? "괜찮아요" : "좋아요"; }
function scoreEmoji(s) { return s < 20 ? "😢" : s < 40 ? "😮‍💨" : s < 60 ? "😐" : s < 80 ? "🙂" : "😄"; }
function scoreToEnergy(s) { return Math.max(1, Math.min(5, Math.round(s / 20))); }
// 에너지(활력) = 고른 감정 태그의 각성도 평균. 태그 없으면 점수에서 환산.
function jComputeEnergy() {
  const ens = (jData.tags || []).map((t) => { const em = emoByKey(t); return em ? em.en : null; }).filter((v) => v != null);
  jData.energy = ens.length ? Math.round(ens.reduce((a, b) => a + b, 0) / ens.length) : scoreToEnergy(jData.score != null ? jData.score : 50);
}
const ENERGY_WORD = { 1: "아주 낮음", 2: "낮음", 3: "보통", 4: "높음", 5: "아주 높음" };
function moodToScore(m) { return m && moodMeta[m] ? Math.round((mInfo(m).score - 1) / 4 * 100) : 50; }
const SCORE_COLORS = ["#e8896f", "#f0b07a", "#e9d8a6", "#9ed8b0", "#5ec8b0"];
function scoreColor(s) { return SCORE_COLORS[Math.min(4, Math.floor(s / 20))]; }
// 270° 게이지 좌표/호
function dialPt(v) { const a = (135 + v * 2.7) * Math.PI / 180; return [(100 + 80 * Math.cos(a)).toFixed(1), (100 + 80 * Math.sin(a)).toFixed(1)]; }
function dialArc(v) { const [sx, sy] = dialPt(0), [ex, ey] = dialPt(v); const large = (v * 2.7) > 180 ? 1 : 0; return `M${sx} ${sy} A80 80 0 ${large} 1 ${ex} ${ey}`; }
function jSteps() {
  const editingPast = (jData.date && jData.date !== todayKey()) || jData.editLite; // 지난 기록/오늘 재편집은 간단 경로(8단계 반복 마찰 제거)
  const s = [];
  if (!editingPast) s.push("care"); // 나를 위한 한마디·미션으로 정서적 안정부터 시작
  s.push("feel");
  s.push("note", "praise");
  if (!editingPast && loadChs().length) s.push("habits");
  s.push("reflect"); // 저녁 회고는 항상 경로에 포함
  if (!editingPast) s.push("breathe"); // 명상(호흡)은 마음을 가라앉히는 마지막 마무리 단계로
  s.push("finish");
  return s;
}
// 여정용 한마디·미션 선택 (DOM 부작용 없이 문자열만 반환)
function pickQuote(exclude) {
  const pool = basePool(); if (!pool.length) return "오늘 하루도 충분히 애썼어요.";
  let q, t = 0; do { q = pool[Math.floor(Math.random() * pool.length)]; t++; } while (q === exclude && pool.length > 1 && t < 12);
  return q;
}
function pickMission(exclude) {
  let m, t = 0; do { m = missions[Math.floor(Math.random() * missions.length)]; t++; } while (m === exclude && missions.length > 1 && t < 12);
  return m;
}
function notePrompt(m) {
  if (!m) return "오늘 하루, 한 줄로 남긴다면?";
  const s = mInfo(m).score;
  if (s <= 2) return "지금 마음에 가장 걸리는 건 뭐예요?";
  if (s >= 4) return "오늘 어떤 순간이 좋았어요?";
  return "오늘 하루, 한 줄로 남긴다면?";
}
function stepHtml(id) {
  if (id === "feel") {
    const sc = jData.score != null ? jData.score : 50;
    const tagsSel = jData.tags || [];
    // 감정 태그 빈도 — 최근 90일 동안 그 감정을 몇 번 느꼈는지(점수와 무관, 빈도만)
    const tagFreq = {};
    { const cut = new Date(); cut.setDate(cut.getDate() - 90); const ck = todayKey(cut);
      Object.values(loadEntries()).forEach((e) => { if (!e.date || e.date < ck || e.date === jData.date) return; (e.tags || []).forEach((t) => tagFreq[t] = (tagFreq[t] || 0) + 1); }); }
    return `<p class="j-q">지금 마음, 몇 점인가요?</p>
      <p class="hint" style="text-align:center;margin:-10px 0 6px">동그라미를 돌리거나 아래 막대로 0~100점을 표현해요.</p>
      <div class="dial-wrap">
        <svg class="dial" viewBox="0 0 200 200" id="jDial" aria-hidden="true">
          <path class="dial-track" id="jDialTrack" d="${dialArc(100)}"></path>
          <path class="dial-fill" id="jDialFill"></path>
          <circle class="dial-thumb" id="jDialThumb" r="11"></circle>
        </svg>
        <div class="dial-center"><span class="dial-emoji" id="jDialEmoji">😐</span><span class="dial-num" id="jDialNum">50</span><span class="dial-label" id="jDialLabel">보통</span></div>
      </div>
      <input type="range" id="jScore" class="dial-range" min="0" max="100" step="1" value="${sc}" aria-label="기분 점수 0부터 100까지" />
      <p class="field-label" style="text-align:center;margin-top:18px">어떤 감정인가요? <span class="opt">(여러 개 선택 가능 · 점수와 별개로 기록돼요)</span></p>
      <div class="emo-tags" id="jEmoTags">${EMOTIONS.map((e) => { const on = tagsSel.includes(e.k); const fq = tagFreq[e.k] || 0; return `<button type="button" class="emo-tag ${on ? "selected" : ""}" data-tag="${e.k}" aria-pressed="${on}">${e.e} ${e.k}${fq ? `<i class="emo-freq" title="최근 90일 ${fq}번">·${fq}</i>` : ""}</button>`; }).join("")}</div>
      <p class="energy-out" id="jEnergyOut"></p>
      ${(jData.date || todayKey()) === todayKey() ? '<button type="button" class="reflect-toggle" id="jQuickSave">⚡ 여기까지만 빠르게 저장</button>' : ""}`;
  }
  if (id === "breathe") return `<div class="js-emoji">🫧</div><p class="j-q">마지막으로, 숨 한 번 고르고 마칠까요?</p>
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
      <div class="j-habits">${chs.map((h) => `<button class="j-habit ${h.done[today] ? "done" : ""}" data-hid="${h.id}" aria-pressed="${!!h.done[today]}"><span>${h.emoji} ${escapeHtml(h.title)}</span><b aria-hidden="true">${h.done[today] ? "✓" : "○"}</b></button>`).join("")}</div>`;
  }
  if (id === "care") {
    if (!jData.quote) jData.quote = pickQuote();
    if (!jData.mission) jData.mission = pickMission();
    return `<div class="js-emoji">💌</div><p class="j-q">시작하기 전, 나를 위한 한마디</p>
      <blockquote class="j-quote" id="jQuote">“${formatQuote(jData.quote)}”</blockquote>
      <button type="button" class="reflect-toggle" id="jQuoteMore">다른 한마디 ↻</button>
      <p class="field-label" style="text-align:center;margin-top:22px">✨ 오늘의 작은 미션</p>
      <p class="mission" id="jMission">${escapeHtml(jData.mission)}</p>
      <button type="button" class="reflect-toggle" id="jMissionMore">다른 미션 ↻</button>`;
  }
  if (id === "reflect") return `<p class="j-q">하루를 돌아볼까요?</p>
    <p class="field-label">🌤️ 가장 좋았던 순간</p><input id="jGood" class="text-input" maxlength="120" value="${escapeHtml(jData.good || "")}">
    <p class="field-label">🌧️ 힘들었던 순간</p><input id="jHard" class="text-input" maxlength="120" value="${escapeHtml(jData.hard || "")}">`;
  const ins = quickInsight();
  const isToday = (jData.date || todayKey()) === todayKey();
  return `<div class="j-finish"><div class="js-emoji">🌿</div><h3>${isToday ? "오늘도 잘 기록했어요" : "기록을 정리했어요"}</h3>
    <p>${jData.mood ? curReplies()[jData.mood] : "와줘서 고마워요."}</p>
    ${journeyFinishStatsHtml()}
    ${ins ? `<div class="j-insight"><span class="j-insight-h">🧭 오늘의 인사이트</span>${ins}</div>` : ""}
    <p class="hint">아래 버튼을 누르면 저장돼요.</p></div>`;
}
// 완료 직전, 저장 후의 성취를 미리 보여줘 보상감을 준다(연속·이번 주)
function journeyFinishStatsHtml() {
  const tmp = Object.assign({}, loadEntries());
  const k = jData.date || todayKey();
  tmp[k] = Object.assign({}, tmp[k], { date: k, mood: jData.mood });
  const streak = calcStreak(tmp);
  const keys = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(todayKey(d)); }
  const wk = keys.filter((kk) => tmp[kk] && tmp[kk].mood).length;
  return `<div class="j-finish-stats"><span><b>${streak}</b>일 연속</span><span><b>${wk}</b><i>/7</i> 이번 주</span></div>`;
}
function renderStep() {
  const arr = jSteps(), i = Math.max(0, arr.indexOf(curId));
  const pct = Math.round((i / (arr.length - 1)) * 100);
  jBar.style.width = pct + "%";
  const jp = document.getElementById("jProgress"); if (jp) jp.setAttribute("aria-valuenow", pct);
  jPrev.hidden = i <= 0;
  jNext.textContent = curId === "finish" ? "기록 저장하기 💾" : "다음";
  jBody.innerHTML = stepHtml(curId);
  if (curId === "feel") {
    const range = jBody.querySelector("#jScore");
    const dial = jBody.querySelector("#jDial");
    const fill = jBody.querySelector("#jDialFill"), thumb = jBody.querySelector("#jDialThumb");
    function updateEnergyOut() {
      const o = jBody.querySelector("#jEnergyOut"); if (!o) return;
      const hasTags = (jData.tags || []).some((t) => emoByKey(t));
      o.innerHTML = `⚡ 활력(에너지) <b>${jData.energy}/5 · ${ENERGY_WORD[jData.energy]}</b><br><span class="opt">${hasTags ? "활력은 고른 감정에서 계산돼요 (점수와 별개 축)" : "감정을 고르면 활력이 더 정확해져요"}</span>`;
    }
    function setScore(v, silent) {
      v = Math.max(0, Math.min(100, Math.round(v)));
      jData.score = v; jData.mood = scoreToMood(v); jComputeEnergy();
      range.value = v;
      fill.setAttribute("d", dialArc(v));
      const [tx, ty] = dialPt(v); thumb.setAttribute("cx", tx); thumb.setAttribute("cy", ty);
      const col = scoreColor(v); fill.style.stroke = col; thumb.style.fill = col;
      jBody.querySelector("#jDialNum").textContent = v;
      // 점수 축은 점수 자체를 표현(감정과 독립). 감정은 아래 태그로 따로 기록.
      jBody.querySelector("#jDialEmoji").textContent = scoreEmoji(v);
      jBody.querySelector("#jDialLabel").textContent = scoreLabel(v);
      updateEnergyOut();
    }
    function fromPointer(ev) {
      const r = dial.getBoundingClientRect();
      const cx = ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0] && ev.touches[0].clientX);
      const cy = ev.clientY != null ? ev.clientY : (ev.touches && ev.touches[0] && ev.touches[0].clientY);
      if (cx == null) return;
      const x = (cx - r.left) / r.width * 200 - 100, y = (cy - r.top) / r.height * 200 - 100;
      let a = (Math.atan2(y, x) * 180 / Math.PI - 135 + 360) % 360; // 0 = 시작점
      if (a > 270) a = (a - 270 < 360 - a) ? 270 : 0; // 하단 빈 구간은 가까운 끝으로
      let sc = a / 2.7; if (sc < 3) sc = 0; else if (sc > 97) sc = 100; // 양 끝(0·100)에 손가락으로 닿기 쉽게 스냅
      jData.touched = true; setScore(sc); saveJDraft();
    }
    let dragging = false;
    dial.addEventListener("pointerdown", (e) => { dragging = true; try { dial.setPointerCapture(e.pointerId); } catch (x) {} fromPointer(e); });
    dial.addEventListener("pointermove", (e) => { if (dragging) fromPointer(e); });
    dial.addEventListener("pointerup", () => { dragging = false; Sound.tap(); });
    dial.addEventListener("pointercancel", () => { dragging = false; });
    range.addEventListener("input", () => { jData.touched = true; setScore(Number(range.value)); saveJDraft(); });
    jBody.querySelector("#jEmoTags").addEventListener("click", (e) => {
      const b = e.target.closest(".emo-tag"); if (!b) return; Sound.tap();
      jData.tags = jData.tags || [];
      const k = b.dataset.tag, i = jData.tags.indexOf(k);
      if (i >= 0) jData.tags.splice(i, 1); else jData.tags.push(k);
      const on = jData.tags.includes(k);
      b.classList.toggle("selected", on); b.setAttribute("aria-pressed", on);
      // 2축 독립: 감정은 점수를 바꾸지 않는다(점수=별도 다이얼). 감정에서 활력만 계산.
      jComputeEnergy(); updateEnergyOut();
      saveJDraft();
    });
    const qs = jBody.querySelector("#jQuickSave");
    if (qs) qs.addEventListener("click", () => { if (!jData.touched) { alert("먼저 다이얼로 지금 기분을 표현해 주세요 🙂"); return; } Sound.tap(); saveJourney(); }); // 1화면 빠른 기록
    setScore(jData.score != null ? jData.score : 50, true);
  } else if (curId === "care") {
    const qm = jBody.querySelector("#jQuoteMore");
    if (qm) qm.addEventListener("click", () => { Sound.tap(); jData.quote = pickQuote(jData.quote); jBody.querySelector("#jQuote").innerHTML = "“" + formatQuote(jData.quote) + "”"; saveJDraft(); });
    const mm = jBody.querySelector("#jMissionMore");
    if (mm) mm.addEventListener("click", () => { Sound.tap(); jData.mission = pickMission(jData.mission); jBody.querySelector("#jMission").textContent = jData.mission; saveJDraft(); });
  } else if (curId === "breathe") {
    const bb = jBody.querySelector("#jBreatheBtn");
    if (bb) bb.addEventListener("click", () => { Sound.tap(); openBreath(); }); // 여정 위에 호흡 오버레이(더 높은 z-index)
  } else if (curId === "habits") {
    jBody.querySelectorAll(".j-habit").forEach((btn) => btn.addEventListener("click", () => {
      const chs = loadChs(); const h = chs.find((x) => x.id === btn.dataset.hid); if (!h) return;
      const k = jData.date || todayKey(); h.done[k] = !h.done[k]; saveChs(chs); // 자정 넘김에도 여정 날짜로 기록
      btn.classList.toggle("done", h.done[k]); btn.setAttribute("aria-pressed", !!h.done[k]); btn.querySelector("b").textContent = h.done[k] ? "✓" : "○";
      h.done[k] ? Sound.success() : Sound.tap();
    }));
  } else if (curId === "finish") {
    const em = jBody.querySelector(".js-emoji"); // 마무리 화면에 잔잔한 반짝임(아기자기)
    if (em && window.Anim) setTimeout(() => Anim.sparkle(em, { count: 12, spread: 78 }), 240);
  }
  jBody.scrollTop = 0;
  saveJDraft(); // 단계마다 진행상황 임시저장
}
function collectStep() {
  if (curId === "note") { const r = jBody.querySelector("#jNote"); if (r) jData.note = r.value.trim(); }
  else if (curId === "praise") { const r = jBody.querySelector("#jPraise"); if (r) jData.praise = r.value.trim(); }
  else if (curId === "reflect") { const g = jBody.querySelector("#jGood"), h = jBody.querySelector("#jHard"); if (g) jData.good = g.value.trim(); if (h) jData.hard = h.value.trim(); }
}
// 여정 진행 임시저장 (중간에 닫아도 이어서 작성)
function saveJDraft() { try { localStorage.setItem(DB.JDRAFT, JSON.stringify({ date: jData.date || todayKey(), curId, data: jData })); } catch (e) {} }
function loadJDraft() { try { return JSON.parse(localStorage.getItem(DB.JDRAFT)); } catch { return null; } }
function clearJDraft() { try { localStorage.removeItem(DB.JDRAFT); } catch (e) {} }
function openJourney(dateKey) {
  Sound.unlock();
  const k = (dateKey && dateKey <= todayKey()) ? dateKey : todayKey();
  jData = { date: k, backfill: !!(dateKey && dateKey < todayKey()), tags: [] };
  const t = loadEntries()[k];
  if (t) {
    jData.score = (t.score != null) ? t.score : moodToScore(t.mood);
    jData.mood = t.mood || scoreToMood(jData.score); jData.energy = t.energy;
    jData.note = t.note; jData.praise = t.praise; jData.tags = t.tags || [];
    if (t.reflection) { jData.good = t.reflection.good; jData.hard = t.reflection.hard; }
    jData.touched = true; // 기존 기록 편집은 점수 확인 불필요
    if (k === todayKey() && t.mood) jData.editLite = true; // 오늘 재편집은 축약 경로(기분부터 바로)
  }
  // 중간에 닫았던 진행분이 있으면 이어서 (과거 날짜 편집도 유실 없이 복원)
  const draft = loadJDraft();
  let resumed = false;
  if (draft && draft.date === k && draft.data) { jData = Object.assign({}, jData, draft.data); resumed = true; }
  curId = (resumed && jSteps().includes(draft.curId)) ? draft.curId : jSteps()[0];
  journey.hidden = false; requestAnimationFrame(() => { journey.classList.add("show"); syncAppInert(); }); renderStep();
  const jc = document.getElementById("jClose"); if (jc) jc.focus();
  if (resumed) toast("이어서 작성해요 ✍️");
}
function closeJourney() { journey.classList.remove("show"); setTimeout(() => { journey.hidden = true; syncAppInert(); }, 300); }
// 오버레이(여정·명상·호흡)가 하나라도 열려 있으면 배경(main·탭바)을 보조기기·포커스에서 제외
function syncAppInert() {
  try {
    const open = (!journey.hidden && journey.classList.contains("show")) || (typeof medOverlay !== "undefined" && medOverlay && !medOverlay.hidden) || (typeof breathOverlay !== "undefined" && breathOverlay && !breathOverlay.hidden); // 여정은 닫힘 애니메이션(300ms) 동안 hidden이 늦게 걸려 show 클래스로 판단
    [document.querySelector("main.app"), document.querySelector(".tabbar")].forEach((el) => { if (!el) return; if (open) el.setAttribute("inert", ""); else el.removeAttribute("inert"); });
  } catch (e) {}
}
function saveJourney() {
  // 백필이 아니면 항상 '오늘'로 저장 — 자정을 넘겨 저장돼도 어제로 새지 않게(스트릭 깨짐 방지)
  const entries = loadEntries(), k = jData.backfill ? (jData.date || todayKey()) : todayKey();
  const prev = entries[k] || {};
  entries[k] = {
    date: k, mood: jData.mood, energy: Number(jData.energy || 3),
    score: jData.score != null ? jData.score : moodToScore(jData.mood),
    note: (jData.note || "").trim().slice(0, 4000), praise: (jData.praise || "").trim().slice(0, 1000), // 백업 가져오기 한도와 일치(왕복 무손실)
    tags: jData.tags || prev.tags || [], reflection: { good: jData.good || "", hard: jData.hard || "" },
    updatedAt: new Date().toISOString(),
  };
  const isToday = k === todayKey();
  if (!saveEntries(entries)) { // 저장공간 부족 등으로 실패 시: 진행분 보존 + 안내, 닫지 않음(데이터 소실 방지)
    saveJDraft(); Sound.tap();
    if (typeof toast === "function") toast("저장공간이 부족해 기록을 저장하지 못했어요. 설정 › 데이터에서 백업/정리 후 다시 시도해주세요.");
    return;
  }
  if (isToday && !prev.mood) { settings.journeyCount = (settings.journeyCount || 0) + 1; saveSettingsObj(settings); } // 재편집은 중복 카운트 안 함
  { const dr = loadJDraft(); if (dr && dr.date === k) clearJDraft(); } // 자정 넘김 저장도 고아 draft 없이 정리
  Sound.success(); Haptic.success();
  // 클라우드 동기화 (로그인 시) — 마친 즉시 반영
  const loggedIn = !!(window.Cloud && window.Cloud.getUser && window.Cloud.getUser());
  if (window.Cloud && window.Cloud.markDirty) window.Cloud.markDirty();
  closeJourney(); loadToday(); checkBadges();
  if (!document.getElementById("tab-stats").hidden) renderStats(); // 기록 탭 진입 시 어차피 렌더 — 저장 직후 무거운 전체 분석(워드웹 등) 재계산 생략
  if (!document.getElementById("tab-calendar").hidden) renderMoodCalendar(loadEntries()); // 달력 보고 있을 때만 즉시 갱신
  if (detectCrisis([jData.note, jData.hard, jData.good, jData.praise].filter(Boolean).join(" "))) showSafety();
  toast(loggedIn ? (isToday ? "오늘 기록을 마쳤어요. ☁️ 동기화 중이에요 💛" : "기록을 수정했어요. ☁️ 동기화 중") : (isToday ? "오늘 기록을 마쳤어요. 고마워요 💛" : "기록을 수정했어요 💛"));
}
// 완료 없이 닫기 = 일시정지(진행분 보존)
function pauseJourney() { collectStep(); saveJDraft(); closeJourney(); toast("여기까지 임시저장했어요 · 언제든 이어서 쓸 수 있어요 ✍️"); }
document.getElementById("journeyStart").addEventListener("click", () => { Sound.tap(); openJourney(); });
document.getElementById("jClose").addEventListener("click", () => { Sound.tap(); pauseJourney(); });
jNext.addEventListener("click", () => {
  collectStep();
  if (curId === "feel" && !jData.touched) { // 기본값 50이 몰래 저장되지 않게 — 실제로 조작했는지 확인
    if (!confirm("아직 기분 점수를 정하지 않았어요.\n'보통(50)'으로 두고 계속할까요?")) return;
    jData.touched = true;
  }
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
  // 위에 떠 있는 순서대로 닫기: 호흡(여정 위에도 뜸) → 명상 → 여정 → 서브페이지
  if (!breathOverlay.hidden) closeBreath();
  else if (medOverlay && !medOverlay.hidden) closeMedGuide(); // 명상 가이드도 키보드로 탈출
  else if (!journey.hidden && journey.classList.contains("show")) pauseJourney();
  else if (!subpage.hidden) closeSubpage();
  else if (!onboard.hidden) { finishOnboard(); }
  else { const sc = document.getElementById("safetyCard"); if (!sc.hidden) sc.hidden = true; }
});

/* 첫 제스처에 오디오 unlock */
window.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

/* 서비스워커 — 새 버전 감지 시 안내(예고 없는 교체 대신 부드러운 업데이트 인지) */
if ("serviceWorker" in navigator) window.addEventListener("load", () => {
  navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing; if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "activated" && navigator.serviceWorker.controller) toast("새 버전으로 업데이트했어요 ✨");
      });
    });
  }).catch(() => {});
});

/* 두 탭(창) 동시 사용 시 설정 유실 방지 — 다른 탭이 저장하면 메모리 설정을 최신으로 갱신 */
window.addEventListener("storage", (e) => {
  if (e.key === DB.SETTINGS) { try { Object.assign(settings, loadSettings()); } catch (x) {} }
});

/* 설정 화면 버전 표기 (head meta와 동기) */
{ const v = document.querySelector('meta[name="app-version"]'), el = document.getElementById("appVer"); if (v && el) el.textContent = "오늘의 쉼 " + v.content; }
{ const cta = document.getElementById("statsEmptyCta"); if (cta) cta.addEventListener("click", () => { Sound.tap(); activateTab("today"); }); }

/* 토스트 + 복귀 격려 (리텐션) */
// 토스트 — 한 번에 하나씩 순차 표시(겹침 방지)
let _toastQ = [], _toastBusy = false;
function toast(msg) { _toastQ.push(msg); if (!_toastBusy) _toastNext(); }
function _toastNext() {
  if (!_toastQ.length) { _toastBusy = false; return; }
  _toastBusy = true;
  const msg = _toastQ.shift();
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => { t.remove(); _toastNext(); }, 400); }, 3000);
}
function comebackCheck() {
  const list = sortedEntries(loadEntries());
  if (!list.length) return;
  const last = list[list.length - 1].date;
  if (last === todayKey()) return;
  const gap = daysSince(last);
  if (gap >= 4) setTimeout(() => toast(`${gap}일 만이네요. 다시 와줘서 반가워요 🌿 쉬어간 날들도 괜찮아요. 오늘은 기분 하나만 눌러도 충분해요.`), 1300);
}
// 알림 캐치업 — 설정 시각이 지났는데 오늘 미기록이면 앱 열 때 살며시 안내(웹 백그라운드 알림 한계 보완)
function reminderCatchup() {
  if (!settings.reminderOn || loadEntries()[todayKey()]) return;
  const [hh, mm] = (settings.reminderTime || "21:00").split(":").map(Number);
  const now = new Date();
  if (now.getHours() > hh || (now.getHours() === hh && now.getMinutes() >= mm)) setTimeout(fireReminder, 1800);
}

/* 클라우드 동기화용 훅 (cloud.js가 사용) */
window.__getLocalData = () => ({ entries: loadEntries(), challenges: loadChs(), settings: loadSettings(), tombstones: loadTomb() });
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
    if (data.tombstones) localStorage.setItem(DB.TOMB, JSON.stringify(data.tombstones));
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
else { comebackCheck(); backupReminderCheck(); reminderCatchup(); }

/* 백업 권유 — 기록이 쌓였는데 한동안 백업이 없으면 가볍게 안내 (데이터 안전) */
function backupReminderCheck() {
  const total = Object.keys(loadEntries()).length;
  if (total < 14) return;
  const last = settings.lastExport;
  const stale = !last || daysSince(last) >= 21;
  if (stale) setTimeout(() => toast("기록이 소중히 쌓였어요 🌿 설정 → '기록 내보내기'로 가끔 백업하면 더 안전해요."), 2600);
}

/* 자정 넘김 처리 — 앱을 켜둔 채 날짜가 바뀌면 '오늘'을 갱신 */
let _lastDayKey = todayKey();
function checkDayRollover() {
  const t = todayKey();
  if (t === _lastDayKey) return;
  _lastDayKey = t;
  loadToday();
  if (!document.getElementById("tab-stats").hidden) renderStats();
  scheduleReminder();
}
setInterval(checkDayRollover, 60000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkDayRollover(); });
