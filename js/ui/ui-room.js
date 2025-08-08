/**
 * @file ui-room.js
 * @description Initialisiert UI-Elemente für Raum-Einstellungen (Beleuchtung, Farbe, Helligkeit).
 */
import * as THREE from 'three';
import { scene } from '../core/scene.js';
import { lightFront, lightBack, lightTop, ambientLight } from '../lights.js';

export function setupRoomUI() {
  const lightingSlider = document.getElementById('slider-lighting');
  const colorInput = document.getElementById('color-room');
  const brightnessSlider = document.getElementById('slider-room-brightness');

  if (!lightingSlider || !colorInput || !brightnessSlider) {
    console.warn('⚠️ ui-room: Farb-/Helligkeitselemente fehlen.');
    return;
  }

  /**
   * 🔄 Aktualisiert die Hintergrundfarbe der Szene.
   * Kombiniert die gewählte Farbe mit der eingestellten Helligkeit via HSL-Korrektur.
   */
  function updateRoomColor() {
    const baseColor = new THREE.Color(colorInput.value); // Fix: colorInput statt colorPicker
    const brightness = parseFloat(brightnessSlider.value);

    // 🎨 Umrechnen in HSL, Helligkeit anpassen
    const hsl = baseColor.getHSL({ h: 0, s: 0, l: 0 });
    hsl.l = Math.max(0, Math.min(1, hsl.l + (brightness - 0.5)));
    baseColor.setHSL(hsl.h, hsl.s, hsl.l);

    // 🌌 Szene-Hintergrundfarbe setzen
    scene.background = baseColor;
    console.log(`🎨 Raumfarbe geändert: ${baseColor.getHexString()}`);
  }

  // 📌 Event-Listener
  colorInput.addEventListener('input', updateRoomColor);
  brightnessSlider.addEventListener('input', updateRoomColor);

  lightingSlider.addEventListener('input', (e) => {
    const intensity = parseFloat(e.target.value);
    lightFront.intensity = intensity;
    lightBack.intensity = intensity * 0.75;
    lightTop.intensity = intensity * 0.5;
    ambientLight.intensity = intensity * 0.5;
    console.log(`💡 Beleuchtungsintensität geändert: ${intensity}`);
  });

  // 🟢 Erfolgsmeldung
  console.log('🌌 ui-room initialisiert.');
}