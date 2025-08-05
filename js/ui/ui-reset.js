// js/ui/ui-reset.js

import { state } from '../state.js';
import { setCameraToDefault } from '../cameraUtils.js';
import { scene, camera, controls } from '../init.js';
import { updateModelColors, updateGroupVisibility } from '../modelLoader/index.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js';

export function setupResetUI() {
  const resetBtn = document.getElementById('reset-button');
  if (!resetBtn) {
    console.warn('⚠️ Kein Reset-Button mit ID "reset-button" gefunden.');
    return;
  }

  resetBtn.addEventListener('click', () => {
    console.log('🔁 Starte Reset-Vorgang...');

    // 1️⃣ Kamera zurücksetzen
    setCameraToDefault(camera, controls);

    // 2️⃣ Farben je Gruppe zurücksetzen und aktualisieren
    state.availableGroups.forEach(group => {
      const defaultColor = state.defaultSettings.colors[group];
      if (defaultColor !== undefined) {
        state.colors[group] = defaultColor;
        updateModelColors(group);
      }

      // Optional: Farbpicker-UI zurücksetzen
      const colorInput = document.getElementById(`${group}-color`);
      if (colorInput) {
        colorInput.value = '#' + defaultColor.toString(16).padStart(6, '0');
      }
    });

    // 3️⃣ Sichtbarkeit aller Modelle aktivieren
    state.availableGroups.forEach(group => {
      Object.keys(state.groupStates[group] || {}).forEach(modelName => {
        state.groupStates[group][modelName] = true;
      });
      updateGroupVisibility(group);
    });

    // 4️⃣ Raum: Hintergrundfarbe & Lichtstärke zurücksetzen
    const bgColor = state.defaultSettings.background;
    const lighting = state.defaultSettings.lighting;

    state.background = bgColor;
    state.lighting = lighting;

    scene.background = new THREE.Color(bgColor);
    if (scene.userData.light) {
      scene.userData.light.intensity = lighting;
    }

    // Optional: Raum-Slider zurücksetzen (UI sync)
    const bgInput = document.getElementById('room-color');
    if (bgInput) bgInput.value = bgColor;

    const lightInput = document.getElementById('room-brightness');
    if (lightInput) lightInput.value = lighting;

    // 5️⃣ Transparenz zurücksetzen (nur im state gespeichert)
    state.transparency = state.defaultSettings.transparency;

    // 6️⃣ Info-Panel schließen
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) infoPanel.classList.remove('visible');

    console.log('✅ App-Zustand erfolgreich zurückgesetzt.');
  });
}
