// utils.js – Hilfsfunktionen für Pfade, Metadaten und Gruppenaufbau

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
      console.error("❌ Fehler beim Laden der Metadaten:", error);
      alert("Fehler beim Laden der Metadaten. Bitte Dateistruktur prüfen.");
      return [];
    }
  }
  return cachedMeta;
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

