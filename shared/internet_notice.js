// ============================================================
//  internet_notice.js – Avisos sobre Internet, mode avió i ús sense connexió
//
//  PIAR es pot instal·lar i usar sense Internet (service worker + llibreries dins de /vendor/),
//  però els models d'IA de Google es descarreguen la primera vegada, amb Internet. Una vegada
//  carregat el model, la càmera es processa en el dispositiu i no s'envia
//  res a cap servidor; el Bluetooth no necessita Internet.
//
//  Atenció: navigator.onLine no és fiable (pot ser true amb Wi-Fi sense
//  Internet). Només el fem servir per a evitar un intent que segur que
//  fallarà (valor false); l'error real es detecta quan la descàrrega falla.
// ============================================================

// Textos dependents de l'idioma (claus «sh.net.*» a shared/i18n_shared.js). Són propietats globals amb getter,
// de manera que les apps els poden llegir com abans (NET_NOTE_LOADING…) i sempre estan en l'idioma actual.
Object.defineProperty(window, 'NET_NOTE_LOADING',      { get: () => _t('sh.net.loading') });
Object.defineProperty(window, 'NET_NOTE_READY',        { get: () => _t('sh.net.ready') });
Object.defineProperty(window, 'NET_NOTE_CHANGE_MODEL', { get: () => _t('sh.net.change_model') });
Object.defineProperty(window, 'NET_LIBS_MISSING_TEXT', { get: () => _t('sh.net.libs_missing') });

// Comprova si un model (adreça que conté «substr») ja està guardat al dispositiu pel service worker
async function isModelCached(substr) {
  try {
    if (!('caches' in window)) return false;
    const c = await caches.open('piar-models-v1');
    return (await c.keys()).some(r => r.url.includes(substr));
  } catch (e) { return false; }
}

function isDefinitelyOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// Intenta endevinar si un error és de xarxa. És deliberadament ampli: el
// missatge que es mostra a l'usuari està redactat en condicional.
function looksLikeNetworkError(e) {
  if (isDefinitelyOffline()) return true;
  const txt = String((e && (e.message || e.name)) || e || '');
  return /fetch|network|load failed|failed to|timeout|time out|ERR_|xhr|http|status|cors|script|404|403|500/i.test(txt);
}

function netErrorText(what) {
  return _t('sh.net.error', { what });
}

// Comprova que les llibreries externes s'han carregat (si no hi havia
// Internet en obrir la pàgina, els <script> de jsDelivr no es descarreguen).
function missingLibs(names) {
  return names.filter(n => typeof window[n] === 'undefined');
}
