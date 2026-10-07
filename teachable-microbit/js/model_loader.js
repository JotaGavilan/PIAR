// ============================================================
//  model_loader.js – Carregador de models Teachable Machine
//  Admet: imatge i postura (Teachable Machine) i models de Màquina Ensenyable (imatge, postura i mans)
// ============================================================

let model = null;
let modelType = null;
let maxPredictions = 0;
let webcam = null;

let onPredictionCallback = null;
let onModelReadyCallback = null;
let onModelErrorCallback = null;

// ── Carregar model ───────────────────────────────────────────
async function loadModel(url, type) {
  try {
    stopPrediction();
    model = null;
    modelType = type;
    showCanvas();

    const modelURL = url + 'model.json';
    const metadataURL = url + 'metadata.json';

    // Mostrar capa de càrrega segons el tipus
    showLoadingOverlay(
      _t('tm.overlay.title', { type: _t('tm.type.' + type) }),
      _t('tm.overlay.details'),
      undefined,
      NET_NOTE_LOADING
    );

    if (type === 'image') {
      model = await tmImage.load(modelURL, metadataURL);
      maxPredictions = model.getTotalClasses();
      await startImagePrediction();

    } else if (type === 'pose') {
      model = await tmPose.load(modelURL, metadataURL);
      maxPredictions = model.getTotalClasses();
      await startPosePrediction();
    }

    hideLoadingOverlay();
    if (onModelReadyCallback) onModelReadyCallback();
  } catch (e) {
    console.error('❌ Error carregant model:', e);
    hideLoadingOverlay();
    if (onModelErrorCallback) onModelErrorCallback(e);
  }
}

// ─────────────────────────────────────────────────────────────
//  IMATGE
// ─────────────────────────────────────────────────────────────
async function startImagePrediction() {
  const flip = true;
  webcam = new tmImage.Webcam(320, 320, flip);
  await webcam.setup({ facingMode: 'environment' });
  await webcam.play();

  const canvas = document.getElementById('canvas');
  const video = document.getElementById('video');
  
  canvas.width = webcam.canvas.width;
  canvas.height = webcam.canvas.height;
  video.style.display = 'none';  // amagar video nadiu

  window.requestAnimationFrame(loopImage);
}

async function loopImage() {
  webcam.update();
  const prediction = await model.predict(webcam.canvas);
  
  // Dibuixar webcam al canvas
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(webcam.canvas, 0, 0);

  if (onPredictionCallback) onPredictionCallback(prediction);
  window.requestAnimationFrame(loopImage);
}

// ─────────────────────────────────────────────────────────────
//  POSTURA
// ─────────────────────────────────────────────────────────────
async function startPosePrediction() {
  const flip = true;
  const size = 320;
  webcam = new tmPose.Webcam(size, size, flip);
  await webcam.setup({ facingMode: 'environment' });
  await webcam.play();

  const canvas = document.getElementById('canvas');
  const video = document.getElementById('video');
  
  canvas.width = size;
  canvas.height = size;
  video.style.display = 'none';

  window.requestAnimationFrame(loopPose);
}

async function loopPose() {
  webcam.update();
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  const prediction = await model.predict(posenetOutput);

  // Dibuixar webcam + skeleton
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(webcam.canvas, 0, 0);
  
  if (pose) {
    drawPose(pose, ctx);
  }

  if (onPredictionCallback) onPredictionCallback(prediction);
  window.requestAnimationFrame(loopPose);
}

function drawPose(pose, ctx) {
  if (pose.keypoints) {
    // Dibuixar punts clau
    ctx.fillStyle = '#00ff00';
    pose.keypoints.forEach(keypoint => {
      if (keypoint.score > 0.5) {
        ctx.beginPath();
        ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Dibuixar esquelet
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    const skeleton = pose.skeleton || [];
    skeleton.forEach(([start, end]) => {
      if (start.score > 0.5 && end.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.position.x, start.position.y);
        ctx.lineTo(end.position.x, end.position.y);
        ctx.stroke();
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────
//  MODELS DE MÀQUINA ENSENYABLE (imatge, postura, mans)
//  S'executen dins d'un iframe del mateix origen (maquina-runner.html) perquè
//  Màquina usa TF.js 4.15 i Teachable Machine 3.11; així no es barregen.
// ─────────────────────────────────────────────────────────────
let mqFrame = null, mqListener = null, mqLoadTimer = null;

function showCanvas() {
  const c = document.getElementById('canvas');
  if (c) c.style.display = '';
}

function stopMaquina() {
  clearTimeout(mqLoadTimer); mqLoadTimer = null;
  if (mqListener) { window.removeEventListener('message', mqListener); mqListener = null; }
  if (mqFrame) {
    try { mqFrame.contentWindow.postMessage({ type: 'stop' }, location.origin); } catch (e) {}
    mqFrame.remove();   // en descarregar la pàgina, la càmera s'atura
    mqFrame = null;
  }
}

// entry: model guardat (PIAR_MODELS) · facing: 'auto' | 'user' | 'environment'
async function loadMaquinaModel(entry, facing) {
  stopPrediction();
  model = null;
  modelType = entry.modelType;
  maxPredictions = entry.classNames.length;
  const fail = (code, message) => {
    stopMaquina(); showCanvas(); hideLoadingOverlay();
    const err = new Error(message || code); err.mqCode = code;
    if (onModelErrorCallback) onModelErrorCallback(err);
  };
  const title = _t('tm.overlay.title', { type: _t('tm.type.' + entry.modelType) });
  showLoadingOverlay(title, _t('tm.mq.stage_model'), undefined, NET_NOTE_LOADING);

  const container = document.getElementById('video-container');
  const frame = document.createElement('iframe');
  frame.id = 'mq-frame';
  frame.src = 'maquina-runner.html';
  frame.setAttribute('allow', 'camera');
  frame.title = entry.name;
  mqFrame = frame;
  document.getElementById('canvas').style.display = 'none';

  mqListener = e => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow) return;
    const m = e.data || {};
    if (m.type === 'loaded') {
      clearTimeout(mqLoadTimer);
      frame.contentWindow.postMessage({ type: 'start', entry, facing: facing || 'auto' }, location.origin);
    } else if (m.type === 'stage') {
      updateLoadingMessage(undefined, _t('tm.mq.stage_' + m.stage));
    } else if (m.type === 'ready') {
      hideLoadingOverlay();
      if (onModelReadyCallback) onModelReadyCallback();
    } else if (m.type === 'pred') {
      if (onPredictionCallback) onPredictionCallback(m.preds || []);
    } else if (m.type === 'error') {
      fail(m.code, m.message);
    }
  };
  window.addEventListener('message', mqListener);
  mqLoadTimer = setTimeout(() => fail('other', 'runner timeout'), 20000);
  container.appendChild(frame);
}

function setMaquinaCamera(facing) {
  if (mqFrame && mqFrame.contentWindow) mqFrame.contentWindow.postMessage({ type: 'facing', facing }, location.origin);
}

// ── Aturar predicció ─────────────────────────────────────────
function stopPrediction() {
  stopMaquina();
  if (webcam) {
    webcam.stop();
    webcam = null;
  }
}

// ── API pública ──────────────────────────────────────────────
function onPrediction(cb)   { onPredictionCallback  = cb; }
function onModelReady(cb)   { onModelReadyCallback  = cb; }
function onModelError(cb)   { onModelErrorCallback  = cb; }
function getMaxPredictions() { return maxPredictions; }
