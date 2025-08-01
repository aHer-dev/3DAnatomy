// cameraUtils.js
import * as THREE from './three.module.js';

export function setCameraToDefault(camera, controls) {
  camera.position.set(0, 100, 300);
  camera.lookAt(0, 100, 0);
  controls.target.set(0, 100, 0);
  controls.update();
}

export function fitCameraToModels(camera, controls, models, renderer, scene) {
  const box = new THREE.Box3();

  models.forEach(model => {
    if (model.visible) {
      box.expandByObject(model);
    }
  });

  if (!box.isEmpty()) {
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());

    camera.position.set(0, center.y, size * 0.75);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
    renderer.render(scene, camera);
    console.log('Kamera automatisch angepasst:', camera.position);
  } else {
    console.warn('Keine sichtbaren Modelle für Kamera-Fit.');
    setCameraToDefault(camera, controls);
    renderer.render(scene, camera);
  }
}