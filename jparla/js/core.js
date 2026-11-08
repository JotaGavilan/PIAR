// ============================================================
//  core.js – JParla (robot que parla): lògica pura, sense DOM
//
//  text  →  parseScript()  →  [{ say:'…' } | { cmd:'blink' }, …]
//  frase →  timeline()     →  paraules i síl·labes amb el seu instant (per a moure la boca)
//  pose  →  toPacket()     →  «yyMMEE» de 6 dígits (mateix format que JFace i JVeu)
//
//  JParla.syllables(word, lang)        → { n, levels:[0..1,…] }   (levels = obertura de la boca de cada síl·laba)
//  JParla.parseScript(text)            → { items, unknown:[…] }
//  JParla.chunkSay(text, max)          → [trossos ≤ max caràcters, tallats en frases/comes]
//  JParla.timeline(text, lang, o)      → { words, sylls, total }    o = { rate, k, gap, mouthRate }
//  JParla.mouthAt(tl, t)               → 0…1   ·   JParla.wordAt(tl, t) → índex de paraula
//  JParla.commandSteps(id)             → passos { yaw, mouth, eyeL, eyeR, ms } d'una ordre [entre claudàtors]
//  JParla.toPacket(pose, cal)          → «yyMMEE»
//  JParla.sanitizeReply(text)          → text net per a parlar (sense Markdown, emojis ni ordres desconegudes)
// ============================================================
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ───────────── Síl·labes ─────────────
  const STRONG = 'aeoàáèéòóíú', WEAK = 'iuïü';
  const VOWELS = STRONG + WEAK;
  const isV = (c) => VOWELS.indexOf(c) >= 0;
  const OPEN = { a: 1, à: 1, á: 1, e: .75, è: .75, é: .75, o: .75, ò: .75, ó: .75, í: .5, i: .5, ï: .5, u: .5, ú: .5, ü: .5 };

  function sylRomance(w, lang) {
    // «qu»/«gu» davant de e/i: la u no sona (que, qui, gue, gui). «gü»/«qü» sí que sona.
    w = w.replace(/(q|g)u(?=[eiéèíê])/g, '$1');
    const levels = [];
    let i = 0;
    while (i < w.length) {
      if (!isV(w[i])) { i++; continue; }
      let lv = OPEN[w[i]] || .6;
      i++;
      while (i < w.length && isV(w[i])) {
        const a = w[i - 1], b = w[i];
        const aStrong = STRONG.indexOf(a) >= 0, bStrong = STRONG.indexOf(b) >= 0;
        // hiat: dues fortes, una feble tònica (í, ú) o una «ï» (aïllar, ruïna) → nou nucli
        const caIo = lang === 'ca' && a === 'i' && 'óòàéè'.indexOf(b) >= 0;   // estació, qüestió: es-ta-ci-ó
        const split = (aStrong && bStrong) || a === 'í' || a === 'ú' || b === 'í' || b === 'ú' || b === 'ï' || caIo;
        if (split) { levels.push(lv); lv = OPEN[b] || .6; } else lv = Math.max(lv, OPEN[b] || .6);
        i++;
      }
      levels.push(lv);
    }
    return levels;
  }

  function sylEnglish(w) {
    const groups = w.match(/[aeiouy]+/g) || [];
    let n = groups.length;
    if (n > 1 && /[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) n--;           // «make», «like»
    if (n > 1 && /[^aeiouytd]ed$/.test(w)) n--;                                      // «played»
    if (n > 1 && /[^aeiouyszxhc]es$/.test(w)) n--;                                   // «makes»
    n = Math.max(1, n);
    const lv = { a: 1, o: .85, e: .7, i: .55, y: .55, u: .6 };
    const levels = [];
    for (let k = 0; k < n; k++) { const g = groups[k] || 'a'; levels.push(lv[g[0]] || .7); }
    return levels;
  }

  function syllables(word, lang) {
    let w = String(word || '').toLowerCase().replace(/[’']/g, '').replace(/[·.]/g, '');
    if (/^\d+$/.test(w)) {                                   // un número: es pronuncia amb unes quantes síl·labes
      const n = clamp(1 + Math.ceil(w.length * 1.3), 2, 12);
      return { n, levels: Array.from({ length: n }, (_, k) => (k % 2 ? .6 : .85)) };
    }
    const hasLetter = /\p{L}/u.test(w);
    if (!hasLetter) return { n: 0, levels: [] };
    let levels = lang === 'en' ? sylEnglish(w) : sylRomance(w, lang);
    if (!levels.length) levels = [.55];                      // sigles o paraules sense vocals («bcd»): una obertura mitjana
    return { n: levels.length, levels };
  }

  // ───────────── Text amb ordres [entre claudàtors] ─────────────
  // Cada ordre té un identificador (anglés) i àlies en valencià, castellà i anglés.
  const ALIASES = {
    blink: ['blink', 'parpelleja', 'parpella', 'parpadea', 'parpadeo'],
    wink_left: ['wink_left', 'winkleft', 'guinya_esquerra', 'guinyaesquerra', 'guiña_izquierda', 'guiñaizquierda', 'guina_izquierda'],
    wink_right: ['wink_right', 'winkright', 'guinya_dreta', 'guinyadreta', 'guiña_derecha', 'guiñaderecha', 'guina_derecha'],
    left: ['left', 'look_left', 'esquerra', 'mira_esquerra', 'izquierda', 'mira_izquierda'],
    right: ['right', 'look_right', 'dreta', 'mira_dreta', 'derecha', 'mira_derecha'],
    center: ['center', 'centre', 'centro', 'look_center', 'front', 'frente'],
    no: ['no', 'shake', 'shake_no', 'negar', 'nega', 'nega_amb_el_cap'],
    surprise: ['surprise', 'sorpresa', 'sorprés', 'sorpres', 'sorprendido'],
    sleep: ['sleep', 'dorm', 'duerme', 'dormir'],
    wake: ['wake', 'desperta', 'despierta', 'wake_up'],
    laugh: ['laugh', 'riu', 'risa', 'ri', 'reir', 'riure'],
    think: ['think', 'pensa', 'piensa', 'pensar'],
    pause: ['pause', 'pausa', 'wait', 'espera']
  };
  const ALIAS_MAP = {};
  Object.keys(ALIASES).forEach((id) => ALIASES[id].forEach((a) => { ALIAS_MAP[a] = id; }));
  const normCmd = (s) => String(s).toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');
  const CMD_IDS = Object.keys(ALIASES);

  function parseScript(text) {
    text = String(text == null ? '' : text);
    const items = [], unknown = [];
    const re = /\[([^\[\]]{1,40})\]/g;
    let last = 0, m;
    const pushSay = (s) => { s = s.replace(/\s+/g, ' ').trim(); if (/[\p{L}\p{N}]/u.test(s)) items.push({ say: s }); };
    while ((m = re.exec(text))) {
      pushSay(text.slice(last, m.index));
      const id = ALIAS_MAP[normCmd(m[1])];
      if (id) items.push({ cmd: id }); else unknown.push(m[1].trim());
      last = m.index + m[0].length;
    }
    pushSay(text.slice(last));
    return { items, unknown };
  }

  // Trossos curts: Chrome en Android talla les frases molt llargues, i així les ordres queden ben col·locades.
  function chunkSay(text, max) {
    max = max || 140;
    const parts = String(text).match(/[^.!?…;:\n]+[.!?…;:]*\s*/g) || [String(text)];
    const out = [];
    let cur = '';
    const flush = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
    parts.forEach((p) => {
      if (p.length > max) {                                  // frase molt llarga: es talla per comes o per paraules
        flush();
        let piece = '';
        p.split(/(?<=[,])\s+|\s+/).forEach((w) => { if ((piece + ' ' + w).length > max && piece) { out.push(piece.trim()); piece = w; } else piece += (piece ? ' ' : '') + w; });
        if (piece.trim()) out.push(piece.trim());
      } else if ((cur + p).length > max) { flush(); cur = p; } else cur += p;
    });
    flush();
    return out;
  }

  // ───────────── Línia de temps de la boca ─────────────
  // Durada aproximada d'una síl·laba a velocitat 1 (s). «k» és el factor que l'app aprèn de la veu real; «mouthRate» és el
  // control lliscant de l'usuari (1 = normal; > 1 = la boca va més ràpida).
  const SYL_DUR = { ca: 0.2, es: 0.19, en: 0.21 };
  const PAUSE = { ',': 0.22, ';': 0.3, ':': 0.3, '.': 0.42, '!': 0.42, '?': 0.42, '…': 0.5, '\n': 0.3 };

  function timeline(text, lang, o) {
    o = o || {};
    const rate = clamp(o.rate || 1, 0.3, 3), k = clamp(o.k || 1, 0.3, 3), mr = clamp(o.mouthRate || 1, 0.4, 2.5), gap = o.gap || 0;
    const sylDur = (SYL_DUR[lang] || 0.2) / (rate * k * mr);
    const words = [], sylls = [];
    const re = /[\p{L}\p{N}]+(?:['’·][\p{L}\p{N}]+)*|[,;:.!?…\n]+/gu;
    let m, t = 0.05;
    while ((m = re.exec(text))) {
      const tok = m[0];
      if (/^[,;:.!?…\n]+$/.test(tok)) {                      // signe de puntuació → pausa (el de més pes del grup)
        const p = Math.max.apply(null, tok.split('').map((c) => PAUSE[c] || 0));
        t += p / Math.max(0.5, rate);
        continue;
      }
      const sy = syllables(tok, lang);
      if (!sy.n) continue;
      const w = { i: words.length, text: tok, char: m.index, t, dur: sy.n * sylDur, n: sy.n };
      words.push(w);
      for (let s = 0; s < sy.n; s++) {
        const st = t + s * sylDur;
        const open = Math.max(0.05, sylDur * 0.58);
        sylls.push({ t: st, open, level: sy.levels[s], w: w.i });
      }
      t += sy.n * sylDur + 0.03 + gap;
    }
    const first = words[0], lastW = words[words.length - 1];
    return { words, sylls, total: t, sylDur, speechStart: first ? first.t : 0, speechEnd: lastW ? lastW.t + lastW.dur : 0 };
  }

  // Obertura de la boca (0…1) en l'instant t (s des de l'inici del tros). Cerca binària.
  // «floor» (0…0.6): entre dues síl·labes de la MATEIXA paraula la boca no es tanca del tot, només baixa fins a floor·nivell
  // (el servo recorre menys i la boca queda més definida); en acabar la paraula o en una pausa sí que es tanca.
  function mouthAt(tl, t, floor) {
    const S = tl.sylls; if (!S.length || t < S[0].t) return 0;
    let a = 0, b = S.length - 1;
    while (a < b) { const mid = (a + b + 1) >> 1; if (S[mid].t <= t) a = mid; else b = mid - 1; }
    const s = S[a];
    if (t < s.t + s.open) return s.level;
    const nx = S[a + 1];
    return floor > 0 && nx && nx.w === s.w ? Math.min(s.level, nx.level) * clamp(floor, 0, 0.6) : 0;
  }
  function wordAt(tl, t) {
    const W = tl.words; if (!W.length || t < W[0].t) return -1;
    let a = 0, b = W.length - 1;
    while (a < b) { const mid = (a + b + 1) >> 1; if (W[mid].t <= t) a = mid; else b = mid - 1; }
    return a;
  }
  // Índex de la paraula que conté un caràcter (per als esdeveniments «boundary» del navegador)
  function wordAtChar(tl, ch) {
    let r = -1;
    for (let i = 0; i < tl.words.length; i++) { if (tl.words[i].char <= ch) r = i; else break; }
    return r;
  }

  // ───────────── Ordres → passos ─────────────
  // yaw: −1…1 (positiu = esquerra), mouth 0…1, eyeL/eyeR 0|1, ms = temps que es manté la pose
  const O = (o) => Object.assign({ ms: 250 }, o);
  function commandSteps(id) {
    switch (id) {
      case 'blink': return [O({ eyeL: 0, eyeR: 0, ms: 160 }), O({ eyeL: 1, eyeR: 1, ms: 120 })];
      case 'wink_left': return [O({ eyeL: 0, ms: 300 }), O({ eyeL: 1, ms: 150 })];
      case 'wink_right': return [O({ eyeR: 0, ms: 300 }), O({ eyeR: 1, ms: 150 })];
      case 'left': return [O({ yaw: 0.8, ms: 700 })];
      case 'right': return [O({ yaw: -0.8, ms: 700 })];
      case 'center': return [O({ yaw: 0, ms: 300 })];
      case 'no': return [O({ yaw: 0.6, ms: 90 }), O({ yaw: -0.6, ms: 90 }), O({ yaw: 0.6, ms: 90 }), O({ yaw: -0.6, ms: 90 }), O({ yaw: 0, ms: 200 })];
      case 'surprise': return [O({ eyeL: 1, eyeR: 1, mouth: 0.9, ms: 900 }), O({ mouth: 0, ms: 150 })];
      case 'sleep': return [O({ mouth: 0, eyeL: 0, eyeR: 0, yaw: 0, ms: 1200 })];
      case 'wake': return [O({ eyeL: 1, eyeR: 1, ms: 300 })];
      case 'laugh': return [O({ mouth: 0.8, ms: 110 }), O({ mouth: 0.15, ms: 110 }), O({ mouth: 0.8, ms: 110 }), O({ mouth: 0.15, ms: 110 }), O({ mouth: 0.8, ms: 110 }), O({ mouth: 0, ms: 150 })];
      case 'think': return [O({ yaw: 0.55, eyeL: 1, eyeR: 1, ms: 900 }), O({ yaw: 0, ms: 150 })];
      case 'pause': return [O({ ms: 700 })];
      default: return [];
    }
  }

  // ───────────── Paquet «yyMMEE» ─────────────
  const DEF_CAL = { yawC: 15, yawHalf: 10, mouthMax: 10, invert: false };   // mouthMax 10: el programa «Cap amb IA» (i JFace) només accepta boca 0…10
  const NEUTRAL = { yaw: 0, mouth: 0, eyeL: 1, eyeR: 1 };
  function toPacket(p, cal) {
    cal = Object.assign({}, DEF_CAL, cal || {});
    const sgn = cal.invert ? -1 : 1;
    const yaw = clamp(Math.round(cal.yawC + sgn * clamp(p.yaw, -1, 1) * cal.yawHalf), 0, 99);
    const mouth = clamp(Math.round(clamp(p.mouth, 0, 1) * cal.mouthMax), 0, 99);
    return String(yaw).padStart(2, '0') + String(mouth).padStart(2, '0') + (p.eyeL ? 1 : 0) + (p.eyeR ? 1 : 0);
  }

  // ───────────── Neteja de la resposta de la IA ─────────────
  // Treu Markdown, emojis, adreces web i ordres que no existisquen; deixa com a màxim 6 ordres i 600 caràcters.
  function sanitizeReply(text) {
    let s = String(text == null ? '' : text);
    s = s.replace(/```[\s\S]*?```/g, ' ').replace(/https?:\/\/\S+/g, ' ');
    s = s.replace(/[*_#`>~|]+/g, ' ').replace(/^\s*[-•]\s+/gm, '');
    s = s.replace(/[\p{Extended_Pictographic}️‍]/gu, '');
    let cmds = 0;
    s = s.replace(/\[([^\[\]]{1,40})\]/g, (all, name) => (ALIAS_MAP[normCmd(name)] && ++cmds <= 6 ? '[' + ALIAS_MAP[normCmd(name)] + ']' : ' '));
    s = s.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
    return s.slice(0, 600);
  }

  const API = { syllables, parseScript, chunkSay, timeline, mouthAt, wordAt, wordAtChar, commandSteps, toPacket, sanitizeReply, CMD_IDS, ALIASES, DEF_CAL, NEUTRAL, SYL_DUR };
  root.JParla = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
