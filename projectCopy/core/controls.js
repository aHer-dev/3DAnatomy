//js/controls.js
// controls.js – Steuert die Kamera-Interaktion in der 3D-Szene
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { camera } from './camera.js';
import { renderer } from './renderer.js';
import { hideInfoPanel } from './interaction/infoPanel.js';



const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 1;
controls.maxDistance = 2000;
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = true;
controls.enableRotate = true;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;


// QUICKFIX ? INFO PANEL WURDE VERSTECKT ONKLICK ORBIT CONTROL SCHLIE?T NACH KLICK
let previousPosition = camera.position.clone();

controls.addEventListener('change', () => {
  const distanceMoved = camera.position.distanceTo(previousPosition);

  // Nur wenn die Kamera wirklich bewegt wurde → Panel schließen
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