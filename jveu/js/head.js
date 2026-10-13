// ============================================================
//  head.js – Cabeza virtual (SVG) de JVeu
//  Es veu com en un espill (igual que la pantalla de JFace): l'ull esquerre del cap és el de l'esquerra
//  de la pantalla i, si el cap gira a l'esquerra, la cara es mou cap a l'esquerra de la pantalla.
//  JVeuHead.mount(contenidor)  ·  JVeuHead.set({ yaw:-1…1, mouth:0…1, eyeL:0|1, eyeR:0|1 })
// ============================================================
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const R = 70, CX = 110, DEG = Math.PI / 180;
  const el = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in (attrs || {})) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  let S = null;                         // referències als elements
  let pose = { yaw: 0, mouth: 0, eyeL: 1, eyeR: 1 };

  function mount(box) {
    if (!box) return;
    box.innerHTML = '';
    const svg = el('svg', { viewBox: '0 0 220 250', role: 'img', focusable: 'false', 'aria-hidden': 'true' }, box);
    svg.classList.add('vhead-svg');
    const defs = el('defs', {}, svg);
    const f = el('filter', { id: 'vhGlow', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    el('feGaussianBlur', { stdDeviation: '2.6', result: 'b' }, f);
    const mg = el('feMerge', {}, f); el('feMergeNode', { in: 'b' }, mg); el('feMergeNode', { in: 'SourceGraphic' }, mg);
    const g = el('radialGradient', { id: 'vhFill', cx: '50%', cy: '38%', r: '72%' }, defs);
    el('stop', { offset: '0', 'stop-color': '#10301f' }, g); el('stop', { offset: '1', 'stop-color': '#050d09' }, g);
    const headPath = 'M110 22 C 62 22 42 70 44 122 C 46 176 72 224 110 227 C 148 224 174 176 176 122 C 178 70 158 22 110 22 Z';
    const cp = el('clipPath', { id: 'vhClip' }, defs); el('path', { d: headPath }, cp);

    // Circuits del voltant (decoratiu)
    const deco = el('g', { stroke: '#22c55e', 'stroke-opacity': '.28', 'stroke-width': '1', fill: 'none' }, svg);
    [[22, 70, 8, 70, 8, 40], [22, 110, 6, 110], [22, 150, 8, 150, 8, 182], [198, 70, 212, 70, 212, 40], [198, 110, 214, 110], [198, 150, 212, 150, 212, 182]].forEach((p) => {
      let d = 'M' + p[0] + ' ' + p[1]; for (let i = 2; i < p.length; i += 2) d += ' L' + p[i] + ' ' + p[i + 1];
      el('path', { d }, deco);
    });
    [[8, 40], [8, 182], [212, 40], [212, 182], [6, 110], [214, 110]].forEach((c) => el('circle', { cx: c[0], cy: c[1], r: 2.6, fill: '#050d09' }, deco));

    const body = el('g', { filter: 'url(#vhGlow)', stroke: '#4ade80', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    // coll
    el('path', { d: 'M88 222 L84 246 M132 222 L136 246', 'stroke-width': '2' }, body);
    el('path', { d: headPath, fill: 'url(#vhFill)', 'stroke-width': '2.4' }, body);
    // Malla interna (meridians + paral·lels), retallada al cap
    const mesh = el('g', { 'clip-path': 'url(#vhClip)', 'stroke-width': '1', 'stroke-opacity': '.55' }, body);
    S = { meridians: [], parallels: [] };
    [-72, -42, -14, 14, 42, 72].forEach((lon) => S.meridians.push({ lon, path: el('path', {}, mesh) }));
    [58, 92, 128, 162, 196].forEach((y) => {
      const p = el('path', {}, mesh); S.parallels.push({ y, path: p });
    });
    // Trets
    S.browL = el('path', { 'stroke-width': '2.2' }, body); S.browR = el('path', { 'stroke-width': '2.2' }, body);
    S.eyeL = mkEye(body); S.eyeR = mkEye(body);
    S.nose = el('path', { 'stroke-width': '2', 'stroke-opacity': '.9' }, body);
    S.mouthBack = el('ellipse', { fill: '#02080a', stroke: 'none' }, body);
    S.mouth = el('path', { 'stroke-width': '2.6', stroke: '#86efac' }, body);
    S.teeth = el('path', { 'stroke-width': '1.4', 'stroke-opacity': '.8' }, body);
    S.box = box; S.svg = svg;
    set(pose);
  }

  function mkEye(parent) {
    const g = el('g', {}, parent);
    return {
      g,
      white: el('ellipse', { fill: '#04120c', 'stroke-width': '2' }, g),
      iris: el('ellipse', { fill: '#4ade80', stroke: 'none', 'fill-opacity': '.85' }, g),
      pupil: el('ellipse', { fill: '#02100a', stroke: 'none' }, g),
      lid: el('path', { 'stroke-width': '2.6' }, g)
    };
  }

  function set(p) {
    if (!S) return;
    pose = Object.assign({}, pose, p || {});
    const phi = -pose.yaw * 0.95;                  // gir en radians (el signe segueix l'efecte «espill»)
    const sinp = (lon) => Math.sin(lon * DEG + phi), cosp = (lon) => Math.cos(lon * DEG + phi);
    // Meridians: arc el·líptic de dalt a baix, visible només si està de cara
    S.meridians.forEach((m) => {
      const s = sinp(m.lon), c = cosp(m.lon);
      if (c <= 0.02) { m.path.setAttribute('d', ''); return; }
      const rx = Math.max(0.5, Math.abs(s) * R * 1.02);
      const x = CX + s * R * 0.0;                  // el meridià comença i acaba al centre dels pols
      m.path.setAttribute('d', 'M' + CX + ' 24 A ' + rx.toFixed(1) + ' 102 0 0 ' + (s >= 0 ? 1 : 0) + ' ' + CX + ' 226');
      void x;
    });
    S.parallels.forEach((pl) => {
      const k = Math.sqrt(Math.max(0, 1 - Math.pow((pl.y - 124) / 104, 2)));
      const half = 62 * k + 6, bend = (pl.y - 124) * 0.07;
      pl.path.setAttribute('d', 'M' + (CX - half) + ' ' + pl.y + ' Q ' + CX + ' ' + (pl.y + bend * 2 + 4) + ' ' + (CX + half) + ' ' + pl.y);
    });
    // Posició d'un tret a la longitud «lon» (graus): x i amplada aparent
    const proj = (lon, r) => ({ x: CX + Math.sin(lon * DEG + phi) * (r || R), w: Math.cos(lon * DEG + phi) });
    // Ulls (l'esquerre del cap, a l'esquerra de la pantalla)
    [['eyeL', -27, pose.eyeL, S.browL], ['eyeR', 27, pose.eyeR, S.browR]].forEach(([k, lon, open, brow]) => {
      const e = S[k], q = proj(lon), vis = q.w > 0.18;
      e.g.style.display = vis ? '' : 'none'; brow.style.display = vis ? '' : 'none';
      if (!vis) return;
      const rx = 17 * Math.max(0.22, q.w), ry = open ? 11 : 0.6, cy = 98;
      e.white.setAttribute('cx', q.x.toFixed(1)); e.white.setAttribute('cy', cy); e.white.setAttribute('rx', rx.toFixed(1)); e.white.setAttribute('ry', ry);
      e.white.style.display = open ? '' : 'none';
      const ir = Math.min(rx * 0.62, 8.5), px = q.x + Math.sin(phi) * 2;
      e.iris.setAttribute('cx', px.toFixed(1)); e.iris.setAttribute('cy', cy); e.iris.setAttribute('rx', (ir * Math.max(0.5, q.w)).toFixed(1)); e.iris.setAttribute('ry', ir);
      e.pupil.setAttribute('cx', px.toFixed(1)); e.pupil.setAttribute('cy', cy); e.pupil.setAttribute('rx', (3.2 * Math.max(0.5, q.w)).toFixed(1)); e.pupil.setAttribute('ry', 3.2);
      e.iris.style.display = e.pupil.style.display = open ? '' : 'none';
      // parpella tancada = línia corba
      e.lid.setAttribute('d', open ? '' : 'M' + (q.x - rx) + ' ' + cy + ' Q ' + q.x + ' ' + (cy + 7) + ' ' + (q.x + rx) + ' ' + cy);
      brow.setAttribute('d', 'M' + (q.x - rx * 1.05) + ' ' + (open ? 78 : 82) + ' Q ' + q.x + ' ' + (open ? 70 : 78) + ' ' + (q.x + rx * 1.05) + ' ' + (open ? 78 : 82));
    });
    // Nas: punta que sobreïx cap al costat on mira
    const n0 = proj(0, R), n1 = proj(0, R + 12), ns = Math.max(0.3, n0.w);
    S.nose.style.display = n0.w > 0.1 ? '' : 'none';
    S.nose.setAttribute('d', 'M' + (n0.x - 2) + ' 100 L' + (n1.x).toFixed(1) + ' 138 L' + (n0.x - 11 * ns).toFixed(1) + ' 142 M' + (n1.x).toFixed(1) + ' 138 L' + (n0.x + 11 * ns).toFixed(1) + ' 142');
    // Boca
    const m = proj(0, R), mw = 30 * Math.max(0.2, m.w), mo = Math.max(0, Math.min(1, pose.mouth));
    const my = 178, h = 2 + mo * 24;
    S.mouth.style.display = S.mouthBack.style.display = S.teeth.style.display = m.w > 0.1 ? '' : 'none';
    S.mouthBack.setAttribute('cx', m.x.toFixed(1)); S.mouthBack.setAttribute('cy', my + h * 0.35);
    S.mouthBack.setAttribute('rx', (mw * 0.95).toFixed(1)); S.mouthBack.setAttribute('ry', mo > 0.02 ? (h * 0.55).toFixed(1) : 0);
    S.mouth.setAttribute('d', mo > 0.02
      ? 'M' + (m.x - mw) + ' ' + my + ' Q ' + m.x + ' ' + (my - 4) + ' ' + (m.x + mw) + ' ' + my + ' Q ' + m.x + ' ' + (my + h * 1.5) + ' ' + (m.x - mw) + ' ' + my + ' Z'
      : 'M' + (m.x - mw) + ' ' + my + ' Q ' + m.x + ' ' + (my + 5) + ' ' + (m.x + mw) + ' ' + my);
    S.teeth.setAttribute('d', mo > 0.15 ? 'M' + (m.x - mw * 0.8) + ' ' + (my + 3) + ' Q ' + m.x + ' ' + (my + 0) + ' ' + (m.x + mw * 0.8) + ' ' + (my + 3) : '');
  }

  function get() { return Object.assign({}, pose); }
  root.JVeuHead = { mount, set, get };
})(window);
