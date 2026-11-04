// ============================================================
//  script.js – JParla (robot que es mou i parla). Tres modes:
//   · Mou:       text/veu → intèrpret d'ordres (JMove, valencià/castellà/anglés) → passos → paquets «yyMMEE» (com JFace)
//   · Repeteix:  text/veu → veu del dispositiu (speechSynthesis) amb la boca per síl·labes + ordres [entre claudàtors]
//   · Conversa:  text/veu → IA de Google → text + ordres → com «Repeteix»
//   Sempre: micro:bit per Bluetooth UART i cap virtual en pantalla.
// ============================================================
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const J = window.JParla, M = window.JMove, STT = window.JParlaSTT, CHAT = window.JParlaChat;
  const hasBusy = () => !!window.PIAR_BUSY;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ── Configuració (es guarda al dispositiu) ───────────────
  const CFG_KEY = 'jparla.cfg.v1', K_KEY = 'jparla.k.v1';
  const DEF = {
    lang: 'auto', voice: '', rate: 10, pitch: 10, robotic: false, talk: 'hold',
    mouthRate: 100, learn: true, move: 'normal', blink: true,
    interval: 8, yawHalf: 10, mouthMax: 20, invert: false,
    gmodel: 'gemini-3.5-flash-lite', preset: 'friendly', persona: '', mode: 'say',
    engine: 'web', wmodel: 'base', gem: false
  };
  const cfg = Object.assign({}, DEF);
  let firstRun = true;
  try { const raw = localStorage.getItem(CFG_KEY); if (raw) { firstRun = false; Object.assign(cfg, JSON.parse(raw)); } } catch (e) {}
  // Qui venia de JVeu (app fusionada en esta): es recuperen els seus ajustos i s'obri en el mode «Mou»
  if (firstRun) {
    try {
      const o = JSON.parse(localStorage.getItem('jveu.cfg.v1') || 'null');
      if (o && typeof o === 'object') {
        cfg.mode = 'move';
        ['engine', 'wmodel', 'talk', 'yawHalf', 'mouthMax', 'invert', 'gem', 'gmodel'].forEach((k) => { if (o[k] !== undefined) cfg[k] = o[k]; });
        if (o.speechLang && o.speechLang !== 'auto') cfg.lang = o.speechLang;
        if (isFinite(o.interval)) cfg.interval = clamp(Math.round(o.interval * 10), 3, 50);   // JVeu: décimes de segon; ací: centèsimes
      }
    } catch (e) {}
    if (!STT.webSupported() && STT.whisperSupported()) cfg.engine = 'whisper';
  }
  if (!['move', 'say', 'chat'].includes(cfg.mode)) cfg.mode = 'say';
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };
  let kMap = {};
  try { kMap = JSON.parse(localStorage.getItem(K_KEY) || '{}') || {}; } catch (e) {}
  const saveK = () => { try { localStorage.setItem(K_KEY, JSON.stringify(kMap)); } catch (e) {} };

  const fmtNum = (n, d) => { const t = n.toFixed(d); return PIAR_I18N.lang === 'en' ? t : t.replace('.', ','); };
  const convLang = () => (cfg.lang === 'auto' ? PIAR_I18N.lang : cfg.lang);
  const synth = window.speechSynthesis;

  // ── Estat: missatges de la barra inferior (es guarden com a funció per a retraduir-los) ──
  const BT_STATUS_KEYS = ['sh.bt.ios_status', 'sh.bt.unsupported_status', 'sh.bt.searching', 'sh.bt.ok', 'sh.bt.error', 'sh.bt.disconnected'];
  const idleStatus = () => (isBluetoothConnected() ? _t(cfg.mode === 'chat' ? 'jp.msg.hint_chat' : cfg.mode === 'move' ? (cfg.talk === 'tap' ? 'jv.msg.hint_tap' : 'jv.msg.hint') : 'jp.msg.hint') : _t('jp.msg.nobt'));
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

  // ── Targeta «has dit / el robot diu / he entés» ────────────
  // view.kind = 'speak' (Repeteix i Conversa: cada tros té els seus <span class="w">, una per paraula, en l'ordre de la línia de temps)
  //           = 'move'  (Mou: passos entesos, en xicotets «chips»)
  let view = null;       // { kind, you, src, plan, steps, msg, tone, thinking }
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
    (view.plan || []).forEach((p) => {
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
  function stepChips(st) {
    const c = [];
    if (st.yaw !== undefined) c.push(st.yaw === 0 ? _t('jv.chip.yaw_c') : st.yaw > 0 ? _t('jv.chip.yaw_left', { p: Math.round(st.yaw * 100) }) : _t('jv.chip.yaw_right', { p: Math.round(-st.yaw * 100) }));
    else if (st.dyaw !== undefined) c.push(_t(st.dyaw > 0 ? 'jv.chip.more_left' : 'jv.chip.more_right'));
    if (st.mouth !== undefined) c.push(_t('jv.chip.mouth', { p: Math.round(st.mouth * 100) }));
    else if (st.dmouth !== undefined) c.push(_t(st.dmouth > 0 ? 'jv.chip.mouth_more' : 'jv.chip.mouth_less'));
    if (st.eyeL !== undefined && st.eyeR !== undefined && st.eyeL === st.eyeR) c.push(_t(st.eyeL ? 'jv.chip.eyes_open' : 'jv.chip.eyes_closed'));
    else {
      if (st.eyeL !== undefined) c.push(_t(st.eyeL ? 'jv.chip.eyeL_open' : 'jv.chip.eyeL_closed'));
      if (st.eyeR !== undefined) c.push(_t(st.eyeR ? 'jv.chip.eyeR_open' : 'jv.chip.eyeR_closed'));
    }
    return c;
  }
  let stepEls = [];
  function renderSteps() {
    const box = $('steps'); box.innerHTML = ''; stepEls = [];
    const steps = (view && view.kind === 'move' && view.steps) || [];
    $('moveBox').hidden = !steps.length;
    const MAX = 8;
    steps.slice(0, MAX).forEach((st, i) => {
      if (i) { const sep = document.createElement('span'); sep.className = 'sep'; sep.textContent = '›'; box.appendChild(sep); }
      const el = document.createElement('span'); el.className = 'step';
      stepChips(st).forEach((t) => { const ch = document.createElement('span'); ch.className = 'chip'; ch.textContent = t; el.appendChild(ch); });
      box.appendChild(el); stepEls.push(el);
    });
    if (steps.length > MAX) { const more = document.createElement('span'); more.className = 'chip'; more.textContent = _t('jv.chip.more', { n: steps.length - MAX }); box.appendChild(more); }
  }
  function markSteps(i, all) {
    stepEls.forEach((el, k) => { el.classList.toggle('now', !all && k === i); el.classList.toggle('done', all ? true : k < i); });
    const cur = !all && stepEls[i], box = $('steps');   // el pas actual es manté a la vista (desplaçament horitzontal)
    if (cur && box && box.scrollWidth > box.clientWidth) box.scrollLeft = Math.max(0, cur.offsetLeft - box.offsetLeft - 8);
  }
  document.body.classList.remove('has-view');
  function paintView() {
    const none = !view;
    document.body.classList.toggle('has-view', !none);
    $('heardNone').hidden = !none; $('heardBox').hidden = none;
    if (none) return;
    const move = view.kind === 'move', chat = cfg.mode === 'chat';
    $('youLine').hidden = !view.you || (!move && !chat);
    $('youLabel').textContent = _t(move ? 'jv.heard.said' : 'jp.heard.you');
    $('youTxt').textContent = view.you || '';
    $('heardSrc').textContent = move && view.src ? _t(view.src === 'gemini' ? 'jv.src.gemini' : 'jv.src.rules') : '';
    $('speakBox').hidden = move; $('robotLabel').textContent = _t('jp.heard.robot');
    if (!move) renderRobot();
    renderSteps();
    $('stepsLabel').hidden = !(move && view.steps && view.steps.length);
    const say = $('sayMsg'); say.textContent = view.msg || ''; say.hidden = !view.msg; say.className = 'say' + (view.tone ? ' ' + view.tone : '');
  }
  // Dins de la targeta (que té desplaçament propi), manté a la vista la paraula que s'està dient sense moure el cap virtual
  function keepVisible(el) {
    const box = $('heard'); if (!box || !el) return;
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    if (r.bottom > b.bottom - 8) box.scrollTop += r.bottom - b.bottom + 28; else if (r.top < b.top + 4) box.scrollTop -= b.top - r.top + 28;
  }
  function setView(v) { view = v; paintView(); }
  PIAR_I18N.onChange(() => { paintView(); refreshLabels(); showStatus(statusFn); fillVoices(); syncPersona(); paintMode(); refreshWhisperState(); });

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
    if (!items.length) { setView({ kind: 'speak', you, plan: [], msg: _t('jp.msg.empty'), tone: 'warn' }); showStatus(() => '⚠️ ' + _t('jp.msg.empty')); return 'empty'; }
    const plan = buildPlan(items);
    setView({ kind: 'speak', you, plan });
    return playPlan(plan, my);
  }

  // ── Entrada de text (escrit o per veu) ────────────────────
  function sayText(text) {
    const sc = J.parseScript(text);
    const r = startPlan(sc.items, '');
    if (sc.unknown.length && view) { view.msg = _t('jp.msg.unknown_cmd', { c: sc.unknown.map((u) => '[' + u + ']').join(' ') }); view.tone = 'warn'; paintView(); }
    return r;
  }
  async function handleInput(text, how) {
    text = String(text || '').trim();
    if (!text) return;
    if (cfg.mode === 'move') return handleMove(text);
    if (cfg.mode === 'chat') return handleChat(text);
    return sayText(text);
  }

  // ── Mode «Mou»: ordre → passos (regles, o IA de Google si les regles no ho entenen) ──
  const showPlanMove = (steps, src, say, tone) => setView({ kind: 'move', you: view && view.kind === 'move' ? view.you : '', src, steps, msg: say || '', tone: tone || '' });
  async function handleMove(text) {
    const my = ++runToken;
    puppet.stop(); setSpeaking(false);
    setView({ kind: 'move', you: text, src: null, steps: null });
    const plan = M.parse(text);
    if (plan.stop) { showPlanMove([], null, _t('jv.msg.stopped'), ''); showStatus(() => _t('jv.msg.stopped')); return 'stop'; }
    if (plan.ok) {
      const warn = plan.notes.includes('no_vertical') ? _t('jv.msg.no_vertical_part') : '';
      showPlanMove(plan.steps, 'rules', warn, warn ? 'warn' : '');
      return runMove(plan.steps, my);
    }
    if (plan.notes.includes('no_vertical')) { showPlanMove([], null, _t('jv.msg.no_vertical'), 'warn'); return 'none'; }
    // Les regles no ho entenen: IA de Google (opcional, només el text)
    if (cfg.gem) {
      if (!CHAT.getKey()) { showPlanMove([], null, _t('jv.msg.nothing') + ' ' + _t('jv.msg.gem_nokey'), 'warn'); return 'none'; }
      if (navigator.onLine === false) { showPlanMove([], null, _t('jv.msg.nothing') + ' ' + _t('jv.msg.gem_offline'), 'warn'); return 'none'; }
      const end = hasBusy() ? PIAR_BUSY.begin({ message: _t('jv.busy.gem'), details: _t('jv.busy.gem_d'), icon: '✨' }) : null;
      let r = null, ge = null;
      try { r = await CHAT.interpret(text, { lang: convLang(), model: cfg.gmodel }); } catch (e) { ge = e; } finally { if (end) end(); }
      if (my !== runToken) return 'cancelled';
      if (ge) {
        const code = ge.code || 'other';
        const why = _t('jv.gem.err.' + (['key', 'quota', 'net', 'model', 'region', 'server', 'blocked', 'empty'].includes(code) ? code : 'other'));
        showPlanMove([], null, _t('jv.msg.nothing') + ' ' + _t('jv.msg.gem_err', { code: why }), 'err'); return 'error';
      }
      if (r.steps.length) { showPlanMove(r.steps, 'gemini', r.say, ''); return runMove(r.steps, my); }
      showPlanMove([], null, r.say || _t('jv.msg.nothing_gem'), 'warn'); return 'none';
    }
    showPlanMove([], null, _t('jv.msg.nothing'), 'warn');
    return 'none';
  }
  async function runMove(steps, my) {
    setSpeaking(true);
    const res = await puppet.runSteps(steps, { slow: true, onStep: (i) => { if (my === runToken) markSteps(i); } });
    if (my === runToken) {
      setSpeaking(false); markSteps(-1, true);
      if (res === 'done') showStatus(() => _t('jv.msg.done'));
    }
    return res;
  }

  const history = [];
  async function handleChat(text) {
    const my = ++runToken;
    puppet.stop(); setSpeaking(false);
    if (!CHAT.getKey()) { setView({ kind: 'speak', you: text, plan: [], msg: _t('jp.msg.nokey'), tone: 'warn' }); showStatus(() => '⚠️ ' + _t('jp.msg.nokey')); return 'nokey'; }
    if (navigator.onLine === false) { setView({ kind: 'speak', you: text, plan: [], msg: _t('jp.msg.offline'), tone: 'warn' }); showStatus(() => '🌐 ' + _t('jp.msg.offline')); return 'offline'; }
    setView({ kind: 'speak', you: text, thinking: true });
    showStatus(() => '🤖 ' + _t('jp.msg.thinking'));
    const end = hasBusy() ? PIAR_BUSY.begin({ message: _t('jp.busy.ai'), details: _t('jp.busy.ai_d'), icon: '✨' }) : null;
    let r = null, ge = null;
    try { r = await CHAT.reply({ history, text, lang: convLang(), persona: personaText(), model: cfg.gmodel }); } catch (e) { ge = e; } finally { if (end) end(); }
    if (my !== runToken) return 'cancelled';
    if (ge) {
      const code = ge.code || 'other';
      const why = _t('jp.ai.err.' + (['key', 'quota', 'net', 'model', 'region', 'server', 'blocked', 'empty'].includes(code) ? code : 'other'));
      setView({ kind: 'speak', you: text, plan: [], msg: _t('jp.msg.ai_err', { code: why }), tone: 'err' });
      showStatus(() => '❌ ' + _t('jp.msg.ai_err', { code: why }));
      return 'error';
    }
    history.push({ role: 'user', text }, { role: 'robot', text: r.text.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim() });
    while (history.length > 16) history.shift();
    const sc = J.parseScript(r.text);
    const plan = buildPlan(sc.items);
    setView({ kind: 'speak', you: text, plan });
    return playPlan(plan, my);
  }

  // ── Whisper: descàrrega / càrrega del model ───────────────
  const WH_MB = { tiny: 40, base: 80 };
  async function ensureWhisper() {
    const model = cfg.wmodel;
    if (STT.whisperReady(model)) return true;
    if (!STT.whisperSupported()) { showStatus(() => _t('jv.msg.unsupported_whisper')); return false; }
    if (!(await STT.whisperEngine())) { showStatus(() => _t('jv.msg.whisper_missing')); return false; }
    const cached = await STT.whisperCached(model);
    if (!cached) {
      if (navigator.onLine === false) { showStatus(() => _t('jv.msg.whisper_offline')); return false; }
      if (!confirm(_t('jv.wh.confirm', { mb: WH_MB[model] }))) return false;
    }
    const end = hasBusy() ? PIAR_BUSY.begin({ message: _t(cached ? 'jv.wh.loading' : 'jv.wh.busy'), details: _t(cached ? 'jv.wh.loading_d' : 'jv.wh.busy_d'), icon: '🎙', progress: cached ? null : 0.02 }) : null;
    try {
      await STT.whisperLoad(model, (p) => {
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
    if (!STT.whisperSupported()) { el.textContent = _t('jv.wh.state_unsupported'); $('whBtn').disabled = true; return; }
    const ok = STT.whisperReady(cfg.wmodel) || await STT.whisperCached(cfg.wmodel);
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
    $('micLabel').textContent = state === 'listening' ? (cfg.talk === 'tap' ? _t('jp.mic.tap_stop') : _t('jp.mic.listening'))
      : state === 'thinking' ? _t('jp.mic.thinking') : _t(cfg.talk === 'tap' ? 'jp.mic.tap' : 'jp.mic.hold');
  }
  function speechError(e) {
    const c = (e && e.code) || 'stt';
    const m = c === 'nospeech' ? () => _t('jv.msg.nospeech') : c === 'mic' ? () => _t('jv.msg.mic') : c === 'net' ? () => _t('jv.msg.net')
      : c === 'unsupported' ? () => _t(cfg.engine === 'whisper' ? 'jv.msg.unsupported_whisper' : 'jv.msg.unsupported_web')
      : c === 'lang' ? () => _t('jv.msg.lang') : c === 'load' ? () => _t('jv.msg.whisper_fail') : c === 'missing' ? () => _t('jv.msg.whisper_missing') : () => _t('jv.msg.stt', { msg: String((e && e.message) || c).slice(0, 80) });
    showStatus(m);
  }
  // Text provisional mentre es parla (només en el que es veu a la targeta)
  function showInterim(t) {
    if (!t) return;
    if (cfg.mode === 'say') setView({ kind: 'speak', you: '', plan: [{ text: t, els: [] }] });
    else setView({ kind: cfg.mode === 'move' ? 'move' : 'speak', you: t, plan: [], steps: null });
  }
  async function startListen() {
    if (session || starting || uiState === 'thinking') return;
    if (cfg.engine === 'web' && !STT.webSupported()) { showStatus(() => _t('jv.msg.unsupported_web')); return; }
    if (cfg.engine === 'whisper') {
      if (!STT.whisperReady(cfg.wmodel)) { const ok = await ensureWhisper(); if (ok) toIdle(); return; }   // la 1a vegada: es carrega el model i es torna a prémer
    }
    runToken++; puppet.stop(); setSpeaking(false);      // el robot calla perquè no s'escolte a si mateix
    starting = true; releaseEarly = false;
    try {
      session = await STT.listen({
        engine: cfg.engine, lang: convLang(), model: cfg.wmodel,
        onInterim: showInterim,
        onState: (st) => { if (st === 'transcribing') setMic('thinking'); }
      });
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
  document.querySelectorAll('.ex').forEach((b) => b.addEventListener('click', () => handleInput(_t(b.dataset.k), 'example')));
  function stopAll() { runToken++; puppet.stop(); setSpeaking(false); }
  $('stopBtn').addEventListener('click', () => {
    const wasSpeech = view && view.kind === 'speak';
    stopAll();
    if (wasSpeech) puppet.runSteps([{ yaw: 0, mouth: 0, ms: 0 }]);   // en parlar, torna al centre i tanca la boca
    if (view && view.kind === 'move') markSteps(-1, true);
    showStatus(() => _t(cfg.mode === 'move' ? 'jv.msg.stopped' : 'jp.msg.stopped'));
  });
  $('centerBtn').addEventListener('click', () => { runToken++; setSpeaking(false); puppet.center(); });
  const MODES = ['move', 'say', 'chat'], MODE_BTN = { move: 'modeMove', say: 'modeSay', chat: 'modeChat' }, MODE_EX = { move: 'exMove', say: 'exSay', chat: 'exChat' };
  function paintMode() {
    MODES.forEach((m) => { const on = cfg.mode === m; $(MODE_BTN[m]).classList.toggle('on', on); $(MODE_BTN[m]).setAttribute('aria-pressed', String(on)); $(MODE_EX[m]).hidden = !on; });
    $('textIn').placeholder = _t({ move: 'jv.text.ph', say: 'jp.text.ph_say', chat: 'jp.text.ph_chat' }[cfg.mode]);
    $('heardNone').textContent = _t({ move: 'jv.heard.none', say: 'jp.heard.none_say', chat: 'jp.heard.none_chat' }[cfg.mode]);
    document.body.dataset.mode = cfg.mode;
    if (view) paintView();
  }
  function setMode(m) { if (cfg.mode === m) return; cfg.mode = m; saveCfg(); stopAll(); view = null; paintView(); paintMode(); toIdle(); }
  MODES.forEach((m) => $(MODE_BTN[m]).addEventListener('click', () => setMode(m)));

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
  function syncBoxes() { $('whisperBox').hidden = cfg.engine !== 'whisper'; }
  function loadCfgUi() {
    $('cfgLang').value = cfg.lang; $('cfgTalk').value = cfg.talk; $('cfgRobotic').checked = cfg.robotic;
    $('cfgRate').value = cfg.rate; $('cfgPitch').value = cfg.pitch; $('cfgMouthRate').value = cfg.mouthRate;
    $('cfgLearn').checked = cfg.learn; $('cfgMove').value = cfg.move; $('cfgBlink').checked = cfg.blink;
    $('intervalSlider').value = cfg.interval; $('yawHalf').value = cfg.yawHalf; $('mouthMax').value = cfg.mouthMax;
    $('cfgInvert').checked = cfg.invert; $('cfgGModel').value = cfg.gmodel; $('cfgPreset').value = cfg.preset;
    $('cfgEngine').value = cfg.engine; $('cfgWModel').value = cfg.wmodel; $('cfgGem').checked = cfg.gem;
    syncBoxes(); fillVoices(); syncPersona(); refreshLabels();
  }
  const bind = (id, key, conv, after) => $(id).addEventListener('change', () => {
    cfg[key] = conv ? conv($(id)) : $(id).value; saveCfg(); syncBoxes(); refreshLabels(); if (after) after();
  });
  bind('cfgLang', 'lang', null, () => { fillVoices(); toIdle(); });
  bind('cfgVoice', 'voice');
  bind('cfgTalk', 'talk', null, toIdle);
  bind('cfgRobotic', 'robotic', (e) => e.checked); bind('cfgLearn', 'learn', (e) => e.checked); bind('cfgBlink', 'blink', (e) => e.checked);
  bind('cfgMove', 'move'); bind('cfgInvert', 'invert', (e) => e.checked); bind('cfgGModel', 'gmodel');
  bind('cfgPreset', 'preset', null, syncPersona);
  bind('cfgEngine', 'engine'); bind('cfgWModel', 'wmodel', null, refreshWhisperState); bind('cfgGem', 'gem', (e) => e.checked);
  $('whBtn').addEventListener('click', async () => { if (await ensureWhisper()) toIdle(); });
  [['cfgRate', 'rate'], ['cfgPitch', 'pitch'], ['cfgMouthRate', 'mouthRate'], ['intervalSlider', 'interval'], ['yawHalf', 'yawHalf'], ['mouthMax', 'mouthMax']]
    .forEach(([id, key]) => $(id).addEventListener('input', () => { cfg[key] = parseInt($(id).value, 10); saveCfg(); refreshLabels(); }));
  $('cfgPersona').addEventListener('input', () => { if (cfg.preset === 'custom') { cfg.persona = $('cfgPersona').value.slice(0, 600); saveCfg(); } });
  $('cfgKey').addEventListener('change', () => { CHAT.setKey($('cfgKey').value); $('cfgKey').value = ''; refreshKeyState(); });
  $('keyClear').addEventListener('click', () => { CHAT.clearKey(); $('cfgKey').value = ''; refreshKeyState(); });
  $('chatReset').addEventListener('click', () => { history.length = 0; view = null; paintView(); showStatus(() => _t('jp.msg.newchat')); });
  $('voiceTest').addEventListener('click', () => { $('config-layer').style.display = 'none'; sayText(_t('jp.test.text')); });
  const cal = (y) => { runToken++; setSpeaking(false); puppet.stop(); puppet.setPose({ yaw: y, mouth: 0 }, true); };
  $('calL').addEventListener('click', () => cal(1)); $('calC').addEventListener('click', () => cal(0)); $('calR').addEventListener('click', () => cal(-1));
  $('calMouth').addEventListener('click', () => { runToken++; setSpeaking(false); puppet.stop(); puppet.setPose({ mouth: 1 }, true); setTimeout(() => puppet.setPose({ mouth: 0 }, true), 900); });

  // Capes i botons
  $('configBtn').onclick = () => { $('config-layer').style.display = 'flex'; fillVoices(); refreshKeyState(); refreshWhisperState(); };
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

  loadCfgUi(); paintMode(); refreshWhisperState();
  toIdle();

  // Per a les proves
  window.__jp = { cfg, puppet, handleInput, sayText, handleMove, M, J, kMap, ensureWhisper, getView: () => view, state: () => ({ uiState, speaking: speakingNow, session: !!session }), history, pickVoice };
})();
