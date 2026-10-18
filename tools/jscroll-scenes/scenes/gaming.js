/* GAMING – a: plataformas pixel-art con parallax (v0: robotito en día verde; v1: astronauta en planeta al atardecer) */
(function () {
  const { TAU, wave, wave01, lin, rad, halo, rng, circle, mix, lerp, clamp, rr } = L;
  const PX = 12, W = 1080, H = 1920, COLS = 90;
  const snap = (v) => Math.round(v / PX) * PX;
  const R = (ctx, col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const mod = (a, n) => ((a % n) + n) % n;
  /* sprite desde cadenas; fx = voltear; mezcla de tramos horizontales del mismo color */
  function spr(ctx, rows, pal, x, y, fx) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r], n = row.length; let c = 0;
      while (c < n) {
        const ch = fx ? row[n - 1 - c] : row[c]; let e = c + 1;
        while (e < n && (fx ? row[n - 1 - e] : row[e]) === ch) e++;
        if (ch !== '.' && pal[ch]) { ctx.fillStyle = pal[ch]; ctx.fillRect(x + c * PX, y + r * PX, (e - c) * PX, PX); }
        c = e;
      }
    }
  }
  const ramp = (stops, n) => { const out = []; for (let i = 0; i < n; i++) { const k = i / (n - 1) * (stops.length - 1), j = Math.min(stops.length - 2, Math.floor(k)); out.push(mix(stops[j], stops[j + 1], k - j)); } return out; };
  function skyBands(ctx, cols, rowsPer, y0) {
    cols.forEach((c, i) => R(ctx, c, 0, y0 + i * rowsPer * PX, W, rowsPer * PX + 1));
    for (let i = 0; i < cols.length - 1; i++) {
      const rb = (y0 / PX) + (i + 1) * rowsPer;
      for (let c = 0; c < COLS; c++) { if (c % 2) R(ctx, cols[i + 1], c * PX, (rb - 1) * PX, PX, PX); else R(ctx, cols[i], c * PX, rb * PX, PX, PX); }
    }
  }
  function disc(ctx, cx, cy, r, col) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * .6) R(ctx, col, (cx + i) * PX, (cy + j) * PX, PX, PX); }
  /* sierra por columnas de píxel */
  function ridgeCols(ctx, o, shift) {
    let prev = null;
    for (let c = -1; c < COLS; c++) {
      const wx = c * PX + shift, f = .5 + .5 * L.ridge(wx, o.seed, 1080, o.oct || 4); let h = Math.round(o.amp * f); if (o.mesa) h = Math.round(h / o.mesa) * o.mesa;
      if (c >= 0) {
        const y = o.base - h * PX, falling = prev !== null && h < prev, col = falling ? o.shade : o.col;
        R(ctx, col, c * PX, y, PX, o.base - y + 1);
        R(ctx, o.hi || col, c * PX, y, PX, PX);
        if (o.snow && h > o.snowAt) { const n = Math.min(4, 1 + Math.floor((h - o.snowAt) / 2)); R(ctx, o.snow, c * PX, y, PX, n * PX); if (falling) R(ctx, o.snowShade, c * PX, y + (n - 1) * PX, PX, PX); }
        if (o.line && h > 6 && (c * 7 + h) % 5 === 0) R(ctx, o.shade, c * PX, y + 3 * PX, PX, 2 * PX);
      }
      prev = h;
    }
  }
  const hillY = (o, wx) => o.base - Math.round(o.amp * (.5 + .5 * L.ridge(wx, o.seed, 1080, o.oct || 3))) * PX;

  const SP = {
    cloud1: ['....WWWW........', '..WWWWWWWW..WW..', '.WWWWWWWWWWWWWW.', 'WWWWWWWWWWWWWWWW', 'SSSSSSSSSSSSSSSS'],
    cloud2: ['.....WWW....', '...WWWWWWW..', '.WWWWWWWWWW.', 'WWWWWWWWWWWW', 'SSSSSSSSSSSS'],
    tree: ['...GGGG...', '..GGHHGGG.', '.GGHGGGGGG', 'GGGGGGGGGD', 'GGGGGGGGDD', '.GGGGGDDD.', '...GDDD...', '....TT....', '....TT....', '....TT....'],
    cactus: ['....PP....', '...PPHP...', '...PPPP...', 'PP.PPPP...', 'PPPPPPP.PP', '.PPPPPP.PP', '...PPPPPPP', '...PPPP...', '...PPPP...', '...PPPP...'],
    bush: ['..GGG.....', '.GGHGG.GG.', 'GGGGGGGGGG', 'GGGGGGGGDD'],
    flower: ['.R.', 'RYR', '.R.', '.G.', '.G.'],
    crate: ['KKKKKKKKKK', 'KBBBBBBBBK', 'KBKBBBBKBK', 'KBBKBBKBBK', 'KBBBKKBBBK', 'KBBBKKBBBK', 'KBBKBBKBBK', 'KBKBBBBKBK', 'KBBBBBBBBK', 'KKKKKKKKKK'],
    crystal: ['....CC....', '...CHCC...', '...CHCC...', '.CC.CCC.CC', '.CHCCCCCCH', 'CCHCCDCCHC', 'CCCCCDCCCC', 'CCCCDDCCCC', '.CCCDDCCC.', '..DDDDDD..'],
    slime: ['....GGGGGG....', '..GGHHGGGGGG..', '.GGHGGGGGGGGG.', 'GGGGKWGGKWGGGG', 'GGGGKKGGKKGGGG', 'GGGGGGGGGGGGGG', 'DGGGGGGGGGGGGD', '.DDDDDDDDDDDD.'],
    slime2: ['..............', '....GGGGGG....', '..GGHHGGGGGG..', '.GGHGGGGGGGGG.', 'GGGGKWGGKWGGGG', 'GGGGKKGGKKGGGG', 'GGGGGGGGGGGGGG', 'DDDDDDDDDDDDDD'],
    alien: ['...P..PP..P...', '...PP.PP.PP...', '..PPPPPPPPPP..', '.PPHHPPPPPPPP.', 'PPHPWWWWWWPPPP', 'PPPPWKKKKWPPPP', 'PPPPWKKKKWPPPP', 'PPPPPWWWWPPPPP', '.PPPPPPPPPPPP.', 'D.DD.DDDD.DD.D'],
    alien2: ['..P...PP...P..', '...PP.PP.PP...', '..PPPPPPPPPP..', '.PPHHPPPPPPPP.', 'PPHPWWWWWWPPPP', 'PPPPWKKKKWPPPP', 'PPPPWKKKKWPPPP', 'PPPPPWWWWPPPPP', '.PPPPPPPPPPPP.', '.DD.DDDD.DD.D.'],
    heart: ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
    bird: ['K...K', '.K.K.', '..K..'], bird2: ['..K..', '.K.K.', 'K...K']
  };
  const ROBOT = {
    head: ['.......YY.......', '.......KK.......', '....KKKKKKKK....', '...KBBBBBBBBK...', '..KBBBBBBBBBBK..', '.KKBKKKKKKKKBKK.', 'KOKBKWWKKWWKBKOK', 'KOKBKWWKKWWKBKOK', '.KKBKKKKKKKKBKK.', '..KBBBBBbBBBBK..', '...KKKKKKKKKK...', '..KBBBBBBBBBBK..', '.KBKBBWWWWBBKBK.', '.KBKBBWYYWBBKBK.', '.KBKBBWWWWBBKBK.', '..KKbBBBBBBbKK..'],
    legs: [
      ['..KBBK....KBBK..', '.KKKKK....KKKKK.'],
      ['....KBBKKBBK....', '....KKKKKKKK....'],
      ['.KBBK......KBBK.', '.KKKK......KKKK.'],
      ['....KBBKKBBK....', '....KKKKKKKK....'],
      ['...KBBK..KBBK...', '..KKKKK..KKKKK..']],
    pal: { K: '#1b1633', B: '#31d0c0', b: '#1d9a96', W: '#f3fdff', Y: '#ffd23f', O: '#ff7a45' }
  };
  const ASTRO = {
    head: ['.....KKKKKK.....', '...KKWWWWWWKK...', '..KWWWWWWWWWWK..', '.KWWKKKKKKKKWWK.', '.KWKKCCKKKKKKWK.', '.KWKKCKKKKKKKWK.', '.KWKKKKKKKKKKWK.', '.KWWKKKKKKKKWWK.', '..KWWKKKKKKWWK..', '...KKWWWWWWKK...', '..KKOOWWWWOOKK..', 'KKWKOOWWWWOOKWKK', 'KWWKWWRRRRWWKWWK', 'KWWKWWRYYRWWKWWK', '.KKKWWWWWWWWKKK.', '...KWWWWWWWWK...'],
    legs: [
      ['..KWWK....KWWK..', '.KOOOK....KOOOK.'],
      ['....KWWKKWWK....', '....KOOKKOOK....'],
      ['.KWWK......KWWK.', '.KOOK......KOOK.'],
      ['....KWWKKWWK....', '....KOOKKOOK....'],
      ['...KWWK..KWWK...', '..KOOOK..KOOOK..']],
    pal: { K: '#1b1633', W: '#f1f4ff', C: '#9ff0ff', O: '#ff7a45', R: '#ff4f6d', Y: '#ffd23f' }
  };

  const WORLD = 270, CH = 26, TJ = .14;
  const SETS = [
    { // día
      sky: ramp(['#2a64d8', '#4f97f2', '#9fd3ff', '#d8f1ff'], 13), skyRows: 8,
      far: { base: 1330, amp: 54, seed: 3, col: '#9cb8ec', shade: '#7f9cd6', hi: '#b9d0f6', snow: '#ffffff', snowShade: '#d5e4fb', snowAt: 22, oct: 4 },
      mid: { base: 1428, amp: 13, seed: 7, col: '#58c46a', shade: '#44a95a', hi: '#7ddc86', oct: 3 },
      deco: 'tree', decoPal: { G: '#2e9e55', H: '#58cf7d', D: '#1f7a45', T: '#7a4a2a' },
      top: '#7ddc63', top2: '#3fae4e', dirt: ['#b0703f', '#945a30', '#cf8d55'], lowTop: '#2c8c3d',
      pit: ['#2a7de1', '#8fd0ff', '#1a4fa8'], cloud: { W: '#ffffff', S: '#cfe3ff' },
      char: ROBOT,
      obs: [{ c: 60, type: 'pit', hw: 5, hr: 0 }, { c: 150, type: 'slime', hw: 7, hr: 8 }, { c: 240, type: 'crate', hw: 5, hr: 10 }],
      hearts: '#ff5470', coinHi: '#fff2a0'
    },
    { // atardecer en planeta
      sky: ramp(['#0e0a38', '#34177e', '#8b2c9f', '#e2527c', '#ffb06a'], 13), skyRows: 8,
      far: { base: 1330, amp: 64, seed: 11, col: '#8a3f9c', shade: '#6f3282', hi: '#a85bb8', mesa: 5, oct: 3, line: true },
      mid: { base: 1428, amp: 18, seed: 5, col: '#b8467a', shade: '#97386a', hi: '#d9658d', oct: 3, mesa: 3 },
      deco: 'cactus', decoPal: { P: '#e0638f', H: '#ff9cb8' },
      top: '#ffb066', top2: '#e0693f', dirt: ['#b8453f', '#8f3045', '#d9604a'], lowTop: '#c24a3a',
      pit: ['#ff6b2c', '#ffd23f', '#c4321f'], cloud: { W: '#ffbfb0', S: '#e58aa6' },
      char: ASTRO,
      obs: [{ c: 60, type: 'pit', hw: 6, hr: 0 }, { c: 150, type: 'alien', hw: 7, hr: 10 }, { c: 240, type: 'crystal', hw: 5, hr: 10 }],
      hearts: '#ff4f9a', coinHi: '#ffffff'
    }
  ];

  function drawPlatformer(ctx, t, v) {
    const S = SETS[v % SETS.length], gy = 1440, night = v % 2 === 1;
    const sh1 = snap(t * 1080), sh2 = snap(t * 2160), sh3 = snap(t * 3240), shc = Math.round(t * WORLD);
    // cielo
    skyBands(ctx, S.sky, S.skyRows, 0);
    ctx.fillStyle = S.sky[S.sky.length - 1]; ctx.fillRect(0, S.sky.length * S.skyRows * PX - 2, W, 700);
    if (night) {
      const r = rng(41); for (let i = 0; i < 60; i++) { const x = Math.floor(r() * COLS), y = Math.floor(r() * 70), k = 1 + Math.floor(r() * 3), ph = r(); if (wave01(t, k, ph) > .4) R(ctx, i % 5 ? '#ffe9f2' : '#9ff0ff', x * PX, (y + 8) * PX, PX, PX); }
      // planeta con anillo
      const px0 = 22, py0 = 36, ring = (front) => { for (let j = -6; j <= 6; j++) for (let i = -17; i <= 17; i++) { const e = (i / 16.5) * (i / 16.5) + (j / 4.6) * (j / 4.6); if (e <= 1.05 && e > .55 && (j >= 0) === front) R(ctx, e > .86 ? '#ffc46b' : '#ffe3a8', (px0 + i) * PX, (py0 + j + 1) * PX, PX, PX); } };
      ring(false); disc(ctx, px0, py0, 9, '#4cc9dd'); disc(ctx, px0 - 2, py0 - 2, 7, '#7fe9f2'); disc(ctx, px0 - 3, py0 - 3, 3, '#c9fbff');
      for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) if (i * i + j * j <= 90 && i * i + j * j > 56 && (i + j) % 3 === 0) R(ctx, '#2f9fbf', (px0 + i) * PX, (py0 + j) * PX, PX, PX);
      ring(true);
      disc(ctx, 66, 30, 2, '#ffe9d6'); R(ctx, '#e8c2b0', 66 * PX, 31 * PX, PX, PX);
    } else {
      const sx = 72, sy = 44, pls = wave01(t, 2) > .5 ? 1 : 0;
      disc(ctx, sx, sy, 8 + pls, '#ffe98a'); disc(ctx, sx, sy, 6, '#fff7c4'); disc(ctx, sx, sy, 4, '#ffffff');
      for (let k = 0; k < 8; k++) { const a = k * TAU / 8, d = 12 + pls; R(ctx, '#fff0a0', (sx + Math.round(Math.cos(a) * d)) * PX, (sy + Math.round(Math.sin(a) * d)) * PX, PX, PX); }
    }
    // nubes (p. 1080 · k anillos por bucle)
    [[0, 130, 330, 'cloud1', 1], [1, 560, 440, 'cloud2', 1], [2, 860, 250, 'cloud1', 2], [3, 300, 640, 'cloud2', 2], [4, 760, 790, 'cloud1', 1]].forEach(([i, x0, y0, name, k]) => {
      const x = snap(mod(x0 - t * 1080 * k, 1080)), pal = { W: S.cloud.W, S: S.cloud.S };
      spr(ctx, SP[name], pal, x, snap(y0), false); spr(ctx, SP[name], pal, x - 1080, snap(y0), false);
    });
    // pájaros
    if (!night) for (let i = 0; i < 3; i++) { const x = snap(mod(i * 330 + 100 - t * 2160, 1080)), y = snap(500 + i * 60 + 12 * wave(t, 2, i * .2)), bs = Math.floor(t * 48 + i + 1e-3) % 2 ? SP.bird : SP.bird2; spr(ctx, bs, { K: '#2a3a7a' }, x, y, false); spr(ctx, bs, { K: '#2a3a7a' }, x - 1080, y, false); }
    // sierra lejana + niebla
    ridgeCols(ctx, S.far, sh1);
    [[1, .22], [3, .12], [5, .07]].forEach(([n, a]) => { ctx.fillStyle = night ? `rgba(255,150,120,${a})` : `rgba(255,255,255,${a})`; ctx.fillRect(0, S.far.base - n * PX, W, n * PX); });
    // colinas medias + decoración
    ridgeCols(ctx, S.mid, sh2);
    const dr = rng(12 + v);
    for (let i = 0; i < 7; i++) {
      const wx = i * 150 + dr() * 60, x = snap(mod(wx - sh2, 1080)), hy = hillY(S.mid, x + sh2);
      const rows = SP[S.deco], pal = Object.assign({}, S.decoPal); const hh = rows.length * PX;
      spr(ctx, rows, pal, x, hy - hh + PX, false); spr(ctx, rows, pal, x - 1080, hillY(S.mid, x - 1080 + sh2) - hh + PX, false);
    }
    // suelo base (detrás del mundo)
    ctx.fillStyle = S.top2; ctx.fillRect(0, gy, W, H - gy);
    // decoración de suelo
    const dec = rng(33 + v);
    for (let i = 0; i < 9; i++) { const wc = Math.floor(dec() * WORLD), kind = dec() < .5; const sc = mod(wc - shc, WORLD); if (sc > COLS + 6) continue; const x = (sc - 4) * PX; if (night) { if (kind) { R(ctx, '#8f3045', x, gy - 2 * PX, 3 * PX, 2 * PX); R(ctx, '#b8453f', x + PX, gy - 3 * PX, 2 * PX, PX); } else { R(ctx, '#ffd23f', x, gy - PX, PX, PX); R(ctx, '#ff9cb8', x + 2 * PX, gy - 2 * PX, PX, 2 * PX); } } else { spr(ctx, kind ? SP.bush : SP.flower, { G: '#37a64f', H: '#5fd16f', D: '#2a8a41', R: '#ff6b81', Y: '#ffe066' }, x, gy - (kind ? 4 : 5) * PX, false); } }
    // suelo por columnas (con fosos)
    const pits = S.obs.filter(o => o.type === 'pit');
    const dd = rng(8 + v), dirtTab = []; for (let c = 0; c < COLS; c++) dirtTab.push(Array.from({ length: 12 }, () => dd()));
    const inPit = (wc) => pits.some(p => wc >= p.c - p.hw && wc < p.c + p.hw);
    for (let c = 0; c < COLS + 1; c++) {
      const wc = mod(c + shc, WORLD), x = c * PX;
      if (inPit(wc)) continue;
      const ed = inPit(mod(wc - 1, WORLD)), er = inPit(mod(wc + 1, WORLD));
      R(ctx, S.dirt[0], x, gy, PX, H - gy);
      R(ctx, S.top, x, gy, PX, PX); R(ctx, S.top, x, gy + PX, PX, PX); R(ctx, S.top2, x, gy + 2 * PX, PX, PX);
      if ((c + shc) % 3 === 0) R(ctx, S.top2, x, gy + 3 * PX, PX, PX);
      const tab = dirtTab[mod(c + shc, COLS)];
      for (let j = 0; j < 12; j++) { if (tab[j] < .32) R(ctx, tab[j] < .15 ? S.dirt[1] : S.dirt[2], x, gy + (4 + j * 2) * PX, PX, PX); }
      if (night) R(ctx, 'rgba(255,255,255,.35)', x, gy, PX, PX); else R(ctx, '#a4f080', x, gy, PX, PX);
      if (ed || er) { R(ctx, 'rgba(0,0,0,.22)', ed ? x : x + PX - 4, gy + 2 * PX, 4, 14 * PX); }
    }
    // fosos: agua / lava
    pits.forEach(p => {
      const sc = mod(p.c - p.hw - shc, WORLD); if (sc > COLS + 4 && sc < WORLD - p.hw * 2 - 4) return;
      const x0 = (sc > WORLD - p.hw * 2 - 4 ? sc - WORLD : sc) * PX, w = p.hw * 2 * PX, y0 = gy + 3 * PX;
      R(ctx, S.pit[2], x0, y0, w, H - y0); R(ctx, S.pit[0], x0, y0 + PX, w, H - y0);
      for (let c = 0; c < p.hw * 2; c++) { const ph = Math.sin(c * .9 + TAU * t * 3 + (c % 3)) > .2 ? 0 : 1; R(ctx, S.pit[1], x0 + c * PX, y0 + ph * PX, PX, PX); if (c % 2 === (Math.floor(t * 12 + 1e-3) % 2)) R(ctx, S.pit[1], x0 + c * PX, y0 + (3 + (c % 4)) * PX, PX, PX); }
      if (night) { for (let i = 0; i < 3; i++) { const bp = (t * 3 + i / 3 + p.hw * .1) % 1, bx = x0 + (2 + i * 3) * PX, by = y0 - Math.round(Math.sin(Math.PI * bp) * 5) * PX; R(ctx, S.pit[1], bx, by, PX, PX); if (bp > .9 || bp < .1) R(ctx, S.pit[1], bx - PX, by, 3 * PX, PX); } }
    });
    // obstáculos
    S.obs.forEach(o => {
      if (o.type === 'pit') return;
      const sc = mod(o.c - shc, WORLD); if (sc > COLS + 8 && sc < WORLD - 10) return; const cc = sc > WORLD - 10 ? sc - WORLD : sc;
      const fr = Math.floor(t * 48 + 1e-3) % 2;
      if (o.type === 'slime') { const rows = fr ? SP.slime2 : SP.slime; spr(ctx, rows, { G: '#59d65f', H: '#b7f58f', D: '#2d9f4a', K: '#1b1633', W: '#fff' }, (cc - 7) * PX, gy - 8 * PX, false); }
      else if (o.type === 'alien') { spr(ctx, fr ? SP.alien2 : SP.alien, { P: '#a566f0', H: '#d3aaff', D: '#6a3fc0', K: '#1b1633', W: '#fff7d6' }, (cc - 7) * PX, gy - 10 * PX, false); }
      else if (o.type === 'crate') { [[-5, 0], [0, 0], [-2.5, 1]].forEach(([dx, k]) => spr(ctx, SP.crate, { K: '#3b2314', B: '#d9953f' }, Math.round((cc + dx) * 1) * PX, gy - (k + 1) * 10 * PX, false)); }
      else if (o.type === 'crystal') { [[-5, 0], [0, 0], [-2, 1]].forEach(([dx, k], i) => spr(ctx, SP.crystal, { C: i === 1 ? '#ff7ad9' : '#6ee7ff', H: '#ffffff', D: i === 1 ? '#b03aa0' : '#2a8fb8' }, Math.round((cc + dx)) * PX, gy - (k + 1) * 10 * PX, false)) ; }
    });
    // salto
    const info = S.obs.map(o => { const u = .5 - ((o.hw + 6) / WORLD) / TJ, apex = Math.max(8, (o.hr + 2.2) / (4 * u * (1 - u))); return { ta: mod((o.c - CH) / WORLD, 1), apex }; });
    let off = 0, air = false;
    info.forEach(j => { const d = mod(t - j.ta + .5, 1) - .5; if (Math.abs(d) < TJ / 2) { const u = d / TJ + .5, h = j.apex * 4 * u * (1 - u); if (h > off) off = h; air = true; } });
    const offPx = Math.round(off) * PX;
    // monedas
    const coins = [];
    S.obs.forEach((o, i) => {
      for (let k = -2; k <= 2; k++) { const tau = k * .026, u = tau / TJ + .5, offR = info[i].apex * 4 * u * (1 - u); coins.push({ wc: mod(o.c + tau * WORLD, WORLD), y: gy - Math.round(offR + 12) * PX, i: coins.length }); }
      for (let k = -1; k <= 1; k++) coins.push({ wc: mod(o.c + 44 + k * 6, WORLD), y: gy - 11 * PX, i: coins.length });
    });
    coins.forEach(cn => {
      const sc = mod(cn.wc - shc, WORLD);
      if (sc >= CH && sc <= COLS + 4) {
        const w = [5, 3, 1, 3][Math.floor(mod(t * 64 + cn.i + 1e-3, 4))], cx = sc * PX + 2.5 * PX, ox = cx - w * PX / 2, rowsW = w === 5 ? [3, 5, 5, 5, 3] : w === 3 ? [1, 3, 3, 3, 1] : [1, 1, 1, 1, 1];
        rowsW.forEach((rw, r) => { R(ctx, '#b36b00', cx - rw * PX / 2, cn.y + r * PX, rw * PX, PX); });
        rowsW.forEach((rw, r) => { if (rw > 2 && r > 0 && r < 4) R(ctx, '#ffcf33', cx - (rw - 2) * PX / 2, cn.y + r * PX, (rw - 2) * PX, PX); });
        if (w === 5) { R(ctx, S.coinHi, cx - PX, cn.y + PX, PX, PX); } else if (w === 3) R(ctx, S.coinHi, cx - PX / 2, cn.y + PX, PX, PX);
      } else if (sc < CH && sc >= CH - 7) {
        const p = (CH - sc) / 7, cx = (CH + 1) * PX + 2 * PX, cy = cn.y + 2 * PX, d = (1 + p * 5) * PX;
        ctx.globalAlpha = 1 - p * .8; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => R(ctx, '#fff3a0', snap(cx + dx * d), snap(cy + dy * d), PX, PX)); [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([dx, dy]) => R(ctx, '#ffd23f', snap(cx + dx * d * .6), snap(cy + dy * d * .6), PX, PX)); ctx.globalAlpha = 1;
      }
    });
    // polvo
    if (!air) for (let i = 0; i < 3; i++) { const p = mod(t * 12 + i / 3, 1), x = snap((CH - 4) * PX - p * 5 * PX), y = gy - PX - snap(p * 3 * PX); ctx.globalAlpha = 1 - p; R(ctx, night ? '#ffe0c0' : '#f3e6c8', x, y, PX * (p < .5 ? 2 : 1), PX); ctx.globalAlpha = 1; }
    // personaje
    const pose = air ? 4 : Math.floor(t * 96 + 1e-3) % 4, bob = !air && (pose === 1 || pose === 3) ? PX : 0, C = S.char;
    const px0 = (CH - 8) * PX, py0 = gy - 18 * PX - offPx - bob;
    const lg = C.legs[pose];
    { const sw = Math.max(4, 12 - Math.round(offPx / PX / 3)); ctx.fillStyle = 'rgba(20,10,40,.28)'; ctx.fillRect((CH - sw / 2) * PX, gy, sw * PX, PX); ctx.fillRect((CH - sw / 2 + 1) * PX, gy + PX, (sw - 2) * PX, PX); }
    spr(ctx, C.head, C.pal, px0, py0, false);
    spr(ctx, lg, C.pal, px0, py0 + C.head.length * PX, false);
    // propulsión/antena parpadeante
    if (wave01(t, 6) > .5) R(ctx, '#fff7c4', px0 + 7 * PX, py0, 2 * PX, PX);
    // HUD
    for (let i = 0; i < 3; i++) spr(ctx, SP.heart, { R: i < 2 || wave01(t, 4) > .5 ? S.hearts : '#5a2a4a' }, 96 + i * 108, 270, false);
    spr(ctx, ['.YYY.', 'YOOOY', 'YOYOY', 'YOOOY', '.YYY.'], { Y: '#ffcf33', O: '#ff9f1c' }, 800, 270, false);
    R(ctx, '#fff', 880, 288, PX * 2, PX); R(ctx, '#fff', 880 + 6, 282, PX, PX * 2 + 6);
    for (let i = 0; i < 4; i++) R(ctx, i < 3 ? '#fff' : 'rgba(255,255,255,.4)', 930 + i * 30, 276, 22, 40);
  }

  SCENES['gaming-a'] = {
    topic: 'gaming', stillT: [.1, .45],
    cap: [
      { ca: 'Un salt més i ja tinc la moneda 🪙 #gaming #pixelart', es: 'Un salto más y ya tengo la moneda 🪙 #gaming #pixelart', en: 'One more jump and the coin is mine 🪙 #gaming #pixelart' },
      { ca: 'L\'astronauta corre per un planeta de lava 🚀 #retrogaming', es: 'El astronauta corre por un planeta de lava 🚀 #retrogaming', en: 'The astronaut runs across a lava planet 🚀 #retrogaming' }],
    draw(ctx, t, v) { drawPlatformer(ctx, t, v); }
  };

  const easeIO = L.easeInOut;
  const beat = (t, k, ph = 0) => { const f = (((t * k + ph) % 1) + 1) % 1; return (1 - Math.exp(-f * 70)) * Math.exp(-f * 4.2); };
  function level(i, N, t, seed) {
    const x = i / Math.max(1, N - 1), r = rng(seed * 131 + i * 17 + 3);
    const env = .30 + .5 * Math.pow(1 - x, .9) + .25 * Math.exp(-Math.pow((x - .55) * 3.2, 2));
    const a = wave01(t, 2 + Math.floor(r() * 5), r()), b = wave01(t, 3 + Math.floor(r() * 6), r()), c = wave01(t, 8 + Math.floor(r() * 5), r());
    return clamp(1.5 * env * (.14 + .5 * a + .26 * b + .12 * c) + beat(t, 12) * (1 - x) * .3, .04, 1);
  }
  function neonStroke(ctx, drawPath, col, w, core) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[w * 4.2, .08], [w * 2.6, .14], [w * 1.5, .28]].forEach(([lw, a]) => { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; drawPath(); ctx.stroke(); });
    ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = w; drawPath(); ctx.stroke();
    ctx.strokeStyle = core || '#fff'; ctx.lineWidth = w * .38; drawPath(); ctx.stroke(); ctx.restore();
  }

  /* ================= GAMING – b: arcade neón de bloques que encajan y limpian línea ================= */
  const PT = {
    I: { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], w: 4, k: 1, c: '#27e3ff' },
    O: { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], w: 2, k: 2, c: '#ffd23f' },
    L: { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], w: 3, k: 2, c: '#ff9a3d' },
    J: { cells: [[0, 0], [1, 0], [2, 0], [0, 1]], w: 3, k: 2, c: '#5b86ff' },
    T: { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], w: 3, k: 2, c: '#c070ff' },
    V: { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], w: 1, k: 4, c: '#ff3f8a' }
  };
  const BCFG = [
    { cols: 10, rows: 18, cell: 64, x0: 220, yb: 1470, cyc: ['I', 'O', 'L'], hole: [6, 4, 0], n: 6, mosaic: ['#1fb6d9', '#7a5cff', '#e04fb0', '#3fd0a0'],
      bg: ['#050a22', '#0b1a4a', '#14307a'], neon: '#27e3ff', neon2: '#ff3fa4', panel: 'rgba(8,16,48,.78)' },
    { cols: 10, rows: 16, cell: 66, x0: 210, yb: 1460, cyc: ['J', 'I', 'V'], hole: [0, 4, 9], n: 3, mosaic: ['#ff6b9a', '#ff9a3d', '#9a5bff', '#3fd0c0'],
      bg: ['#16052e', '#4a0f5e', '#c2306f'], neon: '#ff3fa4', neon2: '#ffd23f', panel: 'rgba(30,6,46,.78)' }
  ];
  function block(ctx, x, y, s, c, sc) {
    sc = sc === undefined ? 1 : sc; if (sc <= .12) return;
    const m = s * (1 - sc) / 2; x += m; y += m; s *= sc;
    ctx.fillStyle = lin(ctx, x, y, x, y + s, [[0, mix(c, '#ffffff', .38)], [.5, c], [1, mix(c, '#000000', .35)]]);
    rr(ctx, x + 2, y + 2, s - 4, s - 4, s * .2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; rr(ctx, x + s * .16, y + s * .13, s * .5, s * .1, s * .05); ctx.fill();
    ctx.strokeStyle = mix(c, '#000000', .45); ctx.lineWidth = 2; rr(ctx, x + 2, y + 2, s - 4, s - 4, s * .2); ctx.stroke();
  }
  function bpiece(ctx, type, ox, oy, s, alpha) { const P = PT[type]; ctx.globalAlpha = alpha; P.cells.forEach(([dx, dr]) => block(ctx, ox + dx * s, oy - (dr + 1) * s, s, P.c)); ctx.globalAlpha = 1; }

  function drawBlocks(ctx, t, v) {
    const C = BCFG[v % BCFG.length], W = 1080, H = 1920, cell = C.cell, bw = C.cols * cell, bh = C.rows * cell, bx = C.x0, byTop = C.yb - bh, yb = C.yb;
    const m = C.cyc.length, E = m, e = Math.min(E - 1, Math.floor(t * E)), u = t * E - e;
    const typ = (j) => C.cyc[((j % m) + m) % m], hole = (j) => C.hole[((j % m) + m) % m], kk = (j) => PT[typ(j)].k;
    const b0 = -e, top = b0 + C.n - 1;
    const bumpClear = u > .56 && u < .78 ? Math.sin((u - .56) / .22 * Math.PI) : 0, beatB = beat(t, 12);
    // ----- fondo
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, C.bg[0]], [.55, C.bg[1]], [1, C.bg[2]]]); ctx.fillRect(0, 0, W, H);
    if (v % 2 === 0) {
      ctx.strokeStyle = 'rgba(39,227,255,.10)'; ctx.lineWidth = 2; for (let x = 0; x <= W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      halo(ctx, 540, 900, 900, '#2f6bff', .35 + .15 * bumpClear);
    } else {
      halo(ctx, 540, 640, 900, '#ff3fa4', .35 + .15 * bumpClear);
      const sy = 700, sR = 380; ctx.save(); ctx.fillStyle = lin(ctx, 0, sy - sR, 0, sy + sR, [[0, '#ffe36a'], [.5, '#ff8a4a'], [1, '#ff3f8a']]);
      const cuts = []; for (let j = -3; j < 16; j++) { const yy = sy - 40 + (j + t) * 56, th = clamp((yy - (sy - 40)) / (sR + 40), 0, 1) * 40; if (th > 1.5) cuts.push([yy, yy + th]); }
      let cur = sy - sR; const seg = (a, b) => { if (b <= a) return; ctx.save(); ctx.beginPath(); ctx.rect(0, a, W, b - a); ctx.clip(); circle(ctx, 540, sy, sR); ctx.fill(); ctx.restore(); };
      cuts.forEach(([a, b]) => { seg(cur, a); cur = Math.max(cur, b); }); seg(cur, sy + sR); ctx.restore();
      // suelo con rejilla
      ctx.fillStyle = 'rgba(20,4,40,.55)'; ctx.fillRect(0, 1120, W, H - 1120);
      for (let j = 0; j < 14; j++) { const uu = (j + t * 2) / 14, y = 1120 + Math.pow(uu, 2) * (H - 1120); ctx.fillStyle = `rgba(255,120,200,${.1 + .3 * uu})`; ctx.fillRect(0, y, W, 2 + 3 * uu); }
      for (let k = -10; k <= 10; k++) { ctx.strokeStyle = 'rgba(255,120,200,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(540 + k * 20, 1120); ctx.lineTo(540 + k * 150, H); ctx.stroke(); }
    }
    // piezas flotantes de fondo
    { const r = rng(14 + v); const keys = Object.keys(PT); for (let i = 0; i < 9; i++) { const type = keys[Math.floor(r() * keys.length)], s = 30 + r() * 26, x = r() * 1000, k = 1, ph = r(), rot = (r() - .5) * 1.6, p = mod(t * k + ph, 1), y = -200 + p * (H + 400); if (x > bx - 80 && x < bx + bw - 30) continue; ctx.save(); ctx.translate(x, y); ctx.rotate(rot + p * .4 * (i % 2 ? 1 : -1)); bpiece(ctx, type, 0, 0, s, .13); ctx.restore(); } }
    // ----- tablero
    const shake = bumpClear * 6 * Math.sin(u * 140);
    ctx.save(); ctx.translate(shake, 0);
    ctx.fillStyle = C.panel; rr(ctx, bx - 22, byTop - 22, bw + 44, bh + 44, 28); ctx.fill();
    halo(ctx, bx + bw / 2, byTop + bh / 2, 760, C.neon, .18 + .12 * bumpClear);
    ctx.fillStyle = 'rgba(2,6,20,.82)'; ctx.fillRect(bx, byTop, bw, bh);
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1.5; for (let c = 1; c < C.cols; c++) { ctx.beginPath(); ctx.moveTo(bx + c * cell, byTop); ctx.lineTo(bx + c * cell, yb); ctx.stroke(); } for (let r = 1; r < C.rows; r++) { ctx.beginPath(); ctx.moveTo(bx, byTop + r * cell); ctx.lineTo(bx + bw, byTop + r * cell); ctx.stroke(); }
    ctx.save(); ctx.beginPath(); ctx.rect(bx, byTop, bw, bh); ctx.clip();
    const cellXY = (col, row) => [bx + col * cell, yb - (row + 1) * cell];
    const mos = (type, col, row) => C.mosaic[Math.floor(rng(type.charCodeAt(0) * 977 + col * 31 + row * 7)() * C.mosaic.length)];
    // desplazamiento de subida
    const rp = clamp((u - .78) / .18), off = kk(top) * easeIO(rp);
    // capas
    let rs = 0; const lay = [];
    for (let j = b0; j <= top; j++) { lay.push({ j, rs, type: typ(j), k: kk(j) }); rs += kk(j); }
    const topL = lay[lay.length - 1];
    lay.forEach(Ly => {
      if (Ly === topL && u >= .78) return;
      const P = PT[Ly.type], hc = hole(Ly.j), isTop = Ly === topL, yoff = isTop ? 0 : off;
      const holeSet = new Set(P.cells.map(([dx, dr]) => (hc + dx) + ',' + dr));
      const clearing = isTop && u >= .5;
      for (let dr = 0; dr < Ly.k; dr++) for (let c = 0; c < C.cols; c++) {
        const inHole = holeSet.has(c + ',' + dr);
        if (inHole && !(isTop && u >= .5)) continue;
        const [x, y] = cellXY(c, Ly.rs + dr + yoff);
        if (clearing) {
          let col = inHole ? P.c : mos(Ly.type, c, dr), sc = 1;
          if (u < .56) { const fl = 1 - (u - .5) / .06; col = mix(col, '#ffffff', fl * .9); }
          else { const pc = (u - .56) / .22; if (pc < .35) { const bl = Math.sin(pc * 70) > 0 ? .85 : .3; col = mix(col, '#ffffff', bl); } else { const q = (pc - .35) / .65; sc = clamp(1 - (q * 1.7 - Math.abs(c - 4.5) / 4.5 * .7), 0, 1); col = mix(col, '#ffffff', .6 * (1 - q)); } }
          block(ctx, x, y, cell, col, sc);
        } else block(ctx, x, y, cell, mos(Ly.type, c, dr));
      }
    });
    // nueva capa que sube desde abajo
    if (u >= .78) { const j = b0 - 1, type = typ(j), P = PT[type], hc = hole(j), holeSet = new Set(P.cells.map(([dx, dr]) => (hc + dx) + ',' + dr)); for (let dr = 0; dr < P.k; dr++) for (let c = 0; c < C.cols; c++) { if (holeSet.has(c + ',' + dr)) continue; const [x, y] = cellXY(c, dr - P.k + off); block(ctx, x, y, cell, mos(type, c, dr)); } }
    // hueco de la capa superior (pista) + pieza que cae
    if (u < .5) {
      const P = PT[topL.type], hc = hole(topL.j), land = topL.rs;
      ctx.globalAlpha = .45 + .25 * wave01(t, 12); ctx.strokeStyle = P.c; ctx.lineWidth = 3;
      P.cells.forEach(([dx, dr]) => { const [x, y] = cellXY(hc + dx, land + dr); rr(ctx, x + 4, y + 4, cell - 8, cell - 8, 8); ctx.stroke(); }); ctx.globalAlpha = 1;
      const pf = clamp((u - .03) / .47), spawnRow = C.rows - 1 - (Math.max(...P.cells.map(c => c[1]))), startRow = spawnRow;
      const slow = Math.min(pf / .68, 1), hard = clamp((pf - .68) / .32);
      let row = pf <= .68 ? Math.round(lerp(startRow, land + 3, pf / .68)) : lerp(land + 3, land, hard * hard);
      const sc0 = Math.floor((C.cols - P.w) / 2), lat = clamp(pf / .55), colPos = Math.round(lerp(sc0, hc, lat) * 1) ;
      if (pf < .02) ctx.globalAlpha = pf / .02;
      P.cells.forEach(([dx, dr]) => { const [x, y] = cellXY(colPos + dx, row + dr); block(ctx, x, y, cell, P.c); });
      if (pf > .68) { P.cells.forEach(([dx, dr]) => { const [x, y] = cellXY(colPos + dx, row + dr); const trail = (row - land) * cell; ctx.fillStyle = lin(ctx, 0, y, 0, y - trail - 80, [[0, P.c], [1, 'rgba(255,255,255,0)']]); ctx.globalAlpha = .28; ctx.fillRect(x + 8, y - 90 - trail * .5, cell - 16, 90 + trail * .5); ctx.globalAlpha = 1; }); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // aterrizaje: onda y destello
    if (u >= .5 && u < .66) { const q = (u - .5) / .16, P = PT[topL.type], hc = hole(topL.j), [x, y] = cellXY(hc, topL.rs); ctx.strokeStyle = `rgba(255,255,255,${.7 * (1 - q)})`; ctx.lineWidth = 6 * (1 - q) + 1; rr(ctx, x - q * 40, y + (topL.k - 0) * cell - 4 - q * 10, P.w * cell + q * 80, 8, 4); ctx.stroke(); halo(ctx, x + P.w * cell / 2, y + cell * .5, 260, P.c, .7 * (1 - q)); }
    // limpieza de línea: destello, rayos y partículas
    if (u >= .56 && u < .95) {
      const pc = (u - .56) / .22, ts = u - .56;
      for (let dr = 0; dr < topL.k; dr++) {
        const [x, y] = cellXY(0, topL.rs + dr), cy = y + cell / 2;
        if (pc < 1) { const a = pc < .15 ? 1 : Math.max(0, 1 - (pc - .15) / .85); ctx.fillStyle = lin(ctx, 0, cy, W, cy, [[0, 'rgba(255,255,255,0)'], [.5, `rgba(255,255,255,${.9 * a})`], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(0, cy - 3 - 10 * a, W, 6 + 20 * a); halo(ctx, 540, cy, 520, C.neon, .6 * a); }
      }
      const rp2 = rng(77 + e), P = PT[topL.type];
      for (let dr = 0; dr < topL.k; dr++) for (let c = 0; c < C.cols; c++) for (let q = 0; q < 2; q++) {
        const rv = rp2(), r2 = rp2(), r3 = rp2(), [x, y] = cellXY(c, topL.rs + dr), tau = ts * 12 * .3 * (.6 + rv * .6) * .6; if (u < .6) continue;
        const tt = (u - .6) * 3.0, px2 = x + cell / 2 + (r2 - .5) * 700 * tt, py2 = y + cell / 2 - (250 + r3 * 450) * tt + 1500 * tt * tt, al = clamp(1 - tt / 1.1, 0, 1), s = (6 + rv * 12) * al;
        if (al <= 0) continue; ctx.save(); ctx.translate(px2, py2); ctx.rotate(tt * 8 * (r2 - .5)); ctx.globalAlpha = al; ctx.fillStyle = [P.c, '#ffffff', C.neon2][q + (c % 2)]; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
      }
      ctx.globalAlpha = 1;
      const cyc = yb - (topL.rs + topL.k / 2) * cell; const rq = clamp(pc);
      ctx.strokeStyle = `rgba(255,255,255,${.7 * (1 - rq)})`; ctx.lineWidth = 8 * (1 - rq) + 1; ctx.beginPath(); ctx.ellipse(540, cyc, 80 + rq * 520, 24 + rq * 70, 0, 0, TAU); ctx.stroke();
      if (u < .64) { ctx.fillStyle = `rgba(255,255,255,${.22 * (1 - (u - .56) / .08)})`; ctx.fillRect(0, 0, W, H); }
    }
    // base brillante
    ctx.fillStyle = lin(ctx, 0, yb + 22, 0, yb + 150, [[0, C.neon], [1, 'rgba(0,0,0,0)']]); ctx.globalAlpha = .22; ctx.fillRect(bx - 22, yb + 22, bw + 44, 130); ctx.globalAlpha = 1;
    // marco neón
    neonStroke(ctx, () => { rr(ctx, bx - 4, byTop - 4, bw + 8, bh + 8, 8); }, C.neon, 6, '#ffffff');
    ctx.restore();
    // ----- paneles laterales
    const pw = 190, ph = 230;
    const panel = (x, y, w, h, col) => { ctx.fillStyle = C.panel; rr(ctx, x, y, w, h, 22); ctx.fill(); neonStroke(ctx, () => { rr(ctx, x, y, w, h, 22); }, col, 4, '#fff'); };
    // siguiente pieza
    const nx = bx + bw + 24, nxw = W - nx - 24;
    if (nxw > 100) {
      panel(nx, 380, nxw, 230, C.neon2);
      const qs = u < .03 ? 0 : 1, nt = typ(top - 1 + (1 - qs)), NP = PT[nt], ns = nt === 'V' ? 34 : 42, nwid = Math.max(...NP.cells.map(c => c[0])) + 1, nh = Math.max(...NP.cells.map(c => c[1])) + 1;
      halo(ctx, nx + nxw / 2, 500, 150, NP.c, .5 + .2 * beatB);
      bpiece(ctx, nt, nx + nxw / 2 - nwid * ns / 2, 500 + nh * ns / 2, ns, 1);
      panel(nx, 650, nxw, 130, C.neon);
      const nt2 = typ(top - 2 + (1 - qs)), NP2 = PT[nt2], w2 = Math.max(...NP2.cells.map(c => c[0])) + 1; bpiece(ctx, nt2, nx + nxw / 2 - w2 * 24 / 2, 740 - (nt2 === 'V' ? 0 : 0) + (nt2 === 'V' ? 48 : 12), 24, .8);
    }
    // indicador de combo / energía a la izquierda
    const lw = bx - 48;
    if (lw > 90) {
      const lx = 24;
      panel(lx, 380, lw, 520, C.neon);
      const nB = 5, bwid = (lw - 40) / nB;
      for (let i = 0; i < nB; i++) { const lv = level(i * 3, 15, t, 4) * .9 + .1, hh = lv * 380, x = lx + 20 + i * bwid + 3, segs = Math.floor(hh / 26); for (let s = 0; s < segs; s++) { ctx.fillStyle = s > 12 ? C.neon2 : s > 8 ? '#ffd23f' : C.neon; rr(ctx, x, 868 - (s + 1) * 26, bwid - 6, 20, 5); ctx.fill(); } }
      // anillo de carga
      const gx = lx + lw / 2, gy = 1010, gp = u < .5 ? clamp((u - .03) / .47) : u < .78 ? 1 : 1 - easeIO(clamp((u - .78) / .2));
      panel(lx, 930, lw, 190, C.neon2);
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(gx, gy + 20, 52, 0, TAU); ctx.stroke();
      ctx.strokeStyle = C.neon2; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(gx, gy + 20, 52, -Math.PI / 2, -Math.PI / 2 + TAU * gp); ctx.stroke();
      halo(ctx, gx, gy + 20, 100, C.neon2, bumpClear * .8);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < 2 || (u > .6 && u < .9) ? '#ffd23f' : 'rgba(255,255,255,.18)'; ctx.beginPath(); const sx0 = gx - 40 + i * 40, sy0 = gy + 20; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 7 : 16; ctx.lineTo(sx0 + Math.cos(a) * r, sy0 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    }
    L.stars(ctx, 40, 91, t, { y1: 330, alpha: .7 });
    L.vignette(ctx, W, H, .4);
  }

  SCENES['gaming-b'] = {
    topic: 'gaming', stillT: [.14, .62],
    cap: [
      { ca: 'Aquell encaix perfecte que et fa molt feliç 🧩 #gaming #arcade', es: 'Ese encaje perfecto que te hace tan feliz 🧩 #gaming #arcade', en: 'That perfect fit that makes you so happy 🧩 #gaming #arcade' },
      { ca: 'Línia completa i tot brilla en neó 🎮 #retrogaming', es: 'Línea completa y todo brilla en neón 🎮 #retrogaming', en: 'Line cleared and everything glows neon 🎮 #retrogaming' }],
    draw(ctx, t, v) { drawBlocks(ctx, t, v); }
  };

  /* ================= GAMING – c: póster (mando neón / setup gamer con monitor curvo) ================= */
  const hsl = L.hsl;
  function hexPath(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  function sparkleShape(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); }
  function pixelIcon(ctx, rows, pal, x, y, s) { for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) { const ch = rows[r][c]; if (ch !== '.') { ctx.fillStyle = pal[ch]; ctx.fillRect(x + c * s, y + r * s, s, s); } } }

  function gamepadPoster(ctx, t) {
    const W = 1080, H = 1920, cx = 540, cy = 900;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#0a0524'], [.5, '#1c0b52'], [1, '#08031c']]); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(cx, cy); for (let i = 0; i < 20; i++) { ctx.rotate(TAU / 20); ctx.fillStyle = i % 2 ? 'rgba(255,63,164,.06)' : 'rgba(39,227,255,.05)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-80, -1500); ctx.lineTo(80, -1500); ctx.fill(); } ctx.restore();
    halo(ctx, 230, 760, 700, '#ff3fa4', .4); halo(ctx, 850, 1040, 720, '#27e3ff', .38); halo(ctx, cx, cy, 600, '#8a5bff', .35);
    // anillos concéntricos
    ctx.strokeStyle = 'rgba(200,170,255,.3)'; ctx.lineWidth = 3; circle(ctx, cx, cy, 500); ctx.stroke(); circle(ctx, cx, cy, 560); ctx.stroke();
    ctx.lineWidth = 10; ctx.lineCap = 'round'; for (let i = 0; i < 12; i++) { const a0 = i * TAU / 12 + t * TAU * .0, a1 = a0 + .32; ctx.strokeStyle = hsl(300 - i * 20, 100, 65, .85); ctx.beginPath(); ctx.arc(cx, cy, 530, a0, a1); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { const p = (t * 1 + i / 4) % 1; ctx.strokeStyle = `rgba(255,255,255,${.25 * (1 - p)})`; ctx.lineWidth = 3; circle(ctx, cx, cy, 440 + p * 330); ctx.stroke(); }
    // mando
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.1 + .015 * wave(t, 1)); ctx.scale(1.22, 1.22);
    L.shadowEllipse(ctx, 0, 330, 420, 56, .5);
    // gatillos
    [[-1, '#ff3fa4'], [1, '#27e3ff']].forEach(([s, c]) => { ctx.save(); ctx.translate(s * 250, -185); ctx.rotate(s * .12); ctx.fillStyle = '#120a34'; rr(ctx, -110, -26, 220, 52, 26); ctx.fill(); neonStroke(ctx, () => { rr(ctx, -110, -26, 220, 52, 26); }, c, 5, '#fff'); ctx.restore(); });
    const body = () => { ctx.beginPath(); ctx.moveTo(-250, -150); ctx.bezierCurveTo(-170, -190, 170, -190, 250, -150); ctx.bezierCurveTo(330, -130, 370, -40, 390, 60); ctx.bezierCurveTo(410, 160, 380, 230, 320, 240); ctx.bezierCurveTo(260, 250, 220, 190, 170, 120); ctx.bezierCurveTo(120, 70, -120, 70, -170, 120); ctx.bezierCurveTo(-220, 190, -260, 250, -320, 240); ctx.bezierCurveTo(-380, 230, -410, 160, -390, 60); ctx.bezierCurveTo(-370, -40, -330, -130, -250, -150); ctx.closePath(); };
    body(); ctx.fillStyle = lin(ctx, -400, -190, 400, 250, [[0, '#2c1a6a'], [.5, '#170d44'], [1, '#0d0630']]); ctx.fill();
    ctx.save(); body(); ctx.clip(); ctx.fillStyle = rad(ctx, -120, -120, 0, 400, [[0, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(-420, -200, 840, 460);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 260, 520, 120, 0, 0, TAU); ctx.fill(); ctx.restore();
    const g = lin(ctx, -400, 0, 400, 0, [[0, '#ff3fa4'], [.5, '#a06bff'], [1, '#27e3ff']]);
    ctx.save(); body(); ctx.lineWidth = 8; ctx.strokeStyle = g; ctx.globalAlpha = .25; ctx.lineWidth = 24; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    // barra RGB superior
    for (let i = 0; i < 24; i++) { const x = -190 + i * 16; ctx.fillStyle = hsl(320 - i * 10 + t * 360, 100, 62); rr(ctx, x, -150, 11, 26, 5); ctx.fill(); }
    halo(ctx, 0, -138, 330, '#c06bff', .35);
    // d-pad
    ctx.fillStyle = '#0a0526'; circle(ctx, -230, -20, 86); ctx.fill(); neonStroke(ctx, () => { circle(ctx, -230, -20, 86); }, '#27e3ff', 4, '#e8ffff');
    ctx.fillStyle = lin(ctx, 0, -80, 0, 40, [[0, '#4a3a9a'], [1, '#241a60']]); rr(ctx, -252, -78, 44, 116, 12); ctx.fill(); rr(ctx, -288, -42, 116, 44, 12); ctx.fill();
    ctx.fillStyle = '#27e3ff'; [[-230, -62, 0], [-230, 22, 0], [-272, -20, 1], [-188, -20, 1]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 9, y + 7); ctx.lineTo(x - 9, y + 7); ctx.fill(); });
    // botones
    [[0, -62, '#ffd23f'], [62, 0, '#ff3f8a'], [0, 62, '#6dff9a'], [-62, 0, '#27e3ff']].forEach(([dx, dy, c], i) => {
      const x = 230 + dx, y = -20 + dy, pr = .75 + .25 * wave01(t, 2, i * .25);
      halo(ctx, x, y, 80, c, .55 * pr); ctx.fillStyle = '#0a0526'; circle(ctx, x, y, 38); ctx.fill(); ctx.fillStyle = lin(ctx, x, y - 30, x, y + 30, [[0, mix(c, '#ffffff', .5)], [1, c]]); circle(ctx, x, y, 31); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 20, 3.6, 5.0); ctx.stroke();
    });
    // sticks
    [[-118, 78], [118, 78]].forEach(([x, y], i) => {
      ctx.fillStyle = '#0a0526'; circle(ctx, x, y, 72); ctx.fill(); neonStroke(ctx, () => { circle(ctx, x, y, 72); }, i ? '#ff3fa4' : '#27e3ff', 4, '#fff');
      ctx.fillStyle = lin(ctx, x - 40, y - 40, x + 40, y + 40, [[0, '#6a5ac8'], [1, '#2a1c70']]); circle(ctx, x, y - 6, 48); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; for (let r = 14; r <= 38; r += 12) { circle(ctx, x, y - 6, r); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.45)'; circle(ctx, x - 14, y - 22, 8); ctx.fill();
    });
    // botones centrales y orbe
    [[-70, -60], [70, -60]].forEach(([x, y]) => { ctx.fillStyle = '#4a3a9a'; rr(ctx, x - 26, y - 11, 52, 22, 11); ctx.fill(); });
    halo(ctx, 0, -20, 90, '#ffffff', .5 + .3 * wave01(t, 3)); ctx.fillStyle = '#fff'; circle(ctx, 0, -20, 14); ctx.fill(); ctx.strokeStyle = '#a06bff'; ctx.lineWidth = 4; circle(ctx, 0, -20, 24); ctx.stroke();
    // tiras RGB bajo las empuñaduras
    [[-1], [1]].forEach(([s]) => { for (let i = 0; i < 9; i++) { ctx.fillStyle = hsl(300 + s * i * 14 + t * 360, 100, 62); circle(ctx, s * (330 + i * 9), 100 + i * 15, 7); ctx.fill(); } });
    ctx.restore();
    // elementos flotantes pixel
    const heart = ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], coin = ['.YYY.', 'YOOOY', 'YOYOY', 'YOOOY', '.YYY.'], star = ['..Y..', '..Y..', 'YYYYY', '.YYY.', '.Y.Y.'];
    [[150, 440, heart, { R: '#ff3f8a' }, 10, .6], [900, 520, coin, { Y: '#ffd23f', O: '#ff9a3d' }, 14, -.3], [110, 1380, star, { Y: '#ffe566' }, 12, .2], [930, 1360, heart, { R: '#27e3ff' }, 9, -.4], [520, 340, coin, { Y: '#ffd23f', O: '#ff9a3d' }, 11, .1], [540, 1440, star, { Y: '#8bffcf' }, 10, 0]].forEach(([x, y, rows, pal, s, rot], i) => {
      ctx.save(); ctx.translate(x, y + 16 * wave(t, 1, i * .17)); ctx.rotate(rot); pixelIcon(ctx, rows, pal, -rows[0].length * s / 2, -rows.length * s / 2, s); ctx.restore(); });
    L.loopParticles(40, 19, t, (i, p, r) => { const x = r() * W, y = 1500 - p * 1250, a = Math.sin(Math.PI * p), s = 6 + r() * 12; ctx.save(); ctx.translate(x + 30 * Math.sin(p * 6 + i), y); ctx.rotate(p * 4 + i); ctx.fillStyle = [`rgba(255,63,164,${.8 * a})`, `rgba(39,227,255,${.8 * a})`, `rgba(255,226,102,${.8 * a})`][i % 3]; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore(); });
    for (let i = 0; i < 6; i++) sparkleShape(ctx, [190, 880, 960, 300, 760, 120][i], [700, 640, 1180, 1250, 380, 1060][i], 10 + 14 * wave01(t, 2, i * .2), 'rgba(255,255,255,.9)');
    L.stars(ctx, 50, 23, t, { y1: 500, alpha: .6 });
    L.vignette(ctx, W, H, .5);
  }

  function setupPoster(ctx, t) {
    const W = 1080, H = 1920, mx0 = 130, mx1 = 950, my0 = 540, my1 = 1010, deskY = 1130;
    ctx.fillStyle = lin(ctx, 0, 0, 0, deskY, [[0, '#0a0620'], [.6, '#1a0f4a'], [1, '#2a1368']]); ctx.fillRect(0, 0, W, H);
    // hexágonos LED en la pared
    const hr = 64;
    for (let row = -1; row < 9; row++) for (let col = -1; col < 8; col++) {
      const x = col * hr * 1.74 + (row % 2 ? hr * .87 : 0), y = 250 + row * hr * 1.5, k = wave01(t, 1, (col * 3 + row * 5) / 24), hue = 180 + (col * 22 + row * 14) % 160;
      hexPath(ctx, x, y, hr - 6); ctx.fillStyle = `rgba(8,4,30,.8)`; ctx.fill();
      if ((col + row * 2) % 3 !== 0) { ctx.strokeStyle = hsl(hue, 100, 62, .35 + .55 * k); ctx.lineWidth = 6; hexPath(ctx, x, y, hr - 10); ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${.25 * k})`; ctx.lineWidth = 2; hexPath(ctx, x, y, hr - 10); ctx.stroke(); }
    }
    halo(ctx, 540, 780, 900, '#6a3bff', .4); halo(ctx, 150, 500, 500, '#ff3fa4', .3); halo(ctx, 940, 560, 500, '#27e3ff', .3);
    // monitor curvo
    const scr = () => { ctx.beginPath(); ctx.moveTo(mx0, my0); ctx.quadraticCurveTo(540, my0 + 34, mx1, my0); ctx.lineTo(mx1, my1); ctx.quadraticCurveTo(540, my1 - 34, mx0, my1); ctx.closePath(); };
    halo(ctx, 540, 780, 760, '#7a6bff', .45);
    ctx.save(); ctx.translate(0, 0); ctx.fillStyle = '#05030f'; ctx.beginPath(); ctx.moveTo(mx0 - 22, my0 - 20); ctx.quadraticCurveTo(540, my0 + 22, mx1 + 22, my0 - 20); ctx.lineTo(mx1 + 22, my1 + 20); ctx.quadraticCurveTo(540, my1 - 22, mx0 - 22, my1 + 20); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.save(); scr(); ctx.clip();
    // contenido: sol sintético, montañas y rejilla
    ctx.fillStyle = lin(ctx, 0, my0, 0, my1, [[0, '#14073d'], [.45, '#6a1b9a'], [.75, '#ff4f8b'], [1, '#ffa05c']]); ctx.fillRect(mx0, my0, mx1 - mx0, my1 - my0);
    const sy = 800; halo(ctx, 540, sy, 380, '#ff7ac6', .6);
    ctx.fillStyle = lin(ctx, 0, sy - 140, 0, sy + 140, [[0, '#fff27a'], [.5, '#ff8f4a'], [1, '#ff3f8a']]);
    { let cur = sy - 140; const cuts = []; for (let j = -2; j < 8; j++) { const yy = sy - 10 + (j + t) * 28, th = clamp((yy - sy + 10) / 150, 0, 1) * 18; if (th > 1) cuts.push([yy, yy + th]); } const seg = (a, b) => { if (b <= a) return; ctx.save(); ctx.beginPath(); ctx.rect(0, a, W, b - a); ctx.clip(); circle(ctx, 540, sy, 140); ctx.fill(); ctx.restore(); }; cuts.forEach(([a, b]) => { seg(cur, a); cur = Math.max(cur, b); }); seg(cur, sy + 140); }
    ctx.fillStyle = '#240a52'; ctx.beginPath(); ctx.moveTo(mx0, 880); for (let x = mx0; x <= mx1; x += 20) ctx.lineTo(x, 880 - 70 * (.5 + .5 * L.ridge(x, 9, 820, 3))); ctx.lineTo(mx1, 900); ctx.lineTo(mx0, 900); ctx.fill();
    ctx.fillStyle = '#12052e'; ctx.fillRect(mx0, 880, mx1 - mx0, my1 - 880);
    for (let j = 0; j < 9; j++) { const u = (j + t * 2) / 9, y = 880 + u * u * (my1 - 880); ctx.fillStyle = `rgba(255,90,200,${.25 + .5 * u})`; ctx.fillRect(mx0, y, mx1 - mx0, 2 + 2 * u); }
    for (let k = -8; k <= 8; k++) { ctx.strokeStyle = 'rgba(255,90,200,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(540 + k * 14, 880); ctx.lineTo(540 + k * 120, my1); ctx.stroke(); }
    // nave pixel y HUD
    const ship = ['....C....', '...CCC...', '..CWCWC..', '.CCCCCCC.', 'CC.CCC.CC', 'C...C...C'];
    ctx.save(); ctx.translate(540 + 120 * wave(t, 1), 780 + 20 * wave(t, 2)); pixelIcon(ctx, ship, { C: '#27e3ff', W: '#ffffff' }, -27, -18, 6); ctx.restore();
    for (let i = 0; i < 4; i++) { const p = (t * 2 + i / 4) % 1; ctx.fillStyle = '#ffe566'; ctx.fillRect(540 + 120 * wave(t - p * .1, 1) - 3, 760 - p * 220, 6, 22); }
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, mx0 + 40, my0 + 60, 260, 22, 11); ctx.fill(); ctx.fillStyle = '#6dff9a'; rr(ctx, mx0 + 44, my0 + 64, 180 + 20 * wave(t, 2), 14, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, mx1 - 300, my0 + 60, 260, 22, 11); ctx.fill(); ctx.fillStyle = '#ffd23f'; rr(ctx, mx1 - 296, my0 + 64, 120, 14, 7); ctx.fill();
    // reflejo
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.moveTo(mx0 + 120, my0); ctx.lineTo(mx0 + 300, my0); ctx.lineTo(mx0 + 80, my1); ctx.lineTo(mx0 - 100, my1); ctx.fill();
    ctx.restore();
    neonStroke(ctx, () => { scr(); }, '#8a6bff', 5, '#ffffff');
    // soporte
    ctx.fillStyle = lin(ctx, 0, my1, 0, deskY, [[0, '#2b2250'], [1, '#14102c']]); ctx.beginPath(); ctx.moveTo(500, my1 - 10); ctx.lineTo(580, my1 - 10); ctx.lineTo(600, deskY - 10); ctx.lineTo(480, deskY - 10); ctx.fill();
    ctx.fillStyle = '#1c1540'; ctx.beginPath(); ctx.ellipse(540, deskY - 6, 190, 22, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(138,107,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(540, deskY - 6, 190, 22, 0, 0, Math.PI); ctx.stroke();
    // escritorio y alfombrilla
    ctx.fillStyle = lin(ctx, 0, deskY, 0, H, [[0, '#2a1d5e'], [.15, '#150d36'], [1, '#08041a']]); ctx.fillRect(0, deskY, W, H - deskY);
    neonStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(0, deskY + 2); ctx.lineTo(W, deskY + 2); }, '#27e3ff', 3, '#e8ffff');
    halo(ctx, 540, deskY + 150, 700, '#6a3bff', .35);
    ctx.fillStyle = '#0d0828'; ctx.beginPath(); ctx.moveTo(110, 1170); ctx.lineTo(970, 1170); ctx.lineTo(1040, 1440); ctx.lineTo(40, 1440); ctx.closePath(); ctx.fill();
    neonStroke(ctx, () => { ctx.beginPath(); ctx.moveTo(110, 1170); ctx.lineTo(970, 1170); ctx.lineTo(1040, 1440); ctx.lineTo(40, 1440); ctx.closePath(); }, '#ff3fa4', 4, '#ffd0ec');
    // teclado RGB
    const kt = 1210, kb = 1400, tl = 170, tr = 910, bl = 120, br = 960, rows = 5, kc = 14;
    const kx = (u, v) => lerp(lerp(tl, bl, v), lerp(tr, br, v), u), ky = (v) => lerp(kt, kb, v);
    halo(ctx, 540, 1330, 560, '#c06bff', .4);
    ctx.fillStyle = '#080420'; ctx.beginPath(); ctx.moveTo(tl - 16, kt - 14); ctx.lineTo(tr + 16, kt - 14); ctx.lineTo(br + 24, kb + 14); ctx.lineTo(bl - 24, kb + 14); ctx.closePath(); ctx.fill();
    for (let r = 0; r < rows; r++) for (let c = 0; c < kc; c++) {
      const v0 = (r + .08) / rows, v1 = (r + .92) / rows, u0 = (c + .08) / kc, u1 = (c + .92) / kc, hue = (c * 14 + r * 22 + t * 360 * 1) % 360, a = .55 + .45 * wave01(t, 2, (c + r) / 14);
      ctx.fillStyle = hsl(hue, 100, 56, 1); ctx.beginPath(); ctx.moveTo(kx(u0, v0), ky(v0)); ctx.lineTo(kx(u1, v0), ky(v0)); ctx.lineTo(kx(u1, v1), ky(v1)); ctx.lineTo(kx(u0, v1), ky(v1)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(10,5,40,${.55 - .4 * a * .5})`; ctx.beginPath(); const m = .18; ctx.moveTo(kx(lerp(u0, u1, m), lerp(v0, v1, m)), ky(lerp(v0, v1, m))); ctx.lineTo(kx(lerp(u1, u0, m), lerp(v0, v1, m)), ky(lerp(v0, v1, m))); ctx.lineTo(kx(lerp(u1, u0, m), lerp(v1, v0, m * .6)), ky(lerp(v1, v0, m * .6))); ctx.lineTo(kx(lerp(u0, u1, m), lerp(v1, v0, m * .6)), ky(lerp(v1, v0, m * .6))); ctx.closePath(); ctx.fill();
    }
    // ratón
    const mxp = 930, myp = 1300;
    halo(ctx, mxp, myp + 30, 160, hsl(t * 360, 100, 60), .6);
    ctx.fillStyle = lin(ctx, mxp - 36, 0, mxp + 36, 0, [[0, '#2a2060'], [1, '#161038']]); rr(ctx, mxp - 38, myp - 62, 76, 124, 34); ctx.fill(); ctx.strokeStyle = hsl(t * 360 + 60, 100, 65); ctx.lineWidth = 4; rr(ctx, mxp - 38, myp - 62, 76, 124, 34); ctx.stroke();
    ctx.fillStyle = '#080420'; ctx.fillRect(mxp - 2, myp - 60, 4, 50); ctx.fillStyle = hsl(t * 360 + 200, 100, 65); rr(ctx, mxp - 6, myp - 50, 12, 26, 6); ctx.fill();
    // auriculares sobre soporte
    const hx = 120, hy = 1090;
    ctx.fillStyle = '#1c1540'; ctx.fillRect(hx - 6, hy - 30, 12, 130); ctx.beginPath(); ctx.ellipse(hx, hy + 104, 60, 14, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2b2160'; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(hx, hy - 40, 90, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.strokeStyle = hsl(t * 360 + 120, 100, 62); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(hx, hy - 40, 90, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    [-1, 1].forEach(s => { ctx.fillStyle = '#1c1540'; rr(ctx, hx + s * 92 - 24, hy - 50, 48, 96, 20); ctx.fill(); ctx.strokeStyle = hsl(t * 360 + (s > 0 ? 40 : 200), 100, 62); ctx.lineWidth = 5; rr(ctx, hx + s * 92 - 24, hy - 50, 48, 96, 20); ctx.stroke(); halo(ctx, hx + s * 92, hy - 2, 90, hsl(t * 360 + (s > 0 ? 40 : 200), 100, 60), .45); });
    // luz ambiental / partículas
    L.loopParticles(26, 5, t, (i, p, r) => { const x = r() * W, y = 1500 - p * 1250, a = Math.sin(Math.PI * p); ctx.fillStyle = `rgba(190,170,255,${.6 * a})`; circle(ctx, x + 30 * Math.sin(p * 6 + i), y, 2 + r() * 3); ctx.fill(); });
    L.vignette(ctx, W, H, .5);
  }

  SCENES['gaming-c'] = {
    topic: 'gaming', stillT: [.2, .55],
    cap: [
      { ca: 'El comandament que ho dona tot a cada partida 🎮 #gaming #setup', es: 'El mando que lo da todo en cada partida 🎮 #gaming #setup', en: 'The controller that gives it all every match 🎮 #gaming #setup' },
      { ca: 'Setup nou: monitor corbat i teclat RGB 🖥️ #gamer', es: 'Setup nuevo: monitor curvo y teclado RGB 🖥️ #gamer', en: 'New setup: curved monitor and RGB keyboard 🖥️ #gamer' }],
    draw(ctx, t, v) { (v % 2 === 0 ? gamepadPoster : setupPoster)(ctx, t); }
  };
})();
