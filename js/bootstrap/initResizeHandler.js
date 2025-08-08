// js/bootstrap/initResizeHandler.js
// 📐 Initialisiert das Resize-Verhalten für Kamera & Renderer

import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';

/**
 * Beobachtet Fenstergrößenänderungen und passt Kamera + Renderer an.
 */
export function initResizeHandler() {
    window.addEventListener('resize', () => {
        const container = document.getElementById('canvas-container');
        if (!container) {
            console.warn('⚠️ Kein Canvas-Container gefunden.');
            return;
        }

        const width = container.clientWidth;
        const height = container.clientHeight;

        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        console.log(`📐 Resize: ${width}x${height}`);
    });

    console.log('🖥️ Resize-Handler aktiviert.');
}
