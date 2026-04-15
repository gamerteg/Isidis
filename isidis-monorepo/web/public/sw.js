// Service Worker for Isidis PWA
// Caches core assets for offline use

const CACHE_NAME = "isidis-cache-v1";
const OFFLINE_URL = "/offline";

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
    "/",
    "/offline",
    "/manifest.json",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",
];

// Install: pre-cache critical assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

// Fetch: network-first strategy with offline fallback
self.addEventListener("fetch", (event) => {
    // Only handle GET requests
    if (event.request.method !== "GET") return;

    // Skip non-http(s) requests (chrome-extension etc.)
    if (!event.request.url.startsWith("http")) return;

    // Skip Supabase / API requests — always go to network
    const url = new URL(event.request.url);
    if (
        url.pathname.startsWith("/api/") ||
        url.hostname.includes("supabase.co")
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful page navigations
                if (
                    response.ok &&
                    event.request.mode === "navigate"
                ) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                // Offline fallback
                if (event.request.mode === "navigate") {
                    return caches.match(OFFLINE_URL);
                }
                return caches.match(event.request);
            })
    );
});
