// ============================================================
//  script.js – JFace
// ============================================================

// Botons
const connectBtn = document.getElementById('connectBtn');
const configBtn = document.getElementById('configBtn');
const infoBtn = document.getElementById('infoBtn');
const configLayer = document.getElementById('config-layer');
const infoLayer = document.getElementById('info-layer');
const closeConfigBtn = document.getElementById('closeConfigBtn');
const closeInfoBtn = document.getElementById('closeInfoBtn');
const intervalSlider = document.getElementById('intervalSlider');
const intervalLabel = document.getElementById('intervalLabel');

// Events
connectBtn.onclick = connectBluetooth;
configBtn.onclick = () => { configLayer.style.display = 'flex'; };
infoBtn.onclick = () => { infoLayer.style.display = 'flex'; };
closeConfigBtn.onclick = () => { configLayer.style.display = 'none'; };
closeInfoBtn.onclick = () => { infoLayer.style.display = 'none'; };

// Control de l'interval d'enviament
// (window.sendIntervalMs la llig video_facial_tracking.js a cada frame)
intervalSlider.addEventListener('input', () => {
  const value = parseInt(intervalSlider.value);
  const seconds = value / 10;  // 1→0.1s, 20→2.0s
  window.sendIntervalMs = seconds * 1000;
  intervalLabel.textContent = `${seconds.toFixed(1)}s`;
});

// Valor inicial coherent amb el slider (value="2" → 0.2s) perquè
// video_facial_tracking.js tinga un interval definit des del primer frame.
window.sendIntervalMs = (parseInt(intervalSlider.value) / 10) * 1000;
