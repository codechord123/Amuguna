// 20명 × 90일 사용자 시뮬레이션 — 실제 앱 코드를 jsdom에서 구동해 4대 우선순위 점검
// 실행: npm install --silent && node tools/usersim.mjs
import { JSDOM } from "jsdom";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const dom = new JSDOM(read("index.html"), { runScripts: "outside-only", pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom; const d = window.document;
const chain = () => ({ connect: () => chain() });
const gain = () => ({ gain: { value: 0, setTargetAtTime(){}, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}, cancelScheduledValues(){} }, connect: () => chain() });
window.AudioContext = class { constructor(){this.state="running";this.currentTime=0;this.destination={};} resume(){} createGain(){return gain();} createBiquadFilter(){return {type:"",frequency:{value:0,setTargetAtTime(){},linearRampToValueAtTime(){},setValueAtTime(){},cancelScheduledValues(){}},Q:{value:0},connect:()=>chain()};} createConvolver(){return {buffer:null,connect:()=>chain()};} createBuffer(){return {getChannelData:()=>new Float32Array(8)};} createBufferSource(){return {buffer:null,loop:false,connect:()=>chain(),start(){},stop(){}};} createOscillator(){const p=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});return {type:"",frequency:p(),detune:p(),connect:()=>chain(),start(){},stop(){}};} };
window.matchMedia = () => ({ matches:false, addEventListener(){}, addListener(){} });
window.scrollTo = ()=>{}; window.confirm=()=>true; window.alert=()=>{};
window.requestAnimationFrame = (fn)=>setTimeout(fn,0);
const cstub = () => ({ scale(){},setTransform(){},clearRect(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},quadraticCurveTo(){},closePath(){},stroke(){},arc(){},fill(){},fillText(){},measureText(){return{width:42};},setLineDash(){},save(){},restore(){},createLinearGradient(){return {addColorStop(){}};},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set lineJoin(v){},set font(v){},set textAlign(v){},set globalAlpha(v){} });
window.HTMLCanvasElement.prototype.getContext = cstub;
window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,iVBORw0KGgo=";
window.HTMLElement.prototype.scrollIntoView = ()=>{};
const errors = []; window.onerror = (m,src,l,c,err)=>errors.push((err&&err.stack)?String(err.stack).split("\n").slice(0,4).join(" | "):String(m));
window.eval(read("config.js")+"\n"+read("sound.js")+"\n"+read("app.js")+"\n"+read("cloud.js"));
window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
const q=(s)=>d.querySelector(s);
q("#obSkip") && q("#obSkip").click();

// ---- 결정적 난수 ----
let _s = 12345; const rnd = () => { _s = (_s*1103515245+12345)&0x7fffffff; return _s/0x7fffffff; };
const pick = (a) => a[Math.floor(rnd()*a.length)];
const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const todayKey = (dt)=>`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
const scoreToMood = (s)=> s<20?"우울해요":s<40?"지쳤어요":s<60?"그럭저럭":s<80?"괜찮아요":"활기차요";

const TAGS = {
  low:["우울해요","무기력해요","지쳤어요","외로워요","슬퍼요"],
  anx:["불안해요","초조해요","스트레스"], ang:["화나요"],
  pos:["행복해요","설레요","고마워요","평온해요","괜찮아요","신나요","뿌듯해요"],
  neu:["그럭저럭","멍해요","복잡해요"],
};
const NOTES = {
  office:["야근에 마감까지 회사 일이 너무 많아 지친다","상사 때문에 스트레스가 심하다","업무량이 많아 퇴근이 늦었다"],
  student:["시험 공부가 막막하고 성적이 걱정된다","발표 준비로 불안하다","과제가 밀려 학교 가기 싫다"],
  parent:["육아에 지쳐 아이 재우느라 힘들었다","아기가 안 자서 새벽까지 깨어 있었다","돌봄이 끝이 없다"],
  jobseeker:["취업 면접 결과가 막막하고 미래가 불안하다","진로가 불확실해 초조하다"],
  rel:["친구랑 다툼이 있어 속상하다","가족 일로 마음이 무겁다","연인과 헤어져 외롭다"],
  health:["몸살에 병원 다녀왔다 두통이 심하다","체력이 바닥이라 너무 피곤하다"],
  pos:["산책하고 가족과 행복한 시간을 보냈다","친구를 만나 고맙고 즐거웠다","운동하고 뿌듯했다"],
  money:["월급은 그대로인데 지출이 많아 경제적으로 막막하다"],
  none:[""],
};
const PRAISE=["운동 한 것","일찍 일어난 것","산책한 것","책 읽은 것","물 많이 마신 것","청소한 것"];

// ---- 20 페르소나 ----
const P = [
  ["김민준",29,"남","회사원","번아웃",      "office",  {base:34,trend:-0.06,vol:9, band:"low", logP:0.85, writeP:0.7, habP:0.4}],
  ["이서연",24,"여","대학생","불안",         "student", {base:46,trend:-0.02,vol:14,band:"anx", logP:0.7,  writeP:0.6, habP:0.3}],
  ["박지후",37,"남","자영업","스트레스",      "money",   {base:42,trend:0.0, vol:12,band:"anx", logP:0.6,  writeP:0.5, habP:0.5}],
  ["최수아",33,"여","주부","육아소진",        "parent",  {base:38,trend:-0.03,vol:10,band:"low", logP:0.8,  writeP:0.75,habP:0.6}],
  ["정우진",27,"남","취준생","막막",          "jobseeker",{base:40,trend:0.05,vol:13,band:"anx", logP:0.75, writeP:0.65,habP:0.45}],
  ["강하은",41,"여","간호사","교대피로",       "health",  {base:44,trend:0.0, vol:11,band:"low", logP:0.65, writeP:0.5, habP:0.5}],
  ["윤도현",52,"남","관리직","안정",          "office",  {base:62,trend:0.02,vol:8, band:"pos", logP:0.9,  writeP:0.4, habP:0.7}],
  ["임채원",19,"여","고등학생","입시불안",     "student", {base:43,trend:-0.04,vol:15,band:"anx", logP:0.6,  writeP:0.7, habP:0.25}],
  ["오세훈",45,"남","프리랜서","기복",         "none",    {base:50,trend:0.0, vol:22,band:"neu", logP:0.5,  writeP:0.3, habP:0.4}],
  ["한지민",31,"여","디자이너","회복중",       "pos",     {base:55,trend:0.08,vol:10,band:"pos", logP:0.8,  writeP:0.6, habP:0.6}],
  ["서준영",38,"남","영업","실적압박",         "office",  {base:39,trend:-0.02,vol:13,band:"anx", logP:0.7,  writeP:0.45,habP:0.4}],
  ["문가영",26,"여","간호조무사","외로움",      "rel",     {base:41,trend:-0.03,vol:11,band:"low", logP:0.7,  writeP:0.7, habP:0.35}],
  ["배성민",60,"남","은퇴","무료함",          "none",    {base:58,trend:0.0, vol:9, band:"neu", logP:0.55, writeP:0.25,habP:0.5}],
  ["신유나",22,"여","아르바이트","불안정",      "money",   {base:45,trend:0.0, vol:16,band:"anx", logP:0.6,  writeP:0.5, habP:0.3}],
  ["황재원",34,"남","개발자","번아웃회복",      "office",  {base:48,trend:0.07,vol:12,band:"neu", logP:0.85, writeP:0.55,habP:0.65}],
  ["고은비",29,"여","교사","감정노동",         "rel",     {base:47,trend:-0.02,vol:12,band:"low", logP:0.75, writeP:0.65,habP:0.5}],
  ["남기훈",43,"남","자영업","우울",          "money",   {base:30,trend:-0.05,vol:10,band:"low", logP:0.7,  writeP:0.6, habP:0.3}],
  ["류하늘",20,"여","대학생","연애고민",        "rel",     {base:52,trend:0.0, vol:18,band:"neu", logP:0.65, writeP:0.7, habP:0.3}],
  ["조민서",36,"여","워킹맘","이중부담",        "parent",  {base:36,trend:-0.02,vol:11,band:"low", logP:0.8,  writeP:0.7, habP:0.55}],
  ["권태양",48,"남","교수","건강염려",         "health",  {base:54,trend:0.0, vol:9, band:"neu", logP:0.7,  writeP:0.45,habP:0.6}],
];

function genUser(prof){
  const e={}; const today=new Date();
  for(let i=89;i>=0;i--){
    const dt=new Date(today); dt.setDate(dt.getDate()-i); const k=todayKey(dt);
    if(rnd()>prof.logP) continue; // 그날 기록 안 함(참여 변동)
    const prog=(90-i)/90;
    let sc = clamp(Math.round(prof.base + prof.trend*(90-i) + (rnd()*2-1)*prof.vol), 2, 100);
    const mood = scoreToMood(sc);
    // 태그: 점수 구간 + 성향 밴드
    let pool = sc>=65?TAGS.pos : sc<35?(prof.band==="anx"?TAGS.anx:TAGS.low) : (TAGS[prof.band]||TAGS.neu);
    const tags=[pick(pool)]; if(rnd()<0.5) tags.push(pick(pool));
    const ent={date:k,mood,score:sc,tags:[...new Set(tags)],updatedAt:k+"T"+String(8+Math.floor(rnd()*14)).padStart(2,"0")+":00:00"};
    // 활력(en 평균 근사) — 앱이 태그로 계산하지만 저장값도 둠
    ent.energy = clamp(Math.round(sc/20),1,5);
    if(rnd()<prof.writeP){ ent.note = pick(NOTES[prof.noteStyle]||NOTES.none); if(!ent.note) delete ent.note; }
    if(rnd()<0.3) ent.praise = pick(PRAISE);
    if(rnd()<0.2) ent.reflection = { good: pick(PRAISE), hard: sc<45? pick(NOTES[prof.noteStyle]||NOTES.none):"" };
    e[k]=ent;
  }
  return e;
}
const sortedScores = (e)=>Object.values(e).filter(x=>x.mood).map(x=>x.score);
const weekKeys = ()=>{ const a=[]; for(let i=6;i>=0;i--){const dt=new Date();dt.setDate(dt.getDate()-i);a.push(todayKey(dt));} return a; };

let report = "";
const agg = { errs:0, linkMismatch:0, weeksChecked:0, crisisWeeks:0, crisisHelp:0, allSols:[], emptyDiagWeeks:0, wwNodesTotal:0, wwUsersWithWeb:0 };

for(const row of P){
  const [name,age,gender,job,disp,noteStyle,prof]=row; prof.noteStyle=noteStyle;
  _s = 1000 + name.length*7 + age; // 페르소나별 시드
  const full = genUser(prof);
  const beforeErr = errors.length;
  // 1) 전체 데이터로 통계/달력/단어망 렌더(안정성)
  window.localStorage.setItem("entries_v2", JSON.stringify(full));
  window.localStorage.setItem("challenges_v2", JSON.stringify(prof.habP>0.4?[{id:"h1",emoji:"🚶",title:"산책",startDate:Object.keys(full).sort()[0]||"2024-01-01",done:Object.fromEntries(Object.keys(full).filter(()=>rnd()<prof.habP).map(k=>[k,true])),celebrated:[]}]:[]));
  let renderErr=null;
  try{ q('[data-tab="stats"]').click(); q('[data-tab="calendar"]').click(); }catch(e){ renderErr=e.message; }
  const ww = d.querySelectorAll("#wordWeb .ww-node").length;
  if(ww>=3){ agg.wwUsersWithWeb++; agg.wwNodesTotal+=ww; }
  // 2) 주간 리포트를 12주에 걸쳐 점검(데이터연계·정확도·다양성·효능)
  const days90 = Object.keys(full).sort();
  const wk = weekKeys();
  let userSols=[];
  for(let w=0; w<12; w++){
    // w주 전 7일치 데이터를 '최근 7일' 날짜에 매핑
    const slice={}; let scs=[];
    for(let i=0;i<7;i++){
      const srcIdx = days90.length-1-(w*7)+ (i-6);
      if(srcIdx>=0 && srcIdx<days90.length){ const src=full[days90[srcIdx]]; if(src){ slice[wk[i]]=Object.assign({},src,{date:wk[i]}); scs.push(src.score); } }
    }
    if(scs.length<2) continue;
    window.localStorage.setItem("entries_v2", JSON.stringify(slice));
    let g=null,label="",sols=[];
    try{
      q('[data-tab="today"]').click(); q('[data-tab="stats"]').click();
      q('#statsSeg button[data-seg="summary"]').click(); q("#weekReportBtn").click();
      g=(q("#subBody .g-num")||{}).textContent; label=(q("#subBody .diag-label")||{}).textContent||"";
      sols=[...d.querySelectorAll("#subBody .sol .sol-b")].map(n=>n.textContent.trim());
      q("#subBack") && q("#subBack").click();
    }catch(e){ renderErr=renderErr||e.message; }
    agg.weeksChecked++;
    const expAvg=Math.round(scs.reduce((a,b)=>a+b,0)/scs.length);
    if(g!=null && Math.abs(parseInt(g,10)-expAvg)>1) agg.linkMismatch++;
    if(!label) agg.emptyDiagWeeks++;
    if(expAvg<20){ agg.crisisWeeks++; if(sols.some(s=>/혼자|전문가|상담|들어줘|109|129|용기/.test(s))) agg.crisisHelp++; }
    userSols=userSols.concat(sols); agg.allSols=agg.allSols.concat(sols);
  }
  const distinct=new Set(userSols).size, total=userSols.length;
  const errDelta = errors.length-beforeErr; if(errDelta||renderErr) agg.errs++;
  report += `${name}(${age}/${gender}/${job}/${disp}) 기록 ${Object.keys(full).length}/90일 · 단어망 ${ww}노드 · 처방 다양성 ${distinct}/${total}${(errDelta||renderErr)?` · ⚠️ERR ${renderErr||errors[errors.length-1]}`:""}\n`;
}

// ---- 로버스트니스 프로브: 손상/레거시 데이터 ----
let robust = "OK";
try{
  const bad = { "2025-01-01":{date:"2025-01-01",mood:"행복해요",score:80}, "2025-01-02":{date:"2025-01-02",mood:"몰라요"} , "2025-01-03":{date:"2025-01-03"} };
  window.localStorage.setItem("entries_v2", JSON.stringify(bad));
  q('[data-tab="today"]').click(); q('[data-tab="stats"]').click(); q('#statsSeg button[data-seg="summary"]').click(); q("#weekReportBtn").click(); q("#subBack")&&q("#subBack").click();
  q('#statsSeg button[data-seg="graph"]').click();
}catch(e){ robust = "CRASH: "+e.message; }

const globalDistinct = new Set(agg.allSols).size;
let out = "\n===== 20명 × 90일 시뮬레이션 결과 =====\n"+report;
out += `\n[집계]\n`;
out += `• 렌더 오류 발생 사용자: ${agg.errs}/20\n`;
out += `• 주간 리포트 점검: ${agg.weeksChecked}주\n`;
out += `• 데이터-게이지 불일치(>1점): ${agg.linkMismatch}/${agg.weeksChecked}\n`;
out += `• 진단 비어있던 주: ${agg.emptyDiagWeeks}/${agg.weeksChecked}\n`;
out += `• 위기주(평균<20) 중 도움요청 처방 노출: ${agg.crisisHelp}/${agg.crisisWeeks}\n`;
out += `• 처방 전역 다양성(고유/전체): ${globalDistinct}/${agg.allSols.length}\n`;
out += `• 단어망 표시 사용자: ${agg.wwUsersWithWeb}/20 (평균 ${agg.wwUsersWithWeb?Math.round(agg.wwNodesTotal/agg.wwUsersWithWeb):0}노드)\n`;
out += `• 손상 데이터 로버스트니스: ${robust}\n`;
out += `• 누적 onerror: ${errors.length}건 ${errors.slice(0,3).join(" | ")}\n`;
console.log(out);
fs.writeFileSync("/tmp/usersim.out", out);
