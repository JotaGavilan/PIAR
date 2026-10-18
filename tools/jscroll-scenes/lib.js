/* Biblioteca de dibujo para las escenas de JScroll. Todo en unidades lógicas de 1080×1920 (el canvas se escala fuera). */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
  const easeInOut = (k) => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  /* sin/cos de bucle perfecto: k = nº entero de ciclos en el bucle de 8 s */
  const wave = (t, k = 1, ph = 0) => Math.sin(TAU * (t * k + ph));
  const wave01 = (t, k = 1, ph = 0) => .5 + .5 * Math.sin(TAU * (t * k + ph));
  /* pulso 0..1 que sube y baja una vez por ciclo (fase ph) */
  const pulse = (t, k = 1, ph = 0) => { const x = ((t * k + ph) % 1 + 1) % 1; return Math.sin(Math.PI * x); };
  function rng(seed) { let a = (seed | 0) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /* ruido de valor 2D suave (-1..1), no periódico */
  const _p = new Uint8Array(512); (function () { const r = rng(1234); const a = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } for (let i = 0; i < 512; i++) _p[i] = a[i & 255]; })();
  const _f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  function noise(x, y = 0) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
    const u = _f(x), v = _f(y);
    const h = (i, j) => (_p[_p[X + i] + Y + j] / 255) * 2 - 1;
    return lerp(lerp(h(0, 0), h(1, 0), u), lerp(h(0, 1), h(1, 1), u), v);
  }
  function fbm(x, y = 0, oct = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f); f *= 2; a *= .5; } return s; }
  /* cresta periódica de periodo P (px): suma de senos con ciclos enteros → se repite exactamente cada P al hacer scroll */
  function ridge(x, seed, P = 1080, oct = 4) { const r = rng(seed * 7919 + 1); let s = 0, a = 1, tot = 0; for (let i = 0; i < oct; i++) { const k = Math.round(1.5 * Math.pow(1.9, i)) + Math.floor(r() * 2); s += a * Math.sin(TAU * (k * x / P) + r() * TAU); tot += a; a *= .55; } return s / tot; }

  function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function rad(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); }
  /* halo suave sin usar blur: gradiente radial */
  function halo(ctx, x, y, r, color, alpha = 1) { ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = rad(ctx, x, y, 0, r, [[0, color], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }
  /* texto: o = {size, weight, font, color, align, base, stroke, strokeW, shadow, spacing} */
  function text(ctx, str, x, y, o = {}) {
    ctx.save(); const f = o.font || 'Bricolage Grotesque, Inter, sans-serif';
    ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 800} ${o.size || 80}px ${f}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    if (o.spacing && 'letterSpacing' in ctx) ctx.letterSpacing = o.spacing + 'px';
    if (o.shadow) { ctx.shadowColor = o.shadow[0]; ctx.shadowBlur = o.shadow[1]; ctx.shadowOffsetX = o.shadow[2] || 0; ctx.shadowOffsetY = o.shadow[3] || 0; }
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeW || 8; ctx.strokeStyle = o.stroke; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || '#fff'; ctx.fillText(str, x, y); ctx.restore();
  }
  /* emoji grande (Noto Color Emoji), con sombra opcional */
  function emoji(ctx, ch, x, y, size, rot = 0, shadow = true) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `${size}px "Noto Color Emoji"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = size * .16; ctx.shadowOffsetY = size * .08; }
    ctx.fillText(ch, 0, size * .06); ctx.restore();
  }
  /* viñeta */
  function vignette(ctx, W, H, k = .45) { ctx.save(); ctx.fillStyle = rad(ctx, W / 2, H / 2, H * .25, H * .75, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${k})`]]); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  /* grano de película (solo fotos); se precalcula una baldosa */
  let _grain = null;
  function grain(ctx, W, H, amount = .06, seed = 3) {
    if (!_grain) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), im = g.createImageData(256, 256), r = rng(seed); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); _grain = c; }
    ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = 'overlay'; const p = ctx.createPattern(_grain, 'repeat'); ctx.fillStyle = p; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  /* estrellas titilantes con bucle perfecto */
  function stars(ctx, n, seed, t, o = {}) {
    const r = rng(seed), W = o.W || 1080, H = o.H || 1920, y0 = o.y0 || 0, y1 = o.y1 || H;
    for (let i = 0; i < n; i++) { const x = r() * W, y = y0 + r() * (y1 - y0), s = .6 + r() * 1.8, k = 1 + Math.floor(r() * 3), ph = r(); const a = .35 + .65 * wave01(t, k, ph); ctx.globalAlpha = a * (o.alpha || 1); ctx.fillStyle = o.color || '#fff'; ctx.fillRect(x, y, s * 2, s * 2); }
    ctx.globalAlpha = 1;
  }
  /* sierra de montañas rellena; scroll en px (múltiplo de P para bucle perfecto) */
  function ridgeFill(ctx, W, H, baseY, amp, fill, seed, scroll = 0, P = 1080, oct = 4, step = 12) {
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + step; x += step) ctx.lineTo(x, baseY - amp * (.5 + .5 * ridge(x + scroll, seed, P, oct)));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  /* nube estilo plano (círculos) */
  function cloud(ctx, x, y, s, color = '#fff', alpha = 1) { ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; [[0, 0, 60], [55, -22, 70], [120, 0, 58], [60, 14, 62], [-40, 18, 40], [160, 18, 38]].forEach(([dx, dy, r]) => { circle(ctx, x + dx * s, y + dy * s, r * s); ctx.fill(); }); ctx.restore(); }
  /* partículas ascendentes/flotantes en bucle: f(i, p01) dibuja la i-ésima */
  function loopParticles(n, seed, t, f) { const r = rng(seed); for (let i = 0; i < n; i++) { const k = 1 + Math.floor(r() * 2), ph = r(); const p = ((t * k + ph) % 1 + 1) % 1; f(i, p, r); } }
  function hsl(h, s, l, a = 1) { return `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`; }
  function mix(c1, c2, k) { const p = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }; const a = p(c1), b = p(c2); return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`; }
  /* sombra suave elíptica en el suelo */
  function shadowEllipse(ctx, x, y, rx, ry, a = .35) { ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.fillStyle = rad(ctx, 0, 0, 0, rx, [[0, `rgba(0,0,0,${a})`], [1, 'rgba(0,0,0,0)']]); circle(ctx, 0, 0, rx); ctx.fill(); ctx.restore(); }

  window.L = { TAU, clamp, lerp, smooth, easeOut, easeInOut, wave, wave01, pulse, rng, noise, fbm, ridge, lin, rad, rr, circle, ellipse, halo, text, emoji, vignette, grain, stars, ridgeFill, cloud, loopParticles, hsl, mix, shadowEllipse };
  window.SCENES = {};
})();
