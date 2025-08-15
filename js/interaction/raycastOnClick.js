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
export function setupRaycastOnClick(domElement, callback) {
    function onPointerDown(e) {
        const sel = pickAt(e.clientX, e.clientY);
        if (!sel?.root) return;

        const entry =
            sel.root.userData?.entry ||
            sel.root.userData?.meta ||
            sel.mesh?.userData?.meta || null;

        callback?.({ meta: entry, model: sel.root, event: e, selection: sel });
    }

    domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => domElement.removeEventListener('pointerdown', onPointerDown);
}
