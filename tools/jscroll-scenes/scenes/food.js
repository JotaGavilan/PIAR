/* FOOD – a: pizza vista desde arriba que gira con ingredientes que caen | b: ramen / latte | c: hamburguesa explosionada / dónut gigante */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, halo, circle, ellipse, rr, rng, mix, lerp, clamp, smooth, easeOut, easeInOut } = L;

  /* ───────────── utilidades locales ───────────── */
  const shadowBlob = (c, x, y, rx, ry, a) => L.shadowEllipse(c, x, y, rx, ry, a);
  function wobblyCircle(c, x, y, r, amp, seed, n = 64, k1 = 7, k2 = 13) {
    const rg = rng(seed), p1 = rg() * TAU, p2 = rg() * TAU; c.beginPath();
    for (let i = 0; i <= n; i++) { const a = i / n * TAU, rr_ = r + amp * Math.sin(a * k1 + p1) * .6 + amp * Math.sin(a * k2 + p2) * .4; const px = x + Math.cos(a) * rr_, py = y + Math.sin(a) * rr_; i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath();
  }
  /* sparks / chispas de calor que suben (bucle perfecto) */
  function embers(c, n, seed, t, x0, x1, yBase, rise, cols) {
    L.loopParticles(n, seed, t, (i, p, r) => {
      const x = lerp(x0, x1, r()), sz = 3 + r() * 5, col = cols[i % cols.length], sw = 30 + r() * 40, ph = r() * TAU, y = yBase - p * rise * (.6 + r() * .6);
      const a = Math.sin(Math.PI * p) * .95; c.globalAlpha = a; c.fillStyle = col;
      const px = x + sw * Math.sin(p * 5 + ph), py = y; c.beginPath(); c.moveTo(px, py - sz * 2.2); c.lineTo(px + sz * .7, py); c.lineTo(px, py + sz * 1.1); c.lineTo(px - sz * .7, py); c.closePath(); c.fill();
      halo(c, px, py, sz * 5, col, .35);
    });
    c.globalAlpha = 1;
  }
  function steamPuffs(c, n, seed, t, cx, cy, spread, rise, size, alpha, col = '#fff') {
    L.loopParticles(n, seed, t, (i, p, r) => {
      const x = cx + (r() - .5) * spread + 40 * Math.sin(p * 6 + i * 1.7), y = cy - p * rise, s = size * (.6 + p * 1.1) * (.7 + r() * .6);
      halo(c, x, y, s, col, alpha * Math.sin(Math.PI * p) * (.5 + .5 * r()));
    });
  }
  /* gingham: cuadros que se desplazan un nº entero de celdas por bucle */
  function gingham(c, W, H, cell, cA, cB, t, sx = 2, sy = 1, alpha = .5) {
    c.fillStyle = cA; c.fillRect(0, 0, W, H);
    const ox = ((t * sx * cell) % (cell * 2) + cell * 2) % (cell * 2), oy = ((t * sy * cell) % (cell * 2) + cell * 2) % (cell * 2);
    c.fillStyle = cB; c.globalAlpha = alpha;
    for (let x = -cell * 2 + ox; x < W; x += cell * 2) c.fillRect(x, 0, cell, H);
    for (let y = -cell * 2 + oy; y < H; y += cell * 2) c.fillRect(0, y, W, cell);
    c.globalAlpha = 1;
  }

  /* ═════════════════════════ FOOD-A : PIZZA ═════════════════════════ */
  const PZ = [
    { // pepperoni sobre mantel rojo
      cloth: ['#fffaf0', '#e8353a'], gl: 'rgba(255,200,120,.55)', pan: ['#35333f', '#17151d', '#5b5968'], dir: 1, am: -0.62,
      sauce: ['#ef4a30', '#b3201c'], cheese: ['#ffe27c', '#f6b73a'], crust: ['#f7c56e', '#d98733'],
      tops: ['pep', 'pep', 'pep', 'olive', 'pepper', 'basil'], nStat: 12, nDyn: 9, seed: 21, cy: 905
    },
    { // margarita sobre tabla de madera y mantel menta
      cloth: ['#f2fffa', '#14b79f'], gl: 'rgba(200,255,230,.5)', pan: ['#c78a4e', '#8b5428', '#e2b078'], dir: -1, am: 2.5,
      sauce: ['#ff5436', '#c3261f'], cheese: ['#ffe9a0', '#ffc94d'], crust: ['#fbd08a', '#dd8f3b'],
      tops: ['moz', 'moz', 'tom', 'basil', 'basil', 'moz'], nStat: 10, nDyn: 9, seed: 58, cy: 905
    }
  ];
  function leaf(c, s, rot) {
    c.save(); c.rotate(rot);
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.moveTo(3, s * 1.0 + 4); c.bezierCurveTo(-s * 1.0 + 3, s * .2 + 5, -s * .5 + 3, -s * .9 + 5, 3, -s * 1.2 + 5); c.bezierCurveTo(s * .5 + 3, -s * .9 + 5, s * 1.0 + 3, s * .2 + 5, 3, s * 1.0 + 4); c.fill();
    c.fillStyle = lin(c, -s, -s, s, s, [[0, '#56c254'], [1, '#1d7a34']]);
    c.beginPath(); c.moveTo(0, s); c.bezierCurveTo(-s * 1.0, s * .2, -s * .5, -s * .9, 0, -s * 1.2); c.bezierCurveTo(s * .5, -s * .9, s * 1.0, s * .2, 0, s); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(200,255,170,.7)'; c.lineWidth = s * .06; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, s * .95); c.lineTo(0, -s * .95); c.stroke();
    c.lineWidth = s * .035; for (let i = -2; i <= 2; i++) { if (!i) continue; c.beginPath(); c.moveTo(0, i * s * .18 + s * .1); c.lineTo(Math.sign(i) * s * .5, i * s * .18 - s * .22); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(-s * .25, -s * .1, s * .14, s * .5, .25, 0, TAU); c.fill();
    c.restore();
  }
  function topping(c, type, s, rot, k) {
    const sh = () => { c.fillStyle = 'rgba(90,30,0,.28)'; c.beginPath(); c.ellipse(3, 6, s * 1.02, s * .98, 0, 0, TAU); c.fill(); };
    if (type === 'pep') {
      sh(); c.fillStyle = lin(c, -s, -s, s, s, [[0, '#ee4d33'], [1, '#a21c18']]); circle(c, 0, 0, s); c.fill();
      c.strokeStyle = '#86160f'; c.lineWidth = s * .1; circle(c, 0, 0, s * .94); c.stroke();
      c.fillStyle = 'rgba(120,20,10,.5)'; const r = rng(900 + k); for (let i = 0; i < 7; i++) { const a = r() * TAU, d = r() * s * .7; circle(c, Math.cos(a) * d, Math.sin(a) * d, s * (.05 + r() * .06)); c.fill(); }
      c.fillStyle = 'rgba(255,190,140,.4)'; c.beginPath(); c.ellipse(-s * .3, -s * .38, s * .34, s * .16, -.7, 0, TAU); c.fill();
    } else if (type === 'olive') {
      sh(); c.fillStyle = lin(c, -s, -s, s, s, [[0, '#4a2f58'], [1, '#150b1c']]);
      c.beginPath(); c.arc(0, 0, s * .62, 0, TAU); c.arc(0, 0, s * .26, 0, TAU, true); c.fill('evenodd');
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-s * .3, -s * .3, s * .12, s * .06, -.8, 0, TAU); c.fill();
    } else if (type === 'pepper') {
      c.save(); c.scale(1, .82); c.lineCap = 'round'; c.strokeStyle = 'rgba(90,30,0,.25)'; c.lineWidth = s * .3; circle(c, 3, 6, s * .66); c.stroke();
      c.strokeStyle = '#2f9e44'; c.lineWidth = s * .32; circle(c, 0, 0, s * .66); c.stroke();
      c.strokeStyle = '#7bdc63'; c.lineWidth = s * .12; c.beginPath(); c.arc(0, 0, s * .66, 3.5, 5.0); c.stroke(); c.restore();
    } else if (type === 'moz') {
      c.fillStyle = 'rgba(160,80,10,.25)'; wobblyCircle(c, 4, 7, s * 1.02, s * .12, 300 + k); c.fill();
      c.fillStyle = lin(c, -s, -s, s, s, [[0, '#ffffff'], [1, '#fbe9c2']]); wobblyCircle(c, 0, 0, s, s * .12, 300 + k); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(-s * .3, -s * .35, s * .34, s * .14, -.6, 0, TAU); c.fill();
      c.fillStyle = 'rgba(245,190,90,.45)'; circle(c, s * .35, s * .3, s * .1); c.fill();
    } else if (type === 'tom') {
      sh(); c.fillStyle = lin(c, -s, -s, s, s, [[0, '#ff5b45'], [1, '#c91f24']]); circle(c, 0, 0, s * .82); c.fill();
      c.fillStyle = '#ff8c6e'; circle(c, 0, 0, s * .62); c.fill();
      c.fillStyle = '#ffd1b3'; for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .7; c.beginPath(); c.ellipse(Math.cos(a) * s * .28, Math.sin(a) * s * .28, s * .17, s * .1, a, 0, TAU); c.fill(); }
      c.fillStyle = '#fff0d6'; circle(c, 0, 0, s * .1); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-s * .45, -s * .5, s * .2, s * .07, -.8, 0, TAU); c.fill();
    } else if (type === 'basil') leaf(c, s * 1.05, rot);
  }
  /* geometría de ingredientes: posiciones locales sobre la pizza, deterministas */
  function pizzaSlots(P) {
    const r = rng(P.seed), out = [], tot = P.nStat + P.nDyn, hw = .3927;
    let guard = 0;
    while (out.length < tot && guard++ < 4000) {
      const dyn = out.length >= P.nStat, a = r() * TAU, d = Math.sqrt(r()) * 255, x = Math.cos(a) * d, y = Math.sin(a) * d;
      const da = Math.abs(Math.atan2(Math.sin(a - P.am), Math.cos(a - P.am)));
      if (dyn && da < hw + .22) continue;
      if (out.every(o => Math.hypot(o.x - x, o.y - y) > 92 - guard * .004)) {
        const type = P.tops[out.length % P.tops.length], s = type === 'basil' ? 44 : type === 'pep' ? 52 : type === 'olive' ? 34 : type === 'moz' ? 56 : type === 'tom' ? 46 : 40;
        out.push({ x, y, a, d, type, s: s * (.92 + r() * .16), rot: r() * TAU, t0: r(), dyn });
      }
    }
    return out;
  }
  function drawPizzaBody(c, P, slots, th, showDyn) {
    // masa
    c.fillStyle = lin(c, -300, -300, 300, 300, [[0, P.crust[0]], [1, P.crust[1]]]); circle(c, 0, 0, 392); c.fill();
    c.strokeStyle = '#b8651e'; c.globalAlpha = .55; c.lineWidth = 5; circle(c, 0, 0, 389); c.stroke(); c.globalAlpha = 1;
    const r = rng(P.seed + 5);
    for (let i = 0; i < 34; i++) { const a = r() * TAU, d = 350 + r() * 30; c.fillStyle = i % 3 ? 'rgba(150,70,15,.35)' : 'rgba(255,240,200,.45)'; c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d, 14 + r() * 20, 6 + r() * 9, a + 1.57, 0, TAU); c.fill(); }
    c.strokeStyle = 'rgba(255,235,190,.55)'; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 376, 3.6, 5.2); c.stroke();
    // salsa
    c.fillStyle = rad(c, -60, -60, 20, 360, [[0, P.sauce[0]], [1, P.sauce[1]]]); circle(c, 0, 0, 345); c.fill();
    // queso
    c.fillStyle = 'rgba(80,20,0,.22)'; wobblyCircle(c, 3, 8, 322, 16, P.seed); c.fill();
    c.fillStyle = rad(c, -80, -90, 10, 340, [[0, P.cheese[0]], [1, P.cheese[1]]]); wobblyCircle(c, 0, 0, 320, 16, P.seed); c.fill();
    for (let i = 0; i < 46; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 290; c.fillStyle = i % 2 ? 'rgba(255,250,220,.55)' : 'rgba(205,120,25,.40)'; c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d, 12 + r() * 26, 8 + r() * 14, r() * 3, 0, TAU); c.fill(); }
    // cortes
    c.strokeStyle = 'rgba(110,40,5,.30)'; c.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .3927; c.beginPath(); c.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); c.lineTo(Math.cos(a) * 385, Math.sin(a) * 385); c.stroke(); }
    // ingredientes fijos y los dinámicos ya aterrizados
    slots.forEach((o, i) => {
      if (!o.dyn) { c.save(); c.translate(o.x, o.y); c.rotate(o.rot * 0); topping(c, o.type, o.s, o.rot, i); c.restore(); }
      else if (showDyn) { const st = o.state; if (st && st.landed) { c.save(); c.translate(o.x, o.y - st.hop); c.scale(st.sx, st.sy); c.globalAlpha = st.alpha; topping(c, o.type, o.s * st.sc, o.rot, i); c.restore(); } }
    });
  }

  function bowl(c, x, y, r, kind, rim) {
    shadowBlob(c, x + 6, y + 14, r * 1.15, r * 1.15, .4);
    c.fillStyle = lin(c, x - r, y - r, x + r, y + r, [[0, '#ffffff'], [1, rim]]); circle(c, x, y, r); c.fill();
    c.fillStyle = 'rgba(0,0,0,.18)'; circle(c, x, y, r * .82); c.fill();
    c.fillStyle = lin(c, x, y - r, x, y + r, [[0, '#d9d4cc'], [1, '#fffaf0']]); circle(c, x, y, r * .78); c.fill();
    const g = rng(kind.length * 17 + 3);
    if (kind === 'chili') { for (let i = 0; i < 130; i++) { const a = g() * TAU, d = Math.sqrt(g()) * r * .72; c.fillStyle = ['#e5301f', '#ff6a2a', '#a81414', '#ffb03a'][i % 4]; c.beginPath(); c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 3 + g() * 4, 2 + g() * 2.5, g() * 3, 0, TAU); c.fill(); } }
    else if (kind === 'olives') { for (let i = 0; i < 9; i++) { const a = i * 2.4, d = i ? Math.sqrt((i + .5) / 9) * r * .5 : 0, ox = x + Math.cos(a) * d, oy = y + Math.sin(a) * d; c.fillStyle = 'rgba(0,0,0,.25)'; circle(c, ox + 2, oy + 4, r * .2); c.fill(); c.fillStyle = lin(c, ox - 20, oy - 20, ox + 20, oy + 20, [[0, '#5a3a68'], [1, '#1a0f22']]); circle(c, ox, oy, r * .2); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(ox - r * .07, oy - r * .08, r * .05, r * .03, -.7, 0, TAU); c.fill(); } }
    else if (kind === 'toms') { for (let i = 0; i < 7; i++) { const a = i * 2.2, d = i ? r * .42 : 0, ox = x + Math.cos(a) * d * (i ? 1 : 0), oy = y + Math.sin(a) * d * (i ? 1 : 0); c.fillStyle = 'rgba(0,0,0,.22)'; circle(c, ox + 2, oy + 4, r * .24); c.fill(); c.fillStyle = lin(c, ox - 20, oy - 20, ox + 20, oy + 20, [[0, '#ff6a50'], [1, '#c4161f']]); circle(c, ox, oy, r * .24); c.fill(); c.fillStyle = '#3aa655'; c.beginPath(); for (let k = 0; k < 5; k++) { const aa = k / 5 * TAU; c.moveTo(ox, oy); c.lineTo(ox + Math.cos(aa) * r * .1, oy + Math.sin(aa) * r * .1); } c.strokeStyle = '#2f9e44'; c.lineWidth = 3; c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(ox - r * .09, oy - r * .1, r * .07, r * .035, -.7, 0, TAU); c.fill(); } }
    else if (kind === 'basil') { for (let i = 0; i < 8; i++) { c.save(); c.translate(x + Math.cos(i * 1.7) * r * .3, y + Math.sin(i * 1.7) * r * .3); leaf(c, r * .38, i * 1.3); c.restore(); } }
  }
  const BOWLS = [[['chili', 150, 1500, 100], ['olives', 930, 350, 90]], [['toms', 150, 1500, 100], ['basil', 930, 350, 90]]];

  SCENES['food-a'] = {
    topic: 'food', stillT: [.30, .58],
    cap: [
      { ca: 'Pizza amb tot el formatge del món 🍕 #pizza #foodie', es: 'Pizza con todo el queso del mundo 🍕 #pizza #foodie', en: 'Pizza with all the cheese in the world 🍕 #pizza #foodie' },
      { ca: 'Mozzarella, alfàbrega i res més 🌿 #pizza #casolà', es: 'Mozzarella, albahaca y nada más 🌿 #pizza #casera', en: 'Mozzarella, basil and nothing else 🌿 #pizza #homemade' }],
    draw(c, t, v) {
      const W = 1080, H = 1920, P = PZ[v % PZ.length], CX = 540, CY = P.cy, th = P.dir * TAU * t + (v ? 0.5 : 0.1);
      const rot = (tt) => P.dir * TAU * tt + (v ? 0.5 : 0.1);
      gingham(c, W, H, 120, P.cloth[0], P.cloth[1], t, 2, 2, v ? .42 : .5);
      c.fillStyle = rad(c, CX, CY, 300, 1100, [[0, 'rgba(0,0,0,0)'], [1, v ? 'rgba(0,70,70,.30)' : 'rgba(120,10,20,.30)']]); c.fillRect(0, 0, W, H);
      halo(c, CX, CY, 760, P.gl, .9);
      BOWLS[v % 2].forEach(([k, x, y, r]) => bowl(c, x, y + 6 * wave(t, 1, x / 1000), r, k, v ? '#b8ece0' : '#f2c9b8'));
      c.save(); c.translate(CX, CY); c.scale(.97, .97); c.translate(-CX, -CY);
      // bandeja / tabla
      shadowBlob(c, CX + 8, CY + 52, 520, 520, .45);
      c.fillStyle = lin(c, CX - 400, CY - 400, CX + 400, CY + 400, [[0, P.pan[2]], [.5, P.pan[0]], [1, P.pan[1]]]); circle(c, CX, CY, 462); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 5; circle(c, CX, CY, 452); c.stroke();
      c.fillStyle = lin(c, CX, CY - 430, CX, CY + 430, [[0, P.pan[1]], [1, P.pan[0]]]); circle(c, CX, CY, 428); c.fill();
      if (v === 1) { c.save(); circle(c, CX, CY, 428); c.clip(); c.strokeStyle = 'rgba(70,35,10,.22)'; c.lineWidth = 4; const g = rng(4); for (let i = 0; i < 16; i++) { const y = CY - 400 + i * 52 + g() * 20; c.beginPath(); c.moveTo(CX - 410 + g() * 30, y); c.bezierCurveTo(CX - 100, y + 14 * (g() - .5), CX + 100, y - 14 * g(), CX + 410, y + 10); c.stroke(); } c.restore(); }
      // estados de los ingredientes dinámicos
      const slots = pizzaSlots(P), FALL = .13, BNC = .09;
      const dyn = slots.filter(o => o.dyn), ND = dyn.length;
      const am = P.am;
      dyn.forEach((o, i) => {
        const t0 = (i / ND + o.t0 * .02) % 1, p = ((t - t0) % 1 + 1) % 1, tl = (t0 + FALL) % 1, thl = rot(tl);
        const wx = CX + Math.cos(thl) * o.x - Math.sin(thl) * o.y, wy = CY + Math.sin(thl) * o.x + Math.cos(thl) * o.y;
        o.wl = { wx, wy, tl, p, t0 };
        const st = { landed: false, hop: 0, sx: 1, sy: 1, sc: 1, alpha: 1 };
        if (p >= FALL) {
          st.landed = true; const q = (p - FALL) / BNC;
          if (q < 1) { const b = Math.sin(Math.PI * q) * (1 - q); st.hop = 46 * b; const sq = Math.sin(q * 3.2 * Math.PI) * (1 - q) * .14; st.sx = 1 + sq; st.sy = 1 - sq; st.sc = 1 + .12 * (1 - q); }
          if (p > .86) { const u = (p - .86) / .14; st.alpha = 1 - smooth(u); st.sc = 1 + .22 * smooth(u); }
        }
        o.state = st;
      });
      // pizza (sin porción) + porción levantada
      const D = 125 * easeInOut(pulse(t, 1, 0)), lift = easeInOut(pulse(t, 1, 0));
      const hw = .3927, a1 = am - hw, a2 = am + hw;
      c.save(); c.translate(CX, CY); c.rotate(th);
      // sombra de contacto de la pizza
      shadowBlob(c, 4, 10, 405, 405, .25);
      c.save(); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 420, a2, a1 + TAU); c.closePath(); c.clip();
      drawPizzaBody(c, P, slots, th, true); c.restore();
      // hilos de queso
      if (D > 4) {
        const mx = Math.cos(am), my = Math.sin(am);
        [a1, a2].forEach((a, ei) => {
          [70, 130, 190, 250, 300].forEach((rr0, k) => {
            const px = Math.cos(a) * rr0, py = Math.sin(a) * rr0, qx = px + mx * D, qy = py + my * D, w = Math.max(2, 22 * (1 - D / 400) * (1 - k * .05));
            const sag = (ei ? 1 : -1) * 6 * Math.sin(t * TAU * 2 + k) * 0 + (k % 2 ? 14 : -14) * (D / 250);
            const cxm = (px + qx) / 2 - my * sag, cym = (py + qy) / 2 + mx * sag;
            c.lineCap = 'round'; c.strokeStyle = 'rgba(180,90,10,.35)'; c.lineWidth = w + 5; c.beginPath(); c.moveTo(px + 3, py + 6); c.quadraticCurveTo(cxm + 3, cym + 6, qx + 3, qy + 6); c.stroke();
            c.strokeStyle = P.cheese[1]; c.lineWidth = w; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(cxm, cym, qx, qy); c.stroke();
            c.strokeStyle = 'rgba(255,250,215,.75)'; c.lineWidth = w * .35; c.beginPath(); c.moveTo(px - 1, py - 1); c.quadraticCurveTo(cxm - 1, cym - 2, qx - 1, qy - 1); c.stroke();
          });
        });
      }
      // porción
      c.save(); c.translate(mx0(am) * D, my0(am) * D);
      c.save(); c.rotate(am); c.translate(0, 0); c.restore();
      c.fillStyle = 'rgba(70,20,0,.30)'; c.save(); c.translate(8 + 14 * lift, 14 + 22 * lift); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 395, a1, a2); c.closePath(); c.fill(); c.restore();
      c.save(); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 420, a1, a2); c.closePath(); c.clip();
      c.scale(1 + .04 * lift, 1 + .04 * lift); drawPizzaBody(c, P, slots, th, true); c.restore();
      c.strokeStyle = 'rgba(255,240,180,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(Math.cos(a1) * 24, Math.sin(a1) * 24); c.lineTo(Math.cos(a1) * 384, Math.sin(a1) * 384); c.stroke();
      c.restore();
      c.restore();
      // brillo fijo (luz del techo)
      c.save(); c.beginPath(); circle(c, CX, CY, 390); c.clip();
      c.fillStyle = lin(c, CX - 300, CY - 340, CX + 40, CY + 60, [[0, 'rgba(255,255,255,.0)'], [.5, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(CX - 400, CY - 400, 800, 800);
      c.restore();
      // ingredientes cayendo (mundo)
      dyn.forEach((o, i) => {
        const w = o.wl, p = w.p; if (p >= FALL) return;
        const u = p / FALL, y = lerp(-300, w.wy, u * u * (.4 + .6 * u)), x = lerp(w.wx + (i % 2 ? 140 : -140), w.wx, easeOut(u));
        const sc = lerp(1.35, 1, easeOut(u));
        // sombra proyectada sobre la pizza
        c.save(); c.translate(x, y); c.rotate(o.rot + (1 - u) * (i % 2 ? 5 : -5)); c.scale(sc, sc); topping(c, o.type, o.s, o.rot * 0, i + 40); c.restore();
      });
      // chispas y onda al caer
      dyn.forEach((o, i) => {
        const w = o.wl, q = (w.p - FALL) / .22; if (q < 0 || q > 1) return;
        const e = easeOut(q), rg = rng(1000 + i * 31 + v);
        c.strokeStyle = `rgba(255,236,170,${.7 * (1 - q)})`; c.lineWidth = 6 * (1 - q) + 1; circle(c, w.wx, w.wy, 30 + 80 * e); c.stroke();
        for (let k = 0; k < 9; k++) { const a = rg() * TAU, d = (40 + rg() * 110) * e, sz = (4 + rg() * 5) * (1 - q); c.fillStyle = k % 2 ? '#ffb43a' : '#fff0a0'; c.globalAlpha = 1 - q; circle(c, w.wx + Math.cos(a) * d, w.wy + Math.sin(a) * d - 30 * q, sz); c.fill(); }
        c.globalAlpha = 1;
      });
      c.restore();
      // chispas ambientales y vapor
      embers(c, 34, 71 + v, t, 140, 940, CY + 380, 900, ['#ffb43a', '#ff7a2f', '#ffe27a']);
      steamPuffs(c, 12, 33 + v, t, CX, CY - 100, 520, 700, 140, .10);
      L.vignette(c, W, H, .22);
      function mx0(a) { return Math.cos(a); } function my0(a) { return Math.sin(a); }
    }
  };

  /* ═════════════════════════ FOOD-B : RAMEN (3/4) / LATTE (cenital) ═════════════════════════ */
  function wisp(c, x0, y0, len, amp, t, k, ph, w, alpha, col = '255,255,255') {
    const N = 40, L_ = [], R_ = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, x = x0 + amp * Math.sin(TAU * (s * 1.25 - t * k + ph)) * (.25 + s * .9), y = y0 - s * len, ww = w * (.35 + .65 * Math.sin(Math.PI * Math.min(1, s * 1.1))) * (1 + s * .6);
      L_.push([x - ww, y]); R_.push([x + ww, y]);
    }
    c.beginPath(); L_.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); for (let i = N; i >= 0; i--) c.lineTo(R_[i][0], R_[i][1]); c.closePath();
    c.fillStyle = lin(c, 0, y0, 0, y0 - len, [[0, `rgba(${col},0)`], [.2, `rgba(${col},${alpha})`], [.7, `rgba(${col},${alpha * .6})`], [1, `rgba(${col},0)`]]); c.fill();
  }
  function egg(c, s, rot) {
    c.save(); c.rotate(rot);
    c.fillStyle = 'rgba(60,20,0,.35)'; c.beginPath(); c.ellipse(5, 9, s * .8, s, 0, 0, TAU); c.fill();
    c.fillStyle = lin(c, -s, -s, s, s, [[0, '#ffffff'], [1, '#f3e6cf']]); c.beginPath(); c.ellipse(0, 0, s * .78, s, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(190,120,50,.25)'; c.beginPath(); c.ellipse(0, 0, s * .78, s, 0, 0, TAU); c.ellipse(0, 0, s * .68, s * .9, 0, 0, TAU, true); c.fill('evenodd');
    c.fillStyle = rad(c, -s * .12, -s * .14, 2, s * .5, [[0, '#ffd04a'], [.7, '#f79a12'], [1, '#e3720a']]); circle(c, 0, s * .06, s * .5); c.fill();
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(-s * .18, -s * .12, s * .13, s * .07, -.7, 0, TAU); c.fill();
    c.restore();
  }
  function chashu(c, s, rot) {
    c.save(); c.rotate(rot);
    c.fillStyle = 'rgba(40,10,0,.35)'; circle(c, 5, 9, s); c.fill();
    c.fillStyle = '#7a3a1d'; wobblyCircle(c, 0, 0, s, s * .05, 12); c.fill();
    c.fillStyle = lin(c, -s, -s, s, s, [[0, '#e6a77e'], [1, '#b8643a']]); wobblyCircle(c, 0, 0, s * .9, s * .04, 12); c.fill();
    c.strokeStyle = 'rgba(255,225,195,.8)'; c.lineWidth = s * .07; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, s * (.2 + i * .22), i * 1.3 + .4, i * 1.3 + .4 + 3.8 - i * .6); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-s * .3, -s * .4, s * .3, s * .1, -.6, 0, TAU); c.fill();
    c.restore();
  }
  function naruto(c, s, rot) {
    c.save(); c.rotate(rot);
    c.fillStyle = 'rgba(40,10,0,.3)'; circle(c, 4, 8, s); c.fill();
    c.fillStyle = '#ff7b9c'; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; circle(c, Math.cos(a) * s * .93, Math.sin(a) * s * .93, s * .13); c.fill(); }
    c.fillStyle = '#fff8f0'; circle(c, 0, 0, s * .88); c.fill();
    c.strokeStyle = '#ff6f91'; c.lineWidth = s * .12; c.lineCap = 'round'; c.beginPath();
    for (let a = 0; a < TAU * 2.2; a += .12) { const r = s * (.06 + .66 * a / (TAU * 2.2)); const x = Math.cos(a) * r, y = Math.sin(a) * r; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-s * .4, -s * .45, s * .25, s * .08, -.7, 0, TAU); c.fill();
    c.restore();
  }
  function scallion(c, x, y, s, rot) {
    c.save(); c.translate(x, y); c.rotate(rot); c.strokeStyle = 'rgba(40,20,0,.3)'; c.lineWidth = s * .5; c.beginPath(); c.arc(2, 4, s, 0, TAU); c.stroke();
    c.strokeStyle = '#6fd34e'; c.lineWidth = s * .5; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.stroke();
    c.strokeStyle = '#d9f7ae'; c.lineWidth = s * .16; c.beginPath(); c.arc(0, 0, s * .98, 0, TAU); c.stroke(); c.restore();
  }
  function noodleNest(c, t, cx, cy, R, seed) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let j = 0; j < 7; j++) {
      const off = j * .9, N = 170, pts = [];
      for (let i = 0; i <= N; i++) { const a = i / N * TAU * 3.1, rr0 = R * (.2 + .8 * i / N), w = 9 * Math.sin(a * 3 + off + TAU * t * 1) + 5 * Math.sin(a * 5 - off + TAU * t * 2); pts.push([cx + Math.cos(a + off) * (rr0 + w) * 1, cy + Math.sin(a + off) * (rr0 + w) * 1]); }
      c.strokeStyle = 'rgba(150,80,10,.45)'; c.lineWidth = 19; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] + 2, p[1] + 5) : c.moveTo(p[0] + 2, p[1] + 5)); c.stroke();
      c.strokeStyle = j % 2 ? '#ffe9a6' : '#fff3c4'; c.lineWidth = 15; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3.5; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] - 2, p[1] - 3) : c.moveTo(p[0] - 2, p[1] - 3)); c.stroke();
    }
  }
  function ramenScene(c, t) {
    const W = 1080, H = 1920, cx = 540, cy = 1010, SQ = .72, by = cy + 14;
    const bp = (x, y) => [cx + x, by + y * SQ];
    const top = (x, y, f) => { const [px, py] = bp(x, y); c.save(); c.translate(px, py); c.scale(1, SQ); f(); c.restore(); };
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#0b2434'], [.45, '#12485c'], [1, '#0a1f2c']]); c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(120,230,230,.07)'; c.lineWidth = 3;
    c.beginPath(); for (let row = 0; row < 31; row++) for (let col = -1; col < 9; col++) { const x = col * 128 + (row % 2 ? 64 : 0), y = row * 64 + 30; for (let k = 0; k < 3; k++) { c.moveTo(x - 62 + k * 18, y); c.arc(x, y, 62 - k * 18, Math.PI, 0); } } c.stroke();
    halo(c, cx, 800, 900, 'rgba(255,140,60,.55)', .8 + .1 * wave(t, 1));
    // bokeh cálido
    const br = rng(8); for (let i = 0; i < 9; i++) { const x = br() * W, y = 230 + br() * 480, r = 40 + br() * 70; halo(c, x, y, r, i % 2 ? '#ffb347' : '#ff7a59', .22 * (.5 + .5 * wave(t, 1 + i % 2, br()))); }
    // esterilla de bambú
    c.save(); ellipse(c, cx, cy + 330, 520, 215); c.clip();
    c.fillStyle = lin(c, 0, cy + 120, 0, cy + 545, [[0, '#f3d99c'], [1, '#d3a259']]); c.fillRect(0, cy + 100, W, 460);
    c.strokeStyle = 'rgba(120,70,20,.28)'; c.lineWidth = 4; for (let x = -40; x < W + 40; x += 30) { c.beginPath(); c.moveTo(x, cy + 110); c.lineTo(x + (x - cx) * .08, cy + 560); c.stroke(); }
    c.strokeStyle = 'rgba(255,245,210,.5)'; c.lineWidth = 3; for (let x = -25; x < W + 40; x += 30) { c.beginPath(); c.moveTo(x, cy + 110); c.lineTo(x + (x - cx) * .08, cy + 560); c.stroke(); }
    c.restore();
    c.strokeStyle = '#a8742f'; c.lineWidth = 8; ellipse(c, cx, cy + 330, 520, 215); c.stroke();
    // cuerpo del cuenco
    shadowBlob(c, cx, cy + 410, 470, 110, .5);
    c.fillStyle = '#4d0d1c'; L.rr(c, cx - 170, cy + 372, 340, 52, 22); c.fill();
    c.beginPath(); c.moveTo(cx - 430, cy); c.bezierCurveTo(cx - 430, cy + 240, cx - 310, cy + 380, cx - 160, cy + 398); c.lineTo(cx + 160, cy + 398); c.bezierCurveTo(cx + 310, cy + 380, cx + 430, cy + 240, cx + 430, cy);
    c.ellipse(cx, cy, 430, 310, 0, 0, Math.PI, false); c.closePath();
    c.fillStyle = lin(c, cx - 430, 0, cx + 430, 0, [[0, '#8e1530'], [.3, '#e8384f'], [.55, '#d02642'], [1, '#7c1029']]); c.fill();
    c.save(); c.clip();
    // bandas decorativas siguiendo la curva del borde
    c.strokeStyle = 'rgba(255,244,226,.95)'; c.lineWidth = 38; c.beginPath(); c.ellipse(cx, cy + 62, 424, 306, 0, 0, Math.PI); c.stroke();
    c.lineWidth = 10; c.beginPath(); c.ellipse(cx, cy + 130, 392, 290, 0, 0, Math.PI); c.stroke();
    c.fillStyle = '#d02642'; for (let i = 0; i <= 26; i++) { const a = i / 26 * Math.PI; circle(c, cx + Math.cos(a) * 424, cy + 62 + Math.sin(a) * 306, 8); c.fill(); }
    c.fillStyle = lin(c, 0, cy, 0, cy + 400, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(40,0,10,.55)']]); c.fillRect(cx - 440, cy, 880, 410);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(cx - 330, cy + 200, 20, 90, .5, 0, TAU); c.fill();
    c.restore();
    // borde superior
    c.fillStyle = lin(c, 0, cy - 310, 0, cy + 310, [[0, '#ff6b78'], [1, '#c3223a']]); ellipse(c, cx, cy, 430, 310); c.fill();
    c.fillStyle = '#fff4e2'; ellipse(c, cx, cy + 4, 404, 290); c.fill();
    c.fillStyle = lin(c, 0, cy - 280, 0, cy + 280, [[0, '#b98a58'], [.4, '#e7cfa3'], [1, '#fff0d8']]); ellipse(c, cx, cy + 8, 388, 276); c.fill();
    // caldo
    c.fillStyle = rad(c, cx - 60, by - 40, 10, 380, [[0, '#f9b447'], [.6, '#e8872b'], [1, '#b8561a']]); ellipse(c, cx, by + 6, 372, 262); c.fill();
    c.save(); ellipse(c, cx, by + 6, 372, 262); c.clip();
    // gotas de aceite que flotan
    const og = rng(33); for (let i = 0; i < 34; i++) {
      const a = og() * TAU, d = Math.sqrt(og()) * 330, r = 6 + og() * 15, ph = og(); const x = Math.cos(a) * d + 9 * wave(t, 1, ph), y = Math.sin(a) * d * .98 + 6 * wave(t, 1, ph + .25);
      const [px, py] = bp(x, y); c.save(); c.translate(px, py); c.scale(1, SQ); c.fillStyle = 'rgba(255,225,120,.55)'; circle(c, 0, 0, r); c.fill(); c.strokeStyle = 'rgba(255,255,220,.6)'; c.lineWidth = 2; circle(c, 0, 0, r); c.stroke(); c.fillStyle = 'rgba(255,255,255,.8)'; circle(c, -r * .3, -r * .3, r * .22); c.fill(); c.restore();
    }
    // ingredientes
    top(-200, -70 + 4 * wave(t, 1, .1), () => egg(c, 92, -.5 + .05 * wave(t, 1, .2)));
    top(-135, 150 + 4 * wave(t, 1, .6), () => egg(c, 88, .4 + .05 * wave(t, 1, .5)));
    top(215, 100 + 4 * wave(t, 1, .3), () => chashu(c, 84, .3));
    top(150, 195 + 4 * wave(t, 1, .8), () => chashu(c, 80, 2.2));
    top(35, 238 + 3 * wave(t, 1, .45), () => naruto(c, 66, .5 + .08 * wave(t, 1, .7)));
    // maíz y cebollino
    const cg = rng(5); top(-60, -200, () => { for (let i = 0; i < 9; i++) { const a = cg() * TAU, d = cg() * 48; c.fillStyle = 'rgba(80,30,0,.3)'; circle(c, Math.cos(a) * d + 2, Math.sin(a) * d + 4, 13); c.fill(); c.fillStyle = lin(c, -10, -10, 10, 10, [[0, '#ffe27a'], [1, '#f2b01e']]); circle(c, Math.cos(a) * d, Math.sin(a) * d, 13); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; circle(c, Math.cos(a) * d - 4, Math.sin(a) * d - 4, 3.5); c.fill(); } });
    const sg = rng(61); for (let i = 0; i < 22; i++) { const a = sg() * TAU, d = 90 + Math.sqrt(sg()) * 240, ph = sg(); const x = Math.cos(a) * d + 8 * wave(t, 1, ph), y = Math.sin(a) * d + 6 * wave(t, 1, ph + .3); const [px, py] = bp(x, y); c.save(); c.translate(px, py); c.scale(1, SQ); scallion(c, 0, 0, 11 + sg() * 4, sg() * 3); c.restore(); }
    // nido de fideos
    top(-10, -10, () => noodleNest(c, t, 0, 0, 150, 3));
    c.restore();
    // brillo del caldo
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(cx - 230, by - 110, 90, 16, -.3, 0, TAU); c.fill();
    const sp = rng(77); for (let i = 0; i < 8; i++) { const x = cx + (sp() - .5) * 560, y = by + (sp() - .5) * 340, a = wave01(t, 2, sp()); c.fillStyle = `rgba(255,255,255,${.7 * a})`; c.beginPath(); c.moveTo(x, y - 12 * a); c.lineTo(x + 3, y); c.lineTo(x, y + 12 * a); c.lineTo(x - 3, y); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x - 12 * a, y); c.lineTo(x, y + 3); c.lineTo(x + 12 * a, y); c.lineTo(x, y - 3); c.closePath(); c.fill(); }
    // nori de pie en el cuenco
    c.save(); c.translate(cx + 232, by - 70); c.rotate(.12 + .02 * wave(t, 1, .4));
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(10, 6, 80, 22, 0, 0, TAU); c.fill();
    c.fillStyle = lin(c, -60, 0, 60, 0, [[0, '#0f2b22'], [.5, '#1d4a3a'], [1, '#0a1c16']]); L.rr(c, -62, -260, 124, 270, 8); c.fill();
    c.strokeStyle = 'rgba(120,220,170,.28)'; c.lineWidth = 3; for (let y = -245; y < 0; y += 22) { c.beginPath(); c.moveTo(-58, y); c.lineTo(58, y + 2); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-50, -250, 12, 250); c.restore();
    // fideos levantados con palillos
    const bob = 12 * wave(t, 1), tipX = 548, tipY = 590 + bob;
    for (let i = 0; i < 8; i++) {
      const sx = (i - 3.5), x0 = tipX + sx * 4, x3 = cx + sx * 20, y3 = by - 6 + (i % 3) * 8;
      const sw = 22 * wave(t, 1, i * .11), sw2 = 28 * wave(t, 1, i * .11 + .3);
      c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, tipY + 20); c.bezierCurveTo(x0 + sx * 6 + sw, tipY + 150, x3 - sx * 4 + sw2, y3 - 140, x3, y3);
      c.strokeStyle = 'rgba(150,80,10,.4)'; c.lineWidth = 17; c.save(); c.translate(2, 3); c.stroke(); c.restore();
      c.strokeStyle = i % 2 ? '#ffe9a6' : '#fff3c4'; c.lineWidth = 13; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3; c.save(); c.translate(-2, -2); c.stroke(); c.restore();
    }
    // gotas
    [0, 1, 2, 3].forEach(j => {
      const ph = j * .25 + .05, p = ((t + ph) % 1), x = cx + (j - 1.5) * 34 + 6 * j;
      if (p < .3) { const u = p / .3, y = 850 + u * u * 150; c.fillStyle = '#ffd36a'; c.beginPath(); c.moveTo(x, y - 18); c.quadraticCurveTo(x + 10, y + 2, x, y + 8); c.quadraticCurveTo(x - 10, y + 2, x, y - 18); c.fill(); }
      else if (p < .62) { const u = (p - .3) / .32, e = easeOut(u); c.strokeStyle = `rgba(255,236,170,${.8 * (1 - u)})`; c.lineWidth = 5 * (1 - u) + 1; ellipse(c, x, 1010 + j * 10 * 0, 14 + 60 * e, (14 + 60 * e) * SQ); c.stroke(); }
    });
    // vapor serpenteante
    wisp(c, cx - 170, 880, 560, 55, t, 1, 0, 34, .26, '255,240,220'); wisp(c, cx + 20, 850, 620, 70, t, 1, .33, 40, .24, '255,240,220'); wisp(c, cx + 190, 890, 520, 55, t, 1, .66, 34, .26, '255,240,220');
    steamPuffs(c, 12, 91, t, cx, 900, 480, 640, 130, .11, '#fff2e0');
    // palillos
    c.save(); c.translate(tipX, tipY); c.rotate(.012 * wave(t, 1, .1)); c.translate(-tipX, -tipY);
    const stick = (x0, y0, x1, y1, w0, w1, col, band) => {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.moveTo(x0 + nx * w0 + 10, y0 + ny * w0 + 14); c.lineTo(x1 + nx * w1 + 10, y1 + ny * w1 + 14); c.lineTo(x1 - nx * w1 + 10, y1 - ny * w1 + 14); c.lineTo(x0 - nx * w0 + 10, y0 - ny * w0 + 14); c.fill();
      c.fillStyle = lin(c, x0 + nx * w0, y0 + ny * w0, x0 - nx * w0, y0 - ny * w0, [[0, col[0]], [.5, col[1]], [1, col[2]]]);
      c.beginPath(); c.moveTo(x0 + nx * w0, y0 + ny * w0); c.lineTo(x1 + nx * w1, y1 + ny * w1); c.lineTo(x1 - nx * w1, y1 - ny * w1); c.lineTo(x0 - nx * w0, y0 - ny * w0); c.closePath(); c.fill();
      const bx = lerp(x0, x1, .55), byy = lerp(y0, y1, .55); c.strokeStyle = band; c.lineWidth = 12; c.beginPath(); c.moveTo(bx + nx * 14, byy + ny * 14); c.lineTo(bx - nx * 14, byy - ny * 14); c.stroke();
    };
    stick(1130, 150, 536, 640, 15, 6.5, ['#6a2a18', '#a2482a', '#4a1a0e'], '#ffd166');
    stick(1180, 300, 586, 622, 15, 6.5, ['#5a2216', '#8e3a22', '#3e160c'], '#ffd166');
    c.restore();
  }

  function heartPath(c, S, ox = 0, oy = 0) {
    c.beginPath();
    for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); const px = ox + x * S, py = oy + (y + 2.5) * S; i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath();
  }
  function bean(c, x, y, s, rot, lift) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = `rgba(90,30,20,${.28 - lift * .004})`; c.beginPath(); c.ellipse(8 + lift * .6, 12 + lift, s * .62, s * .85, 0, 0, TAU); c.fill();
    c.translate(0, -lift * .5);
    c.fillStyle = lin(c, -s, -s, s, s, [[0, '#a8683a'], [.5, '#6b3a1e'], [1, '#3b1c0d']]); c.beginPath(); c.ellipse(0, 0, s * .62, s * .85, 0, 0, TAU); c.fill();
    c.strokeStyle = '#2a1209'; c.lineWidth = s * .09; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -s * .78); c.bezierCurveTo(s * .3, -s * .3, -s * .3, s * .3, 0, s * .78); c.stroke();
    c.fillStyle = 'rgba(255,220,180,.4)'; c.beginPath(); c.ellipse(-s * .28, -s * .3, s * .1, s * .26, .3, 0, TAU); c.fill();
    c.restore();
  }
  function latteScene(c, t) {
    const W = 1080, H = 1920, cx = 520, cy = 900;
    c.fillStyle = lin(c, 0, 0, W, H, [[0, '#ff8fb1'], [.5, '#ffb7b0'], [1, '#ffd9a0']]); c.fillRect(0, 0, W, H);
    // luz de ventana (bandas diagonales, desplazamiento de 1 periodo por bucle)
    const PER = 420; c.fillStyle = 'rgba(255,248,235,.20)';
    for (let x = -1200 + (t * PER); x < W + 100; x += PER) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 150, 0); c.lineTo(x + 150 - 1056, H); c.lineTo(x - 1056, H); c.closePath(); c.fill(); }
    c.fillStyle = 'rgba(255,248,235,.10)'; for (let x = -1200 + (t * PER) + 210; x < W + 100; x += PER) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 60, 0); c.lineTo(x + 60 - 1056, H); c.lineTo(x - 1056, H); c.closePath(); c.fill(); }
    // sombra de hojas meciéndose
    c.fillStyle = 'rgba(160,40,90,.11)';
    for (let i = 0; i < 6; i++) { c.save(); c.translate(960, 260); c.rotate(-1.9 + i * .42 + .05 * wave(t, 1, i * .13)); c.beginPath(); c.ellipse(190, 0, 180, 52, 0, 0, TAU); c.fill(); c.restore(); }
    for (let i = 0; i < 5; i++) { c.save(); c.translate(80, 1500); c.rotate(-.3 - i * .4 + .05 * wave(t, 1, i * .17 + .4)); c.beginPath(); c.ellipse(170, 0, 160, 46, 0, 0, TAU); c.fill(); c.restore(); }
    halo(c, cx, cy, 760, 'rgba(255,255,255,.55)', .55);
    // granos y terrones
    const bg = rng(14); const BEANS = [[130, 560, 38], [880, 520, 34], [960, 1180, 40], [90, 1180, 36], [820, 1450, 34], [250, 1500, 38], [70, 640, 30], [1010, 700, 30]];
    BEANS.forEach(([x, y, s], i) => bean(c, x + 6 * wave(t, 1, i * .13), y + 12 * wave(t, 1, i * .17), s, i * 1.7, 10 + 10 * wave01(t, 1, i * .17)));
    [[250, 1430, .3], [330, 1490, -.2]].forEach(([x, y, r], i) => { c.save(); c.translate(x + 4 * wave(t, 1, i * .5), y + 8 * wave(t, 1, i * .5 + .2)); c.rotate(r); c.fillStyle = 'rgba(120,40,40,.28)'; L.rr(c, -44 + 8, -44 + 14, 88, 88, 14); c.fill(); c.fillStyle = lin(c, -44, -44, 44, 44, [[0, '#ffffff'], [1, '#f1dfd2']]); L.rr(c, -44, -44, 88, 88, 14); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; L.rr(c, -36, -36, 40, 14, 7); c.fill(); c.restore(); });
    c.save(); c.translate(cx, cy); c.scale(1.1, 1.1); c.translate(-cx, -cy);
    // platillo
    shadowBlob(c, cx + 12, cy + 56, 480, 480, .45);
    c.fillStyle = lin(c, cx - 400, cy - 400, cx + 400, cy + 400, [[0, '#ffffff'], [1, '#e6d8d4']]); circle(c, cx, cy + 20, 430); c.fill();
    c.strokeStyle = 'rgba(160,120,130,.28)'; c.lineWidth = 5; circle(c, cx, cy + 20, 342); c.stroke();
    c.fillStyle = 'rgba(140,100,110,.12)'; circle(c, cx, cy + 20, 332); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 8; c.beginPath(); c.arc(cx, cy + 20, 418, 3.4, 4.9); c.stroke();
    // cuchara
    c.save(); c.translate(cx - 200, cy + 350); c.rotate(2.45);
    c.fillStyle = 'rgba(80,30,40,.3)'; c.beginPath(); c.ellipse(10, 14, 62, 44, 0, 0, TAU); c.fill(); L.rr(c, 10, 6, 330, 24, 12); c.fill();
    c.fillStyle = lin(c, 0, -40, 0, 40, [[0, '#ffffff'], [.5, '#c8cfda'], [1, '#8d96a6']]); c.beginPath(); c.ellipse(0, 0, 62, 44, 0, 0, TAU); c.fill(); L.rr(c, 0, -11, 330, 22, 11); c.fill();
    c.fillStyle = 'rgba(255,255,255,.65)'; c.beginPath(); c.ellipse(-12, -12, 30, 12, 0, 0, TAU); c.fill(); c.restore();
    // asa
    c.save(); c.translate(cx + 300, cy + 20); c.rotate(.18);
    c.fillStyle = 'rgba(80,30,40,.3)'; c.beginPath(); c.ellipse(10, 18, 128, 100, 0, 0, TAU); c.fill();
    c.strokeStyle = lin(c, -120, -100, 120, 100, [['0', '#ffffff'], ['1', '#e3d3cf']].map(a => [+a[0], a[1]])); c.lineWidth = 56; c.beginPath(); c.ellipse(0, 0, 100, 74, 0, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 8; c.beginPath(); c.ellipse(0, 0, 118, 90, 0, 3.6, 4.9); c.stroke(); c.restore();
    // taza
    shadowBlob(c, cx + 14, cy + 52, 330, 330, .4);
    c.fillStyle = lin(c, cx - 290, cy - 290, cx + 290, cy + 290, [[0, '#ffffff'], [.6, '#f4e9e4'], [1, '#d9c6c4']]); circle(c, cx, cy + 20, 296); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 8; c.beginPath(); c.arc(cx, cy + 20, 286, 3.5, 4.8); c.stroke();
    c.fillStyle = lin(c, cx - 250, cy - 250, cx + 250, cy + 250, [[0, '#cdb9b5'], [1, '#fff6ee']]); circle(c, cx, cy + 20, 262); c.fill();
    // café
    c.fillStyle = rad(c, cx - 40, cy - 20, 20, 260, [[0, '#a8683a'], [.55, '#7a4222'], [1, '#43200f']]); circle(c, cx, cy + 20, 246); c.fill();
    c.save(); circle(c, cx, cy + 20, 246); c.clip();
    c.strokeStyle = 'rgba(200,130,70,.55)'; c.lineWidth = 22; circle(c, cx, cy + 20, 236); c.stroke();
    // ondas de leche
    for (let i = 0; i < 3; i++) { const p = ((t + i / 3) % 1); c.strokeStyle = `rgba(255,235,205,${.3 * Math.sin(Math.PI * p)})`; c.lineWidth = 4; circle(c, cx, cy + 20, 30 + p * 220); c.stroke(); }
    // arte latte: corazón anidado (tulipán)
    c.translate(cx, cy + 14); c.rotate(.06 * wave(t, 1)); const br_ = 1 + .03 * wave(t, 1, .25); c.scale(br_, br_);
    const layers = 6;
    for (let i = 0; i < layers; i++) {
      const S = 9.4 * (1 - i * .15), ox = 7 * wave(t, 1, i * .09), oy = i * 8.6 * 0 + (i * 6);
      heartPath(c, S, ox * .0, oy - 8);
      c.fillStyle = i % 2 ? '#b8743e' : '#fff1da'; c.fill();
    }
    c.strokeStyle = '#fff1da'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -80); c.bezierCurveTo(10 * wave(t, 1, .1), -10, -10 * wave(t, 1, .3), 60, 0, 130); c.stroke();
    c.strokeStyle = '#b8743e'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -50); c.bezierCurveTo(8 * wave(t, 1, .1), 10, -8 * wave(t, 1, .3), 60, 0, 100); c.stroke();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(cx - 150, cy - 130, 70, 14, -.7, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy + 20, 262, 3.55, 4.35); c.stroke();
    // vapor
    [[cx - 120, cy - 120, 600, 60, .1, 34], [cx + 30, cy - 160, 660, 70, .45, 40], [cx + 150, cy - 110, 560, 55, .78, 32]].forEach(([x, y, l, a, ph, w]) => { wisp(c, x + 7, y + 8, l, a, t, 1, ph, w, .22, '190,70,110'); wisp(c, x, y, l, a, t, 1, ph, w, .55); });
    c.restore();
    // corazones que suben
    L.loopParticles(7, 41, t, (i, p, r) => { const x = cx + (r() - .5) * 360 + 36 * Math.sin(p * 7 + i), y = cy - 220 - p * 720, s = 1.2 + r() * 1.2; c.save(); c.globalAlpha = Math.sin(Math.PI * p) * .9; c.fillStyle = i % 2 ? '#fff6f0' : '#ff5c8a'; heartPath(c, s, x, y); c.fill(); c.restore(); });
  }

  SCENES['food-b'] = {
    topic: 'food', stillT: [.2, .6],
    cap: [
      { ca: 'Ramen ben calent i fideus per a tothom 🍜 #ramen #foodie', es: 'Ramen calentito y fideos para todos 🍜 #ramen #foodie', en: 'Hot ramen and noodles for everyone 🍜 #ramen #foodie' },
      { ca: 'Primer cafè i el cor ja somriu ☕ #latteart #cafè', es: 'Primer café y el corazón ya sonríe ☕ #latteart #cafe', en: 'First coffee and the heart is already smiling ☕ #latteart #coffee' }],
    draw(c, t, v) { if (v % 2 === 0) ramenScene(c, t); else latteScene(c, t); }
  };

  /* ═════════════════════════ FOOD-C : HAMBURGUESA EXPLOSIONADA / DÓNUT GIGANTE ═════════════════════════ */
  function rays(c, cx, cy, n, R, t, colA, colB) {
    // sunburst: n pares de rayos; gira 1/n de vuelta por bucle (bucle perfecto)
    const rot = t * TAU / n; c.save(); c.translate(cx, cy); c.rotate(rot);
    for (let i = 0; i < n; i++) { const a = i / n * TAU, b = (i + .5) / n * TAU; c.fillStyle = colA; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R, Math.sin(a) * R); c.lineTo(Math.cos(b) * R, Math.sin(b) * R); c.closePath(); c.fill(); }
    c.restore(); if (colB) { }
  }
  function dots(c, x0, y0, cols, rows, gap, r, col, fadeDir) {
    c.fillStyle = col; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = fadeDir ? (1 - j / rows) : 1; circle(c, x0 + i * gap + (j % 2 ? gap / 2 : 0), y0 + j * gap, r * k); c.fill(); }
  }
  function sparkle(c, x, y, s, col, a = 1) { c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x + s * .14, y - s * .14, x + s, y); c.quadraticCurveTo(x + s * .14, y + s * .14, x, y + s); c.quadraticCurveTo(x - s * .14, y + s * .14, x - s, y); c.quadraticCurveTo(x - s * .14, y - s * .14, x, y - s); c.fill(); c.restore(); }
  function squiggle(c, x, y, w, amp, col, lw, ph = 0) { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i <= 40; i++) { const px = x + i / 40 * w, py = y + amp * Math.sin(i / 40 * TAU * 2.5 + ph); i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }

  function burger(c, t, v) {
    const W = 1080, H = 1920, cx = 540;
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#2a3cff'], [.55, '#5b3cf0'], [1, '#8a2fe0']]); c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = .12; rays(c, cx, 880, 14, 2400, t, '#ffffff'); c.restore();
    halo(c, cx, 860, 760, '#ff9bd0', .5); halo(c, cx, 860, 420, '#ffd1a0', .35);
    dots(c, -20, 280, 7, 9, 60, 8, 'rgba(255,255,255,.22)', true); dots(c, 640, 1320, 8, 7, 60, 8, 'rgba(255,255,255,.2)', false);
    squiggle(c, 90, 400, 160, 14, '#ffe14a', 10, TAU * t); squiggle(c, 800, 1250, 170, 14, '#3ff2c9', 10, TAU * t + 1);
    // guía vertical discontinua
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 5; c.setLineDash([2, 22]); c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, 330); c.lineTo(cx, 1440); c.stroke(); c.setLineDash([]);
    c.save(); c.translate(cx, 880); c.scale(1.2, 1.2); c.translate(-cx, -880);
    // sombra del suelo
    shadowBlob(c, cx, 1500, 420, 54, .45);
    const bob = (i) => 9 * wave(t, 1, i * .09 + .1);
    const wob = (x, i, amp = 1) => amp * Math.sin(x * .045 + i * 2);
    const layers = [];
    // — pan inferior
    const y6 = 1320 + bob(6);
    const shade = (yb, rx) => { c.fillStyle = rad(c, cx, yb, 0, rx, [[0, 'rgba(30,5,60,.42)'], [1, 'rgba(30,5,60,0)']]); c.save(); c.translate(cx, yb); c.scale(1, .16); c.translate(-cx, -yb); circle(c, cx, yb, rx); c.fill(); c.restore(); };
    c.fillStyle = lin(c, 0, y6, 0, y6 + 100, [[0, '#f2a93c'], [1, '#c26f1c']]); c.beginPath(); c.moveTo(cx - 270, y6); c.lineTo(cx + 270, y6); c.lineTo(cx + 270, y6 + 50); c.quadraticCurveTo(cx + 270, y6 + 104, cx + 214, y6 + 104); c.lineTo(cx - 214, y6 + 104); c.quadraticCurveTo(cx - 270, y6 + 104, cx - 270, y6 + 50); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,235,170,.7)'; L.rr(c, cx - 250, y6 + 8, 500, 12, 6); c.fill(); c.fillStyle = 'rgba(255,255,255,.2)'; L.rr(c, cx - 250, y6 + 60, 140, 12, 6); c.fill();
    // — beicon
    const y5 = 1235 + bob(5); shade(y6 + 6, 260);
    [-1, 1].forEach((sgn, k) => {
      c.save(); c.translate(cx + sgn * 12, y5 + k * 18); c.beginPath(); for (let i = 0; i <= 60; i++) { const x = -290 + i / 60 * 580, y = 14 * Math.sin(i / 60 * TAU * 3 + k * 1.3) - 4; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(40,0,40,.3)'; c.lineWidth = 46; c.save(); c.translate(6, 12); c.stroke(); c.restore();
      c.strokeStyle = '#c63a3a'; c.lineWidth = 42; c.stroke(); c.strokeStyle = '#ffd3bd'; c.lineWidth = 14; c.save(); c.translate(0, -2); c.stroke(); c.restore();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 5; c.save(); c.translate(0, -14); c.stroke(); c.restore(); c.restore();
    });
    // — carne
    const y4 = 1062 + bob(4); shade(y5 + 20, 280);
    c.fillStyle = lin(c, 0, y4, 0, y4 + 120, [[0, '#8a4a2c'], [.5, '#5a2a18'], [1, '#2c120a']]); L.rr(c, cx - 275, y4, 550, 120, 56); c.fill();
    c.save(); L.rr(c, cx - 275, y4, 550, 120, 56); c.clip(); c.strokeStyle = 'rgba(20,6,2,.35)'; c.lineWidth = 12; for (let x = -300; x < 320; x += 56) { c.beginPath(); c.moveTo(cx + x, y4 - 10); c.lineTo(cx + x + 70, y4 + 130); c.stroke(); }
    const pg = rng(7); for (let i = 0; i < 70; i++) { c.fillStyle = i % 2 ? 'rgba(255,200,150,.25)' : 'rgba(0,0,0,.25)'; circle(c, cx - 260 + pg() * 520, y4 + 8 + pg() * 104, 2 + pg() * 3.5); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.2)'; L.rr(c, cx - 240, y4 + 10, 280, 12, 6); c.fill(); c.restore();
    // — queso
    const y3 = 958 + bob(3); shade(y4 + 6, 280);
    c.fillStyle = lin(c, 0, y3, 0, y3 + 40, [[0, '#ffd83d'], [1, '#f4a50a']]);
    L.rr(c, cx - 290, y3, 580, 38, 12); c.fill();
    [[-210, 78, 70], [-30, 108, 62], [150, 62, 66], [250, 96, 50]].forEach(([dx, len, w]) => { L.rr(c, cx + dx - w / 2, y3 + 14, w, len, w / 2); c.fill(); });
    c.fillStyle = 'rgba(255,255,255,.55)'; L.rr(c, cx - 270, y3 + 6, 400, 8, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; [[-210, 78, 70], [150, 62, 66]].forEach(([dx, len, w]) => { L.rr(c, cx + dx - w * .28, y3 + 30, 10, len * .5, 5); c.fill(); });
    // — tomate
    const y2 = 885 + bob(2); shade(y3 + 4, 270);
    [[-150, .35], [150, -.2]].forEach(([dx, rot], k) => { c.save(); c.translate(cx + dx, y2 + 12 * k); c.rotate(rot * .08);
      c.fillStyle = lin(c, 0, -26, 0, 26, [[0, '#ff6a52'], [1, '#d12a2a']]); L.rr(c, -140, -26, 280, 52, 26); c.fill();
      c.fillStyle = '#ff9a80'; L.rr(c, -122, -17, 244, 24, 12); c.fill(); c.fillStyle = '#ffd0b8'; for (let i = -4; i <= 4; i++) { L.rr(c, i * 26 - 7, -12, 14, 12, 6); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.55)'; L.rr(c, -120, -22, 70, 6, 3); c.fill(); c.restore(); });
    // — lechuga
    const y1 = 745 + bob(1); shade(y2 + 22, 300);
    c.beginPath(); for (let i = 0; i <= 90; i++) { const x = -320 + i / 90 * 640, y = -16 + 14 * Math.sin(x * .07) + 8 * Math.sin(x * .17 + 1); i ? c.lineTo(cx + x, y1 + y) : c.moveTo(cx + x, y1 + y); }
    for (let i = 90; i >= 0; i--) { const x = -320 + i / 90 * 640, y = 54 + 16 * Math.sin(x * .09 + 2) + 9 * Math.sin(x * .2); c.lineTo(cx + x, y1 + y); } c.closePath();
    c.fillStyle = lin(c, 0, y1 - 30, 0, y1 + 70, [[0, '#b7f06a'], [.5, '#62cf46'], [1, '#2f9b3a']]); c.fill();
    c.strokeStyle = 'rgba(220,255,160,.7)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i <= 90; i++) { const x = -320 + i / 90 * 640, y = -8 + 14 * Math.sin(x * .07) + 8 * Math.sin(x * .17 + 1); i ? c.lineTo(cx + x, y1 + y) : c.moveTo(cx + x, y1 + y); } c.stroke();
    c.strokeStyle = 'rgba(20,100,40,.35)'; c.lineWidth = 4; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(cx - 250 + i * 100, y1 + 14); c.quadraticCurveTo(cx - 230 + i * 100, y1 + 30, cx - 260 + i * 100 + 40, y1 + 46); c.stroke(); }
    // — pan superior
    const y0 = 625 + bob(0); shade(y1 + 8, 300);
    c.beginPath(); c.moveTo(cx - 280, y0); c.bezierCurveTo(cx - 290, y0 - 250, cx + 290, y0 - 250, cx + 280, y0); c.quadraticCurveTo(cx + 290, y0 + 30, cx + 240, y0 + 30); c.lineTo(cx - 240, y0 + 30); c.quadraticCurveTo(cx - 290, y0 + 30, cx - 280, y0); c.closePath();
    c.fillStyle = lin(c, cx - 220, y0 - 190, cx + 240, y0 + 20, [[0, '#ffcf62'], [.45, '#f0982d'], [1, '#c8661a']]); c.fill();
    c.save(); c.clip(); c.fillStyle = 'rgba(120,50,10,.25)'; c.fillRect(cx - 300, y0 + 4, 600, 40);
    c.fillStyle = rad(c, cx - 110, y0 - 130, 0, 190, [[0, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(cx - 300, y0 - 260, 600, 300); c.restore();
    const sg = rng(11 + v); for (let i = 0; i < 36; i++) { const a = Math.PI * (.06 + .88 * sg()), u = .2 + .68 * Math.sqrt(sg()); const sx = cx - Math.cos(a) * 255 * u, sy = y0 - 10 - Math.sin(a) * 175 * u; c.save(); c.translate(sx, sy); c.rotate(-Math.cos(a) * .9 + (sg() - .5) * .4); c.scale(1, .7 + .3 * Math.sin(a)); c.fillStyle = 'rgba(120,50,10,.35)'; c.beginPath(); c.ellipse(2, 4, 16, 7, 0, 0, TAU); c.fill(); c.fillStyle = '#fff1cf'; c.beginPath(); c.ellipse(0, 0, 16, 7, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(-4, -2, 6, 2.5, 0, 0, TAU); c.fill(); c.restore(); }
    c.restore();
    // ingredientes sueltos que flotan alrededor
    [[130, 640, 'ses'], [940, 760, 'tom'], [150, 1120, 'let'], [950, 1030, 'ses'], [160, 1460, 'tom'], [920, 1450, 'let']].forEach(([x, y, k], i) => {
      const px = x + 12 * wave(t, 1, i * .17), py = y + 16 * wave(t, 1, i * .13 + .3), r = i * 1.1 + .6 * wave(t, 1, i * .1);
      c.save(); c.translate(px, py); c.rotate(r);
      if (k === 'ses') { c.fillStyle = '#fff1cf'; c.beginPath(); c.ellipse(0, 0, 22, 10, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(-6, -3, 8, 3, 0, 0, TAU); c.fill(); }
      else if (k === 'tom') { c.fillStyle = '#ff4a3a'; circle(c, 0, 0, 30); c.fill(); c.fillStyle = '#ff9a80'; circle(c, 0, 0, 20); c.fill(); c.fillStyle = '#ffd0b8'; for (let q = 0; q < 4; q++) { c.beginPath(); c.ellipse(Math.cos(q * 1.57) * 9, Math.sin(q * 1.57) * 9, 6, 3.5, q * 1.57, 0, TAU); c.fill(); } }
      else { c.fillStyle = lin(c, -30, -20, 30, 20, [[0, '#b7f06a'], [1, '#2f9b3a']]); c.beginPath(); c.moveTo(-34, 4); c.quadraticCurveTo(-20, -30, 6, -20); c.quadraticCurveTo(36, -14, 30, 12); c.quadraticCurveTo(10, 30, -34, 4); c.fill(); }
      c.restore();
    });
    sparkle(c, 220, 520, 30, '#fff7b0', .5 + .5 * wave01(t, 2, .1)); sparkle(c, 880, 560, 24, '#ffffff', .5 + .5 * wave01(t, 2, .5)); sparkle(c, 930, 1200, 34, '#fff7b0', .5 + .5 * wave01(t, 2, .8)); sparkle(c, 120, 900, 22, '#ffffff', .5 + .5 * wave01(t, 2, .3));
  }

  function donut(c, t, v) {
    const W = 1080, H = 1920, cx = 540, cy = 880, RX = 440, RY = 350, TH = 74;
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#ffd23f'], [.6, '#ffb52e'], [1, '#ff9a2e']]); c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = .16; rays(c, cx, cy + 40, 12, 2400, t, '#fff6c0'); c.restore();
    c.fillStyle = lin(c, 0, cy - 560, 0, cy + 580, [[0, '#2fe0cd'], [1, '#0fa8b8']]); circle(c, cx, cy + 20, 560); c.fill(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 8; c.setLineDash([3, 26]); c.lineCap = 'round'; circle(c, cx, cy + 20, 590); c.stroke(); c.setLineDash([]);
    halo(c, cx, cy + 20, 560, '#7ff5e6', .5);
    dots(c, -20, 260, 7, 8, 64, 9, 'rgba(255,255,255,.35)', true); dots(c, 600, 1320, 8, 6, 64, 9, 'rgba(255,255,255,.3)', false);
    squiggle(c, 80, 1250, 190, 16, '#ff3d86', 12, TAU * t); squiggle(c, 800, 330, 190, 16, '#7a4dff', 12, TAU * t + 1.5);
    [[160, 560], [920, 1120], [880, 540], [140, 1010]].forEach(([x, y], i) => { c.strokeStyle = i % 2 ? '#7a4dff' : '#fff'; c.lineWidth = 10; c.lineCap = 'round'; const s = 22 + 4 * wave(t, 1, i * .2); c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke(); });
    const fy = 14 * wave(t, 1), dy = cy + fy;
    shadowBlob(c, cx, 1390, 440, 70, .38 - .06 * wave(t, 1));
    // costado
    c.fillStyle = lin(c, 0, dy, 0, dy + TH + 60, [[0, '#eba03e'], [1, '#c0711f']]);
    c.beginPath(); c.ellipse(cx, dy + TH, RX, RY, 0, 0, Math.PI, false); c.lineTo(cx - RX, dy); c.ellipse(cx, dy, RX, RY, 0, Math.PI, 0, true); c.closePath(); c.fill();
    // cara superior de masa
    const hx = cx + 4, hy = dy + 8, HX = 150, HY = 116;
    c.beginPath(); c.ellipse(cx, dy, RX, RY, 0, 0, TAU); c.ellipse(hx, hy, HX, HY, 0, 0, TAU, true);
    c.fillStyle = lin(c, cx - RX, dy - RY, cx + RX, dy + RY, [[0, '#f7b24c'], [1, '#d98428']]); c.fill('evenodd');
    // pared trasera del agujero
    c.save(); c.beginPath(); c.ellipse(hx, hy, HX, HY, 0, 0, TAU); c.clip();
    c.beginPath(); c.ellipse(hx, hy, HX + 4, HY + 4, 0, 0, TAU); c.ellipse(hx, hy + 56, HX + 4, HY + 4, 0, 0, TAU); c.fillStyle = lin(c, 0, hy - HY, 0, hy, [[0, '#8a4510'], [1, '#c77a2a']]); c.fill('evenodd'); c.restore();
    // glaseado con borde ondulado y gotas
    const gw = (a) => 1 + .045 * Math.sin(a * 7 + 1) + .03 * Math.sin(a * 11 + 2) + .02 * Math.sin(a * 17);
    const gp = (rx, ry, k, amp) => { c.beginPath(); for (let i = 0; i <= 160; i++) { const a = i / 160 * TAU, w = gw(a * k); let ox = Math.cos(a) * rx * w, oy = Math.sin(a) * ry * w; if (amp && Math.sin(a) > 0) { const d = Math.pow(Math.max(0, Math.sin(a * 9 + .5)), 6) * amp * Math.sin(a); oy += d; } i ? c.lineTo(cx + ox, dy + oy - 10) : c.moveTo(cx + ox, dy + oy - 10); } c.closePath(); };
    // sombra de glaseado sobre la masa
    c.save(); c.translate(0, 12); gp(RX - 18, RY - 18, 1, 40); c.ellipse(hx, hy - 12, HX, HY, 0, 0, TAU); c.fillStyle = 'rgba(120,40,10,.35)'; c.fill('evenodd'); c.restore();
    const GL = ['#ff7fae', '#ff3d86', '#ffb3cf'];
    c.beginPath(); for (let i = 0; i <= 160; i++) { const a = i / 160 * TAU, w = gw(a); let ox = Math.cos(a) * (RX - 18) * w, oy = Math.sin(a) * (RY - 18) * w; if (Math.sin(a) > 0) oy += Math.pow(Math.max(0, Math.sin(a * 9 + .5)), 6) * 40 * Math.sin(a); i ? c.lineTo(cx + ox, dy + oy - 10) : c.moveTo(cx + ox, dy + oy - 10); } c.closePath();
    c.moveTo(hx + (HX + 22), hy); for (let i = 160; i >= 0; i--) { const a = i / 160 * TAU, w = 1 + .05 * Math.sin(a * 5 + 2) + .03 * Math.sin(a * 9); c.lineTo(hx + Math.cos(a) * (HX + 22) * w, hy + Math.sin(a) * (HY + 18) * w); } c.closePath();
    c.fillStyle = lin(c, cx - 300, dy - 300, cx + 300, dy + 300, [[0, GL[0]], [1, GL[1]]]); c.fill('evenodd');
    c.save(); c.clip('evenodd');
    // volumen del glaseado
    c.fillStyle = rad(c, cx - 150, dy - 190, 20, 500, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(0, 0, W, H);
    c.fillStyle = lin(c, 0, dy, 0, dy + RY, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(150,0,70,.35)']]); c.fillRect(0, dy, W, RY + 60);
    // sprinkles
    const sp = rng(40 + v), cols = ['#ffe14a', '#ffffff', '#2dd4bf', '#7a4dff', '#ff9f1c'];
    let placed = 0, guard = 0; const pts = [];
    while (placed < 60 && guard++ < 4000) {
      const a = sp() * TAU, u = .26 + .66 * Math.sqrt(sp()), x = cx + Math.cos(a) * RX * u * .96, y = dy - 10 + Math.sin(a) * RY * u * .94;
      const nx = (x - hx) / (HX + 40), ny = (y - hy) / (HY + 34); if (nx * nx + ny * ny < 1) continue;
      if (pts.some(p => Math.hypot(p[0] - x, p[1] - y) < 52)) continue; pts.push([x, y]); placed++;
      const rot = sp() * Math.PI; c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, .82);
      c.fillStyle = 'rgba(0,0,0,.22)'; L.rr(c, -27 + 3, -8.5 + 5, 54, 17, 8.5); c.fill(); c.fillStyle = cols[placed % cols.length]; L.rr(c, -27, -8.5, 54, 17, 8.5); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; L.rr(c, -20, -5.5, 26, 5, 2.5); c.fill(); c.restore();
    }
    c.restore();
    // brillos del glaseado
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.ellipse(cx, dy - 10, RX - 70, RY - 68, 0, 3.55, 4.3); c.stroke();
    c.lineWidth = 10; c.beginPath(); c.ellipse(cx, dy - 10, RX - 70, RY - 68, 0, 4.45, 4.62); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 8; c.beginPath(); c.ellipse(hx, hy - 10, HX + 36, HY + 30, 0, 3.2, 3.9); c.stroke();
    // sprinkles flotando
    const FS = [[170, 640, 1.2, 0], [900, 520, 2.3, 1], [960, 1020, .4, 2], [120, 1140, 2.9, 3], [830, 1360, 1.6, 4], [260, 1380, .9, 0], [700, 380, 2.0, 1], [330, 430, .1, 2]];
    FS.forEach(([x, y, r, k], i) => { c.save(); c.translate(x + 10 * wave(t, 1, i * .13), y + 16 * wave(t, 1, i * .09 + .3)); c.rotate(r + .5 * wave(t, 1, i * .1)); c.fillStyle = 'rgba(0,0,0,.18)'; L.rr(c, -26 + 4, -8 + 8, 52, 16, 8); c.fill(); c.fillStyle = cols[k % cols.length]; L.rr(c, -26, -8, 52, 16, 8); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; L.rr(c, -19, -5, 24, 5, 2.5); c.fill(); c.restore(); });
    sparkle(c, 230, 520, 34, '#fff', .5 + .5 * wave01(t, 2, .1)); sparkle(c, 860, 1250, 28, '#fff', .5 + .5 * wave01(t, 2, .6)); sparkle(c, 960, 800, 24, '#fff', .5 + .5 * wave01(t, 2, .35)); sparkle(c, 500, 1470, 26, '#fff', .5 + .5 * wave01(t, 2, .85));
  }

  SCENES['food-c'] = {
    topic: 'food', stillT: [.25, .6],
    cap: [
      { ca: 'Hamburguesa en vista explosionada 🍔 #burger #foodie', es: 'Hamburguesa en vista explosionada 🍔 #burger #foodie', en: 'Burger in exploded view mode 🍔 #burger #foodie' },
      { ca: 'Dònut gegant ple de grageetes de colors 🍩 #donut #dolç', es: 'Dónut gigante lleno de sprinkles de colores 🍩 #donut #dulce', en: 'Giant donut loaded with colorful sprinkles 🍩 #donut #sweet' }],
    draw(c, t, v) { if (v % 2 === 0) burger(c, t, v); else donut(c, t, v); }
  };
})();
