// visibility.js – Sichtbarkeit von Gruppen und Einzelmodellen zentral steuern

import { state } from '../state.js';
import { scene } from '../scene.js';



/**
/**
/**
 * Setzt Sichtbarkeit für alle Modelle einer Gruppe
 * @param {string} group – z. B. 'muscles'
 * @param {boolean} visible – true = anzeigen, false = verstecken
 */

export function setGroupVisibility(group, visible) {
    state.modelObjects.forEach((model, label) => {
        const meta = state.metaByLabel[label];
        if (meta?.group === group) {
            model.visible = visible;
        }
    });
    state.groupStates[group] = visible;
}

/**
 * Setzt Sichtbarkeit eines einzelnen Modells (Root + rekursiv Meshes für Konsistenz + Layers für Raycasting)
 * @param {THREE.Object3D} model
 * @param {boolean} visible
 */

export function setModelVisibility(model, visible) {
    if (!model) return;
    model.visible = visible;  // Setze Root (propagiert automatisch zu Children in Three.js)
    model.traverse(child => {
        if (child.isMesh) {
            child.visible = visible;  // Explizit für Meshes (sichert Sync bei manuellen Änderungen)
            if (visible) {
                child.layers.enable(0);  // Aktiviere Layer 0 für Raycasting
            } else {
                child.layers.disable(0);  // Deaktiviere Layer 0, damit Raycaster ignoriert
            }
        }
    });
    // Auch Root-Layer setzen (für Gruppen ohne Meshes)
    if (visible) {
        model.layers.enable(0);
    } else {
        model.layers.disable(0);
    }
}

/**
 * Wechselt Sichtbarkeit eines einzelnen Modells
 * @param {THREE.Object3D} model
 */
export function toggleModelVisibility(model) {
    if (!model) return;
    const currentVisibility = isModelVisible(model);
    console.log('Toggle: Current visibility?', currentVisibility);  // Debugging-Log (entferne später)
    setModelVisibility(model, !currentVisibility);
}

// /**Prüft, ob ein Modell sichtbar ist
export function isModelVisible(model) {
    return !!model?.visible;  // Vereinfacht: Nutze Root-Status
}

/**
 * Versteckt nur Modelle, die von unserem Loader/State verwaltet werden.
 * Das vermeidet Nebenwirkungen auf fremde Scene-Nodes.
 */
export function hideAllManagedModels() {
    Object.keys(state.groups).forEach(group => {
        const models = state.groups[group] || [];
        models.forEach(model => {
            model.visible = false;
            model.traverse(child => {
                if (child.isMesh) {
                    child.visible = false;
                    child.layers.disable(0);
                }
            });
            model.layers.disable(0);
        });
    });
    console.log('✅ Alle verwalteten Modelle versteckt');
}
