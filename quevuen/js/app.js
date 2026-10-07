// ============================================================
//  app.js – Interfície de «Què veuen de tu»
//  La foto només viu en memòria: no es guarda ni s'envia enlloc.
// ============================================================
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LOC = { ca: 'ca', es: 'es', en: 'en-GB' };
  const loc = () => LOC[PIAR_I18N.lang] || 'ca';

  // ── Configuració (es recorda en este dispositiu) ──
  const CFG_KEY = 'qv.cfg.v1';
  const cfg = { faces: true, objects: true, text: true, tech: false, ocr: { cat: true, spa: true, eng: true } };
  try { const s = JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); if (s) { Object.assign(cfg, s); cfg.ocr = Object.assign({ cat: true, spa: true, eng: true }, s.ocr || {}); } } catch (e) {}
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };

  // ── Estat ──
  const S = { run: 0, file: null, img: null, a: null, steps: {}, overlay: { faces: true, objects: true, text: true }, strip: null };
  const STEP_DEF = [['meta', '🧾'], ['colors', '🎨'], ['faces', '🧑'], ['objects', '🔍'], ['text', '🔤']];

  // ── Textos amb variables segures ──
  function fmtWhen(d) {
    try { return new Intl.DateTimeFormat(loc(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d); }
    catch (e) { return d.toLocaleString(); }
  }
  const clsName = (c) => _t('qv.c.' + String(c).replace(/ /g, '_'));
  function textOf(key, vars) {
    const v = {};
    Object.keys(vars || {}).forEach((k) => { v[k] = vars[k]; });
    let kk = key;
    if (v._pl !== undefined) kk += v._pl === 1 ? '.one' : '.other';
    if (v.date instanceof Date) v.when = fmtWhen(v.date);
    if (v.part && /^(night|morning|noon|afternoon)$/.test(v.part)) v.part = _t('qv.part.' + v.part);
    if (v.when === undefined && v.date === undefined) delete v.when;
    if (Array.isArray(v.list)) v.list = v.list.map(clsName).join(', ');
    if (v.counts) v.counts = Object.keys(v.counts).map((c) => _t('qv.obj.item', { name: clsName(c), n: v.counts[c] })).join(', ');
    if (v.moods) v.moods = Object.keys(v.moods).map((m) => _t('qv.mood.' + m) + (v.moods[m] > 1 ? ' (' + v.moods[m] + ')' : '')).join(', ');
    if (v.card) v.card = _t('qv.card.' + v.card);
    if (Array.isArray(v.faces)) v.faces = v.faces.map((f) => _t('qv.s.face', { gender: _t('qv.g.' + f.gender), age: f.age, mood: _t('qv.mood.' + f.mood) })).join('; ');
    // Tot el que ve de la foto s'escapa abans d'entrar en HTML
    Object.keys(v).forEach((k) => { if (typeof v[k] === 'string' && !['when'].includes(k)) v[k] = esc(v[k]); else if (k === 'when') v[k] = esc(v[k]); });
    delete v.date; if (v.when === undefined) delete v.when;
    return _t(kk, v);
  }

  // ── Passos ──
  function renderSteps() {
    $('steps').innerHTML = STEP_DEF.map(([id, ic]) => {
      const st = S.steps[id] || { state: 'wait' };
      const label = st.state === 'run' && st.pct != null ? _t('qv.st.run_pct', { p: st.pct }) : _t('qv.st.' + (st.state === 'load' ? 'load' : st.state));
      return `<li class="${st.state === 'load' ? 'run' : st.state}"><span class="ic">${st.state === 'done' ? '✅' : st.state === 'run' || st.state === 'load' ? '⏳' : st.state === 'err' || st.state === 'off' ? '⚠️' : st.state === 'skip' ? '⏭' : ic}</span><span class="nm">${esc(_t('qv.step.' + id))}</span><span class="st">${esc(label)}</span></li>`;
    }).join('');
    // Quan tot ha anat bé, la llista de passos ja no fa falta: es queda només si algun pas ha fallat o no està disponible
    const sts = STEP_DEF.map(([id]) => (S.steps[id] || { state: 'wait' }).state);
    $('stepsCard').hidden = sts.every(x => x === 'done' || x === 'skip');
  }
  function setStep(id, state, pct) { S.steps[id] = { state, pct }; renderSteps(); }

  // ── Dibuix de la foto amb les deteccions ──
  const BOX = { faces: '#a89cff', objects: '#4ade80', text: '#fbbf24' };
  function drawPhoto() {
    if (!S.img) return;
    const c = $('photo'), src = S.img.canvas;
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    const lw = Math.max(2, Math.round(src.width / 300)), fs = Math.max(12, Math.round(src.width / 55));
    g.lineWidth = lw; g.font = `600 ${fs}px Poppins, sans-serif`; g.textBaseline = 'top';
    const label = (txt, x, y, col) => { const w = g.measureText(txt).width + 8; g.fillStyle = col; g.fillRect(x, Math.max(0, y - fs - 6), w, fs + 6); g.fillStyle = '#111'; g.fillText(txt, x + 4, Math.max(0, y - fs - 6) + 3); };
    const a = S.a;
    if (a && S.overlay.objects && a.objects) a.objects.forEach((o) => { g.strokeStyle = BOX.objects; g.strokeRect(o.box.x, o.box.y, o.box.w, o.box.h); label(clsName(o.cls), o.box.x, o.box.y, BOX.objects); });
    if (a && S.overlay.faces && a.faces) a.faces.forEach((f) => { g.strokeStyle = BOX.faces; g.strokeRect(f.box.x, f.box.y, f.box.w, f.box.h); label('~' + Math.round(f.age), f.box.x, f.box.y, BOX.faces); });
    if (a && S.overlay.text && a.text && a.text.words) a.text.words.forEach((w) => { g.strokeStyle = BOX.text; g.strokeRect(w.box.x, w.box.y, w.box.w, w.box.h); });
  }
  function renderToggles() {
    const a = S.a || {};
    const defs = [['faces', a.faces && a.faces.length, 'qv.step.faces'], ['objects', a.objects && a.objects.length, 'qv.step.objects'], ['text', a.text && a.text.words && a.text.words.length, 'qv.step.text']];
    $('toggles').innerHTML = defs.filter((d) => d[1]).map(([id, n, k]) => `<button class="${S.overlay[id] ? 'on' : ''}" data-ov="${id}">${esc(_t(k))} (${n})</button>`).join('');
  }

  // ── Resultats ──
  function renderAll() {
    const a = S.a; if (!a) return;
    const ins = QVI.analyze(a);
    a._ins = ins;
    // Risc i resum
    $('summaryCard').hidden = false;
    $('risk').className = 'risk ' + ins.level;
    $('risk').innerHTML = `<span class="dot"></span>${esc(_t('qv.r.level'))}: ${esc(_t('qv.r.level.' + ins.level))}`;
    if (a.meta && !a.meta.gps && a.meta.has !== undefined && ins.summary[1] === undefined) { /* sense ubicació */ }
    const paras = ins.summary.map((p) => '<p>' + p.map((s) => textOf(s[0], s[1])).join(' ') + '</p>');
    $('summary').innerHTML = paras.join('');
    $('findingsCard').hidden = ins.findings.length === 0;
    $('findings').innerHTML = ins.findings.map((f) => `<li class="${f.sev}"><span class="fi">${f.icon}</span><span>${textOf(f.key, f.vars)}</span></li>`).join('');
    renderMeta(); renderFaces(); renderObjects(); renderText(); renderColors();
    $('protectCard').hidden = false;
    renderToggles(); drawPhoto();
  }

  function kv(rows) { return '<dl class="kv">' + rows.filter((r) => r[1] !== null && r[1] !== undefined && r[1] !== '').map(([k, v]) => `<dt>${esc(_t(k))}</dt><dd>${v}</dd>`).join('') + '</dl>'; }
  function renderMeta() {
    const m = S.a.meta, card = $('metaCard');
    if (!m) { card.hidden = true; return; }
    card.hidden = false;
    if (!m.has) { $('metaBody').innerHTML = `<p class="note">${esc(_t('qv.r.nometa'))}</p>`; return; }
    const dev = [m.make, m.model].filter(Boolean).join(' ');
    const g = m.gps;
    const exp = [m.fnumber ? 'f/' + m.fnumber : null, m.exposure ? (m.exposure < 1 ? '1/' + Math.round(1 / m.exposure) : m.exposure) + ' s' : null, m.iso ? 'ISO ' + m.iso : null, m.focal ? m.focal + ' mm' : null].filter(Boolean).join(' · ');
    let html = kv([
      ['qv.m.device', dev ? esc(dev) : null], ['qv.m.software', m.software ? esc(m.software) : null], ['qv.m.date', m.date ? esc(fmtWhen(m.date)) : null],
      ['qv.m.gps', g ? esc(g.lat.toFixed(5) + ', ' + g.lon.toFixed(5)) : null], ['qv.m.alt', g && g.alt !== null ? esc(Math.round(g.alt) + ' m') : null],
      ['qv.m.dir', g && g.dir !== null ? esc(Math.round(g.dir) + '° (' + _t('qv.card.' + QVI.cardinal(g.dir)) + ')') : null],
      ['qv.m.owner', m.owner ? esc(m.owner) : null], ['qv.m.serial', m.serial ? esc(m.serial) : null], ['qv.m.lens', m.lens ? esc(m.lens) : null],
      ['qv.m.exposure', exp ? esc(exp) : null], ['qv.m.size', S.a.origW ? esc(S.a.origW + '×' + S.a.origH) : null]
    ]);
    if (g) html += `<a class="btn btn-map" target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat=${g.lat.toFixed(5)}&mlon=${g.lon.toFixed(5)}#map=17/${g.lat.toFixed(5)}/${g.lon.toFixed(5)}">${esc(_t('qv.map.open'))}</a><p class="note">${esc(_t('qv.map.note'))}</p>`;
    if (cfg.tech) {
      const rows = Object.keys(m.raw).filter((k) => { const v = m.raw[k]; return v !== null && v !== undefined && (typeof v !== 'object' || v instanceof Date || Array.isArray(v) && v.length < 8); }).slice(0, 150)
        .map((k) => { let v = m.raw[k]; if (v instanceof Date) v = v.toISOString(); else if (Array.isArray(v)) v = v.join(', '); v = String(v); return `<dt>${esc(k)}</dt><dd>${esc(v.length > 120 ? v.slice(0, 120) + '…' : v)}</dd>`; });
      html += `<details class="raw"><summary>${esc(_t('qv.m.raw', { n: rows.length }))}</summary><dl class="kv">${rows.join('')}</dl></details>`;
    }
    $('metaBody').innerHTML = html;
  }
  function renderFaces() {
    const f = S.a.faces, card = $('facesCard');
    if (!f) { card.hidden = true; return; }
    card.hidden = false;
    if (!f.length) { $('facesBody').innerHTML = `<p class="note">${esc(_t('qv.r.nofaces'))}</p>`; return; }
    $('facesBody').innerHTML = '<ul class="faces-list">' + f.map((x, i) => `<li><canvas width="52" height="52" data-face="${i}"></canvas><span>${esc(_t(cfg.tech ? 'qv.faces.item_tech' : 'qv.faces.item', { gender: _t('qv.g.' + x.gender), age: Math.round(x.age), mood: _t('qv.mood.' + x.expr), p: Math.round(x.exprProb * 100) }))}</span></li>`).join('') + `</ul><p class="note">${esc(_t('qv.faces.note'))}</p>`;
    $('facesBody').querySelectorAll('canvas[data-face]').forEach((cv) => {
      const b = f[+cv.dataset.face].box, pad = Math.max(b.w, b.h) * 0.25, sz = Math.max(b.w, b.h) + pad * 2;
      cv.getContext('2d').drawImage(S.img.canvas, b.x + b.w / 2 - sz / 2, b.y + b.h / 2 - sz / 2, sz, sz, 0, 0, 52, 52);
    });
  }
  function renderObjects() {
    const o = S.a.objects, card = $('objectsCard');
    if (!o) { card.hidden = true; return; }
    card.hidden = false;
    if (!o.length) { $('objectsBody').innerHTML = `<p class="note">${esc(_t('qv.r.noobjs'))}</p>`; return; }
    const counts = {}; o.forEach((x) => { counts[x.cls] = (counts[x.cls] || { n: 0, best: 0 }); counts[x.cls].n++; counts[x.cls].best = Math.max(counts[x.cls].best, x.score); });
    $('objectsBody').innerHTML = '<div class="chips">' + Object.keys(counts).sort((a, b) => counts[b].n - counts[a].n).map((c) => `<span class="chip">${esc(_t('qv.obj.item', { name: clsName(c), n: counts[c].n }))}${cfg.tech ? ' · ' + Math.round(counts[c].best * 100) + ' %' : ''}</span>`).join('') + '</div>';
  }
  function renderText() {
    const t = S.a.text, card = $('textCard');
    if (!t) { card.hidden = true; return; }
    card.hidden = false;
    $('textBody').innerHTML = t.text ? `<pre class="textblock">${esc(t.text)}</pre>` : `<p class="note">${esc(_t('qv.r.notext'))}</p>`;
  }
  function renderColors() {
    const c = S.a.colors, card = $('colorsCard');
    if (!c) { card.hidden = true; return; }
    card.hidden = false;
    $('colorsBody').innerHTML = '<div class="palette">' + c.palette.map((p) => `<span style="flex:${p.pct.toFixed(3)};background:${p.hex}"></span>`).join('') + '</div>' +
      '<div class="chips pal-chips">' + c.palette.map((p) => `<span class="chip"><i style="background:${p.hex}"></i>${esc(p.hex)}${cfg.tech ? ' · ' + Math.round(p.pct * 100) + ' %' : ''}</span>`).join('') + '</div>' +
      `<div class="lightbar"><span style="width:${Math.round(c.brightness / 255 * 100)}%"></span></div><p class="note">${esc(_t('qv.colors.light', { p: Math.round(c.brightness / 255 * 100) }))}</p>`;
  }

  // ── Anàlisi ──
  const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
  async function analyze(file) {
    const run = ++S.run;
    S.file = file; S.a = null; S.steps = {}; S.strip = null;
    $('pickView').hidden = true; $('resultView').hidden = false; $('newBtn').hidden = false;
    ['summaryCard', 'findingsCard', 'metaCard', 'facesCard', 'objectsCard', 'textCard', 'colorsCard', 'protectCard'].forEach((id) => { $(id).hidden = true; });
    STEP_DEF.forEach(([id]) => { S.steps[id] = { state: 'wait' }; });
    setStatus('qv.status.running'); renderSteps();
    let img;
    try { img = await QV.loadImage(file); } catch (e) { reset(); alert(_t('qv.err.badimage')); return; }
    if (run !== S.run) return;
    S.img = img;
    S.a = { w: img.w, h: img.h, origW: img.origW, origH: img.origH, meta: null, colors: null, faces: null, objects: null, text: null };
    $('photo').width = img.w; $('photo').height = img.h; drawPhoto();
    const step = async (id, enabled, fn) => {
      if (run !== S.run) return;
      if (!enabled) { setStep(id, 'skip'); return; }
      setStep(id, 'run');
      try { S.a[id] = await fn(); if (run === S.run) setStep(id, 'done'); }
      catch (e) {
        if (run !== S.run) return;
        console.warn('[qv]', id, e);
        setStep(id, (id === 'objects' && (isOffline() || (e && /fetch|network|load/i.test(String(e.message))))) ? 'off' : 'err');
      }
      if (run === S.run) renderAll();
    };
    await step('meta', true, () => QV.readMeta(file));
    await step('colors', true, async () => QV.colors(img.canvas));
    await step('faces', cfg.faces, () => { setStep('faces', 'load'); return QV.detectFaces(img.canvas); });
    await step('objects', cfg.objects, () => { setStep('objects', 'load'); return QV.detectObjects(img.canvas); });
    const langs = Object.keys(cfg.ocr).filter((k) => cfg.ocr[k]);
    await step('text', cfg.text && langs.length > 0, () => QV.readText(img.canvas, langs, (m) => { if (run === S.run && /recogniz/i.test(m.status || '')) setStep('text', 'run', Math.round(m.progress * 100)); }));
    if (run === S.run) { setStatus('qv.status.done'); renderAll(); }
  }

  let statusKey = 'qv.status.initial';
  function setStatus(k) { statusKey = k; $('status-text').textContent = _t(k); }
  function reset() {
    S.run++; S.a = null; S.img = null; S.file = null;
    $('pickView').hidden = false; $('resultView').hidden = true; $('newBtn').hidden = true;
    setStatus('qv.status.initial'); window.scrollTo(0, 0);
    QV.stopOcr();
  }

  // ── Eventos: tria de foto ──
  function onFile(f) { if (f) analyze(f); }
  ['fileGallery', 'fileCamera'].forEach((id) => $(id).addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; onFile(f); }));
  const dz = $('dropzone');
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f && /^image\//.test(f.type)) onFile(f); });
  document.querySelectorAll('.ex').forEach((b) => b.addEventListener('click', async () => {
    try { const r = await fetch(b.dataset.ex); if (!r.ok) throw new Error('http ' + r.status); const blob = await r.blob(); onFile(new File([blob], b.dataset.ex.split('/').pop(), { type: blob.type || 'image/jpeg' })); }
    catch (e) { alert(_t('qv.err.badimage')); }
  }));
  $('newBtn').addEventListener('click', reset);
  $('clearBtn').addEventListener('click', reset);
  $('toggles').addEventListener('click', (e) => { const b = e.target.closest('button[data-ov]'); if (!b) return; S.overlay[b.dataset.ov] = !S.overlay[b.dataset.ov]; renderToggles(); drawPhoto(); });
  $('stripBtn').addEventListener('click', async () => {
    if (!S.img) return;
    const blob = await QV.stripMetadata(S.img.canvas);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (S.file && S.file.name ? S.file.name.replace(/\.[^.]+$/, '') : 'foto') + '-sense-metadades.jpg';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setStatus('qv.strip.done');
  });

  // ── Configuració i ajuda ──
  const bind = (id, get, set) => { const el = $(id); el.checked = get(); el.addEventListener('change', () => { set(el.checked); saveCfg(); if (S.a) renderAll(); }); };
  bind('cfgFaces', () => cfg.faces, (v) => { cfg.faces = v; });
  bind('cfgObjects', () => cfg.objects, (v) => { cfg.objects = v; });
  bind('cfgText', () => cfg.text, (v) => { cfg.text = v; });
  bind('cfgTech', () => cfg.tech, (v) => { cfg.tech = v; });
  bind('cfgOcrCat', () => cfg.ocr.cat, (v) => { cfg.ocr.cat = v; });
  bind('cfgOcrSpa', () => cfg.ocr.spa, (v) => { cfg.ocr.spa = v; });
  bind('cfgOcrEng', () => cfg.ocr.eng, (v) => { cfg.ocr.eng = v; });
  $('configBtn').onclick = () => { $('config-layer').style.display = 'flex'; };
  $('infoBtn').onclick = () => { $('info-layer').style.display = 'flex'; };
  $('closeConfigBtn').onclick = () => { $('config-layer').style.display = 'none'; };
  $('closeInfoBtn').onclick = () => { $('info-layer').style.display = 'none'; };
  PIAR_I18N.mountSelector($('langSelectHost'));
  PIAR_I18N.onChange(() => { $('status-text').textContent = _t(statusKey); renderSteps(); if (S.a) renderAll(); });
  renderSteps();

  // Ajuda per a proves: accés a l'estat
  window.__qv = { S, cfg, analyze, reset };
})();
