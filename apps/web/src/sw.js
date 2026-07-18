// Basic service worker strategy
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('qt-shell').then((c) => c.addAll(['/index.html', '/manifest.json'])));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Exclude Firebase API, functions, private storage, auth
  if (url.pathname.startsWith('/__/auth') || 
      url.pathname.startsWith('/private-photos') ||
      url.hostname.includes('cloudfunctions.net') ||
      url.searchParams.has('token') ||
      url.searchParams.has('X-Goog-Signature')) {
    return fetch(e.request);
  }

  // Cache first for UI shell
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
