// js/interaction/highlightModel.js
// — Selektions-Highlight: vorher altes Highlight entfernen, dann neues setzen —
import * as THREE from 'three';       // <<< NEU: wir benötigen THREE.Color
import { state } from '../state.js';  // globaler Zustand (merkt currentlySelected)

/**
 * Hebt ein Modell dezent hervor (emissive) und entfernt vorheriges Highlight.
 * @param {THREE.Object3D} model
 */
export function highlightModel(model) {
  // Altes Highlight zurücksetzen
  if (state.currentlySelected) {
    state.currentlySelected.traverse(child => {
      if (child.isMesh && child.material?.emissive) {
        child.material.emissive.set(0x000000); // Reset auf „dunkel“
      }
    });
  }

  // Neues Highlight setzen (dezent)
  model.traverse(child => {
    if (child.isMesh && child.material) {
      if (!child.material.emissive) {
        // emissive existiert auf MeshStandardMaterial immer; defensiv trotzdem set()
        child.material.emissive = new THREE.Color(0x222222);
      } else {
        child.material.emissive.set(0x222222);
      }
      child.material.needsUpdate = true;
    }
  });

  state.currentlySelected = model; // Merken, damit wir beim nächsten Klick resetten können
}
