import * as THREE from 'three';
import { createOptimizer, optimizeRender } from './renderOptimizer.js';

// Existierendes Canvas nutzen oder neu anlegen
const canvas = document.getElementById('canvas') || (() => {
  const c = document.createElement('canvas');
  c.id = 'canvas';
  document.body.appendChild(c);
  return c;
})();

// Renderer mit Performance-Optionen
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false
});


// Auflösung deckeln, um GPU-/VRAM-Last zu senken
renderer.frustumCulled = true; // Nur sichtbare Objekte rendern
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

// Startgröße setzen
renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);

// Performance-/Darstellungs-Settings
renderer.sortObjects = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.65;

//shadow?
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Optionaler Optimizer
let optimizer = null;

/**
 * Initialisiert den Optimizer (nach Scene/Camera Setup)
 */
export function initOptimizer(camera, scene) {
  optimizer = createOptimizer(camera, scene, renderer);

  // Auto-Aktivierung für Mobile Geräte
  if (optimizer.isMobileDevice()) {
    console.log('📱 Mobile Gerät erkannt – Optimierung verfügbar');
    // Noch nicht automatisch aktivieren, nur vorbereiten
  }
}

/**
 * Render-Funktion mit optionaler Optimierung
 */
export function renderWithOptimization(scene, camera) {
  if (optimizer && optimizer.enabled) {
    optimizeRender();
  }
  renderer.render(scene, camera);
}

/**
 * Standard-Render (Rückwärtskompatibilität)
 */
export function render(scene, camera) {
  renderer.render(scene, camera);
}

// Schatten-Helfer (exportieren)
export function requestShadowUpdate() {
  // 1 Frame lang Shadow-Map neu rendern
  renderer.shadowMap.needsUpdate = true;
}
export function freezeShadows() {
  // Schatten-Map nicht jedes Frame neu berechnen
  renderer.shadowMap.autoUpdate = false;
}
export function thawShadows() {
  // vor großen Umbauten kurz aktivieren
  renderer.shadowMap.autoUpdate = true;
}

// Resize handling moved to centralized initResizeHandler.js


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