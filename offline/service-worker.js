/*
 * Keeps the built app working without a connection. The build prepends
 * OFFLINE_VERSION, ASSETS_DIR and PRECACHE_FILES (see offline/vite-plugin.ts)
 * and publishes the result as sw.js; src/lib/offline.ts registers it.
 */
/* global OFFLINE_VERSION, ASSETS_DIR, PRECACHE_FILES */

const CACHE_PREFIX = "nptel-offline-"
const CACHE_NAME = CACHE_PREFIX + OFFLINE_VERSION
const SCOPE = new URL("./", self.location.href)
// Every route of this single-page app loads the same document.
const SHELL_URL = SCOPE.href
const ASSETS_URL = new URL(`${ASSETS_DIR}/`, SCOPE).href
const PRECACHE_URLS = PRECACHE_FILES.map((file) => new URL(file, SCOPE).href)
const PRECACHED = new Set(PRECACHE_URLS)
// On a weak signal, open the saved copy instead of waiting on the network indefinitely.
const NAVIGATION_TIMEOUT_MS = 4000

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      // The shell names this build's hashed files, so skip the HTTP cache for it.
      const shell = await fetch(new Request(SHELL_URL, { cache: "reload" }))
      if (!shell.ok) throw new Error(`Couldn't download ${SHELL_URL}`)
      await cache.put(SHELL_URL, await withoutRedirect(shell))
      await cache.addAll(PRECACHE_URLS)
      // The app is one bundle, so open pages keep working when this version takes over.
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET" || !request.url.startsWith(SCOPE.href)) return
  if (request.mode === "navigate") event.respondWith(openPage(request))
  else if (PRECACHED.has(request.url) || request.url.startsWith(ASSETS_URL))
    event.respondWith(fromCache(event))
})

/** Network first, so online visits always get the latest version; the saved copy otherwise. */
async function openPage(request) {
  const network = fetch(request)
  const saved = await caches.match(SHELL_URL)
  if (!saved) return network
  network.catch(() => {})
  try {
    return await Promise.race([network, timeout(NAVIGATION_TIMEOUT_MS)])
  } catch {
    return saved
  }
}

/** Build files are content-hashed, so a saved copy never goes stale. */
async function fromCache(event) {
  const saved = await caches.match(event.request)
  if (saved) return saved
  const response = await fetch(event.request)
  if (response.ok) {
    const copy = response.clone()
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)),
    )
  }
  return response
}

/** Pages can't be answered with a redirected response, so store a clean copy. */
async function withoutRedirect(response) {
  if (!response.redirected) return response
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

function timeout(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timed out")), ms),
  )
}
