// 오늘의 쉼 · app.js
// 모든 데이터는 이 기기(localStorage)에만 저장됩니다.

/* ===================== 저장소 ===================== */
const DB = {
  ENTRIES: "entries_v2",
  SETTINGS: "settings_v2",
};
const moodMeta = {
  "우울해요": { emoji: "🥺", score: 1 },
  "불안해요": { emoji: "😣", score: 2 },
  "지쳤어요": { emoji: "😮‍💨", score: 2 },
  "무기력해요": { emoji: "😶‍🌫️", score: 2 },
  "그럭저럭": { emoji: "🙂", score: 4 },
  "괜찮아요": { emoji: "☺️", score: 5 },
};
const energyFaces = {
  1: "🪫 바닥이에요", 2: "😔 적어요", 3: "😐 보통", 4: "🙂 괜찮아요", 5: "⚡ 넘쳐요",
};

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(DB.ENTRIES)) || {}; }
  catch { return {}; }
}
function saveEntries(obj) { localStorage.setItem(DB.ENTRIES, JSON.stringify(obj)); }
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(DB.SETTINGS)) || {}; }
  catch { return {}; }
}
function saveSettings(obj) { localStorage.setItem(DB.SETTINGS, JSON.stringify(obj)); }

function todayKey(d) {
  d = d || new Date();
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* 구버전(praiseLog) 데이터 1회 이전 */
(function migrate() {
  const old = localStorage.getItem("praiseLog");
  if (!old) return;
  try {
    const list = JSON.parse(old);
    const entries = loadEntries();
    list.forEach((item) => {
      const k = todayKey(new Date(item.date));
      if (!entries[k]) entries[k] = { date: k };
      entries[k].praise = entries[k].praise ? entries[k].praise + " / " + item.text : item.text;
    });
    saveEntries(entries);
  } catch (e) {}
  localStorage.removeItem("praiseLog");
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
  const d = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  document.getElementById("todayDate").textContent =
    `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
})();

/* ===================== 탭 전환 ===================== */
const tabbar = document.getElementById("tabbar");
const tabs = { today: "tab-today", rest: "tab-rest", stats: "tab-stats", settings: "tab-settings" };
tabbar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tabbtn");
  if (!btn) return;
  Sound.tap();
  const name = btn.dataset.tab;
  document.querySelectorAll(".tabbtn").forEach((b) => b.classList.toggle("active", b === btn));
  Object.entries(tabs).forEach(([k, id]) => {
    document.getElementById(id).hidden = k !== name;
  });
  if (name === "stats") renderStats();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ===================== 오늘 기록 ===================== */
const moodGrid = document.getElementById("moodGrid");
const moodResponse = document.getElementById("moodResponse");
const energyRange = document.getElementById("energyRange");
const energyFace = document.getElementById("energyFace");
const journalInput = document.getElementById("journalInput");
const praiseInput = document.getElementById("praiseInput");
const saveBtn = document.getElementById("saveBtn");
const saveMsg = document.getElementById("saveMsg");

let selectedMood = null;
const moodReplies = {
  "지쳤어요": "많이 지쳤구나… 지금까지 충분히 애썼어요. 잠깐 아무것도 안 해도 돼요.",
  "우울해요": "마음이 무거운 날이죠. 그 기분을 억지로 밀어내지 않아도 괜찮아요. 곁에 있을게요.",
  "불안해요": "불안한 마음, 알아요. 한 번에 하나씩만 생각해요. 지금 이 순간은 안전해요.",
  "무기력해요": "힘이 안 나는 날엔 쉬는 게 일이에요. 숨 쉬고 있는 것만으로 충분해요.",
  "그럭저럭": "그럭저럭도 충분히 잘하고 있는 거예요. 오늘도 잘 흘러가고 있어요.",
  "괜찮아요": "괜찮다니 다행이에요. 이 가벼움을 오늘 잘 누려봐요 ☺️",
};

function selectMood(mood) {
  selectedMood = mood;
  document.querySelectorAll(".mood").forEach((m) => m.classList.toggle("selected", m.dataset.mood === mood));
  moodResponse.textContent = moodReplies[mood];
  moodResponse.hidden = false;
}
moodGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".mood");
  if (!btn) return;
  Sound.tap();
  selectMood(btn.dataset.mood);
});
energyRange.addEventListener("input", () => {
  energyFace.textContent = energyFaces[energyRange.value];
});

function loadToday() {
  const entries = loadEntries();
  const t = entries[todayKey()];
  if (!t) { energyFace.textContent = energyFaces[3]; return; }
  if (t.mood) selectMood(t.mood);
  if (t.energy) { energyRange.value = t.energy; energyFace.textContent = energyFaces[t.energy]; }
  if (t.note) journalInput.value = t.note;
  if (t.praise) praiseInput.value = t.praise;
}

saveBtn.addEventListener("click", () => {
  const entries = loadEntries();
  const k = todayKey();
  entries[k] = {
    date: k,
    mood: selectedMood,
    energy: Number(energyRange.value),
    note: journalInput.value.trim(),
    praise: praiseInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };
  saveEntries(entries);
  Sound.success();
  const streak = calcStreak(entries);
  saveMsg.textContent = streak > 1
    ? `기록 완료! 🌟 ${streak}일 연속이에요. 정말 대단해요.`
    : "오늘의 마음, 잘 담아뒀어요. 고마워요 💛";
  saveMsg.hidden = false;
  setTimeout(() => { saveMsg.hidden = true; }, 4000);
});

/* ===================== 쉼: 위로 / 호흡 / 미션 / 사운드 ===================== */
const quotes = [
  "지금 충분히 잘하고 있어요. 더 잘하지 않아도 돼요.",
  "쉬는 건 게으른 게 아니라, 다시 살아가기 위한 거예요.",
  "오늘 아무것도 못 했어도, 당신의 가치는 그대로예요.",
  "느려도 괜찮아요. 멈추지만 않으면 나아가고 있는 거예요.",
  "번아웃은 당신이 약해서가 아니라, 너무 오래 강했기 때문이에요.",
  "모든 걸 잘할 필요 없어요. 오늘은 그냥 살아남는 날이어도 돼요.",
  "당신은 생산성으로 증명할 필요가 없는 소중한 사람이에요.",
  "지친 마음에게도 휴식을 줄 자격이 있어요.",
  "작은 한 걸음도 한 걸음이에요. 그걸 알아챈 당신이 대단해요.",
  "힘들다고 말해도 돼요. 그 말이 당신을 약하게 만들지 않아요.",
  "오늘의 당신은 어제의 당신이 버텨낸 결과예요. 정말 잘 왔어요.",
  "완벽하지 않아도 사랑받을 자격이 있어요. 지금 그대로요.",
  "잠시 내려놓아도 세상은 무너지지 않아요. 한숨 돌려요.",
  "당신은 혼자가 아니에요. 이 화면 너머에서 응원하고 있어요.",
  "오늘 하루를 살아낸 것만으로도, 당신은 충분히 용감해요.",
];
const quoteEl = document.getElementById("quote");
let lastQuote = -1;
document.getElementById("quoteBtn").addEventListener("click", () => {
  Sound.chime();
  let i; do { i = Math.floor(Math.random() * quotes.length); } while (i === lastQuote && quotes.length > 1);
  lastQuote = i;
  quoteEl.style.opacity = 0;
  setTimeout(() => { quoteEl.textContent = "“" + quotes[i] + "”"; quoteEl.style.opacity = 1; }, 200);
});

const circle = document.getElementById("breathCircle");
const breathText = document.getElementById("breathText");
const breathBtn = document.getElementById("breathBtn");
let breathing = false, breathTimers = [];
function clearBreath() { breathTimers.forEach(clearTimeout); breathTimers = []; }
function runCycle() {
  if (!breathing) return;
  circle.className = "breath-circle inhale";
  breathText.textContent = "들이쉬기";
  Sound.breathCue("inhale");
  breathTimers.push(setTimeout(() => {
    if (!breathing) return;
    circle.className = "breath-circle hold";
    breathText.textContent = "잠깐 멈춰요";
    Sound.breathCue("hold");
    breathTimers.push(setTimeout(() => {
      if (!breathing) return;
      circle.className = "breath-circle exhale";
      breathText.textContent = "내쉬기";
      Sound.breathCue("exhale");
      breathTimers.push(setTimeout(() => { if (breathing) runCycle(); }, 8000));
    }, 7000));
  }, 4000));
}
breathBtn.addEventListener("click", () => {
  Sound.unlock();
  breathing = !breathing;
  if (breathing) { breathBtn.textContent = "그만하기"; runCycle(); }
  else { clearBreath(); circle.className = "breath-circle"; breathText.textContent = "잘했어요"; breathBtn.textContent = "호흡 시작"; }
});

const missions = [
  "물 한 잔 천천히 마시기 💧", "창문 열고 바깥 공기 30초 느끼기 🌿",
  "어깨를 크게 한 바퀴 돌리기 🤸", "좋아하는 노래 딱 한 곡 듣기 🎧",
  "스마트폰 내려놓고 1분간 눈 감기 😌", "기지개를 시원하게 한 번 켜기 🙆",
  "따뜻한 차나 커피 한 잔 내리기 ☕", "방 안에서 다섯 걸음만 걷기 🚶",
  "고마운 사람 한 명 떠올리기 💛", "햇빛 드는 곳에 잠깐 앉아 있기 ☀️",
  "지금 어지러운 것 딱 하나만 정리하기 🧺", "거울 보고 '수고했어' 한마디 건네기 🪞",
  "심호흡 세 번 천천히 하기 🌬️", "세수하고 개운하게 만들기 💦",
];
const missionEl = document.getElementById("mission");
let lastMission = -1;
document.getElementById("missionBtn").addEventListener("click", () => {
  Sound.tap();
  let i; do { i = Math.floor(Math.random() * missions.length); } while (i === lastMission && missions.length > 1);
  lastMission = i;
  missionEl.textContent = missions[i];
});

const soundGrid = document.getElementById("soundGrid");
const ambientVol = document.getElementById("ambientVol");
soundGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".sound-btn");
  if (!btn) return;
  const type = btn.dataset.sound;
  document.querySelectorAll(".sound-btn").forEach((b) => b.classList.toggle("active", b === btn && type !== "off"));
  if (type === "off") Sound.stopAmbient();
  else Sound.startAmbient(type);
});
ambientVol.addEventListener("input", () => Sound.setAmbientVolume(ambientVol.value / 100));

/* ===================== 기록 / 데이터 ===================== */
function sortedEntries(entries) {
  return Object.values(entries).filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date));
}
function calcStreak(entries) {
  let streak = 0;
  const d = new Date();
  // 오늘 기록이 없으면 어제부터 카운트 (끊기지 않게)
  if (!entries[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (entries[todayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

function renderStats() {
  const entries = loadEntries();
  const list = sortedEntries(entries);

  document.getElementById("streakNum").textContent = calcStreak(entries);
  document.getElementById("totalNum").textContent = list.length;

  // 최근 기분 평균(점수)
  const recent = list.slice(-7).filter((e) => e.mood);
  if (recent.length) {
    const avg = recent.reduce((s, e) => s + moodMeta[e.mood].score, 0) / recent.length;
    const label = avg >= 4 ? "🙂 좋아요" : avg >= 3 ? "😐 보통" : "😮‍💨 지쳐요";
    document.getElementById("avgMood").textContent = label;
  } else {
    document.getElementById("avgMood").textContent = "–";
  }

  drawChart(entries);
  renderInsight(entries, list);
  renderDist(list);
  renderHistory(list);
}

function drawChart(entries) {
  const canvas = document.getElementById("chart");
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 560;
  const cssH = 200;
  canvas.width = cssW * dpr; canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue("--accent").trim();
  const energyC = css.getPropertyValue("--energy").trim();
  const line = css.getPropertyValue("--line").trim();
  const soft = css.getPropertyValue("--soft").trim();

  // 최근 14일
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(todayKey(d));
  }
  const padL = 26, padR = 10, padT = 14, padB = 24;
  const w = cssW - padL - padR, h = cssH - padT - padB;
  const x = (i) => padL + (w * i) / (days.length - 1);
  const y = (v) => padT + h - (h * (v - 1)) / 4; // v: 1~5

  // 가로 격자
  ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = soft; ctx.font = "10px sans-serif";
  for (let v = 1; v <= 5; v += 2) {
    ctx.beginPath(); ctx.moveTo(padL, y(v)); ctx.lineTo(cssW - padR, y(v)); ctx.stroke();
  }

  function plot(getter, color) {
    const pts = days.map((k, i) => {
      const e = entries[k];
      const val = e ? getter(e) : null;
      return val ? { x: x(i), y: y(val) } : null;
    });
    // 선 (값 있는 구간만 연결)
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    ctx.beginPath(); let started = false;
    pts.forEach((p) => {
      if (!p) { started = false; return; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    // 점
    ctx.fillStyle = color;
    pts.forEach((p) => { if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill(); } });
  }

  plot((e) => (e.mood ? moodMeta[e.mood].score : null), accent);
  plot((e) => e.energy || null, energyC);

  // x축 라벨 (양끝)
  ctx.fillStyle = soft; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
  const lab = (k) => { const p = k.split("-"); return `${+p[1]}/${+p[2]}`; };
  ctx.fillText(lab(days[0]), x(0), cssH - 8);
  ctx.fillText(lab(days[days.length - 1]), x(days.length - 1), cssH - 8);
}

function dayOfWeekKo(key) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[new Date(key).getDay()];
}

function renderInsight(entries, list) {
  const el = document.getElementById("insight");
  if (list.length < 3) {
    el.textContent = "기록이 3일 이상 쌓이면, 당신만의 마음 패턴을 찾아드릴게요. 지금처럼 조금씩이면 충분해요 🌱";
    return;
  }
  const msgs = [];
  const withMood = list.filter((e) => e.mood);

  // 최근 7일 vs 그 이전 7일 기분 비교
  const last7 = withMood.slice(-7), prev7 = withMood.slice(-14, -7);
  if (last7.length && prev7.length) {
    const a = last7.reduce((s, e) => s + moodMeta[e.mood].score, 0) / last7.length;
    const b = prev7.reduce((s, e) => s + moodMeta[e.mood].score, 0) / prev7.length;
    if (a - b >= 0.5) msgs.push("지난주보다 마음이 한결 나아지고 있어요. 그 흐름, 정말 반가워요 ☀️");
    else if (b - a >= 0.5) msgs.push("요즘 조금 더 지쳐 보여요. 스스로를 더 아껴줄 때예요. 무리하지 말아요 🫂");
    else msgs.push("최근 마음이 비교적 안정적으로 유지되고 있어요. 잘 돌보고 있다는 뜻이에요.");
  }

  // 요일별 평균 — 가장 힘든 요일
  const byDow = {};
  withMood.forEach((e) => {
    const d = dayOfWeekKo(e.date);
    (byDow[d] = byDow[d] || []).push(moodMeta[e.mood].score);
  });
  let worst = null;
  Object.entries(byDow).forEach(([d, arr]) => {
    if (arr.length < 2) return;
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    if (!worst || avg < worst.avg) worst = { d, avg };
  });
  if (worst && worst.avg < 3) msgs.push(`'${worst.d}요일'에 유독 힘이 빠지는 편이에요. 그날엔 일정을 조금 비워두면 어때요?`);

  // 에너지와 기분 관계
  const both = list.filter((e) => e.mood && e.energy);
  if (both.length >= 4) {
    const hi = both.filter((e) => e.energy >= 4);
    if (hi.length) {
      const hiMood = hi.reduce((s, e) => s + moodMeta[e.mood].score, 0) / hi.length;
      if (hiMood >= 3.5) msgs.push("에너지가 높은 날엔 마음도 함께 밝아지더라고요. 충전되는 날을 의식적으로 만들어봐요 🔋");
    }
  }

  // 칭찬 기록 격려
  const praised = list.filter((e) => e.praise).length;
  if (praised >= 3) msgs.push(`지금까지 '잘한 일'을 ${praised}번이나 적었어요. 스스로를 인정하는 그 습관이 당신을 단단하게 만들어요 💛`);

  el.textContent = msgs.length ? msgs.join(" ") : "꾸준히 기록하고 있어요. 이 자체가 자신을 돌보는 멋진 일이에요.";
}

function renderDist(list) {
  const wrap = document.getElementById("dist");
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const recent = list.filter((e) => e.mood && new Date(e.date) >= cutoff);
  wrap.innerHTML = "";
  if (!recent.length) { wrap.innerHTML = '<p class="empty">아직 기분 기록이 없어요.</p>'; return; }
  const counts = {};
  recent.forEach((e) => { counts[e.mood] = (counts[e.mood] || 0) + 1; });
  const max = Math.max(...Object.values(counts));
  Object.keys(moodMeta).forEach((mood) => {
    const c = counts[mood] || 0;
    if (c === 0) return;
    const row = document.createElement("div");
    row.className = "dist-row";
    row.innerHTML = `
      <span class="dist-emoji">${moodMeta[mood].emoji}</span>
      <div class="dist-bar-wrap"><div class="dist-bar" style="width:${(c / max) * 100}%"></div></div>
      <span class="dist-count">${c}</span>`;
    wrap.appendChild(row);
  });
}

function renderHistory(list) {
  const ul = document.getElementById("history");
  ul.innerHTML = "";
  const rev = [...list].reverse();
  if (!rev.length) { ul.innerHTML = '<p class="empty">아직 기록이 없어요. 오늘부터 시작해볼까요?</p>'; return; }
  rev.slice(0, 30).forEach((e) => {
    const li = document.createElement("li");
    const p = e.date.split("-");
    const dateStr = `${+p[1]}월 ${+p[2]}일 (${dayOfWeekKo(e.date)})`;
    const moodStr = e.mood ? `${moodMeta[e.mood].emoji} ${e.mood}` : "";
    const energyStr = e.energy ? ` · 에너지 ${e.energy}/5` : "";
    li.innerHTML = `
      <button class="h-del" data-date="${e.date}" aria-label="삭제">×</button>
      <div class="h-top"><span class="h-date">${dateStr}</span><span class="h-mood">${moodStr}${energyStr}</span></div>
      ${e.note ? `<p class="h-note">${escapeHtml(e.note)}</p>` : ""}
      ${e.praise ? `<p class="h-praise">🌱 ${escapeHtml(e.praise)}</p>` : ""}`;
    ul.appendChild(li);
  });
  ul.querySelectorAll(".h-del").forEach((b) => b.addEventListener("click", () => {
    const entries = loadEntries();
    delete entries[b.dataset.date];
    saveEntries(entries);
    Sound.tap();
    renderStats();
  }));
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ===================== 설정 ===================== */
const settings = Object.assign(
  { theme: "warm", sfx: true, breathSound: true, reminderOn: false, reminderTime: "21:00", ambientVol: 55 },
  loadSettings()
);

function applySettings() {
  document.documentElement.setAttribute("data-theme", settings.theme);
  document.querySelector('meta[name="theme-color"]').setAttribute("content",
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  document.querySelectorAll(".theme-btn").forEach((b) => b.classList.toggle("active", b.dataset.theme === settings.theme));
  document.getElementById("sfxToggle").checked = settings.sfx;
  document.getElementById("breathSoundToggle").checked = settings.breathSound;
  document.getElementById("reminderToggle").checked = settings.reminderOn;
  document.getElementById("reminderTime").value = settings.reminderTime;
  document.getElementById("ambientVol").value = settings.ambientVol;
  Sound.setSfx(settings.sfx);
  Sound.setBreath(settings.breathSound);
  Sound.state.ambientVol = settings.ambientVol / 100;
}

document.getElementById("themeGrid").addEventListener("click", (e) => {
  const btn = e.target.closest(".theme-btn");
  if (!btn) return;
  settings.theme = btn.dataset.theme;
  saveSettings(settings); applySettings(); Sound.tap();
});
document.getElementById("sfxToggle").addEventListener("change", (e) => {
  settings.sfx = e.target.checked; saveSettings(settings); Sound.setSfx(settings.sfx);
});
document.getElementById("breathSoundToggle").addEventListener("change", (e) => {
  settings.breathSound = e.target.checked; saveSettings(settings); Sound.setBreath(settings.breathSound);
});
document.getElementById("ambientVol").addEventListener("change", (e) => {
  settings.ambientVol = Number(e.target.value); saveSettings(settings);
});

/* 알림 (앱이 열려 있을 때 동작) */
let reminderTimer = null;
const reminderMsg = document.getElementById("reminderMsg");
function scheduleReminder() {
  if (reminderTimer) { clearTimeout(reminderTimer); reminderTimer = null; }
  if (!settings.reminderOn) return;
  const [hh, mm] = settings.reminderTime.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hh, mm, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  reminderTimer = setTimeout(fireReminder, next - now);
}
function fireReminder() {
  const entries = loadEntries();
  const done = !!entries[todayKey()];
  const body = done ? "오늘도 기록해줘서 고마워요. 푹 쉬어요 🌙" : "오늘 마음은 어땠나요? 한 줄만 남겨도 충분해요 💛";
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("오늘의 쉼 ☕", { body });
  } else {
    reminderMsg.textContent = body;
    reminderMsg.hidden = false;
    setTimeout(() => { reminderMsg.hidden = true; }, 6000);
  }
  Sound.chime();
  scheduleReminder(); // 다음 날 예약
}
document.getElementById("reminderToggle").addEventListener("change", async (e) => {
  settings.reminderOn = e.target.checked;
  if (settings.reminderOn && "Notification" in window && Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch (err) {}
  }
  saveSettings(settings);
  scheduleReminder();
  if (settings.reminderOn) {
    reminderMsg.textContent = `좋아요! 매일 ${settings.reminderTime}에 살며시 알려드릴게요.`;
    reminderMsg.hidden = false;
    setTimeout(() => { reminderMsg.hidden = true; }, 4000);
  }
});
document.getElementById("reminderTime").addEventListener("change", (e) => {
  settings.reminderTime = e.target.value; saveSettings(settings); scheduleReminder();
});

/* 데이터 내보내기 / 지우기 */
document.getElementById("exportBtn").addEventListener("click", () => {
  Sound.tap();
  const data = JSON.stringify(loadEntries(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `오늘의쉼_기록_${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById("clearBtn").addEventListener("click", () => {
  if (!confirm("정말 모든 기록을 지울까요? 되돌릴 수 없어요.")) return;
  localStorage.removeItem(DB.ENTRIES);
  Sound.tap();
  loadToday();
  renderStats();
  alert("기록을 모두 비웠어요. 언제든 다시 시작할 수 있어요 🌱");
});

/* ===================== 첫 사용자 제스처에 오디오 unlock ===================== */
window.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

/* ===================== PWA 서비스워커 ===================== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ===================== 초기화 ===================== */
applySettings();
loadToday();
scheduleReminder();
