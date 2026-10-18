// ============================================================
//  script.js – JScroll: feed estil xarxa social + mesura de senyals + pantalla de resultats
//  Tot es calcula i es guarda al dispositiu (res no s'envia enlloc).
// ============================================================
(function () {
  'use strict';
  const J = window.JScroll;
  const $ = (id) => document.getElementById(id);
  const CFG_KEY = 'jscroll.cfg', LAST_KEY = 'jscroll.last';
  const TOPIC = {}; J.TOPICS.forEach((t) => { TOPIC[t.id] = t; });
  const clamp = J.clamp;

  // ── Configuració del professorat ────────────────────────
  const cfg = Object.assign({}, J.DEFAULT_CFG);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) {}
  function sanitizeCfg() {
    cfg.n = clamp(parseInt(cfg.n, 10) || 50, 20, 60); cfg.maxMin = clamp(parseInt(cfg.maxMin, 10) || 0, 0, 20);
    cfg.adaptive = cfg.adaptive !== false; cfg.hint = !!cfg.hint; cfg.phase1Frac = .4;
  }
  sanitizeCfg();
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify({ n: cfg.n, maxMin: cfg.maxMin, adaptive: cfg.adaptive, hint: cfg.hint })); } catch (e) {} };

  // ── Utilitats ───────────────────────────────────────────
  const lang = () => PIAR_I18N.lang;
  const dec = (s) => (lang() === 'en' ? s : s.replace('.', ','));
  const fmtS = (ms) => dec((ms / 1000).toFixed(1));
  const fmtMin = (ms) => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const fmtK = (n) => (n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? dec((n / 1000).toFixed(1)) + 'k' : String(n));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const topicName = (id) => _t('js.topic.' + id);
  const capOf = (it) => (it.cap && (it.cap[lang()] || it.cap.ca)) || '';
  let toastTimer = 0;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200); }

  // ── Estat ───────────────────────────────────────────────
  let catalog = null, catalogById = {};
  let declared = [];
  let S = null;             // sessió en curs
  let lastData = null;      // dades de l'últim resultat mostrat
  let lastSummary = null;
  const feed = $('feed');

  function show(id) { ['intro', 'feedScreen', 'result'].forEach((s) => { $(s).hidden = s !== id; }); if (id === 'result') $('result').scrollTop = 0; }

  // ═════════ Catàleg ═════════
  async function loadCatalog() {
    try {
      const r = await fetch('media/feed.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      catalog = (j.items || []).filter((it) => it && TOPIC[it.topic] && it.file && (it.type === 'photo' || it.type === 'video'));
      catalog.forEach((it) => { catalogById[it.id] = it; });
    } catch (e) { catalog = null; }
    refreshIntro(); refreshCatalogInfo();
  }
  function refreshCatalogInfo() {
    $('catalogInfo').textContent = catalog ? _t('js.cfg.catalog', { n: catalog.length, p: catalog.filter((i) => i.type === 'photo').length, v: catalog.filter((i) => i.type === 'video').length }) : _t('js.cat.err');
  }

  // ═════════ Inici ═════════
  function buildChips() {
    const box = $('chips'); box.innerHTML = '';
    J.TOPICS.forEach((t) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chipbtn'; b.dataset.t = t.id; b.style.setProperty('--tc', t.color); b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="em" aria-hidden="true">' + t.emoji + '</span><span class="nm"></span><span class="ord"></span>';
      b.onclick = () => togglePick(t.id);
      box.appendChild(b);
    });
    refreshIntro();
  }
  function togglePick(id) {
    const i = declared.indexOf(id);
    if (i >= 0) declared.splice(i, 1);
    else if (declared.length < 3) declared.push(id);
    else { $('pickCount').textContent = _t('js.intro.pickfull'); return; }
    refreshIntro();
  }
  function refreshIntro() {
    document.querySelectorAll('.chipbtn').forEach((b) => {
      const id = b.dataset.t, i = declared.indexOf(id);
      b.querySelector('.nm').textContent = topicName(id); b.setAttribute('aria-pressed', i >= 0 ? 'true' : 'false'); b.querySelector('.ord').textContent = i >= 0 ? String(i + 1) : '';
    });
    $('pickCount').textContent = _t('js.intro.pickn', { n: declared.length });
    const ok = !!catalog;
    $('startBtn').disabled = !(ok && declared.length === 3); $('skipBtn').disabled = !ok;
    $('lastBtn').hidden = !(ok && readLast());
  }

  // ═════════ Sessió ═════════
  function startSession(decl) {
    if (!catalog || !catalog.length) { toast(_t('js.cat.err')); return; }
    const n = Math.min(cfg.n, catalog.length);
    const c = { n, adaptive: cfg.adaptive, phase1Frac: .4 };
    const rnd = window.__jsSeed != null ? J.mulberry32(window.__jsSeed) : Math.random;
    stopTicker();
    S = { declared: (decl || []).slice(0, 3), cfg: c, n, planner: J.makePlanner(catalog, c, rnd), posts: [], active: -1, elapsed: 0, last: performance.now(), ended: false, endCard: false, armed: 0, startedAt: Date.now() };
    feed.innerHTML = ''; feed.style.overflowY = 'scroll'; show('feedScreen'); feed.scrollTop = 0;
    $('endBtn').classList.remove('armed'); $('endBtn').textContent = '✕';
    $('hintBox').hidden = !cfg.hint;
    ensureAhead(0); updateCounter();
    startTicker(); try { feed.focus({ preventScroll: true }); } catch (e) {}
  }
  const seenPosts = () => S.posts.filter((p) => p.sig.visits > 0);
  function ensureAhead(a) {
    while (!S.endCard && S.posts.length < a + 3) {
      const r = S.planner.next(J.topicScores(seenPosts()));
      if (!r) { addEndCard(); break; }
      addPost(r);
    }
  }
  function addPost(r) {
    const it = r.item, P = { item: it, phase: r.phase, sig: J.emptySig(), z: { s: 1, x: 0, y: 0, sticky: false }, paused: false, lastT: 0, el: null };
    const el = document.createElement('article'); el.className = 'post'; P.el = el; el.dataset.i = S.posts.length;
    const tc = TOPIC[it.topic].color;
    const media = it.type === 'video'
      ? '<video muted loop playsinline webkit-playsinline preload="auto" poster="media/' + esc(it.poster || '') + '" src="media/' + esc(it.file) + '"></video>'
      : '<img src="media/' + esc(it.file) + '" alt="" draggable="false" decoding="async">';
    el.innerHTML =
      '<div class="zoomer">' + media + '</div><div class="shade"></div>' +
      '<div class="pause-ico" aria-hidden="true">▶</div><div class="heart-pop" aria-hidden="true">❤️</div><div class="zoom-badge"></div>' +
      '<div class="meta"><div class="who"><span class="avatar" style="background:' + tc + '">' + esc((it.user || '?').charAt(0).toUpperCase()) + '</span><span>@' + esc(it.user || '') + '</span><span class="follow" data-i18n="js.feed.follow">Seguir</span></div><div class="cap"></div></div>' +
      '<div class="rail">' +
      '<button type="button" data-act="like" data-i18n-attr="aria-label:js.act.like;title:js.act.like"><span class="ic">🤍</span><span class="n"></span></button>' +
      '<button type="button" data-act="save" data-i18n-attr="aria-label:js.act.save;title:js.act.save"><span class="ic">🔖</span><span class="lb" data-i18n="js.act.save">Guardar</span></button>' +
      '<button type="button" data-act="zoom" data-i18n-attr="aria-label:js.act.zoom;title:js.act.zoom"><span class="ic">🔍</span><span class="lb" data-i18n="js.act.zoom">Ampliar</span></button>' +
      '</div>';
    el.querySelector('.cap').textContent = capOf(it);
    if (it.type === 'video') {
      const v = el.querySelector('video');
      v.addEventListener('timeupdate', () => {      // volta del bucle = «repetir vídeo»
        if (S && S.posts[S.active] === P && !P.paused && v.currentTime < P.lastT - 0.5) P.sig.replays++;
        P.lastT = v.currentTime;
      });
    }
    S.posts.push(P); feed.appendChild(el); PIAR_I18N.apply(el); refreshRail(P);
  }
  function addEndCard() {
    S.endCard = true;
    const d = document.createElement('div'); d.className = 'endcard'; d.id = 'endCard';
    d.innerHTML = '<div class="big-em">🏁</div><h2 data-i18n="js.feed.end.h">Has arribat al final</h2><p data-i18n="js.feed.end.p">Mira què ha après l\'algoritme de tu.</p><button type="button" class="btn-primary big" id="seeBtn" data-i18n="js.feed.end.btn">Veure el meu perfil →</button>';
    feed.appendChild(d); PIAR_I18N.apply(d); $('seeBtn').onclick = () => finish('end');
  }
  const activePost = () => (S && S.active >= 0 ? S.posts[S.active] : null);
  function postOf(node) { const el = node && node.closest ? node.closest('.post') : null; return el && S ? S.posts[+el.dataset.i] : null; }

  // ── Mesura (cada 100 ms) ─────────────────────────────────
  let ticker = 0;
  function startTicker() { stopTicker(); S.last = performance.now(); ticker = setInterval(tick, 100); }
  function stopTicker() { if (ticker) clearInterval(ticker); ticker = 0; }
  function scrollPos() { const h = feed.clientHeight || 1, r = feed.scrollTop / h, idx = Math.round(r); return { idx, frac: 1 - Math.abs(r - idx) }; }
  function tick() {
    if (!S || S.ended) return;
    const now = performance.now(); let dt = now - S.last; S.last = now;
    if (document.hidden) return;
    dt = Math.min(dt, 300);
    const sp = scrollPos(), a = sp.frac >= .6 && sp.idx < S.posts.length ? sp.idx : -1;
    if (a !== S.active) changeActive(a);
    const p = activePost();
    if (p) {
      const g = p.sig; g.dwellMs += dt; S.elapsed += dt;
      if (p.z.s > 1.25) g.zoomMs += dt;
      if (p.z.s > g.zoomMax) g.zoomMax = p.z.s;
      if (p.paused) g.pauseMs += dt;
    }
    updateCounter(); updateHint();
    if (cfg.maxMin && S.elapsed >= cfg.maxMin * 60000) { toast(_t('js.feed.timeup')); finish('time'); }
  }
  function changeActive(a) {
    const prev = activePost(); if (prev) stopPost(prev);
    S.active = a;
    const p = activePost(); if (!p) return;
    p.sig.visits++;
    const v = p.el.querySelector('video'); if (v) { try { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {} }
    ensureAhead(a);
  }
  function stopPost(p) {
    const v = p.el.querySelector('video'); if (v) v.pause();
    p.paused = false; p.el.classList.remove('paused');
    if (p.z.s !== 1) { p.z.s = 1; p.z.x = 0; p.z.y = 0; p.z.sticky = false; applyZoom(p, true); }
  }
  function updateCounter() {
    if (!S) return;
    let t = Math.min(Math.max(S.active, S.maxSeen || 0, 0) + 1, S.n) + '/' + S.n;
    if (S.active >= 0) S.maxSeen = Math.max(S.maxSeen || 0, S.active);
    if (cfg.maxMin) t += ' · ' + fmtMin(Math.max(0, cfg.maxMin * 60000 - S.elapsed));
    if ($('counter').textContent !== t) $('counter').textContent = t;
  }
  function updateHint() {
    if (!cfg.hint) return;
    const p = activePost(); $('hintBox').style.visibility = p ? 'visible' : 'hidden'; if (!p) return;
    const g = p.sig, sc = J.scorePost(p.item, g).total;
    $('hintBox').innerHTML = _t('js.hint.line', { dwell: '<b>' + fmtS(g.dwellMs) + '</b>', zoom: '<b>' + fmtS(g.zoomMs) + '</b>', zmax: dec(g.zoomMax.toFixed(1)), rep: '<b>' + g.replays + '</b>', pause: '<b>' + fmtS(g.pauseMs) + '</b>', score: '<b>' + dec((sc >= 0 ? '+' : '') + sc.toFixed(2)) + '</b>', topic: topicName(p.item.topic) });
  }

  // ── Botons de la dreta ───────────────────────────────────
  function refreshRail(P) {
    const likeB = P.el.querySelector('[data-act="like"]'), saveB = P.el.querySelector('[data-act="save"]'), zoomB = P.el.querySelector('[data-act="zoom"]');
    likeB.classList.toggle('on', P.sig.liked); likeB.querySelector('.ic').textContent = P.sig.liked ? '❤️' : '🤍'; likeB.setAttribute('aria-pressed', P.sig.liked ? 'true' : 'false');
    likeB.querySelector('.n').textContent = fmtK((P.item.likes || 0) + (P.sig.liked ? 1 : 0));
    saveB.classList.toggle('on', P.sig.saved); saveB.querySelector('.ic').textContent = P.sig.saved ? '🔖' : '🏷️'; saveB.setAttribute('aria-pressed', P.sig.saved ? 'true' : 'false');
    zoomB.classList.toggle('on', P.z.s > 1.02); zoomB.setAttribute('aria-pressed', P.z.s > 1.02 ? 'true' : 'false');
  }
  function setLike(P, on) {
    P.sig.liked = on; refreshRail(P);
    if (on) { const h = P.el.querySelector('.heart-pop'); h.classList.remove('go'); void h.offsetWidth; h.classList.add('go'); }
  }
  function togglePause(P) {
    if (P.item.type !== 'video') return;
    P.paused = !P.paused; P.el.classList.toggle('paused', P.paused);
    const v = P.el.querySelector('video'); if (P.paused) v.pause(); else { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
  }

  // ── Zoom ─────────────────────────────────────────────────
  function applyZoom(P, anim) {
    const z = P.z, w = P.el.clientWidth, h = P.el.clientHeight;
    z.s = clamp(z.s, 1, 4); if (z.s < 1.001) { z.s = 1; z.x = 0; z.y = 0; }
    z.x = clamp(z.x, w * (1 - z.s), 0); z.y = clamp(z.y, h * (1 - z.s), 0);
    const zm = P.el.querySelector('.zoomer'); zm.classList.toggle('anim', !!anim);
    zm.style.transform = z.s === 1 ? '' : 'translate(' + z.x.toFixed(1) + 'px,' + z.y.toFixed(1) + 'px) scale(' + z.s.toFixed(3) + ')';
    P.el.classList.toggle('zoomed', z.s > 1.25);
    P.el.querySelector('.zoom-badge').textContent = '🔍 ×' + dec(z.s.toFixed(1));
    feed.style.overflowY = (z.s > 1.02 || (gest && gest.type === 'pinch')) ? 'hidden' : 'scroll';
    refreshRail(P);
  }
  function zoomAt(P, ns, cx, cy) {
    const z = P.z, k = clamp(ns, 1, 4) / z.s;
    z.x = cx - (cx - z.x) * k; z.y = cy - (cy - z.y) * k; z.s = z.s * k;
    if (z.s > P.sig.zoomMax) P.sig.zoomMax = z.s;
    applyZoom(P, false);
  }
  function toggleZoomBtn(P) {
    const z = P.z;
    if (z.s > 1.02) { z.s = 1; z.x = 0; z.y = 0; z.sticky = false; applyZoom(P, true); }
    else { z.sticky = true; const w = P.el.clientWidth, h = P.el.clientHeight; zoomAt(P, 2.5, w / 2, h * .45); P.el.querySelector('.zoomer').classList.add('anim'); }
  }

  // Gest tàctil: pessic (2 dits) i arrossegar quan hi ha zoom
  let gest = null, lastPinchEnd = 0, dragMoved = false;
  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  feed.addEventListener('touchstart', (e) => {
    const P = postOf(e.target); if (!P || P !== activePost()) return;
    const r = P.el.getBoundingClientRect();
    if (e.touches.length >= 2) {
      e.preventDefault();
      const a = e.touches[0], b = e.touches[1];
      gest = { type: 'pinch', P, d0: dist(a, b) || 1, s0: P.z.s, x0: P.z.x, y0: P.z.y, mx: (a.clientX + b.clientX) / 2 - r.left, my: (a.clientY + b.clientY) / 2 - r.top };
      applyZoom(P, false);
    } else if (P.z.s > 1.02) {
      const t = e.touches[0]; gest = { type: 'pan', P, sx: t.clientX, sy: t.clientY, x0: P.z.x, y0: P.z.y }; dragMoved = false;
    }
  }, { passive: false });
  feed.addEventListener('touchmove', (e) => {
    if (!gest) return;
    const P = gest.P, r = P.el.getBoundingClientRect();
    if (gest.type === 'pinch' && e.touches.length >= 2) {
      e.preventDefault();
      const a = e.touches[0], b = e.touches[1], mx = (a.clientX + b.clientX) / 2 - r.left, my = (a.clientY + b.clientY) / 2 - r.top;
      const s = clamp(gest.s0 * dist(a, b) / gest.d0, 1, 4), k = s / gest.s0;
      P.z.s = s; P.z.x = mx - (gest.mx - gest.x0) * k; P.z.y = my - (gest.my - gest.y0) * k;
      if (s > P.sig.zoomMax) P.sig.zoomMax = s;
      applyZoom(P, false);
    } else if (gest.type === 'pan' && e.touches.length === 1) {
      e.preventDefault(); const t = e.touches[0];
      if (Math.abs(t.clientX - gest.sx) + Math.abs(t.clientY - gest.sy) > 8) dragMoved = true;
      P.z.x = gest.x0 + t.clientX - gest.sx; P.z.y = gest.y0 + t.clientY - gest.sy; applyZoom(P, false);
    }
  }, { passive: false });
  function touchEnd(e) {
    if (!gest) return;
    const P = gest.P;
    if (gest.type === 'pinch' && e.touches.length < 2) {
      lastPinchEnd = Date.now(); gest = { type: 'none', P };
      if (!P.z.sticky) { P.z.s = 1; P.z.x = 0; P.z.y = 0; }
      applyZoom(P, true);
    }
    if (e.touches.length === 0) { if (gest.type === 'pan') setTimeout(() => { dragMoved = false; }, 50); gest = null; applyZoom(P, false); }
  }
  feed.addEventListener('touchend', touchEnd); feed.addEventListener('touchcancel', touchEnd);

  // Ratolí / trackpad: Ctrl + roda (o pessic del trackpad) i arrossegar
  feed.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    const P = activePost(); if (!P) return;
    e.preventDefault();
    const r = P.el.getBoundingClientRect();
    zoomAt(P, P.z.s * Math.exp(-e.deltaY * .01), e.clientX - r.left, e.clientY - r.top);
    P.z.sticky = P.z.s > 1.02; if (!P.z.sticky) applyZoom(P, true);
  }, { passive: false });
  let mdrag = null;
  feed.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const P = postOf(e.target); if (!P || P !== activePost() || P.z.s <= 1.02 || e.target.closest('[data-act]')) return;
    mdrag = { P, sx: e.clientX, sy: e.clientY, x0: P.z.x, y0: P.z.y }; dragMoved = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (!mdrag) return;
    if (Math.abs(e.clientX - mdrag.sx) + Math.abs(e.clientY - mdrag.sy) > 6) dragMoved = true;
    mdrag.P.z.x = mdrag.x0 + e.clientX - mdrag.sx; mdrag.P.z.y = mdrag.y0 + e.clientY - mdrag.sy; applyZoom(mdrag.P, false);
  });
  window.addEventListener('pointerup', () => { if (mdrag) { mdrag = null; setTimeout(() => { dragMoved = false; }, 50); } });
  feed.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const P = activePost(); if (P && P.z.s > 1) toggleZoomBtn(P); } });

  // Toc: pausar/continuar el vídeo · doble toc: m'agrada
  let lastTap = { t: 0, x: 0, y: 0, P: null, toggled: false };
  feed.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    const P = postOf(e.target);
    if (btn && P) {
      const act = btn.dataset.act;
      if (act === 'like') setLike(P, !P.sig.liked);
      else if (act === 'save') { P.sig.saved = !P.sig.saved; refreshRail(P); }
      else if (act === 'zoom') toggleZoomBtn(P);
      return;
    }
    if (!P || P !== activePost() || !e.target.closest('.zoomer')) return;
    if (Date.now() - lastPinchEnd < 450 || dragMoved) return;
    const now = Date.now();
    if (lastTap.P === P && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 50) {
      if (lastTap.toggled) togglePause(P);          // el primer toc havia pausat: es desfà
      setLike(P, true); lastTap = { t: 0, P: null, toggled: false }; return;
    }
    lastTap = { t: now, x: e.clientX, y: e.clientY, P, toggled: P.item.type === 'video' };
    togglePause(P);
  });
  document.addEventListener('visibilitychange', () => {
    if (!S || S.ended) return;
    const P = activePost(); const v = P && P.el.querySelector('video');
    if (document.hidden) { if (v) v.pause(); }
    else { S.last = performance.now(); if (v && !P.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); } }
  });

  // Botó «Acabar ara» (cal tocar dues vegades)
  $('endBtn').onclick = () => {
    if (!S) return;
    if (Date.now() < S.armed) { finish('manual'); return; }
    S.armed = Date.now() + 2800; $('endBtn').classList.add('armed'); $('endBtn').textContent = _t('js.feed.exit2'); toast(_t('js.feed.armed'));
    setTimeout(() => { $('endBtn').classList.remove('armed'); $('endBtn').textContent = '✕'; }, 2800);
  };

  // ═════════ Final i guardat ═════════
  function finish(reason) {
    if (!S || S.ended) return;
    S.ended = true; stopTicker();
    const prev = activePost(); if (prev) stopPost(prev);
    feed.querySelectorAll('video').forEach((v) => v.pause());
    feed.style.overflowY = 'scroll'; gest = null;
    const data = { v: 1, ts: Date.now(), reason, n: S.n, declared: S.declared, cfg: S.cfg, elapsedMs: Math.round(S.elapsed), posts: seenPosts().map((p) => ({ id: p.item.id, phase: p.phase, sig: p.sig })) };
    saveLast(data); showResult(data);
  }
  function saveLast(d) { try { localStorage.setItem(LAST_KEY, JSON.stringify(d)); } catch (e) {} }
  function readLast() {
    try {
      const d = JSON.parse(localStorage.getItem(LAST_KEY) || 'null');
      if (!d || d.v !== 1 || !Array.isArray(d.posts)) return null;
      d.posts = d.posts.filter((p) => catalogById[p.id]);
      return d.posts.length ? d : null;
    } catch (e) { return null; }
  }
  function wipe() {
    try { localStorage.removeItem(LAST_KEY); } catch (e) {}
    lastData = null; lastSummary = null; $('result').innerHTML = ''; refreshIntro();
  }

  // ═════════ Resultats ═════════
  function buildSummary(data) {
    return J.summarize({ declared: data.declared, cfg: data.cfg, posts: data.posts.map((p) => ({ item: catalogById[p.id], phase: p.phase, sig: Object.assign(J.emptySig(), p.sig) })).filter((p) => p.item) });
  }
  function showResult(data) {
    lastData = data; lastSummary = buildSummary(data);
    show('result'); renderResult();
  }
  const tcolor = (id) => TOPIC[id].color;
  function renderResult() {
    if (!lastData) return;
    const d = lastData, sm = lastSummary, tot = sm.totals;
    const h = [];
    h.push('<div class="rs-top"><a class="btn piar-home" href="../" style="position:static;transform:none" aria-label="' + esc(_t('sh.home')) + '" title="' + esc(_t('sh.home')) + '"><svg class="ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a1 1 0 0 0 1 1H10v-5.5h4v5.5h3.5a1 1 0 0 0 1-1V10"/></svg></a><h1>' + esc(_t('js.res.title')) + '</h1></div>');
    h.push('<p class="rs-sub">' + esc(_t('js.res.sub', { n: tot.seen, t: fmtMin(d.elapsedMs) })) + '</p>');
    if (!sm.enough) {
      h.push('<div class="rs-card rs-warn"><p>' + esc(_t('js.res.few', { n: tot.seen })) + '</p></div>');
    } else {
      h.push(rankCard(sm), saidCard(sm), adCard(sm), mapCard(sm), bubbleCard(sm), statsCard(sm, d));
    }
    h.push('<div class="rs-actions"><button type="button" class="btn-primary" id="againBtn">' + esc(_t('js.res.again')) + '</button>' +
      (sm.enough ? '<button type="button" class="btn" id="cardBtn">' + esc(_t('js.res.card')) + '</button>' : '') +
      '<button type="button" class="btn btn-danger" id="delBtn">' + esc(_t('js.res.delete')) + '</button></div>');
    h.push('<p class="rs-end">' + esc(_t('js.res.end')) + '</p>');
    $('result').innerHTML = h.join('');
    $('againBtn').onclick = () => { show('intro'); refreshIntro(); };
    if ($('cardBtn')) $('cardBtn').onclick = downloadCard;
    $('delBtn').onclick = () => { wipe(); show('intro'); declared = []; refreshIntro(); };
    $('result').querySelectorAll('.tl .b').forEach((b) => { b.onclick = () => selectBar(+b.dataset.k); });
  }
  const medals = ['🥇', '🥈', '🥉'];
  function rankCard(sm) {
    const max = Math.max(1, ...sm.rank.map((r) => r.share));
    const rows = sm.rank.map((r, i) => {
      const t = TOPIC[r.topic];
      return '<div class="rk' + (i < 3 ? ' top' : '') + (r.n === 0 || r.share < 1 ? ' low' : '') + '" style="--tc:' + t.color + '"><span class="em">' + t.emoji + '</span><span class="nm">' + (i < 3 ? '<span class="medal">' + medals[i] + '</span>' : '') + esc(topicName(r.topic)) +
        '<small>⏱ ' + fmtS(r.dwellMs) + ' s' + (r.zoomMs >= 500 ? ' · 🔍 ' + fmtS(r.zoomMs) + ' s' : '') + (r.likes ? ' · ❤️ ' + r.likes : '') + (r.saves ? ' · 🔖 ' + r.saves : '') + (r.replays ? ' · ↻ ' + r.replays : '') + (r.skips ? ' · ⏭ ' + r.skips : '') + '</small></span>' +
        '<span class="pc">' + Math.round(r.share) + ' %</span><span class="bar"><i style="width:' + (r.share / max * 100).toFixed(1) + '%"></i></span></div>';
    }).join('');
    return '<div class="rs-card"><h2>' + esc(_t('js.res.rank.h')) + '</h2><p class="hint">' + esc(_t('js.res.rank.hint')) + '</p>' + rows + '</div>';
  }
  function saidCard(sm) {
    const s = sm.said;
    if (!s.declared.length) return '<div class="rs-card"><h2>' + esc(_t('js.res.said.h')) + '</h2><p>' + esc(_t('js.res.said.none')) + '</p></div>';
    const left = s.declared.map((t) => { const pos = s.declaredRanks.find((x) => x.topic === t).pos, hit = s.hits.includes(t);
      return '<div class="tp ' + (hit ? 'hit' : 'miss') + '"><span>' + TOPIC[t].emoji + '</span><span>' + esc(topicName(t)) + '</span><small>' + esc(_t('js.res.said.pos', { n: pos })) + (hit ? ' ✓' : '') + '</small></div>'; }).join('');
    const right = s.top3.map((t, i) => '<div class="tp ' + (s.declared.includes(t) ? 'hit' : '') + '"><span>' + TOPIC[t].emoji + '</span><span>' + esc(topicName(t)) + '</span><small>' + medals[i] + '</small></div>').join('');
    const sur = s.surprises.length ? '<p>' + esc(_t('js.res.said.surprise', { topics: s.surprises.map(topicName).join(', ') })) + '</p>' : '';
    return '<div class="rs-card"><h2>' + esc(_t('js.res.said.h')) + '</h2><div class="sv"><div><h3>' + esc(_t('js.res.said.you')) + '</h3>' + left + '</div><div><h3>' + esc(_t('js.res.said.did')) + '</h3>' + right + '</div></div><p><b>' + esc(_t('js.res.said.m' + s.matchCount)) + '</b></p>' + sur + '</div>';
  }
  function adHtml(topic, mini, sm) {
    const t = TOPIC[topic], key = 'js.ad.' + topic;
    let why = '';
    if (!mini) {
      const r = J.adReasons(sm, topic), li = [];
      li.push(_t('js.res.why.dwell', { s: r.dwellS, topic: topicName(topic) }));
      if (r.zooms) li.push(_t('js.res.why.zoom', { n: r.zooms }));
      if (r.likes + r.saves) li.push(_t('js.res.why.like', { n: r.likes + r.saves }));
      if (r.replays) li.push(_t('js.res.why.replay', { n: r.replays }));
      li.push(_t('js.res.why.share', { topic: topicName(topic), p: r.share }));
      why = '<div class="why"><h3>' + esc(_t('js.res.ad.why')) + '</h3><ul>' + li.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    }
    return '<div class="ad' + (mini ? ' mini' : '') + '" style="--tc:' + t.color + '"><div class="ad-h"><span>' + esc(_t('js.res.ad.tag')) + '</span><span>•••</span></div><div class="ad-b"><div class="ad-logo">' + t.emoji + '</div><div class="ad-t"><strong>' + esc(_t(key + '.b')) + '</strong><span>' + esc(_t(key + '.l')) + '</span>' + (mini ? '' : '<span class="ad-cta">' + esc(_t('js.res.ad.cta')) + '</span>') + '</div></div></div>' + why;
  }
  function adCard(sm) {
    return '<div class="rs-card"><h2>' + esc(_t('js.res.ad.h')) + '</h2><p class="hint">' + esc(_t('js.res.ad.hint')) + '</p>' + adHtml(sm.top3[0], false, sm) + adHtml(sm.top3[1], true, sm) + '<p class="hint" style="margin-top:10px">' + esc(_t('js.res.ad.note')) + '</p></div>';
  }
  function mapCard(sm) {
    const tl = sm.timeline, bars = [], mk = [];
    tl.forEach((t, k) => {
      if (k > 0 && t.phase !== tl[k - 1].phase) { bars.push('<span class="div"></span>'); mk.push('<span class="div"></span>'); }
      const hgt = t.seen ? clamp(t.dwellMs / 8000, .06, 1) * 100 : 0;
      bars.push('<button type="button" class="b' + (t.seen ? '' : ' unseen') + '" data-k="' + k + '" style="--tc:' + tcolor(t.topic) + ';height:' + hgt.toFixed(0) + '%" aria-label="' + esc('#' + (k + 1) + ' ' + topicName(t.topic)) + '"></button>');
      const dots = []; if (t.liked) dots.push('#ff2d55'); if (t.saved) dots.push('#fbbf24'); if (t.zoomMs >= 500) dots.push('#38bdf8'); if (t.replays) dots.push('#4ade80'); if (t.skip) dots.push('#94a3b8');
      mk.push('<span>' + dots.map((c) => '<i style="background:' + c + '"></i>').join('') + '</span>');
    });
    const phase2 = tl.some((t) => t.phase === 2) && sm.bubble.adaptive;
    const legend = '<div class="legend"><span><i class="dot" style="background:#ff2d55"></i>' + esc(_t('js.stat.likes')) + '</span><span><i class="dot" style="background:#fbbf24"></i>' + esc(_t('js.stat.saves')) + '</span><span><i class="dot" style="background:#38bdf8"></i>' + esc(_t('js.stat.zooms')) + '</span><span><i class="dot" style="background:#4ade80"></i>' + esc(_t('js.stat.replays')) + '</span><span><i class="dot" style="background:#94a3b8"></i>' + esc(_t('js.stat.skips')) + '</span>' + (phase2 ? '<span>┆ ' + esc(_t('js.res.map.phase')) + '</span>' : '') + '</div>';
    return '<div class="rs-card"><h2>' + esc(_t('js.res.map.h')) + '</h2><p class="hint">' + esc(_t('js.res.map.hint')) + '</p><div class="tl">' + bars.join('') + '</div><div class="tl-mk">' + mk.join('') + '</div>' + legend + '<div class="tl-info" id="tlInfo" aria-live="polite">' + esc(_t('js.res.map.tap')) + '</div></div>';
  }
  function selectBar(k) {
    const t = lastSummary.timeline[k]; if (!t) return;
    $('result').querySelectorAll('.tl .b').forEach((b) => b.classList.toggle('sel', +b.dataset.k === k));
    const ex = [];
    if (t.zoomMs >= 500) ex.push('🔍 ' + fmtS(t.zoomMs) + ' s (×' + dec(t.zoomMax.toFixed(1)) + ')'); if (t.replays) ex.push('↻ ' + t.replays); if (t.pauseMs >= 300) ex.push('⏸ ' + fmtS(t.pauseMs) + ' s');
    if (t.liked) ex.push('❤️'); if (t.saved) ex.push('🔖'); if (t.skip) ex.push('⏭ ' + _t('js.res.map.skip'));
    $('tlInfo').innerHTML = '<b>#' + (k + 1) + '</b> ' + TOPIC[t.topic].emoji + ' ' + esc(topicName(t.topic)) + ' · ' + esc(_t('js.type.' + t.type)) + '<br>⏱ ' + fmtS(t.dwellMs) + ' s' + (ex.length ? ' · ' + ex.join(' · ') : '') + ' · ' + esc(_t('js.res.map.score', { v: dec((t.score >= 0 ? '+' : '') + t.score.toFixed(2)) }));
  }
  function bubbleCard(sm) {
    const b = sm.bubble; if (!b.adaptive) return '';
    const a = Math.round(b.phase1.topShare), z = Math.round(b.phase2.topShare);
    const txt = b.delta > 8 ? _t('js.res.bub.txt', { a, b: z }) : _t('js.res.bub.small', { a, b: z });
    const row = (lbl, n, v) => '<div class="row"><div class="lbl"><span>' + esc(lbl) + '</span><b>' + Math.round(v) + ' %</b></div><div class="bar"><i style="width:' + v.toFixed(0) + '%"></i></div></div>';
    return '<div class="rs-card"><h2>' + esc(_t('js.res.bub.h')) + '</h2><p class="hint">' + esc(_t('js.res.bub.hint')) + '</p><div class="bub">' + row(_t('js.res.bub.p1', { n: b.phase1.n }), b.phase1.n, b.phase1.topShare) + row(_t('js.res.bub.p2', { n: b.phase2.n }), b.phase2.n, b.phase2.topShare) + '</div><p>' + esc(txt) + '</p></div>';
  }
  function statsCard(sm, d) {
    const t = sm.totals, W = J.W;
    const st = (v, k) => '<div class="stat"><b>' + v + '</b><span>' + esc(_t('js.stat.' + k)) + '</span></div>';
    const wrow = (k, v) => '<tr><td>' + esc(_t('js.how.' + k)) + '</td><td>' + v + '</td></tr>';
    const f = (x) => dec((x >= 0 ? '+' : '') + x.toFixed(2));
    return '<div class="rs-card"><h2>' + esc(_t('js.res.tot.h')) + '</h2><div class="stats">' + st(t.seen + '/' + d.n, 'posts') + st(fmtMin(t.dwellMs), 'time') + st(t.zooms, 'zooms') + st(t.likes, 'likes') + st(t.saves, 'saves') + st(t.replays, 'replays') + st(t.skips, 'skips') + '</div>' +
      '<details class="how"><summary>' + esc(_t('js.how.sum')) + '</summary><p class="hint">' + esc(_t('js.how.p')) + '</p><table>' +
      wrow('dwell', 'max ' + f(W.dwell)) + wrow('zoom', 'max ' + f(W.zoomBase + W.zoomTime + W.zoomAmt)) + wrow('replay', f(W.replay) + ' × ' + W.replayMax) + wrow('pause', 'max ' + f(W.pause)) + wrow('skip', f(W.skip)) + wrow('like', f(W.like)) + wrow('save', f(W.save)) +
      '</table><p class="hint">' + esc(_t('js.how.p2')) + '</p></details></div>';
  }

  // Targeta descarregable (PNG)
  function downloadCard() {
    const sm = lastSummary; if (!sm) return;
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 1350); gr.addColorStop(0, '#2a1f6b'); gr.addColorStop(1, '#0b0a16'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = '#fff'; g.font = '700 64px Poppins, system-ui, sans-serif'; g.textBaseline = 'alphabetic'; g.fillText(_t('js.card.title'), 70, 130);
    g.fillStyle = '#a89cff'; g.font = '500 34px Poppins, system-ui, sans-serif'; g.fillText(_t('js.card.sub'), 70, 184);
    const max = Math.max(1, ...sm.rank.map((r) => r.share));
    sm.rank.slice(0, 6).forEach((r, i) => {
      const y = 270 + i * 150, t = TOPIC[r.topic];
      g.font = '64px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; g.fillStyle = '#fff'; g.fillText(t.emoji, 70, y + 56);
      g.font = '600 40px Poppins, system-ui, sans-serif'; g.fillText(topicName(r.topic), 170, y + 30);
      g.fillStyle = '#ffffff1a'; g.beginPath(); g.roundRect(170, y + 48, 700, 26, 13); g.fill();
      g.fillStyle = t.color; g.beginPath(); g.roundRect(170, y + 48, Math.max(26, 700 * r.share / max), 26, 13); g.fill();
      g.fillStyle = '#fff'; g.font = '700 46px Poppins, system-ui, sans-serif'; g.textAlign = 'right'; g.fillText(Math.round(r.share) + ' %', 1010, y + 62); g.textAlign = 'left';
    });
    g.fillStyle = '#ffffffaa'; g.font = '500 30px Poppins, system-ui, sans-serif'; g.fillText(_t('js.card.foot'), 70, 1280);
    c.toBlob((b) => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'jscroll-perfil.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }, 'image/png');
  }

  // ═════════ Configuració i ajuda ═════════
  function refreshCfgLabels() {
    $('cfgNLbl').textContent = _t('js.cfg.n', { n: $('cfgN').value });
    const m = +$('cfgMin').value; $('cfgMinLbl').textContent = m ? _t('js.cfg.min', { m }) : _t('js.cfg.min0');
  }
  function loadCfgUi() { $('cfgN').value = cfg.n; $('cfgMin').value = cfg.maxMin; $('cfgAdaptive').checked = cfg.adaptive; $('cfgHint').checked = cfg.hint; refreshCfgLabels(); }
  $('cfgN').addEventListener('input', () => { cfg.n = +$('cfgN').value; saveCfg(); refreshCfgLabels(); });
  $('cfgMin').addEventListener('input', () => { cfg.maxMin = +$('cfgMin').value; saveCfg(); refreshCfgLabels(); });
  $('cfgAdaptive').addEventListener('change', () => { cfg.adaptive = $('cfgAdaptive').checked; saveCfg(); });
  $('cfgHint').addEventListener('change', () => { cfg.hint = $('cfgHint').checked; saveCfg(); });
  $('wipeBtn').onclick = () => { wipe(); $('wipeBtn').textContent = _t('js.cfg.wiped'); setTimeout(() => { $('wipeBtn').textContent = _t('js.res.delete'); }, 2000); };
  $('configBtn').onclick = () => { $('config-layer').style.display = 'flex'; };
  $('infoBtn').onclick = () => { $('info-layer').style.display = 'flex'; };
  $('closeConfigBtn').onclick = () => { $('config-layer').style.display = 'none'; };
  $('closeInfoBtn').onclick = () => { $('info-layer').style.display = 'none'; };

  $('startBtn').onclick = () => startSession(declared);
  $('skipBtn').onclick = () => startSession([]);
  $('lastBtn').onclick = () => { const d = readLast(); if (d) showResult(d); };

  PIAR_I18N.onChange(() => {
    refreshIntro(); refreshCfgLabels(); refreshCatalogInfo();
    if (S && !S.ended) S.posts.forEach((P) => { P.el.querySelector('.cap').textContent = capOf(P.item); refreshRail(P); });
    if (!$('result').hidden) renderResult();
  });

  PIAR_I18N.mountSelector($('langSelectHost'));
  buildChips(); loadCfgUi(); loadCatalog();

  // Per a les proves
  window.__js = {
    cfg, J, state: () => S, last: () => lastData, summary: () => lastSummary, catalog: () => catalog, declared: () => declared,
    startSession, finish, tick, activePost, scrollPos, applyZoom, zoomAt, toggleZoomBtn, setLike, togglePause, showResult, readLast, wipe,
    goTo: (i) => { feed.scrollTo({ top: i * feed.clientHeight, behavior: 'instant' }); },
    sanitizeCfg, loadCfgUi
  };
})();
