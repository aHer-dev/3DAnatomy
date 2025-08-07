//group.js
// 📦 Laden und Verwalten von Gruppen in der 3D-Anatomie-An

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { dracoLoader } from './dracoLoader.js'; // Zentraler Draco-Loader
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

  const filteredEntries = meta.filter(entry => {
    if (entry.group !== groupName) return false;
    if (subgroup && entry.subgroup !== subgroup) return false;
    return true;
  });

  if (!state.groups[groupName]) {
    state.groups[groupName] = [];
    state.groupStates[groupName] = {};
  }

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
