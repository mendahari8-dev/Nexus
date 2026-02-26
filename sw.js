// NexusPro SW v4 - bumped to clear old stale cache
const CACHE = “nexuspro-v4”;
const ASSETS = [”/”, “/index.html”, “/manifest.json”];

self.addEventListener(“install”, e => {
e.waitUntil(
caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
);
self.skipWaiting();
});

self.addEventListener(“activate”, e => {
// Delete ALL old caches
e.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE).map(k => {
console.log(“Deleting old cache:”, k);
return caches.delete(k);
}))
)
);
self.clients.claim();
});

self.addEventListener(“fetch”, e => {
// Only handle same-origin GET requests
if (e.request.method !== “GET”) return;
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