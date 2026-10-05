// ============================================================
//  i18n.js – Idioma de PIAR (valencià per defecte, castellà i anglés)
//
//  · L'idioma es guarda al dispositiu (localStorage «piar.lang») i és el mateix per a la portada
//    i totes les apps (estan en el mateix lloc web).
//  · El text original (valencià) està en els HTML/JS; els diccionaris (js/i18n.js de cada app i
//    shared/i18n_shared.js) tenen les tres llengües amb les mateixes claus.
//
//  En HTML:
//     <h2 data-i18n="cfg.title">⚙️ Configuració</h2>            → textContent
//     <p data-i18n-html="help.p1">Text amb <b>negreta</b></p>    → innerHTML (només text de confiança)
//     <input data-i18n-attr="placeholder:ph.name;title:tt.name">  → atributs
//  En JS (funció global _t):
//     _t('status.ready')          _t('msg.found', { n: 3 })   // «Trobats {n}»
//  Canvi d'idioma:  PIAR_I18N.setLang('es')  ·  PIAR_I18N.onChange(fn)
//  Selector:        PIAR_I18N.mountSelector(elementContenidor)
// ============================================================
(function () {
  'use strict';
  const KEY = 'piar.lang';
  const LANGS = [
    { code: 'ca', label: 'Valencià',   html: 'ca-ES-valencia' },
    { code: 'es', label: 'Castellano', html: 'es' },
    { code: 'en', label: 'English',    html: 'en' }
  ];
  const dict = { ca: {}, es: {}, en: {} };
  const listeners = [];

  const valid = (c) => LANGS.some((l) => l.code === c);
  let lang = 'ca';
  try { const s = localStorage.getItem(KEY); if (valid(s)) lang = s; } catch (e) { /* sense emmagatzematge: valencià */ }

  // Registra textos: add({ ca:{clau:'…'}, es:{…}, en:{…} })
  function add(obj) {
    for (const code of Object.keys(obj || {})) if (dict[code]) Object.assign(dict[code], obj[code]);
  }

  function t(key, vars) {
    let s = dict[lang][key];
    if (s === undefined) s = dict.ca[key];
    if (s === undefined) { try { console.warn('[i18n] falta la clau', key); } catch (e) {} return key; }
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return s;
  }

  function apply(root) {
    root = root || document;
    const q = (sel) => (root.querySelectorAll ? Array.from(root.querySelectorAll(sel)) : []);
    q('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
    q('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    q('[data-i18n-attr]').forEach((el) => {
      el.getAttribute('data-i18n-attr').split(';').forEach((pair) => {
        const i = pair.indexOf(':'); if (i < 0) return;
        const attr = pair.slice(0, i).trim(), key = pair.slice(i + 1).trim();
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
    const meta = LANGS.find((l) => l.code === lang);
    document.documentElement.setAttribute('lang', meta.html);
    // Els selectors d'idioma de la pàgina reflecteixen l'idioma actual
    document.querySelectorAll('select.piar-lang-select').forEach((s) => { s.value = lang; });
  }

  function setLang(code) {
    if (!valid(code) || code === lang) return;
    lang = code;
    try { localStorage.setItem(KEY, code); } catch (e) {}
    apply(document);
    listeners.forEach((fn) => { try { fn(lang); } catch (e) { console.error(e); } });
  }

  function onChange(fn) { listeners.push(fn); }

  // Selector d'idioma (llista desplegable accessible). Es pot muntar tants cops com calga.
  function mountSelector(container, opts) {
    if (!container) return null;
    opts = opts || {};
    const sel = document.createElement('select');
    sel.className = 'piar-lang-select';
    if (opts.id) sel.id = opts.id;
    sel.setAttribute('aria-label', 'Idioma / Idioma / Language');
    LANGS.forEach((l) => { const o = document.createElement('option'); o.value = l.code; o.textContent = l.label; sel.appendChild(o); });
    sel.value = lang;
    sel.addEventListener('change', () => setLang(sel.value));
    container.appendChild(sel);
    return sel;
  }

  window.PIAR_I18N = { LANGS, add, t, apply, setLang, onChange, mountSelector, get lang() { return lang; } };
  window._t = t;   // drecera global: _t('clau')

  // Aplica l'idioma guardat quan la pàgina està llesta (els diccionaris ja s'han carregat abans)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply(document));
  else apply(document);
})();
