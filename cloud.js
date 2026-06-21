// cloud.js — Supabase 기반 로그인 + 기기 간 동기화 (선택 기능)
// config.js에 키가 없으면 아무 동작도 하지 않고 앱은 오프라인으로 동작합니다.
// app.js가 제공하는 훅: window.__getLocalData(), window.__applyData(merged)
(function () {
  let sb = null, currentUser = null, pushTimer = null, ready = false;

  /* ---------- 병합 로직 (순수 함수, 테스트 가능) ---------- */
  function mergeEntries(a, b) {
    const out = Object.assign({}, a || {});
    const rb = b || {};
    for (const k in rb) {
      if (!out[k]) { out[k] = rb[k]; continue; }
      const ta = Date.parse(out[k].updatedAt || 0) || 0, tb = Date.parse(rb[k].updatedAt || 0) || 0;
      if (tb > ta) out[k] = rb[k];
    }
    return out;
  }
  function mergeById(a, b, mergeFn) {
    const map = {};
    (a || []).forEach((x) => { if (x && x.id) map[x.id] = x; });
    (b || []).forEach((x) => { if (x && x.id) map[x.id] = map[x.id] ? mergeFn(map[x.id], x) : x; });
    return Object.values(map);
  }
  function mergeHabit(local, remote) {
    return Object.assign({}, remote, local, {
      done: Object.assign({}, remote.done || {}, local.done || {}),       // 완료 표시는 합집합(둘 중 하나라도 했으면 유지)
      celebrated: Array.from(new Set([...(local.celebrated || []), ...(remote.celebrated || [])])),
    });
  }
  function mergeProject(local, remote) {
    const ld = (local.tasks || []).filter((t) => t.done).length;
    const rd = (remote.tasks || []).filter((t) => t.done).length;
    return rd > ld ? remote : local; // 더 많이 진행된 쪽을 채택
  }
  function mergeData(local, remote) {
    if (!remote) return local;
    return {
      entries: mergeEntries(local.entries, remote.entries),
      challenges: mergeById(local.challenges, remote.challenges, mergeHabit),
      projects: mergeById(local.projects, remote.projects, mergeProject),
      settings: Object.assign({}, remote.settings || {}, local.settings || {}), // 로컬(이 기기) 우선
    };
  }

  /* ---------- UI ---------- */
  const $ = (id) => document.getElementById(id);
  function setView(v) {
    const map = { notconf: "cloudNotConfigured", out: "cloudLoggedOut", in: "cloudLoggedIn" };
    Object.entries(map).forEach(([k, id]) => { const el = $(id); if (el) el.hidden = k !== v; });
  }
  function authMsg(t) { const el = $("authMsg"); if (el) { el.textContent = t; el.hidden = !t; } }
  function status(t) { const el = $("cloudStatus"); if (el) el.textContent = t; }

  function wireUI() {
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
    on("authLogin", () => doAuth("login"));
    on("authSignup", () => doAuth("signup"));
    on("authGoogle", doGoogle);
    on("cloudSync", () => { Sound && Sound.tap && Sound.tap(); syncNow(true); });
    on("cloudLogout", doLogout);
  }

  async function doAuth(mode) {
    if (!sb) return;
    const email = ($("authEmail").value || "").trim();
    const pw = $("authPw").value || "";
    if (!email || pw.length < 6) { authMsg("이메일과 6자 이상 비밀번호를 입력해주세요."); return; }
    authMsg(mode === "signup" ? "가입 중…" : "로그인 중…");
    try {
      const fn = mode === "signup"
        ? sb.auth.signUp({ email, password: pw })
        : sb.auth.signInWithPassword({ email, password: pw });
      const { error } = await fn;
      if (error) { authMsg("실패: " + error.message); return; }
      authMsg(mode === "signup" ? "가입 완료! 메일 인증이 필요할 수 있어요." : "");
    } catch (e) { authMsg("오류: " + (e.message || e)); }
  }
  async function doGoogle() {
    if (!sb) return;
    try { await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href.split("#")[0] } }); }
    catch (e) { authMsg("Google 로그인 오류: " + (e.message || e)); }
  }
  async function doLogout() {
    if (!sb) return;
    Sound && Sound.tap && Sound.tap();
    await syncNow(false); // 나가기 전 마지막 저장
    await sb.auth.signOut();
  }

  /* ---------- 동기화 ---------- */
  async function pull() {
    const { data, error } = await sb.from("app_state").select("data").eq("user_id", currentUser.id).maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  }
  async function push(state) {
    const { error } = await sb.from("app_state").upsert({ user_id: currentUser.id, data: state, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  let syncing = false, pendingPush = false;
  async function syncNow(showStatus) {
    if (!sb || !currentUser || syncing) return;
    if (!navigator.onLine) { status("오프라인 — 다시 연결되면 자동으로 동기화돼요."); pendingPush = true; return; }
    syncing = true;
    try {
      if (showStatus) status("동기화 중…");
      const local = window.__getLocalData ? window.__getLocalData() : null;
      if (!local) return;
      const remote = await pull();
      const merged = mergeData(local, remote);
      if (window.__applyData) window.__applyData(merged);
      await push(merged);
      pendingPush = false;
      status("마지막 동기화: " + new Date().toLocaleTimeString());
    } catch (e) {
      pendingPush = true;
      status("동기화 실패: " + (e.message || e) + " — '지금 동기화'로 다시 시도할 수 있어요.");
    } finally { syncing = false; }
  }
  function markDirty() {
    if (!sb || !currentUser) return;
    if (!navigator.onLine) { pendingPush = true; status("오프라인 — 변경사항은 연결되면 저장돼요."); return; }
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      try {
        const local = window.__getLocalData ? window.__getLocalData() : null;
        if (local) { await push(local); pendingPush = false; status("저장됨: " + new Date().toLocaleTimeString()); }
      } catch (e) { pendingPush = true; status("저장 실패(오프라인일 수 있어요): 연결되면 다시 시도돼요."); }
    }, 2500);
  }
  // 온라인 복귀 시 자동 재동기화
  window.addEventListener("online", () => { if (currentUser && pendingPush) syncNow(true); });
  window.addEventListener("offline", () => { if (currentUser) status("오프라인 상태예요. 기록은 기기에 안전하게 저장돼요."); });

  /* ---------- SDK 로딩 + 초기화 ---------- */
  function loadSdk() {
    return new Promise((res, rej) => {
      if (window.supabase && window.supabase.createClient) return res();
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = res; s.onerror = () => rej(new Error("SDK 로드 실패"));
      document.head.appendChild(s);
    });
  }
  async function init() {
    wireUI();
    const cfg = window.ONEUL_CONFIG || {};
    const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !/YOUR_|^$/.test(cfg.SUPABASE_URL);
    if (!configured) { setView("notconf"); return; }
    try { await loadSdk(); sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); }
    catch (e) { setView("notconf"); status && status("SDK 로드 실패"); return; }
    ready = true;
    sb.auth.onAuthStateChange((_evt, session) => {
      currentUser = session ? session.user : null;
      if (currentUser) { setView("in"); const u = $("cloudUser"); if (u) u.textContent = "로그인됨: " + (currentUser.email || currentUser.id); authMsg(""); syncNow(true); }
      else setView("out");
    });
    try {
      const { data } = await sb.auth.getSession();
      currentUser = data.session ? data.session.user : null;
    } catch (e) { currentUser = null; }
    if (currentUser) { setView("in"); const u = $("cloudUser"); if (u) u.textContent = "로그인됨: " + (currentUser.email || currentUser.id); syncNow(true); }
    else setView("out");
  }

  window.Cloud = {
    init, markDirty,
    isReady: () => ready,
    getUser: () => currentUser,
    _merge: mergeData, // 테스트용
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
