/* ============================================================
 * Nodo Matriz — Lógica común de formularios
 * ============================================================
 *
 * Funciones reutilizadas por los distintos forms del sistema:
 *   - stock.html        (A2 — actualización de stock por productores)
 *   - pedidos-*.html    (A3 — generado dinámicamente por edición)
 *   - recepcion.html    (D1 — registro de recepción en galpón)
 *   - retiro.html       (D4 — marcado de retiro)
 *   - referido.html     (G2/G5 — referidos y consulta de saldo)
 *
 * Punto de entrada al sistema:
 *   El submit final hace POST con JSON al webhook configurado en
 *   data-webhook del elemento <form>. Cuando hay éxito, redirige
 *   o muestra el mensaje configurado.
 *
 * Sin frameworks. Sin dependencias externas. Solo JS nativo.
 * ============================================================ */

(function () {
  'use strict';

  // ----------------------------------------------------------------
  // Utilidades genéricas
  // ----------------------------------------------------------------

  /** Lee un parámetro de la URL. Devuelve '' si no existe. */
  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
  }

  /** Formatea un número como moneda en pesos argentinos sin decimales. */
  function formatMoney(n) {
    if (n === null || n === undefined || isNaN(n)) return '$ 0';
    return '$ ' + Math.round(Number(n)).toLocaleString('es-AR');
  }

  /** Normaliza un teléfono argentino a E.164: +549<area><número>. */
  function normalizePhone(raw) {
    if (!raw) return '';
    var d = String(raw).replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('0')) d = d.slice(1);
    if (d.startsWith('549')) return '+' + d;
    if (d.startsWith('54') && !d.startsWith('549')) return '+54' + '9' + d.slice(2);
    if (d.length === 10) return '+549' + d;
    if (d.length >= 8) return '+549' + d;
    return '';
  }

  /** Valida formato básico de email. */
  function isValidEmail(email) {
    if (!email) return false;
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).trim());
  }

  /** Marca un campo como inválido y muestra mensaje. */
  function markInvalid(input, message) {
    var field = input.closest('.field');
    if (field) field.classList.add('is-invalid');
    input.classList.add('is-invalid');
    var errorEl = field ? field.querySelector('.field__error') : null;
    if (errorEl && message) errorEl.textContent = message;
  }

  /** Limpia el estado inválido de un campo. */
  function clearInvalid(input) {
    var field = input.closest('.field');
    if (field) field.classList.remove('is-invalid');
    input.classList.remove('is-invalid');
  }

  // ----------------------------------------------------------------
  // POST al webhook
  // ----------------------------------------------------------------

  /**
   * Envía un payload JSON al webhook configurado en data-webhook
   * del elemento form. Muestra estado de carga, éxito o error.
   *
   * @param {HTMLFormElement} formEl
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  function submitToWebhook(formEl, payload) {
    var webhookUrl = formEl.dataset.webhook;
    if (!webhookUrl) {
      console.error('[NodoMatriz] Falta data-webhook en el <form>.');
      return Promise.reject(new Error('No webhook configured'));
    }

    // Si la URL es un placeholder de desarrollo, no enviamos: solo loggeamos
    if (/PEGAR_AQUI|REEMPLAZAR|TEST_LOCAL/.test(webhookUrl)) {
      console.log('[NodoMatriz · modo dev] Payload que se enviaría:', payload);
      return Promise.resolve({ ok: true, dev: true, payload: payload });
    }

    return fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'cors',
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().catch(function () { return { ok: true }; });
    });
  }

  /**
   * Wrapper para el botón submit que maneja estados visuales.
   * Llama al callback que debe devolver el payload listo para enviar.
   */
  function bindFormSubmit(formEl, buildPayload, opts) {
    opts = opts || {};
    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = formEl.querySelector('[type="submit"]');
      var originalText = btn ? btn.textContent : '';

      var payload;
      try {
        payload = buildPayload();
      } catch (err) {
        console.warn('[NodoMatriz] Validación falló:', err.message);
        return;
      }
      if (!payload) return;

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span><span>Enviando…</span>';
      }

      submitToWebhook(formEl, payload)
        .then(function (resp) {
          if (opts.onSuccess) opts.onSuccess(resp, payload);
          else showSuccessMessage(formEl, opts.successMessage);
        })
        .catch(function (err) {
          console.error('[NodoMatriz] Error al enviar:', err);
          if (opts.onError) opts.onError(err);
          else showErrorMessage(formEl, 'No pudimos guardar tu envío. Probá de nuevo o avisanos al Nodo.');
        })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
          }
        });
    });
  }

  function showSuccessMessage(formEl, customMessage) {
    var msg = customMessage ||
      '¡Gracias! Recibimos tu envío correctamente. Pronto recibirás confirmación por WhatsApp y correo.';
    formEl.innerHTML =
      '<div class="note note--success">' +
      '  <strong>Listo. </strong>' + msg +
      '</div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showErrorMessage(formEl, msg) {
    var existing = formEl.querySelector('.note--error');
    if (existing) existing.remove();
    var div = document.createElement('div');
    div.className = 'note note--error';
    div.innerHTML = '<strong>Algo no funcionó.</strong> ' + msg;
    formEl.insertBefore(div, formEl.firstChild);
    div.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ----------------------------------------------------------------
  // Wizard de pasos (form de pedidos)
  // ----------------------------------------------------------------

  /**
   * Inicializa un wizard donde cada paso es un .wizard__step.
   * El consumidor debe pasar por todos antes de poder enviar.
   */
  function initWizard(rootEl, opts) {
    opts = opts || {};
    var steps = Array.from(rootEl.querySelectorAll('.wizard__step'));
    var stepCount = steps.length;
    if (!stepCount) return;

    var currentIndex = 0;
    var visited = new Set([0]);

    var elProgress = rootEl.querySelector('.wizard__progress');
    var elBar = rootEl.querySelector('.wizard__bar-fill');
    var elStepCount = rootEl.querySelector('.wizard__step-count');
    var elStepName = rootEl.querySelector('.wizard__step-name');
    var elCrumbs = rootEl.querySelector('.wizard__crumbs');
    var btnPrev = rootEl.querySelector('[data-action="wizard-prev"]');
    var btnNext = rootEl.querySelector('[data-action="wizard-next"]');
    var btnFinish = rootEl.querySelector('[data-action="wizard-finish"]');

    function buildCrumbs() {
      if (!elCrumbs) return;
      elCrumbs.innerHTML = '';
      for (var i = 0; i < stepCount; i++) {
        var c = document.createElement('span');
        c.className = 'wizard__crumb';
        elCrumbs.appendChild(c);
      }
    }

    function render() {
      steps.forEach(function (s, i) {
        s.classList.toggle('is-current', i === currentIndex);
      });

      var pct = ((currentIndex + 1) / stepCount) * 100;
      if (elBar) elBar.style.width = pct + '%';
      if (elStepCount) elStepCount.textContent = (currentIndex + 1) + ' de ' + stepCount;
      if (elStepName) {
        var name = steps[currentIndex].dataset.stepName || '';
        elStepName.textContent = name;
      }

      if (elCrumbs) {
        var crumbs = elCrumbs.querySelectorAll('.wizard__crumb');
        crumbs.forEach(function (c, i) {
          c.classList.toggle('is-visited', visited.has(i));
          c.classList.toggle('is-current', i === currentIndex);
        });
      }

      if (btnPrev) btnPrev.disabled = currentIndex === 0;

      var isLast = currentIndex === stepCount - 1;
      if (btnNext) btnNext.classList.toggle('hidden', isLast);
      if (btnFinish) btnFinish.classList.toggle('hidden', !isLast || visited.size < stepCount);

      // Scroll suave al inicio del wizard
      if (elProgress) {
        var top = elProgress.getBoundingClientRect().top + window.scrollY - 16;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }

      if (opts.onStepChange) opts.onStepChange(currentIndex, steps[currentIndex]);
    }

    function next() {
      if (currentIndex < stepCount - 1) {
        currentIndex++;
        visited.add(currentIndex);
        render();
      }
    }

    function prev() {
      if (currentIndex > 0) {
        currentIndex--;
        render();
      }
    }

    function goTo(index) {
      if (index < 0 || index >= stepCount) return;
      if (!visited.has(index) && index > currentIndex + 1) return; // no saltar adelante
      currentIndex = index;
      visited.add(index);
      render();
    }

    if (btnNext) btnNext.addEventListener('click', next);
    if (btnPrev) btnPrev.addEventListener('click', prev);

    // Click en crumbs para volver a categorías ya visitadas
    if (elCrumbs) {
      elCrumbs.addEventListener('click', function (e) {
        var idx = Array.from(elCrumbs.children).indexOf(e.target);
        if (idx >= 0) goTo(idx);
      });
    }

    buildCrumbs();
    render();

    return {
      next: next,
      prev: prev,
      goTo: goTo,
      visited: visited,
      isComplete: function () { return visited.size === stepCount; },
      getCurrentIndex: function () { return currentIndex; }
    };
  }

  // ----------------------------------------------------------------
  // Exponer API
  // ----------------------------------------------------------------

  window.NodoMatriz = {
    getQueryParam: getQueryParam,
    formatMoney: formatMoney,
    normalizePhone: normalizePhone,
    isValidEmail: isValidEmail,
    markInvalid: markInvalid,
    clearInvalid: clearInvalid,
    submitToWebhook: submitToWebhook,
    bindFormSubmit: bindFormSubmit,
    showSuccessMessage: showSuccessMessage,
    showErrorMessage: showErrorMessage,
    initWizard: initWizard,
  };

})();
