// utils.js – Hilfsfunktionen für Pfade, Metadaten und Gruppenaufbau
import * as THREE from 'three';
import { state } from './state.js';

//
// 📁 Pfadlogik: Automatischer Basis-Pfad je nach Umgebung
//
const isGitHub = window.location.hostname.includes("github.io");
export const basePath = isGitHub ? "/3DAnatomy" : "";

//
// 🔗 getModelPath(filename, group)
// → Liefert robusten Pfad zum Modell: /models/<group>/<filename>
//
export function getModelPath(filename, group) {
  const path = `${basePath}/models/${group}/${filename}`.replace(/\/+/g, '/');
  return path.startsWith('/') ? path : `/${path}`;
}

//
// 📄 Metadaten-Caching
//
let cachedMeta = null;

//
// 🔍 getMeta()
// → Lädt meta.json nur einmal (lazy loading)
// → Gibt Einträge als Array zurück
//
export async function getMeta() {
  if (!cachedMeta) {
    try {
      const url = `${basePath}/data/meta.json`.replace(/\/+/g, '/');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fehler beim Laden von meta.json: ${response.status}`);
      cachedMeta = await response.json();
      console.log("✅ meta.json geladen – Einträge:", cachedMeta.length);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Metadaten:', error);
      cachedMeta = [];
    }
  } else {
    console.log('🔍 Nutze gecachte meta.json:', cachedMeta.length, 'Einträge');
  }
  return cachedMeta;
}

// Schutz vor Überschreiben
export function resetMetaCache() {
  console.warn('⚠️ Meta-Cache zurückgesetzt');
  cachedMeta = null;
}

//
// 🧠 initializeGroupsFromMeta()
// → Liest alle eindeutigen Gruppen aus meta.json
// → Initialisiert dynamisch:
//    - state.groups
//    - state.groupStates
//    - state.subgroupStates
//    - state.clickCounts
//    - state.colors (und defaultSettings.colors)
//
// In utils.js
export async function initializeGroupsFromMeta() {
  const meta = await getMeta();
  state.groupedMeta = meta.reduce((map, entry) => {
    const group = entry.classification?.group || 'other';
    map[group] = map[group] || [];
    map[group].push(entry);
    return map;
  }, {});
  state.availableGroups = Object.keys(state.groupedMeta);
  console.log('✅ initializeGroupsFromMeta: Gruppen initialisiert:', state.availableGroups);
}

/**
 * Normalisiert Maus- oder Touch-Koordinaten für Raycasting
 * @param {MouseEvent | TouchEvent} event
 * @returns {THREE.Vector2} – normierte Koordinaten für Raycaster
 */
export function getNormalizedMouse(event) {
  const mouse = new THREE.Vector2();

  if (event.touches && event.touches.length > 0) {
    const touch = event.touches[0];
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
  } else {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  return mouse;
}
