'use strict';
importScripts('version.js');

const CACHE = `orbe-${self.APP_VERSION}`;
const FONTS = 'orbe-fonts';
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
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('orbe-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fontes e ícones do Google: guarda na primeira vez para funcionar sem internet.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; });
      if (hit) { net.catch(() => {}); return hit; }
      return net;
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Rede primeiro: com internet abre sempre a versão publicada; sem internet usa a cópia.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const fromNet = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    fromNet.catch(() => {});
    const timeout = new Promise((resolve) => setTimeout(resolve, 3500));
    try {
      const res = await Promise.race([fromNet, timeout]);
      if (res) return res;
    } catch (e) { /* sem rede */ }
    const cached = await cache.match(req, { ignoreSearch: true });
    return cached || fromNet;
  })());
});
