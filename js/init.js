// js/init.js
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { GLTFLoader } from './GLTFLoader.js';
import { hideInfoPanel } from './interaction.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const loader = new GLTFLoader();
const controls = new OrbitControls(camera, renderer.domElement);

controls.addEventListener('change', () => {
  if (document.getElementById('info-panel').classList.contains('visible')) {
    hideInfoPanel(); // Minimieren bei Rotate/Zoom/Pan
    console.log('Panel minimiert bei 3D-Interaktion');
  }
});

function initThree() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('container').appendChild(renderer.domElement);

  // Neue initiale Kamera-Position: Frontal, höher, mit Abstand
  camera.position.set(0, 100, 300); // y=100 (Mitte Mensch), z=300 (Abstand)
  camera.lookAt(0, 100, 0); // Schaue auf zentrale Mitte

  // OrbitControls mit initialem Target
  controls.target.set(0, 100, 0); // Ziel auf Skelett-Mitte
  controls.update(); // Sofort anwenden
  controls.minDistance = 1;
  controls.maxDistance = 2000;
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = true;
  controls.maxPolarAngle = Math.PI / 2;

  const lightFront = new THREE.DirectionalLight(0xffffff, 0.8);
  lightFront.position.set(1, 1, 1);
  scene.add(lightFront);

  const lightBack = new THREE.DirectionalLight(0xffffff, 0.6);
  lightBack.position.set(-1, 1, -1);
  scene.add(lightBack);

  const lightTop = new THREE.DirectionalLight(0xffffff, 0.5);
  lightTop.position.set(0, 1, 0);
  scene.add(lightTop);

  const ambientLight = new THREE.AmbientLight(0x606060);
  scene.add(ambientLight);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  renderer.sortObjects = true;
  
}

// ✅ Alle benötigten Exporte in einer Zeile
export { initThree, scene, camera, renderer, loader, controls };