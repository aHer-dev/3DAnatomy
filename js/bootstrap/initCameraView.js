// js/bootstrap/initCameraView.js
// 🎥 Initialisiert die Standardansicht der Kamera beim App-Start

import { camera } from '../camera.js';
import { controls } from '../controls.js';
import { setCameraToDefault } from '../cameraUtils.js';

/**
 * Setzt die Kamera in ihre Default-Startposition – zentriert auf Szene.
 */
export function initCameraView() {
    setCameraToDefault(camera, controls);
    controls.saveState(); // Startzustand für spätere Resets sichern
    console.log('📸 Kamera-Startposition gesetzt (Default View)');
}
