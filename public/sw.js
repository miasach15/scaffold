// Minimal service worker. Scaffold is an online-first app backed by Supabase, so
// this deliberately caches nothing — it exists so browsers treat Scaffold as
// installable (Chrome requires a registered SW with a fetch handler) without
// risking users being served a stale build.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  // Pass through to the network untouched.
  e.respondWith(fetch(e.request));
});
