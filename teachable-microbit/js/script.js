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
    ? netErrorText('el model') + ' Revisa també el codi o la URL del model.'
    : '❌ Error carregant el model';
}

loadModelBtn.onclick = async () => {
  const source = document.querySelector('input[name="modelSource"]:checked').value;
  const type = document.getElementById('modelType').value;
  
  let url;
  if (source === 'tm') {
    const code = document.getElementById('tmCode').value.trim();
    if (!code) {
      alert('Introduïx el codi del model de Teachable Machine');
      return;
    }
    url = `https://teachablemachine.withgoogle.com/models/${code}/`;
  } else {
    url = document.getElementById('customUrl').value.trim();
    if (!url) {
      alert('Introduïx una adreça (URL) vàlida');
      return;
    }
    if (!url.endsWith('/')) url += '/';
  }

  // Sense Internet, la descàrrega fallarà segur: no parem el model actual.
  if (isDefinitelyOffline()) {
    statusTextEl.textContent = '🌐 Per a carregar o canviar de model cal Internet. Ara no tens connexió' +
      (loadModelBtn.classList.contains('model-loaded') ? ': es manté el model actual.' : '.');
    return;
  }
  const libsNeeded = { image: ['tf', 'tmImage'], audio: ['tf', 'speechCommands'], pose: ['tf', 'tmPose'] }[type] || ['tf'];
  if (missingLibs(libsNeeded).length) {
    statusTextEl.textContent = NET_LIBS_MISSING_TEXT;
    return;
  }
  // Canviar de model atura el que està funcionant i en descarrega un de nou
  if (loadModelBtn.classList.contains('model-loaded') &&
      !confirm('Per a canviar de model cal connexió a Internet i s\'aturarà el model actual. Vols continuar?')) {
    return;
  }

  statusTextEl.textContent = '⏳ Carregant model...';
  loadModelBtn.disabled = true;
  loadModelBtn.textContent = '⏳ Carregant...';
  loadModelBtn.classList.remove('model-loaded');

  try {
    await loadModel(url, type);
  } catch (e) {
    statusTextEl.textContent = modelErrorText(e);
    loadModelBtn.disabled = false;
    loadModelBtn.textContent = 'Carregar model';
    loadModelBtn.classList.remove('model-loaded');
  }
};

// ── Control de l'interval ────────────────────────────────────
intervalSlider.addEventListener('input', () => {
  const value = parseInt(intervalSlider.value);
  const seconds = value / 10;  // 1→0,1 s, 30→3,0 s
  sendIntervalMs = seconds * 1000;
  intervalLabel.textContent = `${seconds.toFixed(1).replace('.', ',')} s`;
});

// ── Actualitzar panel de prediccions ─────────────────────────
function updatePredictionPanel(predictions) {
  if (!predictions || predictions.length === 0) {
    predictionPanel.innerHTML = '<span class="no-pred">Cap predicció</span>';
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
onBTStatusChange((connected, msg) => { if (msg) statusTextEl.textContent = msg; });

// ── Callbacks del model ──────────────────────────────────────
onPrediction(predictions => {
  lastPredictions = predictions;
  updatePredictionPanel(predictions);
});

onModelReady(() => {
  statusTextEl.textContent = '✅ Model carregat! Ja no cal Internet. Connecta Bluetooth per a enviar dades.';
  loadModelBtn.disabled = false;
  loadModelBtn.textContent = '✅ Model carregat';
  loadModelBtn.classList.add('model-loaded');
  scheduleSend();
});

onModelError((err) => {
  console.error('Error model:', err);
  statusTextEl.textContent = modelErrorText(err);
  loadModelBtn.disabled = false;
  loadModelBtn.textContent = 'Carregar model';
  loadModelBtn.classList.remove('model-loaded');
});
