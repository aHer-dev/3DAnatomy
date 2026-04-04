// js/bootstrap/initResizeHandler.js
// 📐 ZENTRALER Resize-Handler - verhindert Mehrfachregistrierung

import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';


// Flag um Mehrfachregistrierung zu verhindern
let resizeHandlerInitialized = false;

 //EINZIGER Resize - Handler für die gesamte Applikation
//Konsolidiert alle Resize - Logik an einem Ort

export function initResizeHandler() {
    if (resizeHandlerInitialized) {
        console.warn('⚠️ Resize-Handler bereits initialisiert - überspringe.');
        return;
    }

    window.addEventListener('resize', () => {
        const container = document.getElementById('canvas-container');

            const width = container ? container.clientWidth : window.innerWidth;
            const height = container ? container.clientHeight : window.innerHeight;

                // Renderer anpassen
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(width, height);

                // Kamera-Aspekt anpassen
                camera.aspect = width / height;
            camera.updateProjectionMatrix();

            // Debug nur bei Bedarf
            if (window.DEBUG_RESIZE) {
                console.log(`📐 Resize: ${width}x${height}, DPR: ${window.devicePixelRatio}`);
            }
        }, { passive: true });

    resizeHandlerInitialized = true;
    console.log('🖥️ Zentraler Resize-Handler aktiviert.');
}