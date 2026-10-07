// ============================================================
//  piar_models.js – Models guardats de Màquina Ensenyable
//  Es guarden en IndexedDB (mateix origen: les apps de PIAR el comparteixen),
//  de manera que Teachable Microbit pot obrir un model recentment guardat a Màquina.
//
//  Entrada guardada (lleugera, sense mostres):
//   { id, name, modelType: 'image'|'pose'|'hands', classNames, classColors, savedAt,
//     payload: { topology, weightSpecs, weightData(base64) } }
//
//  API: PIAR_MODELS.fromProject(p) · save(entry) · list() · get(id) · remove(id)
//       PIAR_MODELS.TYPES  (tipus compatibles)
// ============================================================
(function () {
  const DB = 'piar-models', STORE = 'models', MAX = 30;
  const TYPES = ['image', 'pose', 'hands'];

  function open() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB not available')); return; }
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => { rq.result.createObjectStore(STORE, { keyPath: 'id' }); };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error || new Error('IndexedDB error'));
    });
  }
  function tx(mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode), st = t.objectStore(STORE);
      let out;
      try { out = fn(st); } catch (e) { db.close(); reject(e); return; }
      t.oncomplete = () => { db.close(); resolve(out && 'result' in out ? out.result : out); };
      t.onerror = t.onabort = () => { db.close(); reject(t.error || new Error('IndexedDB error')); };
    }));
  }
  const slug = s => String(s || 'model').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'model';

  // Valida un projecte de Màquina (.mia.json) i en treu l'entrada lleugera. Llança un Error amb .code:
  //  'format' (fitxer no vàlid) · 'nomodel' (sense model entrenat) · 'type' (tipus no compatible)
  function fromProject(p) {
    const err = code => { const e = new Error(code); e.code = code; return e; };
    if (!p || typeof p !== 'object' || !Array.isArray(p.classes)) throw err('format');
    const md = p.model;
    if (!md) throw err('nomodel');
    const type = md.modelType || p.modelType || 'image';
    if (!TYPES.includes(type)) throw err('type');
    if (!md.topology || !md.weightSpecs || typeof md.weightData !== 'string' || !Array.isArray(md.classNames) || !md.classNames.length) throw err('format');
    const name = String(p.name || 'model').slice(0, 60);
    return {
      id: 'mq-' + slug(name), name, modelType: type,
      classNames: md.classNames.map(String),
      classColors: Array.isArray(md.classColors) ? md.classColors : [],
      savedAt: Date.now(),
      payload: { topology: md.topology, weightSpecs: md.weightSpecs, weightData: md.weightData }
    };
  }

  async function save(entry) {
    entry.savedAt = entry.savedAt || Date.now();
    await tx('readwrite', st => st.put(entry));
    // Es limita el nombre de models: s'esborren els més antics
    const all = await list();
    if (all.length > MAX) for (const e of all.slice(MAX)) await remove(e.id);
    return entry.id;
  }
  // Llista sense el pes (només el que cal per a mostrar-la), del més nou al més antic
  async function list() {
    const rows = await tx('readonly', st => {
      const out = { result: [] }, rq = st.openCursor();
      rq.onsuccess = () => {
        const c = rq.result;
        if (c) { const v = c.value; out.result.push({ id: v.id, name: v.name, modelType: v.modelType, classNames: v.classNames, savedAt: v.savedAt }); c.continue(); }
      };
      return out;
    });
    return rows.sort((a, b) => b.savedAt - a.savedAt);
  }
  function get(id) {
    return tx('readonly', st => { const out = { result: null }, rq = st.get(id); rq.onsuccess = () => { out.result = rq.result || null; }; return out; });
  }
  function remove(id) { return tx('readwrite', st => { st.delete(id); }); }

  window.PIAR_MODELS = { TYPES, fromProject, save, list, get, remove };
})();
