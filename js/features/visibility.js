// ============================================
// visibility.js - VOLLSTÄNDIGE VERSION
// ============================================
// Zentrale Sichtbarkeits-API mit Layer-Management
// Layer 0 = Render (sichtbar machen/ausblenden)
// Layer 1 = Pick (anklickbar)

import * as THREE from 'three';
import { state } from '../store/state.js';

// === PRIVATE HELPER FUNCTIONS ===
function _asArray(mat) {
    return Array.isArray(mat) ? mat : [mat];
}

function _setMeshMaterials(mesh, mats) {
    mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
}

// === OPACITY MANAGEMENT ===
/**
 * Setzt die Opazität (0..1) für EIN Root-Objekt (alle Mesh-Kinder)
 */
export function setObjectOpacity(root, opacity = 1) {
    if (!root) return;

    root.traverse((ch) => {
        if (!ch.isMesh) return;

        // Volle Deckkraft wiederherstellen
        if (opacity >= 1) {
            if (ch.userData.__origMats) {
                _setMeshMaterials(ch, ch.userData.__origMats);
                delete ch.userData.__origMats;
                delete ch.userData.__ownMats;
            } else {
                const mats = _asArray(ch.material);
                mats.forEach(m => {
                    if (!m) return;
                    m.transparent = false;
                    m.opacity = 1;
                    m.depthWrite = true;
                });
            }
            return;
        }

        // Transparenz setzen (Material klonen wenn nötig)
        if (!ch.userData.__ownMats) {
            const src = _asArray(ch.material);
            ch.userData.__origMats = src.map(m => m?.clone?.() || m);
            const clones = src.map(m => m?.clone?.() || m);
            ch.userData.__ownMats = clones;
            _setMeshMaterials(ch, clones);
        }

        const mats = _asArray(ch.material);
        mats.forEach(m => {
            if (!m) return;
            m.transparent = true;
            m.opacity = opacity;
            m.depthWrite = false;
        });
    });
}

/**
 * Setzt die Opazität für eine komplette Gruppe
 */
export function setGroupOpacity(group, opacity = 1) {
    const roots = state.groups?.[group] || [];
    roots.forEach(root => setObjectOpacity(root, opacity));
}

// === VISIBILITY MANAGEMENT ===
/**
 * Hauptfunktion für Model-Sichtbarkeit
 * Setzt Sichtbarkeit eines einzelnen Modells inkl. Layer
 */
export function setModelVisibility(model, visible) {
    if (!model) return;

    model.visible = visible;

    model.traverse(child => {
        if (child.isMesh || child.isObject3D) {
            child.visible = visible;

            if (visible) {
                child.layers.enable(0);  // Render layer
                child.layers.enable(1);  // Pick layer
            } else {
                child.layers.disable(0);
                child.layers.disable(1);
            }
        }
    });

    // Root-Layer setzen
    if (visible) {
        model.layers.enable(0);
        model.layers.enable(1);
    } else {
        model.layers.disable(0);
        model.layers.disable(1);
    }
}

/**
 * Setzt Sichtbarkeit für alle Modelle einer Gruppe
 */
export function setGroupVisibility(group, visible) {
    const models = state.groups[group] || [];
    models.forEach(model => setModelVisibility(model, visible));
    state.groupStates[group] = visible;
}

// Alias für Abwärtskompatibilität (falls irgendwo noch verwendet)
export const setGroupVisible = setGroupVisibility;

/**
 * Wechselt Sichtbarkeit eines einzelnen Modells
 */
export function toggleModelVisibility(model) {
    if (!model) return;
    setModelVisibility(model, !model.visible);
}

/**
 * Prüft ob ein Modell sichtbar ist
 */
export function isModelVisible(model) {
    return !!model?.visible;
}

// === CONVENIENCE FUNCTIONS ===
/**
 * Objekt vollständig ausblenden
 */
export function hideObject(obj) {
    setModelVisibility(obj, false);
}

/**
 * Objekt vollständig anzeigen
 */
export function showObject(obj) {
    setModelVisibility(obj, true);
}

/**
 * Versteckt alle verwalteten Modelle
 */
export function hideAllManagedModels() {
    Object.keys(state.groups).forEach(group => {
        setGroupVisibility(group, false);
    });
    console.log('✅ Alle verwalteten Modelle versteckt');
}

// Alias für Abwärtskompatibilität
export const hideAllModels = hideAllManagedModels;

/**
 * Zeigt alle verwalteten Modelle
 */
export function showAllManagedModels() {
    Object.keys(state.groups).forEach(group => {
        setGroupVisibility(group, true);
    });
    console.log('✅ Alle verwalteten Modelle sichtbar');
}

// === GHOST MODE ===
/**
 * Objekt als "Ghost" anzeigen: sichtbar & transparent, aber NICHT pickbar
 */
export function setObjectGhost(obj, opacity = 0.15) {
    if (!obj) return;

    obj.traverse((ch) => {
        if (!ch.isMesh) return;

        // Pick deaktivieren (durchklicken ermöglichen)
        ch.layers.disable(1);

        // Originale sichern (einmalig)
        if (!ch.userData.__ghostBackup) {
            const mats = _asArray(ch.material);
            ch.userData.__ghostBackup = mats.map(m => m?.clone?.() || m);
        }

        // Transparente Klone setzen
        const mats = _asArray(ch.material);
        const ghostMats = mats.map(m => {
            if (!m) return m;
            const cloned = m?.clone?.() || m;
            cloned.transparent = true;
            cloned.opacity = opacity;
            cloned.depthWrite = false;
            return cloned;
        });

        _setMeshMaterials(ch, ghostMats);
        ch.visible = true;
    });
}

/**
 * Ghost-Zustand zurücksetzen
 */
export function clearObjectGhost(obj) {
    if (!obj) return;

    obj.traverse((ch) => {
        if (!ch.isMesh) return;

        const backup = ch.userData.__ghostBackup;
        if (backup) {
            _setMeshMaterials(ch, backup);
            delete ch.userData.__ghostBackup;
        } else {
            // Fallback: Transparenz ausschalten
            const mats = _asArray(ch.material);
            mats.forEach(m => {
                if (!m) return;
                m.transparent = false;
                m.opacity = 1.0;
                m.depthWrite = true;
            });
        }

        // Wieder pickbar machen
        ch.layers.enable(1);
        ch.visible = true;
    });
}

/**
 * Setzt Ghost-Modus für eine ganze Gruppe
 */
export function setGroupGhost(group, opacity = 0.15) {
    const models = state.groups[group] || [];
    models.forEach(model => setObjectGhost(model, opacity));
}

/**
 * Entfernt Ghost-Modus von einer Gruppe
 */
export function clearGroupGhost(group) {
    const models = state.groups[group] || [];
    models.forEach(model => clearObjectGhost(model));
}

// === GROUP STATE RESTORATION ===
/**
 * Stellt den gespeicherten Sichtbarkeitszustand einer Gruppe wieder her
 */
export function restoreGroupVisibility(groupName) {
    if (!groupName || typeof groupName !== 'string') return;

    const models = state.groups?.[groupName];
    const saved = state.groupStates?.[groupName];

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

// === UTILITY FUNCTIONS ===
/**
 * Zählt sichtbare Modelle in einer Gruppe
 */
export function countVisibleInGroup(group) {
    const models = state.groups[group] || [];
    return models.filter(model => isModelVisible(model)).length;
}

/**
 * Gibt alle sichtbaren Gruppen zurück
 */
export function getVisibleGroups() {
    return Object.keys(state.groups).filter(group => {
        const models = state.groups[group] || [];
        return models.some(model => isModelVisible(model));
    });
}

/**
 * Setzt Sichtbarkeit basierend auf Meta-Daten
 */
export function applyDefaultVisibility(model) {
    const meta = model?.userData?.meta;
    const defaultVisible = meta?.model?.visible_by_default ?? true;
    setModelVisibility(model, defaultVisible);
}