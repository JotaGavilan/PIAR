// ============================================================
//  detection_engine.js  –  Motor de detecció d'objectes
//  RobHort – El guardià del teu bancal
//
//  Tres modes basats en COCO-SSD (TensorFlow.js):
//    · lite      → lite_mobilenet_v2, llindar 0.25 (ràpid)
//    · precise   → mobilenet_v2,      llindar 0.20 (precís)
//    · distance  → mobilenet_v2,      llindar 0.12 + tile (distància)
//
//  El mode "distance" divideix el fotograma en 4 quadrants i
//  fa la detecció sobre cadascun ampliat, permetent detectar
//  objectes llunyans que ocupen pocs píxels en el fotograma complet.
// ============================================================

const CATEGORIES = ['cat', 'bird', 'person'];

const TRANSLATIONS = {
  cat:    'gat',
  bird:   'ocell',
  person: 'persona',
};

const MODELS = {
  lite: {
    type:            'cocossd',
    base:            'lite_mobilenet_v2',
    label:           '⚡ Ràpid',
    description:     'Funciona bé fins a ~1,5 m. Ideal per a mòbils antics o amb poca bateria.',
    score_threshold: 0.25,
    tiled:           false,
  },
  precise: {
    type:            'cocossd',
    base:            'mobilenet_v2',
    label:           '🔍 Precís',
    description:     'Millor en angles difícils i moviment. Una mica més lent que el Ràpid.',
    score_threshold: 0.20,
    tiled:           false,
  },
  distance: {
    type:            'cocossd',
    base:            'mobilenet_v2',
    label:           '🚀 Llarga distància',
    description:     'Detecta fins a ~3-4 m dividint la imatge en zones. Més lent.',
    score_threshold: 0.15,
    tiled:           true,
  },
};

let currentModelKey = 'lite';

let model         = null;
let isRunning     = false;
let detectionLoop = null;

let onDetectionCallback  = null;
let onModelReadyCallback = null;
let onModelErrorCallback = null;

// Canvas per al mode tiled
const tileCanvas = document.createElement('canvas');
const tileCtx    = tileCanvas.getContext('2d', { willReadFrequently: true });

// ─────────────────────────────────────────────────────────────
async function initModel(modelKey) {
  // Si el canvi de model falla (p. ex. no hi ha Internet), tornem al model
  // anterior en lloc de deixar l'app sense cap model carregat.
  const prevKey   = currentModelKey;
  const prevModel = model;
  if (modelKey) currentModelKey = modelKey;
  const cfg = MODELS[currentModelKey];
  stopDetection();

  // Mostrar capa de càrrega
  showLoadingOverlay(`Carregant model ${cfg.label}...`, cfg.description, '🔍',
    prevModel ? NET_NOTE_CHANGE_MODEL + ' ' + NET_NOTE_LOADING : NET_NOTE_LOADING);

  try {
    const loaded = await cocoSsd.load({ base: cfg.base });
    model = loaded;
    // Petit retard per assegurar que l'usuari veu el missatge
    setTimeout(() => {
      hideLoadingOverlay();
      if (onModelReadyCallback) onModelReadyCallback();
    }, 500);
    return true;
  } catch (e) {
    console.error('❌ Error carregant el model:', e);
    currentModelKey = prevKey;
    model = prevModel;
    hideLoadingOverlay();
    if (onModelErrorCallback) onModelErrorCallback(e, !!prevModel);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
function startDetection(videoEl, intervalMs) {
  if (isRunning) stopDetection();
  isRunning = true;

  async function detect() {
    if (!isRunning || !model) return;
    if (videoEl.readyState < 2) {
      detectionLoop = setTimeout(detect, 200);
      return;
    }
    try {
      const cfg = MODELS[currentModelKey];
      const results = cfg.tiled
        ? await detectTiled(videoEl, cfg)
        : await detectDirect(videoEl, cfg);
      if (onDetectionCallback) onDetectionCallback(results);
    } catch (e) {
      console.error('❌ Error en detecció:', e);
    }
    detectionLoop = setTimeout(detect, intervalMs);
  }

  detect();
}

function stopDetection() {
  isRunning = false;
  if (detectionLoop) clearTimeout(detectionLoop);
}

// ─────────────────────────────────────────────────────────────
//  DETECCIÓ DIRECTA (modes lite i precise)
// ─────────────────────────────────────────────────────────────
async function detectDirect(videoEl, cfg) {
  const predictions = await model.detect(videoEl);
  return predictions
    .filter(p => CATEGORIES.includes(p.class) && p.score >= cfg.score_threshold)
    .map(p => ({
      class: p.class,
      label: TRANSLATIONS[p.class] || p.class,
      score: Math.round(p.score * 100),
      bbox:  p.bbox,
    }));
}

// ─────────────────────────────────────────────────────────────
//  DETECCIÓ PER ZONES (mode distance)
// ─────────────────────────────────────────────────────────────
async function detectTiled(videoEl, cfg) {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const tw = Math.round(vw / 2);
  const th = Math.round(vh / 2);

  tileCanvas.width  = tw;
  tileCanvas.height = th;

  const tiles = [
    { sx: 0,  sy: 0,  ox: 0,  oy: 0  },
    { sx: tw, sy: 0,  ox: tw, oy: 0  },
    { sx: 0,  sy: th, ox: 0,  oy: th },
    { sx: tw, sy: th, ox: tw, oy: th },
  ];

  const allDetections = [];

  // Detecció sobre cada quadrant
  for (const tile of tiles) {
    tileCtx.clearRect(0, 0, tw, th);
    tileCtx.drawImage(videoEl, tile.sx, tile.sy, tw, th, 0, 0, tw, th);
    const preds = await model.detect(tileCanvas);
    preds
      .filter(p => CATEGORIES.includes(p.class) && p.score >= cfg.score_threshold)
      .forEach(p => allDetections.push({
        class: p.class,
        label: TRANSLATIONS[p.class] || p.class,
        score: Math.round(p.score * 100),
        _rawScore: p.score,
        bbox: [
          p.bbox[0] + tile.ox,
          p.bbox[1] + tile.oy,
          p.bbox[2],
          p.bbox[3],
        ],
      }));
  }

  // NMS per classe (evita eliminar persones diferents)
  return nmsByClass(allDetections, 0.20);
}

// NMS aplicat per classe per separat
function nmsByClass(dets, iouThresh) {
  const byClass = {};
  dets.forEach(d => {
    if (!byClass[d.class]) byClass[d.class] = [];
    byClass[d.class].push(d);
  });
  const result = [];
  Object.values(byClass).forEach(group => {
    result.push(...nms(group, iouThresh));
  });
  return result;
}

// NMS simple
function nms(dets, iouThresh) {
  dets.sort((a, b) => b.score - a.score);
  const keep = [];
  const used = new Array(dets.length).fill(false);
  for (let i = 0; i < dets.length; i++) {
    if (used[i]) continue;
    keep.push(dets[i]);
    for (let j = i + 1; j < dets.length; j++) {
      if (!used[j] && iou(dets[i].bbox, dets[j].bbox) > iouThresh) {
        used[j] = true;
      }
    }
  }
  return keep;
}

function iou(a, b) {
  const ax2 = a[0]+a[2], ay2 = a[1]+a[3];
  const bx2 = b[0]+b[2], by2 = b[1]+b[3];
  const ix  = Math.max(0, Math.min(ax2,bx2) - Math.max(a[0],b[0]));
  const iy  = Math.max(0, Math.min(ay2,by2) - Math.max(a[1],b[1]));
  const inter = ix * iy;
  const union = a[2]*a[3] + b[2]*b[3] - inter;
  return union > 0 ? inter / union : 0;
}

// ── API pública ───────────────────────────────────────────────
function onDetection(cb)    { onDetectionCallback   = cb; }
function onModelReady(cb)   { onModelReadyCallback  = cb; }
function onModelError(cb)   { onModelErrorCallback  = cb; }
function getCategories()    { return CATEGORIES; }
function getTranslations()  { return TRANSLATIONS; }
function getModels()        { return MODELS; }
function getCurrentModel()  { return currentModelKey; }
