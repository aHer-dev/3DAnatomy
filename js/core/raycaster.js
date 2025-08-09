// js/core/raycaster.js
// Zentraler Raycaster für die App. Testet nur die "Pick"-Layer (1).
// Nutze getPointerNDC(event, dom) für präzise NDC-Koordinaten relativ zur Canvas.

import * as THREE from 'three';




export const raycaster = new THREE.Raycaster();
// Wir picken ausschließlich auf Layer 1 (Layer 0 = Render).
raycaster.layers.set(1);

/**
 * Rechnet Pointer-Koordinaten (Maus/Touch) in NDC um, relativ zu einem DOM-Element (Canvas).
 * Das ist präziser als window-basierte Werte, wenn UI-Overlays existieren.
 * @param {PointerEvent|MouseEvent|TouchEvent} event
 * @param {HTMLElement} domElement (typisch: renderer.domElement)
 * @returns {{x:number, y:number}}
 */
export function getPointerNDC(event, domElement) {
    const rect = domElement.getBoundingClientRect();
    const isTouch = 'touches' in event && event.touches?.length;
    const clientX = isTouch ? event.touches[0].clientX : event.clientX;
    const clientY = isTouch ? event.touches[0].clientY : event.clientY;

    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return { x, y };
}
