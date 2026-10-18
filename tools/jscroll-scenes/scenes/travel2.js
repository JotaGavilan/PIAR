/* TRAVEL – b: ciudad nocturna con neón, tren que cruza un puente y río-espejo | c: isla tropical / bosque nevado con aurora (solo foto) */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, halo, circle, ellipse, rr, rng, mix, lerp, clamp, smooth, easeOut } = L;
  const W = 1080, H = 1920;

  /* ═════════════════════════ TRAVEL-B ═════════════════════════ */
  const TB = [
    { sky: ['#05061c', '#180f52', '#6a1f8f', '#ff5fa2'], far: '#4a2088', mid: '#27115a', near: '#0e0626', neon: ['#ff3fb4', '#35e6ff', '#ffe14a'], win: ['#ffe9a8', '#9fe9ff', '#ff9fd6'], moon: '#fff6e0', rim: '#a77bff', water: ['#2a0f5a', '#07041a'], rain: true, dir: 1, bridge: 'truss', seed: 100, mx: 850, my: 320, crescent: false },
    { sky: ['#03111b', '#0a3a4c', '#c8503a', '#ffb35a'], far: '#216a72', mid: '#0f3a48', near: '#06202b', neon: ['#ff8a3d', '#37f2d1', '#ff5fa2'], win: ['#ffe0a0', '#8ff5e0', '#ffb27a'], moon: '#ffe7b0', rim: '#6fe9d8', water: ['#0f4350', '#031219'], rain: false, dir: -1, bridge: 'arch', seed: 131, mx: 260, my: 470, crescent: true }
  ];
  const HZ = 1100, YD = 1300, WL = 1392;

  function genCity(layer, seed) {
    const cfg = [{ hmin: 200, hmax: 520, wmin: 60, wmax: 130 }, { hmin: 260, hmax: 700, wmin: 70, wmax: 150 }, { hmin: 180, hmax: 640, wmin: 90, wmax: 190 }][layer];
    const r = rng(seed + layer * 77), out = []; let x = -60;
    while (x < W + 60) {
      const w = cfg.wmin + r() * (cfg.wmax - cfg.wmin), h = cfg.hmin + Math.pow(r(), 1.5) * (cfg.hmax - cfg.hmin), tp = r(), ty = tp < .22 ? 'step' : tp < .42 ? 'spire' : 'flat';
      out.push({ x, w, h, ty, r: r() }); x += w * (.72 + .2 * r());
    }
    return out;
  }
  function drawWindows(c, P, b, top, t, layer, prob) {
    const cols = Math.max(1, Math.floor((b.w - 18) / 20)), rows = Math.max(0, Math.floor((HZ - top - 34) / 28));
    const r = rng(Math.floor(b.x * 7 + 11) + layer * 1000 + P.seed), ox = b.x + (b.w - cols * 20) / 2 + 5;
    const bins = [[], [], []], dim = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const u = r(), ci = Math.floor(r() * 3), fl = r(), ph = r();
      if (u > prob) continue; const x = ox + i * 20, y = top + 22 + j * 28;
      if (fl < .1) dim.push([x, y, ci, .12 + .88 * smooth(clamp(wave(t, 1 + ci, ph) * 2.5 + .5))]); else bins[ci].push([x, y]);
    }
    const sz = layer === 0 ? [6, 9] : [8, 13];
    c.globalAlpha = layer === 0 ? .55 : 1;
    bins.forEach((bn, ci) => { if (!bn.length) return; c.fillStyle = P.win[ci]; c.beginPath(); bn.forEach(([x, y]) => c.rect(x, y, sz[0], sz[1])); c.fill(); });
    dim.forEach(([x, y, ci, a]) => { c.globalAlpha = a * (layer === 0 ? .55 : 1); c.fillStyle = P.win[ci]; c.fillRect(x, y, sz[0], sz[1]); });
    c.globalAlpha = 1;
  }
  /* luna creciente: círculo A menos círculo B (polilínea, sin recortes) */
  function crescent(c, x, y, r1, bx, by, r2) {
    const d = Math.hypot(bx, by), ux = bx / d, uy = by / d, a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(r1 * r1 - a * a), px = -uy, py = ux;
    const P1 = [a * ux + h * px, a * uy + h * py], P2 = [a * ux - h * px, a * uy - h * py];
    const ang = (p, cx_, cy_) => Math.atan2(p[1] - cy_, p[0] - cx_), nrm = (v) => { while (v > Math.PI) v -= TAU; while (v < -Math.PI) v += TAU; return v; };
    c.beginPath();
    let s1 = ang(P1, 0, 0), dl = nrm(ang(P2, 0, 0) - s1); const target = Math.atan2(-uy, -ux); if (Math.abs(nrm(s1 + dl / 2 - target)) > 1.57) dl = dl > 0 ? dl - TAU : dl + TAU;
    for (let i = 0; i <= 50; i++) { const q = s1 + dl * i / 50; const px_ = x + Math.cos(q) * r1, py_ = y + Math.sin(q) * r1; i ? c.lineTo(px_, py_) : c.moveTo(px_, py_); }
    let s2 = ang(P2, bx, by), dl2 = nrm(ang(P1, bx, by) - s2); const t2 = Math.atan2(-uy, -ux); if (Math.abs(nrm(s2 + dl2 / 2 - t2)) > 1.57) dl2 = dl2 > 0 ? dl2 - TAU : dl2 + TAU;
    for (let i = 0; i <= 50; i++) { const q = s2 + dl2 * i / 50; c.lineTo(x + bx + Math.cos(q) * r2, y + by + Math.sin(q) * r2); }
    c.closePath();
  }
  function neon(c, t, col, a, f) { // f() traza el contorno; resplandor + núcleo blanco
    c.save(); c.globalAlpha = a; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = col; c.lineWidth = 9; f(); c.stroke(); c.globalAlpha = a * .35; c.lineWidth = 20; f(); c.stroke(); c.globalAlpha = a; c.strokeStyle = '#fff'; c.lineWidth = 3; f(); c.stroke(); c.restore();
  }
  function flick(t, ph, k = 3) { return .8 + .2 * wave(t, k, ph) - .55 * Math.pow(Math.max(0, wave(t, 5, ph + .3)), 14); }

  function bldg(c, P, b, color, rim, layer, t, hzOff = 0) {
    const top = HZ - b.h, x = b.x, w = b.w;
    c.fillStyle = lin(c, 0, top, 0, HZ, [[0, mix(color, P.sky[3], layer === 0 ? .22 : layer === 1 ? .1 : 0)], [1, color]]);
    c.beginPath(); c.rect(x, top, w, b.h + 14);
    if (b.ty === 'step') c.rect(x + w * .18, top - 56, w * .6, 58);
    c.fill();
    if (b.ty === 'spire') { c.beginPath(); c.moveTo(x + w * .5 - 7, top); c.lineTo(x + w * .5, top - 110 - b.r * 50); c.lineTo(x + w * .5 + 7, top); c.fill(); }
    // luz de borde (derecha) hacia la luna / ciudad
    c.fillStyle = rim; c.globalAlpha = layer === 0 ? .25 : layer === 1 ? .35 : .55; c.fillRect(x + w - 3, top, 3, b.h); c.fillRect(x, top, w, 2.5); c.globalAlpha = 1;
  }
  function world(c, t, v, P, off) {
    c.fillStyle = lin(c, 0, 0, 0, HZ, [[0, P.sky[0]], [.45, P.sky[1]], [.82, P.sky[2]], [1, P.sky[3]]]); c.fillRect(0, 0, W, HZ + 8);
    if (!off) L.stars(c, 150, 31 + v, t, { y1: 720, alpha: .85 });
    // luna
    const { mx, my } = P; halo(c, mx, my, 560, P.moon, .22 + .04 * wave(t, 1)); halo(c, mx, my, 250, P.moon, .45);
    c.save(); c.fillStyle = P.moon;
    if (P.crescent) { crescent(c, mx, my, 96, 52, -18, 88); c.fill(); }
    else { circle(c, mx, my, 96); c.fill(); c.fillStyle = 'rgba(190,170,200,.35)'; [[-30, -20, 22], [28, 18, 16], [-8, 40, 12], [40, -34, 10]].forEach(([dx, dy, r]) => { circle(c, mx + dx, my + dy, r); c.fill(); }); }
    c.restore();
    // nubes alargadas con borde iluminado por la ciudad
    for (let i = 0; i < 5; i++) { const x = ((i * 330 + t * (W + 600)) % (W + 600)) - 300, y = 560 + i * 82 + (i % 2) * 20, w = 300 + (i % 3) * 110, h = 24 + (i % 2) * 10; c.fillStyle = 'rgba(255,110,190,.16)'; rr(c, x - w / 2, y - h / 2, w, h, h / 2); c.fill(); c.fillStyle = 'rgba(255,255,255,.07)'; rr(c, x - w * .25, y - h / 2 - 8, w * .5, h, h / 2); c.fill(); }
    if (!off) { // avión / dron con luces intermitentes (cruza una vez por bucle)
      const px = lerp(-60, W + 60, t), py = 300 + 40 * Math.sin(t * Math.PI); const bl = wave01(t, 12); c.fillStyle = '#fff'; c.fillRect(px - 3, py - 1, 6, 3); c.fillStyle = `rgba(255,60,60,${.3 + .7 * bl})`; circle(c, px - 10, py, 3); c.fill(); halo(c, px - 10, py, 22, '#ff3d3d', .6 * bl); c.fillStyle = `rgba(80,255,160,${1 - bl * .8})`; circle(c, px + 10, py, 3); c.fill(); halo(c, px + 10, py, 22, '#46ffa0', .5 * (1 - bl)); }
    // ciudad: 3 capas
    const layers = [0, 1, 2].map(l => genCity(l, P.seed));
    const cols = [P.far, P.mid, P.near], probs = [.2, .3, .4];
    layers.forEach((arr, l) => {
      arr.forEach(b => { bldg(c, P, b, cols[l], P.rim, l, t); drawWindows(c, P, b, HZ - b.h, t, l, probs[l]); });
      if (l === 0) { c.fillStyle = lin(c, 0, HZ - 360, 0, HZ, [[0, 'rgba(255,100,170,0)'], [1, 'rgba(255,100,170,.22)']]); c.fillRect(0, HZ - 360, W, 366); }
      if (l === 1) { c.fillStyle = lin(c, 0, HZ - 300, 0, HZ, [[0, 'rgba(255,100,170,0)'], [1, 'rgba(255,100,170,.18)']]); c.fillRect(0, HZ - 300, W, 304); }
    });
    // rótulos de neón sobre edificios cercanos y medios (formas geométricas, sin texto)
    const near = layers[2], mid = layers[1];
    const pick = (arr, k) => arr[Math.min(arr.length - 1, Math.floor(arr.length * k))];
    // cartel vertical
    { const b = pick(near, .12 + v * .3), x = b.x + b.w * .5, y0 = HZ - b.h + 70, cA = P.neon[0], cB = P.neon[1];
      halo(c, x, y0 + 130, 190, cA, .28 * flick(t, .1));
      c.fillStyle = '#05020f'; rr(c, x - 36, y0 - 20, 72, 300, 12); c.fill();
      neon(c, t, cA, flick(t, .1), () => { c.beginPath(); rr(c, x - 36, y0 - 20, 72, 300, 12); });
      neon(c, t, cB, flick(t, .4), () => { c.beginPath(); c.arc(x, y0 + 28, 17, 0, TAU); });
      neon(c, t, cA, flick(t, .7), () => { c.beginPath(); c.moveTo(x - 17, y0 + 100); c.lineTo(x + 17, y0 + 100); c.lineTo(x, y0 + 68); c.closePath(); });
      neon(c, t, P.neon[2], flick(t, .25), () => { c.beginPath(); c.moveTo(x - 16, y0 + 140); c.lineTo(x + 6, y0 + 140); c.lineTo(x - 6, y0 + 178); c.lineTo(x + 16, y0 + 178); c.lineTo(x - 4, y0 + 224); });
      neon(c, t, cB, flick(t, .55), () => { c.beginPath(); c.moveTo(x - 18, y0 + 250); c.quadraticCurveTo(x - 9, y0 + 232, x, y0 + 250); c.quadraticCurveTo(x + 9, y0 + 268, x + 18, y0 + 250); }); }
    // anillo en azotea
    { const b = pick(mid, .6 - v * .25), x = b.x + b.w * .5, y = HZ - b.h - 90, cA = P.neon[1];
      halo(c, x, y, 150, cA, .3 * flick(t, .6)); c.strokeStyle = '#07041a'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y + 44); c.lineTo(x, HZ - b.h); c.stroke();
      neon(c, t, cA, flick(t, .6), () => { c.beginPath(); c.arc(x, y, 44, 0, TAU); });
      neon(c, t, P.neon[0], flick(t, .85), () => { c.beginPath(); c.moveTo(x - 14, y - 20); c.lineTo(x + 24, y); c.lineTo(x - 14, y + 20); c.closePath(); }); }
    // valla publicitaria con barras animadas
    { const b = pick(near, .72 + v * .1), bx = b.x + b.w * .5 - 105, by = HZ - b.h - 150, bw = 210, bh = 104;
      halo(c, bx + bw / 2, by + bh / 2, 200, P.neon[0], .3);
      c.fillStyle = '#05020f'; rr(c, bx - 6, by - 6, bw + 12, bh + 12, 8); c.fill(); c.strokeStyle = '#07041a'; c.lineWidth = 8; c.beginPath(); c.moveTo(bx + 40, by + bh + 4); c.lineTo(bx + 40, HZ - b.h + 6); c.moveTo(bx + bw - 40, by + bh + 4); c.lineTo(bx + bw - 40, HZ - b.h + 6); c.stroke();
      c.save(); rr(c, bx, by, bw, bh, 4); c.clip(); c.fillStyle = lin(c, bx, by, bx + bw, by + bh, [[0, P.neon[0]], [1, P.neon[1]]]); c.fillRect(bx, by, bw, bh);
      c.fillStyle = 'rgba(255,255,255,.28)'; for (let k = 0; k < 8; k++) { const x = bx - 40 + ((k * 36 + t * 72) % 288); c.beginPath(); c.moveTo(x, by); c.lineTo(x + 16, by); c.lineTo(x + 16 - 30, by + bh); c.lineTo(x - 30, by + bh); c.fill(); }
      c.fillStyle = '#fff'; circle(c, bx + bw / 2, by + bh / 2, 22 + 3 * wave(t, 2)); c.fill(); c.fillStyle = P.neon[2]; circle(c, bx + bw / 2, by + bh / 2, 12); c.fill(); c.restore(); }
    // luces de aviso rojas en torres altas
    near.concat(mid).filter(b => b.ty === 'spire').forEach((b, i) => { const x = b.x + b.w / 2, y = HZ - b.h - 110 - b.r * 50, a = wave01(t, 2, i * .3); halo(c, x, y, 30, '#ff3d3d', .8 * a); c.fillStyle = `rgba(255,70,70,${.4 + .6 * a})`; circle(c, x, y, 3.5); c.fill(); });
    // neblina cálida a nivel de agua
    c.fillStyle = lin(c, 0, HZ - 120, 0, HZ + 8, [[0, 'rgba(255,110,180,0)'], [1, 'rgba(255,110,180,.34)']]); c.fillRect(0, HZ - 120, W, 128);
  }

  function trainDraw(c, t, P) {
    const CARW = 280, GAP = 12, N = 5, NOSE = 70, TL = N * (CARW + GAP) + NOSE;
    const S = 1.45, headX = lerp(-640, W / S + TL + 40, t), y0 = YD - 112, h = 100;
    c.save(); c.translate(0, YD); c.scale(S, S); c.translate(0, -YD);
    for (let k = N - 1; k >= 0; k--) {
      const head = k === 0, x1 = headX - k * (CARW + GAP), x0 = x1 - CARW - (head ? NOSE : 0), len = CARW + (head ? NOSE : 0);
      if (x1 < -60 || x0 > W + 60) continue;
      c.beginPath();
      if (head) { c.moveTo(x0 + 20, y0); c.lineTo(x0 + len - 96, y0); c.bezierCurveTo(x0 + len - 36, y0 + 2, x0 + len + 2, y0 + 46, x0 + len, y0 + h - 8); c.lineTo(x0 + len - 12, y0 + h); c.lineTo(x0 + 18, y0 + h); c.quadraticCurveTo(x0, y0 + h, x0, y0 + h - 18); c.lineTo(x0, y0 + 20); c.quadraticCurveTo(x0, y0, x0 + 20, y0); }
      else { rr(c, x0, y0, len, h, 20); }
      c.fillStyle = lin(c, 0, y0, 0, y0 + h, [[0, '#4a3a9a'], [.35, '#241a5c'], [1, '#100830']]); c.fill();
      // luz de borde superior y banda de neón
      c.save(); c.clip(); c.fillStyle = 'rgba(190,160,255,.55)'; c.fillRect(x0, y0, len, 3); c.fillStyle = P.neon[1]; c.fillRect(x0, y0 + h - 24, len, 5); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x0, y0 + h - 18, len, 18); c.restore();
      halo(c, x0 + len / 2, y0 + h - 21, len * .5, P.neon[1], .12);
      // ventanillas iluminadas con siluetas
      const nW = head ? 8 : 7, r = rng(500 + k * 13 + P.seed);
      for (let i = 0; i < nW; i++) {
        const wx = x0 + 18 + i * (len - 40) / nW, wy = y0 + 18, ww = (len - 40) / nW - 10, wh = 36; if (head && i === nW - 1) continue;
        halo(c, wx + ww / 2, wy + wh / 2, 46, '#ffc46b', .22);
        c.fillStyle = lin(c, 0, wy, 0, wy + wh, [[0, '#fff1c4'], [1, '#ffb25e']]); rr(c, wx, wy, ww, wh, 7); c.fill();
        if (r() < .5) { c.fillStyle = 'rgba(70,30,80,.85)'; circle(c, wx + ww * (.3 + r() * .4), wy + 22, 6); c.fill(); rr(c, wx + 3, wy + 26, ww - 6, 12, 6); c.fill(); }
        c.fillStyle = 'rgba(20,10,50,.5)'; c.fillRect(wx + ww + 5 - 1, y0 + 8, 2, h - 30);
      }
      c.fillStyle = '#07041a'; [[40], [76], [len - 76], [len - 40]].forEach(([dx]) => { circle(c, x0 + dx, YD - 6, 9); c.fill(); });
      if (!head) { c.fillStyle = '#0a0520'; c.fillRect(x0 + len, y0 + 60, GAP, 8); }
      if (k === N - 1) { halo(c, x0 + 4, y0 + h - 30, 36, '#ff3d3d', .8); c.fillStyle = '#ff5050'; circle(c, x0 + 4, y0 + h - 30, 4); c.fill(); }
      if (head) { const hx = x0 + len - 6, hy = y0 + h - 34; c.save(); c.fillStyle = lin(c, hx, 0, hx + 520, 0, [[0, 'rgba(255,245,210,.5)'], [1, 'rgba(255,245,210,0)']]); c.beginPath(); c.moveTo(hx, hy - 6); c.lineTo(hx + 520, hy - 90); c.lineTo(hx + 520, hy + 80); c.lineTo(hx, hy + 6); c.closePath(); c.fill(); c.restore(); halo(c, hx, hy, 150, '#fff3c8', .75); c.fillStyle = '#fff'; circle(c, hx - 2, hy, 6); c.fill(); }
    }
    c.restore();
  }
  function bridgeDraw(c, t, v, P, front) {
    // pilas
    const piers = P.bridge === 'truss' ? [190, 540, 890] : [330, 750];
    piers.forEach(px => {
      c.fillStyle = lin(c, px - 45, 0, px + 45, 0, [[0, '#0a0524'], [.7, '#140a3a'], [1, '#2a1a66']]); c.beginPath(); c.moveTo(px - 42, YD + 30); c.lineTo(px + 42, YD + 30); c.lineTo(px + 50, WL + 6); c.lineTo(px - 50, WL + 6); c.closePath(); c.fill();
      c.fillStyle = 'rgba(160,120,255,.35)'; c.fillRect(px + 38, YD + 30, 3, WL - YD - 24);
      halo(c, px, YD + 44, 90, P.neon[1], .35); c.fillStyle = P.neon[1]; c.fillRect(px - 30, YD + 34, 60, 3);
    });
    trainDraw(c, t, P);
    const dark = '#07031a';
    // tablero
    c.fillStyle = dark; c.fillRect(-10, YD, W + 20, 32); c.fillStyle = '#1b0f48'; c.fillRect(-10, YD - 3, W + 20, 5);
    c.fillStyle = 'rgba(160,120,255,.5)'; c.fillRect(-10, YD + 32, W + 20, 2);
    c.fillStyle = dark; for (let x = -10; x < W + 40; x += 60) { c.beginPath(); c.moveTo(x, YD + 32); c.lineTo(x + 30, YD + 56); c.lineTo(x + 60, YD + 32); c.fill(); }
    c.strokeStyle = dark; c.lineCap = 'butt';
    if (P.bridge === 'truss') {
      const TOP = YD - 260; c.lineWidth = 12;
      c.beginPath(); for (let x = -40; x < W + 200; x += 180) { c.moveTo(x, YD); c.lineTo(x, TOP); c.moveTo(x, YD); c.lineTo(x + 90, TOP); c.moveTo(x + 180, YD); c.lineTo(x + 90, TOP); } c.stroke();
      c.lineWidth = 20; c.beginPath(); c.moveTo(-10, TOP); c.lineTo(W + 10, TOP); c.stroke();
      c.fillStyle = 'rgba(170,130,255,.65)'; c.fillRect(-10, TOP - 8, W + 20, 2.5);
      for (let x = -40; x < W + 200; x += 180) { halo(c, x + 90, TOP + 16, 60, P.neon[2], .55); c.fillStyle = '#fff6c8'; circle(c, x + 90, TOP + 16, 4.5); c.fill(); }
    } else {
      const TOP = YD - 300; const ay = (x) => { const u = (x + 20) / (W + 40); return YD - (YD - TOP) * 4 * u * (1 - u); };
      c.lineWidth = 6; c.beginPath(); for (let x = 30; x < W; x += 80) { c.moveTo(x, ay(x)); c.lineTo(x, YD); } c.stroke();
      c.lineWidth = 24; c.beginPath(); for (let i = 0; i <= 60; i++) { const x = -20 + i / 60 * (W + 40); i ? c.lineTo(x, ay(x)) : c.moveTo(x, ay(x)); } c.stroke();
      c.strokeStyle = 'rgba(111,233,216,.7)'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i <= 60; i++) { const x = -20 + i / 60 * (W + 40); i ? c.lineTo(x, ay(x) - 11) : c.moveTo(x, ay(x) - 11); } c.stroke();
      for (let x = 30; x < W; x += 140) { halo(c, x, ay(x) + 4, 46, P.neon[0], .5); c.fillStyle = '#fff1d6'; circle(c, x, ay(x) + 10, 3.5); c.fill(); }
    }
  }

  let OFF = null;
  SCENES['travel-b'] = {
    topic: 'travel', stillT: [.38, .66],
    cap: [
      { ca: 'El tren de les 23:00 creua el pont entre neons 🚆 #viatges #nit', es: 'El tren de las 23:00 cruza el puente entre neones 🚆 #viajes #noche', en: 'The 11 pm train crosses the bridge through the neon 🚆 #travel #night' },
      { ca: 'Una lluna, un pont i cap pressa 🌙 #viatges #tren', es: 'Una luna, un puente y ninguna prisa 🌙 #viajes #tren', en: 'One moon, one bridge, zero rush 🌙 #travel #train' }],
    draw(c, t, v) {
      const P = TB[v % TB.length], tt = P.dir > 0 ? t : 1 - t;
      world(c, t, v, P, false);
      // agua
      c.fillStyle = lin(c, 0, HZ, 0, H, [[0, P.water[0]], [1, P.water[1]]]); c.fillRect(0, HZ, W, H - HZ);
      if (!OFF) { OFF = document.createElement('canvas'); OFF.width = 540; OFF.height = 416; }
      const o = OFF.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, 540, 416); o.setTransform(.5, 0, 0, .5, 0, -150); o.save(); world(o, t, v, P, true); o.restore(); o.setTransform(1, 0, 0, 1, 0, 0);
      for (let y = HZ; y < H; y += 4) {
        const d = y - HZ, sy = (2 * HZ - y - 4 - 300) * .5; if (sy < 0) break;
        const dx = (4 + d * .018) * wave(t, 2, d / 140) + 2.5 * wave(t, 3, d / 60 + .3);
        c.globalAlpha = clamp(.78 - d / 1000, .12, .78); c.drawImage(OFF, 0, sy, 540, 2, dx - 12, y, W + 24, 4);
      }
      c.globalAlpha = 1;
      // reflejo de la luna: estela de destellos
      { const r = rng(7 + v); for (let i = 0; i < 46; i++) { const y = HZ + 20 + Math.pow(r(), 1.4) * 480, wd = 30 + r() * 90, x = P.mx + (r() - .5) * (60 + (y - HZ) * .35), ph = r(); const a = clamp(.6 - (y - HZ) / 900, .08, .6) * (.3 + .7 * wave01(t, 2, ph)); c.fillStyle = hexA(P.moon, a); rr(c, x + 16 * wave(t, 1, ph) - wd / 2, y, wd, 3 + (y - HZ) * .005, 2); c.fill(); } }
      // reflejo del puente y tren
      c.save(); c.beginPath(); c.rect(0, WL, W, H - WL); c.clip(); c.globalAlpha = .5; c.translate(0, 2 * WL); c.scale(1, -1);
      if (P.dir < 0) { c.translate(W, 0); c.scale(-1, 1); } bridgeDraw(c, tt, v, P, false); c.restore();
      c.save(); c.beginPath(); c.rect(0, WL, W, H - WL); c.clip();
      // ondas que rompen el reflejo
      c.fillStyle = P.water[0]; for (let i = 0; i < 40; i++) { const y = WL + 4 + i * 11 + 4 * wave(t, 1, i * .09), w2 = 200 + 400 * ((i * 37) % 11) / 11; c.globalAlpha = .45; c.fillRect(((i * 211) % 1080) - 100 + 30 * wave(t, 1, i * .05), y, w2, 3 + (i % 3)); }
      c.globalAlpha = 1; c.fillStyle = lin(c, 0, WL, 0, H, [[0, 'rgba(5,3,25,0)'], [.6, 'rgba(5,3,25,.55)'], [1, 'rgba(3,2,14,.92)']]); c.fillRect(0, WL, W, H - WL);
      c.restore();
      // puente y tren
      c.save(); if (P.dir < 0) { c.translate(W, 0); c.scale(-1, 1); } bridgeDraw(c, tt, v, P, true); c.restore();
      // espuma en los pilares
      const piers = P.bridge === 'truss' ? [190, 540, 890] : [330, 750];
      piers.forEach((px, i) => { c.strokeStyle = 'rgba(200,190,255,.35)'; c.lineWidth = 3; for (let k = 0; k < 2; k++) { const p = (t + k / 2 + i * .2) % 1; ellipse(c, px, WL + 8, 56 + p * 60, 10 + p * 12); c.globalAlpha = 1 - p; c.stroke(); c.globalAlpha = 1; } });
      // lluvia ligera y ondas
      if (P.rain) {
        c.strokeStyle = 'rgba(200,210,255,.22)'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); const r = rng(91);
        for (let i = 0; i < 70; i++) { const p = ((t * 3 + r()) % 1), x0 = r() * (W + 300), y = -80 + p * (H + 160), x = x0 - p * 120 - 150; c.moveTo(x, y); c.lineTo(x - 9, y + 46); }
        c.stroke();
        const rg = rng(19); for (let i = 0; i < 16; i++) { const p = ((t * 2 + rg()) % 1), x = rg() * W, y = 1420 + rg() * 170; c.strokeStyle = `rgba(210,220,255,${.5 * (1 - p)})`; c.lineWidth = 2; ellipse(c, x, y, 6 + p * 34, 2 + p * 9); c.stroke(); }
      } else {
        // luciérnagas / farolillos que suben
        L.loopParticles(18, 71, t, (i, p, r) => { const x = r() * W, y = 1500 - p * 1200, a = Math.sin(Math.PI * p); halo(c, x + 26 * Math.sin(p * 6 + i), y, 22, i % 2 ? P.neon[0] : P.neon[2], .7 * a); });
      }
      L.vignette(c, W, H, .5);
    }
  };
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

  /* ═════════════════════════ TRAVEL-C : ISLA TROPICAL / CABAÑA CON AURORA (solo foto) ═════════════════════════ */
  function frond(c, x, y, th, len, droop, cols, nl, wob) {
    const N = 18, pts = [];
    for (let i = 0; i <= N; i++) { const s = i / N; pts.push([x + Math.cos(th) * len * s, y + Math.sin(th) * len * s + droop * s * s + wob * Math.sin(s * 3) * len * .02, s]); }
    c.lineCap = 'round';
    for (let i = 2; i <= N; i++) {
      const [px, py, s] = pts[i], dx = Math.cos(th) * len, dy = Math.sin(th) * len + 2 * droop * s, phi = Math.atan2(dy, dx), ll = len * .3 * (1 - .72 * s);
      for (let sd = -1; sd <= 1; sd += 2) {
        const a = phi + sd * (1.05 - .25 * s), tx = px + Math.cos(a) * ll, ty = py + Math.sin(a) * ll + ll * .45;
        c.strokeStyle = i % 2 ? cols[0] : cols[1]; c.lineWidth = Math.max(3, ll * .1 + 2);
        c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo((px + tx) / 2 + sd * 2, (py + ty) / 2 - ll * .12, tx, ty); c.stroke();
      }
    }
    c.strokeStyle = cols[2]; c.lineWidth = Math.max(3, len * .018); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
  }
  function palm(c, x, y, o) {
    const { h, lean, w0, w1, fl, n, seed } = o, cx1 = x + lean * .15, cy1 = y - h * .62, tx = x + lean, ty = y - h, N = 20; let prev = [x, y];
    for (let i = 1; i <= N; i++) {
      const s = i / N, px = (1 - s) * (1 - s) * x + 2 * (1 - s) * s * cx1 + s * s * tx, py = (1 - s) * (1 - s) * y + 2 * (1 - s) * s * cy1 + s * s * ty, w = lerp(w0, w1, s);
      c.lineCap = 'butt'; c.strokeStyle = i % 2 ? o.trunk[0] : o.trunk[1]; c.lineWidth = w; c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(px, py); c.stroke();
      c.strokeStyle = 'rgba(40,20,5,.35)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(px - w * .5, py + 1); c.lineTo(px + w * .5, py - 1); c.stroke(); prev = [px, py];
    }
    c.strokeStyle = o.rim; c.lineWidth = Math.max(2, w1 * .12); c.globalAlpha = .5; c.beginPath(); for (let i = 0; i <= N; i++) { const s = i / N, px = (1 - s) * (1 - s) * x + 2 * (1 - s) * s * cx1 + s * s * tx + lerp(w0, w1, s) * .33, py = (1 - s) * (1 - s) * y + 2 * (1 - s) * s * cy1 + s * s * ty; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); c.globalAlpha = 1;
    const r = rng(seed);
    for (let k = 0; k < n; k++) { const u = k / (n - 1), th = -Math.PI + Math.PI * u + (r() - .5) * .22, back = k % 2 ? 0 : 1; frond(c, tx, ty, th, fl * (.82 + .3 * r()), fl * (.18 + .38 * Math.abs(Math.cos(th))), back ? o.leafB : o.leafA, 0, r() - .5); }
    // cocos
    c.fillStyle = '#5a3a1e'; [[-14, 12], [10, 16], [0, 24]].forEach(([dx, dy]) => { circle(c, tx + dx, ty + dy + w1 * .3, w1 * .3); c.fill(); });
    c.fillStyle = 'rgba(255,255,255,.3)'; circle(c, tx - 18, ty + 8 + w1 * .3, w1 * .08); c.fill();
  }
  function boat(c, x, y, s, t) {
    c.save(); c.translate(x, y + 5 * wave(t, 1)); c.rotate(.03 * wave(t, 1, .2)); c.scale(s, s);
    c.fillStyle = '#ff5a4a'; c.beginPath(); c.moveTo(-70, 0); c.lineTo(80, 0); c.lineTo(58, 26); c.lineTo(-48, 26); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.fillRect(-64, 6, 138, 5);
    c.strokeStyle = '#6b4b32'; c.lineWidth = 5; c.beginPath(); c.moveTo(4, 0); c.lineTo(4, -190); c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(10, -184); c.quadraticCurveTo(70, -90, 74, -12); c.lineTo(10, -12); c.closePath(); c.fill();
    c.fillStyle = '#ffd7a0'; c.beginPath(); c.moveTo(-2, -160); c.quadraticCurveTo(-40, -80, -60, -12); c.lineTo(-2, -12); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,170,100,.35)'; c.beginPath(); c.moveTo(10, -184); c.quadraticCurveTo(70, -90, 74, -12); c.lineTo(46, -12); c.quadraticCurveTo(44, -100, 10, -184); c.fill();
    c.fillStyle = '#ff5a4a'; c.beginPath(); c.moveTo(4, -190); c.lineTo(32, -180); c.lineTo(4, -170); c.closePath(); c.fill();
    c.restore();
  }
  function wispS(c, x0, y0, len, amp, t, ph, w, alpha, col) {
    const N = 30, L_ = [], R_ = [];
    for (let i = 0; i <= N; i++) { const s = i / N, x = x0 + amp * Math.sin(TAU * (s * 1.1 - t + ph)) * (.2 + s), y = y0 - s * len, ww = w * (.4 + 1.2 * s); L_.push([x - ww, y]); R_.push([x + ww, y]); }
    c.beginPath(); L_.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); for (let i = N; i >= 0; i--) c.lineTo(R_[i][0], R_[i][1]); c.closePath();
    c.fillStyle = lin(c, 0, y0, 0, y0 - len, [[0, `rgba(${col},${alpha})`], [1, `rgba(${col},0)`]]); c.fill();
  }

  function island(c, t) {
    const HZ_ = 880;
    c.fillStyle = lin(c, 0, 0, 0, HZ_, [[0, '#1f9bf0'], [.5, '#6fd4ff'], [.85, '#c8f1ff'], [1, '#fff0c0']]); c.fillRect(0, 0, W, HZ_ + 4);
    // sol con rayos
    const sx = 790, sy = 500;
    c.save(); c.globalCompositeOperation = 'screen'; halo(c, sx, sy, 760, '#ffd98a', .55); halo(c, sx, sy, 330, '#fff1b0', .9); c.restore();
    c.save(); c.globalCompositeOperation = 'screen'; c.translate(sx, sy); c.rotate(t * TAU * .02); c.fillStyle = 'rgba(255,240,190,.20)'; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 1500, Math.sin(a) * 1500); c.lineTo(Math.cos(a + .09) * 1500, Math.sin(a + .09) * 1500); c.closePath(); c.fill(); } c.restore();
    c.fillStyle = '#fffbe3'; circle(c, sx, sy, 112); c.fill(); c.fillStyle = '#fff'; circle(c, sx, sy, 90); c.fill();
    // nubes
    L.cloud(c, 80, 420 + 8 * wave(t, 1), 1.5, '#ffffff', .95); L.cloud(c, 560, 330 + 6 * wave(t, 1, .3), 1.1, '#ffffff', .9); L.cloud(c, 800, 740, .8, '#ffffff', .8);
    c.fillStyle = 'rgba(140,200,240,.25)'; [[150, 462, 120], [610, 366, 90]].forEach(([x, y, w]) => { rr(c, x, y, w * 1.3, 14, 7); c.fill(); });
    // aves
    [[560, 520], [610, 500], [520, 548], [470, 590]].forEach(([x, y], i) => { c.strokeStyle = '#27506e'; c.lineWidth = 4; c.lineCap = 'round'; const f = wave(t, 1, i * .13); c.beginPath(); c.moveTo(x - 22, y + 2 - 8 * f); c.quadraticCurveTo(x - 9, y - 12 * f - 3, x, y + 2); c.quadraticCurveTo(x + 9, y - 12 * f - 3, x + 22, y + 2 - 8 * f); c.stroke(); });
    // mar
    c.fillStyle = lin(c, 0, HZ_, 0, H, [[0, '#0a7fb6'], [.25, '#0fa7c8'], [.55, '#22d4cc'], [1, '#9ff6df']]); c.fillRect(0, HZ_, W, H - HZ_);
    c.fillStyle = lin(c, 0, HZ_ - 4, 0, HZ_ + 70, [[0, 'rgba(255,245,200,.55)'], [1, 'rgba(255,245,200,0)']]); c.fillRect(0, HZ_ - 4, W, 74);
    // bandas de profundidad
    c.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 5; i++) { const y = HZ_ + 90 + i * 150; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= W; x += 20) c.lineTo(x, y + 12 * Math.sin(x * .01 + i * 2 + TAU * t) + 6 * Math.sin(x * .027 + i)); c.lineTo(W, y + 60 + i * 12); c.lineTo(0, y + 60 + i * 12); c.closePath(); c.fill(); }
    // destellos del sol
    const gr = rng(5); for (let i = 0; i < 70; i++) { const y = HZ_ + 14 + Math.pow(gr(), 1.5) * 560, wd = 24 + gr() * 120 * (.4 + (y - HZ_) / 600), x = sx + (gr() - .5) * (80 + (y - HZ_) * .5), a = clamp(.85 - (y - HZ_) / 760, .1, .85) * (.5 + .5 * wave01(t, 2, gr())); c.fillStyle = `rgba(255,255,235,${a})`; rr(c, x - wd / 2, y, wd, 3 + (y - HZ_) * .006, 2); c.fill(); }
    // laguna poco profunda + isla
    const ix = 470, iy = 1020;
    c.save(); c.translate(ix, iy); c.scale(1, .2); c.fillStyle = rad(c, 0, 0, 0, 460, [[0, 'rgba(190,255,235,.95)'], [.6, 'rgba(120,245,220,.7)'], [1, 'rgba(60,220,210,0)']]); circle(c, 0, 0, 460); c.fill(); c.restore();
    c.save(); c.translate(ix, iy + 6); c.scale(1, .17); c.fillStyle = 'rgba(255,255,255,.85)'; circle(c, 0, 0, 330); c.fill(); c.restore();
    c.save(); c.translate(ix, iy); c.scale(1, .15); c.fillStyle = lin(c, 0, -300, 0, 300, [[0, '#fff2c4'], [1, '#f6cf86']]); circle(c, 0, 0, 305); c.fill(); c.restore();
    // colina verde
    c.fillStyle = lin(c, 0, 840, 0, 1020, [[0, '#45d46c'], [.6, '#1f9a52'], [1, '#157443']]); c.beginPath(); c.moveTo(218, 1018); c.bezierCurveTo(260, 930, 370, 850, 470, 858); c.bezierCurveTo(580, 850, 670, 930, 725, 1018); c.bezierCurveTo(620, 1040, 320, 1040, 218, 1018); c.closePath(); c.fill();
    c.fillStyle = 'rgba(10,80,50,.35)'; c.beginPath(); c.moveTo(470, 858); c.bezierCurveTo(580, 850, 670, 930, 725, 1018); c.bezierCurveTo(640, 1030, 540, 1034, 470, 1030); c.bezierCurveTo(520, 960, 520, 900, 470, 858); c.fill();
    c.fillStyle = 'rgba(190,255,150,.35)'; c.beginPath(); c.ellipse(390, 915, 70, 22, -.5, 0, TAU); c.fill();
    const PC = { trunk: ['#8a5a33', '#6f4426'], rim: '#ffd9a0', leafA: ['#37c15a', '#2aa74a', '#1d7a36'], leafB: ['#1e8f45', '#17773a', '#125e2d'] };
    palm(c, 395, 930, { ...PC, h: 120, lean: -30, w0: 10, w1: 6, fl: 76, n: 8, seed: 3 }); palm(c, 560, 940, { ...PC, h: 100, lean: 40, w0: 9, w1: 5, fl: 66, n: 8, seed: 4 }); palm(c, 475, 900, { ...PC, h: 168, lean: 24, w0: 12, w1: 7, fl: 92, n: 9, seed: 5 });
    // espuma en la orilla de la isla
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.beginPath(); c.ellipse(ix, iy + 14, 330, 52, 0, .1, Math.PI - .1); c.stroke();
    c.globalAlpha = .5; c.lineWidth = 2; c.beginPath(); c.ellipse(ix, iy + 24, 360, 62, 0, .15, Math.PI - .15); c.stroke(); c.globalAlpha = 1;
    // velero y reflejo
    boat(c, 840, 1140, 1.05, t);
    c.save(); c.beginPath(); c.rect(600, 1172, 500, 100); c.clip(); c.globalAlpha = .22; c.translate(0, 2 * 1165); c.scale(1, -1); boat(c, 840, 1140, 1.05, t); c.restore();
    // olas
    for (let i = 0; i < 20; i++) {
      const u = i / 20, y = HZ_ + 110 + Math.pow(u, 1.5) * 560, amp = 3 + u * 12, wl = 80 + u * 180, ph = i * 1.7 + TAU * t * (i % 2 ? 1 : -1);
      c.strokeStyle = `rgba(255,255,255,${.12 + .5 * u * .8})`; c.lineWidth = 2 + u * 5; c.lineCap = 'round'; c.beginPath();
      for (let x = -20; x <= W + 20; x += 14) { const yy = y + amp * Math.sin(x / wl * TAU + ph); x < -19 ? c.moveTo(x, yy) : c.lineTo(x, yy); }
      c.save(); c.beginPath(); c.rect(((i * 311) % 700) - 100, 0, 380 + (i % 3) * 140, H); c.clip(); c.beginPath(); for (let x = -20; x <= W + 20; x += 14) { const yy = y + amp * Math.sin(x / wl * TAU + ph); x < -19 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); c.restore();
    }
    // orilla delantera: arena + espuma
    const sy_ = (x) => 1540 + 24 * Math.sin(x * .008 + 1) + 10 * Math.sin(x * .02);
    c.fillStyle = 'rgba(190,255,235,.5)'; c.beginPath(); c.moveTo(0, 1420); for (let x = 0; x <= W + 16; x += 16) c.lineTo(x, sy_(x) - 74 + 10 * Math.sin(x * .03 + TAU * t)); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    c.fillStyle = lin(c, 0, 1500, 0, H, [[0, '#fff0c4'], [.4, '#f5cf8c'], [1, '#e2a95f']]); c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 16; x += 16) c.lineTo(x, sy_(x)); c.lineTo(W + 16, H); c.closePath(); c.fill();
    { const sg = rng(8); c.fillStyle = 'rgba(150,100,40,.18)'; for (let i = 0; i < 160; i++) { const x = sg() * W, y = 1570 + sg() * 340; circle(c, x, y, 1.5 + sg() * 2.5); c.fill(); } c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 60; i++) { circle(c, sg() * W, 1570 + sg() * 340, 1 + sg() * 2); c.fill(); } }
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 9; c.lineJoin = 'round'; c.beginPath(); for (let x = 0; x <= W; x += 16) { const y = sy_(x) - 8 + 8 * Math.sin(x * .05 + TAU * t); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 5; c.beginPath(); for (let x = 0; x <= W; x += 16) { const y = sy_(x) - 44 + 10 * Math.sin(x * .04 + 2 + TAU * t); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    // estrella de mar y concha
    c.save(); c.translate(860, 1610); c.rotate(.4); c.fillStyle = '#ff7a59'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 14 : 38; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.restore();
    // palmeras de primer plano
    const FP = { trunk: ['#9a6638', '#7a4a28'], rim: '#ffe0a8', leafA: ['#43d067', '#2fb454', '#1f8a3e'], leafB: ['#1f9248', '#187a3c', '#116531'] };
    palm(c, 1190, 1640, { ...FP, h: 800, lean: -170, w0: 54, w1: 30, fl: 220, n: 10, seed: 21 });
    palm(c, -80, 1690, { ...FP, h: 1000, lean: 235, w0: 76, w1: 40, fl: 340, n: 11, seed: 33 });
    L.vignette(c, W, H, .28);
  }

  function pine(c, x, y, s) {
    const tiers = 4;
    for (let i = 0; i < tiers; i++) { const w = (130 - i * 26) * s, h = 96 * s, yy = y - i * 70 * s - 40 * s; c.moveTo(x - w / 2, yy); c.lineTo(x + w / 2, yy); c.lineTo(x, yy - h); c.closePath(); }
    c.rect(x - 7 * s, y - 40 * s, 14 * s, 44 * s);
  }
  function pineSnow(c, x, y, s) {
    const tiers = 4;
    for (let i = 0; i < tiers; i++) { const w = (130 - i * 26) * s, h = 96 * s, yy = y - i * 70 * s - 40 * s; c.moveTo(x - w * .3, yy - h * .6); c.lineTo(x + w * .3, yy - h * .6); c.lineTo(x, yy - h); c.closePath(); c.moveTo(x - w * .5, yy); c.lineTo(x - w * .28, yy - h * .3); c.lineTo(x - w * .1, yy); c.closePath(); }
  }
  function auroraRibbon(c, t, y0, amp, len, ph, cols, alpha) {
    const step = 6;
    for (let x = -10; x <= W + 10; x += step) {
      const yt = y0 + amp * Math.sin(x * .0045 + ph + TAU * t) + amp * .45 * Math.sin(x * .011 + ph * 2.1 - TAU * t);
      const nz = .5 + .5 * Math.sin(x * .07 + ph * 5) * Math.sin(x * .023 + ph * 3), ln = len * (.45 + .55 * (.5 + .5 * Math.sin(x * .009 + ph * 3))) * (.6 + .4 * nz);
      const g = c.createLinearGradient(0, yt - 24, 0, yt + ln);
      g.addColorStop(0, cols[2] + '00'); g.addColorStop(.07, cols[0]); g.addColorStop(.35, cols[0] + '99'); g.addColorStop(.7, cols[1] + '40'); g.addColorStop(1, cols[1] + '00');
      c.globalAlpha = alpha * (.3 + .7 * nz); c.fillStyle = g; c.fillRect(x, yt - 24, step + 1, ln + 24);
    }
    c.globalAlpha = 1;
  }
  function cabinScene(c, t) {
    c.fillStyle = lin(c, 0, 0, 0, 1250, [[0, '#040a20'], [.5, '#0a2548'], [1, '#14566e']]); c.fillRect(0, 0, W, 1260);
    L.stars(c, 260, 77, t, { y1: 1000, alpha: .95 }); L.stars(c, 40, 78, t, { y1: 500, alpha: 1 });
    // aurora
    c.save(); c.globalCompositeOperation = 'lighter';
    auroraRibbon(c, t, 440, 60, 400, 0.3, ['#3dffa0', '#16c7b5', '#8f5cff'], .95); auroraRibbon(c, t, 330, 70, 340, 2.2, ['#6bffc0', '#2ee0d8', '#c06bff'], .8); auroraRibbon(c, t, 590, 40, 250, 4.0, ['#28d890', '#1f9fe0', '#6a5cff'], .6);
    c.restore();
    halo(c, 540, 640, 900, '#2dffa0', .10);
    // luna delgada
    halo(c, 140, 330, 120, '#cfe8ff', .4); c.fillStyle = '#eef6ff'; circle(c, 140, 330, 26); c.fill();
    // montañas nevadas
    L.ridgeFill(c, W, H, 1150, 420, L.lin(c, 0, 820, 0, 1120, [[0, '#cfe4ff'], [.3, '#6f9ad0'], [1, '#1b3f6c']]), 11, 0, 1080, 4, 10);
    L.ridgeFill(c, W, H, 1210, 300, L.lin(c, 0, 960, 0, 1200, [[0, '#9ec0ea'], [.35, '#3d68a2'], [1, '#12305a']]), 23, 300, 1080, 4, 10);
    c.fillStyle = lin(c, 0, 900, 0, 1220, [[0, 'rgba(80,255,170,0)'], [1, 'rgba(80,255,170,.10)']]); c.fillRect(0, 900, W, 330);
    // bosque lejano
    c.fillStyle = '#0a2038'; c.beginPath(); { const r = rng(9); for (let i = 0; i < 46; i++) pine(c, -20 + i * 26 + r() * 10, 1230 + r() * 16, .4 + r() * .15); } c.fill();
    // colina con la cabaña
    const hill = (x, bx, by, w, h) => by - h * Math.exp(-Math.pow((x - bx) / w, 2));
    c.fillStyle = lin(c, 0, 1180, 0, 1800, [[0, '#eef6ff'], [.35, '#bcd6f4'], [1, '#7ea4d6']]);
    c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 12) c.lineTo(x, 1300 - 70 * Math.exp(-Math.pow((x - 610) / 360, 2)) + 26 * Math.sin(x * .006 + 1)); c.lineTo(W, H); c.closePath(); c.fill();
    c.fillStyle = 'rgba(80,255,170,.06)'; c.fill();
    // pinos medios
    c.fillStyle = '#0b2a3c'; c.beginPath(); { const r = rng(31); for (let i = 0; i < 16; i++) { const x = r() * W; if (x > 380 && x < 860) continue; pine(c, x, 1300 + r() * 80, .7 + r() * .3); } } c.fill();
    c.fillStyle = 'rgba(200,235,255,.7)'; c.beginPath(); { const r = rng(31); for (let i = 0; i < 16; i++) { const x = r() * W; if (x > 380 && x < 860) continue; pineSnow(c, x, 1300 + r() * 80, .7 + r() * .3); r(); } } c.fill();
    // cabaña
    const cx = 610, by = 1300, cw = 340, ch = 170;
    c.save(); c.translate(cx, by); c.scale(1.35, 1.35); c.translate(-cx, -by);
    halo(c, cx, by + 20, 520, '#ffb454', .28); c.save(); c.translate(cx, by + 60); c.scale(1, .22); c.fillStyle = rad(c, 0, 0, 0, 420, [[0, 'rgba(255,200,110,.75)'], [1, 'rgba(255,200,110,0)']]); circle(c, 0, 0, 420); c.fill(); c.restore();
    c.fillStyle = lin(c, 0, by - ch, 0, by, [[0, '#7a4528'], [1, '#4a2619']]); c.fillRect(cx - cw / 2, by - ch, cw, ch);
    c.strokeStyle = 'rgba(30,12,6,.55)'; c.lineWidth = 4; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(cx - cw / 2, by - ch + i * ch / 6); c.lineTo(cx + cw / 2, by - ch + i * ch / 6); c.stroke(); }
    c.strokeStyle = 'rgba(255,190,130,.25)'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(cx - cw / 2 + 4, by - ch + i * ch / 6 + 5); c.lineTo(cx + cw / 2 - 4, by - ch + i * ch / 6 + 5); c.stroke(); }
    c.fillStyle = '#5a3020'; for (let i = 0; i < 6; i++) { circle(c, cx - cw / 2, by - ch + i * ch / 6 + ch / 12, ch / 12); c.fill(); circle(c, cx + cw / 2, by - ch + i * ch / 6 + ch / 12, ch / 12); c.fill(); }
    // ventanas y puerta encendidas
    const win = (x, y, w, h) => { halo(c, x + w / 2, y + h / 2, 130, '#ffc060', .5); c.fillStyle = '#3a1c10'; c.fillRect(x - 8, y - 8, w + 16, h + 16); c.fillStyle = lin(c, 0, y, 0, y + h, [[0, '#fff0b0'], [1, '#ffaa40']]); c.fillRect(x, y, w, h); c.fillStyle = '#3a1c10'; c.fillRect(x + w / 2 - 3, y, 6, h); c.fillRect(x, y + h / 2 - 3, w, 6); };
    win(cx - 130, by - 120, 70, 72); win(cx + 20, by - 120, 70, 72);
    c.fillStyle = '#2e140c'; rr(c, cx + 100, by - 108, 52, 108, 6); c.fill(); c.fillStyle = lin(c, 0, by - 100, 0, by, [[0, '#ffe08a'], [1, '#ff9a3a']]); rr(c, cx + 106, by - 100, 40, 100, 4); c.fill();
    // tejado con nieve
    c.fillStyle = '#2c1b2e'; c.beginPath(); c.moveTo(cx - cw / 2 - 40, by - ch + 6); c.lineTo(cx, by - ch - 150); c.lineTo(cx + cw / 2 + 40, by - ch + 6); c.closePath(); c.fill();
    c.fillStyle = '#f2f8ff'; c.beginPath(); c.moveTo(cx - cw / 2 - 52, by - ch + 14); c.lineTo(cx - 6, by - ch - 160); c.lineTo(cx + 6, by - ch - 160); c.lineTo(cx + cw / 2 + 52, by - ch + 14);
    for (let i = 16; i >= 0; i--) { const x = cx - cw / 2 - 52 + i / 16 * (cw + 104), yy = by - ch + 14 + (i % 2 ? 22 : 6) + 5 * Math.sin(i); c.lineTo(x, yy); } c.closePath(); c.fill();
    c.fillStyle = 'rgba(120,170,230,.35)'; c.beginPath(); c.moveTo(cx + 6, by - ch - 160); c.lineTo(cx + cw / 2 + 52, by - ch + 14); c.lineTo(cx + cw / 2 + 10, by - ch + 14); c.closePath(); c.fill();
    // chimenea y humo
    c.fillStyle = '#4a2a22'; c.fillRect(cx + 80, by - ch - 150, 40, 90); c.fillStyle = '#f2f8ff'; rr(c, cx + 74, by - ch - 160, 52, 18, 8); c.fill();
    wispS(c, cx + 100, by - ch - 160, 380, 40, t, .0, 14, .45, '230,240,255'); wispS(c, cx + 100, by - ch - 160, 300, 30, t, .5, 10, .3, '230,240,255');
    // valla y farol
    c.fillStyle = '#3a2216'; for (let i = 0; i < 6; i++) { rr(c, cx - 330 + i * 40, by - 10, 10, 60, 3); c.fill(); } rr(c, cx - 340, by + 8, 250, 8, 3); c.fill();
    c.fillStyle = '#f2f8ff'; for (let i = 0; i < 6; i++) { rr(c, cx - 332 + i * 40, by - 16, 14, 10, 5); c.fill(); }
    halo(c, cx - 150, by - 40, 70, '#ffc060', .6); c.fillStyle = '#ffe9a0'; circle(c, cx - 150, by - 40, 6); c.fill();
    c.restore();
    // huellas
    c.fillStyle = 'rgba(70,110,170,.4)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(560 + i * 18 - (i % 2) * 6 + 90 * (1 - i / 9), 1520 - i * 30, 9, 5, .5, 0, TAU); c.fill(); }
    // pinos de primer plano, enmarcando
    c.fillStyle = '#05182a'; c.beginPath(); pine(c, 70, 1580, 2.0); pine(c, 250, 1520, 1.3); pine(c, 1010, 1580, 1.9); pine(c, 900, 1530, 1.2); c.fill();
    c.fillStyle = 'rgba(190,225,255,.75)'; c.beginPath(); pineSnow(c, 70, 1580, 2.0); pineSnow(c, 250, 1520, 1.3); pineSnow(c, 1010, 1580, 1.9); pineSnow(c, 900, 1530, 1.2); c.fill();
    // ventisqueros suaves con sombra azul
    [[1560, 38, .008, 0, 'rgba(140,175,232,.55)', 'rgba(250,253,255,.85)'], [1690, 46, .006, 2, 'rgba(120,160,225,.6)', 'rgba(240,248,255,.8)']].forEach(([y0, amp, f, ph, sh, hi]) => {
      c.fillStyle = sh; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 16; x += 16) c.lineTo(x, y0 + 16 + amp * Math.sin(x * f + ph) + 12 * Math.sin(x * f * 2.7)); c.lineTo(W + 16, H); c.closePath(); c.fill();
      c.fillStyle = hi; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 16; x += 16) c.lineTo(x, y0 + amp * Math.sin(x * f + ph) + 12 * Math.sin(x * f * 2.7)); c.lineTo(W + 16, H); c.closePath(); c.fill();
      c.fillStyle = lin(c, 0, y0 - 30, 0, y0 + 200, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(110,150,215,.45)']]); c.fillRect(0, y0 - 40, W, 300);
    });
    // nieve cayendo y destellos en el suelo
    const sr = rng(55); for (let i = 0; i < 70; i++) { const p = ((t * (1 + (i % 2)) + sr()) % 1), x = sr() * W + 40 * Math.sin(p * 6 + i), y = -20 + p * 1500; c.fillStyle = `rgba(255,255,255,${.4 + .5 * sr()})`; circle(c, x, y, 2 + sr() * 3); c.fill(); }
    const gl = rng(66); for (let i = 0; i < 24; i++) { const x = gl() * W, y = 1330 + gl() * 250, a = wave01(t, 2, gl()); c.fillStyle = `rgba(255,255,255,${.8 * a})`; c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x + 2, y); c.lineTo(x, y + 8); c.lineTo(x - 2, y); c.closePath(); c.fill(); }
    L.vignette(c, W, H, .4);
  }

  SCENES['travel-c'] = {
    topic: 'travel', stillT: [.3, .7],
    cap: [
      { ca: 'Illa, sol i aigua turquesa. Ja no cal res més 🏝️ #viatges #illa', es: 'Isla, sol y agua turquesa. No hace falta más 🏝️ #viajes #isla', en: 'Island, sun and turquoise water. That is all 🏝️ #travel #island' },
      { ca: 'Aurora boreal i una cabana ben acollidora ✨ #viatges #aurora', es: 'Aurora boreal y una cabaña calentita ✨ #viajes #aurora', en: 'Northern lights and a cozy cabin ✨ #travel #aurora' }],
    draw(c, t, v) { if (v % 2 === 0) island(c, t); else cabinScene(c, t); }
  };
})();
