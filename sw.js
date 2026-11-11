const CACHE_NAME = "crudogb-offline-v7";
const OFFLINE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./screenshot.png",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/loader.js",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/emulator.min.js",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/emulator.min.css",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/cores/mgba-legacy-wasm.data",
  "https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@latest/data/cores/gambatte-legacy-wasm.data"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        OFFLINE_URLS.map((url) =>
          fetch(url, { mode: "cors" })
            .then((res) => {
              if (res && res.status === 200) return cache.put(url, res);
            })
            .catch(() => {})
        )
      );
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const reqUrl = e.request.url;

  // Non intercettare mai gli URL blob: (sono le ROM caricate dal telefono!)
  if (reqUrl.startsWith("blob:") || reqUrl.startsWith("data:")) return;

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(e.request);

      if (cached) {
        // Aggiorna la cache in background quando c'è internet
        fetch(e.request)
          .then((netRes) => {
            if (netRes && netRes.status === 200) cache.put(e.request, netRes.clone());
          })
          .catch(() => {});
        return cached;
      }

      try {
        const netRes = await fetch(e.request);
        if (netRes && netRes.status === 200 && (reqUrl.startsWith(self.location.origin) || reqUrl.includes("cdn.jsdelivr.net"))) {
          cache.put(e.request, netRes.clone());
        }
        return netRes;
      } catch (err) {
        if (e.request.mode === "navigate") {
          const fallback = await cache.match("./index.html");
          if (fallback) return fallback;
        }
        throw err;
      }
    })()
  );
});
