// ============================================
// lights.js - Beleuchtungssystem für die 3D-Szene
// ============================================
import * as THREE from 'three';
import { scene } from './core/scene.js';

// Hauptlichter
export const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

export const lightFront = new THREE.DirectionalLight(0xffffff, 1.0);
lightFront.position.set(0, 10, 10);
lightFront.castShadow = false; // Performance
scene.add(lightFront);

export const lightBack = new THREE.DirectionalLight(0xffffff, 0.75);
lightBack.position.set(0, 10, -10);
scene.add(lightBack);

export const lightTop = new THREE.DirectionalLight(0xffffff, 0.5);
lightTop.position.set(0, 20, 0);
scene.add(lightTop);

// Helper-Funktionen
export function setLightingIntensity(intensity) {
    ambientLight.intensity = intensity * 0.5;
    lightFront.intensity = intensity;
    lightBack.intensity = intensity * 0.75;
    lightTop.intensity = intensity * 0.5;
}

export function resetLighting() {
    setLightingIntensity(1.0);
}

// Debug-Helper (optional)
export function addLightHelpers() {
    const helpers = [];

    helpers.push(new THREE.DirectionalLightHelper(lightFront, 2));
    helpers.push(new THREE.DirectionalLightHelper(lightBack, 2));
    helpers.push(new THREE.DirectionalLightHelper(lightTop, 2));

    helpers.forEach(helper => scene.add(helper));

    return helpers;
}

console.log('💡 Beleuchtungssystem initialisiert');