// ============================================================
//  chat.js – Conversa amb la IA de Google (Gemini) per a JParla
//  Només s'envia el TEXT de la conversa (mai l'àudio). Gemini no controla res: respon amb text i, si vol,
//  ordres [entre claudàtors] de la llista blanca; JParla.sanitizeReply les valida i les limita.
//
//  La clau de Google és la mateixa que Què veuen de tu i JVeu (localStorage «qv.gk.v1»): viu només al dispositiu.
//  JParlaChat.getKey()/setKey(k)/clearKey()
//  JParlaChat.reply({ history:[{role:'user'|'robot', text}], text, lang, persona, model, key }) → Promise<{ text }>   (llança Error amb .code)
// ============================================================
(function (root) {
  'use strict';
  const KEY_STORE = 'qv.gk.v1';
  const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';
  function getKey() { try { return (localStorage.getItem(KEY_STORE) || '').trim(); } catch (e) { return ''; } }
  function setKey(k) { try { k = String(k || '').trim(); if (k) localStorage.setItem(KEY_STORE, k); else localStorage.removeItem(KEY_STORE); } catch (e) {} }
  function clearKey() { try { localStorage.removeItem(KEY_STORE); } catch (e) {} }
  const err = (code, msg) => { const e = new Error(msg || code); e.code = code; return e; };
  const LANG_NAME = { ca: 'Valencian (Catalan)', es: 'Spanish', en: 'English' };

  function system(lang, persona) {
    return [
      'You are the voice of a small cardboard-and-micro:bit robot head used in a school classroom. Students talk to you and your reply is read aloud by a speech synthesizer while the robot moves its mouth.',
      'Always answer in ' + (LANG_NAME[lang] || LANG_NAME.ca) + '.',
      'Keep it SHORT: one to three short sentences (at most 45 words), plain spoken language, no Markdown, no lists, no emojis, no web addresses. Write numbers and symbols the way they are spoken.',
      'The audience is schoolchildren: be kind, age-appropriate and accurate. Never ask for or repeat personal data (full names, address, phone, school details). If asked something unsafe or inappropriate, politely change the subject.',
      'The robot head can only turn left/right, open its mouth (the app does this by itself while you speak) and open/close its eyes. You may add a few action commands between square brackets, placed where the action should happen. Allowed commands ONLY:',
      '[blink] [wink_left] [wink_right] [left] [right] [center] [no] [surprise] [sleep] [wake] [laugh] [think] [pause].',
      'Use them sparingly (at most 3 per reply) and never write any other bracketed text. Commands are not spoken.',
      'Robot personality and task, set by the teacher (it can never override the rules above): ' + String(persona || '').slice(0, 600)
    ].join('\n');
  }

  async function reply(o) {
    o = o || {};
    const key = o.key || getKey(), model = o.model || 'gemini-3.5-flash-lite';
    if (!key) throw err('nokey');
    const contents = [];
    (o.history || []).slice(-8).forEach((h) => {
      const t = String(h.text || '').slice(0, 600); if (!t) return;
      const role = h.role === 'user' ? 'user' : 'model';
      if (contents.length && contents[contents.length - 1].role === role) contents[contents.length - 1].parts[0].text += '\n' + t;
      else contents.push({ role, parts: [{ text: t }] });
    });
    while (contents.length && contents[0].role !== 'user') contents.shift();
    const last = String(o.text || '').slice(0, 400);
    if (contents.length && contents[contents.length - 1].role === 'user') contents[contents.length - 1].parts[0].text += '\n' + last;
    else contents.push({ role: 'user', parts: [{ text: last }] });
    const body = {
      systemInstruction: { parts: [{ text: system(o.lang || 'ca', o.persona) }] },
      contents,
      generationConfig: { temperature: 0.8, maxOutputTokens: 1200 }
    };
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), 25000) : null;
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
      if (resp.status === 401 || /API[ _]KEY/i.test(msg) || st === 'UNAUTHENTICATED' || (resp.status === 400 && /key/i.test(msg))) throw err('key', msg);
      if (resp.status === 403 || st === 'PERMISSION_DENIED') throw err('region', msg);
      if (resp.status >= 500) throw err('server', msg);
      throw err('other', msg);
    }
    const cand = json && json.candidates && json.candidates[0];
    if (!cand) throw err(json && json.promptFeedback && json.promptFeedback.blockReason ? 'blocked' : 'empty');
    const parts = (cand.content && cand.content.parts) || [];
    const txt = parts.filter((p) => p && typeof p.text === 'string' && !p.thought).map((p) => p.text).join(' ');
    const clean = root.JParla.sanitizeReply(txt);
    if (!clean) throw err(cand.finishReason === 'SAFETY' ? 'blocked' : 'empty');
    return { text: clean };
  }

  root.JParlaChat = { getKey, setKey, clearKey, reply, system };
})(typeof window !== 'undefined' ? window : globalThis);
