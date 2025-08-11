// js/controls.js
// Steuert die Kamera-Interaktion in der 3D-Szene
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { camera } from './camera.js';
import { renderer } from './renderer.js';
import { hideInfoPanel } from '../interaction/infoPanel.js';

const controls = new OrbitControls(camera, renderer.domElement);

// Natürliches Navigationsgefühl
controls.enableDamping = true;
controls.dampingFactor = 0.05;

controls.zoomToCursor = true;
controls.enablePan = true;
controls.screenSpacePanning = true;

controls.rotateSpeed = 0.9;
controls.panSpeed = 0.6;
controls.zoomSpeed = 1.2;

// „Nah ran“ erlauben, aber großzügigen Korridor lassen
controls.minDistance = 0.01;
controls.maxDistance = 3;

// Deine vertikale Begrenzung beibehalten
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;
controls.enableRotate = true;

// Info-Panel nur bei echter Kamerabewegung schließen
let previousPosition = camera.position.clone();
controls.addEventListener('change', () => {
  const distanceMoved = camera.position.distanceTo(previousPosition);
  if (distanceMoved > 0.01) {
    const panel = document.getElementById('info-panel');
    if (panel?.classList.contains('visible')) {
      hideInfoPanel();
      console.log('Panel minimiert bei 3D-Interaktion');
    }
    previousPosition.copy(camera.position);
  }
});

export { controls };