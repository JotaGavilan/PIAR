// ============================================================
//  loading_overlay.js – Capa de càrrega per a models IA i processos llargs
//  Bloqueja tota la pàgina (clics, tacte i teclat) mentre dura el procés,
//  perquè no es puga canviar de pàgina ni fer cap altra acció a mitges.
//
//  API antiga (compatible):
//    showLoadingOverlay(missatge, detalls, icona, nota)  /  hideLoadingOverlay()
//    updateLoadingMessage(missatge, detalls)
//  API nova:
//    const end = PIAR_BUSY.begin({ message, details, icon, note, progress });   → end()
//    await PIAR_BUSY.run({ ... }, async (api) => { api.update(msg, det); api.progress(0.4); ... })
//    PIAR_BUSY.setProgress(0..1 | null)   PIAR_BUSY.active()
//  Si hi ha diversos processos alhora, la capa roman fins que acaba l'últim.
// ============================================================
(function (root) {
  'use strict';
  const STUCK_MS = 60000;      // si no hi ha cap avanç en 60 s, s'oferix recarregar la pàgina
  const holders = [];           // pila de processos actius: { id, message, details, icon, note }
  let seq = 0, inerted = [], stuckTimer = null, legacyId = null, hideTimer = null;

  const tr = (k, d) => { try { return (typeof _t === 'function' && _t(k) !== k) ? _t(k) : d; } catch (e) { return d; } };

  function el() {
    let o = document.getElementById('loading-overlay');
    if (!o) {
      o = document.createElement('div');
      o.id = 'loading-overlay';
      o.setAttribute('role', 'alertdialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-live', 'polite');
      o.innerHTML = '<div class="loading-content">' +
        '<div class="loading-spinner"><span class="loading-icon">🤖</span></div>' +
        '<div class="loading-message"></div><div class="loading-details"></div>' +
        '<div class="loading-bar"><span class="loading-fill"></span></div>' +
        '<div class="loading-note"></div>' +
        '<div class="loading-stuck"><span class="loading-stuck-t"></span> <button type="button" class="loading-stuck-b"></button></div>' +
        '</div>';
      o.querySelector('.loading-stuck-b').addEventListener('click', () => location.reload());
      document.body.insertBefore(o, document.body.firstChild);
    }
    return o;
  }

  function paint() {
    const top = holders[holders.length - 1]; if (!top) return;
    const o = el();
    o.querySelector('.loading-message').textContent = top.message;
    o.querySelector('.loading-details').textContent = top.details;
    o.querySelector('.loading-icon').textContent = top.icon;
    const n = o.querySelector('.loading-note'); n.textContent = top.note || ''; n.style.display = top.note ? 'block' : 'none';
    const bar = o.querySelector('.loading-bar'), fill = o.querySelector('.loading-fill');
    if (top.progress == null) { bar.classList.remove('det'); fill.style.width = ''; }
    else { bar.classList.add('det'); fill.style.width = Math.max(2, Math.min(100, Math.round(top.progress * 100))) + '%'; }
  }

  function armStuck() {
    clearTimeout(stuckTimer);
    const o = document.getElementById('loading-overlay'); if (o) o.classList.remove('stuck');
    if (!holders.length) return;
    stuckTimer = setTimeout(() => {
      const o2 = el(); o2.querySelector('.loading-stuck-t').textContent = tr('sh.loading.stuck', 'Sembla que tarda massa.');
      o2.querySelector('.loading-stuck-b').textContent = tr('sh.loading.reload', 'Recarregar la pàgina');
      o2.classList.add('stuck');
    }, STUCK_MS);
  }

  function lock() {
    inerted = [];
    const o = el();
    Array.prototype.forEach.call(document.body.children, (c) => {
      if (c === o || c.tagName === 'SCRIPT' || c.hasAttribute('inert')) return;
      c.setAttribute('inert', ''); inerted.push(c);
    });
    document.body.setAttribute('aria-busy', 'true');
    try { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); } catch (e) {}
  }
  function unlock() {
    inerted.forEach((c) => c.removeAttribute('inert')); inerted = [];
    document.body.removeAttribute('aria-busy');
  }
  function beforeUnload(e) { if (holders.length) { e.preventDefault(); e.returnValue = ''; return ''; } }

  function begin(opt) {
    opt = opt || {};
    const h = { id: ++seq, message: opt.message || tr('sh.loading_model', 'Carregant…'), details: opt.details || '', icon: opt.icon || '🤖', note: opt.note || '', progress: opt.progress == null ? null : opt.progress };
    const first = holders.length === 0;
    holders.push(h);
    clearTimeout(hideTimer);
    const o = el(); o.classList.remove('hiding'); o.classList.add('visible');
    if (first) { lock(); window.addEventListener('beforeunload', beforeUnload); }
    paint(); armStuck();
    return function end() { finish(h.id); };
  }
  function finish(id) {
    const i = holders.findIndex((h) => h.id === id); if (i < 0) return;
    holders.splice(i, 1);
    if (holders.length) { paint(); armStuck(); return; }
    clearTimeout(stuckTimer); window.removeEventListener('beforeunload', beforeUnload);
    unlock();
    const o = document.getElementById('loading-overlay'); if (!o) return;
    o.classList.add('hiding');
    hideTimer = setTimeout(() => { if (!holders.length) o.classList.remove('visible', 'hiding', 'stuck'); }, 320);
  }
  function top() { return holders[holders.length - 1]; }
  function update(message, details) {
    const t = top(); if (!t) return;
    if (message !== undefined) t.message = message; if (details !== undefined) t.details = details;
    paint(); armStuck();
  }
  function setProgress(p) { const t = top(); if (!t) return; t.progress = p; paint(); armStuck(); }
  async function run(opt, fn) {
    const end = begin(opt);
    try { return await fn({ update, progress: setProgress }); } finally { end(); }
  }

  root.PIAR_BUSY = { begin, run, update, setProgress, active: () => holders.length > 0 };
  // API antiga (un únic procés «heretat» a la vegada)
  root.showLoadingOverlay = function (message, details, icon, note) {
    if (legacyId != null && holders.some((h) => h.id === legacyId)) { const t = holders.find((h) => h.id === legacyId); t.message = message || t.message; t.details = details || ''; t.icon = icon || t.icon; t.note = note || ''; paint(); armStuck(); return; }
    const end = begin({ message, details, icon, note });
    legacyId = seq; root.__legacyEnd = end;
  };
  root.hideLoadingOverlay = function () { if (legacyId != null) { finish(legacyId); legacyId = null; } };
  root.updateLoadingMessage = function (message, details) {
    if (legacyId != null) { const t = holders.find((h) => h.id === legacyId); if (t) { if (message !== undefined) t.message = message; if (details !== undefined) t.details = details; paint(); return; } }
    update(message, details);
  };
})(window);
