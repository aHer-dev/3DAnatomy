//group.js
// 📦 Laden und Verwalten von Gruppen in der 3D-Anatomie-An

import { scene } from '../core/scene.js';
import { getMeta } from '../data/meta.js';
import { state } from '../store/state.js';
import { setModelVisibility, setGroupVisibility } from '../features/visibility.js';
import { loadEntry, disposeObject3D } from '../modelLoader/index.js';
import { registerPickables, unregisterPickables } from './selection.js';


// Public: Laden per Gruppenname/Subgruppe
export async function loadGroup(groupName, subgroup = null, centerCamera = false) {
  const meta = await getMeta();
  const entries = meta.filter(entry => {
    const g = entry?.classification?.group ?? entry?.group;
    const sg = entry?.classification?.subgroup ?? entry?.subgroup ?? null;
    if (g !== groupName) return false;
    if (subgroup && sg !== subgroup) return false;
    return true;
  });

  await loadGroupFromEntries(entries, groupName);

  // Optional Kamera-Fit hier (auskommentiert lassen, bis gebraucht)
  // if (centerCamera && state.groups[groupName]?.[0]) { ... }
}

// Intern: aus Einträgen laden
export async function loadGroupFromEntries(entries, groupName) {
  if (!entries?.length) return;
  for (const entry of entries) {
    const root = await loadEntry(entry);
    root.userData.isModelRoot = true;
    root.userData.entry = entry;
    scene.add(root);
    (state.groups[groupName] ||= []).push(root);
    registerPickables(root);
  }
  state.groupVisible[groupName] = true;
}


// Utilities
export function isGroupLoaded(groupName) {
  return !!(state.groups[groupName]?.length > 0);
}

export function getLoadedGroups() {
  return Object.keys(state.groups).filter(g => state.groups[g]?.length > 0);
}


// Intern: komplette Gruppe hart entladen
export function unloadWholeGroup(groupName) {
  const arr = state.groups[groupName] || [];
  for (const root of arr) {
    unregisterPickables(root);
    scene.remove(root);
    disposeObject3D(root);
  }
  state.groups[groupName] = [];
  state.groupVisible[groupName] = false;
}

// Gruppen-Zustand restaurieren (sichtbar/unsichtbar je Modell)
export function restoreGroupState(groupName) {
  if (!groupName || !(groupName in state.groups)) return;
  const models = state.groups[groupName];
  const saved = state.groupStates?.[groupName];

  if (!models) return;

  if (typeof saved === 'boolean') {
    setGroupVisibility(groupName, saved);
    return;
  }

  if (saved && typeof saved === 'object') {
    models.forEach(model => {
      const isVisible = saved[model.name] !== false;
      setModelVisibility(model, isVisible);
    });
    return;
  }

  setGroupVisibility(groupName, true);
}

export function restoreAllGroupStates() {
  const loaded = Object.keys(state.groups || {});
  for (const g of loaded) {
    try { restoreGroupState(g); }
    catch (e) { console.warn(`restoreAllGroupStates: Fehler bei "${g}":`, e); }
  }
}

export function updateGroupVisibility(groupName, visible) {
  setGroupVisibility(groupName, visible);
}

// Public: Entladen per Gruppenname/Subgruppe (nutzt dein Cleanup)
export async function unloadGroup(groupName, subgroup = null) {
  await removeModelsByGroupOrSubgroup(groupName, subgroup);
  if (!subgroup) {
    state.groups[groupName] = [];
    state.groupVisible[groupName] = false;
  }
}