// cloud.js — Firebase 기반 로그인 + 기기 간 동기화 + 커뮤니티(방·명단·세션)
// config.js에 FIREBASE 키가 없으면 아무 동작도 하지 않고 앱은 오프라인으로 동작합니다.
// app.js가 제공하는 훅: window.__getLocalData(), window.__applyData(merged)
// 구성: Auth(이메일/Google 로그인) · Firestore(app_state 동기화 + rooms 공개 방 목록)
//       · Realtime Database(presence 명단·실시간 인원 + rooms_live 방장 시작/종료)
(function () {
  let fb = null, auth = null, store = null, rtdb = null, currentUser = null, pushTimer = null, ready = false;

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
  function emitAuth() { try { window.dispatchEvent(new CustomEvent("cloud:auth")); } catch (e) {} }

  function wireUI() {
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
    on("authLogin", () => doAuth("login"));
    on("authSignup", () => doAuth("signup"));
    on("authGoogle", doGoogle);
    on("cloudSync", () => { window.Sound && Sound.tap && Sound.tap(); syncNow(true); });
    on("cloudLogout", doLogout);
  }

  function krAuthError(e) {
    const c = (e && e.code) || "";
    if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "이메일 또는 비밀번호가 맞지 않아요.";
    if (c.includes("email-already-in-use")) return "이미 가입된 이메일이에요. 로그인해 주세요.";
    if (c.includes("invalid-email")) return "이메일 형식을 확인해 주세요.";
    if (c.includes("weak-password")) return "비밀번호는 6자 이상이어야 해요.";
    if (c.includes("too-many-requests")) return "잠시 후 다시 시도해 주세요.";
    return "오류: " + ((e && e.message) || e);
  }
  async function doAuth(mode) {
    if (!auth) return;
    const email = ($("authEmail").value || "").trim();
    const pw = $("authPw").value || "";
    if (!email || pw.length < 6) { authMsg("이메일과 6자 이상 비밀번호를 입력해주세요."); return; }
    authMsg(mode === "signup" ? "가입 중…" : "로그인 중…");
    try {
      if (mode === "signup") await auth.createUserWithEmailAndPassword(email, pw);
      else await auth.signInWithEmailAndPassword(email, pw);
      authMsg("");
    } catch (e) { authMsg(krAuthError(e)); }
  }
  async function doGoogle() {
    if (!auth) return;
    try { await auth.signInWithPopup(new fb.auth.GoogleAuthProvider()); }
    catch (e) {
      // 팝업이 막힌 환경(iOS PWA 등)은 리디렉트로 폴백
      try { await auth.signInWithRedirect(new fb.auth.GoogleAuthProvider()); }
      catch (e2) { authMsg("Google 로그인 오류: " + ((e2 && e2.message) || e2)); }
    }
  }
  async function doLogout() {
    if (!auth) return;
    window.Sound && Sound.tap && Sound.tap();
    await syncNow(false); // 나가기 전 마지막 저장
    presence.leave(); // 명단에서 빠지기
    await auth.signOut();
  }

  /* ---------- 동기화 (Firestore app_state/{uid}) ---------- */
  async function pull() {
    const doc = await store.collection("app_state").doc(currentUser.uid).get();
    return doc.exists ? (doc.data() || {}).data || null : null;
  }
  async function push(state) {
    await store.collection("app_state").doc(currentUser.uid)
      .set({ data: state, updatedAt: new Date().toISOString() });
  }
  let syncing = false, pendingPush = false;
  async function syncNow(showStatus) {
    if (!store || !currentUser || syncing) return;
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
    if (!store || !currentUser) return;
    if (!navigator.onLine) { pendingPush = true; status("오프라인 — 변경사항은 연결되면 저장돼요."); return; }
    if (pushTimer) clearTimeout(pushTimer);
    // 로컬만 push하면 다른 기기가 올린 원격 기록을 덮어쓸 수 있어, 항상 pull→merge→push(syncNow) 경로 사용
    pushTimer = setTimeout(() => syncNow(false), 2500);
  }
  window.addEventListener("online", () => { if (currentUser && pendingPush) syncNow(true); });
  window.addEventListener("offline", () => { if (currentUser) status("오프라인 상태예요. 기록은 기기에 안전하게 저장돼요."); });

  /* ---------- 커뮤니티: 공개 방(Firestore rooms) ---------- */
  function nick() {
    if (!currentUser) return "";
    return (currentUser.displayName || (currentUser.email || "").split("@")[0] || "익명").slice(0, 12);
  }
  const rooms = {
    async list() {
      if (!store) return null;
      const snap = await store.collection("rooms").orderBy("createdAt", "desc").limit(30).get();
      return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    },
    // 방장이 직접 정한 초대 코드로 방 찾기 (친구가 '코드로 참여'에 입력)
    async findByCode(code) {
      if (!store || !code) return null;
      const snap = await store.collection("rooms").where("code", "==", String(code)).limit(1).get();
      return snap.empty ? null : Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
    },
    async publish(room) {
      if (!store || !currentUser) return false;
      await store.collection("rooms").doc(room.id).set({
        name: room.name, mood: room.mood, pat: room.pat, code: room.code || "",
        owner: currentUser.uid, owner_name: nick(),
        createdAt: new Date().toISOString(),
      });
      return true;
    },
    async remove(id) { if (store) await store.collection("rooms").doc(String(id)).delete(); },
  };

  /* ---------- 커뮤니티: 명단 presence (RTDB presence/breathe) ---------- */
  const presence = (() => {
    let myRef = null, listRef = null, onChange = null, live = false;
    let state = { live: false, total: 0, rooms: {}, names: {} };
    function compute(snapVal) {
      const rooms = {}, names = {}; let total = 0;
      const v = snapVal || {};
      for (const k in v) {
        total++;
        const r = v[k] && v[k].room;
        if (r) { rooms[r] = (rooms[r] || 0) + 1; (names[r] = names[r] || []).push(String(v[k].name || "익명").slice(0, 12)); }
      }
      state = { live, total, rooms, names };
      if (onChange) { try { onChange(state); } catch (e) {} }
    }
    return {
      subscribe(fn) { onChange = fn; },
      snapshot: () => state,
      join(room, name) {
        if (!rtdb) return false;
        try {
          if (!listRef) { listRef = rtdb.ref("presence/breathe"); listRef.on("value", (s) => { live = true; compute(s.val()); }); }
          if (!myRef) { myRef = rtdb.ref("presence/breathe").push(); myRef.onDisconnect().remove(); }
          myRef.set({ room: room || null, name: name || nick() || null, at: fb.database.ServerValue.TIMESTAMP });
          return true;
        } catch (e) { return false; }
      },
      setRoom(room, name) { if (myRef) { try { myRef.update({ room: room || null, name: name || nick() || null }); } catch (e) {} } },
      leave() {
        try { if (myRef) myRef.remove(); } catch (e) {}
        try { if (listRef) listRef.off(); } catch (e) {}
        myRef = null; listRef = null; live = false;
        state = { live: false, total: 0, rooms: {}, names: {} };
      },
    };
  })();

  /* ---------- 커뮤니티: 방장 시작/종료 (RTDB rooms_live/{roomId}) ---------- */
  const liveApi = {
    watch(roomId, fn) {
      if (!rtdb) return () => {};
      const ref = rtdb.ref("rooms_live/" + roomId);
      const h = ref.on("value", (s) => { try { fn(s.val() || { status: "idle" }); } catch (e) {} });
      return () => { try { ref.off("value", h); } catch (e) {} };
    },
    async start(roomId) { if (rtdb && currentUser) await rtdb.ref("rooms_live/" + roomId).set({ status: "running", by: currentUser.uid, byName: nick(), at: fb.database.ServerValue.TIMESTAMP }); },
    async end(roomId) { if (rtdb && currentUser) await rtdb.ref("rooms_live/" + roomId).set({ status: "idle", by: currentUser.uid, at: fb.database.ServerValue.TIMESTAMP }); },
  };

  /* ---------- SDK 로딩 + 초기화 ---------- */
  const SDK_VER = "10.14.1";
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("SDK 로드 실패: " + src));
      document.head.appendChild(s);
    });
  }
  async function loadSdk() {
    if (window.firebase && window.firebase.apps) return;
    const base = `https://www.gstatic.com/firebasejs/${SDK_VER}/`;
    await loadScript(base + "firebase-app-compat.js");
    await Promise.all([
      loadScript(base + "firebase-auth-compat.js"),
      loadScript(base + "firebase-firestore-compat.js"),
      loadScript(base + "firebase-database-compat.js"),
    ]);
  }
  async function init() {
    wireUI();
    const cfg = (window.ONEUL_CONFIG || {}).FIREBASE || {};
    const configured = cfg.apiKey && cfg.projectId && !/YOUR_/.test(cfg.apiKey);
    if (!configured) { setView("notconf"); emitAuth(); return; }
    try {
      await loadSdk();
      fb = window.firebase;
      fb.initializeApp(cfg);
      auth = fb.auth(); store = fb.firestore();
      try { rtdb = cfg.databaseURL ? fb.database() : null; } catch (e) { rtdb = null; } // RTDB 미설정이어도 나머지는 동작
    } catch (e) { setView("notconf"); status("클라우드 SDK 로드 실패"); emitAuth(); return; }
    ready = true;
    auth.onAuthStateChanged((user) => {
      currentUser = user || null;
      if (currentUser) { setView("in"); const u = $("cloudUser"); if (u) u.textContent = "로그인됨: " + (currentUser.email || currentUser.uid); authMsg(""); syncNow(true); }
      else setView("out");
      emitAuth();
    });
    try { await auth.getRedirectResult(); } catch (e) {} // 리디렉트 로그인 복귀 처리
  }

  window.Cloud = {
    init, markDirty,
    isReady: () => ready,
    hasBackend: () => ready, // 설정+SDK 로드 완료 여부 — 커뮤니티(방 목록·명단) 사용 가능 조건
    getUser: () => currentUser,
    nick,
    rooms, presence, live: liveApi,
    _merge: mergeData, // 테스트용
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
