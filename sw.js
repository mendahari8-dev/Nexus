const CACHE = “nexuspro-v3”;
const ASSETS = [”/”,”/index.html”,”/manifest.json”];

self.addEventListener(“install”, e => {
e.waitUntil(
caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
);
self.skipWaiting();
});

self.addEventListener(“activate”, e => {
e.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
)
);
self.clients.claim();
});

self.addEventListener(“fetch”, e => {
// Only cache same-origin requests
if (!e.request.url.startsWith(self.location.origin)) return;
e.respondWith(
caches.match(e.request).then(cached => {
if (cached) return cached;
return fetch(e.request).then(res => {
if (res && res.status === 200 && res.type === “basic”) {
const clone = res.clone();
caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
}
return res;
}).catch(() => caches.match(”/index.html”));
})
);
});