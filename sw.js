const CACHE_NAME = "deera-fares-warehouse-v2";
const APP_SHELL = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

// Install: pre-cache the basic app shell (best-effort, never blocks install)
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) => cache.add(url).catch(() => null))
      )
    )
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: only manage same-origin requests. Let everything else (CDNs, Firebase, fonts) go straight to the network untouched.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Don't touch cross-origin requests (React, Babel, Firebase, fonts, QR libs, etc.)
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () => caches.match("./index.html").then((r) => r || Response.error())
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached || Response.error());
    })
  );
});
