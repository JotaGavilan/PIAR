/* HUMOR – a: reacciones-blob sobre fondo pop · b: fail en bucle · c: sticker pack / cómic */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, rr, circle, ellipse, halo, text, rng, lerp, clamp, smooth, easeOut, easeInOut } = L;
  const INK = '#2a1233';
  const fract = (x) => x - Math.floor(x);

  /* ---------- color ---------- */
  const _pc = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  /* halo sin fleco gris: mismo color con alfa 0 */
  function glow(ctx, x, y, r, c, a = 1) { const q = _pc(c).join(','); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${q},${a})`); g.addColorStop(.4, `rgba(${q},${a * .38})`); g.addColorStop(1, `rgba(${q},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function mixh(a, b, k) { const p = _pc(a), q = _pc(b); return '#' + p.map((v, i) => Math.round(lerp(v, q[i], clamp(k))).toString(16).padStart(2, '0')).join(''); }

  /* ---------- expresiones ---------- */
  const XD0 = { open: 0, happy: 0, chev: 0, spiral: 0, heart: 0, sleep: 0, es: 1, px: 0, py: 0, ps: 1, bY: 0, bA: 0, bL: 0, bR: 0, mw: .3, tc: .1, bc: .1, my: .4, sk: 0, tongue: 0, blush: 0, tear: 0, sweat: 0, shades: 0 };
  const X = (o) => Object.assign({}, XD0, o);
  function blendX(a, b, k) { const r = {}; for (const key in XD0) r[key] = lerp(a[key], b[key], k); return r; }
  const EX = {
    determined: X({ open: 1, es: .95, bA: .55, bY: .02, mw: .24, tc: .0, bc: .02, my: .42 }),
    lol: X({ happy: 1, bY: -.05, bA: -.12, mw: .52, tc: .0, bc: .62, my: .3, blush: 1, tear: 1, tongue: .6 }),
    panic: X({ open: 1, es: 1.3, ps: .42, bY: -.16, bA: -.55, mw: .22, tc: -.1, bc: .34, my: .5, sweat: 1 }),
    think: X({ open: 1, es: 1, px: -.7, py: -.8, bL: -.14, bR: .05, bA: .12, mw: .2, tc: .03, bc: .03, my: .46, sk: .05 }),
    xd: X({ chev: 1, bY: -.06, mw: .52, tc: .02, bc: .62, my: .3, tongue: 1, blush: 1 }),
    love: X({ heart: 1, bY: -.06, bA: -.1, mw: .36, tc: .06, bc: .4, my: .34, blush: 1 }),
    cool: X({ shades: 1, open: 1, bY: -.04, mw: .34, tc: .08, bc: .1, my: .42, sk: .09 }),
    sleepy: X({ sleep: 1, bY: .02, bA: -.15, mw: .13, tc: -.02, bc: .13, my: .46 }),
    angry: X({ open: 1, es: .88, ps: 1.1, bA: .75, mw: .32, tc: -.1, bc: -.1, my: .52, blush: .3 }),
    cry: X({ open: 1, es: 1.18, ps: 1.55, py: .3, bY: -.04, bA: -.5, mw: .28, tc: -.12, bc: -.04, my: .54, tear: 1 }),
    dizzy: X({ spiral: 1, bY: -.04, mw: .2, tc: -.05, bc: .16, my: .46 }),
    sheepish: X({ open: 1, es: .95, px: .8, py: .2, bA: -.35, bY: -.02, mw: .3, tc: .05, bc: .12, my: .44, sk: .07, sweat: .8 }),
    ouch: X({ chev: 1, bA: -.4, bY: -.04, mw: .3, tc: -.12, bc: .38, my: .46 }),
    wow: X({ open: 1, es: 1.25, ps: .85, bY: -.2, mw: .17, tc: -.1, bc: .3, my: .5 })
  };

  /* ---------- formas ---------- */
  function burst(ctx, x, y, ro, ri, n, rot = 0) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? ri : ro; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  function sparkle(ctx, x, y, s, col, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * .14, -s * .14, s, 0); ctx.quadraticCurveTo(s * .14, s * .14, 0, s); ctx.quadraticCurveTo(-s * .14, s * .14, -s, 0); ctx.quadraticCurveTo(-s * .14, -s * .14, 0, -s); ctx.fill(); ctx.restore(); }
  function drop(ctx, x, y, s, rot, col, hl = true) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, -1); ctx.bezierCurveTo(.15, -.55, .62, -.1, .62, .35); ctx.arc(0, .35, .62, 0, Math.PI, false); ctx.bezierCurveTo(-.62, -.1, -.15, -.55, 0, -1); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = .1; ctx.lineJoin = 'round'; ctx.stroke();
    if (hl) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-.25, .3, .1, .22, .25, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  const springUp = (tau) => tau <= 0 ? 0 : 1 - Math.exp(-7 * tau) * Math.cos(16 * tau);
  /* squash&stretch cíclico: f en [0,1); empieza aplastado, salta, se asienta, y vuelve a agacharse al final */
  const springS = (f) => f > .85 ? -smooth((f - .85) / .15) : -Math.exp(-4.5 * f) * Math.cos(15 * f);

  function token(ctx, str, x, y, size, o = {}) {
    const sc = o.sc === undefined ? 1 : o.sc; if (sc <= .01) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(sc, sc);
    const ro = size * (o.k || .86), ri = ro * .7, n = o.n || 11, spin = o.spin || 0;
    burst(ctx, 9, 12, ro, ri, n, spin); ctx.fillStyle = 'rgba(30,10,50,.33)'; ctx.fill();
    burst(ctx, 0, 0, ro, ri, n, spin); ctx.fillStyle = o.col || '#ffd93b'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = size * .07; ctx.strokeStyle = INK; ctx.stroke();
    if (!o.flat) { burst(ctx, 0, 0, ro * .86, ri * .86, n, spin); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill(); }
    text(ctx, str, 0, size * .03, { size: size * (o.ts || .56), weight: 800, color: o.tcol || '#fff', stroke: INK, strokeW: size * .15, italic: true });
    ctx.restore();
  }
  function bubble(ctx, x, y, w, h, tx, ty, fill = '#fff') {
    ctx.save(); ctx.lineJoin = 'round';
    const draw = () => { ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, TAU); ctx.moveTo(x - w * .12, y + h * .4); ctx.lineTo(tx, ty); ctx.lineTo(x + w * .08, y + h * .46); ctx.closePath(); };
    ctx.translate(8, 10); draw(); ctx.fillStyle = 'rgba(30,10,50,.3)'; ctx.fill(); ctx.translate(-8, -10);
    draw(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, w / 2 - 5, h / 2 - 5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- cuerpo blob ---------- */
  const SHAPES = {
    round: (a) => 1,
    squircle: (a) => 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), 3.2) + Math.pow(Math.abs(Math.sin(a)), 3.2), 1 / 3.2),
    star: (a) => .94 + .1 * Math.cos(5 * a - 1.57),
    cloud: (a) => .94 + .07 * Math.cos(7 * a),
    tri: (a) => (.84 + .15 * Math.cos(3 * a + 1.57)) * 1.04,
    drop: (a) => 1 + .24 * Math.max(0, -Math.sin(a)) ** 4,
    bean: (a) => 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)) / 1.1, 2.6) + Math.pow(Math.abs(Math.sin(a)) / .95, 2.6), 1 / 2.6)
  };
  function bodyPath(ctx, R, shape, t, wob) {
    const N = 44, f = SHAPES[shape || 'round'], pts = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, w = 1 + wob * (Math.sin(3 * a - TAU * t * 2) + .6 * Math.sin(5 * a + TAU * t * 3));
      const r = R * f(a) * w * (shape === 'squircle' || shape === 'bean' ? 1 : 1); pts.push([Math.cos(a) * r, Math.sin(a) * r * .96]);
    }
    const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    ctx.beginPath(); let s = m(pts[N - 1], pts[0]); ctx.moveTo(s[0], s[1]);
    for (let i = 0; i < N; i++) { const q = pts[i], e = m(q, pts[(i + 1) % N]); ctx.quadraticCurveTo(q[0], q[1], e[0], e[1]); }
    ctx.closePath();
  }

  function eyeLayer(ctx, w, fn) { if (w < .02) return; ctx.save(); ctx.globalAlpha *= clamp(w); fn(); ctx.restore(); }
  function drawFace(ctx, ex, o) {
    const t = o.t || 0, blink = o.blink || 0, lx = o.lx || 0;
    ctx.save(); ctx.translate(lx * .2, 0); ctx.scale(1 - .12 * Math.abs(lx), 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // rubor
    if (ex.blush > .02) { ctx.fillStyle = `rgba(255,70,120,${.45 * ex.blush})`; [-1, 1].forEach((s) => { ellipse(ctx, s * .64, .2, .15, .09); ctx.fill(); }); }
    const EY = -.12;
    [-1, 1].forEach((s) => {
      const cx = s * .36;
      eyeLayer(ctx, ex.open, () => {
        const rx = .19 * ex.es, ry = .235 * ex.es * (1 - .94 * blink);
        ellipse(ctx, cx, EY, rx, ry); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = .03; ctx.strokeStyle = INK; ctx.stroke();
        if (blink < .6) {
          const pr = .105 * ex.ps * (ex.es > 1.1 ? 1 : 1), jit = ex.sweat * .035 * wave(t, 30, s * .2);
          const px = cx + (ex.px + jit / .07) * .07 * ex.es, py = EY + ex.py * .09 * ex.es;
          circle(ctx, px, py, pr); ctx.fillStyle = INK; ctx.fill();
          circle(ctx, px - pr * .35, py - pr * .38, pr * .36); ctx.fillStyle = '#fff'; ctx.fill();
          circle(ctx, px + pr * .4, py + pr * .35, pr * .15); ctx.fill();
        }
      });
      eyeLayer(ctx, ex.happy, () => { ctx.strokeStyle = INK; ctx.lineWidth = .075; ctx.beginPath(); ctx.arc(cx, EY + .07, .17, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
      eyeLayer(ctx, ex.sleep, () => { ctx.strokeStyle = INK; ctx.lineWidth = .065; ctx.beginPath(); ctx.arc(cx, EY - .06, .16, Math.PI * .1, Math.PI * .9); ctx.stroke(); });
      eyeLayer(ctx, ex.chev, () => { const d = -s; ctx.strokeStyle = INK; ctx.lineWidth = .075; ctx.beginPath(); ctx.moveTo(cx - d * .15, EY - .15); ctx.lineTo(cx + d * .13, EY); ctx.lineTo(cx - d * .15, EY + .15); ctx.stroke(); });
      eyeLayer(ctx, ex.heart, () => {
        const k = 1 + .1 * wave(t, 8, s * .1); ctx.save(); ctx.translate(cx, EY + .02); ctx.scale(k, k);
        ctx.beginPath(); ctx.moveTo(0, .17); ctx.bezierCurveTo(-.34, -.02, -.2, -.26, 0, -.1); ctx.bezierCurveTo(.2, -.26, .34, -.02, 0, .17); ctx.fillStyle = '#ff2f6d'; ctx.fill(); ctx.lineWidth = .03; ctx.strokeStyle = INK; ctx.stroke();
        circle(ctx, -.1, -.06, .035); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); ctx.restore();
      });
      eyeLayer(ctx, ex.spiral, () => {
        circle(ctx, cx, EY, .2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = .03; ctx.strokeStyle = INK; ctx.stroke();
        ctx.beginPath(); const ph = TAU * t * 6 * -s; for (let a = 0; a < 3.3 * Math.PI; a += .2) { const r = .015 + a * .016; const px = cx + Math.cos(a + ph) * r, py = EY + Math.sin(a + ph) * r; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.lineWidth = .03; ctx.stroke();
      });
    });
    // cejas
    [-1, 1].forEach((s) => {
      const yb = -.47 + ex.bY + (s < 0 ? ex.bL : ex.bR), yi = yb + ex.bA * .22, yo = yb - ex.bA * .22;
      ctx.strokeStyle = INK; ctx.lineWidth = .065; ctx.beginPath(); ctx.moveTo(s * .13, yi); ctx.quadraticCurveTo(s * .36, Math.min(yi, yo) - .06 + Math.abs(ex.bA) * .04, s * .6, yo); ctx.stroke();
    });
    // boca
    const mw = ex.mw, my = ex.my, cL = my + ex.sk, cR = my - ex.sk, mpath = () => { ctx.beginPath(); ctx.moveTo(-mw, cL); ctx.quadraticCurveTo(0, my + ex.tc * 2, mw, cR); ctx.quadraticCurveTo(0, my + ex.bc * 2, -mw, cL); ctx.closePath(); };
    mpath(); ctx.fillStyle = '#4a1238'; ctx.fill();
    const openAmt = ex.bc - ex.tc;
    ctx.save(); mpath(); ctx.clip();
    if (openAmt > .22) { ctx.fillStyle = '#fff'; ctx.fillRect(-mw, my + ex.tc - .06, mw * 2, .12 + .0); ctx.fillStyle = '#ff5f86'; ellipse(ctx, 0, my + ex.bc + .06, mw * .62, .2); ctx.fill(); }
    ctx.restore();
    if (ex.tongue > .75) { const th = .3 * smooth((ex.tongue - .75) / .25); ctx.fillStyle = '#ff5f86'; rr(ctx, -.17, my + ex.bc - .04, .34, th + .05, .17); ctx.fill(); ctx.lineWidth = .035; ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, my + ex.bc + .03); ctx.lineTo(0, my + ex.bc + th * .8); ctx.strokeStyle = 'rgba(160,20,70,.6)'; ctx.stroke(); }
    mpath(); ctx.lineWidth = .05; ctx.strokeStyle = INK; ctx.stroke();
    // gafas
    eyeLayer(ctx, ex.shades, () => {
      ctx.fillStyle = '#16092a'; [-1, 1].forEach((s) => { rr(ctx, s * .36 - .24, EY - .17, .48, .34, .15); ctx.fill(); });
      ctx.fillRect(-.14, EY - .1, .28, .06); ctx.strokeStyle = '#16092a'; ctx.lineWidth = .05; ctx.beginPath(); ctx.moveTo(-.6, EY - .08); ctx.lineTo(-.85, EY - .12); ctx.moveTo(.6, EY - .08); ctx.lineTo(.85, EY - .12); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = .035; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * .36 - .14, EY + .03); ctx.lineTo(s * .36 - .02, EY - .1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * .36 - .02, EY + .08); ctx.lineTo(s * .36 + .06, EY - .02); ctx.stroke(); });
    });
    ctx.restore();
  }
  /* o: col, dark, t, rot, sx, sy, lx, blink, wob, shape, hands:[[x,y],[x,y]], noOutline, sticker */
  function drawBlob(ctx, cx, cy, R, ex, o = {}) {
    const t = o.t || 0, col = o.col || '#ffd93b', dark = o.dark || '#c2185b';
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.rot || 0); ctx.translate(0, R * .94); ctx.scale(o.sx || 1, o.sy || 1); ctx.translate(0, -R * .94);
    if (o.sticker) { ctx.save(); ctx.scale(R, R); bodyPath(ctx, 1, o.shape, t, o.wob || 0); ctx.restore(); ctx.save(); ctx.translate(R * .05, R * .09); ctx.scale(R, R); bodyPath(ctx, 1, o.shape, t, o.wob || 0); ctx.lineWidth = .3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(30,10,50,.3)'; ctx.stroke(); ctx.fillStyle = 'rgba(30,10,50,.3)'; ctx.fill(); ctx.restore(); ctx.save(); ctx.scale(R, R); bodyPath(ctx, 1, o.shape, t, o.wob || 0); ctx.lineWidth = .27; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }
    // brazos de fideo (detrás)
    const hands = o.hands;
    if (hands) hands.forEach((h, i) => { if (!h) return; const s = i ? 1 : -1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * R * .8, R * .2); ctx.quadraticCurveTo(s * R * 1.05, R * (.2 + h[1]) * .6, h[0] * R, h[1] * R); ctx.lineWidth = R * .2; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = R * .125; ctx.strokeStyle = col; ctx.stroke(); });
    ctx.save(); ctx.scale(R, R);
    bodyPath(ctx, 1, o.shape, t, o.wob || 0);
    ctx.fillStyle = rad(ctx, -.34, -.5, .08, 1.35, [[0, mixh(col, '#ffffff', .6)], [.4, col], [1, mixh(col, dark, .55)]]); ctx.fill();
    ctx.save(); ctx.clip();
    // luz de borde inferior-derecha
    ctx.strokeStyle = mixh(col, '#ffffff', .35); ctx.globalAlpha = .55; ctx.lineWidth = .1; ctx.beginPath(); ctx.arc(-.02, -.04, 1.02, .15, 1.15); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.restore();
    bodyPath(ctx, 1, o.shape, t, o.wob || 0); ctx.lineWidth = .045; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke();
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ellipse(ctx, -.5, -.66, .2, .09, -.62); ctx.fill(); circle(ctx, -.26, -.8, .04); ctx.fill();
    drawFace(ctx, ex, o);
    ctx.restore();
    if (hands) hands.forEach((h) => { if (!h) return; circle(ctx, h[0] * R, h[1] * R, R * .17); ctx.fillStyle = mixh(col, '#ffffff', .12); ctx.fill(); ctx.lineWidth = R * .04; ctx.strokeStyle = INK; ctx.stroke(); });
    // lágrimas y sudor (espacio del cuerpo)
    ctx.save(); ctx.scale(R, R);
    if (ex.tear > .02) for (let i = 0; i < 3; i++) [-1, 1].forEach((s) => { const p = fract(t * 8 + i / 3 + (s > 0 ? .17 : 0)), a = Math.sin(Math.PI * p) ** .35 * clamp(ex.tear); const x = s * (.5 + .85 * p), y = -.06 - .85 * p + 1.9 * p * p; drop(ctx, x, y, .11 * (.6 + .4 * a), s * (.9 - p * 2.2) * -1 * 0 + s * (.5 - p * 1.6), '#8fdcff'); });
    if (ex.sweat > .02) for (let i = 0; i < 2; i++) [-1, 1].forEach((s) => { const p = fract(t * 8 + i / 2 + (s > 0 ? .3 : 0)), a = clamp(ex.sweat) * Math.sin(Math.PI * p) ** .4; ctx.globalAlpha = a; drop(ctx, s * (.72 + .5 * p), -.5 - .5 * p + 1.4 * p * p, .1, s * (.6 - p * 1.6), '#d6f3ff'); ctx.globalAlpha = 1; });
    ctx.restore();
    ctx.restore();
  }

  /* estado animado de un blob que cicla por una lista de expresiones (4 estados por bucle) */
  function cycleState(t, list, cols, shift, delay) {
    const n = list.length, u = fract(t + (delay || 0)) * n, i0 = Math.floor(u), f = u - i0, i = (i0 + shift) % n, nx = (i + 1) % n, k = smooth((f - .74) / .26);
    return { ex: blendX(EX[list[i]], EX[list[nx]], k), col: mixh(cols[i], cols[nx], k), f, s: springS(f), idx: i };
  }
  const blinkAmt = (t, ph, n = 4) => { const x = fract(t * n + ph); return x < .07 ? Math.sin(Math.PI * x / .07) : 0; };

  /* ---------- decorados pop ---------- */
  function rays(ctx, cx, cy, t, col, M = 12, R = 2200) {
    const rot = t * TAU / M; ctx.fillStyle = col;
    for (let i = 0; i < M; i++) { const a0 = i * TAU / M + rot; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); ctx.lineTo(cx + Math.cos(a0 + TAU / M / 2) * R, cy + Math.sin(a0 + TAU / M / 2) * R); ctx.closePath(); ctx.fill(); }
  }
  function halftone(ctx, t, col, o = {}) {
    const sp = o.sp || 64, W = 1080, H = 1920, cx = o.cx || 540, cy = o.cy || 960, scrollY = (o.scroll === undefined ? 1 : o.scroll) * t * sp * 2;
    ctx.fillStyle = col; ctx.beginPath();
    for (let r = -2; r < H / sp + 3; r++) for (let c = -1; c < W / sp + 2; c++) {
      const x = c * sp + (r & 1 ? sp / 2 : 0), y = r * sp + scrollY - sp, d = Math.hypot(x - cx, (y - cy) * .8) / 1150, rad = (o.r0 || 3) + (o.r1 || 15) * clamp(d) ** 1.2;
      ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, TAU);
    }
    ctx.fill();
  }
  function confetti(ctx, n, seed, t, cols, o = {}) {
    const W = 1080, H = 1920;
    L.loopParticles(n, seed, t, (i, p, r) => {
      const x0 = r() * W, sz = (o.s || 1) * (14 + r() * 16), col = cols[Math.floor(r() * cols.length)], kind = Math.floor(r() * 3), spins = 1 + Math.floor(r() * 3), ph = r(), sw = 20 + r() * 40;
      const x = x0 + sw * Math.sin(TAU * (p * 2 + ph)), y = -60 + p * (H + 120);
      ctx.save(); ctx.translate(x, y); ctx.rotate(TAU * (p * spins + ph)); ctx.scale(1, Math.cos(TAU * (p * 3 + ph)) * .85 + .15 * Math.sign(Math.cos(TAU * (p * 3 + ph)) || 1)); ctx.fillStyle = col;
      if (kind === 0) { ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2); } else if (kind === 1) { circle(ctx, 0, 0, sz * .32); ctx.fill(); } else { ctx.beginPath(); ctx.moveTo(0, -sz * .4); ctx.lineTo(sz * .4, sz * .32); ctx.lineTo(-sz * .4, sz * .32); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    });
  }
  function twinkles(ctx, n, seed, t, cols, o = {}) {
    const r = rng(seed); for (let i = 0; i < n; i++) { const x = r() * 1080, y = (o.y0 || 220) + r() * ((o.y1 || 1560) - (o.y0 || 220)), s = (o.s || 1) * (16 + r() * 26), k = 1 + Math.floor(r() * 2), ph = r(), c = cols[Math.floor(r() * cols.length)]; const a = Math.max(0, wave(t, k, ph)); sparkle(ctx, x, y, s * (.25 + .75 * a), c, Math.PI / 4 * 0); }
  }

  /* ===================================================================== */
  /* HUMOR-A                                                               */
  /* ===================================================================== */
  const PA = [
    { c0: '#ff63b6', c1: '#8a2fe0', c2: '#3b1389', rays: 'rgba(255,255,255,.09)', dots: 'rgba(255,255,255,.14)', conf: ['#ffe14d', '#2ee6c8', '#ffffff', '#ff9a3d', '#9d7bff'], cols: ['#ffd93b', '#5de2ff', '#b6f542', '#ffa63d'], dark: '#e0357f', spark: ['#fff', '#ffe14d'] },
    { c0: '#41d1ff', c1: '#2b57e6', c2: '#142474', rays: 'rgba(255,255,255,.08)', dots: 'rgba(255,255,255,.13)', conf: ['#ffd93b', '#ff5fa8', '#ffffff', '#3ef0c0', '#ff8a3d'], cols: ['#ffd93b', '#ff72b5', '#ffa63d'], dark: '#d1478a', spark: ['#fff', '#ffd93b'] }
  ];
  function bgPop(ctx, t, P, cx, cy) {
    ctx.fillStyle = rad(ctx, cx, cy, 80, 1450, [[0, P.c0], [.45, P.c1], [1, P.c2]]); ctx.fillRect(0, 0, 1080, 1920);
    rays(ctx, cx, cy, t, P.rays, 14);
    halftone(ctx, t, P.dots, { cx, cy });
    glow(ctx, cx, cy, 700, P.c0, .35);
  }
  const TK = { lol: 'LOL', panic: '!!!', think: '???', xd: 'XD' };

  SCENES['humor-a'] = {
    topic: 'humor', stillT: [.14, .33],
    cap: [
      { ca: 'Jo quan algú diu "només un capítol més" 😂 #humor #mood', es: 'Yo cuando alguien dice "solo un capítulo más" 😂 #humor #mood', en: 'Me when someone says "just one more episode" 😂 #humor #mood' },
      { ca: 'Tota la classe en un sol segon 🫠 #humor #cares', es: 'Toda la clase en un solo segundo 🫠 #humor #caras', en: 'The whole class in a single second 🫠 #humor #faces' }],
    draw(ctx, t, v) {
      const P = PA[v % 2], W = 1080;
      const LIST = ['lol', 'panic', 'think', 'xd'];
      if (v % 2 === 0) {
        bgPop(ctx, t, P, 540, 930);
        confetti(ctx, 46, 21, t, P.conf);
        twinkles(ctx, 12, 5, t, P.spark);
        // blobs pequeños que reaccionan
        [[170, 1440, 100, 2, .1, -1], [915, 1455, 112, 1, .24, 1]].forEach(([x, bot, R, sh, dl, side], k) => {
          const st = cycleState(t, LIST, P.cols, sh, dl), s = st.s, hop = Math.max(0, s) * R * .5;
          L.shadowEllipse(ctx, x, bot + 14, R * .95, R * .2, .3);
          drawBlob(ctx, x, bot - R * .94 - hop, R, st.ex, { col: st.col, dark: P.dark, t, sy: 1 + .2 * s, sx: 1 - .14 * s, rot: side * .06 * wave(t, 4, k * .3) + (st.ex.tear * .04 + st.ex.sweat * .03) * wave(t, 28, k), blink: blinkAmt(t, .3 + k * .4, 3), wob: .012, lx: -side * .3 });
        });
        // protagonista
        const R = 330, bot = 1265, st = cycleState(t, LIST, P.cols, 0, 0), s = st.s, hop = Math.max(0, s) * R * .5;
        L.shadowEllipse(ctx, 540, bot + 22, R * 1.0 * (1 - hop / R * .5), 52, .38);
        const shake = st.ex.tear * .035 * wave(t, 24) + st.ex.sweat * .02 * wave(t, 36) + .015 * wave(t, 2);
        const hands = [[-1.22 + st.ex.sweat * .18, .2 - st.ex.sweat * .55 + st.ex.tear * .15], [1.22 - st.ex.sweat * .18, .2 - st.ex.sweat * .55 + st.ex.tear * .15]];
        drawBlob(ctx, 540, bot - R * .94 - hop, R, st.ex, { col: st.col, dark: P.dark, t, sy: 1 + .2 * s, sx: 1 - .14 * s, rot: shake, blink: blinkAmt(t, .08), wob: .014, hands });
        // onomatopeyas
        const f = st.f, key = LIST[st.idx];
        const sc = springUp((f - .05) / .35 * 1.2) * (1 - smooth((f - .8) / .15));
        const side = st.idx % 2 ? -1 : 1, tx = 540 + side * 300, ty = 480 + (st.idx > 1 ? 30 : 0);
        token(ctx, TK[key], tx, ty, 190, { sc: sc * (1 + .05 * wave(t, 8)), rot: side * .13 + .04 * wave(t, 4), col: ['#ffd93b', '#ff5f6e', '#7cf0b4', '#ffe14d'][st.idx], spin: wave(t, 2) * .1, tcol: '#fff' });
        // "?" y "!" voladores secundarios
        const mk = (ch, x, y, sz, ph) => text(ctx, ch, x, y, { size: sz, color: '#fff', stroke: INK, strokeW: sz * .16, italic: true });
        if (key === 'think') for (let i = 0; i < 3; i++) { const a = sc * (1 - i * .1); mk('?', 220 + i * 320 + 20 * wave(t, 2, i * .3), 330 + 40 * (i % 2) + 14 * wave(t, 4, i * .2), 110 * a, 0); }
        if (key === 'panic') for (let i = 0; i < 2; i++) mk('!', 160 + i * 760 + 8 * wave(t, 20, i), 700 + i * 40, 120 * sc, 0);
      } else {
        bgPop(ctx, t, P, 540, 960);
        confetti(ctx, 40, 33, t, P.conf, { s: .9 });
        twinkles(ctx, 14, 9, t, P.spark);
        const S = [
          { x: 590, bot: 985, R: 285, ex: EX.lol, col: P.cols[0], ph: 0, tk: 'LOL', tx: 900, ty: 400, tcol: '#ff5fa8', shape: 'round' },
          { x: 270, bot: 1450, R: 200, ex: EX.panic, col: P.cols[1], ph: .33, tk: '!!!', tx: 130, ty: 1030, tcol: '#ff5f6e', shape: 'round' },
          { x: 810, bot: 1455, R: 205, ex: EX.think, col: P.cols[2], ph: .66, tk: '???', tx: 850, ty: 1020, tcol: '#3ad6c5', shape: 'round' }];
        S.forEach((b, k) => {
          const f = fract(t * 2 + b.ph), s = springS(f), hop = Math.max(0, s) * b.R * .45, R = b.R;
          L.shadowEllipse(ctx, b.x, b.bot + 16, R * .95, R * .16, .32);
          const hands = k === 0 ? [[-1.2, .4], [1.2, .4]] : k === 1 ? [[-.78, -.1], [.78, -.1]] : [[-1.15, .3], [.5, .72]];
          drawBlob(ctx, b.x, b.bot - R * .94 - hop, R, b.ex, { col: b.col, dark: P.dark, t, sy: 1 + .2 * s, sx: 1 - .14 * s, rot: (b.ex.tear * .03 + b.ex.sweat * .025) * wave(t, 26, k) + .03 * wave(t, 2, b.ph), blink: blinkAmt(t, .1 + k * .3, 2), wob: .012, hands });
          const sc = springUp(((f + .15) % 1 - 0) * 3) * 1;
          token(ctx, b.tk, b.tx, b.ty, k ? 150 : 170, { sc: (.92 + .08 * wave(t, 4, b.ph)) * (1 + .12 * Math.max(0, s)), rot: (k === 1 ? -.14 : .12) + .04 * wave(t, 4, k * .2), col: b.tcol, n: 10 + k });
        });
      }
      L.vignette(ctx, 1080, 1920, .25);
    }
  };

  /* ===================================================================== */
  /* HUMOR-B  ·  intento de salto… ¡y fail!                                */
  /* ===================================================================== */
  EX.smile = X({ open: 1, bY: -.04, mw: .3, tc: .12, bc: .22, my: .42 });
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const backOut = (u) => { u = clamp(u); const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
  function exprAt(t, kf, w = .03) {
    let i = 0; while (i < kf.length - 1 && t >= kf[i + 1][0]) i++;
    if (i >= kf.length - 1) return EX[kf[kf.length - 1][1]];
    const nx = kf[i + 1], k = smooth((t - (nx[0] - w)) / w);
    return blendX(EX[kf[i][1]], EX[nx[1]], k);
  }
  const KF_HERO = [[0, 'determined'], [.17, 'determined'], [.235, 'wow'], [.275, 'ouch'], [.335, 'ouch'], [.40, 'cry'], [.44, 'cry'], [.50, 'dizzy'], [.76, 'dizzy'], [.82, 'sheepish'], [.93, 'sheepish'], [1, 'determined']];
  const KF_FANS = [[0, 'smile'], [.20, 'smile'], [.26, 'wow'], [.42, 'wow'], [.50, 'xd'], [.74, 'xd'], [.82, 'smile'], [1, 'smile']];
  const PB = [
    { sky: ['#5fd4ff', '#a9ecff', '#fff3b8'], hill: ['#7fe0b8', '#4fc4a0'], ground: ['#ff8a5b', '#e8553f'], gtop: '#ffb199', wall: ['#ff4f9a', '#c2185b'], blob: '#ffd93b', dark: '#e0357f', fans: ['#ff72b5', '#ffffff', '#ffa63d'], cloud: '#ffffff', mirror: false, night: false },
    { sky: ['#140a3a', '#3a1d86', '#c04a9a'], hill: ['#3b1d79', '#2a1260'], ground: ['#27135c', '#150a3a'], gtop: '#5d3fd3', wall: ['#2fe3c2', '#14a58f'], blob: '#ff6fb8', dark: '#b2216b', fans: ['#ffd93b', '#b6f542', '#5de2ff'], cloud: '#7a55e0', mirror: true, night: true }
  ];
  function drawWall(ctx, P, wx, G, w, h, ang, v) {
    ctx.save(); ctx.translate(wx + w / 2, G); ctx.rotate(ang); ctx.translate(-w / 2, 0);
    const g = lin(ctx, 0, 0, w, 0, [[0, P.wall[0]], [1, P.wall[1]]]);
    if (v === 0) {
      rr(ctx, 0, -h, w, h, 14); ctx.fillStyle = g; ctx.fill(); ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(80,0,50,.35)'; ctx.lineWidth = 6; const bh = h / 8;
      for (let r = 1; r < 8; r++) { ctx.beginPath(); ctx.moveTo(0, -r * bh); ctx.lineTo(w, -r * bh); ctx.stroke(); }
      for (let r = 0; r < 8; r++) for (let c = 0; c < 3; c++) { const x = c * w / 2 + (r % 2 ? w / 4 : 0); ctx.beginPath(); ctx.moveTo(x, -r * bh); ctx.lineTo(x, -(r + 1) * bh); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(10, -h, 26, h);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, -h, w, 28);
      ctx.restore();
      rr(ctx, 0, -h, w, h, 14); ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke();
    } else {
      rr(ctx, 6, -h, w - 12, h, w / 2 - 6); ctx.fillStyle = g; ctx.fill(); ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.22)'; for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) { circle(ctx, 40 + c * 70 + (r % 2 ? 35 : 0), -h + 60 + r * 78, 17); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(22, -h, 24, h);
      ctx.restore(); rr(ctx, 6, -h, w - 12, h, w / 2 - 6); ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke();
    }
    ctx.restore();
  }
  function lineBurst(ctx, x, y, r0, r1, n, rot, col, lw) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); } ctx.stroke(); }

  SCENES['humor-b'] = {
    topic: 'humor', stillT: [.30, .53],
    cap: [
      { ca: 'El pla era perfecte. El resultat… no tant 😅 #humor #fail', es: 'El plan era perfecto. El resultado… no tanto 😅 #humor #fail', en: 'The plan was perfect. The result… not so much 😅 #humor #fail' },
      { ca: 'Intent número 99: encara no 🙃 #humor #mood', es: 'Intento número 99: todavía no 🙃 #humor #mood', en: 'Attempt number 99: not yet 🙃 #humor #mood' }],
    draw(ctx, t, v) {
      const P = PB[v % 2], W = 1080, H = 1920, G = 1285, G0 = 1345, S = 1.16, R = 150, Wl = 655, WW = 230, WH = 480, ax = 240;
      const mx = (x) => P.mirror ? W - x : x;
      // ----- fondo -----
      ctx.fillStyle = lin(ctx, 0, 0, 0, G, [[0, P.sky[0]], [.55, P.sky[1]], [1, P.sky[2]]]); ctx.fillRect(0, 0, W, H);
      if (P.night) {
        L.stars(ctx, 90, 14, t, { y1: 800, alpha: .9 });
        glow(ctx, 760, 560, 520, '#ff8ac9', .35); ctx.fillStyle = '#fff1c9'; circle(ctx, 760, 560, 130); ctx.fill(); ctx.fillStyle = 'rgba(200,170,230,.5)'; [[-40, -30, 30], [45, 30, 24], [20, -65, 16]].forEach(([dx, dy, r]) => { circle(ctx, 760 + dx, 560 + dy, r); ctx.fill(); });
        // foco de luz
        ctx.save(); ctx.globalAlpha = .16; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(mx(150), -20); ctx.lineTo(mx(390), -20); ctx.lineTo(mx(560), G); ctx.lineTo(mx(80), G); ctx.closePath(); ctx.fill(); ctx.restore();
      } else {
        glow(ctx, 250, 420, 600, '#fff6c8', .8); ctx.fillStyle = '#fff6c8'; circle(ctx, 250, 420, 105); ctx.fill();
      }
      // nubes (deriva de 1 ancho de lienzo por bucle)
      for (let i = 0; i < 3; i++) { const x = ((i * 520 + t * 1560) % 1560) - 400, y = 380 + (i % 2) * 190 + i * 24; L.cloud(ctx, x, y, 1.0 + (i % 3) * .3, P.cloud, P.night ? .22 : .9); }
      const w2s = (x, y) => [540 + (x - 540) * S, G0 + (y - G) * S];
      ctx.save(); ctx.translate(540, G0); ctx.scale(S, S); ctx.translate(-540, -G);
      // colinas
      ctx.fillStyle = P.hill[0]; ctx.beginPath(); ctx.moveTo(-300, G); for (let x = -300; x <= W + 300; x += 12) ctx.lineTo(x, 1010 - 90 * (.5 + .5 * L.ridge(x, 41 + v, 1080, 3))); ctx.lineTo(W + 300, G); ctx.fill();
      // público
      const FANS = [[150, 1030, 78, 0], [300, 1050, 62, 1], [935, 1010, 84, 2]];
      const exF = exprAt(t, KF_FANS, .04);
      FANS.forEach(([fx, fy, fr, k]) => {
        const cheer = clamp(exF.tear + exF.tongue * .5) , hop = (cheer * 14 + 4) * (.5 + .5 * wave(t, 8, k * .3)) * 1;
        drawBlob(ctx, mx(fx), fy - fr * .94 - hop, fr, exF, { col: P.fans[k], dark: P.dark, t, blink: blinkAmt(t, k * .3, 2), wob: .01, lx: P.mirror ? -.3 : .3, rot: .05 * wave(t, 4, k * .2) });
      });
      ctx.fillStyle = P.hill[1]; ctx.beginPath(); ctx.moveTo(-300, G); for (let x = -300; x <= W + 300; x += 12) ctx.lineTo(x, 1150 - 70 * (.5 + .5 * L.ridge(x + 300, 52 + v, 1080, 3))); ctx.lineTo(W + 300, G); ctx.fill();
      // suelo
      ctx.fillStyle = lin(ctx, 0, G - 14, 0, 1700, [[0, P.gtop], [.05, P.ground[0]], [1, P.ground[1]]]); ctx.fillRect(-300, G - 14, W + 600, 1400);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-300, G + 80, W + 600, 8); ctx.fillRect(-300, G + 230, W + 600, 14);
      // marcas de pista que se desplazan 2 periodos por bucle (solo decoración)
      ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = -1; i < 9; i++) { const x = ((i * 160 + t * 320) % 1440) - 160; rr(ctx, x, G + 150, 90, 12, 6); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-300, G - 14, W + 600, 14);

      // ----- animación -----
      let x = ax, h = 0, rot = 0, sx = 1, sy = 1, lx = .55;
      const br = .02 * wave(t, 8);
      if (t < .10) { }
      else if (t < .17) { const u = smooth(seg(t, .10, .17)); sy = 1 - .3 * u; sx = 1 + .22 * u; lx = .55; }
      else if (t < .275) {
        const u = seg(t, .17, .275); x = lerp(ax, Wl - R * 1.05, u); h = 560 * (1 - Math.pow((u - .6) / .6, 2));
        const k = smooth(u / .18); sy = lerp(.7, 1.22, k) - .15 * u; sx = lerp(1.22, .88, k) + .1 * u; rot = .3 * u;
      } else if (t < .335) {
        const k = smooth(seg(t, .275, .295)); const r2 = smooth(seg(t, .31, .335)); sx = lerp(1.0, .6, k) + .12 * r2; sy = lerp(1.0, 1.2, k) - .05 * r2; rot = lerp(.3, 0, k); h = 560 * .556; x = Wl - R * sx; lx = .9;
      } else if (t < .43) {
        const u = seg(t, .335, .43); h = 560 * .556 * (1 - smooth(u)); sx = lerp(.72, .95, smooth(u)); sy = lerp(1.1, 1.0, u); x = Wl - R * sx; lx = .9;
      } else if (t < .50) {
        const u = seg(t, .43, .50), e = easeInOut(u); rot = -1.5 * e; x = lerp(Wl - R * .95, 360, e); h = 44 * Math.sin(Math.PI * seg(t, .46, .50)); const lnd = Math.exp(-Math.pow((t - .50) / .012, 2)) ; sy = 1 - .16 * lnd; sx = 1 + .12 * lnd;
      } else if (t < .76) {
        rot = -1.5 + .035 * wave(t, 6); x = 360; h = 22 * Math.sin(Math.PI * seg(t, .50, .535)) * 1; sy = 1 + .02 * wave(t, 8) * 2; lx = .0;
      } else if (t < .86) {
        const u = seg(t, .76, .86); rot = -1.5 * (1 - backOut(u)); x = 360 - 20 * smooth(u); h = 60 * Math.sin(Math.PI * smooth(seg(u, .3, .9))); sy = 1 - .12 * Math.exp(-Math.pow((t - .86) / .015, 2)); lx = -.4 * smooth(u);
      } else if (t < .96) {
        const u = seg(t, .86, .96); x = lerp(340, ax, smooth(u)); h = 30 * Math.abs(Math.sin(Math.PI * u * 3)); const lnd = Math.abs(Math.sin(Math.PI * u * 3)); sy = 1 - .08 * (1 - lnd); sx = 1 + .06 * (1 - lnd); lx = -.5;
      } else { const u = smooth(seg(t, .96, 1)); x = ax; lx = lerp(-.5, .55, u); }
      sy += br; sx -= br * .6;
      const ex = exprAt(t, KF_HERO, .035);

      // pared (tambaleo tras el golpe)
      const tau = ((t - .275 + 1) % 1) * 8, wobAng = .07 * Math.exp(-1.1 * tau) * Math.sin(10 * tau);
      ctx.save(); if (P.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      L.shadowEllipse(ctx, Wl + WW / 2 + 40, G + 10, 170, 22, .3);
      drawWall(ctx, P, Wl, G, WW, WH, wobAng, v % 2);
      ctx.restore();
      // polvo y sombra
      L.shadowEllipse(ctx, mx(x), G + 8, R * (1.0 - Math.min(.5, h / 900)), 24, .3 * (1 - Math.min(.7, h / 700)));
      // estelas de velocidad en el salto
      if (t > .17 && t < .28) { const a = Math.sin(Math.PI * seg(t, .17, .28)); ctx.strokeStyle = `rgba(255,255,255,${.7 * a})`; ctx.lineWidth = 9; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(mx(x - R - 40 - i * 26), G - h - R * (.5 + i * .5)); ctx.lineTo(mx(x - R - 150 - i * 50), G - h - R * (.5 + i * .5) + 12); ctx.stroke(); } }
      // héroe
      drawBlob(ctx, mx(x), G - h - R * .94, R, ex, { col: P.blob, dark: P.dark, t, rot: P.mirror ? -rot : rot, sx, sy, lx: P.mirror ? -lx : lx, blink: (t < .17 || t > .8) ? blinkAmt(t, .5, 2) : 0, wob: .012, hands: (t > .17 && t < .3) ? [[-1.2, -.4], [1.2, -.7]] : (t > .76 && t < .9) ? [[-1.15, .25], [.5, -1.02]] : null });
      // polvo al aterrizar
      const dp = seg(t, .455, .6); if (dp > 0 && dp < 1) for (let i = 0; i < 6; i++) { const dir = i < 3 ? -1 : 1, k = (i % 3), px = mx(350 + dir * (50 + dp * (90 + k * 50))), py = G - 10 - dp * 50 - k * 12; ctx.fillStyle = `rgba(255,255,255,${.7 * (1 - dp)})`; circle(ctx, px, py, 26 + dp * 34 + k * 8); ctx.fill(); }
      // líneas de impacto
      const ip = seg(t, .275, .35); if (ip > 0 && ip < 1) lineBurst(ctx, mx(Wl + 2), G - 560 * .556 - R * .94, 150 + ip * 60, 230 + ip * 110, 10, .2, `rgba(255,255,255,${1 - ip})`, 14 * (1 - ip) + 3);
      // escombros del muro
      if (ip > 0 && ip < 1) for (let i = 0; i < 5; i++) { const px = Wl + 60 + i * 38 + 30 * ip * (i % 2 ? 1 : -1), py = G - WH + 20 + ip * ip * 520 + (i % 3) * 20; ctx.fillStyle = P.wall[1]; ctx.save(); ctx.translate(mx(px), py); ctx.rotate(ip * (3 + i)); ctx.fillRect(-9, -9, 18, 18); ctx.restore(); }
      // estrellas mareadas
      const sa = smooth(seg(t, .50, .53)) * (1 - smooth(seg(t, .73, .76)));
      if (sa > 0) for (let i = 0; i < 4; i++) { const a = TAU * (t * 10 + i / 4), sxp = 360 + 150 * Math.cos(a), syp = G - 2 * R - 20 + 34 * Math.sin(a), vis = .5 + .5 * Math.sin(a + 1.2); ctx.save(); ctx.globalAlpha = sa; sparkle(ctx, mx(sxp), syp, 30 * sa * (.8 + .4 * Math.sin(a)), i % 2 ? '#ffe14d' : '#fff', .4); ctx.restore(); }
      ctx.restore();
      // onomatopeyas
      const tk = (str, tx0, ty0, t0, t1, size, col, rot) => { const u = seg(t, t0, t1); if (u <= 0 || u >= 1) return; const [tx, ty] = [tx0, ty0]; const sc = springUp(u * 4) * (1 - smooth((u - .78) / .22)) * (1 + .04 * wave(t, 8)); token(ctx, str, P.mirror ? W - tx : tx, ty, size, { sc, rot: (P.mirror ? -1 : 1) * rot, col, spin: wave(t, 2) * .08 }); };
      tk('BOING', 205, 1010, .17, .27, 210, '#7cf0b4', -.14);
      tk('POW!', 400, 500, .275, .40, 250, '#ffd93b', .1);
      tk('BAM', 330, 1000, .475, .60, 220, '#ff7a59', -.12);
      const qs = seg(t, .80, .93); if (qs > 0 && qs < 1) token(ctx, '???', ...w2s(mx(340), G - 2 * R - 150 + 14 * wave(t, 4)), 130, { sc: springUp(qs * 4) * (1 - smooth((qs - .7) / .3)), rot: .1, col: '#fff', tcol: '#ff4f9a', flat: true, n: 9 });
      L.vignette(ctx, W, H, P.night ? .4 : .22);
    }
  };

  /* ===================================================================== */
  /* HUMOR-C  ·  sticker pack (v0) / tira de cómic (v1)                    */
  /* ===================================================================== */
  function plusPattern(ctx, t, col, sp = 120) {
    ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath();
    const off = t * sp;
    for (let r = -2; r < 1920 / sp + 2; r++) for (let c = -2; c < 1080 / sp + 2; c++) {
      const x = c * sp + (r & 1 ? sp / 2 : 0) + off, y = r * sp + off, s = 13;
      ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
    }
    ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath();
    for (let r = -2; r < 1920 / sp + 2; r++) for (let c = -2; c < 1080 / sp + 2; c++) { const x = c * sp + (r & 1 ? 0 : sp / 2) + off, y = r * sp + off; ctx.moveTo(x + 7, y); ctx.arc(x, y, 7, 0, TAU); }
    ctx.fill();
  }
  function stickerBurst(ctx, str, x, y, size, o) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(o.sc || 1, o.sc || 1);
    const ro = size * .86, ri = ro * .7; burst(ctx, 8, 12, ro + 14, ri + 12, 11, 0); ctx.fillStyle = 'rgba(30,10,50,.3)'; ctx.fill();
    burst(ctx, 0, 0, ro + 14, ri + 12, 11, 0); ctx.fillStyle = '#fff'; ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fill();
    ctx.restore(); token(ctx, str, x, y, size, o);
  }
  function stickerHeart(ctx, x, y, s, rot, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const path = () => { ctx.beginPath(); ctx.moveTo(0, .9); ctx.bezierCurveTo(-1.4, -.05, -.8, -1, 0, -.45); ctx.bezierCurveTo(.8, -1, 1.4, -.05, 0, .9); ctx.closePath(); };
    ctx.translate(.05, .07); path(); ctx.fillStyle = 'rgba(30,10,50,.3)'; ctx.fill(); ctx.translate(-.05, -.07);
    path(); ctx.lineJoin = 'round'; ctx.lineWidth = .26; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = .06; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ellipse(ctx, -.5, -.2, .14, .08, -.7); ctx.fill(); ctx.restore();
  }
  const PCs = { bg0: '#1fc6b4', bg1: '#0e8f9a', bgX: '#8ff0df' };
  const STICKERS = [
    // x, y, R, rot, expr, color, shape, fase
    [540, 905, 215, -.04, 'xd', '#ffd93b', 'round', 0],
    [235, 470, 145, -.14, 'lol', '#ff9a3d', 'cloud', .2],
    [640, 470, 118, .12, 'cool', '#5de2ff', 'squircle', .45],
    [900, 640, 112, -.12, 'love', '#ff72b5', 'star', .7],
    [140, 830, 108, .16, 'panic', '#b6f542', 'drop', .1],
    [945, 960, 106, -.1, 'think', '#a98bff', 'tri', .35],
    [250, 1235, 135, .1, 'cry', '#7aa8ff', 'bean', .6],
    [585, 1275, 120, -.08, 'sleepy', '#d2b3ff', 'round', .85],
    [870, 1250, 120, .15, 'angry', '#ff6070', 'squircle', .25],
    [150, 1470, 95, -.1, 'dizzy', '#ffe14d', 'cloud', .5],
    [945, 1470, 98, .1, 'sheepish', '#6df0b4', 'round', .05]
  ];
  function comicPanel(ctx, px, py, w, h, rot, bg, dots, fn, t) {
    ctx.save(); ctx.translate(px + w / 2, py + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
    ctx.save(); ctx.translate(10, 14); rr(ctx, 0, 0, w, h, 26); ctx.fillStyle = 'rgba(30,10,50,.32)'; ctx.fill(); ctx.restore();
    rr(ctx, 0, 0, w, h, 26); ctx.fillStyle = '#fff'; ctx.fill(); ctx.save(); rr(ctx, 14, 14, w - 28, h - 28, 16); ctx.clip(); ctx.translate(14, 14);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = dots; ctx.beginPath(); const sp = 34; for (let r = -1; r < h / sp + 2; r++) for (let c = -1; c < w / sp + 2; c++) { const x = c * sp + (r & 1 ? sp / 2 : 0), y = r * sp + (t * sp * 2) % (sp * 2) - sp, rd = 3 + 6 * clamp(Math.hypot(x - w / 2, y - h / 2) / (w * .6)); ctx.moveTo(x + rd, y); ctx.arc(x, y, rd, 0, TAU); } ctx.fill();
    fn(); ctx.restore();
    rr(ctx, 0, 0, w, h, 26); ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
  }

  SCENES['humor-c'] = {
    topic: 'humor', stillT: [.22, .6],
    cap: [
      { ca: 'Pack d\'stickers: quina cara fas tu avui? 😜 #humor #stickers', es: 'Pack de stickers: ¿qué cara pones hoy? 😜 #humor #stickers', en: 'Sticker pack: which face are you today? 😜 #humor #stickers' },
      { ca: 'Còmic de tres vinyetes sobre el meu dilluns 😂 #humor #comic', es: 'Cómic de tres viñetas sobre mi lunes 😂 #humor #comic', en: 'Three-panel comic about my Monday 😂 #humor #comic' }],
    draw(ctx, t, v) {
      const W = 1080, H = 1920;
      if (v % 2 === 0) {
        ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#2ad8c2'], [1, '#0f8f9c']]); ctx.fillRect(0, 0, W, H);
        glow(ctx, 540, 900, 900, '#a8fff0', .45);
        plusPattern(ctx, t, 'rgba(255,255,255,.22)', 120);
        STICKERS.forEach((s, k) => {
          const [x, y, R, rot, ex, col, shape, ph] = s, f = fract(t + ph), sp = springS(f);
          const pop = Math.max(0, sp);
          drawBlob(ctx, x, y + 6 * wave(t, 2, ph) - pop * 10, R, EX[ex], { col, dark: '#b2216b', t, rot: rot + .04 * wave(t, 1, ph), sx: 1 - .03 * sp, sy: 1 + .04 * sp, shape, sticker: true, blink: blinkAmt(t, ph, 1), wob: .008 });
        });
        // zzz del dormilón
        for (let i = 0; i < 3; i++) { const p = fract(t * 2 + i / 3); ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * p); text(ctx, 'Z', 700 + p * 70 + i * 14, 1195 - p * 130, { size: 50 + i * 16, color: '#fff', stroke: INK, strokeW: 10 }); ctx.restore(); }
        // decals
        stickerBurst(ctx, 'LOL', 830, 330, 105, { rot: .14, sc: 1 + .06 * wave(t, 2), col: '#ff5fa8' });
        stickerBurst(ctx, '!!!', 90, 1130, 85, { rot: -.2, sc: 1 + .06 * wave(t, 2, .3), col: '#ff7a59' });
        stickerBurst(ctx, '???', 540, 1450, 95, { rot: .06, sc: 1 + .06 * wave(t, 2, .6), col: '#a98bff' });
        stickerHeart(ctx, 420, 1380, 52, -.25, '#ff4f78'); stickerHeart(ctx, 760, 760, 38, .3, '#ffd93b');
        sparkle(ctx, 60, 330, 30 + 8 * wave(t, 2), '#fff'); sparkle(ctx, 1010, 1190, 26 + 8 * wave(t, 2, .5), '#fff'); sparkle(ctx, 420, 330, 22 + 6 * wave(t, 2, .2), '#ffe14d');
      } else {
        // fondo amarillo de cómic
        ctx.fillStyle = rad(ctx, 540, 900, 60, 1300, [[0, '#ffe65c'], [1, '#ff9a3d']]); ctx.fillRect(0, 0, W, H);
        rays(ctx, 540, 900, t, 'rgba(255,255,255,.18)', 16);
        const pw = 900, ph = 390;
        const bob = (k, a = 1) => Math.max(0, springS(fract(t * 2 + k * .27))) * a;
        comicPanel(ctx, 90, 285, pw, ph, -.012, '#8fe9ff', 'rgba(40,140,200,.28)', () => {
          const b1 = bob(0) * 26, b2 = bob(1) * 26;
          L.shadowEllipse(ctx, 250, 355, 120, 20, .3); L.shadowEllipse(ctx, 650, 355, 110, 20, .3);
          drawBlob(ctx, 230, 235 - b1, 125, EX.think, { col: '#ff9a3d', dark: '#c2185b', t, blink: blinkAmt(t, .1, 2), wob: .012, lx: .3, hands: [[-1.1, .3], [.45, .75]] });
          drawBlob(ctx, 640, 245 - b2, 112, EX.sheepish, { col: '#ffd93b', dark: '#c2185b', t, blink: blinkAmt(t, .5, 2), wob: .012, lx: -.4, rot: .04 * wave(t, 2) });
          const bs = 1 + .05 * wave(t, 4); ctx.save(); ctx.translate(590, 80); ctx.scale(bs, bs); bubble(ctx, 0, 0, 330, 130, 55, 62); text(ctx, '???', 0, 6, { size: 92, color: INK, weight: 800, italic: true }); ctx.restore();
          [[420, 100, 60], [100, 120, 48]].forEach(([x, y, sz], i) => text(ctx, '?', x + 6 * wave(t, 2, i * .3), y + 8 * wave(t, 4, i * .2), { size: sz, color: '#fff', stroke: INK, strokeW: sz * .2, italic: true }));
        }, t);
        comicPanel(ctx, 90, 715, pw, ph, .01, '#ffb3d9', 'rgba(220,60,140,.25)', () => {
          rays(ctx, 330, 230, t, 'rgba(255,255,255,.35)', 12, 900);
          const b1 = bob(2) * 20;
          L.shadowEllipse(ctx, 330, 350, 150, 22, .3); L.shadowEllipse(ctx, 740, 350, 90, 16, .3);
          drawBlob(ctx, 330, 215 - b1, 150, EX.panic, { col: '#ff9a3d', dark: '#c2185b', t, rot: .03 * wave(t, 30), blink: 0, wob: .014, hands: [[-1.3, -.15], [1.3, -.15]] });
          drawBlob(ctx, 745, 270 - bob(3) * 14, 90, EX.wow, { col: '#ffd93b', dark: '#c2185b', t, blink: blinkAmt(t, .2, 2), wob: .012, lx: -.4 });
          token(ctx, '!!!', 600, 95, 110, { sc: 1 + .08 * wave(t, 4), rot: .12, col: '#ff5f6e' });
        }, t);
        comicPanel(ctx, 90, 1140, pw, ph, -.008, '#c9f77a', 'rgba(60,170,60,.25)', () => {
          const b1 = bob(4) * 24, b2 = bob(5) * 24;
          L.shadowEllipse(ctx, 255, 355, 120, 20, .3); L.shadowEllipse(ctx, 650, 355, 118, 20, .3);
          drawBlob(ctx, 250, 235 - b1, 125, EX.xd, { col: '#ff9a3d', dark: '#c2185b', t, rot: .035 * wave(t, 24), wob: .012, hands: [[-1.15, .35], [1.15, .35]] });
          drawBlob(ctx, 650, 238 - b2, 120, EX.lol, { col: '#ffd93b', dark: '#c2185b', t, rot: -.035 * wave(t, 24, .3), wob: .012, hands: [[-1.15, .35], [1.15, .35]] });
          token(ctx, 'LOL', 455, 78, 85, { sc: 1 + .07 * wave(t, 4), rot: -.1, col: '#ff5fa8' });
          token(ctx, 'XD', 800, 90, 80, { sc: 1 + .07 * wave(t, 4, .5), rot: .12, col: '#3ad6c5' });
        }, t);
        sparkle(ctx, 70, 250, 28 + 8 * wave(t, 2), '#fff'); sparkle(ctx, 1020, 1590, 26 + 8 * wave(t, 2, .5), '#fff');
      }
      L.vignette(ctx, W, H, .2);
    }
  };
})();
