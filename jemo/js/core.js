// ============================================================
//  core.js – JEmo (emocions de la cara)
//  Lògica pura (sense càmera ni DOM): emocions, suavitzat i format del missatge.
//  Es pot provar sola; el que ve de la càmera li arriba des de vision.js.
//
//  Protocol cap a la micro:bit (text, una línia per missatge):
//     E<n>[:<força>]   emoció   (n = 0..6, o 9 = no es veu cap cara)
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
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const emoCode = (id) => 'E' + id;

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
  // ── Format del missatge ───────────────────────────────────
  // custom: { E1:"alegre" } → si hi ha text propi s'envia tal qual.
  function formatLine(id, strengthPct, o) {
    o = o || {};
    const code = emoCode(id);
    const custom = o.codes && typeof o.codes[code] === 'string' ? o.codes[code].trim() : '';
    if (custom) return custom.slice(0, 40);
    const withStrength = o.intensity && id !== NOFACE;
    return withStrength ? code + ':' + Math.max(0, Math.min(100, Math.round(strengthPct))) : code;
  }

  // ── Decideix quan enviar (en canviar / continu) ───────────
  function makeSender(send) {
    let last = null, lastT = 0;
    return {
      reset() { last = null; lastT = 0; },
      // state: { E:{id,pct}|null } ; cfg: { mode:'change'|'continuous', periodMs, intensity, codes }
      tick(state, cfg, t) {
        t = t === undefined ? Date.now() : t;
        const s = state && state.E; if (!s || s.id === null || s.id === undefined) return;
        const changed = last !== s.id;
        const due = cfg.mode === 'continuous' && t - lastT >= cfg.periodMs;
        if (changed || due) {
          const line = formatLine(s.id, s.pct, cfg);
          last = s.id; lastT = t;
          send(line, s.id, changed);
        }
      },
      resend(state, cfg, t) { last = null; this.tick(state, cfg, t); }
    };
  }

  root.JEmo = {
    EMOTIONS, NOFACE, emoCode,
    scoresFromFaceApi, faceFeatures, scoresFromFeatures, averageFeatures, DEFAULT_BASE,
    makeSmoother, formatLine, makeSender
  };
})(typeof window !== 'undefined' ? window : globalThis);
