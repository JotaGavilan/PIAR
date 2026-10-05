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
  
  if (source === 'tm') {
    tmCode.disabled = false;
    customUrl.disabled = true;
  } else {
    tmCode.disabled = true;
    customUrl.disabled = false;
  }
};

// ── Carregar model ───────────────────────────────────────────
function modelErrorText(e) {
  return looksLikeNetworkError(e)
    ? netErrorText(_t('tm.what_model')) + ' ' + _t('tm.err.check_code')
    : _t('tm.err.load');
}

loadModelBtn.onclick = async () => {
  const source = document.querySelector('input[name="modelSource"]:checked').value;
  const type = document.getElementById('modelType').value;
  
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
  const libsNeeded = { image: ['tf', 'tmImage'], audio: ['tf', 'speechCommands'], pose: ['tf', 'tmPose'] }[type] || ['tf'];
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
