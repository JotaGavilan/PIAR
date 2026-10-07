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


  // ── Pistes del model avançat (la descripció està en anglés: es busquen paraules clau) ──
  const CAP_PLACES = [
    ['beach', /\b(beach|beaches|seashore|shore|ocean|sea|coast|sand)\b/], ['pool', /\b(swimming pool|pool)\b/],
    ['nature', /\b(mountain|mountains|hill|hills|forest|woods|trail|lake|river|waterfall|meadow|countryside|valley|cliff)\b/],
    ['park', /\b(park|playground|garden|backyard|lawn|yard)\b/], ['school', /\b(classroom|blackboard|whiteboard|teacher|campus|lecture hall)\b/],
    ['kitchen', /\b(kitchen|stove|countertop)\b/], ['bedroom', /\b(bedroom|bed|pillow)\b/], ['bathroom', /\b(bathroom|toilet|bathtub|shower)\b/],
    ['livingroom', /\b(living room|couch|sofa|fireplace)\b/], ['gym', /\b(gym|treadmill|weights|fitness)\b/],
    ['stadium', /\b(stadium|court|pitch|arena|football field|soccer field)\b/], ['car', /\b(inside a car|car interior|steering wheel|dashboard|passenger seat)\b/],
    ['station', /\b(airport|train station|platform|railway|bus stop|terminal)\b/], ['landmark', /\b(church|cathedral|temple|castle|monument|statue|tower|museum|palace|bridge)\b/],
    ['restaurant', /\b(restaurant|cafe|coffee shop|bar|dining|menu|pub)\b/], ['shop', /\b(store|shop|supermarket|market|shelves|mall|aisle)\b/],
    ['office', /\b(office|desk|computer|laptop|monitor|keyboard)\b/], ['street', /\b(street|road|sidewalk|crosswalk|city|town|urban|traffic|alley|square|plaza)\b/],
    ['home', /\b(room|apartment|house|home|curtains)\b/]
  ];
  const CAP_ACTS = [
    ['selfie', /\b(selfie|taking a picture|holding a (cell )?phone|looking at (his|her|their) phone)\b/], ['smile', /\b(smil\w*|pos\w+|laugh\w*)\b/],
    ['eat', /\b(eat\w*|drink\w*|food|meal|holding a (cup|glass|bottle))\b/], ['cook', /\bcook\w*\b/], ['swim', /\b(swim\w*|in the water)\b/],
    ['dance', /\b(danc\w*|playing (a |the )?(guitar|piano|violin|drums)|singing)\b/], ['read', /\b(read\w*|writ\w*|book|notebook)\b/],
    ['work', /\b(typing|working on|using a (laptop|computer))\b/], ['play', /\b(play\w*|sport|ball|running|jumping)\b/],
    ['walk', /\b(walk\w*|run\w*|riding|cycling|biking)\b/], ['sit', /\b(sitting|seated)\b/]
  ];
  function parseCaption(text) {
    const t = ' ' + String(text || '').toLowerCase() + ' ';
    const place = CAP_PLACES.filter(([, re]) => re.test(t)).map(([id]) => id);
    // «home» és massa genèric: només si no n'hi ha cap altre
    const places = (place.length > 1 ? place.filter(x => x !== 'home') : place).slice(0, 2);
    const acts = CAP_ACTS.filter(([, re]) => re.test(t)).map(([id]) => id).slice(0, 2);
    return {
      places, acts,
      child: /\b(child|children|kid|kids|boy|girl|baby|toddler)\b/.test(t),
      group: /\b(group|crowd|team|family|couple|friends|people|men|women)\b/.test(t),
      uniform: /\b(uniform|jersey|logo|badge|name tag)\b/.test(t)
    };
  }

  // Zona del món (només per a zones clares; si no, no s'afirma res)
  const BOXES = [
    ['valencia', 37.84, 40.79, -1.55, 0.55], ['balearic', 38.6, 40.1, 1.1, 4.4], ['canarias', 27.5, 29.5, -18.3, -13.3],
    ['spain', 36.0, 43.8, -9.4, 3.35], ['europe', 37.5, 71, -10, 40]
  ];
  function regionOf(lat, lon) {
    for (const [id, a, b, c, d] of BOXES) if (lat >= a && lat <= b && lon >= c && lon <= d) return id;
    return null;
  }

  // a: { meta, colors, faces, objects, text, caption, w, h, origW, origH }   (qualsevol part pot faltar: null)
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

    // ── Descripció del model avançat (si s'ha generat) ──
    const cap = a.caption ? parseCaption(a.caption) : null;
    if (a.caption) {
      const PC = [['qv.s.cap', { caption: a.caption }]];
      if (cap.places.length) PC.push(['qv.s.cap_place', { place: cap.places[0] }]);
      if (cap.acts.length) PC.push(['qv.s.cap_act', { act: cap.acts.slice(0, 2) }]);
      if (cap.child) { PC.push(['qv.s.cap_who_child', {}]); score += 1; }
      else if (cap.group) PC.push(['qv.s.cap_who_group', {}]);
      if (cap.uniform) { PC.push(['qv.s.cap_uniform', {}]); score += 1; }
      P.unshift(PC);
      if (cap.places.length) add('info', '🧠', 'qv.f.cap_place', { place: cap.places[0] });
    }

    // ── Deduccions: el que s'esbrina creuant unes dades amb unes altres ──
    const INF = [];
    const m2 = a.meta || {};
    const txt = a.text && a.text.text ? findPII(a.text.text) : [];
    const hasStreet = txt.some(x => x.id === 'street'), hasPlate = txt.some(x => x.id === 'plate');
    const hasGps = !!m2.gps, d = m2.date instanceof Date ? m2.date : null;
    const faces2 = a.faces || [], minors2 = faces2.filter(f => f.age < 16).length;
    const hour = d ? d.getHours() : null, dow = d ? d.getDay() : null;
    const workTime = d && dow >= 1 && dow <= 5 && hour >= 8 && hour < 15;
    const indoor = a.objects && a.objects.some(o => has(INDOOR, o.cls)) && !a.objects.some(o => has(OUTDOOR, o.cls));
    if (hasGps) { const r = regionOf(m2.gps.lat, m2.gps.lon); if (r) INF.push(['qv.s.inf_region', { region: r }]); }
    if (workTime) INF.push([hasGps ? 'qv.s.inf_work_gps' : 'qv.s.inf_work', {}]);
    else if (d && (dow === 0 || dow === 6)) INF.push(['qv.s.inf_weekend', {}]);
    if (d && hasGps && (hour < 6 || hour >= 22)) INF.push(['qv.s.inf_night_gps', {}]);
    if (hasGps && m2.gps.dir !== null && m2.gps.dir !== undefined) INF.push(['qv.s.inf_dir', { card: cardinal(m2.gps.dir) }]);
    if (hasGps && hasStreet) INF.push(['qv.s.inf_gps_text', {}]);
    else if (!hasGps && hasStreet) INF.push(['qv.s.inf_text_place', {}]);
    if (hasPlate && (hasGps || d)) INF.push(['qv.s.inf_plate', {}]);
    if (m2.serial) INF.push(['qv.s.inf_serial', {}]);
    if (minors2 && workTime) INF.push(['qv.s.inf_minor_school', {}]);
    if (faces2.length >= 2) INF.push(['qv.s.inf_people', {}]);
    if (hasGps && indoor) INF.push(['qv.s.inf_indoor_gps', {}]);
    if (hasGps && d && (faces2.length || m2.owner)) INF.push(['qv.s.inf_combo', {}]);
    // Dos paràgrafs: «on i quan» i «qui i què es pot lligar»
    const WHEN = /^qv\.s\.inf_(region|work_gps|work|weekend|night_gps|dir|gps_text|text_place|indoor_gps)$/;
    const g1 = INF.filter(x => WHEN.test(x[0])), g2 = INF.filter(x => !WHEN.test(x[0]));
    if (g1.length) P.push(g1);
    if (g2.length) P.push(g2);

    const level = score >= 7 ? 'high' : score >= 3 ? 'mid' : 'low';
    P[P.length - 1].push(['qv.s.close_' + level, {}]);
    const order = { high: 0, warn: 1, info: 2, ok: 3 };
    F.sort((x, y) => order[x.sev] - order[y.sev]);
    return { level, score, findings: F, summary: P.filter(p => p.length) };
  }

  window.QVI = { analyze, findPII, cardinal, GROUPS, parseCaption, regionOf };
})();
