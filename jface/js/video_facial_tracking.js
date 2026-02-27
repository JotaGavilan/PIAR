
// Detección facial con MediaPipe + Canvas
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const yawEl = document.getElementById('yaw');
const mouthEl = document.getElementById('mouth');
const eyeLEl = document.getElementById('eyeL');
const eyeREl = document.getElementById('eyeR');

let ultimoEnvio = 0;
let ultimoYaw = null;
let ultimoMouth = null;
let ultimoEyes = "";

const faceMesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
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

  if (results.multiFaceLandmarks.length > 0) {
    const lm = results.multiFaceLandmarks[0];
    drawConnectors(ctx, lm, FACEMESH_TESSELATION, { color: '#00FF00', lineWidth: 0.5 });

    const yaw = Math.max(0, Math.min(99, Math.round((lm[1].x - lm[234].x) / (lm[454].x - lm[234].x) * 20 + 5)));
    const mouth = Math.max(0, Math.min(99, Math.round(Math.hypot(lm[13].x - lm[14].x, lm[13].y - lm[14].y) * 100)));
    const eyeL = getEyeOpen(lm, true);
    const eyeR = getEyeOpen(lm, false);
    const ojos = `${eyeL}${eyeR}`;

    yawEl.textContent = yaw;
    mouthEl.textContent = mouth;
    eyeLEl.textContent = eyeL;
    eyeREl.textContent = eyeR;

    const ahora = Date.now();
    const cambioYaw = (ultimoYaw === null || Math.abs(yaw - ultimoYaw) > 4);
    const cambioMouth = (ultimoMouth === null || Math.abs(mouth - ultimoMouth) > 2);
    const cambioOjos = ojos !== ultimoEyes;

    if ((cambioYaw || cambioMouth || cambioOjos) && ahora - ultimoEnvio > 100) {
      const mensaje = yaw.toString().padStart(2, '0') + mouth.toString().padStart(2, '0') + ojos;
      sendUARTData(mensaje);
      ultimoYaw = yaw;
      ultimoMouth = mouth;
      ultimoEyes = ojos;
      ultimoEnvio = ahora;
    }
  }

  ctx.restore();
});

async function startVideo() {
  try {
    // Mostrar capa de càrrega
    showLoadingOverlay('Carregant càmera i IA facial...', 'Inicialitzant MediaPipe Face Mesh', '📷');
    
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    video.srcObject = stream;
    await new Promise(r => video.onloadedmetadata = r);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const cam = new Camera(video, {
      onFrame: async () => {
        try {
          await faceMesh.send({ image: video });
        } catch (e) {
          console.error("❌ Error en procesamiento de frame:", e);
        }
      },
      width: video.videoWidth,
      height: video.videoHeight
    });
    cam.start();
    
    // Amagar capa de càrrega quan tot estigui llest
    setTimeout(() => {
      hideLoadingOverlay();
      statusEl.textContent = '✅ Càmera llesta';
    }, 1000); // Petit retard per assegurar que tot està carregat
  } catch (e) {
    console.error("❌ Error al iniciar la cámara:", e);
    hideLoadingOverlay();
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
