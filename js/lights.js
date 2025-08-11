// js/lights.js - LIGHTING CONTROL FIX
import * as THREE from 'three';

let LIGHT_RIG = null;

export function setupBasicLights(scene) {
    if (LIGHT_RIG) return LIGHT_RIG;

    // FIX: Reduzierte Intensitäten für HDR-Kompatibilität
    const key = new THREE.DirectionalLight(0xffffff, 0.5); // Reduziert von 2.0
    key.position.set(3, 5, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 100;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;

    // FIX: Hemisphere Light als Ambient
    const fill = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3); // Reduziert

    // FIX: Rim Light schwächer
    const rim = new THREE.DirectionalLight(0xffffff, 0.2); // Reduziert
    rim.position.set(-2, 3, -2);
    rim.castShadow = false;

    scene.add(key, fill, rim);

    LIGHT_RIG = { key, fill, rim };

    console.log('💡 Beleuchtung initialisiert (HDR-kompatibel)');
    return LIGHT_RIG;
}

export function getLightRig() {
    return LIGHT_RIG;
}

// FIX: Beleuchtungsintensität dynamisch anpassen
export function setLightIntensity(factor = 1.0) {
    if (!LIGHT_RIG) return;

    // Basis-Intensitäten
    const baseKey = 0.5;
    const baseFill = 0.3;
    const baseRim = 0.2;

    LIGHT_RIG.key.intensity = baseKey * factor;
    LIGHT_RIG.fill.intensity = baseFill * factor;
    LIGHT_RIG.rim.intensity = baseRim * factor;

    console.log(`💡 Licht-Intensität: ${(factor * 100).toFixed(0)}%`);
}

export function fitShadowFrustumToScene(light, scene, padding = 1.2) {
    const box = new THREE.Box3().setFromObject(scene);
    if (!isFinite(box.min.x)) return;

    const size = box.getSize(new THREE.Vector3()).multiplyScalar(padding);
    const center = box.getCenter(new THREE.Vector3());

    light.position.add(center.clone().sub(light.target.position));
    light.target.position.copy(center);

    const cam = light.shadow.camera;
    const half = Math.max(size.x, size.z) * 0.5;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 0.1;
    cam.far = size.y * 3;
    cam.updateProjectionMatrix();
}