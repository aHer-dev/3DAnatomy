// js/utils/modelData.js
// Gemeinsame Hilfsfunktionen zur Extraktion von Modell-Metadaten

import { state } from '../store/state.js';
import { getStructureDisplayLabel } from './anatomyLabels.js';

/**
 * Extrahiert ID, Name und Gruppe eines 3D-Modells aus userData.
 * @param {THREE.Object3D} obj
 * @returns {{ id: string, name: string, group: string }}
 */
export function extractModelData(obj) {
    return {
        id:    _extractId(obj),
        name:  _extractName(obj),
        group: _extractGroup(obj),
    };
}

function _extractId(obj) {
    const candidates = [
        obj.userData?.meta?.id,
        obj.userData?.entry?.id,
        obj.userData?.meta?.fma,
        obj.userData?.entry?.fma,
        obj.name,
        obj.userData?.id,
    ];
    for (const c of candidates) {
        if (c && c !== 'undefined' && typeof c === 'string') return c;
    }
    return `${obj.name || 'unknown'}_${Date.now()}`;
}

function _extractName(obj) {
    const candidates = [
        getStructureDisplayLabel(obj),
        obj.userData?.meta?.displayLabel,
        obj.userData?.entry?.displayLabel,
        obj.userData?.meta?.label,
        obj.userData?.entry?.label,
        obj.userData?.meta?.labels?.la,
        obj.userData?.meta?.labels?.en,
        obj.userData?.meta?.labels?.de,
        obj.userData?.entry?.labels?.la,
        obj.userData?.entry?.labels?.en,
        obj.userData?.entry?.labels?.de,
        obj.userData?.meta?.label,
        obj.userData?.entry?.label,
        obj.name,
    ];
    for (const c of candidates) {
        if (c && c !== 'undefined' && typeof c === 'string') return c;
    }
    return 'Unbekannt';
}

function _extractGroup(obj) {
    const candidates = [
        obj.userData?.group,
        obj.userData?.meta?.classification?.group,
        obj.userData?.entry?.classification?.group,
        obj.userData?.meta?.group,
        obj.userData?.entry?.group,
    ];
    for (const c of candidates) {
        if (c && c !== 'undefined' && typeof c === 'string') return c;
    }
    // Fallback: in geladenen Gruppen suchen
    for (const [groupName, models] of Object.entries(state.groups || {})) {
        if (models.includes(obj)) return groupName;
    }
    return 'unknown';
}
