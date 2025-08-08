//renderer.js

import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.sortObjects = true; // Wie in init.js
document.getElementById('canvas-container').appendChild(renderer.domElement); // Wie in init.js

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

export { renderer };