// js/interaction/index.js
// Werkzeug-basierte Interaktion: Select | Multi | Box

import { renderer } from '../core/renderer.js';
import { setupRaycastOnClick } from './raycastOnClick.js';
import { showInfoPanel, hideInfoPanel, showMultiSelectPanel } from './infoPanel.js';
import { highlightModel } from './highlightModel.js';
import { toggleMultiSelect, clearMultiSelect, getMultiSelectedArray, addToMultiSelect } from './multiSelect.js';
import { setupBoxSelect } from './boxSelect.js';
import { setupToolbar, getActiveTool, TOOL } from '../ui/toolbar.js';
import { state } from '../store/state.js';
import { showModel, hideModel, ghostModel } from '../features/visibility.js';

function isTypingTarget(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

function setupHotkeys() {
    window.addEventListener('keydown', (e) => {
        if (isTypingTarget(document.activeElement)) return;

        if (e.key === 'Escape') {
            if (state.multiSelected.size > 0) {
                clearMultiSelect();
                hideInfoPanel();
            }
            return;
        }

        const root = state.selected?.root || null;
        if (!root) return;
        const k = e.key.toLowerCase();
        if (k === 'g') {
            let anyPickable = false;
            root.traverse(n => { if (n.isMesh && state.pickableMeshes.has(n)) anyPickable = true; });
            anyPickable ? ghostModel(root, 0.15) : showModel(root);
        }
        if (k === 'h') hideModel(root);
        if (k === 's') showModel(root);
    });
}

function refreshMultiPanel() {
    const sel = getMultiSelectedArray();
    if (sel.length === 0) hideInfoPanel();
    else showMultiSelectPanel(sel);
}

export function setupInteractions() {
    setupToolbar();

    setupRaycastOnClick(renderer.domElement, ({ meta, model, event }) => {
        const tool = getActiveTool();

        if (tool === TOOL.BOX) {
            // Im Rechteck-Modus zählt ein einzelner Klick als direktes Hinzufügen
            addToMultiSelect(model);
            refreshMultiPanel();
            return;
        }

        if (tool === TOOL.MULTI || event.ctrlKey) {
            // Mehrfach-Modus: togglen
            toggleMultiSelect(model);
            refreshMultiPanel();
            return;
        }

        // Standard: Einzelauswahl
        if (state.multiSelected.size > 0) clearMultiSelect();
        highlightModel(model);
        showInfoPanel(meta, model);
    });

    setupBoxSelect(renderer.domElement, refreshMultiPanel);

    setupHotkeys();
}
