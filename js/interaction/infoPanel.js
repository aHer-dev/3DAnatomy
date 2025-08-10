// js/interaction/infoPanel.js
// Minimaler Shim, damit Aufrufe aus ui-reset & Co. nicht crashen.

let panel;
function ensure() { panel = panel || document.getElementById('info-panel'); }

export function hideInfoPanel() {
    ensure();
    if (!panel) return;
    panel.classList.add('hidden');
    panel.setAttribute('aria-hidden', 'true');
}

export function showInfoPanel(title = '', html = '') {
    ensure();
    if (!panel) return;
    const h = document.getElementById('info-header');
    const c = document.getElementById('info-content');
    if (h) h.textContent = title;
    if (c) c.innerHTML = html;
    panel.classList.remove('hidden');
    panel.setAttribute('aria-hidden', 'false');
}
