// mednet.js — "함께 호흡" 존재감(presence) 어댑터
// 실제 연결은 cloud.js(Firebase Realtime Database)가 담당하고, 여기는 앱이 쓰는 얇은 API만 유지한다.
// 스냅샷 형태: { live, total, rooms: {방id: 인원}, names: {방id: [닉네임…]} }
// 백엔드가 없거나(미설정/오프라인) 연결 실패 시 조용히 '혼자' 모드 — 가짜 인원·가짜 이름을 만들지 않는다.
(function () {
  let onChange = null, joined = false;
  const empty = () => ({ live: false, total: 0, rooms: {}, names: {} });

  function backend() {
    try { return (window.Cloud && Cloud.hasBackend && Cloud.hasBackend()) ? Cloud.presence : null; }
    catch (e) { return null; }
  }

  async function join(roomId) {
    const p = backend();
    if (!p || !navigator.onLine) { joined = false; return empty(); } // 백엔드 없음 → 정직한 혼자 모드
    if (!joined) { p.subscribe((s) => { if (onChange) { try { onChange(s); } catch (e) {} } }); }
    joined = p.join(roomId || null) || false;
    return p.snapshot();
  }
  function setRoom(roomId) { const p = backend(); if (p && joined) p.setRoom(roomId || null); }
  function leave() { const p = backend(); if (p) p.leave(); joined = false; }

  window.MedNet = {
    join, setRoom, leave,
    subscribe(fn) { onChange = fn; },
    snapshot() { const p = backend(); return p ? p.snapshot() : empty(); },
    isLive() { return this.snapshot().live; },
  };
})();
