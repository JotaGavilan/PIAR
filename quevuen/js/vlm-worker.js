// ============================================================
//  vlm-worker.js – Descripció avançada de la foto amb un model de visió-llenguatge (Florence-2)
//  S'executa en un Web Worker perquè l'app no es bloquege. Tot passa al dispositiu:
//  el model es descarrega UNA vegada de Hugging Face i queda guardat (Cache API) per a usar-lo sense Internet.
//  La foto no s'envia enlloc.
// ============================================================
import { Florence2ForConditionalGeneration, AutoProcessor, RawImage, env } from '../../vendor/transformers-4.3.1/vlm-bundle.js';

const MODEL_ID = 'onnx-community/Florence-2-base-ft';
const VENDOR = new URL('../../vendor/transformers-4.3.1/', import.meta.url).href;

env.allowLocalModels = false;
env.useBrowserCache = true;          // el model es guarda a la memòria del navegador («transformers-cache»)
env.useWasmCache = false;            // el .wasm ja el guarda el service worker (vendor/)
env.backends.onnx.wasm.wasmPaths = { mjs: VENDOR + 'ort-wasm-simd-threaded.asyncify.mjs', wasm: VENDOR + 'ort-wasm-simd-threaded.asyncify.wasm' };
env.backends.onnx.wasm.numThreads = 1;   // sense «cross-origin isolation» (GitHub Pages) només hi ha un fil

let model = null, processor = null, device = null;
const files = {};

const post = (m) => self.postMessage(m);
function onProgress(p) {
  if (!p || !p.file) return;
  if (p.status === 'progress' || p.status === 'download' || p.status === 'initiate') {
    const f = (files[p.file] = files[p.file] || { loaded: 0, total: 0 });
    if (p.total) f.total = p.total;
    if (typeof p.loaded === 'number') f.loaded = p.loaded;
  } else if (p.status === 'done') {
    const f = (files[p.file] = files[p.file] || { loaded: 0, total: 0 }); if (f.total) f.loaded = f.total;
  }
  let loaded = 0, total = 0; for (const k in files) { loaded += files[k].loaded; total += files[k].total; }
  post({ type: 'progress', loaded, total, file: p.file });
}

async function load(pref) {
  const hasGpu = typeof navigator !== 'undefined' && !!navigator.gpu;
  const order = pref === 'wasm' ? ['wasm'] : (hasGpu ? ['webgpu', 'wasm'] : ['wasm']);
  let lastErr = null;
  for (const dev of order) {
    try {
      const dtype = dev === 'webgpu'
        ? { embed_tokens: 'fp16', vision_encoder: 'fp16', encoder_model: 'q4', decoder_model_merged: 'q4' }
        : { embed_tokens: 'q8', vision_encoder: 'q8', encoder_model: 'q8', decoder_model_merged: 'q8' };
      for (const k in files) delete files[k];
      model = await Florence2ForConditionalGeneration.from_pretrained(MODEL_ID, { device: dev, dtype, progress_callback: onProgress });
      processor = processor || await AutoProcessor.from_pretrained(MODEL_ID, { progress_callback: onProgress });
      device = dev; post({ type: 'ready', device: dev }); return;
    } catch (e) { lastErr = e; model = null; }
  }
  throw lastErr || new Error('no-model');
}

async function caption(msg) {
  if (!model) throw new Error('not-loaded');
  const rgba = new Uint8ClampedArray(msg.data);
  const image = new RawImage(rgba, msg.width, msg.height, 4).rgb();
  const task = msg.task || '<MORE_DETAILED_CAPTION>';
  const inputs = await processor(image, task);
  const ids = await model.generate({ ...inputs, max_new_tokens: msg.maxTokens || 200 });
  const raw = processor.tokenizer.batch_decode(ids, { skip_special_tokens: false })[0];
  const res = processor.post_process_generation(raw, task, image.size);
  const text = String(res[task] || '').replace(/\s+/g, ' ').trim();
  post({ type: 'result', id: msg.id, text, device });
}

self.onmessage = async (ev) => {
  const m = ev.data || {};
  try {
    if (m.type === 'load') await load(m.device);
    else if (m.type === 'caption') await caption(m);
    else if (m.type === 'ping') post({ type: 'pong', gpu: !!(self.navigator && navigator.gpu) });
    else if (m.type === 'selftest') {   // prova interna: crea una sessió ONNX xicoteta amb el .wasm local
      const { ORT } = await import('../../vendor/transformers-4.3.1/vlm-bundle.js');
      const s = await ORT.InferenceSession.create(new Uint8Array(m.model), { executionProviders: ['wasm'] });
      const out = await s.run({ X: new ORT.Tensor('float32', new Float32Array([1, 2, 3]), [1, 3]) });
      post({ type: 'selftest', out: Array.from(out.Y.data) });
    }
  } catch (e) { post({ type: 'error', id: m.id, message: String((e && e.message) || e) }); }
};
