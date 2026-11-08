const CACHE_NAME = "crudogb-offline-v6";
const OFFLINE_URLS = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./screenshot.png",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/loader.js",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/emulator.min.js",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/emulator.min.css",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/cores/mgba-wasm.data",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/cores/mgba-legacy-wasm.data",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/cores/gambatte-wasm.data",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/cores/gambatte-legacy-wasm.data"
];

// Installa e salva in cache i file necessari al funzionamento offline
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        OFFLINE_URLS.map(url => {
          return fetch(url, { mode: 'cors' })
            .then(res => { if(res.ok) cache.put(url, res); })
            .catch(() => {});
        })
      );
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

// Aggiunge gli header di isolamento per consentire SharedArrayBuffer (GBA veloce)
function addIsolationHeaders(res) {
  if (!res || res.status === 0 || res.type === "opaque") return res;
  const h = new Headers(res.headers);
  h.set("Cross-Origin-Embedder-Policy", "require-corp");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

// Intercetta le richieste e carica preferenzialmente dalla cache per l'offline
self.addEventListener("fetch", function(e){
  if (e.request.method !== "GET") return;
  e.respondWith((async function(){
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(e.request);
    if (cached) {
      fetch(e.request).then(netRes => {
        if (netRes && netRes.status === 200) cache.put(e.request, netRes.clone());
      }).catch(()=>{});
      return addIsolationHeaders(cached.clone());
    }
    try {
      const netRes = await fetch(e.request);
      if (netRes && netRes.status === 200) cache.put(e.request, netRes.clone());
      return addIsolationHeaders(netRes);
    } catch(err) {
      throw err;
    }
  })());
});
