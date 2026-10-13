// ============================================================
//  script.js – JVeu (cap amb veu)
//  Veu (o text) → intèrpret d'ordres → seqüència de passos → paquets de 6 dígits (com JFace) → micro:bit
//  i cap virtual en pantalla.
// ============================================================
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const J = window.JVeu, SP = window.JVeuSpeech, GEM = window.JVeuGemini;
  const hasBusy = () => !!window.PIAR_BUSY;

  // ── Configuració (es guarda al dispositiu) ───────────────
  const CFG_KEY = 'jveu.cfg.v1';
  const DEF = { engine: 'web', wmodel: 'base', speechLang: 'auto', talk: 'hold', interval: 1, yawHalf: 10, mouthMax: 20, invert: false, gem: false, gmodel: 'gemini-3.5-flash-lite' };
  const cfg = Object.assign({}, DEF);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) {}
  if (!SP.webSupported() && SP.whisperSupported() && !localStorage.getItem(CFG_KEY)) cfg.engine = 'whisper';
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };
  const fmtSec = (s) => { const t = s.toFixed(1); return (PIAR_I18N.lang === 'en' ? t : t.replace('.', ',')) + ' s'; };
  const speechLang = () => (cfg.speechLang === 'auto' ? PIAR_I18N.lang : cfg.speechLang);

  // ── Estat: missatges de la barra inferior (es guarden com a funció per a retraduir-los) ──
  const BT_STATUS_KEYS = ['sh.bt.ios_status', 'sh.bt.unsupported_status', 'sh.bt.searching', 'sh.bt.ok', 'sh.bt.error', 'sh.bt.disconnected'];
  const idleStatus = () => (isBluetoothConnected() ? _t(cfg.talk === 'tap' ? 'jv.msg.hint_tap' : 'jv.msg.hint') : _t('jv.msg.nobt'));
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

  // ── Cap virtual i reproductor ─────────────────────────────
  JVeuHead.mount($('head-box'));
  const getCal = () => ({ yawC: 15, yawHalf: cfg.yawHalf, mouthMax: cfg.mouthMax, invert: cfg.invert });
  let stepEls = [];
  function paintPacket(pk) {
    $('yaw').textContent = pk.slice(0, 2); $('mouth').textContent = pk.slice(2, 4);
    $('eyeL').textContent = pk[4]; $('eyeR').textContent = pk[5];
    $('packet').textContent = pk;
  }
  const player = JVeuPlayer.create({
    send: (pk) => sendUARTData(pk),
    onPose: (p) => JVeuHead.set(p),
    onPacket: paintPacket,
    getCal,
    getTick: () => cfg.interval * 100,
    onState: (st) => { $('stopBtn').disabled = st !== 'playing'; if (st === 'idle') markSteps(-1, true); },
    onStep: (i) => markSteps(i)
  });
  paintPacket(J.toPacket(J.NEUTRAL, getCal()));
  JVeuHead.set(J.NEUTRAL);

  // ── Targeta «has dit / he entés» ──────────────────────────
  function stepChips(s) {
    const c = [];
    if (s.yaw !== undefined) c.push(s.yaw === 0 ? _t('jv.chip.yaw_c') : s.yaw > 0 ? _t('jv.chip.yaw_left', { p: Math.round(s.yaw * 100) }) : _t('jv.chip.yaw_right', { p: Math.round(-s.yaw * 100) }));
    else if (s.dyaw !== undefined) c.push(_t(s.dyaw > 0 ? 'jv.chip.more_left' : 'jv.chip.more_right'));
    if (s.mouth !== undefined) c.push(_t('jv.chip.mouth', { p: Math.round(s.mouth * 100) }));
    else if (s.dmouth !== undefined) c.push(_t(s.dmouth > 0 ? 'jv.chip.mouth_more' : 'jv.chip.mouth_less'));
    if (s.eyeL !== undefined && s.eyeR !== undefined && s.eyeL === s.eyeR) c.push(_t(s.eyeL ? 'jv.chip.eyes_open' : 'jv.chip.eyes_closed'));
    else {
      if (s.eyeL !== undefined) c.push(_t(s.eyeL ? 'jv.chip.eyeL_open' : 'jv.chip.eyeL_closed'));
      if (s.eyeR !== undefined) c.push(_t(s.eyeR ? 'jv.chip.eyeR_open' : 'jv.chip.eyeR_closed'));
    }
    return c;
  }
  let lastView = null;
  // Si la pantalla és baixa, la targeta «Has dit / He entés» pot quedar amagada baix: es fa visible (sense moure el cap més del necessari)
  function revealHeard() {
    const st = $('stage'), h = $('heard'); if (!st || !h) return;
    const sr = st.getBoundingClientRect(), hr = h.getBoundingClientRect();
    if (hr.bottom > sr.bottom) st.scrollTop += Math.min(hr.bottom - sr.bottom + 6, Math.max(0, hr.top - sr.top - 4));
  }
  function showHeard(text, src) { lastView = { text, src, steps: null, say: null }; paintHeard(); revealHeard(); }
  function showPlan(steps, src, say, tone) { lastView = Object.assign(lastView || {}, { src, steps, say: say || '', tone: tone || '' }); paintHeard(); revealHeard(); }
  function paintHeard() {
    const v = lastView, none = !v || (!v.text && !v.steps);
    $('heardNone').hidden = !none; $('heardBox').hidden = none;
    if (none) return;
    $('heardTxt').textContent = v.text || '';
    $('heardSrc').textContent = v.src ? _t(v.src === 'gemini' ? 'jv.src.gemini' : 'jv.src.rules') : '';
    const box = $('steps'); box.innerHTML = ''; stepEls = [];
    const has = v.steps && v.steps.length;
    $('stepsLabel').hidden = !has;
    if (has) {
      const MAX = 8;
      v.steps.slice(0, MAX).forEach((s, i) => {
        if (i) { const sep = document.createElement('span'); sep.className = 'sep'; sep.textContent = '›'; box.appendChild(sep); }
        const el = document.createElement('span'); el.className = 'step';
        stepChips(s).forEach((t) => { const ch = document.createElement('span'); ch.className = 'chip'; ch.textContent = t; el.appendChild(ch); });
        box.appendChild(el); stepEls.push(el);
      });
      if (v.steps.length > MAX) { const more = document.createElement('span'); more.className = 'chip'; more.textContent = _t('jv.chip.more', { n: v.steps.length - MAX }); box.appendChild(more); }
    }
    const say = $('sayMsg'); say.textContent = v.say || ''; say.className = 'say' + (v.tone ? ' ' + v.tone : ''); say.hidden = !v.say;
  }
  function markSteps(i, all) {
    stepEls.forEach((el, k) => { el.classList.toggle('now', !all && k === i); el.classList.toggle('done', all ? true : k < i); });
    const cur = !all && stepEls[i], box = $('steps');   // el pas actual es manté a la vista (desplaçament horitzontal)
    if (cur && box && box.scrollWidth > box.clientWidth) box.scrollLeft = Math.max(0, cur.offsetLeft - box.offsetLeft - 8);
  }
  PIAR_I18N.onChange(() => { paintHeard(); refreshLabels(); showStatus(statusFn); });

  // ── Entendre i executar una ordre (text) ──────────────────
  let cmdSeq = 0;
  async function handleText(text, how) {
    text = String(text || '').trim();
    if (!text) return;
    const my = ++cmdSeq;
    showHeard(text, null);
    const plan = J.parse(text);
    if (plan.stop) { player.stop(); showPlan([], null, _t('jv.msg.stopped'), ''); showStatus(() => _t('jv.msg.stopped')); return 'stop'; }
    if (plan.ok) {
      const warn = plan.notes.includes('no_vertical') ? _t('jv.msg.no_vertical_part') : '';
      showPlan(plan.steps, 'rules', warn, warn ? 'warn' : '');
      return run(plan.steps, my);
    }
    if (plan.notes.includes('no_vertical')) { showPlan([], null, _t('jv.msg.no_vertical'), 'warn'); return 'none'; }
    // Les regles no ho entenen: IA de Google (opcional, només el text)
    if (cfg.gem) {
      if (!GEM.getKey()) { showPlan([], null, _t('jv.msg.nothing') + ' ' + _t('jv.msg.gem_nokey'), 'warn'); return 'none'; }
      if (navigator.onLine === false) { showPlan([], null, _t('jv.msg.nothing') + ' ' + _t('jv.msg.gem_offline'), 'warn'); return 'none'; }
      const end = hasBusy() ? PIAR_BUSY.begin({ message: _t('jv.busy.gem'), details: _t('jv.busy.gem_d'), icon: '✨' }) : null;
      let r = null, ge = null;
      try { r = await GEM.interpret(text, { lang: PIAR_I18N.lang, model: cfg.gmodel }); } catch (e) { ge = e; } finally { if (end) end(); }
      if (my !== cmdSeq) return 'cancelled';
      if (ge) {
        const code = ge.code || 'other';
        const why = _t('jv.gem.err.' + (['key', 'quota', 'net', 'model', 'region', 'server', 'blocked', 'empty'].includes(code) ? code : 'other'));
        showPlan([], null, _t('jv.msg.nothing') + ' ' + _t('jv.msg.gem_err', { code: why }), 'err'); return 'error';
      }
      if (r.steps.length) { showPlan(r.steps, 'gemini', r.say, ''); return run(r.steps, my); }
      showPlan([], null, r.say || _t('jv.msg.nothing_gem'), 'warn'); return 'none';
    }
    showPlan([], null, _t('jv.msg.nothing'), 'warn');
    return 'none';
  }
  async function run(steps, my) {
    const res = await player.play(steps);
    if (res === 'done' && my === cmdSeq) showStatus(() => _t('jv.msg.done'));
    return res;
  }

  // ── Whisper: descàrrega / càrrega del model ───────────────
  const WH_MB = { tiny: 40, base: 80 };
  async function ensureWhisper() {
    const model = cfg.wmodel;
    if (SP.whisperReady(model)) return true;
    if (!SP.whisperSupported()) { showStatus(() => _t('jv.msg.unsupported_whisper')); return false; }
    if (!(await SP.whisperEngine())) { showStatus(() => _t('jv.msg.whisper_missing')); return false; }
    const cached = await SP.whisperCached(model);
    if (!cached) {
      if (navigator.onLine === false) { showStatus(() => _t('jv.msg.whisper_offline')); return false; }
      if (!confirm(_t('jv.wh.confirm', { mb: WH_MB[model] }))) return false;
    }
    const end = hasBusy() ? PIAR_BUSY.begin({ message: _t(cached ? 'jv.wh.loading' : 'jv.wh.busy'), details: _t(cached ? 'jv.wh.loading_d' : 'jv.wh.busy_d'), icon: '🎙', progress: cached ? null : 0.02 }) : null;
    try {
      await SP.whisperLoad(model, (p) => {
        if (!end || !(p.total > 0)) return;
        PIAR_BUSY.setProgress(Math.max(0.02, Math.min(0.98, p.loaded / p.total)));
        PIAR_BUSY.update(undefined, _t('jv.wh.busy_dl', { done: (p.loaded / 1e6).toFixed(0), total: (p.total / 1e6).toFixed(0) }));
      });
      return true;
    } catch (e) { showStatus(() => _t('jv.msg.whisper_fail')); return false; }
    finally { if (end) end(); refreshWhisperState(); }
  }
  async function refreshWhisperState() {
    const el = $('whState'); if (!el) return;
    if (!SP.whisperSupported()) { el.textContent = _t('jv.wh.state_unsupported'); $('whBtn').disabled = true; return; }
    const ok = SP.whisperReady(cfg.wmodel) || await SP.whisperCached(cfg.wmodel);
    el.textContent = _t(ok ? 'jv.wh.state_ok' : 'jv.wh.state_no');
    $('whBtn').textContent = _t(ok ? 'jv.wh.btn_done' : 'jv.wh.btn');
    $('whBtn').disabled = false;
  }

  // ── Botó de parlar ────────────────────────────────────────
  let session = null, starting = false, releaseEarly = false, uiState = 'idle';
  function setMic(state) {
    uiState = state;
    const b = $('micBtn');
    b.classList.toggle('listening', state === 'listening');
    b.classList.toggle('thinking', state === 'thinking');
    b.disabled = state === 'thinking';
    $('micLabel').textContent = state === 'listening' ? (cfg.talk === 'tap' ? _t('jv.mic.tap_stop') : _t('jv.mic.listening'))
      : state === 'thinking' ? _t('jv.mic.thinking') : _t(cfg.talk === 'tap' ? 'jv.mic.tap' : 'jv.mic.hold');
  }
  function speechError(e) {
    const c = (e && e.code) || 'stt';
    const m = c === 'nospeech' ? () => _t('jv.msg.nospeech') : c === 'mic' ? () => _t('jv.msg.mic') : c === 'net' ? () => _t('jv.msg.net')
      : c === 'unsupported' ? () => _t(cfg.engine === 'whisper' ? 'jv.msg.unsupported_whisper' : 'jv.msg.unsupported_web')
      : c === 'lang' ? () => _t('jv.msg.lang') : c === 'load' ? () => _t('jv.msg.whisper_fail') : c === 'missing' ? () => _t('jv.msg.whisper_missing') : () => _t('jv.msg.stt', { msg: String((e && e.message) || c).slice(0, 80) });
    showStatus(m);
  }
  async function startListen() {
    if (session || starting || uiState === 'thinking') return;
    if (cfg.engine === 'web' && !SP.webSupported()) { showStatus(() => _t('jv.msg.unsupported_web')); return; }
    if (cfg.engine === 'whisper') {
      if (!SP.whisperReady(cfg.wmodel)) { const ok = await ensureWhisper(); if (ok) toIdle(); return; }   // la 1a vegada: es carrega el model i es torna a prémer
    }
    starting = true; releaseEarly = false;
    try {
      session = await SP.listen({
        engine: cfg.engine, lang: speechLang(), model: cfg.wmodel,
        onInterim: (t) => { if (t) { showHeard(t, null); } },
        onState: (st) => { if (st === 'transcribing') setMic('thinking'); }
      });
      setMic('listening'); showStatus(() => '🎤 ' + _t('jv.mic.listening'));
      if (releaseEarly) { stopListen(); }
    } catch (e) { session = null; setMic('idle'); speechError(e); }
    finally { starting = false; }
  }
  async function stopListen() {
    if (starting) { releaseEarly = true; return; }
    if (!session) return;
    const s = session; session = null;
    setMic('thinking');
    let text = '';
    try { text = await s.stop(); } catch (e) { setMic('idle'); speechError(e); return; }
    setMic('idle'); toIdle();
    handleText(text, 'voice');
  }
  const mic = $('micBtn');
  mic.addEventListener('contextmenu', (e) => e.preventDefault());
  mic.addEventListener('pointerdown', (e) => {
    if (cfg.talk !== 'hold' || (e.button !== undefined && e.button !== 0)) return;
    e.preventDefault(); try { mic.setPointerCapture(e.pointerId); } catch (er) {}
    startListen();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => mic.addEventListener(ev, () => { if (cfg.talk === 'hold') stopListen(); }));
  mic.addEventListener('keydown', (e) => { if (cfg.talk === 'hold' && (e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startListen(); } });
  mic.addEventListener('keyup', (e) => { if (cfg.talk === 'hold' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); stopListen(); } });
  mic.addEventListener('click', () => { if (cfg.talk === 'tap') { session || starting ? stopListen() : startListen(); } });

  // ── Text, exemples, parar, centrar ────────────────────────
  $('textForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('textIn').value; $('textIn').value = ''; handleText(v, 'text'); });
  document.querySelectorAll('.ex').forEach((b) => b.addEventListener('click', () => handleText(_t('jv.ex.' + b.dataset.ex), 'example')));
  $('stopBtn').addEventListener('click', () => { player.stop(); showStatus(() => _t('jv.msg.stopped')); });
  $('centerBtn').addEventListener('click', () => { cmdSeq++; player.play([{ yaw: 0, mouth: 0, eyeL: 1, eyeR: 1, ms: 0 }]); });

  // ── Configuració ──────────────────────────────────────────
  function refreshLabels() {
    $('intervalLabel').textContent = fmtSec(cfg.interval / 10);
    $('yawHalfLbl').textContent = _t('jv.cfg.yawhalf', { n: cfg.yawHalf });
    $('mouthMaxLbl').textContent = _t('jv.cfg.mouthmax', { n: cfg.mouthMax });
    setMic(uiState);
    refreshWhisperState(); refreshKeyState();
  }
  function refreshKeyState() { $('keyState').textContent = _t(GEM.getKey() ? 'jv.cfg.gem_saved' : 'jv.cfg.gem_none'); }
  function syncBoxes() { $('whisperBox').hidden = cfg.engine !== 'whisper'; $('gemBox').hidden = !cfg.gem; }
  function loadCfgUi() {
    $('cfgEngine').value = cfg.engine; $('cfgWModel').value = cfg.wmodel; $('cfgSpeechLang').value = cfg.speechLang; $('cfgTalk').value = cfg.talk;
    $('intervalSlider').value = cfg.interval; $('yawHalf').value = cfg.yawHalf; $('mouthMax').value = cfg.mouthMax;
    $('cfgInvert').checked = cfg.invert; $('cfgGem').checked = cfg.gem; $('cfgGModel').value = cfg.gmodel;
    syncBoxes(); refreshLabels();
  }
  const bind = (id, key, conv, after) => $(id).addEventListener('change', () => {
    cfg[key] = conv ? conv($(id)) : $(id).value; saveCfg(); syncBoxes(); refreshLabels(); if (after) after();
  });
  bind('cfgEngine', 'engine'); bind('cfgWModel', 'wmodel'); bind('cfgSpeechLang', 'speechLang');
  bind('cfgTalk', 'talk', null, toIdle);
  bind('cfgInvert', 'invert', (e) => e.checked); bind('cfgGem', 'gem', (e) => e.checked); bind('cfgGModel', 'gmodel');
  [['intervalSlider', 'interval'], ['yawHalf', 'yawHalf'], ['mouthMax', 'mouthMax']].forEach(([id, key]) => $(id).addEventListener('input', () => { cfg[key] = parseInt($(id).value, 10); saveCfg(); refreshLabels(); }));
  $('cfgKey').addEventListener('change', () => { GEM.setKey($('cfgKey').value); $('cfgKey').value = ''; refreshKeyState(); });
  $('keyClear').addEventListener('click', () => { GEM.clearKey(); $('cfgKey').value = ''; refreshKeyState(); });
  $('whBtn').addEventListener('click', async () => { if (await ensureWhisper()) toIdle(); });
  const cal = (y) => { cmdSeq++; player.stop(); player.setPose({ yaw: y }, true); };
  $('calL').addEventListener('click', () => cal(1)); $('calC').addEventListener('click', () => cal(0)); $('calR').addEventListener('click', () => cal(-1));

  // Capes i botons
  $('configBtn').onclick = () => { $('config-layer').style.display = 'flex'; refreshWhisperState(); refreshKeyState(); };
  $('infoBtn').onclick = () => { $('info-layer').style.display = 'flex'; };
  $('closeConfigBtn').onclick = () => { $('config-layer').style.display = 'none'; };
  $('closeInfoBtn').onclick = () => { $('info-layer').style.display = 'none'; };

  // Bluetooth
  $('connectBtn').onclick = connectBluetooth;
  if (!navigator.bluetooth) { $('connectBtn').classList.remove('btn-primary'); $('connectBtn').classList.add('no-bt'); }
  onBTStatusChange((connected, msg) => {
    if (msg) showTranslatedStatus(msg);
    if (connected) { player.resend(); setTimeout(toIdle, 2500); }
  });

  // Idioma
  PIAR_I18N.mountSelector($('langSelectHost'));

  loadCfgUi();
  toIdle();

  // Per a les proves
  window.__jv = { cfg, player, handleText, J, getView: () => lastView, state: () => ({ uiState, session: !!session }), ensureWhisper };
})();
