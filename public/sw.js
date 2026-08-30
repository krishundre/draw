const CACHE_NAME = "drawboard-cache-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

function putInCache(request, response) {
  if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.protocol === "ws:" || url.protocol === "wss:") return;
  if (url.pathname.startsWith("/ws") || url.pathname.startsWith("/api/")) return;

  // /assets/* filenames are content-hashed by the build — the same URL never
  // changes content, so it's safe (and fast) to serve from cache first.
  const isImmutableAsset = url.pathname.startsWith("/assets/");
  if (isImmutableAsset) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            putInCache(event.request, clone);
            return response;
          })
      )
    );
    return;
  }

  // Everything else — index.html, docs pages, manifest, icons — is
  // network-first. These can change on any deploy and may reference
  // content-hashed assets that get deleted from the next deploy, so serving
  // a stale cached copy while online (e.g. cache-first) can point the
  // browser at files that no longer exist. Falling back to cache only when
  // the network is unavailable keeps offline support working.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (url.origin === self.location.origin) putInCache(event.request, response.clone());
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
