// ============================================================
//  vlm.js – Control del model de descripció avançada (Florence-2) des de la pàgina
//  QVLM.supported()              → { ok, webgpu, why }
//  QVLM.cached()                 → Promise<boolean>  (el model ja és al dispositiu?)
//  QVLM.load(onProgress)         → Promise<{device}>
//  QVLM.describe(canvas)         → Promise<string>   (descripció en anglés)
//  QVLM.dispose()
// ============================================================
(function () {
  'use strict';
  const WORKER_URL = new URL('vlm-worker.js', document.currentScript ? document.currentScript.src : location.href).href;
  let worker = null, ready = false, device = null, seq = 0;
  const pending = new Map();
  let onProg = null, loadWait = null;

  function supported() {
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') return { ok: false, why: 'worker' };
    if (!('caches' in self)) return { ok: false, why: 'cache' };
    return { ok: true, webgpu: !!navigator.gpu };
  }
  async function cached() {
    try {
      if (!('caches' in self) || !(await caches.has('transformers-cache'))) return false;
      const keys = await (await caches.open('transformers-cache')).keys();
      const has = (s) => keys.some(r => r.url.indexOf(s) >= 0);
      return has('Florence-2-base-ft') && has('decoder_model_merged') && has('vision_encoder');
    } catch (e) { return false; }
  }
  function spawn() {
    if (worker) return worker;
    worker = new Worker(WORKER_URL, { type: 'module' });
    worker.onmessage = (ev) => {
      const m = ev.data || {};
      if (m.type === 'progress') { if (onProg) onProg(m); }
      else if (m.type === 'ready') { ready = true; device = m.device; if (loadWait) { loadWait.resolve({ device }); loadWait = null; } }
      else if (m.type === 'result') { const p = pending.get(m.id); if (p) { pending.delete(m.id); p.resolve(m.text); } }
      else if (m.type === 'error') {
        if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); p.reject(new Error(m.message)); }
        else if (loadWait) { loadWait.reject(new Error(m.message)); loadWait = null; }
      }
    };
    worker.onerror = (e) => {
      const err = new Error(e && e.message || 'worker');
      if (loadWait) { loadWait.reject(err); loadWait = null; }
      pending.forEach(p => p.reject(err)); pending.clear(); worker = null; ready = false;
    };
    return worker;
  }
  function load(onProgress, pref) {
    if (ready) return Promise.resolve({ device });
    onProg = onProgress || null;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    return new Promise((resolve, reject) => { loadWait = { resolve, reject }; spawn().postMessage({ type: 'load', device: pref }); });
  }
  function describe(canvas, maxSide) {
    const k = Math.min(1, (maxSide || 768) / Math.max(canvas.width, canvas.height));
    const w = Math.max(1, Math.round(canvas.width * k)), h = Math.max(1, Math.round(canvas.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(canvas, 0, 0, w, h);
    const data = g.getImageData(0, 0, w, h).data.buffer;
    const id = ++seq;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); spawn().postMessage({ type: 'caption', id, width: w, height: h, data, task: '<MORE_DETAILED_CAPTION>' }, [data]); });
  }
  function dispose() { if (worker) { worker.terminate(); worker = null; ready = false; pending.clear(); } }
  window.QVLM = { supported, cached, load, describe, dispose, isReady: () => ready, _spawn: spawn };
})();
