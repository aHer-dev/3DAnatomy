//group.js
// 📦 Laden und Verwalten von Gruppen in der 3D-Anatomie-An

import * as THREE from 'three';
import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';
import { controls } from '../core/controls.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { getMeta } from '../data/meta.js';
import { loadModels } from './modelLoader-core.js';
import { removeModelsByGroupOrSubgroup } from '../modelLoader/cleanup.js';
import { state } from '../store/state.js';
import { setModelVisibility, setGroupVisibility } from '../features/visibility.js';


const loader = createGLTFLoader();


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

export function isGroupLoaded(groupName) {
  return !!(state.groups[groupName]?.length > 0);
}

export function getLoadedGroups() {
  return Object.keys(state.groups).filter(group =>
    state.groups[group]?.length > 0
  );
}

// EINZELNE restoreGroupState Funktion
export function restoreGroupState(groupName) {
  if (!groupName || typeof groupName !== 'string') return;
  if (!(groupName in state.groups)) return;

  const models = state.groups[groupName];
  const saved = state.groupStates[groupName];

  if (!models) return;

  // Boolean: gesamte Gruppe
  if (typeof saved === 'boolean') {
    setGroupVisibility(groupName, saved);
    return;
  }

  // Object: einzelne Modelle
  if (saved && typeof saved === 'object') {
    models.forEach(model => {
      const isVisible = saved[model.name] !== false;
      setModelVisibility(model, isVisible);
    });
    return;
  }

  // Default: alles sichtbar
  setGroupVisibility(groupName, true);
}

export function restoreAllGroupStates() {
  const loadedGroups = Object.keys(state.groups || {});
  if (!loadedGroups.length) return;

  for (const g of loadedGroups) {
    try {
      restoreGroupState(g);
    } catch (e) {
      console.warn(`restoreAllGroupStates: Fehler bei "${g}":`, e);
    }
  }
}

export function updateGroupVisibility(group, visible) {
  setGroupVisibility(group, visible);
}