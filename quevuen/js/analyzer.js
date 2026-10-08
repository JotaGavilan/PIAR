// ============================================================
//  analyzer.js – Motor d'anàlisi de «Què veuen de tu»
//  Tot s'executa dins del dispositiu: cap foto s'envia a cap servidor.
//
//  QV.loadImage(file)            → { canvas, w, h, url }   (la foto, ja girada segons l'EXIF)
//  QV.readMeta(file)             → metadades EXIF/XMP/IPTC resumides
//  QV.colors(canvas)             → paleta, llum
//  QV.detectFaces(canvas)        → cares amb edat, sexe aparent i expressió
//  QV.detectObjects(canvas)      → objectes (COCO-SSD)
//  QV.readText(canvas, langs)    → text (OCR, Tesseract)
//  QV.stripMetadata(canvas)      → Blob JPEG sense metadades
// ============================================================
(function () {
  'use strict';
  const BASE = new URL('../', document.currentScript ? document.currentScript.src : location.href);  // carpeta quevuen/
  const ROOT = new URL('../', BASE);                                                                  // arrel de PIAR
  const abs = (p) => new URL(p, ROOT).href;

  const MAX_SIDE = 1600;       // mida màxima de treball (la foto original no es toca)
  const DETECT_SIDE = 1024;    // mida per a detectar cares i objectes

  // ── Foto ───────────────────────────────────────────────────
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve({ canvas, w, h, origW: img.naturalWidth, origH: img.naturalHeight, url });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad-image')); };
      img.src = url;
    });
  }
  function scaled(canvas, side) {
    const k = Math.min(1, side / Math.max(canvas.width, canvas.height));
    if (k === 1) return { canvas, k: 1 };
    const c = document.createElement('canvas'); c.width = Math.round(canvas.width * k); c.height = Math.round(canvas.height * k);
    c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
    return { canvas: c, k };
  }

  // ── Metadades (EXIF, XMP, IPTC) ────────────────────────────
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  const str = (v) => {
    if (v == null) return null;
    if (v instanceof Uint8Array) { try { v = new TextDecoder().decode(v); } catch (e) { return null; } }
    if (Array.isArray(v)) v = v.join(', ');
    v = String(v).replace(/\0/g, '').trim();
    return v && v.length < 300 ? v : null;
  };
  async function readMeta(file) {
    const out = { has: false, raw: {}, gps: null, make: null, model: null, software: null, date: null, owner: null, serial: null,
      lens: null, description: null, copyright: null, orientation: null, fnumber: null, exposure: null, iso: null, focal: null, flash: null, thumbnail: false };
    if (typeof exifr === 'undefined') return out;
    let d = null;
    try {
      d = await exifr.parse(file, { tiff: true, exif: true, gps: true, xmp: true, iptc: true, ifd1: true, icc: false, interop: false, makerNote: false,
        userComment: true, translateKeys: true, translateValues: false, reviveValues: true, sanitize: true, mergeOutput: true });
    } catch (e) { d = null; }
    if (!d) return out;
    out.raw = d;
    const keys = Object.keys(d);
    out.has = keys.length > 0;
    const lat = num(d.latitude), lon = num(d.longitude);
    if (lat !== null && lon !== null && !(lat === 0 && lon === 0)) {
      out.gps = { lat, lon, alt: num(d.GPSAltitude) !== null ? d.GPSAltitude * (d.GPSAltitudeRef === 1 ? -1 : 1) : null,
        dir: num(d.GPSImgDirection), speed: num(d.GPSSpeed) };
    }
    out.make = str(d.Make); out.model = str(d.Model); out.software = str(d.Software);
    const dt = d.DateTimeOriginal || d.CreateDate || d.DateTime || d.DateTimeDigitized;
    if (dt instanceof Date && !isNaN(dt)) out.date = dt;
    else if (typeof dt === 'string') { const m = dt.match(/(\d{4})[:\-](\d\d)[:\-](\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?/); if (m) out.date = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)); }
    out.owner = str(d.Artist) || str(d.OwnerName) || str(d.CameraOwnerName) || str(d.creator) || str(d.Creator) || str(d.By_line) || str(d.byline);
    out.serial = str(d.BodySerialNumber) || str(d.SerialNumber) || str(d.CameraSerialNumber) || str(d.InternalSerialNumber);
    out.lens = str(d.LensModel);
    out.description = str(d.ImageDescription) || str(d.UserComment) || str(d.description) || str(d.Caption_Abstract) || str(d.title);
    out.copyright = str(d.Copyright) || str(d.rights);
    out.orientation = str(d.Orientation);
    out.fnumber = num(d.FNumber); out.exposure = num(d.ExposureTime); out.iso = num(d.ISO) !== null ? d.ISO : num(d.ISOSpeedRatings);
    out.focal = num(d.FocalLength); out.flash = d.Flash !== undefined ? d.Flash : null;
    out.thumbnail = !!(d.ThumbnailOffset !== undefined || d.thumbnail);
    return out;
  }

  // ── Colors i llum ──────────────────────────────────────────
  function colors(canvas) {
    const s = scaled(canvas, 96).canvas, ctx = s.getContext('2d');
    const px = ctx.getImageData(0, 0, s.width, s.height).data, n = px.length / 4;
    // llum mitjana (luminància percebuda)
    let sum = 0, dark = 0, bright = 0;
    const pts = [];
    for (let i = 0; i < px.length; i += 4) {
      const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      sum += l; if (l < 50) dark++; if (l > 205) bright++;
      pts.push([px[i], px[i + 1], px[i + 2]]);
    }
    // k-means (k = 5), llavors repartides
    const K = 5; let cs = []; for (let k = 0; k < K; k++) cs.push(pts[Math.floor((k + .5) * pts.length / K)].slice());
    const asg = new Array(pts.length).fill(0);
    for (let it = 0; it < 8; it++) {
      for (let i = 0; i < pts.length; i++) { let b = 0, bd = 1e9; for (let k = 0; k < K; k++) { const dr = pts[i][0] - cs[k][0], dg = pts[i][1] - cs[k][1], db = pts[i][2] - cs[k][2], dd = dr * dr + dg * dg + db * db; if (dd < bd) { bd = dd; b = k; } } asg[i] = b; }
      const acc = cs.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < pts.length; i++) { const a = acc[asg[i]]; a[0] += pts[i][0]; a[1] += pts[i][1]; a[2] += pts[i][2]; a[3]++; }
      cs = acc.map((a, k) => a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : cs[k]);
    }
    const cnt = new Array(K).fill(0); asg.forEach(a => cnt[a]++);
    const hex = (c) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    const palette = cs.map((c, k) => ({ hex: hex(c), pct: cnt[k] / n, rgb: c })).filter(c => c.pct > 0.02).sort((a, b) => b.pct - a.pct);
    return { palette, brightness: sum / n, darkPct: dark / n, brightPct: bright / n };
  }

  // ── Cares (face-api: detector petit + edat/sexe + expressió) ──
  let facesReady = null;
  function loadFaceNets() {
    if (facesReady) return facesReady;
    if (typeof faceapi === 'undefined') return (facesReady = Promise.reject(new Error('lib-missing')));
    const dir = abs('vendor/face-api-1.7.15/model');
    facesReady = (async () => {
      await faceapi.tf.ready();
      await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri(dir), faceapi.nets.ageGenderNet.loadFromUri(dir), faceapi.nets.faceExpressionNet.loadFromUri(dir)]);
    })().catch((e) => { facesReady = null; throw e; });
    return facesReady;
  }
  async function detectFaces(canvas) {
    await loadFaceNets();
    const s = scaled(canvas, DETECT_SIDE);
    const opt = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.45 });
    const res = await faceapi.detectAllFaces(s.canvas, opt).withAgeAndGender().withFaceExpressions();
    return res.map((r) => {
      const b = r.detection.box, ex = r.expressions || {};
      let top = 'neutral', tp = 0; Object.keys(ex).forEach(k => { if (ex[k] > tp) { tp = ex[k]; top = k; } });
      return { box: { x: b.x / s.k, y: b.y / s.k, w: b.width / s.k, h: b.height / s.k }, score: r.detection.score,
        age: r.age, gender: r.gender, genderProb: r.genderProbability, expr: top, exprProb: tp, exprAll: ex };
    });
  }

  // ── Objectes (COCO-SSD; els pesos es descarreguen una vegada i queden guardats) ──
  let cocoPromise = null;
  function loadCoco() {
    if (cocoPromise) return cocoPromise;
    if (typeof cocoSsd === 'undefined') return (cocoPromise = Promise.reject(new Error('lib-missing')));
    cocoPromise = cocoSsd.load({ base: 'lite_mobilenet_v2' }).catch((e) => { cocoPromise = null; throw e; });
    return cocoPromise;
  }
  async function detectObjects(canvas) {
    const m = await loadCoco();
    const s = scaled(canvas, DETECT_SIDE);
    const r = await m.detect(s.canvas, 40, 0.4);
    return r.map(o => ({ cls: o.class, score: o.score, box: { x: o.bbox[0] / s.k, y: o.bbox[1] / s.k, w: o.bbox[2] / s.k, h: o.bbox[3] / s.k } }));
  }

  // ── Text (OCR) ─────────────────────────────────────────────
  const workers = {};
  async function getWorker(langs, onProgress) {
    const key = langs.join('+');
    if (!workers[key]) {
      if (typeof Tesseract === 'undefined') throw new Error('lib-missing');
      workers[key] = Tesseract.createWorker(langs, 1, {
        workerPath: abs('vendor/tesseract.js-7.0.0/worker.min.js'),
        corePath: abs('vendor/tesseract.js-core-7.0.0/tesseract-core-lstm.wasm.js'),
        langPath: abs('vendor/tesseract-lang-4.0.0'),
        gzip: true, cacheMethod: 'none', workerBlobURL: true,
        logger: (m) => { if (workers.__cb && m && typeof m.progress === 'number') workers.__cb(m); }
      }).catch((e) => { delete workers[key]; throw e; });
    }
    workers.__cb = onProgress || null;
    return workers[key];
  }
  async function readText(canvas, langs, onProgress) {
    const w = await getWorker(langs, onProgress);
    const r = await w.recognize(canvas, {}, { blocks: true });
    const d = r.data || {};
    // Només es guarda el que té prou confiança i s'assembla a una paraula: en fotos sense text,
    // l'OCR s'inventa símbols solts (soroll) que no s'han de mostrar com si fora text llegit.
    const words = [], lines = [];
    const good = (wd) => wd.confidence >= 62 && /[\p{L}\p{N}]{2,}/u.test(wd.text) || (wd.confidence >= 80 && /[\p{N}]/u.test(wd.text));
    (d.blocks || []).forEach(bl => (bl.paragraphs || []).forEach(pa => (pa.lines || []).forEach(li => {
      const ws = (li.words || []).filter(good);
      if (!ws.length) return;
      ws.forEach(wd => words.push({ text: wd.text, conf: wd.confidence, box: { x: wd.bbox.x0, y: wd.bbox.y0, w: wd.bbox.x1 - wd.bbox.x0, h: wd.bbox.y1 - wd.bbox.y0 } }));
      lines.push(ws.map(wd => wd.text).join(' '));
    })));
    const alnum = lines.join('').replace(/[^\p{L}\p{N}]/gu, '').length;
    if (alnum < 4 || !words.some(w => w.text.replace(/[^\p{L}\p{N}]/gu, '').length >= 3)) return { text: '', confidence: d.confidence, words: [] };
    return { text: lines.join('\n'), confidence: d.confidence, words };
  }
  async function stopOcr() {
    for (const k of Object.keys(workers)) { if (k === '__cb') continue; try { (await workers[k]).terminate(); } catch (e) {} delete workers[k]; }
  }

  // ── Foto sense metadades (es torna a codificar des del dibuix) ──
  function stripMetadata(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  }


  // ── Protecció de cares abans d'enviar res al núvol ─────────
  // Detecta cares amb llindar baix i a diverses mides (millor una cara de més que una de menys).
  function iou(a, b) {
    const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y), x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
    const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1); return i / (a.w * a.h + b.w * b.h - i || 1);
  }
  async function detectFacesWide(canvas) {
    await loadFaceNets();
    const s = scaled(canvas, DETECT_SIDE), all = [];
    for (const size of [320, 416, 512, 608]) {
      const res = await faceapi.detectAllFaces(s.canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: size, scoreThreshold: 0.2 })).withAgeAndGender();
      res.forEach((r) => { const b = r.detection.box; all.push({ box: { x: b.x / s.k, y: b.y / s.k, w: b.width / s.k, h: b.height / s.k }, score: r.detection.score, age: r.age, gender: r.gender }); });
    }
    all.sort((p, q) => q.score - p.score);
    // Agrupa les deteccions de les distintes mides: es conserva la millor de cada grup
    const groups = [];
    all.forEach((f) => { const g = groups.find((o) => iou(o.best.box, f.box) > 0.35); if (g) g.n++; else groups.push({ best: f, n: 1 }); });
    // Una cara es dóna per bona si té confiança alta, o confiança mitjana confirmada per almenys dues mides (evita taques falses que farien pixelar de més)
    const out = groups.filter((g) => g.best.score >= 0.5 || (g.n >= 2 && g.best.score >= 0.25)).map((g) => g.best);
    return out;
  }
  // Còpia de la imatge amb un mosaic gros damunt de cada regió (amb marge perquè entren cabells i orelles)
  function pixelateRegions(canvas, boxes) {
    const out = document.createElement('canvas'); out.width = canvas.width; out.height = canvas.height;
    const ctx = out.getContext('2d'); ctx.drawImage(canvas, 0, 0);
    const regions = [];
    boxes.forEach((b) => {
      const mx = b.w * 0.35, myT = b.h * 0.55, myB = b.h * 0.3;
      const x0 = Math.max(0, Math.floor(b.x - mx)), y0 = Math.max(0, Math.floor(b.y - myT));
      const x1 = Math.min(canvas.width, Math.ceil(b.x + b.w + mx)), y1 = Math.min(canvas.height, Math.ceil(b.y + b.h + myB));
      const w = x1 - x0, h = y1 - y0; if (w < 2 || h < 2) return;
      const cells = 5;                                             // ~5 caselles en el costat més curt: no es pot reconéixer
      const bs = Math.max(6, Math.round(Math.min(w, h) / cells));
      const tw = Math.max(1, Math.ceil(w / bs)), th = Math.max(1, Math.ceil(h / bs));
      const tmp = document.createElement('canvas'); tmp.width = tw; tmp.height = th;
      const tctx = tmp.getContext('2d'); tctx.imageSmoothingEnabled = true; tctx.drawImage(canvas, x0, y0, w, h, 0, 0, tw, th);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, tw, th, x0, y0, w, h); ctx.imageSmoothingEnabled = true;
      regions.push({ x: x0, y: y0, w, h });
    });
    return { canvas: out, regions };
  }
  // JPEG redimensionat (sense EXIF: el canvas no en porta mai)
  function toJpegBlob(canvas, maxSide, q) {
    const k = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
    let c = canvas;
    if (k < 1) { c = document.createElement('canvas'); c.width = Math.round(canvas.width * k); c.height = Math.round(canvas.height * k); c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); }
    return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', q || 0.85));
  }

  window.QV = { loadImage, readMeta, colors, detectFaces, detectObjects, readText, stopOcr, stripMetadata, loadFaceNets, loadCoco, detectFacesWide, pixelateRegions, toJpegBlob, iou };
})();
