/* CARS – a: autopista synthwave infinita · b: conducción nocturna bajo la lluvia · c: foto (clásico al atardecer / circuito) */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, halo, rng, circle, rr, mix, lerp, clamp, smooth, easeOut } = L;
  const W = 1080, H = 1920;
  function hh(n) { n = Math.imul(n | 0, 374761393) + 668265263 | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  const poly = (c, pts) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
  /* objetos en rejilla de profundidad: s = D·n − t·Q (Q = unidades por bucle, múltiplo de D·periodo) */
  function each(D, Q, smin, smax, t, f) { const n0 = Math.ceil((smin + t * Q) / D), n1 = Math.floor((smax + t * Q) / D); for (let n = n0; n <= n1; n++) f(n, D * n - t * Q); }
  const md = (n, m) => ((n % m) + m) % m;

  /* ============ CARS-A : synthwave ============ */
  const PA = [
    { sky: [[0, '#08011c'], [.4, '#2a0a5e'], [.7, '#9d1b86'], [.9, '#ff4f8b'], [1, '#ffb066']], sunA: '#ffe45e', sunB: '#ff3d8a', sunC: '#b01ac0', far: '#2d0d66', near: '#12033a', rimA: '#38f3ff', rimB: '#ff3df2',
      gA: '#3a0b69', gB: '#12032c', grid: '#ff3df2', gridB: '#38f3ff', road: ['#18063a', '#07021a'], edge: '#38f3ff', dash: '#ffd6f6', body: ['#6a37ff', '#2a0f86'], glass: ['#ff7ac8', '#1b0a4d'], rim: '#38f3ff', tail: '#ff2f5e', under: '#ff3df2', side: 'palm', city: false },
    { sky: [[0, '#020a1f'], [.4, '#06306b'], [.7, '#0d7f9c'], [.9, '#ff9a47'], [1, '#ffd884']], sunA: '#fff0a0', sunB: '#ffa23a', sunC: '#ff4f3d', far: '#0a2a5a', near: '#04132f', rimA: '#ffd27a', rimB: '#38f3ff',
      gA: '#0b3158', gB: '#031126', grid: '#38f3ff', gridB: '#ffb04a', road: ['#0a2144', '#030c1c'], edge: '#ffb04a', dash: '#e8fbff', body: ['#ff9a2e', '#c4430f'], glass: ['#7fe9ff', '#06214a'], rim: '#bff6ff', tail: '#ff2a3d', under: '#38f3ff', side: 'lamp', city: true }
  ];
  const HZ = 990, AA = 1000, RW = 1.3;
  const projA = (X, s) => { const u = AA / s; return [540 + X * u, HZ + u, u]; };

  function palm(c, x, y, h, lean, col, rim, flip, sway) {
    c.save(); c.translate(x, y); c.scale(flip, 1);
    const tx = lean * h, ty = -h;
    c.fillStyle = col; c.beginPath(); c.moveTo(-.03 * h, 0); c.quadraticCurveTo(tx * .1 - .02 * h, ty * .5, tx - .014 * h, ty); c.lineTo(tx + .014 * h, ty); c.quadraticCurveTo(tx * .1 + .06 * h, ty * .5, .03 * h, 0); c.closePath(); c.fill();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI * (0.02 + i * .96 / 7) + .04 * sway * (i % 2 ? 1 : -1), Ln = h * (.36 + .06 * (i % 3));
      const ex = tx + Math.cos(a) * Ln, ey = ty + Math.sin(a) * Ln + Ln * .38, mx = tx + Math.cos(a) * Ln * .55, my = ty + Math.sin(a) * Ln * .55 - Ln * .1;
      c.fillStyle = col; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(mx, my - Ln * .09, ex, ey); c.quadraticCurveTo(mx, my + Ln * .07, tx, ty); c.fill();
      c.strokeStyle = rim; c.globalAlpha = .55; c.lineWidth = Math.max(1, h * .006); c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(mx, my - Ln * .09, ex, ey); c.stroke(); c.globalAlpha = 1;
    }
    c.restore();
  }
  function lamp(c, x, y, h, flip, col, glow) {
    c.save(); c.translate(x, y); c.scale(flip, 1);
    c.strokeStyle = col; c.lineWidth = Math.max(2, h * .028); c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -h); c.quadraticCurveTo(0, -h * 1.1, -h * .2, -h * 1.1); c.stroke();
    halo(c, -h * .22, -h * 1.08, h * .55, glow, .85); c.fillStyle = '#fff'; rr(c, -h * .3, -h * 1.1, h * .16, h * .04, h * .02); c.fill();
    c.restore();
  }

  function carRear(c, cx, gy, sc, P, t, alt) {
    c.save(); c.translate(cx, gy); c.scale(sc, sc);
    const bodyG = lin(c, 0, -200, 0, 0, [[0, P.body[0]], [1, P.body[1]]]), dark = mix(P.body[1], '#000000', .62), wingC = mix(P.body[1], '#000000', .3);
    // brillo inferior de neón
    halo(c, 0, -6, 330, P.under, .5);
    c.save(); c.translate(0, -4); c.scale(1, .16); c.fillStyle = rad(c, 0, 0, 0, 300, [[0, 'rgba(0,0,0,.75)'], [1, 'rgba(0,0,0,0)']]); circle(c, 0, 0, 300); c.fill(); c.restore();
    // neumáticos
    [-1, 1].forEach(sd => { c.fillStyle = '#05030c'; rr(c, sd < 0 ? -218 : 166, -84, 52, 86, 14); c.fill(); c.fillStyle = 'rgba(255,255,255,.1)'; rr(c, sd < 0 ? -214 : 170, -82, 44, 6, 3); c.fill(); });
    // alerón (detrás de la cabina)
    if (!alt) {
      c.fillStyle = wingC; [-1, 1].forEach(sd => { rr(c, sd * 104 - 7, -172, 14, 48, 3); c.fill(); });
    }
    // cuerpo inferior
    c.beginPath(); c.moveTo(-198, -22); c.bezierCurveTo(-216, -52, -216, -96, -196, -118); c.lineTo(-146, -134); c.lineTo(146, -134); c.lineTo(196, -118); c.bezierCurveTo(216, -96, 216, -52, 198, -22); c.lineTo(150, -8); c.lineTo(-150, -8); c.closePath(); c.fillStyle = bodyG; c.fill();
    // cabina
    const cab = alt ? [[-150, -130], [-116, -192], [-60, -204], [60, -204], [116, -192], [150, -130]] : [[-150, -130], [-108, -188], [108, -188], [150, -130]];
    c.beginPath(); c.moveTo(cab[0][0], cab[0][1]); if (alt) { c.quadraticCurveTo(-136, -178, -88, -202); c.lineTo(88, -202); c.quadraticCurveTo(136, -178, 150, -130); } else { c.lineTo(-108, -188); c.lineTo(108, -188); c.lineTo(150, -130); } c.closePath(); c.fillStyle = lin(c, 0, -200, 0, -130, [[0, mix(P.body[0], '#ffffff', .15)], [1, P.body[0]]]); c.fill();
    // luneta
    c.beginPath(); if (alt) { c.moveTo(-128, -134); c.quadraticCurveTo(-118, -170, -80, -192); c.lineTo(80, -192); c.quadraticCurveTo(118, -170, 128, -134); } else { c.moveTo(-130, -136); c.lineTo(-97, -180); c.lineTo(97, -180); c.lineTo(130, -136); } c.closePath();
    c.fillStyle = lin(c, 0, -190, 0, -134, [[0, P.glass[0]], [.55, mix(P.glass[0], P.glass[1], .7)], [1, P.glass[1]]]); c.fill();
    c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,.18)'; poly(c, [[-80, -190], [-40, -190], [-90, -134], [-130, -134]]); c.fill(); poly(c, [[10, -190], [26, -190], [-24, -134], [-40, -134]]); c.fill(); c.restore();
    // tapa del maletero: brillo
    c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(-190, -120); c.lineTo(-146, -134); c.lineTo(146, -134); c.lineTo(190, -120); c.lineTo(150, -126); c.lineTo(-150, -126); c.closePath(); c.fill();
    // panel inferior oscuro
    c.fillStyle = dark; rr(c, -176, -92, 352, 80, 20); c.fill();
    c.fillStyle = 'rgba(255,255,255,.06)'; rr(c, -176, -92, 352, 10, 5); c.fill();
    // difusor
    c.fillStyle = '#05030c'; rr(c, -130, -46, 260, 36, 8); c.fill(); c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 3; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 28, -44); c.lineTo(i * 28, -12); c.stroke(); }
    // escapes
    [-78, 78].forEach(x => { c.fillStyle = lin(c, x - 18, -52, x + 18, -16, [[0, '#d7dce8'], [1, '#5b5f78']]); circle(c, x, -32, 19); c.fill(); c.fillStyle = '#0a0410'; circle(c, x, -32, 12); c.fill(); c.fillStyle = `rgba(255,150,60,${.5 + .3 * wave01(t, 6, x)})`; circle(c, x, -30, 7); c.fill(); });
    // alerón principal
    if (!alt) { c.fillStyle = wingC; rr(c, -208, -184, 416, 18, 7); c.fill(); c.fillStyle = P.rim; c.globalAlpha = .8; rr(c, -204, -184, 408, 3.5, 2); c.fill(); c.globalAlpha = 1; c.fillStyle = wingC; [-1, 1].forEach(sd => { rr(c, sd * 206 - 5, -206, 10, 54, 4); c.fill(); c.fillStyle = P.rim; c.globalAlpha = .7; rr(c, sd * 206 - 5, -206, 3, 54, 2); c.fill(); c.globalAlpha = 1; c.fillStyle = wingC; }); }
    else { c.fillStyle = mix(P.body[0], '#000', .15); c.beginPath(); c.moveTo(-170, -128); c.quadraticCurveTo(0, -156, 170, -128); c.lineTo(170, -134); c.lineTo(-170, -134); c.fill(); }
    // luces traseras (barra)
    const lg = c.createLinearGradient(-190, 0, 190, 0); lg.addColorStop(0, P.tail); lg.addColorStop(.5, '#fff0f2'); lg.addColorStop(1, P.tail);
    c.fillStyle = lg; c.beginPath(); c.moveTo(-192, -108); c.lineTo(-60, -102); c.lineTo(60, -102); c.lineTo(192, -108); c.lineTo(190, -94); c.lineTo(60, -92); c.lineTo(-60, -92); c.lineTo(-190, -94); c.closePath(); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = P.tail; circle(c, sd * 146, -66, 24); c.fill(); c.fillStyle = '#fff3f4'; circle(c, sd * 146, -66, 11); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 3; circle(c, sd * 146, -66, 24); c.stroke(); });
    halo(c, 0, -98, 260, P.tail, .55 + .1 * wave(t, 2)); [-1, 1].forEach(sd => halo(c, sd * 146, -66, 120, P.tail, .8));
    // luz de borde
    c.strokeStyle = P.rim; c.lineWidth = 4; c.lineJoin = 'round'; c.globalAlpha = .9; c.beginPath(); c.moveTo(-150, -132); if (alt) { c.quadraticCurveTo(-136, -178, -88, -202); c.lineTo(88, -202); c.quadraticCurveTo(136, -178, 150, -132); } else { c.lineTo(-108, -188); c.lineTo(108, -188); c.lineTo(150, -132); } c.stroke();
    c.globalAlpha = .6; c.beginPath(); c.moveTo(-198, -120); c.lineTo(-146, -135); c.lineTo(146, -135); c.lineTo(198, -120); c.stroke(); c.globalAlpha = 1;
    c.restore();
  }

  SCENES['cars-a'] = {
    topic: 'cars', stillT: [.3, .2],
    cap: [
      { ca: 'Autopista cap al sol i volum al màxim 🌆 #synthwave #cotxes', es: 'Autopista hacia el sol y volumen a tope 🌆 #synthwave #coches', en: 'Highway into the sun, volume maxed 🌆 #synthwave #cars' },
      { ca: 'Ciutat al fons i carretera per a nosaltres 🌃 #cotxes #nit', es: 'Ciudad al fondo y carretera para nosotros 🌃 #coches #noche', en: 'City ahead, empty road, all ours 🌃 #cars #night' }],
    draw(ctx, t, v) {
      const P = PA[v % PA.length], c = ctx, Q = 16;
      // cielo
      const sky = lin(c, 0, 0, 0, HZ, P.sky); c.fillStyle = sky; c.fillRect(0, 0, W, HZ + 2);
      L.stars(c, 130, 21 + v, t, { y1: 640, alpha: .8 });
      // sol retro
      const sx = 540, sy = v ? 780 : 800, sr = v ? 300 : 270;
      halo(c, sx, sy, 800, P.sky[3][1], .55 + .06 * wave(t, 1)); halo(c, sx, sy, 440, P.sunB, .55);
      c.save(); circle(c, sx, sy, sr); c.clip();
      c.fillStyle = lin(c, 0, sy - sr, 0, sy + sr, [[0, P.sunA], [.5, P.sunB], [1, P.sunC]]); c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      c.fillStyle = sky; const n = 8, yt = sy - 30, yb = sy + sr + 30;
      for (let k = 0; k < n; k++) { const p = (k + t) / n, y = yt + (yb - yt) * Math.pow(p, 1.25), th = 30 * p; c.fillRect(sx - sr, y, sr * 2, th); }
      c.restore();
      // nubes largas que cruzan
      for (let i = 0; i < 4; i++) { const x = ((i * 380 + t * 1520) % 1520) - 340, y = 420 + i * 110; c.fillStyle = i % 2 ? 'rgba(255,120,190,.22)' : 'rgba(120,60,200,.35)'; rr(c, x - 200, y, 400, 22 + (i % 2) * 8, 14); c.fill(); }
      // montañas o ciudad al fondo
      if (!P.city) {
        [[P.far, 230, 31, P.rimA], [P.near, 140, 77, P.rimB]].forEach(([col, amp, seed, rim], li) => {
          c.beginPath(); c.moveTo(0, HZ + 4);
          for (let x = 0; x <= W + 8; x += 8) { const r = L.ridge(x, seed, 1080, 4); c.lineTo(x, HZ - 10 - amp * Math.pow(.5 + .5 * r, 1.5)); }
          c.lineTo(W, HZ + 4); c.closePath(); c.fillStyle = lin(c, 0, HZ - amp, 0, HZ, [[0, col], [1, mix(col, P.sky[3][1], .35)]]); c.fill();
          c.strokeStyle = rim; c.globalAlpha = li ? .55 : .8; c.lineWidth = 3; c.beginPath();
          for (let x = 0; x <= W + 8; x += 8) { const r = L.ridge(x, seed, 1080, 4), y = HZ - 10 - amp * Math.pow(.5 + .5 * r, 1.5); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.globalAlpha = 1;
        });
      } else {
        const r = rng(404);
        for (let layer = 0; layer < 2; layer++) {
          let x = -20; while (x < W + 20) {
            const w = 46 + r() * 90, h = (layer ? 90 : 150) + r() * (layer ? 190 : 300), col = layer ? P.near : P.far;
            c.fillStyle = lin(c, 0, HZ - h, 0, HZ, [[0, col], [1, mix(col, '#ff9a47', .22)]]); c.fillRect(x, HZ - h, w, h + 4);
            if (layer === 0 && r() < .3) { c.fillRect(x + w / 2 - 2, HZ - h - 50, 4, 52); c.fillStyle = `rgba(255,70,70,${.3 + .7 * wave01(t, 2, x * .01)})`; circle(c, x + w / 2, HZ - h - 52, 5); c.fill(); }
            const rw = layer ? 'rgba(255,200,120,.55)' : 'rgba(120,230,255,.6)';
            for (let yy = HZ - h + 12; yy < HZ - 8; yy += 16) for (let xx = x + 7; xx < x + w - 8; xx += 13) if (r() < .32) { c.fillStyle = rw; c.fillRect(xx, yy, 5, 7); } else r();
            x += w + (layer ? 6 : 2);
          }
        }
      }
      // suelo y resplandor del horizonte
      c.fillStyle = lin(c, 0, HZ, 0, H, [[0, P.gA], [1, P.gB]]); c.fillRect(0, HZ, W, H - HZ);
      c.fillStyle = lin(c, 0, HZ - 60, 0, HZ + 90, [[0, 'rgba(255,120,200,0)'], [.4, v ? 'rgba(255,180,90,.55)' : 'rgba(255,100,190,.6)'], [1, 'rgba(255,100,190,0)']]); c.fillRect(0, HZ - 60, W, 150);
      // rejilla: horizontales que avanzan
      each(1, Q, 1.08, 46, t, (n, s) => {
        const [, y, u] = projA(0, s), a = Math.pow(clamp(1 - s / 46), 1.2);
        c.strokeStyle = P.grid; c.globalAlpha = .18 * a; c.lineWidth = 3 + u * .02; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
        c.globalAlpha = .9 * a; c.lineWidth = 1.2 + u * .006; c.stroke();
      });
      c.globalAlpha = 1;
      // verticales
      c.strokeStyle = lin(c, 0, HZ, 0, H, [[0, 'rgba(255,255,255,0)'], [.15, P.gridB], [1, P.grid]]); c.globalAlpha = .75; c.lineWidth = 2;
      c.beginPath(); for (let j = -34; j <= 34; j++) { const X = j * .42; if (Math.abs(X) < RW) continue; const a = projA(X, 46), b = projA(X, 1.08); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } c.stroke(); c.globalAlpha = 1;
      // carretera
      const r0 = projA(0, 46)[2], r1 = projA(0, 1.08)[2];
      const q0 = r0 * RW, q1 = r1 * RW; poly(c, [[540 - q0, HZ + r0], [540 + q0, HZ + r0], [540 + q1, HZ + r1], [540 - q1, HZ + r1]]); c.fillStyle = lin(c, 0, HZ, 0, H, [[0, P.road[0]], [1, P.road[1]]]); c.fill();
      c.save(); c.clip(); halo(c, 540, HZ + 60, 420, v ? '#ffa23a' : '#ff3d8a', .5); c.restore();
      [-1, 1].forEach(sd => {
        [[.93, 1.07, .2], [.985, 1.015, 1]].forEach(([a0, a1, al]) => { poly(c, [[540 + sd * a0 * q0, HZ + r0], [540 + sd * a1 * q0, HZ + r0], [540 + sd * a1 * q1, HZ + r1], [540 + sd * a0 * q1, HZ + r1]]); c.fillStyle = P.edge; c.globalAlpha = al; c.fill(); });
      }); c.globalAlpha = 1;
      each(2, Q, 1.08, 46, t, (n, s) => { const A = projA(0, s + 1.05), B = projA(0, s), a = Math.pow(clamp(1 - s / 46), .8); const wA = .03 * A[2], wB = .03 * B[2]; poly(c, [[540 - wA, A[1]], [540 + wA, A[1]], [540 + wB, B[1]], [540 - wB, B[1]]]); c.fillStyle = P.dash; c.globalAlpha = .85 * a * clamp((s - 1.1) / 1.2); c.fill(); }); c.globalAlpha = 1;
      // elementos laterales
      const side = [];
      each(4, Q, 3.0, 46, t, (n, s) => side.push([n, s])); side.sort((a, b) => b[1] - a[1]);
      side.forEach(([n, s]) => {
        const sd = md(n, 2) ? 1 : -1, [x, y, u] = projA(sd * (P.side === 'palm' ? 2.1 : 1.8), s), a = clamp((46 - s) / 14);
        c.globalAlpha = a;
        if (P.side === 'palm') palm(c, x, y, u * (1.0 + .25 * hh(md(n, 4))), sd * -.18 * (1 + hh(md(n, 6))), '#0c0228', P.rimB, sd, wave(t, 2, hh(md(n, 2)))); else lamp(c, x, y, u * 1.3, -sd, '#06142b', '#ffc27a');
        c.globalAlpha = 1;
      });
      // rayas de velocidad
      each(2, Q, 1.6, 46, t, (n, s) => {
        const k = md(n, 8), X = (hh(k + 5) > .5 ? 1 : -1) * (1.25 + hh(k + 9) * 1.8), A = projA(X, s + 1.8), B = projA(X, s), a = clamp((46 - s) / 30) * .5;
        const g = c.createLinearGradient(A[0], A[1], B[0], B[1]); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,${v ? 230 : 150},${v ? 190 : 240},${a})`);
        c.strokeStyle = g; c.lineWidth = 1 + B[2] * .008; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
      });
      // coche
      const cx = 540 + 30 * wave(t, 1), gy = 1400 + 3 * wave(t, 4);
      const tailGlow = [-1, 1];
      tailGlow.forEach(sd => { const g = c.createLinearGradient(0, gy, 0, gy + 300); g.addColorStop(0, `${v ? 'rgba(255,42,61,.38)' : 'rgba(255,47,94,.38)'}`); g.addColorStop(1, 'rgba(255,47,94,0)'); c.fillStyle = g; rr(c, cx + sd * 190 - 34, gy, 68, 300, 30); c.fill(); });
      c.save(); c.translate(cx, gy); c.rotate(.012 * wave(t, 1, .25)); c.translate(-cx, -gy); carRear(c, cx, gy, 1.3, P, t, v === 1); c.restore();
      // chispas del escape
      L.loopParticles(16, 90 + v, t, (i, p, r) => { const dx = (r() - .5) * 220, ex = cx + (i % 2 ? 78 : -78) * 1.3; c.fillStyle = `rgba(255,${170 + (i % 3) * 25},90,${.9 * (1 - p)})`; circle(c, ex + dx * p, gy - 34 + 360 * p * p, 2.5 * (1 - p) + 1); c.fill(); });
      L.vignette(c, W, H, .4);
    }
  };
  function hexA(h, a) { if (h[0] !== '#') return h; const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  /* ============ CARS-B : conducción nocturna bajo la lluvia (primera persona) ============ */
  const PB = [
    { sky: [[0, '#07021a'], [.55, '#26094f'], [.85, '#8a1d86'], [1, '#ff7a8a']], fog: '#a02a95', fogA: '#ff5fb0', ground: ['#2a0e48', '#06020f'], bld: '#0b0420', bldFar: '#4a1a73', neonA: '#ff3df2', neonB: '#38f3ff', win: ['#ffcf7a', '#ff6fd8', '#59e6ff'], lamp: '#ffc46b', walls: true, drops: ['255,90,220', '90,230,255', '255,190,100'] },
    { sky: [[0, '#02091d'], [.5, '#06284f'], [.82, '#0f6b8c'], [1, '#ff9a55']], fog: '#2a8aa6', fogA: '#ffa860', ground: ['#0a2a48', '#020a14'], bld: '#061327', bldFar: '#14456a', neonA: '#ffa23a', neonB: '#4fe3ff', win: ['#ffe29a', '#7fe9ff', '#ffa23a'], lamp: '#9ef3ff', walls: false, drops: ['255,170,80', '110,230,255', '255,255,255'] }
  ];
  const VPY = 840, AB = 1100, CH = .62;
  const pj = (X, Y, s) => { const u = AB / s; return [540 + X * u, VPY + (CH - Y) * u, u]; };

  function raindrop(c, x, y, r, tint, trail, a) {
    c.save(); c.globalAlpha *= a;
    if (trail > 0) { const g = c.createLinearGradient(0, y - trail, 0, y); g.addColorStop(0, `rgba(${tint},0)`); g.addColorStop(1, `rgba(${tint},.3)`); c.fillStyle = g; c.fillRect(x - r * .35, y - trail, r * .7, trail); }
    c.save(); c.translate(x, y); c.scale(1, 1.22);
    c.fillStyle = rad(c, r * .1, r * .25, 0, r, [[0, `rgba(${tint},.5)`], [.7, `rgba(${tint},.2)`], [1, 'rgba(0,0,10,.5)']]); circle(c, 0, 0, r); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = Math.max(1, r * .12); c.beginPath(); c.arc(0, 0, r * .86, .2, 1.5); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(-r * .35, -r * .42, r * .22, r * .14, -.6, 0, TAU); c.fill();
    c.restore(); c.restore();
  }
  function skyline(c, seed, base, hMin, hMax, col, litCols, t, step) {
    const r = rng(seed); let x = -20;
    while (x < W + 20) {
      const w = 40 + r() * 80, h = hMin + r() * (hMax - hMin);
      c.fillStyle = lin(c, 0, base - h, 0, base, [[0, col], [1, mix(col, '#ff6aa0', .18)]]); c.fillRect(x, base - h, w, h + 6);
      for (let yy = base - h + 10; yy < base - 6; yy += step) for (let xx = x + 6; xx < x + w - 8; xx += step * .85) { if (r() < .28) { c.fillStyle = litCols[Math.floor(r() * litCols.length)]; c.globalAlpha = .5 + .3 * wave01(t, 1 + Math.floor(r() * 2), r()); c.fillRect(xx, yy, 4, 6); c.globalAlpha = 1; } else r(); r(); }
      x += w + 3;
    }
  }

  SCENES['cars-b'] = {
    topic: 'cars', stillT: [.35, .1],
    cap: [
      { ca: 'Pluja, neó i cap destí concret 🌧️ #nit #cotxes', es: 'Lluvia, neón y ningún destino concreto 🌧️ #noche #coches', en: 'Rain, neon and no particular destination 🌧️ #nightdrive #cars' },
      { ca: 'Autopista de nit, eixugaparabrises i bona música 🎶 #cotxes', es: 'Autopista de noche, limpiaparabrisas y buena música 🎶 #coches', en: 'Night highway, wipers on, good music on 🎶 #cars #rain' }],
    draw(ctx, t, v) {
      const P = PB[v % PB.length], c = ctx, Q = 16, R = 1.8;
      // cielo
      c.fillStyle = lin(c, 0, 0, 0, VPY + 30, P.sky); c.fillRect(0, 0, W, VPY + 40);
      L.stars(c, 70, 61 + v, t, { y1: 480, alpha: .5 });
      halo(c, 540, VPY - 10, 780, P.fogA, .6 + .05 * wave(t, 1)); halo(c, 540, VPY, 360, P.fogA, .6);
      skyline(c, 17 + v * 9, VPY + 6, 40, 210, P.bldFar, P.win, t, 16);
      // suelo
      c.fillStyle = lin(c, 0, VPY, 0, H, [[0, P.ground[0]], [.5, mix(P.ground[0], P.ground[1], .7)], [1, P.ground[1]]]); c.fillRect(0, VPY, W, H - VPY);
      if (!P.walls) { const r = rng(88); for (let i = 0; i < 90; i++) { const y = VPY + 6 + Math.pow(r(), 1.7) * 380, x = r() * W; c.fillStyle = P.win[i % 3]; c.globalAlpha = (.25 + .5 * wave01(t, 1 + (i % 2), r())) * (.4 + (y - VPY) / 500); c.fillRect(x, y, 3 + (y - VPY) / 90, 3 + (y - VPY) / 150); } c.globalAlpha = 1; }
      // carretera
      const a0 = pj(0, 0, 70), a1 = pj(0, 0, .55);
      poly(c, [[540 - R * a0[2], a0[1]], [540 + R * a0[2], a0[1]], [540 + R * a1[2], a1[1]], [540 - R * a1[2], a1[1]]]); c.fillStyle = lin(c, 0, VPY, 0, H, [[0, mix(P.ground[0], P.fog, .25)], [.35, mix(P.ground[0], '#000000', .4)], [1, '#04010a']]); c.fill();
      c.save(); c.clip(); halo(c, 540, VPY + 60, 560, P.fogA, .38); halo(c, 540, VPY + 300, 700, P.fog, .18); c.restore();
      // paredes de edificios (a) / quitamiedos (b)
      const items = [];
      if (P.walls) {
        each(4, Q, 2.2, 64, t, (n, s) => { items.push(['b', n, s, -1]); items.push(['b', n + 1, s, 1]); });
      }
      items.sort((a, b) => b[2] - a[2]);
      const WX = 2.7;
      if (P.walls) {
        // muro base continuo (relleno entre edificios)
        [-1, 1].forEach(sd => { const f = pj(sd * WX, 0, 64), n = pj(sd * WX, 0, 1.6), fT = pj(sd * WX, 9, 64), nT = pj(sd * WX, 9, 1.6); poly(c, [[f[0], f[1]], [fT[0], fT[1]], [nT[0], nT[1]], [n[0], n[1]]]); c.fillStyle = mix(P.bld, P.fog, .35); c.fill(); });
        items.forEach(([k, n, s, sd]) => {
          const per = md(n, 2), hb = 5 + hh(per * 7 + (sd > 0 ? 3 : 0) + 1) * 6, L0 = s, L1 = s + 3.6, fog = Math.pow(clamp(s / 64), .7);
          const a = pj(sd * WX, 0, L1), b = pj(sd * WX, 0, L0), at = pj(sd * WX, hb, L1), bt = pj(sd * WX, hb, L0);
          c.fillStyle = mix(P.bld, P.fog, fog * .75); poly(c, [[a[0], a[1]], [at[0], at[1]], [bt[0], bt[1]], [b[0], b[1]]]); c.fill();
          if (s < 46) {
            const wc = [];
            for (let k2 = 0; k2 < 3; k2++) for (let f = 0; f < hb * 2.2; f++) {
              const hv = hh(per * 977 + k2 * 31 + f * 13 + (sd > 0 ? 5 : 0));
              if (hv > .5) continue;
              const sa = s + .35 + k2 * 1.1, sb = sa + .7, y0 = .35 + f * .45, y1 = y0 + .26;
              const p1 = pj(sd * WX, y0, sb), p2 = pj(sd * WX, y1, sb), p3 = pj(sd * WX, y1, sa), p4 = pj(sd * WX, y0, sa);
              c.fillStyle = P.win[Math.floor(hv * 6) % 3]; c.globalAlpha = (1 - fog) * (.55 + .4 * hh(f + k2 * 5 + per * 3)); poly(c, [[p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]], [p4[0], p4[1]]]); c.fill();
            }
            c.globalAlpha = 1;
          }
          // neón vertical en la esquina del edificio
          if (hh(per * 11 + (sd > 0 ? 1 : 2)) > .35) { const col = hh(per * 5 + sd) > .5 ? P.neonA : P.neonB; c.strokeStyle = col; c.globalAlpha = .9 * (1 - fog); c.lineWidth = Math.max(1.5, b[2] * .02); c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(bt[0], pj(sd * WX, hb * .75, L0)[1]); c.stroke(); c.globalAlpha = .25 * (1 - fog); c.lineWidth = b[2] * .09; c.stroke(); c.globalAlpha = 1; }
        });
        // raíl de neón continuo
        [[-1, P.neonA], [1, P.neonB]].forEach(([sd, col]) => { const f = pj(sd * WX, 1.5, 64), n = pj(sd * WX, 1.5, 1.8); c.strokeStyle = col; c.globalAlpha = .25; c.lineWidth = 16; c.beginPath(); c.moveTo(f[0], f[1]); c.lineTo(n[0], n[1]); c.stroke(); c.globalAlpha = .95; c.lineWidth = 4; c.stroke(); c.globalAlpha = 1; });
      } else {
        // quitamiedos
        [-1, 1].forEach(sd => {
          const f = pj(sd * 2.05, 0, 64), n = pj(sd * 2.05, 0, .9), fT = pj(sd * 2.05, .55, 64), nT = pj(sd * 2.05, .55, .9);
          poly(c, [[f[0], f[1]], [fT[0], fT[1]], [nT[0], nT[1]], [n[0], n[1]]]); c.fillStyle = '#071526'; c.fill();
          c.strokeStyle = P.neonB; c.globalAlpha = .8; c.lineWidth = 3; c.beginPath(); c.moveTo(fT[0], fT[1]); c.lineTo(nT[0], nT[1]); c.stroke(); c.globalAlpha = 1;
          each(2, Q, 1.2, 60, t, (n2, s) => { const A = pj(sd * 2.05, .4, s + .12), B = pj(sd * 2.05, .4, s); c.strokeStyle = P.neonA; c.globalAlpha = clamp((60 - s) / 40); c.lineWidth = Math.max(2, B[2] * .02); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); c.globalAlpha = 1; });
        });
      }
      // líneas de carril y bordes
      [-R, R].forEach(X => { const f = pj(X, 0, 70), n = pj(X, 0, .55); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 5; c.beginPath(); c.moveTo(f[0], f[1]); c.lineTo(n[0], n[1]); c.stroke(); });
      [-.62, .62].forEach(X => each(2, Q, .9, 60, t, (n, s) => { const A = pj(X, 0, s + 1), B = pj(X, 0, s), wA = .025 * A[2], wB = .025 * B[2]; c.fillStyle = `rgba(255,240,225,${.8 * clamp((60 - s) / 40) * clamp((s - 1.2) / 2.2)})`; poly(c, [[A[0] - wA, A[1]], [A[0] + wA, A[1]], [B[0] + wB, B[1]], [B[0] - wB, B[1]]]); c.fill(); }));
      // farolas: luz + reflejo mojado + estela
      const lamps = []; each(4, Q, 1.6, 64, t, (n, s) => lamps.push([n, s])); lamps.sort((a, b) => b[1] - a[1]);
      lamps.forEach(([n, s]) => {
        [-1, 1].forEach(sd => {
          const X = sd * (P.walls ? 1.55 : 1.7), Y = P.walls ? 3.2 : 3.4, p = pj(X, Y, s), q = pj(X, Y, s + 1.4), g = pj(X, 0, s), refl = pj(X, -Y, s), fog = clamp((64 - s) / 40), col = P.lamp;
          // reflejo vertical en el asfalto mojado
          const rl = Math.min(refl[1] - g[1], 90 + g[2] * 1.1), gr = c.createLinearGradient(0, g[1], 0, g[1] + rl); gr.addColorStop(0, hexA(col, .42 * fog * clamp((s - 1.5) / 5))); gr.addColorStop(1, hexA(col, 0)); c.fillStyle = gr; c.fillRect(g[0] - Math.max(2, g[2] * .035), g[1], Math.max(4, g[2] * .07), rl);
          // poste
          if (s > 1.8) { c.strokeStyle = 'rgba(8,4,20,.9)'; c.lineWidth = Math.max(1.5, g[2] * .03); c.beginPath(); c.moveTo(g[0] + sd * g[2] * .45, g[1]); c.lineTo(g[0] + sd * g[2] * .45, p[1]); c.lineTo(p[0], p[1]); c.stroke(); }
          // estela
          const sg = c.createLinearGradient(q[0], q[1], p[0], p[1]); sg.addColorStop(0, hexA(col, 0)); sg.addColorStop(1, hexA('#ffffff', .9 * fog)); c.strokeStyle = sg; c.lineWidth = Math.max(2, p[2] * .045); c.lineCap = 'round'; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(p[0], p[1]); c.stroke();
          halo(c, p[0], p[1], Math.max(14, Math.min(p[2] * .55, 300)), col, .9 * fog);
        });
      });
      // tráfico de frente (faros) a la izquierda
      const onc = []; each(10, 20, 2.2, 64, t, (n, s) => onc.push([n, s])); onc.sort((a, b) => b[1] - a[1]);
      onc.forEach(([n, s]) => {
        const lx = -(.95 + .15 * hh(md(n, 2))), fog = clamp((64 - s) / 40);
        [-1, 1].forEach(d => {
          const p = pj(lx + d * .3, .55, s), q = pj(lx + d * .3, .55, s + 3.2), g = pj(lx + d * .3, 0, s), refl = pj(lx + d * .3, -.55, s);
          const gr = c.createLinearGradient(0, g[1], 0, g[1] + 260 * g[2] / 300); gr.addColorStop(0, `rgba(255,248,225,${.55 * fog})`); gr.addColorStop(1, 'rgba(255,248,225,0)'); c.fillStyle = gr; c.fillRect(g[0] - Math.max(4, g[2] * .07), g[1], Math.max(8, g[2] * .14), 260 * g[2] / 300);
          const sg = c.createLinearGradient(q[0], q[1], p[0], p[1]); sg.addColorStop(0, 'rgba(255,248,225,0)'); sg.addColorStop(1, `rgba(255,252,240,${.9 * fog})`); c.strokeStyle = sg; c.lineWidth = Math.max(2, p[2] * .06); c.lineCap = 'round'; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(p[0], p[1]); c.stroke();
          halo(c, p[0], p[1], Math.max(16, Math.min(p[2] * .75, 380)), '#fff1cf', .95 * fog);
        });
      });
      // coches delante (luces traseras)
      [[24 + 1.5 * wave(t, 1, .7), .5, 2], [13 + 1.2 * wave(t, 1, .4), -.58, 1], [5.4 + .5 * wave(t, 1), .6, 0]].forEach(([s, X, k]) => {
        const c0 = pj(X, 0, s), w = 1.5 * c0[2], h = .95 * c0[2], br = pulse(t, 2, k * .3) > .8 ? 1 : 0;
        c.fillStyle = '#05020c'; c.beginPath(); c.moveTo(c0[0] - w / 2, c0[1] - h * .12); c.quadraticCurveTo(c0[0] - w / 2, c0[1] - h * .5, c0[0] - w * .38, c0[1] - h * .58); c.lineTo(c0[0] - w * .3, c0[1] - h * .98); c.quadraticCurveTo(c0[0], c0[1] - h * 1.06, c0[0] + w * .3, c0[1] - h * .98); c.lineTo(c0[0] + w * .38, c0[1] - h * .58); c.quadraticCurveTo(c0[0] + w / 2, c0[1] - h * .5, c0[0] + w / 2, c0[1] - h * .12); c.closePath(); c.fill();
        c.fillStyle = mix(P.fog, '#000000', .6); c.beginPath(); c.moveTo(c0[0] - w * .26, c0[1] - h * .64); c.lineTo(c0[0] - w * .22, c0[1] - h * .9); c.lineTo(c0[0] + w * .22, c0[1] - h * .9); c.lineTo(c0[0] + w * .26, c0[1] - h * .64); c.fill();
        [-1, 1].forEach(d => {
          const lp = pj(X + d * .62, .5, s), rf = pj(X + d * .62, -.5, s);
          const gr = c.createLinearGradient(0, c0[1], 0, c0[1] + 340 * c0[2] / 300); gr.addColorStop(0, `rgba(255,40,70,${.6})`); gr.addColorStop(1, 'rgba(255,40,70,0)'); c.fillStyle = gr; c.fillRect(lp[0] - lp[2] * .08, c0[1], lp[2] * .16, 340 * c0[2] / 300);
          c.fillStyle = '#ff2f50'; rr(c, lp[0] - lp[2] * .16, lp[1] - lp[2] * .045, lp[2] * .32, lp[2] * .09, lp[2] * .04); c.fill();
          halo(c, lp[0], lp[1], lp[2] * (.6 + .5 * br), '#ff2a48', .9);
        });
      });
      // luces ambientales sobre el parabrisas (bokeh)
      const rb = rng(300 + v);
      for (let i = 0; i < 14; i++) { const x = rb() * W, y = 1000 + rb() * 520, r = 36 + rb() * 70, col = P.drops[i % 3], a = .06 + .1 * wave01(t, 1 + (i % 2), rb()); c.fillStyle = `rgba(${col},${a})`; circle(c, x, y, r); c.fill(); c.strokeStyle = `rgba(${col},${a * 1.5})`; c.lineWidth = 2; c.stroke(); }
      // gotas fijas
      const rd = rng(500 + v);
      for (let i = 0; i < 120; i++) { const x = rd() * W, y = 200 + rd() * 1450, r = 4 + Math.pow(rd(), 2.2) * 18, tint = P.drops[Math.floor(rd() * 3)]; raindrop(c, x, y, r * (1 + .03 * wave(t, 2, rd())), tint, 0, .85); }
      // gotas que resbalan
      L.loopParticles(26, 700 + v, t, (i, p, r) => {
        const x = r() * W, y0 = 150 + r() * 600, rad2 = 9 + r() * 14, tint = P.drops[Math.floor(r() * 3)], len = 700 + r() * 300; const y = y0 + p * len, a = Math.sin(Math.PI * p) ** .4;
        raindrop(c, x + 8 * Math.sin(p * 6 + i), y, rad2, tint, 90 + rad2 * 4, a);
      });
      // limpiaparabrisas
      [[420, 1800], [800, 1800]].forEach(([px, py], i) => {
        const th = lerp(-150, -42, .5 + .5 * wave(t, 2, -.25 + i * .02)) * Math.PI / 180, len = 1050;
        c.save(); c.translate(px, py); c.rotate(th);
        c.strokeStyle = 'rgba(6,4,14,.92)'; c.lineCap = 'round'; c.lineWidth = 22; c.beginPath(); c.moveTo(0, 0); c.lineTo(len, 0); c.stroke();
        c.lineWidth = 14; c.strokeStyle = 'rgba(2,1,6,.95)'; c.beginPath(); c.moveTo(len * .22, 0); c.lineTo(len, 0); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(len * .25, -3); c.lineTo(len * .98, -3); c.stroke();
        c.restore();
      });
      // salpicadero
      c.fillStyle = lin(c, 0, 1480, 0, 1700, [[0, 'rgba(3,1,10,0)'], [.3, 'rgba(3,1,10,.9)'], [1, '#020108']]); c.fillRect(0, 1480, W, 440);
      c.beginPath(); c.moveTo(0, 1620); c.quadraticCurveTo(540, 1550, W, 1620); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fillStyle = '#05030c'; c.fill();
      c.strokeStyle = hexA(P.neonB, .35); c.lineWidth = 3; c.beginPath(); c.moveTo(0, 1620); c.quadraticCurveTo(540, 1550, W, 1620); c.stroke();
      halo(c, 540, 1760, 360, P.neonA, .12); halo(c, 300, 1740, 120, P.neonB, .3);
      L.vignette(c, W, H, .5);
    }
  };
  /* ============ CARS-C : foto – clásico al atardecer / circuito nocturno ============ */
  function wheel(c, x, y, r, rim, hub) {
    c.save(); c.translate(x, y);
    c.fillStyle = '#07040c'; circle(c, 0, 0, r); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 3; circle(c, 0, 0, r - 6); c.stroke();
    c.fillStyle = lin(c, -r * .6, -r * .6, r * .6, r * .6, [[0, rim[0]], [.5, rim[1]], [1, rim[2]]]); circle(c, 0, 0, r * .62); c.fill();
    c.fillStyle = '#0d0714'; circle(c, 0, 0, r * .46); c.fill();
    c.strokeStyle = rim[1]; c.lineWidth = r * .06; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .3; c.beginPath(); c.moveTo(Math.cos(a) * r * .12, Math.sin(a) * r * .12); c.lineTo(Math.cos(a) * r * .44, Math.sin(a) * r * .44); c.stroke(); }
    c.fillStyle = hub; circle(c, 0, 0, r * .16); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = r * .05; c.beginPath(); c.arc(0, 0, r * .6, 3.4, 4.5); c.stroke();
    c.restore();
  }
  function classicCar(c, t) {
    const top = () => { c.moveTo(-352, -168); c.bezierCurveTo(-300, -184, -240, -190, -196, -192); c.bezierCurveTo(-170, -230, -150, -292, -70, -306); c.bezierCurveTo(10, -318, 80, -304, 142, -262); c.lineTo(190, -208); c.bezierCurveTo(250, -204, 330, -196, 356, -176); };
    // cuerpo
    c.beginPath(); c.moveTo(-372, -78); c.bezierCurveTo(-392, -110, -386, -150, -352, -168); top(); c.bezierCurveTo(384, -156, 392, -118, 380, -84); c.lineTo(366, -42); c.lineTo(-360, -42); c.closePath();
    c.fillStyle = lin(c, 0, -310, 0, -40, [[0, '#2b1738'], [.45, '#160a24'], [1, '#2a1230']]); c.fill();
    // reflejo cálido en los bajos
    c.save(); c.clip(); c.fillStyle = lin(c, 0, -110, 0, -40, [[0, 'rgba(255,120,60,0)'], [1, 'rgba(255,120,70,.5)']]); c.fillRect(-400, -110, 800, 80); c.restore();
    // arcos
    [[-225, 76], [232, 76]].forEach(([x, r]) => { c.fillStyle = '#05030a'; circle(c, x, -64, r); c.fill(); c.strokeStyle = 'rgba(255,170,100,.55)'; c.lineWidth = 5; c.beginPath(); c.arc(x, -64, r + 3, Math.PI * 1.02, Math.PI * 1.98); c.stroke(); });
    // ventanas
    const winG = lin(c, 0, -300, 0, -205, [[0, '#ffd08a'], [.5, '#ff7f8f'], [1, '#8a2f87']]);
    c.beginPath(); c.moveTo(-176, -204); c.bezierCurveTo(-152, -250, -128, -284, -76, -292); c.bezierCurveTo(0, -300, 70, -290, 128, -252); c.lineTo(168, -206); c.closePath(); c.fillStyle = winG; c.fill();
    c.fillStyle = '#1a0b27'; c.fillRect(-14, -300, 24, 100);
    c.strokeStyle = 'rgba(20,8,30,.9)'; c.lineWidth = 7; c.beginPath(); c.moveTo(-176, -204); c.bezierCurveTo(-152, -250, -128, -284, -76, -292); c.bezierCurveTo(0, -300, 70, -290, 128, -252); c.lineTo(168, -206); c.closePath(); c.stroke();
    // línea de carácter y manilla
    c.strokeStyle = 'rgba(255,170,110,.8)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-372, -112); c.bezierCurveTo(-200, -134, 120, -126, 372, -112); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-8, -196); c.lineTo(-8, -52); c.moveTo(-170, -196); c.quadraticCurveTo(-176, -110, -170, -50); c.moveTo(150, -204); c.quadraticCurveTo(160, -120, 150, -50); c.stroke();
    c.fillStyle = '#f2d3b0'; rr(c, 50, -170, 36, 7, 3.5); c.fill(); rr(c, -120, -170, 36, 7, 3.5); c.fill();
    // parachoques cromados
    c.fillStyle = lin(c, 0, -90, 0, -60, [[0, '#fff1dc'], [.5, '#b98a8a'], [1, '#6a4a66']]); rr(c, 318, -90, 80, 22, 10); c.fill(); rr(c, -398, -90, 60, 22, 10); c.fill();
    // faro y piloto
    c.fillStyle = '#d9b9a8'; circle(c, 348, -148, 27); c.fill(); c.fillStyle = '#fff5da'; circle(c, 348, -148, 20); c.fill();
    halo(c, 348, -148, 130, '#ffe2a0', .9);
    c.fillStyle = '#ff4a4a'; rr(c, -386, -146, 14, 34, 6); c.fill(); halo(c, -380, -130, 50, '#ff3b3b', .7);
    // luz de borde en el contorno superior
    c.strokeStyle = lin(c, -352, 0, 356, 0, [['0', '#ffb27a'], ['.5', '#fff0c8'], ['1', '#ffa56a']].map(a => [+a[0], a[1]])); c.lineWidth = 6; c.lineJoin = 'round'; c.beginPath(); top(); c.stroke();
    c.strokeStyle = 'rgba(255,200,140,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-372, -78); c.bezierCurveTo(-392, -110, -386, -150, -352, -168); c.stroke();
    // ruedas
    wheel(c, -225, -64, 64, ['#fff1dc', '#d9a88a', '#7a4a6a'], '#ffdba8'); wheel(c, 232, -64, 64, ['#fff1dc', '#d9a88a', '#7a4a6a'], '#ffdba8');
  }
  function racer(c, P, t) {
    const body = lin(c, 0, -210, 0, -28, [[0, P.b0], [.55, P.b1], [1, P.b2]]);
    // alerón trasero (detrás)
    c.fillStyle = '#0a0612'; rr(c, -350, -200, 16, 84, 4); c.fill();
    c.fillStyle = '#0a0612'; rr(c, -414, -208, 134, 11, 5); c.fill(); rr(c, -420, -236, 130, 11, 5); c.fill();
    c.fillStyle = '#1a0f34'; poly(c, [[-428, -248], [-282, -248], [-292, -190], [-424, -196]]); c.fill();
    c.fillStyle = P.b1; poly(c, [[-424, -200], [-290, -194], [-292, -190], [-424, -196]]); c.fill(); rr(c, -420, -214, 124, 5, 2); c.fill();
    c.strokeStyle = P.rim; c.lineWidth = 4; c.beginPath(); c.moveTo(-428, -248); c.lineTo(-282, -248); c.stroke();
    // carrocería
    c.beginPath(); c.moveTo(-352, -50); c.lineTo(-346, -122); c.bezierCurveTo(-300, -132, -200, -152, -128, -178); c.lineTo(-96, -212); c.lineTo(-46, -212); c.lineTo(-34, -172); c.bezierCurveTo(-10, -152, 60, -150, 108, -156); c.bezierCurveTo(200, -140, 300, -100, 392, -56); c.lineTo(390, -30); c.lineTo(300, -26); c.lineTo(-300, -26); c.closePath(); c.fillStyle = body; c.fill();
    // cockpit
    c.fillStyle = '#05030a'; c.beginPath(); c.moveTo(-30, -170); c.bezierCurveTo(-6, -148, 60, -146, 104, -152); c.lineTo(100, -166); c.bezierCurveTo(60, -160, -4, -162, -30, -178); c.closePath(); c.fill();
    // pontón lateral
    c.fillStyle = lin(c, 0, -130, 0, -40, [[0, mix(P.b1, '#ffffff', .25)], [1, P.b2]]); c.beginPath(); c.moveTo(-170, -52); c.bezierCurveTo(-170, -100, -100, -122, 20, -118); c.lineTo(170, -62); c.lineTo(160, -38); c.lineTo(-170, -38); c.closePath(); c.fill();
    c.fillStyle = '#0a0612'; c.beginPath(); c.moveTo(-10, -112); c.lineTo(130, -76); c.lineTo(130, -64); c.lineTo(-10, -96); c.closePath(); c.fill();
    c.strokeStyle = '#ffffff'; c.globalAlpha = .9; c.lineWidth = 9; c.beginPath(); c.moveTo(-340, -112); c.bezierCurveTo(-250, -130, -160, -150, -110, -176); c.stroke(); c.globalAlpha = 1;
    // alerón delantero
    c.fillStyle = '#0a0612'; rr(c, 330, -30, 94, 11, 4); c.fill(); c.fillStyle = P.b1; rr(c, 404, -58, 10, 44, 3); c.fill();
    // luz de borde
    c.strokeStyle = P.rim; c.lineWidth = 4; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-346, -122); c.bezierCurveTo(-300, -132, -200, -152, -128, -178); c.lineTo(-96, -212); c.lineTo(-46, -212); c.stroke();
    c.beginPath(); c.moveTo(108, -156); c.bezierCurveTo(200, -140, 300, -100, 392, -56); c.stroke();
    halo(c, -70, -214, 120, P.rim, .45);
    wheel(c, -235, -72, 72, ['#e8f4ff', '#8fa8c8', '#35405c'], P.rim); wheel(c, 262, -62, 62, ['#e8f4ff', '#8fa8c8', '#35405c'], P.rim);
    // luz del frontal
    c.fillStyle = '#fff'; rr(c, 380, -60, 18, 8, 4); c.fill(); halo(c, 396, -58, 70, P.rim, .6);
  }
  function flag(c, x, y, ang, flip, w, h, t, ph) {
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(flip, 1);
    const nx = 10, ny = 6, pts = [];
    for (let i = 0; i <= nx; i++) { pts[i] = []; for (let j = 0; j <= ny; j++) { const u = i / nx, vv = j / ny, a = 34 * u * Math.sin(TAU * (u * 1.25 - t + ph)) , sl = Math.cos(TAU * (u * 1.25 - t + ph)); pts[i][j] = [u * w * (1 - .05 * Math.abs(sl) * u), vv * h + a + 8 * Math.sin(TAU * (u * 2 - t * 2 + ph + vv * .2)) * u, sl]; } }
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const a = pts[i][j], b = pts[i + 1][j], d = pts[i + 1][j + 1], e = pts[i][j + 1], blk = (i + j) % 2;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.closePath();
      c.fillStyle = blk ? '#101018' : '#f6f4ee'; c.fill(); const sh = (a[2] + b[2]) / 2; c.fillStyle = sh > 0 ? `rgba(255,255,255,${.12 * sh})` : `rgba(10,5,30,${-.3 * sh})`; c.fill();
    }
    c.restore();
  }
  function pole(c, x0, y0, x1, y1, wd) { c.strokeStyle = '#d9c8a0'; c.lineCap = 'round'; c.lineWidth = wd; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = wd * .4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }

  SCENES['cars-c'] = {
    topic: 'cars', stillT: [.2, .45],
    cap: [
      { ca: 'Última llum del dia i un clàssic que no s\'atura 🌇 #cotxes', es: 'Última luz del día y un clásico que no se detiene 🌇 #coches', en: 'Last light of the day and a classic that won\'t stop 🌇 #cars' },
      { ca: 'Nit de circuit: llums, bandera i velocitat 🏁 #cotxes #motor', es: 'Noche de circuito: focos, bandera y velocidad 🏁 #coches #motor', en: 'Race night: floodlights, flags and speed 🏁 #cars #racing' }],
    draw(ctx, t, v) {
      const c = ctx;
      if (v % 2 === 0) {
        // ---- clásico al atardecer ----
        const hz = 1130;
        c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#120a3a'], [.3, '#4a1a78'], [.58, '#c02a7c'], [.82, '#ff6a5a'], [1, '#ffc27a']]); c.fillRect(0, 0, W, hz + 2);
        L.stars(c, 90, 31, t, { y1: 450, alpha: .6 });
        const sx = 610, sy = 1010, sr = 330;
        halo(c, sx, sy, 1000, '#ff8a6a', .55); halo(c, sx, sy, 520, '#ffd08a', .75);
        c.fillStyle = lin(c, 0, sy - sr, 0, sy + sr, [[0, '#fff6c8'], [.5, '#ffd27a'], [1, '#ff8a5a']]); circle(c, sx, sy, sr); c.fill();
        // nubes alargadas con borde cálido
        [[160, 600, 520, 26], [800, 700, 600, 30], [330, 820, 700, 34], [900, 890, 520, 24], [90, 960, 420, 22], [560, 520, 400, 18]].forEach(([x, y, w, h], i) => { const dx = 40 * wave(t, 1, i * .17); c.fillStyle = 'rgba(70,20,100,.55)'; rr(c, x - w / 2 + dx, y, w, h, h / 2); c.fill(); c.fillStyle = 'rgba(255,170,120,.7)'; rr(c, x - w / 2 + dx + w * .1, y, w * .8, h * .22, h * .1); c.fill(); });
        // colinas
        [[ '#7a2a7e', 250, 11, 0], ['#4a1a62', 190, 23, 0], ['#2a0e44', 120, 37, 0]].forEach(([col, amp, seed], li) => { c.beginPath(); c.moveTo(0, hz + 30); for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, hz + 8 - li * 6 - amp * Math.pow(.5 + .5 * L.ridge(x, seed, 1080, 4), 1.7)); c.lineTo(W, hz + 30); c.closePath(); c.fillStyle = lin(c, 0, hz - amp, 0, hz, [[0, col], [1, mix(col, '#ff8a6a', .3 - li * .08)]]); c.fill(); });
        // postes y cables al fondo
        for (let i = 0; i < 7; i++) { const x = 40 + i * 190, h = 170 - i * 4; c.fillStyle = '#1c0a2c'; c.fillRect(x - 3, hz - h + 20, 6, h); c.fillRect(x - 28, hz - h + 28, 56, 5); }
        c.strokeStyle = '#1c0a2c'; c.lineWidth = 2; [28, 40, 52].forEach(dy => { c.beginPath(); for (let i = 0; i < 7; i++) { const x = 40 + i * 190, h = 170 - i * 4, y = hz - h + 30 + dy * .2; if (i === 0) c.moveTo(x, y); else c.quadraticCurveTo(x - 95, y + 36, x, y); } c.stroke(); });
        // desierto y carretera
        c.fillStyle = lin(c, 0, hz, 0, hz + 150, [[0, '#6a2a62'], [1, '#2a1038']]); c.fillRect(0, hz, W, 150);
        c.fillStyle = lin(c, 0, hz + 100, 0, 1620, [[0, '#2a1438'], [.6, '#150a24'], [1, '#0a0514']]); c.fillRect(0, hz + 100, W, H - hz);
        const rt = 1250, rb = 1560;
        poly(c, [[0, rt], [W, rt], [W, rb], [0, rb]]); c.fillStyle = lin(c, 0, rt, 0, rb, [[0, '#3a1c48'], [1, '#0e0618']]); c.fill();
        c.save(); c.beginPath(); c.rect(0, rt, W, rb - rt); c.clip(); c.save(); c.translate(sx, rt); c.scale(.5, 1); c.fillStyle = rad(c, 0, 0, 0, 560, [[0, 'rgba(255,170,110,.75)'], [1, 'rgba(255,120,90,0)']]); circle(c, 0, 0, 560); c.fill(); c.restore(); c.restore();
        c.fillStyle = '#ffcf8a'; c.fillRect(0, rt, W, 5); c.fillStyle = 'rgba(255,210,150,.8)'; for (let i = 0; i < 8; i++) { const x = -60 + i * 160, w = 90 + 8 * i; rr(c, x, 1396, w, 8, 4); c.fill(); }
        // sombra larga
        poly(c, [[110, 1448], [970, 1448], [1260, 1700], [-120, 1700]]); c.fillStyle = lin(c, 0, 1448, 0, 1700, [[0, 'rgba(8,2,18,.5)'], [1, 'rgba(8,2,18,0)']]); c.fill();
        // coche
        c.save(); c.translate(540, 1448 + 2 * wave(t, 4)); c.scale(1.3, 1.3); halo(c, 0, -10, 520, '#ff5a8a', .22); classicCar(c, t); c.restore();
        // polvo en el aire iluminado
        L.loopParticles(40, 51, t, (i, p, r) => { const x = r() * W, y = 900 + r() * 640 - p * 120; c.fillStyle = `rgba(255,220,170,${.55 * Math.sin(Math.PI * p)})`; circle(c, x + 24 * Math.sin(p * TAU + i), y, 1.6 + r() * 2.6); c.fill(); });
        // pájaros
        for (let i = 0; i < 5; i++) { const x = 130 + i * 62, y = 400 + (i % 2) * 34 + 14 * wave(t, 2, i * .1); c.strokeStyle = '#1c0a2c'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 20, y + 4 - 8 * wave(t, 4, i * .13)); c.quadraticCurveTo(x - 8, y - 8, x, y + 2); c.quadraticCurveTo(x + 8, y - 8, x + 20, y + 4 - 8 * wave(t, 4, i * .13)); c.stroke(); }
        L.vignette(c, W, H, .5);
      } else {
        // ---- circuito nocturno ----
        const P = { b0: '#ff8a4a', b1: '#ff3b3b', b2: '#8f1030', rim: '#7fe9ff' };
        c.fillStyle = lin(c, 0, 0, 0, 1250, [[0, '#04061c'], [.5, '#14104a'], [.85, '#4a1a72'], [1, '#c43a8c']]); c.fillRect(0, 0, W, 1260);
        L.stars(c, 110, 44, t, { y1: 800, alpha: .7 });
        // focos / haces
        const towers = [[110, 1230, 880, 1], [980, 1230, 880, 1], [330, 1230, 1020, .7], [760, 1230, 1020, .7]];
        c.save(); c.globalCompositeOperation = 'lighter';
        towers.forEach(([x, y0, y1, sc], i) => { const sw = 60 * wave(t, 1, i * .21); const tx = 540 + (x < 540 ? 1 : -1) * (180 + 90 * i % 2) + sw, ty = 300 + 60 * i; const g = c.createLinearGradient(x, y1, tx, ty); g.addColorStop(0, 'rgba(180,220,255,.42)'); g.addColorStop(1, 'rgba(180,220,255,0)'); c.fillStyle = g; poly(c, [[x - 28 * sc, y1], [x + 28 * sc, y1], [tx + 70, ty], [tx - 70, ty]]); c.fill(); });
        c.restore();
        // grada con puntos de luz
        c.fillStyle = lin(c, 0, 1090, 0, 1240, [[0, '#0b0724'], [1, '#150a30']]); poly(c, [[0, 1170], [200, 1110], [880, 1110], [W, 1170], [W, 1250], [0, 1250]]); c.fill();
        const rc = rng(9); for (let row = 0; row < 5; row++) for (let i = 0; i < 70; i++) { const x = rc() * W, y = 1130 + row * 22 + rc() * 8; c.fillStyle = ['#ff6ad8', '#6ae9ff', '#ffd36a', '#ffffff'][Math.floor(rc() * 4)]; c.globalAlpha = .35 + .5 * wave01(t, 1 + (i % 2), rc()); c.fillRect(x, y, 3, 3); } c.globalAlpha = 1;
        c.fillStyle = '#ffe9b0'; c.fillRect(200, 1108, 680, 3); halo(c, 540, 1108, 460, '#ffd7a0', .18);
        // torres de focos
        towers.forEach(([x, y0, y1, sc]) => {
          c.fillStyle = '#080618'; poly(c, [[x - 14 * sc, y0], [x + 14 * sc, y0], [x + 6 * sc, y1], [x - 6 * sc, y1]]); c.fill();
          c.strokeStyle = '#2a2a58'; c.lineWidth = 2 * sc; for (let k = 0; k < 7; k++) { const yy = y1 + (y0 - y1) * k / 7; c.beginPath(); c.moveTo(x - 13 * sc, yy); c.lineTo(x + 13 * sc, yy + 16 * sc); c.stroke(); }
          c.fillStyle = '#0c0a24'; rr(c, x - 52 * sc, y1 - 64 * sc, 104 * sc, 68 * sc, 8 * sc); c.fill();
          for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) { c.fillStyle = '#fff'; circle(c, x - 36 * sc + b * 24 * sc, y1 - 48 * sc + a * 20 * sc, 7 * sc); c.fill(); }
          halo(c, x, y1 - 30 * sc, 220 * sc, '#bfe6ff', .75 + .1 * wave(t, 1, x * .01)); halo(c, x, y1 - 30 * sc, 70 * sc, '#ffffff', .95);
        });
        // pista
        const rt = 1245, rb = 1580;
        c.fillStyle = lin(c, 0, rt, 0, rb, [[0, '#1a1646'], [1, '#08051c']]); c.fillRect(0, rt, W, rb - rt);
        for (let i = 0; i < 24; i++) { const x = i * 50 - 10; c.fillStyle = i % 2 ? '#f4f4f6' : '#ff3b3b'; c.fillRect(x, rt, 50, 14); c.fillRect(x - 10 * (i % 2 ? 0 : 0), rb - 6, 50, 22); }
        c.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 7; i++) rr(c, -50 + i * 180, 1410, 110, 8, 4), c.fill();
        c.save(); c.beginPath(); c.rect(0, rt, W, rb - rt); c.clip(); halo(c, 220, 1260, 500, '#8fb4ff', .22); halo(c, 860, 1260, 500, '#8fb4ff', .22); c.restore();
        // estelas de velocidad
        const rs = rng(66);
        for (let i = 0; i < 16; i++) { const y = 1270 + rs() * 250, x1 = 160 + rs() * 120, len = 280 + rs() * 560, a = .18 + rs() * .42; const g = c.createLinearGradient(x1 - len, 0, x1, 0); g.addColorStop(0, 'rgba(127,233,255,0)'); g.addColorStop(1, i % 3 ? `rgba(160,235,255,${a})` : `rgba(255,120,200,${a})`); c.fillStyle = g; rr(c, x1 - len, y, len, 2 + rs() * 3, 2); c.fill(); }
        // sombra y coche
        c.save(); c.translate(560, 1448 + 2 * wave(t, 4)); c.scale(1.1, 1.1);
        c.fillStyle = rad(c, 0, 0, 0, 1, [[0, 'rgba(0,0,0,.6)'], [1, 'rgba(0,0,0,0)']]); c.save(); c.scale(500, 34); circle(c, 0, 4, 1); c.fill(); c.restore();
        halo(c, 0, -90, 480, '#ff5a6a', .22); racer(c, P, t); c.restore();
        L.loopParticles(26, 71, t, (i, p, r) => { const x = 160 - p * 360 - r() * 60, y = 1440 - p * 20 + r() * 20 - 20 * Math.sin(p * 9 + i); c.fillStyle = `rgba(255,${190 + (i % 3) * 20},90,${.95 * (1 - p)})`; circle(c, x, y, 2.5 * (1 - p) + 1); c.fill(); });
        // banderas cruzadas
        c.save(); pole(c, 540, 930, 220, 300, 12); pole(c, 540, 930, 860, 300, 12); c.fillStyle = '#ffd36a'; circle(c, 220, 296, 11); c.fill(); circle(c, 860, 296, 11); c.fill(); c.restore();
        flag(c, 238, 340, -.55, -1, 330, 230, t, 0); flag(c, 842, 340, .55, 1, 330, 230, t, .3);
        L.vignette(c, W, H, .5);
      }
    }
  };
})();
