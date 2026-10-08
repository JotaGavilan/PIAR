// ============================================================
//  cloud.js – Descripció opcional amb la IA de Google (Gemini)
//  Abans d'enviar res: es pixelen les cares al dispositiu, s'eliminen les metadades
//  i es bloqueja l'enviament si hi ha menors o persones sense cara localitzada.
//
//  QVCLOUD.getKey() / setKey(k) / clearKey()
//  QVCLOUD.prepare(img, a)          → { ok:true, blob, url, faces, text } | { ok:false, reason }
//  QVCLOUD.describe(blob, {key, model, lang}) → Promise<string>   (llança Error amb .code)
//  La clau només viu en el localStorage d'este navegador: mai al codi ni a la web.
// ============================================================
(function () {
  'use strict';
  const KEY_STORE = 'qv.gk.v1';
  const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';
  const MINOR_LIMIT = 20;        // si l'edat estimada és menor, es bloqueja (l'estimació falla uns anys)
  const MINOR_MIN_SCORE = 0.35;  // confiança mínima de la cara per a aplicar la regla de menors
  const PERSON_MIN_H = 0.06;     // una persona més baixa que el 6 % de la foto es considera massa menuda per a reconéixer-la
  const SEND_SIDE = 1280;

  function getKey() { try { return (localStorage.getItem(KEY_STORE) || '').trim(); } catch (e) { return ''; } }
  function setKey(k) { try { k = String(k || '').trim(); if (k) localStorage.setItem(KEY_STORE, k); else localStorage.removeItem(KEY_STORE); } catch (e) {} }
  function clearKey() { try { localStorage.removeItem(KEY_STORE); } catch (e) {} }

  const inside = (px, py, b, m) => px >= b.x - m && px <= b.x + b.w + m && py >= b.y - m && py <= b.y + b.h + m;

  async function prepare(img, a) {
    const canvas = img.canvas;
    let faces;
    try { faces = await QV.detectFacesWide(canvas); } catch (e) { return { ok: false, reason: 'nocheck' }; }
    // 1) Menors: bloqueig
    const minors = faces.filter((f) => f.score >= MINOR_MIN_SCORE && f.age < MINOR_LIMIT);
    if (minors.length) return { ok: false, reason: 'minors', n: minors.length };
    // 2) Persones: totes han de tindre una cara localitzada (per a poder-la pixelar)
    let objects = a && a.objects;
    if (!objects) { try { objects = await QV.detectObjects(canvas); } catch (e) { return { ok: false, reason: 'nocheck' }; } }
    const persons = objects.filter((o) => o.cls === 'person' && o.box.h >= PERSON_MIN_H * canvas.height);
    const lost = persons.filter((p) => {
      const m = Math.max(p.box.w, p.box.h) * 0.05;
      return !faces.some((f) => inside(f.box.x + f.box.w / 2, f.box.y + f.box.h / 2, p.box, m));
    });
    if (lost.length) return { ok: false, reason: 'people', n: lost.length };
    // 3) Pixelat + JPEG sense metadades
    const px = QV.pixelateRegions(canvas, faces.map((f) => f.box));
    const blob = await QV.toJpegBlob(px.canvas, SEND_SIDE, 0.85);
    if (!blob) return { ok: false, reason: 'nocheck' };
    const hasText = !!(a && a.text && a.text.text && window.QVI && QVI.findPII(a.text.text).length);
    return { ok: true, blob, url: URL.createObjectURL(blob), faces: faces.length, text: hasText };
  }

  const PROMPTS = {
    ca: 'Ets un ajudant d\'una activitat escolar sobre privacitat digital. Descriu esta foto amb detall: escena, lloc probable, persones (SENSE identificar-les: les cares estan pixelades a propòsit), objectes, roba, text visible i moment del dia. Després afig una secció «Què es podria deduir» amb 4 a 6 punts (hàbits, aficions, entorn, context escolar o familiar…) deixant clar que són hipòtesis. No endevines dades molt personals (salut, religió, orientació, ideologia) ni intentes saber qui és ningú. Escriu en valencià, en text pla sense Markdown ni asteriscs, amb un màxim de 220 paraules.',
    es: 'Eres un ayudante de una actividad escolar sobre privacidad digital. Describe esta foto con detalle: escena, lugar probable, personas (SIN identificarlas: las caras están pixeladas a propósito), objetos, ropa, texto visible y momento del día. Después añade una sección «Qué se podría deducir» con 4 a 6 puntos (hábitos, aficiones, entorno, contexto escolar o familiar…) dejando claro que son hipótesis. No adivines datos muy personales (salud, religión, orientación, ideología) ni intentes saber quién es nadie. Escribe en español, en texto plano sin Markdown ni asteriscos, con un máximo de 220 palabras.',
    en: 'You are a helper in a school activity about digital privacy. Describe this photo in detail: scene, likely place, people (WITHOUT identifying them: the faces are pixelated on purpose), objects, clothing, visible text and time of day. Then add a section called "What could be inferred" with 4 to 6 points (habits, hobbies, surroundings, school or family context…) making clear these are hypotheses. Do not guess very personal data (health, religion, orientation, ideology) and do not try to work out who anyone is. Write in English, in plain text without Markdown or asterisks, in at most 220 words.'
  };

  function blobToB64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1] || '');
      r.onerror = () => rej(new Error('read'));
      r.readAsDataURL(blob);
    });
  }
  const err = (code, msg) => { const e = new Error(msg || code); e.code = code; return e; };

  async function describe(blob, opt) {
    const key = (opt && opt.key) || getKey(), model = opt && opt.model, lang = (opt && opt.lang) || 'ca';
    if (!key) throw err('nokey');
    const data = await blobToB64(blob);
    const body = {
      contents: [{ role: 'user', parts: [{ text: PROMPTS[lang] || PROMPTS.ca }, { inline_data: { mime_type: 'image/jpeg', data } }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 2500 }
    };
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), 90000) : null;
    let resp, json = null;
    try {
      resp = await fetch(ENDPOINT + encodeURIComponent(model) + ':generateContent', {
        method: 'POST', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined
      });
      try { json = await resp.json(); } catch (e) { json = null; }
    } catch (e) { throw err('net', String(e && e.message)); }
    finally { if (timer) clearTimeout(timer); }
    if (!resp.ok) {
      const msg = (json && json.error && json.error.message) || ('HTTP ' + resp.status);
      const st = (json && json.error && json.error.status) || '';
      if (resp.status === 429 || st === 'RESOURCE_EXHAUSTED') throw err('quota', msg);
      if (resp.status === 404 || st === 'NOT_FOUND') throw err('model', msg);
      if (resp.status === 401 || /API[ _]KEY/i.test(msg) || st === 'UNAUTHENTICATED') throw err('key', msg);
      if (resp.status === 403 || st === 'PERMISSION_DENIED') throw err('region', msg);
      if (resp.status >= 500) throw err('server', msg);
      throw err('other', msg);
    }
    const cand = json && json.candidates && json.candidates[0];
    if (!cand) { if (json && json.promptFeedback && json.promptFeedback.blockReason) throw err('blocked'); throw err('empty'); }
    const parts = (cand.content && cand.content.parts) || [];
    let text = parts.filter((p) => p && typeof p.text === 'string' && !p.thought).map((p) => p.text).join('\n').trim();
    text = text.replace(/\*\*/g, '').replace(/^\s*[*#]+\s?/gm, (m) => (/^\s*\*\s/.test(m) ? '• ' : '')).trim();
    if (!text) throw err(cand.finishReason === 'SAFETY' ? 'blocked' : 'empty');
    return text;
  }

  window.QVCLOUD = { getKey, setKey, clearKey, prepare, describe, MINOR_LIMIT };
})();
