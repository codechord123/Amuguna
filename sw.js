// 오늘의 쉼 — 서비스워커 (오프라인 캐시)
const CACHE = "oneul-shim-v56";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./sound.js",
  "./config.js",
  "./cloud.js",
  "./manifest.json",
  "./icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
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
