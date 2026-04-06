// js/ui/ui-room.js - ROOM LIGHTING FIX
import * as THREE from 'three';
import { scene } from '../core/scene.js';
import { setLightIntensity } from '../lights.js';
import { renderer } from '../core/renderer.js';
import { camera } from '../core/camera.js';
import { attachRecentColors } from './recentColors.js';

export function setupRoomUI() {
  const lightingSlider = document.getElementById('slider-lighting');
  const lightingPercentInput = document.getElementById('input-lighting-percent');
  const colorInput = document.getElementById('color-room');
  const brightnessSlider = document.getElementById('slider-room-brightness');
  const brightnessPercentInput = document.getElementById('input-room-brightness-percent');
  const steppers = document.querySelectorAll('#room-controls .room-stepper');

  if (!lightingSlider || !lightingPercentInput || !colorInput || !brightnessSlider || !brightnessPercentInput) {
    console.warn('⚠️ Room-UI Elemente fehlen');
    return;
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const sliderToPercent = (value) => Math.round(parseFloat(value) * 100);
  const percentToSlider = (value) => parseFloat(value) / 100;
  const sanitizePercent = (value) => String(value).replace(/[^\d]/g, '');
  const getPercentStep = (slider) => Math.max(1, Math.round((parseFloat(slider.step) || 0.01) * 100));
  const snapPercentToStep = (percent, slider) => {
    const step = getPercentStep(slider);
    return Math.round(percent / step) * step;
  };

  function syncPercentInput(slider, input, maxPercent) {
    const percent = clamp(sliderToPercent(slider.value), 0, maxPercent);
    input.value = percent;
    slider.setAttribute('aria-valuetext', `${percent}%`);
  }

  // FIX: Beleuchtungsregler funktionsfähig machen
  function applyLighting(intensity) {
    renderer.toneMappingExposure = 0.65 * intensity;
    setLightIntensity(intensity);
    if (scene.environment) scene.environmentIntensity = 0.3 * intensity;
    renderer.render(scene, camera);
  }

  function setLightingFromSlider(value) {
    lightingSlider.value = value;
    syncPercentInput(lightingSlider, lightingPercentInput, 200);
    applyLighting(parseFloat(lightingSlider.value));
  }

  function setBrightnessFromSlider(value) {
    brightnessSlider.value = value;
    syncPercentInput(brightnessSlider, brightnessPercentInput, 100);
    updateRoomColor();
  }

  lightingSlider.addEventListener('input', (e) => {
    setLightingFromSlider(e.target.value);
  });

  lightingPercentInput.addEventListener('input', (e) => {
    e.target.value = sanitizePercent(e.target.value);
  });
  lightingPercentInput.addEventListener('change', (e) => {
    const percent = clamp(
      snapPercentToStep(parseFloat(e.target.value) || 0, lightingSlider),
      0,
      200
    );
    setLightingFromSlider(percentToSlider(percent));
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
  attachRecentColors(colorInput, (hex) => {
    colorInput.value = hex;
    updateRoomColor();
  });
  brightnessSlider.addEventListener('input', (e) => {
    setBrightnessFromSlider(e.target.value);
  });
  brightnessPercentInput.addEventListener('input', (e) => {
    e.target.value = sanitizePercent(e.target.value);
  });
  brightnessPercentInput.addEventListener('change', (e) => {
    const percent = clamp(
      snapPercentToStep(parseFloat(e.target.value) || 0, brightnessSlider),
      0,
      100
    );
    setBrightnessFromSlider(percentToSlider(percent));
  });

  [lightingPercentInput, brightnessPercentInput].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });
  });

  steppers.forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.target);
      if (!input) return;

      const slider = input === lightingPercentInput ? lightingSlider : brightnessSlider;
      const max = input === lightingPercentInput ? 200 : 100;
      const step = getPercentStep(slider);
      const currentValue = clamp(parseFloat(input.value) || 0, 0, max);
      const direction = parseFloat(button.dataset.step || '0');
      const nextValue = clamp(currentValue + (direction * step), 0, max);
      input.value = nextValue;

      if (input === lightingPercentInput) {
        setLightingFromSlider(percentToSlider(nextValue));
      } else {
        setBrightnessFromSlider(percentToSlider(nextValue));
      }
    });
  });

  // Initial setzen
  // Initial – Slider und Lichter synchron starten
  const DEFAULT_INTENSITY = 0.85;
  setLightingFromSlider(DEFAULT_INTENSITY);
  setBrightnessFromSlider(brightnessSlider.value);

  console.log('✅ Room-UI initialisiert');
}
