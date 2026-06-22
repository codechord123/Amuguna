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
  createOscillator() { const p = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }); return { type: "", frequency: p(), detune: p(), connect: () => chain(), start() {}, stop() {} }; }
};
window.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
window.scrollTo = () => {}; window.confirm = () => true; window.alert = () => {};
window.requestAnimationFrame = (fn) => setTimeout(fn, 0);
window.HTMLCanvasElement.prototype.getContext = () => ({ scale() {}, clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {}, closePath() {}, stroke() {}, arc() {}, fill() {}, fillText() {}, setLineDash() {}, save() {}, restore() {}, createLinearGradient() { return { addColorStop() {} }; }, set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set lineJoin(v) {}, set font(v) {}, set textAlign(v) {}, set globalAlpha(v) {} });
window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
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

  // 1) 오늘의 여정으로 기록 (입력은 여정 하나로 통일)
  const tk = (() => { const dt = new Date(); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; })();
  q("#journeyStart").click();
  check("여정 시작 시 '나를 위한 한마디' 먼저", !q("#journey").hasAttribute("hidden") && !!q("#jBody #jQuote"));
  q("#jNext").click(); // 한마디 → 기분
  check("두 번째 단계 기분 다이얼", !!q("#jBody #jScore"));
  { const s = q("#jBody #jScore"); s.value = "70"; s.dispatchEvent(new window.Event("input")); }
  check("점수만 설정 시 다이얼 반영", q("#jBody #jDialNum").textContent === "70");
  q('#jBody .emo-tag[data-tag="평온해요"]').click(); // 평온해요(v:76) → 점수가 76으로 동기화
  check("감정 선택 시 긍부정 점수 동기화", q("#jBody #jDialNum").textContent === "76");
  check("다이얼 라벨이 고른 감정 반영", q("#jBody #jDialLabel").textContent === "평온해요");
  // 부정 감정도 점수대 기본('지쳐 있어요')이 아니라 그 감정 이름을 보여줘야 함
  q('#jBody .emo-tag[data-tag="평온해요"]').click(); // 해제
  q('#jBody .emo-tag[data-tag="초조해요"]').click(); // 초조해요(v:30)
  check("부정 감정 라벨 정확(초조해요)", q("#jBody #jDialLabel").textContent === "초조해요" && q("#jBody #jDialNum").textContent === "30");
  q('#jBody .emo-tag[data-tag="초조해요"]').click(); // 해제
  // 양방향 일치: 감정 고른 뒤 다이얼을 멀리 끌면 모순 감정 자동 해제 ('슬퍼요인데 100점' 차단)
  q('#jBody .emo-tag[data-tag="슬퍼요"]').click(); // 슬퍼요(v:15) → 점수 15로 하향 동기화
  check("감정→점수 하향 동기화", q("#jBody #jDialNum").textContent === "15");
  { const s = q("#jBody #jScore"); s.value = "100"; s.dispatchEvent(new window.Event("input")); }
  check("다이얼 상향 시 모순 감정 자동 해제", q('#jBody .emo-tag[data-tag="슬퍼요"]').getAttribute("aria-pressed") === "false");
  check("모순 라벨 차단(슬퍼요≠100)", q("#jBody #jDialLabel").textContent !== "슬퍼요" && q("#jBody #jDialNum").textContent === "100");
  q('#jBody .emo-tag[data-tag="평온해요"]').click(); // 원래 시나리오 복구(평온해요)
  let jg = 0;
  while (q("#jNext").textContent.indexOf("저장") < 0 && jg++ < 10) {
    if (q("#jBody #jNote")) q("#jBody #jNote").value = "야근하고 지침";
    if (q("#jBody #jGood")) q("#jBody #jGood").value = "좋은 점";
    if (q("#jBody #jHard")) q("#jBody #jHard").value = "힘든 점";
    q("#jNext").click();
  }
  check("여정 마지막 단계 도달", q("#jNext").textContent.indexOf("저장") >= 0);
  q("#jNext").click();
  check("여정 저장 후 닫힘", !q("#journey").classList.contains("show"));
  const te = ls("entries_v2")[tk];
  check("오늘 기록 저장됨", !!te && te.mood === "괜찮아요");
  check("감정 동기화 점수 저장", te.score === 76);
  check("감정 태그 저장", (te.tags || []).includes("평온해요"));
  check("일기 저장", te.note === "야근하고 지침");
  check("저녁 회고 저장", te.reflection && te.reflection.good === "좋은 점" && te.reflection.hard === "힘든 점");

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

  // 3b) 여정에 습관 단계 포함 (습관이 있을 때)
  q("[data-tab=today]").click(); window.localStorage.removeItem("journey_draft_v1"); q("#journeyStart").click();
  let g2 = 0, foundHabit = false, foundCare = !!q("#jBody #jMission"); // 첫 단계가 한마디·미션
  q("#jNext").click(); // 한마디 → 기분
  check("여정 기분 다이얼 표시", !!q("#jBody #jScore"));
  { const s = q("#jBody #jScore"); s.value = "70"; s.dispatchEvent(new window.Event("input")); }
  while (q("#jNext").textContent.indexOf("저장") < 0 && g2++ < 12) { if (q("#jBody .j-habit")) foundHabit = true; if (q("#jBody #jMission")) foundCare = true; q("#jNext").click(); }
  if (q("#jBody .j-habit")) foundHabit = true;
  if (q("#jBody #jMission")) foundCare = true;
  check("여정에 습관 단계 포함", foundHabit);
  check("여정에 한마디·미션 단계 포함", foundCare);
  q("#jClose").click();

  // 3c) 호흡(명상)은 여정의 마지막 단계 + 호흡 버튼 노출
  q("[data-tab=today]").click(); window.localStorage.removeItem("journey_draft_v1"); q("#journeyStart").click();
  let g3 = 0, foundBreathe = false, breatheLast = false;
  while (q("#jNext").textContent.indexOf("저장") < 0 && g3++ < 12) {
    if (q("#jBody #jBreatheBtn")) foundBreathe = true;
    q("#jNext").click();
    if (foundBreathe && q("#jNext").textContent.indexOf("저장") >= 0) breatheLast = true; // 호흡 바로 다음이 저장(마지막)
  }
  check("여정 호흡(명상) 단계 버튼", foundBreathe);
  check("호흡(명상)이 마지막 단계", breatheLast);
  q("#jClose").click();

  // 3d) 여정 진행 임시저장(중간에 닫아도 이어서)
  q("[data-tab=today]").click(); window.localStorage.removeItem("journey_draft_v1"); q("#journeyStart").click();
  q("#jNext").click(); // 한마디 → 기분(감정 선택 단계)
  q('#jBody .emo-tag[data-tag="복잡해요"]').click();
  q("#jClose").click();
  q("#journeyStart").click();
  check("여정 진행 임시저장 복원", !!q('#jBody .emo-tag[data-tag="복잡해요"]') && q('#jBody .emo-tag[data-tag="복잡해요"]').getAttribute("aria-pressed") === "true");
  q("#jClose").click(); window.localStorage.removeItem("journey_draft_v1");

  // 3e) 빠른 기록 (1화면 저장)
  q("[data-tab=today]").click(); window.localStorage.removeItem("journey_draft_v1"); q("#journeyStart").click();
  q("#jNext").click(); // 한마디 → 기분
  { const s = q("#jBody #jScore"); s.value = "82"; s.dispatchEvent(new window.Event("input")); }
  check("빠른 저장 버튼 노출", !!q("#jBody #jQuickSave"));
  q("#jBody #jQuickSave").click();
  check("빠른 저장으로 기록됨", ls("entries_v2")[tk].score === 82 && q("#journey").classList.contains("show") === false);

  // 4) 통계 탭 (차트·달력·주간·인사이트 렌더)
  q("[data-tab=stats]").click();
  check("리포트 진입 표시", !!q("#weekReportBtn") && !!q("#monthDetailBtn"));
  q("#statsSeg button[data-seg=graph]").click();
  check("기록 탭 서브탭(그래프) 전환", !q('.stats-panel[data-panel="graph"]').hasAttribute("hidden") && q('.stats-panel[data-panel="summary"]').hasAttribute("hidden"));
  q("#statsSeg button[data-seg=summary]").click();
  check("배지 카테고리 탭(7종)", d.querySelectorAll("#badgeSeg button").length === 7);
  check("기록 카테고리 11종", d.querySelectorAll("#badgeGrid .badge").length === 11);
  check("첫 기록 배지 획득(기록 탭)", d.querySelector("#badgeGrid .badge.earned") !== null);
  q('#badgeSeg button[data-bcat="mind"]').click();
  check("배지 탭 전환(마음챙김 9종)", d.querySelectorAll("#badgeGrid .badge").length === 9);
  q('#badgeSeg button[data-bcat="record"]').click();
  check("배지 버튼화(설명 표시용)", !!q("#badgeGrid button.badge[data-bid]"));
  check("레벨 표시", /Lv\.\d/.test(q("#levelName").textContent));
  check("배지 다음 목표 표시", q("#badgeNext").textContent.trim().length > 0);
  q("[data-tab=today]").click();
  check("첫 화면 통계+응원 표시", Number(q("#tsTotal").textContent) >= 1 && q("#tsCheer").textContent.length > 0);
  q('#todayStats [data-jump="calendar"]').click();
  check("홈 연속→달력 탭 점프", !q("#tab-calendar").hasAttribute("hidden"));
  q("[data-tab=today]").click();
  check("프로젝트 탭/카드 제거됨", !q("#tab-challenge").querySelector("#projectSetup") && !d.getElementById("projStatsCard"));

  // 6) 달력 탭 (통합 마음 달력)
  q("[data-tab=calendar]").click();
  check("마음 달력 렌더됨", d.querySelectorAll("#moodCal .cal-cell").length > 0);
  const calBefore = q("#calMonth").textContent; q("#calPrev").click();
  check("달력 이전 달로 이동", q("#calMonth").textContent !== calBefore);
  q("#calNext").click();

  // 7) 설정: 테마/글자크기/톤
  q("[data-tab=settings]").click();
  q("[data-theme=dark]").click();
  check("다크 테마 적용", d.documentElement.getAttribute("data-theme") === "dark");
  q("#textSizeSeg button[data-size=xl]").click();
  check("글자 크기 적용", d.documentElement.getAttribute("data-textsize") === "xl");
  q("#toneSeg button[data-tone=plain]").click();
  check("위로 톤 저장", ls("settings_v2").tone === "plain");
  q("#hapticToggle").checked = false; q("#hapticToggle").dispatchEvent(new window.Event("change"));
  check("햅틱 설정 저장", ls("settings_v2").haptics === false);
  const themeCard = q("#themeGrid").closest(".card");
  const before2 = themeCard.classList.contains("collapsed");
  themeCard.querySelector("h2").click();
  check("설정 카드 접기 토글", themeCard.classList.contains("collapsed") !== before2);

  // 8) 호흡 카운터 + 빠른 호흡 + 명상 분리
  q("[data-tab=rest]").click();
  check("쉼 탭 명상 패널 기본 표시", !q('.rest-panel[data-rpanel="meditate"]').hasAttribute("hidden"));
  q("#restSeg button[data-rseg=comfort]").click();
  check("위로 패널로 전환", !q('.rest-panel[data-rpanel="comfort"]').hasAttribute("hidden") && q('.rest-panel[data-rpanel="meditate"]').hasAttribute("hidden"));
  q("#restSeg button[data-rseg=meditate]").click();
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
  check("문구 관리 페이지 목록 표시", d.querySelectorAll("#subBody .manage-row").length >= 1);
  d.querySelector('#subBody [data-mk="my"]').click();
  check("내 문구 삭제됨", !(ls("settings_v2").myQuotes || []).includes("내 문구"));
  q("#subBack").click();

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
  const corr = {}, doneDays = ["2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-06"];
  const notDays = ["2026-06-07", "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11"];
  doneDays.forEach((dt) => corr[dt] = { date: dt, mood: "활기차요" });
  notDays.forEach((dt) => corr[dt] = { date: dt, mood: "지쳤어요" });
  window.localStorage.setItem("entries_v2", JSON.stringify(corr));
  const doneMap = {}; doneDays.forEach((dt) => doneMap[dt] = true);
  window.localStorage.setItem("challenges_v2", JSON.stringify([{ id: "hc", emoji: "🚶", title: "산책", startDate: "2026-06-01", done: doneMap, celebrated: [] }]));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  check("상관관계 분석 표시", d.querySelectorAll("#corrBody .corr-row").length === 1);
  check("상관관계 방향(상승) 표시", !!d.querySelector("#corrBody .corr-diff.up"));
  check("상관관계 과학 근거 표기", !!d.querySelector("#corrBody .sci-note") && /Cohen/.test(d.querySelector("#corrBody .corr-meta").textContent));
  check("발견: 도움된 습관 카드", [...d.querySelectorAll("#discoveries .disc .disc-title")].some((n) => /산책/.test(n.textContent)));
  const hmToday = new Date().toISOString().slice(0, 10);
  window.localStorage.setItem("challenges_v2", JSON.stringify([{ id: "hc", emoji: "🚶", title: "산책", startDate: "2026-06-01", done: { ...doneMap, [hmToday]: true }, celebrated: [] }]));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  check("습관 실천 매트릭스 표시", d.querySelectorAll("#habitHeatmap .hm-row").length >= 2 && d.querySelectorAll("#habitHeatmap .hm-cell.hm-on").length >= 1);
  // 마음 리듬 (요일×시간대 히트맵) — updatedAt 시각 기준
  const rh = {};
  ["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18"].forEach((dt, i) => { rh[dt] = { date: dt, mood: i % 2 ? "활기차요" : "지쳤어요", updatedAt: dt + "T09:30:00" }; });
  window.localStorage.setItem("entries_v2", JSON.stringify(rh));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  check("마음 리듬 히트맵 표시", d.querySelectorAll("#rhythmGrid .rh-cell:not(.rh-empty)").length >= 4);
  check("분석 탭 발견 영역 표시", d.querySelectorAll("#discoveries .disc").length >= 1);
  check("분석 탭 핵심 지표 4종 표시", d.querySelectorAll("#analyzeKpis .as-kpi").length === 4);
  // 분석 맞춤(커스터마이징): 편집 진입 → 순서 올리기 → 숨김
  check("분석 맞춤 버튼 존재", !!q("#statEditBtn"));
  q("#statEditBtn").click(); // 편집 진입
  check("맞춤 편집 컨트롤 표시", d.querySelectorAll("#allAnalysis .sec-ctrl").length >= 7);
  const secondSec = d.querySelectorAll("#allAnalysis > [data-sec]")[1].getAttribute("data-sec");
  q(`.sec-btn[data-act=up][data-secid="${secondSec}"]`).click();
  check("분석 섹션 위로 이동", q("#allAnalysis > [data-sec]").getAttribute("data-sec") === secondSec);
  check("맞춤 순서 저장됨", (ls("settings_v2") || {}).statOrder && ls("settings_v2").statOrder[0] === secondSec);
  // 메인에 올리기(고정) → 고정 영역으로 이동
  q(`.sec-btn[data-act=pin][data-secid="${secondSec}"]`).click();
  check("메인에 올린 분석이 고정영역으로", !!q(`#statPinned > [data-sec="${secondSec}"]`));
  check("메인 고정 저장됨", ((ls("settings_v2") || {}).statPinned || []).includes(secondSec));
  // 다시 내리면 드로어로 복귀 + 접힘 상태
  q(`.sec-btn[data-act=pin][data-secid="${secondSec}"]`).click();
  check("고정 해제 시 드로어로 복귀", !!q(`#allAnalysis > [data-sec="${secondSec}"]`));
  // 숨김
  q(`.sec-btn[data-act=vis][data-secid="${secondSec}"]`).click();
  check("분석 섹션 숨김 저장", ((ls("settings_v2") || {}).statHidden || []).includes(secondSec));
  q("#statEditBtn").click(); // 완료
  check("완료 후 숨긴 섹션 비표시", q(`#allAnalysis > [data-sec="${secondSec}"]`).classList.contains("sec-hidden"));
  // 버그 회귀: 완료 후 접기/펴기(collapsed) 토글이 정상 동작해야 함
  const colCard = q('#allAnalysis > .card.collapsible:not(.sec-hidden)');
  const wasCollapsed = colCard.classList.contains("collapsed");
  colCard.querySelector(":scope > h2").click();
  check("완료 후 카드 접기/펴기 동작", colCard.classList.contains("collapsed") !== wasCollapsed);
  // 마음 달력 통합 글리프 (기분+습관+활력+일기 한 칸에)
  const calToday = new Date().toISOString().slice(0, 10);
  window.localStorage.setItem("entries_v2", JSON.stringify({ [calToday]: { date: calToday, mood: "활기차요", energy: 4, note: "좋은 하루였어요", updatedAt: calToday + "T10:00:00" } }));
  window.localStorage.setItem("challenges_v2", JSON.stringify([{ id: "hc", emoji: "🚶", title: "산책", startDate: "2020-01-01", done: { [calToday]: true }, celebrated: [] }]));
  q("[data-tab=today]").click(); q("[data-tab=calendar]").click();
  q("#calNext").click(); q("#calNext").click();
  check("마음 달력 기분 색 표시", !!d.querySelector(`#moodCal [data-cal="${calToday}"][class*="m"]`));

  // 12) 페이지 전환들 (달력→그날 상세 · 리포트)
  q("[data-tab=calendar]").click();
  d.querySelector(`#moodCal [data-cal="${calToday}"]`).click();
  check("달력에서 그날 상세 페이지", !q("#subpage").hasAttribute("hidden") && !!q("#subBody [data-eact=edit]"));
  q("#subBack").click();
  q("[data-tab=stats]").click();
  q("#statsSeg button[data-seg=summary]").click(); q("#weekReportBtn").click();
  check("주간 리포트 상세 페이지", !q("#subpage").hasAttribute("hidden") && !!q("#subBody [data-ract=share]"));
  check("리포트 진단·처방 표시", !!q("#subBody .diag-card") && !!q("#subBody .sol-card .sol"));
  q("#subBack").click();
  // 세분 진단 — 슬픔 테마 + '관계' 키워드 맥락
  const sadE = {};
  for (let i = 0; i < 7; i++) { const dd = new Date(); dd.setDate(dd.getDate() - i); const k = dd.toISOString().slice(0, 10); sadE[k] = { date: k, mood: "우울해요", score: 15, tags: ["우울해요", "외로워요"], note: "요즘 친구도 없고 너무 외로워", updatedAt: k + "T20:00:00" }; }
  window.localStorage.setItem("entries_v2", JSON.stringify(sadE));
  q("[data-tab=stats]").click(); q("#statsSeg button[data-seg=summary]").click(); q("#weekReportBtn").click();
  check("진단: 슬픔 테마 반영", /가라앉/.test(q("#subBody .diag-label").textContent));
  check("진단: 일기 키워드 맥락 반영", /관계/.test(q("#subBody .diag-dx").textContent));
  check("처방: 문장형 생성", [...d.querySelectorAll("#subBody .sol .sol-b")].every((nn) => nn.textContent.trim().length > 12) && d.querySelectorAll("#subBody .sol .sol-b").length >= 2);
  check("생각의 지도 단어 연결망", d.querySelectorAll("#wordWeb .ww-node").length >= 3 && d.querySelectorAll("#wordWeb .ww-edge").length >= 1);
  check("처방 DB 500개 이상", (window.__rxCount || 0) >= 500);
  q("#subBack").click();
} catch (e) {
  errors.push("INTERACT THROW: " + e.message + "\n" + (e.stack || ""));
}

console.log(`\n${passed} passed, ${errors.length} failed`);
if (errors.length) { console.error("\n실패 항목:\n - " + errors.join("\n - ")); process.exit(1); }
console.log("✅ 모든 스모크 테스트 통과");
