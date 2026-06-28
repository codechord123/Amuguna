// anim.js — 아기자기 연출.
// 1) sparkle(): 라이브러리 없이 SVG/이모지 반짝임 버스트 (항상 동작, 가벼움)
// 2) lottie(): config.js의 ONEUL_CONFIG.LOTTIE에 에셋 경로가 있으면 Lottie 벡터 애니메이션 재생
//    (lottiefiles.com 등에서 받은 .json을 vendor/anim/에 넣고 config에 경로만 적으면 됨).
//    플레이어는 필요할 때만 지연 로드 — 에셋이 없으면 자동으로 sparkle로 폴백.
(function () {
  const SPK = ["✨", "🌸", "💛", "🌟", "🫧"];
  function sparkle(target, opts) {
    opts = opts || {};
    try {
      let cx, cy;
      if (target && target.getBoundingClientRect) { const r = target.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
      else { cx = (opts.x != null ? opts.x : window.innerWidth / 2); cy = (opts.y != null ? opts.y : window.innerHeight / 2); }
      const n = opts.count || 12;
      for (let i = 0; i < n; i++) {
        const s = document.createElement("span");
        s.className = "spk"; s.textContent = SPK[i % SPK.length];
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
        const dist = (opts.spread || 70) * (0.6 + Math.random() * 0.7);
        s.style.left = cx + "px"; s.style.top = cy + "px";
        s.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(1) + "px");
        s.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(1) + "px");
        s.style.fontSize = (12 + Math.random() * 12) + "px";
        s.style.animationDelay = (Math.random() * 0.12) + "s";
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 1100);
      }
    } catch (e) {}
  }

  // 빛 수렴 — 바깥에서 중심으로 빨려들어오며 모이는 작은 빛 입자
  function converge(target, opts) {
    opts = opts || {};
    try {
      let cx, cy;
      if (target && target.getBoundingClientRect) { const r = target.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
      else { cx = (opts.x != null ? opts.x : window.innerWidth / 2); cy = (opts.y != null ? opts.y : window.innerHeight / 2); }
      const n = opts.count || 16;
      const spread = opts.spread || 120;
      for (let i = 0; i < n; i++) {
        const s = document.createElement("span");
        s.className = "lpt";
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
        const dist = spread * (0.7 + Math.random() * 0.5);
        s.style.left = cx + "px"; s.style.top = cy + "px";
        s.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(1) + "px");
        s.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(1) + "px");
        if (opts.glow) s.style.setProperty("--lpt-glow", opts.glow);
        const sz = (3 + Math.random() * 4).toFixed(1) + "px";
        s.style.width = sz; s.style.height = sz;
        s.style.animationDelay = (Math.random() * 0.1) + "s";
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 1000);
      }
    } catch (e) {}
  }

  let _lottieLoading = false, _lottieFailed = false;
  function ensureLottie(cb) {
    if (window.lottie) return cb(true);
    if (_lottieFailed) return cb(false);
    if (_lottieLoading) return; // 로딩 중 — 호출자는 폴백을 이미 그렸을 것
    _lottieLoading = true;
    const sc = document.createElement("script"); sc.src = "vendor/lottie.min.js";
    sc.onload = () => { _lottieLoading = false; cb(true); };
    sc.onerror = () => { _lottieLoading = false; _lottieFailed = true; cb(false); };
    document.head.appendChild(sc);
  }
  // name에 해당하는 Lottie 에셋이 설정돼 있으면 container에 재생하고 true, 없으면 false 반환
  function lottie(container, name, opts) {
    opts = opts || {};
    const map = (window.ONEUL_CONFIG && window.ONEUL_CONFIG.LOTTIE) || {};
    const path = map[name];
    if (!path || !container) return false;
    ensureLottie((ok) => {
      if (!ok || !container.isConnected) return;
      try {
        container.innerHTML = "";
        window.lottie.loadAnimation({ container, renderer: "svg", loop: !!opts.loop, autoplay: true, path });
      } catch (e) {}
    });
    return true;
  }
  // 축하 연출: Lottie 에셋이 있으면 그걸로, 없으면 반짝임 버스트
  function celebrate(target, name) {
    if (lottie(target, name || "celebrate", { loop: false })) return;
    sparkle(target, { count: 14, spread: 80 });
  }

  window.Anim = { sparkle, converge, lottie, celebrate };
})();
