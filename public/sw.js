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

// Two kinds of reminder share this one handler — the server tells them apart with
// `tag` ("whatnow" or "start-reminder") so a start-time ping never gets silently
// swallowed by (or swallows) a periodic "what now" one. Vibration pattern plus
// renotify is the only "louder" lever actually available here — Web Notifications has
// no volume control of its own, that's entirely the phone's own ringer/notification
// volume.
self.addEventListener("push", (e) => {
  let data = { title: "Scaffold", body: "Check what's next.", tag: "whatnow" };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch {
    // ignore malformed payloads
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      renotify: true, // re-alert (sound + vibrate) even when a same-tag notification is still showing
      vibrate: [250, 120, 250],
      data: { url: "/" },
    })
  );
});

// Clicking the notification focuses an already-open tab if there is one, else opens a new one.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
