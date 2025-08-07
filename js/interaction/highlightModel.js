import { state } from '../state.js';

/**
 * Hebt ein Modell hervor und hebt vorheriges auf.
 */
export function highlightModel(object) {
    if (state.currentlySelected) {
        state.currentlySelected.traverse(child => {
            if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.setHex(0x000000);
            }
        });
    }

    object.traverse(child => {
        if (child.isMesh && child.material && child.material.emissive) {
            child.material.emissive.setHex(0x222222);
        }
    });

    state.currentlySelected = object;
}
