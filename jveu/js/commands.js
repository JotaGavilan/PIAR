// ============================================================
//  commands.js – Intèrpret d'ordres (valencià, castellà i anglés) per a JVeu
//
//  JVeu.parse(text)  →  {
//      ok:        true si s'ha entés alguna cosa,
//      stop:      true si l'ordre és «para / stop»,
//      steps:     [{ yaw?, dyaw?, mouth?, dmouth?, eyeL?, eyeR?, ms, tag? }],
//      notes:     ['no_vertical', …]   avisos sobre coses que esta cap no pot fer,
//      norm:      text normalitzat (per a depurar)
//  }
//  Valors NORMALITZATS (no depenen de la calibració del muñeco):
//      yaw   −1 … +1   (0 = de cara; +1 = tot a l'ESQUERRA del cap; −1 = tot a la DRETA del cap)
//      mouth  0 … 1    (0 = tancada; 1 = molt oberta)
//      eyeL / eyeR     0 = tancat, 1 = obert
//      ms              pausa després d'arribar a l'objectiu
//  JVeu.sanitize(steps) valida i limita passos de qualsevol origen (p. ex. Gemini).
//  JVeu.toPacket(pose, cal) → «yyMMEE» de 6 dígits (mateix format que JFace).
//
//  Entén les tres llengües alhora (no cal triar-ne una). Funciona també en Node (proves).
// ============================================================
(function (root) {
  'use strict';

  // ── Normalització ──────────────────────────────────────────
  function norm(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ç/g, 'c').replace(/·/g, '').replace(/[’‘`´]/g, "'")
      .replace(/\s*%\s*|\s+(?:por ciento|por cien|per cent|per cent|percent|per cent)(?=\s|$)/g, ' % ')
      .replace(/[¿¡?!"]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  // ── Nombres escrits amb lletres (fins a 100) ─────────────────
  const UNITS = {
    zero: 0, cero: 0, un: 1, uno: 1, una: 1, u: 1, one: 1, dos: 2, dues: 2, two: 2, tres: 3, three: 3, quatre: 4, cuatro: 4, four: 4,
    cinc: 5, cinco: 5, five: 5, sis: 6, seis: 6, six: 6, set: 7, siete: 7, seven: 7, vuit: 8, ocho: 8, eight: 8, nou: 9, nueve: 9, nine: 9,
    deu: 10, diez: 10, ten: 10, onze: 11, once: 11, eleven: 11, dotze: 12, doce: 12, twelve: 12, tretze: 13, trece: 13, thirteen: 13,
    catorze: 14, catorce: 14, fourteen: 14, quinze: 15, quince: 15, fifteen: 15, setze: 16, dieciseis: 16, sixteen: 16,
    disset: 17, diecisiete: 17, seventeen: 17, díhuit: 18, divuit: 18, dieciocho: 18, eighteen: 18, dinou: 19, diecinueve: 19, nineteen: 19,
    vint: 20, veinte: 20, twenty: 20
  };
  const TENS = {
    trenta: 30, treinta: 30, thirty: 30, quaranta: 40, cuarenta: 40, forty: 40, cinquanta: 50, cincuenta: 50, fifty: 50,
    seixanta: 60, sesenta: 60, sixty: 60, setanta: 70, setenta: 70, seventy: 70, huitanta: 80, vuitanta: 80, ochenta: 80, eighty: 80,
    noranta: 90, noventa: 90, ninety: 90, cent: 100, cien: 100, ciento: 100, hundred: 100
  };
  function words2digits(s) {
    // «treinta y cinco» → 35, «trenta-cinc» → 35, «thirty five» → 35, «veinte» → 20
    const t = s.split(' '), out = [];
    for (let i = 0; i < t.length; i++) {
      const w = t[i].replace(/-/g, ' ');
      if (w.indexOf(' ') > 0) { const p = w.split(' '); if (p.length === 2 && TENS[p[0]] != null && UNITS[p[1]] != null) { out.push(String(TENS[p[0]] + UNITS[p[1]])); continue; } }
      if (TENS[w] != null) {
        let v = TENS[w], j = i + 1;
        if (t[j] === 'y' || t[j] === 'i') j++;
        if (t[j] != null && UNITS[t[j]] != null && UNITS[t[j]] < 10 && UNITS[t[j]] > 0 && v < 100) { v += UNITS[t[j]]; i = j; }
        out.push(String(v)); continue;
      }
      if (UNITS[w] != null && !(w === 'u' || w === 'un' || w === 'una' || w === 'uno' || w === 'set' || w === 'nou' || w === 'ten' || w === 'once' || w === 'cent' || w === 'one')) { out.push(String(UNITS[w])); continue; }
      out.push(t[i]);
    }
    return out.join(' ');
  }

  // ── Vocabulari (tot sense accents) ──────────────────────────
  const W = (list) => new RegExp('(?:^|\\s)(?:' + list + ')(?=\\s|$)');
  const RE = {
    stop: W('para|parar|stop|atura|aturar|pausa|cancela|cancelar|cancel|detente|deten|halt|quieto|quiet|silenci|calla'),
    reset: /(?:^|\s)(?:centra|centrate|centra't|reset|restablece|restablir|reinicia|reinicialitza|neutral|neutra|posicion inicial|posicio inicial|cara neutra|cara normal|descansa|descansar|relaja|relax|a casa|home)(?=\s|$)/,
    open: W('abre|abrir|abri|abierto|abierta|abiertos|abiertas|abra|abrela|obri|obrir|oberta|obert|oberts|obertes|obra|open|opens|opened'),
    close: W('cierra|cerrar|cerrado|cerrada|cerrados|cerradas|cierre|cerrala|tanca|tancar|tancat|tancada|tancats|tancades|tanque|close|closes|closed|shut|shuts'),
    more: W('mas|mes|more|otro poco mas|further'),
    less: W('menos|menys|less|lessen'),
    little: W('poco|poca|pocos|poquito|poquita|un poquito|poc|poca|pocs|xicotet|xicoteta|xicotets|xicotetes|petit|petita|slightly|slight|bit|little|ligeramente|lleugerament|apenas|casi nada|gairebe|barely|tad|mica|miqueta'),
    much: W('mucho|mucha|muchisimo|muy|mucho mas|molt|moltissim|much|very|lot|totalmente|completamente|del todo|totalment|completament|fully|completely|maximo|maxim|max|maximum|extremo|extrem|al maximo|al maxim|todo|tota|tot|entero|entera|fondo|a fons|wide|wide open|all the way'),
    half: W('medio|media|mitad|mig|mitja|meitat|half'),
    mouth: W('boca|bocas|mouth|morros|llavis|labios|lips'),
    eye: W('ojo|ojos|ull|ulls|eye|eyes|parpado|parpados|parpella|parpelles|eyelid|eyelids'),
    left: W('izquierda|izquierdo|izquierdas|izq|esquerra|esquerre|esquerres|esq|left|levogiro'),
    right: W('derecha|derecho|derechas|der|dreta|dret|dretes|dta|right'),
    center: W('centro|centre|center|centrada|centrado|frente|front|frontal|recto|recta|straight|ahead|davant|endavant|derecho al frente|neutral|medio|middle|mig|enmig|forward'),
    both: W('ambos|ambas|ambdos|ambdues|both|los dos|las dos|els dos|les dues|dos ojos|dos ulls|tots dos|totes dues'),
    turn: W('gira|girar|gireu|girala|giras|gire|turn|turns|rotate|rota|rotar|mira|mirar|mires|look|looks|watch|mueve|mover|mou|moure|move|vuelve|volver|torna|tornar|return|orienta|apunta|point|dirige|mantén|manten|keep|posa|pon|pone|put|set|ves|ve|go|vaya'),
    unitsDeg: W('grados|grado|graus|grau|degrees|degree|deg|º|°'),
    pct: /%/,
    slow: W('despacio|lento|lenta|lentamente|a poc a poc|pausadament|piano|slowly|slow|calmadamente|tranquilamente'),
    fast: W('rapido|rapida|rapidamente|rapid|rapidament|deprisa|de pressa|aviat|fast|quickly|quick|ligero|veloz|velozmente|corriendo'),
    // Coses que la cabeza NO pot fer (només té gir horitzontal, boca i ulls)
    vertical: W('arriba|abajo|adalt|dalt|avall|baix|up|down|asiente|asentir|assenteix|assentir|nod|nods|cabecea|cabeceo|afirma|afirmar|di que si|diu que si|say yes|di si|sube|baja|puja|abaixa|upward|downward|techo|sostre|suelo|terra|ceiling|floor|inclina|ladea|tilt'),
    // Repeticions
    twice: W('dos veces|doble|dues vegades|dues voltes|dos cops|twice|per duplicat'),
    once: W('una vez|una vegada|una volta|un cop|once|1 vez|1 vegada|1 volta'),
    again: W('otra vez|de nuevo|una altra vegada|una altra vegada|altra vegada|again|once more|repite|repeteix|repeat'),
    times: /(\d+)\s*(?:veces|vez|vegades|vegada|voltes|volta|cops|cop|times|time|x)(?=\s|$)/,
    seconds: /(\d+(?:[.,]\d+)?)\s*(?:segundos|segundo|segons|segon|seconds|second|secs|sec|s)(?=\s|$)/,
    forever: W('sin parar|sense parar|siempre|sempre|forever|continuamente|continuament|continuously|continuous|bucle|loop')
  };

  // Gestos amb nom: cada un té una expressió i un generador de passos
  const GEST = [
    { id: 'no',     re: W('di que no|diu que no|digues que no|niega|negar|nega|negacio|say no|shake|sacude|sacseja|sacsejar|desaprueba|reprova|nope|shake your head|shake head|nonono|di no'), fn: gNo },
    { id: 'blink',  re: W('parpadea|parpadear|parpadeo|parpelleja|parpellejar|parpelleig|pestanea|pestanejar|pestaneja|blink|blinks|blinking|aletea'), fn: gBlink },
    { id: 'wink',   re: W('guina|guinya|guinar|guiñar|guinyar|guiny|wink|winks|guiñada'), fn: gWink },
    { id: 'talk',   re: W('habla|hablar|parla|parlar|talk|talks|speak|chatea|xerra|xerrar|di algo|diu alguna cosa|dime algo|conversa|charla|cuenta|canta|canta|sing'), fn: gTalk },
    { id: 'yawn',   re: W('bosteza|bostezar|bostezo|badalla|badallar|badall|yawn|yawns'), fn: gYawn },
    { id: 'laugh',  re: W('rie|reir|ri|riu|riure|laugh|laughs|carcajea|riete|riures|jajaja|jaja|haha|giggle'), fn: gLaugh },
    { id: 'surprise', re: W('sorprende|sorprendido|sorprendida|sorpresa|sorpres|sorpresa|sorprendre|surprised|surprise|asombrado|asombro|flipa|alucina|uau|wow|asustado|espantat|espantada|scared|susto'), fn: gSurprise },
    { id: 'sleep',  re: W('duerme|dormir|dorm|dormiu|dormido|dormida|dormit|sleep|sleeps|asleep|sleepy|a dormir|buenas noches|bona nit|good night|nana'), fn: gSleep },
    { id: 'wake',   re: W('despierta|despertar|desperta|despertat|wake|wake up|despierto|a despertar|buenos dias|bon dia|good morning'), fn: gWake },
    { id: 'scan',   re: W('escanea|escanear|escaneja|vigila|vigilar|patrulla|patrullar|scan|scans|sweep|busca|buscar|search|rastrea|inspecciona|explora|explorar|mira alrededor|mira a todos lados|look around|mira al voltant|vigilant'), fn: gScan },
    { id: 'dance',  re: W('baila|bailar|balla|ballar|dance|dances|danza|swing|mou-te|muevete'), fn: gDance },
    { id: 'chew',   re: W('mastica|masticar|mastega|masteguem|masteca|mastegar|masteguem|chew|chews|come|comer|menja|menjar|eat|eats|mordisquea|ronca'), fn: gChew },
    { id: 'kiss',   re: W('beso|besar|bes|besa|besar|kiss|kisses|muac|mua'), fn: gKiss },
    { id: 'cry',    re: W('llora|llorar|plora|plorar|cry|cries|sad|triste|trist|tristesa'), fn: gSad },
    { id: 'sing',   re: W('tararea|tararejar|hum|hums|canturrea|canturreja'), fn: gTalk }
  ];

  // ── Gestos (en valors normalitzats) ─────────────────────────
  const S = (o, ms) => Object.assign({ ms: ms == null ? 350 : ms }, o);
  function rep(n, f) { const a = []; for (let i = 0; i < n; i++) a.push.apply(a, f(i)); return a; }
  function gNo(o) { return rep(o.n || 2, () => [S({ yaw: 0.6 }, 180), S({ yaw: -0.6 }, 180)]).concat([S({ yaw: 0 }, 250)]); }
  function gBlink(o) { return rep(o.n || 2, () => [S({ eyeL: 0, eyeR: 0 }, 160), S({ eyeL: 1, eyeR: 1 }, 220)]); }
  function gWink(o) {
    const side = o.side || 'right';
    const c = side === 'left' ? { eyeL: 0 } : { eyeR: 0 }, u = side === 'left' ? { eyeL: 1 } : { eyeR: 1 };
    return rep(o.n || 1, () => [S(c, 450), S(u, 300)]);
  }
  function gTalk(o) {
    const n = Math.max(3, Math.round((o.sec || 3) * 3));
    const lv = [0.45, 0.12, 0.6, 0.2, 0.35, 0.1, 0.55, 0.18];
    return rep(n, (i) => [S({ mouth: lv[i % lv.length] }, 150)]).concat([S({ mouth: 0 }, 250)]);
  }
  function gYawn() { return [S({ eyeL: 0, eyeR: 0, mouth: 0.4 }, 300), S({ mouth: 1 }, 1400), S({ mouth: 0.3 }, 300), S({ mouth: 0, eyeL: 1, eyeR: 1 }, 300)]; }
  function gLaugh(o) { return rep(o.n || 5, (i) => [S({ mouth: 0.7, yaw: i % 2 ? 0.08 : -0.08 }, 130), S({ mouth: 0.2 }, 110)]).concat([S({ mouth: 0, yaw: 0 }, 250)]); }
  function gSurprise() { return [S({ eyeL: 1, eyeR: 1, mouth: 0.75 }, 1800), S({ mouth: 0 }, 300)]; }
  function gSleep() { return [S({ yaw: 0, mouth: 0, eyeL: 0, eyeR: 0 }, 500)]; }
  function gWake() { return [S({ eyeL: 1, eyeR: 1 }, 300), S({ eyeL: 0, eyeR: 0 }, 160), S({ eyeL: 1, eyeR: 1, mouth: 0.25 }, 500), S({ mouth: 0 }, 250)]; }
  function gScan(o) { return rep(o.n || 2, () => [S({ yaw: 0.9 }, 600), S({ yaw: -0.9 }, 600)]).concat([S({ yaw: 0 }, 350)]); }
  function gDance(o) { return rep(o.n || 3, () => [S({ yaw: 0.7, mouth: 0.4 }, 200), S({ yaw: -0.7, mouth: 0.1 }, 200)]).concat([S({ yaw: 0, mouth: 0 }, 300)]); }
  function gChew(o) { return rep(o.n || 5, () => [S({ mouth: 0.35 }, 170), S({ mouth: 0 }, 170)]); }
  function gKiss() { return [S({ mouth: 0.15, eyeL: 0, eyeR: 0 }, 600), S({ mouth: 0, eyeL: 1, eyeR: 1 }, 300)]; }
  function gSad() { return [S({ eyeL: 0, eyeR: 0 }, 600), S({ eyeL: 1, eyeR: 1, mouth: 0.1 }, 600), S({ eyeL: 0, eyeR: 0, mouth: 0 }, 600), S({ eyeL: 1, eyeR: 1 }, 300)]; }

  // ── Anàlisi d'un fragment (sense «després»/comes) ───────────
  function numberIn(t) { const m = t.match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : null; }
  const has = (re, t) => re.test(' ' + t + ' ') || re.test(t);

  function sideOf(t) {
    // Ull concret: «ojo izquierdo», «el derecho»…
    const L = has(RE.left, t), R = has(RE.right, t);
    if (L && !R) return 'left';
    if (R && !L) return 'right';
    return null;
  }

  // Un fragment pot dur diversos «sub-fragments» units per «y/i/and»
  function parseSub(t, inherit) {
    const acts = [], notes = [];
    const eyeN = has(RE.eye, t), mouthN = has(RE.mouth, t);
    const open = has(RE.open, t), close = has(RE.close, t);
    const verb = open ? 'open' : close ? 'close' : (inherit && inherit.verb) || null;
    const little = has(RE.little, t), much = has(RE.much, t), half = has(RE.half, t);
    const more = has(RE.more, t), less = has(RE.less, t);
    const num = numberIn(t);
    const pct = has(RE.pct, t) ? num : null;
    const deg = has(RE.unitsDeg, t) ? num : null;
    const both = has(RE.both, t);
    const vertical = has(RE.vertical, t);
    if (vertical) notes.push('no_vertical');

    // Nivell 0..1 a partir de modificadors (valor per defecte «def»)
    const level = (def) => pct != null ? Math.max(0, Math.min(100, pct)) / 100 : half ? 0.5 : much ? 1 : little ? Math.min(def, 0.25) : def;

    // ── Ulls ──
    if (eyeN && (verb || has(RE.close, t) || has(RE.open, t))) {
      const side = both ? null : sideOf(t);
      const v = verb === 'open' ? 1 : 0;
      const a = { ch: 'eye' };
      if (side === 'left') a.eyeL = v; else if (side === 'right') a.eyeR = v; else { a.eyeL = v; a.eyeR = v; }
      acts.push(a);
    }
    // ── Boca ──
    if (mouthN || (!eyeN && (open || close) && !has(RE.left, t) && !has(RE.right, t))) {
      if (verb === 'close') acts.push({ ch: 'mouth', mouth: 0 });
      else if (verb === 'open' || more || less || little || much || half || pct != null) {
        if (more && !open) acts.push({ ch: 'mouth', dmouth: little ? 0.12 : 0.25 });
        else if (less) acts.push({ ch: 'mouth', dmouth: little ? -0.12 : -0.25 });
        else if (verb === 'open' && more) acts.push({ ch: 'mouth', dmouth: little ? 0.12 : 0.25 });
        else acts.push({ ch: 'mouth', mouth: level(0.5) });
      }
    }
    // ── Gir ──
    const dirL = has(RE.left, t), dirR = has(RE.right, t), dirC = has(RE.center, t) && !mouthN && !eyeN;
    const eyeSide = eyeN && (dirL || dirR);          // «ojo izquierdo»: no és una direcció de gir
    if (!eyeSide && !(mouthN && !has(RE.turn, t)) && (dirL || dirR || dirC)) {
      let sign = dirL && !dirR ? 1 : dirR && !dirL ? -1 : 0;
      const amount = deg != null && has(RE.unitsDeg, t) ? Math.min(1, deg / 60) : level(0.7);
      if (dirC && !dirL && !dirR) acts.push({ ch: 'yaw', yaw: 0 });
      else if (sign !== 0) {
        if ((more || less) && !(deg != null) && pct == null) {
          const d = (little ? 0.15 : 0.3) * (less ? -1 : 1);
          acts.push({ ch: 'yaw', dyaw: sign * d });
        } else acts.push({ ch: 'yaw', yaw: sign * amount });
      }
    }
    return { acts, notes, verb };
  }

  // Gestos dins d'un fragment
  function parseGesture(t) {
    for (const g of GEST) {
      if (!has(g.re, t)) continue;
      let n = null;
      const m = t.match(RE.times);
      if (m) n = parseInt(m[1], 10);
      else if (has(RE.twice, t)) n = 2;
      else if (has(RE.once, t)) n = 1;
      else {
        const k = t.match(/(?:^|\s)(\d+)(?:\s+(?:cops|cop|veces|vez|vegades|vegada|voltes|volta|times|time))/);
        if (k) n = parseInt(k[1], 10);
      }
      if (n != null) n = Math.max(1, Math.min(10, n));
      const sec = t.match(RE.seconds);
      const o = { n: n || undefined, sec: sec ? Math.max(1, Math.min(12, parseFloat(sec[1].replace(',', '.')))) : undefined, side: has(RE.left, t) && !has(RE.right, t) ? 'left' : has(RE.right, t) ? 'right' : null };
      if (g.id === 'wink' && !o.side) o.side = 'right';
      if (g.id === 'scan' || g.id === 'dance' || g.id === 'laugh' || g.id === 'chew' || g.id === 'blink' || g.id === 'no') {
        if (has(RE.forever, t)) o.n = 8;
      }
      return { id: g.id, steps: g.fn(o) };
    }
    return null;
  }

  // ── Anàlisi completa ────────────────────────────────────────
  const SPLIT_SEQ = /\s*(?:[.;,]|(?:\s|^)(?:y luego|y despues|y entonces|luego|despues de eso|despues|entonces|i despres|i llavors|i seguidament|despres|llavors|seguidament|and then|then|after that|afterwards|next|despues de|abans|primero|primer|first)(?=\s|$))\s*/;
  const SPLIT_AND = /\s+(?:y|i|e|and|amb|con|with|ademas|a mes|also|tambien|tambe)\s+/;
  const SPLIT_REPEAT = /^(.*?)\s*(?:(?:repite|repeteix|repeat)\s*)?$/;

  function parse(text) {
    const t0 = norm(text);
    const out = { ok: false, stop: false, steps: [], notes: [], norm: t0 };
    if (!t0) return out;
    const t = words2digits(t0).replace(/['\-]/g, ' ').replace(/\s+/g, ' ').trim();
    out.norm = t;

    // «para», «stop»: només si és (gairebé) tota la frase
    if (t.split(' ').length <= 3 && has(RE.stop, t)) { out.stop = true; out.ok = true; return out; }

    const speed = has(RE.slow, t) ? 1.8 : has(RE.fast, t) ? 0.5 : 1;
    const clauses = t.split(SPLIT_SEQ).map((x) => x && x.trim()).filter(Boolean);
    let all = [];
    let lastClauseSteps = null;

    for (const clause of clauses) {
      // «repeteix» / «una altra vegada» → repetix el fragment anterior
      if (has(RE.again, clause) && lastClauseSteps && !has(RE.mouth, clause) && !has(RE.eye, clause) && !GEST.some((g) => has(g.re, clause))) {
        all = all.concat(lastClauseSteps.map((s) => Object.assign({}, s)));
        continue;
      }
      let steps = [];
      // 1) restabliment
      if (has(RE.reset, clause)) { steps.push(S({ yaw: 0, mouth: 0, eyeL: 1, eyeR: 1 }, 500)); }
      // 2) sub-fragments units per «y / i / and»: cada un pot ser un gest amb nom o una ordre lliure
      const subs = clause.split(SPLIT_AND).map((x) => x.trim()).filter(Boolean);
      let inherit = null, cur = null;
      const clauseSteps = [];
      const flush = () => { clauseSteps.forEach((c) => steps.push(c.step)); clauseSteps.length = 0; cur = null; };
      for (const sub of subs) {
        const g = parseGesture(sub);
        if (g) {
          flush();
          steps = steps.concat(g.steps);
          continue;
        }
        // un sub-fragment sense verb però amb nom hereta el verb obrir/tancar de l'anterior («tanca els ulls i la boca»)
        const r = parseSub(sub, inherit);
        r.notes.forEach((n) => out.notes.push(n));
        if (r.verb) inherit = { verb: r.verb };
        for (const a of r.acts) {
          // mateix canal que ja té el pas actual → pas nou; si no, es combina en el mateix pas
          const chs = (a.ch === 'eye') ? ['eyeL', 'eyeR'] : [a.ch];
          if (!cur || chs.some((c) => cur.used[c])) { cur = { step: S({}), used: {} }; clauseSteps.push(cur); }
          const vals = Object.assign({}, a); delete vals.ch;
          Object.assign(cur.step, vals);
          if (a.ch === 'eye') { cur.used.eyeL = cur.used.eyeR = true; } else cur.used[a.ch] = true;
        }
      }
      flush();
      // repeticions del fragment sencer («obri i tanca la boca tres vegades»), només per a ordres lliures
      if (steps.length && !GEST.some((g) => has(g.re, clause))) {
        let n = null; const m = clause.match(RE.times);
        if (m) n = parseInt(m[1], 10); else if (has(RE.twice, clause)) n = 2;
        if (n && n > 1) { n = Math.min(n, 10); const base = steps.slice(); for (let i = 1; i < n; i++) steps = steps.concat(base.map((s2) => Object.assign({}, s2))); }
      }
      if (steps.length && has(RE.vertical, clause)) out.notes.push('no_vertical');
      if (steps.length) { lastClauseSteps = steps; all = all.concat(steps); }
    }

    if (speed !== 1) all.forEach((s) => { s.ms = Math.round(s.ms * speed); });
    // Sense passos però amb avís (p. ex. «mira amunt»): no és ok, però es mostra l'avís
    out.steps = all.slice(0, 80);
    out.ok = out.steps.length > 0;
    out.notes = Array.from(new Set(out.notes));
    return out;
  }

  // ── Validació de passos (Gemini, proves…) ───────────────────
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function sanitize(list, maxMs) {
    const out = []; let total = 0; maxMs = maxMs || 25000;
    if (!Array.isArray(list)) return out;
    for (const s of list.slice(0, 40)) {
      if (!s || typeof s !== 'object') continue;
      const o = { ms: clamp(Math.round(Number(s.ms)), 80, 3000) };
      if (!isFinite(o.ms)) o.ms = 350;
      if (isFinite(Number(s.yaw)) && s.yaw !== null && s.yaw !== '') o.yaw = clamp(Number(s.yaw), -1, 1);
      if (isFinite(Number(s.mouth)) && s.mouth !== null && s.mouth !== '') o.mouth = clamp(Number(s.mouth), 0, 1);
      if (s.eyeL === 0 || s.eyeL === 1 || s.eyeL === '0' || s.eyeL === '1' || s.eyeL === true || s.eyeL === false) o.eyeL = (s.eyeL === 1 || s.eyeL === '1' || s.eyeL === true) ? 1 : 0;
      if (s.eyeR === 0 || s.eyeR === 1 || s.eyeR === '0' || s.eyeR === '1' || s.eyeR === true || s.eyeR === false) o.eyeR = (s.eyeR === 1 || s.eyeR === '1' || s.eyeR === true) ? 1 : 0;
      if (o.yaw === undefined && o.mouth === undefined && o.eyeL === undefined && o.eyeR === undefined) continue;
      total += o.ms; if (total > maxMs) break;
      out.push(o);
    }
    return out;
  }

  // ── Paquet de 6 dígits (mateix format que JFace) ────────────
  //  cal: { yawC:15, yawHalf:10, mouthMax:20, invert:false }
  const DEF_CAL = { yawC: 15, yawHalf: 10, mouthMax: 20, invert: false };
  function toPacket(p, cal) {
    cal = Object.assign({}, DEF_CAL, cal || {});
    const sgn = cal.invert ? -1 : 1;
    const yaw = clamp(Math.round(cal.yawC + sgn * clamp(p.yaw, -1, 1) * cal.yawHalf), 0, 99);
    const mouth = clamp(Math.round(clamp(p.mouth, 0, 1) * cal.mouthMax), 0, 99);
    return String(yaw).padStart(2, '0') + String(mouth).padStart(2, '0') + (p.eyeL ? 1 : 0) + (p.eyeR ? 1 : 0);
  }
  const NEUTRAL = { yaw: 0, mouth: 0, eyeL: 1, eyeR: 1 };

  root.JVeu = { parse, sanitize, toPacket, norm, DEF_CAL, NEUTRAL, _words2digits: words2digits };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.JVeu;
})(typeof window !== 'undefined' ? window : globalThis);
