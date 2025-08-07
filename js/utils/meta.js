// utils/meta.js – Hilfsfunktionen für Metadaten und Gruppeninitialisierung
import { basePath } from './path.js';
import { state } from '../state.js';

let cachedMeta = null;

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
