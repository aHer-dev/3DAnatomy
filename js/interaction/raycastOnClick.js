// 4. RAYCASTING - interaction/raycastOnClick.js
// ============================================
import { pickAt } from '../core/raycaster.js';
import { events } from '../core/events.js';

let highlightedModel = null;

export function setupRaycastOnClick(domElement) {
    const handleClick = (event) => {
        event.preventDefault();

        const result = pickAt(event.clientX, event.clientY);

        if (result) {
            events.emit('model-selected', {
                model: result.root,
                mesh: result.mesh,
                point: result.point,
                entry: result.root.userData?.entry
            });

            applyHighlight(result.root);
        } else {
            events.emit('selection-cleared');
            clearHighlight();
        }
    };

    domElement.addEventListener('pointerdown', handleClick, { passive: false });

    return () => {
        domElement.removeEventListener('pointerdown', handleClick);
    };
}

export function applyHighlight(model) {
    clearHighlight();

    highlightedModel = model;
    model.traverse(node => {
        if (node.isMesh && node.material) {
            if (!node.userData.originalEmissive) {
                node.userData.originalEmissive = node.material.emissive?.clone() || new THREE.Color(0x000000);
            }
            if (node.material.emissive) {
                node.material.emissive.setHex(0x444444);
            }
        }
    });
}

export function clearHighlight() {
    if (!highlightedModel) return;

    highlightedModel.traverse(node => {
        if (node.isMesh && node.material?.emissive && node.userData.originalEmissive) {
            node.material.emissive.copy(node.userData.originalEmissive);
            delete node.userData.originalEmissive;
        }
    });

    highlightedModel = null;
}