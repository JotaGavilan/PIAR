// ============================================================
//  vision.js – JEmo: càmera + models locals (tot passa dins del dispositiu)
//   · Cara  → «xarxa»  : face-api (detector petit + xarxa d'expressions) ← pesos dins de /vendor/
//           → «malla»  : MediaPipe Face Mesh (punts de la cara) + regles ← dins de /vendor/
//  Cada model es carrega només quan es necessita. Cap model es baixa d'Internet: tot va dins de PIAR.
// ============================================================
(function (root) {
  'use strict';
  const J = root.JEmo;
  const VENDOR = '../vendor/';
  const loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    return (loaded[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = () => res(); s.onerror = () => { delete loaded[src]; rej(Object.assign(new Error('lib-missing'), { code: 'lib', src })); };
      document.head.appendChild(s);
    }));
  }
  const err = (code, msg) => Object.assign(new Error(msg || code), { code });

  // ── Cara: xarxa d'expressions (face-api) ─────────────────
  let faceNet = null;
  async function loadFaceNet(onProgress) {
    if (faceNet) return faceNet;
    return (faceNet = (async () => {
      await loadScript(VENDOR + 'face-api-1.7.15/face-api.js');
      if (!root.faceapi) throw err('lib');
      const dir = new URL(VENDOR + 'face-api-1.7.15/model', location.href).href;
      const tf = root.faceapi.tf;     // WebGL si n'hi ha; si no, CPU (així no es busca el motor wasm, que no s'inclou)
      try { await tf.setBackend('webgl'); } catch (e) {}
      if (tf.getBackend() !== 'webgl') { try { await tf.setBackend('cpu'); } catch (e) {} }
      await tf.ready();
      await Promise.all([root.faceapi.nets.tinyFaceDetector.loadFromUri(dir), root.faceapi.nets.faceExpressionNet.loadFromUri(dir)]);
      return root.faceapi;
    })().catch((e) => { faceNet = null; throw e; }));
  }
  async function detectNet(video) {
    const fa = await loadFaceNet();
    const opt = new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
    const r = await fa.detectSingleFace(video, opt).withFaceExpressions();
    if (!r) return null;
    const b = r.detection.box;
    return { scores: J.scoresFromFaceApi(r.expressions), box: { x: b.x, y: b.y, w: b.width, h: b.height }, score: r.detection.score };
  }

  // ── Cara: malla (MediaPipe Face Mesh) ────────────────────
  let mesh = null, meshCb = null;
  async function loadMesh() {
    if (mesh) return mesh;
    return (mesh = (async () => {
      await loadScript(VENDOR + 'mediapipe-face_mesh/face_mesh.js');
      if (!root.FaceMesh) throw err('lib');
      const fm = new root.FaceMesh({ locateFile: (f) => VENDOR + 'mediapipe-face_mesh/' + f });
      fm.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      fm.onResults((r) => { if (meshCb) { const c = meshCb; meshCb = null; c(r); } });
      if (fm.initialize) await fm.initialize();
      return fm;
    })().catch((e) => { mesh = null; throw e; }));
  }
  async function detectMesh(video, baseline) {
    const fm = await loadMesh();
    const r = await new Promise((resolve) => {
      let done = false;
      const fin = (v) => { if (!done) { done = true; resolve(v); } };
      meshCb = fin;
      Promise.resolve(fm.send({ image: video })).then(() => setTimeout(() => fin(null), 50), () => fin(null));
    });
    if (!r || !r.multiFaceLandmarks || !r.multiFaceLandmarks.length) return null;
    const lm = r.multiFaceLandmarks[0], W = video.videoWidth, H = video.videoHeight;
    const f = J.faceFeatures(lm, W, H);
    let minx = 1, miny = 1, maxx = 0, maxy = 0;
    lm.forEach((p) => { if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x; if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y; });
    return { scores: J.scoresFromFeatures(f, baseline), features: f, landmarks: lm, box: { x: minx * W, y: miny * H, w: (maxx - minx) * W, h: (maxy - miny) * H }, score: 1 };
  }

  // ── Càmera ───────────────────────────────────────────────
  let stream = null;
  async function startCamera(video, facing) {
    stopCamera(video);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw err('nocam');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing || 'user' }, width: { ideal: 640 }, height: { ideal: 480 } } });
    } catch (e) { throw err(e && e.name === 'NotAllowedError' ? 'denied' : e && e.name === 'NotFoundError' ? 'nocam' : 'camfail', e && e.message); }
    video.srcObject = stream; video.muted = true; video.playsInline = true;
    await new Promise((r) => { if (video.readyState >= 1) r(); else video.onloadedmetadata = () => r(); });
    try { await video.play(); } catch (e) {}
    const track = stream.getVideoTracks()[0];
    const st = track && track.getSettings ? track.getSettings() : {};
    return { facing: st.facingMode || facing || 'user' };
  }
  function stopCamera(video) {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (video) video.srcObject = null;
  }

  // ── Bucle de lectura ─────────────────────────────────────
  // Una sola inferència cada vegada (el mòbil no pot amb dos models alhora).
  //   cfg(): { engine:'net'|'mesh', baseline }
  //   hooks: onFace(res|null), onError(kind, e), onStatus(kind,'loading'|'ready')
  function createLoop(video, cfg, hooks) {
    let running = false, token = 0, due = 0, ready = false;
    const EVERY = 110, BACKOFF = 8000;
    async function step(fn) {
      try {
        if (!ready) hooks.onStatus && hooks.onStatus('face', 'loading');
        const r = await fn();
        if (!ready) { ready = true; hooks.onStatus && hooks.onStatus('face', 'ready'); }
        hooks.onFace(r);
        due = performance.now() + EVERY;
      } catch (e) {
        due = performance.now() + BACKOFF;
        if (hooks.onError) hooks.onError('face', e);
      }
    }
    async function run(my) {
      while (running && my === token) {
        if (video.readyState < 2 || !video.videoWidth) { await new Promise((r) => setTimeout(r, 80)); continue; }
        if (performance.now() < due) { await new Promise((r) => setTimeout(r, 25)); continue; }
        const c = cfg();
        await step(() => (c.engine === 'mesh' ? detectMesh(video, c.baseline) : detectNet(video)));
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
    return {
      start() { if (running) return; running = true; due = 0; run(++token); },
      stop() { running = false; token++; },
      get running() { return running; },
      resetReady() { ready = false; due = 0; }
    };
  }

  // ── Dibuix sobre el vídeo (coordenades del vídeo) ────────
  const GREEN = '#4df5a0', GREEN2 = '#a8ffd6';
  function draw(canvas, video, o) {
    const W = video.videoWidth || 640, H = video.videoHeight || 480;
    if (canvas.width !== W) canvas.width = W; if (canvas.height !== H) canvas.height = H;
    const g = canvas.getContext('2d'); g.clearRect(0, 0, W, H);
    g.lineWidth = Math.max(2, W / 200); g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.face && o.face.box) {
      const b = o.face.box, k = Math.min(b.w, b.h) * .22;
      g.strokeStyle = GREEN; g.shadowColor = GREEN; g.shadowBlur = 8;
      [[b.x, b.y, 1, 1], [b.x + b.w, b.y, -1, 1], [b.x, b.y + b.h, 1, -1], [b.x + b.w, b.y + b.h, -1, -1]].forEach(([x, y, dx, dy]) => {
        g.beginPath(); g.moveTo(x, y + dy * k); g.lineTo(x, y); g.lineTo(x + dx * k, y); g.stroke();
      });
      if (o.face.landmarks) {
        g.shadowBlur = 0; g.fillStyle = GREEN2;
        o.face.landmarks.forEach((p, i) => { if (i % 3 === 0) { g.beginPath(); g.arc(p.x * W, p.y * H, W / 400 + 1, 0, 6.3); g.fill(); } });
      }
    }
  }

  root.JEmoVision = {
    loadFaceNet, loadMesh, startCamera, stopCamera, createLoop, draw
  };
})(window);
