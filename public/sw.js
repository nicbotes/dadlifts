// DADLIFTS service worker — push notifications only.
//
// Deliberately has NO fetch handler: pages are never served from a cache, so the
// old iOS "white page from a stale service worker" problem cannot come back.
// On activate it still deletes any caches left by earlier versions.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Payload: { title, body, tag, url } from composeBeerNudge (src/beer.mjs)
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data ? e.data.text() : '' }; }
  const title = data.title || 'DADLIFTS';
  e.waitUntil(self.registration.showNotification(title, {
    body: data.body || "5pm check-in. Sparkling water's in the fridge.",
    tag: data.tag || 'beer-nudge',
    renotify: true,
    icon: self.registration.scope + 'icon-192.png',
    badge: self.registration.scope + 'icon-192.png',
    data: { url: data.url || '?beer=log' },
  }));
});

// Tap → focus an open app window (or open one) on the beer LOG tab
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || '?beer=log', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope) && 'focus' in w) {
        try { await w.navigate(target); } catch (_) {}
        return w.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
