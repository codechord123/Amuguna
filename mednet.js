// mednet.js — "함께 호흡" 존재감(presence)
// 명상 호흡 세션 동안 '지금 함께 호흡 중인 사람 수'를 실시간으로 나눈다.
// 백엔드: Supabase Realtime presence 채널. 익명·일시적 키만 공유하고
//          신원·일기·기록 등 어떤 개인정보도 보내지 않는다.
// 백엔드가 없거나(미설정/오프라인) 연결에 실패하면 조용히 '혼자' 모드로 동작한다.
//          — 가짜 인원을 만들어내지 않는다(정직한 존재감).
(function () {
  const CHANNEL = "breathe-together";
  let channel = null, onChange = null, count = 1, live = false, joined = false;

  function emit() { if (onChange) { try { onChange({ count, live }); } catch (e) {} } }

  // 로그인 없이도 익명 키만으로 Realtime에 붙을 수 있게 Cloud가 노출한 클라이언트를 재사용.
  function sbClient() {
    try { return (window.Cloud && window.Cloud._sb && window.Cloud._sb()) || null; }
    catch (e) { return null; }
  }

  async function join() {
    if (joined) return { count, live };
    joined = true; count = 1; live = false;
    const sb = sbClient();
    if (!sb || !navigator.onLine) { emit(); return { count, live }; } // 백엔드 없음 → 정직한 혼자 모드
    try {
      const key = "b" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      channel = sb.channel(CHANNEL, { config: { presence: { key } } });
      channel.on("presence", { event: "sync" }, () => {
        try { count = Math.max(1, Object.keys(channel.presenceState()).length); } catch (e) { count = 1; }
        live = true; emit();
      });
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") { try { channel.track({ at: Date.now() }); } catch (e) {} }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") { live = false; emit(); }
      });
    } catch (e) { live = false; count = 1; }
    emit();
    return { count, live };
  }

  function leave() {
    joined = false; live = false; count = 1;
    if (channel) { try { channel.unsubscribe(); } catch (e) {} channel = null; }
  }

  window.MedNet = {
    join, leave,
    subscribe(fn) { onChange = fn; },
    count: () => count,
    isLive: () => live,
    _channel: CHANNEL,
  };
})();
