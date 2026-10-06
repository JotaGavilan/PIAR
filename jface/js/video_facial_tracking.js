
// Detecció facial amb MediaPipe + Canvas
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const yawEl = document.getElementById('yaw');
const mouthEl = document.getElementById('mouth');
const eyeLEl = document.getElementById('eyeL');
const eyeREl = document.getElementById('eyeR');

let darrerEnviament = 0;
let caraPerduda = false;   // true quan ja s'ha enviat el '0' de "cara perduda"
let darrerGir = null;
let darreraBoca = null;
let darrersUlls = "";

// ── Idioma: estat de la barra d'estat ─────────────────────────
// Guardem COM es calcula l'últim missatge (una funció) per a poder tornar-lo a escriure en canviar d'idioma.
const BT_STATUS_KEYS = ['sh.bt.ios_status', 'sh.bt.unsupported_status', 'sh.bt.searching', 'sh.bt.ok', 'sh.bt.error', 'sh.bt.disconnected'];
let statusFn = () => _t('jf.status.starting');
const _writeStatus = setStatusText;          // versió original (bluetooth_uart.js)
// To del missatge d'estat (colors ok/avís/error de piar-ui) segons el símbol inicial: ✅ 🤖 correcte · ❌ error · ⚠️ 🌐 avís
function paintStatusTone() {
  const el = document.getElementById('status-text');
  if (!el) return;
  const t = el.textContent.trim();
  el.classList.toggle('msg-ok', /^(✅|🤖)/u.test(t));
  el.classList.toggle('msg-err', /^❌/u.test(t));
  el.classList.toggle('msg-warn', /^(⚠|🌐)/u.test(t));
}
function showStatus(fn) { statusFn = fn; _writeStatus(fn()); paintStatusTone(); }
// Els missatges que escriu bluetooth_uart.js arriben ja traduïts: reconeixem la clau per a poder retraduir-los.
function showTranslatedStatus(msg) {
  const key = BT_STATUS_KEYS.find(k => _t(k) === msg);
  showStatus(key ? () => _t(key) : () => msg);
}
setStatusText = showTranslatedStatus;       // bluetooth_uart.js crida setStatusText(...) directament en alguns casos
showStatus(statusFn);

// Si no hi havia Internet en obrir la pàgina, les llibreries de jsDelivr no
// s'han descarregat: ho diem clarament en lloc de quedar-nos en blanc.
if (missingLibs(['FaceMesh', 'Camera']).length) {
  showStatus(() => NET_LIBS_MISSING_TEXT);
  throw new Error('Llibreries d\'IA no disponibles (sense Internet?)');
}

const faceMesh = new FaceMesh({ locateFile: file => `../vendor/mediapipe-face_mesh/${file}` });
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(-1, 1);
  ctx.translate(-canvas.width, 0);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (results.multiFaceLandmarks.length === 0) {
    // La cara ha desaparegut: s'envia '0' una sola vegada (com diu l'ajuda)
    if (!caraPerduda && darrerGir !== null) {
      sendUARTData('0');
      caraPerduda = true;
      darrerGir = null; darreraBoca = null; darrersUlls = "";
    }
  }

  if (results.multiFaceLandmarks.length > 0) {
    caraPerduda = false;
    const lm = results.multiFaceLandmarks[0];
    drawConnectors(ctx, lm, FACEMESH_TESSELATION, { color: '#00FF00', lineWidth: 0.5 });

    const yaw = Math.max(0, Math.min(99, Math.round((lm[1].x - lm[234].x) / (lm[454].x - lm[234].x) * 20 + 5)));
    const mouth = Math.max(0, Math.min(99, Math.round(Math.hypot(lm[13].x - lm[14].x, lm[13].y - lm[14].y) * 100)));
    const eyeL = getEyeOpen(lm, true);
    const eyeR = getEyeOpen(lm, false);
    const ulls = `${eyeL}${eyeR}`;

    yawEl.textContent = yaw;
    mouthEl.textContent = mouth;
    eyeLEl.textContent = eyeL;
    eyeREl.textContent = eyeR;

    const ara = Date.now();
    const canviGir = (darrerGir === null || Math.abs(yaw - darrerGir) > 4);
    const canviBoca = (darreraBoca === null || Math.abs(mouth - darreraBoca) > 2);
    const canviUlls = ulls !== darrersUlls;

    // Interval mínim entre enviaments, controlat pel control lliscant de
    // Configuració (window.sendIntervalMs, definit en script.js). 100 ms per
    // defecte si encara no s'ha inicialitzat.
    const intervalMinim = window.sendIntervalMs || 100;

    if ((canviGir || canviBoca || canviUlls) && ara - darrerEnviament > intervalMinim) {
      const missatge = yaw.toString().padStart(2, '0') + mouth.toString().padStart(2, '0') + ulls;
      sendUARTData(missatge);
      darrerGir = yaw;
      darreraBoca = mouth;
      darrersUlls = ulls;
      darrerEnviament = ara;
    }
  }

  ctx.restore();
});

async function startVideo() {
  try {
    // Mostrar la capa de càrrega
    showLoadingOverlay(_t('jf.loading.msg'), _t('jf.loading.det'), '📷', NET_NOTE_LOADING);
    
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    video.srcObject = stream;
    await new Promise(r => video.onloadedmetadata = r);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Descarrega el model ara (i no al primer fotograma) per a poder avisar
    // amb claredat si falla la descàrrega.
    if (typeof faceMesh.initialize === 'function') {
      let slow = setTimeout(() => updateLoadingMessage(_t('jf.loading.slow'), _t('jf.loading.slow_det')), 20000);
      try { await faceMesh.initialize(); }
      catch (err) {
        clearTimeout(slow);
        console.error('❌ Error descarregant Face Mesh:', err);
        hideLoadingOverlay();
        showStatus(() => netErrorText(_t('jf.what.model')) + ' ' + _t('jf.status.reload'));
        return;
      }
      clearTimeout(slow);
    }
    const cam = new Camera(video, {
      onFrame: async () => {
        try {
          await faceMesh.send({ image: video });
        } catch (e) {
          console.error("❌ Error en el processament del fotograma:", e);
        }
      },
      width: video.videoWidth,
      height: video.videoHeight
    });
    cam.start();
    
    // Amagar la capa de càrrega quan tot estiga llest
    setTimeout(() => {
      hideLoadingOverlay();
      showStatus(() => _t('jf.status.ready'));
    }, 1000); // Xicotet retard per a assegurar que tot està carregat
  } catch (e) {
    console.error("❌ Error en iniciar la càmera:", e);
    hideLoadingOverlay();
    const key = (e && e.name === 'NotAllowedError') ? 'jf.status.cam_denied' : 'jf.status.cam_fail';
    showStatus(() => _t(key));
  }
}

startVideo();

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function getEyeOpen(lm, left) {
  const top1 = lm[left ? 159 : 386];
  const top2 = lm[left ? 160 : 387];
  const bot1 = lm[left ? 145 : 374];
  const bot2 = lm[left ? 144 : 373];

  const top = midpoint(top1, top2);
  const bot = midpoint(bot1, bot2);

  const leftCorner = lm[left ? 130 : 359];
  const rightCorner = lm[left ? 243 : 463];

  const vertical = distance(top, bot);
  const horizontal = distance(leftCorner, rightCorner);
  const ratio = vertical / horizontal;

  return ratio > 0.20 ? 1 : 0;
}
