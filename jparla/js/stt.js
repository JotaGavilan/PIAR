// ============================================================
//  stt.js – Veu → text per a JParla (reconeixement del navegador, Web Speech API)
//  A Chrome/Android l'àudio el processa Google (cal Internet). No existeix a Firefox ni a iPhone.
//
//  const s = await JParlaSTT.listen({ lang:'ca'|'es'|'en', onInterim(text) });
//  const text = await s.stop();   ·   s.cancel();
//  Errors: Error amb .code = 'unsupported' | 'mic' | 'nospeech' | 'net' | 'lang' | 'stt'
// ============================================================
(function (root) {
  'use strict';
  const err = (code, msg) => { const e = new Error(msg || code); e.code = code; return e; };
  const WEB_LANG = { ca: 'ca-ES', es: 'es-ES', en: 'en-US' };
  const SR = () => root.SpeechRecognition || root.webkitSpeechRecognition;
  const supported = () => !!SR();

  function listen(o) {
    o = o || {};
    if (!supported()) return Promise.reject(err('unsupported'));
    const rec = new (SR())();
    rec.lang = WEB_LANG[o.lang] || 'ca-ES';
    rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
    let finalText = '', interim = '', error = null, ended = false;
    const waiters = [];
    rec.onresult = (ev) => {
      let f = '', i = '';
      for (let k = 0; k < ev.results.length; k++) { const r = ev.results[k]; (r.isFinal ? (f += r[0].transcript + ' ') : (i += r[0].transcript + ' ')); }
      finalText = f.trim(); interim = i.trim();
      if (o.onInterim) o.onInterim((finalText + ' ' + interim).trim());
    };
    rec.onerror = (ev) => {
      const c = ev && ev.error;
      error = c === 'not-allowed' || c === 'service-not-allowed' ? err('mic') : c === 'audio-capture' ? err('mic', 'audio-capture') :
        c === 'network' ? err('net') : c === 'language-not-supported' ? err('lang') : (c === 'no-speech' || c === 'aborted') ? err('nospeech') : err('stt', c);
    };
    rec.onend = () => { ended = true; waiters.splice(0).forEach((w) => w()); };
    try { rec.start(); } catch (e) { return Promise.reject(err('stt', String(e && e.message))); }
    return Promise.resolve({
      stop() {
        return new Promise((resolve, reject) => {
          const done = () => { const text = (finalText || interim).trim(); if (text) resolve(text); else reject(error || err('nospeech')); };
          if (ended) return done();
          waiters.push(done);
          try { rec.stop(); } catch (e) {}
          setTimeout(() => { if (!ended) { try { rec.abort(); } catch (e) {} done(); } }, 6000);
        });
      },
      cancel() { try { rec.abort(); } catch (e) {} }
    });
  }
  root.JParlaSTT = { listen, supported, WEB_LANG };
})(window);
