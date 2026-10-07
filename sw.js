/* ============================================================
   sw.js – Service worker de PIAR (permet instal·lar l'app i usar-la sense Internet)

   Tres memòries (Cache Storage):
     · piar-shell-<versió>  pàgines, estils, scripts, icones i guies (s'omple en instal·lar)
     · piar-vendor-v1       llibreries d'IA i fitxers de MediaPipe (carpeta /vendor/, s'omple en usar-les
                            o amb el botó «Descarregar per a ús sense Internet» de la portada)
     · piar-models-v1       models d'IA que es descarreguen de Google / Teachable Machine
                            (es guarden la primera vegada que es carreguen amb Internet)

   La versió la posa tools/build-pwa.py. No edites la línia de VERSION a mà.
   ============================================================ */
const VERSION = '38f256c36bb7';
const SHELL_CACHE  = 'piar-shell-' + VERSION;
const VENDOR_CACHE = 'piar-vendor-v1';
const MODEL_CACHE  = 'piar-models-v1';

// Servidors externs els models dels quals es guarden per a usar-los sense Internet
const MODEL_HOSTS = ['storage.googleapis.com', 'tfhub.dev', 'www.kaggle.com', 'kaggle.com', 'teachablemachine.withgoogle.com' /*__EXTRA_HOSTS__*/];

const SCOPE = new URL(self.registration.scope);
const inVendor = (u) => u.pathname.startsWith(SCOPE.pathname + 'vendor/') && !u.pathname.startsWith(SCOPE.pathname + 'vendor/fonts/');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const plan = await (await fetch(new URL('precache.json', SCOPE), { cache: 'reload' })).json();
    const cache = await caches.open(SHELL_CACHE);
    // Si falta algun fitxer, la instal·lació falla i es reintentarà més tard (no es queda a mitges)
    await cache.addAll(plan.shell.map((u) => new Request(new URL(u, SCOPE), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('piar-shell-') && k !== SHELL_CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

const putSafe = async (cacheName, req, resp) => {
  try { if (resp && resp.ok && resp.status === 200 && !resp.redirected) await (await caches.open(cacheName)).put(req, resp); } catch (e) { /* quota plena: no passa res */ }
};

// Les sol·licituds fetes pel «Test del mòbil» han d'anar SEMPRE a la xarxa real (és el que prova)
async function fromTestPage(event) {
  if (!event.clientId) return false;
  try { const c = await self.clients.get(event.clientId); return !!(c && c.url.includes('/test-mobil/')); } catch (e) { return false; }
}

async function shellStrategy(event, req, url) {
  const cache = await caches.open(SHELL_CACHE);
  let hit = await cache.match(req, { ignoreSearch: true });
  if (!hit && url.pathname.endsWith('/')) hit = await cache.match(new Request(new URL('index.html', url)), { ignoreSearch: true });
  const refresh = fetch(req, { cache: 'no-cache' }).then(async (resp) => {
    if (resp && resp.ok && resp.status === 200 && !resp.redirected) await cache.put(req, resp.clone()).catch(() => {});
    return resp;
  });
  if (hit) { event.waitUntil(refresh.catch(() => {})); return hit; }       // ràpid i funciona sense xarxa; s'actualitza darrere
  try { return await refresh; } catch (e) {
    if (req.mode === 'navigate') { const home = await cache.match(new URL('index.html', SCOPE)); if (home) return home; }
    throw e;
  }
}

async function cacheFirst(cacheName, req) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const resp = await fetch(req);
  await putSafe(cacheName, req, resp.clone());
  return resp;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === SCOPE.origin) {
    if (!url.pathname.startsWith(SCOPE.pathname)) return;
    if (req.headers.has('range')) return;
    if (inVendor(url)) { event.respondWith(cacheFirst(VENDOR_CACHE, req)); return; }
    event.respondWith(shellStrategy(event, req, url));
    return;
  }
  if (MODEL_HOSTS.includes(url.hostname)) {
    event.respondWith((async () => {
      if (await fromTestPage(event)) return fetch(req);
      return cacheFirst(MODEL_CACHE, req);
    })());
  }
});
