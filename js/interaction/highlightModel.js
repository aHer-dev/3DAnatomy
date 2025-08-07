// interaction/highlightModel.js

import { state } from '../state.js';

/**
 * Hebt ein Modell hervor und entfernt vorheriges Highlight.
 */
export function highlightModel(model) {
    // ⬅ Vorheriges Highlight entfernen
    if (state.currentlySelected) {
        state.currentlySelected.traverse(child => {
            if (child.isMesh && child.material?.emissive) {
                child.material.emissive.setHex(0x000000); // Reset
            }
        });
    }

    // ⬅ Neues Highlight setzen
    model.traverse(child => {
        if (child.isMesh) {
            if (!child.material.emissive) {
                child.material.emissive = new THREE.Color(0x222222);
            } else {
                child.material.emissive.setHex(0x222222);
            }
        }
    });

    state.currentlySelected = model;
}