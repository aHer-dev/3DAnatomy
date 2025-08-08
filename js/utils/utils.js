// js/utils/utils.js
// Kleine, generische Helfer. Keine Pfad-/Meta-/State-Logik mehr in utils!

import * as THREE from 'three';



/**
 * Normalisiert Maus- oder Touch-Koordinaten in NDC für den Raycaster (fensterbasiert).
 * Hinweis: Für präzise Klicks auf das Canvas kann später eine Variante mit getBoundingClientRect()
 * ergänzt werden. Diese hier ist "good enough", solange das Canvas fullscreen arbeitet.
 */
export function getNormalizedMouse(event) {
  const point = ('touches' in event && event.touches.length)
    ? event.touches[0]
    : event;

  const x = (point.clientX / window.innerWidth) * 2 - 1;
  const y = -(point.clientY / window.innerHeight) * 2 + 1;

  return new THREE.Vector2(x, y);
}
