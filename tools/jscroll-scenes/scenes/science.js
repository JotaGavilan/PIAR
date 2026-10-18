/* SCIENCE – a: sistema planetario (planeta con bandas, anillos y lunas) · b: ADN 3D / átomo · c: foto (cohete sobre la Tierra / células bioluminiscentes) */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, halo, rng, circle, ellipse, mix, lerp, clamp, smooth, noise, fbm } = L;
  const W = 1080, H = 1920;

  /* ---------- helpers locales ---------- */
  function fillBG(ctx, stops) { ctx.fillStyle = lin(ctx, 0, 0, 0, H, stops); ctx.fillRect(0, 0, W, H); }
  /* oscurece el lado opuesto a la luz (dentro del clip actual) */
  function shade(ctx, x, y, r, lx, ly, k = 1, tint = '5,0,24') {
    ctx.fillStyle = rad(ctx, x + lx * r * .55, y + ly * r * .55, r * .15, r * 1.6, [[0, 'rgba(255,245,225,' + (.2 * k) + ')'], [.3, 'rgba(255,255,255,0)'], [.7, `rgba(${tint},${.5 * k})`], [1, `rgba(${tint},${.92 * k})`]]);
    ctx.fillRect(x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4);
  }
  /* esfera sombreada con cráteres opcionales */
  function sphere(ctx, x, y, r, c, lx, ly, seed = 0, craters = 0) {
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    ctx.fillStyle = rad(ctx, x + lx * r * .4, y + ly * r * .4, r * .05, r * 1.3, [[0, c[0]], [.5, c[1]], [1, c[2]]]); ctx.fillRect(x - r, y - r, r * 2, r * 2);
    if (craters) { const q = rng(seed); for (let i = 0; i < craters; i++) { const a = q() * TAU, d = Math.sqrt(q()) * r * .75, cr = r * (.1 + q() * .16); const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d; ctx.fillStyle = 'rgba(30,10,40,.22)'; circle(ctx, cx, cy, cr); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(cx - lx * cr * .15, cy - ly * cr * .15, cr * .92, Math.atan2(ly, lx) + Math.PI * .6, Math.atan2(ly, lx) + Math.PI * 1.4); ctx.lineWidth = cr * .18; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.stroke(); } }
    shade(ctx, x, y, r, lx, ly, .9); ctx.restore();
  }
  function sparkle(ctx, x, y, s, a, col = '#fff') {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a; ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * .06, -s * .06, s, 0); ctx.quadraticCurveTo(s * .06, s * .06, 0, s); ctx.quadraticCurveTo(-s * .06, s * .06, -s, 0); ctx.quadraticCurveTo(-s * .06, -s * .06, 0, -s); ctx.fill(); ctx.restore();
  }
  function nebula(ctx, t, P, seed) {
    const r = rng(seed); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 30; i++) {
      const u = i / 29, x = P.path[0] + (P.path[2] - P.path[0]) * u + (r() - .5) * 420 + 40 * wave(t, 1, i * .13), y = P.path[1] + (P.path[3] - P.path[1]) * u + (r() - .5) * 360 + 30 * wave(t, 1, i * .21 + .3);
      const rad0 = 220 + r() * 320, col = P.col[Math.floor(r() * P.col.length)];
      halo(ctx, x, y, rad0, col, (.11 + r() * .15) * (.85 + .15 * wave(t, 1, r())));
    }
    ctx.restore();
    /* bolsas de polvo oscuro */
    for (let i = 0; i < 9; i++) halo(ctx, r() * W, 250 + r() * 1300, 260 + r() * 180, P.dust, .35);
  }
  function starfield(ctx, t, seed, n = 170) {
    L.stars(ctx, n, seed, t, { y1: H, alpha: .85 });
    const r = rng(seed + 5);
    for (let i = 0; i < 9; i++) { const x = r() * W, y = 220 + r() * 1300; sparkle(ctx, x, y, 14 + r() * 16, .35 + .65 * wave01(t, 1 + (i % 2), r()), i % 3 ? '#ffffff' : '#ffe9b8'); }
  }
  function shooting(ctx, t, ph, x0, y0, dx, dy, len = 360) {
    const p = ((t + ph) % 1 + 1) % 1, q = p / .16; if (q >= 1) return;
    const e = q * q * (3 - 2 * q), L0 = Math.hypot(dx, dy), ux = dx / L0, uy = dy / L0, hx = x0 + dx * e, hy = y0 + dy * e, a = Math.sin(Math.PI * q);
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
    ctx.strokeStyle = lin(ctx, hx, hy, hx - ux * len, hy - uy * len, [[0, 'rgba(255,255,255,.95)'], [1, 'rgba(255,255,255,0)']]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - ux * len, hy - uy * len); ctx.stroke();
    halo(ctx, hx, hy, 40, '#fff', .8); ctx.restore();
  }

  /* ---------- SCIENCE-A ---------- */
  function gasPlanet(ctx, t, cx, cy, R, o, lx, ly) {
    const r = rng(o.seed), nb = 15;
    ctx.save(); circle(ctx, cx, cy, R); ctx.clip();
    ctx.fillStyle = o.bands[0]; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    let idx = 0, y = cy - R * 1.02; const bounds = [];
    for (let j = 0; j < nb; j++) { y += R * 2.05 / nb * (.55 + .9 * r()); bounds.push({ y, c: idx = (idx + 1 + Math.floor(r() * (o.bands.length - 1))) % o.bands.length, ph: r(), k: (r() < .5 ? -1 : 1) * (1 + Math.floor(r() * 2)), a: R * (.008 + r() * .02), f: 1 + r() * 2.2 }); }
    bounds.forEach((b) => {
      ctx.beginPath(); ctx.moveTo(cx - R - 6, cy + R + 10);
      for (let x = cx - R - 6; x <= cx + R + 10; x += 18) { const dx = (x - cx) / R; ctx.lineTo(x, b.y + b.a * Math.sin(TAU * (b.f * dx * .5 + b.ph + b.k * t)) + b.a * .5 * Math.sin(TAU * (b.f * 2.3 * dx + b.ph * 2 - b.k * t)) + ((b.y - cy) / R) * dx * dx * R * .14); }
      ctx.lineTo(cx + R + 10, cy + R + 10); ctx.closePath(); ctx.fillStyle = o.bands[b.c]; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
    });
    /* tormentas que giran con el planeta */
    (o.storms || []).forEach((s) => {
      const lon = TAU * (t * s.k + s.ph), c = Math.cos(lon); if (c < .05) return;
      const sx = cx + R * Math.cos(s.lat) * Math.sin(lon), sy = cy + R * Math.sin(s.lat);
      ctx.save(); ctx.globalAlpha = clamp(c * 2.5); ctx.translate(sx, sy); ctx.scale(c, 1);
      ctx.fillStyle = s.col; ellipse(ctx, 0, 0, s.w, s.h); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 4; ellipse(ctx, 0, 0, s.w * .66, s.h * .6); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ellipse(ctx, s.w * .1, s.h * .1, s.w * .36, s.h * .34); ctx.fill(); ctx.restore();
    });
    shade(ctx, cx, cy, R, lx, ly, 1);
    ctx.restore();
    /* atmósfera en el lado iluminado */
    const ang = Math.atan2(ly, lx);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.beginPath(); ctx.rect(-R * .1, -R * 1.3, R * 1.4, R * 2.6); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rad(ctx, 0, 0, 0, R * 1.16, [[0, o.atm + '00'], [.82, o.atm + '00'], [.835, o.atm + 'aa'], [.9, o.atm + '44'], [1, o.atm + '00']]); ctx.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6);
    ctx.lineWidth = 5; ctx.strokeStyle = lin(ctx, R, 0, -R * .2, 0, [[0, o.atm + 'ee'], [1, o.atm + '00']]); circle(ctx, 0, 0, R - 2); ctx.stroke();
    ctx.restore();
  }
  function ringHalf(ctx, cx, cy, R, o, half, lx, ly) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.tilt); ctx.scale(1, o.ratio);
    ctx.beginPath(); if (half === 'back') ctx.rect(-R * 4, -R * 4, R * 8, R * 4); else ctx.rect(-R * 4, 0, R * 8, R * 4); ctx.clip();
    const q = rng(o.seed || 9), bands = []; let rr0 = o.Ri;
    while (rr0 < o.Ro) { const w = (.02 + q() * .07) * (o.Ro - o.Ri) * 2; const gap = q() < .1; bands.push({ r0: rr0, r1: Math.min(rr0 + w, o.Ro), c: o.cols[Math.floor(q() * o.cols.length)], a: gap ? .12 : .55 + q() * .4 }); rr0 += w + (q() < .25 ? (o.Ro - o.Ri) * .03 : 0); }
    bands.forEach((b) => { ctx.globalAlpha = b.a; ctx.strokeStyle = b.c; ctx.lineWidth = (b.r1 - b.r0) * R; circle(ctx, 0, 0, (b.r0 + b.r1) / 2 * R); ctx.stroke(); });
    /* luz y sombra sobre el anillo (en espacio local rotado) */
    const ca = Math.cos(-o.tilt), sa = Math.sin(-o.tilt), llx = lx * ca - ly * sa, lly = (lx * sa + ly * ca) / o.ratio, nn = Math.hypot(llx, lly);
    ctx.globalAlpha = 1;
    bands.forEach((b) => { ctx.strokeStyle = lin(ctx, llx / nn * o.Ro * R, lly / nn * o.Ro * R, -llx / nn * o.Ro * R, -lly / nn * o.Ro * R, [[0, 'rgba(255,240,220,.08)'], [.45, 'rgba(5,0,24,0)'], [1, 'rgba(5,0,24,.7)']]); ctx.lineWidth = (b.r1 - b.r0) * R + 1; circle(ctx, 0, 0, (b.r0 + b.r1) / 2 * R); ctx.stroke(); });
    ctx.restore();
  }
  function orbitPos(cx, cy, R, m, t, ang) {
    const a = TAU * (t * m.k + m.ph), lx = Math.cos(a) * m.R * R, ly = Math.sin(a) * m.R * R * m.ratio, c = Math.cos(m.tilt), s = Math.sin(m.tilt);
    return { x: cx + lx * c - ly * s, y: cy + lx * s + ly * c, depth: Math.sin(a) };
  }
  const SA = [
    { // naranja / magenta
      bg: [[0, '#04020d'], [.5, '#0a0830'], [1, '#150a3a']], neb: { col: ['#5b2bd1', '#ff4fa3', '#2d7bff', '#ff8a4c'], path: [820, 250, 120, 1550], dust: 'rgba(3,2,14,1)' },
      star: { x: 130, y: 330, col: '#fff1c9', glow: '#ffb26b' }, pl: { x: 540, y: 930, R: 285 },
      planet: { seed: 3, bands: ['#f6d7a7', '#e7a45e', '#c76b3d', '#f3c98e', '#a7482f', '#e9b27a', '#8d3a2c'], atm: '#ffb36b', storms: [{ lat: .3, k: 1, ph: .15, w: 62, h: 30, col: '#b13a2b' }, { lat: -.35, k: 1, ph: .6, w: 28, h: 14, col: '#fff0d4' }] },
      ring: { tilt: -.55, ratio: .3, Ri: 1.22, Ro: 1.8, cols: ['#f3dfbf', '#d8b98c', '#b89466', '#efd6b0', '#fff2dc'], seed: 9 },
      moons: [{ R: 2.0, ratio: .3, tilt: -.55, k: 1, ph: .08, r: 50, c: ['#fff6e8', '#c9c0b8', '#4b4458'], cr: 6 }, { R: 1.5, ratio: .3, tilt: -.55, k: 2, ph: .5, r: 30, c: ['#ffd9c4', '#d49a8a', '#5a3548'], cr: 3 }, { R: 2.25, ratio: .5, tilt: -1.0, k: 1, ph: .6, r: 26, c: ['#dff6ff', '#8fc3e4', '#2f3f73'], cr: 0 }],
      minis: [{ x: 905, y: 450, r: 54, c: ['#ffd7a6', '#e07a52', '#4a2145'], ring: true }, { x: 150, y: 1400, r: 34, c: ['#bfeaff', '#4f9de0', '#1b2a63'] }]
    },
    { // hielo / turquesa
      bg: [[0, '#02070f'], [.5, '#051a2e'], [1, '#0b1245']], neb: { col: ['#14b8a6', '#6d4cff', '#ff5db1', '#2fb6ff'], path: [160, 300, 940, 1500], dust: 'rgba(2,6,18,1)' },
      star: { x: 960, y: 300, col: '#e4f6ff', glow: '#7fe6ff' }, pl: { x: 520, y: 960, R: 295 },
      planet: { seed: 11, bands: ['#d5f7f2', '#8ee3e0', '#4db6c9', '#c1f0ee', '#3a8fb7', '#9fe8e6', '#2d6e9a'], atm: '#7ff0ff', storms: [{ lat: -.25, k: 1, ph: .4, w: 70, h: 26, col: '#2a5f9c' }, { lat: .38, k: 1, ph: .85, w: 34, h: 14, col: '#f2ffff' }] },
      ring: { tilt: .5, ratio: .23, Ri: 1.3, Ro: 1.85, cols: ['#ffd9ef', '#f6a6d4', '#c9d9ff', '#fff0fa', '#9fe1ff'], seed: 21 },
      moons: [{ R: 1.9, ratio: .26, tilt: .5, k: 1, ph: .3, r: 46, c: ['#fff5ff', '#d1b2e6', '#43336d'], cr: 5 }, { R: 1.5, ratio: .26, tilt: .5, k: 3, ph: .75, r: 24, c: ['#d9fff3', '#6fcfb4', '#1c4a63'], cr: 0 }],
      minis: [{ x: 170, y: 470, r: 130, c: ['#ffd2ae', '#cf6a4e', '#2a1646'], lit: true }, { x: 900, y: 1350, r: 28, c: ['#fff3c9', '#ffb25c', '#4a2247'] }]
    }
  ];
  function drawMini(ctx, m, lx, ly, t, i) { const y = m.y + 10 * wave(t, 1, i * .37); if (m.ring) { ctx.save(); ctx.translate(m.x, y); ctx.rotate(-.4); ctx.strokeStyle = 'rgba(255,230,200,.6)'; ctx.lineWidth = 5; ellipse(ctx, 0, 0, m.r * 1.9, m.r * .4); ctx.stroke(); ctx.restore(); } sphere(ctx, m.x, y, m.r, m.c, lx, ly, i + 3, m.r > 60 ? 8 : 0); if (m.ring) { ctx.save(); ctx.translate(m.x, y); ctx.rotate(-.4); ctx.beginPath(); ctx.rect(-200, 0, 400, 100); ctx.clip(); ctx.strokeStyle = 'rgba(255,230,200,.75)'; ctx.lineWidth = 5; ellipse(ctx, 0, 0, m.r * 1.9, m.r * .4); ctx.stroke(); ctx.restore(); } }

  SCENES['science-a'] = {
    topic: 'science', stillT: [.3, .62],
    cap: [
      { ca: 'Un planeta amb anells i tres llunes. Fes-me una foto! 🪐 #ciència #espai', es: 'Un planeta con anillos y tres lunas. ¡Hazle una foto! 🪐 #ciencia #espacio', en: 'A ringed planet with three moons. Say cheese! 🪐 #science #space' },
      { ca: 'Gegant de gel amb anells rosats i dues llunes 🧊 #ciència #cosmos', es: 'Gigante de hielo con anillos rosados y dos lunas 🧊 #ciencia #cosmos', en: 'Ice giant with pink rings and two moons 🧊 #science #cosmos' }],
    draw(ctx, t, v) {
      const P = SA[v % SA.length], { x: cx, y: cy, R } = P.pl, sx = P.star.x, sy = P.star.y;
      let lx = sx - cx, ly = sy - cy; const ln = Math.hypot(lx, ly); lx /= ln; ly /= ln;
      fillBG(ctx, P.bg); nebula(ctx, t, P.neb, 40 + v); starfield(ctx, t, 100 + v);
      shooting(ctx, t, .0 + v * .3, v ? 120 : 980, v ? 1450 : 260, v ? 420 : -360, v ? -240 : 330);
      /* estrella */
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      halo(ctx, sx, sy, 760, P.star.glow, .38 + .06 * wave(t, 1)); halo(ctx, sx, sy, 330, P.star.col, .7); halo(ctx, sx, sy, 140, '#fff', .95);
      const fl = 520 + 40 * wave(t, 2);
      ctx.strokeStyle = lin(ctx, sx - fl, sy, sx + fl, sy, [[0, 'rgba(255,255,255,0)'], [.5, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - fl, sy); ctx.lineTo(sx + fl, sy); ctx.stroke();
      ctx.strokeStyle = lin(ctx, sx, sy - fl * .7, sx, sy + fl * .7, [[0, 'rgba(255,255,255,0)'], [.5, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]); ctx.beginPath(); ctx.moveTo(sx, sy - fl * .7); ctx.lineTo(sx, sy + fl * .7); ctx.stroke();
      /* fantasmas de lente a lo largo del eje estrella-planeta */
      [[.55, 36, .16], [.8, 70, .1], [1.2, 28, .14], [1.5, 54, .08]].forEach(([u, rr, a], i) => { const gx = sx + (cx - sx) * u * 1.0 + (i % 2 ? 40 : 0), gy = sy + (cy - sy) * u; halo(ctx, gx, gy, rr, i % 2 ? P.star.glow : '#ffffff', a * 3); });
      ctx.restore();
      /* minis lejanos */
      P.minis.forEach((m, i) => drawMini(ctx, m, (sx - m.x) / Math.hypot(sx - m.x, sy - m.y), (sy - m.y) / Math.hypot(sx - m.x, sy - m.y), t, i));
      /* órbitas */
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.17)'; ctx.lineWidth = 2; ctx.setLineDash([4, 14]);
      P.moons.forEach((m) => { ctx.save(); ctx.translate(cx, cy); ctx.rotate(m.tilt); ctx.beginPath(); ctx.ellipse(0, 0, m.R * R, m.R * R * m.ratio, 0, 0, TAU); ctx.stroke(); ctx.restore(); });
      ctx.restore();
      /* detrás */
      const mp = P.moons.map((m) => orbitPos(cx, cy, R, m, t));
      const drawMoon = (m, p) => { const k = 1 + .16 * p.depth; halo(ctx, p.x, p.y, m.r * 2.8 * k, P.planet.atm, .1); sphere(ctx, p.x, p.y, m.r * k, m.c, lx, ly, 5 + m.r, m.cr); };
      P.moons.forEach((m, i) => { if (mp[i].depth < 0) drawMoon(m, mp[i]); });
      ringHalf(ctx, cx, cy, R, P.ring, 'back', lx, ly);
      /* resplandor del planeta */
      halo(ctx, cx - lx * R * .2, cy - ly * R * .2, R * 2.2, P.planet.atm, .1);
      gasPlanet(ctx, t, cx, cy, R, P.planet, lx, ly);
      ringHalf(ctx, cx, cy, R, P.ring, 'front', lx, ly);
      P.moons.forEach((m, i) => { if (mp[i].depth >= 0) drawMoon(m, mp[i]); });
      L.vignette(ctx, W, H, .5);
    }
  };

  /* ---------- SCIENCE-B ---------- */
  function hexGrid(ctx, col, a, s = 64) {
    ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.beginPath();
    const h = s * Math.sqrt(3) / 2;
    for (let row = -1; row < H / h + 1; row++) for (let c = -1; c < W / (s * 1.5) + 1; c++) {
      const x = c * s * 1.5, y = row * h * 1 + (c % 2 ? h / 2 : 0);
      ctx.moveTo(x, y); ctx.lineTo(x + s * .5, y - h / 2 * 0); ctx.moveTo(x + s * .5, y); ctx.lineTo(x + s, y + h / 2);
      ctx.moveTo(x, y); ctx.lineTo(x - s * .5, y + h / 2);
    }
    ctx.stroke(); ctx.restore();
  }
  function ball(ctx, x, y, r, col, dm, far, glow) {
    const c0 = mix(col, far, (1 - dm) * .62), cl = mix(col, '#ffffff', .55 * dm + .1), cd = mix(col, '#050a22', .55);
    if (glow) halo(ctx, x, y, r * 2.6, col, glow * (.25 + .75 * dm));
    ctx.fillStyle = rad(ctx, x - r * .35, y - r * .38, r * .08, r * 1.15, [[0, mix(cl, far, (1 - dm) * .45)], [.45, c0], [1, mix(cd, far, (1 - dm) * .3)]]);
    circle(ctx, x, y, r); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${.55 * dm + .1})`; circle(ctx, x - r * .38, y - r * .42, r * .17); ctx.fill();
  }
  function bondLine(ctx, x0, y0, x1, y1, w, col, dm, far) {
    ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = mix(col, far, (1 - dm) * .6); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.lineWidth = w * .3; ctx.strokeStyle = `rgba(255,255,255,${.4 * dm})`; ctx.beginPath(); ctx.moveTo(x0 - w * .15, y0 - w * .2); ctx.lineTo(x1 - w * .15, y1 - w * .2); ctx.stroke();
  }
  function miniMolecule(ctx, x, y, s, rot, cols, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.strokeStyle = cols[0]; ctx.lineWidth = 4 * s;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU; ctx.lineTo(Math.cos(q) * 46 * s, Math.sin(q) * 46 * s); } ctx.closePath(); ctx.stroke();
    for (let i = 0; i < 6; i++) { const q = i / 6 * TAU; ctx.fillStyle = cols[i % 2 ? 1 : 0]; circle(ctx, Math.cos(q) * 46 * s, Math.sin(q) * 46 * s, 11 * s); ctx.fill(); if (i % 2 === 0) { ctx.beginPath(); ctx.moveTo(Math.cos(q) * 46 * s, Math.sin(q) * 46 * s); ctx.lineTo(Math.cos(q) * 82 * s, Math.sin(q) * 82 * s); ctx.stroke(); circle(ctx, Math.cos(q) * 88 * s, Math.sin(q) * 88 * s, 8 * s); ctx.fill(); } }
    ctx.restore();
  }
  function labBG(ctx, t, P, seed) {
    fillBG(ctx, P.bg);
    halo(ctx, 540, 860, 900, P.glow, .32 + .05 * wave(t, 1));
    hexGrid(ctx, P.grid, .07);
    /* haz de escáner que sube */
    const by = 1650 - t * 1400; ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * t);
    ctx.fillStyle = lin(ctx, 0, by - 180, 0, by + 180, [[0, 'rgba(0,0,0,0)'], [.7, P.scan], [.74, 'rgba(255,255,255,.16)'], [.78, P.scan], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, by - 180, W, 360); ctx.restore();
    /* bokeh */
    L.loopParticles(16, seed, t, (i, p, r) => { const x = r() * W, rr = 40 + r() * 100; ctx.globalAlpha = .14 * Math.sin(Math.PI * p); ctx.fillStyle = P.bok[i % P.bok.length]; circle(ctx, x + 40 * wave(t, 1, i * .1), 1750 - p * 1600, rr); ctx.fill(); ctx.globalAlpha = 1; });
    /* moléculas de fondo */
    [[150, 420, .8, 0], [930, 1130, 1.0, .4], [880, 340, .55, .7], [170, 1260, .65, .2]].forEach(([x, y, s, ph], i) => miniMolecule(ctx, x, y + 14 * wave(t, 1, ph), s, TAU * (t * (i % 2 ? -1 : 1) + ph), P.mol, .3));
  }
  function sparks(ctx, t, P, seed) {
    L.loopParticles(34, seed, t, (i, p, r) => { const x = r() * W + 30 * Math.sin(p * TAU + i), y = 1650 - p * 1350, s = 2 + r() * 4; ctx.globalAlpha = .85 * Math.sin(Math.PI * p); ctx.fillStyle = P.spark[i % P.spark.length]; circle(ctx, x, y, s); ctx.fill(); halo(ctx, x, y, s * 6, P.spark[i % P.spark.length], .35); ctx.globalAlpha = 1; });
  }
  const SB = [
    { bg: [[0, '#021423'], [.5, '#043a5e'], [1, '#0a1c4f']], glow: '#19b6d6', grid: '#6ee7ff', scan: 'rgba(110,231,255,.14)', bok: ['#35d0ff', '#7b6dff', '#2ff2c1'], mol: ['#6ee7ff', '#ff7ab8'], spark: ['#9cf6ff', '#ffe08a', '#ffffff'], far: '#06223d',
      sA: '#5be7ff', sB: '#b78cff', pairs: [['#ff5d8f', '#ffd166'], ['#35e0b2', '#4cc9f0']] },
    { bg: [[0, '#14042b'], [.5, '#3b0f63'], [1, '#0a0b3c']], glow: '#d046ff', grid: '#ff9be8', scan: 'rgba(255,155,232,.12)', bok: ['#ff6ec7', '#7b6dff', '#ffcf5c'], mol: ['#ffcf5c', '#6ee7ff'], spark: ['#ffd1f4', '#9cf6ff', '#ffffff'], far: '#1a0838' }
  ];
  function dna(ctx, t, P) {
    ctx.save(); ctx.translate(540, 880); ctx.rotate(-.2);
    const n = 25, span = 1250, rot = TAU * t, items = [], r = rng(31), A = [], B = [];
    for (let i = 0; i < n; i++) {
      const y = -span / 2 + i * span / (n - 1), a = i * .5 + rot, Rr = 235 * (1 - .12 * Math.pow(y / (span / 2), 2)), z = Math.sin(a), x = Math.cos(a) * Rr, pr = P.pairs[r() < .5 ? 0 : 1], sw = r() < .5;
      A.push({ x, y, z }); B.push({ x: -x, y, z: -z });
      const cA = sw ? pr[0] : pr[1], cB = sw ? pr[1] : pr[0];
      items.push({ z: z * .5, f: () => { const dm = (z * .5 + 1) / 2; bondLine(ctx, x, y, x * .0, y, 15 * (1 + .25 * z * .5), cA, dm, P.far); } });
      items.push({ z: -z * .5, f: () => { const dm = (-z * .5 + 1) / 2; bondLine(ctx, -x, y, 0, y, 15 * (1 - .25 * z * .5), cB, dm, P.far); } });
      items.push({ z, f: () => ball(ctx, x, y, 36 * (1 + .3 * z), P.sA, (z + 1) / 2, P.far, .55) });
      items.push({ z: -z, f: () => ball(ctx, -x, y, 36 * (1 - .3 * z), P.sB, (1 - z) / 2, P.far, .55) });
    }
    for (let i = 0; i < n - 1; i++) {
      [[A, P.sA], [B, P.sB]].forEach(([S, col]) => { const p = S[i], q = S[i + 1], z = (p.z + q.z) / 2; items.push({ z, f: () => bondLine(ctx, p.x, p.y, q.x, q.y, 22 * (1 + .25 * z), col, (z + 1) / 2, P.far) }); });
    }
    items.sort((a, b) => a.z - b.z); items.forEach((it) => it.f());
    ctx.restore();
  }
  function atom(ctx, t, P) {
    const cx = 540, cy = 870, wob = .14 * wave(t, 1), ry = 175 * (1 + .1 * wave(t, 1, .25)), rx = 465;
    const cols = ['#6ee7ff', '#ffcf5c', '#ff7ac8'], orbs = [0, 1, 2].map((i) => ({ th: i * Math.PI / 3 + .12 + wob, col: cols[i], k: 1 + (i === 1 ? 0 : 0), ph: i / 3 }));
    const pos = (o, a) => { const lx = Math.cos(a) * rx, ly = Math.sin(a) * ry, c = Math.cos(o.th), s = Math.sin(o.th); return { x: cx + lx * c - ly * s, y: cy + lx * s + ly * c, d: Math.sin(a) }; };
    const arc = (o, a0, a1, w, alpha) => { ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.th); ctx.globalAlpha = alpha; ctx.lineWidth = w; ctx.strokeStyle = o.col; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, a0, a1); ctx.stroke(); ctx.restore(); };
    const eAng = (o, i, h) => TAU * (t * (i % 2 ? -1 : 1) + o.ph + i * .17 + h * .5);
    const electron = (o, i, h) => {
      const a = eAng(o, i, h), p = pos(o, a), k = 1 + .22 * p.d;
      for (let j = 16; j >= 1; j--) { const q = pos(o, a - (i % 2 ? -1 : 1) * j * .05), s = 1 + .22 * q.d; ctx.globalAlpha = .5 * (1 - j / 17); ctx.fillStyle = o.col; circle(ctx, q.x, q.y, 19 * s * (1 - j / 22)); ctx.fill(); }
      ctx.globalAlpha = 1; halo(ctx, p.x, p.y, 120 * k, o.col, .75); ball(ctx, p.x, p.y, 29 * k, o.col, (p.d + 1.4) / 2.4, P.far, 0); ctx.fillStyle = '#fff'; circle(ctx, p.x, p.y, 10 * k); ctx.fill();
      return p.d;
    };
    const backE = [], frontE = [];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    orbs.forEach((o) => arc(o, Math.PI, TAU, 4, .3)); ctx.restore();
    orbs.forEach((o, i) => [0, 1].forEach((h) => { if (Math.sin(eAng(o, i, h)) < 0) electron(o, i, h); }));
    /* ondas de energía + núcleo */
    for (let i = 0; i < 3; i++) { const p = (t + i / 3) % 1; ctx.globalAlpha = .35 * (1 - p); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; circle(ctx, cx, cy, 70 + p * 260); ctx.stroke(); } ctx.globalAlpha = 1;
    halo(ctx, cx, cy, 300, '#ff6e8a', .45 + .1 * wave(t, 2)); halo(ctx, cx, cy, 190, '#ffffff', .25);
    const q = rng(77), parts = []; for (let i = 0; i < 11; i++) { const u = q() * 2 - 1, ph = q() * TAU, rr = 34 + q() * 46, h = q() * TAU; parts.push({ x0: Math.cos(h) * Math.sqrt(1 - u * u) * rr, y0: u * rr, z0: Math.sin(h) * Math.sqrt(1 - u * u) * rr, red: i % 2 }); }
    const ang = TAU * t; parts.forEach((p) => { p.x = p.x0 * Math.cos(ang) - p.z0 * Math.sin(ang); p.z = p.x0 * Math.sin(ang) + p.z0 * Math.cos(ang); p.y = p.y0; }); parts.sort((a, b) => a.z - b.z);
    parts.forEach((p) => ball(ctx, cx + p.x, cy + p.y, 46 * (1 + p.z / 200), p.red ? '#ff4d6d' : '#6aa8ff', (p.z + 100) / 200, P.far, .3));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; orbs.forEach((o) => { arc(o, 0, Math.PI, 7, .9); arc(o, 0, Math.PI, 20, .12); }); ctx.restore();
    orbs.forEach((o, i) => [0, 1].forEach((h) => { if (Math.sin(eAng(o, i, h)) >= 0) electron(o, i, h); }));
  }
  SCENES['science-b'] = {
    topic: 'science', stillT: [.2, .55],
    cap: [
      { ca: 'L\'ADN gira i, de colp, tot té sentit 🧬 #ciència #adn', es: 'El ADN gira y todo cobra sentido 🧬 #ciencia #adn', en: 'DNA keeps spinning and everything makes sense 🧬 #science #dna' },
      { ca: 'Un àtom per dins: nucli i electrons a tota velocitat ⚛️ #ciència #física', es: 'Un átomo por dentro: núcleo y electrones a toda velocidad ⚛️ #ciencia #física', en: 'Inside an atom: nucleus and electrons at full speed ⚛️ #science #physics' }],
    draw(ctx, t, v) {
      const P = SB[v % SB.length]; labBG(ctx, t, P, 60 + v);
      if (v % 2 === 0) dna(ctx, t, P); else atom(ctx, t, P);
      sparks(ctx, t, P, 90 + v); L.vignette(ctx, W, H, .5);
    }
  };

  /* ---------- SCIENCE-C (foto) ---------- */
  function earthArc(ctx, t, o) {
    const cx = 540, top = o.top, R = 1750, cy = top + R, sun = o.sun;
    /* resplandor atmosférico detrás */
    halo(ctx, sun.x, sun.y, 900, o.glow, .55); halo(ctx, sun.x, sun.y, 380, o.sunCol, .8);
    ctx.save(); circle(ctx, cx, cy, R + 70); ctx.fillStyle = rad(ctx, cx, cy, R - 4, R + 70, [[0, o.atm + 'ff'], [.12, o.atm + '99'], [.4, o.atm + '33'], [1, o.atm + '00']]); ctx.fill(); ctx.restore();
    ctx.save(); circle(ctx, cx, cy, R); ctx.clip();
    ctx.fillStyle = lin(ctx, 0, top, 0, top + 600, [[0, o.land[0]], [.35, o.land[1]], [1, o.land[2]]]); ctx.fillRect(0, top - 10, W, 900);
    /* luz del amanecer sobre la superficie */
    ctx.fillStyle = rad(ctx, sun.x, sun.y + 60, 0, 1000, [[0, o.light[0]], [.25, o.light[1]], [.6, o.light[2]], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, top - 10, W, 900);
    /* nubes siguiendo la curvatura */
    const r = rng(o.seed);
    for (let i = 0; i < 90; i++) {
      const th = (r() - .5) * 1.05, dep = Math.pow(r(), .8) * 700, rr0 = R - dep, x = cx + Math.sin(th) * rr0, y = cy - Math.cos(th) * rr0, f = 1 - dep / 700;
      const lit = clamp(1 - Math.hypot(x - sun.x, y - sun.y) / 1000);
      ctx.save(); ctx.translate(x, y); ctx.rotate(th); ctx.scale(1, .2 + .8 * (dep / 600) * .35 + .07);
      const sz = 70 + r() * 130; ctx.fillStyle = rad(ctx, 0, 0, 0, sz, [[0, o.cloud + (Math.round(clamp(.2 + lit * .8) * 120 + 16)).toString(16).padStart(2, '0')], [.55, o.cloud + '33'], [1, o.cloud + '00']]); ctx.fillRect(-sz, -sz, sz * 2, sz * 2); ctx.restore();
    }
    /* luces de ciudad en el lado nocturno */
    const q = rng(o.seed + 3);
    for (let c = 0; c < 9; c++) { const th = -.52 + q() * .5, dep = 40 + q() * 420, rr0 = R - dep, bx = cx + Math.sin(th) * rr0, by = cy - Math.cos(th) * rr0;
      for (let k = 0; k < 16; k++) { const x = bx + (q() - .5) * 150, y = by + (q() - .5) * 40; ctx.globalAlpha = (.5 + .5 * wave01(t, 1 + (k % 2), q())) * .9; ctx.fillStyle = o.city; ctx.fillRect(x, y, 3.2, 3.2); } }
    ctx.globalAlpha = 1;
    ctx.restore();
    /* línea de atmósfera fina */
    ctx.save(); ctx.lineWidth = 7; ctx.strokeStyle = lin(ctx, 0, 0, W, 0, [[0, o.atm + '66'], [.5, o.atm + 'dd'], [1, o.sunCol]]); ctx.beginPath(); ctx.arc(cx, cy, R + 2, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); ctx.restore();
  }
  function rocket(ctx, t, o) {
    const BW = 78, fl = 400 + 26 * wave(t, 6) + 12 * wave(t, 11, .3);
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.scale(1.12, 1.12);
    /* llama */
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    halo(ctx, 0, 170, 520, '#ff7a2e', .42); halo(ctx, 0, 60, 240, '#ffd27a', .6);
    const flame = (w, len, col, a) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-w * .8, -40); ctx.bezierCurveTo(-w * 1.15, len * .35, -w * .35, len * .75, 0, len); ctx.bezierCurveTo(w * .35, len * .75, w * 1.15, len * .35, w * .8, -40); ctx.closePath(); ctx.fill(); };
    flame(62, fl * 1.05, '#ff5a1f', .6); flame(48, fl * .86, '#ff9a2e', .85); flame(32, fl * .62, '#ffd45e', .95); flame(17, fl * .4, '#fffbe6', 1);
    for (let i = 0; i < 4; i++) { ctx.globalAlpha = .55; ctx.fillStyle = '#fff3c4'; ellipse(ctx, 0, 90 + i * 62, 14 - i * 2, 18 - i * 2.5); ctx.fill(); }
    ctx.restore();
    /* aletas traseras */
    ctx.fillStyle = lin(ctx, -170, 0, 170, 0, [[0, '#d0405a'], [.5, '#ff6a7c'], [1, '#ffb08f']]);
    [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * BW * .9, -230); ctx.lineTo(s * 190, 24); ctx.quadraticCurveTo(s * 120, 4, s * BW * .6, -50); ctx.closePath(); ctx.fill(); });
    /* propulsores laterales */
    [-1, 1].forEach((s) => {
      ctx.save(); ctx.translate(s * 112, 0);
      ctx.fillStyle = lin(ctx, -28, 0, 28, 0, [[0, '#9fb0dd'], [.5, '#f4f6ff'], [1, s > 0 ? '#ffd9b0' : '#cfd8f5']]); L.rr(ctx, -28, -300, 56, 250, 14); ctx.fill();
      ctx.fillStyle = '#ff5d73'; ctx.beginPath(); ctx.moveTo(-28, -296); ctx.quadraticCurveTo(-26, -370, 0, -398); ctx.quadraticCurveTo(26, -370, 28, -296); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#26315e'; ctx.beginPath(); ctx.moveTo(-18, -56); ctx.lineTo(18, -56); ctx.lineTo(24, -16); ctx.lineTo(-24, -16); ctx.closePath(); ctx.fill(); ctx.restore();
    });
    /* cuerpo */
    ctx.fillStyle = lin(ctx, -BW, 0, BW, 0, [[0, '#8fa2d6'], [.28, '#eef2ff'], [.65, '#ffffff'], [1, '#ffcfa3']]);
    L.rr(ctx, -BW, -470, BW * 2, 420, 22); ctx.fill();
    ctx.save(); L.rr(ctx, -BW, -470, BW * 2, 420, 22); ctx.clip();
    ctx.fillStyle = o.band; ctx.fillRect(-BW, -190, BW * 2, 44); ctx.fillStyle = o.band2; ctx.fillRect(-BW, -142, BW * 2, 12); ctx.fillRect(-BW, -214, BW * 2, 12);
    ctx.fillStyle = 'rgba(30,40,100,.1)'; for (let i = 0; i < 5; i++) ctx.fillRect(-BW, -440 + i * 4, 0, 0);
    ctx.fillStyle = rad(ctx, BW, -250, 0, 150, [[0, 'rgba(255,170,90,.55)'], [1, 'rgba(255,170,90,0)']]); ctx.fillRect(-BW, -470, BW * 2, 420);
    ctx.fillStyle = 'rgba(20,30,90,.18)'; ctx.fillRect(-BW, -470, 22, 420); ctx.restore();
    /* cono */
    ctx.fillStyle = lin(ctx, -BW, 0, BW, 0, [[0, '#c9344f'], [.3, '#ff5d73'], [.7, '#ff8c8a'], [1, '#ffc09a']]);
    ctx.beginPath(); ctx.moveTo(-BW, -466); ctx.bezierCurveTo(-BW, -560, -30, -650, 0, -690); ctx.bezierCurveTo(30, -650, BW, -560, BW, -466); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-BW + 22, -490); ctx.bezierCurveTo(-BW + 20, -560, -34, -620, -12, -660); ctx.stroke();
    /* ventana */
    ctx.fillStyle = '#cdd6f3'; circle(ctx, 0, -340, 46); ctx.fill(); ctx.strokeStyle = '#7d8ec4'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = lin(ctx, -30, -370, 30, -310, [[0, '#7ff0ff'], [.55, '#2a7fc8'], [1, '#14275f']]); circle(ctx, 0, -340, 34); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-11, -353, 8, 14, .7, 0, TAU); ctx.fill(); halo(ctx, 14, -326, 30, '#ffd9a0', .4);
    /* remaches */
    ctx.fillStyle = 'rgba(70,85,150,.5)'; for (let i = 0; i < 6; i++) { circle(ctx, -50 + i * 20, -108, 2.4); ctx.fill(); circle(ctx, -50 + i * 20, -240, 2.4); ctx.fill(); }
    /* tobera */
    ctx.fillStyle = lin(ctx, -50, 0, 50, 0, [[0, '#1e2756'], [.5, '#5b6aa8'], [1, '#2a3366']]); ctx.beginPath(); ctx.moveTo(-42, -52); ctx.lineTo(42, -52); ctx.lineTo(58, 6); ctx.lineTo(-58, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function plume(ctx, t, o) {
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.scale(1.12, 1.12);
    const r = rng(66), n = 90, c = o.smoke;
    for (let i = n; i >= 0; i--) {
      const u = i / n, y = 130 + Math.pow(u, 1.1) * 760, rr0 = 50 + u * 230 + r() * 30, x = Math.sin(u * 4.2 + 1) * 50 * u + (r() - .5) * 90 * u, a = .5 * Math.pow(1 - u, 1.2) + .04;
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = clamp(a);
      ctx.fillStyle = rad(ctx, rr0 * .3, -rr0 * .2, rr0 * .02, rr0, [[0, `rgba(${c[0]},1)`], [.45, `rgba(${c[1]},.75)`], [1, `rgba(${c[2]},0)`]]); circle(ctx, 0, 0, rr0); ctx.fill(); ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }
  /* --- microscopio --- */
  function cell(ctx, t, x, y, r, col, seed, kind) {
    const q = rng(seed), rot = q() * TAU, n = 44, wb = [q() * TAU, q() * TAU];
    const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, rr0 = r * (1 + .05 * Math.sin(3 * a + wb[0] + TAU * t) + .035 * Math.sin(5 * a + wb[1] - TAU * t) + (kind ? .05 * Math.sin(2 * a + rot) : 0)); pts.push([x + Math.cos(a) * rr0 * (kind ? 1.12 : 1), y + Math.sin(a) * rr0]); }
    const path = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    halo(ctx, x, y, r * 2.1, col, .22);
    path(); ctx.fillStyle = rad(ctx, x, y, r * .1, r * 1.12, [[0, col + '10'], [.65, col + '30'], [.9, col + '88'], [1, col + 'ee']]); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = col + 'cc'; path(); ctx.stroke();
    /* núcleo */
    const nx = x + r * .12 * Math.cos(rot), ny = y + r * .12 * Math.sin(rot);
    ctx.fillStyle = rad(ctx, nx, ny, 0, r * .42, [[0, '#ffffffaa'], [.4, col + 'aa'], [1, col + '22']]); circle(ctx, nx, ny, r * .42); ctx.fill();
    ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 2; circle(ctx, nx, ny, r * .42); ctx.stroke();
    /* orgánulos */
    for (let i = 0; i < 14; i++) { const a = q() * TAU, d = r * (.5 + q() * .38), s = r * (.03 + q() * .05), ph = q(); ctx.globalAlpha = .55 + .45 * wave01(t, 1, ph); ctx.fillStyle = i % 3 ? '#ffffff' : col; circle(ctx, x + Math.cos(a + .15 * wave(t, 1, ph)) * d, y + Math.sin(a + .15 * wave(t, 1, ph)) * d, s); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, r * .86, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke(); ctx.restore();
  }
  function bacillus(ctx, t, x, y, len, wid, rot, col, ph, tail) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot + .08 * wave(t, 1, ph)); ctx.globalCompositeOperation = 'lighter';
    halo(ctx, 0, 0, len * 1.1, col, .3);
    if (tail) { ctx.strokeStyle = col + 'aa'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24, xx = -len / 2 - u * len * 1.2, yy = Math.sin(u * 9 - TAU * t * 2 + ph * 6) * wid * (.3 + u * .9); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    ctx.fillStyle = lin(ctx, 0, -wid, 0, wid, [[0, col + 'ff'], [.5, col + '66'], [1, col + 'ff']]); L.rr(ctx, -len / 2, -wid, len, wid * 2, wid); ctx.fill();
    ctx.fillStyle = '#ffffffcc'; L.rr(ctx, -len / 2 + wid * .6, -wid * .55, len * .6, wid * .3, wid * .15); ctx.fill();
    ctx.restore();
  }
  const SCI_C1 = [
    { bg: ['#020a10', '#031d28'], glow: '#0fb7a8', cols: ['#3df5ff', '#b6ff5c', '#ff5de6', '#7a8bff'] },
    { bg: ['#0a0212', '#240a3a'], glow: '#c43bff', cols: ['#ff7ad9', '#ffd35c', '#5cf0ff', '#a07bff'] }
  ];
  function microscope(ctx, t, v) {
    const P = SCI_C1[v % 2], cx = 540, cy = 900, R = 505, r = rng(500 + v);
    fillBG(ctx, [[0, '#04070b'], [1, '#070c13']]);
    /* campo de visión */
    ctx.save(); circle(ctx, cx, cy, R); ctx.clip();
    ctx.fillStyle = rad(ctx, cx - 60, cy - 80, 40, R * 1.1, [[0, P.glow + '55'], [.5, P.bg[1]], [1, P.bg[0]]]); ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    /* bokeh fuera de foco */
    for (let i = 0; i < 18; i++) { const x = cx + (r() - .5) * 900, y = cy + (r() - .5) * 900, s = 50 + r() * 110; ctx.globalAlpha = .14; ctx.fillStyle = P.cols[i % 4]; circle(ctx, x + 20 * wave(t, 1, i * .1), y + 14 * wave(t, 1, i * .17), s); ctx.fill(); ctx.strokeStyle = P.cols[i % 4]; ctx.lineWidth = 3; ctx.globalAlpha = .12; ctx.stroke(); }
    ctx.globalAlpha = 1;
    const cells = [[-120, -170, 128, 0], [190, -60, 150, 1], [-190, 130, 110, 2], [60, 230, 135, 0], [-40, -20, 86, 3], [250, 260, 70, 2], [-290, -250, 62, 1], [270, -300, 76, 3]];
    cells.forEach(([dx, dy, rr0, ci], i) => cell(ctx, t, cx + dx + 14 * wave(t, 1, i * .13), cy + dy + 12 * wave(t, 1, i * .21 + .3), rr0, P.cols[ci], 20 + i * 7 + v * 50, i % 2));
    for (let i = 0; i < 12; i++) { const x = cx + (r() - .5) * 760, y = cy + (r() - .5) * 760; if (Math.hypot(x - cx, y - cy) > R - 40) continue; bacillus(ctx, t, x + 18 * wave(t, 1, i * .12), y + 14 * wave(t, 1, i * .19), 62 + r() * 40, 11 + r() * 5, r() * TAU, P.cols[(i + 1) % 4], r(), i % 2 === 0); }
    for (let i = 0; i < 60; i++) { const x = cx + (r() - .5) * 940, y = cy + (r() - .5) * 940, s = 2 + r() * 4; ctx.globalAlpha = .5 + .5 * wave01(t, 1, r()); ctx.fillStyle = '#fff'; circle(ctx, x, y, s); ctx.fill(); }
    ctx.globalAlpha = 1;
    /* viñeta de lente */
    ctx.fillStyle = rad(ctx, cx, cy, R * .55, R, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.65)']]); ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    /* brillo de cristal */
    ctx.fillStyle = lin(ctx, cx - R, cy - R, cx + R * .2, cy + R * .2, [[0, 'rgba(255,255,255,.16)'], [.5, 'rgba(255,255,255,0)']]); ctx.beginPath(); ctx.ellipse(cx - 120, cy - 230, 300, 190, -.7, 0, TAU); ctx.fill();
    ctx.restore();
    /* aro metálico */
    ctx.lineWidth = 34; ctx.strokeStyle = lin(ctx, cx - R, cy - R, cx + R, cy + R, [[0, '#6c7893'], [.3, '#d6dcee'], [.55, '#4a5470'], [1, '#2b3248']]); circle(ctx, cx, cy, R + 17); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.35)'; circle(ctx, cx, cy, R + 33); ctx.stroke();
    /* retícula y marcas de escala */
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, l = i % 4 === 0 ? 26 : 14; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)); ctx.lineTo(cx + Math.cos(a) * (R - 6 - l), cy + Math.sin(a) * (R - 6 - l)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(cx - 60, cy); ctx.lineTo(cx + 60, cy); ctx.moveTo(cx, cy - 60); ctx.lineTo(cx, cy + 60); ctx.stroke();
    /* barra de escala (sin texto) */
    ctx.strokeStyle = '#ffffffdd'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx + 150, cy + R - 70); ctx.lineTo(cx + 330, cy + R - 70); ctx.moveTo(cx + 150, cy + R - 82); ctx.lineTo(cx + 150, cy + R - 58); ctx.moveTo(cx + 330, cy + R - 82); ctx.lineTo(cx + 330, cy + R - 58); ctx.stroke();
    /* reflejos de luz de laboratorio fuera del aro */
    halo(ctx, cx, cy, 900, P.glow, .12);
  }
  const SCR = [
    { top: 1110, sun: { x: 790, y: 1112 }, seed: 8, glow: '#ff8a4c', sunCol: '#fff0c8', atm: '#5fc6ff', land: ['#061a52', '#0c3f94', '#071a4e'], light: ['rgba(255,200,150,.7)', 'rgba(255,130,120,.28)', 'rgba(60,170,255,.18)'], cloud: '#ffe6dc', city: '#ffd57a',
      band: '#14b8c4', band2: '#ff5d73', x: 548, y: 1040, rot: .045, smoke: ['255,238,215', '255,170,140', '90,100,170'], bg: [[0, '#01020a'], [.35, '#070d3a'], [.6, '#122b78'], [.78, '#3b3d9c'], [1, '#ff9b6b']] },
    null
  ];
  SCENES['science-c'] = {
    topic: 'science', stillT: [.25, .6],
    cap: [
      { ca: 'Enlairament amb alba sobre la Terra: pell de gallina 🚀 #ciència #espai', es: 'Despegue con amanecer sobre la Tierra: piel de gallina 🚀 #ciencia #espacio', en: 'Liftoff at dawn above Earth: goosebumps 🚀 #science #space' },
      { ca: 'Cèl·lules i bacteris que brillen sota el microscopi 🔬 #ciència #biologia', es: 'Células y bacterias que brillan bajo el microscopio 🔬 #ciencia #biología', en: 'Cells and bacteria glowing under the microscope 🔬 #science #biology' }],
    draw(ctx, t, v) {
      if (v % 2) { microscope(ctx, t, v); L.vignette(ctx, W, H, .4); return; }
      const o = SCR[0];
      fillBG(ctx, o.bg);
      L.stars(ctx, 220, 31, t, { y1: 1050, alpha: .9 });
      const r = rng(5); for (let i = 0; i < 8; i++) sparkle(ctx, r() * W, 230 + r() * 700, 12 + r() * 14, .4 + .6 * wave01(t, 1 + i % 2, r()), '#fff');
      earthArc(ctx, t, o);
      plume(ctx, t, o);
      rocket(ctx, t, o);
      /* chispas */
      L.loopParticles(26, 12, t, (i, p, q) => { const x = o.x + (q() - .5) * 260 * p + 40 * Math.sin(p * 7 + i), y = o.y + 240 + p * 520; ctx.fillStyle = `rgba(255,${180 + (i % 3) * 25},90,${.9 * Math.sin(Math.PI * p)})`; circle(ctx, x, y, 2 + q() * 3); ctx.fill(); });
      L.vignette(ctx, W, H, .4);
    }
  };
/*__NEXT__*/
})();
