// js/core/raycaster.js
// Zentraler Raycaster für die App. Testet nur die "Pick"-Layer (1).
// Nutze getPointerNDC(event, dom) für präzise NDC-Koordinaten relativ zur Canvas.

import * as THREE from 'three';  // Three.js Kernmodul importieren
import { state } from '../store/stateManager.js';     // Zentraler App-Store (Gruppen, Auswahl, pickableMeshes)
import { camera } from './camera.js';          // Aktive Kamera der Szene
import { renderer } from './renderer.js';      // Aktiver Renderer mit Canvas



export const raycaster = new THREE.Raycaster();
raycaster.layers.set(1); // nur Pick-Layer

function getModelRoot(obj) {
    let n = obj;
    while (n && !n.userData?.isModelRoot && n.parent) n = n.parent;
    return n?.userData?.isModelRoot ? n : obj;
}


// Öffentliche API: auf Pixelkoordinate klicken und Auswahl im Store ablegen
export function pickAt(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1,
    };

    raycaster.setFromCamera(ndc, camera);

    // ⚠️ robust: leeres Set → leeres Array
    const pool = state.pickableMeshes ? Array.from(state.pickableMeshes) : [];
    if (pool.length === 0) {
        state.selected = null;
        return null;
    }

    // Schnittmengen mit der Testmenge berechnen (keine rekursive Suche nötig)
    const hits = raycaster.intersectObjects(pool, false);
    if (!hits.length) {
        state.selected = null;
        return null;
    }

    const hit = hits[0];
    const root = getModelRoot(hit.object);
    state.selected = { root, mesh: hit.object, point: hit.point };
    return state.selected;
}

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

