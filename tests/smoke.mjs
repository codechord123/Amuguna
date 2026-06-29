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
  check("호흡 비주얼(cb-stage·발광 구체·떠오름)", q("#medCircle").classList.contains("cb-stage") && !!q("#medCircle .cb-orb") && !!q("#medCircle .cb-rise"));
  check("장식 기하(연꽃·만다라) 제거됨", !q("#medOverlay .cb-flower") && !q("#medOverlay .cb-geo"));
  check("발광 아우라 + 장면 조명 유지", !!q("#medOverlay .cb-aura") && !!q("#medOverlay .cb-glow"));
  check("바닥 그림자(부유감) 추가", !!q("#medOverlay .cb-shadow") && !!q("#breathOverlay .cb-shadow"));
  check("기계적 궤도·공·3D 제거됨", !q("#medOverlay .cb-plane") && !q("#medOverlay .cb-dot") && !q("#medOverlay .cb-ring-prog"));
  check("카운트(빛 속 숫자) 떠오름 그룹 안에", !!q("#medOverlay .cb-rise #medCircleText"));
  q("#medNext").click(); // 건너뛰고 호흡 시작
  check("명상 가이드 호흡으로 전환", q("#medCircle").className.includes("ready"));
  q("#medClose").click();
  check("명상 가이드 닫힘", q("#medOverlay").hasAttribute("hidden"));
  q("#restSeg button[data-rseg=comfort]").click();
  check("위로 패널로 전환", !q('.rest-panel[data-rpanel="comfort"]').hasAttribute("hidden") && q('.rest-panel[data-rpanel="meditate"]').hasAttribute("hidden"));
  q("#restSeg button[data-rseg=meditate]").click();
  q("#safetyBreath").click(); // 위기 진정 → 호흡 오버레이 열기
  check("호흡 시작 시 카운트 표시", /\d/.test(q("#qbText").innerHTML));
  check("빠른 호흡도 떠오르는 빛으로 통일", !!q("#breathOverlay .cb-stage") && !!q("#breathOverlay .cb-orb") && !!q("#breathOverlay .cb-rise"));
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
  check("습관 요약(실천률·연속) 표시", d.querySelectorAll("#habitSummary .hsum-row").length >= 1 && /%/.test(q("#habitSummary").textContent) && /🔥/.test(q("#habitSummary").textContent));
  check("요약 서브탭 습관 한눈에 표시", !q("#summaryHabitGlance").hasAttribute("hidden") && d.querySelectorAll("#summaryHabitList .hg-row").length >= 1 && /오늘 \d+\/\d+/.test(q("#summaryHabitCount").textContent));
  // 메인(오늘) 화면에도 습관 노출 + 거기서 바로 오늘 완료 체크
  q("[data-tab=today]").click();
  check("오늘 화면 습관 한눈에 표시", !q("#todayHabitGlance").hasAttribute("hidden") && d.querySelectorAll("#todayHabitList .hg-row").length >= 1);
  check("오늘 화면 습관 분석 인사이트 한 줄 표시", !!q("#todayHabitList .hg-insight") && q("#todayHabitList .hg-insight").textContent.includes("산책"));
  check("오늘 화면 습관 오늘 완료 반영", !!q("#todayHabitList .hg-check.done"));
  q("#todayHabitList .hg-check").click();
  check("오늘 화면에서 습관 체크 해제(저장)", !q("#todayHabitList .hg-check.done") && ls("challenges_v2")[0].done[hmToday] === false);
  q("#todayHabitList .hg-check").click(); // 원복
  check("오늘 화면에서 습관 재체크(저장)", !!q("#todayHabitList .hg-check.done") && ls("challenges_v2")[0].done[hmToday] === true);
  q("[data-tab=stats]").click();
  check("감정 지도 섹션 제거됨", !q("#moodMatrix") && !q('#allAnalysis [data-sec="matrix"]'));
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

  // 감정 빈도 뷰(감정 축) — 빈도 막대 + 색은 감정 고유 정서가(점수와 독립)
  window.localStorage.setItem("entries_v2", JSON.stringify({
    "2026-06-10": { date: "2026-06-10", mood: "활기차요", score: 90, tags: ["불안해요", "평온해요"], updatedAt: "2026-06-10T09:00:00" },
    "2026-06-11": { date: "2026-06-11", mood: "활기차요", score: 88, tags: ["불안해요"], updatedAt: "2026-06-11T09:00:00" },
    "2026-06-12": { date: "2026-06-12", mood: "괜찮아요", score: 70, tags: ["평온해요", "고마워요"], updatedAt: "2026-06-12T09:00:00" },
  }));
  q("[data-tab=today]").click(); q("[data-tab=stats]").click();
  const fr = d.querySelectorAll("#tagInsight .freq .dist-row");
  check("감정 빈도 막대 표시", fr.length >= 3);
  check("감정 빈도 '회/%' 표기", /회·\d+%/.test(q("#tagInsight").textContent));
  check("감정 빈도 내림차순(불안해요 최다)", /불안해요/.test(fr[0].textContent));
  const frBar = fr[0].querySelector(".dist-bar").getAttribute("style");
  // 불안(v27→#f0b07a)으로 칠해져야 하고, 그날 높은 점수(89 평균→초록 #5ec8b0)와 무관해야 함(2축 분리)
  check("감정 막대 색=감정 고유 정서가(점수와 독립)", frBar.includes("#f0b07a") && !frBar.includes("#5ec8b0"));

  // 여정 감정태그에 '빈도' 배지 (점수 아님) — 위 entries로 평온해요 2회
  q("[data-tab=today]").click(); window.localStorage.removeItem("journey_draft_v1"); q("#journeyStart").click();
  q("#jNext").click(); // 한마디 → 기분(feel)
  const etag = q('#jBody .emo-tag[data-tag="평온해요"] .emo-freq');
  check("여정 감정태그 빈도 배지 표시", !!etag && /·\d/.test(etag.textContent));
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
  check("리포트 진단·처방 표시", !!q("#subBody .diag-card") && !!q("#subBody .sol-card .sol"));
  check("리포트 습관 분석 카드 표시", !!q("#subBody .hrep-card") && d.querySelectorAll("#subBody .hrep-card .hrep-row").length >= 1);
  check("리포트 습관 분석 결론·달성률 표시", !!q("#subBody .hrep-card .hrep-ins-row") && /%/.test(q("#subBody .hrep-card .hrep-avg").textContent) && /🔥/.test(q("#subBody .hrep-card").textContent));
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
    check("위기 감지: 비위기 텍스트 통과", window.detectCrisis("오늘은 산책해서 기분이 좋았다") === false);
  } else check("위기 감지: detectCrisis 노출", false);
  check("안전 카드 핫라인 109 표기", /\b109\b/.test(q("#safetyCard").textContent));

  // 14) 아기자기 연출 — 반짝임 버스트(라이브러리 없이) + Lottie 폴백
  check("Anim 사용 가능", window.Anim && typeof window.Anim.sparkle === "function" && typeof window.Anim.celebrate === "function");
  window.Anim.sparkle(null, { x: 20, y: 20, count: 6 });
  check("반짝임 파티클 생성", d.querySelectorAll(".spk").length >= 6);
  check("빛 수렴(converge) 함수 존재", typeof window.Anim.converge === "function");
  window.Anim.converge(null, { x: 20, y: 20, count: 8 });
  check("빛 수렴 입자 생성", d.querySelectorAll(".lpt").length >= 8);
  check("Lottie 에셋 없으면 sparkle 폴백(반짝임 추가 생성)", (window.Anim.celebrate(null), d.querySelectorAll(".spk").length >= 12));
} catch (e) {
  errors.push("INTERACT THROW: " + e.message + "\n" + (e.stack || ""));
}

console.log(`\n${passed} passed, ${errors.length} failed`);
if (errors.length) { console.error("\n실패 항목:\n - " + errors.join("\n - ")); process.exit(1); }
console.log("✅ 모든 스모크 테스트 통과");
