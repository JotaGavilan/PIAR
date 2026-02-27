// ============================================================
//  model_loader.js – Carregador de models Teachable Machine
//  Suporta: Image, Audio, Pose
// ============================================================

let model = null;
let modelType = null;
let maxPredictions = 0;
let webcam = null;
let audioContext = null;
let recognizer = null;

let onPredictionCallback = null;
let onModelReadyCallback = null;
let onModelErrorCallback = null;

// ── Carregar model ───────────────────────────────────────────
async function loadModel(url, type) {
  try {
    stopPrediction();
    model = null;
    modelType = type;

    const modelURL = url + 'model.json';
    const metadataURL = url + 'metadata.json';

    // Mostrar capa de càrrega segons el tipus
    const typeLabels = { image: '🖼️ Imatge', audio: '🎤 Àudio', pose: '🧍 Postura' };
    showLoadingOverlay(
      `Carregant model de ${typeLabels[type]}...`,
      'Descarregant des de Teachable Machine. Això pot trigar uns segons.'
    );

    if (type === 'image') {
      model = await tmImage.load(modelURL, metadataURL);
      maxPredictions = model.getTotalClasses();
      await startImagePrediction();

    } else if (type === 'audio') {
      model = await tmAudio.load(modelURL, metadataURL);
      maxPredictions = model.getTotalClasses();
      await startAudioPrediction();

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
//  AUDIO
// ─────────────────────────────────────────────────────────────
async function startAudioPrediction() {
  recognizer = model;

  // Teachable Machine Audio usa la seua pròpia API listen()
  // Necessita que l'usuari haja interactuat primer (política autoplay)
  await recognizer.listen(
    prediction => {
      if (onPredictionCallback) onPredictionCallback(prediction.scores.map((score, i) => ({
        className: recognizer.wordLabels()[i],
        probability: score
      })));
    },
    {
      includeSpectrogram: false,
      probabilityThreshold: 0.75,
      invokeCallbackOnNoiseAndUnknown: true,
      overlapFactor: 0.50
    }
  );
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

// ── Aturar predicció ─────────────────────────────────────────
function stopPrediction() {
  if (webcam) {
    webcam.stop();
    webcam = null;
  }
  if (recognizer && recognizer.isListening && recognizer.isListening()) {
    recognizer.stopListening();
    recognizer = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

// ── API pública ──────────────────────────────────────────────
function onPrediction(cb)   { onPredictionCallback  = cb; }
function onModelReady(cb)   { onModelReadyCallback  = cb; }
function onModelError(cb)   { onModelErrorCallback  = cb; }
function getMaxPredictions() { return maxPredictions; }
