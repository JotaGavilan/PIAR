// ============================================================
//  maquina_runner.js – Executa un model de Màquina Ensenyable dins de Teachable Microbit
//
//  Protocol (postMessage, mateix origen):
//   pare → runner:  {type:'start', entry:{modelType, classNames, payload}, facing:'auto'|'user'|'environment'}
//                   {type:'facing', facing}   {type:'stop'}
//   runner → pare:  {type:'loaded'} · {type:'stage', stage:'model'|'base'|'camera'}
//                   {type:'ready'} · {type:'pred', preds:[{className,probability}]}   (preds buit = sense detecció)
//                   {type:'error', code:'net'|'cam'|'bad'|'other', message}
// ============================================================
(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const post = m => { try { parent.postMessage(m, location.origin); } catch (e) {} };

  let head = null, entry = null, type = null;
  let base = null, posenetModel = null, hands = null, handsResolve = null;
  let stream = null, video = null, running = false, session = 0;

  const PREDICT_EVERY_MS = { image: 120, pose: 150, hands: 120 };
  const HAND_CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  const POSE_ADJ = [[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];

  function fail(code, e) { running = false; post({ type: 'error', code, message: String((e && e.message) || e || '') }); }
  function isNet(e) { return /fetch|network|load failed|failed to load|http|offline|timeout|ERR_/i.test(String((e && e.message) || e || '')); }

  async function loadHead(payload) {
    const bin = atob(payload.weightData), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return tf.loadLayersModel(tf.io.fromMemory(payload.topology, payload.weightSpecs, bytes.buffer));
  }

  async function ensureBase() {
    if (type === 'image' && !base) { post({ type: 'stage', stage: 'base' }); base = await mobilenet.load({ version: 2, alpha: .5 }); }
    else if (type === 'pose' && !posenetModel) { post({ type: 'stage', stage: 'base' }); posenetModel = await posenet.load({ architecture: 'MobileNetV1', outputStride: 16, inputResolution: 193, multiplier: .75 }); }
    else if (type === 'hands' && !hands) {
      hands = new Hands({ locateFile: f => '../vendor/mediapipe-hands/' + f });
      hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: .5, minTrackingConfidence: .5 });
      hands.onResults(r => { if (handsResolve) { const f = handsResolve; handsResolve = null; f(r); } });
    }
  }

  function facingFor(f) { return f === 'user' || f === 'environment' ? f : (type === 'image' ? 'environment' : 'user'); }

  async function openCamera(facing) {
    closeCamera();
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingFor(facing) }, audio: false });
    video = document.createElement('video');
    video.srcObject = stream; video.muted = true; video.playsInline = true; video.autoplay = true;
    await new Promise(res => { video.onloadedmetadata = res; });
    try { await video.play(); } catch (e) {}
    canvas.width = video.videoWidth || 320; canvas.height = video.videoHeight || 320;
  }
  function closeCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; video = null;
  }

  function softmaxToPreds(data) {
    return Array.from(data).map((p, i) => ({ className: entry.classNames[i], probability: p }));
  }

  function drawMirrored(draw) {
    ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1); draw(); ctx.restore();
  }

  // Un fotograma segons el tipus. Torna les prediccions o null (sense detecció).
  async function step() {
    if (type === 'image') {
      // Mateix preprocessat que en Màquina: 224×224 mirallat, valors entre -1 i 1
      const c = document.createElement('canvas'); c.width = 224; c.height = 224;
      const k = c.getContext('2d'); k.save(); k.translate(224, 0); k.scale(-1, 1); k.drawImage(video, 0, 0, 224, 224); k.restore();
      const out = tf.tidy(() => head.predict(base.infer(tf.browser.fromPixels(c).toFloat().div(127.5).sub(1).expandDims(0), true)));
      const data = await out.data(); out.dispose();
      drawMirrored(() => ctx.drawImage(video, 0, 0, canvas.width, canvas.height));
      return softmaxToPreds(data);
    }
    if (type === 'pose') {
      // Coordenades sense mirall (com en entrenar); només el dibuix es mostra mirallat
      const pose = await posenetModel.estimateSinglePose(video, { flipHorizontal: false });
      drawMirrored(() => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#a89cff';
        pose.keypoints.forEach(p => { if (p.score > .3) { ctx.beginPath(); ctx.arc(p.position.x, p.position.y, 5, 0, 2 * Math.PI); ctx.fill(); } });
        ctx.strokeStyle = 'rgba(168,156,255,.8)'; ctx.lineWidth = 2;
        POSE_ADJ.forEach(([a, b]) => { const A = pose.keypoints[a], B = pose.keypoints[b]; if (A.score > .3 && B.score > .3) { ctx.beginPath(); ctx.moveTo(A.position.x, A.position.y); ctx.lineTo(B.position.x, B.position.y); ctx.stroke(); } });
      });
      const kp = pose.keypoints.map(p => [p.position.x / video.videoWidth, p.position.y / video.videoHeight, p.score]);
      const inp = tf.tensor2d([kp.flat()]); const out = head.predict(inp);
      const data = await out.data(); inp.dispose(); out.dispose();
      return softmaxToPreds(data);
    }
    // hands
    const res = await new Promise((resolve, reject) => {
      handsResolve = resolve;
      hands.send({ image: video }).catch(e => { handsResolve = null; reject(e); });
    });
    drawMirrored(() => ctx.drawImage(video, 0, 0, canvas.width, canvas.height));
    const lm = res && res.multiHandLandmarks && res.multiHandLandmarks[0];
    if (!lm) return null;
    drawMirrored(() => {
      const w = canvas.width, h = canvas.height;
      ctx.strokeStyle = 'rgba(74,222,128,.85)'; ctx.lineWidth = 2;
      HAND_CONNECTIONS.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(lm[a].x * w, lm[a].y * h); ctx.lineTo(lm[b].x * w, lm[b].y * h); ctx.stroke(); });
      ctx.fillStyle = '#4ade80';
      lm.forEach(p => { ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 4, 0, 2 * Math.PI); ctx.fill(); });
    });
    const inp = tf.tensor2d([lm.map(p => [p.x, p.y]).flat()]); const out = head.predict(inp);
    const data = await out.data(); inp.dispose(); out.dispose();
    return softmaxToPreds(data);
  }

  async function loop(my) {
    while (running && my === session) {
      const t0 = performance.now();
      if (video && video.readyState >= 2) {
        try {
          const preds = await step();
          if (running && my === session) post({ type: 'pred', preds: preds || [] });
        } catch (e) { /* fotograma fallit: es reintenta */ }
      }
      const wait = PREDICT_EVERY_MS[type] - (performance.now() - t0);
      await new Promise(r => setTimeout(r, Math.max(30, wait)));
    }
  }

  async function start(msg) {
    const my = ++session;
    running = false;
    try {
      entry = msg.entry; type = entry.modelType;
      if (!['image', 'pose', 'hands'].includes(type)) { fail('bad', 'type'); return; }
      post({ type: 'stage', stage: 'model' });
      if (head && head.dispose) head.dispose();
      try { head = await loadHead(entry.payload); }
      catch (e) { fail('bad', e); return; }
      try { await ensureBase(); }
      catch (e) { fail(isNet(e) ? 'net' : 'other', e); return; }
      post({ type: 'stage', stage: 'camera' });
      try { await openCamera(msg.facing); }
      catch (e) { fail('cam', e); return; }
      if (my !== session) return;
      running = true;
      post({ type: 'ready' });
      loop(my);
    } catch (e) { fail('other', e); }
  }

  window.addEventListener('message', async e => {
    if (e.origin !== location.origin || e.source !== parent) return;
    const m = e.data || {};
    if (m.type === 'start') start(m);
    else if (m.type === 'facing' && running) { try { await openCamera(m.facing); } catch (err) { fail('cam', err); } }
    else if (m.type === 'stop') { running = false; session++; closeCamera(); }
  });
  window.addEventListener('pagehide', closeCamera);
  post({ type: 'loaded' });
})();
