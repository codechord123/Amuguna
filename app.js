// 오늘의 쉼 · 나를 위한 에너지 충전소
// 모든 데이터는 이 기기(localStorage)에만 저장됩니다. 안심하고 써요.

/* ---------- 인사말 ---------- */
(function greet() {
  const h = new Date().getHours();
  let msg = "안녕, 오늘도 와줘서 고마워요";
  if (h < 6) msg = "늦은 밤이네요. 그래도 잘 버텨줘서 고마워요";
  else if (h < 12) msg = "좋은 아침이에요. 천천히 시작해요";
  else if (h < 18) msg = "오후도 무리하지 말고요";
  else msg = "하루 마무리, 정말 수고 많았어요";
  document.getElementById("greeting").textContent = msg;
})();

/* ---------- 기분 체크인 ---------- */
const moodReplies = {
  "지쳤어요": "많이 지쳤구나… 지금까지 충분히 애썼어요. 잠깐 아무것도 안 해도 돼요.",
  "우울해요": "마음이 무거운 날이죠. 그 기분을 억지로 밀어내지 않아도 괜찮아요. 곁에 있을게요.",
  "불안해요": "불안한 마음, 알아요. 한 번에 하나씩만 생각해요. 지금 이 순간은 안전해요.",
  "무기력해요": "힘이 안 나는 날엔 쉬는 게 일이에요. 숨 쉬고 있는 것만으로 충분해요.",
  "그럭저럭": "그럭저럭도 충분히 잘하고 있는 거예요. 오늘도 잘 흘러가고 있어요.",
  "괜찮아요": "괜찮다니 다행이에요. 이 가벼움을 오늘 잘 누려봐요 ☺️",
};

const moodGrid = document.getElementById("moodGrid");
const moodResponse = document.getElementById("moodResponse");
moodGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".mood");
  if (!btn) return;
  document.querySelectorAll(".mood").forEach((m) => m.classList.remove("selected"));
  btn.classList.add("selected");
  const mood = btn.dataset.mood;
  moodResponse.textContent = moodReplies[mood];
  moodResponse.hidden = false;
  localStorage.setItem("lastMood", JSON.stringify({ mood, date: new Date().toISOString() }));
});

/* ---------- 위로 한마디 ---------- */
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
const quoteBtn = document.getElementById("quoteBtn");
let lastQuote = -1;
quoteBtn.addEventListener("click", () => {
  let i;
  do { i = Math.floor(Math.random() * quotes.length); } while (i === lastQuote && quotes.length > 1);
  lastQuote = i;
  quoteEl.style.opacity = 0;
  setTimeout(() => {
    quoteEl.textContent = "“" + quotes[i] + "”";
    quoteEl.style.opacity = 1;
  }, 200);
});

/* ---------- 호흡 쉼표 (4-7-8) ---------- */
const circle = document.getElementById("breathCircle");
const breathText = document.getElementById("breathText");
const breathBtn = document.getElementById("breathBtn");
let breathing = false;
let breathTimers = [];

function clearBreath() {
  breathTimers.forEach(clearTimeout);
  breathTimers = [];
}

function runCycle() {
  if (!breathing) return;
  // 들이쉬기 4초
  circle.className = "breath-circle inhale";
  breathText.textContent = "들이쉬기";
  breathTimers.push(setTimeout(() => {
    if (!breathing) return;
    // 멈추기 7초
    circle.className = "breath-circle hold";
    breathText.textContent = "잠깐 멈춰요";
    breathTimers.push(setTimeout(() => {
      if (!breathing) return;
      // 내쉬기 8초
      circle.className = "breath-circle exhale";
      breathText.textContent = "내쉬기";
      breathTimers.push(setTimeout(() => {
        if (!breathing) return;
        runCycle();
      }, 8000));
    }, 7000));
  }, 4000));
}

breathBtn.addEventListener("click", () => {
  breathing = !breathing;
  if (breathing) {
    breathBtn.textContent = "그만하기";
    runCycle();
  } else {
    clearBreath();
    circle.className = "breath-circle";
    breathText.textContent = "잘했어요";
    breathBtn.textContent = "호흡 시작";
  }
});

/* ---------- 아주 작은 한 걸음 ---------- */
const missions = [
  "물 한 잔 천천히 마시기 💧",
  "창문 열고 바깥 공기 30초 느끼기 🌿",
  "어깨를 크게 한 바퀴 돌리기 🤸",
  "좋아하는 노래 딱 한 곡 듣기 🎧",
  "스마트폰 내려놓고 1분간 눈 감기 😌",
  "기지개를 시원하게 한 번 켜기 🙆",
  "따뜻한 차나 커피 한 잔 내리기 ☕",
  "방 안에서 다섯 걸음만 걷기 🚶",
  "고마운 사람 한 명 떠올리기 💛",
  "햇빛 드는 곳에 잠깐 앉아 있기 ☀️",
  "지금 어지러운 것 딱 하나만 정리하기 🧺",
  "거울 보고 '수고했어' 한마디 건네기 🪞",
  "심호흡 세 번 천천히 하기 🌬️",
  "세수하고 개운하게 만들기 💦",
];
const missionEl = document.getElementById("mission");
const missionBtn = document.getElementById("missionBtn");
let lastMission = -1;
missionBtn.addEventListener("click", () => {
  let i;
  do { i = Math.floor(Math.random() * missions.length); } while (i === lastMission && missions.length > 1);
  lastMission = i;
  missionEl.textContent = missions[i];
});

/* ---------- 셀프 칭찬 기록 ---------- */
const praiseForm = document.getElementById("praiseForm");
const praiseInput = document.getElementById("praiseInput");
const praiseList = document.getElementById("praiseList");
const PRAISE_KEY = "praiseLog";

function loadPraise() {
  try { return JSON.parse(localStorage.getItem(PRAISE_KEY)) || []; }
  catch { return []; }
}
function savePraise(list) {
  localStorage.setItem(PRAISE_KEY, JSON.stringify(list));
}
function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}
function renderPraise() {
  const list = loadPraise();
  praiseList.innerHTML = "";
  if (list.length === 0) {
    const li = document.createElement("li");
    li.className = "praise-empty";
    li.textContent = "아직 기록이 없어요. 오늘 잘한 일 하나만 적어볼까요?";
    praiseList.appendChild(li);
    return;
  }
  list.forEach((item, idx) => {
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = item.text;
    const when = document.createElement("span");
    when.className = "when";
    when.textContent = fmtDate(item.date);
    const del = document.createElement("button");
    del.className = "del";
    del.type = "button";
    del.setAttribute("aria-label", "삭제");
    del.textContent = "×";
    del.addEventListener("click", () => {
      const cur = loadPraise();
      cur.splice(idx, 1);
      savePraise(cur);
      renderPraise();
    });
    const right = document.createElement("span");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "8px";
    right.appendChild(when);
    right.appendChild(del);
    li.appendChild(text);
    li.appendChild(right);
    praiseList.appendChild(li);
  });
}
praiseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = praiseInput.value.trim();
  if (!text) return;
  const list = loadPraise();
  list.unshift({ text, date: new Date().toISOString() });
  savePraise(list);
  praiseInput.value = "";
  renderPraise();
});
renderPraise();
