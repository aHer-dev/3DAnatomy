import * as THREE from 'three';
import { scene } from './core/scene.js';

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

export { lightFront, lightBack, lightTop, ambientLight };