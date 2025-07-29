import * as THREE from './three.module.js'; // ✅ korrekt für init.js
import { OrbitControls } from '../js/OrbitControls.js';
import { GLTFLoader } from '../js/GLTFLoader.js';


export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
export const renderer = new THREE.WebGLRenderer();
export const controls = new OrbitControls(camera, renderer.domElement);
export const loader = new GLTFLoader();

export function initThree() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('container').appendChild(renderer.domElement);

  // Beleuchtung
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

  camera.position.set(0, 2, 5);

  // OrbitControls
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };
  controls.minDistance = 1;
  controls.maxDistance = 2000;
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = true;
  controls.maxPolarAngle = Math.PI / 2;

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}