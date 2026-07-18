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
try { window.eval(read("config.js") + "\n" + read("sound.js") + "\n" + read("anim.js") + "\n" + read("app.js") + "\n" + read("cloud.js")); }
catch (e) { console.error("FATAL: 앱 로드 실패\n", e); process.exit(1); }
try { window.document.dispatchEvent(new window.Event("DOMContentLoaded")); } catch (e) {}

const q = (s) => d.querySelector(s);
const ls = (k) => JSON.parse(window.localStorage.getItem(k) || "null");
const rk = (i) => { const dt = new Date(); dt.setDate(dt.getDate() - i); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; }; // i일 전 키 — 하드코딩 날짜는 창(window) 밖으로 밀려 시간이 지나면 깨짐

try {
  q("#obSkip").click();

  // 0) 키워드 추출 — 의존명사+조사('곳이')는 제외, 내용어(회사·시험)는 보존
  { const toks = window.tokenizeKo ? window.tokenizeKo("곳이 회사에서 시험을") : [];
    check("키워드: '곳이' 제외·내용어 보존", !toks.includes("곳이") && toks.includes("회사") && toks.includes("시험")); }
  // 동사 기본형 변환 — '찾았'→'찾다', '갔다'→'가다' (명사 '회사'·'친구'는 보존)
  { const toks = window.tokenizeKo ? window.tokenizeKo("어제 친구를 찾았어 회사에 갔다") : [];
    check("동사 기본형 변환(찾았→찾다)", toks.includes("찾다") && toks.includes("가다") && !toks.includes("찾았") && toks.includes("친구")); }
  // 중요 1글자 명사(돈) 살리기 + 1글자 동사 연결형('벌어'→'벌다')
  { const toks = window.tokenizeKo ? window.tokenizeKo("돈이 없어서 돈을 벌어야 했다") : [];
    check("1글자 명사 '돈' 추출", toks.includes("돈") && !toks.includes("돈이")); }
  { const toks = window.tokenizeKo ? window.tokenizeKo("주말에 돈을 벌어 집에서 쉬었다") : [];
    check("1글자 동사 '벌어→벌다'", toks.includes("벌다") && toks.includes("집")); }
  { const toks = window.tokenizeKo ? window.tokenizeKo("언어와 단어를 배웠다") : [];
    check("명사 보존(언어·단어 안 깨짐)", toks.includes("언어") && toks.includes("단어") && !toks.includes("언") && !toks.includes("단")); }

  // 0b) 첫 사용자 — 기록 0개일 때 기록 탭은 잠긴 지표 대신 안내+CTA
  q("[data-tab=stats]").click();
  check("빈 기록 탭 첫 사용자 안내 표시", !q("#statsEmptyHero").hasAttribute("hidden"));
  q("[data-tab=today]").click();
  check("탭바 aria-current 갱신", q('.tabbtn[data-tab="today"]').getAttribute("aria-current") === "page");
  check("오늘 탭: 여정 카드가 통계보다 위", !!q("#tab-today") && q("#tab-today").innerHTML.indexOf("journeyStartCard") < q("#tab-today").innerHTML.indexOf("todayStats"));

  // 1) 오늘의 여정으로 기록 (입력은 여정 하나로 통일)
  const tk = (() => { const dt = new Date(); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; })();
  q("#journeyStart").click();
  check("여정 시작 시 '나를 위한 한마디' 먼저", !q("#journey").hasAttribute("hidden") && !!q("#jBody #jQuote"));
  q("#jNext").click(); // 한마디 → 기분
  check("두 번째 단계 기분 다이얼", !!q("#jBody #jScore"));
  { const s = q("#jBody #jScore"); s.value = "70"; s.dispatchEvent(new window.Event("input")); }
  check("점수만 설정 시 다이얼 반영", q("#jBody #jDialNum").textContent === "70");
  check("다이얼 라벨은 점수 기준", q("#jBody #jDialLabel").textContent === "괜찮아요");
  q('#jBody .emo-tag[data-tag="평온해요"]').click(); // 감정은 점수와 독립(2축)
  check("감정 선택해도 점수 유지(2축 독립)", q("#jBody #jDialNum").textContent === "70" && q('#jBody .emo-tag[data-tag="평온해요"]').getAttribute("aria-pressed") === "true");
  { const s = q("#jBody #jScore"); s.value = "25"; s.dispatchEvent(new window.Event("input")); }
  check("점수 바꿔도 감정 취소 안 됨", q('#jBody .emo-tag[data-tag="평온해요"]').getAttribute("aria-pressed") === "true");
  check("라벨은 점수를 따라감(독립)", q("#jBody #jDialLabel").textContent === "지쳐 있어요");
  { const s = q("#jBody #jScore"); s.value = "70"; s.dispatchEvent(new window.Event("input")); } // 원래 시나리오 복구
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
  check("점수 저장(감정과 독립)", te.score === 70);
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

  // 3b) 여정에 습관 단계 포함 (습관이 있을 때) — 새 날(기록 없음) 시뮬레이션으로 전체 경로 검증
  const _entBak = JSON.stringify(ls("entries_v2"));
  { const en = ls("entries_v2"); delete en[tk]; window.localStorage.setItem("entries_v2", JSON.stringify(en)); }
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
  window.localStorage.setItem("entries_v2", _entBak); // 오늘 기록 복원(이후 테스트는 '재편집' 상태)

  // 3d) 여정 진행 임시저장(중간에 닫아도 이어서) — 오늘 재편집은 축약 경로라 기분 단계부터 시작
  q("[data-tab=today]").click(); window.localStorage.removeItem("journey_draft_v1"); q("#journeyStart").click();
  check("오늘 재편집은 축약 경로(기분부터 바로)", !!q("#jBody #jScore"));
  q('#jBody .emo-tag[data-tag="복잡해요"]').click();
  q("#jClose").click();
  q("#journeyStart").click();
  check("여정 진행 임시저장 복원", !!q('#jBody .emo-tag[data-tag="복잡해요"]') && q('#jBody .emo-tag[data-tag="복잡해요"]').getAttribute("aria-pressed") === "true");
  q("#jClose").click(); window.localStorage.removeItem("journey_draft_v1");

  // 3e) 빠른 기록 (1화면 저장) — 재편집 축약 경로에선 첫 화면이 곧 기분
  q("[data-tab=today]").click(); window.localStorage.removeItem("journey_draft_v1"); q("#journeyStart").click();
  { const s = q("#jBody #jScore"); s.value = "82"; s.dispatchEvent(new window.Event("input")); }
  check("빠른 저장 버튼 노출", !!q("#jBody #jQuickSave"));
  q("#jBody #jQuickSave").click();
  check("빠른 저장으로 기록됨", ls("entries_v2")[tk].score === 82 && q("#journey").classList.contains("show") === false);

  // 3f) 오늘 재편집 축약 경로에도 습관 체크 단계는 유지 (여정에서 습관이 사라졌다는 피드백)
  q("[data-tab=today]").click(); window.localStorage.removeItem("journey_draft_v1"); q("#journeyStart").click();
  { const s = q("#jBody #jScore"); s.value = "70"; s.dispatchEvent(new window.Event("input")); }
  { let liteHabit = false, lg = 0;
    while (q("#jNext").textContent.indexOf("저장") < 0 && lg++ < 10) { if (q("#jBody .j-habit")) liteHabit = true; q("#jNext").click(); }
    check("오늘 재편집 경로에 습관 체크 포함", liteHabit); }
  q("#jClose").click(); window.localStorage.removeItem("journey_draft_v1");

  // 4) 통계 탭 (차트·달력·주간·인사이트 렌더)
  q("[data-tab=stats]").click();
  check("리포트 진입 표시", !!q("#weekReportBtn") && !!q("#monthDetailBtn"));
  check("기록 생기면 빈 안내 숨김", q("#statsEmptyHero").hasAttribute("hidden"));
  q("#statsSeg button[data-seg=graph]").click();
  check("기록 탭 서브탭(그래프) 전환", !q('.stats-panel[data-panel="graph"]').hasAttribute("hidden") && q('.stats-panel[data-panel="summary"]').hasAttribute("hidden"));
  check("KPI 평균 기분에 단위(점) 명시", !!q("#analyzeKpis .as-unit") && /점/.test(q("#analyzeKpis .as-kpi").textContent));
  q("#statsSeg button[data-seg=summary]").click();
  // 배지 & 레벨 — 기록 탭의 독립 서브탭 (사용자 요청)
  check("배지 서브탭 존재", !!q('#statsSeg button[data-seg="badges"]') && !!q('.stats-panel[data-panel="badges"] #badgeCard'));
  q('#statsSeg button[data-seg="badges"]').click();
  check("배지 서브탭 전환", !q('.stats-panel[data-panel="badges"]').hidden && q('.stats-panel[data-panel="summary"]').hidden);
  q('#statsSeg button[data-seg="summary"]').click();
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
  check("테마는 보타니칼·미드나잇 2종만", d.querySelectorAll(".theme-btn").length === 2 && !!q(".theme-btn[data-theme=garden]") && !!q(".theme-btn[data-theme=midnight]"));
  q("[data-theme=midnight]").click();
  check("미드나잇 테마 적용", d.documentElement.getAttribute("data-theme") === "midnight");
  q("[data-theme=garden]").click();
  check("보타니칼 테마 적용", d.documentElement.getAttribute("data-theme") === "garden");
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
  check("명상하는 법 가이드(5단계)", d.querySelectorAll("#medGuide li").length === 5);
  // 명상 시간 직접 조절(스텝퍼) + 야간 모드 + 누적 통계 + 화면 카운트다운
  const _medMin0 = +q("#medMinVal").textContent;
  q("#medStep button[data-d='1']").click();
  check("명상 시간 +버튼 직접 조절", +q("#medMinVal").textContent === _medMin0 + 1 && ls("settings_v2").medMinutes === _medMin0 + 1);
  q("#medStep button[data-d='-1']").click();
  check("명상 시간 −버튼 직접 조절", +q("#medMinVal").textContent === _medMin0);
  check("명상 화면 카운트다운 요소 존재", !!q("#medClock"));
  q("#medNightToggle").click();
  check("야간 모드 선택 저장+적용", ls("settings_v2").medNight === true && q("#medOverlay").classList.contains("sleep"));
  q("#medNightToggle").click(); // 원복
  check("명상 누적 통계 표시", q("#medStat").textContent.length > 0);
  // 호흡 패턴(4·7·8) 직접 조절 + 오버레이 사운드(볼륨·배경음 on/off)
  check("호흡 패턴·볼륨·배경음 컨트롤 존재", !!q("#medPattern") && !!q("#medVol") && !!q("#medAmbBtn"));
  const _brIn0 = +q("#patIn").textContent;
  q("#medPattern button[data-p='in'][data-d='1']").click();
  check("호흡 패턴(478) 직접 조절+반영", +q("#patIn").textContent === _brIn0 + 1 && ls("settings_v2").brIn === _brIn0 + 1 && q("#medOverlay .cb-seg.s-in").textContent.includes(String(_brIn0 + 1)));
  check("패턴 변경이 안내 문구에도 반영", q("#medHowBreath").textContent.includes(`${_brIn0 + 1}초 들이쉬고`));
  q("#medPattern button[data-p='in'][data-d='-1']").click(); // 원복
  q("#medAmbBtn").click();
  check("명상 화면에서 배경음 켜기", ls("settings_v2").ambientType === "rain");
  q("#medAmbBtn").click();
  check("명상 화면에서 배경음 끄기", ls("settings_v2").ambientType === "off");
  q("#medVol").value = "30"; q("#medVol").dispatchEvent(new window.Event("input")); q("#medVol").dispatchEvent(new window.Event("change"));
  check("명상 화면 볼륨 조절 저장", ls("settings_v2").ambientVol === 30);
  // 명상 가이드 — 누르면 전체화면 전환 + 단계 애니메이션 → 호흡으로 연결
  q("#medStartBtn").click();
  check("명상 가이드 전체화면 열림", !q("#medOverlay").hasAttribute("hidden") && q("#medStepTitle").textContent.length > 0);
  check("명상 가이드 진행 점 5개", d.querySelectorAll("#medDots i").length === 5);
  // 드래그(스와이프)로 다음 단계
  const _medT1 = q("#medStepTitle").textContent;
  q("#medOverlay").dispatchEvent(new window.MouseEvent("pointerdown", { clientX: 220 }));
  q("#medOverlay").dispatchEvent(new window.MouseEvent("pointerup", { clientX: 110 }));
  check("명상 가이드 스와이프로 단계 이동", q("#medStepTitle").textContent !== _medT1);
  check("삼각 궤적 호흡 비주얼(변=단계)", q("#medCircle").classList.contains("cb-stage") && !!q("#medCircle .tb-line") && !!q("#medCircle .tb-dot"));
  check("장식 기하(연꽃·만다라) 제거됨", !q("#medOverlay .cb-flower") && !q("#medOverlay .cb-geo"));
  check("삼각형 내부 오브 제거 + 변별 트레일 3개", !q("#medCircle .cb-orb") && !!q("#medCircle .tb-e1") && !!q("#medCircle .tb-e2") && !!q("#medCircle .tb-e3"));
  check("구형 궤도·링 잔재 없음", !q("#medOverlay .cb-plane") && !q("#medOverlay .cb-dot") && !q("#medOverlay .cb-ring-prog") && !q("#medOverlay .cb-rise"));
  check("단계 라벨 상단·카운트 하단 구조", q("#medCircle").firstElementChild.classList.contains("cb-phase") && !!q("#medCircle > .cb-count#medCircleText"));
  check("진행 버튼 라벨(스킵 오해 방지)", q("#medNext").textContent.includes("다음"));
  { let g = 0; while (!q("#medCircle").className.includes("ready") && g++ < 8) q("#medNext").click(); } // 마지막 슬라이드 → 호흡 시작
  check("명상 가이드 호흡으로 전환", q("#medCircle").className.includes("ready"));
  q("#medClose").click();
  check("명상 가이드 닫힘", q("#medOverlay").hasAttribute("hidden"));
  // 키보드 접근성 — Esc로 명상 가이드 탈출
  q("#medStartBtn").click();
  check("오버레이 열림 시 배경 inert", q("main.app").hasAttribute("inert"));
  d.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  check("명상 가이드 Esc로 닫힘", q("#medOverlay").hasAttribute("hidden") && !q("main.app").hasAttribute("inert"));
  q("#restSeg button[data-rseg=comfort]").click();
  check("위로 패널로 전환", !q('.rest-panel[data-rpanel="comfort"]').hasAttribute("hidden") && q('.rest-panel[data-rpanel="meditate"]').hasAttribute("hidden"));
  q("#restSeg button[data-rseg=meditate]").click();
  q("#safetyBreath").click(); // 위기 진정 → 호흡 오버레이 열기
  check("호흡 시작 시 카운트 표시", /\d/.test(q("#qbText").innerHTML));
  check("빠른 호흡도 삼각 궤적으로 통일", !!q("#breathOverlay .cb-stage") && !!q("#breathOverlay .tb-line") && !!q("#breathOverlay .tb-dot"));
  check("Sound.tick 존재", typeof window.Sound.tick === "function");
  check("Sound.breathStart/Stop 존재", typeof window.Sound.breathStart === "function" && typeof window.Sound.breathStop === "function");
  check("호흡명상 카드·우상단 FAB 제거됨", !q("#breathBtn") && !q("#quickBreathFab"));
  // 수면 모드 토글
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
  check("미설정 안내가 사용자 친화 문구(개발 용어 없음)", !q("#cloudNotConfigured").textContent.includes("config.js") && !q("#cloudNotConfigured").textContent.includes("SQL"));
  check("로그인 UI 숨김(미설정)", q("#cloudLoggedOut").hasAttribute("hidden"));
  const merged = window.Cloud._merge(
    { entries: { a: { updatedAt: "2020-01-01", x: 1 } }, challenges: [{ id: "h", done: { d1: true }, celebrated: [1] }], projects: [], settings: { tone: "plain" } },
    { entries: { a: { updatedAt: "2030-01-01", x: 2 }, b: { updatedAt: "2025-01-01" } }, challenges: [{ id: "h", done: { d2: true }, celebrated: [3] }], projects: [], settings: { tone: "warm", theme: "dark" } }
  );
  check("병합: 최신 일기 채택", merged.entries.a.x === 2);
  check("병합: 원격 전용 일기 보존", !!merged.entries.b);
  check("병합: 습관 완료 합집합", merged.challenges[0].done.d1 && merged.challenges[0].done.d2);
  check("병합: 설정은 로컬 우선+원격 보완", merged.settings.tone === "plain" && merged.settings.theme === "dark");
  // 동기화 안전화(레드팀 그룹2): 삭제 묘비·해제 최신성
  const m2 = window.Cloud._merge(
    { entries: {}, challenges: [], settings: {}, tombstones: { entries: { "2026-06-01": "2026-06-10T00:00:00Z" }, habits: {} } },
    { entries: { "2026-06-01": { updatedAt: "2026-06-01T00:00:00Z", mood: "지쳤어요" } }, challenges: [], settings: {} }
  );
  check("병합: 삭제한 일기가 부활하지 않음(tombstone)", !m2.entries["2026-06-01"]);
  const m3 = window.Cloud._merge(
    { entries: {}, challenges: [], settings: {}, tombstones: { entries: { "2026-06-01": "2026-06-01T00:00:00Z" }, habits: {} } },
    { entries: { "2026-06-01": { updatedAt: "2026-06-09T00:00:00Z", mood: "괜찮아요" } }, challenges: [], settings: {} }
  );
  check("병합: 삭제 후 더 최신 편집은 보존", !!m3.entries["2026-06-01"]);
  const m4 = window.Cloud._merge(
    { entries: {}, challenges: [{ id: "h", done: {}, doneAt: { "2026-06-05": "2026-06-06T00:00:00Z" }, celebrated: [] }], settings: {} },
    { entries: {}, challenges: [{ id: "h", done: { "2026-06-05": true }, doneAt: { "2026-06-05": "2026-06-05T00:00:00Z" }, celebrated: [] }], settings: {} }
  );
  check("병합: 더 최신 '해제'가 완료를 덮음(부활 방지)", !m4.challenges[0].done["2026-06-05"]);
  const m5 = window.Cloud._merge(
    { entries: {}, challenges: [], settings: {}, tombstones: { entries: {}, habits: { h: "2026-06-10T00:00:00Z" } } },
    { entries: {}, challenges: [{ id: "h", done: {}, celebrated: [] }], settings: {} }
  );
  check("병합: 그만둔 습관이 부활하지 않음", !m5.challenges.some((h) => h && h.id === "h"));

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
  check("발견 습관 카드 = 관찰 서술 + 인과 아님 명시", [...d.querySelectorAll("#discoveries .disc")].some((n) => /더 높았어요/.test(n.textContent) && /인과는 아니에요/.test(n.textContent)));
  const hmToday = new Date().toISOString().slice(0, 10);
  window.localStorage.setItem("challenges_v2", JSON.stringify([{ id: "hc", emoji: "🚶", title: "산책", startDate: "2026-06-01", done: { ...doneMap, [hmToday]: true }, celebrated: [] }]));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  check("기능 다이어트: 기록구성·실천매트릭스 제거(습관 분석은 요약+상관 2장)", !q("#habitHeatmap") && !q('[data-sec="heat"]') && !q('[data-sec="capture"]') && !q("#captureBody"));
  check("습관 요약(실천률·연속) 표시", d.querySelectorAll("#habitSummary .hsum-row").length >= 1 && /%/.test(q("#habitSummary").textContent) && /연속/.test(q("#habitSummary").textContent));
  check("요약 서브탭 습관 한눈에 표시", !q("#summaryHabitGlance").hasAttribute("hidden") && d.querySelectorAll("#summaryHabitList .hg-row").length >= 1 && /오늘 \d+\/\d+/.test(q("#summaryHabitCount").textContent));
  // 메인(오늘) 화면에도 습관 노출 + 거기서 바로 오늘 완료 체크
  q("[data-tab=today]").click();
  check("오늘 화면 습관 한눈에 표시", !q("#todayHabitGlance").hasAttribute("hidden") && d.querySelectorAll("#todayHabitList .hg-row").length >= 1);
  check("습관 인사이트는 기록 요약에서만(오늘 화면은 체크 중심)", !q("#todayHabitList .hg-insight") && !!q("#summaryHabitList .hg-insight") && q("#summaryHabitList .hg-insight").textContent.includes("산책"));
  check("오늘 화면 습관 오늘 완료 반영", !!q("#todayHabitList .hg-check.done"));
  { // 습관 4개 이상 → 한눈에는 3개 + 더보기(스크롤 제로 유지), 오늘 안 한 습관 우선
    const _chBak = window.localStorage.getItem("challenges_v2");
    const many = [1, 2, 3, 4, 5].map((n) => ({ id: "hm" + n, emoji: "✅", title: "습관" + n, startDate: rk(10), done: n <= 2 ? { [tk]: true } : {}, doneAt: {}, celebrated: [] }));
    window.localStorage.setItem("challenges_v2", JSON.stringify(many));
    window.renderTodayHabitGlance();
    check("습관 5개면 한눈에 3개 + 더보기", d.querySelectorAll("#todayHabitList .hg-row").length === 3 && !!q("#todayHabitList .hg-more"));
    check("오늘 안 한 습관 우선 노출", [...d.querySelectorAll("#todayHabitList .hg-check")].every((b) => !b.classList.contains("done")));
    window.localStorage.setItem("challenges_v2", _chBak); window.renderTodayHabitGlance();
  }
  q("#todayHabitList .hg-check").click();
  check("오늘 화면에서 습관 체크 해제(저장)", !q("#todayHabitList .hg-check.done") && !ls("challenges_v2")[0].done[hmToday]);
  q("#todayHabitList .hg-check").click(); // 원복
  check("오늘 화면에서 습관 재체크(저장)", !!q("#todayHabitList .hg-check.done") && ls("challenges_v2")[0].done[hmToday] === true);
  q("[data-tab=stats]").click();
  check("감정 지도 섹션 제거됨", !q("#moodMatrix") && !q('#allAnalysis [data-sec="matrix"]'));
  // 마음 리듬 (요일×시간대 히트맵) — 작성 시각(createdAt|updatedAt, 그날 작성분만) 기준
  const rh = {};
  [rk(7), rk(6), rk(5), rk(4)].forEach((dt, i) => { rh[dt] = { date: dt, mood: i % 2 ? "활기차요" : "지쳤어요", updatedAt: dt + "T09:30:00" }; });
  window.localStorage.setItem("entries_v2", JSON.stringify(rh));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  check("마음 리듬 히트맵 표시", d.querySelectorAll("#rhythmGrid .rh-cell:not(.rh-empty)").length >= 4);
  check("리듬 표본1회 셀은 경향처럼 색칠 안 함", d.querySelectorAll("#rhythmGrid .rh-dim").length >= 1);
  check("분석 탭 발견 영역 표시", d.querySelectorAll("#discoveries .disc").length >= 1);
  check("분석 탭 핵심 지표 4종 표시", d.querySelectorAll("#analyzeKpis .as-kpi").length === 4);
  check("기본 카드 순서 1차 지표(dist) 우선", q("#allAnalysis > [data-sec]").getAttribute("data-sec") === "dist");
  check("1차 지표 카드는 기본 펼침", !q('[data-sec="dist"]').classList.contains("collapsed"));
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

  // 감정 빈도 뷰(감정 축) — 빈도 막대 + 색은 감정 고유 정서가(점수와 독립)
  window.localStorage.setItem("entries_v2", JSON.stringify({
    [rk(3)]: { date: rk(3), mood: "활기차요", score: 90, tags: ["불안해요", "평온해요"], updatedAt: rk(3) + "T09:00:00" },
    [rk(2)]: { date: rk(2), mood: "활기차요", score: 88, tags: ["불안해요"], updatedAt: rk(2) + "T09:00:00" },
    [rk(1)]: { date: rk(1), mood: "괜찮아요", score: 70, tags: ["평온해요", "고마워요"], updatedAt: rk(1) + "T09:00:00" },
  }));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  const fr = d.querySelectorAll("#tagInsight .freq .dist-row");
  check("감정 빈도 막대 표시", fr.length >= 3);
  check("감정 빈도 '회/%' 표기", /회·\d+%/.test(q("#tagInsight").textContent));
  check("감정 빈도 내림차순(불안해요 최다)", /불안해요/.test(fr[0].textContent));
  const frBar = fr[0].querySelector(".dist-bar").getAttribute("style");
  // 불안(v27→#f0b07a)으로 칠해져야 하고, 그날 높은 점수(89 평균→초록 #5ec8b0)와 무관해야 함(2축 분리)
  check("감정 막대 색=감정 고유 정서가(점수와 독립)", frBar.includes("#f0b07a") && !frBar.includes("#5ec8b0"));
  // 점수 축 카드 — 흐름(그래프)과 분포(스트립)가 한 카드로 연결, 활력선은 제거
  check("마음 흐름·분포 통합 카드", !!q("#dist .rc-svg") && !!q("#dist .dist-stack") && !!q("#dist .fd-cap"));
  check("마음 흐름 활력선 제거", !d.querySelector(".rc-energy") && !d.querySelector(".rl-energy"));
  check("KPI 라벨에 기간 명시(7일·30일)", /7일/.test(q("#analyzeKpis").textContent) && /30일/.test(q("#analyzeKpis").textContent));
  check("분포 세그먼트에 % 병기(색맹 대응)", /\d+%/.test(q("#dist .dist-stack").textContent));

  // 11c) 통계 무결성 — 표본 게이트·연속 보호 표기·손상 tags 방어 (알고리즘 감사 반영)
  { // weekTrend: 1건 vs 1건이면 판단 보류(null) — 허위 ▲▼ 차단. 3건 vs 3건이면 델타 산출
    const tt = {}, mk = (i) => { const d = new Date(); d.setDate(d.getDate() - i); return window.todayKey(d); };
    tt[mk(0)] = { date: mk(0), mood: "활기차요", score: 80 };
    tt[mk(8)] = { date: mk(8), mood: "지쳤어요", score: 40 };
    check("주간 추세: 1건vs1건은 판단 보류", window.weekTrend(tt) === null);
    [1, 2].forEach((i) => tt[mk(i)] = { date: mk(i), score: 80 });
    [9, 10].forEach((i) => tt[mk(i)] = { date: mk(i), score: 40 });
    const tr2 = window.weekTrend(tt);
    check("주간 추세: 3건vs3건이면 델타 산출", !!tr2 && tr2.delta === 40);
  }
  { // 연속 보호 — 하루 공백은 보호로 메워지되 사용 횟수가 표기용으로 보고됨
    const st = {}, mk = (i) => { const d = new Date(); d.setDate(d.getDate() - i); return window.todayKey(d); };
    [0, 2, 3, 4, 5, 6, 7, 8].forEach((i) => st[mk(i)] = { date: mk(i), mood: "괜찮아요" });
    const si = window.calcStreakInfo(st);
    check("연속 보호: 공백 메움 + 사용횟수 보고", si.streak === 8 && si.freezesUsed === 1);
  }
  { // 손상 데이터: tags가 문자열이어도 크래시 없이 배열로 정규화되어 렌더
    const curEn = JSON.parse(window.localStorage.getItem("entries_v2"));
    curEn["2026-06-09"] = { date: "2026-06-09", mood: "괜찮아요", tags: "불안해요", updatedAt: "2026-06-09T09:00:00" };
    window.localStorage.setItem("entries_v2", JSON.stringify(curEn));
    check("손상 tags(문자열) 배열 정규화", Array.isArray(window.loadEntries()["2026-06-09"].tags));
    q("[data-tab=today]").click(); q("[data-tab=stats]").click();
    check("손상 tags에도 감정 빈도 렌더", d.querySelectorAll("#tagInsight .freq .dist-row").length >= 3);
  }

  // 여정 감정태그에 '빈도' 배지 (점수 아님) — 위 entries로 평온해요 2회
  q("[data-tab=today]").click(); window.localStorage.removeItem("journey_draft_v1"); q("#journeyStart").click();
  q("#jNext").click(); // 한마디 → 기분(feel)
  const etag = q('#jBody .emo-tag[data-tag="평온해요"] .emo-freq');
  check("여정 감정태그 빈도 배지 표시", !!etag && /·\d/.test(etag.textContent));
  // 점수 미조작 시 OS confirm 대신 이중 확인(첫 누름=안내·머무름, 둘째 누름=50으로 진행)
  q("#jNext").click();
  check("점수 미조작 첫 '다음'은 안내 후 머무름", !!q("#jBody #jScore"));
  q("#jNext").click();
  check("두 번째 '다음'은 보통(50)으로 진행", !q("#jBody #jScore"));
  q("#jClose").click();
  // 마음 달력 통합 글리프 (기분+습관+활력+일기 한 칸에)
  const calToday = new Date().toISOString().slice(0, 10);
  window.localStorage.setItem("entries_v2", JSON.stringify({ [calToday]: { date: calToday, mood: "활기차요", energy: 4, note: "좋은 하루였어요", updatedAt: calToday + "T10:00:00" } }));
  window.localStorage.setItem("challenges_v2", JSON.stringify([{ id: "hc", emoji: "🚶", title: "산책", startDate: "2020-01-01", done: { [calToday]: true }, celebrated: [] }]));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  check("이번 주 한눈에 습관 달성률 데이터 표시", /\d+%/.test(q("#wgBody").textContent) && /습관/.test(q("#wgBody").textContent));
  q("[data-tab=calendar]").click();
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
  { // 기간 이동 — 지난 주를 되짚어 볼 수 있고, 과거 기간에선 저장·공유(현재 기간 캔버스)를 숨김
    const p0 = q("#subBody .rpt-period").textContent;
    q('#subBody [data-ract="nav"][data-off="1"]').click();
    check("리포트 지난 주 이동", q("#subBody .rpt-period").textContent !== p0 && !q('#subBody [data-ract="share"]'));
    q('#subBody [data-ract="nav"][data-off="0"]').click();
    check("리포트 이번 주 복귀(공유 복원)", q("#subBody .rpt-period").textContent === p0 && !!q('#subBody [data-ract="share"]'));
  }
  { // 차트 그라데이션 id 중복 금지 — 겹치면 숨겨진 쪽으로 해석돼 선이 안 그려짐(다크에서 발견)
    const gids = Array.from(d.querySelectorAll("linearGradient[id]")).map((g) => g.id);
    check("SVG 그라데이션 id 문서 내 고유", gids.length > 0 && new Set(gids).size === gids.length);
  }
  check("리포트 진단·처방 표시", !!q("#subBody .diag-card") && !!q("#subBody .sol-card .sol"));
  check("리포트 처방에 의료 면책 문구", !!q("#subBody .sol-disclaimer") && /의료적/.test(q("#subBody .sol-disclaimer").textContent) && /전문가/.test(q("#subBody .sol-disclaimer").textContent));
  check("의료 프레이밍 회피(살펴보기·제안)", /살펴보기/.test(q("#subBody .diag-label").textContent) && /맞춤 제안/.test(q("#subBody .sol-card h2").textContent));
  check("리포트 습관 분석 카드 표시", !!q("#subBody .hrep-card") && d.querySelectorAll("#subBody .hrep-card .hrep-row").length >= 1);
  check("리포트 습관 분석 결론·달성률 표시", !!q("#subBody .hrep-card .hrep-ins-row") && /%/.test(q("#subBody .hrep-card .hrep-avg").textContent) && /연속/.test(q("#subBody .hrep-card").textContent));
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
  // 생각의 지도 자동 군집(Louvain) — 분리된 두 주제는 다른 색으로 묶임
  window.localStorage.setItem("entries_v2", JSON.stringify({
    "2026-06-01": { date: "2026-06-01", mood: "지쳤어요", note: "회사 야근 스트레스 회의", updatedAt: "2026-06-01T09:00:00" },
    "2026-06-02": { date: "2026-06-02", mood: "지쳤어요", note: "회사 야근 스트레스 미팅", updatedAt: "2026-06-02T09:00:00" },
    "2026-06-03": { date: "2026-06-03", mood: "행복해요", note: "가족 여행 사진 행복", updatedAt: "2026-06-03T09:00:00" },
    "2026-06-04": { date: "2026-06-04", mood: "행복해요", note: "가족 여행 추억 행복", updatedAt: "2026-06-04T09:00:00" },
  }));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  const wwCircles = [...d.querySelectorAll("#wordWeb .ww-node circle")];
  check("생각의 지도 노드 4+ 표시", wwCircles.length >= 4);
  check("생각의 지도 자동 군집(2색 이상)", new Set(wwCircles.map((c) => c.getAttribute("fill"))).size >= 2);
  check("생각의 지도 주제 묶음 범례", d.querySelectorAll("#wordWeb .ww-clusters .ww-cl").length >= 2);
  // 2차 연결(분포 유사도): '돈'과 '벌다'는 서로 안 만났어도 공통 이웃(회사·야근)으로 이어짐
  window.localStorage.setItem("entries_v2", JSON.stringify({
    "2026-05-01": { date: "2026-05-01", mood: "지쳤어요", note: "돈 걱정 회사 야근", updatedAt: "2026-05-01T09:00:00" },
    "2026-05-02": { date: "2026-05-02", mood: "지쳤어요", note: "벌어 회사 야근 통장", updatedAt: "2026-05-02T09:00:00" },
  }));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  { const lab = [...d.querySelectorAll("#wordWeb .ww-node")].map((g) => ({ wi: +g.dataset.wi, w: g.querySelector(".ww-label").textContent }));
    const dn = lab.find((x) => x.w === "돈"), bl = lab.find((x) => x.w === "벌다");
    const linked = !!dn && !!bl && [...d.querySelectorAll("#wordWeb .ww-edge")].some((e) => { const a = +e.dataset.a, b = +e.dataset.b; return (a === dn.wi && b === bl.wi) || (a === bl.wi && b === dn.wi); });
    check("2차 연결: 돈↔벌다 (공통 이웃으로 연결)", linked); }
  check("처방 DB 500개 이상", (window.__rxCount || 0) >= 500);
  q("#subBack").click();

  // 13) 오류 모니터링(Sentry 호환) — DSN 있을 때만 envelope 전송, 개인정보 미포함
  const _fetchCalls = [];
  window.fetch = (url, opts) => { _fetchCalls.push({ url, opts }); return Promise.resolve({ ok: true }); };
  window.ONEUL_CONFIG.SENTRY_DSN = "https://pubkey@o1.ingest.sentry.io/2";
  window.eval(read("monitor.js"));
  check("모니터: DSN 설정 시 활성화", window.Monitor && typeof window.Monitor.capture === "function");
  window.Monitor.capture(new Error("테스트오류"));
  check("모니터: 오류를 envelope로 전송", _fetchCalls.some((c) => /ingest\.sentry\.io\/api\/2\/envelope/.test(c.url) && /테스트오류/.test(String(c.opts && c.opts.body))));
  check("모니터: 개인정보(일기·기록) 미전송", !_fetchCalls.some((c) => /entries_v2|journey_draft|"note"|"praise"/.test(String(c.opts && c.opts.body))));

  // 13b) 보안: 가져온/동기화된 습관 객체의 XSS 정화(loadChs 정화 체인)
  if (window.cleanHabit) {
    const dirty = window.cleanHabit({ id: 'x"><img src=q onerror=alert(1)>', emoji: '<img src=x onerror=alert(1)>', title: "x".repeat(500), startDate: "bad-date", done: { "2026-06-01": true, "evil<key>": true }, celebrated: [1, "x"] });
    check("XSS 정화: id 위험문자 제거", !/[<>"'&]/.test(dirty.id) && dirty.id.length > 0);
    check("XSS 정화: emoji 위험문자 제거", !/[<>&"'`]/.test(dirty.emoji));
    check("XSS 정화: title 길이 제한", dirty.title.length <= 120);
    check("XSS 정화: 잘못된 done 키 제거", dirty.done["2026-06-01"] === true && !("evil<key>" in dirty.done));
    check("XSS 정화: 잘못된 startDate 보정", /^\d{4}-\d{2}-\d{2}$/.test(dirty.startDate));
  } else check("XSS 정화: cleanHabit 노출", false);
  // 13c) 안전: 위기 표현 감지(간접·핫라인) — 직접 표현은 잡고, 안전 카드 핫라인은 109
  if (window.detectCrisis) {
    check("위기 감지: 직접 표현 탐지", window.detectCrisis("요즘 너무 죽고 싶어") === true);
    check("위기 감지: 띄어쓰기 변형 포착", window.detectCrisis("자꾸 죽 고 싶 어") === true);
    check("위기 감지: 간접 표현 포착", window.detectCrisis("그냥 다 사라지고 싶다") === true);
    check("위기 감지: 영어 표현 포착", window.detectCrisis("i want to die") === true);
    check("위기 감지: 부정문 오탐 방지", window.detectCrisis("요즘은 죽고 싶지 않아서 다행이야") === false);
    check("위기 감지: 비위기 텍스트 통과", window.detectCrisis("오늘은 산책해서 기분이 좋았다") === false);
  } else check("위기 감지: detectCrisis 노출", false);
  check("안전 카드 핫라인 109 표기", /\b109\b/.test(q("#safetyCard").textContent));

  // 13d) 접근성/하드닝: 탭 ARIA · aria-live · CSP
  check("접근성: 탭바 tablist 역할 + tab 6개", q("#tabbar").getAttribute("role") === "tablist" && d.querySelectorAll('#tabbar [role="tab"]').length === 6);
  q("[data-tab=stats]").click();
  check("접근성: 활성 탭 aria-selected 갱신", q('#tabbar [data-tab="stats"]').getAttribute("aria-selected") === "true" && q('#tabbar [data-tab="today"]').getAttribute("aria-selected") === "false");
  check("접근성: 응원문구 aria-live", q("#tsCheer").getAttribute("aria-live") === "polite");
  check("하드닝: CSP 메타 + script-src 'self'", !!q('meta[http-equiv="Content-Security-Policy"]') && /script-src 'self'/.test(q('meta[http-equiv="Content-Security-Policy"]').getAttribute("content")));

  // 13e) 후속: 상시 도움 링크 · 안전 카드 tel · 담백 모드 축하 억제
  check("안전: 상시 도움받기 카드 + 109 tel 링크", !!q("#helpAlways") && !!q('#helpAlways a[href="tel:109"]'));
  check("안전: 안전 카드 번호 tel 링크화", !!q('#safetyCard a[href="tel:119"]'));
  if (window.confetti) {
    d.querySelectorAll(".confetti").forEach((n) => n.remove());
    q("[data-tab=settings]").click();
    q('#toneSeg button[data-tone=plain]').click(); window.confetti();
    check("다크패턴: 담백 모드에서 축하 연출 생략", d.querySelectorAll(".confetti").length === 0);
    q('#toneSeg button[data-tone=warm]').click(); window.confetti();
    check("다크패턴: 기본 모드에선 축하 연출 표시", d.querySelectorAll(".confetti").length > 0);
    d.querySelectorAll(".confetti").forEach((n) => n.remove());
  }
  q("[data-tab=today]").click();

  // 14) 아기자기 연출 — 반짝임 버스트(라이브러리 없이) + Lottie 폴백
  check("Anim 사용 가능", window.Anim && typeof window.Anim.sparkle === "function" && typeof window.Anim.celebrate === "function");
  window.Anim.sparkle(null, { x: 20, y: 20, count: 6 });
  check("반짝임 파티클 생성", d.querySelectorAll(".spk").length >= 6);
  check("빛 수렴(converge) 함수 존재", typeof window.Anim.converge === "function");
  window.Anim.converge(null, { x: 20, y: 20, count: 8 });
  check("빛 수렴 입자 생성", d.querySelectorAll(".lpt").length >= 8);
  check("Lottie 에셋 없으면 sparkle 폴백(반짝임 추가 생성)", (window.Anim.celebrate(null), d.querySelectorAll(".spk").length >= 12));

  // 12) PWA 출시 준비 (아이콘·메타 정합성)
  const manifest = JSON.parse(read("manifest.json"));
  check("PWA: PNG 아이콘(any+maskable)·id·카테고리", !!manifest.id && (manifest.categories || []).length > 0 && manifest.icons.filter((i) => i.type === "image/png").length >= 4 && fs.existsSync(path.join(root, "icon-512.png")) && fs.existsSync(path.join(root, "icon-maskable-512.png")));
  check("PWA: 테마색 meta·manifest 일치", read("index.html").includes(`content="${manifest.theme_color}"`)); // 런타임엔 테마별로 동적 변경되므로 정적 소스 기준
  check("PWA: 애플 터치 아이콘 PNG", (d.querySelector('link[rel="apple-touch-icon"]').getAttribute("href") || "").endsWith(".png") && fs.existsSync(path.join(root, "apple-touch-icon.png")));
  check("버전 표기(meta+설정 화면)", !!d.querySelector('meta[name="app-version"]') && q("#appVer").textContent.includes("v"));
  check("이용약관 페이지 + 설정 링크", fs.existsSync(path.join(root, "terms.html")) && read("terms.html").includes("의료") && !!q('a[href="terms.html"]'));
  check("manifest 스크린샷 등록 + 파일 존재", (manifest.screenshots || []).length >= 3 && manifest.screenshots.every((s) => fs.existsSync(path.join(root, s.src))));
} catch (e) {
  errors.push("INTERACT THROW: " + e.message + "\n" + (e.stack || ""));
}

console.log(`\n${passed} passed, ${errors.length} failed`);
if (errors.length) { console.error("\n실패 항목:\n - " + errors.join("\n - ")); process.exit(1); }
console.log("✅ 모든 스모크 테스트 통과");
