// js/core/controls.js
import * as THREE from 'three';
import { OrbitControls } from '../three/addons/controls/OrbitControls.js';
import { camera } from './camera.js';
import { renderer } from './renderer.js';

export let controls;

export function initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 0.2;
  controls.maxDistance = 20;
  return controls;
}

export function onControlsChange(cb) {
  if (controls && typeof controls.addEventListener === 'function') {
    controls.addEventListener('change', cb);
  }
}