/* ANIMALS – a: gata/gato en la ventana · b: zorro trotando por el bosque (parallax) · c: búho con luna / rana bajo la lluvia */
(function () {
  const { TAU, wave, wave01, pulse, lin, rad, rr, circle, ellipse, halo, rng, lerp, clamp, smooth, easeOut, easeInOut } = L;
  const fract = (x) => x - Math.floor(x);
  const _pc = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  function mixh(a, b, k) { const p = _pc(a), q = _pc(b); return '#' + p.map((v, i) => Math.round(lerp(v, q[i], clamp(k))).toString(16).padStart(2, '0')).join(''); }
  /* halo sin fleco gris: mismo color con alfa 0 */
  function glow(ctx, x, y, r, c, a = 1) { const q = _pc(c).join(','); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${q},${a})`); g.addColorStop(.4, `rgba(${q},${a * .38})`); g.addColorStop(1, `rgba(${q},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  const rgba = (c, a) => { const p = _pc(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  /* pulso gaussiano estrecho periódico (centro c en 0..1) */
  const bump = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));

  /* ===================================================================== */
  /* ANIMALS-A  ·  gato en la ventana                                      */
  /* ===================================================================== */
  const PCAT = [
    { name: 'tabby', wall: ['#7d2f3a', '#c4553d'], wallDeco: '#a8433a', sky: ['#ffb36b', '#ffd9a1', '#fff4d2'], sun: '#fff7da', frame: '#fff1dc', frameSh: '#e8c9a4', curtain: ['#ff9d86', '#e0644f'], sill: ['#c98a52', '#8a5430'], beam: 'rgba(255,238,190,', mote: '#fff0c4',
      fur: { base: '#f08a2c', light: '#ffc46b', dark: '#c4601a', stripe: '#a84a10', cream: '#fff1da', ear: '#ff9db0', nose: '#ff8fa3', iris: ['#ffe36b', '#f2a40d'], rim: 'rgba(255,236,170,.9)' }, tux: false, arch: false, far: '#f0a07a', hills: '#e98e70' },
    { name: 'tux', wall: ['#1d1b4f', '#4a3480'], wallDeco: '#3a2d78', sky: ['#162a6b', '#3f6fd1', '#a9c4ff'], sun: '#fffbe6', frame: '#e8e2ff', frameSh: '#b3a8e8', curtain: ['#8a5fd6', '#5a3ba8'], sill: ['#7a5a8a', '#3d2a5a'], beam: 'rgba(190,215,255,', mote: '#dbe8ff',
      fur: { base: '#262244', light: '#4b4584', dark: '#12102a', stripe: '#12102a', cream: '#f6f2ff', ear: '#d99ab4', nose: '#ff9db5', iris: ['#c9ff7a', '#4cc24a'], rim: 'rgba(160,200,255,.95)' }, tux: true, arch: true, far: '#2a3d8f', hills: '#243580' }
  ];
  function earPath(ctx, s) {
    ctx.beginPath(); ctx.moveTo(s * 40, -150); ctx.bezierCurveTo(s * 70, -330, s * 120, -420, s * 175, -440); ctx.bezierCurveTo(s * 225, -420, s * 270, -300, s * 290, -150); ctx.closePath();
  }
  function headPath(ctx) {
    ctx.beginPath(); ctx.moveTo(0, -235);
    ctx.bezierCurveTo(150, -235, 285, -190, 303, -70); ctx.bezierCurveTo(308, -15, 335, 40, 355, 80); ctx.quadraticCurveTo(338, 100, 305, 122);
    ctx.quadraticCurveTo(328, 160, 280, 190); ctx.bezierCurveTo(225, 232, 112, 247, 0, 247);
    ctx.bezierCurveTo(-112, 247, -225, 232, -280, 190); ctx.quadraticCurveTo(-328, 160, -305, 122); ctx.quadraticCurveTo(-338, 100, -355, 80);
    ctx.bezierCurveTo(-335, 40, -308, -15, -303, -70); ctx.bezierCurveTo(-285, -190, -150, -235, 0, -235); ctx.closePath();
  }
  function catEye(ctx, P, cx, cy, s, blink, lookX, lookY, t) {
    const F = P.fur, rx = 64, ry = 72;
    ctx.save(); ctx.translate(cx, cy);
    ctx.save(); ellipse(ctx, 0, 0, rx, ry); ctx.clip();
    ctx.fillStyle = '#fff8e8'; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
    ctx.fillStyle = rad(ctx, lookX * .5, lookY * .5, 4, 62, [[0, F.iris[0]], [.65, F.iris[1]], [1, mixh(F.iris[1], '#3a1500', .6)]]); circle(ctx, lookX, lookY, 58); ctx.fill();
    const dil = 17 + 12 * wave(t, 1, .1); ctx.fillStyle = '#150a12'; ellipse(ctx, lookX, lookY, dil, 50); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; circle(ctx, lookX - 22, lookY - 26, 17); ctx.fill(); circle(ctx, lookX + 20, lookY + 24, 8); ctx.fill();
    // sombra del párpado superior
    ctx.fillStyle = 'rgba(30,10,10,.25)'; ctx.fillRect(-rx, -ry, rx * 2, 26);
    ctx.restore();
    // contorno solo por debajo del párpado
    const ly = -ry + blink * (ry * 2 + 6), lidc = mixh(F.base, F.light, .22);
    if (blink > .01) { ctx.save(); ellipse(ctx, 0, 0, rx, ry); ctx.clip(); ctx.fillStyle = lidc; ctx.fillRect(-rx - 4, -ry - 6, rx * 2 + 8, ly + ry + 6); ctx.restore(); }
    const ink = F.dark === '#12102a' ? '#08060f' : '#3a1a0a';
    ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.save(); ctx.beginPath(); ctx.rect(-rx - 12, Math.min(ly - 4, ry + 12), rx * 2 + 24, ry * 3); ctx.clip(); ellipse(ctx, 0, 0, rx, ry); ctx.stroke(); ctx.restore();
    if (blink > .01 && blink < .97) { const hw = rx * Math.sqrt(Math.max(0, 1 - (ly / ry) * (ly / ry))); ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-hw, ly); ctx.quadraticCurveTo(0, ly + 16 * blink, hw, ly); ctx.stroke(); }
    if (blink > .8) { ctx.save(); ctx.globalAlpha = smooth((blink - .8) / .2); ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, -16, rx * .85, Math.PI * .14, Math.PI * .86); ctx.stroke(); ctx.lineWidth = 8; [-1, 1].forEach((k) => { ctx.beginPath(); ctx.moveTo(k * rx * .8, 28); ctx.lineTo(k * (rx * .8 + 16), 42); ctx.stroke(); }); ctx.restore(); }
    // ceja-pestaña
    ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-s * rx * 1.05, -4); ctx.quadraticCurveTo(-s * rx * .9, -ry * 1.1, s * rx * .2, -ry * 1.06); ctx.stroke();
    ctx.restore();
  }
  function whisker(ctx, x0, y0, s, i, t, col) {
    const a = (i - 1) * .17, L0 = 250 + i * 8, sw = 10 * wave(t, 1, i * .13 + (s > 0 ? .1 : 0));
    ctx.strokeStyle = col; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + s * L0 * .5, y0 + a * L0 * .35 - 26 + sw * .4, x0 + s * L0, y0 + a * L0 + 14 + sw); ctx.stroke();
  }
  function drawCat(ctx, P, t, ox, oy, v) {
    const F = P.fur, W = 1080;
    const bob = 5 * wave(t, 3), tilt = .028 * wave(t, 1) + .03 * bump(t, .86, .05);
    // parpadeos (rápidos + uno lento)
    const blink = clamp(Math.max(bump(t, .17, .011), bump(t, .47, .011), bump(t, .56, .010)) * 1.0 + smooth(1 - Math.abs(t - .86) / .06) * 1);
    const lookX = 12 * wave(t, 1, .1) * (1 - blink), lookY = (-7 + 5 * wave(t, 2, .4)) * (1 - blink * .5);
    // --- cola (detrás del cuerpo) ---
    ctx.save(); ctx.translate(ox, oy);
    const BX = 810, BY = 1318, N = 40, pts = []; let x = BX, y = BY, th = -.5; const ds = 12.5;
    for (let i = 0; i <= N; i++) { const s = i / N; pts.push([x, y, s, th]); th = -.5 - 1.75 * s - .35 * s * s + .4 * s * wave(t, 1, -s * .35) + .15 * wave(t, 1, 0) * s; x += Math.cos(th) * ds; y += Math.sin(th) * ds; }
    const tailW = (s) => 34 - 8 * s + (s > .9 ? (s - .9) * 20 : 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = F.dark; ctx.lineWidth = 80; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.strokeStyle = F.base; ctx.lineWidth = 66; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.strokeStyle = rgba(F.light, .5); ctx.lineWidth = 20; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0] - 12, p[1] - 6) : ctx.moveTo(p[0] - 12, p[1] - 6)); ctx.stroke();
    if (!P.tux) { ctx.strokeStyle = F.stripe; ctx.lineWidth = 15; ctx.lineCap = 'butt'; [.2, .36, .52, .68, .84].forEach((s) => { const p = pts[Math.round(s * N)]; ctx.beginPath(); ctx.moveTo(p[0] - Math.sin(p[3]) * 32, p[1] + Math.cos(p[3]) * 32); ctx.lineTo(p[0] + Math.sin(p[3]) * 32, p[1] - Math.cos(p[3]) * 32); ctx.stroke(); }); }
    else { ctx.fillStyle = F.cream; const p = pts[N]; circle(ctx, p[0], p[1], 36); ctx.fill(); }
    ctx.restore();
    // --- cuerpo ---
    ctx.save(); ctx.translate(ox, oy + 1345 * 0); ctx.translate(0, 1345); ctx.scale(1 + .005 * wave(t, 3), 1 + .012 * wave(t, 3)); ctx.translate(0, -1345);
    ctx.beginPath(); ctx.moveTo(205, 1350); ctx.bezierCurveTo(165, 1240, 210, 1110, 330, 1065); ctx.lineTo(750, 1065); ctx.bezierCurveTo(870, 1110, 915, 1240, 875, 1350); ctx.closePath();
    ctx.fillStyle = rad(ctx, 640, 1120, 30, 620, [[0, F.light], [.45, F.base], [1, mixh(F.base, F.dark, .8)]]); ctx.fill();
    ctx.save(); ctx.clip();
    if (!P.tux) { ctx.strokeStyle = rgba(F.stripe, .55); ctx.lineWidth = 20; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(190 + i * 18, 1190 + i * 42); ctx.quadraticCurveTo(250 + i * 18, 1170 + i * 42, 295 + i * 14, 1215 + i * 36); ctx.stroke(); ctx.beginPath(); ctx.moveTo(890 - i * 18, 1190 + i * 42); ctx.quadraticCurveTo(830 - i * 18, 1170 + i * 42, 785 - i * 14, 1215 + i * 36); ctx.stroke(); } }
    ctx.fillStyle = rgba('#000000', .16); ctx.fillRect(0, 1300, W, 80);
    ctx.restore();
    // pechera
    ctx.fillStyle = F.cream; ctx.beginPath(); ctx.moveTo(540, 1085); ctx.bezierCurveTo(430, 1100, 400, 1230, 430, 1350); ctx.lineTo(650, 1350); ctx.bezierCurveTo(680, 1230, 650, 1100, 540, 1085); ctx.fill();
    ctx.fillStyle = rgba(mixh(F.cream, F.base, .3), .5); ctx.beginPath(); ctx.ellipse(590, 1250, 40, 90, .1, 0, TAU); ctx.fill();
    ctx.restore();
    // patas delanteras
    ctx.save(); ctx.translate(ox, oy);
    [[425, 1335], [655, 1335]].forEach(([px, py], i) => {
      ctx.fillStyle = F.cream; ellipse(ctx, px, py, 78, 52); ctx.fill();
      ctx.fillStyle = rad(ctx, px - 20, py - 25, 5, 90, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(120,80,60,.25)']]); ellipse(ctx, px, py, 78, 52); ctx.fill();
      ctx.strokeStyle = 'rgba(120,70,50,.45)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (let k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(px + k * 22, py + 8); ctx.lineTo(px + k * 24, py + 40); ctx.stroke(); }
    });
    ctx.restore();
    // --- cabeza ---
    ctx.save(); ctx.translate(ox + 540, oy + 1085 + bob); ctx.rotate(tilt); ctx.translate(0, -225);
    // orejas
    [-1, 1].forEach((s) => {
      const tw = s < 0 ? bump(t, .31, .016) * Math.sin(TAU * (t - .31) * 34) : bump(t, .71, .016) * Math.sin(TAU * (t - .71) * 34);
      const ang = s * (.0 + .03 * wave(t, 1, s * .1)) + .30 * tw;
      ctx.save(); ctx.translate(s * 165, -150); ctx.rotate(ang); ctx.translate(-s * 165, 150);
      earPath(ctx, s); ctx.fillStyle = lin(ctx, 0, -440, 0, -150, [[0, F.light], [1, F.base]]); ctx.fill();
      ctx.save(); ctx.translate(s * 175, -185); ctx.scale(.62, .62); ctx.translate(-s * 175, 185); earPath(ctx, s); ctx.fillStyle = F.ear; ctx.fill();
      ctx.restore();
      // mechón interior
      ctx.strokeStyle = rgba(F.cream, P.tux ? .0 : .55); ctx.lineWidth = 9; ctx.lineCap = 'round'; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(s * (155 + k * 26), -170); ctx.quadraticCurveTo(s * (158 + k * 24), -250, s * (172 + k * 24), -300); ctx.stroke(); }
      ctx.restore();
    });
    // cara
    headPath(ctx); ctx.fillStyle = rad(ctx, 110, -150, 20, 520, [[0, F.light], [.4, F.base], [1, mixh(F.base, F.dark, .7)]]); ctx.fill();
    ctx.save(); headPath(ctx); ctx.clip();
    // marcas
    if (!P.tux) {
      ctx.strokeStyle = F.stripe; ctx.lineCap = 'round';
      ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(0, -238); ctx.lineTo(0, -140); ctx.stroke();
      ctx.lineWidth = 20; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 70, -232); ctx.quadraticCurveTo(s * 80, -190, s * 70, -150); ctx.stroke(); ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(s * 140, -222); ctx.quadraticCurveTo(s * 150, -190, s * 138, -165); ctx.stroke(); ctx.lineWidth = 20; });
      ctx.lineWidth = 17; [-1, 1].forEach((s) => { for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(s * 360, 20 + k * 52); ctx.quadraticCurveTo(s * 300, 12 + k * 52, s * 255, 34 + k * 52); ctx.stroke(); } });
    } else {
      ctx.fillStyle = F.cream; ctx.beginPath(); ctx.moveTo(0, -150); ctx.bezierCurveTo(-34, -60, -50, 20, -88, 76); ctx.lineTo(88, 76); ctx.bezierCurveTo(50, 20, 34, -60, 0, -150); ctx.fill();
      ctx.fillStyle = F.cream; ellipse(ctx, 0, 190, 150, 90); ctx.fill();
    }
    // hocico
    ctx.fillStyle = F.cream; [-1, 1].forEach((s) => { ellipse(ctx, s * 58, 108, 76, 58); ctx.fill(); });
    if (!P.tux) { ellipse(ctx, 0, 190, 100, 62); ctx.fill(); }
    ctx.fillStyle = rgba('#8a4a30', .28); [-1, 1].forEach((s) => [[-30, 100], [0, 118], [30, 100]].forEach(([dx, dy]) => { circle(ctx, s * 66 + dx * s * .7, dy + 4, 4.5); ctx.fill(); }));
    // luz de borde
    ctx.strokeStyle = lin(ctx, 300, -250, -60, 60, [[0, F.rim], [1, 'rgba(255,255,255,0)']]); ctx.lineWidth = 26; headPath(ctx); ctx.stroke();
    ctx.restore();
    // ojos
    catEye(ctx, P, -128, -8, -1, blink, lookX, lookY, t); catEye(ctx, P, 128, -8, 1, blink, lookX, lookY, t);
    // nariz y boca
    ctx.fillStyle = F.nose; ctx.beginPath(); ctx.moveTo(-26, 62); ctx.quadraticCurveTo(0, 52, 26, 62); ctx.quadraticCurveTo(24, 86, 0, 96); ctx.quadraticCurveTo(-24, 86, -26, 62); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ellipse(ctx, -8, 66, 8, 4, -.3); ctx.fill();
    ctx.strokeStyle = '#6b3a2a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 96); ctx.lineTo(0, 118); ctx.moveTo(-58, 140); ctx.quadraticCurveTo(-8, 150, 0, 118); ctx.quadraticCurveTo(8, 150, 58, 140); ctx.stroke();
    // bigotes
    for (let i = 0; i < 3; i++) { whisker(ctx, -112, 112 + i * 16, -1, i, t, 'rgba(255,255,255,.9)'); whisker(ctx, 112, 112 + i * 16, 1, i, t, 'rgba(255,255,255,.9)'); }
    ctx.restore();
  }
  function windowShape(ctx, P, x0, y0, x1, y1) {
    if (P.arch) { const r = (x1 - x0) / 2; ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0 + r); ctx.arc((x0 + x1) / 2, y0 + r, r, Math.PI, 0); ctx.lineTo(x1, y1); ctx.closePath(); }
    else rr(ctx, x0, y0, x1 - x0, y1 - y0, 34);
  }
  function curtain(ctx, P, side, t) {
    const w = 165, x0 = side < 0 ? 0 : 1080;
    const g = lin(ctx, 0, 0, side * w, 0, [[0, P.curtain[1]], [.5, P.curtain[0]], [1, P.curtain[1]]]);
    ctx.save(); ctx.translate(x0, 0); ctx.scale(side < 0 ? 1 : -1, 1);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w + 20 + 10 * wave(t, 1), 0); ctx.bezierCurveTo(w - 40, 500, w + 30 + 12 * wave(t, 1, .2), 900, w - 70, 1120); ctx.bezierCurveTo(w - 110, 1210, 30, 1230, 0, 1230); ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 16; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(40 + i * 42, 0); ctx.bezierCurveTo(30 + i * 40 + 12 * wave(t, 1, i * .1), 500, 60 + i * 38, 900, 20 + i * 36, 1240); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 10; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(58 + i * 42, 0); ctx.bezierCurveTo(48 + i * 40 + 12 * wave(t, 1, i * .1), 500, 78 + i * 38, 900, 38 + i * 36, 1240); ctx.stroke(); }
    ctx.restore();
  }

  SCENES['animals-a'] = {
    topic: 'animals', stillT: [.42, .12],
    cap: [
      { ca: 'La meua gata fent guàrdia a la finestra 🐱 #gats #mood', es: 'Mi gata haciendo guardia en la ventana 🐱 #gatos #mood', en: 'My cat on guard duty at the window 🐱 #cats #mood' },
      { ca: 'Gat de nit amb llum de lluna i parpelleig lent 🌙 #gats', es: 'Gato de noche con luz de luna y parpadeo lento 🌙 #gatos', en: 'Night cat with moonlight and a slow blink 🌙 #cats' }],
    draw(ctx, t, v) {
      const P = PCAT[v % 2], W = 1080, H = 1920, S = 1.1, G0 = 1455;
      const grp = (fn) => { ctx.save(); ctx.translate(540, G0); ctx.scale(S, S); ctx.translate(-540, -1345); fn(); ctx.restore(); };
      // pared
      ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, P.wall[0]], [1, P.wall[1]]]); ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rgba(P.wallDeco, .5); for (let r = 0; r < 12; r++) for (let c = 0; c < 8; c++) { circle(ctx, c * 150 + (r % 2 ? 75 : 0) + 20, r * 170 + 40, 7); ctx.fill(); }
      grp(() => {
      // ventana: exterior
      const wx0 = 130, wx1 = 950, wy0 = 255, wy1 = 1385;
      ctx.save(); windowShape(ctx, P, wx0, wy0, wx1, wy1); ctx.clip();
      ctx.fillStyle = lin(ctx, 0, wy0, 0, wy1, [[0, P.sky[0]], [.5, P.sky[1]], [1, P.sky[2]]]); ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
      const sunX = P.tux ? 720 : 770, sunY = P.tux ? 560 : 520;
      if (P.tux) L.stars(ctx, 60, 22, t, { y1: 900, alpha: .95 });
      glow(ctx, sunX, sunY, 760, P.tux ? '#a9c4ff' : '#fff0b8', P.tux ? .55 : .85); glow(ctx, sunX, sunY, 300, P.sun, .8);
      ctx.fillStyle = P.sun; circle(ctx, sunX, sunY, P.tux ? 120 : 100); ctx.fill();
      if (P.tux) { ctx.fillStyle = 'rgba(150,170,230,.45)'; [[-35, -28, 26], [38, 26, 20], [18, -58, 13]].forEach(([dx, dy, r]) => { circle(ctx, sunX + dx, sunY + dy, r); ctx.fill(); }); }
      // nubes
      for (let i = 0; i < 3; i++) { const x = ((i * 520 + t * 1560) % 1560) - 400; L.cloud(ctx, x, 460 + i * 150 + (i % 2) * 40, 1.1, P.tux ? 'rgba(170,190,255,.35)' : 'rgba(255,255,255,.55)'); }
      // colinas y árboles lejanos
      ctx.fillStyle = P.hills; ctx.beginPath(); ctx.moveTo(wx0, wy1); for (let x = wx0; x <= wx1 + 10; x += 10) ctx.lineTo(x, 1130 - 70 * (.5 + .5 * L.ridge(x, 7 + v, 1080, 3))); ctx.lineTo(wx1, wy1); ctx.fill();
      ctx.fillStyle = P.far; const rr0 = rng(31 + v); for (let i = 0; i < 9; i++) { const x = wx0 + 40 + i * 95 + rr0() * 30, h = 150 + rr0() * 110; ctx.beginPath(); ctx.moveTo(x - 50, 1240); ctx.lineTo(x, 1240 - h); ctx.lineTo(x + 50, 1240); ctx.fill(); ctx.fillRect(x - 8, 1230, 16, 60); }
      ctx.fillStyle = rgba(P.sky[2], .25); ctx.fillRect(wx0, 1180, wx1 - wx0, 200);
      // haces de luz (dentro del cristal)
      ctx.restore();
      // marco
      ctx.save(); windowShape(ctx, P, wx0, wy0, wx1, wy1); ctx.lineWidth = 44; ctx.strokeStyle = P.frame; ctx.stroke(); ctx.lineWidth = 8; ctx.strokeStyle = P.frameSh; ctx.stroke(); ctx.restore();
      ctx.fillStyle = P.frame; ctx.fillRect(wx0, 835, wx1 - wx0, 26); ctx.fillRect(536 - 13, wy0 + (P.arch ? 0 : 0), 26, wy1 - wy0 - 10);
      ctx.fillStyle = P.frameSh; ctx.fillRect(wx0, 856, wx1 - wx0, 5);
      // haces de luz que cruzan la habitación
      ctx.save(); for (let i = 0; i < 6; i++) {
        const a = 2.25 + i * .105 + .02 * wave(t, 1, i * .17), w = .028 + .012 * wave01(t, 1, i * .2), R = 2300, ox = sunX, oy = sunY;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a - w) * R, oy + Math.sin(a - w) * R); ctx.lineTo(ox + Math.cos(a + w) * R, oy + Math.sin(a + w) * R); ctx.closePath();
        const aa = .30 + .08 * wave(t, 1, i * .13);
        ctx.fillStyle = lin(ctx, ox, oy, ox + Math.cos(a) * 1500, oy + Math.sin(a) * 1500, [[0, P.beam + aa + ')'], [1, P.beam + '0)']]); ctx.fill();
      } ctx.restore();
      // repisa
      ctx.fillStyle = lin(ctx, 0, 1345, 0, 1445, [[0, P.sill[0]], [1, P.sill[1]]]); rr(ctx, 70, 1340, 940, 96, 18); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(86, 1344, 908, 8);
      // sombras en la repisa
      L.shadowEllipse(ctx, 540, 1352, 380, 22, .38);
      });
      curtain(ctx, P, -1, t); curtain(ctx, P, 1, t);
      grp(() => {
      // decoración de la repisa
      if (!P.tux) {
        // maceta con hojas
        const px = 190, py = 1342;
        ctx.save(); ctx.translate(px, py);
        for (let i = 0; i < 6; i++) { const a = -1.25 + i * .5 + .05 * wave(t, 1, i * .12); ctx.save(); ctx.rotate(a + .0); ctx.fillStyle = i % 2 ? '#3fae62' : '#67cf7a'; ctx.beginPath(); ctx.moveTo(0, -70); ctx.bezierCurveTo(-34, -140, -26, -220, 0, -290 - (i % 3) * 20); ctx.bezierCurveTo(26, -220, 34, -140, 0, -70); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(0, -250); ctx.stroke(); ctx.restore(); }
        ctx.fillStyle = '#d4693c'; ctx.beginPath(); ctx.moveTo(-72, -96); ctx.lineTo(72, -96); ctx.lineTo(54, 0); ctx.lineTo(-54, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#e88454'; rr(ctx, -82, -118, 164, 34, 10); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(-60, -80, 18, 76); ctx.restore();
      } else {
        // taza con vapor
        const mx = 200, my = 1342;
        ctx.save(); ctx.translate(mx, my); ctx.fillStyle = '#ffd1e2'; rr(ctx, -52, -110, 104, 110, 22); ctx.fill(); ctx.strokeStyle = '#ffd1e2'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(54, -58, 26, -1.2, 1.3); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-38, -98, 12, 86);
        for (let i = 0; i < 3; i++) { const p = fract(t + i / 3); ctx.strokeStyle = `rgba(255,255,255,${.5 * Math.sin(Math.PI * p)})`; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-20 + i * 20 + 8 * wave(t, 1, i * .3), -120 - p * 20); ctx.bezierCurveTo(-30 + i * 20 + 16 * wave(t, 1, i * .3 + p), -170 - p * 40, 10 + i * 20 - 14 * wave(t, 1, i * .3), -210 - p * 50, -6 + i * 20 + 10 * wave(t, 1, p), -260 - p * 70); ctx.stroke(); }
        ctx.restore();
      }
        drawCat(ctx, P, t, 0, 0, v);
      });
      if (P.tux) {
        // guirnalda de luces cálidas
        ctx.strokeStyle = 'rgba(20,10,40,.7)'; ctx.lineWidth = 5; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 20) { const y = 215 + 55 * Math.sin(x / W * Math.PI * 3.0); x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
        for (let i = 0; i < 11; i++) { const x = 40 + i * 100, y = 215 + 55 * Math.sin(x / W * Math.PI * 3.0) + 22, a = .65 + .35 * wave(t, 2, i * .17); glow(ctx, x, y, 80, '#ffb347', .55 * a); ctx.fillStyle = '#fff1c0'; circle(ctx, x, y, 11); ctx.fill(); }
      }
      // gato
      // motas de polvo en el haz
      const r = rng(77 + v);
      for (let i = 0; i < 34; i++) {
        const x0 = 120 + r() * 880, y0 = 300 + r() * 1150, sz = 2.5 + r() * 5.5, ph = r(), k = 1 + Math.floor(r() * 2), big = r() < .18;
        const x = x0 + 70 * wave(t, 1, ph) + 25 * wave(t, 2, ph * 2), y = y0 + 55 * wave(t, 1, ph + .25) - 20 * wave(t, 2, ph), a = .28 + .55 * wave01(t, k, ph);
        glow(ctx, x, y, sz * (big ? 7 : 4), P.mote, .35 * a); ctx.fillStyle = rgba(P.mote, .85 * a); circle(ctx, x, y, sz * (big ? 1.4 : 1)); ctx.fill();
      }
      L.vignette(ctx, W, H, .3);
    }
  };

  /* ===================================================================== */
  /* ANIMALS-B  ·  zorro trotando por el bosque (parallax en bucle)        */
  /* ===================================================================== */
  const PFX = [
    { sky: ['#6ccfca', '#b9e8c4', '#ffe08f'], sun: '#fff3c0', sunP: [700, 700], hills: '#8fd3c0', far: '#6fbdae', mid: '#3d9a8c', trunk: '#1b5862', trunk2: '#2b7a77', leaf: '#ffd25a', mist: '#f3fde0', ground: ['#7fcf78', '#2f7d58'], path: '#e9cf94', pathD: '#c9a468', fern: ['#0e4a47', '#1c7160'], tuft: '#2f9a63', night: false, fox: { body: '#f4772a', light: '#ffae5c', dark: '#c9501a', rim: '#ffe2a8' } },
    { sky: ['#0a0d36', '#27327d', '#7a62c4'], sun: '#fff8e0', sunP: [330, 560], hills: '#3d3b94', far: '#2f3687', mid: '#232b6e', trunk: '#d8d4ee', trunk2: '#b7b1dc', leaf: '#8ff0c8', mist: '#8f7be0', ground: ['#34509a', '#121b4a'], path: '#5d6fc0', pathD: '#3f4f98', fern: ['#080f33', '#16225e'], tuft: '#4f7ec0', night: true, fox: { body: '#f87a2a', light: '#ffb264', dark: '#c4501a', rim: '#a6c8ff' } }
  ];
  const DARK = '#2a1a30', CREAM = '#fff3df';
  /* scroll de capa: periodo P, m periodos por bucle */
  function tiled(ctx, P, m, t, fn, Wv = 1080, pad = 0) { const off = -m * P * t; for (let k = -1; k * P + off < Wv + P; k++) { const xo = k * P + off; if (xo > Wv + 400 || xo < -P - 400) continue; fn(xo, k); } }
  function pine(ctx, x, by, w, h, col, light) {
    const tiers = 4; ctx.fillStyle = col; ctx.fillRect(x - w * .06, by - h * .14, w * .12, h * .16);
    for (let i = 0; i < tiers; i++) {
      const ya = by - h * (1 - i * .2), yb = ya + h * .36, hw = w * (.34 + .66 * i / (tiers - 1)) / 2;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x + hw, yb); ctx.quadraticCurveTo(x, yb - h * .05, x - hw, yb); ctx.closePath(); ctx.fill();
      if (light) { ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x + hw, yb); ctx.lineTo(x + hw * .1, yb - h * .03); ctx.closePath(); ctx.fill(); }
    }
  }
  function fernLeaf(ctx, x, y, len, ang, w, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(w, -len * .3, w * .9, -len * .75, 0, -len); ctx.bezierCurveTo(-w * .9, -len * .75, -w, -len * .3, 0, 0); ctx.fill(); ctx.restore(); }
  function fernBush(ctx, x, y, s, t, k, cols) {
    for (let i = 0; i < 9; i++) { const a = -1.15 + i * .29 + .05 * wave(t, 2, k * .13 + i * .07); fernLeaf(ctx, x, y, (200 + (i % 3) * 38) * s, a, 34 * s, i % 2 ? cols[0] : cols[1]); }
  }
  function ikLeg(hx, hy, fx, fy, L1, L2, dir) {
    let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy); const mxd = L1 + L2 - 1; if (d > mxd) { const k = mxd / d; dx *= k; dy *= k; d = mxd; fx = hx + dx; fy = hy + dy; }
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)), mx = hx + dx * a / d, my = hy + dy * a / d, nx = -dy / d, ny = dx / d;
    let kx = mx + nx * h, ky = my + ny * h; const k2x = mx - nx * h, k2y = my - ny * h; if ((kx - mx) * dir < (k2x - mx) * dir) { kx = k2x; ky = k2y; }
    return [kx, ky, fx, fy];
  }
  function capsule(ctx, x0, y0, r0, x1, y1, r1, col) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d; ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x0 + nx * r0, y0 + ny * r0); ctx.lineTo(x1 + nx * r1, y1 + ny * r1); ctx.lineTo(x1 - nx * r1, y1 - ny * r1); ctx.lineTo(x0 - nx * r0, y0 - ny * r0); ctx.closePath(); ctx.fill();
    circle(ctx, x0, y0, r0); ctx.fill(); circle(ctx, x1, y1, r1); ctx.fill();
  }
  function footPos(phi, xc, gy, S, d, lift) {
    if (phi < d) return [xc + S * (d / 2 - phi), gy, 0];
    const u = (phi - d) / (1 - d), e = easeInOut(u); return [xc - S * d / 2 + S * d * e, gy - lift * Math.sin(Math.PI * u) * (1 - .0 * u), 1];
  }
  function drawLeg(ctx, hip, foot, dir, col, sockCol, front) {
    const [kx, ky, fx, fy] = ikLeg(hip[0], hip[1], foot[0], foot[1], 125, 125, dir);
    capsule(ctx, hip[0], hip[1], 34, kx, ky, 22, col);
    capsule(ctx, kx, ky, 22, fx, fy, 17, col);
    // calcetín oscuro en la parte baja
    const sx = lerp(kx, fx, .38), sy = lerp(ky, fy, .38); capsule(ctx, sx, sy, 19, fx, fy, 17.5, sockCol);
    ctx.save(); ctx.translate(fx + 14, fy - 3); ctx.rotate(-.12 * foot[2]); ctx.fillStyle = sockCol; ellipse(ctx, 0, 0, 30, 16); ctx.fill(); ctx.restore();
  }
  function drawFox(ctx, t, C, v) {
    const c = t * 8, S = 270, D = .55;
    const bob = 8 * Math.cos(TAU * 2 * (c - .275)), body = C.body, dark = C.dark;
    const phi = (o) => ((c + o) % 1 + 1) % 1;
    const FN = footPos(phi(0), 175, 215, S, D, 78), HN = footPos(phi(.5), -125, 215, S, D, 78), FF = footPos(phi(.5), 175, 215, S, D, 78), HF = footPos(phi(0), -125, 215, S, D, 78);
    const farCol = mixh(body, dark, .38), farSock = '#1a0f20';
    // sombra
    L.shadowEllipse(ctx, 40, 222, 330, 26, .38);
    // patas lejanas
    drawLeg(ctx, [150, 22 + bob], FF, -1, farCol, farSock, true);
    drawLeg(ctx, [-150, 28 + bob], HF, 1, farCol, farSock, false);
    // cola
    {
      const N = 30, pts = []; let x = -222, y = -30 + bob, th = Math.PI + .5; const ds = 12;
      for (let i = 0; i <= N; i++) { const s = i / N; pts.push([x, y, th, s]); th = Math.PI + .55 + .08 * wave(t, 8, .1) - .55 * s + .42 * s * wave(t, 8, -s * .55 + .2) + .1 * wave(t, 16, .2) * s; x += Math.cos(th) * ds; y += Math.sin(th) * ds; }
      const wd = (s) => 22 + 60 * Math.sin(Math.PI * Math.pow(s, .72)) * (1 - .1 * s) + (s < .1 ? 0 : 0);
      const L1 = [], R1 = []; pts.forEach(([px, py, a, s]) => { const nx = -Math.sin(a), ny = Math.cos(a), w = wd(s); L1.push([px + nx * w, py + ny * w]); R1.push([px - nx * w, py - ny * w]); });
      const poly = (from) => { ctx.beginPath(); ctx.moveTo(L1[from][0], L1[from][1]); for (let i = from + 1; i <= N; i++) ctx.lineTo(L1[i][0], L1[i][1]); for (let i = N; i >= from; i--) ctx.lineTo(R1[i][0], R1[i][1]); ctx.closePath(); };
      poly(0); ctx.fillStyle = lin(ctx, -500, -150, -250, 80, [[0, C.light], [.5, body], [1, dark]]); ctx.fill();
      ctx.save(); poly(0); ctx.clip(); const tip = Math.floor(N * .74); ctx.fillStyle = CREAM; ctx.beginPath(); ctx.moveTo(L1[tip][0] - Math.cos(pts[tip][2]) * 8, L1[tip][1] - Math.sin(pts[tip][2]) * 8); for (let i = tip + 1; i <= N; i++) ctx.lineTo(L1[i][0], L1[i][1]); for (let i = N; i >= tip; i--) ctx.lineTo(R1[i][0], R1[i][1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(C.light, .55); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach(([px, py, a, s], i) => { const nx = -Math.sin(a), ny = Math.cos(a), w = wd(s) * .55; i ? ctx.lineTo(px + nx * w, py + ny * w) : ctx.moveTo(px + nx * w, py + ny * w); }); ctx.stroke(); ctx.restore();
    }
    // cuerpo
    ctx.save(); ctx.translate(0, bob);
    const bodyP = () => { ctx.beginPath(); ctx.moveTo(-236, -22); ctx.bezierCurveTo(-205, -98, -60, -106, 60, -96); ctx.bezierCurveTo(150, -92, 205, -76, 222, -36); ctx.bezierCurveTo(240, 10, 220, 62, 150, 82); ctx.bezierCurveTo(70, 90, -40, 76, -120, 84); ctx.bezierCurveTo(-200, 86, -262, 44, -236, -22); ctx.closePath(); };
    bodyP(); ctx.fillStyle = lin(ctx, 0, -105, 0, 90, [[0, C.light], [.35, body], [1, mixh(body, dark, .55)]]); ctx.fill();
    ctx.save(); bodyP(); ctx.clip();
    ctx.fillStyle = CREAM; ctx.beginPath(); ctx.moveTo(250, -10); ctx.bezierCurveTo(215, 20, 190, 70, 90, 74); ctx.bezierCurveTo(150, 30, 170, -20, 240, -50); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(C.light, .5); ctx.lineWidth = 7; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-170 + i * 70, -70 + (i % 2) * 8); ctx.quadraticCurveTo(-140 + i * 70, -50, -120 + i * 70, -64 + (i % 2) * 8); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = rgba(C.rim, .75); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-218, -52); ctx.bezierCurveTo(-170, -98, -60, -103, 60, -93); ctx.bezierCurveTo(130, -90, 190, -78, 214, -46); ctx.stroke();
    ctx.restore();
    // cuello
    const hb = 7 * wave(t, 8, .3), hx = 276, hy = -72 + bob * .6 + hb;
    ctx.strokeStyle = body; ctx.lineWidth = 118; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(170, -32 + bob); ctx.lineTo(hx - 30, hy + 10); ctx.stroke();
    ctx.strokeStyle = CREAM; ctx.lineWidth = 60; ctx.beginPath(); ctx.moveTo(196, 6 + bob); ctx.lineTo(hx - 24, hy + 42); ctx.stroke();
    // patas cercanas
    drawLeg(ctx, [150, 22 + bob], FN, -1, body, DARK, true);
    drawLeg(ctx, [-150, 28 + bob], HN, 1, body, DARK, false);
    // cabeza
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(.05 * wave(t, 8, .55));
    // oreja lejana
    const flick = bump(t, .4, .02) * Math.sin(TAU * (t - .4) * 40);
    const ear = (ox, oy, sc, col, rot) => { ctx.save(); ctx.translate(ox, oy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.beginPath(); ctx.moveTo(-34, 6); ctx.quadraticCurveTo(-30, -80, -6, -128); ctx.quadraticCurveTo(26, -84, 44, 4); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = DARK; ctx.fillRect(-60, -140, 120, 66); ctx.restore(); ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-14, -50, -2, -84); ctx.quadraticCurveTo(14, -50, 24, 0); ctx.closePath(); ctx.fillStyle = CREAM; ctx.globalAlpha = .9; ctx.fill(); ctx.globalAlpha = 1; ctx.restore(); };
    ear(-30, -42, .95, farCol, -.1 + .02 * wave(t, 8, .2) + .3 * flick);
    const headP = () => { ctx.beginPath(); ctx.moveTo(-52, -16); ctx.bezierCurveTo(-48, -72, 14, -76, 48, -54); ctx.bezierCurveTo(96, -46, 140, -22, 160, 6); ctx.bezierCurveTo(170, 24, 152, 40, 128, 42); ctx.bezierCurveTo(100, 52, 62, 68, 22, 70); ctx.bezierCurveTo(-34, 74, -70, 42, -62, 6); ctx.closePath(); };
    headP(); ctx.fillStyle = lin(ctx, 0, -76, 0, 72, [[0, C.light], [.45, body], [1, mixh(body, dark, .3)]]); ctx.fill();
    ctx.save(); headP(); ctx.clip(); ctx.fillStyle = CREAM; ctx.beginPath(); ctx.moveTo(-70, 72); ctx.bezierCurveTo(-10, 56, 40, 40, 82, 26); ctx.bezierCurveTo(120, 18, 150, 10, 176, 14); ctx.lineTo(176, 90); ctx.lineTo(-70, 90); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-64, 10); ctx.quadraticCurveTo(-110, 34, -84, 78); ctx.quadraticCurveTo(-40, 56, -20, 34); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rgba(C.rim, .6); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-40, -52); ctx.bezierCurveTo(-10, -72, 30, -70, 50, -54); ctx.stroke();
    ctx.fillStyle = DARK; circle(ctx, 159, 11, 16); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; circle(ctx, 154, 5, 4.5); ctx.fill();
    ctx.strokeStyle = DARK; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(150, 30); ctx.quadraticCurveTo(116, 42, 90, 34); ctx.stroke();
    // ojo con parpadeo
    const bl = bump(t, .22, .01) + bump(t, .66, .01), ey = 12 * (1 - Math.min(1, bl));
    ctx.save(); ctx.translate(64, -14); ctx.rotate(-.35); ctx.fillStyle = DARK; ellipse(ctx, 0, 0, 13, Math.max(1.5, ey)); ctx.fill(); if (bl < .5) { ctx.fillStyle = '#fff'; circle(ctx, 4, -4, 4); ctx.fill(); } ctx.restore();
    ctx.fillStyle = CREAM; circle(ctx, 56, -40, 7); ctx.fill();
    ear(14, -48, 1.05, body, .06 + .02 * wave(t, 8, .4) - .25 * flick);
    ctx.restore();
  }

  SCENES['animals-b'] = {
    topic: 'animals', stillT: [.12, .31],
    cap: [
      { ca: 'Matí de boira, tros de camí i un guardià ros 🦊 #natura #animals', es: 'Mañana de niebla, un camino y un zorro al trote 🦊 #naturaleza #animales', en: 'Misty morning, a trail and a fox on the move 🦊 #nature #animals' },
      { ca: 'Guineu de nit entre cuques de llum i bosc blau 🦊 #natura', es: 'Zorro de noche entre luciérnagas y bosque azul 🦊 #naturaleza', en: 'Night fox among fireflies and a blue forest 🦊 #nature' }],
    draw(ctx, t, v) {
      const P = PFX[v % 2], W = 1080, H = 1920, GY = 1345, F = 1.0, bx = 566, by = GY - 215 * F;
      if (v % 2 === 1) { ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); }
      // cielo
      ctx.fillStyle = lin(ctx, 0, 0, 0, 1330, [[0, P.sky[0]], [.55, P.sky[1]], [1, P.sky[2]]]); ctx.fillRect(0, 0, W, H);
      if (P.night) L.stars(ctx, 90, 17, t, { y1: 800, alpha: .9 });
      glow(ctx, P.sunP[0], P.sunP[1], 900, P.night ? '#9a86ff' : '#ffd978', P.night ? .5 : .75); glow(ctx, P.sunP[0], P.sunP[1], 330, P.sun, .8);
      ctx.fillStyle = P.sun; circle(ctx, P.sunP[0], P.sunP[1], P.night ? 96 : 84); ctx.fill();
      if (P.night) { ctx.fillStyle = 'rgba(160,140,220,.45)'; [[-28, -22, 20], [30, 22, 15], [14, -44, 10]].forEach(([dx, dy, r]) => { circle(ctx, P.sunP[0] + dx, P.sunP[1] + dy, r); ctx.fill(); }); }
      // colinas lejanas (1 periodo de 720 px por bucle)
      ctx.fillStyle = P.hills; ctx.beginPath(); ctx.moveTo(0, 1400); for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, 1090 - 190 * (.5 + .5 * L.ridge(x + 720 * t, 61 + v, 720, 4))); ctx.lineTo(W, 1400); ctx.fill();
      const mist = (y0, y1, a) => { ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [[0, rgba(P.mist, 0)], [1, rgba(P.mist, a)]]); ctx.fillRect(0, y0, W, y1 - y0); };
      mist(850, 1280, .4);
      // pinos lejanos
      const r1 = rng(5 + v); const far = [...Array(12)].map(() => [r1() * 1080, 300 + r1() * 160, 150 + r1() * 70]);
      tiled(ctx, 1080, 1, t, (xo) => far.forEach(([x, h, w]) => pine(ctx, x + xo, 1245, w, h, P.far, null)));
      mist(1000, 1290, .45);
      // rayos de luz
      if (!P.night) { ctx.save(); for (let i = 0; i < 5; i++) { const a = 1.9 + i * .12 + .015 * wave(t, 1, i * .2), w = .035; ctx.beginPath(); ctx.moveTo(P.sunP[0], P.sunP[1]); ctx.lineTo(P.sunP[0] + Math.cos(a - w) * 2400, P.sunP[1] + Math.sin(a - w) * 2400); ctx.lineTo(P.sunP[0] + Math.cos(a + w) * 2400, P.sunP[1] + Math.sin(a + w) * 2400); ctx.closePath(); ctx.fillStyle = lin(ctx, P.sunP[0], P.sunP[1], P.sunP[0] + Math.cos(a) * 1500, P.sunP[1] + Math.sin(a) * 1500, [[0, `rgba(255,248,200,${.3 + .06 * wave(t, 1, i * .15)})`], [1, 'rgba(255,248,200,0)']]); ctx.fill(); } ctx.restore(); }
      // pinos medios
      const r2 = rng(9 + v); const mid = [...Array(6)].map((_, i) => [i * 240 + r2() * 80, 620 + r2() * 220, 300 + r2() * 110]);
      tiled(ctx, 1440, 1, t, (xo) => mid.forEach(([x, h, w]) => pine(ctx, x + xo, 1290, w, h, P.mid, rgba('#ffffff', .07))));
      mist(1050, 1320, .35);
      // troncos cercanos (detrás del zorro)
      const r3 = rng(13 + v); const tr = [...Array(4)].map((_, i) => [i * 450 + r3() * 120, 70 + r3() * 40]);
      tiled(ctx, 1800, 1, t, (xo) => tr.forEach(([x, w], i) => {
        const X = x + xo; ctx.fillStyle = lin(ctx, X - w, 0, X + w, 0, [[0, P.trunk2], [.5, P.trunk], [1, P.trunk2]]); ctx.beginPath(); ctx.moveTo(X - w * .6, -10); ctx.lineTo(X + w * .6, -10); ctx.lineTo(X + w * .5, 1100); ctx.quadraticCurveTo(X + w * .9, 1260, X + w * 1.5, 1310); ctx.lineTo(X - w * 1.5, 1310); ctx.quadraticCurveTo(X - w * .9, 1260, X - w * .5, 1100); ctx.closePath(); ctx.fill();
        if (P.night) { ctx.fillStyle = 'rgba(40,30,90,.55)'; for (let k = 0; k < 9; k++) { ctx.fillRect(X - w * .5 + ((k * 37) % 20), 160 + k * 120, w * .55, 12); } } else { ctx.fillStyle = rgba(P.leaf, .9); [[-80, 260, 110], [60, 320, 80], [-20, 190, 90]].forEach(([dx, dy, rr1]) => { circle(ctx, X + dx, dy + i * 30, rr1); ctx.fill(); }); }
      }));
      mist(1120, 1330, .3);
      // suelo
      ctx.fillStyle = lin(ctx, 0, GY - 40, 0, 1700, [[0, P.ground[0]], [1, P.ground[1]]]); ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, GY - 84); for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, GY - 84 + 8 * Math.sin(x * .01 + 2)); ctx.lineTo(W, H); ctx.fill();
      ctx.fillStyle = P.path; ctx.beginPath(); ctx.moveTo(0, GY - 52); ctx.lineTo(W, GY - 52); ctx.lineTo(W, GY + 150); ctx.lineTo(0, GY + 150); ctx.closePath(); ctx.fillStyle = lin(ctx, 0, GY - 52, 0, GY + 150, [[0, P.path], [1, P.pathD]]); ctx.fill();
      // detalles del suelo (periodo 2160 = lo que avanza el suelo en un bucle)
      const r4 = rng(21 + v); const gd = [...Array(26)].map(() => [r4() * 2160, r4(), r4()]);
      tiled(ctx, 2160, 1, t, (xo) => gd.forEach(([x, a, b]) => { const X = x + xo; if (a < .5) { ctx.fillStyle = P.tuft; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(X + k * 8 - 16, GY - 30 + b * 8); ctx.lineTo(X + k * 8 - 20 + k * 3, GY - 76 - b * 22); ctx.lineTo(X + k * 8 - 8, GY - 30 + b * 8); } ctx.fill(); } else { ctx.fillStyle = rgba(P.pathD, .8); ellipse(ctx, X, GY + 30 + b * 100, 18 + a * 20, 6 + b * 4); ctx.fill(); } }));
      // zorro
      ctx.save(); ctx.translate(bx, by); ctx.scale(F, F); drawFox(ctx, t, P.fox, v); ctx.restore();
      // brillo de luz de borde sobre el suelo
      // helechos delante (3240 px/bucle) y troncos muy cercanos
      const r5 = rng(33 + v); const fe = [...Array(3)].map((_, i) => [i * 560 + r5() * 150, .8 + r5() * .5]);
      tiled(ctx, 1620, 2, t, (xo, k) => fe.forEach(([x, s], i) => fernBush(ctx, x + xo, 1700, s, t, i, P.fern)));
      // partículas
      if (!P.night) {
        L.loopParticles(18, 5, t, (i, p, r) => {
          const x0 = r() * 1300, sz = 14 + r() * 14, ph = r(), spin = 1 + Math.floor(r() * 2);
          const x = ((x0 - 2600 * t) % 1300 + 1300) % 1300 - 110 + 30 * Math.sin(TAU * (p * 3 + ph)), y = -80 + p * 1600;
          ctx.save(); ctx.globalAlpha = smooth(p / .06) * (1 - smooth((p - .86) / .12)); ctx.translate(x, y); ctx.rotate(TAU * (p * spin + ph) * 1 + .6 * Math.sin(TAU * (p * 2))); ctx.scale(1, .6 + .4 * Math.cos(TAU * (p * 2 + ph))); ctx.fillStyle = [P.leaf, '#ff9a3d', '#ffe48a'][i % 3];
          ctx.beginPath(); ctx.moveTo(0, -sz); ctx.quadraticCurveTo(sz * .9, -sz * .2, 0, sz); ctx.quadraticCurveTo(-sz * .9, -sz * .2, 0, -sz); ctx.fill(); ctx.restore();
        });
      } else {
        const rf = rng(77); for (let i = 0; i < 26; i++) {
          const x0 = rf() * 1300, y0 = 520 + rf() * 880, ph = rf(), k = 1 + Math.floor(rf() * 3), a = Math.pow(wave01(t, k, ph), 2);
          const x = ((x0 - 1300 * t) % 1300 + 1300) % 1300 - 110 + 50 * wave(t, 1, ph) + 24 * wave(t, 2, ph * 3), y = y0 + 44 * wave(t, 1, ph + .3) + 20 * wave(t, 3, ph);
          glow(ctx, x, y, 46, P.leaf, .55 * a + .1); ctx.fillStyle = `rgba(230,255,200,${.5 + .5 * a})`; circle(ctx, x, y, 4.5); ctx.fill();
        }
      }
      if (v % 2 === 1) ctx.restore();
      L.vignette(ctx, W, H, .4);
    }
  };

  /* ===================================================================== */
  /* ANIMALS-C  ·  búho con luna llena (v0) / rana en nenúfar bajo la lluvia (v1) */
  /* ===================================================================== */
  function owlFeatherRows(ctx, rows, x0, x1, y0, dy, step, r, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    for (let i = 0; i < rows; i++) { const y = y0 + i * dy, off = (i % 2) * step / 2; ctx.beginPath(); for (let x = x0 + off; x <= x1; x += step) { ctx.moveTo(x - r, y); ctx.arc(x, y, r, Math.PI, 0, true); ctx.moveTo(x - r, y); ctx.arc(x, y, r, Math.PI, 0, true); } ctx.stroke(); }
  }
  function drawOwl(ctx, t, ox, oy) {
    const body = '#b97a3f', bodyL = '#e0a863', bodyD = '#7a4a2a', belly = '#f6e2bc', disc = '#fff0d2';
    ctx.save(); ctx.translate(ox, oy); ctx.scale(1.22, 1.22);
    const sway = .012 * wave(t, 1); ctx.rotate(sway);
    // pies
    ctx.fillStyle = '#e59a2b'; [-1, 1].forEach((s) => { for (let k = -1; k <= 1; k++) { rr(ctx, s * 80 + k * 30 - 14, 285, 28, 54, 14); ctx.fill(); } });
    ctx.fillStyle = '#4a2a1a'; [-1, 1].forEach((s) => { for (let k = -1; k <= 1; k++) { circle(ctx, s * 80 + k * 30, 338, 7); ctx.fill(); } });
    // cuerpo
    const bodyP = () => { ctx.beginPath(); ctx.moveTo(0, -270); ctx.bezierCurveTo(250, -270, 290, 60, 225, 205); ctx.bezierCurveTo(190, 290, 90, 325, 0, 325); ctx.bezierCurveTo(-90, 325, -190, 290, -225, 205); ctx.bezierCurveTo(-290, 60, -250, -270, 0, -270); ctx.closePath(); };
    bodyP(); ctx.fillStyle = rad(ctx, 90, -150, 20, 520, [[0, bodyL], [.5, body], [1, bodyD]]); ctx.fill();
    ctx.save(); bodyP(); ctx.clip();
    // vientre con plumas
    ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(0, 105, 165, 235, 0, 0, TAU); ctx.fill();
    owlFeatherRows(ctx, 6, -130, 130, 30, 50, 52, 24, 'rgba(160,100,60,.55)', 6);
    // alas plegadas
    [-1, 1].forEach((s) => {
      ctx.fillStyle = mixh(body, bodyD, .45); ctx.beginPath(); ctx.moveTo(s * 215, -120); ctx.bezierCurveTo(s * 300, 20, s * 270, 200, s * 175, 300); ctx.bezierCurveTo(s * 150, 180, s * 150, 40, s * 190, -110); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(bodyL, .8); ctx.lineWidth = 7; ctx.lineCap = 'round'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(s * (225 - k * 10), -40 + k * 66); ctx.quadraticCurveTo(s * (195 - k * 8), -10 + k * 64, s * (170 - k * 4), -26 + k * 70 + 36); ctx.stroke(); }
    });
    // luz de luna sobre el borde derecho
    ctx.strokeStyle = lin(ctx, 280, -250, 40, 120, [[0, 'rgba(255,248,220,.85)'], [1, 'rgba(255,248,220,0)']]); ctx.lineWidth = 24; bodyP(); ctx.stroke();
    ctx.restore();
    // orejas (penachos)
    [-1, 1].forEach((s) => { ctx.fillStyle = bodyD; ctx.beginPath(); ctx.moveTo(s * 100, -330); ctx.quadraticCurveTo(s * 160, -450, s * 232, -462); ctx.quadraticCurveTo(s * 262, -380, s * 232, -290); ctx.closePath(); ctx.fill(); ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(s * 140, -330); ctx.quadraticCurveTo(s * 180, -410, s * 222, -428); ctx.quadraticCurveTo(s * 232, -380, s * 218, -320); ctx.closePath(); ctx.fill(); });
    // cabeza
    ctx.fillStyle = rad(ctx, 70, -270, 20, 420, [[0, bodyL], [.5, body], [1, bodyD]]); ctx.beginPath(); ctx.ellipse(0, -190, 255, 200, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,220,.6)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.ellipse(0, -190, 252, 197, 0, -1.25, -.35); ctx.stroke();
    // disco facial
    const discP = () => { ctx.beginPath(); ctx.ellipse(-112, -178, 128, 134, 0, 0, TAU); ctx.moveTo(240, -178); ctx.ellipse(112, -178, 128, 134, 0, 0, TAU); };
    ctx.strokeStyle = bodyD; ctx.lineWidth = 12; discP(); ctx.stroke(); ctx.fillStyle = disc; discP(); ctx.fill();
    ctx.fillStyle = rgba(bodyD, .22); ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(24, -150); ctx.lineTo(-24, -150); ctx.closePath(); ctx.fill();
    // ojos
    const bl = Math.max(bump(t, .18, .012), bump(t, .63, .012));
    [-1, 1].forEach((s) => {
      const cx = s * 108, cy = -172;
      ctx.fillStyle = '#5a3418'; circle(ctx, cx, cy, 92); ctx.fill();
      ctx.fillStyle = rad(ctx, cx, cy - 10, 8, 84, [[0, '#ffe36b'], [.7, '#ffae1f'], [1, '#d97a00']]); circle(ctx, cx, cy, 82); ctx.fill();
      const lx = 8 * wave(t, 1) * 0, ly = -4; ctx.fillStyle = '#170c14'; circle(ctx, cx + lx, cy + ly, 42); ctx.fill();
      ctx.fillStyle = '#fff'; circle(ctx, cx + lx - 15, cy + ly - 17, 15); ctx.fill(); circle(ctx, cx + lx + 16, cy + ly + 16, 7); ctx.fill();
      // párpado
      const lid = .28 + .72 * bl; ctx.save(); circle(ctx, cx, cy, 90); ctx.clip(); ctx.fillStyle = body; ctx.fillRect(cx - 100, cy - 100, 200, 14 + lid * 176 - 14); ctx.fillStyle = bodyD; ctx.fillRect(cx - 100, cy - 100 + lid * 176 - 5, 200, 8); ctx.restore();
      // ceja
      ctx.strokeStyle = bodyD; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * 40, -300 + 22); ctx.quadraticCurveTo(s * 120, -300, s * 200, -250 + 10); ctx.stroke();
    });
    // pico
    ctx.fillStyle = '#f2a52a'; ctx.beginPath(); ctx.moveTo(-32, -150); ctx.quadraticCurveTo(0, -172, 32, -150); ctx.quadraticCurveTo(26, -100, 0, -76); ctx.quadraticCurveTo(-26, -100, -32, -150); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(0, -150); ctx.quadraticCurveTo(26, -100, 0, -76); ctx.quadraticCurveTo(-4, -120, 0, -150); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ellipse(ctx, -8, -146, 9, 5, -.4); ctx.fill();
    ctx.restore();
  }
  function branch(ctx, col, t) {
    const pts = []; for (let x = -60; x <= 1140; x += 20) pts.push([x, 1340 - 70 * (x / 1080) + 18 * Math.sin(x * .008 + 1)]);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1b1030'; ctx.lineWidth = 118; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.strokeStyle = col[0]; ctx.lineWidth = 104; ctx.stroke();
    ctx.strokeStyle = col[1]; ctx.lineWidth = 34; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1] - 34) : ctx.moveTo(p[0], p[1] - 34)); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,10,40,.4)'; ctx.lineWidth = 6; for (let i = 0; i < 9; i++) { const p = pts[3 + i * 6]; ctx.beginPath(); ctx.moveTo(p[0], p[1] - 20); ctx.quadraticCurveTo(p[0] + 20, p[1] + 6, p[0] + 52, p[1] + 20); ctx.stroke(); }
    // nudo
    ctx.fillStyle = '#2b1838'; ellipse(ctx, 220, pts[14][1] + 6, 22, 14); ctx.fill();
  }
  function leafTwig(ctx, x, y, ang, len, col, t, ph) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang + .03 * wave(t, 1, ph)); ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * .5, -len * .12, len, 0); ctx.stroke();
    for (let i = 0; i < 6; i++) { const lx = len * (.15 + i * .15), s = i % 2 ? 1 : -1; ctx.save(); ctx.translate(lx, -s * 4); ctx.rotate(s * 1.0 + .06 * wave(t, 1, ph + i * .1)); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(34, -26, 86, 0); ctx.quadraticCurveTo(34, 26, 0, 0); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  function ripple(ctx, x, y, p, R, a = .6, lw = 5, col = '255,255,255') {
    for (let k = 0; k < 3; k++) { const q = p - k * .16; if (q <= 0 || q >= 1) continue; ctx.strokeStyle = `rgba(${col},${a * (1 - q)})`; ctx.lineWidth = lw * (1 - q * .5); ellipse(ctx, x, y, R * q, R * q * .3); ctx.stroke(); }
  }
  function lilyPad(ctx, x, y, rx, ry, rot, c0, c1, notch = .35) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const pth = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.ellipse(0, 0, rx, ry, 0, notch, TAU - notch); ctx.closePath(); };
    ctx.save(); ctx.translate(0, ry * .28); pth(); ctx.fillStyle = 'rgba(0,40,40,.35)'; ctx.fill(); ctx.restore();
    pth(); ctx.fillStyle = lin(ctx, 0, -ry, 0, ry, [[0, c0], [1, c1]]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let k = 0; k < 9; k++) { const a = notch + .25 + k * (TAU - 2 * notch - .5) / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * rx * .85, Math.sin(a) * ry * .85); ctx.stroke(); }
    pth(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 5; ctx.stroke();
    ctx.restore();
  }
  function lotus(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const petals = [[-1.0, 90], [1.0, 90], [-.55, 120], [.55, 120], [0, 130]];
    petals.forEach(([a, h], i) => { ctx.save(); ctx.rotate(a * .8); ctx.fillStyle = i === 4 ? '#ffd0e6' : (i > 1 ? '#ff9ccb' : '#ff7fb9'); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-50, -h * .5, -34, -h * 1.1, 0, -h * 1.3); ctx.bezierCurveTo(34, -h * 1.1, 50, -h * .5, 0, 0); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -h); ctx.stroke(); ctx.restore(); });
    ctx.fillStyle = '#ffd84a'; circle(ctx, 0, -20, 16); ctx.fill();
    ctx.restore();
  }
  function drawFrog(ctx, t, ox, oy) {
    const g0 = '#8be86a', g1 = '#4fbf55', gd = '#2d8d4a', belly = '#eaffb4', ink = '#1d5a35';
    ctx.save(); ctx.translate(ox, oy); const br = 1 + .012 * wave(t, 2); ctx.scale(1.28, 1.28 * br);
    // patas traseras
    [-1, 1].forEach((s) => {
      ctx.fillStyle = g1; ctx.save(); ctx.translate(s * 235, 95); ctx.rotate(s * -.3); ellipse(ctx, 0, 0, 92, 128); ctx.fill(); ctx.restore();
      ctx.fillStyle = g0; ctx.save(); ctx.translate(s * 318, 170); ctx.rotate(s * .1); ellipse(ctx, 0, 0, 96, 30); ctx.fill(); ctx.restore();
      ctx.fillStyle = g0; for (let k = 0; k < 3; k++) { circle(ctx, s * (388 + k * 8), 152 + k * 21, 19); ctx.fill(); }
    });
    // cuerpo
    ctx.beginPath(); ctx.ellipse(0, 0, 238, 215, 0, 0, TAU); ctx.fillStyle = rad(ctx, -70, -120, 30, 330, [[0, g0], [.55, g1], [1, gd]]); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 238, 215, 0, 0, TAU); ctx.clip(); ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(0, 105, 160, 140, 0, 0, TAU); ctx.fill(); ctx.restore();
    // cabeza ancha
    ctx.beginPath(); ctx.ellipse(0, -115, 265, 165, 0, 0, TAU); ctx.fillStyle = rad(ctx, -90, -220, 30, 360, [[0, g0], [.55, g1], [1, gd]]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(0, -115, 258, 160, 0, -2.3, -1.55); ctx.stroke();
    // manchas
    ctx.fillStyle = rgba(gd, .55); [[-120, -190, 22], [-60, -214, 14], [150, -180, 18], [100, -215, 12], [60, -170, 10]].forEach(([x, y, r]) => { circle(ctx, x, y, r); ctx.fill(); });
    // ojos
    const bl = Math.max(bump(t, .2, .012), bump(t, .67, .012));
    [-1, 1].forEach((s) => {
      const cx = s * 138, cy = -262;
      ctx.fillStyle = g1; circle(ctx, cx, cy + 10, 96); ctx.fill(); ctx.fillStyle = rgba('#ffffff', .22); ellipse(ctx, cx - 28, cy - 36, 40, 18, -.5); ctx.fill();
      ctx.fillStyle = '#fffbe0'; circle(ctx, cx, cy, 70); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = ink; ctx.stroke();
      ctx.fillStyle = '#160d18'; circle(ctx, cx + s * -6, cy - 8, 38); ctx.fill(); ctx.fillStyle = '#fff'; circle(ctx, cx - 18, cy - 24, 14); ctx.fill(); circle(ctx, cx + 12, cy + 8, 6); ctx.fill();
      ctx.save(); circle(ctx, cx, cy, 70); ctx.clip(); ctx.fillStyle = g1; ctx.fillRect(cx - 80, cy - 80, 160, 60 + bl * 100); ctx.fillStyle = gd; ctx.fillRect(cx - 80, cy - 24 + bl * 100, 160, 6); ctx.restore();
    });
    // boca sonriente y mejillas
    ctx.strokeStyle = ink; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-182, -88); ctx.quadraticCurveTo(0, 34, 182, -88); ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,140,.5)'; [-1, 1].forEach((s) => { ellipse(ctx, s * 190, -62, 38, 24); ctx.fill(); });
    ctx.fillStyle = ink; [-1, 1].forEach((s) => { circle(ctx, s * 26, -150, 6); ctx.fill(); });
    // patas delanteras
    [-1, 1].forEach((s) => { ctx.strokeStyle = g1; ctx.lineWidth = 56; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * 120, 70); ctx.lineTo(s * 122, 170); ctx.stroke(); ctx.fillStyle = g0; ellipse(ctx, s * 124, 186, 58, 26); ctx.fill(); for (let k = -1; k <= 1; k++) { circle(ctx, s * 124 + k * 34, 198, 14); ctx.fill(); } });
    ctx.restore();
  }

  SCENES['animals-c'] = {
    topic: 'animals', stillT: [.3, .6],
    cap: [
      { ca: 'Nit de lluna plena i un mussol que no dorm 🦉 #animals #nit', es: 'Noche de luna llena y un búho que no duerme 🦉 #animales #noche', en: 'Full moon night and an owl that stays awake 🦉 #animals #night' },
      { ca: 'Una granota feliç sota la pluja 🐸 #animals #pluja', es: 'Una ranita feliz bajo la lluvia 🐸 #animales #lluvia', en: 'A happy little frog in the rain 🐸 #animals #rain' }],
    draw(ctx, t, v) {
      const W = 1080, H = 1920;
      if (v % 2 === 0) {
        // ---------- búho + luna ----------
        ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#0a1440'], [.45, '#27388d'], [.8, '#5a52b0'], [1, '#3b2f78']]); ctx.fillRect(0, 0, W, H);
        L.stars(ctx, 120, 12, t, { y1: 1100, alpha: .9 });
        const mx = 690, my = 600;
        glow(ctx, mx, my, 950, '#a9b9ff', .55); glow(ctx, mx, my, 520, '#e9ecff', .6);
        ctx.fillStyle = '#fff6d6'; circle(ctx, mx, my, 320); ctx.fill();
        ctx.fillStyle = rad(ctx, mx - 70, my - 80, 10, 300, [[0, 'rgba(255,255,255,.7)'], [1, 'rgba(255,230,160,0)']]); circle(ctx, mx, my, 320); ctx.fill();
        ctx.fillStyle = 'rgba(214,190,150,.5)'; [[-100, -80, 74], [90, 45, 58], [-34, 125, 44], [135, -125, 34], [-170, 56, 27], [22, -170, 25], [160, 120, 22]].forEach(([dx, dy, r]) => { circle(ctx, mx + dx, my + dy, r); ctx.fill(); });
        // nubes alargadas cruzando la luna
        [[300, 520, 520, 40], [820, 760, 560, 46], [420, 900, 480, 34]].forEach(([x, y, w, h], i) => { const dx = 40 * wave(t, 1, i * .3); ctx.fillStyle = 'rgba(52,56,150,.55)'; rr(ctx, x - w / 2 + dx, y - h / 2, w, h, h / 2); ctx.fill(); rr(ctx, x - w * .2 + dx, y - h * 1.05, w * .45, h * 1.1, h / 2); ctx.fill(); ctx.fillStyle = 'rgba(190,200,255,.18)'; rr(ctx, x - w / 2 + dx + 14, y - h / 2 + 4, w - 28, 8, 4); ctx.fill(); });
        // bosque lejano
        ctx.fillStyle = '#1d2362'; ctx.beginPath(); ctx.moveTo(0, 1500); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, 1250 - 80 * (.5 + .5 * L.ridge(x, 33, 1080, 4))); ctx.lineTo(W, 1500); ctx.fill();
        ctx.fillStyle = '#141a50'; const r1 = rng(8); for (let i = 0; i < 11; i++) { const x = i * 105 + r1() * 40, h = 200 + r1() * 170; ctx.beginPath(); ctx.moveTo(x - 55, 1500); ctx.lineTo(x, 1500 - h); ctx.lineTo(x + 55, 1500); ctx.fill(); }
        ctx.fillStyle = '#141a50'; ctx.fillRect(0, 1498, W, H);
        branch(ctx, ['#4a2f56', '#8a6aa0'], t);
        leafTwig(ctx, -20, 1330, -.5, 380, '#16305a', t, .1); leafTwig(ctx, 1100, 1260, Math.PI + .5, 340, '#16305a', t, .5);
        drawOwl(ctx, t, 560, 868);
        // ramas colgantes arriba
        leafTwig(ctx, -20, 330, .25, 420, '#0f2150', t, .3); leafTwig(ctx, 1110, 250, Math.PI - .3, 460, '#0f2150', t, .7);
        // luciérnagas
        const rf = rng(19); for (let i = 0; i < 18; i++) { const x0 = 60 + rf() * 960, y0 = 700 + rf() * 800, ph = rf(), k = 1 + Math.floor(rf() * 3), a = Math.pow(wave01(t, k, ph), 2); const x = x0 + 40 * wave(t, 1, ph) + 20 * wave(t, 2, ph * 3), y = y0 + 34 * wave(t, 1, ph + .3); glow(ctx, x, y, 44, '#ffe27a', .5 * a + .12); ctx.fillStyle = `rgba(255,248,200,${.55 + .45 * a})`; circle(ctx, x, y, 5); ctx.fill(); }
        L.vignette(ctx, W, H, .4);
      } else {
        // ---------- rana bajo la lluvia ----------
        ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#9fd8d6'], [.28, '#6fc3c1'], [.62, '#2f8d98'], [1, '#17606f']]); ctx.fillRect(0, 0, W, H);
        // bokeh de lluvia lejana y juncos
        const rb = rng(3); for (let i = 0; i < 14; i++) { glow(ctx, rb() * W, 220 + rb() * 330, 70 + rb() * 80, '#ffffff', .12); }
        ctx.fillStyle = 'rgba(40,120,120,.45)'; for (let i = 0; i < 16; i++) { const x = 20 + i * 70 + rb() * 20, h = 200 + rb() * 220; ctx.beginPath(); ctx.moveTo(x, 640); ctx.quadraticCurveTo(x + 10 + 12 * wave(t, 1, i * .1), 640 - h * .5, x + 20 * wave(t, 1, i * .1), 640 - h); ctx.lineTo(x + 14 + 20 * wave(t, 1, i * .1), 640 - h); ctx.quadraticCurveTo(x + 22, 640 - h * .5, x + 14, 640); ctx.fill(); }
        ctx.fillStyle = lin(ctx, 0, 560, 0, 760, [[0, 'rgba(180,230,225,0)'], [1, 'rgba(180,230,225,.55)']]); ctx.fillRect(0, 560, W, 200);
        // reflejos suaves del agua
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; const rw = rng(4); for (let i = 0; i < 30; i++) { const y = 760 + rw() * 760, x = rw() * W, w = 60 + rw() * 160; ctx.beginPath(); ctx.moveTo(x + 14 * wave(t, 1, rw()), y); ctx.lineTo(x + w, y); ctx.stroke(); }
        // nenúfares secundarios
        lilyPad(ctx, 160, 930, 190, 54, .1, '#4cc27a', '#2b8d63', .3); lilyPad(ctx, 930, 860, 160, 46, -.2, '#53c780', '#2f9468', .3);
        lilyPad(ctx, 880, 1440, 260, 78, .15, '#47b772', '#277d5a', .3); lilyPad(ctx, 150, 1380, 220, 66, -.1, '#58cb84', '#2f9468', .3);
        lotus(ctx, 905, 840, .75, t); lotus(ctx, 220, 1360, .9, t);
        // ondas de lluvia en el agua
        const rr2 = rng(61); for (let i = 0; i < 16; i++) { const x = 60 + rr2() * 960, y = 790 + rr2() * 700, p = fract(t * (1 + (i % 2)) + rr2()), R = 60 + rr2() * 70; ripple(ctx, x, y, p, R, .5, 4); }
        // nenúfar principal
        ripple(ctx, 540, 1330, fract(t * 1 + .1), 520, .55, 6); ripple(ctx, 540, 1330, fract(t * 1 + .6), 640, .35, 5);
        lilyPad(ctx, 540, 1290, 470, 140, 0, '#37b46d', '#1f7a56', .22);
        drawFrog(ctx, t, 540, 1040);
        // salpicaduras en el nenúfar
        const rs = rng(70); for (let i = 0; i < 9; i++) { const p = fract(t * 2 + rs()), x = 220 + rs() * 640, y = 1290 + rs() * 60; ctx.fillStyle = `rgba(255,255,255,${.7 * (1 - p)})`; for (let k = 0; k < 4; k++) { const a = -.5 - k * .7 + .1 * i; circle(ctx, x + Math.cos(a) * p * 36, y + Math.sin(a) * p * 36 - 30 * Math.sin(Math.PI * p), 4 * (1 - p) + 1); ctx.fill(); } }
        // lluvia
        ctx.lineCap = 'round'; const rn = rng(88); for (let i = 0; i < 90; i++) { const k = 1 + Math.floor(rn() * 2), p = fract(t * k + rn()), x = rn() * (W + 200) - 100, len = 70 + rn() * 70, y = -150 + p * (H + 300), a = .25 + rn() * .3; ctx.strokeStyle = `rgba(235,250,255,${a})`; ctx.lineWidth = 3 + rn() * 3; ctx.beginPath(); ctx.moveTo(x - p * 0, y); ctx.lineTo(x - len * .14, y + len); ctx.stroke(); }
        L.vignette(ctx, W, H, .3);
      }
    }
  };
})();
