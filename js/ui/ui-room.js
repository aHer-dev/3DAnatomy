/**
 * @file ui-room.js
 * @description Initialisiert UI-Elemente für Raum-Einstellungen (Beleuchtung, Farbe, Helligkeit).
 */
import * as THREE from 'three';
import { scene } from '../core/scene.js';
import { getLightRig } from '../lights.js';

export function setupRoomUI() {
  const lightingSlider = document.getElementById('slider-lighting');
  const colorInput = document.getElementById('color-room');
  const brightnessSlider = document.getElementById('slider-room-brightness');

  if (!lightingSlider || !colorInput || !brightnessSlider) {
    console.warn('ui-room: Farb-/Helligkeitselemente fehlen.');
    return;
  }


  const rig = getLightRig();
  if (!rig) {
    console.warn('ui-room: Licht-Rig noch nicht initialisiert.');
    return;
  }

  /**
   * 🔄 Aktualisiert die Hintergrundfarbe der Szene.
   * Kombiniert die gewählte Farbe mit der eingestellten Helligkeit via HSL-Korrektur.
   */
  function updateRoomColor() {
    const baseColor = new THREE.Color(colorInput.value);
    const brightness = parseFloat(brightnessSlider.value);
    const hsl = baseColor.getHSL({ h: 0, s: 0, l: 0 });
    hsl.l = Math.max(0, Math.min(1, hsl.l + (brightness - 0.5)));
    baseColor.setHSL(hsl.h, hsl.s, hsl.l);
    scene.background = baseColor;
  }

  // 📌 Event-Listener
  colorInput.addEventListener('input', updateRoomColor);
  brightnessSlider.addEventListener('input', updateRoomColor);

  lightingSlider.addEventListener('input', (e) => {
    const intensity = parseFloat(e.target.value);
    rig.key.intensity = intensity;         // Hauptlicht
    rig.rim.intensity = intensity * 0.6;   // Kantenlicht
    rig.fill.intensity = intensity * 0.7;   // „Ambient“-Gefühl (Hemisphere)
  });

  updateRoomColor();
  console.log('ui-room initialisiert.');
}