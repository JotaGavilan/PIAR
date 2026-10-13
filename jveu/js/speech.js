// ============================================================
//  speech.js – Veu → text per a JVeu (dos motors)
//
//   «web»     Reconeixement de veu del navegador (Web Speech API). Ràpid i sense descàrregues, però a Chrome/Android
//             l'àudio el processa Google (cal Internet) i no existeix a Firefox.
//   «whisper» Whisper local en un Worker: privat i sense Internet després de baixar el model una vegada.
//
//  const s = await JVeuSpeech.listen({ engine, lang:'ca'|'es'|'en', model:'tiny'|'base', onInterim(text), onState(st) });
//  const text = await s.stop();     // «prémer per a parlar»: s'inicia en prémer i s'acaba en deixar de prémer
//  s.cancel();
//  Errors: Error amb .code = 'unsupported' | 'mic' | 'nospeech' | 'net' | 'lang' | 'stt' | 'load' | 'missing'
//  JVeuSpeech.webSupported() · .whisperSupported() · .whisperCached(model) · .whisperLoad(model, onProgress) · .whisperReady(model)
// ============================================================
(function (root) {
  'use strict';
  const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  const WORKER_URL = new URL('stt-worker.js', SCRIPT_URL).href;
  const err = (code, msg) => { const e = new Error(msg || code); e.code = code; return e; };
  const WEB_LANG = { ca: 'ca-ES', es: 'es-ES', en: 'en-US' };
  const WH_LANG = { ca: 'catalan', es: 'spanish', en: 'english' };
  const SR = () => root.SpeechRecognition || root.webkitSpeechRecognition;

  function webSupported() { return !!SR(); }
  function whisperSupported() {
    return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && 'caches' in root &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof MediaRecorder !== 'undefined';
  }

  // ───────────── Web Speech API ─────────────
  function listenWeb(o) {
    const rec = new (SR())();
    rec.lang = WEB_LANG[o.lang] || 'ca-ES';
    rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
    let finalText = '', interim = '', error = null, ended = false, waiters = [];
    rec.onresult = (ev) => {
      let f = '', i = '';
      for (let k = 0; k < ev.results.length; k++) { const r = ev.results[k]; (r.isFinal ? (f += r[0].transcript + ' ') : (i += r[0].transcript + ' ')); }
      finalText = f.trim(); interim = i.trim();
      if (o.onInterim) o.onInterim((finalText + ' ' + interim).trim());
    };
    rec.onerror = (ev) => {
      const c = ev && ev.error;
      error = c === 'not-allowed' || c === 'service-not-allowed' ? err('mic') : c === 'audio-capture' ? err('mic', 'audio-capture') :
        c === 'network' ? err('net') : c === 'language-not-supported' ? err('lang') : c === 'no-speech' ? err('nospeech') : c === 'aborted' ? err('nospeech') : err('stt', c);
    };
    rec.onend = () => { ended = true; waiters.splice(0).forEach((w) => w()); };
    if (o.onState) o.onState('listening');
    try { rec.start(); } catch (e) { throw err('stt', String(e && e.message)); }
    return {
      stop() {
        return new Promise((resolve, reject) => {
          const done = () => {
            const text = (finalText || interim).trim();
            if (text) return resolve(text);
            reject(error || err('nospeech'));
          };
          if (ended) return done();
          waiters.push(done);
          try { rec.stop(); } catch (e) {}
          setTimeout(() => { if (!ended) { try { rec.abort(); } catch (e) {} done(); } }, 6000);
        });
      },
      cancel() { try { rec.abort(); } catch (e) {} }
    };
  }

  // ───────────── Whisper local ─────────────
  let worker = null, readyModel = null, loadWait = null, onProg = null, seq = 0;
  const pending = new Map();
  function spawn() {
    if (worker) return worker;
    worker = new Worker(WORKER_URL, { type: 'module' });
    worker.onmessage = (ev) => {
      const m = ev.data || {};
      if (m.type === 'progress') { if (onProg) onProg(m); }
      else if (m.type === 'ready') { readyModel = m.model; if (loadWait) { loadWait.resolve(); loadWait = null; } }
      else if (m.type === 'result') { const p = pending.get(m.id); if (p) { pending.delete(m.id); p.resolve(m.text); } }
      else if (m.type === 'error') {
        if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); p.reject(err('stt', m.message)); }
        else if (loadWait) { loadWait.reject(err('load', m.message)); loadWait = null; }
      }
    };
    worker.onerror = (e) => {
      const er = err('load', (e && e.message) || 'worker');
      if (loadWait) { loadWait.reject(er); loadWait = null; }
      pending.forEach((p) => p.reject(er)); pending.clear(); worker = null; readyModel = null;
    };
    return worker;
  }
  // ¿Hi ha el motor de Whisper (vendor/transformers-4.3.1/stt-bundle.js)? Només es considera absent si el servidor diu que no hi és.
  const BUNDLE_URL = new URL('../../vendor/transformers-4.3.1/stt-bundle.js', SCRIPT_URL).href;
  let engineP = null;
  function whisperEngine() {
    if (!engineP) engineP = fetch(BUNDLE_URL, { method: 'HEAD' }).then((r) => r.ok, () => true).then((ok) => { if (!ok) engineP = null; return ok; });
    return engineP;
  }
  async function whisperCached(model) {
    try {
      if (!('caches' in root) || !(await caches.has('transformers-cache'))) return false;
      const keys = await (await caches.open('transformers-cache')).keys();
      const has = (s) => keys.some((r) => r.url.indexOf(s) >= 0);
      return has('whisper-' + model) && has('decoder_model_merged') && has('encoder_model');
    } catch (e) { return false; }
  }
  function whisperLoad(model, onProgress) {
    model = model === 'tiny' ? 'tiny' : 'base';
    if (readyModel === model) return Promise.resolve();
    onProg = onProgress || null;
    return whisperEngine().then((ok) => { if (!ok) throw err('missing'); return loadModel(model); });
  }
  function loadModel(model) {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    return new Promise((resolve, reject) => { loadWait = { resolve, reject }; spawn().postMessage({ type: 'load', model }); });
  }
  function whisperReady(model) { return readyModel === (model === 'tiny' ? 'tiny' : 'base'); }

  // Àudio gravat → Float32Array a 16 kHz, mono
  async function toPcm16k(blob) {
    const buf = await blob.arrayBuffer();
    const AC = root.AudioContext || root.webkitAudioContext;
    const ctx = new AC();
    let ab;
    try { ab = await ctx.decodeAudioData(buf); } finally { try { ctx.close(); } catch (e) {} }
    const len = Math.max(1, Math.ceil(ab.duration * 16000));
    const off = new OfflineAudioContext(1, len, 16000);
    const src = off.createBufferSource(); src.buffer = ab; src.connect(off.destination); src.start();
    const rendered = await off.startRendering();
    return rendered.getChannelData(0).slice();
  }

  async function listenWhisper(o) {
    if (!whisperSupported()) throw err('unsupported');
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { throw err('mic', String(e && e.name)); }
    const chunks = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    const stopped = new Promise((res) => { rec.onstop = res; });
    const t0 = performance.now();
    rec.start();
    if (o.onState) o.onState('listening');
    const release = () => { try { stream.getTracks().forEach((t) => t.stop()); } catch (e) {} };
    return {
      async stop() {
        try { if (rec.state !== 'inactive') rec.stop(); } catch (e) {}
        await stopped; release();
        if (performance.now() - t0 < 350 || !chunks.length) throw err('nospeech');
        if (o.onState) o.onState('transcribing');
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        let pcm;
        try { pcm = await toPcm16k(blob); } catch (e) { throw err('stt', 'decode'); }
        // col·loca silenci al final perquè Whisper no talle l'última paraula
        const padded = new Float32Array(pcm.length + 4800); padded.set(pcm);
        if (!whisperReady(o.model)) await whisperLoad(o.model);
        const id = ++seq;
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve: (t) => { t = String(t || '').trim(); t ? resolve(t) : reject(err('nospeech')); }, reject });
          spawn().postMessage({ type: 'transcribe', id, audio: padded, language: WH_LANG[o.lang] || 'catalan' }, [padded.buffer]);
        });
      },
      cancel() { try { if (rec.state !== 'inactive') rec.stop(); } catch (e) {} release(); }
    };
  }

  async function listen(o) {
    o = o || {};
    if (o.engine === 'whisper') return listenWhisper(o);
    if (!webSupported()) throw err('unsupported');
    return listenWeb(o);
  }

  root.JVeuSpeech = { whisperEngine, listen, webSupported, whisperSupported, whisperCached, whisperLoad, whisperReady, WEB_LANG, WH_LANG };
})(window);
