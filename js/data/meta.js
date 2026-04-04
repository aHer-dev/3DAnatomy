// ============================================
// meta.js - Bereinigte Version
// ============================================
import { dataPath } from '../core/path.js';
import { state } from '../store/state.js';

let cachedMeta = null;

/**
 * Lädt meta.json nur einmal und cached das Ergebnis
 */
export async function getMeta() {
    if (!cachedMeta) {
        try {
            // WICHTIG: dataPath() als Funktion aufrufen!
            const url = dataPath('meta.json');
            console.log('📂 Lade Meta von:', url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            cachedMeta = await response.json();
            console.log(`✅ meta.json geladen – ${cachedMeta.length} Einträge`);
        } catch (error) {
            console.error("❌ Fehler beim Laden der Metadaten:", error);
            cachedMeta = [];
        }
    }
    return cachedMeta;
}

/**
 * Initialisiert Gruppen aus Meta-Daten
 */
export async function initializeGroupsFromMeta() {
    const meta = await getMeta();

    if (!meta || !meta.length) {
        console.warn('⚠️ Keine Meta-Daten vorhanden');
        return;
    }

    // 1) Gruppieren nach classification.group
    state.groupedMeta = meta.reduce((acc, entry) => {
        const g = entry?.classification?.group || 'other';
        (acc[g] ||= []).push(entry);
        return acc;
    }, {});

    // 2) Liste aller Gruppen
    state.availableGroups = Object.keys(state.groupedMeta);

    // 3) State initialisieren - WICHTIG: state.colors muss existieren!
    if (!state.colors) {
        state.colors = {};
    }

    for (const g of state.availableGroups) {
        // Leere Arrays für geladene Modelle
        state.groups[g] ||= [];

        // Sichtbarkeitszustände
        if (typeof state.groupStates[g] !== 'boolean' && typeof state.groupStates[g] !== 'object') {
            state.groupStates[g] = false;
        }

        // Farben von defaultSettings kopieren
        if (!(g in state.colors)) {
            state.colors[g] = state.defaultSettings.colors[g] ?? state.defaultSettings.defaultColor;
        }
    }

    // 4) Lookup-Indizes erstellen
    state.metaById = Object.create(null);
    state.metaByFile = Object.create(null);

    const basename = (s) => {
        try { return s.split('/').pop(); } catch { return s; }
    };
    const stripExt = (s) => s.replace(/\.[^/.]+$/, '');

    for (const entries of Object.values(state.groupedMeta)) {
        for (const entry of entries) {
            // ID-Index
            const id = (entry?.id || entry?.fma || '').toString().trim();
            if (id) {
                state.metaById[id] = entry;

                // FMA-ID auch indexieren falls anders
                const fmaId = (entry?.info?.links?.fma || '').toString().trim();
                if (fmaId && fmaId !== id) {
                    state.metaById[fmaId] = entry;
                }
            }

            // Filename-Index
            const current = entry?.model?.current || 'draco';
            const variant = entry?.model?.variants?.[current];

            const candidates = [
                variant?.filename,
                entry?.filename,
            ].filter(v => typeof v === 'string' && v.length > 0);

            if (candidates.length) {
                const file = basename(candidates[0]);
                const base = stripExt(file);
                state.metaByFile[file] = entry;
                state.metaByFile[base] = entry;
            }
        }
    }

    console.log('✅ Gruppen initialisiert:', state.availableGroups);
    console.log('🧭 Meta-Index:',
        Object.keys(state.metaById).length, 'IDs,',
        Object.keys(state.metaByFile).length, 'Dateinamen'
    );
}

/**
 * Helper-Funktionen für Meta-Zugriff
 */
export function getMetaById(id) {
    if (!id) return null;
    return state.metaById?.[id] || null;
}

export function getMetaByFile(filename) {
    if (!filename) return null;

    const basename = (s) => s.split('/').pop();
    const stripExt = (s) => s.replace(/\.[^/.]+$/, '');

    const file = basename(filename);
    const base = stripExt(file);

    return state.metaByFile?.[file] || state.metaByFile?.[base] || null;
}

export function getMetaByGroup(group) {
    return state.groupedMeta?.[group] || [];
}

export function getSubgroupsForGroup(group) {
    const entries = getMetaByGroup(group);
    const subgroups = new Set();

    entries.forEach(entry => {
        const subgroup = entry?.classification?.subgroup;
        if (subgroup) subgroups.add(subgroup);
    });

    return Array.from(subgroups).sort();
}