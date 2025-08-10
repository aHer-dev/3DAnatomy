
import * as THREE from 'three';
import { createOptimizer, optimizeRender } from './renderOptimizer.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.sortObjects = true;

// Performance-Settings für große Szenen
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const mount = document.getElementById('canvas-container') || document.body;
mount.appendChild(renderer.domElement);

// Optimizer (optional, wird später initialisiert)
let optimizer = null;

/**
 * Initialisiert den Optimizer (nach dem Scene/Camera Setup)
 */
export function initOptimizer(camera, scene) {
  optimizer = createOptimizer(camera, scene, renderer);

  // Auto-Aktivierung für Mobile
  if (optimizer.isMobileDevice()) {
    console.log('📱 Mobile Gerät erkannt - Optimierung verfügbar');
    // Erstmal deaktiviert, kann später aktiviert werden
  }
}

/**
 * Erweiterte Render-Funktion mit optionaler Optimierung
 */
export function renderWithOptimization(scene, camera) {
  // Optimierung durchführen (falls aktiviert)
  if (optimizer && optimizer.enabled) {
    optimizeRender();
  }

  // Normal rendern
  renderer.render(scene, camera);
}

/**
 * Standard-Render (Rückwärtskompatibilität)
 */
export function render(scene, camera) {
  renderer.render(scene, camera);
}

// Window Resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Optimizer-Controls für Debug/Testing
if (typeof window !== 'undefined') {
  window.renderOptimizer = {
    enable: () => optimizer?.enable(),
    disable: () => optimizer?.disable(),
    stats: () => optimizer?.getStats(),
    auto: () => optimizer?.autoOptimize()
  };
}

export { renderer };