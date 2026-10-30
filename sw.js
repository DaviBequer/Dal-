'use strict';
importScripts('version.js');

const CACHE = `dal-${self.APP_VERSION}`;
const DATA_CACHE = 'dal-data'; // lembretes gravados pela página; sobrevive às atualizações
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'version.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/icon.svg',
  'fonts/fraunces-700.woff2',
  'fonts/manrope.woff2',
];

self.addEventListener('install', (event) => {
  // Busca direto da rede para não guardar arquivos antigos do cache HTTP.
  // skipWaiting: a versão nova assume sem o usuário precisar clicar em nada.
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dal-') && k !== CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  // Pedidos "no-store" (ex.: conferir a versão nova) vão sempre à rede
  if (event.request.method !== 'GET' || event.request.cache === 'no-store') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request)),
  );
});

// ---------- Lembretes ----------
const REMINDER_WINDOW = 12 * 3600000;

async function readJSON(cache, name, fallback) {
  const res = await cache.match(new URL(name, self.registration.scope).href);
  if (!res) return fallback;
  try { return await res.json(); } catch (e) { return fallback; }
}

async function checkReminders() {
  const cache = await caches.open(DATA_CACHE);
  const data = await readJSON(cache, 'reminders.json', null);
  if (!data || !data.enabled) return;
  const notified = await readJSON(cache, 'notified.json', {});
  const now = Date.now();
  const due = data.list.filter((r) => r.at <= now && now - r.at < REMINDER_WINDOW && !notified[r.key]);
  for (const r of due) {
    notified[r.key] = now;
    await self.registration.showNotification(r.title, {
      body: r.body, tag: r.key, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', lang: 'pt-BR',
    });
  }
  const cutoff = now - 3 * 86400000;
  for (const k of Object.keys(notified)) if (notified[k] < cutoff) delete notified[k];
  await cache.put(new URL('notified.json', self.registration.scope).href, new Response(JSON.stringify(notified)));
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'dal-lembretes') event.waitUntil(checkReminders());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => w.url.startsWith(self.registration.scope));
      return win ? win.focus() : self.clients.openWindow(self.registration.scope);
    }),
  );
});
