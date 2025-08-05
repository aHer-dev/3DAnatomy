// modelLoader-progress.js

/**
 * Zeigt den Ladebalken und setzt ihn auf 0 %
 */
export function showLoadingBar() {
  const bar = document.getElementById('loading-bar');
  if (bar) {
    bar.style.width = '0%';
    bar.style.display = 'block';
  }
}

/**
 * Aktualisiert die Breite des Fortschrittsbalkens
 * @param {number} percent - 0–100
 */
export function updateLoadingBar(percent) {
  const bar = document.getElementById('loading-bar');
  if (bar) {
    bar.style.width = `${percent}%`;
  }
}

/**
 * Versteckt den Ladebalken nach Abschluss
 */
export function hideLoadingBar() {
  const bar = document.getElementById('loading-bar');
  if (bar) {
    bar.style.display = 'none';
  }
}
