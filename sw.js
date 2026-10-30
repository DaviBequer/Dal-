'use strict';
importScripts('version.js');

const CACHE = `dal-${self.APP_VERSION}`;
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
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // Busca direto da rede para não guardar arquivos antigos do cache HTTP
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dal-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Pedidos "no-store" (ex.: conferir a versão nova) vão sempre à rede
  if (event.request.method !== 'GET' || event.request.cache === 'no-store') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request)),
  );
});
