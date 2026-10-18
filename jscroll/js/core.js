// ============================================================
//  core.js – JScroll (què saben de tu quan fas scroll)
//  Lògica pura, sense DOM: puntuació de senyals, planificador del feed (2 fases), resum del perfil.
//  Tot es calcula al dispositiu. Es pot provar amb node.
// ============================================================
(function (root) {
  'use strict';

  // ── Els 12 interessos ────────────────────────────────────
  const TOPICS = [
    { id: 'music',   emoji: '🎧', color: '#c026d3' },
    { id: 'gaming',  emoji: '🎮', color: '#6366f1' },
    { id: 'sport',   emoji: '⚽', color: '#16a34a' },
    { id: 'fashion', emoji: '👟', color: '#ec4899' },
    { id: 'humor',   emoji: '😂', color: '#f59e0b' },
    { id: 'animals', emoji: '🐶', color: '#a16207' },
    { id: 'food',    emoji: '🍕', color: '#ef4444' },
    { id: 'travel',  emoji: '🏔️', color: '#0ea5e9' },
    { id: 'science', emoji: '🔬', color: '#14b8a6' },
    { id: 'art',     emoji: '🎨', color: '#f97316' },
    { id: 'cars',    emoji: '🏎️', color: '#64748b' },
    { id: 'cinema',  emoji: '🎬', color: '#8b5cf6' }
  ];
  const TOPIC_IDS = TOPICS.map((t) => t.id);

  const DEFAULT_CFG = { n: 50, maxMin: 0, adaptive: true, phase1Frac: .4, hint: false };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ── Números aleatoris reproduïbles (per a les proves) ─────
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(a, rnd) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ── Senyals d'una publicació ──────────────────────────────
  //  dwellMs   temps amb la publicació visible (≥ 60 % a la pantalla)
  //  zoomMs    temps amb la imatge ampliada (> 1,25×)       zoomMax  ampliació màxima
  //  replays   voltes extra del vídeo                        pauseMs  temps en pausa (tocant)
  //  liked / saved   botons                                   visits   vegades que ha aparegut
  function emptySig() { return { dwellMs: 0, zoomMs: 0, zoomMax: 1, replays: 0, pauseMs: 0, liked: false, saved: false, visits: 0 }; }

  // Pesos (es mostren a la pantalla «Com es calcula»)
  const W = { dwell: 1.0, zoomBase: .25, zoomTime: .25, zoomAmt: .1, replay: .2, replayMax: 3, pause: .2, skip: -.4, like: .5, save: .7 };
  function refMs(item) { return item.type === 'video' ? clamp((item.dur || 6) * 1000, 3000, 8000) : 4000; }
  function isFastSkip(item, s) { return s.visits > 0 && s.dwellMs < 800 && !s.liked && !s.saved && s.zoomMs < 300; }
  // Retorna { total, parts:{ dwell, zoom, replay, pause, skip, like, save } }
  function scorePost(item, s) {
    const parts = { dwell: 0, zoom: 0, replay: 0, pause: 0, skip: 0, like: 0, save: 0 };
    if (!s || !s.visits) return { total: 0, parts };
    parts.dwell = W.dwell * Math.min(s.dwellMs / refMs(item), 2) / 2;
    if (s.zoomMs >= 500) parts.zoom = W.zoomBase + W.zoomTime * Math.min(s.zoomMs / 4000, 1) + W.zoomAmt * Math.min((s.zoomMax - 1) / 2, 1);
    if (item.type === 'video') parts.replay = W.replay * Math.min(s.replays, W.replayMax);
    if (item.type === 'video') parts.pause = W.pause * Math.min(s.pauseMs / 3000, 1);
    if (isFastSkip(item, s)) parts.skip = W.skip;
    if (s.liked) parts.like = W.like;
    if (s.saved) parts.save = W.save;
    const total = Object.keys(parts).reduce((a, k) => a + parts[k], 0);
    return { total, parts };
  }

  // ── Puntuació per interés (mitjana de les publicacions vistes) ──
  // posts: [{ item, sig }]  (només les que s'han vist)
  function topicScores(posts) {
    const acc = {}; TOPIC_IDS.forEach((t) => { acc[t] = { topic: t, n: 0, sum: 0, dwellMs: 0, zoomMs: 0, likes: 0, saves: 0, replays: 0, skips: 0 }; });
    posts.forEach((p) => {
      if (!p.sig || !p.sig.visits) return;
      const a = acc[p.item.topic]; if (!a) return;
      a.n++; a.sum += scorePost(p.item, p.sig).total; a.dwellMs += p.sig.dwellMs; a.zoomMs += p.sig.zoomMs;
      a.likes += p.sig.liked ? 1 : 0; a.saves += p.sig.saved ? 1 : 0; a.replays += p.sig.replays; a.skips += isFastSkip(p.item, p.sig) ? 1 : 0;
    });
    return TOPIC_IDS.map((t) => Object.assign(acc[t], { mean: acc[t].n ? acc[t].sum / acc[t].n : 0 }));
  }

  // ── Planificador del feed ────────────────────────────────
  // pool: [{ id, topic, type, dur, ... }]  cfg: { n, adaptive, phase1Frac }
  function phase1Count(cfg) {
    const n = cfg.n;
    if (!cfg.adaptive) return n;
    return clamp(Math.round(n * cfg.phase1Frac / 12) * 12, 12, n);
  }
  function makePlanner(pool, cfg, rnd) {
    cfg = Object.assign({}, DEFAULT_CFG, cfg || {}); rnd = rnd || Math.random;
    const left = {}; TOPIC_IDS.forEach((t) => { left[t] = shuffle(pool.filter((p) => p.topic === t), rnd); });
    const n1 = phase1Count(cfg);
    let round = []; const history = [];
    function takeFrom(t) {
      const arr = left[t]; if (!arr || !arr.length) return null;
      // alterna foto/vídeo respecte a l'última publicació d'este interés
      const last = history.filter((h) => h.item.topic === t).slice(-1)[0];
      let idx = 0;
      if (last) { const k = arr.findIndex((x) => x.type !== last.item.type); if (k >= 0) idx = k; }
      return arr.splice(idx, 1)[0];
    }
    return {
      n1, history,
      get phase() { return history.length < n1 ? 1 : 2; },
      // scores: resultat de topicScores() fins ara
      next(scores) {
        if (history.length >= cfg.n) return null;
        const phase = history.length < n1 ? 1 : 2;
        let item = null;
        if (phase === 1) {
          if (!round.length) round = shuffle(TOPIC_IDS, rnd);
          while (round.length && !item) item = takeFrom(round.shift());
        } else {
          const live = TOPIC_IDS.filter((t) => left[t].length);
          if (!live.length) return null;
          const byT = {}; (scores || []).forEach((s) => { byT[s.topic] = s; });
          const w = live.map((t) => { const s = byT[t]; return 0.12 + Math.max(0, s ? s.mean : 0); });
          let t;
          if (rnd() < .2) t = live[Math.floor(rnd() * live.length)];                       // un 20 % d'exploració
          else { const tot = w.reduce((a, v) => a + v, 0); let r = rnd() * tot; t = live[live.length - 1]; for (let i = 0; i < live.length; i++) { r -= w[i]; if (r <= 0) { t = live[i]; break; } } }
          item = takeFrom(t);
        }
        if (!item) { // reserva: qualsevol que queda
          const t = TOPIC_IDS.find((x) => left[x].length); if (!t) return null; item = takeFrom(t);
        }
        history.push({ item, phase });
        return { item, phase };
      }
    };
  }

  // ── Resum final del perfil ───────────────────────────────
  // session: { declared:[topic], cfg, posts:[{ item, phase, sig }] }
  function summarize(session) {
    const posts = session.posts || [];
    const seen = posts.filter((p) => p.sig && p.sig.visits);
    const scores = topicScores(seen);
    const sumMean = scores.reduce((a, s) => a + Math.max(0, s.mean), 0);
    const totDwell = scores.reduce((a, s) => a + s.dwellMs, 0);
    const rank = scores.map((s) => ({
      topic: s.topic, n: s.n, mean: s.mean, share: sumMean ? Math.max(0, s.mean) / sumMean * 100 : 0,
      dwellShare: totDwell ? s.dwellMs / totDwell * 100 : 0, dwellMs: s.dwellMs, zoomMs: s.zoomMs, likes: s.likes, saves: s.saves, replays: s.replays, skips: s.skips
    })).sort((a, b) => b.share - a.share || b.dwellMs - a.dwellMs);
    rank.forEach((r, i) => { r.pos = i + 1; });
    const enough = seen.length >= 8;
    const top3 = rank.slice(0, 3).map((r) => r.topic);
    // dije vs hice
    const declared = (session.declared || []).slice(0, 3);
    const hits = declared.filter((t) => top3.includes(t));
    const declaredRanks = declared.map((t) => ({ topic: t, pos: rank.find((r) => r.topic === t).pos }));
    const surprises = top3.filter((t) => !declared.includes(t));
    const said = { declared, top3, hits, declaredRanks, surprises, matchCount: hits.length };
    // burbuja: quin % de les publicacions oferides eren dels teus 3 interessos (en cada fase)
    const shareTop = (arr) => arr.length ? arr.filter((p) => top3.includes(p.item.topic)).length / arr.length * 100 : 0;
    const p1 = posts.filter((p) => p.phase === 1), p2 = posts.filter((p) => p.phase === 2);
    const count = (arr) => { const c = {}; TOPIC_IDS.forEach((t) => { c[t] = 0; }); arr.forEach((p) => { c[p.item.topic]++; }); return c; };
    const bubble = { phase1: { n: p1.length, topShare: shareTop(p1), counts: count(p1) }, phase2: { n: p2.length, topShare: shareTop(p2), counts: count(p2) }, adaptive: !!(session.cfg && session.cfg.adaptive) && p2.length > 0 };
    bubble.delta = bubble.phase2.topShare - bubble.phase1.topShare;
    // mapa d'atenció
    const timeline = posts.map((p, i) => {
      const s = p.sig || emptySig(); const sc = scorePost(p.item, s);
      return { i, id: p.item.id, topic: p.item.topic, type: p.item.type, phase: p.phase, dwellMs: s.dwellMs, zoomMs: s.zoomMs, zoomMax: s.zoomMax, replays: s.replays, pauseMs: s.pauseMs, liked: s.liked, saved: s.saved, skip: isFastSkip(p.item, s) && s.visits > 0, seen: !!s.visits, score: sc.total, parts: sc.parts };
    });
    const totals = {
      posts: posts.length, seen: seen.length, dwellMs: seen.reduce((a, p) => a + p.sig.dwellMs, 0),
      zooms: seen.filter((p) => p.sig.zoomMs >= 500).length, likes: seen.filter((p) => p.sig.liked).length, saves: seen.filter((p) => p.sig.saved).length,
      replays: seen.reduce((a, p) => a + p.sig.replays, 0), skips: seen.filter((p) => isFastSkip(p.item, p.sig)).length
    };
    // un únic gest «revelador»: l'interés on més zoom
    const zoomTop = rank.slice().sort((a, b) => b.zoomMs - a.zoomMs)[0];
    return { rank, top3, enough, said, bubble, timeline, totals, zoomTop: zoomTop && zoomTop.zoomMs >= 500 ? zoomTop.topic : null };
  }

  // Raons «per què veus este anunci» a partir del resum
  function adReasons(sum, topic) {
    const r = sum.rank.find((x) => x.topic === topic); if (!r) return {};
    return { dwellS: Math.round(r.dwellMs / 1000), zooms: sum.timeline.filter((t) => t.topic === topic && t.zoomMs >= 500).length, likes: r.likes, saves: r.saves, replays: r.replays, share: Math.round(r.share) };
  }


  // ════════════════════════════════════════════════════════
  //  Simulador de diners: quant val la teua atenció per a la plataforma
  //  Dos mètodes independents que es contrasten (tots els valors en USD fins que es convertixen a €):
  //   1) De baix cap amunt: CPM (preu per cada 1.000 anuncis vists) × anuncis per publicació vista.
  //   2) De dalt cap avall: ingressos publicitaris anuals per menor (Harvard, PLOS ONE 2023, dades 2022 dels EUA)
  //      ÷ segons d'ús a l'any (Qustodio 2025, menors d'Espanya), reescalats al mercat amb la proporció de CPM.
  //  Cap dels dos és una dada publicada per les plataformes: són estimacions d'ordre de magnitud.
  // ════════════════════════════════════════════════════════
  const MONEY = {
    FX: 0.869,                       // 1 USD = 0,869 EUR (valutafx.com, 3-8-2026)
    SMI_DAY: 40.70,                  // SMI 2026 d'Espanya: 1.221 €/mes en 14 pagues = 40,70 €/dia (RD 126/2026)
    META: { adUsdQ: 59.36e9, revUsdQ: 60.80e9, dap: 3.60e9, arppUsdQ: 16.86, europeAdUsdQ: 10.85e9, daysQ: 91 },   // Q2 2026
    MARKETS: ['es', 'eu', 'us'],
    PLATFORMS: {
      // cpm: [mínim, màxim] en USD per 1.000 impressions. TikTok no publica CPM per a Espanya/Europa: s'usa el rang general.
      tiktok:    { cpm: { es: [2.87, 9.16], eu: [2.87, 9.16], us: [10, 15] }, harvUsd: 2.0e9, harvUsers: 18.9e6, minDay: 115 },
      instagram: { cpm: { es: [7, 10], eu: [7, 13], us: [20, 28] }, harvUsd: 4.0e9 + 0.8011e9, harvUsers: 16.7e6, minDay: 85 }
    },
    DEFAULTS: { platform: 'tiktok', market: 'es', adEvery: 5, secPerPost: 15, students: 25 }
  };
  const mid = (a) => (a[0] + a[1]) / 2;
  // CPM en € per 1.000 impressions
  function cpmEur(platform, market) {
    const r = MONEY.PLATFORMS[platform].cpm[market];
    return { low: r[0] * MONEY.FX, mid: mid(r) * MONEY.FX, high: r[1] * MONEY.FX };
  }
  // Valor d'un segon d'atenció en € { low, mid, high, cpm:{low,mid,high}, topdown }
  function ratePerSec(platform, market, o) {
    o = Object.assign({ adEvery: MONEY.DEFAULTS.adEvery, secPerPost: MONEY.DEFAULTS.secPerPost }, o || {});
    const P = MONEY.PLATFORMS[platform], c = cpmEur(platform, market);
    const secPerAd = Math.max(1, o.adEvery) * Math.max(1, o.secPerPost);
    const cpm = { low: c.low / 1000 / secPerAd, mid: c.mid / 1000 / secPerAd, high: c.high / 1000 / secPerAd };
    const scale = mid(P.cpm[market]) / mid(P.cpm.us);
    const arpuYr = P.harvUsd / P.harvUsers * MONEY.FX * scale;               // € per menor i any en este mercat
    const topdown = arpuYr / (P.minDay * 60 * 365);
    return { cpm, topdown, arpuYr, low: Math.min(cpm.low, topdown), mid: (cpm.mid + topdown) / 2, high: Math.max(cpm.high, topdown) };
  }
  // Projecció d'un valor per segon: segons → minut, hora, dia (minDay min), mes, any
  function project(perSec, minDay) {
    const day = perSec * minDay * 60;
    return { s: perSec, min: perSec * 60, h: perSec * 3600, day, month: day * 30.4, year: day * 365 };
  }
  // Sessió de JScroll: seen publicacions vistes i dwellMs de temps → € per a la plataforma
  function sessionMoney(platform, market, seen, dwellMs, o) {
    o = Object.assign({ adEvery: MONEY.DEFAULTS.adEvery }, o || {});
    const sec = dwellMs / 1000, c = cpmEur(platform, market), r = ratePerSec(platform, market, { adEvery: o.adEvery, secPerPost: seen ? sec / seen : MONEY.DEFAULTS.secPerPost });
    const ads = seen / Math.max(1, o.adEvery);
    const a = { low: ads * c.low / 1000, mid: ads * c.mid / 1000, high: ads * c.high / 1000 };   // mètode 1 amb els anuncis reals de la sessió
    const t = sec * r.topdown;                                                                  // mètode 2 amb el temps real
    return { ads, sec, secPerPost: seen ? sec / seen : 0, adsEur: a, topdown: t, low: Math.min(a.low, t), mid: (a.mid + t) / 2, high: Math.max(a.high, t) };
  }
  // Ingressos de Meta (Q2 2026) en € per segon i en total per a un nombre de segons
  function metaPerSec() { const usd = MONEY.META.adUsdQ / (MONEY.META.daysQ * 86400); return { usd, eur: usd * MONEY.FX }; }

  root.JScroll = { TOPICS, TOPIC_IDS, DEFAULT_CFG, W, mulberry32, shuffle, emptySig, scorePost, isFastSkip, topicScores, phase1Count, makePlanner, summarize, adReasons, clamp, MONEY, cpmEur, ratePerSec, project, sessionMoney, metaPerSec };
})(typeof window !== 'undefined' ? window : globalThis);
