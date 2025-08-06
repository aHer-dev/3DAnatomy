// js/ui/ui-reset.js
// 🔁 Stellt den Ursprungszustand der gesamten Webanwendung wieder her (Kamera, Farben, Sichtbarkeit, UI-Slider, Transparenz etc.)

import { state } from '../state.js'; // 🔁 Globale Zustandsverwaltung
import { setCameraToDefault } from '../cameraUtils.js'; // 📷 Funktion zum Zurücksetzen der Kamera
import { scene, camera, controls } from '../init.js'; // 🌐 Zentrale 3D-Komponenten
import { updateModelColors, updateGroupVisibility } from '../modelLoader/index.js'; // 🎨 Sichtbarkeit & Farbe updaten
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js'; // THREE.js für Farbe

/**
 * Initialisiert den Reset-Button und definiert, wie der Zustand der App vollständig zurückgesetzt wird.
 */
export function setupResetUI() {
  const resetBtn = document.getElementById('reset-button');

  // ❌ Abbruch bei fehlendem Reset-Button
  if (!resetBtn) {
    console.warn('⚠️ Kein Reset-Button mit ID "reset-button" gefunden.');
    return;
  }

  // 📌 Klick-Event für den Reset
  resetBtn.addEventListener('click', () => {
    console.log('🔁 Starte Reset-Vorgang...');

    // 1️⃣ Kamera zurück auf Startposition setzen
    setCameraToDefault(camera, controls);

    // 2️⃣ Farben aller Gruppen auf Standard zurücksetzen und neu anwenden
    state.availableGroups.forEach(group => {
      const defaultColor = state.defaultSettings.colors[group];
      if (defaultColor !== undefined) {
        state.colors[group] = defaultColor;        // 🧠 Zustand updaten
        updateModelColors(group);                  // 🎨 Farben anwenden

        // Optional: Farb-Picker in der UI synchronisieren
        const colorInput = document.getElementById(`${group}-color`);
        if (colorInput) {
          colorInput.value = '#' + defaultColor.toString(16).padStart(6, '0');
        }
      }
    });

    // 3️⃣ Sichtbarkeit aller Modelle aktivieren (alle Modelle einblenden)
    state.availableGroups.forEach(group => {
      Object.keys(state.groupStates[group] || {}).forEach(modelName => {
        state.groupStates[group][modelName] = true;
      });
      updateGroupVisibility(group); // Sichtbarkeit im View aktualisieren
    });

    // 4️⃣ Raum-Umgebung: Hintergrundfarbe & Lichtintensität zurücksetzen
    const bgColor = state.defaultSettings.background;
    const lighting = state.defaultSettings.lighting;

    state.background = bgColor;
    state.lighting = lighting;

    scene.background = new THREE.Color(bgColor); // Hintergrund aktualisieren
    if (scene.userData.light) {
      scene.userData.light.intensity = lighting; // Lichtstärke anpassen
    }

    // UI-Slider für Hintergrund und Helligkeit zurücksetzen
    const bgInput = document.getElementById('room-color');
    if (bgInput) bgInput.value = bgColor;

    const lightInput = document.getElementById('room-brightness');
    if (lightInput) lightInput.value = lighting;

    // 5️⃣ Transparenz auf Standardwert zurücksetzen
    state.transparency = state.defaultSettings.transparency;

    // 6️⃣ Info-Panel schließen (falls offen)
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) infoPanel.classList.remove('visible');

    // ✅ Abschlussmeldung
    console.log('✅ App-Zustand erfolgreich zurückgesetzt.');
  });
}
