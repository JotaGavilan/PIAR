/* TRAVEL – a: atardecer en la montaña con lago-espejo, capas con parallax suave, globos y pájaros */
(function () {
  const { TAU, wave, wave01, lin, rad, halo, ridgeFill, stars, rng, circle, mix, lerp, clamp } = L;
  const PAL = [
    { name: 'magenta', sky: ['#1a1446', '#5a2a86', '#e2527f', '#ffb877'], sun: '#fff3d1', far: '#c46a9a', layers: ['#a8508f', '#7d3a8a', '#52266f', '#2e1650', '#150b2b'], bal: [['#ff5d73', '#ffd166'], ['#7ae582', '#25a18e'], ['#ffd166', '#ef476f']] },
    { name: 'azul', sky: ['#06213f', '#0f5b8a', '#3ab5c8', '#ffe0a3'], sun: '#fffbe6', far: '#7cc3cf', layers: ['#5aa6bd', '#3a82a3', '#235b85', '#133a5e', '#08203a'], bal: [['#ff7a59', '#ffd166'], ['#f6f6f6', '#ff7a59'], ['#ffd166', '#06d6a0']] },
    { name: 'ámbar', sky: ['#1b1030', '#4a2670', '#d1496a', '#ffa05e'], sun: '#fff0d6', far: '#e38a86', layers: ['#c9667e', '#93457d', '#5e2d6d', '#341a52', '#170c2b'], bal: [['#ffe66d', '#ff6b6b'], ['#4ecdc4', '#1a535c'], ['#ff6b6b', '#ffe66d']] }
  ];
  function ridgeY(x, i, seed, off) { return ridge(x + off + 1080 * 3, seed + i * 17, 1080, 4); }
  const ridge = L.ridge;
  function balloon(ctx, x, y, s, c, sway) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(sway); ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(40,20,50,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30, 76); ctx.lineTo(-17, 128); ctx.moveTo(30, 76); ctx.lineTo(17, 128); ctx.stroke();
    ctx.fillStyle = '#4a2f26'; L.rr(ctx, -20, 126, 40, 28, 7); ctx.fill();
    const g = lin(ctx, -80, 0, 80, 0, [[0, c[0]], [.5, c[1]], [1, c[0]]]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-32, 76); ctx.bezierCurveTo(-100, 24, -88, -100, 0, -104); ctx.bezierCurveTo(88, -100, 100, 24, 32, 76); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.3)'; [-46, 0, 46].forEach((dx, k) => { ctx.beginPath(); ctx.ellipse(dx, -10, k === 1 ? 12 : 9, 120, 0, 0, TAU); ctx.fill(); });
    ctx.fillStyle = rad(ctx, 30, -40, 0, 120, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(-120, -120, 240, 240); ctx.restore();
    ctx.restore();
  }
  function bird(ctx, x, y, s, flap) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = 'rgba(25,12,40,.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-28, 4 - 10 * flap); ctx.quadraticCurveTo(-12, -14 * flap - 2, 0, 3); ctx.quadraticCurveTo(12, -14 * flap - 2, 28, 4 - 10 * flap); ctx.stroke(); ctx.restore(); }
  function streakCloud(ctx, x, y, w, h, col) { ctx.fillStyle = col; L.rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill(); L.rr(ctx, x - w * .28, y - h * 1.1, w * .5, h * 1.1, h / 2); ctx.fill(); }

  SCENES['travel-a'] = {
    topic: 'travel', stillT: [.12, .5, .8],
    cap: [
      { ca: 'Hui el cel va decidir ser així 🌅 #viatges #albada', es: 'Hoy el cielo decidió ser así 🌅 #viajes #atardecer', en: 'Today the sky decided to be like this 🌅 #travel #sunset' },
      { ca: 'Globus sobre el llac, sense pressa 🎈 #viatges', es: 'Globos sobre el lago, sin prisa 🎈 #viajes', en: 'Balloons over the lake, no rush 🎈 #travel' }],
    draw(ctx, t, v) {
      const W = 1080, H = 1920, P = PAL[v % PAL.length], hz = 1200, seed = 5 + v * 3, sw = wave(t, 1);
      function world(c, flip) {
        c.fillStyle = lin(c, 0, 0, 0, hz, [[0, P.sky[0]], [.42, P.sky[1]], [.78, P.sky[2]], [1, P.sky[3]]]); c.fillRect(0, 0, W, hz + 4);
        stars(c, 110, 11 + v, t, { y1: 620, alpha: .75 });
        const sy = 1010 + 10 * wave(t, 1);
        halo(c, 540, sy, 900, P.sky[3], .5 + .08 * wave(t, 1)); halo(c, 540, sy, 420, P.sun, .75);
        c.fillStyle = P.sun; circle(c, 540, sy, 150); c.fill();
        // nubes alargadas
        for (let i = 0; i < 6; i++) { const sp = 1, x = ((i * 290 + t * (W + 700) * sp) % (W + 700)) - 350, y = 330 + i * 105 + (i % 3) * 22; streakCloud(c, x, y, 330 + (i % 3) * 120, 34 + (i % 2) * 14, i % 2 ? 'rgba(255,214,190,.30)' : 'rgba(255,255,255,.2)'); }
        // globos
        P.bal.forEach((b, i) => { const fx = [.2, .7, .9][i], sz = [1.15, 1.5, .8][i], by = [520, 420, 700][i]; const x = fx * W + 70 * wave(t, 1, i * .31), y = by + 28 * wave(t, 2, i * .3); balloon(c, x, y, sz, b, .06 * wave(t, 1, i * .2)); });
        // montañas
        const n = P.layers.length;
        for (let i = 0; i < n; i++) {
          const base = hz - [130, 70, 20, -40, -100][i] + 0, amp = [330, 300, 260, 200, 150][i], off = (i + 1) * 28 * sw * (i % 2 ? -1 : 1) * .9;
          const col = i === 0 ? lin(c, 0, hz - 520, 0, hz, [[0, P.layers[0]], [1, P.far]]) : lin(c, 0, hz - amp - 40, 0, hz + 40, [[0, P.layers[i]], [1, mix(P.layers[i], P.sky[3], .25 - i * .04)]]);
          c.beginPath(); c.moveTo(0, hz + 6);
          for (let x = 0; x <= W + 12; x += 12) c.lineTo(x, base + 40 - amp * (.5 + .5 * ridgeY(x, i, seed, off)) * (1 - i * .02));
          c.lineTo(W, hz + 6); c.closePath(); c.fillStyle = col; c.fill();
        }
        // niebla baja
        c.fillStyle = lin(c, 0, hz - 260, 0, hz + 4, [[0, 'rgba(255,190,170,0)'], [1, 'rgba(255,190,170,.35)']]); c.fillRect(0, hz - 260, W, 264);
      }
      world(ctx, false);
      // agua = reflejo vertical
      ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip();
      ctx.translate(0, 2 * hz); ctx.scale(1, -1); world(ctx, true); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip();
      ctx.fillStyle = lin(ctx, 0, hz, 0, H, [[0, 'rgba(255,200,160,.25)'], [.4, 'rgba(30,15,60,.55)'], [1, 'rgba(5,3,15,.92)']]); ctx.fillRect(0, hz, W, H - hz);
      // destellos de agua
      const r = rng(77 + v);
      for (let i = 0; i < 70; i++) { const y0 = hz + 8 + Math.pow(r(), 1.6) * (H - hz - 20), wd = 40 + r() * 140 * (.4 + (y0 - hz) / 700), x0 = 540 + (r() - .5) * (160 + (y0 - hz) * .9), ph = r(); const a = clamp(.55 - (y0 - hz) / 1100, .06, .55) * (.4 + .6 * wave01(t, 2, ph)); ctx.fillStyle = `rgba(255,240,205,${a})`; L.rr(ctx, x0 + 18 * wave(t, 1, ph) - wd / 2, y0, wd, 3 + (y0 - hz) * .006, 2); ctx.fill(); }
      // ondas largas que avanzan hacia el espectador
      for (let i = 0; i < 9; i++) { const p = ((t + i / 9) % 1), y = hz + 20 + p * p * (H - hz - 20); ctx.fillStyle = `rgba(255,220,200,${.10 * (1 - p)})`; ctx.fillRect(0, y, W, 2 + p * 6); }
      ctx.restore();
      // pájaros en V
      for (let i = 0; i < 7; i++) { const lead = (i + 1) >> 1, side = i % 2 ? 1 : -1, px = ((t * (W + 500)) % (W + 500)) - 250; const x = px - lead * 52, y = 470 + lead * 28 * side + (i ? 0 : 0) + 14 * wave(t, 2, i * .05); bird(ctx, x, y + (i ? lead * 12 : 0), 1.1, wave(t, 6, i * .07)); }
      // partículas de luz
      L.loopParticles(26, 9 + v, t, (i, p, r) => { const x = r() * W, y = hz + 400 - p * 1400; ctx.fillStyle = `rgba(255,230,190,${.6 * Math.sin(Math.PI * p)})`; circle(ctx, x + 30 * Math.sin(p * 6 + i), y, 2 + r() * 3); ctx.fill(); });
      L.vignette(ctx, W, H, .42);
    }
  };
})();
