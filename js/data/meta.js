// js/date/meta.js
import { dataPath } from '../core/path.js';  // zentrale Pfadfunktion für /data
import { state } from '../store/state.js';

let cachedMeta = null;

// Lädt meta.json nur einmal
export async function getMeta() {
    if (!cachedMeta) {
        try {
            const url = dataPath('meta.json');           // robust, nutzt BASE nur an einer Stelle
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


    // 1) gruppieren
    state.groupedMeta = meta.reduce((acc, entry) => {
        const g = entry?.classification?.group || 'other';
        (acc[g] ||= []).push(entry);
        return acc;
    }, {});

    // 2) Liste aller Gruppen
    state.availableGroups = Object.keys(state.groupedMeta);


    // 3) Default-Keys sicher anlegen → keine "Gruppe ... nicht im state vorhanden"-Warnungen mehr
    for (const g of state.availableGroups) {
        state.groups[g] ||= []; // Array für geladene Object3D-Roots
        if (typeof state.groupStates[g] !== 'boolean') state.groupStates[g] = false;
        if (!(g in state.colors)) {
            state.colors[g] = state.defaultSettings.colors[g] ?? state.defaultSettings.defaultColor;
        }
    }

    console.log('✅ Gruppen initialisiert:', state.availableGroups);


    // 🔎 Indexe für schnellen Lookup beim Klick:
    state.metaById = Object.create(null);
    state.metaByFile = Object.create(null);

    // Hilfsfunktionen
    const basename = (s) => {
        try { return s.split('/').pop(); } catch { return s; }
    };
    const stripExt = (s) => s.replace(/\.[^/.]+$/, '');

    // Alle Einträge indexieren
    for (const entries of Object.values(state.groupedMeta)) {
        for (const entry of entries) {
            // id-Index
            const id = (entry?.id ?? entry?.fma ?? '').toString().trim();
            if (id) state.metaById[id] = entry;

            // filename-Index (über variants[current] oder fallback-Felder)
            const current = entry?.model?.current;
            const variant = current ? entry?.model?.variants?.[current] : null;
            const candidates = [
                variant?.filename,
                entry?.filename,
                variant?.file,
                entry?.file,
                variant?.url,
                entry?.url,
                variant?.src,
                entry?.src,
            ].filter(v => typeof v === 'string' && v.length > 0);

            if (candidates.length) {
                const file = basename(candidates[0]);       // z.B. FJ3262001.glb
                const base = stripExt(file);                // z.B. FJ3262001
                state.metaByFile[file] = entry;
                state.metaByFile[base] = entry;
            }
        }
    }

    console.log('🧭 Meta-Index erstellt:',
        Object.keys(state.metaById).length, 'IDs,',
        Object.keys(state.metaByFile).length, 'Dateinamen');

}

