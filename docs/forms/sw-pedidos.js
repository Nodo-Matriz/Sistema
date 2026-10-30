/* =====================================================================
 * Nodo Matríz · service worker del formulario de pedidos
 * ---------------------------------------------------------------------
 * 1. Guarda una copia del formulario de pedidos (y de sus estilos y
 *    scripts) para poder abrirlo sin datos. Siempre busca primero la
 *    versión de internet: con datos, nadie ve una copia vieja. La copia
 *    solo se usa cuando no hay conexión.
 * 2. En Android (Chrome), envía los pedidos que quedaron pendientes aunque
 *    la pestaña esté cerrada, apenas vuelven los datos.
 *
 * Solo atiende las páginas pedidos-*.html / prueba-categorias.html, la
 * plantilla (para la página de prueba) y la carpeta assets. Las demás apps (recepción, panel, stock…) no se tocan.
 *
 * Para desactivarlo de emergencia: reemplazar este archivo por
 *   self.addEventListener('install', function () { self.skipWaiting(); });
 *   self.addEventListener('activate', function () { self.registration.unregister(); });
 * ===================================================================== */
importScripts('../assets/cola-pedidos.js');

var CACHE = 'nm-pedidos-v1';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

function esDelFormulario(url) {
  if (url.origin !== self.location.origin) return false;
  return /\/forms\/(pedidos-[^\/]+|prueba-categorias)\.html$/.test(url.pathname) ||
         /\/templates\/pedidos\.template\.html$/.test(url.pathname) ||
         /\/assets\/[^\/]+$/.test(url.pathname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (!esDelFormulario(url)) return;          // todo lo demás: como siempre
  var clave = url.origin + url.pathname;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copia = res.clone();
        caches.open(CACHE).then(function (c) { return c.put(clave, copia); }).catch(function () {});
      }
      return res;
    }).catch(function (err) {
      return caches.match(clave).then(function (r) { if (r) return r; throw err; });
    })
  );
});

// Android: envío en segundo plano cuando vuelve la conexión.
self.addEventListener('sync', function (e) {
  if (e.tag !== 'nm-enviar-pedidos') return;
  e.waitUntil(
    NMCola.enviarPendientes().then(function () { return NMCola.listar(); }).then(function (l) {
      if (l.length) throw new Error('quedan pendientes');   // el navegador reintenta más tarde
    })
  );
});
