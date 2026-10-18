/* MUSIC – a: ecualizador neón sobre skyline nocturno (v0: sol retro + suelo de rejilla; v1: luna con ecualizador radial + puerto con reflejo) */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, halo, rng, circle, mix, lerp, clamp, rr } = L;

  /* golpe de bombo: ataque rápido y caída exponencial, periódico (k golpes por bucle) */
  const beat = (t, k, ph = 0) => { const f = (((t * k + ph) % 1) + 1) % 1; return (1 - Math.exp(-f * 70)) * Math.exp(-f * 4.2); };
  /* nivel de una barra del ecualizador (0..1), periódico en t */
  function level(i, N, t, seed) {
    const x = i / Math.max(1, N - 1), r = rng(seed * 131 + i * 17 + 3);
    const env = .30 + .62 * Math.pow(1 - x, .9) * .8 + .5 * Math.exp(-Math.pow((x - .55) * 3.2, 2)) * .5;
    const a = wave01(t, 2 + Math.floor(r() * 5), r()), b = wave01(t, 3 + Math.floor(r() * 6), r()), c = wave01(t, 8 + Math.floor(r() * 5), r());
    let v = 1.5 * env * (.14 + .5 * a + .26 * b + .12 * c);
    v += beat(t, 16) * Math.pow(1 - x, 2.2) * .5 + beat(t, 16, .5) * Math.exp(-Math.pow((x - .72) * 4, 2)) * .18;
    return clamp(v, .04, 1);
  }

  /* skyline: edificios con ventanas; flip=true para reflejo */
  function skyline(ctx, o, t) {
    const r = rng(o.seed); let x = -30;
    while (x < 1110) {
      const w = o.wmin + r() * (o.wmax - o.wmin), h = o.hmin + Math.pow(r(), 1.4) * (o.hmax - o.hmin), top = o.base - h;
      const g = lin(ctx, 0, top, 0, o.base, [[0, o.top], [1, o.bot]]);
      ctx.fillStyle = g; ctx.fillRect(x, top, w + 1, h + 2);
      // coronación
      const kind = Math.floor(r() * 4);
      if (kind === 0) { ctx.fillRect(x + w * .3, top - 26, w * .4, 28); ctx.fillRect(x + w * .48, top - 80, 4, 56); if (o.blink) { const a = wave01(t, 2, r()); ctx.fillStyle = `rgba(255,70,90,${.25 + .75 * a})`; circle(ctx, x + w * .5 + 2, top - 84, 6); ctx.fill(); halo(ctx, x + w * .5 + 2, top - 84, 38, '#ff4660', .6 * a); } }
      else if (kind === 1) { ctx.fillRect(x + 12, top - 18, w - 24, 20); }
      else if (kind === 2) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w * .5, top - 40); ctx.lineTo(x + w, top); ctx.fill(); }
      // luz de borde
      if (o.rim) { ctx.fillStyle = o.rim; ctx.fillRect(x, top, w, 3); ctx.fillStyle = o.rimSide || o.rim; ctx.globalAlpha = .45; ctx.fillRect(x + w - 3, top, 3, h); ctx.globalAlpha = 1; }
      // ventanas
      const cols = Math.floor((w - 16) / 24), rows = Math.floor((h - 24) / 36);
      for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
        const q = r(); if (q > o.lit) continue;
        const tw = r() < .12 ? .45 + .55 * wave01(t, 1 + Math.floor(r() * 3), r()) : 1;
        ctx.globalAlpha = (.55 + .45 * r()) * tw; ctx.fillStyle = r() < .72 ? o.win[0] : o.win[1];
        ctx.fillRect(x + 10 + cx * 24, top + 16 + cy * 36, 11, 16);
      }
      ctx.globalAlpha = 1; x += w + (o.gap || 0) + r() * 6;
    }
  }

  /* nota musical dibujada (corchea) */
  function note(ctx, x, y, s, col, rot, dbl) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.lineCap = 'round';
    L.ellipse(ctx, 0, 0, 20, 15, -.4); ctx.fill(); ctx.beginPath(); ctx.moveTo(17, -4); ctx.lineTo(17, -86); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(17, -86); ctx.bezierCurveTo(30, -66, 56, -66, 50, -36); ctx.lineWidth = 8; ctx.stroke();
    if (dbl) { L.ellipse(ctx, 62, 14, 20, 15, -.4); ctx.lineWidth = 7; ctx.fill(); ctx.beginPath(); ctx.moveTo(79, 10); ctx.lineTo(79, -72); ctx.stroke(); ctx.beginPath(); ctx.moveTo(17, -86); ctx.lineTo(79, -72); ctx.lineWidth = 12; ctx.stroke(); }
    ctx.restore();
  }
  function floatingNotes(ctx, t, seed, cols, y0, y1, n) {
    L.loopParticles(n, seed, t, (i, p, r) => {
      const x = 120 + r() * 840 + 40 * Math.sin(p * TAU + i), y = lerp(y0, y1, p), a = Math.sin(Math.PI * p);
      ctx.globalAlpha = .75 * a; note(ctx, x, y, .55 + r() * .45, cols[i % cols.length], .25 * Math.sin(p * TAU * 2 + i), r() < .4);
    });
    ctx.globalAlpha = 1;
  }

  /* --------- v0: sol retro + suelo neón --------- */
  function drawRetro(ctx, t, v) {
    const W = 1080, H = 1920, hz = 1150, cx = 540, cy = 700, R = 300;
    const b = beat(t, 16), b2 = beat(t, 8);
    ctx.fillStyle = lin(ctx, 0, 0, 0, hz, [[0, '#0a0524'], [.35, '#2a0d5c'], [.68, '#8a1f89'], [.9, '#ff4f8b'], [1, '#ff9a5c']]); ctx.fillRect(0, 0, W, hz + 2);
    L.stars(ctx, 90, 21, t, { y1: 600, alpha: .8 });
    halo(ctx, cx, cy, 900, '#ff3d9a', .38 + .3 * b); halo(ctx, cx, cy, 520, '#ffb36b', .45 + .15 * b);
    // sol con rendijas que bajan (1 periodo por bucle)
    const s = 1 + .03 * b;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    const sp = 50, y0 = cy - R, y1 = cy + R;
    const cuts = []; for (let j = -2; j < 16; j++) { const yy = cy - 40 + (j + t) * sp; const th = clamp((yy - (cy - 30)) / (R + 30), 0, 1) * 40; if (th > 1.5) cuts.push([yy, yy + th]); }
    cuts.sort((a, b) => a[0] - b[0]);
    const sunG = lin(ctx, 0, y0, 0, y1, [[0, '#fff27a'], [.45, '#ffb04a'], [.75, '#ff4f8b'], [1, '#b72bd8']]);
    let cur = y0 - 4;
    const seg = (a, bb) => { if (bb <= a) return; ctx.save(); ctx.beginPath(); ctx.rect(0, a, W, bb - a); ctx.clip(); ctx.fillStyle = sunG; circle(ctx, cx, cy, R); ctx.fill(); ctx.restore(); };
    cuts.forEach(([a, bb]) => { seg(cur, a); cur = Math.max(cur, bb); }); seg(cur, y1 + 4);
    ctx.restore();
    // anillos de onda expansiva
    for (let i = 0; i < 2; i++) { const p = ((t * 8 + i * .5) % 1); ctx.strokeStyle = `rgba(255,170,220,${.4 * (1 - p)})`; ctx.lineWidth = 3 + 7 * (1 - p); circle(ctx, cx, cy, R * s + 20 + p * 520); ctx.stroke(); }
    // skyline lejano y cercano
    skyline(ctx, { seed: 4, base: hz + 2, wmin: 60, wmax: 120, hmin: 130, hmax: 320, top: '#3a1565', bot: '#220a46', win: ['#ffd27a', '#ff7ab8'], lit: .35, rim: 'rgba(255,120,200,.55)', blink: true }, t);
    ctx.fillStyle = 'rgba(40,10,70,.35)'; ctx.fillRect(0, hz - 70, W, 74);
    skyline(ctx, { seed: 9, base: hz + 2, wmin: 80, wmax: 150, hmin: 80, hmax: 250, top: '#1b0838', bot: '#0d0420', win: ['#4df3ff', '#ffd27a'], lit: .3, rim: 'rgba(80,240,255,.7)', rimSide: 'rgba(255,90,190,.5)', gap: 6 }, t);
    // suelo
    ctx.fillStyle = lin(ctx, 0, hz, 0, H, [[0, '#2c0a50'], [.12, '#18053a'], [1, '#08021a']]); ctx.fillRect(0, hz, W, H - hz);
    halo(ctx, cx, hz, 700, '#ff4f9a', .35 + .25 * b);
    ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip();
    ctx.lineCap = 'butt';
    for (let j = -4; j < 20; j++) { const u = (j + t * 2) / 14; if (u <= 0 || u > 1.2) continue; const y = hz + Math.pow(u, 2.1) * (H - hz); const a = clamp(u * 1.4, 0, 1);
      ctx.strokeStyle = `rgba(255,70,190,${.18 * a})`; ctx.lineWidth = 3 + 8 * u; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.strokeStyle = `rgba(255,140,230,${.75 * a})`; ctx.lineWidth = 1.5 + 3 * u; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let k = -14; k <= 14; k++) { const xb = cx + k * 170; ctx.strokeStyle = 'rgba(255,120,220,.5)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx + k * 8, hz); ctx.lineTo(xb, H); ctx.stroke(); }
    ctx.restore();
    // ecualizador LED
    const N = 17, bw = 44, gap = 16, x0 = (W - (N * (bw + gap) - gap)) / 2, base = 1440, maxH = 560, seg0 = 24, segH = 20;
    const lv = []; for (let i = 0; i < N; i++) lv.push(level(i, N, t, 5));
    const drawBars = (alpha, flip) => {
      ctx.save(); ctx.globalAlpha = alpha; if (flip) { ctx.translate(0, base * 2); ctx.scale(1, -1); }
      for (let i = 0; i < N; i++) {
        const n = Math.max(1, Math.round(lv[i] * maxH / seg0)), bx = x0 + i * (bw + gap);
        for (let s = 0; s < n; s++) { const k = s / (maxH / seg0); ctx.fillStyle = k < .35 ? mix('#27e8e0', '#a06bff', k / .35) : mix('#a06bff', '#ff3c92', (k - .35) / .65); rr(ctx, bx, base - (s + 1) * seg0 + 2, bw, segH, 5); ctx.fill(); }
        // pico flotante
        const pk = Math.min(1, lv[i] + .05 + .07 * wave01(t, 2, i * .13)); ctx.fillStyle = '#fff3fb'; rr(ctx, bx, base - pk * maxH - segH - 6, bw, 8, 4); ctx.fill();
      }
      ctx.restore();
    };
    for (let i = 0; i < N; i++) halo(ctx, x0 + i * (bw + gap) + bw / 2, base - lv[i] * maxH * .5, 150, 'rgba(255,60,180,1)', .13 * lv[i]);
    drawBars(1, false);
    ctx.save(); ctx.beginPath(); ctx.rect(0, base, W, 200); ctx.clip(); drawBars(.2, true); ctx.fillStyle = lin(ctx, 0, base, 0, base + 190, [[0, 'rgba(8,2,26,0)'], [1, 'rgba(8,2,26,.95)']]); ctx.fillRect(0, base, W, 200); ctx.restore();
    // línea de luz del suelo
    ctx.fillStyle = 'rgba(255,200,240,.8)'; ctx.fillRect(x0 - 30, base + 2, N * (bw + gap) - gap + 60, 3); halo(ctx, cx, base + 4, 500, '#ff4fb0', .2 + .15 * b2);
    floatingNotes(ctx, t, 31, ['#ff8fd8', '#7ff3ff', '#ffe27a'], 1250, 330, 7);
    L.vignette(ctx, W, H, .45);
  }

  /* --------- v1: luna + ecualizador radial + puerto --------- */
  function drawMoon(ctx, t, v) {
    const W = 1080, H = 1920, hz = 1330, cx = 540, cy = 680, R = 215;
    const b = beat(t, 16), b2 = beat(t, 8, .25);
    ctx.fillStyle = lin(ctx, 0, 0, 0, hz, [[0, '#021226'], [.4, '#06304a'], [.8, '#0c6a7a'], [1, '#2bb8a6']]); ctx.fillRect(0, 0, W, hz + 2);
    L.stars(ctx, 120, 33, t, { y1: 900, alpha: .85, color: '#d8fff6' });
    // aurora suave
    for (let i = 0; i < 3; i++) { const yy = 420 + i * 190; ctx.fillStyle = lin(ctx, 0, yy - 120, 0, yy + 120, [[0, 'rgba(120,255,200,0)'], [.5, `rgba(120,255,200,${.07 + .03 * wave(t, 1, i * .3)})`], [1, 'rgba(120,255,200,0)']]); ctx.beginPath(); ctx.moveTo(0, yy); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, yy + 60 * wave(x / 1080, 1 + i, i * .2 + t) ); ctx.lineTo(W, yy + 200); ctx.lineTo(0, yy + 200); ctx.fill(); }
    halo(ctx, cx, cy, 800, '#38e8d0', .28 + .22 * b); halo(ctx, cx, cy, 420, '#e9fff4', .35 + .18 * b);
    // barras radiales
    const NB = 96, r0 = R + 48 + 8 * b;
    const lvl = []; for (let i = 0; i < NB; i++) { const k = Math.min(i, NB - i); lvl.push(level(k, NB / 2 + 1, t, 8)); }
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NB; i++) {
      const a = (i / NB) * TAU - Math.PI / 2, k = Math.min(i, NB - i) / (NB / 2), len = 18 + 215 * lvl[i];
      const c = mix('#c8ff3a', '#25e8e0', clamp(k * 1.15, 0, 1));
      ctx.strokeStyle = pass ? c : 'rgba(80,255,220,.16)'; ctx.lineWidth = pass ? 9 : 22;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(210,255,240,.55)'; ctx.lineWidth = 3; circle(ctx, cx, cy, r0 - 16); ctx.stroke();
    for (let i = 0; i < 2; i++) { const p = ((t * 8 + i * .5) % 1); ctx.strokeStyle = `rgba(150,255,230,${.35 * (1 - p)})`; ctx.lineWidth = 2 + 6 * (1 - p); circle(ctx, cx, cy, r0 + 250 + p * 160); ctx.stroke(); }
    // luna
    const ms = 1 + .025 * b;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(ms, ms);
    ctx.fillStyle = lin(ctx, -R, -R, R, R, [[0, '#fffdea'], [1, '#d6f3dd']]); circle(ctx, 0, 0, R); ctx.fill();
    ctx.save(); circle(ctx, 0, 0, R); ctx.clip(); const rc = rng(4);
    [[-70, -60, 46], [60, 30, 62], [-30, 90, 34], [80, -90, 26], [-110, 20, 22], [10, -20, 18]].forEach(([x, y, r]) => { ctx.fillStyle = 'rgba(120,170,160,.22)'; circle(ctx, x, y, r); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; circle(ctx, x - r * .18, y - r * .18, r * .86); ctx.fill(); });
    ctx.fillStyle = lin(ctx, R * .4, 0, R, 0, [[0, 'rgba(10,60,80,0)'], [1, 'rgba(10,60,80,.35)']]); ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
    ctx.restore();
    // nubes finas
    for (let i = 0; i < 4; i++) { const x = ((i * 380 + t * 1080 * (1 + (i % 2))) % 1500) - 210, y = 980 + i * 70; ctx.fillStyle = 'rgba(180,255,240,.10)'; rr(ctx, x, y, 320 - i * 30, 22, 11); ctx.fill(); }
    // skyline + agua
    const sk = (blink) => {
      skyline(ctx, { seed: 14, base: hz + 2, wmin: 70, wmax: 130, hmin: 160, hmax: 470, top: '#0a4458', bot: '#06293a', win: ['#ffd27a', '#ffefb0'], lit: .3, rim: 'rgba(130,255,235,.5)', blink }, t);
      ctx.fillStyle = 'rgba(8,60,80,.45)'; ctx.fillRect(0, hz - 60, W, 64);
      skyline(ctx, { seed: 3, base: hz + 2, wmin: 90, wmax: 170, hmin: 90, hmax: 330, top: '#052133', bot: '#021019', win: ['#ffb347', '#ffe08a'], lit: .38, rim: 'rgba(200,255,120,.55)', rimSide: 'rgba(90,240,220,.4)', gap: 8 }, t);
    };
    sk(true);
    ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip(); ctx.translate(0, 2 * hz); ctx.scale(1, -1); sk(false); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip();
    ctx.fillStyle = lin(ctx, 0, hz, 0, H, [[0, 'rgba(10,80,100,.45)'], [.35, 'rgba(3,26,44,.82)'], [1, 'rgba(1,8,18,.97)']]); ctx.fillRect(0, hz, W, H - hz);
    // reflejo de la luna y de las barras
    ctx.save(); ctx.translate(cx, hz); ctx.scale(1, 2.3); ctx.fillStyle = rad(ctx, 0, 0, 0, 300, [[0, 'rgba(230,255,240,.34)'], [1, 'rgba(230,255,240,0)']]); ctx.fillRect(-300, 0, 600, 300); ctx.restore();
    { const rg = rng(6); for (let i = 0; i < 34; i++) { const p = i / 34, y = hz + 18 + p * 560, wd = (80 + rg() * 260 * (.5 + p)) * (.7 + .3 * wave(t, 2, i * .11)) * (.75 + .4 * b); ctx.fillStyle = `rgba(235,255,245,${.5 * (1 - p)})`; rr(ctx, cx - wd / 2 + (rg() - .5) * 120 + 16 * wave(t, 1, i * .07), y, wd, 4 + p * 7, 3); ctx.fill(); } }
    for (let i = 0; i < 12; i++) { const p = ((t * 1 + i / 12) % 1), y = hz + 20 + p * p * (H - hz); ctx.fillStyle = `rgba(150,255,230,${.1 * (1 - p)})`; ctx.fillRect(0, y, W, 2 + p * 5); }
    ctx.restore();
    ctx.fillStyle = 'rgba(190,255,235,.55)'; ctx.fillRect(0, hz, W, 3);
    floatingNotes(ctx, t, 77, ['#c8ff3a', '#7ff3ff', '#ffffff'], 1250, 330, 7);
    L.vignette(ctx, W, H, .5);
  }

  SCENES['music-a'] = {
    topic: 'music', stillT: [.06, .31],
    cap: [
      { ca: 'Quan el baix et puja per dins 🔊 #música #synthwave', es: 'Cuando el bajo te sube por dentro 🔊 #música #synthwave', en: 'When the bass hits you from the inside 🔊 #music #synthwave' },
      { ca: 'Ciutat de nit i ritme a tota pastilla 🌙 #música', es: 'Ciudad de noche y ritmo a tope 🌙 #música', en: 'City at night and the beat turned up 🌙 #music' }],
    draw(ctx, t, v) { (v % 2 === 0 ? drawRetro : drawMoon)(ctx, t, v); }
  };

  /* ================= MUSIC – b: habitación lo-fi ================= */
  function leaf(ctx, len, wid, c1, c2, rot) {
    ctx.save(); ctx.rotate(rot || 0);
    ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(len * .25, -wid * 1.1, len * .8, -wid * .8, len, 0); ctx.bezierCurveTo(len * .8, wid * .8, len * .25, wid * 1.1, 0, 0); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(len * .25, -wid * 1.1, len * .8, -wid * .8, len, 0); ctx.lineTo(0, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(len * .08, 0); ctx.lineTo(len * .85, 0); ctx.stroke();
    ctx.restore();
  }
  function pot(ctx, x, y, w, h, c1, c2) {
    ctx.fillStyle = lin(ctx, x - w / 2, 0, x + w / 2, 0, [[0, c1], [1, c2]]);
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w * .36, y); ctx.lineTo(x - w * .36, y); ctx.closePath(); ctx.fill();
    rr(ctx, x - w * .56, y - h - 16, w * 1.12, 26, 9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)'; rr(ctx, x - w * .5, y - h - 12, w * 1.0, 6, 3); ctx.fill();
  }
  function bush(ctx, x, y, s, t, seed, c1, c2, n, spread) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - .5) * spread + (r() - .5) * .2, len = (120 + r() * 120) * s;
      const sw = .045 * wave(t, 1, r()), ang = a + sw;
      ctx.save(); ctx.translate(x, y); ctx.strokeStyle = c2; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(ang) * len * .4 + 12 * s, Math.sin(ang) * len * .6, Math.cos(ang) * len, Math.sin(ang) * len); ctx.stroke();
      ctx.translate(Math.cos(ang) * len, Math.sin(ang) * len); leaf(ctx, (90 + r() * 40) * s, (34 + r() * 14) * s, c1, c2, ang + (r() - .5) * .8);
      ctx.restore();
    }
  }
  function vine(ctx, x, y0, len, t, seed, c1, c2) {
    const r = rng(seed);
    const px = (d) => x + 18 * wave(t, 1, d / 900) * (d / len) + 10 * Math.sin(d / 55 + seed);
    ctx.strokeStyle = c2; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); for (let d = 0; d <= len; d += 12) { const X = px(d); d ? ctx.lineTo(X, y0 + d) : ctx.moveTo(X, y0); } ctx.stroke();
    for (let d = 30; d < len; d += 46) { const X = px(d), side = (d / 46 | 0) % 2 ? 1 : -1; ctx.save(); ctx.translate(X, y0 + d); leaf(ctx, 56 + r() * 14, 22, c1, c2, side > 0 ? .5 + .2 * wave(t, 1, d / 700) : Math.PI - .5 - .2 * wave(t, 1, d / 700)); ctx.restore(); }
  }
  function cat(ctx, x, y, s, t, c1, c2) {
    const br = wave(t, 2) * .5 + .5;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // cola
    ctx.strokeStyle = c1; ctx.lineWidth = 34; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-115, 20); ctx.bezierCurveTo(-170, 60, -120, 112, -20, 100); ctx.bezierCurveTo(30 + 12 * wave(t, 1), 94, 70, 100, 100 + 10 * wave(t, 1), 88); ctx.stroke();
    // cuerpo
    ctx.save(); ctx.translate(0, 70); ctx.scale(1, 1 + .035 * br); ctx.translate(0, -70);
    ctx.fillStyle = lin(ctx, 0, -10, 0, 110, [[0, c1], [1, c2]]); ctx.beginPath(); ctx.moveTo(-135, 100); ctx.bezierCurveTo(-150, -20, -50, -40, 40, -30); ctx.bezierCurveTo(120, -20, 150, 40, 140, 100); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = c2; ctx.lineWidth = 12; ctx.lineCap = 'round';
    [[-90, -20, -70, 30], [-45, -30, -25, 20], [0, -34, 20, 16]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }); ctx.restore();
    ctx.restore();
    // patas delanteras
    ctx.fillStyle = c1; L.ellipse(ctx, 120, 104, 52, 22); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.2)'; L.ellipse(ctx, 140, 108, 22, 12); ctx.fill();
    // cabeza
    ctx.save(); ctx.translate(112, 54 + 2 * br); ctx.rotate(.12);
    ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(-46, -30); ctx.lineTo(-40, -76); ctx.lineTo(-8, -48); ctx.fill(); ctx.beginPath(); ctx.moveTo(46, -30); ctx.lineTo(40, -76); ctx.lineTo(8, -48); ctx.fill();
    ctx.fillStyle = '#ff9db0'; ctx.beginPath(); ctx.moveTo(-36, -38); ctx.lineTo(-34, -62); ctx.lineTo(-17, -46); ctx.fill(); ctx.beginPath(); ctx.moveTo(36, -38); ctx.lineTo(34, -62); ctx.lineTo(17, -46); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -50, 0, 40, [[0, c1], [1, c2]]); L.ellipse(ctx, 0, 0, 58, 48); ctx.fill();
    ctx.strokeStyle = '#2a1a2e'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(-22, -2, 12, .15 * Math.PI, .85 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(22, -2, 12, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#ff8fa6'; ctx.beginPath(); ctx.moveTo(-7, 12); ctx.lineTo(7, 12); ctx.lineTo(0, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; [[-62, 10, -34, 14], [-62, 22, -34, 20], [62, 10, 34, 14], [62, 22, 34, 20]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
    ctx.restore();
    ctx.restore();
  }
  function vinyl(ctx, x, y, rx, ry, t, turns, lab) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    ctx.fillStyle = rad(ctx, 0, 0, 0, rx, [[0, '#2a2538'], [.35, '#15121e'], [1, '#0c0a14']]); circle(ctx, 0, 0, rx); ctx.fill();
    ctx.lineWidth = 1.5; for (let r = rx * .4; r < rx * .97; r += 7) { ctx.strokeStyle = `rgba(255,255,255,${.035 + .03 * ((r / 7 | 0) % 3 === 0)})`; circle(ctx, 0, 0, r); ctx.stroke(); }
    // destello estático
    ctx.save(); circle(ctx, 0, 0, rx); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rx, -2.3, -1.9); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rx, .84, 1.24); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.rotate(L.TAU * turns * t);
    for (let i = 0; i < 14; i++) { const a = i / 14 * L.TAU; ctx.fillStyle = 'rgba(255,255,255,.28)'; circle(ctx, Math.cos(a) * rx * .83, Math.sin(a) * rx * .83, 3 + (i === 0) * 2); ctx.fill(); }
    ctx.fillStyle = lab[0]; circle(ctx, 0, 0, rx * .33); ctx.fill();
    ctx.fillStyle = lab[1]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rx * .33, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; circle(ctx, rx * .22, 0, rx * .035); ctx.fill();
    ctx.fillStyle = '#0c0a14'; circle(ctx, 0, 0, rx * .035); ctx.fill();
    ctx.restore();
  }
  function steam(ctx, x, y, t, col, n, h) {
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < h; d += 9) {
        const a = Math.sin(Math.PI * d / h) * .3, X = x + (i - (n - 1) / 2) * 26 + 13 * Math.sin(L.TAU * (d / 120 - t * 1 + i * .37)) * (.4 + d / h);
        ctx.strokeStyle = col.replace('A', a.toFixed(3)); ctx.lineWidth = 9 + d / h * 6; ctx.beginPath(); ctx.moveTo(X, y - d); ctx.lineTo(X + 1, y - d - 10); ctx.stroke();
      }
    }
  }
  function fairy(ctx, t, y0, sag, cols, seed, n) {
    const r = rng(seed);
    ctx.strokeStyle = 'rgba(20,10,30,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, y0); ctx.quadraticCurveTo(540, y0 + sag * 2, 1090, y0); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const u = (i + .5) / n, x = -10 + 1100 * u, y = y0 + 2 * sag * u * (1 - u) * 2 + 8;
      const a = .55 + .45 * wave01(t, 2 + (i % 3), r()), c = cols[i % cols.length];
      halo(ctx, x, y + 14, 60, c, .55 * a); ctx.fillStyle = c; ctx.globalAlpha = .6 + .4 * a; L.ellipse(ctx, x, y + 14, 8, 11); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(20,10,30,.7)'; ctx.fillRect(x - 4, y - 2, 8, 8);
    }
  }
  function bokeh(ctx, x0, y0, w, h, t, seed, cols, n) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) { const x = x0 + r() * w, y = y0 + h * (.35 + .65 * r()), rad0 = 18 + r() * 44, c = cols[Math.floor(r() * cols.length)], a = .35 + .3 * wave01(t, 1 + Math.floor(r() * 2), r()); ctx.globalAlpha = a; ctx.fillStyle = rad(ctx, x, y, 0, rad0, [[0, c], [.82, c], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(x - rad0, y - rad0, rad0 * 2, rad0 * 2); }
    ctx.globalAlpha = 1;
  }
  function rainOn(ctx, x0, y0, w, h, t, seed, n, col) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const k = 2 + Math.floor(r() * 3), ph = r(), x = x0 + r() * (w + 100), len = 40 + r() * 70, p = (((t * k + ph) % 1) + 1) % 1, y = y0 - len + p * (h + len * 2);
      ctx.strokeStyle = col; ctx.globalAlpha = .12 + .22 * r(); ctx.lineWidth = 2 + r() * 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * .18, y + len); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function glassDrops(ctx, x0, y0, w, h, t, seed, n) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = x0 + 20 + r() * (w - 40), by = y0 + 30 + r() * (h - 160), sl = r() < .5, p = sl ? (((t + r()) % 1) + 1) % 1 : 0, y = by + p * 100, rr0 = 5 + r() * 7;
      const a = sl ? Math.sin(Math.PI * p) : 1;
      if (sl) { ctx.strokeStyle = `rgba(200,225,255,${.22 * a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, y); ctx.stroke(); }
      ctx.globalAlpha = .9 * a; ctx.fillStyle = 'rgba(190,215,255,.32)'; L.ellipse(ctx, x, y, rr0, rr0 * 1.25); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; circle(ctx, x - rr0 * .3, y - rr0 * .4, rr0 * .3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function city(ctx, x0, y0, w, h, t, seed, layers) {
    layers.forEach((Ly, li) => {
      const r = rng(seed + li * 11); let x = x0 - 20;
      while (x < x0 + w + 20) {
        const bw = Ly.wmin + r() * (Ly.wmax - Ly.wmin), bh = Ly.hmin + r() * (Ly.hmax - Ly.hmin);
        ctx.fillStyle = Ly.col; ctx.fillRect(x, y0 + h - bh, bw + 1, bh + 2);
        if (Ly.win) { for (let cy = 0; cy < (bh - 20) / 26; cy++) for (let cx = 0; cx < (bw - 14) / 20; cx++) { if (r() > Ly.lit) continue; ctx.globalAlpha = .5 + .5 * r(); ctx.fillStyle = r() < .7 ? Ly.win[0] : Ly.win[1]; ctx.fillRect(x + 8 + cx * 20, y0 + h - bh + 14 + cy * 26, 9, 12); } ctx.globalAlpha = 1; }
        x += bw + (Ly.gap || 0);
      }
    });
  }

  function roomNight(ctx, t, v) {
    const W = 1080, H = 1920, wx = 150, wy = 340, ww = 780, wh = 680, deskY = 1370;
    // pared
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#1d1546'], [.5, '#2d2060'], [1, '#1a1038']]); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 0; x < W; x += 90) ctx.fillRect(x, 0, 36, H);
    // ventana: exterior
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    ctx.fillStyle = lin(ctx, 0, wy, 0, wy + wh, [[0, '#120d34'], [.55, '#3d2275'], [.85, '#c24a8f'], [1, '#ff8a9c']]); ctx.fillRect(wx, wy, ww, wh);
    halo(ctx, wx + 590, wy + 140, 200, '#ffe9c4', .5); ctx.fillStyle = '#fff1d2'; circle(ctx, wx + 590, wy + 140, 46); ctx.fill(); ctx.fillStyle = '#3d2275'; circle(ctx, wx + 612, wy + 128, 42); ctx.fill();
    L.stars(ctx, 40, 55, t, { y0: wy, y1: wy + 300, alpha: .7, W: 1080 });
    city(ctx, wx, wy, ww, wh, t, 21, [{ col: '#4a2a86', wmin: 70, wmax: 130, hmin: 160, hmax: 320, gap: 4 }, { col: '#2a1659', wmin: 80, wmax: 150, hmin: 110, hmax: 250, gap: 6, win: ['#ffd9a0', '#ff9ac0'], lit: .3 }, { col: '#150a32', wmin: 100, wmax: 190, hmin: 60, hmax: 170, gap: 10, win: ['#ffb866', '#7de8ff'], lit: .3 }]);
    bokeh(ctx, wx, wy + 260, ww, 420, t, 7, ['#ff7fb4', '#6de4ff', '#ffc16b', '#b88aff'], 24);
    rainOn(ctx, wx, wy, ww, wh, t, 9, 70, '#cfe3ff');
    glassDrops(ctx, wx, wy, ww, wh, t, 12, 18);
    // reflejo cristal
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.moveTo(wx + 80, wy); ctx.lineTo(wx + 200, wy); ctx.lineTo(wx + 40, wy + wh); ctx.lineTo(wx - 80, wy + wh); ctx.fill(); ctx.beginPath(); ctx.moveTo(wx + 260, wy); ctx.lineTo(wx + 300, wy); ctx.lineTo(wx + 160, wy + wh); ctx.lineTo(wx + 120, wy + wh); ctx.fill();
    ctx.restore();
    // marco
    ctx.fillStyle = '#3a2a5c'; ctx.fillRect(wx - 28, wy - 28, ww + 56, 28); ctx.fillRect(wx - 28, wy + wh, ww + 56, 0); ctx.fillRect(wx - 28, wy, 28, wh); ctx.fillRect(wx + ww, wy, 28, wh);
    ctx.fillRect(wx + ww / 2 - 11, wy, 22, wh); ctx.fillRect(wx, wy + wh * .52 - 11, ww, 22);
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(wx - 28, wy - 28, ww + 56, 5); ctx.fillRect(wx + ww / 2 - 11, wy, 4, wh);
    // alféizar
    ctx.fillStyle = lin(ctx, 0, wy + wh, 0, wy + wh + 50, [[0, '#4e3a78'], [1, '#2c1d4c']]); rr(ctx, wx - 60, wy + wh, ww + 120, 44, 8); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(wx - 56, wy + wh + 2, ww + 112, 4);
    // cortinas
    [[wx - 28, -1], [wx + ww + 28, 1]].forEach(([x, s], k) => {
      ctx.beginPath(); ctx.moveTo(x, wy - 60); const wd = 110;
      ctx.lineTo(x + s * wd, wy - 60); for (let y = 0; y <= wh + 60; y += 20) ctx.lineTo(x + s * (wd - 12 + 8 * wave(y / 700, 1, t + k * .3) * 0 + 10 * Math.sin(y / 80 + k) + 6 * wave(t, 1, y / 900 + k * .5)), wy - 60 + y);
      ctx.lineTo(x, wy + wh); ctx.closePath(); ctx.fillStyle = lin(ctx, x, 0, x + s * wd, 0, [[0, '#7a3a8c'], [1, '#a4508f']]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 1; i < 4; i++) ctx.fillRect(x + s * i * 26 - 3, wy - 60, 6, wh + 60);
    });
    // gato en el alféizar
    cat(ctx, 700, wy + wh + 2, 1.05, t, '#f2a65a', '#d77f3d');
    // planta del alféizar
    pot(ctx, 262, wy + wh, 110, 90, '#e07a5f', '#b4543f'); bush(ctx, 262, wy + wh - 90, .8, t, 3, '#4fcf88', '#238a68', 9, 2.1);
    // planta colgante
    ctx.strokeStyle = 'rgba(20,10,30,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(1000, 150); ctx.lineTo(1000, 270); ctx.stroke(); ctx.beginPath(); ctx.moveTo(1000, 150); ctx.lineTo(1045, 280); ctx.moveTo(1000, 150); ctx.lineTo(955, 280); ctx.stroke();
    ctx.fillStyle = '#f4e3c5'; ctx.beginPath(); ctx.moveTo(950, 275); ctx.lineTo(1050, 275); ctx.lineTo(1030, 350); ctx.lineTo(970, 350); ctx.fill();
    vine(ctx, 975, 345, 420, t, 4, '#59d68f', '#2b9a6c'); vine(ctx, 1030, 345, 300, t, 8, '#7ae0a2', '#2b9a6c'); vine(ctx, 1000, 345, 360, t, 15, '#45c27e', '#1f7c5a');
    // luces
    fairy(ctx, t, 250, 52, ['#ffb35c', '#ff7fb4', '#8be9ff', '#ffe27a'], 5, 11);
    // glow de lámpara en la pared
    halo(ctx, 330, 1150, 760, '#ff9d4a', .26 + .03 * wave(t, 2));
    // escritorio
    ctx.fillStyle = lin(ctx, 0, deskY, 0, deskY + 80, [[0, '#a56a4c'], [1, '#7c4a3a']]); ctx.fillRect(0, deskY, W, 80);
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(0, deskY, W, 4);
    ctx.fillStyle = lin(ctx, 0, deskY + 80, 0, deskY + 230, [[0, '#4a2c35'], [1, '#22132a']]); ctx.fillRect(0, deskY + 80, W, H - deskY - 80);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, deskY + 80, W, 10);
    // luz de la lámpara sobre el escritorio
    ctx.fillStyle = lin(ctx, 0, 1100, 0, deskY + 70, [[0, 'rgba(255,190,110,.20)'], [1, 'rgba(255,190,110,.04)']]); ctx.beginPath(); ctx.moveTo(250, 1080); ctx.lineTo(430, 1100); ctx.lineTo(760, deskY + 70); ctx.lineTo(120, deskY + 70); ctx.fill();
    halo(ctx, 480, deskY + 40, 420, '#ffb45c', .32);
    // tocadiscos
    const tx = 560, ty = 1330;
    L.shadowEllipse(ctx, tx, deskY + 62, 330, 40, .4);
    ctx.fillStyle = lin(ctx, 0, ty - 20, 0, ty + 90, [[0, '#4c3a6e'], [1, '#2c2048']]); rr(ctx, tx - 300, ty - 16, 600, 110, 22); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(ctx, tx - 296, ty - 14, 592, 6, 3); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, ty - 70, 0, ty + 30, [[0, '#5e4a88'], [1, '#3b2a60']]); ctx.beginPath(); ctx.moveTo(tx - 260, ty - 20); ctx.lineTo(tx - 220, ty - 70); ctx.lineTo(tx + 220, ty - 70); ctx.lineTo(tx + 260, ty - 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(tx - 215, ty - 70, 430, 4);
    L.shadowEllipse(ctx, tx - 20, ty - 38, 190, 26, .5);
    vinyl(ctx, tx - 20, ty - 46, 200, 56, t, 3, ['#ff6fa8', '#ffd166']);
    // brazo
    ctx.fillStyle = '#2a2040'; circle(ctx, tx + 200, ty - 42, 22); ctx.fill(); ctx.fillStyle = '#7a64a8'; circle(ctx, tx + 200, ty - 46, 14); ctx.fill();
    const aw = .6 * wave(t, 12) * 0 + .8 * wave(t, 6);
    ctx.strokeStyle = '#d7d0ee'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx + 200, ty - 46); ctx.lineTo(tx + 80, ty - 36 + aw * .3); ctx.stroke();
    ctx.fillStyle = '#ffd166'; ctx.save(); ctx.translate(tx + 78, ty - 34 + aw * .3); ctx.rotate(.2); rr(ctx, -16, -8, 34, 16, 4); ctx.fill(); ctx.restore();
    // botones
    [[-240, '#ff6fa8'], [-200, '#8be9ff']].forEach(([dx, c]) => { ctx.fillStyle = c; circle(ctx, tx + dx, ty + 50, 12); ctx.fill(); halo(ctx, tx + dx, ty + 50, 30, c, .45 * (.6 + .4 * wave01(t, 4, dx / 100))); });
    ctx.fillStyle = '#1c1430'; rr(ctx, tx + 130, ty + 36, 140, 28, 14); ctx.fill(); ctx.fillStyle = '#ffd166'; rr(ctx, tx + 140, ty + 42, 60 + 20 * wave(t, 1) * 0, 16, 8); ctx.fill();
    // notas
    L.loopParticles(5, 44, t, (i, p, r) => { const x = tx - 160 + r() * 340 + 22 * Math.sin(p * L.TAU + i), y = 1230 - p * 360; ctx.globalAlpha = .8 * Math.sin(Math.PI * p); note(ctx, x, y, .4 + r() * .25, ['#ff8fd8', '#8be9ff', '#ffd166'][i % 3], .3 * Math.sin(p * L.TAU + i), r() < .5); ctx.globalAlpha = 1; });
    // lámpara
    const lx = 110, ly = deskY + 56;
    L.shadowEllipse(ctx, lx, ly, 100, 14, .4);
    ctx.fillStyle = '#3a2a5c'; L.ellipse(ctx, lx, ly - 4, 66, 16); ctx.fill(); ctx.fillStyle = '#5b4690'; L.ellipse(ctx, lx, ly - 12, 66, 14); ctx.fill();
    ctx.strokeStyle = '#6a56a6'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(lx, ly - 14); ctx.lineTo(lx - 12, ly - 240); ctx.lineTo(lx + 120, ly - 300); ctx.stroke();
    ctx.fillStyle = '#6a56a6'; circle(ctx, lx - 12, ly - 240, 12); ctx.fill();
    ctx.save(); ctx.translate(lx + 120, ly - 300); ctx.rotate(.6);
    halo(ctx, 10, 60, 190, '#ffb95c', .7 + .05 * wave(t, 2));
    ctx.fillStyle = lin(ctx, -80, 0, 80, 0, [[0, '#ffcf8a'], [.5, '#ff9f4a'], [1, '#e0742f']]); ctx.beginPath(); ctx.moveTo(-34, -6); ctx.lineTo(34, -6); ctx.lineTo(82, 86); ctx.lineTo(-82, 86); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4c8'; L.ellipse(ctx, 0, 88, 78, 12); ctx.fill(); ctx.fillStyle = '#ffe8a8'; L.ellipse(ctx, 0, 90, 44, 6); ctx.fill();
    ctx.restore();
    // taza
    const mx = 870, my = deskY + 60;
    L.shadowEllipse(ctx, mx, my, 80, 12, .4);
    steam(ctx, mx, my - 130, t, 'rgba(255,240,255,A)', 3, 160);
    ctx.fillStyle = lin(ctx, mx - 60, 0, mx + 60, 0, [[0, '#8be9ff'], [1, '#4fb4d9']]); ctx.beginPath(); ctx.moveTo(mx - 60, my - 128); ctx.lineTo(mx + 60, my - 128); ctx.lineTo(mx + 50, my - 10); ctx.quadraticCurveTo(mx, my + 8, mx - 50, my - 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6cc9e8'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(mx + 64, my - 74, 34, -1.3, 1.3); ctx.stroke();
    ctx.fillStyle = '#7a4a3a'; L.ellipse(ctx, mx, my - 126, 60, 12); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; L.ellipse(ctx, mx - 16, my - 128, 20, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(ctx, mx - 46, my - 108, 8, 76, 4); ctx.fill();
    // planta pequeña
    pot(ctx, 985, my + 6, 74, 70, '#f4e3c5', '#cdb48c'); bush(ctx, 985, my - 66, .55, t, 11, '#6de0a0', '#2b9a6c', 7, 2.2);
    L.vignette(ctx, W, H, .5);
  }

  function roomGolden(ctx, t, v) {
    const W = 1080, H = 1920, wx = 90, wy = 330, ww = 470, wh = 740, deskY = 1380;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#14505a'], [.55, '#1f7a7c'], [1, '#12414a']]); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.04)'; for (let x = 20; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 40, H); ctx.lineTo(x, H); ctx.fill(); }
    // luz del sol cruzando la pared
    ctx.save(); ctx.fillStyle = lin(ctx, wx, wy, wx + 700, wy + 900, [[0, 'rgba(255,200,110,.34)'], [1, 'rgba(255,200,110,0)']]);
    ctx.beginPath(); ctx.moveTo(wx + 30, wy + 40); ctx.lineTo(wx + ww - 30, wy + 40); ctx.lineTo(wx + ww + 560, 1500); ctx.lineTo(wx + 360, 1500); ctx.fill(); ctx.restore();
    // ventana arco
    const arc = () => { ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2); ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.closePath(); };
    ctx.save(); arc(); ctx.clip();
    ctx.fillStyle = lin(ctx, 0, wy, 0, wy + wh, [[0, '#6b3fa0'], [.3, '#e0577f'], [.62, '#ff9a4d'], [.8, '#ffd27a']]); ctx.fillRect(wx, wy, ww, wh);
    const sunx = wx + 250, suny = wy + 480 + 8 * wave(t, 1);
    halo(ctx, sunx, suny, 420, '#ffd27a', .75); halo(ctx, sunx, suny, 200, '#fff3cf', .8); ctx.fillStyle = '#fff6d8'; circle(ctx, sunx, suny, 74); ctx.fill();
    // nubes
    for (let i = 0; i < 4; i++) { const x = ((i * 300 + t * 1200) % 1200) - 360 + wx, y = wy + 150 + i * 90; ctx.fillStyle = i % 2 ? 'rgba(255,200,190,.5)' : 'rgba(255,240,220,.4)'; rr(ctx, x, y, 240 + (i % 3) * 60, 30, 15); ctx.fill(); rr(ctx, x + 50, y - 22, 120, 40, 20); ctx.fill(); }
    // colinas
    [['#c25a7e', 640, 90, 3], ['#8e3f78', 690, 80, 7], ['#5a2a62', 735, 60, 9]].forEach(([c, by, amp, sd], i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(wx, wy + wh); for (let x = 0; x <= ww + 10; x += 10) ctx.lineTo(wx + x, wy + by - amp * (.5 + .5 * L.ridge(x + i * 200, sd, 470, 3))); ctx.lineTo(wx + ww, wy + wh); ctx.fill(); });
    // pájaros
    for (let i = 0; i < 3; i++) { const x = wx - 60 + ((t + i * .11) % 1) * (ww + 160), y = wy + 300 + i * 34 + 10 * wave(t, 2, i * .2), f = wave(t, 8, i * .13); ctx.strokeStyle = '#3b1b4c'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 18, y - 6 * f); ctx.quadraticCurveTo(x - 8, y - 14 * f - 4, x, y); ctx.quadraticCurveTo(x + 8, y - 14 * f - 4, x + 18, y - 6 * f); ctx.stroke(); }
    ctx.restore();
    // marco
    ctx.strokeStyle = '#f1e2c4'; ctx.lineWidth = 26; arc(); ctx.stroke();
    ctx.fillStyle = '#f1e2c4'; ctx.fillRect(wx + ww / 2 - 8, wy, 16, wh); ctx.fillRect(wx, wy + wh * .5 - 8, ww, 16); ctx.fillRect(wx + ww / 2 - 8, wy, 16, 0);
    ctx.fillStyle = '#d9c6a2'; rr(ctx, wx - 40, wy + wh, ww + 80, 36, 8); ctx.fill();
    // cortina ligera que respira
    ctx.beginPath(); ctx.moveTo(wx + ww + 10, wy - 40); for (let y = 0; y <= wh + 50; y += 18) ctx.lineTo(wx + ww + 10 - 110 - 28 * Math.sin(y / 110 - L.TAU * t) * (y / (wh + 50)) - 8 * Math.sin(y / 40), wy - 40 + y); ctx.lineTo(wx + ww + 10, wy + wh); ctx.closePath();
    ctx.fillStyle = 'rgba(255,225,210,.38)'; ctx.fill();
    // planta en el alféizar
    pot(ctx, wx + 110, wy + wh, 96, 76, '#f08a5d', '#c15a3c'); bush(ctx, wx + 110, wy + wh - 76, .9, t, 5, '#7ae582', '#2e9b6a', 8, 2);
    // estantería
    const sx = 650, sw = 350, sy = 360, sh = 1000;
    ctx.fillStyle = '#e9c98c'; rr(ctx, sx, sy, sw, sh, 10); ctx.fill(); ctx.fillStyle = '#2c3e49'; ctx.fillRect(sx + 18, sy + 18, sw - 36, sh - 36);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(sx + 18, sy + 18, sw - 36, sh - 36);
    const shelves = [sy + 18 + 270, sy + 18 + 540, sy + 18 + 810]; ctx.fillStyle = '#e9c98c'; shelves.forEach(y => ctx.fillRect(sx + 10, y, sw - 20, 16));
    const rs = rng(31), recs = ['#ff6b6b', '#ffd166', '#4ecdc4', '#f7f7f7', '#9b5de5', '#ff9f68', '#06d6a0', '#f15bb5'];
    [[sy + 18 + 270, 0], [sy + 18 + 540, 1], [sy + 18 + 810, 2], [sy + sh - 18, 3]].forEach(([yb, k]) => {
      let x = sx + 30; const lim = sx + sw - 30; if (k === 1) { pot(ctx, sx + 80, yb - 0 - 0, 70, 58, '#f4e3c5', '#cdb48c'); bush(ctx, sx + 80, yb - 58, .55, t, 17 + k, '#7ae582', '#2e9b6a', 6, 2.2); x = sx + 130; }
      if (k === 3) { /* caja de discos */ }
      while (x < lim - 14) { const w = 16 + rs() * 14, h = 120 + rs() * 90; ctx.fillStyle = recs[Math.floor(rs() * recs.length)]; ctx.fillRect(x, yb - h, w, h); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + w - 4, yb - h, 4, h); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 3, yb - h + 18, w - 8, 5); x += w + 3; if (rs() < .08) x += 40; }
    });
    // disco de vinilo colgado/apoyado
    ctx.save(); ctx.translate(sx + sw - 90, sy + 18 + 470); vinyl(ctx, 0, 0, 62, 62, t, 2, ['#ffd166', '#ff6b6b']); ctx.restore();
    // escritorio
    ctx.fillStyle = lin(ctx, 0, deskY, 0, deskY + 80, [[0, '#e8b57a'], [1, '#c58a55']]); ctx.fillRect(0, deskY, W, 80);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(0, deskY, W, 4);
    ctx.fillStyle = lin(ctx, 0, deskY + 80, 0, deskY + 260, [[0, '#8a4f3c'], [1, '#3e2230']]); ctx.fillRect(0, deskY + 80, W, H - deskY - 80);
    halo(ctx, 400, deskY, 500, '#ffd27a', .22);
    // radiocasete
    const bx = 330, by = 1130, bw = 560, bh = 270, b = beat(t, 8);
    L.shadowEllipse(ctx, bx + bw / 2, deskY + 62, 340, 36, .45);
    ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx + 120, by + 4); ctx.lineTo(bx + 120, by - 50); ctx.lineTo(bx + bw - 120, by - 50); ctx.lineTo(bx + bw - 120, by + 4); ctx.stroke();
    ctx.strokeStyle = '#cfd6e0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx + bw - 60, by + 4); ctx.lineTo(bx + bw + 40, by - 200); ctx.stroke(); ctx.fillStyle = '#ff6b6b'; circle(ctx, bx + bw + 40, by - 204, 9); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, by, 0, by + bh, [[0, '#ffd86b'], [1, '#f0a93c']]); rr(ctx, bx, by, bw, bh, 36); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(ctx, bx + 14, by + 8, bw - 28, 8, 4); ctx.fill();
    [[bx + 120, '#ff6b6b'], [bx + bw - 120, '#4ecdc4']].forEach(([x, c], i) => {
      const y = by + 150, sc = 1 + .05 * b * (i ? .8 : 1);
      ctx.fillStyle = '#2a2f3a'; circle(ctx, x, y, 92); ctx.fill(); ctx.fillStyle = '#3b4252'; circle(ctx, x, y, 80); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.fillStyle = '#121620'; circle(ctx, 0, 0, 60); ctx.fill(); ctx.strokeStyle = '#4a5266'; ctx.lineWidth = 4; circle(ctx, 0, 0, 40); ctx.stroke(); ctx.fillStyle = c; circle(ctx, 0, 0, 20); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; circle(ctx, -7, -8, 6); ctx.fill(); ctx.restore();
      halo(ctx, x, y, 140, c, .18 * b);
    });
    // casete
    ctx.fillStyle = '#2a2f3a'; rr(ctx, bx + 215, by + 70, 130, 110, 12); ctx.fill(); ctx.fillStyle = '#f7ecd0'; rr(ctx, bx + 223, by + 78, 114, 70, 6); ctx.fill();
    ctx.fillStyle = '#242a36'; rr(ctx, bx + 232, by + 92, 96, 40, 20); ctx.fill();
    [[bx + 256, by + 112], [bx + 304, by + 112]].forEach(([x, y]) => { ctx.save(); ctx.translate(x, y); ctx.rotate(L.TAU * 3 * t); ctx.fillStyle = '#f7ecd0'; circle(ctx, 0, 0, 13); ctx.fill(); ctx.fillStyle = '#242a36'; for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.fillRect(-1.5, -12, 3, 7); } ctx.restore(); });
    ctx.fillStyle = '#ff6b6b'; ctx.fillRect(bx + 223, by + 148, 114, 6);
    // leds
    for (let c = 0; c < 6; c++) { const lv = level(c * 3, 18, t, 12); for (let j = 0; j < 5; j++) { const on = lv > (j + .5) / 5; ctx.fillStyle = on ? (j > 3 ? '#ff6b6b' : j > 2 ? '#ffd166' : '#5cf29a') : 'rgba(40,40,50,.5)'; rr(ctx, bx + 222 + c * 20, by + 196 - j * 11, 16, 7, 3); ctx.fill(); } }
    ctx.fillStyle = '#2a2f3a'; [[bx + 372, by + 214], [bx + 396, by + 214], [bx + 168, by + 28]].forEach(([x, y]) => { circle(ctx, x, y, 8); ctx.fill(); });
    // notas
    L.loopParticles(5, 51, t, (i, p, r) => { const x = bx + 80 + r() * 400 + 22 * Math.sin(p * L.TAU + i), y = 1020 - p * 360; ctx.globalAlpha = .85 * Math.sin(Math.PI * p); note(ctx, x, y, .4 + r() * .25, ['#fff3cf', '#ff9db0', '#8be9ff'][i % 3], .3 * Math.sin(p * L.TAU + i), r() < .5); ctx.globalAlpha = 1; });
    // monstera en maceta a la izquierda
    pot(ctx, 120, deskY + 62, 110, 92, '#2c3e49', '#1b2832'); bush(ctx, 120, deskY - 30, .85, t, 23, '#6de0a0', '#2b9a6c', 10, 2.0);
    // taza
    const mx = 960, my = deskY + 60; steam(ctx, mx, my - 100, t, 'rgba(255,255,255,A)', 2, 120);
    ctx.fillStyle = '#ff9db0'; ctx.beginPath(); ctx.moveTo(mx - 44, my - 96); ctx.lineTo(mx + 44, my - 96); ctx.lineTo(mx + 36, my - 8); ctx.quadraticCurveTo(mx, my + 6, mx - 36, my - 8); ctx.fill();
    ctx.strokeStyle = '#ff7f98'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(mx + 46, my - 56, 26, -1.3, 1.3); ctx.stroke(); ctx.fillStyle = '#7a4a3a'; L.ellipse(ctx, mx, my - 94, 44, 9); ctx.fill();
    // motas de polvo en la luz
    L.loopParticles(26, 61, t, (i, p, r) => { const x = 180 + r() * 600 + 50 * Math.sin(p * L.TAU + i * 2), y = 480 + r() * 800 - p * 120; ctx.fillStyle = `rgba(255,236,190,${.55 * Math.sin(Math.PI * p)})`; circle(ctx, x, y, 2 + r() * 3); ctx.fill(); });
    L.vignette(ctx, W, H, .42);
  }

  SCENES['music-b'] = {
    topic: 'music', stillT: [.1, .4],
    cap: [
      { ca: 'Pluja, vinil i gat roncant. Plan perfecte 🌧️ #lofi #música', es: 'Lluvia, vinilo y gato roncando. Plan perfecto 🌧️ #lofi #música', en: 'Rain, vinyl and a snoring cat. Perfect plan 🌧️ #lofi #music' },
      { ca: 'Vespre dorat i el radiocasset de sempre 🎶 #lofi', es: 'Tarde dorada y el radiocasete de siempre 🎶 #lofi', en: 'Golden evening and the same old boombox 🎶 #lofi' }],
    draw(ctx, t, v) { (v % 2 === 0 ? roomNight : roomGolden)(ctx, t, v); }
  };

  /* ================= MUSIC – c: póster (auriculares neón / escenario con guitarra) ================= */
  function beam(ctx, x0, y0, x1, y1, w0, w1, col, a) {
    ctx.save(); const g = lin(ctx, x0, y0, x1, y1, [[0, col.replace('A', a)], [.7, col.replace('A', a * .35)], [1, col.replace('A', 0)]]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - w0 / 2, y0); ctx.lineTo(x0 + w0 / 2, y0); ctx.lineTo(x1 + w1 / 2, y1); ctx.lineTo(x1 - w1 / 2, y1); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function neonStroke(ctx, drawPath, col, w, core) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[w * 4.2, .08], [w * 2.6, .14], [w * 1.5, .28]].forEach(([lw, a]) => { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; drawPath(); ctx.stroke(); });
    ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = w; drawPath(); ctx.stroke();
    ctx.strokeStyle = core || '#fff'; ctx.lineWidth = w * .38; drawPath(); ctx.stroke(); ctx.restore();
  }

  function headphonesPoster(ctx, t) {
    const W = 1080, H = 1920, cx = 540, cy = 880, b = beat(t, 8);
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#0b0422'], [.5, '#230a55'], [1, '#0a0420']]); ctx.fillRect(0, 0, W, H);
    // rayos suaves
    ctx.save(); ctx.translate(cx, cy); for (let i = 0; i < 18; i++) { ctx.rotate(L.TAU / 18); ctx.fillStyle = i % 2 ? 'rgba(255,90,200,.045)' : 'rgba(80,220,255,.04)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-90, -1500); ctx.lineTo(90, -1500); ctx.fill(); } ctx.restore();
    halo(ctx, 250, 1000, 700, '#ff2f9a', .38); halo(ctx, 830, 1000, 700, '#27e3ff', .36); halo(ctx, cx, cy - 80, 520, '#9a5bff', .35);
    // disco de fondo con anillos
    ctx.fillStyle = 'rgba(10,4,34,.55)'; circle(ctx, cx, cy, 470); ctx.fill();
    for (let i = 0; i < 6; i++) { const p = (t * 1 + i / 6) % 1, r = 360 + p * 360; ctx.strokeStyle = `rgba(190,150,255,${.3 * (1 - p)})`; ctx.lineWidth = 2 + 5 * (1 - p); circle(ctx, cx, cy, r); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(200,170,255,.5)'; ctx.lineWidth = 3; circle(ctx, cx, cy, 470); ctx.stroke();
    // ondas de sonido a los lados
    [[1, '#ff4fb0', 215], [-1, '#2ee6ff', 865]].forEach(([s, c, x], k) => { for (let i = 0; i < 4; i++) { const p = (t * 1 + i / 4) % 1, r = 150 + p * 230; ctx.strokeStyle = c; ctx.globalAlpha = .75 * (1 - p); ctx.lineWidth = 9 - 5 * p; ctx.lineCap = 'round'; ctx.beginPath(); const a0 = k ? -.8 : Math.PI + .8 - 1.6, a1 = a0 + 1.6; ctx.arc(x, 1070, r, k ? -.8 : Math.PI - .8, k ? .8 : Math.PI + .8); ctx.stroke(); } ctx.globalAlpha = 1; });
    // anillo ecualizador interior
    { const rx = 540, ry = 930, NB = 64; ctx.lineCap = 'round';
      halo(ctx, rx, ry, 260, '#9a5bff', .5 + .2 * b);
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NB; i++) { const a = i / NB * L.TAU - Math.PI / 2, k = Math.min(i, NB - i) / (NB / 2), lv = level(Math.min(i, NB - i), NB / 2 + 1, t + .02, 6), len = 14 + 92 * lv, c = mix('#ff3fa4', '#27e3ff', k), r0 = 120 + 8 * b;
        ctx.strokeStyle = pass ? c : c; ctx.globalAlpha = pass ? 1 : .2; ctx.lineWidth = pass ? 8 : 18; ctx.beginPath(); ctx.moveTo(rx + Math.cos(a) * r0, ry + Math.sin(a) * r0); ctx.lineTo(rx + Math.cos(a) * (r0 + len), ry + Math.sin(a) * (r0 + len)); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillStyle = rad(ctx, rx - 20, ry - 30, 0, 110, [[0, '#fff0fb'], [.35, '#ff7fd0'], [1, '#6a2bd8']]); circle(ctx, rx, ry, 98 + 6 * b); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; circle(ctx, rx, ry, 112 + 8 * b); ctx.stroke(); }
    ctx.save(); ctx.translate(cx, 960); ctx.scale(1.14, 1.14); ctx.translate(-cx, -960);
    // diadema
    const band = () => { ctx.beginPath(); ctx.moveTo(220, 1010); ctx.lineTo(220, 900); ctx.arc(cx, 900, 320, Math.PI, 0); ctx.lineTo(860, 1010); };
    ctx.lineCap = 'round';
    ctx.strokeStyle = lin(ctx, 220, 0, 860, 0, [[0, '#3a0d68'], [1, '#0e3a6e']]); ctx.lineWidth = 76; band(); ctx.stroke();
    ctx.strokeStyle = 'rgba(8,3,28,.9)'; ctx.lineWidth = 50; band(); ctx.stroke();
    const grad = lin(ctx, 220, 0, 860, 0, [[0, '#ff3fa4'], [.5, '#a06bff'], [1, '#2ee6ff']]);
    ctx.save(); neonStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(185, 1010); ctx.lineTo(185, 900); ctx.arc(cx, 900, 355, Math.PI, 0); ctx.lineTo(895, 1010); }, '#b27bff', 7, '#f3e8ff'); ctx.restore();
    ctx.strokeStyle = grad; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(255, 1000); ctx.lineTo(255, 900); ctx.arc(cx, 900, 285, Math.PI, 0); ctx.lineTo(825, 1000); ctx.stroke();
    // almohadilla de la diadema
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, 900, 322, Math.PI + .3, -.3); ctx.stroke();
    // copas
    const cup = (x, c, c2, side) => {
      ctx.save(); ctx.translate(x, 1090); ctx.rotate(side * .05);
      ctx.fillStyle = '#10062c'; rr(ctx, -100, -190, 200, 380, 90); ctx.fill();
      ctx.fillStyle = lin(ctx, -100, -190, 100, 190, [[0, '#2a0f5e'], [1, '#0c0428']]); rr(ctx, -92, -182, 184, 364, 84); ctx.fill();
      neonStroke(ctx, () => { rr(ctx, -100, -190, 200, 380, 90); }, c, 8, '#fff');
      // placa central
      const g = rad(ctx, 0, 0, 0, 78, [[0, c2], [.6, c], [1, 'rgba(0,0,0,0)']]); ctx.globalAlpha = .55 + .35 * b; ctx.fillStyle = g; circle(ctx, 0, 0, 100); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#0a0320'; circle(ctx, 0, 0, 66); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 5; circle(ctx, 0, 0, 54 + 6 * b); ctx.stroke(); ctx.lineWidth = 3; circle(ctx, 0, 0, 34 + 4 * b); ctx.stroke(); ctx.fillStyle = c2; circle(ctx, 0, 0, 14); ctx.fill();
      // led
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i < 3 + (b > .4) ? c2 : 'rgba(255,255,255,.18)'; rr(ctx, -34 + i * 15, 118, 10, 22, 4); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.18)'; rr(ctx, -80, -168, 20, 120, 10); ctx.fill();
      ctx.restore();
    };
    cup(215, '#ff3fa4', '#ffd0ec', -1); cup(865, '#27e3ff', '#d4fbff', 1);
    halo(ctx, 215, 1090, 330, '#ff3fa4', .28 + .12 * b); halo(ctx, 865, 1090, 330, '#27e3ff', .26 + .12 * b);
    ctx.restore();
    // ecualizador inferior
    const base = 1530, N = 21, bw = 28, gp = 20, x0 = (W - (N * (bw + gp) - gp)) / 2;
    for (let i = 0; i < N; i++) { const lv = level(i, N, t + .03, 2) * .85, h = 30 + lv * 190, x = x0 + i * (bw + gp), col = mix('#ff3fa4', '#27e3ff', i / (N - 1));
      ctx.globalAlpha = .18; ctx.fillStyle = col; rr(ctx, x - 4, base - h - 4, bw + 8, h + 8, 14); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = col; rr(ctx, x, base - h, bw, h, 12); ctx.fill();
      ctx.globalAlpha = .22; rr(ctx, x, base + 8, bw, h * .5, 12); ctx.fill(); ctx.globalAlpha = 1; }
    floatingNotes(ctx, t, 91, ['#ff8fd8', '#8be9ff', '#ffe27a'], 1450, 330, 8);
    L.stars(ctx, 60, 17, t, { y1: 600, alpha: .6 });
    L.vignette(ctx, W, H, .5);
  }

  function guitar(ctx, c1, c2, acc, t) {
    // mástil
    ctx.fillStyle = '#2a1a20'; rr(ctx, -30, -660, 60, 570, 8); ctx.fill(); ctx.fillStyle = '#5a3a3c'; rr(ctx, -25, -640, 50, 540, 6); ctx.fill();
    for (let i = 0, y = -100; i < 20; i++) { ctx.fillStyle = 'rgba(235,225,210,.55)'; ctx.fillRect(-25, y, 50, 2.5); if ([3, 5, 7, 9, 12].includes(i)) { ctx.fillStyle = 'rgba(255,255,255,.55)'; circle(ctx, 0, y - 12, 4.5); ctx.fill(); } y -= 28 * Math.pow(.972, i); }
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-30, -660); ctx.lineTo(-44, -740); ctx.quadraticCurveTo(-34, -790, 8, -800); ctx.quadraticCurveTo(46, -790, 42, -740); ctx.lineTo(30, -660); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8d2c8'; [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) { circle(ctx, s * 46 - (s > 0 ? 4 : -4), -690 - i * 34 + (s > 0 ? 0 : 0), 8); ctx.fill(); } });
    // cuerpo
    const body = () => { ctx.beginPath(); ctx.moveTo(-42, -130); ctx.bezierCurveTo(-50, -175, -95, -215, -125, -208); ctx.bezierCurveTo(-158, -200, -160, -150, -148, -112); ctx.bezierCurveTo(-142, -90, -150, -70, -170, -45); ctx.bezierCurveTo(-205, 0, -215, 80, -192, 150); ctx.bezierCurveTo(-170, 225, -110, 280, -35, 285); ctx.bezierCurveTo(35, 290, 110, 270, 165, 215); ctx.bezierCurveTo(205, 170, 215, 80, 190, 20); ctx.bezierCurveTo(175, -15, 150, -35, 138, -70); ctx.bezierCurveTo(128, -110, 150, -180, 128, -228); ctx.bezierCurveTo(112, -250, 78, -225, 62, -180); ctx.bezierCurveTo(54, -155, 48, -140, 42, -130); ctx.closePath(); };
    body(); ctx.fillStyle = lin(ctx, -200, -240, 200, 280, [[0, c1], [1, c2]]); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-90, -20, 26, 190, .12, 0, L.TAU); ctx.fill();
    ctx.fillStyle = rad(ctx, 60, 150, 0, 260, [[0, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(-220, -260, 440, 560);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(160, 120, 70, 230, 0, 0, L.TAU); ctx.fill();
    // golpeador
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(-90, -30); ctx.bezierCurveTo(-105, 60, -90, 160, -30, 215); ctx.lineTo(60, 205); ctx.bezierCurveTo(115, 150, 125, 60, 105, -20); ctx.bezierCurveTo(80, -50, 40, -60, 0, -62); ctx.bezierCurveTo(-40, -62, -75, -55, -90, -30); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = acc; ctx.lineWidth = 5; body(); ctx.stroke();
    // pastillas
    ctx.fillStyle = '#18101a'; [-20, 50, 120].forEach(y => { rr(ctx, -70, y, 140, 38, 8); ctx.fill(); ctx.fillStyle = '#d8d2c8'; for (let i = 0; i < 6; i++) { circle(ctx, -50 + i * 20, y + 19, 5); ctx.fill(); } ctx.fillStyle = '#18101a'; });
    ctx.fillStyle = '#cfd2d8'; rr(ctx, -70, 196, 140, 14, 5); ctx.fill();
    ctx.fillStyle = '#18101a'; [[100, 215], [138, 190], [-95, 235]].forEach(([x, y]) => { circle(ctx, x, y, 17); ctx.fill(); ctx.fillStyle = '#9aa0ad'; circle(ctx, x, y, 6); ctx.fill(); ctx.fillStyle = '#18101a'; });
    // cuerdas
    ctx.strokeStyle = 'rgba(240,240,250,.75)'; ctx.lineWidth = 1.8; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-16 + i * 6.4, -700); ctx.lineTo(-52 + i * 20.8, 203); ctx.stroke(); }
  }

  function stagePoster(ctx, t, v) {
    const W = 1080, H = 1920, cx = 540, floor = 1330;
    ctx.fillStyle = lin(ctx, 0, 0, 0, floor, [[0, '#07041a'], [.5, '#2a0b4a'], [1, '#7a1d5a']]); ctx.fillRect(0, 0, W, H);
    halo(ctx, cx, 900, 800, '#ff7a3d', .22);
    // cerchas y focos
    const rigY = 300;
    const lights = [[120, '#ff9a3d', 190], [330, '#ff3f8a', 380], [540, '#fff0c8', 540], [750, '#b06bff', 700], [960, '#ff9a3d', 890]];
    lights.forEach(([x, c, tx], i) => { const sw = 26 * wave(t, 1, i * .17); const rgb = { '#ff9a3d': 'rgba(255,154,61,A)', '#ff3f8a': 'rgba(255,63,138,A)', '#fff0c8': 'rgba(255,240,200,A)', '#b06bff': 'rgba(176,107,255,A)' }[c]; beam(ctx, x, rigY + 20, tx + sw + (540 - tx) * .0 + (i - 2) * -40 + 540 - 540, floor + 40, 50, 250 + (i === 2 ? 60 : 0), rgb, i === 2 ? .5 : .38); });
    for (let i = 0; i < 2; i++) { }
    // truss
    ctx.fillStyle = '#17102a'; ctx.fillRect(0, rigY - 14, W, 28); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(0, rigY - 14, W, 3);
    for (let x = 0; x < W; x += 40) { ctx.strokeStyle = '#2a2145'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, rigY - 12); ctx.lineTo(x + 20, rigY + 12); ctx.lineTo(x + 40, rigY - 12); ctx.stroke(); }
    lights.forEach(([x, c], i) => { halo(ctx, x, rigY + 40, 150, c, .8 * (.8 + .2 * wave(t, 2, i * .2))); ctx.fillStyle = '#0f0a1e'; rr(ctx, x - 26, rigY + 10, 52, 58, 10); ctx.fill(); ctx.fillStyle = c; L.ellipse(ctx, x, rigY + 66, 20, 7); ctx.fill(); });
    // haz focal central en el suelo
    // amplificadores
    const amp = (x, s) => { ctx.save(); ctx.translate(x, floor); ctx.scale(s, 1); ctx.fillStyle = '#120a26'; rr(ctx, -110, -380, 220, 380, 8); ctx.fill(); ctx.fillStyle = '#1d1238'; rr(ctx, -98, -368, 196, 356, 6); ctx.fill();
      for (let k = 0; k < 2; k++) { const y = -260 + k * 180; ctx.fillStyle = '#0a0518'; circle(ctx, 0, y + 70 * 0, 62); ctx.fill(); ctx.strokeStyle = 'rgba(255,160,90,.45)'; ctx.lineWidth = 3; circle(ctx, 0, y, 52 + 4 * beat(t, 8, k * .5)); ctx.stroke(); circle(ctx, 0, y, 28); ctx.stroke(); circle(ctx, 0, y, 8); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,160,90,.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-100, -370); ctx.lineTo(100, -370); ctx.stroke(); ctx.restore(); };
    amp(110, 1); amp(970, 1);
    // suelo
    ctx.fillStyle = lin(ctx, 0, floor, 0, H, [[0, '#2b0f3e'], [.25, '#12071f'], [1, '#05020c']]); ctx.fillRect(0, floor, W, H - floor);
    ctx.fillStyle = 'rgba(255,170,100,.55)'; ctx.fillRect(0, floor, W, 3);
    for (let i = 0; i < 8; i++) { const y = floor + Math.pow(i / 8, 1.8) * 520 + 20; ctx.fillStyle = 'rgba(255,150,200,.07)'; ctx.fillRect(0, y, W, 2 + i * .5); }
    ctx.fillStyle = rad(ctx, cx, floor + 90, 0, 420, [[0, 'rgba(255,200,150,.45)'], [1, 'rgba(255,200,150,0)']]); ctx.save(); ctx.translate(0, floor + 90); ctx.scale(1, .25); ctx.translate(0, -(floor + 90)); ctx.fillRect(cx - 420, floor - 400, 840, 1200); ctx.restore();
    // soporte
    ctx.strokeStyle = '#0c0718'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 6, 1440); ctx.lineTo(cx - 140, 1560); ctx.moveTo(cx - 6, 1440); ctx.lineTo(cx + 120, 1560); ctx.moveTo(cx - 6, 1440); ctx.lineTo(cx - 10, 1580); ctx.stroke();
    ctx.save(); ctx.translate(cx, 1250); ctx.rotate(-.09); ctx.scale(.88, .88); halo(ctx, 0, 0, 640, '#ff5a8a', .22); guitar(ctx, '#ff3f8a', '#ff9a3d', '#ffe3b8', t); ctx.restore();
    // humo
    for (let i = 0; i < 9; i++) { const x = 60 + i * 120 + 70 * wave(t, 1, i * .13), y = floor - 10 + 36 * wave(t, 1, i * .27 + .3), r = 230 + (i % 3) * 50; halo(ctx, x, y, r, i % 2 ? '#ff77b0' : '#ffb27a', .17); halo(ctx, x + 60 * wave(t, 1, i * .31), y + 50, r * .8, '#c9a0ff', .11); }
    // público en silueta
    const rc = rng(5);
    ctx.fillStyle = '#05020c'; for (let i = 0; i < 12; i++) { const x = 20 + i * 92 + rc() * 30, y = 1560 + rc() * 40; ctx.beginPath(); ctx.moveTo(x - 60, H); ctx.quadraticCurveTo(x - 60, y + 40, x, y + 30); ctx.quadraticCurveTo(x + 60, y + 40, x + 60, H); ctx.fill(); circle(ctx, x, y, 36); ctx.fill();
      if (rc() < .7) { const a = -.3 + rc() * .6, hx = x + (rc() < .5 ? -1 : 1) * 40; ctx.strokeStyle = '#05020c'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, y + 40); ctx.lineTo(hx + a * 120, y - 110 - rc() * 50 + 10 * wave(t, 1, i * .1)); ctx.stroke(); } }
    L.loopParticles(26, 4, t, (i, p, r) => { const x = r() * W, y = 1400 - p * 1000; ctx.fillStyle = `rgba(255,220,180,${.55 * Math.sin(Math.PI * p)})`; circle(ctx, x + 30 * Math.sin(p * 6 + i), y, 2 + r() * 3); ctx.fill(); });
    L.vignette(ctx, W, H, .5);
  }

  SCENES['music-c'] = {
    topic: 'music', stillT: [.25, .5],
    cap: [
      { ca: 'Auriculars posats, el món pot esperar 🎧 #música', es: 'Cascos puestos, el mundo puede esperar 🎧 #música', en: 'Headphones on, the world can wait 🎧 #music' },
      { ca: 'Quan s\'apaguen els llums i comença el solo 🎸 #concert', es: 'Cuando se apagan las luces y empieza el solo 🎸 #concierto', en: 'When the lights go down and the solo starts 🎸 #concert' }],
    draw(ctx, t, v) { (v % 2 === 0 ? headphonesPoster : stagePoster)(ctx, t, v); }
  };
})();
