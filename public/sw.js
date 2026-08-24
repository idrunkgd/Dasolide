/* Service worker minimal — coquille d'application + reprise hors ligne (§41). */
const CACHE = "muscu-v1";
const SHELL = ["/", "/offline", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => undefined)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Les données restent toujours fraîches : réseau d'abord, cache en secours.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Ressources statiques : cache d'abord.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ??
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Navigation : réseau d'abord pour rester à jour, page hors ligne en secours.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c ?? caches.match("/offline")))
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
