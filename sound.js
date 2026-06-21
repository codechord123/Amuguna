// sound.js — Web Audio로 직접 합성하는 사운드 엔진 (음원 파일 없음, 오프라인 동작).
// 배경음은 연속 노이즈 레이어 + 무작위 트랜지언트(빗방울/새/장작)로 자연스럽게 만듭니다.
(function () {
  let ctx = null;
  let master = null;     // 마스터 게인 -> destination
  let ambGain = null;    // 배경음 사용자 음량 (트랜지언트도 여기로 라우팅)
  let reverb = null;     // 잔향(컨볼버)
  let reverbGain = null; // 잔향 전송량

  const state = { sfxOn: true, breathOn: true, ambientType: "off", ambientVol: 0.55 };

  let ambient = null;    // { stops:[...], gen, interval, gust }
  let schedulerId = null;
  let nextEventT = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(2.6, 2.2);
      reverbGain = ctx.createGain(); reverbGain.gain.value = 0.22;
      reverb.connect(reverbGain).connect(master);
      ambGain = ctx.createGain(); ambGain.gain.value = state.ambientVol; ambGain.connect(master);
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  // 잔향용 임펄스 응답 생성
  function makeImpulse(seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function noiseBuffer(seconds, type) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (type === "brown") {
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    } else {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  /* ---------- 트랜지언트(짧은 소리) ---------- */
  // 노이즈 한 방울/탁 소리
  function noiseBurst(t, dur, type, freq, q, peak, toReverb) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.25, "white");
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(ambGain);
    if (toReverb) g.connect(reverbGain);
    s.start(t); s.stop(t + dur + 0.05);
  }

  function rainDrop(t) {
    // 가끔 굵은 방울
    const big = Math.random() < 0.12;
    noiseBurst(t, big ? 0.18 : 0.09, "bandpass", 900 + Math.random() * 2600, 9, big ? 0.10 : 0.05, big);
  }
  function crackle(t) {
    const big = Math.random() < 0.1;
    noiseBurst(t, big ? 0.09 : 0.035, "highpass", 1400 + Math.random() * 1800, 1, big ? 0.14 : 0.06, big);
  }
  function birdChirp(t) {
    if (Math.random() < 0.45) return; // 가끔만
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    const base = 1900 + Math.random() * 1300;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.25, t + 0.07);
    o.frequency.linearRampToValueAtTime(base * 0.92, t + 0.15);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(ambGain); g.connect(reverbGain);
    o.start(t); o.stop(t + 0.26);
    // 짹-짹 더블 콜
    if (Math.random() < 0.5) birdChirpDelayed(t + 0.22, base);
  }
  function birdChirpDelayed(t, base) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.2, t + 0.06);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(ambGain); g.connect(reverbGain);
    o.start(t); o.stop(t + 0.2);
  }

  /* ---------- 연속 레이어 빌더 ---------- */
  function buildRain() {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(3, "white"); src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6500;
    const g = ctx.createGain(); g.gain.value = 0.32;
    src.connect(hp).connect(lp).connect(g).connect(ambGain);
    src.start();
    return { stops: [src], gen: rainDrop, interval: 0.13 };
  }
  function buildWave() {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(4, "brown"); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 480;
    const swell = ctx.createGain(); swell.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.45;
    lfo.connect(lfoG).connect(swell.gain); lfo.start();
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.09;
    const lfo2G = ctx.createGain(); lfo2G.gain.value = 260;
    lfo2.connect(lfo2G).connect(lp.frequency); lfo2.start();
    src.connect(lp).connect(swell).connect(ambGain);
    src.start();
    return { stops: [src, lfo, lfo2], gen: null, interval: 1 };
  }
  function buildForest() {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(4, "brown"); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
    const g = ctx.createGain(); g.gain.value = 0.22;
    // 바람 결(게인 흔들림)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.12;
    lfo.connect(lfoG).connect(g.gain); lfo.start();
    src.connect(lp).connect(g).connect(ambGain);
    src.start();
    return { stops: [src, lfo], gen: birdChirp, interval: 3.4 };
  }
  function buildFire() {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(3, "brown"); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
    const g = ctx.createGain(); g.gain.value = 0.28;
    src.connect(lp).connect(g).connect(ambGain);
    src.start();
    return { stops: [src], gen: crackle, interval: 0.22 };
  }

  const builders = { rain: buildRain, wave: buildWave, forest: buildForest, fire: buildFire };

  /* ---------- 스케줄러 (트랜지언트 예약) ---------- */
  function scheduler() {
    if (!ambient || !ambient.gen) return;
    const ahead = ctx.currentTime + 0.25;
    let guard = 0;
    while (nextEventT < ahead && guard++ < 60) {
      ambient.gen(nextEventT);
      nextEventT += ambient.interval * (0.45 + Math.random() * 1.3);
    }
  }

  function stopAmbient() {
    if (schedulerId) { clearInterval(schedulerId); schedulerId = null; }
    if (ambient) {
      const cur = ambient; ambient = null;
      if (ambGain) ambGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => { cur.stops.forEach((n) => { try { n.stop(); } catch (e) {} }); }, 900);
    }
    state.ambientType = "off";
  }

  function startAmbient(type) {
    if (!ensure()) return;
    if (type === "off" || !builders[type]) { stopAmbient(); return; }
    // 기존 것 정리 (페이드 없이 빠르게)
    if (ambient) {
      if (schedulerId) { clearInterval(schedulerId); schedulerId = null; }
      const cur = ambient; ambient = null;
      setTimeout(() => { cur.stops.forEach((n) => { try { n.stop(); } catch (e) {} }); }, 600);
    }
    state.ambientType = type;
    ambGain.gain.cancelScheduledValues(ctx.currentTime);
    ambGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    ambGain.gain.setTargetAtTime(state.ambientVol, ctx.currentTime, 0.7);
    ambient = builders[type]();
    nextEventT = ctx.currentTime + 0.1;
    if (ambient.gen) schedulerId = setInterval(scheduler, 120);
  }

  function setAmbientVolume(v) {
    state.ambientVol = v;
    if (ambGain && ctx && state.ambientType !== "off") {
      ambGain.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
    }
  }

  /* ---------- 효과음 / 호흡 가이드 ---------- */
  function tone(freq, dur, when, type, peak, toReverb) {
    const t = (when || 0) + ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type || "sine"; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak || 0.16, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    if (toReverb) g.connect(reverbGain);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function chime() { if (!state.sfxOn || !ensure()) return; tone(660, 0.55, 0, "sine", 0.13, true); tone(990, 0.6, 0.1, "sine", 0.10, true); }
  function tap() { if (!state.sfxOn || !ensure()) return; tone(540, 0.16, 0, "sine", 0.07); }
  // 호흡 카운트다운 틱 (호흡 가이드 소리 설정에 연동)
  function tick() { if (!state.breathOn || !ensure()) return; tone(880, 0.08, 0, "sine", 0.07); }
  function success() {
    if (!state.sfxOn || !ensure()) return;
    tone(523, 0.45, 0, "sine", 0.12, true);
    tone(659, 0.45, 0.1, "sine", 0.12, true);
    tone(784, 0.6, 0.2, "sine", 0.12, true);
    tone(1047, 0.7, 0.3, "sine", 0.10, true);
  }
  function celebrate() {
    if (!ensure()) return;
    const notes = [523, 587, 659, 784, 880, 1047];
    notes.forEach((f, i) => tone(f, 0.6, i * 0.12, "triangle", 0.11, true));
  }
  // 부드러운 저음 패드 — 호흡 단계 길이만큼 천천히 차오르고 빠짐 (수면용)
  function softPad(fStart, fEnd, dur, peak) {
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o1.type = "sine"; o2.type = "triangle"; o2.detune.value = 5;
    lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 0.4;
    o1.frequency.setValueAtTime(fStart, t); o1.frequency.linearRampToValueAtTime(fEnd, t + dur);
    o2.frequency.setValueAtTime(fStart / 2, t); o2.frequency.linearRampToValueAtTime(fEnd / 2, t + dur);
    const atk = Math.min(1.4, dur * 0.35), rel = Math.min(2.2, dur * 0.45);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + atk);
    g.gain.setValueAtTime(peak, t + Math.max(atk, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(lp); o2.connect(lp); lp.connect(g);
    g.connect(master); g.connect(reverbGain);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.15); o2.stop(t + dur + 0.15);
  }
  // phase: inhale(상승)/exhale(하강)/hold(잔잔). dur: 단계 길이(초)
  // 폴백(세션 밖)용 부드러운 패드
  function padCue(phase, dur) {
    if (phase === "inhale") softPad(174, 261, dur || 4, 0.09);
    else if (phase === "exhale") softPad(261, 130, dur || 8, 0.10);
    else softPad(174, 174, Math.min(dur || 7, 3), 0.045);
  }

  /* ---------- 호흡 사운드 세션 (드론 + 숨소리 노이즈 + 싱잉볼) ---------- */
  let breathSession = null;
  function breathStart() {
    if (!state.breathOn || !ensure()) return;
    breathStop();
    // 따뜻한 드론 — 휴대폰 스피커에서도 들리도록 한 옥타브 올림 (A3·E4·A4)
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(master);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400; lp.connect(g);
    const freqs = [220.0, 329.63, 440.0], amps = [0.5, 0.34, 0.22];
    const oscs = freqs.map((f, i) => { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = amps[i]; o.connect(og).connect(lp); o.start(); return o; });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lfoG = ctx.createGain(); lfoG.gain.value = 5;
    lfo.connect(lfoG).connect(oscs[1].detune); lfo.start();
    g.gain.setTargetAtTime(0.17, ctx.currentTime, 1.2);
    // 숨소리 노이즈 (밴드패스가 들숨에 열리고 날숨에 닫힘)
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(3, "white"); src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 600; bp.Q.value = 0.6;
    const ng = ctx.createGain(); ng.gain.value = 0.0001;
    src.connect(bp).connect(ng).connect(master); src.start();
    breathSession = { g, lp, oscs, lfo, src, bp, ng };
  }
  function breathStop() {
    if (!breathSession) return;
    const b = breathSession; breathSession = null;
    const t = ctx.currentTime;
    try { b.g.gain.setTargetAtTime(0, t, 0.7); b.ng.gain.setTargetAtTime(0, t, 0.7); } catch (e) {}
    setTimeout(() => { try { b.oscs.forEach((o) => o.stop()); b.lfo.stop(); b.src.stop(); } catch (e) {} }, 1600);
  }
  // 싱잉볼 한 번 (비배음 부분음 + 긴 잔향)
  function bowl(freq, dur, peak) {
    const t = ctx.currentTime;
    [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.12]].forEach(([mult, amp]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak * amp, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master); g.connect(reverbGain);
      o.start(t); o.stop(t + dur + 0.1);
    });
  }
  function breathCue(phase, dur) {
    if (!state.breathOn || !ensure()) return;
    dur = dur || (phase === "inhale" ? 4 : phase === "exhale" ? 8 : 7);
    if (!breathSession) { padCue(phase, dur); return; } // 세션 밖이면 패드
    const t = ctx.currentTime, ng = breathSession.ng.gain, bp = breathSession.bp.frequency;
    const ramp = (param, to, time) => { param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(to, t + time); };
    if (phase === "inhale") { ramp(ng, 0.12, dur); ramp(bp, 1400, dur); bowl(523.25, 3.6, 0.18); }      // 숨 들어오며 밝아짐 + C5 볼
    else if (phase === "exhale") { ramp(ng, 0.0001, dur); ramp(bp, 350, dur); bowl(392.00, 4.6, 0.18); } // 숨 나가며 어두워짐 + G4 볼
    else { ramp(ng, 0.05, Math.min(dur, 1.5)); }                                                        // 멈춤: 잔잔히 유지
  }

  window.Sound = {
    state, unlock: ensure,
    startAmbient, stopAmbient, setAmbientVolume,
    chime, tap, tick, success, celebrate, breathCue, breathStart, breathStop,
    setSfx(v) { state.sfxOn = v; },
    setBreath(v) { state.breathOn = v; },
  };
})();
