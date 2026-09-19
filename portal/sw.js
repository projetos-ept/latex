/* ==========================================================================
   Portal TCC ABNT - service worker (PWA)
   Estratégia: cache-first para a casca do app, network-first para a API.
   ========================================================================== */
var CACHE = 'portal-tcc-abnt-v1';

var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/portal.css',
  './css/components.css',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './js/config.js',
  './js/util.js',
  './js/models.js',
  './js/abnt.js',
  './js/bibtex.js',
  './js/latex.js',
  './js/templates.js',
  './js/zip.js',
  './js/store.js',
  './js/api.js',
  './js/views/painel.js',
  './js/views/projeto.js',
  './js/views/editor.js',
  './js/views/biblioteca.js',
  './js/views/latex.js',
  './js/views/exportar.js',
  './js/views/admin.js',
  './js/views/config.js',
  './js/views/ajuda.js',
  './js/app.js'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.filter(function (n) { return n !== CACHE; })
        .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Chamadas de API nunca são servidas do cache.
  if (url.pathname.indexOf('/api/') === 0 || url.origin !== location.origin) {
    ev.respondWith(fetch(req).catch(function () {
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503, headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }

  ev.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) {
        // Revalida em segundo plano.
        fetch(req).then(function (res) {
          if (res && res.ok) caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
        }).catch(function () { /* offline */ });
        return hit;
      }
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
