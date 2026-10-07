// ============================================================
//  script.js – Coordinador principal de Teachable Microbit
// ============================================================

// ── Elements del DOM ─────────────────────────────────────────
const statusEl = document.getElementById('status');
const statusTextEl = document.getElementById('status-text');   // només el text (no esborra #device-indicator)
const predictionPanel = document.getElementById('prediction-panel');
const connectBtn = document.getElementById('connectBtn');
const configBtn = document.getElementById('configBtn');
const infoBtn = document.getElementById('infoBtn');
const configLayer = document.getElementById('config-layer');
const infoLayer = document.getElementById('info-layer');
const closeConfigBtn = document.getElementById('closeConfigBtn');
const closeInfoBtn = document.getElementById('closeInfoBtn');
const loadModelBtn = document.getElementById('loadModelBtn');
const intervalSlider = document.getElementById('intervalSlider');
const intervalLabel = document.getElementById('intervalLabel');
const numClassesSelect = document.getElementById('numClasses');
const showProbabilityCheck = document.getElementById('showProbability');

// ── Estat ────────────────────────────────────────────────────
let sendIntervalMs = 200;  // 0,2 s per defecte
let lastPredictions = [];
let hadPrediction = false;

// ── Textos dinàmics i idioma ─────────────────────────────────
// L'estat de la UI es guarda com a funcions que tornen a pintar el text
// en l'idioma actual (es crida de nou quan l'usuari canvia d'idioma).
let statusRender = null;
function setStatus(render) {
  statusRender = render;
  statusTextEl.textContent = render();
}

// Estat del botó de càrrega: 'load' | 'loading' | 'loaded'
let loadBtnState = 'load';
const LOAD_BTN_KEYS = { load: 'tm.btn.load', loading: 'tm.btn.loading', loaded: 'tm.btn.loaded' };
function setLoadBtnState(state) {
  loadBtnState = state;
  loadModelBtn.classList.toggle('model-loaded', state === 'loaded');
  // Estil comú: acció principal (lila) fins que hi ha model; verd («correcte») quan ja està carregat
  loadModelBtn.classList.toggle('btn-primary', state !== 'loaded');
  loadModelBtn.classList.toggle('btn-ok', state === 'loaded');
  loadModelBtn.textContent = _t(LOAD_BTN_KEYS[state]);
}

// Segons amb una xifra decimal: coma en ca/es, punt en en (0,2 s / 0.2 s)
function formatSeconds(seconds) {
  const txt = seconds.toFixed(1);
  return (PIAR_I18N.lang === 'en' ? txt : txt.replace('.', ',')) + ' s';
}
function renderIntervalLabel() {
  intervalLabel.textContent = formatSeconds(parseInt(intervalSlider.value) / 10);
}

setStatus(() => _t('tm.status.initial'));
renderIntervalLabel();
setLoadBtnState('load');
PIAR_I18N.mountSelector(document.getElementById('langSelectHost'));
PIAR_I18N.onChange(() => {
  if (statusRender) statusTextEl.textContent = statusRender();
  loadModelBtn.textContent = _t(LOAD_BTN_KEYS[loadBtnState]);
  renderIntervalLabel();
  if (typeof renderMqList === 'function') { renderMqList(); if (mqInfoRender) mqInfo.textContent = mqInfoRender(); }
});

// ── Botons ───────────────────────────────────────────────────
connectBtn.onclick = connectBluetooth;
configBtn.onclick = () => { configLayer.style.display = 'flex'; };
infoBtn.onclick = () => { infoLayer.style.display = 'flex'; };
closeConfigBtn.onclick = () => { configLayer.style.display = 'none'; };
closeInfoBtn.onclick = () => { infoLayer.style.display = 'none'; };

// ── Toggle model input ───────────────────────────────────────
window.toggleModelInput = function() {
  const source = document.querySelector('input[name="modelSource"]:checked').value;
  const tmCode = document.getElementById('tmCode');
  const customUrl = document.getElementById('customUrl');

  tmCode.disabled = source !== 'tm';
  customUrl.disabled = source !== 'custom';
  document.getElementById('mqBox').style.display = source === 'maquina' ? 'flex' : 'none';
  // El tipus es tria sol quan el model ve de Màquina Ensenyable
  document.getElementById('tmTypeRow').style.display = source === 'maquina' ? 'none' : 'flex';
};

// ── Models de Màquina Ensenyable (guardats en este dispositiu) ──
const mqList = document.getElementById('mqList');
const mqInfo = document.getElementById('mqInfo');
const mqFile = document.getElementById('mqFile');
const mqDelete = document.getElementById('mqDelete');
const mqCamera = document.getElementById('mqCamera');
let mqModels = [];
let mqInfoRender = null;   // torna a pintar el missatge d'informació en l'idioma actual

function setMqInfo(render, isError) {
  mqInfoRender = render;
  mqInfo.textContent = render ? render() : '';
  mqInfo.classList.toggle('msg-err', !!isError);
}
function mqTypeLabel(t) { return _t('tm.type.' + t); }
function renderMqInfoForSelection() {
  const m = mqModels.find(x => x.id === mqList.value);
  if (!m) { setMqInfo(() => _t('tm.mq.none')); return; }
  setMqInfo(() => _t('tm.mq.info', { type: mqTypeLabel(m.modelType), n: m.classNames.length, names: m.classNames.join(', ') }));
}
function renderMqList(selectId) {
  const keep = selectId || mqList.value;
  mqList.innerHTML = '';
  mqModels.forEach(m => {
    const o = document.createElement('option');
    o.value = m.id; o.textContent = m.name + ' · ' + mqTypeLabel(m.modelType);
    mqList.appendChild(o);
  });
  if (mqModels.some(m => m.id === keep)) mqList.value = keep;
  mqDelete.disabled = mqModels.length === 0;
  mqList.disabled = mqModels.length === 0;
  renderMqInfoForSelection();
}
async function refreshMqModels(selectId) {
  try { mqModels = await PIAR_MODELS.list(); } catch (e) { mqModels = []; }
  renderMqList(selectId);
}
mqList.addEventListener('change', renderMqInfoForSelection);

// Carregar un fitxer .mia.json: es guarda en este dispositiu i queda triat
mqFile.addEventListener('change', async () => {
  const file = mqFile.files[0];
  mqFile.value = '';
  if (!file) return;
  try {
    let entry;
    try { entry = PIAR_MODELS.fromProject(JSON.parse(await file.text())); }
    catch (e) { throw (e && e.code) ? e : Object.assign(new Error('format'), { code: 'format' }); }
    await PIAR_MODELS.save(entry);
    await refreshMqModels(entry.id);
    setMqInfo(() => _t('tm.mq.saved', { name: entry.name }));
  } catch (e) {
    const code = e && e.code ? e.code : 'format';
    setMqInfo(() => _t('tm.err.mq_' + code), true);
  }
});

mqDelete.addEventListener('click', async () => {
  const m = mqModels.find(x => x.id === mqList.value);
  if (!m || !confirm(_t('tm.mq.confirm_delete', { name: m.name }))) return;
  try { await PIAR_MODELS.remove(m.id); } catch (e) {}
  await refreshMqModels();
});
mqCamera.addEventListener('change', () => setMaquinaCamera(mqCamera.value));

refreshMqModels();

// ── Carregar model ───────────────────────────────────────────
function modelErrorText(e) {
  if (e && e.mqCode) {
    const k = { net: 'tm.err.mq_net', cam: 'tm.err.mq_cam', bad: 'tm.err.mq_bad' }[e.mqCode];
    return k ? _t(k) : _t('tm.err.load');
  }
  return looksLikeNetworkError(e)
    ? netErrorText(_t('tm.what_model')) + ' ' + _t('tm.err.check_code')
    : _t('tm.err.load');
}

// Carrega el model de Màquina Ensenyable triat (o el que s'ha obert des de Màquina)
async function loadFromMaquina(id) {
  let entry = null;
  try { entry = await PIAR_MODELS.get(id); } catch (e) {}
  if (!entry) { setStatus(() => _t('tm.mq.missing')); return; }
  if (loadModelBtn.classList.contains('model-loaded') && !confirm(_t('tm.confirm.change'))) return;
  setStatus(() => _t('tm.status.loading'));
  loadModelBtn.disabled = true;
  setLoadBtnState('loading');
  await loadMaquinaModel(entry, mqCamera.value);
}

loadModelBtn.onclick = async () => {
  const source = document.querySelector('input[name="modelSource"]:checked').value;
  const type = document.getElementById('modelType').value;

  if (source === 'maquina') {
    if (!mqList.value) { alert(_t('tm.alert.no_mq')); return; }
    await loadFromMaquina(mqList.value);
    return;
  }
  
  let url;
  if (source === 'tm') {
    const code = document.getElementById('tmCode').value.trim();
    if (!code) {
      alert(_t('tm.alert.no_code'));
      return;
    }
    url = `https://teachablemachine.withgoogle.com/models/${code}/`;
  } else {
    url = document.getElementById('customUrl').value.trim();
    if (!url) {
      alert(_t('tm.alert.no_url'));
      return;
    }
    if (!url.endsWith('/')) url += '/';
  }

  // Sense Internet, només es pot carregar un model que ja estiga guardat al dispositiu: no parem el model actual.
  if (isDefinitelyOffline() && !(await isModelCached(url))) {
    const keepKey = loadModelBtn.classList.contains('model-loaded') ? 'tm.status.offline_keep' : 'tm.status.offline';
    setStatus(() => _t(keepKey));
    return;
  }
  const libsNeeded = { image: ['tf', 'tmImage'], pose: ['tf', 'tmPose'] }[type] || ['tf'];
  if (missingLibs(libsNeeded).length) {
    setStatus(() => NET_LIBS_MISSING_TEXT);
    return;
  }
  // Canviar de model atura el que està funcionant i en descarrega un de nou
  if (loadModelBtn.classList.contains('model-loaded') &&
      !confirm(_t('tm.confirm.change'))) {
    return;
  }

  setStatus(() => _t('tm.status.loading'));
  loadModelBtn.disabled = true;
  setLoadBtnState('loading');

  try {
    await loadModel(url, type);
  } catch (e) {
    setStatus(() => modelErrorText(e));
    loadModelBtn.disabled = false;
    setLoadBtnState('load');
  }
};

// ── Control de l'interval ────────────────────────────────────
intervalSlider.addEventListener('input', () => {
  const value = parseInt(intervalSlider.value);
  const seconds = value / 10;  // 1→0,1 s, 30→3,0 s
  sendIntervalMs = seconds * 1000;
  intervalLabel.textContent = formatSeconds(seconds);
});

// ── Actualitzar panel de prediccions ─────────────────────────
function updatePredictionPanel(predictions) {
  if (!predictions || predictions.length === 0) {
    predictionPanel.innerHTML = `<span class="no-pred" data-i18n="tm.no_pred">${_t('tm.no_pred')}</span>`;
    return;
  }

  // Ordenar per probabilitat descendent
  const sorted = predictions.slice().sort((a, b) => b.probability - a.probability);
  const numClasses = parseInt(numClassesSelect.value);
  const showProb = showProbabilityCheck.checked;

  const top = sorted.slice(0, numClasses);

  predictionPanel.innerHTML = top.map(p => {
    const score = Math.round(p.probability * 100);
    const label = p.className;
    return `
      <div class="pred-item">
        <span class="pred-label">${label}</span>
        ${showProb ? `<span class="pred-score">${score}%</span>` : ''}
        <div class="pred-bar" style="width: ${score}%"></div>
      </div>
    `;
  }).join('');
}

// ── Construir missatge UART ──────────────────────────────────
function buildUARTMessage(predictions) {
  if (!predictions || predictions.length === 0) return '';

  const sorted = predictions.slice().sort((a, b) => b.probability - a.probability);
  const numClasses = parseInt(numClassesSelect.value);
  const showProb = showProbabilityCheck.checked;

  const top = sorted.slice(0, numClasses).filter(p => p.probability > 0.01);
  if (top.length === 0) return '';

  if (showProb) {
    return top.map(p => `${p.className}:${Math.round(p.probability * 100)}`).join(';');
  } else {
    return top.map(p => p.className).join(';');
  }
}

// ── Bucle d'enviament UART ───────────────────────────────────
let sendLoopId = 0;   // identifica el bucle actiu; evita bucles duplicats

function scheduleSend() {
  // Cada volta que es carrega un model nou, onModelReady torna a cridar
  // scheduleSend(). Sense este identificador, el bucle anterior seguiria
  // actiu i s'enviarien dades duplicades a la micro:bit.
  const myLoopId = ++sendLoopId;

  function tick() {
    if (myLoopId !== sendLoopId) return;   // un bucle més nou l'ha substituït
    if (isBluetoothConnected()) {
      const msg = buildUARTMessage(lastPredictions);
      if (msg) {
        sendUARTData(msg);
        hadPrediction = true;
      } else if (hadPrediction) {
        // Acaba de desaparèixer la predicció → envia '0'
        sendUARTData('0');
        hadPrediction = false;
      }
    }
    setTimeout(tick, sendIntervalMs);
  }
  setTimeout(tick, sendIntervalMs);
}

// ── Missatges de la connexió Bluetooth ───────────────────────
// El missatge arriba ja traduït; busquem la seua clau per a poder-lo tornar a pintar si es canvia d'idioma.
const BT_STATUS_KEYS = ['sh.bt.searching', 'sh.bt.ok', 'sh.bt.error', 'sh.bt.disconnected'];
onBTStatusChange((connected, msg) => {
  if (!msg) return;
  const key = BT_STATUS_KEYS.find(k => _t(k) === msg);
  setStatus(key ? () => _t(key) : () => msg);
});

// ── Callbacks del model ──────────────────────────────────────
onPrediction(predictions => {
  lastPredictions = predictions;
  updatePredictionPanel(predictions);
});

onModelReady(() => {
  setStatus(() => _t('tm.status.ready'));
  loadModelBtn.disabled = false;
  setLoadBtnState('loaded');
  scheduleSend();
});

onModelError((err) => {
  console.error('Error model:', err);
  setStatus(() => modelErrorText(err));
  loadModelBtn.disabled = false;
  setLoadBtnState('load');
});


// ── Obrir directament un model guardat a Màquina Ensenyable: index.html?model=<id> ──
(async function openFromMaquina() {
  let id = null;
  try { id = new URLSearchParams(location.search).get('model'); } catch (e) {}
  if (!id) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  await refreshMqModels(id);
  document.querySelector('input[name="modelSource"][value="maquina"]').checked = true;
  toggleModelInput();
  if (!mqModels.some(m => m.id === id)) { setStatus(() => _t('tm.mq.missing')); return; }
  const m = mqModels.find(x => x.id === id);
  setMqInfo(() => _t('tm.mq.opened', { name: m.name }));
  await loadFromMaquina(id);
})();
