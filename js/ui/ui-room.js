// ui-room.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js';
import { scene, renderer, camera } from '../init.js';

export function setupRoomUI() {
  const colorPicker = document.getElementById('room-color');
  const brightnessSlider = document.getElementById('room-brightness');
  const roomContent = document.getElementById('room-dropdown-content');

  if (!colorPicker || !brightnessSlider || !roomContent) {
    console.warn('⚠️ ui-room: Farb-/Helligkeitselemente fehlen.');
    return;
  }

  function updateRoomColor() {
    const baseColor = new THREE.Color(colorPicker.value);
    const brightness = parseFloat(brightnessSlider.value);
    const hsl = baseColor.getHSL({ h: 0, s: 0, l: 0 });
    hsl.l = Math.max(0, Math.min(1, hsl.l + (brightness - 0.5)));
    baseColor.setHSL(hsl.h, hsl.s, hsl.l);
    scene.background = baseColor;
    renderer.render(scene, camera);
  }

  colorPicker.addEventListener('input', updateRoomColor);
  brightnessSlider.addEventListener('input', updateRoomColor);

  console.log('🌌 ui-room initialisiert.');
}
