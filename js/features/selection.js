// js/features/selection.js
// ✅ BROWSER-KOMPATIBLE VERSION (kein require!)

import * as THREE from 'three';
import { dispatch, StateActions } from '../store/state.js';
import { markPickablesDirty } from '../core/raycaster.js';

// WICHTIG: Nur minimale Imports - state wird via Parameter übergeben oder lazy geladen
const PICK_LAYER = 1; // Layer für Raycasting

// Lazy state getter um zirkuläre Imports zu vermeiden
let _state = null;
function getState() {
    if (!_state) {
        // Dynamischer Import für Browser (async, aber wir cachen das Ergebnis)
        import('../store/state.js').then(module => {
            _state = module.state;
        }).catch(err => {
            console.warn('State import failed:', err);
        });
    }
    return _state;
}

/**
 * Setzt ein Mesh als pickbar/nicht-pickbar
 * @param {THREE.Mesh} mesh 
 * @param {boolean} on 
 * @param {Set} pickableSet - State wird von außen übergeben (optional)
 */

export function setPickable(mesh, pickable, pickableSet = null) {
    if (!mesh?.isMesh) return;

    const enable = !!pickable;

    // Originales Raycast sichern (einmalig)
    mesh.userData ??= {};
    if (!mesh.userData.__origRaycast) {
        mesh.userData.__origRaycast = mesh.raycast;
    }

    // Flag + Raycast setzen
    mesh.userData.pickable = enable;
    mesh.raycast = enable ? mesh.userData.__origRaycast : () => { };

    // SSOT: Set-Änderung über Actions
    dispatch(enable ? StateActions.ADD_PICKABLE : StateActions.REMOVE_PICKABLE, { mesh });
    markPickablesDirty();
}


/**
 * Rekursiv alle sichtbaren Meshes eines Roots registrieren
 * @param {THREE.Object3D} root 
 * @param {Set} pickableSet 
 */
export function registerPickables(root, pickableSet = null) {
    if (!root) return;

    // Fallback für State
    if (!pickableSet) {
        const state = getState();
        pickableSet = state?.pickableMeshes || null;
    }

    root.traverse(node => {
        if (node.isMesh && node.visible) {
            setPickable(node, true, pickableSet);
        }
    });
}

/**
 * Rekursiv alle Meshes aus dem Pick-Pool entfernen
 * @param {THREE.Object3D} root 
 * @param {Set} pickableSet 
 */
export function unregisterPickables(root, pickableSet = null) {
    if (!root) return;

    // Fallback für State
    if (!pickableSet) {
        const state = getState();
        pickableSet = state?.pickableMeshes || null;
    }

    root.traverse(node => {
        if (node.isMesh) {
            setPickable(node, false, pickableSet);
        }
    });
}

/**
 * Prüft ob ein Mesh pickbar ist
 * @param {THREE.Mesh} mesh 
 * @param {Set} pickableSet 
 * @returns {boolean}
 */
export function isPickable(mesh, pickableSet = null) {
    if (!pickableSet) {
        const state = getState();
        pickableSet = state?.pickableMeshes || new Set();
    }
    return pickableSet.has(mesh);
}

/**
 * Bulk-Operation: Mehrere Meshes gleichzeitig setzen
 * @param {THREE.Mesh[]} meshes 
 * @param {boolean} pickable 
 */
export function setMultiplePickable(meshes, pickable) {
    const state = getState();
    const pickableSet = state?.pickableMeshes || null;

    for (const mesh of meshes) {
        setPickable(mesh, pickable, pickableSet);
    }
}

// State initialisieren beim Laden (falls noch nicht vorhanden)
if (typeof window !== 'undefined') {
    // Nur im Browser ausführen
    import('../store/state.js').then(module => {
        _state = module.state;
        console.log('✅ Selection: State geladen');
    }).catch(err => {
        console.warn('⚠️ Selection: State konnte nicht geladen werden:', err);
    });
}