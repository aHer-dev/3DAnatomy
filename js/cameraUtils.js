// cameraUtils.js
import * as THREE from './three.module.js';

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
  const defaultPosition = new THREE.Vector3(0, 100, 300);
  const defaultTarget = new THREE.Vector3(0, 100, 0);

  camera.position.copy(defaultPosition);
  controls.target.copy(defaultTarget);
  controls.update();
  camera.lookAt(defaultTarget);
}

/**
 * Zentriert die Kamera auf sichtbare Modelle und wählt eine passende Zoom-Distanz.
 * Berücksichtigt mobile Geräte durch größeren Abstand.
 */
export function fitCameraToModels(camera, controls, models, renderer, scene, paddingFactor = 1.2) {
  const boundingBox = new THREE.Box3();
  const tempBox = new THREE.Box3();

  models.forEach(model => {
    if (model.visible) {
      tempBox.setFromObject(model);
      boundingBox.union(tempBox);
    }
  });

  if (boundingBox.isEmpty()) {
    console.warn('[fitCameraToModels] Keine sichtbaren Modelle. Setze auf Default.');
    setCameraToDefault(camera, controls);
    renderer.render(scene, camera);
    return;
  }

  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const baseDistance = maxDim * paddingFactor;
  const adjustedDistance = isMobile() ? baseDistance * 1.6 : baseDistance;

  const offset = new THREE.Vector3(0, maxDim * 0.3, adjustedDistance);
  const newPosition = center.clone().add(offset);

  camera.position.copy(newPosition);
  controls.target.copy(center);
  controls.update();
  camera.lookAt(center);

  renderer.render(scene, camera);
  console.log('[fitCameraToModels] Kamera angepasst:', newPosition.toArray());
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
