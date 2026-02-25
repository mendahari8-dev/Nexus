// ── NEXUS PRO SERVICE WORKER v2.0 - Safari Compatible ───────────
const CACHE_NAME = ‘nexuspro-v1’;
const STATIC_CACHE = ‘nexuspro-static-v1’;

// Files to cache for offline use
const STATIC_FILES = [
‘/’,
‘/index.html’,
‘/manifest.json’,
‘/icon-192.png’,
‘/icon-512.png’,
];

// ── INSTALL ──────────────────────────────────────────────────────
self.addEventListener(‘install’, event => {
console.log(’[SW] Installing NexusPro Service Worker…’);
event.waitUntil(
caches.open(STATIC_CACHE)
.then(cache => {
console.log(’[SW] Caching static files’);
return cache.addAll(STATIC_FILES);
})
.then(() => self.skipWaiting())
);
});

// ── ACTIVATE ─────────────────────────────────────────────────────
self.addEventListener(‘activate’, event => {
console.log(’[SW] Activating NexusPro Service Worker…’);
event.waitUntil(
caches.keys().then(keys => {
return Promise.all(
keys
.filter(key => key !== CACHE_NAME && key !== STATIC_CACHE)
.map(key => {
console.log(’[SW] Deleting old cache:’, key);
return caches.delete(key);
})
);
}).then(() => self.clients.claim())
);
});

// ── FETCH ────────────────────────────────────────────────────────
self.addEventListener(‘fetch’, event => {
const { request } = event;
const url = new URL(request.url);

// Skip non-GET requests
if (request.method !== ‘GET’) return;

// Skip chrome-extension and other non-http requests
if (!url.protocol.startsWith(‘http’)) return;

event.respondWith(
caches.match(request).then(cachedResponse => {
if (cachedResponse) {
// Return cached, then update in background
fetch(request).then(response => {
if (response && response.status === 200) {
caches.open(CACHE_NAME).then(cache => cache.put(request, response));
}
}).catch(() => {});
return cachedResponse;
}

```
  // Network first
  return fetch(request)
    .then(response => {
      if (!response || response.status !== 200) return response;
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
      return response;
    })
    .catch(() => {
      // Offline fallback
      return caches.match('/') || new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>NexusPro — Offline</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          body{background:#0B0F19;color:#fff;display:flex;align-items:center;
            justify-content:center;height:100vh;margin:0;font-family:monospace;text-align:center;}
          .logo{font-size:48px;margin-bottom:16px;}
          h1{color:#00F5A0;font-size:22px;margin-bottom:8px;}
          p{color:#6B7280;font-size:14px;}
          .dot{width:8px;height:8px;border-radius:50%;background:#F59E0B;
            display:inline-block;margin:16px auto;animation:blink 1s infinite;}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        </style>
        </head>
        <body>
          <div>
            <div class="logo">📡</div>
            <h1>NEXUS<span style="color:#fff">PRO</span></h1>
            <div class="dot"></div>
            <p>You're offline<br>Connect to internet to view live signals</p>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    });
})
```

);
});

// ── PUSH NOTIFICATIONS ───────────────────────────────────────────
self.addEventListener(‘push’, event => {
const data = event.data ? event.data.json() : {};
const title = data.title || ‘⚡ New Signal — NexusPro’;
const options = {
body: data.body || ‘New high-confidence signal available!’,
icon: ‘/icon-192.png’,
badge: ‘/icon-72.png’,
tag: data.tag || ‘nexuspro-signal’,
renotify: true,
vibrate: [200, 100, 200],
data: { url: data.url || ‘/’ },
actions: [
{ action: ‘view’, title: ‘📈 View Signal’ },
{ action: ‘dismiss’, title: ‘Dismiss’ }
]
};

event.waitUntil(
self.registration.showNotification(title, options)
);
});

// ── NOTIFICATION CLICK ───────────────────────────────────────────
self.addEventListener(‘notificationclick’, event => {
event.notification.close();
if (event.action === ‘dismiss’) return;

const url = event.notification.data?.url || ‘/’;
event.waitUntil(
clients.matchAll({ type: ‘window’, includeUncontrolled: true })
.then(clientList => {
for (const client of clientList) {
if (client.url === url && ‘focus’ in client) return client.focus();
}
if (clients.openWindow) return clients.openWindow(url);
})
);
});

// ── BACKGROUND SYNC ──────────────────────────────────────────────
self.addEventListener(‘sync’, event => {
if (event.tag === ‘sync-signals’) {
event.waitUntil(
// When back online, sync latest signals
fetch(’/api/signals/latest’)
.then(r => r.json())
.then(data => {
// Notify all clients of new signals
return self.clients.matchAll().then(clients => {
clients.forEach(client => {
client.postMessage({ type: ‘SIGNALS_UPDATED’, data });
});
});
})
.catch(() => console.log(’[SW] Sync failed, will retry’))
);
}
});

console.log(’[SW] NexusPro Service Worker loaded ✅’);