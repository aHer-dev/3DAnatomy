// js/interaction/index.js
// 📦 Initialisiert alle Interaktionen: Klick, Highlight, InfoPanel

import { renderer } from '../core/renderer.js';
import { setupRaycastOnClick } from './raycastOnClick.js';
import { showInfoPanel, hideInfoPanel } from './infoPanel.js';
import { highlightModel } from './highlightModel.js';
import { getNormalizedMouse } from '../utils/index.js';

/**
 * Zentraler Einstiegspunkt für alle Interaktionsfunktionen.
 */
export function setupInteractions() {
    setupRaycastOnClick(renderer.domElement, ({ meta, model }) => {
        highlightModel(model);
        showInfoPanel(meta, model);
    });

    console.log('🧠 Interaktionen aktiviert.');
}
