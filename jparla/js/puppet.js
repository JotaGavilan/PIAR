// ============================================================
//  puppet.js – JParla: mou el cap (gir, boca, ulls) i fa parlar el dispositiu
//
//  const P = JParlaPuppet.create({ send, onPose, onPacket, getCal, getInterval, getMove, getBlink });
//  P.speak(text, { lang, voice, rate, pitch, robotic, k, mouthRate, lead (s: avança la boca), floor (0…0.6: boca mig oberta entre síl·labes), onWord(i), onStart })
//        → Promise<{ status:'done'|'stopped'|'error', code, learn }>      (un tros de text; el boca va per síl·labes)
//  P.runSteps(steps, { slow, onStep(i, step) })  → Promise<'done'|'stopped'>
//        passos { yaw|dyaw, mouth|dmouth, eyeL, eyeR, ms }: ordres [entre claudàtors] i moviments del mode «Mou».
//        slow = true: la boca avança poc a poc (3,6/s, com feia JVeu) en compte de «a clap».
//  P.stop()   P.center()   P.setPose({yaw,mouth,eyeL,eyeR}, force)   P.pose   P.resend()   P.speaking
//
//  Un únic bucle (25 ms) fa avançar la pose cap a l'objectiu amb límit de velocitat (per no forçar els servos)
//  i envia el paquet «yyMMEE» NOMÉS quan canvia i com a molt cada «getInterval()» ms.
//  La boca segueix la línia de temps de síl·labes (JParla.timeline). Si el navegador dóna esdeveniments de paraula
//  («boundary»), la línia de temps es torna a sincronitzar amb ells; si no (Android amb veus de xarxa),
//  segueix només el rellotge i l'app va aprenent la velocitat real de la veu (el valor «learn»).
// ============================================================
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const YAW_SPEED = 2.6;                 // unitats normalitzades per segon
  const MOUTH_UP = 60, MOUTH_DOWN = 60;  // en parlar, la boca va «a clap»: el límit de velocitat real és el del servo. Una rampa de programari només envia valors intermedis ja vells.
  const MOUTH_SLOW = 3.6;                // mode «Mou»: la boca avança amb suavitat perquè el servo no patisca
  const WEB_LANG = { ca: 'ca-ES', es: 'es-ES', en: 'en-US' };
  const MOVE = { none: [0, 0], low: [0.3, 0.3], normal: [0.55, 0.45], lively: [0.9, 0.65] };   // [probabilitat per paraula, amplitud]

  function create(opt) {
    opt = opt || {};
    const J = root.JParla;
    const pose = Object.assign({}, J.NEUTRAL);
    const tgt = { yaw: 0, mouth: 0 };
    let lastPk = null, lastSentAt = 0, lastPoseKey = '';
    let mouthSrc = null;                    // (ara) → obertura 0…1 mentre es parla
    let runId = 0, wake = null;
    let blinkUntil = 0, nextBlink = 0, eyesForced = null, mouthSlow = false;
    let timer = null, lastTick = performance.now();

    const sleep = (ms) => new Promise((res) => { const t = setTimeout(() => { wake = null; res(); }, ms); wake = () => { clearTimeout(t); wake = null; res(); }; });
    // En parlar (o en la prova de síl·labes) l'interval no passa de 50 ms: a 80 ms o més, una obertura de ~110 ms no arriba a enviar-se completa
    const SPEECH_INTERVAL = 50;
    let fastRun = false;
    const interval = () => { const v = clamp((opt.getInterval && opt.getInterval()) || 80, 30, 500); return (mouthSrc || fastRun) ? Math.min(v, SPEECH_INTERVAL) : v; };

    function emit(force) {
      const eyes = eyesForced || (blinkUntil > performance.now() ? { l: 0, r: 0 } : null);
      const p = eyes ? Object.assign({}, pose, { eyeL: eyes.l, eyeR: eyes.r }) : pose;
      const key = p.yaw.toFixed(3) + '|' + p.mouth.toFixed(3) + '|' + p.eyeL + p.eyeR;
      if (key !== lastPoseKey) { lastPoseKey = key; if (opt.onPose) opt.onPose(Object.assign({}, p)); }
      const pk = J.toPacket(p, opt.getCal && opt.getCal());
      const now = performance.now();
      if (force || (pk !== lastPk && now - lastSentAt >= interval())) {
        lastPk = pk; lastSentAt = now;
        if (opt.send) opt.send(pk);
        if (opt.onPacket) opt.onPacket(pk);
      }
    }

    function tick() {
      const now = performance.now(), dt = Math.min(0.2, (now - lastTick) / 1000); lastTick = now;
      if (mouthSrc) tgt.mouth = clamp(mouthSrc(now), 0, 1);
      // gir
      if (Math.abs(tgt.yaw - pose.yaw) > 1e-4) { const d = YAW_SPEED * dt; pose.yaw = Math.abs(tgt.yaw - pose.yaw) <= d ? tgt.yaw : pose.yaw + Math.sign(tgt.yaw - pose.yaw) * d; }
      // boca
      if (Math.abs(tgt.mouth - pose.mouth) > 1e-4) { const d = (mouthSlow ? MOUTH_SLOW : tgt.mouth > pose.mouth ? MOUTH_UP : MOUTH_DOWN) * dt; pose.mouth = Math.abs(tgt.mouth - pose.mouth) <= d ? tgt.mouth : pose.mouth + Math.sign(tgt.mouth - pose.mouth) * d; }
      // parpelleig automàtic (només mentre es parla)
      if (mouthSrc && opt.getBlink && opt.getBlink()) {
        if (!nextBlink) nextBlink = now + 1800 + Math.random() * 2500;
        if (now >= nextBlink) { blinkUntil = now + 150; nextBlink = now + 2500 + Math.random() * 3000; }
      } else nextBlink = 0;
      emit(false);
    }
    function ensureLoop() { if (!timer) { lastTick = performance.now(); timer = setInterval(tick, 25); } }
    ensureLoop();

    // Un petit moviment del cap a l'atzar (a cada paraula, amb probabilitat segons «Moviment del cap»)
    let lastYaw = 0;
    function wander() {
      const m = MOVE[(opt.getMove && opt.getMove()) || 'normal'] || MOVE.normal;
      if (!m[0] || Math.random() > m[0]) return;
      let y = (Math.random() * 2 - 1) * m[1];
      if (Math.abs(y - lastYaw) < 0.15) y = -lastYaw || m[1] * 0.6;
      lastYaw = clamp(y, -m[1], m[1]); tgt.yaw = lastYaw;
    }

    function speak(text, o) {
      o = o || {};
      return new Promise((resolve) => {
        const synth = root.speechSynthesis;
        if (!synth || typeof root.SpeechSynthesisUtterance === 'undefined') return resolve({ status: 'error', code: 'unsupported' });
        const my = runId;
        mouthSlow = false;
        const lang = o.lang || 'ca';
        const words = (String(text).match(/[\p{L}\p{N}'’·]+/gu) || []);
        const spoken = o.robotic ? words.join(', ') + '.' : String(text);
        const tl = J.timeline(text, lang, { rate: o.rate, k: o.k, mouthRate: o.mouthRate, gap: o.robotic ? 0.2 : 0 });
        const u = new root.SpeechSynthesisUtterance(spoken);
        u.lang = WEB_LANG[lang] || 'ca-ES';
        if (o.voice) { u.voice = o.voice; if (o.voice.lang) u.lang = o.voice.lang; }
        u.rate = clamp(o.rate || 1, 0.3, 2); u.pitch = clamp(o.pitch || 1, 0, 2); u.volume = 1;
        let t0 = null, done = false, boundary = false, lastWord = -1, watch = null, startWd = null;
        const finish = (r) => {
          if (done) return; done = true; clearTimeout(watch); clearTimeout(startWd);
          mouthSrc = null; tgt.mouth = 0; cur = null;
          resolve(r);
        };
        cur = { finish, cancel: () => { try { synth.cancel(); } catch (e) {} finish({ status: 'stopped' }); } };
        u.onstart = () => {
          if (my !== runId) return;
          clearTimeout(startWd); t0 = performance.now();
          mouthSrc = (now) => {
            const t = (now - t0) / 1000;
            const w = J.wordAt(tl, t);
            if (w !== lastWord && w >= 0) { lastWord = w; wander(); if (o.onWord) o.onWord(w, tl); }
            return J.mouthAt(tl, t + (o.lead || 0), o.floor || 0);
          };
          if (o.onStart) o.onStart(tl);
          watch = setTimeout(() => { try { synth.cancel(); } catch (e) {} finish({ status: 'done', timeout: true }); }, (tl.total * 4 + 8) * 1000);
        };
        u.onboundary = (ev) => {
          if (my !== runId || o.robotic || t0 === null || typeof ev.charIndex !== 'number' || ev.name === 'sentence') return;
          const i = J.wordAtChar(tl, ev.charIndex);
          if (i >= 0) { boundary = true; t0 = performance.now() - tl.words[i].t * 1000; }
        };
        u.onend = () => {
          if (my !== runId) return finish({ status: 'stopped' });
          const actual = t0 === null ? 0 : (performance.now() - t0) / 1000;
          const syl = tl.sylls.length;
          // Es compara la durada real amb la prevista per a aprendre la velocitat d'esta veu (només sense «boundary»)
          const est = tl.speechEnd - tl.speechStart;
          const learn = (!boundary && syl >= 4 && actual > 0.8 && est > 0) ? { factor: clamp(est / actual, 0.4, 2.5) } : null;
          finish({ status: 'done', learn, boundary });
        };
        u.onerror = (ev) => {
          const e = ev && ev.error;
          if (e === 'interrupted' || e === 'canceled') return finish({ status: 'stopped' });
          finish({ status: 'error', code: e === 'not-allowed' ? 'notallowed' : e === 'language-unavailable' || e === 'voice-unavailable' ? 'lang' : 'tts' });
        };
        try {
          synth.cancel();
          synth.speak(u);
          // Si el navegador no arriba a començar (veu absent, bloqueig…), no es queda penjat
          startWd = setTimeout(() => { try { synth.cancel(); } catch (e) {} finish({ status: 'error', code: 'nostart' }); }, 5000);
        } catch (e) { finish({ status: 'error', code: 'tts' }); }
      });
    }
    let cur = null;

    async function runSteps(steps, o) {
      o = o || {};
      const my = ++runId;
      if (cur) { cur.cancel(); }
      if (wake) wake();
      mouthSlow = !!o.slow; fastRun = !!o.fast;
      for (let i = 0; i < steps.length; i++) {
        if (my !== runId) return 'stopped';
        const s = steps[i];
        if (o.onStep) o.onStep(i, s);
        // els ulls i qualsevol canvi «discret» són immediats
        if (s.eyeL !== undefined) pose.eyeL = s.eyeL ? 1 : 0;
        if (s.eyeR !== undefined) pose.eyeR = s.eyeR ? 1 : 0;
        if (s.yaw !== undefined) tgt.yaw = clamp(s.yaw, -1, 1);
        else if (s.dyaw !== undefined) tgt.yaw = clamp(pose.yaw + s.dyaw, -1, 1);
        if (s.mouth !== undefined) tgt.mouth = clamp(s.mouth, 0, 1);
        else if (s.dmouth !== undefined) tgt.mouth = clamp(pose.mouth + s.dmouth, 0, 1);
        let guard = 0;
        while (my === runId && (Math.abs(pose.yaw - tgt.yaw) > 1e-3 || Math.abs(pose.mouth - tgt.mouth) > 1e-3) && ++guard < 120) await sleep(25);
        if (my !== runId) return 'stopped';
        await sleep(Math.max(0, s.ms || 0));
      }
      if (my === runId) { mouthSlow = false; fastRun = false; }
      return my === runId ? 'done' : 'stopped';
    }

    function stop() {
      runId++; if (wake) wake(); mouthSlow = false; fastRun = false;
      if (cur) cur.cancel(); else { try { root.speechSynthesis && root.speechSynthesis.cancel(); } catch (e) {} }
      mouthSrc = null; tgt.mouth = 0;
    }
    function center() { stop(); tgt.yaw = 0; lastYaw = 0; pose.eyeL = pose.eyeR = 1; tgt.mouth = 0; }
    function setPose(p, force) { Object.assign(pose, p); if (p.yaw !== undefined) tgt.yaw = p.yaw; if (p.mouth !== undefined) tgt.mouth = p.mouth; emit(!!force); }
    function destroy() { clearInterval(timer); timer = null; }

    return {
      speak, runSteps, stop, center, setPose, destroy,
      resend: () => emit(true),
      get runId() { return runId; },
      get pose() { return Object.assign({}, pose); },
      get speaking() { return !!cur; },
      get last() { return lastPk; }
    };
  }
  root.JParlaPuppet = { create };
})(typeof window !== 'undefined' ? window : globalThis);
