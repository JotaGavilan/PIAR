// ============================================================
//  core.js – JEmo (cara i cos amb emoció)
//  Lògica pura (sense càmera ni DOM): emocions, gestos del cos, suavitzat i format del missatge.
//  Es pot provar sola; el que ve de la càmera li arriba des de vision.js.
//
//  Protocol cap a la micro:bit (text, una línia per missatge):
//     E<n>[:<força>]   emoció   (n = 0..6, o 9 = no es veu cap cara)
//     G<n>[:<força>]   gest     (n = 0..6; 0 = cap gest)
//  La «força» és un percentatge 0–100. Cada codi es pot canviar a Configuració.
// ============================================================
(function (root) {
  'use strict';

  // ── Emocions (les 7 d'Ekman) ──────────────────────────────
  // faceapi: neutral, happy, sad, angry, fearful, disgusted, surprised
  const EMOTIONS = [
    { id: 0, key: 'neutral',   fa: 'neutral',   emoji: '😐' },
    { id: 1, key: 'happy',     fa: 'happy',     emoji: '😀' },
    { id: 2, key: 'sad',       fa: 'sad',       emoji: '😢' },
    { id: 3, key: 'angry',     fa: 'angry',     emoji: '😠' },
    { id: 4, key: 'surprised', fa: 'surprised', emoji: '😮' },
    { id: 5, key: 'fearful',   fa: 'fearful',   emoji: '😨' },
    { id: 6, key: 'disgusted', fa: 'disgusted', emoji: '🤢' }
  ];
  const NOFACE = 9;     // E9: no es veu cap cara
  // ── Gestos del cos ────────────────────────────────────────
  const GESTURES = [
    { id: 0, key: 'none',    emoji: '🧍' },
    { id: 1, key: 'armsup',  emoji: '🙌' },
    { id: 2, key: 'wave',    emoji: '👋' },
    { id: 3, key: 'crossed', emoji: '🙅' },
    { id: 4, key: 'face',    emoji: '🤦' },
    { id: 5, key: 'tilt',    emoji: '🤔' },
    { id: 6, key: 'slouch',  emoji: '🫠' }
  ];
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const emoCode = (id) => 'E' + id;
  const gesCode = (id) => 'G' + id;

  // ── Emocions a partir de la xarxa (face-api) ──────────────
  function scoresFromFaceApi(expr) {
    return EMOTIONS.map((e) => Number(expr && expr[e.fa]) || 0);
  }

  // ── Emocions a partir dels punts de la cara (MediaPipe) ───
  // Regles geomètriques; funcionen millor si es calibra la cara neutra de la persona.
  const DEFAULT_BASE = { mouthOpen: .02, mouthWidth: .40, smileLift: .0, browRaise: .085, browInner: .27, browInnerRaise: .06, eyeOpen: .27, noseLip: .12, lipThick: .075 };
  function faceFeatures(lm, W, H) {
    W = W || 1; H = H || 1;
    const P = (i) => ({ x: lm[i].x * W, y: lm[i].y * H });
    const d = (a, b) => Math.hypot(P(a).x - P(b).x, P(a).y - P(b).y);
    const fw = d(234, 454) || 1, fh = d(10, 152) || 1;
    const y = (i) => lm[i].y * H;
    const midY = (a, b) => (y(a) + y(b)) / 2;
    const ear = (top1, top2, bot1, bot2, c1, c2) => {
      const t = { x: (P(top1).x + P(top2).x) / 2, y: (P(top1).y + P(top2).y) / 2 };
      const b = { x: (P(bot1).x + P(bot2).x) / 2, y: (P(bot1).y + P(bot2).y) / 2 };
      return Math.hypot(t.x - b.x, t.y - b.y) / (d(c1, c2) || 1);
    };
    return {
      mouthOpen: d(13, 14) / fh,
      mouthWidth: d(61, 291) / fw,
      smileLift: (midY(13, 14) - midY(61, 291)) / fh,
      browRaise: ((y(159) - y(105)) + (y(386) - y(334))) / 2 / fh,
      browInner: d(107, 336) / fw,
      browInnerRaise: ((y(133) - y(107)) + (y(362) - y(336))) / 2 / fh,
      eyeOpen: (ear(159, 160, 145, 144, 130, 243) + ear(386, 387, 374, 373, 359, 463)) / 2,
      noseLip: d(2, 0) / fh,
      lipThick: (d(0, 13) + d(14, 17)) / fh,
      eyeL: ear(159, 160, 145, 144, 130, 243), eyeR: ear(386, 387, 374, 373, 359, 463)
    };
  }
  function scoresFromFeatures(f, base) {
    const b = Object.assign({}, DEFAULT_BASE, base || {});
    const c = (v, k) => clamp01(v / k);
    const happy = c(f.smileLift - b.smileLift, .035) * .65 + c(f.mouthWidth - b.mouthWidth, .07) * .35;
    const surprised = c(f.mouthOpen - b.mouthOpen, .12) * .45 + c(f.browRaise - b.browRaise, .04) * .35 + c(f.eyeOpen - b.eyeOpen, .06) * .2;
    const sad = c(b.smileLift - f.smileLift, .03) * .55 + c(f.browInnerRaise - b.browInnerRaise, .03) * .45;
    const angry = c(b.browInner - f.browInner, .04) * .4 + c(b.browRaise - f.browRaise, .03) * .4 + c(b.lipThick - f.lipThick, .02) * .2;
    const fearful = c(f.browRaise - b.browRaise, .03) * .3 + c(b.browInner - f.browInner, .03) * .25 + c(f.eyeOpen - b.eyeOpen, .05) * .2
      + c(f.mouthWidth - b.mouthWidth, .06) * .25 * (1 - c(f.smileLift - b.smileLift, .03));
    const disgusted = c(b.noseLip - f.noseLip, .025) * .55 + c(b.browRaise - f.browRaise, .03) * .2 + c(b.mouthWidth - f.mouthWidth, .05) * .25;
    const raw = [0.3, happy, sad, angry, surprised, Math.max(0, fearful - surprised * .4), Math.max(0, disgusted - happy * .6)];
    const ex = raw.map((v) => Math.exp(5 * v)), sum = ex.reduce((a, v) => a + v, 0);
    return ex.map((v) => v / sum);
  }
  function averageFeatures(list) {
    if (!list.length) return null;
    const out = {};
    Object.keys(list[0]).forEach((k) => { out[k] = list.reduce((a, f) => a + f[k], 0) / list.length; });
    return out;
  }

  // ── Reforç de l'emoció amb el cos (suau) ──────────────────
  // El cos suma una mica a l'emoció que «encaixa»; mai la decideix ell sol.
  const BOOST = {
    1: { 1: .20, 4: .08 },     // braços amunt → alegria (i un poc de sorpresa)
    2: { 1: .20, 4: .08 },     // saludar → alegria
    3: { 3: .18 },             // braços creuats → enuig
    4: { 5: .15, 4: .15, 2: .05 },   // mans a la cara → por / sorpresa
    6: { 2: .25 }              // d'esquenes caiguts → tristesa
  };
  function reinforce(scores, gestureId, strength) {
    const add = BOOST[gestureId];
    if (!add) return { scores, boosted: false };
    const k = strength === undefined ? 1 : strength;
    const out = scores.slice();
    Object.keys(add).forEach((e) => { out[e] += add[e] * k; });
    if (gestureId === 6) out[0] = Math.max(0, out[0] - .1);
    const sum = out.reduce((a, v) => a + v, 0) || 1;
    return { scores: out.map((v) => v / sum), boosted: true };
  }

  // ── Gestos del cos (PoseNet, 17 punts) ────────────────────
  // kp: { nose:{x,y,s}, leftEye, rightEye, leftEar, rightEar, leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist }
  const MINS = .3;
  function kpMap(arr) {
    const m = {};
    (arr || []).forEach((k) => { m[k.part] = { x: k.position.x, y: k.position.y, s: k.score }; });
    return m;
  }
  const ok = (p) => p && p.s >= MINS;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function headPoint(k) {
    const pts = ['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar'].map((n) => k[n]).filter(ok);
    if (!pts.length) return null;
    return { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
  }
  function posture(k) {   // alçada del cap sobre les espatlles, en amples d'espatlla
    const ls = k.leftShoulder, rs = k.rightShoulder, h = headPoint(k);
    if (!ok(ls) || !ok(rs) || !h) return null;
    const sw = dist(ls, rs); if (sw < 1) return null;
    return ((ls.y + rs.y) / 2 - h.y) / sw;
  }
  function tiltAngle(k) {   // graus (−90..90); 0 = cap dret
    let a = k.leftEar, b = k.rightEar;
    if (!ok(a) || !ok(b)) { a = k.leftEye; b = k.rightEye; }
    if (!ok(a) || !ok(b)) return null;
    const p1 = a.x <= b.x ? a : b, p2 = a.x <= b.x ? b : a;
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
  }
  function makePoseState() { return { hist: { left: [], right: [] } }; }
  function isWaving(hist, t, sw) {
    const win = hist.filter((h) => t - h.t <= 1500);
    if (win.length < 4) return false;
    let min = Infinity, max = -Infinity, rev = 0, last = 0;
    for (let i = 0; i < win.length; i++) {
      min = Math.min(min, win[i].x); max = Math.max(max, win[i].x);
      if (i) {
        const dx = win[i].x - win[i - 1].x;
        if (Math.abs(dx) > .06 * sw) { const s = Math.sign(dx); if (last && s !== last) rev++; last = s; }
      }
    }
    return (max - min) >= .35 * sw && rev >= 2;
  }
  // Retorna { id, conf, info, visible } ; opts: { baseline:{posture}, tiltDeg, t }
  function classifyPose(kpArr, state, opts) {
    opts = opts || {};
    const t = opts.t === undefined ? Date.now() : opts.t;
    const k = Array.isArray(kpArr) ? kpMap(kpArr) : kpArr;
    const res = { id: 0, conf: 0, info: {}, visible: false };
    const ls = k.leftShoulder, rs = k.rightShoulder;
    const hasSh = ok(ls) && ok(rs);
    const h = headPoint(k);
    if (!hasSh || !h) return res;           // sense espatlles + cap no hi ha cos que llegir
    const sw = dist(ls, rs); if (sw < 8) return res;
    res.visible = true;
    const shY = (ls.y + rs.y) / 2, midX = (ls.x + rs.x) / 2;
    const eyeY = ok(k.leftEye) && ok(k.rightEye) ? (k.leftEye.y + k.rightEye.y) / 2 : h.y;
    const nose = ok(k.nose) ? k.nose : h;
    const W = { left: k.leftWrist, right: k.rightWrist };
    const wrists = [];
    ['left', 'right'].forEach((side) => {
      const w = W[side];
      if (ok(w)) {
        wrists.push(Object.assign({ side }, w));
        const hs = state.hist[side]; hs.push({ t, x: w.x }); while (hs.length && t - hs[0].t > 2500) hs.shift();
      } else state.hist[side].length = 0;
    });
    const sc = (...ps) => Math.round(100 * Math.min(...ps.map((p) => (p ? p.s : 1))));
    // 4 · mans a la cara / al cap
    const onFace = wrists.filter((w) => dist(w, nose) < .75 * sw && w.y > eyeY - .85 * sw);
    if (onFace.length) { res.id = 4; res.conf = sc(onFace[0]); res.info.n = onFace.length; return res; }
    // 3 · braços creuats: cada canell passat cap a l'altra banda del cos, a la height del pit
    if (ok(k.leftWrist) && ok(k.rightWrist)) {
      const sgn = Math.sign(ls.x - midX) || 1;     // banda de l'espatlla «left» respecte al centre
      const lx = (k.leftWrist.x - midX) * sgn, rx = (k.rightWrist.x - midX) * sgn;
      const crossed = lx < -.05 * sw && rx > .05 * sw;   // cada canell a la banda de l'altra espatlla
      const lowOk = [k.leftWrist, k.rightWrist].every((w) => w.y > shY - .25 * sw && w.y < shY + 1.5 * sw && Math.abs(w.x - midX) < .95 * sw);
      if (crossed && lowOk) { res.id = 3; res.conf = sc(k.leftWrist, k.rightWrist); return res; }
    }
    // 2 · saludar: canell per damunt de l'espatlla movent-se a un costat i a l'altre
    for (const w of wrists) {
      if (w.y < shY - .1 * sw && isWaving(state.hist[w.side], t, sw)) { res.id = 2; res.conf = sc(w); res.info.side = w.side; return res; }
    }
    // 1 · braços amunt: algun canell clarament per damunt del cap
    const up = wrists.filter((w) => w.y < eyeY - .6 * sw);
    if (up.length) { res.id = 1; res.conf = sc(up[0]); res.info.n = up.length; return res; }
    // 6 · d'esquenes caiguts
    const p = posture(k);
    res.info.posture = p;
    const thr = opts.baseline && opts.baseline.posture ? opts.baseline.posture * .75 : .62;
    if (p !== null && p < thr) { res.id = 6; res.conf = clamp01((thr - p) / .25 + .5) * 100 | 0; return res; }
    // 5 · cap inclinat
    const ang = tiltAngle(k);
    res.info.tilt = ang;
    const tdeg = opts.tiltDeg || 15;
    if (ang !== null && Math.abs(ang) >= tdeg) { res.id = 5; res.conf = Math.round(100 * clamp01(.5 + (Math.abs(ang) - tdeg) / 30)); res.info.side = ang > 0 ? 'right' : 'left'; return res; }
    res.conf = 100;
    return res;
  }

  // ── Suavitzat: evita que la lectura «parpelleje» entre categories ──
  // Cada fotograma aporta un vector de puntuacions; es fa una mitjana mòbil i només es canvia de categoria
  // quan la nova guanyadora es manté «holdMs» i supera la confiança mínima.
  function makeSmoother(n, opt) {
    opt = Object.assign({ alpha: .35, holdMs: 600, minConf: .4, initial: 0 }, opt || {});
    let ema = new Array(n).fill(0); ema[opt.initial] = 1;
    let cur = null, cand = null, candSince = 0;
    return {
      get current() { return cur; },
      get scores() { return ema.slice(); },
      reset() { ema = new Array(n).fill(0); ema[opt.initial] = 1; cur = null; cand = null; },
      setOptions(o) { Object.assign(opt, o); },
      push(scores, t) {
        t = t === undefined ? Date.now() : t;
        const first = cur === null;
        for (let i = 0; i < n; i++) ema[i] = first ? (scores[i] || 0) : ema[i] + opt.alpha * ((scores[i] || 0) - ema[i]);
        let top = 0; for (let i = 1; i < n; i++) if (ema[i] > ema[top]) top = i;
        if (first) { cur = top; cand = null; }
        else if (top !== cur && ema[top] >= opt.minConf) {
          if (cand !== top) { cand = top; candSince = t; }
          if (t - candSince >= opt.holdMs) { cur = top; cand = null; }
        } else cand = null;
        return { current: cur, top, conf: ema[cur] };
      }
    };
  }
  // Suavitzat d'una etiqueta discreta (gestos): la guanya la que es manté «holdMs»
  function makeLabelHold(opt) {
    opt = Object.assign({ holdMs: 400, initial: 0 }, opt || {});
    let cur = null, cand = null, since = 0, lastConf = 0;
    return {
      get current() { return cur; },
      setOptions(o) { Object.assign(opt, o); },
      reset() { cur = null; cand = null; },
      push(id, conf, t) {
        t = t === undefined ? Date.now() : t;
        if (cur === null && cand === null) { cand = id; since = t; }
        if (id === cur) { cand = null; lastConf = conf; return { current: cur, conf: lastConf }; }
        if (id !== cand) { cand = id; since = t; }
        if (t - since >= opt.holdMs) { cur = id; cand = null; lastConf = conf; }
        return { current: cur, conf: lastConf };
      }
    };
  }

  // ── Format del missatge ───────────────────────────────────
  // custom: { E1:"alegre", G2:"hola" } → si hi ha text propi s'envia tal qual.
  function formatLine(kind, id, strengthPct, o) {
    o = o || {};
    const code = (kind === 'E' ? emoCode : gesCode)(id);
    const custom = o.codes && typeof o.codes[code] === 'string' ? o.codes[code].trim() : '';
    if (custom) return custom.slice(0, 40);
    const withStrength = o.intensity && !(kind === 'E' && id === NOFACE) && !(kind === 'G' && id === 0);
    return withStrength ? code + ':' + Math.max(0, Math.min(100, Math.round(strengthPct))) : code;
  }

  // ── Decideix quan enviar (en canviar / continu) ───────────
  function makeSender(send) {
    let last = { E: null, G: null }, lastT = { E: 0, G: 0 };
    return {
      reset() { last = { E: null, G: null }; lastT = { E: 0, G: 0 }; },
      // state: { E:{id,pct}|null, G:{id,pct}|null } ; cfg: { mode:'change'|'continuous', periodMs, intensity, codes }
      tick(state, cfg, t) {
        t = t === undefined ? Date.now() : t;
        ['E', 'G'].forEach((kind) => {
          const s = state[kind]; if (!s || s.id === null || s.id === undefined) return;
          const changed = last[kind] !== s.id;
          const due = cfg.mode === 'continuous' && t - lastT[kind] >= cfg.periodMs;
          if (changed || due) {
            const line = formatLine(kind, s.id, s.pct, cfg);
            last[kind] = s.id; lastT[kind] = t;
            send(line, kind, s.id, changed);
          }
        });
      },
      resend(state, cfg, t) { last = { E: null, G: null }; this.tick(state, cfg, t); }
    };
  }

  root.JEmo = {
    EMOTIONS, GESTURES, NOFACE, emoCode, gesCode,
    scoresFromFaceApi, faceFeatures, scoresFromFeatures, averageFeatures, DEFAULT_BASE,
    reinforce, BOOST, kpMap, classifyPose, makePoseState, posture, tiltAngle,
    makeSmoother, makeLabelHold, formatLine, makeSender
  };
})(typeof window !== 'undefined' ? window : globalThis);
