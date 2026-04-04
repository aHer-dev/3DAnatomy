// js/interaction/raycastOnClick.js
// Einheitlicher Canvas-Klickpfad über den zentralen Raycaster (core/raycaster).
// Keine eigene Raycaster-Instanz, kein Raycast gegen scene.children.
// API bleibt: setupRaycastOnClick(domElement, callback)

import { pickAt } from '../core/raycaster.js';

/**
 * @param {HTMLElement} domElement - z. B. renderer.domElement
 * @param {(args:{meta:any, model:THREE.Object3D, event:PointerEvent, selection:any}) => void} callback
 * @returns {() => void} cleanup-Funktion zum Entfernen des Listeners
 */
const DRAG_THRESHOLD_PX = 6;

export function setupRaycastOnClick(domElement, callback) {
    let downX = 0, downY = 0;

    function onPointerDown(e) {
        downX = e.clientX;
        downY = e.clientY;
    }

    function onPointerUp(e) {
        // Drag ignorieren – nur echte Klicks verarbeiten
        const dx = e.clientX - downX;
        const dy = e.clientY - downY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) return;

        const sel = pickAt(e.clientX, e.clientY);
        if (!sel?.root) return;

        const entry =
            sel.root.userData?.entry ||
            sel.root.userData?.meta ||
            sel.mesh?.userData?.meta || null;

        callback?.({ meta: entry, model: sel.root, event: e, selection: sel });
    }

    domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
    domElement.addEventListener('pointerup', onPointerUp, { passive: true });
    return () => {
        domElement.removeEventListener('pointerdown', onPointerDown);
        domElement.removeEventListener('pointerup', onPointerUp);
    };
}
