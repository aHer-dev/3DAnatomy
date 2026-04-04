// utils/cameraClipping.js
import * as THREE from 'three';

export function retuneCameraClipping(camera, object, padding = 1.2) {
    const box = new THREE.Box3().setFromObject(object);
    if (!isFinite(box.min.x) || !isFinite(box.max.x)) return; // nichts in der Szene
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = (size / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * padding;
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
}
