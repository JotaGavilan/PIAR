/* CINEMA – a: cuenta atrás de película y claqueta · b: tira de 35 mm y proyector · c: foto (sala de cine / alfombra roja) */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, halo, rng, circle, rr, mix, lerp, clamp, smooth, easeOut } = L;
  const W = 1080, H = 1920;
  function hh(n) { n = Math.imul(n | 0, 374761393) + 668265263 | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  const poly = (c, pts) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
  const md = (n, m) => ((n % m) + m) % m;
  function hexA(h, a) { if (h[0] !== '#') return h; const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  function star(c, x, y, r0, r1, n, rot = -Math.PI / 2) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r0 : r1, a = rot + i * Math.PI / n; i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
  function burst(c, x, y, r, n, col, a, rot = 0) { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.globalAlpha *= a; for (let i = 0; i < n; i++) { c.rotate(TAU / n); c.beginPath(); c.moveTo(0, -r * .06); c.lineTo(r * (i % 2 ? .6 : 1), 0); c.lineTo(0, r * .06); c.fill(); } c.restore(); }

  /* ============ CINEMA-A : cuenta atrás de película / claqueta ============ */
  const LBG = [['#14566a', '#04141c'], ['#6a3f16', '#1a0c05'], ['#6a1630', '#1a0409'], ['#25236e', '#070620']];
  function leader(c, t) {
    let f = Math.floor(t * 96) % 96; if (f === 95) f = 0; const cx = 540, cy = 900, R = 430;
    const ph = t * 4, idx = Math.floor(ph), p = ph - idx, prev = (idx + 3) % 4, pb = smooth(p / .1);
    const b0 = mix(LBG[prev][0], LBG[idx][0], pb), b1 = mix(LBG[prev][1], LBG[idx][1], pb);
    c.fillStyle = b1; c.fillRect(0, 0, W, H);
    c.fillStyle = rad(c, cx, cy, 0, 1250, [[0, b0], [1, b1]]); c.fillRect(0, 0, W, H);
    c.save(); c.translate((hh(f) - .5) * 2.5, (hh(f + 77) - .5) * 2.5);
    // líneas de cruz y marco
    c.strokeStyle = 'rgba(255,236,200,.42)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, cy); c.lineTo(W, cy); c.moveTo(cx, 0); c.lineTo(cx, H); c.stroke();
    c.strokeStyle = 'rgba(255,236,200,.5)'; c.lineWidth = 4; rr(c, 60, 130, W - 120, H - 260, 44); c.stroke();
    c.strokeStyle = 'rgba(255,236,200,.2)'; c.lineWidth = 2; rr(c, 84, 154, W - 168, H - 308, 30); c.stroke();
    // barrido (zona ya barrida + estela)
    const a0 = -Math.PI / 2, a1 = a0 + TAU * p, amber = '255,200,110';
    c.fillStyle = `rgba(${amber},${.2 * (1 - smooth(p / .2))})`; circle(c, cx, cy, R - 10); c.fill();
    {
      c.fillStyle = `rgba(${amber},.2)`; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R - 10, a0, a1); c.closePath(); c.fill();
      const g = c.createConicGradient(a1 - TAU * .22, cx, cy); g.addColorStop(0, `rgba(${amber},0)`); g.addColorStop(.22, `rgba(${amber},.55)`); g.addColorStop(.2201, `rgba(${amber},0)`); g.addColorStop(1, `rgba(${amber},0)`);
      c.fillStyle = g; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R - 10, a1 - TAU * .22, a1); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,240,210,.9)'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a1) * (R - 10), cy + Math.sin(a1) * (R - 10)); c.stroke();
    }
    // anillos y marcas
    c.strokeStyle = '#ffeccc'; c.lineWidth = 14; circle(c, cx, cy, R); c.stroke(); c.lineWidth = 4; circle(c, cx, cy, R - 62); c.stroke(); c.globalAlpha = .55; c.lineWidth = 3; circle(c, cx, cy, R * .55); c.stroke(); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,236,200,.85)'; for (let i = 0; i < 60; i++) { const a = i * TAU / 60, l = i % 5 ? 14 : 34; c.lineWidth = i % 5 ? 3 : 6; c.beginPath(); c.moveTo(cx + Math.cos(a) * (R + 18), cy + Math.sin(a) * (R + 18)); c.lineTo(cx + Math.cos(a) * (R + 18 + l), cy + Math.sin(a) * (R + 18 + l)); c.stroke(); }
    // número o triángulo de play
    halo(c, cx, cy, 460, '#ffb35a', .5 + .1 * wave(t, 8));
    const sym = (k, sc, al) => {
      if (al <= .003) return; c.save(); c.globalAlpha = al; c.translate(cx, cy + 14); c.scale(sc, sc);
      if (k < 3) L.text(c, String(3 - k), 0, 0, { size: 640, weight: 800, color: '#fff0d4', stroke: 'rgba(40,12,10,.55)', strokeW: 16 });
      else { c.fillStyle = '#fff0d4'; c.beginPath(); c.moveTo(-130, -190); c.lineTo(210, 0); c.lineTo(-130, 190); c.closePath(); c.lineJoin = 'round'; c.lineWidth = 36; c.strokeStyle = '#fff0d4'; c.stroke(); c.fill(); }
      c.restore();
    };
    const grow = 1 + .08 * (1 - easeOut(p / .3));
    sym(prev, 1 + .22 * pb, 1 - pb); sym(idx, (.9 + .1 * pb) * grow, pb);
    // puntos de progreso
    for (let i = 0; i < 3; i++) { const on = idx === 0 ? 1 - pb : idx === 3 ? 1 : (i <= idx - 1 ? 1 : (i === idx ? pb * 0 : 0)); const on2 = idx > 0 && idx < 3 && i === idx - 1 ? pb : on; c.fillStyle = 'rgba(255,236,200,.22)'; circle(c, cx + (i - 1) * 90, cy + R + 130, 18); c.fill(); c.fillStyle = `rgba(255,210,122,${on2})`; circle(c, cx + (i - 1) * 90, cy + R + 130, 18); c.fill(); }
    c.restore();
    // destello al cambiar
    c.fillStyle = `rgba(255,244,220,${.18 * clamp(p / .04) * Math.pow(1 - clamp((p - .04) / .12), 2)})`; c.fillRect(0, 0, W, H);
    // defectos de celuloide (cambian cada 2 fotogramas)
    c.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const hv = hh(f * 13 + i * 5); if (hv > .55) continue; const x = hh(f * 7 + i * 31) * W, y0 = hh(f + i * 3) * 900, y1 = y0 + 300 + hh(f * 3 + i) * 1100; c.strokeStyle = i % 2 ? `rgba(255,248,230,${.12 + .3 * hv})` : `rgba(0,0,0,${.2 + .3 * hv})`; c.lineWidth = 1.5 + hv * 3; c.beginPath(); c.moveTo(x, y0); c.lineTo(x + (hh(f + i * 9) - .5) * 10, y1); c.stroke(); }
    for (let i = 0; i < 12; i++) { const x = hh(f * 5 + i * 17) * W, y = hh(f * 3 + i * 23 + 1) * H, r = 2 + hh(f + i * 7) * 7; c.fillStyle = i % 3 ? 'rgba(0,0,0,.35)' : 'rgba(255,248,230,.4)'; circle(c, x, y, r); c.fill(); if (i % 4 === 0) { c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 25, y - 18, x + 50, y + 4); c.stroke(); } }
    // parpadeo suave y viñeta de proyector
    c.fillStyle = `rgba(0,0,0,${.035 + .035 * wave(t, 48)})`; c.fillRect(0, 0, W, H);
    L.vignette(c, W, H, .7);
  }

  function clap(c, t) {
    const cx = 540, cy = 930;
    c.fillStyle = '#10051f'; c.fillRect(0, 0, W, H);
    c.fillStyle = rad(c, cx, cy, 0, 1300, [[0, '#8a2150'], [.5, '#3d0f3e'], [1, '#0c0418']]); c.fillRect(0, 0, W, H);
    // rayos de luz giratorios
    c.save(); c.translate(cx, cy); c.rotate(t * TAU / 4); c.fillStyle = 'rgba(255,170,120,.1)'; for (let i = 0; i < 16; i++) { c.rotate(TAU / 16); c.beginPath(); c.moveTo(0, 0); c.lineTo(1500, -90); c.lineTo(1500, 90); c.closePath(); c.fill(); } c.restore();
    // bobinas al fondo
    [[130, 420, 190, 1], [960, 1560, 230, -1]].forEach(([x, y, r, d]) => { c.save(); c.translate(x, y); c.rotate(d * t * TAU / 2); c.globalAlpha = .5; c.fillStyle = '#1a0a2a'; circle(c, 0, 0, r); c.fill(); c.strokeStyle = '#ff7ab0'; c.lineWidth = 6; circle(c, 0, 0, r); c.stroke(); circle(c, 0, 0, r * .18); c.stroke(); c.fillStyle = '#0c0418'; for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); circle(c, r * .58, 0, r * .2); c.fill(); c.stroke(); } c.restore(); });
    // clap
    const d = ((t - .5) % 1 + 1) % 1; let a; const open = 30;
    if (d < .035) a = 0; else if (d < .15) a = open * easeOut((d - .035) / .115); else if (d < .86) a = open; else a = open * (1 - Math.pow((d - .86) / .14, 2.2));
    const fl = d < .3 ? Math.exp(-d * 22) * (1 - Math.exp(-d * 500)) : 0;
    c.save(); c.translate(cx, cy); c.rotate(-.1); c.scale(1.12, 1.12);
    halo(c, 0, 40, 620, '#ff5a8a', .28);
    const BW = 680, BH = 430;
    // cuerpo
    c.fillStyle = lin(c, 0, -20, 0, BH, [[0, '#26262e'], [1, '#08080c']]); rr(c, -BW / 2, -10, BW, BH, 22); c.fill();
    c.strokeStyle = '#7fe9ff'; c.globalAlpha = .55; c.lineWidth = 4; rr(c, -BW / 2, -10, BW, BH, 22); c.stroke(); c.globalAlpha = 1;
    // barra fija con rayas
    function bar(x, y, w, h, off) { c.save(); rr(c, x, y, w, h, 10); c.clip(); c.fillStyle = '#f4f2ea'; c.fillRect(x, y, w, h); c.fillStyle = '#16161d'; for (let i = -2; i < 12; i++) { const bx = x + off + i * 120; poly(c, [[bx, y + h], [bx + 60, y + h], [bx + 60 + h * .7, y], [bx + h * .7, y]]); c.fill(); } c.restore(); }
    bar(-BW / 2, -10, BW, 82, 20);
    // campos de la pizarra
    c.strokeStyle = 'rgba(255,255,255,.88)'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-BW / 2 + 20, 150); c.lineTo(BW / 2 - 20, 150); c.moveTo(-BW / 2 + 20, 250); c.lineTo(BW / 2 - 20, 250); c.moveTo(-BW / 2 + 20, 340); c.lineTo(BW / 2 - 20, 340); c.moveTo(-60, 72); c.lineTo(-60, 250); c.moveTo(130, 72); c.lineTo(130, 150); c.moveTo(140, 250); c.lineTo(140, 340); c.stroke();
    c.fillStyle = '#ff5a6a'; circle(c, -250, 112, 17); c.fill(); c.fillStyle = '#ffd36a'; circle(c, -250, 296, 17); c.fill(); c.fillStyle = '#6ae9ff'; circle(c, -250, 386, 17); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 7; [[-30, 112], [180, 112], [-20, 296], [190, 296]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, y + 12); c.quadraticCurveTo(x + 22, y - 24, x + 44, y + 8); c.quadraticCurveTo(x + 66, y + 30, x + 88, y - 6); c.stroke(); });
    // brazo articulado
    c.save(); c.translate(-BW / 2 + 28, -10); c.rotate(-a * Math.PI / 180); bar(-28, -92, BW, 82, 80);
    c.strokeStyle = '#7fe9ff'; c.globalAlpha = .5; c.lineWidth = 4; rr(c, -28, -92, BW, 82, 10); c.stroke(); c.globalAlpha = 1; c.restore();
    c.fillStyle = '#b8b8c8'; circle(c, -BW / 2 + 28, -10, 16); c.fill(); c.fillStyle = '#3a3a48'; circle(c, -BW / 2 + 28, -10, 7); c.fill();
    c.restore();
    // destello del clap
    if (fl > .01) {
      const bx = cx + 40, by = cy - 150;
      c.save(); c.globalCompositeOperation = 'lighter'; halo(c, bx, by, 560 * fl + 120, '#ffd7a0', fl * .9); burst(c, bx, by, 640 * fl + 100, 14, '#fff3d0', fl * .6, .3); c.restore();
      c.fillStyle = `rgba(255,240,220,${.1 * fl})`; c.fillRect(0, 0, W, H);
    }
    // chispas
    L.loopParticles(26, 7, t, (i, p, r) => { const ang = r() * TAU, sp = 140 + r() * 360, tt = ((t - .5) % 1 + 1) % 1; c.fillStyle = `rgba(255,${210 + (i % 3) * 15},140,${Math.max(0, 1 - tt * 4) * .9})`; circle(c, cx + 40 + Math.cos(ang) * sp * tt * 1.4, cy - 150 + Math.sin(ang) * sp * tt * 1.4, 4); c.fill(); });
    // brillos flotando
    L.loopParticles(24, 3, t, (i, p, r) => { const x = r() * W, y = 300 + r() * 1300; c.fillStyle = `rgba(255,220,200,${.5 * Math.sin(Math.PI * p)})`; circle(c, x + 22 * Math.sin(TAU * p + i), y - 70 * p, 2 + r() * 3); c.fill(); });
    L.vignette(c, W, H, .5);
  }

  SCENES['cinema-a'] = {
    topic: 'cinema', stillT: [.3, .52],
    cap: [
      { ca: 'Compte enrere i… acció! 🎬 #cinema #peli', es: 'Cuenta atrás y… ¡acción! 🎬 #cine #peli', en: 'Countdown and… action! 🎬 #cinema #movies' },
      { ca: 'Presa 1: la claqueta ja ha fet clap 🎬 #cinema #rodatge', es: 'Toma 1: la claqueta ya ha hecho clap 🎬 #cine #rodaje', en: 'Take 1: the clapperboard just went clap 🎬 #cinema #filmmaking' }],
    draw(ctx, t, v) { t = ((t % 1) + 1) % 1; if (v % 2 === 0) leader(ctx, t); else clap(ctx, t); }
  };
  /* ============ CINEMA-B : tira de 35 mm que se desliza con foco de proyector ============ */
  const FP = [
    [ // v0: cine cálido (teal / naranja / magenta)
      { a: '#1b3f6b', b: '#ff8a5c', c: '#ffd37a', d: '#2a1238' }, { a: '#0d2a40', b: '#2fb6c4', c: '#ffe4a8', d: '#0a1822' }, { a: '#3a1a5c', b: '#ff5a8a', c: '#ffc27a', d: '#1c0b2e' }, { a: '#12304a', b: '#f2a65a', c: '#fff0c8', d: '#0d1a2a' },
      { a: '#4a1a3a', b: '#ff7a59', c: '#ffe08a', d: '#240a22' }, { a: '#0a3a4a', b: '#7adbd0', c: '#ffd9a0', d: '#06222c' }, { a: '#2b1a58', b: '#ff9a6a', c: '#ffe6b0', d: '#150c30' }, { a: '#1a3a60', b: '#e8825a', c: '#ffd88a', d: '#101e38' }],
    [ // v1: pop neón
      { a: '#5a1fff', b: '#ff3dc8', c: '#ffe45e', d: '#1a0a4a' }, { a: '#05c3ff', b: '#6a5cff', c: '#fff2a8', d: '#06214a' }, { a: '#ff5e5e', b: '#ffb347', c: '#fffbd0', d: '#3a0a2a' }, { a: '#14e0a0', b: '#0aa0d8', c: '#fff4a8', d: '#06324a' },
      { a: '#ff3d8a', b: '#7a4dff', c: '#ffe45e', d: '#2a0a4a' }, { a: '#2a6aff', b: '#38f3ff', c: '#ffd0f0', d: '#0a1a5a' }, { a: '#ff7a1a', b: '#ff3d6a', c: '#fff0a0', d: '#3a0a22' }, { a: '#7a3dff', b: '#14e0c0', c: '#ffe8a0', d: '#1a0a48' }]
  ];
  function art(c, kind, w, h, k) {
    const x0 = -w / 2, y0 = -h / 2, r = rng(kind * 17 + 5);
    c.fillStyle = lin(c, 0, y0, 0, y0 + h, [[0, k.a], [1, k.b]]); c.fillRect(x0, y0, w, h);
    switch (kind) {
      case 0: { // atardecer con colinas
        halo(c, x0 + w * .7, y0 + h * .56, h * .8, k.c, .6); c.fillStyle = k.c; circle(c, x0 + w * .7, y0 + h * .56, h * .17); c.fill();
        [[.66, .12, k.d, .5], [.78, .1, mix(k.d, '#000000', .3), .9]].forEach(([b, am, col, ss], i) => { c.fillStyle = i ? col : mix(col, k.b, .35); c.beginPath(); c.moveTo(x0, y0 + h); for (let x = 0; x <= w; x += 8) c.lineTo(x0 + x, y0 + h * b - h * am * Math.sin(x / w * (4 + i * 2) + i * 2)); c.lineTo(x0 + w, y0 + h); c.closePath(); c.fill(); });
        break; }
      case 1: { // ciudad nocturna
        c.fillStyle = k.c; circle(c, x0 + w * .22, y0 + h * .26, h * .1); c.fill(); halo(c, x0 + w * .22, y0 + h * .26, h * .4, k.c, .4);
        let x = x0; while (x < x0 + w) { const bw = 20 + r() * 34, bh = h * (.25 + r() * .5); c.fillStyle = k.d; c.fillRect(x, y0 + h - bh, bw, bh); c.fillStyle = k.c; for (let yy = y0 + h - bh + 8; yy < y0 + h - 8; yy += 14) for (let xx = x + 5; xx < x + bw - 6; xx += 10) if (r() < .35) c.fillRect(xx, yy, 4, 6); x += bw + 2; }
        break; }
      case 2: { // montañas y lago
        halo(c, x0 + w * .5, y0 + h * .35, h * .7, k.c, .35);
        [[.2, .9, .62, k.d], [.62, 1.1, .7, mix(k.d, k.a, .35)]].forEach(([cx, sc, tp, col], i) => { c.fillStyle = col; poly(c, [[x0 + w * (cx - .42), y0 + h * .72], [x0 + w * cx, y0 + h * (1 - tp) * .8 + h * .05], [x0 + w * (cx + .42 * sc), y0 + h * .72]]); c.fill(); });
        c.fillStyle = '#fff'; c.globalAlpha = .85; poly(c, [[x0 + w * .2 - 22, y0 + h * .22], [x0 + w * .2, y0 + h * .13], [x0 + w * .2 + 22, y0 + h * .22]]); c.fill(); c.globalAlpha = 1;
        c.fillStyle = lin(c, 0, y0 + h * .72, 0, y0 + h, [[0, mix(k.b, k.a, .4)], [1, k.d]]); c.fillRect(x0, y0 + h * .72, w, h * .28);
        c.fillStyle = hexA(k.c, .5); for (let i = 0; i < 5; i++) c.fillRect(x0 + w * (.3 + .1 * i), y0 + h * (.76 + .04 * i), w * .2, 3);
        break; }
      case 3: { // playa con palmera
        halo(c, x0 + w * .3, y0 + h * .5, h * .7, k.c, .55); c.fillStyle = k.c; circle(c, x0 + w * .3, y0 + h * .5, h * .14); c.fill();
        c.fillStyle = k.d; c.globalAlpha = .65; c.fillRect(x0, y0 + h * .58, w, h * .42); c.globalAlpha = 1;
        c.strokeStyle = hexA(k.c, .6); c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x0 + w * .05, y0 + h * (.66 + .07 * i)); c.quadraticCurveTo(x0 + w * .3, y0 + h * (.62 + .07 * i), x0 + w * .55, y0 + h * (.66 + .07 * i)); c.stroke(); }
        c.strokeStyle = k.d; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0 + w * .8, y0 + h); c.quadraticCurveTo(x0 + w * .74, y0 + h * .6, x0 + w * .8, y0 + h * .3); c.stroke();
        for (let i = 0; i < 6; i++) { const a = -Math.PI * (.05 + i * .18); c.beginPath(); c.moveTo(x0 + w * .8, y0 + h * .3); c.quadraticCurveTo(x0 + w * .8 + Math.cos(a) * 36, y0 + h * .3 + Math.sin(a) * 30 - 10, x0 + w * .8 + Math.cos(a) * 62, y0 + h * .3 + Math.sin(a) * 40 + 24); c.stroke(); }
        break; }
      case 4: { // formas abstractas
        c.fillStyle = k.c; circle(c, x0 + w * .3, y0 + h * .4, h * .26); c.fill();
        c.fillStyle = hexA(k.d, .8); poly(c, [[x0 + w * .5, y0 + h * .9], [x0 + w * .75, y0 + h * .2], [x0 + w * .98, y0 + h * .9]]); c.fill();
        c.fillStyle = hexA('#ffffff', .85); circle(c, x0 + w * .72, y0 + h * .72, h * .12); c.fill();
        c.strokeStyle = hexA(k.c, .9); c.lineWidth = 6; c.beginPath(); c.moveTo(x0, y0 + h * .82); c.quadraticCurveTo(x0 + w * .4, y0 + h * .5, x0 + w, y0 + h * .88); c.stroke();
        break; }
      case 5: { // planeta con anillo
        c.fillStyle = k.d; c.globalAlpha = .55; c.fillRect(x0, y0, w, h); c.globalAlpha = 1;
        for (let i = 0; i < 24; i++) { c.fillStyle = '#fff'; c.globalAlpha = .4 + r() * .6; c.fillRect(x0 + r() * w, y0 + r() * h, 2.5, 2.5); } c.globalAlpha = 1;
        c.save(); c.translate(x0 + w * .5, y0 + h * .52); c.fillStyle = lin(c, -50, -50, 50, 50, [[0, k.c], [1, k.b]]); circle(c, 0, 0, h * .24); c.fill();
        c.save(); circle(c, 0, 0, h * .24); c.clip(); c.fillStyle = hexA(k.a, .45); c.fillRect(-h, -h * .08, h * 2, h * .08); c.fillRect(-h, h * .06, h * 2, h * .05); c.restore();
        c.strokeStyle = hexA(k.c, .9); c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, h * .46, h * .1, -.35, Math.PI * 1.02, Math.PI * 1.98); c.stroke(); c.beginPath(); c.ellipse(0, 0, h * .46, h * .1, -.35, .02, Math.PI * .98); c.stroke(); c.restore();
        break; }
      case 6: { // bosque de pinos
        halo(c, x0 + w * .5, y0 + h * .4, h * .7, k.c, .35);
        for (let row = 0; row < 2; row++) { c.fillStyle = row ? k.d : mix(k.d, k.b, .4); for (let i = 0; i < 9; i++) { const px = x0 + (i + .5 + row * .4) * w / 8.5, bh = h * (.4 + r() * .3), py = y0 + h * (row ? 1.02 : .86); for (let j = 0; j < 3; j++) { const ty = py - bh + j * bh * .26; poly(c, [[px, ty], [px - bh * (.14 + j * .06), ty + bh * .36], [px + bh * (.14 + j * .06), ty + bh * .36]]); c.fill(); } } }
        break; }
      default: { // carretera al horizonte
        halo(c, x0 + w * .5, y0 + h * .55, h * .6, k.c, .6); c.fillStyle = k.c; circle(c, x0 + w * .5, y0 + h * .55, h * .14); c.fill();
        c.fillStyle = k.d; c.fillRect(x0, y0 + h * .58, w, h * .42); c.fillStyle = mix(k.d, '#000000', .35); poly(c, [[x0 + w * .48, y0 + h * .58], [x0 + w * .52, y0 + h * .58], [x0 + w * .92, y0 + h], [x0 + w * .08, y0 + h]]); c.fill();
        c.fillStyle = hexA(k.c, .8); for (let i = 0; i < 4; i++) { const yy = .64 + i * .1; c.fillRect(x0 + w * .5 - 2 - i * 1.5, y0 + h * yy, 4 + i * 3, 6 + i * 3); }
      }
    }
  }
  const PITCH = 300;
  function frameCell(c, kind, k, dim) {
    c.fillStyle = '#0c0710'; c.fillRect(-210, -PITCH / 2 - 1, 420, PITCH + 2);
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(-210, -PITCH / 2 - 1, 8, PITCH + 2); c.fillRect(202, -PITCH / 2 - 1, 8, PITCH + 2);
    c.fillStyle = '#ffe2a8'; c.globalAlpha = .88; for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 6; i++) { rr(c, s * 186 - 13, -PITCH / 2 + (i + .5) * PITCH / 6 - 9, 26, 18, 5); c.fill(); } c.globalAlpha = 1;
    c.save(); rr(c, -158, -118, 316, 236, 10); c.clip(); c.translate(0, 0); art(c, kind, 316, 236, k);
    c.fillStyle = lin(c, -158, -118, 158, 118, [[0, 'rgba(255,255,255,.2)'], [.5, 'rgba(255,255,255,0)']]); c.fillRect(-158, -118, 316, 236); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2; rr(c, -158, -118, 316, 236, 10); c.stroke();
    if (dim) { c.fillStyle = `rgba(8,4,16,${dim})`; c.fillRect(-210, -PITCH / 2 - 1, 420, PITCH + 2); }
  }
  /* trayectoria serpenteante por longitud de arco (para v1) */
  function snakePath(ph, A, Lp, L) {
    const ds = 6, n = Math.ceil(L / ds), X = new Float32Array(n + 1), Y = new Float32Array(n + 1), T = new Float32Array(n + 1);
    let x = 0, y = 0; for (let i = 0; i <= n; i++) { const th = Math.PI / 2 + A * Math.sin(TAU * (i * ds) / Lp + ph); X[i] = x; Y[i] = y; T[i] = th; x += Math.cos(th) * ds; y += Math.sin(th) * ds; }
    const m = n >> 1, wn = Math.round(Lp / ds); let sx = 0; for (let i = m - (wn >> 1); i < m - (wn >> 1) + wn; i++) sx += X[i]; const ox = 540 - sx / wn, oy = 960 - Y[m]; for (let i = 0; i <= n; i++) { X[i] += ox; Y[i] += oy; }
    return { X, Y, T, ds, n };
  }

  SCENES['cinema-b'] = {
    topic: 'cinema', stillT: [.2, .6],
    cap: [
      { ca: 'Fotogrames que no s\'acaben mai 🎞️ #cinema #35mm', es: 'Fotogramas que nunca se acaban 🎞️ #cine #35mm', en: 'Frames that never end 🎞️ #cinema #35mm' },
      { ca: 'La cinta és un tobogan de colors 🎞️ #cinema #pelis', es: 'La cinta es un tobogán de colores 🎞️ #cine #pelis', en: 'The film reel is a slide of colors 🎞️ #cinema #movies' }],
    draw(ctx, t, v) {
      t = ((t % 1) + 1) % 1; const c = ctx, pal = FP[v % 2], Q = 8;
      const bg = v % 2 ? [['#0b0a2e'], ['#2a0a4a'], ['#05030f']] : [['#1c0c16'], ['#3b1620'], ['#07040a']];
      c.fillStyle = bg[2][0]; c.fillRect(0, 0, W, H);
      c.fillStyle = rad(c, 540, 700, 0, 1400, [[0, bg[1][0]], [.55, bg[0][0]], [1, bg[2][0]]]); c.fillRect(0, 0, W, H);
      const flick = 1 + .05 * wave(t, 48);
      if (v % 2 === 0) {
        // tres tiras diagonales
        const ang = -12 * Math.PI / 180;
        [[-450, .8, -1, .45], [450, .8, -1, .45], [0, 1, 1, 0]].forEach(([xo, sc, dir, dim], si) => {
          c.save(); c.translate(540, 960); c.rotate(ang); c.translate(xo, 0); c.scale(sc, sc);
          c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 0;
          const off = t * Q * dir;
          for (let n = Math.floor(-1500 / PITCH - off) - 1; n <= Math.ceil(1500 / PITCH - off) + 1; n++) {
            const y = (n + off) * PITCH, idx = md(n + si * 3, 8);
            c.save(); c.translate(0, y); frameCell(c, idx, pal[md(idx + si * 2, 8)], dim); c.restore();
          }
          c.restore();
        });
        // haz de proyector
        c.save(); c.globalCompositeOperation = 'lighter';
        const bm = (w0, w1, y1, al) => { const g = c.createLinearGradient(0, -20, 0, y1); g.addColorStop(0, `rgba(255,236,190,${al * flick})`); g.addColorStop(1, 'rgba(255,200,140,0)'); c.fillStyle = g; poly(c, [[540 - w0, -20], [540 + w0, -20], [540 + w1, y1], [540 - w1, y1]]); c.fill(); };
        bm(70, 560, 1500, .3); bm(30, 260, 1350, .22); bm(110, 760, 1650, .12);
        halo(c, 540, -10, 520, '#ffe9c0', .9 * flick); c.restore();
      } else {
        // cinta serpenteante (dos capas)
        const layers = [{ ph: 2.6, A: .9, Lp: 3000, sc: .55, dim: .5, dir: -1 }, { ph: 4.5, A: .9, Lp: 3200, sc: .85, dim: 0, dir: 1 }];
        layers.forEach((Ly, li) => {
          const pth = snakePath(Ly.ph, Ly.A, Ly.Lp, 4800), off = t * Q * Ly.dir, ps = PITCH * Ly.sc;
          const nMin = Math.floor((700 - (li ? 0 : 0)) / ps), nMax = Math.floor((pth.n * pth.ds - 700) / ps);
          for (let n = nMin - 9; n <= nMax + 9; n++) {
            const l = (n + off) * ps; if (l < 60 || l > pth.n * pth.ds - 60) continue;
            const f = l / pth.ds, i0 = Math.floor(f), fr = f - i0, px = lerp(pth.X[i0], pth.X[i0 + 1], fr), py = lerp(pth.Y[i0], pth.Y[i0 + 1], fr), th = pth.T[i0];
            if (px < -400 || px > W + 400 || py < -400 || py > H + 400) continue;
            const idx = md(n + li * 3, 8);
            c.save(); c.translate(px, py); c.rotate(th - Math.PI / 2); c.scale(Ly.sc, Ly.sc); frameCell(c, idx, pal[md(idx + li * 3, 8)], Ly.dim); c.restore();
          }
        });
        // dos haces cruzados
        c.save(); c.globalCompositeOperation = 'lighter';
        [[-60, -30, 1], [1140, -30, -1]].forEach(([x, y, d], i) => { const g = c.createLinearGradient(x, y, 540, 1100); g.addColorStop(0, `rgba(${i ? '120,230,255' : '255,140,220'},${.34 * flick})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; poly(c, [[x - 20 * d, y], [x + 40 * d, y + 70], [540 + d * -480, 1500], [540 + d * -120, 1500]]); c.fill(); halo(c, x + 10 * d, y + 20, 420, i ? '#8ff0ff' : '#ff9ae6', .8 * flick); });
        c.restore();
      }
      // polvo en el haz
      L.loopParticles(70, 12 + v, t, (i, p, r) => { const y0 = r() * 1500 + 100, x0 = 540 + (r() - .5) * (160 + y0 * .7); const x = x0 + 34 * Math.sin(TAU * p + i), y = y0 + 40 * Math.cos(TAU * p + i * 1.3); c.fillStyle = `rgba(255,236,200,${(.25 + .6 * wave01(t, 2, r())) * .8})`; circle(c, x, y, 1.5 + r() * 3); c.fill(); });
      L.vignette(c, W, H, .55);
    }
  };
  /* ============ CINEMA-C : foto – sala de cine / alfombra roja ============ */
  function sparkle(c, x, y, r, col, a) { c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); c.restore(); }
  function popcorn(c, x, y, r, seed) { const rg = rng(seed); c.save(); c.translate(x, y); const n = 4; for (let i = 0; i < n; i++) { const a = rg() * TAU, d = rg() * r * .5; c.fillStyle = '#e9b659'; circle(c, Math.cos(a) * d + r * .08, Math.sin(a) * d + r * .12, r * (.55 + rg() * .25)); c.fill(); } for (let i = 0; i < n; i++) { const a = rg() * TAU, d = rg() * r * .5; c.fillStyle = i % 2 ? '#fff6d6' : '#ffeaa8'; circle(c, Math.cos(a) * d, Math.sin(a) * d - r * .05, r * (.5 + rg() * .25)); c.fill(); } c.restore(); }
  function bucket(c, t) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, 6, 150, 24, 0, 0, TAU); c.fill();
    const trap = () => { c.beginPath(); c.moveTo(-128, -270); c.lineTo(128, -270); c.lineTo(96, 0); c.lineTo(-96, 0); c.closePath(); };
    trap(); c.fillStyle = '#f8f0e4'; c.fill(); c.save(); trap(); c.clip();
    c.fillStyle = '#e8283c'; for (let i = -6; i < 7; i += 2) { poly(c, [[i * 22 - 11, -270], [i * 22 + 11, -270], [i * 22 + 11 * .75, 0], [i * 22 - 11 * .75, 0]]); c.fill(); }
    c.fillStyle = lin(c, -130, 0, 130, 0, [[0, 'rgba(0,0,0,.35)'], [.35, 'rgba(255,255,255,.18)'], [1, 'rgba(0,0,0,.4)']]); c.fillRect(-140, -280, 280, 290);
    c.fillStyle = '#ffffff'; circle(c, 0, -130, 44); c.fill(); c.fillStyle = '#e8283c'; star(c, 0, -130, 17, 38, 5); c.fill();
    c.restore();
    c.fillStyle = '#f8f0e4'; c.beginPath(); c.ellipse(0, -270, 134, 30, 0, 0, TAU); c.fill(); c.fillStyle = '#7a2a1a'; c.beginPath(); c.ellipse(0, -272, 118, 22, 0, 0, TAU); c.fill();
    // montaña de palomitas
    const rg = rng(44), pcs = []; for (let i = 0; i < 46; i++) { const a = rg() * Math.PI, d = Math.sqrt(rg()); pcs.push([Math.cos(a) * 118 * d, -276 - Math.sin(a) * 100 * d * (1 - .25 * Math.abs(Math.cos(a))) , 22 + rg() * 12, i]); }
    pcs.sort((a, b) => a[1] - b[1]); pcs.forEach(p => popcorn(c, p[0], p[1], p[2], p[3] * 7 + 1));
    c.restore();
  }
  function ticket(c, w, h, col, k) {
    c.save(); const r = 22; c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2); c.lineTo(w / 2, -r); c.arc(w / 2, 0, r, -Math.PI / 2, Math.PI / 2, true); c.lineTo(w / 2, h / 2); c.lineTo(-w / 2, h / 2); c.lineTo(-w / 2, r); c.arc(-w / 2, 0, r, Math.PI / 2, -Math.PI / 2, true); c.closePath();
    c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 0; c.fillStyle = lin(c, -w / 2, -h / 2, w / 2, h / 2, [[0, col[0]], [1, col[1]]]); c.fill();
    c.clip(); c.strokeStyle = 'rgba(60,20,40,.45)'; c.lineWidth = 3; c.setLineDash([10, 9]); c.beginPath(); c.moveTo(-w / 2 + 96, -h / 2); c.lineTo(-w / 2 + 96, h / 2); c.stroke(); c.setLineDash([]);
    c.fillStyle = col[2]; star(c, -w / 2 + 48, 0, 15, 34, 5); c.fill();
    c.fillStyle = 'rgba(60,20,40,.8)'; rr(c, -w / 2 + 124, -h / 2 + 26, 120, 14, 7); c.fill(); rr(c, -w / 2 + 124, -h / 2 + 52, 170, 10, 5); c.fill(); rr(c, -w / 2 + 124, -h / 2 + 72, 90, 10, 5); c.fill();
    const rg = rng(k); let bx = -w / 2 + 124; while (bx < w / 2 - 30) { const bw = 3 + rg() * 5; c.fillRect(bx, h / 2 - 48, bw, 28); bx += bw + 3 + rg() * 4; }
    c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(-w / 2, -h / 2, w, 14);
    c.restore();
  }
  function seatRow(c, y, w, h, count, gap, off, aisleX, haze) {
    const total = count * (w + gap), x0 = 540 - total / 2 + off;
    for (let i = 0; i < count; i++) {
      let x = x0 + i * (w + gap) + w / 2; if (x > 540) x += aisleX; else x -= aisleX;
      const base = mix('#6e1838', '#4a2a7a', haze);
      c.fillStyle = mix('#1a0610', '#1a0f34', haze); rr(c, x - w / 2 - gap * .35, y - h * .5, w * .1, h * .5, 3); c.fill(); rr(c, x + w / 2 + gap * .35 - w * .1, y - h * .5, w * .1, h * .5, 3); c.fill();
      c.fillStyle = lin(c, 0, y - h, 0, y, [[0, mix(base, '#ff8a6a', .28)], [.15, base], [1, mix(base, '#000000', .55)]]); rr(c, x - w / 2, y - h, w, h * .88, w * .32); c.fill();
      c.strokeStyle = `rgba(255,205,160,${.9 - haze * .3})`; c.lineWidth = Math.max(2.5, w * .04); c.beginPath(); c.moveTo(x - w * .34, y - h * .96); c.quadraticCurveTo(x, y - h * 1.03, x + w * .34, y - h * .96); c.stroke();
      c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, x - w * .35, y - h * .52, w * .7, h * .06, 3); c.fill();
    }
  }
  function curtain(c) {
    c.save(); c.beginPath(); c.moveTo(0, 190); c.lineTo(250, 190); c.bezierCurveTo(222, 500, 200, 820, 262, 1150); c.lineTo(0, 1190); c.closePath(); c.clip();
    for (let i = 0; i < 9; i++) { const x = i * 34 - 6; c.fillStyle = lin(c, x, 0, x + 34, 0, [[0, '#3c0516'], [.45, '#a81a3c'], [1, '#3c0516']]); c.fillRect(x, 180, 36, 1020); }
    c.fillStyle = lin(c, 0, 190, 0, 1190, [[0, 'rgba(0,0,0,.5)'], [.3, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.55)']]); c.fillRect(0, 180, 300, 1020);
    c.fillStyle = lin(c, 150, 0, 300, 0, [[0, 'rgba(255,200,150,0)'], [1, 'rgba(255,200,150,.28)']]); c.fillRect(150, 180, 150, 1020);
    c.restore();
  }

  SCENES['cinema-c'] = {
    topic: 'cinema', stillT: [.3, .21],
    cap: [
      { ca: 'Llums fora, projector en marxa 🍿 #cinema #pelis', es: 'Luces fuera, proyector en marcha 🍿 #cine #pelis', en: 'Lights out, projector on 🍿 #cinema #movienight' },
      { ca: 'Catifa roja, flaixos i ganes de premi 📸 #cinema #gala', es: 'Alfombra roja, flashes y ganas de premio 📸 #cine #gala', en: 'Red carpet, flashes and awards night 📸 #cinema #redcarpet' }],
    draw(ctx, t, v) {
      const c = ctx; t = ((t % 1) + 1) % 1;
      if (v % 2 === 0) {
        // ---- sala de cine ----
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#1a0510'], [.5, '#14061c'], [1, '#07020c']]); c.fillRect(0, 0, W, H);
        halo(c, 540, 640, 1100, '#ff8a6a', .3); halo(c, 540, 640, 700, '#7ad8ff', .22);
        const sx = 190, sy = 380, sw = 700, sh = 480;
        // haz del proyector
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, 130, 0, 860); g.addColorStop(0, 'rgba(255,240,210,.8)'); g.addColorStop(1, 'rgba(255,225,190,.12)'); c.fillStyle = g; poly(c, [[528, 130], [552, 130], [sx + sw, sy], [sx + sw, sy + sh], [sx, sy + sh], [sx, sy]]); c.fill();
        halo(c, 540, 135, 160, '#fff0d0', .9); c.restore();
        c.save(); rr(c, sx, sy, sw, sh, 18); c.clip();
        c.fillStyle = lin(c, 0, sy, 0, sy + sh, [[0, '#2a1a78'], [.38, '#e8407a'], [.72, '#ff9a6a'], [1, '#ffd890']]); c.fillRect(sx, sy, sw, sh);
        halo(c, 640, 700, 340, '#fff2c8', .9); c.fillStyle = '#fff6d8'; circle(c, 640, 700, 88); c.fill();
        [[760, 120, '#7a2a7e', 5], [820, 90, '#3a1a5a', 9]].forEach(([b, am, col, seed], li) => { c.fillStyle = col; c.beginPath(); c.moveTo(sx, sy + sh); for (let x = 0; x <= sw; x += 10) c.lineTo(sx + x, sy + b - am * Math.pow(.5 + .5 * L.ridge(x + li * 300, seed, 700, 4), 1.4) + li * 8); c.lineTo(sx + sw, sy + sh); c.closePath(); c.fill(); });
        for (let i = 0; i < 4; i++) { const bx = sx + 200 + i * 60 + 16 * wave(t, 1, i * .2), by = sy + 110 + (i % 2) * 40 + 8 * wave(t, 2, i * .15); c.strokeStyle = '#2a1040'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx - 16, by + 3 - 6 * wave(t, 4, i * .1)); c.quadraticCurveTo(bx - 6, by - 7, bx, by + 2); c.quadraticCurveTo(bx + 6, by - 7, bx + 16, by + 3 - 6 * wave(t, 4, i * .1)); c.stroke(); }
        c.restore();
        c.strokeStyle = 'rgba(255,230,200,.9)'; c.lineWidth = 6; rr(c, sx, sy, sw, sh, 18); c.stroke();
        L.loopParticles(60, 3, t, (i, p, r) => { const y0 = 180 + r() * 660, half = 12 + (y0 - 130) * .52, x0 = 540 + (r() * 2 - 1) * half; const x = x0 + 14 * Math.sin(TAU * p + i), y = y0 + 16 * Math.cos(TAU * p + i * 1.7); c.fillStyle = `rgba(255,240,215,${.3 + .6 * wave01(t, 2, r())})`; circle(c, x, y, 1.4 + r() * 2.8); c.fill(); });
        // cortinas y cenefa
        curtain(c); c.save(); c.translate(W, 0); c.scale(-1, 1); curtain(c); c.restore();
        c.fillStyle = lin(c, 0, 180, 0, 330, [[0, '#5a0a22'], [1, '#2e0412']]); c.fillRect(0, 170, W, 120);
        for (let i = 0; i < 10; i++) { const x = i * 108; c.fillStyle = lin(c, 0, 250, 0, 340, [[0, '#8a1230'], [1, '#3a0618']]); c.beginPath(); c.moveTo(x, 280); c.quadraticCurveTo(x + 54, 392, x + 108, 280); c.closePath(); c.fill(); c.strokeStyle = '#e8b64a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, 280); c.quadraticCurveTo(x + 54, 392, x + 108, 280); c.stroke(); circle(c, x + 54, 372, 7); c.fillStyle = '#e8b64a'; c.fill(); }
        c.fillStyle = '#e8b64a'; c.fillRect(0, 276, W, 6);
        // sillas
        [[1010, 58, 72, 12, 10, 4, 22, .55], [1100, 80, 98, 11, 8, 6, 30, .4], [1230, 112, 136, 8, 14, 0, 44, .25], [1400, 164, 198, 6, 18, 90, 62, .12]].forEach(([y, w, h, n, gap, off, aisle, haze]) => seatRow(c, y, w, h, n, gap, off * 0, aisle, haze));
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = lin(c, 0, 860, 0, 1500, [[0, 'rgba(255,150,130,.3)'], [1, 'rgba(255,150,130,0)']]); c.fillRect(0, 860, W, 640); c.restore();
        // luces del pasillo
        for (let i = 0; i < 5; i++) { const y = 1010 + Math.pow(i / 4, 1.5) * 560; c.fillStyle = '#ffb27a'; circle(c, 540, y - 6, 3 + i * 1.5); c.fill(); halo(c, 540, y - 6, 30 + i * 12, '#ffb27a', .5); }
        // objetos
        c.save(); c.translate(790, 1545); c.rotate(.05); c.scale(1.05, 1.05); bucket(c, t); c.restore();
        c.save(); c.translate(280, 1430); c.rotate(-.2); ticket(c, 340, 160, ['#ffe8b8', '#ffb86a', '#e8283c'], 7); c.restore();
        c.save(); c.translate(330, 1520); c.rotate(.12); ticket(c, 340, 160, ['#ffd0e0', '#ff8ab0', '#6a2aa8'], 11); c.restore();
        // vuelan palomitas
        for (let i = 0; i < 5; i++) { const p = ((t * 1 + i * .2) % 1), x = 790 + (i - 2) * 46 + 18 * Math.sin(i * 3), y = 1220 - 200 * 4 * p * (1 - p); c.save(); c.translate(x, y); c.rotate(p * 6 + i); popcorn(c, 0, 0, 18, 100 + i); c.restore(); }
        // destellos
        [[130, 440, 22], [960, 470, 28], [90, 900, 16], [990, 920, 20], [300, 1060, 14], [820, 1040, 16]].forEach(([x, y, r], i) => sparkle(c, x, y, r * (.7 + .3 * wave(t, 2, i * .17)), '#fff0d0', .5 + .5 * wave01(t, 2, i * .21)));
        L.vignette(c, W, H, .55);
      } else {
        // ---- alfombra roja ----
        const VY = 1010, hw = y => 44 + (y - VY) * .8;
        c.fillStyle = lin(c, 0, 0, 0, VY, [[0, '#080520'], [.55, '#2a0e5a'], [.88, '#a02a86'], [1, '#ff8a7a']]); c.fillRect(0, 0, W, VY + 4);
        L.stars(c, 90, 12, t, { y1: 600, alpha: .7 });
        // reflectores
        c.save(); c.globalCompositeOperation = 'lighter';
        [[110, -.5, 0], [970, .5, .33], [540, 0, .66]].forEach(([x, a0, ph], i) => { const a = a0 + (i === 2 ? .5 : .28) * wave(t, 1, ph) * (i === 2 ? 1 : (x < 540 ? 1 : -1)) ; const len = 1200, w1 = 50; const tx = x + Math.sin(a) * len, ty = VY - Math.cos(a) * len; const nx = Math.cos(a), ny = Math.sin(a); const gg = c.createLinearGradient(x, VY, tx, ty); gg.addColorStop(0, 'rgba(200,225,255,.5)'); gg.addColorStop(1, 'rgba(200,225,255,0)'); c.fillStyle = gg; poly(c, [[x - 26 * nx, VY - 26 * ny * 0], [x + 26 * nx, VY], [tx + w1 * nx, ty + w1 * ny], [tx - w1 * nx, ty - w1 * ny]]); c.fill(); halo(c, x, VY, 160, '#d8ecff', .8); });
        c.restore();
        // edificio de la gala
        c.fillStyle = lin(c, 0, 650, 0, VY, [[0, '#1a0b36'], [1, '#3a1658']]); rr(c, 140, 700, 800, VY - 700 + 6, 6); c.fill();
        c.fillStyle = '#26104a'; poly(c, [[110, 702], [540, 590], [970, 702]]); c.fill();
        for (let i = 0; i < 7; i++) { const x = 190 + i * 117; if (i === 3) continue; c.fillStyle = lin(c, 0, 720, 0, VY, [[0, '#ffe2a0'], [1, '#ff9a5a']]); c.globalAlpha = .9; rr(c, x - 22, 740, 44, 270, 8); c.fill(); c.globalAlpha = 1; halo(c, x, 880, 100, '#ffc27a', .35); }
        c.fillStyle = '#0c0418'; rr(c, 450, 790, 180, 230, [90, 90, 0, 0].length ? 14 : 0); c.fill(); c.fillStyle = lin(c, 0, 790, 0, VY, [[0, '#fff2c0'], [1, '#ff8a4a']]); c.beginPath(); c.moveTo(462, VY + 4); c.lineTo(462, 880); c.arc(540, 880, 78, Math.PI, 0); c.lineTo(618, VY + 4); c.closePath(); c.fill();
        halo(c, 540, 930, 360, '#ffc27a', .75);
        for (let i = 0; i < 17; i++) { const a = Math.PI + i / 16 * Math.PI, x = 540 + Math.cos(a) * 330, y = 700 + Math.sin(a) * 100 + 26; c.fillStyle = '#fff2c0'; c.globalAlpha = .35 + .65 * wave01(t, 2, (i % 2) * .5); circle(c, x, y + 60, 7); c.fill(); halo(c, x, y + 60, 26, '#ffd27a', .7 * (c.globalAlpha)); c.globalAlpha = 1; }
        halo(c, 540, 560, 260, '#ffd36a', .9 + 0); c.fillStyle = lin(c, 0, 500, 0, 620, [[0, '#fff3b0'], [1, '#e8a22a']]); star(c, 540, 560, 36, 80, 5); c.fill(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.stroke();
        // suelo
        c.fillStyle = lin(c, 0, VY, 0, H, [[0, '#2a1048'], [1, '#07020e']]); c.fillRect(0, VY, W, H - VY);
        // alfombra
        poly(c, [[540 - hw(VY), VY], [540 + hw(VY), VY], [540 + hw(H), H], [540 - hw(H), H]]); c.fillStyle = lin(c, 0, VY, 0, H, [[0, '#ff6a6a'], [.35, '#d4153f'], [1, '#6a0620']]); c.fill();
        c.save(); poly(c, [[540 - hw(VY), VY], [540 + hw(VY), VY], [540 + hw(H), H], [540 - hw(H), H]]); c.clip();
        c.fillStyle = lin(c, 400, 0, 680, 0, [[0, 'rgba(255,255,255,0)'], [.5, 'rgba(255,200,180,.22)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(400, VY, 280, H - VY);
        for (let i = 0; i < 18; i++) { const y = VY + Math.pow(i / 17, 2.2) * 910; c.fillStyle = 'rgba(0,0,0,.1)'; c.fillRect(0, y, W, 2 + (y - VY) * .01); }
        halo(c, 540, 1100, 360, '#ffb0a0', .5); c.restore();
        [-1, 1].forEach(sd => { [[0, 5], [.07, 3]].forEach(([o, wd], k) => { c.strokeStyle = '#ffd36a'; c.globalAlpha = k ? .45 : .95; c.lineWidth = wd; c.beginPath(); c.moveTo(540 + sd * (hw(VY) - o * hw(VY)), VY); c.lineTo(540 + sd * (hw(H) - o * hw(H)), H); c.stroke(); }); }); c.globalAlpha = 1;
        // postes y cuerdas
        const ys = [1040, 1070, 1110, 1170, 1260, 1400, 1610]; const posts = [];
        ys.forEach(y => { const k = (y - VY) / 910; posts.push([y, k, hw(y) * 1.1]); });
        for (let i = posts.length - 1; i >= 0; i--) {
          const [y, k, d] = posts[i];
          [-1, 1].forEach(sd => {
            const x = 540 + sd * d, h = 240 * k + 14;
            if (i < posts.length - 1) { const [y2, k2, d2] = posts[i + 1], x2 = 540 + sd * d2, h2 = 240 * k2 + 14; c.strokeStyle = '#b0123a'; c.lineWidth = 12 * k2 + 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y - h * .82); c.quadraticCurveTo((x + x2) / 2, (y - h * .82 + y2 - h2 * .82) / 2 + 30 * k2 + 6, x2, y2 - h2 * .82); c.stroke(); c.strokeStyle = 'rgba(255,170,170,.5)'; c.lineWidth = 3 * k2 + 1; c.beginPath(); c.moveTo(x, y - h * .84); c.quadraticCurveTo((x + x2) / 2, (y - h * .84 + y2 - h2 * .84) / 2 + 30 * k2 + 6, x2, y2 - h2 * .84); c.stroke(); }
            c.fillStyle = lin(c, x - 10 * k, 0, x + 10 * k, 0, [[0, '#a8761c'], [.4, '#fff0a0'], [1, '#8a5a10']]); c.fillRect(x - 6 * k - 1, y - h, 12 * k + 2, h); rr(c, x - 26 * k, y - 8 * k - 2, 52 * k, 10 * k + 2, 4 * k); c.fill();
            c.fillStyle = lin(c, x - 14 * k, y - h - 14 * k, x + 14 * k, y - h + 14 * k, [[0, '#fff6c0'], [1, '#c8861a']]); circle(c, x, y - h - 4 * k, 16 * k + 2); c.fill();
          });
        }
        // cámaras con flash
        const cams = [[190, 1430, 1.12, -.16, .2], [330, 1240, .75, -.1, .55], [890, 1430, 1.12, -.16, .78], [750, 1240, .75, -.1, .4]];
        cams.forEach(([x, y, sc, rot, ti], i) => {
          const d = ((t - ti) % 1 + 1) % 1, f = d < .3 ? Math.exp(-d * 16) * (1 - Math.exp(-d * 300)) : 0, dir = x < 540 ? 1 : -1;
          c.save(); c.translate(x, y); c.scale(sc * dir, sc); c.rotate(rot);
          c.fillStyle = '#06040e'; rr(c, -100, -62, 200, 134, 22); c.fill(); rr(c, -52, -92, 76, 40, 10); c.fill(); rr(c, -92, -86, 34, 30, 6); c.fill();
          c.fillStyle = '#0c0818'; rr(c, 80, -56, 90, 112, 10); c.fill(); c.fillStyle = '#06040e'; rr(c, 160, -66, 30, 132, 8); c.fill();
          c.fillStyle = '#1a1230'; c.beginPath(); c.ellipse(188, 0, 24, 62, 0, 0, TAU); c.fill(); c.fillStyle = lin(c, 170, -40, 206, 40, [[0, '#9ff0ff'], [.6, '#3a4ab8'], [1, '#1a0f48']]); c.beginPath(); c.ellipse(190, 0, 14, 44, 0, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(255,150,210,.9)'; c.lineWidth = 3.5; rr(c, -100, -62, 200, 134, 22); c.stroke(); c.beginPath(); c.moveTo(-52, -92); c.lineTo(24, -92); c.stroke();
          c.fillStyle = '#fff'; c.globalAlpha = .4 + .6 * f; rr(c, -88, -84, 28, 22, 5); c.fill(); c.globalAlpha = 1;
          c.restore();
          if (f > .01) { const fx = x - dir * 70 * sc, fy = y - 80 * sc; c.save(); c.globalCompositeOperation = 'lighter'; halo(c, fx, fy, 300 * sc * f + 80, '#ffffff', f); burst(c, fx, fy, 300 * sc * f + 60, 10, '#ffffff', f * .85, i); c.restore(); }
        });
        // lucecitas de paparazzi lejanas
        for (let i = 0; i < 22; i++) { const side = i % 2 ? 1 : -1, y = 1080 + hh(i + 9) * 240, x = 540 + side * (hw(y) * 1.5 + hh(i + 3) * 160); const f = Math.max(0, 1 - ((((t * 2 + hh(i + 50)) % 1) * 7))); c.fillStyle = '#fff'; c.globalAlpha = .25 + .75 * f; circle(c, x, y, 2 + 3 * f); c.fill(); c.globalAlpha = 1; if (f > .1) halo(c, x, y, 30 * f + 10, '#fff', f); }
        // confeti
        L.loopParticles(50, 21, t, (i, p, r) => { const x = r() * W, y0 = -60, y = y0 + p * 1700, col = ['#ffd36a', '#ff5a8a', '#7fe9ff', '#ffffff'][i % 4]; c.save(); c.translate(x + 30 * Math.sin(p * 7 + i), y); c.rotate(p * 9 + i); c.fillStyle = col; c.globalAlpha = .9; c.fillRect(-5, -2.5, 10, 5); c.restore(); });
        L.vignette(c, W, H, .5);
      }
    }
  };
})();
