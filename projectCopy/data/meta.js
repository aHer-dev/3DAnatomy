// js/utils/meta.js
import { basePath } from './path.js';
import { state } from '../store/state.js';

let cachedMeta = null;

// Lädt meta.json nur einmal
export async function getMeta() {
    if (!cachedMeta) {
        try {
            const url = `${basePath}/data/meta.json`.replace(/\/+/g, '/');
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Fehler beim Laden von meta.json: ${res.status}`);
            cachedMeta = await res.json();
            console.log(`✅ meta.json geladen – ${cachedMeta.length} Einträge`);
        } catch (err) {
            console.error("❌ Fehler beim Laden der Metadaten:", err);
            cachedMeta = [];
        }
    }
    return cachedMeta;
}

// Erstellt alle Gruppen im state + Standardfarben
export async function initializeGroupsFromMeta() {
    const meta = await getMeta();

    state.groupedMeta = meta.reduce((map, entry) => {
        const group = entry.classification?.group || 'other';
        map[group] = map[group] || [];
        map[group].push(entry);
        return map;
    }, {});

    state.availableGroups = Object.keys(state.groupedMeta);

    // Jede Gruppe im State initialisieren
    state.availableGroups.forEach(group => {
        state.groups[group] = [];
        state.groupStates[group] = {};
        state.colors[group] = state.defaultSettings.colors[group] ?? state.defaultSettings.defaultColor;
    });

    console.log('✅ Gruppen initialisiert:', state.availableGroups);
}
