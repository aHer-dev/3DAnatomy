// js/ui/ui-controls.js
let isBound = false;
let isOpen = false;
let panelEl, toggleBtn;

export function setupControlsUI() {
  if (isBound) return; // idempotent
  isBound = true;

  panelEl = document.getElementById('controls');
  toggleBtn = document.getElementById('menu-icon');

  if (!panelEl || !toggleBtn) {
    console.warn('ui-controls: Panel oder Toggle-Button fehlt.');
    return;
  }

  // Startzustand: zu
  panelEl.classList.remove('visible');

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) closePanel(); else openPanel();
  });
} // <-- diese Klammer hat gefehlt

function openPanel() {
  if (isOpen) return;
  panelEl.classList.add('visible');
  isOpen = true;
}

function closePanel() {
  if (!isOpen) return;
  panelEl.classList.remove('visible');
  isOpen = false;
}

export function isControlsPanelOpen() { return isOpen; }
export function showControlsPanel() { openPanel(); }
export function hideControlsPanel() { closePanel(); }
