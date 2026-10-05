// guia.js – botons «Copia» dels blocs de codi de les guies
(function () {
  function toast(msg) {
    var t = document.getElementById('gtoast');
    if (!t) { t = document.createElement('div'); t.id = 'gtoast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  document.querySelectorAll('.code').forEach(function (box) {
    var btn = box.querySelector('button'), pre = box.querySelector('pre');
    if (!btn || !pre) return;
    btn.addEventListener('click', function () {
      var txt = pre.textContent;
      var done = function () { toast('Codi copiat. Apega\'l a la pestanya JavaScript de MakeCode'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, fallback);
      } else fallback();
      function fallback() {
        var ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { toast('No s\'ha pogut copiar: selecciona el text a mà'); }
        ta.remove();
      }
    });
  });
})();
