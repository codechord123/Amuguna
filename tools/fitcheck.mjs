// 스크롤 제로 레이아웃 회귀 검사 — 모든 탭·서브탭·핵심 오버레이가 한 화면에 들어가는지 실측
// 실행: npm install --silent && npx playwright-core 필요 없음 — 크로미움 경로만 지정
//   node tools/fitcheck.mjs [chromiumPath] [baseUrl]
// 기본: PLAYWRIGHT_CHROMIUM(env) 또는 시스템 chromium, http://127.0.0.1:8787
// 종료코드: 초과 화면이 있으면 1 (CI/수동 검증용)
import { chromium } from "playwright-core";

const exe = process.argv[2] || process.env.PLAYWRIGHT_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = process.argv[3] || "http://127.0.0.1:8787";
const VIEWPORTS = [ { w: 390, h: 844, name: "iPhone 표준" }, { w: 375, h: 667, name: "iPhone SE" } ];

function demo() {
  const entries = {}; const now = new Date();
  for (let i = 0; i < 30; i++) { if (i % 6 === 4) continue; const d = new Date(now); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    entries[k] = { date: k, mood: "괜찮아요", score: 25 + (i * 9) % 70, tags: ["평온해요"], note: "메모", praise: "잘함", reflection: { good: "", hard: "" }, updatedAt: d.toISOString(), createdAt: d.toISOString() }; }
  return entries;
}
// 습관 5개 — 컴팩트 모드(4개+)와 '한눈에 3개+더보기'가 함께 검증되는 최악 케이스
const habit = [1, 2, 3, 4, 5].map((n) => ({
  id: "h" + n, emoji: ["🚶", "💧", "📔", "🧘", "🙏"][n - 1],
  title: ["아침 산책", "물 8잔", "한 줄 일기", "스트레칭", "감사 3가지"][n - 1],
  startDate: "2026-07-01", done: {}, doneAt: {}, celebrated: [],
}));

let bad = 0;
const browser = await chromium.launch({ executablePath: exe });
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.addInitScript(({ entries, habit }) => {
    localStorage.setItem("onboarded_v1", "1");
    localStorage.setItem("entries_v2", JSON.stringify(entries));
    localStorage.setItem("challenges_v2", JSON.stringify(habit));
    localStorage.setItem("settings_v2", JSON.stringify({ theme: "warm", sfx: false, breathSound: false, haptics: false, ambientVol: 55, ambientType: "off", textSize: "m", tone: "warm", myQuotes: [], favQuotes: [], journeyCount: 24 }));
  }, { entries: demo(), habit });
  await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  const SCROLL_OK = new Set(["calendar"]); // v190: 달력+습관 통합 탭은 두 화면 분량 — 자연 스크롤 허용
  const report = (label, sh, ih) => { const allow = SCROLL_OK.has(label); const ok = allow || sh <= ih + 4; if (!ok) bad++; console.log(`[${vp.name}] ${label}: ${sh}px ${ok ? (allow && sh > ih + 4 ? "✅ (스크롤 허용)" : "✅") : `❌ +${sh - ih}px`}`); };
  const measureDoc = async (label) => { const m = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight })); report(label, m.sh, m.ih); };

  for (const t of ["today", "calendar", "rest", "stats", "settings"]) {
    await page.click(`[data-tab="${t}"]`); await page.waitForTimeout(700); await measureDoc(t);
  }
  await page.click('[data-tab="stats"]'); await page.waitForTimeout(300);
  await page.click('#statsSeg button[data-seg="graph"]'); await page.waitForTimeout(700); await measureDoc("stats/분석");
  await page.click('#statsSeg button[data-seg="badges"]'); await page.waitForTimeout(700); await measureDoc("stats/배지");
  await page.click('#statsSeg button[data-seg="summary"]'); await page.waitForTimeout(200);
  await page.click('[data-tab="rest"]'); await page.waitForTimeout(300);
  await page.click('#restSeg button[data-rseg="comfort"]'); await page.waitForTimeout(500); await measureDoc("rest/위로");

  // 오버레이 — 여정(기분 단계)·명상(호흡 중)은 내부 스크롤 없이 컨트롤이 화면 안에 있어야 함
  await page.click('[data-tab="today"]'); await page.waitForTimeout(300);
  await page.click("#journeyStart"); await page.waitForTimeout(600);
  await page.click("#jNext"); await page.waitForTimeout(600); // 한마디 → 기분
  { const m = await page.evaluate(() => { const b = document.querySelector(".journey-body"); const nx = document.getElementById("jNext").getBoundingClientRect(); return { sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0, nextVisible: nx.bottom <= window.innerHeight + 2 }; });
    const ok = m.nextVisible; if (!ok) bad++;
    console.log(`[${vp.name}] 여정/기분: 다음버튼 ${m.nextVisible ? "보임 ✅" : "가려짐 ❌"} (본문 ${m.sh}/${m.ch})`); }
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  await page.click('[data-tab="rest"]'); await page.waitForTimeout(300);
  await page.click('#restSeg button[data-rseg="meditate"]'); await page.waitForTimeout(300);
  await page.click("#medStartBtn"); await page.waitForTimeout(500);
  { const m = await page.evaluate(() => { const ov = document.getElementById("medOverlay"); const nx = document.getElementById("medNext").getBoundingClientRect(); return { sh: ov.scrollHeight, ih: window.innerHeight, nextVisible: nx.bottom <= window.innerHeight + 2 && nx.top >= 0 }; });
    const ok = m.sh <= m.ih + 4 && m.nextVisible; if (!ok) bad++;
    console.log(`[${vp.name}] 명상 오버레이: ${m.sh}px, 진행버튼 ${m.nextVisible ? "보임" : "가려짐"} ${ok ? "✅" : "❌"}`); }
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.close();
}
await browser.close();
console.log(bad === 0 ? "\n✅ 모든 화면 스크롤 제로" : `\n❌ ${bad}개 화면 초과`);
process.exit(bad === 0 ? 0 : 1);
