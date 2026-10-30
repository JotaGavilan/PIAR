// ============================================================
//  script.js – JParla (robot que parla)
//  Text (o veu) → [mode Conversa: IA de Google] → ordres [entre claudàtors] + text
//   → veu del dispositiu (speechSynthesis) amb la boca per síl·labes → paquets «yyMMEE» (com JFace) → micro:bit
//   i cap virtual en pantalla.
// ============================================================
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const J = window.JParla, STT = window.JParlaSTT, CHAT = window.JParlaChat;
  const hasBusy = () => !!window.PIAR_BUSY;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ── Configuració (es guarda al dispositiu) ───────────────
  const CFG_KEY = 'jparla.cfg.v1', K_KEY = 'jparla.k.v1';
  const DEF = {
    lang: 'auto', voice: '', rate: 10, pitch: 10, robotic: false, talk: 'hold',
    mouthRate: 100, learn: true, move: 'normal', blink: true,
    interval: 8, yawHalf: 10, mouthMax: 20, invert: false,
    gmodel: 'gemini-3.5-flash-lite', preset: 'friendly', persona: '', mode: 'say'
  };
  const cfg = Object.assign({}, DEF);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) {}
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };
  let kMap = {};
  try { kMap = JSON.parse(localStorage.getItem(K_KEY) || '{}') || {}; } catch (e) {}
  const saveK = () => { try { localStorage.setItem(K_KEY, JSON.stringify(kMap)); } catch (e) {} };

  const fmtNum = (n, d) => { const t = n.toFixed(d); return PIAR_I18N.lang === 'en' ? t : t.replace('.', ','); };
  const convLang = () => (cfg.lang === 'auto' ? PIAR_I18N.lang : cfg.lang);
  const synth = window.speechSynthesis;

  // ── Estat: missatges de la barra inferior (es guarden com a funció per a retraduir-los) ──
  const BT_STATUS_KEYS = ['sh.bt.ios_status', 'sh.bt.unsupported_status', 'sh.bt.searching', 'sh.bt.ok', 'sh.bt.error', 'sh.bt.disconnected'];
  const idleStatus = () => (isBluetoothConnected() ? _t(cfg.mode === 'chat' ? 'jp.msg.hint_chat' : 'jp.msg.hint') : _t('jp.msg.nobt'));
  let statusFn = idleStatus;
  const _writeStatus = setStatusText;
  function paintTone() {
    const el = $('status-text'); if (!el) return;
    const t = el.textContent.trim();
    el.classList.toggle('msg-ok', /^(✅|🤖|🗣)/u.test(t));
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

  // ── Cap virtual i «titella» ───────────────────────────────
  JParlaHead.mount($('head-box'));
  const getCal = () => ({ yawC: 15, yawHalf: cfg.yawHalf, mouthMax: cfg.mouthMax, invert: cfg.invert });
  function paintPacket(pk) {
    $('yaw').textContent = pk.slice(0, 2); $('mouth').textContent = pk.slice(2, 4);
    $('eyeL').textContent = pk[4]; $('eyeR').textContent = pk[5];
    $('packet').textContent = pk;
  }
  const puppet = JParlaPuppet.create({
    send: (pk) => sendUARTData(pk),
    onPose: (p) => JParlaHead.set(p),
    onPacket: paintPacket,
    getCal,
    getInterval: () => cfg.interval * 10,
    getMove: () => cfg.move,
    getBlink: () => cfg.blink
  });
  paintPacket(J.toPacket(J.NEUTRAL, getCal()));
  JParlaHead.set(J.NEUTRAL);

  // ── Veus del dispositiu ───────────────────────────────────
  const vlang = (v) => String(v.lang || '').replace('_', '-').toLowerCase();
  function allVoices() { try { return synth ? synth.getVoices() || [] : []; } catch (e) { return []; } }
  function voicesFor(lang) { return allVoices().filter((v) => vlang(v).split('-')[0] === lang); }
  function pickVoice(lang) {
    const list = voicesFor(lang);
    if (cfg.voice) { const v = allVoices().find((x) => x.voiceURI === cfg.voice); if (v && vlang(v).split('-')[0] === lang) return v; }
    return list.find((v) => v.default) || list[0] || null;
  }
  const kKey = (lang, v) => lang + '|' + (v ? v.voiceURI : '');
  function fillVoices() {
    const sel = $('cfgVoice'), lang = convLang(), list = voicesFor(lang);
    sel.innerHTML = '';
    const o0 = document.createElement('option'); o0.value = ''; o0.textContent = _t('jp.cfg.voice_auto'); sel.appendChild(o0);
    list.forEach((v) => { const o = document.createElement('option'); o.value = v.voiceURI; o.textContent = v.name + ' (' + v.lang + (v.localService ? '' : ', ' + _t('jp.cfg.voice_net')) + ')'; sel.appendChild(o); });
    sel.value = list.some((v) => v.voiceURI === cfg.voice) ? cfg.voice : '';
    const note = $('voiceNote');
    if (!synth) { note.textContent = _t('jp.voice.unsupported'); note.className = 'config-note warn'; }
    else if (!list.length) { note.textContent = _t('jp.voice.none', { lang: _t('jp.lang.' + lang) }); note.className = 'config-note warn'; }
    else { note.textContent = ''; note.className = 'config-note'; }
  }
  if (synth) { try { synth.addEventListener('voiceschanged', fillVoices); } catch (e) { synth.onvoiceschanged = fillVoices; } }

  // ── Persona (mode Conversa) ───────────────────────────────
  const presetText = (p) => _t('jp.persona.text.' + p);
  const personaText = () => (cfg.preset === 'custom' ? (cfg.persona || presetText('friendly')) : presetText(cfg.preset));

  // ── Targeta «el robot diu» ────────────────────────────────
  // Cada tros que es diu té els seus <span class="w"> (una per paraula, en el mateix ordre que la línia de temps)
  let view = null;       // { you, plan, msg, tone, thinking }
  const WORD_RE = /[\p{L}\p{N}]+(?:['’·][\p{L}\p{N}]+)*/gu;
  function buildPlan(items) {
    const plan = [];
    items.forEach((it) => {
      if (it.cmd) plan.push({ cmd: it.cmd });
      else J.chunkSay(it.say, 140).forEach((c) => plan.push({ text: c }));
    });
    return plan;
  }
  function renderRobot() {
    const box = $('robotTxt'); box.innerHTML = '';
    if (!view) return;
    if (view.thinking) { const s = document.createElement('span'); s.className = 'thinking'; s.textContent = _t('jp.heard.thinking'); box.appendChild(s); return; }
    (view.plan || []).forEach((p, pi) => {
      if (p.cmd) {
        const c = document.createElement('span'); c.className = 'cmd'; c.textContent = _t('jp.cmd.' + p.cmd);
        p.el = c; box.appendChild(c);
      } else {
        p.els = []; let last = 0, m;
        WORD_RE.lastIndex = 0;
        const frag = document.createDocumentFragment();
        while ((m = WORD_RE.exec(p.text))) {
          if (m.index > last) frag.appendChild(document.createTextNode(p.text.slice(last, m.index)));
          const w = document.createElement('span'); w.className = 'w'; w.textContent = m[0]; frag.appendChild(w); p.els.push(w);
          last = m.index + m[0].length;
        }
        if (last < p.text.length) frag.appendChild(document.createTextNode(p.text.slice(last)));
        frag.appendChild(document.createTextNode(' '));
        box.appendChild(frag);
      }
    });
  }
  document.body.classList.remove('has-view');
  function paintView() {
    const none = !view;
    document.body.classList.toggle('has-view', !none);
    $('heardNone').hidden = !none; $('heardBox').hidden = none;
    if (none) return;
    const chat = cfg.mode === 'chat';
    $('youLine').hidden = !chat || !view.you;
    $('youLabel').textContent = _t('jp.heard.you');
    $('youTxt').textContent = view.you || '';
    $('robotLabel').textContent = _t('jp.heard.robot');
    renderRobot();
    const say = $('sayMsg'); say.textContent = view.msg || ''; say.hidden = !view.msg; say.className = 'say' + (view.tone ? ' ' + view.tone : '');
  }
  // Dins de la targeta (que té desplaçament propi), manté a la vista la paraula que s'està dient sense moure el cap virtual
  function keepVisible(el) {
    const box = $('heard'); if (!box || !el) return;
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    if (r.bottom > b.bottom - 8) box.scrollTop += r.bottom - b.bottom + 28; else if (r.top < b.top + 4) box.scrollTop -= b.top - r.top + 28;
  }
  function revealHeard() {
    const st = $('stage'), h = $('heard'); if (!st || !h) return;
    const sr = st.getBoundingClientRect(), hr = h.getBoundingClientRect();
    if (hr.bottom > sr.bottom) st.scrollTop += Math.min(hr.bottom - sr.bottom + 6, Math.max(0, hr.top - sr.top - 4));
  }
  function setView(v) { view = v; paintView(); }
  PIAR_I18N.onChange(() => { paintView(); refreshLabels(); showStatus(statusFn); fillVoices(); syncPersona(); paintMode(); });

  // ── Reproduir un guió: text + ordres ──────────────────────
  let runToken = 0, speakingNow = false;
  function setSpeaking(on) { speakingNow = on; $('stopBtn').disabled = !on; }
  const ttsErr = (code) => (['unsupported', 'notallowed', 'lang', 'nostart'].includes(code) ? code : 'tts');

  async function playPlan(plan, my) {
    setSpeaking(true);
    showStatus(() => '🗣 ' + _t('jp.msg.speaking'));
    const lang = convLang(), voice = pickVoice(lang);
    let result = 'done';
    try {
      for (let i = 0; i < plan.length; i++) {
        if (my !== runToken) { result = 'stopped'; break; }
        const p = plan[i];
        if (p.cmd) {
          if (p.el) p.el.classList.add('now');
          const r = await puppet.runSteps(J.commandSteps(p.cmd));
          if (p.el) p.el.classList.remove('now');
          if (r === 'stopped' || my !== runToken) { result = 'stopped'; break; }
          continue;
        }
        const key = kKey(lang, voice);
        const res = await puppet.speak(p.text, {
          lang, voice, rate: cfg.rate / 10, pitch: cfg.pitch / 10, robotic: cfg.robotic,
          k: cfg.learn ? (kMap[key] || 1) : 1, mouthRate: cfg.mouthRate / 100,
          onWord: (w) => { if (my !== runToken || !p.els) return; p.els.forEach((e, n) => { e.classList.toggle('now', n === w); e.classList.toggle('said', n < w); }); keepVisible(p.els[w]); }
        });
        if (p.els) p.els.forEach((e) => { e.classList.remove('now'); e.classList.add('said'); });
        if (res.status === 'stopped' || my !== runToken) { result = 'stopped'; break; }
        if (res.status === 'error') { result = 'error:' + ttsErr(res.code); break; }
        if (res.learn && cfg.learn) { kMap[key] = clamp((kMap[key] || 1) * (0.5 + 0.5 * res.learn.factor), 0.4, 2.5); saveK(); }
      }
    } finally {
      if (my === runToken) {
        setSpeaking(false);
        puppet.runSteps([{ yaw: 0, mouth: 0, ms: 0 }]);    // torna al centre i tanca la boca
      }
    }
    if (my === runToken) {
      if (result === 'done') showStatus(() => '✅ ' + _t('jp.msg.done'));
      else if (result.indexOf('error:') === 0) { const c = result.slice(6); showStatus(() => '⚠️ ' + _t('jp.msg.tts.' + c)); if (view) { view.msg = _t('jp.msg.tts.' + c); view.tone = 'warn'; paintView(); } }
    }
    return result;
  }

  function startPlan(items, you) {
    const my = ++runToken;
    puppet.stop();
    if (!items.length) { setView({ you, plan: [], msg: _t('jp.msg.empty'), tone: 'warn' }); showStatus(() => '⚠️ ' + _t('jp.msg.empty')); return 'empty'; }
    const plan = buildPlan(items);
    setView({ you, plan });
    return playPlan(plan, my);
  }

  // ── Entrada de text (escrit o per veu) ────────────────────
  async function handleInput(text, how) {
    text = String(text || '').trim();
    if (!text) return;
    if (cfg.mode === 'chat') return handleChat(text);
    const sc = J.parseScript(text);
    const r = startPlan(sc.items, '');
    if (sc.unknown.length && view) { view.msg = _t('jp.msg.unknown_cmd', { c: sc.unknown.map((u) => '[' + u + ']').join(' ') }); view.tone = 'warn'; paintView(); }
    return r;
  }

  const history = [];
  async function handleChat(text) {
    const my = ++runToken;
    puppet.stop(); setSpeaking(false);
    if (!CHAT.getKey()) { setView({ you: text, plan: [], msg: _t('jp.msg.nokey'), tone: 'warn' }); showStatus(() => '⚠️ ' + _t('jp.msg.nokey')); return 'nokey'; }
    if (navigator.onLine === false) { setView({ you: text, plan: [], msg: _t('jp.msg.offline'), tone: 'warn' }); showStatus(() => '🌐 ' + _t('jp.msg.offline')); return 'offline'; }
    setView({ you: text, thinking: true });
    showStatus(() => '🤖 ' + _t('jp.msg.thinking'));
    const end = hasBusy() ? PIAR_BUSY.begin({ message: _t('jp.busy.ai'), details: _t('jp.busy.ai_d'), icon: '✨' }) : null;
    let r = null, ge = null;
    try { r = await CHAT.reply({ history, text, lang: convLang(), persona: personaText(), model: cfg.gmodel }); } catch (e) { ge = e; } finally { if (end) end(); }
    if (my !== runToken) return 'cancelled';
    if (ge) {
      const code = ge.code || 'other';
      const why = _t('jp.ai.err.' + (['key', 'quota', 'net', 'model', 'region', 'server', 'blocked', 'empty'].includes(code) ? code : 'other'));
      setView({ you: text, plan: [], msg: _t('jp.msg.ai_err', { code: why }), tone: 'err' });
      showStatus(() => '❌ ' + _t('jp.msg.ai_err', { code: why }));
      return 'error';
    }
    history.push({ role: 'user', text }, { role: 'robot', text: r.text.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim() });
    while (history.length > 16) history.shift();
    const sc = J.parseScript(r.text);
    const plan = buildPlan(sc.items);
    setView({ you: text, plan });
    return playPlan(plan, my);
  }

  // ── Botó de parlar ────────────────────────────────────────
  let session = null, starting = false, releaseEarly = false, uiState = 'idle';
  function setMic(state) {
    uiState = state;
    const b = $('micBtn');
    b.classList.toggle('listening', state === 'listening');
    b.classList.toggle('thinking', state === 'thinking');
    b.disabled = state === 'thinking';
    $('micLabel').textContent = state === 'listening' ? (cfg.talk === 'tap' ? _t('jp.mic.tap_stop') : _t('jp.mic.listening'))
      : state === 'thinking' ? _t('jp.mic.thinking') : _t(cfg.talk === 'tap' ? 'jp.mic.tap' : 'jp.mic.hold');
  }
  function speechError(e) {
    const c = (e && e.code) || 'stt';
    const m = c === 'nospeech' ? () => _t('jp.msg.nospeech') : c === 'mic' ? () => _t('jp.msg.mic') : c === 'net' ? () => _t('jp.msg.net')
      : c === 'unsupported' ? () => _t('jp.msg.unsupported_stt') : c === 'lang' ? () => _t('jp.msg.lang') : () => _t('jp.msg.stt', { msg: String((e && e.message) || c).slice(0, 80) });
    showStatus(m);
  }
  async function startListen() {
    if (session || starting || uiState === 'thinking') return;
    if (!STT.supported()) { showStatus(() => _t('jp.msg.unsupported_stt')); return; }
    runToken++; puppet.stop(); setSpeaking(false);      // el robot calla perquè no s'escolte a si mateix
    starting = true; releaseEarly = false;
    try {
      session = await STT.listen({ lang: convLang(), onInterim: (t) => { if (t) setView({ you: cfg.mode === 'chat' ? t : '', plan: cfg.mode === 'chat' ? [] : [{ text: t, els: [] }], interim: true }); } });
      setMic('listening'); showStatus(() => '🎤 ' + _t('jp.mic.listening'));
      if (releaseEarly) stopListen();
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
    handleInput(text, 'voice');
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

  // ── Text, exemples, parar, centrar, mode ──────────────────
  $('textForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('textIn').value; $('textIn').value = ''; handleInput(v, 'text'); });
  document.querySelectorAll('.ex').forEach((b) => b.addEventListener('click', () => handleInput(_t('jp.ex.' + b.dataset.ex), 'example')));
  function stopAll() { runToken++; puppet.stop(); setSpeaking(false); puppet.runSteps([{ yaw: 0, mouth: 0, ms: 0 }]); }
  $('stopBtn').addEventListener('click', () => { stopAll(); showStatus(() => _t('jp.msg.stopped')); });
  $('centerBtn').addEventListener('click', () => { runToken++; setSpeaking(false); puppet.center(); });
  function paintMode() {
    const chat = cfg.mode === 'chat';
    $('modeSay').classList.toggle('on', !chat); $('modeSay').setAttribute('aria-pressed', String(!chat));
    $('modeChat').classList.toggle('on', chat); $('modeChat').setAttribute('aria-pressed', String(chat));
    $('exSay').hidden = chat; $('exChat').hidden = !chat;
    $('textIn').placeholder = _t(chat ? 'jp.text.ph_chat' : 'jp.text.ph_say');
    $('heardNone').textContent = _t(chat ? 'jp.heard.none_chat' : 'jp.heard.none_say');
    if (view) paintView();
  }
  function setMode(m) { if (cfg.mode === m) return; cfg.mode = m; saveCfg(); stopAll(); view = null; paintView(); paintMode(); toIdle(); }
  $('modeSay').addEventListener('click', () => setMode('say'));
  $('modeChat').addEventListener('click', () => setMode('chat'));

  // ── Configuració ──────────────────────────────────────────
  function refreshKeyState() { $('keyState').textContent = _t(CHAT.getKey() ? 'jp.cfg.gem_saved' : 'jp.cfg.gem_none'); }
  function refreshLabels() {
    $('rateLbl').textContent = _t('jp.cfg.rate', { n: fmtNum(cfg.rate / 10, 1) });
    $('pitchLbl').textContent = _t('jp.cfg.pitch', { n: fmtNum(cfg.pitch / 10, 1) });
    $('mouthRateLbl').textContent = _t('jp.cfg.mouthrate', { n: cfg.mouthRate });
    $('intervalLbl').textContent = _t('jp.cfg.interval', { n: fmtNum(cfg.interval / 100, 2) });
    $('yawHalfLbl').textContent = _t('jp.cfg.yawhalf', { n: cfg.yawHalf });
    $('mouthMaxLbl').textContent = _t('jp.cfg.mouthmax', { n: cfg.mouthMax });
    setMic(uiState); refreshKeyState();
  }
  function syncPersona() {
    const ta = $('cfgPersona'), custom = cfg.preset === 'custom';
    ta.readOnly = !custom;
    ta.value = custom ? (cfg.persona || presetText('friendly')) : presetText(cfg.preset);
  }
  function loadCfgUi() {
    $('cfgLang').value = cfg.lang; $('cfgTalk').value = cfg.talk; $('cfgRobotic').checked = cfg.robotic;
    $('cfgRate').value = cfg.rate; $('cfgPitch').value = cfg.pitch; $('cfgMouthRate').value = cfg.mouthRate;
    $('cfgLearn').checked = cfg.learn; $('cfgMove').value = cfg.move; $('cfgBlink').checked = cfg.blink;
    $('intervalSlider').value = cfg.interval; $('yawHalf').value = cfg.yawHalf; $('mouthMax').value = cfg.mouthMax;
    $('cfgInvert').checked = cfg.invert; $('cfgGModel').value = cfg.gmodel; $('cfgPreset').value = cfg.preset;
    fillVoices(); syncPersona(); refreshLabels();
  }
  const bind = (id, key, conv, after) => $(id).addEventListener('change', () => {
    cfg[key] = conv ? conv($(id)) : $(id).value; saveCfg(); refreshLabels(); if (after) after();
  });
  bind('cfgLang', 'lang', null, () => { fillVoices(); toIdle(); });
  bind('cfgVoice', 'voice');
  bind('cfgTalk', 'talk', null, toIdle);
  bind('cfgRobotic', 'robotic', (e) => e.checked); bind('cfgLearn', 'learn', (e) => e.checked); bind('cfgBlink', 'blink', (e) => e.checked);
  bind('cfgMove', 'move'); bind('cfgInvert', 'invert', (e) => e.checked); bind('cfgGModel', 'gmodel');
  bind('cfgPreset', 'preset', null, syncPersona);
  [['cfgRate', 'rate'], ['cfgPitch', 'pitch'], ['cfgMouthRate', 'mouthRate'], ['intervalSlider', 'interval'], ['yawHalf', 'yawHalf'], ['mouthMax', 'mouthMax']]
    .forEach(([id, key]) => $(id).addEventListener('input', () => { cfg[key] = parseInt($(id).value, 10); saveCfg(); refreshLabels(); }));
  $('cfgPersona').addEventListener('input', () => { if (cfg.preset === 'custom') { cfg.persona = $('cfgPersona').value.slice(0, 600); saveCfg(); } });
  $('cfgKey').addEventListener('change', () => { CHAT.setKey($('cfgKey').value); $('cfgKey').value = ''; refreshKeyState(); });
  $('keyClear').addEventListener('click', () => { CHAT.clearKey(); $('cfgKey').value = ''; refreshKeyState(); });
  $('chatReset').addEventListener('click', () => { history.length = 0; view = null; paintView(); showStatus(() => _t('jp.msg.newchat')); });
  $('voiceTest').addEventListener('click', () => { $('config-layer').style.display = 'none'; handleInput(_t('jp.test.text'), 'test'); });
  const cal = (y) => { runToken++; setSpeaking(false); puppet.stop(); puppet.setPose({ yaw: y, mouth: 0 }, true); };
  $('calL').addEventListener('click', () => cal(1)); $('calC').addEventListener('click', () => cal(0)); $('calR').addEventListener('click', () => cal(-1));
  $('calMouth').addEventListener('click', () => { runToken++; setSpeaking(false); puppet.stop(); puppet.setPose({ mouth: 1 }, true); setTimeout(() => puppet.setPose({ mouth: 0 }, true), 900); });

  // Capes i botons
  $('configBtn').onclick = () => { $('config-layer').style.display = 'flex'; fillVoices(); refreshKeyState(); };
  $('infoBtn').onclick = () => { $('info-layer').style.display = 'flex'; };
  $('closeConfigBtn').onclick = () => { $('config-layer').style.display = 'none'; };
  $('closeInfoBtn').onclick = () => { $('info-layer').style.display = 'none'; };

  // Bluetooth
  $('connectBtn').onclick = connectBluetooth;
  if (!navigator.bluetooth) { $('connectBtn').classList.remove('btn-primary'); $('connectBtn').classList.add('no-bt'); }
  onBTStatusChange((connected, msg) => {
    if (msg) showTranslatedStatus(msg);
    if (connected) { puppet.resend(); setTimeout(toIdle, 2500); }
  });

  // Idioma
  PIAR_I18N.mountSelector($('langSelectHost'));

  loadCfgUi(); paintMode();
  toIdle();

  // Per a les proves
  window.__jp = { cfg, puppet, handleInput, J, kMap, getView: () => view, state: () => ({ uiState, speaking: speakingNow, session: !!session }), history, pickVoice };
})();
