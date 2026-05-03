/* service-worker.js — PWA offline shell */
const CACHE = 'mondial-v1';

const PRECACHE = [
  '/',
  '/login',
  '/static/css/base.css',
  '/static/css/layout.css',
  '/static/css/components.css',
  '/static/css/rtl.css',
  '/static/js/app.js',
  '/static/js/api.js',
  '/static/js/i18n.js',
  '/static/js/components/flag.js',
  '/static/js/components/match_card.js',
  '/static/js/components/countdown.js',
  '/static/js/components/modal.js',
  '/static/js/views/matches.js',
  '/static/js/views/match_detail.js',
  '/static/js/views/friends.js',
  '/static/js/views/predictions.js',
  '/static/js/views/leaderboard.js',
  '/static/js/views/notifications.js',
  '/static/lang/he.json',
  '/static/lang/en.json',
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evt) => {
  const { request } = evt;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // flagcdn — cache 30 days
  if (url.hostname === 'flagcdn.com') {
    evt.respondWith(
      caches.open('flags-v1').then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // API endpoints — network first, stale fallback for matches/today
  if (url.pathname.startsWith('/api/')) {
    evt.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok && url.pathname.includes('today')) {
            caches.open(CACHE).then(c => c.put(request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell — cache first
  evt.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
