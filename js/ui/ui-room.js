// js/ui/ui-room.js - ROOM LIGHTING FIX
import * as THREE from 'three';
import { scene } from '../core/scene.js';
import { getLightRig, setLightIntensity } from '../lights.js';
import { renderer } from '../core/renderer.js';
import { camera } from '../core/camera.js';

export function setupRoomUI() {
  const lightingSlider = document.getElementById('slider-lighting');
  const colorInput = document.getElementById('color-room');
  const brightnessSlider = document.getElementById('slider-room-brightness');

  if (!lightingSlider || !colorInput || !brightnessSlider) {
    console.warn('⚠️ Room-UI Elemente fehlen');
    return;
  }

  // FIX: Beleuchtungsregler funktionsfähig machen
  function applyLighting(intensity) {
    renderer.toneMappingExposure = 0.65 * intensity;
    setLightIntensity(intensity);
    if (scene.environment) scene.environmentIntensity = 0.3 * intensity;
    renderer.render(scene, camera);
  }

  lightingSlider.addEventListener('input', (e) => {
    applyLighting(parseFloat(e.target.value));
  });

  // FIX: Raumfarbe funktionsfähig
  function updateRoomColor() {
    const baseColor = new THREE.Color(colorInput.value);
    const brightness = parseFloat(brightnessSlider.value);

    // HSL-Anpassung für Helligkeit
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);

    // Helligkeit anwenden
    hsl.l = Math.max(0, Math.min(1, hsl.l * brightness));

    const finalColor = new THREE.Color();
    finalColor.setHSL(hsl.h, hsl.s, hsl.l);

    // Hintergrund setzen
    scene.background = finalColor;

    // Neu rendern
    renderer.render(scene, camera);

    console.log(`🎨 Raumfarbe: ${finalColor.getHexString()}`);
  }

  colorInput.addEventListener('input', updateRoomColor);
  brightnessSlider.addEventListener('input', updateRoomColor);

  // Initial setzen
  updateRoomColor();

  // Initial – Slider und Lichter synchron starten
  const DEFAULT_INTENSITY = 0.85;
  lightingSlider.value = DEFAULT_INTENSITY;
  applyLighting(DEFAULT_INTENSITY);

  console.log('✅ Room-UI initialisiert');
}