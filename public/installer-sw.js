// FIS Installer Service Worker
// Provides offline caching for installer PWA pages
const CACHE_NAME = 'fis-installer-v2'
const RUNTIME_CACHE = 'fis-installer-runtime-v2'

// Pages to pre-cache (shell)
const PRECACHE_URLS = [
  '/installer/login',
  '/installer/profile',
  '/installer/agreements',
  '/installer/attachments',
  '/installer/notifications',
  '/installer/referrals',
  '/installer/survey',
  '/installer/help',
]

// Install: pre-cache shell pages
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { mode: 'no-cors' }))
          )
        )
      })
      .then(() => self.skipWaiting())
  )
})

// Activate: clean old caches
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch: network-first for API, cache-first for pages
self.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url)

  // Only handle GET requests to our own origin
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return

  // API routes: network-first (don't cache stale data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
        .then((response) => response || new Response(
          JSON.stringify({ error: 'You are offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        ))
    )
    return
  }

  // Next.js internals: network-first, no caching
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Auth pages: network-first
  if (url.pathname.startsWith('/auth/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Installer pages & assets: cache-first with network fallback
  if (url.pathname.startsWith('/installer/') || url.pathname === '/logo.png' || url.pathname === '/favicon.png') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          // Update cache in background (stale-while-revalidate)
          fetch(event.request)
            .then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response.clone())
                })
              }
            })
            .catch(() => {})
          return cached
        }

        return fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone)
              })
            }
            return response
          })
          .catch(() => caches.match('/installer/login') || new Response('Offline', { status: 503 }))
      })
    )
    return
  }
})

// Handle messages from the client
self.addEventListener('message', (event: any) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
