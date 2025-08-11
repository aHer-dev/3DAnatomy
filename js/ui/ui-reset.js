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
// (Kein visibility.js hier, um Race-Conditions mit Lazy-Imports zu vermeiden) :contentReference[oaicite:3]{index=3}

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
  const btn = document.getElementById('btn-reset');
  if (!btn) { console.warn('Reset-Button (#btn-reset) nicht gefunden'); return; }
  if (_bound) return;
  _bound = true;
  btn.addEventListener('click', () => resetApp().catch(console.error));
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
  console.log('🔄 Reset (hard) gestartet…');

  // 0) Set-/Selection-Zustände neutralisieren
  state.selected = { root: null, mesh: null, point: null, meta: null };
  state.currentlySelected = null;
  if (Array.isArray(state.collection)) state.collection.length = 0;
  if (state.modes) state.modes.collection = false;

  // 1) Controls/Kamera zurück
  if (typeof controls?.reset === 'function') controls.reset();

  // 2) Alle gemanagten Modelle raus
  purgeAllManagedModels();

  // 3) Basisgruppen frisch laden
  await loadGroupByName('bones', { centerCamera: false });
  state.groupStates.bones = true;
  await loadGroupByName('teeth', { centerCamera: false });
  state.groupStates.teeth = true;

  // 3b) Warten bis state.groups gefüllt ist (wichtig fürs Rebind)
  await waitForGroupsPopulated(['bones', 'teeth'], 1500);

  // 3c) Sammlung neu an die geladenen Modelle binden
  rebindCollectionAfterReload();

  // 4) alle anderen Gruppen-Flags auf false lassen (Sammlung bleibt erhalten)
  Object.keys(state.groupStates || {}).forEach(g => {
    if (g !== 'bones' && g !== 'teeth') state.groupStates[g] = false;
  });

  // 5) Farben auf Defaults (optional, wie gehabt)
  const defaults = state?.defaultSettings?.colors || {};
  const fallback = state?.defaultSettings?.defaultColor ?? 0xcccccc;
  Object.keys(defaults).forEach(groupName => {
    const hex = defaults[groupName] ?? fallback;
    state.colors[groupName] = hex;
    updateModelColors(groupName, hex);
    const input = document.getElementById(`${groupName}-color`);
    if (input) input.value = '#' + hex.toString(16).padStart(6, '0');
  });

  // 6) Hintergrund zurück (keine neuen Lichter bauen)
  const bgColor = state?.defaultSettings?.background ?? 0x111111;
  scene.background = new THREE.Color(bgColor);

  const bgInput = document.getElementById('color-room');
  if (bgInput) bgInput.value = '#' + Number(bgColor).toString(16).padStart(6, '0');

  // 7) Kamera fitten & Clipping auf gesamten Inhalt
  await fitCameraToScene(camera, controls, renderer, scene);
  scene.updateMatrixWorld(true);
  retuneCameraClipping(camera, scene);

  // 8) UI
  hideInfoPanel?.();
  renderer.render(scene, camera);

  console.log('✅ Reset abgeschlossen');
}
