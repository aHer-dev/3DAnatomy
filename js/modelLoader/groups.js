// modelLoader-groups.js

import { getMeta } from '../utils.js';
import { loadModels } from './core.js';
import { removeModelsByGroupOrSubgroup } from './cleanup.js'; // Wichtig für unloadGroup()
import { state } from '../state.js';
import { scene, loader } from '../init.js';

/**
 * 📦 Lädt eine gesamte Gruppe (z. B. "muscles") mit optionaler Subgruppe.
 *
 * @param {string} groupName - z. B. "muscles"
 * @param {string|null} subgroup - z. B. "arm-schulter" oder null für alles
 * @param {boolean} centerCamera - Kamera auf erstes Modell zentrieren
 */
export async function loadGroup(groupName, subgroup = null, centerCamera = false) {
  const meta = await getMeta();

  const filteredEntries = meta.filter(entry =>
    entry.group === groupName &&
    (subgroup === null || entry.subgroup === subgroup)
  );

  if (!state.groups[groupName]) {
    state.groups[groupName] = [];
    state.groupStates[groupName] = {};
  }

  await loadModels(filteredEntries, groupName, centerCamera, scene, loader);
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
    model.visible = isVisible;
  });

  console.log(`♻️ Sichtbarkeit von Gruppe "${groupName}" wiederhergestellt.`);
}
