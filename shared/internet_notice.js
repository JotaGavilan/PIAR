// ============================================================
//  internet_notice.js – Avisos sobre Internet, mode avió i ús sense connexió
//
//  Cap app PIAR no té mode «sense connexió» (no hi ha service worker):
//  cal Internet per a descarregar les llibreries i els models. Una vegada
//  carregat el model, la càmera es processa en el dispositiu i no s'envia
//  res a cap servidor; el Bluetooth no necessita Internet.
//
//  Atenció: navigator.onLine no és fiable (pot ser true amb Wi-Fi sense
//  Internet). Només el fem servir per a evitar un intent que segur que
//  fallarà (valor false); l'error real es detecta quan la descàrrega falla.
// ============================================================

const NET_NOTE_LOADING =
  'Cal Internet només per a descarregar el model. Quan estiga carregat, pots llevar el Wi-Fi i les dades mòbils: ' +
  'la càmera i el micròfon es processen en este dispositiu i no s\'envia res a cap servidor.';

const NET_NOTE_READY =
  'Ja no cal Internet: pots llevar el Wi-Fi i les dades mòbils. ' +
  'No actives el mode avió (o torna a activar el Bluetooth després), perquè la micro:bit el necessita.';

const NET_NOTE_CHANGE_MODEL =
  'Per a canviar de model cal Internet, perquè es descarrega de nou.';

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
  return `❌ No s'ha pogut descarregar ${what}. Comprova que tens connexió a Internet i torna-ho a provar.`;
}

// Comprova que les llibreries externes s'han carregat (si no hi havia
// Internet en obrir la pàgina, els <script> de jsDelivr no es descarreguen).
function missingLibs(names) {
  return names.filter(n => typeof window[n] === 'undefined');
}

const NET_LIBS_MISSING_TEXT =
  '❌ No s\'han pogut descarregar les llibreries d\'IA. Cal Internet per a obrir esta app: connecta\'t i recarrega la pàgina.';
