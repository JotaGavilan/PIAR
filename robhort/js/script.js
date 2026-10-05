// ============================================================
//  script.js  –  Coordinador principal de RobHort – El guardià del teu bancal
//  Gestiona: càmera, canvas, configuració, enviaments UART
// ============================================================

// ── Elements del DOM ─────────────────────────────────────────
const video          = document.getElementById('video');
const canvas         = document.getElementById('canvas');
const ctx            = canvas.getContext('2d');
const statusEl       = document.getElementById('status');
const statusTextEl   = document.getElementById('status-text');   // només el text (no esborra #device-indicator)
const detectionPanel = document.getElementById('detection-panel');
const connectBtn     = document.getElementById('connectBtn');
const infoBtn        = document.getElementById('infoBtn');
const configBtn      = document.getElementById('configBtn');
const configLayer    = document.getElementById('config-layer');
const infoLayer      = document.getElementById('info-layer');
const intervalSlider = document.getElementById('intervalSlider');
const intervalLabel  = document.getElementById('intervalLabel');
const categoryList   = document.getElementById('category-list');

// ── Estat ────────────────────────────────────────────────────
let sendIntervalMs   = 2000;    // interval d'enviament per UART (ms)
let lastDetections   = [];      // darrera llista de deteccions filtrades
let lastSendTime     = 0;
let activeCategories = new Set(getCategories());  // totes actives per defecte

// ── Inicialització de la càmera ───────────────────────────────
async function startVideo() {
  try {
    const constraints = {
      video: {
        facingMode: 'environment',   // càmera posterior en mòbil
        width:  { ideal: 320 },
        height: { ideal: 240 },
      }
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await new Promise(r => video.onloadedmetadata = r);
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    statusTextEl.textContent = '📷 Càmera activa. Carregant model IA...';
  } catch (e) {
    console.error('❌ Error càmera:', e);
    statusTextEl.textContent = (e && e.name === 'NotAllowedError')
      ? '❌ Has denegat l\'accés a la càmera. Permet-lo en el navegador i recarrega la pàgina.'
      : '❌ No s\'ha pogut accedir a la càmera';
  }
}

// ── Canvas: dibuixa els requadres de detecció ────────────────
function drawDetections(detections) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const visible = detections.filter(d => activeCategories.has(d.class));

  visible.forEach(det => {
    const [x, y, w, h] = det.bbox;
    const color  = getCategoryColor(det.class);
    const label  = `${det.label}  ${det.score}%`;
    const r      = 8;   // radi de les vores

    // Marc arrodonit
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Etiqueta
    ctx.font = '600 13px Poppins, sans-serif';
    const textW  = ctx.measureText(label).width + 14;
    const labelY = Math.max(22, y);

    // Fons etiqueta arrodonit (compatible sense roundRect)
    ctx.fillStyle = color;
    ctx.beginPath();
    const r2 = 5;
    const lx = x, ly = labelY - 20, lw = textW, lh = 20;
    ctx.moveTo(lx + r2, ly);
    ctx.lineTo(lx + lw - r2, ly);
    ctx.arcTo(lx + lw, ly, lx + lw, ly + r2, r2);
    ctx.lineTo(lx + lw, ly + lh - r2);
    ctx.arcTo(lx + lw, ly + lh, lx + lw - r2, ly + lh, r2);
    ctx.lineTo(lx + r2, ly + lh);
    ctx.arcTo(lx, ly + lh, lx, ly + lh - r2, r2);
    ctx.lineTo(lx, ly + r2);
    ctx.arcTo(lx, ly, lx + r2, ly, r2);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x + 7, labelY - 5);
  });
}

// Color per categoria (fàcil d'ampliar per residus)
function getCategoryColor(cls) {
  const colors = {
    cat:    '#a89cff',   // lila clar
    bird:   '#67e8f9',   // cian
    person: '#f0abfc',   // malva
    // Residus futurs:
    // bottle: '#86efac',
    // cup:    '#fcd34d',
  };
  return colors[cls] || '#a89cff';
}

// ── Panel de deteccions ───────────────────────────────────────
function updateDetectionPanel(detections) {
  const visible = detections.filter(d => activeCategories.has(d.class));

  if (visible.length === 0) {
    detectionPanel.innerHTML = '<span class="no-det">Cap detecció</span>';
    return;
  }

  detectionPanel.innerHTML = visible
    .map(d => `
      <span class="det-item" style="border-color:${getCategoryColor(d.class)}">
        <span class="det-label">${d.label}</span>
        <span class="det-score">${d.score}%</span>
        <span class="det-bar" style="width:${d.score}%;background:${getCategoryColor(d.class)}"></span>
      </span>`)
    .join('');
}

// ── Enviament UART ───────────────────────────────────────────
function buildUARTMessage(detections) {
  return detections
    .filter(d => activeCategories.has(d.class))
    .map(d => `${d.label}:${d.score}`)
    .join(',');
}

// Usa setTimeout recursiu per poder canviar l'interval en calent
let hadDetections = false;   // recorda si l'últim tick tenia deteccions
let sendLoopId = 0;          // identifica el bucle actiu; evita bucles duplicats

function scheduleSend() {
  // Si ja hi havia un bucle d'enviament actiu (p.ex. en recarregar el
  // model), l'invalidem abans de crear-ne un altre, perquè no s'acumulen
  // diversos "tick" enviant dades per duplicat a la micro:bit.
  const myLoopId = ++sendLoopId;

  function tick() {
    if (myLoopId !== sendLoopId) return;   // un bucle més nou l'ha substituït
    if (isBluetoothConnected()) {
      const msg = buildUARTMessage(lastDetections);
      if (msg) {
        // Hi ha deteccions → envia normalment
        sendUARTData(msg);
        hadDetections = true;
      } else if (hadDetections) {
        // Acaba de desaparèixer → envia '0' una sola vegada
        sendUARTData('0');
        hadDetections = false;
      }
      // Si no hi ha deteccions i ja s'ha enviat '0', no envia res
    }
    setTimeout(tick, sendIntervalMs);
  }
  setTimeout(tick, sendIntervalMs);
}

// ── Motor de detecció → callbacks ────────────────────────────
onDetection(detections => {
  lastDetections = detections;
  drawDetections(detections);
  updateDetectionPanel(detections);
});

onModelReady(() => {
  // Si la càmera ha fallat, es conserva el missatge d'error de la càmera
  if (video.srcObject) statusTextEl.textContent = '🤖 Model IA llest · Ja no cal Internet';
  startDetection(video, 300);   // detecció cada 300 ms (independent de l'enviament)
  scheduleSend();
});

onModelError((err, keptPrevious) => {
  console.error('Model error:', err);
  statusTextEl.textContent = looksLikeNetworkError(err)
    ? netErrorText('el model IA') + (keptPrevious ? ' Es manté el model anterior.' : ' Recarrega la pàgina quan tingues connexió.')
    : '❌ Error carregant el model IA';
});

// ── Bluetooth ─────────────────────────────────────────────────
onBTStatusChange((connected, msg) => {
  // El text i la classe del botó els gestiona bluetooth_uart.js (iguals en totes les apps)
  if (msg) statusTextEl.textContent = msg;
});

connectBtn.onclick = connectBluetooth;

// ── Capa d'informació ─────────────────────────────────────────
infoBtn.onclick = () => {
  infoLayer.style.display = 'flex';
};
document.getElementById('closeInfoBtn').onclick = () => {
  infoLayer.style.display = 'none';
};

// ── Capa de configuració ──────────────────────────────────────
configBtn.onclick = () => {
  configLayer.style.display = 'flex';
};
document.getElementById('closeConfigBtn').onclick = () => {
  configLayer.style.display = 'none';
  // En tancar la configuració es reinicia el bucle de detecció
  stopDetection();
  startDetection(video, 300);
};

// Construir llista de categories dinàmicament
function buildCategoryList() {
  const cats = getCategories();
  const trans = getTranslations();
  categoryList.innerHTML = cats.map(c => `
    <label class="cat-item">
      <input type="checkbox" value="${c}" checked onchange="toggleCategory('${c}', this.checked)">
      <span class="cat-color" style="background:${getCategoryColor(c)}"></span>
      <span>${trans[c] || c}</span>
    </label>
  `).join('');
}

// Construir selector de model
function buildModelSelector() {
  const models  = getModels();
  const current = getCurrentModel();
  const wrap    = document.getElementById('model-selector');
  wrap.innerHTML = Object.entries(models).map(([key, m]) => `
    <label class="cat-item">
      <input type="radio" name="modelChoice" value="${key}" ${key === current ? 'checked' : ''}
             onchange="changeModel('${key}')">
      <span class="model-info">
        <span class="model-label">${m.label}</span>
        <span class="model-desc">${m.description}</span>
      </span>
    </label>
  `).join('');
}

function syncModelRadio() {
  const r = document.querySelector(`input[name="modelChoice"][value="${getCurrentModel()}"]`);
  if (r) r.checked = true;
}

async function changeModel(key) {
  // Canviar de model descarrega un model nou: sense Internet segur que falla.
  // Ho comprovem abans per a no parar el model que ja funciona.
  if (isDefinitelyOffline()) {
    syncModelRadio();
    statusTextEl.textContent = '🌐 ' + NET_NOTE_CHANGE_MODEL + ' Ara no tens connexió: es manté el model actual.';
    return;
  }
  statusTextEl.textContent = '⏳ Carregant model... ' + NET_NOTE_CHANGE_MODEL;
  stopDetection();
  await initModel(key);
  syncModelRadio();            // si ha fallat, torna a marcar el model anterior
  startDetection(video, 300);
}

function toggleCategory(cls, enabled) {
  if (enabled) activeCategories.add(cls);
  else          activeCategories.delete(cls);
}

// Control de l'interval d'enviament
intervalSlider.addEventListener('input', () => {
  const secs = parseInt(intervalSlider.value);
  sendIntervalMs = secs * 1000;
  intervalLabel.textContent = `${secs} s`;
});

// ── Arrencada ─────────────────────────────────────────────────
(async () => {
  buildCategoryList();
  buildModelSelector();
  if (missingLibs(['cocoSsd', 'tf']).length) {
    statusTextEl.textContent = NET_LIBS_MISSING_TEXT;
    return;
  }
  await startVideo();
  await initModel();
})();
