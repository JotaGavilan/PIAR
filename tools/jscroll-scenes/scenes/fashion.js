/* FASHION – a: pasarela Memphis (conveyor de prendas) · b: zapatilla original 3D sobre pedestal · c: flat-lay editorial (foto) */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, halo, rng, circle, mix, lerp, clamp, smooth, easeOut, easeInOut, rr, ellipse } = L;
  const W = 1080, H = 1920;
  const frac = (x) => ((x % 1) + 1) % 1;

  /* ---------- FASHION-A ---------- */
  const SH = 'rgba(25,10,60,.2)';
  const PAL = [
    { bg: '#fff1d9', bg2: '#ffd9c2', c: ['#ff5a5f', '#2b4bff', '#ffc700', '#2bd9a8', '#ff9ad5'], ink: '#18142b', floor: ['#18142b', '#ff5a5f'], items: [['#2b4bff', '#ffc700'], ['#ff5a5f', '#fff1d9'], ['#18142b', '#2bd9a8'], ['#2bd9a8', '#18142b']] },
    { bg: '#ff5aa0', bg2: '#ff86bd', c: ['#ffe14d', '#26d7ff', '#1a1048', '#b6ff3b', '#ffffff'], ink: '#1a1048', floor: ['#1a1048', '#ffe14d'], items: [['#ffe14d', '#1a1048'], ['#26d7ff', '#ffffff'], ['#ffffff', '#1a1048'], ['#1a1048', '#b6ff3b']] }
  ];
  const beatOf = (t) => { const n = t * 4, f = Math.floor(n), u = n - f; return f + easeInOut(clamp(u / .6)); };

  function drawHanger(c, sh, ink) {
    c.strokeStyle = sh ? SH : ink; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.arc(0, -6, 13, Math.PI * .5, Math.PI * 2.05); c.stroke();
    c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 22); c.lineTo(-124, 66); c.lineTo(124, 66); c.lineTo(0, 22); c.stroke();
  }
  function garment(c, type, cols, sh, ink, anim) {
    const [main, acc] = cols; const F = (col) => { c.fillStyle = sh ? SH : col; c.fill(); };
    if (type === 0) { // abrigo
      drawHanger(c, sh, ink);
      c.beginPath(); c.moveTo(-30, 64); c.quadraticCurveTo(-90, 70, -132, 92); c.quadraticCurveTo(-170, 250, -178, 440); c.lineTo(-112, 452); c.lineTo(-104, 214); c.quadraticCurveTo(-120, 420, -126, 640); c.lineTo(126, 640); c.quadraticCurveTo(120, 420, 104, 214); c.lineTo(112, 452); c.lineTo(178, 440); c.quadraticCurveTo(170, 250, 132, 92); c.quadraticCurveTo(90, 70, 30, 64); c.quadraticCurveTo(0, 104, -30, 64); c.closePath(); F(main);
      if (!sh) {
        c.save(); c.clip();
        c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(-190, 214, 88, 300); c.fillRect(102, 214, 88, 300);
        c.fillStyle = acc; [-1, 1].forEach(sg => { c.beginPath(); c.moveTo(sg * 30, 64); c.lineTo(sg * 4, 320); c.lineTo(sg * 78, 230); c.lineTo(sg * 66, 108); c.closePath(); c.fill(); });
        c.fillRect(-124, 370, 248, 34); c.fillStyle = ink; c.fillRect(-18, 366, 36, 42); c.fillStyle = main; c.fillRect(-9, 375, 18, 24);
        c.fillStyle = ink; [-24, 24].forEach(x => [450, 510, 570].forEach(y => { circle(c, x, y, 11); c.fill(); }));
        c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 320); c.lineTo(0, 640); c.stroke();
        c.restore();
      }
    } else if (type === 1) { // vestido
      drawHanger(c, sh, ink);
      c.strokeStyle = sh ? SH : main; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(-34, 66); c.lineTo(-48, 160); c.moveTo(34, 66); c.lineTo(48, 160); c.stroke();
      c.beginPath(); c.moveTo(-58, 150); c.quadraticCurveTo(0, 240, 58, 150); c.lineTo(48, 290);
      for (let x = 210; x >= -210; x -= 10) c.lineTo(x, 640 + 16 * Math.sin(x * .045 + 1) - 0); c.lineTo(-48, 290); c.closePath(); F(main);
      if (!sh) {
        c.save(); c.clip(); c.fillStyle = acc;
        for (let r = 0; r < 7; r++) for (let q = -4; q <= 4; q++) { const x = q * 62 + (r % 2) * 31, y = 340 + r * 50; circle(c, x, y, 11); c.fill(); }
        c.fillRect(-60, 280, 120, 26); c.fillStyle = ink; c.fillRect(-230, 596, 460, 14);
        c.restore();
      }
    } else if (type === 2) { // bolso
      c.strokeStyle = sh ? SH : ink; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.arc(0, -6, 13, Math.PI * .5, Math.PI * 2.05); c.stroke(); c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 152); c.stroke();
      c.strokeStyle = sh ? SH : ink; c.lineWidth = 22; c.beginPath(); c.moveTo(-72, 250); c.bezierCurveTo(-76, 110, 76, 110, 72, 250); c.stroke();
      c.beginPath(); c.moveTo(-142, 236); c.lineTo(142, 236); c.lineTo(180, 470); c.quadraticCurveTo(184, 520, 140, 520); c.lineTo(-140, 520); c.quadraticCurveTo(-184, 520, -180, 470); c.closePath(); F(main);
      if (!sh) {
        c.save(); c.clip(); c.fillStyle = acc; c.beginPath(); c.moveTo(-150, 230); c.lineTo(150, 230); c.lineTo(166, 350); c.quadraticCurveTo(0, 430, -166, 350); c.closePath(); c.fill();
        c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(-190, 440, 380, 90); c.restore();
        c.fillStyle = ink; circle(c, 0, 388, 20); c.fill(); c.fillStyle = main; circle(c, 0, 388, 9); c.fill();
        c.strokeStyle = acc; c.lineWidth = 5; c.setLineDash([12, 12]); c.beginPath(); c.moveTo(-150, 470); c.lineTo(150, 470); c.stroke(); c.setLineDash([]);
      }
    } else { // jersey de rayas
      drawHanger(c, sh, ink);
      c.beginPath(); c.moveTo(-44, 68); c.quadraticCurveTo(-90, 74, -122, 100); c.lineTo(-256, 340); c.lineTo(-198, 384); c.lineTo(-110, 250); c.lineTo(-112, 450); c.lineTo(112, 450); c.lineTo(110, 250); c.lineTo(198, 384); c.lineTo(256, 340); c.lineTo(122, 100); c.quadraticCurveTo(90, 74, 44, 68); c.quadraticCurveTo(0, 112, -44, 68); c.closePath(); F(main);
      if (!sh) {
        c.save(); c.clip(); c.fillStyle = acc; for (let y = 150; y < 430; y += 64) c.fillRect(-270, y, 540, 26);
        c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-120, 420, 240, 30); c.fillRect(-270, 340, 90, 14); c.restore();
        c.strokeStyle = acc; c.lineWidth = 14; c.beginPath(); c.moveTo(-44, 70); c.quadraticCurveTo(0, 112, 44, 70); c.stroke();
      }
    }
  }

  const zig = (c, x0, x1, y, amp, wl, shift) => { c.beginPath(); for (let x = x0 - wl; x <= x1 + wl; x += wl / 2) { const k = Math.round((x - x0) / (wl / 2)); const xx = x0 - wl + ((x - x0 + wl) ) + 0; c.lineTo(xx - shift, y + (k % 2 ? amp : -amp)); } c.stroke(); };
  function star4(c, x, y, s) { c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, rr2 = i % 2 ? s * .32 : s; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath(); }

  SCENES['fashion-a'] = {
    topic: 'fashion', stillT: [.2, .45],
    cap: [
      { ca: 'Passarel·la en mode color-block 🧥 #moda #outfit', es: 'Pasarela en modo color-block 🧥 #moda #outfit', en: 'Color-block runway mode 🧥 #fashion #outfit' },
      { ca: 'Penjador de somnis: abric, vestit i bossa 👗 #moda', es: 'Perchero de ensueño: abrigo, vestido y bolso 👗 #moda', en: 'Dream rack: coat, dress and bag 👗 #fashion' }],
    draw(ctx, t, v) {
      const P = PAL[v % PAL.length], bt = beatOf(t), u4 = frac(t * 4), bump = Math.sin(Math.PI * clamp(u4 / .6)), SP = 500;
      const [c0, c1, c2, c3, c4] = P.c;
      // fondo en bloques
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = P.bg2; ctx.beginPath(); ctx.moveTo(0, 1180); ctx.lineTo(W, 980); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      // círculo grande con pulso
      ctx.fillStyle = c2; circle(ctx, 540, 840, 340 * (1 + .05 * bump)); ctx.fill();
      ctx.fillStyle = c0; ctx.beginPath(); ctx.arc(540, 840, 340 * (1 + .05 * bump), -Math.PI * .05, Math.PI * .6); ctx.lineTo(540, 840); ctx.closePath(); ctx.globalAlpha = .0; ctx.fill(); ctx.globalAlpha = 1;
      // bloques de esquina
      ctx.fillStyle = c3; circle(ctx, -20, 1560, 300); ctx.fill(); ctx.fillStyle = c1; circle(ctx, 1100, 360, 260); ctx.fill();
      ctx.fillStyle = P.bg; circle(ctx, 1100, 360, 150); ctx.fill();
      // cuadrícula de puntos
      ctx.fillStyle = P.ink; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const s = 1 + .35 * Math.sin(Math.PI * clamp(u4 / .6 - (i + j) * .05)); circle(ctx, 830 + i * 44, 1180 + j * 44, 8 * s); ctx.fill(); }
      // zigzag deslizante
      ctx.strokeStyle = c0; ctx.lineWidth = 18; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.beginPath();
      for (let x = -200; x <= W + 200; x += 60) { const k = (x + 200) / 60; const xx = x - ((t * 8 * 120) % 120); ctx.lineTo(xx, 1255 + (k % 2 ? 28 : -28)); } ctx.stroke();
      // guirnalda de semicírculos que se desliza
      ctx.fillStyle = c4 === P.bg ? c1 : c4; for (let q = -2; q < 14; q++) { const x = q * 90 + 45 - ((t * 8 * 90) % 90); ctx.beginPath(); ctx.arc(x, 214, 42, 0, Math.PI); ctx.fill(); }
      ctx.fillRect(0, 186, W, 28);
      // ondulación
      ctx.strokeStyle = c1 === P.bg ? c0 : c1; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); for (let x = -40; x <= W + 40; x += 14) { const yy = 300 + 26 * Math.sin(TAU * (x / 144 + t * 2)); x === -40 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
      // triángulo, semicírculo, cruces: giran a pasos con el ritmo
      ctx.save(); ctx.translate(150, 1010); ctx.rotate(bt * TAU / 4); ctx.strokeStyle = P.ink; ctx.lineWidth = 12; ctx.lineJoin = 'round'; ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(a) * 80, Math.sin(a) * 80); } ctx.closePath(); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(930, 1000); ctx.rotate(-bt * TAU / 4); ctx.fillStyle = c4; ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.restore();
      [[110, 330, c2], [980, 1540, c1], [560, 1330, c3]].forEach(([x, y, col], i) => { ctx.save(); ctx.translate(x, y); ctx.rotate(bt * TAU / 4 * (i % 2 ? -1 : 1)); ctx.strokeStyle = col === P.bg ? P.ink : col; ctx.lineWidth = 14; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.moveTo(0, -34); ctx.lineTo(0, 34); ctx.stroke(); ctx.restore(); });
      ctx.fillStyle = c4; star4(ctx, 940, 760, 44 * (1 + .15 * bump)); ctx.fill(); ctx.fillStyle = c3; star4(ctx, 130, 700, 36 * (1 - .15 * bump)); ctx.fill();
      // damero deslizante (pasarela)
      for (let r = 0; r < 2; r++) for (let q = -2; q < 14; q++) { const sx = ((t * 3 * 180) % 180); const x = q * 90 - sx + (r % 2) * 0 , y = 1390 + r * 90; ctx.fillStyle = (q + r) % 2 ? P.floor[0] : P.floor[1]; ctx.fillRect(x, y, 90, 90); }
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 1480, W, 10);
      // barra y cuerdas
      ctx.strokeStyle = P.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(60, 470); ctx.moveTo(W - 60, 0); ctx.lineTo(W - 60, 470); ctx.stroke();
      ctx.fillStyle = P.ink; rr(ctx, 30, 462, W - 60, 18, 9); ctx.fill();
      // prendas
      const shiftF = (tt) => SP * beatOf(tt);
      const acc = (shiftF(t) - 2 * shiftF(t - .008) + shiftF(t - .016)) / (.008 * .008);
      for (let i = 0; i < 4; i++) {
        let pos = (((i * SP - shiftF(t)) % 2000) + 2000) % 2000; if (pos > 1240) pos -= 2000;
        const x = 540 + pos; if (x < -260 || x > 1340) continue;
        const ang = clamp(-.8e-6 * acc, -.2, .2) + .035 * wave(t, 2, i * .17), sc = 1.1 * (1 + .03 * bump);
        [true, false].forEach(sh => {
          ctx.save(); ctx.translate(x, 478); ctx.rotate(ang); ctx.scale(sc, sc); if (sh) ctx.translate(18, 20);
          garment(ctx, i, P.items[i], sh, P.ink, bump); ctx.restore();
        });
      }
      L.vignette(ctx, W, H, .12);
    }
  };

  /* ---------- FASHION-B: zapatilla original en 3D (extrusión "almohadillada") ---------- */
  const hex2 = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mixA = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const rgbs = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
  const PROF = [
    { // bamba baja
      up: [[-52, 10], [-54, -2], [-52, -16], [-48, -28], [-42, -37], [-34, -37], [-29, -28], [-22, -25], [-17, -32], [-11, -44], [-4, -46], [1, -38], [10, -29], [22, -21], [34, -15], [44, -9], [51, -1], [54, 6], [52, 10]],
      sole: [[-55, 9], [-57, 17], [-52, 25], [-30, 26], [-8, 22], [10, 22], [30, 26], [50, 24], [57, 17], [56, 9]],
      lace: [[-4, -46], [22, -21]], collar: [[-48, -28], [-42, -37], [-34, -37], [-29, -28], [-22, -25]]
    },
    { // caña alta, suela gruesa
      up: [[-52, 8], [-54, -6], [-53, -26], [-50, -52], [-46, -70], [-38, -78], [-28, -76], [-24, -62], [-20, -70], [-13, -82], [-6, -80], [-2, -62], [6, -44], [14, -32], [24, -23], [35, -16], [45, -9], [51, -1], [54, 5], [52, 8]],
      sole: [[-56, 7], [-59, 18], [-54, 30], [-30, 32], [-8, 26], [10, 26], [30, 32], [52, 30], [59, 18], [57, 7]],
      lace: [[-13, -82], [24, -23]], collar: [[-46, -70], [-38, -78], [-28, -76], [-24, -62], [-20, -70]]
    }
  ];
  const hwOf = (x, k) => (k ? 13 : 12) + 8.5 * Math.exp(-Math.pow((x - 12) / 38, 2));
  const LEV = [[-1, .9], [-.93, .95], [-.75, .985], [0, 1], [.75, .985], [.93, .95], [1, .9]];
  const FB = [
    { bg: ['#07051c', '#1a0f48', '#33196e'], sw: ['#ff3d81', '#27d7ff', '#ffd23f', '#7dff6a'], dec: { toe: '#17133a', heel: '#17133a', stripe: '#ffffff', lace: '#ffffff', collar: '#17133a' }, sole: ['#f3f0ff', '#17133a'], ped: ['#1b1740', '#2a2560', '#0c0925'], dark: true, particles: '#ffffff', beam: '200,190,255' },
    { bg: ['#ffe9dc', '#ffc9d9', '#d8c4ff'], sw: ['#ff7aa8', '#ffcf3f', '#46d6c0', '#6f8cff'], dec: { toe: '#ffffff', heel: '#ffffff', stripe: '#2b2f6b', lace: '#2b2f6b', collar: '#ffffff' }, sole: ['#fff7ea', '#2b2f6b'], ped: ['#f7ecff', '#ffffff', '#cdb5ee'], dark: false, particles: '#2b2f6b', beam: '255,255,255' }
  ];

  function drawShoe(ctx, cx, cy, S, yaw, pitch, roll, mainRgb, F, kind) {
    const f = 1500, pr = PROF[kind], LIGHT = (() => { const l = [-.45, -.62, .64], n = Math.hypot(...l); return l.map(v => v / n); })();
    const cyaw = Math.cos(yaw), syaw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const tf = (x, y, z) => { y += 8; let X = x * cyaw + z * syaw, Z = -x * syaw + z * cyaw, Y = y; const Y2 = Y * cp - Z * sp, Z2 = Y * sp + Z * cp; const X3 = X * cr - Y2 * sr, Y3 = X * sr + Y2 * cr; return [X3 * S, Y3 * S, Z2 * S]; };
    const pj = (p) => { const k = f / (f - p[2]); return [cx + p[0] * k, cy + p[1] * k]; };
    const faces = [];
    const rot3 = (a) => { const [x, y, z] = a; let X = x * cyaw + z * syaw, Z = -x * syaw + z * cyaw; const Y2 = y * cp - Z * sp, Z2 = y * sp + Z * cp; return [X * cr - Y2 * sr, X * sr + Y2 * cr, Z2]; };
    function obj(poly, extra, baseRgb, shadeK, decals) {
      let ccx = 0, ccy = 0; poly.forEach(p => { ccx += p[0]; ccy += p[1]; }); ccx /= poly.length; ccy /= poly.length;
      const rings = LEV.map(([zf, sc]) => poly.map(p => tf(ccx + (p[0] - ccx) * sc, ccy + (p[1] - ccy) * sc, zf * (hwOf(p[0], kind) + extra))));
      const proj = rings.map(r => r.map(pj)); const ctr = tf(ccx, ccy, 0);
      const n = poly.length;
      for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, a = rings[r][i], b = rings[r][j], c = rings[r + 1][j], d = rings[r + 1][i];
        let nx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]), ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]), nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
        const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        if (nx * (m[0] - ctr[0]) + ny * (m[1] - ctr[1]) + nz * (m[2] - ctr[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const vz = f - m[2], vx = -m[0], vy = -m[1]; if (nx * vx + ny * vy + nz * vz <= 0) continue;
        faces.push({ z: m[2], pts: [proj[r][i], proj[r][j], proj[r + 1][j], proj[r + 1][i]], n: [nx, ny, nz], base: baseRgb, k: shadeK });
      }
      [0, rings.length - 1].forEach(ri => {
        const sgn = ri ? 1 : -1, nn = rot3([0, 0, sgn]);
        const pts3 = rings[ri]; let mz = 0, mx = 0, my = 0; pts3.forEach(p => { mz += p[2]; mx += p[0]; my += p[1]; }); mz /= n; mx /= n; my /= n;
        if (nn[0] * (-mx) + nn[1] * (-my) + nn[2] * (f - mz) <= 0) return;
        const sc = LEV[ri][1];
        faces.push({ z: mz + 2, pts: proj[ri], n: nn, base: baseRgb, k: shadeK, cap: { sgn, sc, ccx, ccy, decals } });
      });
    }
    obj(pr.up, 0, mainRgb, 1, 'up');
    obj(pr.sole, 3.2, hex2(F.sole[0]), 1, 'sole');
    faces.sort((a, b) => a.z - b.z);
    const dark = [18, 10, 60];
    faces.forEach(fc => {
      const lam = Math.max(0, fc.n[0] * LIGHT[0] + fc.n[1] * LIGHT[1] + fc.n[2] * LIGHT[2]);
      const H = [LIGHT[0], LIGHT[1], LIGHT[2] + 1], hl = Math.hypot(...H); const sp2 = Math.pow(Math.max(0, (fc.n[0] * H[0] + fc.n[1] * H[1] + fc.n[2] * H[2]) / hl), 36) * .55;
      const rim = Math.pow(1 - Math.max(0, fc.n[2]), 2.2);
      let c = mixA(mixA(fc.base.map(v => v * .5), dark, .35), mixA(fc.base, [255, 255, 255], .1), smooth(.35 + lam * .9));
      c = mixA(c, F.dark ? [120, 220, 255] : [255, 255, 255], rim * .35).map(v => Math.min(255, v + sp2 * 255));
      ctx.fillStyle = rgbs(c); ctx.beginPath(); fc.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgbs(c); ctx.lineWidth = 1; ctx.stroke();
      if (fc.cap) {
        const { sgn, sc, ccx, ccy, decals } = fc.cap;
        const P2 = (x, y) => pj(tf(ccx + (x - ccx) * sc, ccy + (y - ccy) * sc, sgn * (hwOf(x, kind) + (decals === 'sole' ? 3.2 : 0))));
        const poly = (arr, col) => { ctx.fillStyle = col; ctx.beginPath(); arr.forEach((p, i) => { const q = P2(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); };
        const line = (arr, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w * S / 7.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); arr.forEach((p, i) => { const q = P2(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); };
        const shadeD = (hx) => rgbs(mixA(typeof hx === 'string' ? hex2(hx) : hx, dark, .12 + (sgn < 0 ? .06 : 0)));
        const toeC = F.dark ? mixA(mainRgb, [255, 255, 255], .72) : [255, 255, 255], heelC = F.dark ? mixA(mainRgb, [20, 12, 60], .5) : mixA(mainRgb, [255, 255, 255], .55);
        ctx.save(); ctx.beginPath(); fc.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
        if (decals === 'up') {
          const hi = kind ? -64 : -28;
          poly([[30, -24], [38, -12], [42, 12], [80, 12], [80, -90], [26, -90]], shadeD(toeC));
          poly([[-80, -120], [-36, -120], [-31, hi], [-36, 6], [-80, 6]], shadeD(heelC));
          line([[-26, 2], [-10, -10], [8, -6], [22, 4], [36, -2]], shadeD(F.dec.stripe), 6.5);
          line(pr.collar, shadeD(F.dec.collar), 5);
          const [a, b] = pr.lace, dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy), nx = -dy / dl * 15, ny = dx / dl * 15;
          for (let k = 0; k < 5; k++) { const q = .14 + k * .18, px = a[0] + dx * q, py = a[1] + dy * q; line([[px, py], [px + nx * (.95), py + ny * .95 + 3]], shadeD(F.dec.lace), 5.6); }
        } else {
          line([[-54, 15], [58, 15]], shadeD(F.sole[1]), 4.5);
          for (let x = -40; x <= 44; x += 14) line([[x, 22], [x + 4, 22]], shadeD(F.sole[1]), 3);
        }
        ctx.restore();
      }
    });
  }

  function starP(c, x, y, s, rot = 0) { c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2 + rot, r2 = i % 2 ? s * .22 : s; c.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); } c.closePath(); }

  SCENES['fashion-b'] = {
    topic: 'fashion', stillT: [.07, .92],
    cap: [
      { ca: 'Nova sabatilla, tots els colors 👟 #sneakers #moda', es: 'Nueva zapatilla, todos los colores 👟 #sneakers #moda', en: 'New sneaker, every color 👟 #sneakers #style' },
      { ca: 'Sabatilla alta, cap a la lluna 👟 #sneakers', es: 'Zapatilla alta, rumbo a la luna 👟 #sneakers', en: 'High-top vibes, shooting for the moon 👟 #sneakers' }],
    draw(ctx, t, v) {
      const F = FB[v % FB.length], kind = v % 2, n4 = t * 4, ci = Math.floor(n4) % 4, ui = n4 - Math.floor(n4), prevI = (ci + 3) % 4;
      const cm = easeInOut(clamp(ui / .25)); const cur = mixA(hex2(F.sw[prevI]), hex2(F.sw[ci]), cm), curS = rgbs(cur);
      // fondo
      ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, F.bg[0]], [.55, F.bg[1]], [1, F.bg[2]]]); ctx.fillRect(0, 0, W, H);
      halo(ctx, 540, 760, 620, curS, F.dark ? .5 : .45); ctx.fillStyle = curS; ctx.globalAlpha = F.dark ? .16 : .3; circle(ctx, 540, 760, 330); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = F.dark ? 'rgba(255,255,255,.18)' : 'rgba(43,47,107,.2)'; ctx.lineWidth = 3; circle(ctx, 540, 760, 400 + 8 * wave(t, 2)); ctx.stroke(); circle(ctx, 540, 760, 470); ctx.stroke();
      if (F.dark) L.stars(ctx, 60, 8, t, { y1: 900, alpha: .7 });
      // formas flotantes
      const rs = rng(31 + v);
      for (let i = 0; i < 9; i++) { const x = 80 + rs() * 920, y = 330 + rs() * 880, s = 18 + rs() * 22, k = 1 + (i % 2), ph = rs(); const yy = y + 22 * wave(t, 1, ph); ctx.save(); ctx.translate(x, yy); ctx.rotate(TAU * t * k * (i % 3 ? 1 : -1) + ph * 6); ctx.strokeStyle = F.dark ? F.sw[i % 4] : '#2b2f6b'; ctx.globalAlpha = .75; ctx.lineWidth = 6; ctx.beginPath(); if (i % 3 === 0) { ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); } else if (i % 3 === 1) { for (let q = 0; q < 3; q++) { const a = q / 3 * TAU; ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); } ctx.closePath(); } else ctx.arc(0, 0, s * .8, 0, TAU); ctx.stroke(); ctx.restore(); }
      // focos
      ctx.save(); if (F.dark) ctx.globalCompositeOperation = 'lighter';
      [[90, 60, 450], [990, 60, 630]].forEach(([sx, sy, tx], i) => { [[1, .12], [.5, .12]].forEach(([k, a]) => { ctx.fillStyle = lin(ctx, sx, sy, tx, 1100, [[0, `rgba(${F.beam},${a * 1.6})`], [1, `rgba(${F.beam},0)`]]); ctx.beginPath(); ctx.moveTo(sx - 26 * k, sy); ctx.lineTo(sx + 26 * k, sy); ctx.lineTo(tx + 250 * k, 1180); ctx.lineTo(tx - 250 * k, 1180); ctx.closePath(); ctx.fill(); }); });
      ctx.restore();
      [[90, 60], [990, 60]].forEach(([sx, sy]) => { halo(ctx, sx, sy, 200, F.dark ? '#ffffff' : '#ffffff', .8); });
      // pedestal
      const py = 1130, prx = 340, pry = 82, bodyH = 250;
      ctx.fillStyle = lin(ctx, 540 - prx, 0, 540 + prx, 0, [[0, F.ped[2]], [.3, F.ped[0]], [.55, F.ped[1]], [1, F.ped[2]]]);
      ctx.beginPath(); ctx.moveTo(540 - prx, py); ctx.lineTo(540 - prx, py + bodyH); ctx.ellipse(540, py + bodyH, prx, pry, 0, Math.PI, 0, true); ctx.lineTo(540 + prx, py); ctx.closePath(); ctx.fill();
      ctx.fillStyle = F.dark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.5)'; ctx.fillRect(540 - prx + 60, py, 26, bodyH);
      // aro de luz en la base
      ctx.strokeStyle = curS; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(540, py + bodyH - 40, prx - 4, pry - 2, 0, 0, Math.PI); ctx.stroke(); halo(ctx, 540, py + bodyH + 20, 330, curS, F.dark ? .35 : .3);
      // tapa
      ctx.fillStyle = lin(ctx, 0, py - pry, 0, py + pry, [[0, F.ped[1]], [1, F.ped[0]]]); ellipse(ctx, 540, py, prx, pry); ctx.fill();
      ctx.strokeStyle = curS; ctx.lineWidth = 7; ellipse(ctx, 540, py, prx - 30, pry - 7); ctx.stroke();
      for (let i = 0; i < 36; i++) { const a = i / 36 * TAU + TAU * t; const x1 = 540 + (prx - 54) * Math.cos(a), y1 = py + (pry - 14) * Math.sin(a), x2 = 540 + (prx - 80) * Math.cos(a), y2 = py + (pry - 24) * Math.sin(a); ctx.strokeStyle = F.dark ? `rgba(255,255,255,${.25 + .4 * wave01(t, 0, 0) * 0})` : 'rgba(43,47,107,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      halo(ctx, 540, py, 300, curS, .25);
      // zapatilla
      const bob = 20 * wave(t, 2), yaw = TAU * t + (v % 2 ? 1.0 : .4), cyS = 735 + bob;
      L.shadowEllipse(ctx, 540, py + 4, 250 - bob * 2, 54 - bob * .5, (F.dark ? .6 : .35) * (1 - .08 * bob / 20));
      drawShoe(ctx, 540, cyS, kind ? 7.7 : 8.3, yaw, -.24, -.1 + .04 * wave(t, 1, .25), cur, F, kind);
      // partículas
      L.loopParticles(34, 12 + v, t, (i, p, r) => { const x = 540 + (r() - .5) * 900, y = 1250 - p * 1100; ctx.fillStyle = i % 3 ? F.particles : curS; ctx.globalAlpha = Math.sin(Math.PI * p) * .9; starP(ctx, x + 18 * Math.sin(p * TAU + i), y, 6 + r() * 9, p * 3); ctx.fill(); });
      ctx.globalAlpha = 1;
      // muestras de color
      for (let i = 0; i < 4; i++) { const x = 540 + (i - 1.5) * 128, act = i === ci, s = act ? 1 + .2 * easeOut(clamp(ui / .25)) + .0 : 1; const pop = i === prevI ? 1 + .2 * (1 - easeOut(clamp(ui / .25))) : s;
        const sc = act ? s : pop; ctx.fillStyle = F.sw[i]; circle(ctx, x, 1470, 36 * sc); ctx.fill();
        const ew = easeOut(clamp(ui / .25)), wi = act ? ew : (i === prevI ? 1 - ew : 0); ctx.strokeStyle = F.dark ? '#ffffff' : '#2b2f6b'; ctx.lineWidth = 3 + 4 * wi; ctx.globalAlpha = .55 + .45 * wi; circle(ctx, x, 1470, 36 * sc + 9); ctx.stroke(); ctx.globalAlpha = 1; }
      L.vignette(ctx, W, H, F.dark ? .5 : .15);
    }
  };

  /* ---------- FASHION-C (foto): flat-lay de accesorios con sombras largas ---------- */
  const FC = [
    { bg: '#ffd95e', shadow: [74, 30, 0], blocks: [['rr', '#ff7aa8', 290, 660, 360, 470, -.12], ['c', '#2fd6b4', 790, 980, 240], ['rr', '#fff7e8', 440, 1250, 600, 340, .08]],
      glasses: ['#e8453c', '#2a2350', '#8f7bff'], cap: ['#2b4bff', '#fff7e8', '#1a2fb8'], bag: ['#e8453c', '#ffb3c6', '#2a2350'], watch: ['#1f2b63', '#e8ecf4', '#fff7e8'], phones: ['#2fd6b4', '#ff7aa8', '#1b1736'], ring: '#ffffff',
      pos: { glasses: [560, 580, 1.12, -.07], cap: [770, 930, 1.0, -.35], bag: [420, 1220, 1.0, .1], watch: [170, 950, .92, -.1], phones: [790, 1350, .8, .35] } },
    { bg: '#ffc4d0', shadow: [95, 15, 55], blocks: [['c', '#fff1d6', 300, 1180, 240], ['rr', '#1c8f8a', 770, 740, 430, 360, .14], ['rr', '#ffe066', 640, 1150, 560, 300, -.1], ['c', '#ff7a45', 150, 520, 120]],
      glasses: ['#fff7e8', '#ff8a3d', '#ffd6a0'], cap: ['#fff7e8', '#ff5a3d', '#ffd9c8'], bag: ['#1c8f8a', '#ffe066', '#0e4f4c'], watch: ['#ff5a3d', '#fff7e8', '#1c1c2e'], phones: ['#8f7bff', '#2a2350', '#2a2350'], ring: '#ffd24a',
      pos: { glasses: [600, 1180, 1.05, .06], cap: [310, 790, 1.0, .3], bag: [770, 760, 1.05, -.1], watch: [950, 1090, .75, .12], phones: [270, 1350, .8, -.25] } }
  ];
  const SHC = { v: '#000' };

  function fcGlasses(c, sh, P) {
    const [fr, ln, hi] = P; const FILL = (col) => { c.fillStyle = sh ? SHC.v : col; c.fill(); };
    const lens = (cx) => { c.beginPath(); c.moveTo(cx - 92, -60); c.lineTo(cx + 92, -60); c.quadraticCurveTo(cx + 108, 10, cx + 60, 62); c.quadraticCurveTo(cx, 82, cx - 60, 62); c.quadraticCurveTo(cx - 108, 10, cx - 92, -60); c.closePath(); };
    c.lineJoin = 'round'; c.lineCap = 'round';
    [-1, 1].forEach(sg => { c.strokeStyle = sh ? SHC.v : fr; c.lineWidth = 20; c.beginPath(); c.moveTo(sg * 206, -48); c.bezierCurveTo(sg * 224, -110, sg * 240, -180, sg * 230, -236); c.quadraticCurveTo(sg * 224, -262, sg * 196, -266); c.stroke(); });
    c.strokeStyle = sh ? SHC.v : fr; c.lineWidth = 22; c.beginPath(); c.moveTo(-34, -38); c.quadraticCurveTo(0, -78, 34, -38); c.stroke();
    [-1, 1].forEach(sg => { lens(sg * 122); c.lineWidth = 30; c.strokeStyle = sh ? SHC.v : fr; c.stroke(); FILL(ln); });
    if (!sh) { [-1, 1].forEach(sg => { c.save(); lens(sg * 122); c.clip(); c.fillStyle = lin(c, sg * 122 - 90, -60, sg * 122 + 90, 70, [[0, 'rgba(255,255,255,.18)'], [.5, 'rgba(255,255,255,0)'], [1, hi + '55']]); c.fillRect(sg * 122 - 120, -80, 240, 170); c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.moveTo(sg * 122 - 60, -60); c.lineTo(sg * 122 - 30, -60); c.lineTo(sg * 122 - 78, 50); c.lineTo(sg * 122 - 104, 50); c.closePath(); c.fill(); c.restore(); c.fillStyle = 'rgba(0,0,0,.25)'; circle(c, sg * 206, -52, 6); c.fill(); }); }
  }
  function fcCap(c, sh, P) {
    const [m, vs, dk] = P; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-150, 50); c.bezierCurveTo(-190, 250, -90, 335, 0, 335); c.bezierCurveTo(90, 335, 190, 250, 150, 50); c.closePath(); c.fillStyle = sh ? SHC.v : vs; c.fill();
    if (!sh) { c.save(); c.clip(); c.fillStyle = lin(c, 0, 50, 0, 335, [[0, 'rgba(0,0,0,.28)'], [.35, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.1)']]); c.fillRect(-200, 40, 400, 320); c.restore(); c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 4; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(-150 + k * 14, 70 + k * 6); c.bezierCurveTo(-182 + k * 18, 250 - k * 8, -84 + k * 14, 322 - k * 9, 0, 322 - k * 9); c.bezierCurveTo(84 - k * 14, 322 - k * 9, 182 - k * 18, 250 - k * 8, 150 - k * 14, 70 + k * 6); c.stroke(); } }
    circle(c, 0, 0, 158); c.fillStyle = sh ? SHC.v : m; c.fill();
    if (!sh) {
      c.save(); circle(c, 0, 0, 158); c.clip(); c.fillStyle = rad(c, -50, -60, 10, 230, [[0, 'rgba(255,255,255,.28)'], [.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.28)']]); c.fillRect(-170, -170, 340, 340);
      c.strokeStyle = 'rgba(0,0,0,.24)'; c.lineWidth = 5; for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + .4; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a + .3) * 90, Math.sin(a + .3) * 90, Math.cos(a) * 160, Math.sin(a) * 160); c.stroke(); }
      c.restore(); c.strokeStyle = dk; c.lineWidth = 8; circle(c, 0, 0, 150); c.stroke();
      c.fillStyle = dk; circle(c, 0, 0, 18); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; circle(c, -5, -6, 7); c.fill();
      [0, 1, 2, 3, 4, 5].forEach(k => { const a = k * TAU / 6 + .4 + .6; c.fillStyle = 'rgba(0,0,0,.35)'; circle(c, Math.cos(a) * 112, Math.sin(a) * 112, 5); c.fill(); });
    }
  }
  function fcBag(c, sh, P) {
    const [m, ac, dk] = P; c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = sh ? SHC.v : dk; c.lineWidth = 20; c.beginPath(); c.moveTo(-82, -96); c.bezierCurveTo(-92, -300, 92, -300, 82, -96); c.stroke();
    rr(c, -160, -104, 320, 240, 30); c.fillStyle = sh ? SHC.v : m; c.fill();
    if (!sh) {
      c.save(); rr(c, -160, -104, 320, 240, 30); c.clip(); c.fillStyle = ac; c.beginPath(); c.moveTo(-170, -110); c.lineTo(170, -110); c.lineTo(170, 20); c.quadraticCurveTo(0, 120, -170, 20); c.closePath(); c.fill();
      c.fillStyle = lin(c, 0, -104, 0, 136, [[0, 'rgba(255,255,255,.18)'], [1, 'rgba(0,0,0,.18)']]); c.fillRect(-170, -110, 340, 260); c.restore();
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 4; c.setLineDash([12, 10]); c.beginPath(); c.moveTo(-136, 22); c.quadraticCurveTo(0, 112, 136, 22); c.stroke(); c.setLineDash([]);
      c.fillStyle = dk; circle(c, 0, 62, 24); c.fill(); c.fillStyle = '#ffe9a8'; circle(c, 0, 62, 13); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; circle(c, -4, 57, 4); c.fill();
      c.fillStyle = '#ffe9a8'; circle(c, -82, -96, 9); c.fill(); circle(c, 82, -96, 9); c.fill();
    }
  }
  function fcWatch(c, sh, P, t) {
    const [st, cs, dl] = P; c.lineJoin = 'round'; c.lineCap = 'round';
    const strap = (y0, y1) => { c.beginPath(); c.moveTo(-50, y0); c.lineTo(50, y0); c.lineTo(42, y1); c.lineTo(-42, y1); c.closePath(); };
    c.fillStyle = sh ? SHC.v : st; rr(c, -48, -430, 96, 360, 30); c.fill(); rr(c, -46, 70, 92, 380, 30); c.fill();
    if (!sh) {
      c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(-48, -430, 14, 360); c.fillRect(-46, 70, 14, 380);
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3.5; c.setLineDash([10, 9]); c.beginPath(); c.moveTo(-34, -420); c.lineTo(-34, -80); c.moveTo(34, -420); c.lineTo(34, -80); c.moveTo(-34, 80); c.lineTo(-34, 440); c.moveTo(34, 80); c.lineTo(34, 440); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 7; k++) { circle(c, 0, 150 + k * 44, 8); c.fill(); }
      c.fillStyle = 'rgba(0,0,0,.2)'; rr(c, -48, -150, 96, 48, 0); c.fill();
    }
    c.fillStyle = sh ? SHC.v : cs; rr(c, 100, -26, 28, 52, 10); c.fill(); circle(c, 0, 0, 122); c.fill();
    if (!sh) {
      c.fillStyle = lin(c, -100, -100, 100, 100, [[0, '#ffffff'], [.5, '#bfc7d6'], [1, '#e8edf6']]); circle(c, 0, 0, 122); c.fill();
      c.fillStyle = dl; circle(c, 0, 0, 98); c.fill(); c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 3; circle(c, 0, 0, 98); c.stroke();
      c.strokeStyle = '#1f2b63'; for (let k = 0; k < 12; k++) { const a = k * TAU / 12; c.lineWidth = k % 3 ? 4 : 9; c.beginPath(); c.moveTo(Math.cos(a) * 84, Math.sin(a) * 84); c.lineTo(Math.cos(a) * 94, Math.sin(a) * 94); c.stroke(); }
      const hand = (a, len, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(-Math.cos(a) * 14, -Math.sin(a) * 14); c.lineTo(Math.cos(a) * len, Math.sin(a) * len); c.stroke(); };
      hand(-Math.PI / 2 - .9, 46, 10, '#1f2b63'); hand(-Math.PI / 2 + .62, 70, 7, '#1f2b63'); hand(TAU * (t * 7) - Math.PI / 2, 78, 3.5, '#e8453c');
      c.fillStyle = '#e8453c'; circle(c, 0, 0, 8); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(-90, -30); c.quadraticCurveTo(-40, -92, 40, -90); c.lineTo(20, -70); c.quadraticCurveTo(-30, -66, -70, -20); c.closePath(); c.fill();
    }
  }
  function fcPhones(c, sh, P) {
    const [cu, hb, dk] = P; c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = sh ? SHC.v : hb; c.lineWidth = 36; c.beginPath(); c.arc(0, 90, 212, Math.PI * 1.04, Math.PI * 1.96); c.stroke();
    if (!sh) { c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 8; c.beginPath(); c.arc(0, 90, 220, Math.PI * 1.1, Math.PI * 1.7); c.stroke(); c.strokeStyle = dk; c.lineWidth = 16; c.beginPath(); c.arc(0, 90, 202, Math.PI * 1.3, Math.PI * 1.7); c.stroke(); }
    [-1, 1].forEach(sg => { c.save(); c.translate(sg * 222, 86); c.rotate(sg * -.1); c.fillStyle = sh ? SHC.v : cu; ellipse(c, 0, 0, 66, 108); c.fill(); if (!sh) { c.fillStyle = dk; ellipse(c, 0, 0, 46, 84); c.fill(); c.fillStyle = 'rgba(255,255,255,.1)'; ellipse(c, 0, 0, 30, 62); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 58, Math.PI * 1.05, Math.PI * 1.5); c.stroke(); } c.restore(); });
    c.strokeStyle = sh ? SHC.v : dk; c.lineWidth = 8; c.beginPath(); c.moveTo(214, 190); c.bezierCurveTo(200, 300, 330, 300, 270, 380); c.bezierCurveTo(260, 470, 190, 450, 200, 470); c.stroke();
    c.fillStyle = sh ? SHC.v : dk; rr(c, 178, 462, 44, 70, 10); c.fill();
  }
  function fcLeaf(ctx, x, y, a, len, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(len * .3, -len * .28, len * .8, -len * .2, len, 0); ctx.bezierCurveTo(len * .8, len * .2, len * .3, len * .28, 0, 0); ctx.fill(); ctx.restore(); }

  SCENES['fashion-c'] = {
    topic: 'fashion', stillT: [.3, .7],
    cap: [
      { ca: 'Flat-lay del dia: gorra, ulleres i bossa ☀️ #outfit #moda', es: 'Flat-lay del día: gorra, gafas y bolso ☀️ #outfit #moda', en: 'Flat-lay of the day: cap, shades and bag ☀️ #outfit #style' },
      { ca: 'Accessoris en rosa i verd aigua 🕶️ #flatlay', es: 'Accesorios en rosa y verde agua 🕶️ #flatlay', en: 'Accessories in pink and teal 🕶️ #flatlay' }],
    draw(ctx, t, v) {
      const P = FC[v % FC.length], ang = .86, dx = Math.cos(ang), dy = Math.sin(ang), LS = 330;
      const sh = P.shadow;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = lin(ctx, 0, 0, W, H, [[0, 'rgba(255,255,255,.22)'], [.6, 'rgba(255,255,255,0)'], [1, `rgba(${sh[0]},${sh[1]},${sh[2]},.2)`]]); ctx.fillRect(0, 0, W, H);
      const shAt = (x, y, scl, rot, fn, alpha = .016, steps = 56) => { for (let k = steps; k >= 0; k--) { const q = k / steps; ctx.save(); ctx.translate(x + dx * LS * q * scl, y + dy * LS * q * scl); ctx.rotate(rot); ctx.scale(scl, scl); SHC.v = `rgba(${sh[0]},${sh[1]},${sh[2]},${alpha})`; ctx.fillStyle = SHC.v; ctx.strokeStyle = SHC.v; fn(ctx, true); ctx.restore(); } };
      // bloques de papel con sombra larga
      P.blocks.forEach(b => {
        const draw = (c, s) => { if (b[0] === 'c') { circle(c, 0, 0, b[4]); c.fillStyle = s ? c.fillStyle : b[1]; c.fill(); } else { rr(c, -b[4] / 2, -b[5] / 2, b[4], b[5], 24); c.fillStyle = s ? c.fillStyle : b[1]; c.fill(); } };
        const x = b[0] === 'c' ? b[2] : b[2], y = b[3], rot = b[0] === 'c' ? 0 : b[6];
        const bx = b[0] === 'c' ? b[2] : b[2], by = b[3];
        for (let k = 28; k >= 0; k--) { const q = k / 28; ctx.save(); ctx.translate(bx + dx * 120 * q, by + dy * 120 * q); ctx.rotate(rot); ctx.fillStyle = `rgba(${sh[0]},${sh[1]},${sh[2]},.018)`; if (b[0] === 'c') circle(ctx, 0, 0, b[4]); else rr(ctx, -b[4] / 2, -b[5] / 2, b[4], b[5], 24); ctx.fill(); ctx.restore(); }
        ctx.save(); ctx.translate(bx, by); ctx.rotate(rot); draw(ctx, false); ctx.restore();
      });
      // objetos: de abajo hacia arriba
      const order = [['watch', fcWatch], ['bag', fcBag], ['phones', fcPhones], ['cap', fcCap], ['glasses', fcGlasses]];
      if (v % 2) order.splice(0, order.length, ['watch', fcWatch], ['phones', fcPhones], ['cap', fcCap], ['bag', fcBag], ['glasses', fcGlasses]);
      order.forEach(([name, fn]) => {
        const [x, y, s, rot] = P.pos[name]; const cols = P[name];
        shAt(x, y, s, rot, (c, sflag) => fn(c, true, cols, t));
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); fn(ctx, false, cols, t); ctx.restore();
      });
      // anillo de oro y estrella
      const rg = v % 2 ? [640, 1450] : [230, 1440];
      shAt(rg[0], rg[1], 1, 0, (c) => { c.lineWidth = 14; circle(c, 0, 0, 40); c.stroke(); }, .018, 30);
      ctx.strokeStyle = P.ring; ctx.lineWidth = 14; circle(ctx, rg[0], rg[1], 40); ctx.stroke();
      ctx.fillStyle = '#9ff0ff'; ctx.beginPath(); ctx.moveTo(rg[0], rg[1] - 58); ctx.lineTo(rg[0] + 14, rg[1] - 40); ctx.lineTo(rg[0], rg[1] - 24); ctx.lineTo(rg[0] - 14, rg[1] - 40); ctx.closePath(); ctx.fill();
      // sombra de hojas de planta (editorial)
      ctx.save(); const lc = `rgba(${sh[0]},${sh[1]},${sh[2]},${.1})`; const sw = .02 * wave(t, 1);
      for (let i = 0; i < 9; i++) fcLeaf(ctx, 1110, 250, Math.PI * (.62 + i * .08) + sw * (i % 2 ? 1 : -1), 520 + (i % 3) * 90, lc);
      for (let i = 0; i < 6; i++) fcLeaf(ctx, -30, 1560, -Math.PI * (.12 + i * .09) - sw, 480 + (i % 3) * 80, lc);
      ctx.restore();
      L.vignette(ctx, W, H, .18);
    }
  };

})();
