// ============================================================
//  loading_overlay.js – Component de càrrega per a models IA
// ============================================================

function showLoadingOverlay(message = 'Carregant model d\'IA...', details = '') {
  // Crear overlay si no existeix
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-message"></div>
        <div class="loading-details"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  
  // Actualitzar missatges
  overlay.querySelector('.loading-message').textContent = message;
  overlay.querySelector('.loading-details').textContent = details;
  overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

function updateLoadingMessage(message, details = '') {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.querySelector('.loading-message').textContent = message;
    overlay.querySelector('.loading-details').textContent = details;
  }
}
