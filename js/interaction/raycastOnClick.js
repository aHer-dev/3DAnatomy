import * as THREE from 'three';
import { camera } from '../camera.js';
import { scene } from '../scene.js';
import { getMeta } from '../utils/index.js';
import { state } from '../state.js';

export function setupRaycastOnClick(domElement, callback) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const bounds = domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            let model = intersects[0].object;
            while (model && !state.modelNames.has(model)) {
                model = model.parent;
            }

            if (model && state.modelNames.has(model)) {
                const label = state.modelNames.get(model);
                getMeta().then(metaArray => {
                    const meta = metaArray.find(entry => entry.label === label);
                    if (meta) callback({ meta, model, intersects, event });
                });
            }
        }
    }

    domElement.addEventListener('pointerdown', onClick);
    domElement.addEventListener('mousedown', onClick);
    domElement.addEventListener('touchstart', onClick);
}
