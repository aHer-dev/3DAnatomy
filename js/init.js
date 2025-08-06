// In js/init.js
// In ui.js oder modelLoader.js
import * as THREE from 'https://unpkg.com/three@0.179.0/build/three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { GLTFLoader } from './GLTFLoader.js';
import { DRACOLoader } from './DRACOLoader.js'; // nur, falls du Draco nutzt
import { setCameraToDefault } from './cameraUtils.js';
import { hideInfoPanel } from './interaction.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const loader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
dracoLoader.setDecoderConfig({ type: 'js' });
dracoLoader.preload();
loader.setDRACOLoader(dracoLoader);

console.log('🚀 Draco wird verwendet:', loader.dracoLoader !== undefined);

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

  controls.minDistance = 1;
  controls.maxDistance = 2000;
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
controls.screenSpacePanning = true;
controls.enableRotate = true;
controls.minPolarAngle = 0; // Von oben erlauben (default)
controls.maxPolarAngle = Math.PI; // Volle 180° – von unten erlauben

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



// Setze initiale Hintergrundfarbe mit 40% Helligkeit via HSL
  scene.background = new THREE.Color('#020a1d');
  renderer.render(scene, camera);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  renderer.sortObjects = true;
}

// ✅ Alle benötigten Exporte in einer Zeile
export {
  THREE,
  scene,
  camera,
  renderer,
  loader,
  controls,
  initThree
};

