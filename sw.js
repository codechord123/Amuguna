// 오늘의 쉼 — 서비스워커 (오프라인 캐시)
const CACHE = "oneul-shim-v220";
// 핵심 자산만 precache. 큰 라이브러리(cytoscape 등)는 런타임 캐시(처음 쓸 때 fetch가 저장)로 둬서
// install이 무거워지거나 한 파일 실패로 업그레이드가 막히는 것을 방지.
const ASSETS = [
  "./",
  "./index.html",
  "./meditate.html",
  "./privacy.html",
  "./science.html",
  "./docs/SCIENCE.md",
  "./style.css",
  "./app.js",
  "./sound.js",
  "./config.js",
  "./monitor.js",
  "./anim.js",
  "./cloud.js",
  "./mednet.js",
  "./manifest.json",
  "./icon.svg",
];

self.addEventListener("install", (e) => {
  // addAll은 하나만 실패해도 전체가 실패(업그레이드 차단). 개별 add로 바꿔 한 파일 실패가 막지 않도록.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 네트워크 우선 (최신 보장), 오프라인이면 캐시 폴백.
// 앱 코드가 작아 비용이 작고, 배포 즉시 한 번의 새로고침으로 최신이 반영됩니다.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
