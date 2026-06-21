// 오늘의 쉼 — 회귀 스모크 테스트 (jsdom)
// 실행: npm install && npm test
// 핵심 사용자 흐름이 런타임 에러 없이 동작하는지 + 데이터가 올바르게 저장되는지 검증합니다.
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const errors = [];
let passed = 0;
function check(name, cond) { if (cond) { passed++; console.log("  ✓ " + name); } else { errors.push(name); console.log("  ✗ " + name); } }

const dom = new JSDOM(read("index.html"), { runScripts: "outside-only", pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom; const d = window.document;

// --- 브라우저 API 스텁 ---
const chain = () => ({ connect: () => chain() });
const gain = () => ({ gain: { value: 0, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }, connect: () => chain() });
window.AudioContext = class {
  constructor() { this.state = "running"; this.currentTime = 0; this.sampleRate = 44100; this.destination = {}; }
  resume() {} createGain() { return gain(); }
  createBiquadFilter() { return { type: "", frequency: { value: 0, setTargetAtTime() {}, linearRampToValueAtTime() {}, setValueAtTime() {}, cancelScheduledValues() {} }, Q: { value: 0 }, connect: () => chain() }; }
  createConvolver() { return { buffer: null, connect: () => chain() }; }
  createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
  createBufferSource() { return { buffer: null, loop: false, connect: () => chain(), start() {}, stop() {} }; }
  createOscillator() { return { type: "", frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, detune: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect: () => chain(), start() {}, stop() {} }; }
};
window.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
window.scrollTo = () => {}; window.confirm = () => true; window.alert = () => {};
window.requestAnimationFrame = (fn) => setTimeout(fn, 0);
window.HTMLCanvasElement.prototype.getContext = () => ({ scale() {}, clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, fill() {}, fillText() {}, set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set lineJoin(v) {}, set font(v) {}, set textAlign(v) {} });
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,iVBORw0KGgo=";
window.onerror = (m) => errors.push("onerror: " + m);

// --- 앱 로드 (config → sound → app → cloud, index.html과 동일 순서) ---
try { window.eval(read("config.js") + "\n" + read("sound.js") + "\n" + read("app.js") + "\n" + read("cloud.js")); }
catch (e) { console.error("FATAL: 앱 로드 실패\n", e); process.exit(1); }
try { window.document.dispatchEvent(new window.Event("DOMContentLoaded")); } catch (e) {}

const q = (s) => d.querySelector(s);
const ls = (k) => JSON.parse(window.localStorage.getItem(k) || "null");

try {
  q("#obSkip").click();

  // 1) 오늘 기록 + 태그
  q(".mood").click();
  q("#journalInput").value = "야근하고 지침";
  q("#tagInput").value = "피곤, 야근";
  q("#saveBtn").click();
  const ent = ls("entries_v2");
  const todayKey = Object.keys(ent).sort().pop();
  check("오늘 기록 저장됨", !!ent[todayKey] && ent[todayKey].mood);
  check("감정 태그 저장됨", JSON.stringify(ent[todayKey].tags) === JSON.stringify(["피곤", "야근"]));

  // 2) 백필 (과거 날짜)
  const ed = q("#entryDate"); ed.value = "2026-06-18"; ed.dispatchEvent(new window.Event("change"));
  q(".mood").click(); q("#saveBtn").click();
  check("백필(과거 날짜) 저장됨", !!ls("entries_v2")["2026-06-18"]);

  // 2ب) 기분 7단계 + 저녁 회고
  check("기분 7단계 표시", d.querySelectorAll(".mood").length === 7);
  const tk = (() => { const dt = new Date(); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; })();
  ed.value = tk; ed.dispatchEvent(new window.Event("change"));
  [...d.querySelectorAll(".mood")].find((b) => b.dataset.mood === "활기차요").click();
  q("#reflectToggle").click();
  q("#reflectGood").value = "좋은 점"; q("#reflectHard").value = "힘든 점";
  q("#saveBtn").click();
  const te = ls("entries_v2")[tk];
  check("활기차요(7단계) 저장", te.mood === "활기차요");
  check("저녁 회고 저장", te.reflection && te.reflection.good === "좋은 점" && te.reflection.hard === "힘든 점");

  // 2c) 오늘의 여정 (적응형 경로)
  q("#journeyStart").click();
  check("여정 시작", !q("#journey").hasAttribute("hidden") && !!q("#jBody .mood-grid"));
  [...q("#jBody").querySelectorAll(".mood")].find((b) => b.dataset.mood === "괜찮아요").click();
  let jg = 0;
  while (q("#jNext").textContent.indexOf("저장") < 0 && jg++ < 8) q("#jNext").click();
  check("여정 마지막 단계 도달", q("#jNext").textContent.indexOf("저장") >= 0);
  q("#jNext").click();
  check("여정 저장 후 닫힘", !q("#journey").classList.contains("show"));
  check("여정으로 오늘 기분 저장", ls("entries_v2")[tk].mood === "괜찮아요");

  // 3) 습관 생성(추가 페이지) + 완료 체크 + 상세 편집
  q("[data-tab=challenge]").click();
  check("빈 상태 표시", !q("#chEmpty").hasAttribute("hidden"));
  q("#addHabitBtn").click();
  check("새 습관 추가 페이지 열림", !q("#subpage").hasAttribute("hidden") && !!q("#subBody #challengeTitle"));
  q(".preset").click(); q("#startChallenge").click();
  check("습관 1개 생성됨", ls("challenges_v2").length === 1);
  check("생성 후 추가 페이지 닫힘", !q("#subpage").classList.contains("show"));
  q(".habit-check").click();
  check("습관 오늘 완료 저장됨", Object.values(ls("challenges_v2")[0].done).some(Boolean));
  // 상세 페이지로 전환 → 편집
  q(".habit-info").click();
  check("습관 상세 페이지 열림", !d.querySelector("#subpage").hasAttribute("hidden"));
  check("상세에 90칸 그리드", d.querySelectorAll("#subBody .ch-cell").length === 90);
  q("#subBody [data-act=edit]").click();
  q('#subBody [data-ef="title"]').value = "아침 산책";
  q("#subBody [data-act=savehabit]").click();
  check("습관 편집(이름 변경)됨", ls("challenges_v2")[0].title === "아침 산책");
  check("편집 후 상세 제목 갱신", d.querySelector("#subTitle").textContent.includes("아침 산책"));
  q("#subBack").click();
  check("상세 페이지 닫기 동작", !d.querySelector("#subpage").classList.contains("show"));

  // 4) 통계 탭 (차트·달력·주간·인사이트 렌더)
  q("[data-tab=stats]").click();
  check("기분 달력 렌더됨", d.querySelectorAll("#moodCal .cal-cell").length > 0);
  check("주간 리포트 텍스트 있음", q("#weeklySummary").textContent.length > 0);
  check("월간 리포트 텍스트 있음", q("#monthlySummary").textContent.length > 0);
  q("#statsSeg button[data-seg=graph]").click();
  check("기록 탭 서브탭(그래프) 전환", !q('.stats-panel[data-panel="graph"]').hasAttribute("hidden") && q('.stats-panel[data-panel="summary"]').hasAttribute("hidden"));
  q("#statsSeg button[data-seg=summary]").click();
  check("배지 렌더됨", d.querySelectorAll("#badgeGrid .badge").length === 10);
  check("첫 기록 배지 획득", d.querySelector("#badgeGrid .badge.earned") !== null);
  check("프로젝트 탭/카드 제거됨", !q("#tab-challenge").querySelector("#projectSetup") && !d.getElementById("projStatsCard"));

  // 6) 검색
  q("#historySearch").value = "야근"; q("#historySearch").dispatchEvent(new window.Event("input"));
  check("검색 필터 동작", d.querySelectorAll("#history li.editable").length === 1);
  check("기록 개수 표시", /\d+개/.test(q("#histCount").textContent));
  q("#historySearch").value = ""; q("#historySearch").dispatchEvent(new window.Event("input"));
  const calBefore = q("#calMonth").textContent; q("#calPrev").click();
  check("달력 이전 달로 이동", q("#calMonth").textContent !== calBefore);

  // 7) 설정: 테마/글자크기/톤
  q("[data-tab=settings]").click();
  q("[data-theme=dark]").click();
  check("다크 테마 적용", d.documentElement.getAttribute("data-theme") === "dark");
  q("#textSizeSeg button[data-size=xl]").click();
  check("글자 크기 적용", d.documentElement.getAttribute("data-textsize") === "xl");
  q("#toneSeg button[data-tone=plain]").click();
  check("위로 톤 저장", ls("settings_v2").tone === "plain");
  const themeCard = q("#themeGrid").closest(".card");
  const before2 = themeCard.classList.contains("collapsed");
  themeCard.querySelector("h2").click();
  check("설정 카드 접기 토글", themeCard.classList.contains("collapsed") !== before2);

  // 8) 호흡 카운터 + 빠른 호흡
  q("[data-tab=rest]").click();
  q("#breathBtn").click();
  check("호흡 시작 시 카운트 표시", /\d/.test(q("#breathText").innerHTML));
  q("#breathBtn").click();
  check("Sound.tick 존재", typeof window.Sound.tick === "function");
  check("Sound.breathStart/Stop 존재", typeof window.Sound.breathStart === "function" && typeof window.Sound.breathStop === "function");
  // 수면 모드 토글
  q("#quickBreathFab").click();
  q("#sleepToggle").click();
  check("수면 모드 저장", ls("settings_v2").sleepBreath === true);
  check("수면 모드 화면 클래스", d.querySelector("#breathOverlay").classList.contains("sleep"));
  q("#qbClose").click();
  check("호흡 오버레이 닫힘", d.querySelector("#breathOverlay").hasAttribute("hidden"));

  // 8b) 위로 문구 즐겨찾기 / 내 문구
  q("#quoteBtn").click();
  q("#favBtn").click();
  check("문구 즐겨찾기 저장", (ls("settings_v2").favQuotes || []).length === 1);
  q("#myQuoteInput").value = "내 문구"; q("#myQuoteAdd").click();
  check("내 문구 추가 저장", (ls("settings_v2").myQuotes || []).includes("내 문구"));
  q("#manageToggle").click();
  check("문구 관리 목록 표시", d.querySelectorAll("#quoteManage .manage-row").length >= 1);
  d.querySelector('#quoteManage [data-mk="my"]').click();
  check("내 문구 삭제됨", !(ls("settings_v2").myQuotes || []).includes("내 문구"));

  // 9) 사운드 함수 무결성
  ["startAmbient", "stopAmbient", "setAmbientVolume", "chime", "celebrate", "breathCue"].forEach((fn) =>
    check("Sound." + fn + " 함수", typeof window.Sound[fn] === "function"));

  // 10) 클라우드 (미설정 폴백 + 병합 로직)
  check("클라우드 미설정 안내 표시", !q("#cloudNotConfigured").hasAttribute("hidden"));
  check("로그인 UI 숨김(미설정)", q("#cloudLoggedOut").hasAttribute("hidden"));
  const merged = window.Cloud._merge(
    { entries: { a: { updatedAt: "2020-01-01", x: 1 } }, challenges: [{ id: "h", done: { d1: true }, celebrated: [1] }], projects: [], settings: { tone: "plain" } },
    { entries: { a: { updatedAt: "2030-01-01", x: 2 }, b: { updatedAt: "2025-01-01" } }, challenges: [{ id: "h", done: { d2: true }, celebrated: [3] }], projects: [], settings: { tone: "warm", theme: "dark" } }
  );
  check("병합: 최신 일기 채택", merged.entries.a.x === 2);
  check("병합: 원격 전용 일기 보존", !!merged.entries.b);
  check("병합: 습관 완료 합집합", merged.challenges[0].done.d1 && merged.challenges[0].done.d2);
  check("병합: 설정은 로컬 우선+원격 보완", merged.settings.tone === "plain" && merged.settings.theme === "dark");

  // 11) 습관↔기분 상관관계 (데이터 주입 후 검증)
  const corr = {};
  ["2026-06-02", "2026-06-03", "2026-06-04"].forEach((dt) => corr[dt] = { date: dt, mood: "활기차요" });
  ["2026-06-05", "2026-06-06", "2026-06-07"].forEach((dt) => corr[dt] = { date: dt, mood: "지쳤어요" });
  window.localStorage.setItem("entries_v2", JSON.stringify(corr));
  window.localStorage.setItem("challenges_v2", JSON.stringify([{ id: "hc", emoji: "🚶", title: "산책", startDate: "2026-06-01", done: { "2026-06-02": true, "2026-06-03": true, "2026-06-04": true }, celebrated: [] }]));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  check("상관관계 분석 표시", d.querySelectorAll("#corrBody .corr-row").length === 1);
  check("상관관계 방향(상승) 표시", !!d.querySelector("#corrBody .corr-diff.up"));
} catch (e) {
  errors.push("INTERACT THROW: " + e.message + "\n" + (e.stack || ""));
}

console.log(`\n${passed} passed, ${errors.length} failed`);
if (errors.length) { console.error("\n실패 항목:\n - " + errors.join("\n - ")); process.exit(1); }
console.log("✅ 모든 스모크 테스트 통과");
