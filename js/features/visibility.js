// ============================================
// visibility.js - BROWSER-KOMPATIBLE VERSION
// ============================================

import * as THREE from 'three';
import { dispatch, StateActions } from '../store/state.js';
import { markPickablesDirty } from '../core/raycaster.js';

// WICHTIG: Lazy imports für zirkuläre Referenzen (BROWSER-KOMPATIBEL)
let _state = null;
let _setPickable = null;

// Lazy Getter für State (async import statt require)
function getState() {
    if (!_state) {
        // Asynchroner Import für Browser
        import('../store/state.js').then(module => {
            _state = module.state;
        }).catch(err => {
            console.warn('State import failed:', err);
        });
    }
    return _state;
}

// Lazy Getter für setPickable
function getSetPickable() {
    if (!_setPickable) {
        import('./selection.js').then(module => {
            _setPickable = module.setPickable;
        }).catch(err => {
            console.warn('setPickable import failed:', err);
        });
    }
    return _setPickable;
}

// === PRIVATE HELPER FUNCTIONS ===
function _asArray(mat) {
    return Array.isArray(mat) ? mat : [mat];
}

function _setMeshMaterials(mesh, mats) {
    mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
}

// === OPACITY MANAGEMENT ===
export function setObjectOpacity(root, opacity = 1) {
    if (!root) return;

    root.traverse((ch) => {
        if (!ch.isMesh) return;

        if (opacity >= 1) {
            if (ch.userData.__origMats) {
                if (ch.userData.__ownMats) {
                    ch.userData.__ownMats.forEach(m => m?.dispose());
                }
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

export function setGroupOpacity(group, opacity = 1) {
    const state = getState();
    if (!state) return;
    const roots = state.groups?.[group] || [];
    roots.forEach(root => setObjectOpacity(root, opacity));
}

// === CORE VISIBILITY FUNCTIONS ===
export function showModel(root) {
    if (!root) return;

    const setPickable = getSetPickable();
    const state = getState();

    root.traverse(n => {
        if (!n.isObject3D) return;
        // Render-Layer (0) + Pick-Layer (1) für alle Nodes aktivieren,
        // damit setModelVisibility(false) vollständig rückgängig gemacht wird
        n.visible = true;
        n.layers.enable(0);
        n.layers.enable(1);

        if (!n.isMesh) return;
        restoreOriginalMaterial(n);

        if (setPickable && state?.pickableMeshes) {
            setPickable(n, true, state.pickableMeshes);
        } else {
            state?.pickableMeshes?.add(n);
        }
    });
}

export function hideModel(root) {
    if (!root) return;

    const setPickable = getSetPickable();
    const state = getState();

    root.traverse(n => {
        if (!n.isMesh) return;
        n.visible = false;

        // Nur setPickable aufrufen wenn verfügbar
        if (setPickable && state?.pickableMeshes) {
            setPickable(n, false, state.pickableMeshes);
        } else {
            // Fallback: Nur Layer setzen
            n.layers.disable(1);
            state?.pickableMeshes?.delete(n);
        }
    });
}

export function ghostModel(root, alpha = 0.15) {
    if (!root) return;

    const setPickable = getSetPickable();
    const state = getState();

    root.traverse(n => {
        if (!n.isMesh) return;
        n.visible = true;
        applyGhostMaterial(n, alpha);

        // Nur setPickable aufrufen wenn verfügbar
        if (setPickable && state?.pickableMeshes) {
            setPickable(n, false, state.pickableMeshes); // Ghost ist NICHT klickbar
        } else {
            // Fallback: Nur Layer setzen
            n.layers.disable(1);
            state?.pickableMeshes?.delete(n);
        }
    });
}

// === GROUP VISIBILITY ===
export function setGroupVisibility(groupName, visible) {
    const state = getState();
    if (!state) {
        console.warn('⚠️ setGroupVisibility: State nicht verfügbar');
        return;
    }
    const v = !!visible;
    // 1) State mutieren – zentral per Action
    dispatch(StateActions.SET_GROUP_VISIBILITY, { group: groupName, visible: v });
    // 2) Effekt anwenden – einzig hier werden Modelle sichtbar/unsichtbar gesetzt
    const models = state.groups[groupName] || [];
    for (const model of models) setModelVisibility(model, v);
}
    
// === LEGACY/COMPATIBILITY FUNCTIONS ===
export function setModelVisibility(model, visible) {
    if (!model) return;
    const v = !!visible;

    // Demand-Render + Raycaster-Sync anfordern
    if (typeof window !== 'undefined' && typeof window.requestRender === 'function') {
        window.requestRender();
    }
    markPickablesDirty();

    // Sichtbarkeit & Layer für gesamten Subtree setzen
    model.traverse(child => {
        if (!child.isObject3D) return;
        child.visible = v;
        if (v) {
            child.layers.enable(0); // Render layer
            child.layers.enable(1); // Pick layer
        } else {
            child.layers.disable(0);
            child.layers.disable(1);
        }
    });

    // Root sicherstellen (falls traverse-Hook Root überspringt)
    if (v) {
        model.layers.enable(0);
        model.layers.enable(1);
    } else {
        model.layers.disable(0);
        model.layers.disable(1);
    }

    // Pickables konsequent über API (kein direkter Zugriff auf state.pickableMeshes)
    const setPickable = typeof getSetPickable === 'function' ? getSetPickable() : null;
    if (setPickable) {
        model.traverse(n => {
            if (n.isMesh) setPickable(n, v);
        });
    }
}

export function toggleModelVisibility(model) {
    if (!model) return;
    setModelVisibility(model, !model.visible);
}

export function isModelVisible(model) {
    return !!model?.visible;
}

// === CONVENIENCE FUNCTIONS ===
export function hideObject(obj) {
    setModelVisibility(obj, false);
}

export function showObject(obj) {
    setModelVisibility(obj, true);
}

export function hideAllManagedModels() {
    const state = getState();
    if (!state) return;

    Object.keys(state.groups).forEach(group => {
        setGroupVisibility(group, false);
    });
}

export const hideAllModels = hideAllManagedModels;

export function showAllManagedModels() {
    const state = getState();
    if (!state) return;

    Object.keys(state.groups).forEach(group => {
        setGroupVisibility(group, true);
    });
}

// === GHOST MODE HELPERS ===
function rememberOriginalMaterial(mesh) {
    if (!mesh.userData._origMats) {
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mesh.userData._origMats = list;
    }
}

function restoreOriginalMaterial(mesh) {
    if (!mesh.userData?._origMats) return;
    _asArray(mesh.material).forEach(m => m?.dispose());
    const list = mesh.userData._origMats;
    mesh.material = Array.isArray(mesh.material) ? list : list[0];
    delete mesh.userData._origMats;
}

function applyGhostMaterial(mesh, alpha = 0.15) {
    if (!mesh.material) return;
    rememberOriginalMaterial(mesh);
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = list.map(m => {
        const c = m.clone();
        c.transparent = true;
        c.opacity = alpha;
        c.depthWrite = false;
        return c;
    });
}

// === GHOST MODE PUBLIC API ===
export function setObjectGhost(obj, opacity = 0.15) {
    if (!obj) return;

    obj.traverse((ch) => {
        if (!ch.isMesh) return;

        ch.layers.disable(1); // Pick deaktivieren

        if (!ch.userData.__ghostBackup) {
            const mats = _asArray(ch.material);
            ch.userData.__ghostBackup = mats.map(m => m?.clone?.() || m);
        }

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

export function clearObjectGhost(obj) {
    if (!obj) return;

    obj.traverse((ch) => {
        if (!ch.isMesh) return;

        const backup = ch.userData.__ghostBackup;
        if (backup) {
            _asArray(ch.material).forEach(m => m?.dispose());
            _setMeshMaterials(ch, backup);
            delete ch.userData.__ghostBackup;
        } else {
            const mats = _asArray(ch.material);
            mats.forEach(m => {
                if (!m) return;
                m.transparent = false;
                m.opacity = 1.0;
                m.depthWrite = true;
            });
        }

        ch.layers.enable(1); // Wieder pickbar
        ch.visible = true;
    });
}

export function setGroupGhost(group, opacity = 0.15) {
    const state = getState();
    if (!state) return;
    const models = state.groups[group] || [];
    models.forEach(model => setObjectGhost(model, opacity));
}

export function clearGroupGhost(group) {
    const state = getState();
    if (!state) return;
    const models = state.groups[group] || [];
    models.forEach(model => clearObjectGhost(model));
}

// === UTILITY FUNCTIONS ===
export function restoreGroupVisibility(groupName) {
    if (!groupName || typeof groupName !== 'string') return;

    const state = getState();
    if (!state) return;

    const models = state.groups?.[groupName];
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

export function countVisibleInGroup(group) {
    const state = getState();
    if (!state) return 0;
    const models = state.groups[group] || [];
    return models.filter(model => isModelVisible(model)).length;
}

export function getVisibleGroups() {
    const state = getState();
    if (!state) return [];
    return Object.keys(state.groups).filter(group => {
        const models = state.groups[group] || [];
        return models.some(model => isModelVisible(model));
    });
}

export function applyDefaultVisibility(model) {
    const meta = model?.userData?.meta;
    const defaultVisible = meta?.model?.visible_by_default ?? true;
    setModelVisibility(model, defaultVisible);
}

// Legacy-Alias
export const setGroupVisible = setGroupVisibility;

// State und Dependencies beim Laden initialisieren
if (typeof window !== 'undefined') {
    // Async loading für Browser
    Promise.all([
        import('../store/state.js'),
        import('./selection.js')
    ]).then(([stateModule, selectionModule]) => {
        _state = stateModule.state;
        _setPickable = selectionModule.setPickable;
    }).catch(err => {
        console.warn('⚠️ Visibility: Dependencies konnten nicht geladen werden:', err);
    });
}