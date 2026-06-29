// cloud.js — Supabase 기반 로그인 + 기기 간 동기화 (선택 기능)
// config.js에 키가 없으면 아무 동작도 하지 않고 앱은 오프라인으로 동작합니다.
// app.js가 제공하는 훅: window.__getLocalData(), window.__applyData(merged)
(function () {
  let sb = null, currentUser = null, pushTimer = null, ready = false;

  /* ---------- 병합 로직 (순수 함수, 테스트 가능) ---------- */
  // 안전 타임스탬프 파서 — 값이 없으면 0. (주의: Date.parse(0)는 0이 아니라 "0"→2000년이 되므로 직접 0 처리)
  const ts = (v) => (v ? (Date.parse(v) || 0) : 0);
  function mergeEntries(a, b) {
    const out = Object.assign({}, a || {});
    const rb = b || {};
    for (const k in rb) {
      if (!out[k]) { out[k] = rb[k]; continue; }
      if (ts(rb[k].updatedAt) > ts(out[k].updatedAt)) out[k] = rb[k];
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
    // 완료는 날짜별 토글 시각(doneAt)으로 최신성 병합 — 한쪽의 '해제'가 다른 쪽 '완료'에 덮이지 않게.
    const ld = local.done || {}, rd = remote.done || {}, la = local.doneAt || {}, ra = remote.doneAt || {};
    const done = {}, doneAt = {};
    const keys = new Set([].concat(Object.keys(ld), Object.keys(rd), Object.keys(la), Object.keys(ra)));
    keys.forEach((k) => {
      const lt = ts(la[k]), rt = ts(ra[k]);
      const pickLocal = (lt || rt) ? (lt >= rt) : (!!ld[k] || !rd[k]); // 시각 있으면 최신, 없으면 완료(true) 우선(구버전 합집합)
      const pd = pickLocal ? ld : rd, pa = pickLocal ? la : ra;
      if (pd[k]) done[k] = true;
      if (pa[k]) doneAt[k] = pa[k];
    });
    return Object.assign({}, remote, local, {
      done, doneAt,
      celebrated: Array.from(new Set([...(local.celebrated || []), ...(remote.celebrated || [])])),
    });
  }
  function mergeTomb(a, b) { // 삭제 묘비: 키별로 가장 늦은 삭제 시각 채택
    const out = Object.assign({}, a || {}), rb = b || {};
    for (const k in rb) { if (!out[k] || ts(rb[k]) > ts(out[k])) out[k] = rb[k]; }
    return out;
  }
  function applyEntryTombstones(entries, tEntries) { // 삭제 시각이 기록 수정 시각 이후면 삭제 유지
    const t = tEntries || {};
    for (const k in t) { const e = entries[k]; if (e && ts(t[k]) >= ts(e.updatedAt)) delete entries[k]; }
    return entries;
  }
  function mergeData(local, remote) {
    if (!remote) remote = {};
    const lt = local.tombstones || {}, rt = remote.tombstones || {};
    const tomb = { entries: mergeTomb(lt.entries, rt.entries), habits: mergeTomb(lt.habits, rt.habits) };
    const entries = applyEntryTombstones(mergeEntries(local.entries, remote.entries), tomb.entries);
    const challenges = mergeById(local.challenges, remote.challenges, mergeHabit).filter((h) => !tomb.habits[h.id]); // 묘비 처리된 습관은 제외
    return {
      entries, challenges, tombstones: tomb,
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
    // 원격을 먼저 받아 병합 후 올린다(blind overwrite 방지) — 다른 기기 편집 손실 차단
    pushTimer = setTimeout(() => { syncNow(false); }, 2500);
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
