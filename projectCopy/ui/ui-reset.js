// js/ui/ui-reset.js
// 🔁 Stellt den Ursprungszustand der gesamten Webanwendung wieder her (Kamera, Farben, Sichtbarkeit, UI-Slider, Transparenz etc.)
import * as THREE from 'three';
import { state } from '../store/state.js';
import { hideAllManagedModels, setModelVisibility, } from '../modelLoader/visibility.js';
import { loadGroup } from '../modelLoader/groups.js';
import { resetGroupColor } from '../modelLoader/color.js';
import { hideInfoPanel } from '../interaction/infoPanel.js';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { setCameraToDefault, fitCameraToScene } from '../core/cameraUtils.js';
import { updateModelColors } from '../modelLoader/color.js';
import { updateGroupVisibility } from '../modelLoader/groups.js';


/**
 * Initialisiert den Reset-Button und definiert, wie der Zustand der App vollständig zurückgesetzt wird.
 */
export function setupResetUI() {
  const resetBtn = document.getElementById('btn-reset');
  if (!resetBtn) {
    console.warn('⚠️ Reset-Button (#btn-reset) nicht gefunden');
    return;
  }
  // Genau EIN Click-Handler:
  resetBtn.addEventListener('click', () => resetApp().catch(console.error));
}

export async function resetApp() {
  console.log('🔄 Reset gestartet...');

  // 1) Kamera/Controls zurück – saveState() bitte beim Init einmalig aufrufen
  if (typeof controls?.reset === 'function') {
    controls.reset();
  } else {
    setCameraToDefault(camera, controls);
  }


  // 3) Start-Sicht (Standard): bones + teeth laden und sichtbar schalten
  const startGroups = ['bones', 'teeth']; // bei Bedarf anpassen
  for (const group of startGroups) {
    try {
      await loadGroup(group, null, false); // false: Kamera noch nicht fitten
      (state.groups[group] || []).forEach(model => {
        model.visible = true;
        model.layers.enable(0);
      });
      resetGroupColor(group);
    } catch (err) {
      console.error(`❌ Fehler beim Laden von "${group}":`, err);
    }
  }

  // 4) Farben ALLER Gruppen auf ihre Defaults syncen (State + 3D + UI)
  Object.keys(state.defaultSettings.colors).forEach(group => {
    const defaultColor =
      state.defaultSettings.colors[group] ?? state.defaultSettings.defaultColor ?? 0xcccccc;

    state.colors[group] = defaultColor;      // UI/State
    updateModelColors(group, defaultColor);  // 3D-Material

    const input = document.getElementById(`${group}-color`);
    if (input) input.value = '#' + defaultColor.toString(16).padStart(6, '0');
  });

  // 5) Raum-Defaults (Hintergrund & Licht) robust setzen
  const bgColor = state.defaultSettings.background;
  const lighting = state.defaultSettings.lighting ?? 1.0;

  scene.background = new THREE.Color(bgColor);

  if (!scene.userData.light) {
    const amb = new THREE.AmbientLight(0xffffff, lighting);
    scene.add(amb);
    scene.userData.light = amb;
  } else {
    scene.userData.light.intensity = lighting;
  }

  // UI-Inputs korrekt beschreiben
  const bgInput = document.getElementById('color-room');  
  if (bgInput) bgInput.value = '#' + Number(bgColor).toString(16).padStart(6, '0');

  const lightInput = document.getElementById('slider-room-brightness');
  if (lightInput) lightInput.value = String(lighting);

  // 6) Info-Panel schließen
  hideInfoPanel?.();

  // 7) Kamera auf Inhalt fitten & einmal rendern
  await fitCameraToScene(camera, controls, renderer, scene);
  renderer.render(scene, camera);

  console.log('✅ Reset abgeschlossen');
}
