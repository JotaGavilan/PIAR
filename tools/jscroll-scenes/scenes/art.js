/* ART – a: pintura generativa que se dibuja sola (flujo de pinceladas) · b: tinta/acuarela que florece (v0) y mandala de luz (v1) · c: foto (paleta de óleo / sala de museo) */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, halo, rng, circle, ellipse, mix, lerp, clamp, smooth, easeOut, easeInOut, noise, fbm } = L;
  const W = 1080, H = 1920;

  /* textura de papel (baldosa precalculada, determinista) */
  let _paper = null;
  function paperTile() {
    if (_paper) return _paper;
    const c = document.createElement('canvas'); c.width = c.height = 384; const g = c.getContext('2d'), r = rng(404);
    for (let i = 0; i < 900; i++) { const x = r() * 384, y = r() * 384, l = 6 + r() * 26, a = r() * TAU; g.strokeStyle = r() < .5 ? 'rgba(120,90,50,.07)' : 'rgba(255,255,255,.22)'; g.lineWidth = .8 + r() * .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 1400; i++) { g.fillStyle = r() < .5 ? 'rgba(110,80,40,.06)' : 'rgba(255,255,255,.2)'; g.fillRect(r() * 384, r() * 384, 1 + r() * 2, 1 + r() * 2); }
    _paper = c; return c;
  }
  function paper(ctx, x, y, w, h, base, shade) {
    ctx.fillStyle = lin(ctx, x, y, x + w, y + h, [[0, base], [1, shade]]); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = ctx.createPattern(paperTile(), 'repeat'); ctx.fillRect(x, y, w, h);
  }
  function tape(ctx, x, y, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = 'rgba(0,0,0,.18)'; L.rr(ctx, -80, -26 + 6, 160, 52, 4); ctx.fill(); ctx.fillStyle = 'rgba(244,226,176,.88)'; ctx.beginPath(); const z = 5; ctx.moveTo(-80, -26); for (let i = 0; i <= 6; i++) ctx.lineTo(-80 + i * 160 / 6, -26 + (i % 2 ? z : 0)); ctx.lineTo(80, 26); for (let i = 6; i >= 0; i--) ctx.lineTo(-80 + i * 160 / 6, 26 - (i % 2 ? z : 0)); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-80, -26, 160, 14); ctx.restore(); }

  /* ---------- ART-A: pintura generativa ---------- */
  const PX = 110, PY = 300, PW = 860, PH = 1200;
  const AP = [
    { pal: ['#17255a', '#2f4bb8', '#ff5d73', '#ffb347', '#ffe6a7', '#2ec4b6'], paper: ['#f7eeda', '#eadcc0'], back: ['#1d1b33', '#0d0c1c'], field: 0, seed: 11 },
    { pal: ['#0b1d4a', '#1f56d6', '#3fb8f2', '#ffd84a', '#f6a6d0', '#14b8a6'], paper: ['#f1eaf4', '#ddd0e6'], back: ['#2b1d16', '#120b08'], field: 1, seed: 29 }
  ];
  const _strokeCache = {};
  function flowAngle(x, y, P) {
    if (P.field === 0) return fbm(x * .0016 + 5, y * .0016 + 2, 3) * TAU * 1.1 + .7 * Math.sin(y * .0042 + 1) + .3;
    const C = [[330, 650, 1], [760, 980, -1], [430, 1280, 1], [800, 520, -.6]]; let vx = 0, vy = 0;
    C.forEach(([cx, cy, s]) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) + 70, k = s * 9000 / (d * d + 20000) * 60; vx += -dy / d * k; vy += dx / d * k; });
    vx += Math.cos(fbm(x * .003, y * .003, 2) * 3) * .35; vy += Math.sin(fbm(x * .003, y * .003, 2) * 3) * .35;
    return Math.atan2(vy, vx);
  }
  function makeStrokes(v) {
    if (_strokeCache[v]) return _strokeCache[v];
    const P = AP[v % AP.length], r = rng(P.seed * 13), out = [];
    const layers = [{ n: 84, w: [100, 150], st: [34, 46], ds: 18, t0: .02, t1: .3, dur: [.07, .1], wash: true }, { n: 170, w: [34, 62], st: [22, 36], ds: 14, t0: .14, t1: .64, dur: [.045, .07] }, { n: 230, w: [12, 28], st: [14, 26], ds: 12, t0: .36, t1: .84, dur: [.03, .05] }];
    layers.forEach((Ly, li) => {
      for (let i = 0; i < Ly.n; i++) {
        let x = PX + (li === 0 ? ((i % 6) + r()) / 6 * PW : r() * PW), y = PY + (li === 0 ? (Math.floor(i / 6) + r()) / (Ly.n / 6) * PH : r() * PH);
        const n = Math.round(lerp(Ly.st[0], Ly.st[1], r())), pts = [], wmax = lerp(Ly.w[0], Ly.w[1], r()), off = (r() - .5) * .7;
        const nz = clamp(.5 + .5 * Math.sin(x * .0042 + y * .0027 + fbm(x * .002, y * .002 + P.seed, 2) * 7)), yy = (y - PY) / PH;
        let ci = P.field === 0 ? Math.min(4, Math.floor(clamp(yy * .7 + nz * .4 - .02 + (r() - .5) * .16) * 5)) : Math.min(P.pal.length - 1, Math.floor(clamp(nz + (r() - .5) * .3) * P.pal.length)); if (P.field === 0 && r() < .1) ci = 5;
        let base = P.pal[ci]; if (li === 2 && r() < .3) base = P.pal[2 + Math.floor(r() * 3)];
        const col = r() < .5 ? mix(base, '#ffffff', r() * .22) : mix(base, '#000000', r() * .16);
        let a = flowAngle(x, y, P) + off;
        for (let k = 0; k < n; k++) { pts.push([x, y]); const na = flowAngle(x, y, P) + off; let da = na - a; da = Math.atan2(Math.sin(da), Math.cos(da)); a += da * .45; x += Math.cos(a) * Ly.ds; y += Math.sin(a) * Ly.ds; }
        /* geometría del trazo: bordes izq/dcho con perfil de ancho */
        const L1 = [], R1 = [], cum = [0];
        for (let k = 0; k < pts.length; k++) {
          const p0 = pts[Math.max(0, k - 1)], p1 = pts[Math.min(pts.length - 1, k + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], d = Math.hypot(dx, dy) || 1, u = k / (pts.length - 1);
          const w = wmax * (.18 + .82 * Math.pow(Math.sin(Math.PI * Math.min(1, .12 + u * .95)), .6)) * (li === 0 ? 1 : (1 - .25 * u)) / 2, nx = -dy / d, ny = dx / d;
          L1.push([pts[k][0] + nx * w, pts[k][1] + ny * w]); R1.push([pts[k][0] - nx * w, pts[k][1] - ny * w]);
        }
        const bris = []; for (let b = 0; b < (li === 1 ? 4 : li === 2 ? 1 : 2); b++) bris.push({ o: (r() - .5) * 1.5, c: b % 2 ? mix(col, '#ffffff', .38) : mix(col, '#000000', .28), w: 1.8 + r() * 2 });
        const t0 = Ly.t0 + (Ly.t1 - Ly.t0) * (i + r() * .6) / Ly.n, dur = lerp(Ly.dur[0], Ly.dur[1], r());
        const nn = pts.length, full = new Path2D(); full.moveTo(L1[0][0], L1[0][1]); for (let i = 1; i < nn; i++) full.lineTo(L1[i][0], L1[i][1]); for (let i = nn - 1; i >= 0; i--) full.lineTo(R1[i][0], R1[i][1]); full.closePath();
        const bp = [new Path2D(), new Path2D()]; bris.forEach((b, bi) => { const q = bp[bi % 2]; for (let i = 0; i < nn; i++) { const px = L1[i][0] + (R1[i][0] - L1[i][0]) * (.5 + b.o * .42), py = L1[i][1] + (R1[i][1] - L1[i][1]) * (.5 + b.o * .42); i ? q.lineTo(px, py) : q.moveTo(px, py); if (i === 0) {} } });
        out.push({ pts, L1, R1, col, bris, t0, dur, wash: !!Ly.wash, wmax, full, bp });
      }
    });
    return _strokeCache[v] = out;
  }
  function drawStroke(ctx, s, p, v) {
    const n = s.pts.length, m = p * (n - 1), k = Math.floor(m), f = m - k; if (m <= 0) return;
    if (p >= 1) { ctx.fillStyle = s.col; ctx.fill(s.full); ctx.lineCap = 'round'; const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * .5; ctx.lineWidth = s.wmax > 60 ? 4.5 : 2.6; if (s.bris.length > 1) { ctx.strokeStyle = s.bris[1].c; ctx.stroke(s.bp[1]); } ctx.strokeStyle = s.bris[0].c; ctx.stroke(s.bp[0]); ctx.globalAlpha = a0; return; }
    const L1 = s.L1, R1 = s.R1, last = Math.min(n - 1, k);
    const ex = (A) => { const a = A[last], b = A[Math.min(n - 1, last + 1)]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
    ctx.beginPath(); ctx.moveTo(L1[0][0], L1[0][1]);
    for (let i = 1; i <= last; i++) ctx.lineTo(L1[i][0], L1[i][1]);
    const e = ex(L1), e2 = ex(R1); ctx.lineTo(e[0], e[1]); ctx.lineTo(e2[0], e2[1]);
    for (let i = last; i >= 0; i--) ctx.lineTo(R1[i][0], R1[i][1]);
    ctx.closePath(); ctx.fillStyle = s.col; ctx.fill();
    ctx.lineCap = 'round'; const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * .5; ctx.lineWidth = s.wmax > 60 ? 4.5 : 2.6;
    s.bris.forEach((b, bi) => {
      if (bi > 1) return; ctx.strokeStyle = b.c; ctx.beginPath();
      for (let i = 0; i <= last; i++) { const px = L1[i][0] + (R1[i][0] - L1[i][0]) * (.5 + b.o * .42), py = L1[i][1] + (R1[i][1] - L1[i][1]) * (.5 + b.o * .42); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    });
    ctx.globalAlpha = a0;
  }
  SCENES['art-a'] = {
    topic: 'art', stillT: [.82, .7],
    cap: [
      { ca: 'Un quadre que es pinta sol, pinzellada a pinzellada 🎨 #art #pintura', es: 'Un cuadro que se pinta solo, pincelada a pincelada 🎨 #arte #pintura', en: 'A painting that paints itself, stroke by stroke 🎨 #art #painting' },
      { ca: 'Remolins de pintura nocturna, estil impressionista 🌌 #art #color', es: 'Remolinos de pintura nocturna, estilo impresionista 🌌 #arte #color', en: 'Night swirls of paint, impressionist vibes 🌌 #art #color' }],
    draw(ctx, t, v) {
      const P = AP[v % AP.length], S = makeStrokes(v);
      ctx.fillStyle = lin(ctx, 0, 0, W, H, [[0, P.back[0]], [1, P.back[1]]]); ctx.fillRect(0, 0, W, H);
      halo(ctx, 540, 900, 900, P.pal[1], .12);
      /* hoja */
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; ctx.fillStyle = P.paper[0]; ctx.fillRect(60, 250, 960, 1300); ctx.restore();
      paper(ctx, 60, 250, 960, 1300, P.paper[0], P.paper[1]);
      /* lienzo de trabajo (suave marca de lápiz) */
      ctx.strokeStyle = 'rgba(120,100,80,.25)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.strokeRect(PX - 14, PY - 14, PW + 28, PH + 28); ctx.setLineDash([]);
      const fade = 1 - smooth((t - .88) / .09);
      ctx.save(); ctx.beginPath(); ctx.rect(PX, PY, PW, PH); ctx.clip(); ctx.globalAlpha = fade;
      let heads = [];
      for (let i = 0; i < S.length; i++) {
        const s = S[i], q = (t - s.t0) / s.dur; if (q <= 0) continue; const p = easeInOut(clamp(q)); drawStroke(ctx, s, p, v);
        if (q < 1 && p > 0) { const m = p * (s.pts.length - 1), k = Math.floor(m), pt = s.pts[Math.min(k, s.pts.length - 1)]; heads.push([pt[0], pt[1], s.col, s.wmax]); }
      }
      ctx.globalAlpha = fade;
      heads.forEach(([x, y, c, w]) => { ctx.fillStyle = 'rgba(255,255,255,.8)'; circle(ctx, x, y, Math.max(4, w * .12)); ctx.fill(); });
      ctx.restore();
      /* sombra interior del papel y cintas */
      tape(ctx, 130, 290, -.5); tape(ctx, 950, 290, .5); tape(ctx, 130, 1510, .5); tape(ctx, 950, 1510, -.5);
      L.vignette(ctx, W, H, .35);
    }
  };

  /* ---------- ART-B ---------- */
  const INK = ['#e8386d', '#ff9a1f', '#17b8a6', '#2f7bff', '#8a3ffc', '#f2c200'];
  function inkBlob(ctx, cx, cy, R, ph, t, k, pts = 56) {
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const a = i / pts * TAU, rr = R * (1 + .09 * Math.sin(2 * a + ph[0] + TAU * t * k) + .07 * Math.sin(3 * a + ph[1] - TAU * t) + .045 * Math.sin(5 * a + ph[2] + TAU * t * 2) + .025 * Math.sin(9 * a + ph[3]));
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const DROPS_CACHE = {};
  function drops(v) {
    if (DROPS_CACHE[v]) return DROPS_CACHE[v];
    const r = rng(2024 + v * 7), out = [], spots = [[300, 520], [720, 460], [520, 800], [250, 1020], [800, 1010], [540, 1250], [330, 1380], [790, 1330], [150, 720], [930, 760], [560, 360]];
    spots.forEach((sp, i) => out.push({ x: sp[0] + (r() - .5) * 60, y: sp[1] + (r() - .5) * 60, R: 190 + r() * 150, c: INK[(i * 5 + v) % INK.length], c2: INK[(i * 5 + 1 + v) % INK.length], ph: (i * 0.0917 + r() * .05) % 1, wph: [r() * TAU, r() * TAU, r() * TAU, r() * TAU], feathers: Array.from({ length: 16 }, () => ({ a: r() * TAU, l: .25 + r() * .55, c: (r() - .5) * 1.6 })), dots: Array.from({ length: 16 }, () => ({ a: r() * TAU, d: .85 + r() * .5, s: 2 + r() * 5 })) }));
    return DROPS_CACHE[v] = out;
  }
  function inkDrop(ctx, d, t) {
    const p = ((t + d.ph) % 1 + 1) % 1, fall = .07;
    if (p < fall) { const q = p / fall, y = d.y - 560 * (1 - q) * (1 - q); ctx.globalAlpha = Math.min(1, q * 4) * .9; ctx.fillStyle = d.c; ctx.beginPath(); ctx.ellipse(d.x, y, 11, 17 + 30 * (1 - q), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; return; }
    const g = (p - fall) / (1 - fall), grow = .12 + .88 * easeOut(Math.min(1, g / .8)), al = smooth(g / .06) * (1 - smooth((g - .62) / .38)), R = d.R * grow;
    if (al <= .002) return;
    const ph = d.wph, k = 1;
    ctx.save();
    /* plumas que se estiran fuera del borde */
    ctx.lineCap = 'round'; ctx.strokeStyle = d.c; ctx.lineWidth = 2.5; ctx.globalAlpha = al * .38;
    d.feathers.forEach((f) => { const a = f.a + .15 * Math.sin(TAU * t + f.a), r0 = R * .96, r1 = R * (1 + f.l * .5 * grow), x0 = d.x + Math.cos(a) * r0, y0 = d.y + Math.sin(a) * r0, x1 = d.x + Math.cos(a + f.c * .25) * r1, y1 = d.y + Math.sin(a + f.c * .25) * r1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + Math.cos(a + 1.57) * f.c * 18, (y0 + y1) / 2 + Math.sin(a + 1.57) * f.c * 18, x1, y1); ctx.stroke(); });
    /* mancha principal: relleno + borde cargado de pigmento */
    ctx.globalAlpha = al; ctx.fillStyle = rad(ctx, d.x, d.y, R * .05, R * 1.05, [[0, hexA(d.c2, .38)], [.55, hexA(d.c, .3)], [.9, hexA(d.c, .52)], [1, hexA(d.c, .6)]]); inkBlob(ctx, d.x, d.y, R, ph, t, k); ctx.fill();
    ctx.globalAlpha = al * .6; ctx.lineWidth = 4 + R * .016; ctx.strokeStyle = d.c; ctx.stroke();
    ctx.globalAlpha = al; ctx.fillStyle = rad(ctx, d.x, d.y, 0, R * .62, [[0, hexA(d.c2, .5)], [.7, hexA(d.c2, .28)], [1, hexA(d.c2, .0)]]); inkBlob(ctx, d.x + R * .05, d.y - R * .04, R * .62, [ph[1], ph[2], ph[3], ph[0]], t, k); ctx.fill();
    ctx.globalAlpha = al * .5; ctx.lineWidth = 2.5; ctx.strokeStyle = d.c2; ctx.stroke();
    ctx.globalAlpha = al * .6; ctx.fillStyle = d.c; circle(ctx, d.x - R * .02, d.y + R * .02, R * .1 * (.8 + .2 * wave(t, 1, d.ph))); ctx.fill();
    /* pigmento salpicado */
    ctx.globalAlpha = al * .55; ctx.fillStyle = d.c;
    d.dots.forEach((q) => { circle(ctx, d.x + Math.cos(q.a) * R * q.d * (.9 + .1 * grow), d.y + Math.sin(q.a) * R * q.d * (.9 + .1 * grow), q.s * grow); ctx.fill(); });
    ctx.restore();
  }
  /* ---- mandala de luz ---- */
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const MAN = [
    { R: 12, r: 5, d: .95, rin: 345, rout: 495, dir: 1, ph: 0, cols: ['#ff4d9d', '#ffb347', '#fff3a8'] },
    { R: 9, r: 4, d: .85, rin: 225, rout: 345, dir: -1, ph: .2, cols: ['#3a8bff', '#38e8d0', '#c4fff2'] },
    { R: 8, r: 3, d: .9, rin: 130, rout: 240, dir: 1, ph: .5, cols: ['#b06bff', '#ff8ad8', '#ffffff'] },
    { R: 7, r: 3, d: .85, rin: 46, rout: 142, dir: -1, ph: .7, cols: ['#ff7a45', '#ffd84a', '#fffbd0'] }
  ];
  function spiro(ctx, cx, cy, m, t, i) {
    const g = gcd(m.R, m.r), n = m.R / g, turns = m.r / g, N = Math.max(300, n * 56), dd = m.d * (1 + .2 * wave(t, 1, m.ph));
    const A = m.R - m.r, rmax = A + dd * m.r, rmin = Math.abs(A - dd * m.r), rot = m.dir * TAU * t / n + m.ph * TAU;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.beginPath();
    for (let k = 0; k <= N; k++) {
      const th = k / N * TAU * turns, x = A * Math.cos(th) + dd * m.r * Math.cos(A / m.r * th), y = A * Math.sin(th) - dd * m.r * Math.sin(A / m.r * th), rho = Math.hypot(x, y) || 1e-6;
      const k2 = (m.rin + (rho - rmin) / (rmax - rmin) * (m.rout - m.rin)) / rho; k ? ctx.lineTo(x * k2, y * k2) : ctx.moveTo(x * k2, y * k2);
    }
    ctx.lineJoin = 'round'; ctx.strokeStyle = rad(ctx, 0, 0, m.rin * .8, m.rout, [[0, m.cols[0]], [.55, m.cols[1]], [1, m.cols[2]]]);
    ctx.globalAlpha = .1; ctx.fillStyle = ctx.strokeStyle; ctx.fill(); ctx.globalAlpha = .12; ctx.lineWidth = 30; ctx.stroke(); ctx.globalAlpha = .35; ctx.lineWidth = 10; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.restore();
  }
  function mandala(ctx, t) {
    const cx = 540, cy = 880;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#06031a'], [.5, '#150a3a'], [1, '#05030f']]); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    halo(ctx, cx, cy, 760, '#7a2cff', .35 + .06 * wave(t, 1)); halo(ctx, cx, cy, 420, '#ff3d9a', .25); halo(ctx, cx, cy, 160, '#fff1c9', .5 + .1 * wave(t, 2));
    /* anillos exteriores con puntos que giran */
    [[525, 72, 1, 4.5], [560, 96, -1, 3.5]].forEach(([rr, n, dir, s], j) => {
      ctx.strokeStyle = 'rgba(190,170,255,.35)'; ctx.lineWidth = 2; circle(ctx, cx, cy, rr); ctx.stroke();
      for (let i = 0; i < n; i++) { const a = i / n * TAU + dir * TAU * t / n * 3; ctx.globalAlpha = .45 + .55 * wave01(t, 3, i / n * 3); ctx.fillStyle = i % 3 ? '#cdbbff' : '#ffd1f0'; circle(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, s * (i % 3 ? 1 : 1.7)); ctx.fill(); }
      ctx.globalAlpha = 1;
    });
    MAN.forEach((m, i) => spiro(ctx, cx, cy, m, t, i));
    /* pétalos de luz en el centro */
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + TAU * t / 12; ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.globalAlpha = .55; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ellipse(ctx, 0, 52 + 8 * wave(t, 1, i / 12), 14, 44); ctx.stroke(); ctx.restore(); }
    ctx.restore();
    /* destellos que suben */
    L.loopParticles(30, 71, t, (i, p, r) => { const x = cx + (r() - .5) * 900, y = 1700 - p * 1500, s = 2 + r() * 3.5; ctx.globalAlpha = .8 * Math.sin(Math.PI * p); ctx.fillStyle = ['#ffd1f0', '#bfe6ff', '#fff3b8'][i % 3]; circle(ctx, x, y, s); ctx.fill(); ctx.globalAlpha = 1; });
  }
  SCENES['art-b'] = {
    topic: 'art', stillT: [.45, .3],
    cap: [
      { ca: 'Gotes de tinta que floreixen i es barregen sobre paper 💧 #art #aquarel·la', es: 'Gotas de tinta que florecen y se mezclan sobre papel 💧 #arte #acuarela', en: 'Ink drops blooming and blending on paper 💧 #art #watercolor' },
      { ca: 'Mandala de llum que gira i no para 🔮 #art #geometria', es: 'Mandala de luz que gira sin parar 🔮 #arte #geometría', en: 'A light mandala that never stops spinning 🔮 #art #geometry' }],
    draw(ctx, t, v) {
      if (v % 2) { mandala(ctx, t); L.vignette(ctx, W, H, .5); return; }
      ctx.fillStyle = '#2a2430'; ctx.fillRect(0, 0, W, H);
      paper(ctx, 0, 0, W, H, '#fbf5e6', '#efe2c8');
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      drops(v).forEach((d) => inkDrop(ctx, d, t));
      ctx.restore();
      ctx.fillStyle = rad(ctx, 540, 900, 500, 1250, [[0, 'rgba(120,80,30,0)'], [1, 'rgba(120,80,30,.22)']]); ctx.fillRect(0, 0, W, H);
    }
  };

  /* ---------- ART-C (foto) ---------- */
  const PIG = ['#e8283c', '#ff8a1f', '#ffd21f', '#26b36b', '#16b8c9', '#2a5bff', '#8b3dff', '#ff5fa2', '#fff6e8'];
  function smoothPath(ctx, pts, dx = 0, dy = 0) {
    const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy];
    ctx.beginPath(); let m = mid(pts[n - 1], pts[0]); ctx.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = mid(p, pts[(i + 1) % n]); ctx.quadraticCurveTo(p[0] + dx, p[1] + dy, q[0], q[1]); }
    ctx.closePath();
  }
  function oilBlob(ctx, x, y, r, col, seed, t) {
    const q = rng(seed), n = 12, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = r * (.78 + .38 * q()); pts.push([x + Math.cos(a) * rr * 1.12, y + Math.sin(a) * rr * .92]); }
    smoothPath(ctx, pts, r * .1, r * .16); ctx.fillStyle = 'rgba(15,5,20,.42)'; ctx.fill();
    smoothPath(ctx, pts);
    ctx.fillStyle = rad(ctx, x - r * .3, y - r * .35, r * .08, r * 1.25, [[0, mix(col, '#ffffff', .5)], [.45, col], [1, mix(col, '#1a0010', .45)]]); ctx.fill();
    ctx.save(); smoothPath(ctx, pts); ctx.clip();
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const a0 = q() * TAU, rr = r * (.25 + q() * .6); ctx.lineWidth = r * (.05 + q() * .06); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(x + r * .02, y + r * .03, rr, a0, a0 + 1 + q()); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth *= .6; ctx.beginPath(); ctx.arc(x - r * .02, y - r * .02, rr, a0, a0 + 1 + q()); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.beginPath(); ctx.ellipse(x - r * .32, y - r * .4, r * .3, r * .12, -.6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; circle(ctx, x - r * .46, y - r * .32, r * .045); ctx.fill();
  }
  function bez(p, u) { const a = 1 - u; return [a * a * a * p[0] + 3 * a * a * u * p[2] + 3 * a * u * u * p[4] + u * u * u * p[6], a * a * a * p[1] + 3 * a * a * u * p[3] + 3 * a * u * u * p[5] + u * u * u * p[7]]; }
  function swoosh(ctx, p, w, c0, c1, seed, alpha = 1) {
    const q = rng(seed), N = 48, L1 = [], R1 = [];
    for (let i = 0; i <= N; i++) { const u = i / N, a = bez(p, Math.max(0, u - .01)), b = bez(p, Math.min(1, u + .01)), c = bez(p, u), dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, ww = w * (.12 + .88 * Math.pow(Math.sin(Math.PI * Math.min(1, u * .9 + .08)), .5)) * (1 + .08 * Math.sin(u * 40 + seed)) / 2; L1.push([c[0] - dy / d * ww, c[1] + dx / d * ww]); R1.push([c[0] + dy / d * ww, c[1] - dx / d * ww]); }
    ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); L1.forEach((a, i) => i ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1])); for (let i = N; i >= 0; i--) ctx.lineTo(R1[i][0], R1[i][1]); ctx.closePath();
    ctx.fillStyle = lin(ctx, p[0], p[1], p[6], p[7], [[0, c0], [1, c1]]); ctx.fill(); ctx.clip();
    ctx.lineCap = 'round';
    for (let b = 0; b < 9; b++) { const o = (q() - .5) * .9, light = b % 2; ctx.strokeStyle = light ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.2)'; ctx.lineWidth = 2 + q() * 4; ctx.beginPath(); for (let i = 0; i <= N; i++) { const x = (L1[i][0] + R1[i][0]) / 2 + (R1[i][0] - L1[i][0]) * o * .5, y = (L1[i][1] + R1[i][1]) / 2 + (R1[i][1] - L1[i][1]) * o * .5; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    ctx.restore();
  }
  function brush(ctx, x, y, ang, len, col, hand, ferr) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    /* sombra */
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.moveTo(0, -12 + 14); ctx.lineTo(len * .55, -22 + 14); ctx.lineTo(len * .55, 22 + 14); ctx.lineTo(0, 14 + 14); ctx.closePath(); ctx.fill();
    /* mango: de punta (0) hacia el extremo (len) */
    ctx.fillStyle = lin(ctx, 0, -22, 0, 22, [[0, mix(hand, '#ffffff', .35)], [.5, hand], [1, mix(hand, '#000000', .45)]]);
    ctx.beginPath(); ctx.moveTo(len * .26, -13); ctx.lineTo(len * .62, -21); ctx.quadraticCurveTo(len * .93, -24, len, -13); ctx.lineTo(len, 13); ctx.quadraticCurveTo(len * .93, 24, len * .62, 21); ctx.lineTo(len * .26, 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(len * .3, -9, len * .62, 4);
    /* virola */
    ctx.fillStyle = lin(ctx, 0, -16, 0, 16, [[0, '#fff3cf'], [.35, ferr], [1, '#6b5a3a']]); ctx.fillRect(len * .15, -14, len * .13, 28);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 3; i++) ctx.fillRect(len * (.17 + i * .035), -14, 3, 28);
    /* cerdas con pintura */
    ctx.fillStyle = lin(ctx, 0, -14, 0, 14, [[0, mix(col, '#ffffff', .4)], [.5, col], [1, mix(col, '#000000', .4)]]);
    ctx.beginPath(); ctx.moveTo(len * .15, -13); ctx.quadraticCurveTo(len * .05, -16, -len * .02, -3); ctx.quadraticCurveTo(-len * .06, 0, -len * .02, 4); ctx.quadraticCurveTo(len * .05, 15, len * .15, 13); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(len * .12, -7); ctx.lineTo(-len * .02, -1); ctx.stroke();
    ctx.restore();
  }
  function paletteScene(ctx, t) {
    const cx = 520, cy = 880, q = rng(808);
    ctx.fillStyle = lin(ctx, 0, 0, W, H, [[0, '#1b1030'], [.5, '#120a24'], [1, '#07040f']]); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    halo(ctx, 250, 450, 520, '#ff3d8b', .28); halo(ctx, 850, 600, 560, '#2a6bff', .3); halo(ctx, 800, 1300, 520, '#ffb21f', .24); halo(ctx, 240, 1250, 480, '#16c9b4', .24); ctx.restore();
    /* brochazos grandes de fondo */
    swoosh(ctx, [60, 1250, 250, 760, 700, 1150, 1040, 520], 150, '#ff4d8d', '#ffb347', 3, .9);
    swoosh(ctx, [1040, 1450, 800, 1050, 330, 1400, 30, 760], 110, '#2a6bff', '#16d1c4', 8, .85);
    swoosh(ctx, [120, 360, 420, 300, 760, 520, 990, 330], 90, '#ffd21f', '#ff6a2a', 5, .85);
    /* paleta de madera */
    ctx.save(); ctx.translate(548, 950); ctx.scale(1.2, 1.2); ctx.translate(-cx, -cy);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.2);
    const body = () => { ctx.beginPath(); ctx.moveTo(-330, -40); ctx.bezierCurveTo(-330, -270, -40, -340, 210, -296); ctx.bezierCurveTo(400, -262, 430, -70, 340, 70); ctx.bezierCurveTo(280, 160, 160, 120, 118, 206); ctx.bezierCurveTo(44, 340, -230, 336, -322, 170); ctx.bezierCurveTo(-364, 94, -330, 20, -330, -40); ctx.closePath(); };
    ctx.save(); ctx.translate(22, 40); body(); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill(); ctx.restore();
    body(); ctx.fillStyle = lin(ctx, -330, -300, 400, 330, [[0, '#f0bd7c'], [.5, '#d08e52'], [1, '#8c5128']]); ctx.fill();
    ctx.save(); body(); ctx.clip();
    for (let i = 0; i < 26; i++) { ctx.strokeStyle = i % 2 ? 'rgba(90,45,15,.1)' : 'rgba(255,230,180,.12)'; ctx.lineWidth = 2 + q() * 4; ctx.beginPath(); const y0 = -340 + i * 28; ctx.moveTo(-420, y0); ctx.bezierCurveTo(-150, y0 + 30 * Math.sin(i), 150, y0 - 40, 450, y0 + 20 * Math.cos(i)); ctx.stroke(); }
    ctx.fillStyle = rad(ctx, -150, -200, 20, 520, [[0, 'rgba(255,240,200,.35)'], [1, 'rgba(255,240,200,0)']]); ctx.fillRect(-400, -360, 850, 720);
    ctx.restore();
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,235,190,.7)'; body(); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(70,30,10,.55)'; ctx.save(); ctx.translate(0, 3); body(); ctx.stroke(); ctx.restore();
    /* agujero del pulgar */
    ctx.beginPath(); ctx.ellipse(-200, 120, 46, 34, -.3, 0, TAU); ctx.fillStyle = '#150a22'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,230,180,.55)'; ctx.stroke();
    ctx.restore();
    /* mezclas y pegotes */
    const R0 = (x, y) => [cx + x * Math.cos(-.2) - y * Math.sin(-.2), cy + x * Math.sin(-.2) + y * Math.cos(-.2)];
    const spots = [[-250, -180, 66, 0], [-120, -250, 58, 1], [30, -262, 70, 2], [190, -218, 62, 3], [300, -100, 56, 4], [-170, -60, 48, 5], [-40, 180, 54, 6], [260, 30, 44, 7], [150, 150, 40, 8]];
    /* mezcla en el centro */
    ctx.lineCap = 'round';
    [[-100, -30, 150, -20, '#ff8a1f', '#ffd21f'], [-60, 40, 200, 60, '#ff5fa2', '#8b3dff'], [-10, -110, 160, -80, '#16b8c9', '#26b36b']].forEach(([x0, y0, x1, y1, c0, c1], i) => { const a = R0(x0, y0), b = R0(x1, y1); ctx.lineWidth = 44; ctx.strokeStyle = lin(ctx, a[0], a[1], b[0], b[1], [[0, c0], [1, c1]]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2 + 30, (a[1] + b[1]) / 2 - 24 * (i - 1), b[0], b[1]); ctx.stroke(); ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.stroke(); });
    spots.forEach(([x, y, r, ci], i) => { const p = R0(x, y); oilBlob(ctx, p[0], p[1], r, PIG[ci], 40 + i * 7, t); });
    /* pinceles */
    brush(ctx, 470, 800, 2.45 + .0, 640, '#ff2f6e', '#2a2f6e', '#e5c067');
    brush(ctx, 560, 790, 2.05, 620, '#18b8d8', '#e6a24a', '#cfd5e6');
    brush(ctx, 660, 840, 1.78 + 0, 600, '#ffd21f', '#1f7a5a', '#e5c067');
    ctx.restore();
    /* salpicaduras */
    for (let i = 0; i < 90; i++) { const a = q() * TAU, d = 430 + Math.pow(q(), .7) * 560, x = cx + Math.cos(a) * d * 1.1, y = cy + Math.sin(a) * d * 1.05, s = 3 + Math.pow(q(), 3) * 30; if (y < 240 || y > 1560) continue; const c = PIG[Math.floor(q() * PIG.length)];
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, s * (1 + q() * 1.2), s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; circle(ctx, -s * .25, -s * .3, s * .22); ctx.fill(); ctx.restore(); }
    /* destellos */
    L.loopParticles(18, 91, t, (i, p, r) => { const x = r() * W, y = 250 + r() * 1300; ctx.fillStyle = `rgba(255,255,255,${.7 * Math.sin(Math.PI * p)})`; circle(ctx, x, y - 30 * p, 2 + r() * 2.5); ctx.fill(); });
  }
  function museum(ctx, t) {
    const fx = 190, fy = 310, fw = 700, fh = 900;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#240f2c'], [.5, '#3d1a3a'], [1, '#1a0b1d']]); ctx.fillRect(0, 0, W, H);
    /* paneles de pared */
    ctx.fillStyle = 'rgba(255,255,255,.035)'; L.rr(ctx, 70, 250, 940, 1250, 6); ctx.fill(); ctx.strokeStyle = 'rgba(255,220,180,.1)'; ctx.lineWidth = 3; L.rr(ctx, 90, 270, 900, 1210, 4); ctx.stroke();
    /* conos de luz */
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [[230, 120], [850, 120]].forEach(([x, y], i) => { ctx.fillStyle = lin(ctx, x, y, 540, fy + fh + 120, [[0, 'rgba(255,225,170,.7)'], [.5, 'rgba(255,225,170,.18)'], [1, 'rgba(255,225,170,0)']]); ctx.beginPath(); ctx.moveTo(x - 24, y + 20); ctx.lineTo(x + 24, y + 20); ctx.lineTo(540 + (i ? 330 : -330), fy + fh + 120); ctx.lineTo(540 + (i ? -330 : 330), fy + fh + 120); ctx.closePath(); ctx.fill(); });
    halo(ctx, 540, fy + fh * .5, 760, '#ffc98a', .26 + .03 * wave(t, 1));
    ctx.restore();
    /* riel y focos */
    ctx.fillStyle = '#12091a'; ctx.fillRect(0, 100, W, 18); [[230, .5], [850, -.5]].forEach(([x, rot]) => { ctx.save(); ctx.translate(x, 118); ctx.rotate(rot); ctx.fillStyle = '#1d1226'; L.rr(ctx, -30, 0, 60, 80, 14); ctx.fill(); ctx.fillStyle = '#ffe9bf'; ctx.beginPath(); ctx.ellipse(0, 80, 24, 7, 0, 0, TAU); ctx.fill(); ctx.restore(); halo(ctx, x + (x < 540 ? 34 : -34), 190, 120, '#ffe0a0', .8); });
    /* sombra del marco */
    ctx.fillStyle = 'rgba(0,0,0,.45)'; L.rr(ctx, fx - 20 + 24, fy - 20 + 36, fw + 40, fh + 40, 14); ctx.fill();
    /* marco dorado */
    const fb = 58; ctx.fillStyle = lin(ctx, fx, fy, fx + fw, fy + fh, [[0, '#ffe9a6'], [.25, '#d9a23a'], [.55, '#8a5a14'], [.8, '#e8b955'], [1, '#6e450e']]); L.rr(ctx, fx - fb, fy - fb, fw + fb * 2, fh + fb * 2, 16); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,245,200,.65)'; L.rr(ctx, fx - fb + 8, fy - fb + 8, fw + fb * 2 - 16, fh + fb * 2 - 16, 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,40,5,.6)'; ctx.lineWidth = 4; L.rr(ctx, fx - fb + 26, fy - fb + 26, fw + fb * 2 - 52, fh + fb * 2 - 52, 8); ctx.stroke();
    /* ornamentos */
    const orn = (x, y, s) => { ctx.fillStyle = lin(ctx, x - s, y - s, x + s, y + s, [[0, '#fff0b0'], [1, '#9a6a1c']]); circle(ctx, x, y, s); ctx.fill(); ctx.fillStyle = 'rgba(80,45,5,.5)'; circle(ctx, x, y, s * .45); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; circle(ctx, x - s * .3, y - s * .3, s * .15); ctx.fill(); };
    [[fx - fb + 30, fy - fb + 30], [fx + fw + fb - 30, fy - fb + 30], [fx - fb + 30, fy + fh + fb - 30], [fx + fw + fb - 30, fy + fh + fb - 30]].forEach(([x, y]) => orn(x, y, 30));
    for (let i = 1; i < 8; i++) { const u = i / 8; orn(fx - fb + 30 + u * (fw + fb * 2 - 60), fy - fb + 30, 9); orn(fx - fb + 30 + u * (fw + fb * 2 - 60), fy + fh + fb - 30, 9); }
    for (let i = 1; i < 11; i++) { const u = i / 11; orn(fx - fb + 30, fy - fb + 30 + u * (fh + fb * 2 - 60), 9); orn(fx + fw + fb - 30, fy - fb + 30 + u * (fh + fb * 2 - 60), 9); }
    /* paspartú y lienzo */
    ctx.fillStyle = '#f2e8d5'; ctx.fillRect(fx, fy, fw, fh); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(fx, fy, fw, 8); ctx.fillRect(fx, fy, 8, fh);
    const m = 34, cx0 = fx + m, cy0 = fy + m, cw = fw - m * 2, ch = fh - m * 2, q = rng(77);
    ctx.save(); ctx.beginPath(); ctx.rect(cx0, cy0, cw, ch); ctx.clip();
    ctx.fillStyle = lin(ctx, cx0, cy0, cx0 + cw, cy0 + ch, [[0, '#13235a'], [.55, '#2b3a9a'], [1, '#e8506f']]); ctx.fillRect(cx0, cy0, cw, ch);
    ctx.fillStyle = '#f6d9a0'; ctx.beginPath(); ctx.ellipse(cx0 + cw * .66, cy0 + ch * .3, 170, 170, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff7a2f'; ctx.beginPath(); ctx.ellipse(cx0 + cw * .66 - 20, cy0 + ch * .3 + 14, 110, 110, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#13235a'; ctx.beginPath(); ctx.ellipse(cx0 + cw * .66 - 40, cy0 + ch * .3 + 30, 50, 50, 0, 0, TAU); ctx.fill();
    swoosh(ctx, [cx0 - 30, cy0 + ch * .85, cx0 + cw * .3, cy0 + ch * .45, cx0 + cw * .55, cy0 + ch * .95, cx0 + cw + 30, cy0 + ch * .55], 130, '#17b8a6', '#c8f0d8', 6, 1);
    swoosh(ctx, [cx0 + 20, cy0 + ch * .18, cx0 + cw * .3, cy0 + ch * .02, cx0 + cw * .5, cy0 + ch * .3, cx0 + cw * .86, cy0 + ch * .12], 60, '#ffd21f', '#ff9a1f', 7, 1);
    ctx.strokeStyle = '#0d0f2b'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx0 + 60, cy0 + ch * .55); ctx.bezierCurveTo(cx0 + 160, cy0 + ch * .4, cx0 + 260, cy0 + ch * .7, cx0 + 400, cy0 + ch * .5); ctx.stroke();
    for (let i = 0; i < 22; i++) { ctx.fillStyle = ['#ffd21f', '#fff6e8', '#ff5fa2', '#17b8a6'][i % 4]; circle(ctx, cx0 + q() * cw, cy0 + q() * ch, 4 + q() * 12); ctx.fill(); }
    ctx.fillStyle = '#0d0f2b'; [[.18, .72, 26], [.72, .7, 18], [.45, .85, 14]].forEach(([u, vv, rr]) => { circle(ctx, cx0 + cw * u, cy0 + ch * vv, rr); ctx.fill(); });
    /* grietas de luz y brillo de barniz */
    ctx.fillStyle = lin(ctx, cx0, cy0, cx0 + cw * .8, cy0 + ch * .5, [[0, 'rgba(255,255,255,.28)'], [.5, 'rgba(255,255,255,.04)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(cx0, cy0, cw, ch);
    ctx.fillStyle = 'rgba(255,255,255,' + (.07 + .03 * wave(t, 1)) + ')'; ctx.beginPath(); ctx.moveTo(cx0 + cw * .55, cy0); ctx.lineTo(cx0 + cw * .8, cy0); ctx.lineTo(cx0 + cw * .3, cy0 + ch); ctx.lineTo(cx0 + cw * .05, cy0 + ch); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 4; ctx.strokeRect(cx0, cy0, cw, ch);
    /* placa (solo líneas) */
    ctx.fillStyle = '#d9b46a'; L.rr(ctx, fx + fw / 2 - 90, fy + fh + fb + 36, 180, 56, 6); ctx.fill(); ctx.fillStyle = 'rgba(60,35,5,.55)'; ctx.fillRect(fx + fw / 2 - 66, fy + fh + fb + 52, 132, 5); ctx.fillRect(fx + fw / 2 - 48, fy + fh + fb + 68, 96, 4);
    /* suelo y banco */
    ctx.fillStyle = lin(ctx, 0, 1460, 0, H, [[0, '#2a1626'], [1, '#0d060f']]); ctx.fillRect(0, 1460, W, H - 1460);
    ctx.fillStyle = 'rgba(255,200,150,.12)'; ctx.fillRect(0, 1460, W, 4);
    halo(ctx, 540, 1480, 520, '#ffb877', .16);
    ctx.save(); ctx.translate(540, 1500); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(0, 70, 340, 26, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0c060f'; [-290, 290].forEach((x) => L.rr(ctx, x - 12, 10, 24, 62, 6)); [-290, 290].forEach((x) => { L.rr(ctx, x - 12, 10, 24, 62, 6); ctx.fill(); });
    ctx.fillStyle = lin(ctx, 0, -20, 0, 26, [[0, '#6b3d2a'], [1, '#2a140f']]); L.rr(ctx, -340, -20, 680, 44, 14); ctx.fill(); ctx.fillStyle = 'rgba(255,220,180,.3)'; ctx.fillRect(-330, -18, 660, 4); ctx.restore();
    /* polvo en los haces */
    L.loopParticles(28, 33, t, (i, p, r) => { const x = 250 + r() * 580, y = 200 + p * 1100; ctx.fillStyle = `rgba(255,236,190,${.7 * Math.sin(Math.PI * p)})`; circle(ctx, x + 20 * Math.sin(p * 6 + i), y, 1.5 + r() * 2.5); ctx.fill(); });
  }
  SCENES['art-c'] = {
    topic: 'art', stillT: [.3, .5],
    cap: [
      { ca: 'Paleta plena d\'oli, pinzells i molt de color 🖌️ #art #pintura', es: 'Paleta llena de óleo, pinceles y mucho color 🖌️ #arte #pintura', en: 'A palette full of oil paint, brushes and loads of color 🖌️ #art #painting' },
      { ca: 'Obra abstracta sota els focus del museu 🖼️ #art #museu', es: 'Obra abstracta bajo los focos del museo 🖼️ #arte #museo', en: 'Abstract artwork under the museum spotlights 🖼️ #art #museum' }],
    draw(ctx, t, v) { if (v % 2) museum(ctx, t); else paletteScene(ctx, t); L.vignette(ctx, W, H, .45); }
  };
})();
