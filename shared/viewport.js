// ============================================================
//  viewport.js – Alçada real de la pantalla (app instal·lada o en el navegador)
//
//  En algunes versions d'Android l'app instal·lada (mode «standalone») calcula 100vh/100dvh
//  amb una alçada que inclou la barra de navegació o la barra d'estat, i la part de baix queda tapada.
//  Este script mesura l'alçada visible real i la posa en la variable CSS --app-h (en píxels);
//  s'actualitza en girar el mòbil, en canviar de mida i uns instants després d'obrir l'app
//  (quan Android encara està ajustant la finestra). Les apps usen: height: var(--app-h, 100dvh).
// ============================================================
(function () {
  'use strict';
  var root = document.documentElement, last = 0;
  function measure() {
    var vv = window.visualViewport;
    var h = window.innerHeight || root.clientHeight;
    if (vv && vv.height) h = Math.min(h, Math.round(vv.height + vv.offsetTop));   // si hi ha teclat, també compta
    return Math.round(h);
  }
  function set() {
    var h = measure();
    if (h > 0 && h !== last) { last = h; root.style.setProperty('--app-h', h + 'px'); }
  }
  set();
  window.addEventListener('resize', set);
  window.addEventListener('orientationchange', function () { set(); setTimeout(set, 250); setTimeout(set, 700); });
  window.addEventListener('pageshow', set);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) set(); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', set);
  [150, 500, 1200, 2500].forEach(function (t) { setTimeout(set, t); });      // l'Android acaba d'ajustar la finestra després d'obrir
})();
