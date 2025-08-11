// js/ui/ui-reset.js
// Aufgabe:
// 1) setupResetUI(): Bindet den Button #btn-reset so, dass die Kamera auf die
//    in der Config definierten Defaults zurückgesetzt wird.
// 2) resetApp(): Führt einen "vollen" Reset durch: Szene leeren, Basisgruppen
//    neu laden, Sammlung wiederherstellen, Gruppenfarben auf Defaults setzen.

import { state } from '../store/state.js';
import { hideInfoPanel } from '../interaction/infoPanel.js';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { updateModelColors } from '../modelLoader/color.js';
import { loadGroupByName } from '../features/modelLoader-core.js';
import { setCameraToDefault } from '../core/cameraUtils.js';
import { getConfig } from '../config/config.js';
import { setModelVisibility } from '../features/visibility.js';
import { registerPickables } from '../features/selection.js';



// ---------------------------------------------------------------
// 1) LEICHTER RESET: Kamera auf Config-Defaults (Button #btn-reset)
// ---------------------------------------------------------------
export function setupResetUI() {
  const btn = document.getElementById('btn-reset');
  if (!btn) {
    console.warn('Reset-Button (#btn-reset) nicht gefunden – setupResetUI übersprungen.');
    return;
  }

  btn.addEventListener('click', () => {
    // A) Sichtbarkeit/ Pickables vollständig zurücksetzen
    showAllManagedModelsAndClearOverrides();

    // B) Kamera auf Config-Defaults
    setCameraToDefault(camera, controls);
    if (typeof controls?.saveState === 'function') controls.saveState();

    // C) Einmal rendern
    renderer.render(scene, camera);

    console.log('✅ Reset: alle Modelle sichtbar & pickable, Kamera auf Defaults.');
  }, { passive: true });
}
// ← WICHTIG: Funktion sauber schließen

function setGroupVisible(groupName, visible = true) {
  const roots = state.groups?.[groupName] || [];
  for (const root of roots) {
    root.visible = visible;
    root.traverse(o => {
      // Sichtbarkeit für gängige Drawables durchreichen
      if (o.isMesh || o.isLine || o.isPoints) o.visible = visible;
    });
  }
}

// ---------------------------------------------------------------
// 2) VOLLER RESET: Szene/Gruppen neu aufsetzen, Sammlung erhalten
// ---------------------------------------------------------------
export async function resetApp() {
  console.log('🔄 Reset gestartet (Sammlung bleibt erhalten)...');

  // 1) Sammlung sichern
  const savedCollectionData = (state.collection || []).map(item => ({
    id: item.id || item.model?.userData?.meta?.id || item.model?.name,
    name: item.name,
    meta: item.meta,
    groupName: item.model?.userData?.group || 'bones'
  }));

  // 2) Info-Panel schließen
  hideInfoPanel?.();

  // 3) Auswahl zurücksetzen
  state.selected = { root: null, mesh: null, point: null, meta: null };
  state.currentlySelected = null;

  // 4) Alle Modell-Wurzeln entfernen
  const toRemove = [];
  scene.traverse(child => {
    if (child.userData?.isModelRoot) toRemove.push(child);
  });
  toRemove.forEach(obj => scene.remove(obj));

  // 5) Gruppenstate leeren
  Object.keys(state.groups || {}).forEach(g => { state.groups[g] = []; });
  state.pickableMeshes?.clear?.();

  // 6) Basis-Gruppen neu laden (ohne Kamera-Zentrierung)
  try {
    await loadGroupByName('bones', { centerCamera: false });
    state.groupStates.bones = true;

    await loadGroupByName('teeth', { centerCamera: false });
    state.groupStates.teeth = true;
  } catch (err) {
    console.error('❌ Fehler beim Laden der Basis-Gruppen:', err);
  }

  // 6a) WICHTIG: bones + teeth sicher sichtbar schalten (vollständiges Skelett/ Gebiss)
  setGroupVisible('bones', true);
  setGroupVisible('teeth', true);

  // 7) Sammlung wiederherstellen (sichtbar lassen, aber NICHT den Rest verstecken)
  await restoreCollection(savedCollectionData);

  // 8) Gruppenfarben auf Defaults zurücksetzen und anwenden
  const defaults = state?.defaultSettings?.colors || {};
  Object.keys(defaults).forEach(groupName => {
    const hex = defaults[groupName] ?? 0xcccccc;
    state.colors[groupName] = hex;
    updateModelColors(groupName, hex);
    const input = document.getElementById(`${groupName}-color`);
    if (input) input.value = '#' + hex.toString(16).padStart(6, '0');
  });

  // 9) Rendern
  renderer.render(scene, camera);

  console.log('✅ Reset abgeschlossen: bones + teeth sichtbar, Sammlung erhalten, Kamera/Hintergrund unverändert');
}

// ---------------------------------------------------------------
// Hilfsfunktion: gespeicherte Sammlung wieder auf geladene Modelle mappen
// ---------------------------------------------------------------
async function restoreCollection(savedData) {
  state.collection = [];

  for (const item of savedData) {
    let foundModel = null;

    // In bereits geladenen Gruppen nach passendem Modell suchen
    for (const group of Object.values(state.groups)) {
      for (const model of group) {
        const modelId = model.userData?.meta?.id || model.name;
        if (modelId === item.id) { foundModel = model; break; }
      }
      if (foundModel) break;
    }

    if (foundModel) {
      state.collection.push({
        model: foundModel,
        id: item.id,
        name: item.name,
        meta: item.meta || foundModel.userData?.meta,
        visible: true
      });
    }
  }

  console.log(`📦 Sammlung wiederhergestellt: ${state.collection.length} Objekte`);
}




function showAllManagedModelsAndClearOverrides() {
  // 1) Alle geladenen Modelle (über state.groups) sichtbar & pickable machen
  Object.values(state.groups || {}).forEach(models => {
    (models || []).forEach(root => {
      // sichtbar schalten (rekursiv inkl. Meshes)
      setModelVisibility(root, true);
      // sicherstellen, dass Raycaster wieder trifft
      registerPickables(root);
    });
  });

  // 2) Per-Model-Overrides löschen: für jede Gruppe "alles sichtbar"
  state.groupStates = state.groupStates || {};
  Object.keys(state.groups || {}).forEach(g => {
    // boolean = ganze Gruppe sichtbar; löscht implizit einzelne Off-Flags
    state.groupStates[g] = true;
  });

  // 3) Falls "Sammlungsmodus" aktiv war → verlassen
  if (state.modes && state.modes.collection) {
    state.modes.collection = false;
  }
}

