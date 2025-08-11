// js/lights.js
import * as THREE from 'three';

let LIGHT_RIG = null;

export function setupBasicLights(scene) {
    if (LIGHT_RIG) return LIGHT_RIG; // doppelte Einrichtung vermeiden

    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(3, 5, 2);
    key.castShadow = true;

    key.shadow.mapSize.set(1024, 1024);     // 1024 reicht oft
    key.shadow.bias = -0.0005;              // Peter Panning vermeiden
    key.shadow.normalBias = 0.02;           // Shadow Acne reduzieren
    // grobe Frustum-Werte; optional gleich unten auto-fit
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far  = 100;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    scene.add(key);


    const fill = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);

    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(-2, 3, -2);
    rim.castShadow = false;
    scene.add(key, fill, rim);
    LIGHT_RIG = { key, fill, rim };
    return LIGHT_RIG;
}

export function getLightRig() {
    return LIGHT_RIG;
}

export function fitShadowFrustumToScene(light, scene, padding = 1.2) {
    const box = new THREE.Box3().setFromObject(scene);
    if (!isFinite(box.min.x)) return;
    const size = box.getSize(new THREE.Vector3()).multiplyScalar(padding);
    const center = box.getCenter(new THREE.Vector3());
    light.position.add(center.clone().sub(light.target.position));
    light.target.position.copy(center);
    const cam = light.shadow.camera; // OrthographicCamera
    const half = Math.max(size.x, size.z) * 0.5;
    cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
    cam.near = 0.1; cam.far = size.y * 3;
    cam.updateProjectionMatrix();
}