import { JSDOM } from "jsdom";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const root = "/home/user/Amuguna";
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const dom = new JSDOM(read("index.html"), { runScripts: "outside-only", pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom; const d = window.document;
const chain = () => ({ connect: () => chain() });
const gain = () => ({ gain: { value: 0, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }, connect: () => chain() });
window.AudioContext = class { constructor(){this.state="running";this.currentTime=0;this.destination={};} resume(){} createGain(){return gain();} createBiquadFilter(){return {type:"",frequency:{value:0,setTargetAtTime(){},linearRampToValueAtTime(){},setValueAtTime(){},cancelScheduledValues(){}},Q:{value:0},connect:()=>chain()};} createConvolver(){return {buffer:null,connect:()=>chain()};} createBuffer(){return {getChannelData:()=>new Float32Array(8)};} createBufferSource(){return {buffer:null,loop:false,connect:()=>chain(),start(){},stop(){}};} createOscillator(){const p=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});return {type:"",frequency:p(),detune:p(),connect:()=>chain(),start(){},stop(){}};} };
window.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
window.scrollTo = () => {}; window.confirm = () => true; window.alert = () => {};
window.requestAnimationFrame = (fn) => setTimeout(fn, 0);
window.HTMLCanvasElement.prototype.getContext = () => ({ scale(){},clearRect(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},closePath(){},stroke(){},arc(){},fill(){},fillText(){},setLineDash(){},save(){},restore(){},createLinearGradient(){return {addColorStop(){}};},measureText(){return{width:50};},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set lineJoin(v){},set font(v){},set textAlign(v){},set globalAlpha(v){} });
window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,iVBORw0KGgo=";
window.HTMLElement.prototype.scrollIntoView = () => {};
window.eval(read("config.js")+"\n"+read("sound.js")+"\n"+read("app.js")+"\n"+read("cloud.js"));
window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
const q = (s) => d.querySelector(s);
q("#obSkip") && q("#obSkip").click();

function days(n){ const a=[]; for(let i=0;i<n;i++){const dt=new Date();dt.setDate(dt.getDate()-i);a.push(dt.toISOString().slice(0,10));} return a; }
function build(spec){ const e={}; days(7).forEach((k,i)=>{ e[k]=Object.assign({date:k,updatedAt:k+"T21:00:00"}, spec(i,k)); }); return e; }

const personas = [
  { name: "① 직장인 · 번아웃", make: () => build((i)=>({ mood:"지쳤어요", score: 26+i*2, energy:2, tags:["지쳤어요","무기력해요"], note:"야근에 마감까지 겹쳐 너무 피곤하고 지쳤다. 상사 눈치도 보여 스트레스." })) },
  { name: "② 취준생 · 불안", make: () => build((i)=>({ mood:"불안해요", score: 38+(i%3), energy:4, tags:["불안해요","초조해요"], note:"취업 면접 결과가 막막하고 미래가 불안하다." })) },
  { name: "③ 외로운 밤 · 관계", make: () => build((i)=>({ mood:"우울해요", score: 30+i, energy:1, tags:["우울해요","외로워요"], note:"친구들과 멀어진 것 같아 외롭다. 연락이 끊겼다." })) },
  { name: "④ 좋은 한 주", make: () => build((i)=>({ mood:"활기차요", score: 78+(i%6), energy:5, tags:["행복해요","고마워요"], note:"산책하고 가족과 시간을 보내 행복했다.", praise:"운동 꾸준히 한 것" })) },
  { name: "⑤ 위기 신호", make: () => build((i)=>({ mood:"우울해요", score: 8+(i%4), energy:1, tags:["우울해요","무기력해요"], note:"다 끝내고 싶다. 아무것도 의미 없고 너무 지친다." })) },
];

let out = ""; const errs=[]; window.onerror=(m)=>errs.push(String(m));
for (const p of personas) {
  window.localStorage.setItem("entries_v2", JSON.stringify(p.make()));
  q("#subBack") && q("#subBack").click();
  q('[data-tab="today"]') && q('[data-tab="today"]').click();
  q('[data-tab="stats"]').click();
  q('#statsSeg button[data-seg="summary"]').click();
  try { window.eval("openReport('week')"); } catch(e){ errs.push("openReport:"+e.message); }
  const gnum = (q("#subBody .g-num")||{}).textContent || "?";
  const label = (q("#subBody .diag-label")||{}).textContent || "(진단 없음)";
  const dx = (q("#subBody .diag-dx")||{}).textContent || "";
  const sols = [...d.querySelectorAll("#subBody .sol .sol-b")].map(n=>n.textContent);
  const hero = (q("#subBody .rpt-hero-cap")||{}).textContent || "";
  out += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${p.name}  (게이지 ${gnum})\n`;
  out += `🩺 ${label.trim()}\n   ${dx.trim()}\n💊 처방\n`;
  sols.forEach(s=> out += `   • ${s.trim()}\n`);
}
if (errs.length) out += "\n[errors] " + errs.join(" | ") + "\n";
console.log(out);
fs.writeFileSync("/tmp/sim.out", out);
