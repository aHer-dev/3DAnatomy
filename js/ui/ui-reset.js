// js/ui/ui-reset.js
// Setzt die App in den Startzustand zurück, ohne die App komplett neu zu booten.
// Kernpunkte: Pick-Pool leeren, alle geladenen Modelle entladen/disposen,
// Bones + Teeth sauber neu laden, Sichtbarkeit & Farben syncen, Info-Panel schließen,
// Kamera auf Inhalt fitten.

import * as THREE from 'three';
import { state } from '../store/stateManager.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { renderer } from '../core/renderer.js';
import { unloadWholeGroup, loadGroup as loadGroupByName } from '../features/groups.js';
import { setGroupVisibility } from '../features/groups.js';
import { resetGroupColor, updateModelColors } from '../modelLoader/color.js';
import { hideInfoPanel } from '../interaction/infoPanel.js';
import { clearHighlight } from '../interaction/raycastOnClick.js';
import { fitCameraToScene } from '../core/cameraUtils.js';

export async function resetApp() {
  console.log('🔄 Reset gestartet...');

  // 0) UI & Auswahl: Info-Panel & Highlight schließen/entfernen
  try { hideInfoPanel?.(); } catch { }
  try { clearHighlight?.(); } catch { }
  state.selected = null;

  // 1) Kamera/Controls zurücksetzen (dein init hat saveState/Defaults gesetzt)
  if (typeof controls?.reset === 'function') {
    controls.reset();                 // OrbitControls-Reset
  } else {
    // Fallback: falls du eine eigene Default-Funktion hast
    // setCameraToDefault(camera, controls);
  }

  // 2) ALLE aktuell geladenen Gruppen hart entladen (Pickables abmelden + dispose)
  const loadedGroups = Object.keys(state.groups || {});
  for (const g of loadedGroups) {
    try { unloadWholeGroup(g); } catch (e) { console.warn(`unloadWholeGroup(${g})`, e); }
  }

  // 3) State-Container sauber leeren
  state.groups = Object.create(null);   // groupName -> [roots]
  state.groupVisible = Object.create(null);   // groupName -> bool
  state.groupStates = Object.create(null);   // gespeicherte Sichtbarkeiten
  state.pickableMeshes?.clear?.();            // 🔑 zentraler Pick-Pool leeren
  state.selected = null;

  // 4) Start-Sicht: bones + teeth neu laden (registriert intern Pickables)
  const startGroups = ['bones', 'teeth'];
  for (const group of startGroups) {
    try {
      await loadGroupByName(group, null, false);  // false: Kamera noch nicht fitten
      setGroupVisibility(group, true);            // Sichtbar & klickbar (setzt Pickables!)
      resetGroupColor?.(group);                   // optional: für jede Gruppe Startfarbe zurück
    } catch (err) {
      console.error(`❌ Fehler beim Laden von "${group}":`, err);
    }
  }

  // 5) Farben ALLER Gruppen auf Defaults syncen (State + 3D + UI)
  const defaultColorFallback = state.defaultSettings.defaultColor ?? 0xcccccc;
  Object.keys(state.defaultSettings.colors || {}).forEach(group => {
    const defaultColor = state.defaultSettings.colors[group] ?? defaultColorFallback;

    // UI/State
    state.colors[group] = defaultColor;

    // 3D (Material an bereits geladenen Modellen)
    try { updateModelColors(group, defaultColor); } catch { }

    // UI Color-Picker syncen (falls vorhanden)
    const input = document.getElementById(`${group}-color`);
    if (input) input.value = '#' + defaultColor.toString(16).padStart(6, '0');
  });

  // 6) Raum-Defaults (Hintergrund & Licht) robust setzen
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

  // 7) Kamera auf aktuellen Inhalt fitten & einmal rendern
  try {
    await fitCameraToScene(camera, controls, renderer, scene);
  } catch (e) {
    console.warn('fitCameraToScene fehlgeschlagen (fallback: render-only)', e);
  }
  renderer.render(scene, camera);

  console.log('✅ Reset abgeschlossen');
}

// ✅ FEHLENDER EXPORT: setupResetUI Funktion hinzufügen
export function setupResetUI(managers) {
  const resetButton = document.getElementById('btn-reset');
  if (!resetButton) {
    console.warn('⚠️ Reset-Button nicht gefunden');
    return;
  }

  resetButton.addEventListener('click', async () => {
    try {
      resetButton.disabled = true;
      resetButton.textContent = 'Wird zurückgesetzt...';

      // Verwende die App-Instanz für Reset, falls verfügbar
      if (managers?.app && typeof managers.app.reset === 'function') {
        await managers.app.reset();
      } else {
        // Fallback zur direkten resetApp Funktion
        await resetApp();
      }

      resetButton.textContent = 'App zurücksetzen';
    } catch (error) {
      console.error('❌ Reset fehlgeschlagen:', error);
      resetButton.textContent = 'Reset fehlgeschlagen';
    } finally {
      resetButton.disabled = false;
      // Nach 2 Sekunden Text zurücksetzen
      setTimeout(() => {
        resetButton.textContent = 'App zurücksetzen';
      }, 2000);
    }
  });

  console.log('🔄 Reset-UI initialisiert');
}