// js/bootstrap/initCameraView.js
// 🎥 Initialisiert die Standardansicht der Kamera beim App-Start

import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { setCameraToDefault } from '../core/cameraUtils.js';

/**
 * Setzt die Kamera in ihre Default-Startposition – zentriert auf Szene.
 */
export function initCameraView() {
    setCameraToDefault(camera, controls);
    controls.saveState(); // Startzustand für spätere Resets sichern
    console.log('📸 Kamera-Startposition gesetzt (Default View)');
}
