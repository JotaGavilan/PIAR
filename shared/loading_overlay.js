// ============================================================
//  loading_overlay.js – Component de càrrega per a models IA
//  Funciona tant en mòbil com en escriptori
// ============================================================

function _getOrCreateOverlay() {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner">
          <span class="loading-icon">🤖</span>
        </div>
        <div class="loading-message"></div>
        <div class="loading-details"></div>
        <div class="loading-bar"></div>
      </div>
    `;
    // Afegir directament a <body> com a primer fill per evitar problemes de z-index
    document.body.insertBefore(overlay, document.body.firstChild);
  }
  return overlay;
}

function showLoadingOverlay(message, details, icon) {
  message = message || 'Carregant model d\'IA...';
  details = details || '';
  icon    = icon    || '🤖';

  const overlay = _getOrCreateOverlay();

  // Actualitzar contingut
  overlay.querySelector('.loading-message').textContent = message;
  overlay.querySelector('.loading-details').textContent = details;
  overlay.querySelector('.loading-icon').textContent    = icon;

  // Mostrar amb animació
  overlay.classList.remove('hiding');
  overlay.classList.add('visible');
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;

  overlay.classList.add('hiding');
  setTimeout(() => {
    overlay.classList.remove('visible', 'hiding');
  }, 320);
}

function updateLoadingMessage(message, details) {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  if (message !== undefined) overlay.querySelector('.loading-message').textContent = message;
  if (details !== undefined) overlay.querySelector('.loading-details').textContent = details;
}
