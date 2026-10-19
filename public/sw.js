// DADLIFTS service worker — beer notifications only.
//
// Deliberately has NO fetch handler: pages are never served from a cache, so the
// old iOS "white page from a stale service worker" problem cannot come back.
// On activate it deletes caches left by earlier versions, except the small
// message cache the app writes (dadlifts-nudge-v1).
//
// Pushes come from .github/workflows/beer-notify.yml and carry only
// { kind: "nudge" | "checkin" }. The message text is read from
// nudge-context.json, which the app pre-computes on the phone (src/push.js).

const NUDGE_CACHE = 'dadlifts-nudge-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== NUDGE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

// Used when the app hasn't been opened for a week (no saved context for today)
const FALLBACK = {
  nudge: [
    { title: 'Afternoon check-in 🍺→💧', body: "Sparkling water's in the fridge. Crack one, then 20 minutes of training." },
    { title: 'Afternoon check-in 🍺→💧', body: 'Thirsty? 500ml of fizz first, wait 15 minutes, then decide. A walk beats the urge.' },
  ],
  checkin: [
    { title: 'Evening check-in 🍺?', body: 'Stayed dry? Tap to confirm. Had a beer? Log the ml. Honest data beats a perfect streak.' },
  ],
};

async function messageFor(kind) {
  try {
    const res = await caches.match(new URL('nudge-context.json', self.registration.scope).href, { cacheName: NUDGE_CACHE });
    if (res) {
      const ctx = await res.json();
      const day = ctx && ctx.days && ctx.days[todayKey()];
      if (day && day[kind]) return day[kind];
    }
  } catch (_) {}
  const pool = FALLBACK[kind] || FALLBACK.nudge;
  const m = pool[new Date().getDate() % pool.length];
  return { title: m.title, body: m.body, tag: 'beer-' + kind, url: kind === 'checkin' ? '?beer=checkin' : '?beer=log' };
}

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}
  const kind = data.kind === 'checkin' ? 'checkin' : 'nudge';
  e.waitUntil(messageFor(kind).then((msg) => self.registration.showNotification(msg.title, {
    body: msg.body,
    tag: msg.tag || 'beer-' + kind,
    renotify: true,
    icon: self.registration.scope + 'icon-192.png',
    badge: self.registration.scope + 'icon-192.png',
    data: { url: msg.url || '?beer=log' },
  })));
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
