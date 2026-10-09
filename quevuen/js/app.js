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
  const cfg = { faces: true, objects: true, text: true, vlm: true, cloud: false, cloudModel: 'gemini-3.5-flash', cloudPix: 'bal', cloudModelCustom: '', tech: false, ocr: { cat: true, spa: true, eng: true } };
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
    if (v.place) v.place = _t('qv.s.place.' + v.place);
    if (v.region) v.region = _t('qv.s.reg.' + v.region);
    if (Array.isArray(v.act)) v.act = v.act.map((x) => _t('qv.s.act.' + x)).join('; ');
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
    renderToggles(); drawPhoto(); renderVlm(); renderCloud();
  }


  // ── Descripció avançada (model Florence-2 al dispositiu) ──
  let vlmMsg = null;   // { key, vars, cls } perquè es puga tornar a escriure en canviar d'idioma
  const analysisDone = () => STEP_DEF.every(([id]) => ['done', 'err', 'off', 'skip'].includes((S.steps[id] || {}).state));
  function setVlmMsg(key, vars, cls) { vlmMsg = key ? { key, vars, cls } : null; paintVlmMsg(); }
  function paintVlmMsg() {
    const el = $('vlmMsg'); el.className = 'note' + (vlmMsg && vlmMsg.cls ? ' ' + vlmMsg.cls : '');
    el.textContent = vlmMsg ? (vlmMsg.raw !== undefined ? vlmMsg.raw : _t(vlmMsg.key, vlmMsg.vars)) : '';
  }
  async function renderVlm() {
    const card = $('vlmCard');
    const sup = window.QVLM ? QVLM.supported() : { ok: false };
    card.hidden = !(S.a && cfg.vlm && sup.ok && analysisDone());
    if (card.hidden) return;
    $('vlmOut').hidden = !S.a.caption;
    $('vlmCaption').textContent = S.a.caption || '';
    $('vlmBtn').textContent = _t(S.a.caption ? 'qv.vlm.btn_again' : 'qv.vlm.btn');
    $('vlmBtn').disabled = !!S.vlmBusy;
    const cached = await QVLM.cached();
    $('vlmSize').textContent = _t(cached ? 'qv.vlm.size_ok' : 'qv.vlm.size');
  }
  async function runVlm() {
    if (S.vlmBusy || !S.a || !S.img) return;
    const run = S.run, img = S.img;
    const cached = await QVLM.cached();
    if (!cached) {
      if (!navigator.onLine) { setVlmMsg('qv.vlm.err_net', null, 'err'); return; }
      if (!confirm(_t('qv.vlm.confirm_dl'))) return;
    }
    S.vlmBusy = true; $('vlmBtn').disabled = true; setVlmMsg('qv.vlm.init'); $('vlmBar').hidden = false; $('vlmFill').style.width = '2%';
    try {
      const info = await QVLM.load((p) => {
        if (p.total > 0) {
          $('vlmFill').style.width = Math.max(2, Math.min(95, Math.round(p.loaded / p.total * 95))) + '%';
          if (p.total > 2e6 && p.loaded < p.total) setVlmMsg('qv.vlm.dl', { done: (p.loaded / 1e6).toFixed(0), total: (p.total / 1e6).toFixed(0) });
        }
      });
      if (run !== S.run) return;
      $('vlmFill').style.width = '97%'; setVlmMsg('qv.vlm.run');
      const text = await QVLM.describe(img.canvas);
      if (run !== S.run) return;
      $('vlmFill').style.width = '100%';
      S.a.caption = text;
      renderAll();
      setVlmMsg('qv.vlm.done', { device: _t('qv.vlm.dev.' + (info.device === 'webgpu' ? 'webgpu' : 'wasm')) });
    } catch (e) {
      const m = String((e && e.message) || e);
      if (/fetch|network|load failed/i.test(m)) setVlmMsg('qv.vlm.err_net', null, 'err');
      else { vlmMsg = { key: 'qv.vlm.err', vars: { msg: m }, cls: 'err', raw: undefined }; paintVlmMsg(); }
      if (window.console) console.warn('[qv] vlm', e);
    } finally {
      S.vlmBusy = false; $('vlmBar').hidden = true; $('vlmBtn').disabled = false;
    }
  }
  $('vlmBtn').addEventListener('click', runVlm);


  // ── Descripció al núvol (IA de Google) – opcional, amb cares pixelades i confirmació ──
  let cloudMsg = null, cloudUrl = null;
  const cloudModel = () => (cfg.cloudModel === 'custom' ? (cfg.cloudModelCustom || '').trim() : cfg.cloudModel) || 'gemini-3.5-flash';
  function setCloudMsg(key, vars, cls) { cloudMsg = key ? { key, vars, cls } : null; paintCloudMsg(); }
  function paintCloudMsg() {
    const el = $('cloudMsg'); el.className = 'note' + (cloudMsg && cloudMsg.cls ? ' ' + cloudMsg.cls : '');
    el.textContent = cloudMsg ? _t(cloudMsg.key, cloudMsg.vars) : '';
  }
  function renderCloud() {
    const card = $('cloudCard');
    card.hidden = !(S.a && cfg.cloud && window.QVCLOUD && analysisDone());
    if (card.hidden) return;
    $('cloudOut').hidden = !S.a.cloud;
    $('cloudText').textContent = S.a.cloud || '';
    $('cloudBtn').textContent = _t(S.a.cloud ? 'qv.cloud.btn_again' : 'qv.cloud.btn');
    $('cloudBtn').disabled = !!S.cloudBusy;
  }
  function freeCloudUrl() { if (cloudUrl) { try { URL.revokeObjectURL(cloudUrl); } catch (e) {} cloudUrl = null; } $('cloudPreview').removeAttribute('src'); }
  function closeCloudLayer() { $('cloud-layer').style.display = 'none'; freeCloudUrl(); S.cloudBlob = null; }
  async function runCloud() {
    if (S.cloudBusy || !S.a || !S.img) return;
    if (!QVCLOUD.getKey()) { setCloudMsg('qv.cloud.nokey', null, 'err'); $('config-layer').style.display = 'flex'; return; }
    if (!navigator.onLine) { setCloudMsg('qv.cloud.offline', null, 'err'); return; }
    const run = S.run;
    S.cloudBusy = true; $('cloudBtn').disabled = true; setCloudMsg('qv.cloud.prep');
    let prep;
    try { prep = await QVCLOUD.prepare(S.img, S.a, cfg.cloudPix); }
    catch (e) { if (window.console) console.warn('[qv] cloud prepare', e); prep = { ok: false, reason: 'nocheck' }; }
    S.cloudBusy = false; $('cloudBtn').disabled = false;
    if (run !== S.run) return;
    if (!prep.ok) { setCloudMsg('qv.cloud.block.' + (prep.reason === 'minors' ? 'minors' : prep.reason === 'people' ? 'people' : 'nocheck'), null, 'block'); return; }
    setCloudMsg(null);
    freeCloudUrl(); cloudUrl = prep.url; S.cloudBlob = prep.blob; S.cloudRun = run;
    $('cloudPreview').src = prep.url;
    const li = [];
    li.push(`<li>${esc(prep.faces ? _t('qv.cloud.conf.faces_n', { n: prep.faces }) : _t('qv.cloud.conf.faces_0'))}</li>`);
    if (prep.faces) li.push(`<li>${esc(_t('qv.cloud.conf.pix', { level: _t('qv.cloud.lvl.' + (['max', 'bal', 'tight'].includes(cfg.cloudPix) ? cfg.cloudPix : 'bal')), pct: (prep.coverage * 100).toFixed(1) }))}</li>`);
    li.push(`<li>${esc(_t('qv.cloud.conf.meta'))}</li>`);
    if (prep.text) li.push(`<li class="warn">${esc(_t('qv.cloud.conf.text'))}</li>`);
    li.push(`<li>${esc(_t('qv.cloud.conf.model', { model: cloudModel() }))}</li>`);
    li.push(`<li class="warn">${esc(_t('qv.cloud.conf.free'))}</li>`);
    $('cloudList').innerHTML = li.join('');
    $('cloud-layer').style.display = 'flex';
  }
  async function sendCloud() {
    const blob = S.cloudBlob, run = S.cloudRun, model = cloudModel();
    if (!blob || run !== S.run) { closeCloudLayer(); return; }
    closeCloudLayer();
    S.cloudBusy = true; $('cloudBtn').disabled = true; setCloudMsg('qv.cloud.sending');
    try {
      const text = await QVCLOUD.describe(blob, { model, lang: PIAR_I18N.lang });
      if (run !== S.run) return;
      S.a.cloud = text; S.a.cloudModel = model;
      setCloudMsg('qv.cloud.done', { model }); setStatus('qv.status.cloud_sent');
    } catch (e) {
      if (run !== S.run) return;
      const c = (e && e.code) || 'other';
      if (c === 'nokey') setCloudMsg('qv.cloud.nokey', null, 'err');
      else if (['key', 'quota', 'model', 'net', 'blocked', 'server', 'empty', 'region'].includes(c)) setCloudMsg('qv.cloud.err.' + c, { model }, 'err');
      else setCloudMsg('qv.cloud.err.other', { msg: String((e && e.message) || e).slice(0, 200) }, 'err');
      if (window.console) console.warn('[qv] cloud', e);
    } finally {
      S.cloudBusy = false; if (run === S.run) renderCloud(); else $('cloudBtn').disabled = false;
    }
  }
  $('cloudBtn').addEventListener('click', runCloud);
  $('cloudSend').addEventListener('click', sendCloud);
  $('cloudCancel').addEventListener('click', closeCloudLayer);

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
    setVlmMsg(null); setCloudMsg(null); closeCloudLayer();
    ['vlmCard', 'cloudCard', 'summaryCard', 'findingsCard', 'metaCard', 'facesCard', 'objectsCard', 'textCard', 'colorsCard', 'protectCard'].forEach((id) => { $(id).hidden = true; });
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
    S.run++; S.a = null; S.img = null; S.file = null; setVlmMsg(null); setCloudMsg(null); closeCloudLayer(); S.cloudBusy = false; $('vlmCard').hidden = true; $('cloudCard').hidden = true;
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
  bind('cfgVlm', () => cfg.vlm, (v) => { cfg.vlm = v; renderVlm(); });
  bind('cfgOcrCat', () => cfg.ocr.cat, (v) => { cfg.ocr.cat = v; });
  bind('cfgOcrSpa', () => cfg.ocr.spa, (v) => { cfg.ocr.spa = v; });
  bind('cfgOcrEng', () => cfg.ocr.eng, (v) => { cfg.ocr.eng = v; });
  // IA de Google: interruptor, clau (només en este navegador) i model
  (function () {
    const fields = $('cloudFields'), key = $('cfgKey'), sel = $('cfgModel'), cust = $('cfgModelCustom');
    const paintKey = () => { $('keyState').textContent = _t(QVCLOUD.getKey() ? 'qv.cfg.key_ok' : 'qv.cfg.key_none'); $('keyShow').textContent = _t(key.type === 'password' ? 'qv.cfg.key_show' : 'qv.cfg.key_hide'); };
    const paintModel = () => { cust.hidden = sel.value !== 'custom'; };
    $('cfgCloud').checked = !!cfg.cloud; fields.hidden = !cfg.cloud;
    $('cfgCloud').addEventListener('change', () => { cfg.cloud = $('cfgCloud').checked; fields.hidden = !cfg.cloud; saveCfg(); renderCloud(); });
    key.value = QVCLOUD.getKey();
    key.addEventListener('input', () => { QVCLOUD.setKey(key.value); paintKey(); });
    $('keyShow').addEventListener('click', () => { key.type = key.type === 'password' ? 'text' : 'password'; paintKey(); });
    $('keyClear').addEventListener('click', () => { QVCLOUD.clearKey(); key.value = ''; key.type = 'password'; paintKey(); });
    sel.value = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'custom'].includes(cfg.cloudModel) ? cfg.cloudModel : 'custom';
    cust.value = cfg.cloudModelCustom || (sel.value === 'custom' && !['gemini-3.5-flash', 'gemini-3.5-flash-lite'].includes(cfg.cloudModel) ? cfg.cloudModel : '');
    const pix = $('cfgPix'); pix.value = ['max', 'bal', 'tight'].includes(cfg.cloudPix) ? cfg.cloudPix : 'bal';
    pix.addEventListener('change', () => { cfg.cloudPix = pix.value; saveCfg(); });
    sel.addEventListener('change', () => { cfg.cloudModel = sel.value; paintModel(); saveCfg(); });
    cust.addEventListener('input', () => { cfg.cloudModelCustom = cust.value.trim(); saveCfg(); });
    paintModel(); paintKey();
    PIAR_I18N.onChange(paintKey);
  })();
  $('configBtn').onclick = () => { $('config-layer').style.display = 'flex'; };
  $('infoBtn').onclick = () => { $('info-layer').style.display = 'flex'; };
  $('closeConfigBtn').onclick = () => { $('config-layer').style.display = 'none'; };
  $('closeInfoBtn').onclick = () => { $('info-layer').style.display = 'none'; };
  PIAR_I18N.mountSelector($('langSelectHost'));
  PIAR_I18N.onChange(() => { $('status-text').textContent = _t(statusKey); renderSteps(); paintVlmMsg(); paintCloudMsg(); if (S.a) renderAll(); });
  renderSteps();

  // Ajuda per a proves: accés a l'estat
  window.__qv = { S, cfg, analyze, reset };
})();
