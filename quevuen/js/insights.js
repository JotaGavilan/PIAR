// ============================================================
//  insights.js – De les dades detectades a «què pot deduir algú que reba la foto»
//  Torna claus de text + variables (no text ja traduït), de manera que es puga tornar a pintar
//  en canviar d'idioma sense tornar a analitzar la foto.
//  Només es diu allò que realment s'ha detectat; el que és una estimació s'escriu com a estimació.
// ============================================================
(function () {
  'use strict';

  // Grups d'objectes (classes de COCO-SSD)
  const GROUPS = {
    vehicle: ['bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat'],
    street: ['traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench'],
    animal: ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'],
    pet: ['cat', 'dog'],
    bag: ['backpack', 'umbrella', 'handbag', 'tie', 'suitcase'],
    sport: ['frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket'],
    food: ['bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake'],
    home: ['chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'vase', 'clock', 'teddy bear', 'hair drier', 'toothbrush', 'book', 'scissors'],
    tech: ['tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone']
  };
  const INDOOR = ['chair', 'couch', 'bed', 'dining table', 'toilet', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'tv', 'laptop', 'keyboard', 'mouse', 'remote', 'book', 'vase', 'clock', 'teddy bear'];
  const OUTDOOR = GROUPS.vehicle.concat(GROUPS.street, ['horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'kite', 'skis', 'snowboard', 'surfboard', 'skateboard', 'frisbee', 'sports ball']);
  const has = (list, cls) => list.indexOf(cls) >= 0;

  // Patrons de dades personals en el text llegit
  const PII = [
    { id: 'email', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, sev: 'high', w: 3 },
    { id: 'phone', re: /(?:\+\s?34[\s.-]?)?\b[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g, sev: 'high', w: 3 },
    { id: 'plate', re: /\b\d{4}\s?-?\s?[BCDFGHJKLMNPRSTVWXYZ]{3}\b/g, sev: 'high', w: 3 },
    { id: 'dni', re: /\b(?:\d{8}|[XYZ]\d{7})\s?-?\s?[A-Z]\b/g, sev: 'high', w: 3 },
    { id: 'iban', re: /\b[A-Z]{2}\d{2}(?:\s?\d{4}){4,6}\b/g, sev: 'high', w: 3 },
    { id: 'street', re: /\b(?:c\/|calle|carrer|cl\.|avda\.?|avenida|avinguda|plaza|plaça|pl\.|camino|cam[ií]|paseo|passeig|street|st\.|road|avenue)\s+[^\n]{2,40}/gi, sev: 'warn', w: 2 },
    { id: 'url', re: /\b(?:https?:\/\/|www\.)\S+/gi, sev: 'info', w: 0 }
  ];
  function findPII(text) {
    const out = [];
    PII.forEach(p => {
      const m = (text.match(p.re) || []).map(s => s.trim().replace(/[.,;:]+$/, '')).filter(Boolean);
      const uniq = Array.from(new Set(m)).slice(0, 3);
      if (uniq.length) out.push({ id: p.id, sev: p.sev, w: p.w, items: uniq });
    });
    return out;
  }

  const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const cardinal = (deg) => CARD[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  const fix = (v, d) => v.toFixed(d);
  function snip(t, n) { t = t.replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; const c = t.slice(0, n), i = c.lastIndexOf(' '); return (i > n * 0.5 ? c.slice(0, i) : c) + '…'; }

  function deviceName(m) {
    const mk = (m.make || '').trim(), md = (m.model || '').trim();
    if (!mk && !md) return null;
    if (md && mk && md.toLowerCase().indexOf(mk.toLowerCase().split(' ')[0]) === 0) return md;
    return (mk + ' ' + md).trim();
  }
  function partOfDay(h) { return h < 6 ? 'night' : h < 12 ? 'morning' : h < 15 ? 'noon' : h < 21 ? 'afternoon' : 'night'; }

  // a: { meta, colors, faces, objects, text, w, h, origW, origH }   (qualsevol part pot faltar: null)
  function analyze(a) {
    const F = [];    // troballes
    const P = [[], [], []];   // 3 paràgrafs del resum: qui/quan · on · persones i text
    let score = 0;
    const add = (sev, icon, key, vars) => F.push({ sev, icon, key, vars: vars || {} });

    // ── Metadades ──
    const m = a.meta;
    if (m) {
      if (!m.has) add('ok', '✅', 'qv.f.nometa');
      const dev = deviceName(m);
      if (dev) { add('info', '📱', 'qv.f.device', { device: dev }); P[0].push(['qv.s.device', { device: dev }]); score += 1; }
      if (m.software) add('info', '⚙️', 'qv.f.software', { sw: m.software });
      if (m.lens) add('info', '🔭', 'qv.f.lens', { lens: m.lens });
      if (m.owner) { add('high', '🪪', 'qv.f.owner', { owner: m.owner }); P[0].push(['qv.s.owner', { owner: m.owner }]); score += 3; }
      if (m.copyright && m.copyright !== m.owner) add('warn', '©️', 'qv.f.copyright', { text: m.copyright });
      if (m.serial) { add('warn', '🔢', 'qv.f.serial', { serial: m.serial }); score += 2; }
      if (m.description) { add('warn', '💬', 'qv.f.desc', { text: m.description }); score += 1; }
      if (m.date) {
        const h = m.date.getHours();
        const vars = { date: m.date, part: partOfDay(h) };
        add('info', '🕒', 'qv.f.date', vars);
        P[0].push(['qv.s.when', vars]); score += 1;
      }
      if (m.gps) {
        const g = m.gps, vars = { lat: fix(g.lat, 5), lon: fix(g.lon, 5), latN: g.lat, lonN: g.lon };
        add('high', '📍', 'qv.f.gps', vars); score += 4;
        P[1].push(['qv.s.where_gps', vars]);
        if (g.alt !== null) add('info', '⛰️', 'qv.f.alt', { alt: Math.round(g.alt) });
        if (g.dir !== null) add('info', '🧭', 'qv.f.dir', { dir: Math.round(g.dir), card: cardinal(g.dir) });
        if (g.speed !== null && g.speed > 3) add('info', '🚗', 'qv.f.speed', { speed: Math.round(g.speed) });
      } else {
        if (m.has) add('ok', '✅', 'qv.f.nogps');
        P[1].push(['qv.s.where_none', {}]);
      }
    }
    const mp = a.origW && a.origH ? (a.origW * a.origH) / 1e6 : null;
    if (mp && mp >= 8) add('info', '🔎', 'qv.f.res', { w: a.origW, h: a.origH, mp: fix(mp, 1) });

    // ── Cares ──
    const faces = a.faces;
    if (faces && faces.length) {
      const minors = faces.filter(f => f.age < 16).length;
      add('warn', '🧑', 'qv.f.faces', { n: faces.length, _pl: faces.length }); score += 2 + (faces.length >= 3 ? 1 : 0);
      const descr = faces.slice(0, 6).map(f => ({ gender: f.gender, age: Math.max(1, Math.round(f.age / 5) * 5), mood: f.expr }));
      P[2].push(['qv.s.people', { n: faces.length, _pl: faces.length, faces: descr }]);
      const moods = {}; faces.forEach(f => { moods[f.expr] = (moods[f.expr] || 0) + 1; });
      add('info', '🙂', 'qv.f.mood', { moods });
      if (minors) { add('high', '🧒', 'qv.f.minors', { n: minors, _pl: minors }); P[2].push(['qv.s.minors', { n: minors, _pl: minors }]); score += 3; }
    }

    // ── Objectes ──
    const objs = a.objects;
    if (objs && objs.length) {
      const counts = {}; objs.forEach(o => { counts[o.cls] = (counts[o.cls] || 0) + 1; });
      const classes = Object.keys(counts);
      add('info', '🔍', 'qv.f.objects', { counts });
      const inCount = classes.filter(c => has(INDOOR, c)).length, outCount = classes.filter(c => has(OUTDOOR, c)).length;
      if (inCount > outCount) { add('info', '🏠', 'qv.f.indoor', { list: classes.filter(c => has(INDOOR, c)) }); P[1].push(['qv.s.indoor', { list: classes.filter(c => has(INDOOR, c)).slice(0, 4) }]); }
      else if (outCount > inCount) { add('info', '🌳', 'qv.f.outdoor', { list: classes.filter(c => has(OUTDOOR, c)) }); P[1].push(['qv.s.outdoor', { list: classes.filter(c => has(OUTDOOR, c)).slice(0, 4) }]); }
      if (classes.some(c => has(GROUPS.pet, c))) add('info', '🐾', 'qv.f.pet');
      if (classes.some(c => has(GROUPS.tech, c))) { add('info', '💻', 'qv.f.tech', { list: classes.filter(c => has(GROUPS.tech, c)) }); }
      if (classes.some(c => has(GROUPS.vehicle, c))) add('info', '🚘', 'qv.f.vehicle', { list: classes.filter(c => has(GROUPS.vehicle, c)) });
      if (classes.some(c => c === 'suitcase' || c === 'backpack')) add('info', '🎒', 'qv.f.bag');
      if (classes.some(c => has(GROUPS.food, c))) add('info', '🍽️', 'qv.f.food');
    }

    // ── Text ──
    const t = a.text;
    if (t && t.text) {
      const words = t.text.split(/\s+/).filter(Boolean).length;
      add('info', '🔤', 'qv.f.text', { n: words, _pl: words, snippet: snip(t.text, 90) });
      P[2].push(['qv.s.text', { snippet: snip(t.text, 70) }]);
      let wsum = 0;
      findPII(t.text).forEach(p => { add(p.sev, '⚠️', 'qv.f.t_' + p.id, { items: p.items.join(' · ') }); wsum += p.w; });
      score += Math.min(wsum, 6);
    }

    // ── Llum ──
    const c = a.colors;
    if (c) {
      if (c.brightness < 55 || c.darkPct > 0.6) { add('info', '🌙', 'qv.f.dark'); P[1].push(['qv.s.dark', {}]); }
      else if (c.brightness > 200) { add('info', '☀️', 'qv.f.bright'); P[1].push(['qv.s.bright', {}]); }
    }

    const level = score >= 7 ? 'high' : score >= 3 ? 'mid' : 'low';
    P[2].push(['qv.s.close_' + level, {}]);
    const order = { high: 0, warn: 1, info: 2, ok: 3 };
    F.sort((x, y) => order[x.sev] - order[y.sev]);
    return { level, score, findings: F, summary: P.filter(p => p.length) };
  }

  window.QVI = { analyze, findPII, cardinal, GROUPS };
})();
