// ============================================================
//  head_robot.js – Cap de robot de cartró (SVG) per a JParla
//  Cap de JParla: robot de cartró verd (substitueix l'antic cap de malla, js/head.js).
//  Es veu com en un espill: si el cap gira a l'esquerra (yaw > 0), la cara es mou cap a l'esquerra de la pantalla.
//  JParlaHeadRobot.mount(contenidor)  ·  JParlaHeadRobot.set({ yaw:-1…1, mouth:0…1, eyeL:0|1, eyeR:0|1 })  ·  .get()
// ============================================================
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 150, K = 0.12, A = 62, D = 54, TOP = 84, BOT = 200, JA = 50, JD = 44, JH = 28;
  const G1 = '#4ade80', G2 = '#86efac';      // verd de l'app (vora i detalls)
  const el = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in (attrs || {})) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  let svg = null, g = null;
  let pose = { yaw: 0, mouth: 0, eyeL: 1, eyeR: 1 };

  function mount(box) {
    if (!box) return;
    box.innerHTML = '';
    svg = el('svg', { viewBox: '50 38 200 228', role: 'img', focusable: 'false', 'aria-hidden': 'true' }, box);
    svg.classList.add('vhead-svg');
    const d = el('defs', {}, svg);
    const gl = el('filter', { id: 'vrGlow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, d);
    el('feGaussianBlur', { stdDeviation: '3', result: 'b' }, gl);
    const m = el('feMerge', {}, gl); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
    const f1 = el('linearGradient', { id: 'vrFront', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    el('stop', { offset: 0, 'stop-color': '#123324' }, f1); el('stop', { offset: 1, 'stop-color': '#0a1c14' }, f1);
    const f2 = el('linearGradient', { id: 'vrSide', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    el('stop', { offset: 0, 'stop-color': '#0a1912' }, f2); el('stop', { offset: 1, 'stop-color': '#06110c' }, f2);
    g = el('g', {}, svg);
    set(pose);
  }

  // Projecció d'un punt de la caixa (X, Y, Z) girada t radians: vista lleugerament de dalt
  function P(t, X, Y, Z) { const c = Math.cos(t), s = Math.sin(t); return [CX + X * c - Z * s, Y + K * (X * s + Z * c)]; }
  const pts = (a) => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const poly = (p, a, parent) => el('polygon', Object.assign({ points: pts(p), 'stroke-linejoin': 'round' }, a), parent);

  // Caixa de cartró: X∈[-a,a], Y∈[y1,y2], Z∈[-d,d]. Dibuixa dalt, el costat visible i el davant, amb les ratlles del cartró ondulat.
  function box(t, a, y1, y2, d, o, parent) {
    const q = (X, Y, Z) => P(t, X, Y, Z), st = { stroke: G1, 'stroke-width': 2, 'stroke-linejoin': 'round' };
    if (!o.notop) poly([q(-a, y1, d), q(a, y1, d), q(a, y1, -d), q(-a, y1, -d)], Object.assign({ fill: '#1a4a33' }, st), parent);
    const sx = t >= 0 ? a : -a;
    if (Math.abs(Math.sin(t)) > 0.015) {
      poly([q(sx, y1, d), q(sx, y1, -d), q(sx, y2, -d), q(sx, y2, d)], Object.assign({ fill: 'url(#vrSide)' }, st), parent);
      for (let y = y1 + 14; y < y2 - 4; y += 10) el('polyline', { points: pts([q(sx, y, d), q(sx, y, -d)]), stroke: G1, 'stroke-opacity': 0.14, 'stroke-width': 1, fill: 'none' }, parent);
    }
    poly([q(-a, y1, d), q(a, y1, d), q(a, y2, d), q(-a, y2, d)], Object.assign({ fill: 'url(#vrFront)' }, st), parent);
    for (let y = y1 + 14; y < y2 - 4; y += 10) el('polyline', { points: pts([q(-a + 3, y, d), q(a - 3, y, d)]), stroke: G1, 'stroke-opacity': 0.16, 'stroke-width': 1, fill: 'none' }, parent);
  }

  function eye(t, X, open, parent, lookX) {
    const k = Math.max(0.25, Math.cos(t)), p = P(t, X, 128, D), x = p[0], y = p[1];
    el('ellipse', { cx: x, cy: y, rx: 21 * k + 1.5, ry: 22.5, fill: '#02080a', stroke: G1, 'stroke-width': 2 }, parent);
    if (open) {
      const gg = el('g', { filter: 'url(#vrGlow)' }, parent);
      el('ellipse', { cx: x + lookX * k, cy: y, rx: 12 * k, ry: 13, fill: G1 }, gg);
      el('ellipse', { cx: x + lookX * k, cy: y, rx: 5 * k, ry: 5.5, fill: '#02100a' }, parent);
      el('ellipse', { cx: x + lookX * k - 4 * k, cy: y - 5, rx: 2.4 * k, ry: 2.4, fill: '#fff', 'fill-opacity': 0.8 }, parent);
    } else {
      el('path', { d: 'M' + (x - 17 * k) + ' ' + y + ' Q' + x + ' ' + (y + 8) + ' ' + (x + 17 * k) + ' ' + y, stroke: G1, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', filter: 'url(#vrGlow)' }, parent);
    }
  }

  function set(p) {
    if (!svg) return;
    pose = Object.assign({}, pose, p || {});
    const t = Math.max(-1, Math.min(1, pose.yaw)) * 0.8;       // yaw > 0: la cara gira cap a l'esquerra de la pantalla (espill)
    const mo = Math.max(0, Math.min(1, pose.mouth));
    g.innerHTML = '';
    // coll (darrere de tot)
    el('rect', { x: 134, y: 200, width: 32, height: 70, fill: '#06110c', stroke: G1, 'stroke-width': 2 }, g);
    // mandíbula: baixa segons l'obertura de la boca
    const gap = 3 + mo * 30, jy1 = BOT + gap, jy2 = jy1 + JH;
    poly([P(t, -JA, BOT, D * 0.82), P(t, JA, BOT, D * 0.82), P(t, JA, jy1, D * 0.82), P(t, -JA, jy1, D * 0.82)], { fill: '#02080a' }, g);
    box(t, JA, jy1, jy2, JD, { notop: true }, g);
    [-JA + 7, JA - 7].forEach((X) => { const q = P(t, X, jy1 + JH / 2, JD); el('circle', { cx: q[0], cy: q[1], r: 3, fill: '#050d09', stroke: G2, 'stroke-width': 1.2 }, g); });
    // cap
    box(t, A, TOP, BOT, D, {}, g);
    // cinta (dalt i davant)
    poly([P(t, -16, TOP, D), P(t, 16, TOP, D), P(t, 16, TOP, -D), P(t, -16, TOP, -D)], { fill: G1, 'fill-opacity': 0.35, stroke: 'none' }, g);
    poly([P(t, -16, TOP, D), P(t, 16, TOP, D), P(t, 16, TOP + 26, D), P(t, -16, TOP + 26, D)], { fill: G1, 'fill-opacity': 0.35, stroke: 'none' }, g);
    // antena amb LED
    const a = P(t, 0, TOP, -D * 0.1);
    el('line', { x1: a[0], y1: a[1], x2: a[0], y2: a[1] - 28, stroke: G2, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g);
    el('circle', { cx: a[0], cy: a[1] - 31, r: 5, fill: G1, filter: 'url(#vrGlow)' }, g);
    // cargols
    [[-A + 9, TOP + 12], [A - 9, TOP + 12], [-A + 9, BOT - 12], [A - 9, BOT - 12]].forEach((c) => {
      const q = P(t, c[0], c[1], D); el('circle', { cx: q[0], cy: q[1], r: 3.2, fill: '#050d09', stroke: G2, 'stroke-width': 1.2 }, g);
    });
    // ulls (l'esquerre del cap és el de l'esquerra de la pantalla)
    const lx = -Math.sin(t) * 3;
    eye(t, -28, pose.eyeL, g, lx); eye(t, 28, pose.eyeR, g, lx);
    // marca de la boca
    const m1 = P(t, -24, BOT - 18, D), m2 = P(t, 24, BOT - 18, D);
    el('line', { x1: m1[0], y1: m1[1], x2: m2[0], y2: m2[1], stroke: G1, 'stroke-opacity': 0.5, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-dasharray': '2 6' }, g);
  }

  function get() { return Object.assign({}, pose); }
  root.JParlaHeadRobot = { mount, set, get };
})(window);
