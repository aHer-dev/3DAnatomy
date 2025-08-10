// js/ui/ui-reset.js
// Setzt die App in den Startzustand zurück, ohne die App komplett neu zu booten.
// Kernpunkte: Pick-Pool leeren, alle geladenen Modelle entladen/disposen,
// Bones + Teeth sauber neu laden, Sichtbarkeit & Farben syncen, Info-Panel schließen,
// Kamera auf Inhalt fitten.

import * as THREE from 'three'                 // konsistent zu deinem Projekt
import { state } from '../store/stateManager.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { renderer } from '../core/renderer.js';

import { unloadWholeGroup, loadGroup as loadGroupByName } from '../features/groups.js';
import { setGroupVisibility } from '../features/visibilityManager.js';

import { resetGroupColor, updateModelColors } from '../modelLoader/color.js';   // Farben-API bei dir
import { hideInfoPanel } from '../interaction/infoPanel.js';                    // Info-Panel schließen
import { clearHighlight } from '../interaction/raycastOnClick.js';             // optionales Highlight entfernen
import { fitCameraToScene } from '../core/cameraUtils.js';                      // Kamera-Fit

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
