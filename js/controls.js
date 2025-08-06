import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { camera } from './camera.js';
import { renderer } from './renderer.js';
import { hideInfoPanel } from './interaction.js'; // Für Panel-Interaktion

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 1;
controls.maxDistance = 2000;
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = true;
controls.enableRotate = true;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;

controls.addEventListener('change', () => {
  if (document.getElementById('info-panel').classList.contains('visible')) {
    hideInfoPanel(); // Minimieren bei Rotate/Zoom/Pan
    console.log('Panel minimiert bei 3D-Interaktion');
  }
});

controls.update();

export { controls };