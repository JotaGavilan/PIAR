// ============================================================
//  stt-worker.js – Reconeixement de veu LOCAL (Whisper) en un Web Worker
//  El model es descarrega UNA vegada de Hugging Face i queda guardat al dispositiu (Cache API,
//  «transformers-cache») per a funcionar sense Internet. L'àudio no s'envia enlloc.
//
//  pare → worker:  {type:'load', model:'tiny'|'base'}
//                  {type:'transcribe', id, audio:Float32Array(16 kHz, mono), language:'catalan'|'spanish'|'english'}
//  worker → pare:  {type:'progress', loaded, total, file} · {type:'ready'} · {type:'result', id, text} · {type:'error', id?, message}
// ============================================================
import { pipeline, env } from '../../vendor/transformers-4.3.1/stt-bundle.js';

const MODELS = { tiny: 'onnx-community/whisper-tiny', base: 'onnx-community/whisper-base' };
const VENDOR = new URL('../../vendor/transformers-4.3.1/', import.meta.url).href;

env.allowLocalModels = false;
env.useBrowserCache = true;          // el model es guarda a la memòria del navegador («transformers-cache»)
env.useWasmCache = false;            // el .wasm ja el guarda el service worker (vendor/)
env.backends.onnx.wasm.wasmPaths = { mjs: VENDOR + 'ort-wasm-simd-threaded.asyncify.mjs', wasm: VENDOR + 'ort-wasm-simd-threaded.asyncify.wasm' };
env.backends.onnx.wasm.numThreads = 1;   // sense «cross-origin isolation» (GitHub Pages) només hi ha un fil

let asr = null, loadedModel = null;
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

async function load(model) {
  const id = MODELS[model] || MODELS.base;
  if (asr && loadedModel === id) { post({ type: 'ready', model }); return; }
  for (const k in files) delete files[k];
  asr = await pipeline('automatic-speech-recognition', id, { device: 'wasm', dtype: 'q8', progress_callback: onProgress });
  loadedModel = id;
  post({ type: 'ready', model });
}

async function transcribe(msg) {
  if (!asr) throw new Error('not-loaded');
  const out = await asr(msg.audio, { language: msg.language || 'catalan', task: 'transcribe', chunk_length_s: 30, return_timestamps: false });
  const text = String((out && (Array.isArray(out) ? out[0].text : out.text)) || '').replace(/\s+/g, ' ').trim();
  post({ type: 'result', id: msg.id, text });
}

self.onmessage = async (ev) => {
  const m = ev.data || {};
  try {
    if (m.type === 'load') await load(m.model);
    else if (m.type === 'transcribe') await transcribe(m);
  } catch (e) { post({ type: 'error', id: m.id, message: String((e && e.message) || e) }); }
};
