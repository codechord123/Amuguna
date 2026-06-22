// monitor.js — 가벼운 오류 모니터링 (Sentry 호환 envelope, 빌드/외부 SDK 없이)
// config.js의 ONEUL_CONFIG.SENTRY_DSN이 있을 때만 동작. 없으면 외부로 아무것도 보내지 않습니다.
// 개인정보 보호: 일기·기록·로컬스토리지는 일절 전송하지 않고, 오류 이름/메시지/스택/페이지URL/기기정보만 보냅니다.
(function () {
  var dsn = (window.ONEUL_CONFIG && window.ONEUL_CONFIG.SENTRY_DSN) || "";
  if (!dsn) return; // 키 없으면 완전 비활성

  var endpoint, publicKey;
  try {
    // DSN 형식: https://<publicKey>@<host>/<projectId>
    var m = /^https:\/\/([^@]+)@([^/]+)\/(.+)$/.exec(dsn.trim());
    if (!m) return;
    publicKey = m[1];
    endpoint = "https://" + m[2] + "/api/" + m[3] + "/envelope/?sentry_key=" + publicKey + "&sentry_version=7";
  } catch (e) { return; }

  var RELEASE = "oneul-shim"; // sw.js의 CACHE 버전과 함께 보고용
  try { RELEASE = (document.querySelector('meta[name="app-version"]') || {}).content || RELEASE; } catch (e) {}

  var seen = {}; // 같은 오류 반복 전송 억제
  function hex(n) { var s = ""; for (var i = 0; i < n; i++) s += ((Math.random() * 16) | 0).toString(16); return s; }
  function clip(s) { return typeof s === "string" ? s.slice(0, 2000) : String(s == null ? "" : s); }

  function report(err, kind) {
    try {
      var msg = (err && err.message != null) ? err.message : err;
      var stack = (err && err.stack) ? err.stack : "";
      var sig = (kind + "|" + clip(msg) + "|" + clip(stack)).slice(0, 300);
      if (seen[sig]) return; seen[sig] = 1;
      if (Object.keys(seen).length > 50) return; // 폭주 방지 (세션당 상한)

      var id = hex(32);
      var event = {
        event_id: id,
        timestamp: Date.now() / 1000,
        platform: "javascript",
        level: "error",
        logger: kind,
        release: RELEASE,
        exception: { values: [{ type: (err && err.name) || "Error", value: clip(msg) }] },
        request: { url: location.href },
        contexts: { app: { app_memory: null }, device: {} },
        // 개인정보 미포함 — 기록/일기/로컬데이터 전송 안 함. 진단에 필요한 최소 정보만.
        extra: { stack: clip(stack), userAgent: navigator.userAgent, lang: navigator.language },
      };
      var body = JSON.stringify({ event_id: id, sent_at: new Date().toISOString() }) + "\n" +
                 JSON.stringify({ type: "event" }) + "\n" +
                 JSON.stringify(event);
      fetch(endpoint, { method: "POST", body: body, headers: { "Content-Type": "application/x-sentry-envelope" }, keepalive: true, mode: "cors" }).catch(function () {});
    } catch (e) { /* 보고 자체가 앱을 깨선 안 됨 */ }
  }

  window.addEventListener("error", function (e) {
    report(e && e.error ? e.error : { name: "Error", message: (e && e.message) || "error", stack: (e && e.filename ? e.filename + ":" + e.lineno + ":" + e.colno : "") }, "window.onerror");
  });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    report(r && r.message != null ? r : { name: "UnhandledRejection", message: clip(r) }, "unhandledrejection");
  });

  window.Monitor = { capture: function (err) { report(err, "manual"); } };
})();
