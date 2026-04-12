// js/controls.js
// Steuert die Kamera-Interaktion in der 3D-Szene
import * as THREE from 'three';
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

// Info-Panel nur bei aktiver Nutzer-Interaktion schließen (nicht während Damping-Nachlauf)
let isUserDragging = false;
controls.addEventListener('start', () => { isUserDragging = true; });
controls.addEventListener('end',   () => { isUserDragging = false; });

controls.addEventListener('change', () => {
  if (!isUserDragging) return; // Damping-Nachlauf ignorieren
  const panel = document.getElementById('info-panel');
  if (panel?.classList.contains('visible')) {
    hideInfoPanel();
  }
});

// ─── Dynamisches Zoom-Target ────────────────────────────────────────────────
// Problem: controls.target bleibt am Modellzentrum. Beim Reinzoomen in einen
// weit entfernten Bereich (z.B. Fuß) trifft die Kamera irgendwann minDistance
// und stoppt. Lösung: Target beim Reinzoomen in Blickrichtung verschieben.
const _lookDir = new THREE.Vector3();

renderer.domElement.addEventListener('wheel', (e) => {
  const zoomingIn = e.deltaY < 0;
  if (!zoomingIn) return;

  const dist = camera.position.distanceTo(controls.target);

  // Erst aktiv werden wenn nahe dran (unter 15% des maxDistance)
  if (dist > controls.maxDistance * 0.15) return;

  camera.getWorldDirection(_lookDir);

  // Target um 30% der aktuellen Distanz nach vorne verschieben
  const shift = dist * 0.3;
  controls.target.addScaledVector(_lookDir, shift);
  controls.update();
}, { passive: true });

export { controls };