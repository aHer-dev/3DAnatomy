// js/interaction/raycastOnClick.js
import * as THREE from 'three';
import { camera } from '../camera.js';
import { scene } from '../scene.js';
import { getMeta } from '../utils/index.js';
import { state } from '../state.js';

/**
 * Setzt Raycasting bei Klick auf das 3D-Modell auf.
 * Führt Callback aus mit { meta, model, intersects, event }
 */
export function setupRaycastOnClick(domElement, callback) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onClick(event) {
        console.log("🖱️ Klick erkannt");
        event.preventDefault();
        event.stopPropagation();

        const bounds = domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            let object = intersects[0].object;
            console.log('🔍 Getroffenes Objekt:', object.name || object.type);

            // Elternkette nach userData.meta durchsuchen
            while (object && !object.userData?.meta) {
                object = object.parent;
            }

            if (object && object.userData?.meta) {
                const meta = object.userData.meta;
                console.log('✅ Callback wird aufgerufen mit:', meta.labels?.en || meta.id);
                callback({ meta, model: object, intersects, event });
            } else {
                console.warn('⚠️ Kein zugehöriges Modell mit Metadaten gefunden.');
            }
        }
    }

    domElement.addEventListener('pointerdown', onClick);
}
