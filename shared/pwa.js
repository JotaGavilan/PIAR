// ============================================================
//  pwa.js – Instal·lació de PIAR i ús sense Internet
//  · Registra el service worker (sw.js, a l'arrel de PIAR) en totes les pàgines.
//  · A la portada, ofereix el botó d'instal·lar i el de «Descarregar per a ús sense Internet».
//  Cap dada de l'usuari s'envia enlloc: només es guarden fitxers de l'app en el dispositiu.
// ============================================================
(function () {
  'use strict';
  const here = document.currentScript && document.currentScript.src ? document.currentScript.src : location.href;
  const ROOT = new URL('../', here);                 // carpeta d'arrel de PIAR
  const SW_URL = new URL('sw.js', ROOT).href;
  const VENDOR_CACHE = 'piar-vendor-v1', MODEL_CACHE = 'piar-models-v1';
  const KEY = 'piar.offline.v1';
const T = (k, v, fb) => (window._t && window.PIAR_I18N ? _t(k, v) : fb);
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const supported = 'serviceWorker' in navigator && secure;

  let deferredPrompt = null;
  const listeners = [];
  const emit = () => listeners.forEach(fn => { try { fn(); } catch (e) {} });

  window.addEventListener('beforeinstallprompt', (e) => {
    if (window.PIAR_INSTALL_UI) e.preventDefault();  // només ocultem el missatge del navegador si la pàgina té el seu propi botó
    deferredPrompt = e; emit();
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; emit(); });

  // Avís de «versió nova»: el service worker ens el diu quan la còpia guardada d'esta pàgina és més antiga que la del servidor
  function showUpdateBanner() {
    if (document.getElementById('piar-update')) return;
    const b = document.createElement('div'); b.id = 'piar-update'; b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 12px;background:#2a2540;color:#f0eeff;border:1px solid #6c63ff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.5);font:600 .85rem/1.3 Poppins,system-ui,sans-serif';
    const t = document.createElement('span'); t.textContent = T('sh.upd.msg', null, 'Hi ha una versió nova de PIAR.');
    const btn = document.createElement('button'); btn.textContent = T('sh.upd.btn', null, 'Actualitzar');
    btn.style.cssText = 'flex:none;min-height:40px;padding:8px 14px;border:0;border-radius:10px;background:#6c63ff;color:#fff;font:inherit;cursor:pointer';
    btn.onclick = () => location.reload();
    b.append(t, btn); document.body.appendChild(b);
  }
  if (supported) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.piarUpdate) showUpdateBanner(); });

  const ready = supported
    ? navigator.serviceWorker.register(SW_URL, { scope: ROOT.pathname }).then(() => navigator.serviceWorker.ready).catch((e) => { console.warn('SW no registrat:', e); return null; })
    : Promise.resolve(null);

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const fmtMB = (b) => (b / 1e6).toFixed(b > 1e8 ? 0 : 1).replace('.', ',');

  async function loadPlan() { return (await fetch(new URL('precache.json', ROOT), { cache: 'no-cache' })).json(); }

  // Quins fitxers de cada grup ja són en memòria?
  async function status() {
    if (!supported || !('caches' in window)) return { supported: false };
    const plan = await loadPlan();
    const vc = await caches.open(VENDOR_CACHE);
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    const out = { supported: true, version: plan.version, groups: {}, shellReady: false };
    for (const g of plan.groups) {
      let have = 0, haveBytes = 0, totalBytes = 0;
      for (const f of g.files) { totalBytes += f.s; if (await vc.match(new URL(f.u, ROOT).href)) { have++; haveBytes += f.s; } }
      out.groups[g.id] = { name: g.name, files: g.files.length, have, bytes: totalBytes, haveBytes, libsOk: have === g.files.length, preload: g.preload || null, modelsOk: g.preload ? !!(saved.models && saved.models[g.id]) : null };
    }
    const keys = await caches.keys();
    out.shellReady = keys.some(k => k === 'piar-shell-' + plan.version);
    out.savedAt = saved.at || null;
    return out;
  }

  // Descarrega les llibreries i, per a cada app que ho necessita, carrega els seus models (així queden guardats)
  async function prepare(onProgress) {
    const report = (o) => { try { onProgress && onProgress(o); } catch (e) {} };
    if (!supported) throw new Error(T('pw.unsupported', null, 'Este navegador o esta adreça no permet l\'ús sense Internet (cal https).'));
    if (!navigator.onLine) throw new Error(T('pw.offline', null, 'Ara no hi ha Internet. Connecta\'t i torna-ho a provar.'));
    const reg = await ready; if (!reg) throw new Error(T('pw.no_sw', null, 'No s\'ha pogut activar el servei d\'ús sense Internet.'));
    if (!navigator.serviceWorker.controller) {   // primera visita: espera que el service worker agafe el control de la pàgina
      await new Promise((res) => { const t = setTimeout(res, 4000); navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(t); res(); }, { once: true }); });
      if (!navigator.serviceWorker.controller) throw new Error(T('pw.activating', null, 'El servei d\'ús sense Internet encara s\'està activant. Recarrega la pàgina i torna-ho a provar.'));
    }
    const plan = await loadPlan();
    const seen = new Set(); const todo = [];
    for (const g of plan.groups) for (const f of g.files) if (!seen.has(f.u)) { seen.add(f.u); todo.push(f); }
    const total = todo.reduce((a, f) => a + f.s, 0); let done = 0;
    report({ phase: 'libs', done: 0, total });
    let idx = 0;
    const worker = async () => {
      while (idx < todo.length) {
        const f = todo[idx++];
        const r = await fetch(new URL(f.u, ROOT).href);
        if (!r.ok) throw new Error(T('pw.file_fail', { file: f.u, status: r.status }, 'No s\'ha pogut descarregar ' + f.u + ' (' + r.status + ')'));
        await r.arrayBuffer(); done += f.s; report({ phase: 'libs', done, total, file: f.u });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}'); saved.models = saved.models || {};
    const results = {};
    for (const g of plan.groups) {
      if (!g.preload) continue;
      report({ phase: 'models', group: g.id, name: g.name });
      try { results[g.id] = await runPreload(new URL(g.preload, ROOT).href, g.id); saved.models[g.id] = results[g.id].ok; }
      catch (e) { results[g.id] = { ok: false, error: String(e && e.message || e) }; saved.models[g.id] = false; }
      report({ phase: 'models-done', group: g.id, name: g.name, result: results[g.id] });
    }
    saved.at = Date.now(); saved.version = plan.version;
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
    return results;
  }

  // Carrega una pàgina oculta que descarrega els models (el service worker els guarda)
  function runPreload(url, id) {
    return new Promise((resolve, reject) => {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-9px;top:-9px';
      f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      const cleanup = () => { window.removeEventListener('message', onMsg); clearTimeout(t); f.remove(); };
      const onMsg = (ev) => {
        const d = ev.data;
        if (ev.origin !== location.origin || !d || d.piarPreload !== id || !d.finished) return;
        cleanup(); resolve({ ok: !!d.ok, steps: d.steps || [], error: d.error || null });
      };
      const t = setTimeout(() => { cleanup(); reject(new Error(T('pw.too_slow', null, 'Ha tardat massa (comprova la connexió).'))); }, 240000);
      window.addEventListener('message', onMsg);
      f.src = url; document.body.appendChild(f);
    });
  }

  async function install() {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
    deferredPrompt = null; emit();
    return choice.outcome;
  }

  window.PIAR_PWA = {
    supported, ready, status, prepare, install, isStandalone, fmtMB,
    canInstall: () => !!deferredPrompt,
    onChange: (fn) => listeners.push(fn),
    clear: async () => { await caches.delete(VENDOR_CACHE); await caches.delete(MODEL_CACHE); await caches.delete('transformers-cache'); localStorage.removeItem(KEY); },   // les pàgines (piar-shell) es queden: l'app instal·lada continua obrint-se
  };
})();
