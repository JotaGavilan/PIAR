// ============================================================
//  script.js – JEmo (cara i cos amb emoció)
//  Càmera → models locals → emoció (E0–E6) i gest (G0–G6) suavitzats → text curt → Bluetooth UART → micro:bit
// ============================================================
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const J = window.JEmo, V = window.JEmoVision;

  // ── Configuració i calibratge (es guarden al dispositiu) ──
  const CFG_KEY = 'jemo.cfg.v1', CAL_KEY = 'jemo.cal.v1';
  const DEF = { read: 'both', engine: 'net', boost: true, smooth: 6, minConf: 40, tilt: 15, mode: 'change', period: 5, intensity: true, codes: {}, facing: 'user' };
  const cfg = Object.assign({}, DEF);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) {}
  if (!cfg.codes || typeof cfg.codes !== 'object') cfg.codes = {};
  let cal = { face: null, posture: null };
  try { Object.assign(cal, JSON.parse(localStorage.getItem(CAL_KEY) || '{}')); } catch (e) {}
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };
  const saveCal = () => { try { localStorage.setItem(CAL_KEY, JSON.stringify(cal)); } catch (e) {} };
  const fmtSec = (s) => { const t = s.toFixed(1); return t.replace('.', PIAR_I18N.lang === 'en' ? '.' : ','); };

  // ── Estat: missatges de la barra inferior (funció, per a retraduir-los) ──
  const BT_STATUS_KEYS = ['sh.bt.ios_status', 'sh.bt.unsupported_status', 'sh.bt.searching', 'sh.bt.ok', 'sh.bt.error', 'sh.bt.disconnected'];
  let camOn = false;
  const idleStatus = () => (!camOn ? _t('je.st.start') : isBluetoothConnected() ? _t('je.st.running_bt') : _t('je.st.running_nobt'));
  let statusFn = idleStatus;
  const _writeStatus = setStatusText;
  function paintTone() {
    const el = $('status-text'); if (!el) return;
    const t = el.textContent.trim();
    el.classList.toggle('msg-ok', /^(✅|🤖)/u.test(t));
    el.classList.toggle('msg-err', /^❌/u.test(t));
    el.classList.toggle('msg-warn', /^(⚠|🌐)/u.test(t));
  }
  function showStatus(fn) { statusFn = fn; _writeStatus(fn()); paintTone(); }
  function showTranslatedStatus(msg) {
    const key = BT_STATUS_KEYS.find((k) => _t(k) === msg);
    showStatus(key ? () => _t(key) : () => msg);
  }
  setStatusText = showTranslatedStatus;          // bluetooth_uart.js crida setStatusText(...)
  const toIdle = () => showStatus(idleStatus);

  // ── Suavitzat i enviament ─────────────────────────────────
  const smoothMs = () => cfg.smooth * 100;
  const emoSm = J.makeSmoother(7, { alpha: .35, holdMs: smoothMs(), minConf: cfg.minConf / 100 });
  const gesHold = J.makeLabelHold({ holdMs: Math.round(smoothMs() * .7) });
  const poseState = J.makePoseState();
  function applyTuning() {
    emoSm.setOptions({ holdMs: smoothMs(), minConf: cfg.minConf / 100 });
    gesHold.setOptions({ holdMs: Math.round(smoothMs() * .7) });
  }
  const FACE_LOST_MS = 1500;
  let lastFaceT = 0, lastPoseT = 0, faceRes = null, poseRes = null, lastBodyVisible = false, boosted = false;
  let sentLog = [];
  const sentLines = [];                          // per a les proves

  const sender = J.makeSender((line, kind, id, changed) => {
    const bt = isBluetoothConnected();
    if (bt) sendUARTData(line);
    sentLines.push(line);
    if (changed || !sentLog.length || sentLog[0].kind !== kind) {
      sentLog.unshift({ line, kind, bt, t: new Date() });
    } else { sentLog[0].line = line; sentLog[0].t = new Date(); sentLog[0].bt = bt; }
    sentLog = sentLog.slice(0, 4);
    paintSent();
  });
  const sendCfg = () => ({ mode: cfg.mode, periodMs: cfg.period * 100, intensity: cfg.intensity, codes: cfg.codes });

  function currentState() {
    const now = performance.now();
    const st = { E: null, G: null };
    if (cfg.read !== 'body') {
      if (lastFaceT && now - lastFaceT <= FACE_LOST_MS && emoSm.current !== null) st.E = { id: emoSm.current, pct: emoSm.scores[emoSm.current] * 100 };
      else if (camOn && readyKinds.face && (!lastFaceT || now - lastFaceT > FACE_LOST_MS)) st.E = { id: J.NOFACE, pct: 0 };
    }
    if (cfg.read !== 'face' && gesHold.current !== null) st.G = { id: gesHold.current, pct: gesHold.pct || 0 };
    return st;
  }

  // ── Resultats dels models ─────────────────────────────────
  function onFace(r) {
    const now = performance.now();
    faceRes = r;
    if (!r) { paintOverlay(); return; }
    lastFaceT = now;
    let scores = r.scores; boosted = false;
    if (cfg.boost && cfg.read === 'both' && gesHold.current) {
      const rf = J.reinforce(scores, gesHold.current, 1); scores = rf.scores; boosted = rf.boosted;
    }
    emoSm.push(scores, now);
    if (calSession && r.features) calSession.face.push(r.features);
    paintOverlay();
  }
  function onPose(r) {
    const now = performance.now();
    poseRes = r;
    if (!r) { lastBodyVisible = false; gesHold.push(0, 0, now); gesHold.pct = 0; paintOverlay(); return; }
    const cls = J.classifyPose(r.keypoints, poseState, { baseline: { posture: cal.posture }, tiltDeg: cfg.tilt, t: Date.now() });
    lastBodyVisible = cls.visible; lastPoseT = now;
    const out = gesHold.push(cls.id, cls.conf, now);
    gesHold.pct = out.conf;
    if (calSession && cls.visible) { const p = J.posture(J.kpMap(r.keypoints)); if (p !== null) calSession.posture.push(p); }
    paintOverlay();
  }
  gesHold.pct = 0;

  // ── Pintar ────────────────────────────────────────────────
  const emoName = (id) => _t('je.emo.' + id);
  const gesName = (id) => _t('je.ges.' + id);
  function buildProbs() {
    const box = $('probs'); box.innerHTML = '';
    J.EMOTIONS.forEach((e) => {
      const d = document.createElement('div'); d.className = 'pb'; d.dataset.id = e.id;
      d.innerHTML = '<span class="pe">' + e.emoji + '</span><span class="pv"><i></i></span>';
      box.appendChild(d);
    });
  }
  function paintOverlay() {
    const v = $('video');
    try { V.draw($('overlay'), v, { face: cfg.read !== 'body' && performance.now() - lastFaceT < 600 ? faceRes : null, pose: cfg.read !== 'face' ? poseRes : null }); } catch (e) {}
  }
  function paintReadout() {
    const st = currentState();
    // emoció
    const eOff = cfg.read === 'body';
    $('emoCard').classList.toggle('off', eOff);
    if (eOff || !st.E) {
      $('emoEmoji').textContent = '😐'; $('emoName').textContent = eOff ? _t('je.read.off') : '–'; $('emoCode').textContent = '–'; $('emoBar').style.width = '0%';
    } else if (st.E.id === J.NOFACE) {
      $('emoEmoji').textContent = '🫥'; $('emoName').textContent = _t('je.read.face_nf'); $('emoCode').textContent = J.formatLine('E', J.NOFACE, 0, sendCfg()); $('emoBar').style.width = '0%';
    } else {
      const e = J.EMOTIONS[st.E.id];
      $('emoEmoji').textContent = e.emoji; $('emoName').textContent = emoName(e.id);
      $('emoCode').textContent = J.formatLine('E', e.id, st.E.pct, sendCfg()); $('emoBar').style.width = Math.round(st.E.pct) + '%';
    }
    $('boostChip').hidden = !(boosted && cfg.boost && cfg.read === 'both' && st.E && st.E.id !== J.NOFACE);
    // gest
    const gOff = cfg.read === 'face';
    $('gesCard').classList.toggle('off', gOff);
    if (gOff) { $('gesEmoji').textContent = '🧍'; $('gesName').textContent = _t('je.read.off'); $('gesCode').textContent = '–'; $('gesBar').style.width = '0%'; }
    else if (camOn && readyKinds.pose && !lastBodyVisible && (!st.G || st.G.id === 0)) {
      $('gesEmoji').textContent = '🫥'; $('gesName').textContent = _t('je.read.body_nf'); $('gesCode').textContent = st.G ? J.formatLine('G', 0, 0, sendCfg()) : '–'; $('gesBar').style.width = '0%';
    } else if (st.G) {
      const g = J.GESTURES[st.G.id];
      $('gesEmoji').textContent = g.emoji; $('gesName').textContent = gesName(g.id);
      $('gesCode').textContent = J.formatLine('G', g.id, st.G.pct, sendCfg()); $('gesBar').style.width = (g.id ? Math.round(st.G.pct) : 0) + '%';
    } else { $('gesEmoji').textContent = '🧍'; $('gesName').textContent = '–'; $('gesCode').textContent = '–'; $('gesBar').style.width = '0%'; }
    // barres de probabilitat
    const sc = emoSm.scores, cur = st.E ? st.E.id : -1;
    document.querySelectorAll('#probs .pb').forEach((el) => {
      const id = +el.dataset.id, show = cfg.read !== 'body' && st.E && st.E.id !== J.NOFACE;
      el.querySelector('i').style.height = (show ? Math.round(sc[id] * 100) : 0) + '%';
      el.classList.toggle('on', id === cur);
      el.title = emoName(id) + (show ? ' ' + Math.round(sc[id] * 100) + ' %' : '');
    });
  }
  function paintSent() {
    const box = $('sentLog');
    if (!sentLog.length) { box.innerHTML = '<span class="sent-none">' + _t('je.sent.none') + '</span>'; return; }
    box.innerHTML = '';
    sentLog.forEach((s, i) => {
      const row = document.createElement('div'); row.className = 'sent-row' + (i === 0 ? ' now' : '');
      const code = document.createElement('code'); code.textContent = s.line;
      const t = document.createElement('span'); t.className = 'sent-t';
      t.textContent = s.t.toLocaleTimeString(PIAR_I18N.lang === 'en' ? 'en-GB' : 'ca-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + (s.bt ? '' : ' · ' + _t('je.sent.nobt'));
      row.appendChild(code); row.appendChild(t); box.appendChild(row);
    });
  }

  // ── Calibratge ────────────────────────────────────────────
  let calSession = null;
  function median(a) { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
  $('calBtn').addEventListener('click', () => {
    if (!camOn) { showStatus(() => _t('je.st.start')); return; }
    if (calSession) return;
    calSession = { face: [], posture: [] };
    showStatus(() => _t('je.cal.busy'));
    setTimeout(() => {
      const c = calSession; calSession = null;
      let gotFace = false, gotBody = false;
      if (c.face.length >= 5) { cal.face = J.averageFeatures(c.face); gotFace = true; }
      if (c.posture.length >= 5) { cal.posture = median(c.posture); gotBody = true; }
      if (gotFace || gotBody) saveCal();
      showStatus(() => _t(gotFace && gotBody ? 'je.cal.ok' : gotFace ? 'je.cal.ok_face' : gotBody ? 'je.cal.ok_body' : 'je.cal.fail'));
      refreshCalState();
      setTimeout(toIdle, 4000);
    }, 2200);
  });
  $('calReset').addEventListener('click', () => { cal = { face: null, posture: null }; saveCal(); refreshCalState(); showStatus(() => _t('je.cal.cleared')); setTimeout(toIdle, 2500); });
  function refreshCalState() { $('calState').textContent = _t(cal.face || cal.posture ? 'je.cfg.cal_state_yes' : 'je.cfg.cal_state_no'); }

  // ── Càmera i bucle ────────────────────────────────────────
  const video = $('video');
  let facing = cfg.facing || 'user';
  const needed = () => (cfg.read === 'both' ? ['face', 'pose'] : cfg.read === 'face' ? ['face'] : ['pose']);
  const readyKinds = {}, failedKinds = {};
  function setCamAlert(text) { const a = $('cam-alert'); a.hidden = !text; a.textContent = text || ''; }
  function checkLoading() {
    const pending = needed().some((k) => !readyKinds[k] && !failedKinds[k]);
    if (camOn) setCamAlert(pending ? _t('je.cam.loading') : '');
    if (camOn && pending) showStatus(() => _t('je.st.loading')); else if (camOn && /^⏳/.test($('status-text').textContent)) toIdle();
  }
  const loop = V.createLoop(video, () => ({ read: cfg.read, engine: cfg.engine, baseline: cal.face }), {
    onFace, onPose,
    onStatus: (kind, st) => { readyKinds[kind] = st === 'ready'; if (st === 'ready') failedKinds[kind] = false; checkLoading(); },
    onError: (kind, e) => {
      console.warn('JEmo model error', kind, e);
      readyKinds[kind] = false; failedKinds[kind] = true;
      const code = e && e.code;
      showStatus(() => _t(code === 'lib' ? 'je.st.lib' : code === 'offline' ? 'je.st.offline_pose' : kind === 'pose' ? 'je.st.pose_fail' : 'je.st.face_fail'));
      if (kind === 'face' && cfg.read === 'face') setCamAlert(''); else checkLoading();
    }
  });
  async function startCam() {
    $('camStart').disabled = true;
    try {
      const r = await V.startCamera(video, facing);
      $('cam-inner').classList.toggle('mirror', r.facing !== 'environment' && facing !== 'environment');
      camOn = true; $('cam-msg').hidden = true; $('cam-tools').hidden = false;
      lastFaceT = 0; lastPoseT = 0; emoSm.reset(); gesHold.reset(); sender.reset();
      Object.keys(readyKinds).forEach((k) => delete readyKinds[k]); Object.keys(failedKinds).forEach((k) => delete failedKinds[k]); loop.resetReady();
      loop.start(); checkLoading(); if (!needed().some((k) => !readyKinds[k])) toIdle();
    } catch (e) {
      camOn = false;
      showStatus(() => _t(e.code === 'denied' ? 'je.st.denied' : e.code === 'nocam' ? 'je.st.nocam' : 'je.st.camfail'));
    } finally { $('camStart').disabled = false; }
  }
  function stopCam() {
    loop.stop(); V.stopCamera(video); camOn = false;
    faceRes = poseRes = null; lastFaceT = 0; $('cam-msg').hidden = false; $('cam-tools').hidden = true; setCamAlert('');
    try { const c = $('overlay'); c.getContext('2d').clearRect(0, 0, c.width, c.height); } catch (e) {}
    showStatus(() => _t('je.st.stopped')); setTimeout(() => { if (!camOn) toIdle(); }, 2500);
  }
  $('camStart').addEventListener('click', startCam);
  $('camStop').addEventListener('click', stopCam);
  $('camSwitch').addEventListener('click', async () => {
    facing = facing === 'user' ? 'environment' : 'user'; cfg.facing = facing; saveCfg();
    loop.stop(); await startCam();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && camOn) { /* el navegador ja atura rAF; no cal fer res més */ } });

  // ── Bucle de la interfície i de l'enviament ───────────────
  setInterval(() => {
    const st = currentState();
    if (camOn || st.E || st.G) sender.tick(st, sendCfg(), performance.now());
    paintReadout();
  }, 100);

  // ── Configuració ──────────────────────────────────────────
  function refreshLabels() {
    $('cfgSmoothLbl').textContent = _t('je.cfg.smooth', { n: fmtSec(cfg.smooth / 10) });
    $('cfgMinConfLbl').textContent = _t('je.cfg.minconf', { n: cfg.minConf });
    $('cfgTiltLbl').textContent = _t('je.cfg.tilt', { n: cfg.tilt });
    $('cfgPeriodLbl').textContent = _t('je.cfg.period', { n: fmtSec(cfg.period / 10) });
    $('periodBox').hidden = cfg.mode !== 'continuous';
    refreshCalState(); buildCodes(); buildHelpCodes(); paintSent(); paintReadout();
  }
  function buildCodes() {
    const grid = $('codesGrid'); const keep = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.code : null;
    grid.innerHTML = '';
    const rows = [];
    J.EMOTIONS.forEach((e) => rows.push(['E' + e.id, e.emoji + ' ' + emoName(e.id)]));
    rows.push(['E' + J.NOFACE, '🫥 ' + emoName(J.NOFACE)]);
    J.GESTURES.forEach((g) => rows.push(['G' + g.id, g.emoji + ' ' + gesName(g.id)]));
    rows.forEach(([code, label]) => {
      const row = document.createElement('label'); row.className = 'code-row';
      const sp = document.createElement('span'); sp.textContent = label;
      const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 40; inp.placeholder = code; inp.value = cfg.codes[code] || ''; inp.dataset.code = code;
      inp.setAttribute('aria-label', label + ' (' + code + ')');
      inp.addEventListener('input', () => { const v = inp.value.replace(/[\r\n]/g, ''); if (v.trim()) cfg.codes[code] = v; else delete cfg.codes[code]; saveCfg(); sender.reset(); });
      row.appendChild(sp); row.appendChild(inp); grid.appendChild(row);
    });
  }
  function buildHelpCodes() {
    const ul = $('helpCodes'); ul.innerHTML = '';
    const add = (code, emoji, name) => { const li = document.createElement('li'); li.innerHTML = '<code>' + code + '</code> ' + emoji + ' '; li.appendChild(document.createTextNode(name)); ul.appendChild(li); };
    J.EMOTIONS.forEach((e) => add('E' + e.id, e.emoji, emoName(e.id)));
    add('E' + J.NOFACE, '🫥', emoName(J.NOFACE));
    J.GESTURES.forEach((g) => add('G' + g.id, g.emoji, gesName(g.id)));
  }
  function loadCfgUi() {
    $('cfgRead').value = cfg.read; $('cfgEngine').value = cfg.engine; $('cfgBoost').checked = cfg.boost;
    $('cfgSmooth').value = cfg.smooth; $('cfgMinConf').value = cfg.minConf; $('cfgTilt').value = cfg.tilt;
    $('cfgMode').value = cfg.mode; $('cfgPeriod').value = cfg.period; $('cfgIntensity').checked = cfg.intensity;
    refreshLabels();
  }
  function onModelChange() {   // cal tornar a comprovar quins models fan falta
    Object.keys(readyKinds).forEach((k) => delete readyKinds[k]); Object.keys(failedKinds).forEach((k) => delete failedKinds[k]); loop.resetReady();
    faceRes = null; poseRes = null; emoSm.reset(); gesHold.reset(); sender.reset(); boosted = false;
    if (camOn) checkLoading();
  }
  [['cfgRead', 'read', null, true], ['cfgEngine', 'engine', null, true], ['cfgMode', 'mode'], ['cfgBoost', 'boost', (e) => e.checked], ['cfgIntensity', 'intensity', (e) => e.checked]].forEach(([id, key, conv, models]) => {
    $(id).addEventListener('change', () => { cfg[key] = conv ? conv($(id)) : $(id).value; saveCfg(); sender.reset(); if (models) onModelChange(); refreshLabels(); });
  });
  [['cfgSmooth', 'smooth'], ['cfgMinConf', 'minConf'], ['cfgTilt', 'tilt'], ['cfgPeriod', 'period']].forEach(([id, key]) => $(id).addEventListener('input', () => { cfg[key] = parseInt($(id).value, 10); saveCfg(); applyTuning(); refreshLabels(); }));
  PIAR_I18N.onChange(() => { refreshLabels(); showStatus(statusFn); if ($('cam-alert') && !$('cam-alert').hidden) setCamAlert(_t('je.cam.loading')); });

  // Capes i botons
  $('configBtn').onclick = () => { $('config-layer').style.display = 'flex'; refreshCalState(); };
  $('infoBtn').onclick = () => { $('info-layer').style.display = 'flex'; };
  $('closeConfigBtn').onclick = () => { $('config-layer').style.display = 'none'; };
  $('closeInfoBtn').onclick = () => { $('info-layer').style.display = 'none'; };

  // Bluetooth
  $('connectBtn').onclick = connectBluetooth;
  if (!navigator.bluetooth) { $('connectBtn').classList.remove('btn-primary'); $('connectBtn').classList.add('no-bt'); }
  onBTStatusChange((connected, msg) => {
    if (msg) showTranslatedStatus(msg);
    if (connected) { sender.resend(currentState(), sendCfg(), performance.now()); setTimeout(toIdle, 2500); }
  });

  PIAR_I18N.mountSelector($('langSelectHost'));
  buildProbs(); loadCfgUi(); toIdle();

  // Per a les proves (permet alimentar l'app sense càmera ni models)
  window.__je = {
    cfg, J, V, emoSm, gesHold, sender, sentLines, currentState, applyTuning,
    injectFace: (scores, features) => { camOn = true; onFace({ scores, features, box: { x: 10, y: 10, w: 100, h: 100 }, score: 1 }); },
    injectPose: (kp) => { camOn = true; onPose({ keypoints: kp, score: 1 }); },
    injectNoFace: () => { readyKinds.face = true; onFace(null); },
    markReady: (k) => { readyKinds[k] = true; },
    setCamOn: (v) => { camOn = v; },
    cal: () => cal, startCam, stopCam, loop,
    state: () => ({ camOn, bodyVisible: lastBodyVisible, boosted })
  };
})();
