/* SPORT – a: balón botando en estadio nocturno · b: canasta · c: foto (piscina / pista) */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, halo, rng, circle, mix, lerp, clamp, smooth, easeOut, rr, ellipse } = L;
  const W = 1080, H = 1920;
  const frac = (x) => ((x % 1) + 1) % 1;

  /* ---------- geometría del balón de fútbol (icosaedro truncado, diseño genérico) ---------- */
  const BALL = (() => {
    const p = (1 + Math.sqrt(5)) / 2;
    const V = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]].map(v => { const n = Math.hypot(v[0], v[1], v[2]); return [v[0] / n, v[1] / n, v[2] / n]; });
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const nb = V.map((a, i) => V.map((b, j) => j).filter(j => j !== i && dot(a, V[j]) > .4));
    const th = .349;
    const tang = (i, j) => { const a = V[i], b = V[j], d = dot(a, b); let u = [b[0] - a[0] * d, b[1] - a[1] * d, b[2] - a[2] * d]; const n = Math.hypot(u[0], u[1], u[2]); return u.map(x => x / n); };
    const toward = (i, j) => { const a = V[i], u = tang(i, j); return a.map((x, k) => x * Math.cos(th) + u[k] * Math.sin(th)); };
    const pent = V.map((a, i) => {
      const e1 = tang(i, nb[i][0]); const e2 = [a[1] * e1[2] - a[2] * e1[1], a[2] * e1[0] - a[0] * e1[2], a[0] * e1[1] - a[1] * e1[0]];
      return nb[i].map(j => { const u = tang(i, j); return [Math.atan2(dot(u, e2), dot(u, e1)), toward(i, j)]; }).sort((p, q) => p[0] - q[0]).map(o => o[1]);
    });
    const seams = [];
    for (let i = 0; i < 12; i++) nb[i].forEach(j => { if (j > i) seams.push([toward(i, j), toward(j, i)]); });
    return { V, pent, seams };
  })();

  function soccerBall(ctx, x, y, r, sx, sy, spin, tilt, roll, pal) {
    const c1 = Math.cos(spin), s1 = Math.sin(spin), c2 = Math.cos(tilt), s2 = Math.sin(tilt), c3 = Math.cos(roll), s3 = Math.sin(roll);
    const rot = (v) => { const x1 = v[0] * c1 + v[2] * s1, z1 = -v[0] * s1 + v[2] * c1, y1 = v[1]; const y2 = y1 * c2 - z1 * s2, z2 = y1 * s2 + z1 * c2; return [x1 * c3 - y2 * s3, x1 * s3 + y2 * c3, z2]; };
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    circle(ctx, 0, 0, r); ctx.fillStyle = lin(ctx, -r, -r, r, r, [[0, '#ffffff'], [1, pal.ballShade || '#cfd6e8']]); ctx.fill();
    ctx.save(); circle(ctx, 0, 0, r); ctx.clip();
    // costuras
    ctx.strokeStyle = pal.seam || 'rgba(60,70,110,.55)'; ctx.lineWidth = r * .028; ctx.lineCap = 'round';
    BALL.seams.forEach(([a, b]) => {
      let prev = null;
      for (let k = 0; k <= 5; k++) {
        const q = k / 5; let v = [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q]; const n = Math.hypot(v[0], v[1], v[2]); v = rot([v[0] / n, v[1] / n, v[2] / n]);
        if (v[2] > .02) { if (prev) { ctx.beginPath(); ctx.moveTo(prev[0] * r, prev[1] * r); ctx.lineTo(v[0] * r, v[1] * r); ctx.stroke(); } prev = v; } else prev = null;
      }
    });
    // pentágonos
    BALL.pent.forEach((poly, i) => {
      const c = rot(BALL.V[i]); if (c[2] < -.35) return;
      ctx.beginPath();
      poly.forEach((q, k) => { let v = rot(q); let px = v[0], py = v[1]; if (v[2] < 0) { const n = Math.hypot(px, py) || 1; px /= n; py /= n; } k ? ctx.lineTo(px * r, py * r) : ctx.moveTo(px * r, py * r); });
      ctx.closePath(); ctx.fillStyle = pal.pent; ctx.fill(); ctx.strokeStyle = pal.pent; ctx.lineWidth = r * .012; ctx.stroke();
    });
    // iluminación
    ctx.fillStyle = rad(ctx, -r * .35, -r * .4, r * .05, r * 1.25, [[0, 'rgba(255,255,255,.55)'], [.35, 'rgba(255,255,255,0)'], [.7, 'rgba(20,30,70,.18)'], [1, 'rgba(10,15,50,.5)']]); ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = rad(ctx, r * .5, r * .55, 0, r * .9, [[0, pal.bounce || 'rgba(120,255,160,.25)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.restore();
  }

  /* ---------- SPORT-A ---------- */
  const PA = [
    { // noche fría
      sky: ['#040a22', '#0a2a5e', '#2a78b0'], haze: '#8fdcff', stand: ['#0a1330', '#17254f'], roof: '#0b1030', lamp: '#eaf7ff', beam: '234,247,255',
      grass: ['#2bad5c', '#14783a'], grassHaze: 'rgba(120,210,255,', line: 'rgba(255,255,255,.88)', ad: ['#ff3d71', '#00d1ff', '#ffd23f', '#7cff6b'],
      ball: { pent: '#101a3c', seam: 'rgba(55,70,120,.5)', bounce: 'rgba(120,255,160,.3)' }, trail: '190,236,255', crowd: ['#233a7a', '#3a2a74', '#1d5a84', '#4a2a5a'], sun: false
    },
    { // atardecer dorado
      sky: ['#2a1050', '#c2417f', '#ffb066'], haze: '#ffd9a0', stand: ['#2a0f3a', '#5a1f55'], roof: '#1d0a2c', lamp: '#fff2d0', beam: '255,236,190',
      grass: ['#3cc778', '#1f9a58'], grassHaze: 'rgba(255,190,130,', line: 'rgba(255,250,235,.9)', ad: ['#fff1a8', '#ff6b9a', '#6cf0ff', '#ffffff'],
      ball: { pent: '#c4175e', seam: 'rgba(150,40,90,.45)', bounce: 'rgba(120,255,170,.3)' }, trail: '255,214,232', crowd: ['#6a2a6a', '#8a3a5a', '#4a2a70', '#a04a50'], sun: true
    }
  ];

  function drawStadium(c, P, v, t, hz) {
    // cielo
    c.fillStyle = lin(c, 0, 0, 0, 640, [[0, P.sky[0]], [.55, P.sky[1]], [1, P.sky[2]]]); c.fillRect(0, 0, W, 700);
    L.stars(c, 70, 31 + v, t, { y1: 430, alpha: P.sun ? .35 : .8 });
    if (P.sun) { halo(c, 540, 640, 760, '#ffb066', .75); halo(c, 540, 640, 300, '#fff0c8', .9); c.fillStyle = '#fff4d8'; circle(c, 540, 650, 110); c.fill(); }
    // gradas
    const roofY = 560;
    c.fillStyle = lin(c, 0, roofY, 0, 850, [[0, P.stand[1]], [1, P.stand[0]]]);
    c.beginPath(); c.moveTo(0, roofY + 40); c.quadraticCurveTo(540, roofY - 50, W, roofY + 40); c.lineTo(W, 890); c.lineTo(0, 890); c.closePath(); c.fill();
    if (P.sun) { // el sol asoma por un hueco entre gradas
      c.save(); c.beginPath(); c.moveTo(0, roofY + 40); c.quadraticCurveTo(540, roofY - 50, W, roofY + 40); c.lineTo(W, 890); c.lineTo(0, 890); c.closePath(); c.clip();
      c.fillStyle = lin(c, 0, 640, 0, 830, [[0, 'rgba(255,200,140,0)'], [1, 'rgba(255,170,110,.55)']]); c.fillRect(300, 640, 480, 200); c.restore();
    }
    // público
    const r = rng(40 + v);
    for (let row = 0; row < 5; row++) {
      for (let i = 0; i < 40; i++) {
        const x = i * 28 + (row % 2) * 14 + r() * 10, y = 640 + row * 36 + r() * 8; const col = P.crowd[(i + row) % 4];
        c.globalAlpha = .75; c.fillStyle = col; circle(c, x, y, 9 + row * .8); c.fill();
        c.globalAlpha = .45; c.fillStyle = P.stand[0]; L.rr(c, x - 10, y + 7, 20, 30, 8); c.fill();
      }
    }
    c.globalAlpha = 1;
    // flashes de móviles / bengalas de luz
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = 640 + r() * 200, k = 1 + Math.floor(r() * 3), ph = r(); const a = Math.pow(wave01(t, k, ph), 10);
      c.globalAlpha = a; c.fillStyle = '#fff'; circle(c, x, y, 3.5); c.fill(); halo(c, x, y, 26, P.lamp, a * .6);
    }
    c.globalAlpha = 1;
    // techo con tira de luz
    c.fillStyle = P.roof; c.beginPath(); c.moveTo(0, roofY + 40); c.quadraticCurveTo(540, roofY - 50, W, roofY + 40); c.lineTo(W, roofY + 8); c.quadraticCurveTo(540, roofY - 90, 0, roofY + 8); c.closePath(); c.fill();
    c.strokeStyle = `rgba(${P.beam},.55)`; c.lineWidth = 3; c.beginPath(); c.moveTo(0, roofY + 44); c.quadraticCurveTo(540, roofY - 46, W, roofY + 44); c.stroke();
    // vallas LED
    for (let i = 0; i < 12; i++) {
      const x = i * 90; c.fillStyle = P.ad[i % 4]; c.globalAlpha = .9; c.fillRect(x, 856, 88, 30);
      const sx = frac((t + i / 12 * 4) * 1) * 1080; // brillo que recorre
      c.globalAlpha = 1;
    }
    c.fillStyle = lin(c, 0, 856, 0, 886, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(0,0,0,.45)']]); c.fillRect(0, 856, W, 30);
    for (let k = 0; k < 2; k++) { const sx = frac(t + k / 2) * (W + 400) - 200; c.fillStyle = lin(c, sx - 140, 0, sx + 140, 0, [[0, 'rgba(255,255,255,0)'], [.5, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(sx - 140, 856, 280, 30); }
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, 886, W, 6);
  }

  function floodlight(c, P, x, y, t, ph, flip, tx, ty) {
    // torre
    c.strokeStyle = '#0a0f26'; c.lineWidth = 7; c.beginPath(); c.moveTo(x - 20, y + 40); c.lineTo(x - 26, 640); c.moveTo(x + 20, y + 40); c.lineTo(x + 26, 640); c.stroke();
    c.lineWidth = 3; c.beginPath(); for (let yy = y + 60; yy < 620; yy += 44) { c.moveTo(x - 22, yy); c.lineTo(x + 22, yy + 44); c.moveTo(x + 22, yy); c.lineTo(x - 22, yy + 44); } c.stroke();
    // haz
    c.save(); c.globalCompositeOperation = 'lighter';
    const sw = 40 * wave(t, 1, ph);
    [[1, .07], [.66, .07], [.34, .08]].forEach(([k, a]) => {
      c.fillStyle = lin(c, x, y, tx, ty, [[0, `rgba(${P.beam},${a * 2})`], [.6, `rgba(${P.beam},${a})`], [1, `rgba(${P.beam},0)`]]);
      c.beginPath(); c.moveTo(x - 46 * k, y + 10); c.lineTo(x + 46 * k, y + 10); c.lineTo(tx + 330 * k + sw, ty); c.lineTo(tx - 330 * k + sw, ty); c.closePath(); c.fill();
    });
    c.restore();
    // cabezal
    c.fillStyle = '#10163a'; rr(c, x - 78, y - 50, 156, 100, 14); c.fill();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const lx = x - 54 + i * 36, ly = y - 28 + j * 28; c.fillStyle = P.lamp; circle(c, lx, ly, 11); c.fill(); }
    halo(c, x, y, 420, P.lamp, .75 + .1 * wave(t, 2, ph)); halo(c, x, y, 170, '#ffffff', .9);
    c.save(); c.globalCompositeOperation = 'lighter'; [0, Math.PI / 2].forEach(a => { c.save(); c.translate(x, y); c.rotate(a + .1); c.fillStyle = lin(c, -300, 0, 300, 0, [[0, 'rgba(255,255,255,0)'], [.5, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(-300, -2.5, 600, 5); c.restore(); }); c.restore();
  }

  function ballState(tt, v) {
    const u = frac(tt * 4), hgt = 4 * u * (1 - u);
    const dir = v % 2 ? -1 : 1, ang = dir * TAU * tt + (v % 2 ? 1.4 : .3);
    const X = (v % 2 ? -.12 : 0) + .72 * Math.cos(ang), Z = 2.65 + .75 * Math.sin(ang);
    return { u, hgt, X, Z };
  }

  SCENES['sport-a'] = {
    topic: 'sport', stillT: [.03, .105],
    cap: [
      { ca: 'El bot perfecte sota els focus ⚽ #futbol #nit', es: 'El bote perfecto bajo los focos ⚽ #futbol #noche', en: 'The perfect bounce under the floodlights ⚽ #football #night' },
      { ca: 'Pilota, gespa i posta de sol ⚽ #futbol', es: 'Balón, césped y puesta de sol ⚽ #futbol', en: 'Ball, grass and a golden sunset ⚽ #football' }],
    draw(ctx, t, v) {
      const P = PA[v % PA.length], hz = 800, A = 1250, B = 1000;
      const gY = (z) => hz + A / z, gX = (X, z) => 540 + X * B / z;
      drawStadium(ctx, P, v, t, hz);
      // ---- césped en franjas ----
      const gend = gY(14.6);
      ctx.fillStyle = P.grass[1]; ctx.fillRect(0, gend, W, H - gend);
      for (let k = 0; k < 14; k++) { const z0 = .6 + k * 1.05, z1 = z0 + 1.05; if (k % 2 === 0) { ctx.fillStyle = P.grass[0]; ctx.fillRect(0, gY(z1), W, gY(z0) - gY(z1) + 1); } }
      // líneas del campo (polígonos en perspectiva)
      ctx.fillStyle = P.line;
      const seg = (X1, Z1, X2, Z2, w) => { const dx = X2 - X1, dz = Z2 - Z1, n = Math.hypot(dx, dz) || 1, nx = -dz / n * w, nz = dx / n * w; ctx.beginPath(); ctx.moveTo(gX(X1 + nx, Z1 + nz), gY(Z1 + nz)); ctx.lineTo(gX(X2 + nx, Z2 + nz), gY(Z2 + nz)); ctx.lineTo(gX(X2 - nx, Z2 - nz), gY(Z2 - nz)); ctx.lineTo(gX(X1 - nx, Z1 - nz), gY(Z1 - nz)); ctx.closePath(); ctx.fill(); };
      const Z0 = 2.65, R = 1.1, cx0 = v % 2 ? -.12 : 0;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU; const X = cx0 + (R + .045) * Math.cos(a), Z = Z0 + (R + .045) * Math.sin(a); i ? ctx.lineTo(gX(X, Z), gY(Z)) : ctx.moveTo(gX(X, Z), gY(Z)); }
      ctx.closePath();
      for (let i = 120; i >= 0; i--) { const a = i / 120 * TAU; const X = cx0 + (R - .045) * Math.cos(a), Z = Z0 + (R - .045) * Math.sin(a); i < 120 ? ctx.lineTo(gX(X, Z), gY(Z)) : ctx.moveTo(gX(X, Z), gY(Z)); }
      ctx.closePath(); ctx.fill('evenodd');
      seg(-8, Z0, 8, Z0, .05);
      ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU; const X = cx0 + .09 * Math.cos(a), Z = Z0 + .09 * Math.sin(a); i ? ctx.lineTo(gX(X, Z), gY(Z)) : ctx.moveTo(gX(X, Z), gY(Z)); } ctx.fill();
      // área grande lejana + línea de fondo
      seg(-4.2, 9.2, 4.2, 9.2, .05); seg(-4.2, 9.2, -4.2, 14.4, .05); seg(4.2, 9.2, 4.2, 14.4, .05); seg(-2, 12, 2, 12, .04); seg(-2, 12, -2, 14.4, .04); seg(2, 12, 2, 14.4, .04); seg(-12, 14.4, 12, 14.4, .06);
      // bruma y focos de luz sobre la hierba
      ctx.fillStyle = lin(ctx, 0, gend - 4, 0, 1200, [[0, P.grassHaze + '.7)'], [.3, P.grassHaze + '.2)'], [1, P.grassHaze + '0)']]); ctx.fillRect(0, gend - 4, W, 1200 - gend);
      halo(ctx, 540, 1180, 820, P.lamp, .2 + .04 * wave(t, 2));
      ctx.fillStyle = lin(ctx, 0, 1450, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,10,30,.55)']]); ctx.fillRect(0, 1450, W, H - 1450);
      // focos
      floodlight(ctx, P, 130, 330, t, 0, false, 400, 1280);
      floodlight(ctx, P, 950, 380, t, .5, true, 680, 1280);
      // ---- balón ----
      const r0 = .44;
      const st = ballState(t, v);
      const proj = (s) => { const sc = B / s.Z; return { sc, gx: gX(s.X, s.Z), gy: gY(s.Z), rs: r0 * sc }; };
      const p = proj(st);
      // sombra
      const hpx = st.hgt * 1.05 * p.sc;
      const shK = 1 - .55 * st.hgt;
      ctx.save(); L.shadowEllipse(ctx, p.gx, p.gy, p.rs * 1.25 * shK + 6, p.rs * .32 * shK + 2, .65 * (.5 + .5 * shK)); ctx.restore();
      // estela
      for (let i = 14; i >= 1; i--) {
        const s2 = ballState(t - i * .0036, v), q = proj(s2), hp = s2.hgt * 1.05 * q.sc;
        const a = .26 * Math.pow(1 - i / 15, 1.3);
        ctx.fillStyle = `rgba(${P.trail},${a})`; circle(ctx, q.gx, q.gy - q.rs - hp, q.rs * (1 - i * .028)); ctx.fill();
      }
      // squash & stretch
      const d = Math.min(st.u, 1 - st.u), sq = smooth(1 - d / .075), vel = Math.abs(1 - 2 * st.u);
      const syS = (1 + .13 * vel * vel) * (1 - .3 * sq), sxS = 1 / Math.sqrt(syS);
      const cy = p.gy - p.rs * syS - hpx;
      // partículas de césped al tocar el suelo
      if (st.u < .4) {
        const q = st.u / .4, a = (1 - q) * smooth(q * 10);
        const rr2 = rng(90 + v);
        for (let i = 0; i < 12; i++) { const ang = -Math.PI * (.12 + .76 * rr2()), sp = (60 + rr2() * 150) * p.sc / 350; const px = p.gx + Math.cos(ang) * sp * q * 1.5, py = p.gy + Math.sin(ang) * sp * q * 1.5 + 240 * q * q * p.sc / 350; ctx.fillStyle = i % 3 ? P.grass[0] : '#d6ffd2'; ctx.globalAlpha = a; circle(ctx, px, py, (4 + rr2() * 5) * p.sc / 350); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      halo(ctx, p.gx, p.gy - 6, p.rs * 2.2, `rgba(${P.beam},.9)`, .3 * sq);
      soccerBall(ctx, p.gx, cy, p.rs, sxS, syS, TAU * t * 3 * (v % 2 ? -1 : 1), .55 + .12 * wave(t, 1), .25 * wave(t, 1, .2), P.ball);
      // polvo en suspensión en los haces
      L.loopParticles(26, 17 + v, t, (i, pp, r) => { const x = 60 + r() * 960, y = 480 + r() * 900 - pp * 120; ctx.fillStyle = `rgba(${P.beam},${.55 * Math.sin(Math.PI * pp)})`; circle(ctx, x + 24 * Math.sin(pp * TAU + i), y, 2 + r() * 2.5); ctx.fill(); });
      L.vignette(ctx, W, H, .5);
    }
  };

  /* ---------- SPORT-B ---------- */
  const PB = [
    { // pabellón neón
      sky: ['#0a0524', '#1a0b4a', '#3a1470'], floor: ['#d99552', '#a85f2c', '#4a240f'], plank: 'rgba(80,30,0,.09)', key: '#6a2bd8', keyLine: 'rgba(255,255,255,.92)',
      ball: ['#ff8a3a', '#e8581a', '#b83a0c'], seam: '#3a1608', neon: ['#ff2fa3', '#18d6ff', '#ffd23a', '#9a6bff'], light: '255,244,214', rim: '#ff5a2a', board: 'rgba(210,235,255,.28)', boardLine: '#ff5a2a',
      RX: 540, RY: 790, dir: 1, S: 1.3, mode: 'arena'
    },
    { // cancha callejera de noche
      sky: ['#050b22', '#102a5e', '#2b5aa0'], floor: ['#2d8aa6', '#1c6580', '#0b2e40'], plank: 'rgba(0,20,40,.12)', key: '#ff7a3d', keyLine: 'rgba(255,255,255,.9)',
      ball: ['#ff9a45', '#ee6a1e', '#b94610'], seam: '#3a1608', neon: ['#ffd23a', '#7cffd0', '#ff6fb0', '#ffffff'], light: '255,226,170', rim: '#ffb23a', board: 'rgba(230,245,255,.22)', boardLine: '#ffffff',
      RX: 420, RY: 800, dir: -1, S: 1.3, mode: 'street'
    }
  ];
  const CYC = [{ sy: 1400, h: 330 }, { sy: 1500, h: 400 }];

  function basketball(ctx, x, y, r, rot, sx, sy, pal) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    circle(ctx, 0, 0, r); ctx.fillStyle = rad(ctx, -r * .35, -r * .4, r * .1, r * 1.3, [[0, pal.ball[0]], [.55, pal.ball[1]], [1, pal.ball[2]]]); ctx.fill();
    ctx.save(); circle(ctx, 0, 0, r); ctx.clip(); ctx.rotate(rot);
    ctx.strokeStyle = pal.seam; ctx.lineWidth = r * .07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    [-1, 1].forEach(sg => { ctx.beginPath(); ctx.arc(sg * r * 1.25, 0, r * 1.25 + r * .42, Math.PI - 1.0 + (sg > 0 ? 0 : Math.PI) * 0, Math.PI + 1.0 + 0); ctx.stroke(); });
    ctx.restore();
    ctx.fillStyle = rad(ctx, -r * .4, -r * .45, 0, r * .9, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]); circle(ctx, 0, 0, r); ctx.fill();
    ctx.restore();
  }

  function ballAt(p, c, g) {
    const cp = CYC[c], RX = g.RX, RY = g.RY, dir = g.dir, sx0 = dir > 0 ? -170 : W + 170, rim = .46, fl = g.fy, S = g.S;
    let x, y, r, hop = 0, sq = 0, mode = 'air';
    const sqf = (d) => smooth(1 - d / .05);
    if (p < rim) { const q = p / rim; x = lerp(sx0, RX, q); y = cp.sy + (RY - cp.sy) * q - cp.h * 4 * q * (1 - q); r = lerp(125, 70 * S, q); mode = 'shot'; }
    else if (p < .62) {
      const dt = p - rim, T = .16, vD = ((RY - cp.sy) + 4 * cp.h) / rim, fy = fl - 75 * S, aD = 2 * (fy - RY - vD * T) / (T * T);
      y = RY + vD * dt + .5 * aD * dt * dt; x = RX + dir * 28 * (dt / T); r = (70 + 5 * (dt / T)) * S; sq = sqf(.62 - p); mode = 'fall';
    } else {
      const seg = [[.62, .76, [RX + dir * 28, fl, 75 * S], [RX + dir * 100, fl + 190, 105 * S], 150], [.76, .88, [RX + dir * 100, fl + 190, 105 * S], [RX + dir * 170, fl + 410, 150 * S], 110], [.88, 1.0, [RX + dir * 170, fl + 410, 150 * S], [RX + dir * 260, fl + 1250, 250 * S], 90]];
      const s = seg.find(s => p < s[1]) || seg[2], u = (p - s[0]) / (s[1] - s[0]);
      x = lerp(s[2][0], s[3][0], u); const gy = lerp(s[2][1], s[3][1], u); r = lerp(s[2][2], s[3][2], u);
      hop = s[4] * 4 * u * (1 - u) * Math.pow(r / 75 / S, .8); sq = sqf(Math.min(u, 1 - u) * (s[1] - s[0]) / .14 * .14 * 1);
      y = gy - r - hop; mode = 'bounce'; var gyy = gy;
    }
    return { x, y, r, sq, mode, gy: gyy };
  }

  function netPoints(g, bx, by, br, sway, N, M) {
    const pts = [];
    for (let j = 0; j <= M; j++) {
      const k = j / M, yj = g.RY + j * 30, hw0 = lerp(102, 58, k), ery = lerp(22, 12, k);
      let hw = hw0; const d = yj - by; if (Math.abs(d) < br) hw = Math.max(hw0, Math.sqrt(br * br - d * d) * 1.04 + 6);
      const cx = g.RX + sway * Math.pow(k, 1.3) + (hw > hw0 ? (bx - g.RX) * .5 : 0);
      const row = []; for (let i = 0; i < N; i++) { const a = i / N * TAU; row.push([cx + hw * Math.cos(a), yj + ery * Math.sin(a) + (hw > hw0 ? -(hw - hw0) * .15 : 0), Math.sin(a)]); }
      pts.push(row);
    }
    return pts;
  }
  function drawNet(c, pts, front) {
    const M = pts.length - 1, N = pts[0].length;
    c.strokeStyle = front ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.5)'; c.lineWidth = front ? 3.4 : 2.6; c.lineCap = 'round'; c.beginPath();
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
      const a = pts[j][i], b = pts[j + 1][(i + 1) % N], a2 = pts[j][(i + 1) % N], b2 = pts[j + 1][i];
      if (((a[2] + b[2]) > 0) === front) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
      if (((a2[2] + b2[2]) > 0) === front) { c.moveTo(a2[0], a2[1]); c.lineTo(b2[0], b2[1]); }
    }
    c.stroke();
  }

  SCENES['sport-b'] = {
    topic: 'sport', stillT: [.262, .742],
    cap: [
      { ca: 'Cistella neta, sense tocar el ferro 🏀 #basquet #swish', es: 'Canasta limpia, sin tocar aro 🏀 #baloncesto #swish', en: 'Clean swish, nothing but net 🏀 #basketball #swish' },
      { ca: 'Partidet de nit al barri 🏀 #basquet #nit', es: 'Partidito nocturno en el barrio 🏀 #baloncesto #noche', en: 'Late-night game in the neighborhood 🏀 #basketball' }],
    draw(ctx, t, v) {
      const P = PB[v % PB.length], RX = P.RX, RY = P.RY, dir = P.dir, yb = 1090, VPy = 520;
      const S = P.S, g = { RX, RY, fy: 1250, dir, S };
      const c2 = Math.floor(t * 2) % 2, p = frac(t * 2);
      // ---------- fondo ----------
      ctx.fillStyle = lin(ctx, 0, 0, 0, yb, [[0, P.sky[0]], [.6, P.sky[1]], [1, P.sky[2]]]); ctx.fillRect(0, 0, W, yb + 4);
      const r = rng(60 + v);
      if (P.mode === 'arena') {
        // bokeh de grada
        for (let i = 0; i < 46; i++) { const x = r() * W, y = 330 + r() * 650, rr2 = 30 + r() * 60, k = 1 + Math.floor(r() * 2), ph = r(); halo(ctx, x, y, rr2, P.neon[i % 4], (.18 + .22 * wave01(t, k, ph)) * (.5 + (y - 330) / 650)); }
        // vigas con luces
        for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(10,5,40,.8)'; ctx.fillRect(0, 250 + i * 14, W, 5); }
        // franja LED
        for (let i = 0; i < 18; i++) { const a = .45 + .55 * wave01(t, 1, -i / 18); ctx.fillStyle = P.neon[(i >> 1) % 4]; ctx.globalAlpha = a; ctx.fillRect(i * 60 + 3, 1020, 54, 56); halo(ctx, i * 60 + 30, 1048, 60, P.neon[(i >> 1) % 4], a * .5); }
        ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 1076, W, 20);
      } else {
        // luna y rascacielos
        halo(ctx, 780, 380, 520, '#9ec8ff', .5); ctx.fillStyle = '#f4f8ff'; circle(ctx, 780, 380, 70); ctx.fill();
        L.stars(ctx, 70, 12, t, { y1: 600, alpha: .7 });
        for (let layer = 0; layer < 2; layer++) {
          const rb = rng(200 + layer * 7); let x = -20;
          while (x < W) { const bw = 90 + rb() * 110, bh = (layer ? 200 : 330) + rb() * (layer ? 160 : 260); const top = yb - bh; ctx.fillStyle = layer ? '#10224e' : '#0a1538'; ctx.fillRect(x, top, bw, bh + 4);
            for (let wy = top + 24; wy < yb - 20; wy += 34) for (let wx = x + 14; wx < x + bw - 16; wx += 26) { const q = rb(); if (q < .32) { const tw = wave01(t, 1, rb()); ctx.fillStyle = `rgba(255,${200 + (q * 100) | 0},120,${.35 + .4 * tw * (layer ? .6 : 1)})`; ctx.fillRect(wx, wy, 11, 16); } }
            x += bw + rb() * 14; }
        }
        // valla metálica
        ctx.save(); ctx.beginPath(); ctx.rect(0, 800, W, yb - 800 + 8); ctx.clip(); ctx.strokeStyle = 'rgba(190,215,240,.2)'; ctx.lineWidth = 2; ctx.beginPath();
        for (let x = -300; x < W + 300; x += 34) { ctx.moveTo(x, 800); ctx.lineTo(x + 300, yb + 8); ctx.moveTo(x + 300, 800); ctx.lineTo(x, yb + 8); } ctx.stroke(); ctx.restore();
        ctx.fillStyle = 'rgba(190,215,240,.55)'; ctx.fillRect(0, 796, W, 8); [-1, 0, 1].forEach((k) => { ctx.fillStyle = 'rgba(150,175,210,.7)'; ctx.fillRect(RX + k * 540 - 6, 800, 12, yb - 800 + 8); });
        // farola cálida
        const lx = dir > 0 ? 130 : 950; ctx.fillStyle = '#0a1230'; ctx.fillRect(lx - 7, 340, 14, 760); ctx.fillRect(lx - (dir > 0 ? 0 : 70), 336, 70, 12);
        halo(ctx, lx + (dir > 0 ? 62 : -62), 360, 360, `rgb(${P.light})`, .8 + .08 * wave(t, 2)); ctx.fillStyle = '#fff6dc'; circle(ctx, lx + (dir > 0 ? 62 : -62), 358, 16); ctx.fill();
      }
      // ---------- suelo ----------
      ctx.fillStyle = lin(ctx, 0, yb, 0, H, [[0, P.floor[0]], [.35, P.floor[1]], [1, P.floor[2]]]); ctx.fillRect(0, yb, W, H - yb);
      for (let k = -9; k < 9; k++) { if (k % 2) continue; const xb = RX + k * 150, xt = RX + k * 150 * (yb - VPy) / (H - VPy); ctx.fillStyle = P.plank; ctx.beginPath(); ctx.moveTo(xt, yb); ctx.lineTo(xt + 150 * (yb - VPy) / (H - VPy), yb); ctx.lineTo(xb + 150, H); ctx.lineTo(xb, H); ctx.closePath(); ctx.fill(); }
      const fx = (x, y) => RX + (x - RX) * (y - VPy) / (yb - VPy);
      // zona pintada
      const yft = 1520; ctx.fillStyle = P.key; ctx.beginPath(); ctx.moveTo(fx(RX - 150, yb), yb); ctx.lineTo(fx(RX + 150, yb), yb); ctx.lineTo(fx(RX + 150, yft), yft); ctx.lineTo(fx(RX - 150, yft), yft); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lin(ctx, 0, yb, 0, yft, [[0, 'rgba(0,0,0,.35)'], [.5, 'rgba(0,0,0,0)']]); ctx.fill();
      ctx.strokeStyle = P.keyLine; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.stroke();
      const kw = fx(RX + 150, yft) - RX; ctx.beginPath(); ctx.ellipse(RX, yft, kw, kw * .26, 0, 0, Math.PI); ctx.stroke();
      ctx.save(); ctx.setLineDash([26, 24]); ctx.beginPath(); ctx.ellipse(RX, yft, kw, kw * .26, 0, Math.PI, TAU); ctx.stroke(); ctx.restore();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(RX, yb + 6, 560, 500, 0, .12, Math.PI - .12); ctx.stroke(); // línea de 3
      ctx.fillStyle = P.keyLine; ctx.fillRect(0, yb - 4, W, 8); // línea de fondo
      // reflejo / charco de luz
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(RX, 1280); ctx.scale(1, .3); ctx.fillStyle = rad(ctx, 0, 0, 0, 600, [[0, `rgba(${P.light},.55)`], [1, `rgba(${P.light},0)`]]); circle(ctx, 0, 0, 600); ctx.fill(); ctx.restore();
      // ---------- soporte, tablero y aro ----------
      ctx.fillStyle = '#12142e'; ctx.fillRect(RX - 22, RY - 40, 44, yb - RY + 50);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(RX - 22, RY - 40, 8, yb - RY + 50);
      ctx.fillStyle = P.mode === 'arena' ? '#c4243f' : '#ff7a3d'; rr(ctx, RX - 56, yb - 70, 112, 76, 14); ctx.fill();
      const rimCol = P.rim;
      const hoopT = (f) => { ctx.save(); ctx.translate(RX, RY); ctx.scale(S, S); ctx.translate(-RX, -RY); f(); ctx.restore(); };
      hoopT(() => {
      const bx0 = RX - 200, by0 = RY - 320;
      ctx.fillStyle = lin(ctx, bx0, by0, bx0 + 400, by0 + 290, [[0, 'rgba(235,248,255,.5)'], [.5, 'rgba(180,215,255,.22)'], [1, 'rgba(220,240,255,.4)']]); rr(ctx, bx0, by0, 400, 290, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = P.boardLine; ctx.lineWidth = 8; ctx.strokeRect(RX - 78, RY - 118, 156, 100);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(bx0 + 40, by0 + 8); ctx.lineTo(bx0 + 130, by0 + 8); ctx.lineTo(bx0 + 40, by0 + 140); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a93a8'; ctx.fillRect(RX - 16, RY - 24, 32, 22);
      // aro: mitad trasera + red trasera
      ctx.strokeStyle = rimCol; ctx.lineWidth = 11; ctx.beginPath(); ctx.ellipse(RX, RY, 106, 24, 0, Math.PI, TAU); ctx.stroke();
      });
      // estado de la pelota
      const st = ballAt(p, c2, g);
      const swayT = Math.max(0, p - .5), sway = smooth(swayT / .02) * 30 * Math.exp(-swayT * 9) * Math.sin(TAU * 7 * swayT) * dir;
      const inNet = (st.mode === 'fall' || (st.mode === 'shot' && p > .43)) && st.y > RY - 90 * S && st.y < RY + 250 * S;
      const pts = netPoints(g, RX + (st.x - RX) / S, RY + (st.y - RY) / S, inNet ? st.r / S : 0, sway, 12, 6);
      hoopT(() => drawNet(ctx, pts, false));
      // ---------- balón (estela + sombra + balón) ----------
      if (st.mode === 'bounce' || st.mode === 'fall') { const gy = st.mode === 'bounce' ? st.gy : 1250; const hh = Math.max(0, gy - st.r - st.y); const k = clamp(1 - hh / 420, .15, 1); L.shadowEllipse(ctx, st.x, gy, st.r * 1.4 * k + 8, st.r * .38 * k + 3, .55 * k); }
      const sandwich = p >= .38 && p < .62 && st.y > RY - 170 * S && st.y < RY + 250 * S;
      const drawBall = () => {
        if (st.mode === 'shot' || st.mode === 'fall') for (let k = 6; k >= 1; k--) { const sp = p - k * .0085; if (sp < 0) continue; const s2 = ballAt(sp, c2, g); if (s2.mode !== st.mode && !(s2.mode === 'shot' && st.mode === 'fall')) continue; ctx.fillStyle = `rgba(${P.mode === 'arena' ? '255,150,70' : '255,170,90'},${.28 * (1 - k / 7)})`; circle(ctx, s2.x, s2.y, s2.r * (1 - k * .03)); ctx.fill(); }
        const sxs = 1 + .28 * st.sq, sys = 1 - .26 * st.sq; const cy = st.y + st.r * (1 - sys);
        basketball(ctx, st.x, cy, st.r, dir * (p * TAU * 3 + c2 * 1.1), sxs, sys, P);
      };
      if (!sandwich) drawBall();
      else { drawBall(); }
      // red delantera y aro delantero
      hoopT(() => { drawNet(ctx, pts, true);
      ctx.strokeStyle = rimCol; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(RX, RY, 106, 24, 0, 0, Math.PI); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(RX, RY - 3, 100, 20, 0, .3, Math.PI - .3); ctx.stroke(); });
      // ---------- destello al encestar ----------
      const fk = (p - .47) / .26;
      if (fk > 0 && fk < 1) {
        const a = Math.pow(1 - fk, 1.6), e = easeOut(fk);
        halo(ctx, RX, RY + 30, 420 * (.5 + e), '#fff7d6', .5 * a); halo(ctx, RX, RY + 30, 200, '#ffffff', .55 * a);
        ctx.strokeStyle = `rgba(255,240,200,${a})`; ctx.lineWidth = 10 * (1 - fk) + 2; ctx.beginPath(); ctx.ellipse(RX, RY + 10, 90 + 230 * e, (90 + 230 * e) * .3, 0, 0, TAU); ctx.stroke();
        const rs = rng(5);
        for (let i = 0; i < 16; i++) { const ang = rs() * TAU, sp = 140 + rs() * 380; const px = RX + Math.cos(ang) * sp * e * .8, py = RY + 10 + Math.sin(ang) * sp * e * .8 + 220 * fk * fk; ctx.save(); ctx.translate(px, py); ctx.rotate(ang + fk * 3); ctx.fillStyle = `rgba(255,${200 + (rs() * 55 | 0)},${120 + (rs() * 100 | 0)},${a})`; const s = (8 + rs() * 12) * (1 - fk * .5); ctx.beginPath(); ctx.moveTo(0, -s * 2); ctx.lineTo(s * .45, -s * .45); ctx.lineTo(s * 2, 0); ctx.lineTo(s * .45, s * .45); ctx.lineTo(0, s * 2); ctx.lineTo(-s * .45, s * .45); ctx.lineTo(-s * 2, 0); ctx.lineTo(-s * .45, -s * .45); ctx.closePath(); ctx.fill(); ctx.restore(); }
      }
      // ---------- foco cenital ----------
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      [[1, .1], [.66, .09], [.36, .09]].forEach(([k, a]) => { ctx.fillStyle = lin(ctx, RX, 0, RX, 1500, [[0, `rgba(${P.light},${a * 2.4})`], [.5, `rgba(${P.light},${a})`], [1, `rgba(${P.light},0)`]]); ctx.beginPath(); ctx.moveTo(RX - 30 * k - 6, 40); ctx.lineTo(RX + 30 * k + 6, 40); ctx.lineTo(RX + 420 * k, 1500); ctx.lineTo(RX - 420 * k, 1500); ctx.closePath(); ctx.fill(); });
      ctx.restore();
      ctx.fillStyle = '#0c0a22'; rr(ctx, RX - 70, -20, 140, 66, 16); ctx.fill(); halo(ctx, RX, 50, 200, `rgb(${P.light})`, .9);
      L.loopParticles(24, 8 + v, t, (i, pp, rn) => { const x = RX - 220 + rn() * 440, y = 260 + rn() * 1100 - pp * 140; ctx.fillStyle = `rgba(${P.light},${.5 * Math.sin(Math.PI * pp)})`; circle(ctx, x + 20 * Math.sin(pp * TAU + i), y, 2 + rn() * 2.4); ctx.fill(); });
      ctx.fillStyle = lin(ctx, 0, 1500, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.5)']]); ctx.fillRect(0, 1500, W, H - 1500);
      L.vignette(ctx, W, H, .55);
    }
  };

  /* ---------- SPORT-C (foto): v0 piscina cenital · v1 pista de atletismo al atardecer ---------- */
  function swimmer(c, x, y, s, rot, t, ph, skin, suit, cap) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    const a = wave01(t, 4, ph), kick = wave(t, 8, ph + .25);
    const arm = (sg) => {
      const hx = sg * lerp(112, 66, a), hy = lerp(-262, 62, a), sx = sg * 40, sy = -50;
      const ex = (sx + hx) / 2 + sg * 40 * Math.sin(Math.PI * a) + sg * 18, ey = (sy + hy) / 2;
      c.strokeStyle = skin; c.lineCap = 'round'; c.lineJoin = 'round';
      c.lineWidth = 27; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
      c.lineWidth = 22; c.beginPath(); c.moveTo(ex, ey); c.lineTo(hx, hy); c.stroke();
      c.fillStyle = skin; ellipse(c, hx, hy - 10, 14, 24, sg * -.15); c.fill();
    };
    // piernas / delfín
    c.strokeStyle = skin; c.lineCap = 'round'; c.lineWidth = 36;
    c.beginPath(); c.moveTo(0, 100); c.quadraticCurveTo(kick * 14, 170, kick * 34, 240); c.stroke();
    c.lineWidth = 28; c.beginPath(); c.moveTo(0, 100); c.quadraticCurveTo(kick * 14, 170, kick * 34, 240); c.stroke();
    c.fillStyle = skin; ellipse(c, kick * 36, 262, 36, 12, kick * .5); c.fill();
    arm(-1); arm(1);
    // tronco
    c.fillStyle = skin; ellipse(c, 0, 8, 50, 88); c.fill();
    c.save(); ellipse(c, 0, 8, 50, 88); c.clip(); c.fillStyle = suit; c.fillRect(-60, 34, 120, 90); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-60, 44, 120, 7); c.restore();
    // cabeza con gorro
    c.fillStyle = cap; circle(c, 0, -96, 32); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 6; c.beginPath(); c.arc(0, -96, 20, Math.PI * 1.15, Math.PI * 1.75); c.stroke();
    c.restore();
  }

  function pool(ctx, t, v) {
    const LW = 190, ph = .0;
    const pal = { w: ['#19cfd9', '#0e97c9', '#0a5fa8'], rope: ['#ff4d6d', '#ffffff', '#ffd23f'], skins: ['#ffc9a0', '#b7703f', '#f0b080'], suits: ['#13204a', '#ff4d6d', '#13204a'], caps: ['#ff4d6d', '#ffd23f', '#ffffff'] };
    ctx.save(); ctx.translate(540, 960); ctx.rotate(-.13); ctx.translate(-540, -960);
    ctx.fillStyle = lin(ctx, 0, -400, 0, 2300, [[0, pal.w[0]], [.5, pal.w[1]], [1, pal.w[2]]]); ctx.fillRect(-500, -500, 2100, 3000);
    // líneas de calle en el fondo
    for (let i = -2; i < 8; i++) { const cx = 95 + i * LW; ctx.fillStyle = 'rgba(8,40,110,.55)'; ctx.fillRect(cx - 7, -500, 14, 3000); ctx.fillRect(cx - 40, 1640, 80, 12); }
    // nadadores (con sombra)
    const sw = [[95 + 1 * LW, 620, .95, .0, 0, 1], [95 + 2 * LW, 1010, 1.18, 0, .35, 0], [95 + 4 * LW, 1380, 1.0, 0, .7, 2], [95 + 0 * LW, 1440, .9, 0, .15, 2]];
    sw.forEach(([x, y, s, rot, phh, k]) => {
      ctx.save(); ctx.globalAlpha = .22; swimmer(ctx, x + 26, y + 26, s, rot, t, phh, '#06305a', '#06305a', '#06305a'); ctx.restore();
      swimmer(ctx, x, y, s, rot, t, phh, pal.skins[k], pal.suits[k], pal.caps[k]);
    });
    // tinte del agua
    ctx.fillStyle = 'rgba(20,170,210,.22)'; ctx.fillRect(-500, -500, 2100, 3000);
    // cáusticas
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let layer = 0; layer < 2; layer++) {
      ctx.strokeStyle = `rgba(210,255,255,${layer ? .09 : .13})`; ctx.lineWidth = layer ? 5 : 3.5;
      for (let i = 0; i < 34; i++) { const y0 = -300 + i * 78 + layer * 38; ctx.beginPath(); for (let x = -300; x <= 1400; x += 20) { const yy = y0 + 22 * Math.sin(x * .012 + i * 1.7 + TAU * t * (layer ? 2 : 1)) + 16 * Math.sin(x * .031 - i * .9 + TAU * t * 3 + layer); x === -300 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); }
    }
    ctx.restore();
    // espuma de estela y salpicaduras
    sw.forEach(([x, y, s, rot, phh]) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      const a = wave01(t, 4, phh);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      [-1, 1].forEach(sg => { ctx.beginPath(); ctx.moveTo(sg * 38, -132); ctx.quadraticCurveTo(sg * 120, -40, sg * (200 + 20 * wave(t, 2, phh)), 360); ctx.stroke(); ctx.globalAlpha = .6; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sg * 60, -120); ctx.quadraticCurveTo(sg * 190, 0, sg * (300 + 20 * wave(t, 2, phh + .2)), 420); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 6; });
      // arco de proa
      ctx.beginPath(); ctx.arc(0, -120, 52, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      // salpicadura de manos al entrar
      const sp = Math.pow(1 - a, 2); ctx.fillStyle = `rgba(255,255,255,${.75 * sp})`;
      [-1, 1].forEach(sg => { const rs = rng(3); for (let i = 0; i < 9; i++) { circle(ctx, sg * (112 + (rs() - .5) * 60), -262 - rs() * 40 * sp + (rs() - .5) * 30, 4 + rs() * 7 * sp); ctx.fill(); } });
      ctx.restore();
      // ondas concéntricas
      for (let k = 0; k < 3; k++) { const q = frac(t * 2 + k / 3 + phh); ctx.strokeStyle = `rgba(255,255,255,${.28 * (1 - q)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y - 250 * s, (40 + q * 230) * s, (30 + q * 150) * s, rot, 0, TAU); ctx.stroke(); }
    });
    // corcheras (boyas)
    for (let i = -2; i < 8; i++) {
      const cx = 95 + i * LW + LW / 2; // entre carriles
      ctx.fillStyle = 'rgba(6,50,100,.28)'; ctx.fillRect(cx + 7, -500, 16, 3000);
      for (let y = -500, k = 0; y < 2500; y += 46, k++) {
        const wob = 3 * Math.sin(y * .02 + TAU * t * 2 + i);
        ctx.fillStyle = lin(ctx, cx - 11 + wob, 0, cx + 11 + wob, 0, [[0, '#ffffff22'], [.3, pal.rope[(k + i + 8) % 3]], [1, 'rgba(0,0,40,.35)']]);
        ctx.fillStyle = pal.rope[(k + i + 9) % 3]; rr(ctx, cx - 11 + wob, y, 22, 42, 9); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(ctx, cx - 7 + wob, y + 4, 6, 34, 3); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,60,.22)'; rr(ctx, cx + 3 + wob, y + 4, 8, 34, 4); ctx.fill();
      }
    }
    // borde de la piscina
    const ex = 95 + 5 * LW - 20;
    ctx.fillStyle = '#f6efe4'; ctx.fillRect(ex, -500, 700, 3000);
    ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let y = -500; y < 2500; y += 90) ctx.fillRect(ex, y, 700, 4); for (let x = ex + 90; x < ex + 700; x += 90) ctx.fillRect(x, -500, 4, 3000);
    ctx.fillStyle = lin(ctx, ex - 60, 0, ex, 0, [[0, 'rgba(0,40,90,0)'], [1, 'rgba(0,40,90,.35)']]); ctx.fillRect(ex - 60, -500, 60, 3000);
    ctx.fillStyle = '#c9d8e2'; ctx.fillRect(ex - 6, -500, 14, 3000);
    ctx.restore();
    L.vignette(ctx, W, H, .35);
  }

  /* runner de perfil (corre hacia +x). Ángulos desde la vertical, positivo = hacia delante */
  function runner(c, x, gy, s, phase, col, accent) {
    const lim = (ax, ay, ang, len) => [ax + Math.sin(ang) * len, ay + Math.cos(ang) * len];
    const hipX = 0, hipY = -150, lean = .24;
    c.save(); c.translate(x, gy); c.scale(s, s);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const leg = (i, shade) => {
      const f = phase + i * Math.PI, th = .22 + .95 * Math.sin(f), kap = .65 + .5 * Math.sin(f + .5);
      const k = lim(hipX, hipY, th, 80), a = lim(k[0], k[1], th - kap, 82);
      c.strokeStyle = shade; c.lineWidth = 34; c.beginPath(); c.moveTo(hipX, hipY); c.lineTo(k[0], k[1]); c.stroke();
      c.lineWidth = 24; c.beginPath(); c.moveTo(k[0], k[1]); c.lineTo(a[0], a[1]); c.stroke();
      c.save(); c.translate(a[0], a[1]); c.rotate(-(th - kap) * .5 + 1.2); c.fillStyle = shade; rr(c, -8, -6, 42, 16, 8); c.fill(); c.restore();
    };
    const sh = lim(hipX, hipY, -lean, -96); sh[1] = hipY - Math.cos(lean) * 96; sh[0] = hipX + Math.sin(lean) * 96;
    const armF = (i, shade) => {
      const f = phase + i * Math.PI, u = -.15 - 1.0 * Math.sin(f), e = 1.55 - .3 * Math.sin(f);
      const el = lim(sh[0], sh[1], u, 62), h = lim(el[0], el[1], u + e, 58);
      c.strokeStyle = shade; c.lineWidth = 22; c.beginPath(); c.moveTo(sh[0], sh[1]); c.lineTo(el[0], el[1]); c.stroke();
      c.lineWidth = 18; c.beginPath(); c.moveTo(el[0], el[1]); c.lineTo(h[0], h[1]); c.stroke();
      c.fillStyle = shade; circle(c, h[0], h[1], 11); c.fill();
    };
    const dark = L.mix(col, '#000000', .35);
    leg(1, dark); armF(0, dark);
    // torso + short + cabeza
    c.strokeStyle = col; c.lineWidth = 54; c.beginPath(); c.moveTo(hipX, hipY + 6); c.lineTo(sh[0], sh[1] + 8); c.stroke();
    c.fillStyle = accent; c.beginPath(); c.moveTo(-26, hipY - 16); c.lineTo(34, hipY - 18); c.lineTo(40, hipY + 42); c.lineTo(-30, hipY + 44); c.closePath(); c.fill();
    c.strokeStyle = accent; c.lineWidth = 22; c.beginPath(); c.moveTo(sh[0] - 4, sh[1] + 14); c.lineTo(hipX + 6, hipY - 40); c.stroke();
    c.fillStyle = col; const hd = [sh[0] + Math.sin(lean) * 38 + 8, sh[1] - Math.cos(lean) * 38]; circle(c, hd[0], hd[1], 25); c.fill();
    c.strokeStyle = col; c.lineWidth = 10; c.beginPath(); c.moveTo(hd[0] - 18, hd[1] - 8); c.quadraticCurveTo(hd[0] - 54, hd[1] - 4 + 8 * Math.sin(phase), hd[0] - 62, hd[1] + 24 + 10 * Math.sin(phase + 1)); c.stroke();
    leg(0, col); armF(1, col);
    c.restore();
  }

  function track(ctx, t, v) {
    const hz = 700, A = 840, B = 520, gy = (z) => hz + A / z, zs = (k) => .95 + k * .62;
    // cielo
    ctx.fillStyle = lin(ctx, 0, 0, 0, hz, [[0, '#2b0f54'], [.45, '#a3307f'], [.8, '#ff7e45'], [1, '#ffd27a']]); ctx.fillRect(0, 0, W, hz + 2);
    L.stars(ctx, 40, 5, t, { y1: 300, alpha: .5 });
    halo(ctx, 540, hz - 10, 900, '#ff9a5a', .7 + .06 * wave(t, 1)); halo(ctx, 540, hz - 10, 380, '#ffe7a8', .9);
    ctx.fillStyle = '#fff3cf'; circle(ctx, 540, hz - 20, 150); ctx.fill();
    // nubes alargadas
    for (let i = 0; i < 5; i++) { const x = frac(t + i / 5) * (W + 800) - 400, y = 300 + i * 70; ctx.fillStyle = i % 2 ? 'rgba(255,190,200,.28)' : 'rgba(255,230,200,.2)'; rr(ctx, x - 200, y, 400, 26, 13); ctx.fill(); rr(ctx, x - 110, y - 20, 200, 26, 13); ctx.fill(); }
    // gradas lejanas y focos
    ctx.fillStyle = '#2a0f48'; ctx.beginPath(); ctx.moveTo(0, hz + 2); ctx.lineTo(0, hz - 70); ctx.lineTo(260, hz - 96); ctx.lineTo(820, hz - 96); ctx.lineTo(W, hz - 70); ctx.lineTo(W, hz + 2); ctx.closePath(); ctx.fill();
    const r = rng(77);
    for (let i = 0; i < 90; i++) { const x = r() * W, y = hz - 20 - r() * 56; ctx.fillStyle = `rgba(255,${160 + (r() * 90 | 0)},${120 + (r() * 60 | 0)},${.35 + .35 * wave01(t, 1 + (i % 2), r())})`; ctx.fillRect(x, y, 5, 5); }
    [120, 960].forEach((x, i) => { ctx.fillStyle = '#220b3c'; ctx.fillRect(x - 5, hz - 330, 10, 340); ctx.fillStyle = '#220b3c'; rr(ctx, x - 52, hz - 372, 104, 52, 8); ctx.fill(); for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) { ctx.fillStyle = '#fff6dc'; circle(ctx, x - 36 + k * 24, hz - 358 + j * 22, 7); ctx.fill(); } halo(ctx, x, hz - 346, 300, '#ffe2a8', .7 + .1 * wave(t, 2, i * .5)); });
    // césped interior y pista
    const gEnd = gy(zs(6));
    ctx.fillStyle = lin(ctx, 0, hz, 0, gEnd, [[0, '#3c7a4f'], [1, '#2f9a5c']]); ctx.fillRect(0, hz, W, gEnd - hz + 2);
    ctx.fillStyle = lin(ctx, 0, gEnd, 0, H, [[0, '#f2693b'], [.4, '#d94a28'], [1, '#8f2a1c']]); ctx.fillRect(0, gEnd, W, H - gEnd);
    // brillo del sol sobre la pista
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(540, gEnd + 20); ctx.scale(1, .22); ctx.fillStyle = rad(ctx, 0, 0, 0, 760, [[0, 'rgba(255,200,120,.65)'], [1, 'rgba(255,160,90,0)']]); circle(ctx, 0, 0, 760); ctx.fill(); ctx.restore();
    // líneas de calle horizontales en perspectiva
    for (let k = 0; k <= 6; k++) { const z = zs(k), y = gy(z), w = Math.max(1.5, 13 / z); ctx.fillStyle = 'rgba(255,248,235,.92)'; ctx.fillRect(0, y - w / 2, W, w); }
    // marcas de relevo (cuñas) sobre cada calle
    for (let k = 0; k < 6; k++) { const z = (zs(k) + zs(k + 1)) / 2, y = gy(z), h = 30 / z; ctx.fillStyle = 'rgba(255,248,235,.5)'; for (let x0 = 0; x0 < 3; x0++) { const xx = 180 + x0 * 420 + (k % 2) * 90; ctx.beginPath(); ctx.moveTo(xx, y - h / 2); ctx.lineTo(xx + 90 / z * 1.2, y); ctx.lineTo(xx, y + h / 2); ctx.closePath(); ctx.fill(); } }
    // corredores: sombra larga hacia la cámara + silueta
    const cols = ['#1d0a33', '#2a0f45', '#3a1659'], acc = ['#ffd23a', '#37e3d0', '#ff5d8f'];
    const R = [[1.26, 650, 0], [2.5, 290, 1.9], [3.74, 800, 3.6]];
    R.slice().reverse().forEach(([z, x, ph0], idx) => {
      const k = 2 - idx, y = gy(z), s = B / z / 330, phase = TAU * (t * 8) + ph0 + 2.2;
      // estela de velocidad
      for (let q = 0; q < 5; q++) { const yy = y - (60 + q * 55) * s, len = (160 + q * 40) * s * 1.6, xx = x - 140 * s - len; ctx.fillStyle = lin(ctx, xx, 0, xx + len, 0, [[0, 'rgba(255,240,220,0)'], [1, `rgba(255,240,220,${.38 - q * .05})`]]); ctx.fillRect(xx, yy, len, 4 * s + 1); }
      ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, -.55, -.38, 0, 0); ctx.translate(-x, -y);
      runner(ctx, x, y, s, phase, 'rgba(60,5,50,.3)', 'rgba(60,5,50,.3)'); ctx.restore();
      ctx.save(); ctx.translate(-5 * s, -4 * s); runner(ctx, x, y, s, phase, '#ffcf9a', '#ffcf9a'); ctx.restore();
      runner(ctx, x, y, s, phase, cols[k], acc[k]);
    });
    // polvo en el aire
    L.loopParticles(24, 4, t, (i, p, rn) => { const x = rn() * W, y = 900 + rn() * 500 - p * 80; ctx.fillStyle = `rgba(255,220,170,${.5 * Math.sin(Math.PI * p)})`; circle(ctx, x + 30 * Math.sin(p * TAU + i), y, 2 + rn() * 2.5); ctx.fill(); });
    L.vignette(ctx, W, H, .45);
  }

  SCENES['sport-c'] = {
    topic: 'sport', stillT: [.06, .3],
    cap: [
      { ca: 'Piscina, carrer lliure i cap soroll 🏊 #natacio', es: 'Piscina, calle libre y cero ruido 🏊 #natacion', en: 'Pool, open lane and zero noise 🏊 #swimming' },
      { ca: 'Pista, posta de sol i a córrer 🏃 #atletisme', es: 'Pista, atardecer y a correr 🏃 #atletismo', en: 'Track, sunset and run 🏃 #athletics' }],
    draw(ctx, t, v) { (v % 2 ? track : pool)(ctx, t, v); }
  };

})();
