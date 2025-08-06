// cameraUtils.js
import { THREE } from './init.js';

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
  const defaultPosition = new THREE.Vector3(0, 1.6, 3.0); // Nah ran!
  const defaultTarget = new THREE.Vector3(0, 1.0, 0);

  camera.position.copy(defaultPosition);
  controls.target.copy(defaultTarget);
  controls.update();
  camera.lookAt(defaultTarget);
  
console.log('📷 Kamera-Position gesetzt:', camera.position.toArray());
console.log('🎯 Controls.target gesetzt:', controls.target.toArray());
}

/**
 * Zentriert die Kamera auf sichtbare Modelle und wählt eine passende Zoom-Distanz.
 * Berücksichtigt mobile Geräte durch größeren Abstand.
 */
export function fitCameraToScene(camera, controls, renderer, scene, paddingFactor = 1.2)
{
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
  renderer.render(scene, camera);
  return;
}

//DEBUG OBJEKT IN BOX ?
  // 📦 BoundingBox berechnen
  visibleMeshes.forEach(mesh => {
    tempBox.setFromObject(mesh);
    boundingBox.union(tempBox);
  });

  // 🟥 BoundingBox anzeigen
const debugMode = false;
if (debugMode) {
  const helper = new THREE.Box3Helper(box, 0xff0000);
  scene.add(helper);
}

visibleMeshes.forEach(mesh => {
  tempBox.setFromObject(mesh);
  boundingBox.union(tempBox);
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
  const adjustedDistance = isMobile() ? baseDistance * 1.2 : baseDistance * 0.9;

  const offset = new THREE.Vector3(0, maxDim * 0.2, adjustedDistance); // Von vorne (Z+)
  const newPosition = center.clone().add(offset);

  camera.position.copy(newPosition);
  controls.target.copy(center);
  controls.update();
  camera.lookAt(center);

  renderer.render(scene, camera);
  console.log('[fitCameraToScene] Kamera angepasst:', newPosition.toArray());
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
