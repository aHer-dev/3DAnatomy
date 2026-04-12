import * as THREE from 'three';

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.001,
  10000
);
camera.position.set(0, 0, 5);

// Resize handling moved to centralized initResizeHandler.js

export { camera }; // Muss diesen Export haben