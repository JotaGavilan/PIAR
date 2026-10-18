// ============================================================
//  script.js – JEmo (emocions de la cara)
//  Càmera → models locals → emoció (E0–E6, E9) suavitzada → text curt → Bluetooth UART → micro:bit
// ============================================================
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const J = window.JEmo, V = window.JEmoVision;

  // ── Configuració i calibratge (es guarden al dispositiu) ──
  const CFG_KEY = 'jemo.cfg.v1', CAL_KEY = 'jemo.cal.v1';
  const DEF = { engine: 'net', smooth: 6, minConf: 40, mode: 'change', period: 5, intensity: true, codes: {}, facing: 'user' };
  const cfg = Object.assign({}, DEF);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) {}
  if (!cfg.codes || typeof cfg.codes !== 'object') cfg.codes = {};
  // Versions anteriors: ja no hi ha gestos del cap, cos ni mans: s'esborren les opcions i els codis G
  ['view', 'shoulders', 'boost', 'read', 'headMove', 'tilt'].forEach((k) => delete cfg[k]);
  Object.keys(cfg.codes).forEach((k) => { if (!/^E\d+$/.test(k)) delete cfg.codes[k]; });
  let cal = { face: null };
  try { const c = JSON.parse(localStorage.getItem(CAL_KEY) || '{}'); if (c && c.face) cal.face = c.face; } catch (e) {}
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
  function applyTuning() {
    emoSm.setOptions({ holdMs: smoothMs(), minConf: cfg.minConf / 100 });
  }
  const FACE_LOST_MS = 1500;
  let lastFaceT = 0, faceRes = null;
  let sentLog = [];
  const sentLines = [];                          // per a les proves

  const sender = J.makeSender((line, id, changed) => {
    const bt = isBluetoothConnected();
    if (bt) sendUARTData(line);
    sentLines.push(line);
    if (changed || !sentLog.length) {
      sentLog.unshift({ line, bt, t: new Date() });
    } else { sentLog[0].line = line; sentLog[0].t = new Date(); sentLog[0].bt = bt; }
    sentLog = sentLog.slice(0, 4);
    paintSent();
  });
  const sendCfg = () => ({ mode: cfg.mode, periodMs: cfg.period * 100, intensity: cfg.intensity, codes: cfg.codes });

  function currentState() {
    const now = performance.now();
    const st = { E: null };
    if (lastFaceT && now - lastFaceT <= FACE_LOST_MS && emoSm.current !== null) st.E = { id: emoSm.current, pct: emoSm.scores[emoSm.current] * 100 };
    else if (camOn && readyKinds.face && (!lastFaceT || now - lastFaceT > FACE_LOST_MS)) st.E = { id: J.NOFACE, pct: 0 };
    return st;
  }

  // ── Resultats dels models ─────────────────────────────────
  function onFace(r) {
    const now = performance.now();
    faceRes = r;
    if (!r) { paintOverlay(); return; }
    lastFaceT = now;
    emoSm.push(r.scores, now);
    if (calSession && r.features) calSession.face.push(r.features);
    paintOverlay();
  }
  // ── Pintar ────────────────────────────────────────────────
  const emoName = (id) => _t('je.emo.' + id);
  function buildProbs() {
    const box = $('probs'); box.innerHTML = '';
    J.EMOTIONS.forEach((e) => {
      const d = document.createElement('div'); d.className = 'pb'; d.dataset.id = e.id;
      d.innerHTML = '<span class="pe">' + e.emoji + '</span><span class="pv"><i></i></span>';
      box.appendChild(d);
    });
  }
  function paintOverlay() {
    try { V.draw($('overlay'), $('video'), { face: performance.now() - lastFaceT < 600 ? faceRes : null }); } catch (e) {}
  }
  function paintReadout() {
    const st = currentState();
    if (!st.E) {
      $('emoEmoji').textContent = '😐'; $('emoName').textContent = '–'; $('emoCode').textContent = '–'; $('emoBar').style.width = '0%';
    } else if (st.E.id === J.NOFACE) {
      $('emoEmoji').textContent = '🫥'; $('emoName').textContent = _t('je.read.face_nf'); $('emoCode').textContent = J.formatLine(J.NOFACE, 0, sendCfg()); $('emoBar').style.width = '0%';
    } else {
      const e = J.EMOTIONS[st.E.id];
      $('emoEmoji').textContent = e.emoji; $('emoName').textContent = emoName(e.id);
      $('emoCode').textContent = J.formatLine(e.id, st.E.pct, sendCfg()); $('emoBar').style.width = Math.round(st.E.pct) + '%';
    }
    // barres de probabilitat
    const sc = emoSm.scores, cur = st.E ? st.E.id : -1;
    document.querySelectorAll('#probs .pb').forEach((el) => {
      const id = +el.dataset.id, show = st.E && st.E.id !== J.NOFACE;
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

  // ── Calibratge (cara neutra, per al model de punts) ───────
  let calSession = null;
  $('calBtn').addEventListener('click', () => {
    if (!camOn) { showStatus(() => _t('je.st.start')); return; }
    if (calSession) return;
    calSession = { face: [] };
    showStatus(() => _t('je.cal.busy'));
    setTimeout(() => {
      const c = calSession; calSession = null;
      const ok = c.face.length >= 5;
      if (ok) { cal.face = J.averageFeatures(c.face); saveCal(); }
      showStatus(() => _t(ok ? 'je.cal.ok' : 'je.cal.fail'));
      refreshCalState();
      setTimeout(toIdle, 4000);
    }, 2200);
  });
  $('calReset').addEventListener('click', () => { cal = { face: null }; saveCal(); refreshCalState(); showStatus(() => _t('je.cal.cleared')); setTimeout(toIdle, 2500); });
  function refreshCalState() { $('calState').textContent = _t(cal.face ? 'je.cfg.cal_state_yes' : 'je.cfg.cal_state_no'); }

  // ── Càmera i bucle ────────────────────────────────────────
  const video = $('video');
  let facing = cfg.facing || 'user';
  const readyKinds = {}, failedKinds = {};
  const loopCfg = () => ({ engine: cfg.engine, baseline: cal.face });
  // Model imprescindible per a la lectura (només la cara)
  const needed = () => ['face'];
  function setCamAlert(text) { const a = $('cam-alert'); a.hidden = !text; a.textContent = text || ''; }
  function checkLoading() {
    const pending = needed().some((k) => !readyKinds[k] && !failedKinds[k]);
    if (camOn) setCamAlert(pending ? _t('je.cam.loading') : '');
    if (camOn && pending) showStatus(() => _t('je.st.loading')); else if (camOn && /^⏳/.test($('status-text').textContent)) toIdle();
  }
  const loop = V.createLoop(video, loopCfg, {
    onFace,
    onStatus: (kind, st) => { readyKinds[kind] = st === 'ready'; if (st === 'ready') failedKinds[kind] = false; checkLoading(); },
    onError: (kind, e) => {
      console.warn('JEmo model error', kind, e);
      readyKinds[kind] = false; failedKinds[kind] = true;
      const code = e && e.code;
      showStatus(() => _t(code === 'lib' ? 'je.st.lib' : 'je.st.face_fail'));
      checkLoading();
    }
  });
  async function startCam() {
    $('camStart').disabled = true;
    try {
      const r = await V.startCamera(video, facing);
      $('cam-inner').classList.toggle('mirror', r.facing !== 'environment' && facing !== 'environment');
      camOn = true; $('cam-msg').hidden = true; $('cam-tools').hidden = false;
      lastFaceT = 0; emoSm.reset(); sender.reset();
      Object.keys(readyKinds).forEach((k) => delete readyKinds[k]); Object.keys(failedKinds).forEach((k) => delete failedKinds[k]); loop.resetReady();
      loop.start(); checkLoading(); if (!needed().some((k) => !readyKinds[k])) toIdle();
    } catch (e) {
      camOn = false;
      showStatus(() => _t(e.code === 'denied' ? 'je.st.denied' : e.code === 'nocam' ? 'je.st.nocam' : 'je.st.camfail'));
    } finally { $('camStart').disabled = false; }
  }
  function stopCam() {
    loop.stop(); V.stopCamera(video); camOn = false;
    faceRes = null; lastFaceT = 0; $('cam-msg').hidden = false; $('cam-tools').hidden = true; setCamAlert('');
    try { const c = $('overlay'); c.getContext('2d').clearRect(0, 0, c.width, c.height); } catch (e) {}
    showStatus(() => _t('je.st.stopped')); setTimeout(() => { if (!camOn) toIdle(); }, 2500);
  }
  $('camStart').addEventListener('click', startCam);
  $('camStop').addEventListener('click', stopCam);
  $('camSwitch').addEventListener('click', async () => {
    facing = facing === 'user' ? 'environment' : 'user'; cfg.facing = facing; saveCfg();
    loop.stop(); await startCam();
  });

  // ── Bucle de la interfície i de l'enviament ───────────────
  setInterval(() => {
    const st = currentState();
    if (camOn || st.E) sender.tick(st, sendCfg(), performance.now());
    paintReadout();
  }, 100);

  // ── Configuració ──────────────────────────────────────────
  function refreshLabels() {
    $('cfgSmoothLbl').textContent = _t('je.cfg.smooth', { n: fmtSec(cfg.smooth / 10) });
    $('cfgMinConfLbl').textContent = _t('je.cfg.minconf', { n: cfg.minConf });
    $('cfgPeriodLbl').textContent = _t('je.cfg.period', { n: fmtSec(cfg.period / 10) });
    $('periodBox').hidden = cfg.mode !== 'continuous';
    refreshCalState(); buildCodes(); buildHelpCodes(); paintSent(); paintReadout();
  }
  function buildCodes() {
    const grid = $('codesGrid');
    grid.innerHTML = '';
    const rows = [];
    J.EMOTIONS.forEach((e) => rows.push(['E' + e.id, e.emoji + ' ' + emoName(e.id)]));
    rows.push(['E' + J.NOFACE, '🫥 ' + emoName(J.NOFACE)]);
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
  }
  function loadCfgUi() {
    $('cfgEngine').value = cfg.engine;
    $('cfgSmooth').value = cfg.smooth; $('cfgMinConf').value = cfg.minConf;
    $('cfgMode').value = cfg.mode; $('cfgPeriod').value = cfg.period; $('cfgIntensity').checked = cfg.intensity;
    refreshLabels();
  }
  function onModelChange() {   // cal tornar a comprovar quins models fan falta
    Object.keys(readyKinds).forEach((k) => delete readyKinds[k]); Object.keys(failedKinds).forEach((k) => delete failedKinds[k]); loop.resetReady();
    faceRes = null; emoSm.reset(); sender.reset();
    if (camOn) checkLoading();
  }
  [['cfgEngine', 'engine', null, true], ['cfgMode', 'mode'], ['cfgIntensity', 'intensity', (e) => e.checked]].forEach(([id, key, conv, models]) => {
    $(id).addEventListener('change', () => { cfg[key] = conv ? conv($(id)) : $(id).value; saveCfg(); sender.reset(); if (models) onModelChange(); refreshLabels(); });
  });
  [['cfgSmooth', 'smooth'], ['cfgMinConf', 'minConf'], ['cfgPeriod', 'period']].forEach(([id, key]) => $(id).addEventListener('input', () => { cfg[key] = parseInt($(id).value, 10); saveCfg(); applyTuning(); refreshLabels(); }));
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
    cfg, J, V, emoSm, sender, sentLines, currentState, applyTuning,
    injectFace: (scores, features, box, landmarks) => { camOn = true; onFace({ scores, features, landmarks, box: box || { x: 10, y: 10, w: 100, h: 100 }, score: 1 }); },
    injectNoFace: () => { readyKinds.face = true; onFace(null); },
    markReady: (k) => { readyKinds[k] = true; },
    setCamOn: (v) => { camOn = v; },
    cal: () => cal, startCam, stopCam, loop, ready: () => Object.assign({}, readyKinds), failed: () => Object.assign({}, failedKinds), needed
  };
})();
