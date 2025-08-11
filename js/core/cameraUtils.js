import * as THREE from 'three';
import { getConfig } from '../config/config.js';
/**
 * Utility zur Erkennung mobiler Endgeräte (Viewport-basiert).
 */
export function isMobile() {
  return window.innerWidth < 768;
}

/**
 * Setzt Kamera und Controls auf eine definierte Standardposition.
 */
export function setCameraToDefault(camera, controls) {
  // 1) Werte aus der Config lesen (Fallbacks = deine bisherigen Hartwerte)
  const posArr = getConfig('ui.cameraDefaults.position', [-0.5, 0.9, 0.8]); // [x,y,z]
  const tgtArr = getConfig('ui.cameraDefaults.target', [0.0, 1.0, 0.0]); // [x,y,z]

  // 2) In THREE-Vektoren umwandeln
  const defaultPosition = new THREE.Vector3(posArr[0], posArr[1], posArr[2]);
  const defaultTarget = new THREE.Vector3(tgtArr[0], tgtArr[1], tgtArr[2]);

  // 3) Kamera und Controls setzen
  camera.position.copy(defaultPosition);  // Kamera auf Preset-Position
  controls.target.copy(defaultTarget);    // OrbitControls-Fokuspunkt setzen
  controls.update();                      // Controls intern aktualisieren
  camera.lookAt(defaultTarget);           // Blickrichtung explizit setzen
}

/**
 * Zentriert die Kamera auf sichtbare Modelle und wählt eine passende Zoom-Distanz.
 * Berücksichtigt mobile Geräte durch größeren Abstand.
 */
export function fitCameraToScene(camera, controls, renderer, scene, paddingFactor = 1.2) {
  const boundingBox = new THREE.Box3();
  const tempBox = new THREE.Box3();
  const visibleMeshes = [];

  scene.traverse(obj => {
    if (obj.isMesh && obj.visible) {
      visibleMeshes.push(obj);
    }
  });

  if (visibleMeshes.length === 0) {
    console.warn('[fitCameraToScene] Keine sichtbaren Modelle. Setze auf Default.');
    setCameraToDefault(camera, controls);
    return;
  }

  // BoundingBox berechnen
  visibleMeshes.forEach(mesh => {
    tempBox.setFromObject(mesh);
    boundingBox.union(tempBox);
  });

  // Debug: BoundingBox anzeigen
  const debugMode = false;
  if (debugMode) {
    const helper = new THREE.Box3Helper(boundingBox, 0xff0000);
    scene.add(helper);
  }

  if (boundingBox.isEmpty()) {
    console.warn('[fitCameraToScene] BoundingBox leer. Setze auf Default.');
    setCameraToDefault(camera, controls);
    return;
  }

  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const baseDistance = maxDim * paddingFactor;
  const adjustedDistance = isMobile() ? baseDistance * 1.2 : baseDistance * 0.9; // UX: Mehr Raum auf Mobile

  const offset = new THREE.Vector3(0, maxDim * 0.2, adjustedDistance); // Von vorne (Z+)
  const newPosition = center.clone().add(offset);

  camera.position.copy(newPosition);
  controls.target.copy(center);
  controls.update();
  camera.lookAt(center);

  //console.log('[fitCameraToScene] Kamera angepasst:', newPosition.toArray());
}

/**
 * Animiert Kamera und Steuerziel sanft zu einer neuen Position.
 * Benötigt requestAnimationFrame – keine Drittbibliothek.
 */
export function animateCameraTo(camera, controls, newPosition, newTarget, duration = 1000) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = new THREE.Vector3().copy(newPosition);
  const endTarget = new THREE.Vector3().copy(newTarget);

  const startTime = performance.now();

  function animateFrame(time) {
    const elapsed = time - startTime;
    const t = Math.min(elapsed / duration, 1);

    camera.position.lerpVectors(startPos, endPos, t);
    controls.target.lerpVectors(startTarget, endTarget, t);
    controls.update();

    if (t < 1) {
      requestAnimationFrame(animateFrame);
    }
  }

  requestAnimationFrame(animateFrame);
}