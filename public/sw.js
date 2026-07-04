// myFinalsCup service worker — offline app shell + runtime caching.
const CACHE_VERSION = "mfc-v1"
const OFFLINE_URL = "/offline"

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION)
      await cache.addAll(PRECACHE_URLS)
      self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop old cache versions.
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  // Only handle same-origin GET requests. Let the browser deal with the rest
  // (POST server actions, Stripe redirects, cross-origin assets, etc.).
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return
  }

  // Never cache API routes or auth flows — always hit the network.
  const url = new URL(request.url)
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return
  }

  // Navigations: network-first, fall back to cached offline page when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
          const cache = await caches.open(CACHE_VERSION)
          const cached = await cache.match(OFFLINE_URL)
          return cached ?? Response.error()
        }
      })(),
    )
    return
  }

  // Static assets: cache-first with background refresh (stale-while-revalidate).
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION)
      const cached = await cache.match(request)
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            cache.put(request, response.clone())
          }
          return response
        })
        .catch(() => cached)
      return cached ?? network
    })(),
  )
})
