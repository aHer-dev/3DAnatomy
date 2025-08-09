// js/interaction/index.js
// Zentraler Einstieg für Interaktionen: Canvas-Klick + Hotkeys (G/H/S).
// Achtung: Es gibt GENAU EINE exportierte Funktion: setupInteractions()

import { renderer } from '../core/renderer.js';
import { setupRaycastOnClick } from './raycastOnClick.js';
import { showInfoPanel } from './infoPanel.js';
import { highlightModel } from './highlightModel.js';
import { state } from '../store/state.js';
import { showModel, hideModel, ghostModel } from '../features/visibility.js';

// Eingabefelder nicht stören
function isTypingTarget(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

// Desktop-Hotkeys: G = Ghost-Toggle, H = Hide, S = Show
function setupHotkeys() {
    window.addEventListener('keydown', (e) => {
        if (isTypingTarget(document.activeElement)) return;

        const root = state.selected?.root || state.currentlySelected || null;
        if (!root) return;

        const k = e.key.toLowerCase();
        if (k === 'g') {
            // Toggle: wenn irgendein Mesh pickable ist → ghost, sonst show
            let anyPickable = false;
            root.traverse(n => { if (n.isMesh && state.pickableMeshes.has(n)) anyPickable = true; });
            anyPickable ? ghostModel(root, 0.15) : showModel(root);
        }
        if (k === 'h') hideModel(root);
        if (k === 's') showModel(root);
    });
}

// Öffentliche API: genau EIN Export
export function setupInteractions() {
    // Canvas-Klick: zentraler Raycaster → Highlight + InfoPanel
    setupRaycastOnClick(renderer.domElement, ({ meta, model }) => {
        highlightModel(model);
        showInfoPanel(meta, model);
    });

    setupHotkeys();
    console.log('🧠 Interaktionen aktiviert (+ Hotkeys G/H/S).');
}
