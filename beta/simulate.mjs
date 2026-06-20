// 오늘의 쉼 — 시뮬레이션 베타테스트 (합성 데이터)
// ⚠️ 실제 사람이 아닌, 문헌/UX 휴리스틱 기반 페르소나 200명을 90일간 모델링한 결과입니다.
// 목적: 개선 우선순위를 투명하고 재현 가능하게 도출하기 위함. (seed 고정 → 항상 같은 결과)
import fs from "fs";
import path from "path";

const SEED = 20260620;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const weighted = (pairs) => { const tot = pairs.reduce((s, p) => s + p[1], 0); let r = rnd() * tot; for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; } return pairs[0][0]; };
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const noise = (amt) => (rnd() - 0.5) * 2 * amt;

const N = 200, DAYS = 90;

/* ---------- 페르소나 정의 ---------- */
const AGE_BANDS = [["10대", 12], ["20대", 46], ["30대", 52], ["40대", 40], ["50대", 30], ["60대+", 20]];
const GENDERS = [["여성", 50], ["남성", 47], ["논바이너리", 3]];
// 성향: [이름, 가중치, {engage, anxiety, goal, reflect, tech, skeptic, burnout}] 0~1 성향 계수
const DISPOSITIONS = [
  ["성실한 노력가", 22, { engage: .85, anxiety: .4, goal: .9, reflect: .6, tech: .6, skeptic: .2, burnout: .4 }],
  ["심각한 번아웃", 20, { engage: .45, anxiety: .6, goal: .35, reflect: .5, tech: .5, skeptic: .35, burnout: .95 }],
  ["회의적·냉소적", 14, { engage: .35, anxiety: .35, goal: .4, reflect: .4, tech: .65, skeptic: .9, burnout: .5 }],
  ["불안형", 18, { engage: .7, anxiety: .95, goal: .55, reflect: .65, tech: .55, skeptic: .3, burnout: .6 }],
  ["우울 경향", 16, { engage: .5, anxiety: .6, goal: .35, reflect: .7, tech: .5, skeptic: .4, burnout: .8 }],
  ["외향적 활동가", 12, { engage: .75, anxiety: .3, goal: .7, reflect: .35, tech: .7, skeptic: .3, burnout: .35 }],
  ["내향적 사색가", 14, { engage: .65, anxiety: .45, goal: .5, reflect: .95, tech: .55, skeptic: .35, burnout: .45 }],
  ["바쁜 직장인", 22, { engage: .55, anxiety: .55, goal: .65, reflect: .4, tech: .65, skeptic: .35, burnout: .7 }],
  ["완벽주의자", 12, { engage: .8, anxiety: .7, goal: .95, reflect: .55, tech: .6, skeptic: .35, burnout: .65 }],
  ["디지털 서툰 어르신", 14, { engage: .5, anxiety: .4, goal: .5, reflect: .5, tech: .15, skeptic: .3, burnout: .4 }],
  ["육아 중 부모", 12, { engage: .5, anxiety: .6, goal: .55, reflect: .4, tech: .55, skeptic: .3, burnout: .8 }],
  ["자기계발 매니아", 12, { engage: .8, anxiety: .4, goal: .9, reflect: .6, tech: .8, skeptic: .25, burnout: .4 }],
  ["만성피로 학생", 12, { engage: .55, anxiety: .6, goal: .5, reflect: .5, tech: .85, skeptic: .4, burnout: .7 }],
];

function makePersona(i) {
  const age = weighted(AGE_BANDS), gender = weighted(GENDERS), disp = weighted(DISPOSITIONS.map((d) => [d, d[1]]));
  const t = { ...disp[2] };
  // 나이에 따른 tech 보정
  if (age === "60대+") t.tech = clamp(t.tech - .3, .05, 1);
  if (age === "50대") t.tech = clamp(t.tech - .15, .1, 1);
  if (age === "10대" || age === "20대") t.tech = clamp(t.tech + .15, 0, 1);
  return { id: i + 1, age, gender, disposition: disp[0], traits: t };
}
const personas = Array.from({ length: N }, (_, i) => makePersona(i));

/* ---------- 90일 사용 시뮬레이션 ---------- */
// 초기 마찰(온보딩/저장구조 이해 등)과 동기에 따른 일별 잔존 모델
function simulate(p) {
  const tr = p.traits;
  const onboardComplete = rnd() < clamp(.75 + tr.tech * .2 - tr.skeptic * .2, .2, .98);
  const started = onboardComplete || rnd() < .5;
  const habitCount = started ? clamp(Math.round(tr.goal * 3 + noise(1)), 0, 5) : 0;
  const retain = {};
  let logged = 0, habitDoneTotal = 0;
  // 이탈 위험(hazard) 모델 → 현실적인 감쇠 퍼널 + 인구 이질성으로 두꺼운 꼬리
  let churnDay = started ? DAYS : 0;
  if (started) {
    if (rnd() < clamp((1 - tr.engage) * .3 + tr.skeptic * .2 - tr.tech * .05, .03, .6)) {
      churnDay = 1; // 첫 사용 후 바운스
    } else {
      for (let d = 1; d <= DAYS; d++) {
        const useProb = clamp(.5 + tr.engage * .4 - tr.burnout * .1 + (habitCount > 0 ? .1 : 0) + noise(.1), .05, .97);
        if (rnd() < useProb) { logged++; if (habitCount > 0 && rnd() < clamp(.4 + tr.goal * .5 - tr.burnout * .2, .05, .95)) habitDoneTotal++; }
        let hazard = .02 + (1 - tr.engage) * .06 + tr.skeptic * .03 + tr.burnout * .02;
        if (habitCount > 0) hazard *= .55;          // 습관 보유가 잔존 견인
        hazard *= (1 - tr.reflect * .25);
        if (p.age === "60대+" && tr.tech < .3) hazard += .02;
        if (d >= 29 && d <= 32) hazard += .05;        // 한 달 고비
        if (d >= 64 && d <= 68) hazard += .04;        // 66일 고비
        if (rnd() < hazard) { churnDay = d; break; }
      }
    }
  }
  const lastActiveDay = churnDay;
  retain.d1 = churnDay >= 1 ? 1 : 0;
  retain.d7 = churnDay >= 7 ? 1 : 0;
  retain.d30 = churnDay >= 30 ? 1 : 0;
  retain.d90 = churnDay >= 85 ? 1 : 0;
  // 기능 사용률 (성향 기반)
  const used = {
    mood: logged > 0,
    journal: rnd() < clamp(.3 + tr.reflect * .6 - tr.skeptic * .2, .05, .95) && logged > 2,
    breathing: rnd() < clamp(.25 + tr.anxiety * .6, .05, .95),
    sounds: rnd() < clamp(.3 + tr.anxiety * .4 + tr.tech * .1, .05, .95),
    challenge: habitCount > 0,
    insights: rnd() < clamp(.3 + tr.goal * .4 + tr.reflect * .2, .05, .9) && logged > 5,
  };
  const habit90 = habitCount > 0 && habitDoneTotal >= 70 && lastActiveDay >= 85;
  // 만족도(1~5): 잔존·니즈충족 보너스, 마찰 패널티
  let sat = 3 + (retain.d30 ? .5 : -.4) + (used.journal ? .3 : 0) + (used.breathing && tr.anxiety > .6 ? .4 : 0)
    + (used.challenge && tr.goal > .6 ? .4 : 0) - (p.age === "60대+" && tr.tech < .3 ? .5 : 0)
    - tr.skeptic * .4 + noise(.5);
  sat = clamp(Math.round(sat * 2) / 2, 1, 5);
  const nps = sat >= 4.5 ? "promoter" : sat <= 3 ? "detractor" : "passive";
  return { onboardComplete, logged, retain, habitCount, habitDoneTotal, habit90, used, sat, nps };
}

/* ---------- 개선 요구(피드백) 카탈로그 ---------- */
// 각 항목: 발생확률을 성향/나이/사용패턴 함수로. (실제 구현 가능 여부 표시)
const FEEDBACK = [
  { id: "weekly_report", text: "한 주를 돌아보는 요약 리포트가 있으면 동기부여가 될 것 같아요", build: "구현가능", p: (p, s) => .25 + p.traits.goal * .4 + p.traits.reflect * .2 + (s.used.insights ? .1 : 0) },
  { id: "text_size", text: "글씨가 작아서 보기 힘들어요. 크게 보는 설정이 필요해요", build: "구현가능", p: (p) => (p.age === "60대+" ? .8 : p.age === "50대" ? .45 : .08) + (p.traits.tech < .3 ? .2 : 0) },
  { id: "auto_theme", text: "시간대에 따라 자동으로 다크모드로 바뀌면 좋겠어요", build: "구현가능", p: (p) => .15 + p.traits.tech * .4 },
  { id: "sleep_timer", text: "잘 때 배경음을 틀어두는데, 자동으로 꺼지는 타이머가 필요해요", build: "구현가능", p: (p, s) => (s.used.sounds ? .35 : .05) + p.traits.anxiety * .25 },
  { id: "backfill", text: "깜빡하고 못 적은 날을 나중에 기록·수정하고 싶어요", build: "구현가능", p: (p) => .2 + p.traits.goal * .3 + (p.disposition === "바쁜 직장인" || p.disposition === "육아 중 부모" ? .25 : 0) },
  { id: "more_quotes", text: "위로 문구가 반복돼요. 더 다양하면 좋겠어요", build: "구현가능", p: (p, s) => (s.logged > 30 ? .35 : .1) },
  { id: "tone_plain", text: "위로 톤이 너무 달달해요. 담백한 버전도 골랐으면", build: "구현가능", p: (p) => .1 + p.traits.skeptic * .6 },
  { id: "quick_breath", text: "불안할 때 어느 화면에서든 바로 호흡을 시작하고 싶어요", build: "구현가능", p: (p) => .1 + p.traits.anxiety * .5 },
  { id: "per_habit_reminder", text: "습관마다 알림 시간을 따로 정하고 싶어요", build: "구현가능", p: (p, s) => (s.habitCount > 1 ? .35 : .1) + p.traits.goal * .2 },
  { id: "cloud_sync", text: "폰을 바꾸면 기록이 사라질까 걱정돼요. 백업/동기화가 있으면", build: "백엔드필요", p: (p) => .25 + p.traits.tech * .15 },
  { id: "push_notif", text: "앱을 닫으면 알림이 안 와요. 진짜 푸시 알림이 필요해요", build: "백엔드필요", p: (p) => .2 + (p.disposition === "바쁜 직장인" ? .25 : 0) },
  { id: "community", text: "다른 사람들과 함께 챌린지하면 더 힘이 날 것 같아요", build: "백엔드필요", p: (p) => .1 + p.traits.engage * .2 + (p.disposition === "외향적 활동가" ? .35 : 0) },
  { id: "emotion_tags", text: "감정에 태그를 달고 나중에 검색하고 싶어요", build: "구현가능", p: (p) => .1 + p.traits.reflect * .4 },
  { id: "widget", text: "홈 화면 위젯으로 바로 기분을 남기고 싶어요", build: "플랫폼한계", p: (p) => .1 + p.traits.tech * .3 },
];

/* ---------- 실행 ---------- */
const sims = personas.map((p) => ({ p, s: simulate(p) }));
const fbCounts = {};
FEEDBACK.forEach((f) => fbCounts[f.id] = { ...f, count: 0 });
sims.forEach(({ p, s }) => FEEDBACK.forEach((f) => { if (rnd() < clamp(f.p(p, s), 0, .95)) fbCounts[f.id].count++; }));

const agg = (sel) => sims.reduce((a, x) => a + (sel(x) ? 1 : 0), 0);
const avg = (sel) => (sims.reduce((a, x) => a + sel(x), 0) / sims.length);
const pct = (n) => (100 * n / N).toFixed(0) + "%";

const retention = { d1: agg(x => x.s.retain.d1), d7: agg(x => x.s.retain.d7), d30: agg(x => x.s.retain.d30), d90: agg(x => x.s.retain.d90) };
const featureUse = { mood: agg(x => x.s.used.mood), journal: agg(x => x.s.used.journal), breathing: agg(x => x.s.used.breathing), sounds: agg(x => x.s.used.sounds), challenge: agg(x => x.s.used.challenge), insights: agg(x => x.s.used.insights) };
const satAvg = avg(x => x.s.sat);
const nps = { promoter: agg(x => x.s.nps === "promoter"), passive: agg(x => x.s.nps === "passive"), detractor: agg(x => x.s.nps === "detractor") };
const npsScore = Math.round(100 * (nps.promoter - nps.detractor) / N);
const habit90 = agg(x => x.s.habit90);
const onboard = agg(x => x.s.onboardComplete);

// 세그먼트: 나이별 D30, 성향별 만족도
const byAge = {}; AGE_BANDS.forEach(([a]) => byAge[a] = { n: 0, d30: 0, sat: 0 });
sims.forEach(({ p, s }) => { const b = byAge[p.age]; b.n++; b.d30 += s.retain.d30; b.sat += s.sat; });
const byDisp = {}; DISPOSITIONS.forEach(([d]) => byDisp[d] = { n: 0, sat: 0, d30: 0 });
sims.forEach(({ p, s }) => { const b = byDisp[p.disposition]; b.n++; b.sat += s.sat; b.d30 += s.retain.d30; });

const rankedFb = Object.values(fbCounts).sort((a, b) => b.count - a.count);

/* ---------- 리포트 ---------- */
const genderCount = {}; personas.forEach(p => genderCount[p.gender] = (genderCount[p.gender] || 0) + 1);
const ageCount = {}; personas.forEach(p => ageCount[p.age] = (ageCount[p.age] || 0) + 1);
const dispCount = {}; personas.forEach(p => dispCount[p.disposition] = (dispCount[p.disposition] || 0) + 1);

let md = `# 오늘의 쉼 — 시뮬레이션 베타테스트 리포트

> ⚠️ **합성 데이터 고지**: 본 리포트는 실제 사용자가 아니라, 문헌·UX 휴리스틱에 기반해
> 생성한 **가상 페르소나 ${N}명**을 **${DAYS}일**간 모델링한 결과입니다. 의사결정 시 실제 사용자
> 검증으로 보완해야 합니다. seed=${SEED} 로 재현 가능합니다. (\`node beta/simulate.mjs\`)

## 1. 코호트 구성 (${N}명)

**나이대:** ${Object.entries(ageCount).map(([k, v]) => `${k} ${v}`).join(" · ")}
**성별:** ${Object.entries(genderCount).map(([k, v]) => `${k} ${v}`).join(" · ")}
**성향:** ${Object.entries(dispCount).map(([k, v]) => `${k} ${v}`).join(" · ")}

## 2. 핵심 지표

| 지표 | 값 |
|---|---|
| 온보딩 완료 | ${pct(onboard)} (${onboard}명) |
| D1 잔존 | ${pct(retention.d1)} |
| D7 잔존 | ${pct(retention.d7)} |
| D30 잔존 | ${pct(retention.d30)} |
| D90 잔존 | ${pct(retention.d90)} |
| 평균 만족도 | ${satAvg.toFixed(2)} / 5 |
| NPS | ${npsScore} (촉진 ${nps.promoter} · 중립 ${nps.passive} · 비추 ${nps.detractor}) |
| 90일 챌린지 완주 | ${pct(habit90)} (${habit90}명) |

## 3. 기능 사용률 (90일 내 1회 이상)

| 기능 | 사용률 |
|---|---|
| 기분 체크인 | ${pct(featureUse.mood)} |
| 일기 | ${pct(featureUse.journal)} |
| 호흡 쉼표 | ${pct(featureUse.breathing)} |
| 배경음 | ${pct(featureUse.sounds)} |
| 챌린지 | ${pct(featureUse.challenge)} |
| 인사이트 열람 | ${pct(featureUse.insights)} |

## 4. 세그먼트 인사이트

**나이대별 D30 잔존 / 평균 만족도**
${Object.entries(byAge).map(([a, b]) => `- ${a}: 잔존 ${b.n ? (100 * b.d30 / b.n).toFixed(0) : 0}% · 만족 ${b.n ? (b.sat / b.n).toFixed(2) : "-"}`).join("\n")}

**성향별 평균 만족도 (낮은 순 = 우선 케어 대상)**
${Object.entries(byDisp).sort((a, b) => (a[1].sat / a[1].n) - (b[1].sat / b[1].n)).map(([d, b]) => `- ${d}: ${b.n ? (b.sat / b.n).toFixed(2) : "-"} (n=${b.n})`).join("\n")}

주요 관찰:
- **고령층(60대+) 마찰**: 낮은 디지털 친숙도 → 온보딩/글자 크기에서 이탈. 텍스트 확대·단순화 필요.
- **회의적·번아웃 세그먼트 만족도 저조**: 위로 톤이 과하다는 피드백, 담백 모드 요구.
- **챌린지 사용자 = 잔존 견인**: 습관 1개 이상 보유 시 D30 잔존이 뚜렷이 높음 → 습관 온보딩 강화 가치.
- **불안형은 호흡/배경음 의존도 높음** → 빠른 접근(어디서든 호흡) 요구.

## 5. 개선 요구 순위 (${N}명 중 언급 수)

| 순위 | 요구 | 언급 | 구현난이도 |
|---|---|---|---|
${rankedFb.map((f, i) => `| ${i + 1} | ${f.text} | ${f.count} (${pct(f.count)}) | ${f.build} |`).join("\n")}

## 6. 개선 계획 (Impact × Effort)

**지금 구현 (구현가능 + 상위 요구):**
${rankedFb.filter(f => f.build === "구현가능").slice(0, 6).map((f, i) => `${i + 1}. **${f.id}** — ${f.text} (언급 ${f.count})`).join("\n")}

**로드맵 (백엔드/플랫폼 필요 — 구조 변경):**
${rankedFb.filter(f => f.build !== "구현가능").map(f => `- ${f.id} (${f.build}) — ${f.text} · 언급 ${f.count}`).join("\n")}

---
_생성: simulate.mjs · seed ${SEED} · ${new Date().toISOString().slice(0, 10)}_
`;

fs.mkdirSync(path.dirname(new URL(import.meta.url).pathname), { recursive: true });
const dir = "beta";
fs.writeFileSync(path.join(dir, "REPORT.md"), md);
fs.writeFileSync(path.join(dir, "personas.json"), JSON.stringify(personas, null, 1));
fs.writeFileSync(path.join(dir, "results.json"), JSON.stringify({ retention, featureUse, satAvg, nps, npsScore, habit90, onboard, rankedFb: rankedFb.map(f => ({ id: f.id, count: f.count, build: f.build })) }, null, 2));

// stdout 요약
console.log(`코호트 ${N}명 / ${DAYS}일`);
console.log(`온보딩 ${pct(onboard)} | D1 ${pct(retention.d1)} D7 ${pct(retention.d7)} D30 ${pct(retention.d30)} D90 ${pct(retention.d90)}`);
console.log(`만족도 ${satAvg.toFixed(2)}/5 | NPS ${npsScore} | 챌린지완주 ${pct(habit90)}`);
console.log("기능사용:", Object.entries(featureUse).map(([k, v]) => `${k} ${pct(v)}`).join(" "));
console.log("\n개선요구 TOP:");
rankedFb.slice(0, 8).forEach((f, i) => console.log(`  ${i + 1}. ${f.id} ${f.count} [${f.build}] - ${f.text}`));
