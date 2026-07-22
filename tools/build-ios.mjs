// 오늘의 쉼 — iOS(Capacitor) 웹 자산 빌드
// 저장소 루트의 웹 파일만 골라 www/ 로 모은다. Capacitor는 www/ 안의 것만 앱에 담는다.
// (webDir "." 로 두면 .git·node_modules·tests 까지 앱에 들어가 용량이 커지고 심사에 불리)
import { rmSync, mkdirSync, copyFileSync, existsSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WWW = join(ROOT, "www");

// 앱이 실제로 로드/참조하는 파일 (index.html의 링크·script, app.js의 지연로드, manifest·science 참조 기준)
const FILES = [
  "index.html", "style.css", "app.js", "sound.js", "config.js",
  "monitor.js", "anim.js", "cloud.js", "sw.js", "manifest.json",
  "meditate.html", "privacy.html", "terms.html", "science.html",
  "apple-touch-icon.png", "icon.svg",
  "icon-192.png", "icon-512.png", "icon-maskable-192.png", "icon-maskable-512.png",
];
// 디렉터리째 복사 (생각의 지도=vendor/cytoscape·lottie)
const DIRS = ["vendor"];
// 앱이 참조하는 docs 파일만 선별 복사 (내부 문서 ROADMAP·iOS-RELEASE 등은 제외)
const DOCS = ["docs/SCIENCE.md", "docs/store"]; // science.html이 SCIENCE.md, manifest가 store 스크린샷 참조

rmSync(WWW, { recursive: true, force: true });
mkdirSync(WWW, { recursive: true });

let missing = [];
for (const f of FILES) {
  const src = join(ROOT, f);
  if (!existsSync(src)) { missing.push(f); continue; }
  copyFileSync(src, join(WWW, f));
}
for (const d of DIRS) {
  const src = join(ROOT, d);
  if (existsSync(src)) cpSync(src, join(WWW, d), { recursive: true });
}
for (const d of DOCS) {
  const src = join(ROOT, d);
  if (!existsSync(src)) { missing.push(d); continue; }
  cpSync(src, join(WWW, d), { recursive: true });
}

if (missing.length) {
  console.error("⚠️  빠진 파일:", missing.join(", "));
  process.exit(1);
}
console.log(`✅ www/ 빌드 완료 — 파일 ${FILES.length}개 + vendor/ + docs(SCIENCE.md·store)`);
console.log("   다음: npx cap sync ios  (최초라면 먼저 npx cap add ios)");
