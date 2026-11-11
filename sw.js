const CACHE_NAME = "crudogb-offline-v9";
const OFFLINE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./screenshot.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = e.request.url;
  // Non intercettare mai i file caricati dalla memoria locale (blob:)
  if (url.startsWith("blob:") || url.startsWith("data:")) return;

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(e.request);
      if (cached) {
        fetch(e.request).then((res) => {
          if (res && res.status === 200) cache.put(e.request, res.clone());
        }).catch(() => {});
        return cached;
      }
      try {
        const netRes = await fetch(e.request);
        if (netRes && netRes.status === 200 && url.startsWith(self.location.origin)) {
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
