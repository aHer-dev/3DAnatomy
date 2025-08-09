// js/core/raycaster.js
// Zentraler Raycaster für die App. Testet nur die "Pick"-Layer (1).
// Nutze getPointerNDC(event, dom) für präzise NDC-Koordinaten relativ zur Canvas.

import * as THREE from 'three';  // Three.js Kernmodul importieren
import { state } from '../store/state.js';     // Zentraler App-Store (Gruppen, Auswahl, pickableMeshes)
import { camera } from './camera.js';          // Aktive Kamera der Szene
import { renderer } from './renderer.js';      // Aktiver Renderer mit Canvas



export const raycaster = new THREE.Raycaster();
// Wir picken ausschließlich auf Layer 1 (Layer 0 = Render).
raycaster.layers.set(1);

// Hilfsfunktion: Vom getroffenen Objekt bis zum markierten Model-Root hochlaufen
function getModelRoot(obj) {
    let n = obj;                                 // Start: das tatsächlich getroffene Mesh
    while (n && !n.userData?.isModelRoot && n.parent) {
        n = n.parent;                              // So lange zum Elternknoten gehen, bis ein Root markiert ist
    }
    return n?.userData?.isModelRoot ? n : obj;   // Falls keiner markiert: Fallback auf das ursprüngliche Objekt
}

// Öffentliche API: auf Pixelkoordinate klicken und Auswahl im Store ablegen
export function pickAt(clientX, clientY) {
    // Canvas-Bereich ermitteln, um Mauskoordinaten in Normalized Device Coordinates (NDC) zu transformieren
    const rect = renderer.domElement.getBoundingClientRect();

    // Umrechnung in NDC (-1..1 in X und Y)
    const ndc = {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1,
    };

    // Raycaster aus Kamera und NDC aufsetzen
    raycaster.setFromCamera(ndc, camera);

    // Nur die explizit als „pickable“ registrierten Meshes als Testmenge verwenden
    const poolSet = state.pickableMeshes;            // zentraler Pool aus dem Store
    if (!poolSet || poolSet.size === 0) {            // Guard: noch nichts registriert?
        state.selected = null;                         // Auswahl leeren
        return null;                                   // und ruhig aussteigen
    }
    const pool = Array.from(poolSet);                // jetzt sicher iterierbar


    // Schnittmengen mit der Testmenge berechnen (keine rekursive Suche nötig)
    const hits = raycaster.intersectObjects(pool, false);

    // Falls nichts getroffen wurde: Auswahl im Store leeren und null zurückgeben
    if (!hits.length) {
        state.selected = null;
        return null;
    }

    // Erstes (vorderstes) Trefferobjekt auswerten
    const hit = hits[0];

    // Zum Model-Root hochsteigen, damit Info-Panel und Aktionen am gesamten Modell arbeiten können
    const root = getModelRoot(hit.object);

    // Auswahl im Store ablegen: Root (Modell), konkretes Mesh, und die getroffene 3D-Position
    state.selected = { root, mesh: hit.object, point: hit.point };

    // Auswahl zurückgeben, damit aufrufende Stellen direkt darauf reagieren können
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

