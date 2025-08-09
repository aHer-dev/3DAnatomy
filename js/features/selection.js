// js/features/selection.js
// Kapselt alles rund ums "klickbar sein" für den zentralen Raycaster.

import { state } from '../store/state.js';

// ⚠️ Dein Raycaster sucht auf Layer 1 → hier Layer 1 schalten!
export function setPickable(mesh, on) {
    if (!mesh?.isMesh) return;
    if (on) {
        mesh.layers.enable(1);          // ← Raycasting-Layer aktivieren
        state.pickableMeshes.add(mesh); // in Pick-Pool aufnehmen
    } else {
        mesh.layers.disable(1);         // ← aus Raycasting-Layer raus
        state.pickableMeshes.delete(mesh);
    }
}

// Rekursiv alle sichtbaren Meshes eines Roots registrieren
export function registerPickables(root) {
    root.traverse(n => { if (n.isMesh && n.visible) setPickable(n, true); });
}

// Rekursiv alle Meshes aus dem Pick-Pool entfernen
export function unregisterPickables(root) {
    root.traverse(n => { if (n.isMesh) setPickable(n, false); });
}


