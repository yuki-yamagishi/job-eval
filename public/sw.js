/**
 * JobEval PWA Service Worker (v1)
 * High-performance offline caching & instant 0-second boot.
 */

const CACHE_NAME = "jobeval-pwa-cache-v1";
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon.svg"
];

// 1. Install: Precache core shell assets & activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Activate: Clean up old cache versions & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch: Cache-First with Stale-While-Revalidate for offline resilience
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass non-GET requests, Cloudflare D1 APIs, and external sync relays
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("ntfy.sh") ||
    !url.protocol.startsWith("http")
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // Cache successful GET responses
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and requesting navigation (page load), return cached root index.html
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          return null;
        });

      // Return cached asset immediately if available (0ms offline boot), otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
