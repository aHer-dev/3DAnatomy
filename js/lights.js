// js/lights.js - LIGHTING CONTROL FIX
import * as THREE from 'three';

let LIGHT_RIG = null;

export function setupBasicLights(scene) {
    if (LIGHT_RIG) return LIGHT_RIG;

    // Gleichmäßige Grundbeleuchtung – wichtig für 360°-Rotation
    const ambient = new THREE.AmbientLight(0xffffff, 0.375);

    // Hemisphere: helles Oberlicht, helles Unterlicht (kein dunkler Boden)
    const hemi = new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 0.45);

    // Key – vorne oben (Hauptlicht mit Schatten)
    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(2, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 100;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;

    // Fill links – beleuchtet die linke Seite
    const fillLeft = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLeft.position.set(-4, 2, 1);
    fillLeft.castShadow = false;

    // Back – beleuchtet die Rückseite
    const back = new THREE.DirectionalLight(0xffffff, 0.525);
    back.position.set(0, 3, -4);
    back.castShadow = false;

    // Unten – verhindert komplett schwarze Unterseite
    const bottom = new THREE.DirectionalLight(0xffffff, 0.225);
    bottom.position.set(0, -3, 0);
    bottom.castShadow = false;

    scene.add(ambient, hemi, key, fillLeft, back, bottom);

    LIGHT_RIG = { ambient, hemi, key, fillLeft, back, bottom };

    console.log('💡 Beleuchtung initialisiert (360°-optimiert)');
    return LIGHT_RIG;
}

export function getLightRig() {
    return LIGHT_RIG;
}

// FIX: Beleuchtungsintensität dynamisch anpassen
export function setLightIntensity(factor = 1.0) {
    if (!LIGHT_RIG) return;

    LIGHT_RIG.ambient.intensity   = 0.375 * factor;
    LIGHT_RIG.hemi.intensity      = 0.45 * factor;
    LIGHT_RIG.key.intensity       = 0.75 * factor;
    LIGHT_RIG.fillLeft.intensity  = 0.45 * factor;
    LIGHT_RIG.back.intensity      = 0.525 * factor;
    LIGHT_RIG.bottom.intensity    = 0.225 * factor;

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
