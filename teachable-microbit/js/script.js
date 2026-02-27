// ============================================================
//  script.js – Coordinador principal de Teachable Microbit
// ============================================================

// ── Elements del DOM ─────────────────────────────────────────
const statusEl = document.getElementById('status');
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
let sendIntervalMs = 200;  // 0.2s per defecte
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
      alert('Introduïx una URL vàlida');
      return;
    }
    if (!url.endsWith('/')) url += '/';
  }

  statusEl.textContent = '⏳ Carregant model...';
  loadModelBtn.disabled = true;
  loadModelBtn.textContent = '⏳ Carregant...';
  loadModelBtn.classList.remove('model-loaded');

  try {
    await loadModel(url, type);
  } catch (e) {
    statusEl.textContent = '❌ Error carregant el model';
    loadModelBtn.disabled = false;
    loadModelBtn.textContent = 'Carregar Model';
    loadModelBtn.classList.remove('model-loaded');
  }
};

// ── Control de l'interval ────────────────────────────────────
intervalSlider.addEventListener('input', () => {
  const value = parseInt(intervalSlider.value);
  const seconds = value / 10;  // 1→0.1s, 30→3.0s
  sendIntervalMs = seconds * 1000;
  intervalLabel.textContent = `${seconds.toFixed(1)}s`;
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
function scheduleSend() {
  function tick() {
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

// ── Callbacks del model ──────────────────────────────────────
onPrediction(predictions => {
  lastPredictions = predictions;
  updatePredictionPanel(predictions);
});

onModelReady(() => {
  statusEl.textContent = '✅ Model carregat! Connecta Bluetooth per enviar dades.';
  loadModelBtn.disabled = false;
  loadModelBtn.textContent = '✅ Model Carregat';
  loadModelBtn.classList.add('model-loaded');
  scheduleSend();
});

onModelError((err) => {
  console.error('Error model:', err);
  statusEl.textContent = '❌ Error carregant el model';
  loadModelBtn.disabled = false;
  loadModelBtn.textContent = 'Carregar Model';
  loadModelBtn.classList.remove('model-loaded');
});
