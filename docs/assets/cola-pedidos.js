/* =====================================================================
 * Nodo Matríz · cola de pedidos sin datos
 * ---------------------------------------------------------------------
 * Si el celular se queda sin datos cuando la persona toca "Enviar", el
 * pedido se guarda acá (IndexedDB del navegador) y se envía solo cuando
 * vuelve la conexión. Lo usan la página del formulario y el service worker
 * (sw-pedidos.js), así que en Android se puede enviar aunque la pestaña
 * esté cerrada; en iPhone, cuando la página está abierta o se vuelve a abrir.
 *
 * Con datos no interviene: el envío normal es el de form-logic.js.
 * Un mismo pedido nunca se manda dos veces a la vez: página y service
 * worker se turnan con un "candado" del navegador (navigator.locks).
 * ===================================================================== */
(function (g) {
  'use strict';
  var DB = 'nm-pedidos', ST = 'pendientes';

  function abrir() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(ST, { keyPath: 'id_envio' }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function conTienda(modo, fn) {
    return abrir().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(ST, modo), pedido = fn(t.objectStore(ST));
        t.oncomplete = function () { db.close(); res(pedido ? pedido.result : undefined); };
        t.onerror = t.onabort = function () { db.close(); rej(t.error); };
      });
    });
  }
  function guardar(reg) { return conTienda('readwrite', function (s) { return s.put(reg); }); }
  function listar() { return conTienda('readonly', function (s) { return s.getAll(); }).then(function (l) { return l || []; }); }
  function borrar(id) { return conTienda('readwrite', function (s) { return s.delete(id); }); }

  function esPrueba(url) { return /PEGAR_AQUI|REEMPLAZAR|TEST_LOCAL/.test(url || ''); }

  function enviarUno(reg) {
    if (esPrueba(reg.url)) {
      // Página de prueba: no se manda nada a Make; solo se verifica que haya
      // conexión pidiendo la propia página.
      return fetch(reg.ping + '?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' })
        .then(function () { return true; });
    }
    return fetch(reg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reg.payload),
      mode: 'cors'
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return true;
    });
  }

  function avisar(reg) {
    try {
      var bc = new BroadcastChannel('nm-pedidos');
      bc.postMessage({ tipo: 'enviado', id_envio: reg.id_envio, id_edicion: reg.id_edicion });
      bc.close();
    } catch (e) {}
  }

  // Manda todos los pendientes, de a uno. Si uno falla (sigue sin datos),
  // corta y quedan para el próximo intento. Devuelve los que se enviaron.
  function enviarPendientes() {
    function correr() {
      return listar().then(function (regs) {
        var enviados = [];
        function siguiente(i) {
          if (i >= regs.length) return Promise.resolve(enviados);
          var reg = regs[i];
          return enviarUno(reg)
            .then(function () { return borrar(reg.id_envio); })
            .then(function () { enviados.push(reg); avisar(reg); return siguiente(i + 1); },
                  function () { return enviados; });
        }
        return siguiente(0);
      });
    }
    var nav = g.navigator;
    if (nav && nav.locks && nav.locks.request) {
      return nav.locks.request('nm-cola-pedidos', correr);
    }
    return correr();
  }

  g.NMCola = { guardar: guardar, listar: listar, borrar: borrar, enviarPendientes: enviarPendientes };
})(typeof self !== 'undefined' ? self : window);
