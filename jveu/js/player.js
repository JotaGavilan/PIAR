// ============================================================
//  player.js – Reprodueix una seqüència de passos enviant paquets de 6 dígits (com JFace)
//
//  const P = JVeuPlayer.create({ send, onPose, onPacket, onState, getCal, getTick });
//  P.play(steps)  → Promise<'done'|'stopped'>      P.stop()      P.pose      P.busy
//  El moviment és suau: el gir i la boca avancen per trams (no salten d'un extrem a l'altre) perquè
//  el muñeco i els servos no pateixen; els ulls canvien al moment. Cada canvi s'envia una sola vegada.
// ============================================================
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const YAW_SPEED = 2.6;     // unitats normalitzades per segon (de −1 a +1 en ≈ 0,8 s)
  const MOUTH_SPEED = 3.6;

  function create(opt) {
    opt = opt || {};
    const J = root.JVeu;
    let pose = Object.assign({}, J.NEUTRAL);
    let lastSent = null, runId = 0, busy = false;
    let wake = null;                                  // per a interrompre les esperes

    const sleep = (ms) => new Promise((res) => { const t = setTimeout(() => { wake = null; res(); }, ms); wake = () => { clearTimeout(t); wake = null; res(); }; });
    const tick = () => clamp((opt.getTick && opt.getTick()) || 120, 50, 500);

    function emit(force) {
      const pk = J.toPacket(pose, opt.getCal && opt.getCal());
      if (opt.onPose) opt.onPose(Object.assign({}, pose));
      if (force || pk !== lastSent) {
        lastSent = pk;
        if (opt.send) opt.send(pk);
        if (opt.onPacket) opt.onPacket(pk);
      }
    }

    function target(step) {
      const t = {};
      if (step.yaw !== undefined) t.yaw = clamp(step.yaw, -1, 1);
      else if (step.dyaw !== undefined) t.yaw = clamp(pose.yaw + step.dyaw, -1, 1);
      if (step.mouth !== undefined) t.mouth = clamp(step.mouth, 0, 1);
      else if (step.dmouth !== undefined) t.mouth = clamp(pose.mouth + step.dmouth, 0, 1);
      if (step.eyeL !== undefined) t.eyeL = step.eyeL ? 1 : 0;
      if (step.eyeR !== undefined) t.eyeR = step.eyeR ? 1 : 0;
      return t;
    }

    async function play(steps) {
      const my = ++runId;
      busy = true; if (opt.onState) opt.onState('playing');
      if (wake) wake();
      try {
        for (let i = 0; i < steps.length; i++) {
          if (my !== runId) return 'stopped';
          const s = steps[i], t = target(s);
          if (opt.onStep) opt.onStep(i, s);
          // els ulls i qualsevol canvi «discret» són immediats
          if (t.eyeL !== undefined) pose.eyeL = t.eyeL;
          if (t.eyeR !== undefined) pose.eyeR = t.eyeR;
          emit(lastSent === null);
          // gir i boca avancen per trams fins arribar a l'objectiu
          let guard = 0;
          while (my === runId && ((t.yaw !== undefined && Math.abs(pose.yaw - t.yaw) > 1e-3) || (t.mouth !== undefined && Math.abs(pose.mouth - t.mouth) > 1e-3))) {
            const dt = tick();
            await sleep(dt);
            if (my !== runId) return 'stopped';
            if (t.yaw !== undefined) { const d = YAW_SPEED * dt / 1000; pose.yaw = Math.abs(t.yaw - pose.yaw) <= d ? t.yaw : pose.yaw + Math.sign(t.yaw - pose.yaw) * d; }
            if (t.mouth !== undefined) { const d = MOUTH_SPEED * dt / 1000; pose.mouth = Math.abs(t.mouth - pose.mouth) <= d ? t.mouth : pose.mouth + Math.sign(t.mouth - pose.mouth) * d; }
            emit();
            if (++guard > 400) break;
          }
          if (my !== runId) return 'stopped';
          await sleep(Math.max(0, s.ms || 0));
        }
        return 'done';
      } finally {
        if (my === runId) { busy = false; if (opt.onState) opt.onState('idle'); }
      }
    }

    function stop() { runId++; busy = false; if (wake) wake(); if (opt.onState) opt.onState('idle'); }
    // Col·loca el cap en una pose (sense animació) i la envia
    function setPose(p, force) { Object.assign(pose, p); emit(!!force); }

    return { play, stop, setPose, resend: () => emit(true), get pose() { return Object.assign({}, pose); }, get busy() { return busy; }, get last() { return lastSent; } };
  }
  root.JVeuPlayer = { create };
})(typeof window !== 'undefined' ? window : globalThis);
