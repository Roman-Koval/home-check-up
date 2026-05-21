// ================================================================
//  sw.js  —  CyprusGuard Service Worker
//  Strategy:
//    - App shell (HTML/CSS/JS/fonts) → Cache First
//    - Firebase API calls           → Network Only
//    - Images (Firebase Storage)    → Cache with Network fallback
// ================================================================

const CACHE_NAME = 'cyprusguard-v6';
const OFFLINE_URL = '/offline.html';

const SHELL_ASSETS = [
  './',
  './index.html',
  './client.html',
  './style.css',
  './admin.css',
  './client.css',
  './admin.js',
  './client.js',
  './firebase-config.js',
  './manifest.json',
  './manifest-client.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache what we can, silently skip missing files
      return Promise.allSettled(
        SHELL_ASSETS.map(url => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Only handle http(s) — Cache API rejects chrome-extension:, data:, blob: etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Firebase / API calls → Network Only (no caching)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('api.telegram.org') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('firebasestorage.googleapis.com')
  ) {
    return; // Let browser handle normally
  }

  // Google Fonts → Cache First
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Firebase CDN (SDKs) → Cache First
  if (url.hostname.includes('gstatic.com')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // App code (HTML/CSS/JS) → Network First, so updates appear without
  // waiting for a full SW lifecycle; falls back to cache when offline.
  if (/\.(html|css|js|json)$/.test(url.pathname) || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Everything else (images etc.) → Cache First with Network fallback
  event.respondWith(cacheFirst(event.request));
});

// Network First: try network, cache the fresh copy, fall back to cache offline
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && request.url.startsWith('http')) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw e;
  }
}

// ── STRATEGIES ───────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && request.url.startsWith('http')) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    // Offline fallback for navigation
    if (request.mode === 'navigate') {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Оффлайн</title><style>body{background:#070f1e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;flex-direction:column;gap:16px}</style></head><body><div style="font-size:48px">🏛️</div><div style="font-size:22px">CyprusGuard</div><div style="color:#888;font-size:14px">Нет подключения к интернету</div><button onclick="location.reload()" style="background:#c9a84c;color:#000;border:none;padding:10px 24px;border-radius:20px;cursor:pointer;font-size:14px;margin-top:8px">Обновить</button></body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
    return new Response('Offline', { status: 503 });
  }
}
