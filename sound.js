// sound.js — 모든 소리를 Web Audio로 직접 합성합니다 (음원 파일 없음, 오프라인 동작).
(function () {
  let ctx = null;
  let masterReady = false;

  // 설정값 (app.js에서 갱신)
  const state = {
    sfxOn: true,
    breathOn: true,
    ambientType: "off",
    ambientVol: 0.55,
  };

  // 현재 재생 중인 배경음 노드들
  let ambientNodes = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    masterReady = true;
    return true;
  }

  // ---- 노이즈 버퍼 (배경음 재료) ----
  function makeNoiseBuffer(seconds) {
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      // 브라운 노이즈 (부드러운 저주파) 로 가공
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buf;
  }

  function stopAmbient() {
    if (ambientNodes) {
      try {
        ambientNodes.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        const nodes = ambientNodes;
        setTimeout(() => {
          try { nodes.src.stop(); } catch (e) {}
          try { nodes.lfo && nodes.lfo.stop(); } catch (e) {}
        }, 800);
      } catch (e) {}
      ambientNodes = null;
    }
  }

  // type: rain | wave | forest
  function startAmbient(type) {
    if (!ensure()) return;
    stopAmbient();
    if (type === "off") { state.ambientType = "off"; return; }
    state.ambientType = type;

    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(4);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    gain.gain.value = 0;

    let lfo = null;
    if (type === "rain") {
      filter.type = "bandpass";
      filter.frequency.value = 1400;
      filter.Q.value = 0.6;
    } else if (type === "wave") {
      filter.type = "lowpass";
      filter.frequency.value = 600;
      // 파도가 밀려오고 빠지는 느낌의 느린 음량 변화
      lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.12;
      lfoGain.gain.value = 0.35;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();
    } else { // forest
      filter.type = "lowpass";
      filter.frequency.value = 900;
      lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.25;
      lfoGain.gain.value = 0.2;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();
    }

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    gain.gain.setTargetAtTime(state.ambientVol, ctx.currentTime, 0.6);

    ambientNodes = { src, filter, gain, lfo };
  }

  function setAmbientVolume(v) {
    state.ambientVol = v;
    if (ambientNodes && ctx) {
      // LFO가 음량을 흔드는 타입은 기준값을 부드럽게만 맞춤
      ambientNodes.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
    }
  }

  // ---- 짧은 음 (효과음 / 호흡 가이드) ----
  function tone(freq, dur, when, type, peak) {
    const t = (when || 0) + ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak || 0.18, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // 부드러운 두 음의 차임
  function chime() {
    if (!state.sfxOn || !ensure()) return;
    tone(660, 0.5, 0, "sine", 0.14);
    tone(880, 0.6, 0.09, "sine", 0.12);
  }

  function tap() {
    if (!state.sfxOn || !ensure()) return;
    tone(520, 0.18, 0, "sine", 0.08);
  }

  function success() {
    if (!state.sfxOn || !ensure()) return;
    tone(523, 0.4, 0, "sine", 0.13);    // C5
    tone(659, 0.4, 0.1, "sine", 0.13);  // E5
    tone(784, 0.6, 0.2, "sine", 0.13);  // G5
  }

  // 호흡 단계 가이드음: inhale(상승) / hold / exhale(하강)
  function breathCue(phase) {
    if (!state.breathOn || !ensure()) return;
    if (phase === "inhale") {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(330, t);
      osc.frequency.linearRampToValueAtTime(495, t + 1.2);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(g).connect(ctx.destination);
      osc.start(t); osc.stop(t + 1.5);
    } else if (phase === "exhale") {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(220, t + 1.6);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      osc.connect(g).connect(ctx.destination);
      osc.start(t); osc.stop(t + 1.9);
    } else { // hold
      tone(396, 0.2, 0, "sine", 0.06);
    }
  }

  window.Sound = {
    state,
    unlock: ensure,
    startAmbient,
    stopAmbient,
    setAmbientVolume,
    chime, tap, success, breathCue,
    setSfx(v) { state.sfxOn = v; },
    setBreath(v) { state.breathOn = v; },
  };
})();
