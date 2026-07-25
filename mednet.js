// mednet.js — "함께 호흡" 존재감(presence) · 테마 방
// 명상 호흡 세션에서 '지금 같은 방에서 함께 호흡 중인 사람 수'를 실시간으로 나눈다.
// 백엔드: Supabase Realtime presence 채널 하나(breathe). 각자 자기 방(room)만 presence에 실어
//          방별 인원과 전체 접속 수를 한 채널에서 계산한다.
//          익명·일시적 키만 공유하고 신원·일기·기록 등 개인정보는 절대 전송하지 않는다.
// 백엔드가 없거나(미설정/오프라인) 연결 실패 시 조용히 '혼자' 모드 — 가짜 인원을 만들지 않는다.
(function () {
  const CHANNEL = "breathe";
  let channel = null, onChange = null, live = false, connected = false, myKey = null, myRoom = null;
  let counts = {}, total = 0;

  function snapshot() { return { live, total, rooms: Object.assign({}, counts) }; }
  function emit() { if (onChange) { try { onChange(snapshot()); } catch (e) {} } }

  function sbClient() {
    try { return (window.Cloud && window.Cloud._sb && window.Cloud._sb()) || null; }
    catch (e) { return null; }
  }

  function recompute() {
    counts = {}; total = 0;
    if (!channel) return;
    let st; try { st = channel.presenceState(); } catch (e) { st = {}; }
    for (const k in st) { total++; const m = st[k] && st[k][0]; const r = m && m.room; if (r) counts[r] = (counts[r] || 0) + 1; }
  }

  function track() { if (channel && connected) { try { channel.track({ room: myRoom, at: Date.now() }); } catch (e) {} } }

  async function connect() {
    if (connected) return true;
    const sb = sbClient();
    if (!sb || !navigator.onLine) { live = false; return false; } // 백엔드 없음 → 정직한 혼자 모드
    try {
      myKey = "b" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      channel = sb.channel(CHANNEL, { config: { presence: { key: myKey } } });
      channel.on("presence", { event: "sync" }, () => { recompute(); live = true; emit(); });
      await new Promise((res) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") { connected = true; track(); res(true); }
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") { live = false; emit(); res(false); }
        });
      });
      return connected;
    } catch (e) { live = false; return false; }
  }

  // join(roomId): 방에 들어가 호흡(roomId=null이면 목록만 둘러보는 '접속' 상태)
  async function join(roomId) { myRoom = roomId || null; await connect(); track(); recompute(); emit(); return snapshot(); }
  function setRoom(roomId) { myRoom = roomId || null; track(); recompute(); emit(); }
  function leave() {
    myRoom = null;
    if (channel) { try { channel.unsubscribe(); } catch (e) {} channel = null; }
    connected = false; live = false; counts = {}; total = 0;
  }

  window.MedNet = {
    join, setRoom, leave, subscribe(fn) { onChange = fn; },
    snapshot, roomCount: (id) => counts[id] || 0, total: () => total, isLive: () => live,
    _channel: CHANNEL,
  };
})();
