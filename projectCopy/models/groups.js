//group.js
// 📦 Laden und Verwalten von Gruppen in der 3D-Anatomie-An

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { dracoLoader } from './dracoLoader.js'; // Zentraler Draco-Loader
import { controls } from '../controls.js'; // <<< NEU: controls werden unten an loadModels übergeben
import { scene } from '../scene.js';
import { camera } from '../camera.js';
import { renderer } from '../renderer.js';
import { getMeta } from '../utils/index.js';
import { loadModels } from './modelLoader-core.js';
import { removeModelsByGroupOrSubgroup } from './cleanup.js';
import { state } from '../state.js';
import { setModelVisibility } from './visibility.js';


const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader); // Nutze zentralen Draco-Loader
/**
 * 📦 Lädt eine gesamte Gruppe (z. B. "muscles") mit optionaler Subgruppe.
 *
 * @param {string} groupName - z. B. "muscles"
 * @param {string|null} subgroup - z. B. "arm-schulter" oder null für alles
 * @param {boolean} centerCamera - Kamera auf erstes Modell zentrieren
 */
export async function loadGroup(groupName, subgroup = null, centerCamera = false) {
  const meta = await getMeta();

  // einmalig debuggen, welche Gruppen es wirklich gibt
  if (!meta._debugDumped) {
    const groupsInMeta = [...new Set(meta.map(e => e?.classification?.group ?? e?.group).filter(Boolean))];
    console.debug('[meta] vorhandene Gruppen:', groupsInMeta);
    meta._debugDumped = true;
  }

  // ✨ NEU: classification.* mit Fallback auf alte Felder
  const filteredEntries = meta.filter(entry => {
    const g = entry?.classification?.group ?? entry?.group;
    const sg = entry?.classification?.subgroup ?? entry?.subgroup ?? null;
    if (g !== groupName) return false;
    if (subgroup && sg !== subgroup) return false;
    return true;
  });

  await loadModels(filteredEntries, groupName, centerCamera, scene, loader, camera, controls, renderer);
}
/**
 * 🗑 Entfernt eine Gruppe oder Subgruppe aus der Szene.
 *
 * @param {string} groupName - z. B. "muscles"
 * @param {string|null} subgroup - z. B. "arm-schulter" oder null
 */
export async function unloadGroup(groupName, subgroup = null) {
  await removeModelsByGroupOrSubgroup(groupName, subgroup);
}
/**
 * 🔍 Prüft, ob eine Gruppe aktuell geladen ist.
 *
 * @param {string} groupName
 * @returns {boolean}
 */
export function isGroupLoaded(groupName) {
  return !!(state.groups[groupName]?.length > 0);
}
/**
 * 📋 Gibt zurück, welche Gruppen aktuell geladen sind.
 *
 * @returns {Array<string>}
 */
export function getLoadedGroups() {
  return Object.keys(state.groups).filter(group =>
    state.groups[group]?.length > 0
  );
}
/**
 * ♻️ Stellt die Sichtbarkeit der Modelle in einer Gruppe wieder her.
 *
 * @param {string} groupName
 */
export function restoreGroupState(groupName) {
  const models = state.groups[groupName];
  const visibilityMap = state.groupStates[groupName];

  if (!models || !visibilityMap) {
    console.warn(`⚠️ restoreGroupState: Gruppe "${groupName}" nicht im state vorhanden.`);
    return;
  }

  models.forEach(model => {
    const isVisible = visibilityMap[model.name] !== false; // Default: true
    setModelVisibility(model, isVisible);
  });

  console.log(`♻️ Sichtbarkeit von Gruppe "${groupName}" wiederhergestellt.`);
}

/**
 * Sichtbarkeit aller Modelle einer anatomischen Gruppe setzen
 * @param {string} group
 * @param {boolean} visible
 */
export function updateGroupVisibility(group, visible) {
  const models = state.groups[group] || [];
  models.forEach(model => setModelVisibility(model, visible));
}