// piar_home.js – Botó 🏠 de les capçaleres: torna a la pantalla principal de PIAR.
// Si hi ha una micro:bit connectada per Bluetooth, demana confirmació (en eixir es desconnectaria).
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.piar-home');
    if (!a) return;
    var connected = false;
    try { connected = typeof isBluetoothConnected === 'function' && isBluetoothConnected(); } catch (x) {}
    if (connected && !confirm(window._t ? _t('sh.home.confirm') : 'Si tornes a la pantalla principal, es desconnectarà la micro:bit. Vols continuar?')) e.preventDefault();
  });
})();
