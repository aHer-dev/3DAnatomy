// utils/mouse.js
import * as THREE from 'three';

/**
 * Normalisiert Maus- oder Touch-Koordinaten für Raycasting
 */
export function getNormalizedMouse(event) {
    const mouse = new THREE.Vector2();

    if (event.touches && event.touches.length > 0) {
        const touch = event.touches[0];
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    } else {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    return mouse;
}
