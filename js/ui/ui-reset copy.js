// js/ui/ui-reset.js
import * as THREE from 'three';
import { state } from '../store/state.js';
import { hideInfoPanel } from '../interaction/infoPanel.js';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { fitCameraToScene } from '../core/cameraUtils.js';
import { updateModelColors } from '../modelLoader/color.js';
import { retuneCameraClipping } from '../utils/cameraClipping.js';
import { loadGroupByName } from '../features/modelLoader-core.js'; // nutzen wir gleich
import { setCameraToDefault } from '../core/cameraUtils.js'; // Hilfsfunktion, liest ui.cameraDefaults
import { getConfig } from '../config/config.js';        // optional: Debug-Logging steuern




function purgeAllManagedModels() {
  // Alles entfernen, was in state.groups registriert ist
  const roots = [];
  Object.keys(state.groups || {}).forEach(g => {
    (state.groups[g] || []).forEach(r => roots.push(r));
  });
  for (const r of roots) {
    try { scene.remove(r); } catch { }
  }
  // State leeren
  Object.keys(state.groups || {}).forEach(g => state.groups[g] = []);
  state.pickableMeshes?.clear?.();
}


let _bound = false;

export function setupResetUI() {
  // 1) Reset-Button aus dem DOM holen
  const btn = document.getElementById('btn-reset');

  // 2) Falls der Button fehlt: leise abbrechen, aber Hinweis loggen
  if (!btn) {
    console.warn('Reset-Button (#btn-reset) nicht gefunden – setupResetUI übersprungen.');
    return;
  }

  // 3) Click-Handler setzen: auf Config-Defaults zurück (nicht nur savedState)
  btn.addEventListener(
    'click',
    () => {
      // a) Kamera auf die in config.ui.cameraDefaults definierten Werte setzen
      setCameraToDefault(camera, controls);

      // b) Diesen Zustand als neuen OrbitControls-Referenzpunkt speichern
      //    (damit ein späteres controls.reset() denselben Blick herstellt)
      if (typeof controls?.saveState === 'function') {
        controls.saveState();
      }

      // c) Optionales Debug-Logging nach Config-Schalter
      if (getConfig('ui.showDebugPanel', false)) {
        console.log('[Reset] Kamera auf Config-Defaults zurückgesetzt.');
      }
    },
    { passive: true } // keine aktive Verhinderung von Default-Browser-Events nötig
  );
}



const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitForGroupsPopulated(groupNames, timeoutMs = 1500) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeoutMs) {
    const ready = groupNames.every(g => (state.groups?.[g] || []).length > 0);
    if (ready) return true;
    await sleep(50);
  }
  return false; // not fatal – wir loggen nur
}

function findModelInLoadedById(id) {
  if (!id) return null;
  for (const arr of Object.values(state.groups || {})) {
    for (const model of arr || []) {
      const m = model?.userData?.meta;
      if (!m) continue;
      if (m.id === id || m.fma === id || m.name === id || model.name === id) return model;
    }
  }
  return null;
}

function rebindCollectionAfterReload() {
  let rebound = 0;
  (state.collection || []).forEach(item => {
    const id = item?.meta?.id || item?.meta?.fma || item?.meta?.name || item?.id;
    const newModel = findModelInLoadedById(id);
    if (newModel) { item.model = newModel; rebound++; }
    // else: bleibt in der Sammlung, wird nur (noch) nicht sichtbar – ok
  });
  console.log(`🔗 Collection re-bound: ${rebound} Elemente`);
}


export async function resetApp() {
  console.log('🔄 Reset gestartet (Sammlung bleibt erhalten)...');

  // 1) WICHTIG: Sammlung VORHER sichern
  const savedCollection = [...state.collection];
  const savedCollectionData = savedCollection.map(item => ({
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

  // 4) Alle Modelle aus Szene entfernen
  const toRemove = [];
  scene.traverse(child => {
    if (child.userData?.isModelRoot) {
      toRemove.push(child);
    }
  });
  toRemove.forEach(obj => scene.remove(obj));

  // 5) State-Gruppen leeren
  Object.keys(state.groups || {}).forEach(g => {
    state.groups[g] = [];
  });
  state.pickableMeshes?.clear?.();

  // 6) Basis-Gruppen neu laden
  try {
    await loadGroupByName('bones', { centerCamera: false });
    state.groupStates.bones = true;

    await loadGroupByName('teeth', { centerCamera: false });
    state.groupStates.teeth = true;
  } catch (err) {
    console.error('❌ Fehler beim Laden der Basis-Gruppen:', err);
  }

  // 7) WICHTIG: Sammlung wiederherstellen
  await restoreCollection(savedCollectionData);

  // 8) Farben zurücksetzen
  const defaults = state?.defaultSettings?.colors || {};
  Object.keys(defaults).forEach(groupName => {
    const hex = defaults[groupName] ?? 0xcccccc;
    state.colors[groupName] = hex;
    updateModelColors(groupName, hex);

    const input = document.getElementById(`${groupName}-color`);
    if (input) {
      input.value = '#' + hex.toString(16).padStart(6, '0');
    }
  });

  // 9) WICHTIG: Hintergrund NICHT ändern (behalten wie er ist)
  // Kommentiert aus:
  // const bgColor = state?.defaultSettings?.background ?? 0x111111;
  // scene.background = new THREE.Color(bgColor);

  // 10) WICHTIG: Kamera-Position NICHT ändern (behalten wie sie ist)
  // Kommentiert aus:
  // await fitCameraToScene(camera, controls, renderer, scene);

  // 11) Nur neu rendern
  renderer.render(scene, camera);

  console.log('✅ Reset abgeschlossen (Sammlung erhalten, Kamera/Hintergrund unverändert)');
}

// Hilfsfunktion: Sammlung wiederherstellen
async function restoreCollection(savedData) {
  state.collection = [];

  for (const item of savedData) {
    // Modell in geladenen Gruppen suchen
    let foundModel = null;

    for (const group of Object.values(state.groups)) {
      for (const model of group) {
        const modelId = model.userData?.meta?.id || model.name;
        if (modelId === item.id) {
          foundModel = model;
          break;
        }
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


