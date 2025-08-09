// js/features/visibility.js
// Zentrale Sichtbarkeits-API. Wichtig: Layer-Management für zuverlässiges Durchklicken.
// Regel:
//  - Layer 0 = Render (sichtbar machen/ausblenden)
//  - Layer 1 = Pick (anklickbar). Hide/Ghost deaktivieren Layer 1, Show/Un-Ghost aktivieren Layer 1.

import * as THREE from 'three';
import { state } from '../store/state.js';
import { scene } from '../core/scene.js';


/** interner Helper: Material-Array normalisieren */
function _asArray(mat) {
    return Array.isArray(mat) ? mat : [mat];
}
/** interner Helper: Mat-Array zurück in Mesh schreiben */
function _setMeshMaterials(mesh, mats) {
    mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
}

/** Setzt die Opazität (0..1) für EIN Root-Objekt (alle Mesh-Kinder) */
export function setObjectOpacity(root, opacity = 1) {
    if (!root) return;

    root.traverse((ch) => {
        if (!ch.isMesh) return;

        // 1) Falls wir auf volle Deckkraft zurück wollen
        if (opacity >= 1) {
            // Wenn wir jemals geklont haben, Originale wiederherstellen
            if (ch.userData.__origMats) {
                _setMeshMaterials(ch, ch.userData.__origMats);
                delete ch.userData.__origMats;
                delete ch.userData.__ownMats;
            } else {
                // Sonst: vorhandene Materialien „entgeistern“
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

        // 2) opacity < 1 → halbtransparent darstellen
        //    Einmalig klonen, um geteilte Materialinstanzen nicht global zu beeinflussen.
        if (!ch.userData.__ownMats) {
            const src = _asArray(ch.material);

            // Originale sichern (für spätere Wiederherstellung)
            ch.userData.__origMats = src.map(m => (m && m.clone ? m.clone() : m));

            // Klone erzeugen und zuweisen
            const clones = src.map(m => {
                if (!m) return m;
                const c = m.clone ? m.clone() : m;
                return c;
            });
            ch.userData.__ownMats = clones;
            _setMeshMaterials(ch, clones);
        }

        // 3) aktive (geklonte) Materialien updaten
        const mats = _asArray(ch.material);
        mats.forEach(m => {
            if (!m) return;
            m.transparent = true;
            m.opacity = opacity;
            // depthWrite aus bei echter Transparenz, vermeidet „Durchschreib“-Artefakte
            m.depthWrite = false;
        });
    });
}

/** Setzt die Opazität (0..1) für eine komplette Gruppe (alle bereits geladenen Roots) */
export function setGroupOpacity(group, opacity = 1) {
    const roots = (state.groups?.[group]) || [];
    roots.forEach(root => setObjectOpacity(root, opacity));
}


/**
/**
/**
 * Setzt Sichtbarkeit für alle Modelle einer Gruppe
 * @param {string} group – z. B. 'muscles'
 * @param {boolean} visible – true = anzeigen, false = verstecken
 */

export function setGroupVisibility(group, visible) {
    state.modelObjects.forEach((model, label) => {
        const meta = state.metaByLabel[label];
        if (meta?.group === group) {
            model.visible = visible;
        }
    });

    state.groupStates[group] = visible;
}

/**
 * Setzt Sichtbarkeit eines einzelnen Modells (Root + rekursiv Meshes für Konsistenz + Layers für Raycasting)
 * @param {THREE.Object3D} model
 * @param {boolean} visible
 */

export function setModelVisibility(model, visible) {
    if (!model) return;
    model.visible = visible;  // Setze Root (propagiert automatisch zu Children in Three.js)
    model.traverse(child => {
        if (child.isMesh) {
            child.visible = visible;  // Explizit für Meshes (sichert Sync bei manuellen Änderungen)
            if (visible) {
                child.layers.enable(0);  // Aktiviere Layer 0 für Raycasting
            } else {
                child.layers.disable(0);  // Deaktiviere Layer 0, damit Raycaster ignoriert
            }
        }
    });
    // Auch Root-Layer setzen (für Gruppen ohne Meshes)
    if (visible) {
        model.layers.enable(0);
    } else {
        model.layers.disable(0);
    }
}

/**
 * Wechselt Sichtbarkeit eines einzelnen Modells
 * @param {THREE.Object3D} model
 */
export function toggleModelVisibility(model) {
    if (!model) return;
    const currentVisibility = isModelVisible(model);
    console.log('Toggle: Current visibility?', currentVisibility);  // Debugging-Log (entferne später)
    setModelVisibility(model, !currentVisibility);
}

// /**Prüft, ob ein Modell sichtbar ist
export function isModelVisible(model) {
    return !!model?.visible;  // Vereinfacht: Nutze Root-Status
}

/**
 * Versteckt nur Modelle, die von unserem Loader/State verwaltet werden.
 * Das vermeidet Nebenwirkungen auf fremde Scene-Nodes.
 */
export function hideAllManagedModels() {
    Object.keys(state.groups).forEach(group => {
        const models = state.groups[group] || [];
        models.forEach(model => {
            model.visible = false;
            model.traverse(child => {
                if (child.isMesh) {
                    child.visible = false;
                    child.layers.disable(0);
                }
            });
            model.layers.disable(0);
        });
    });
    console.log('✅ Alle verwalteten Modelle versteckt');
}

/**
 * Objekt vollständig ausblenden (nicht rendern, nicht pickbar).
 */
export function hideObject(obj) {
    if (!obj) return;
    obj.traverse((ch) => {
        if (!ch.isObject3D) return;
        ch.visible = false;        // Render off
        ch.layers.disable(1);      // Pick off
    });
}

/**
 * Objekt vollständig anzeigen (rendern & pickbar).
 * Achtung: Falls das Objekt "geghostet" war, bitte clearObjectGhost() verwenden.
 */
export function showObject(obj) {
    if (!obj) return;
    obj.traverse((ch) => {
        if (!ch.isObject3D) return;
        ch.visible = true;         // Render on
        ch.layers.enable(1);       // Pick on
    });
}

/**
 * Objekt als "Ghost" anzeigen: sichtbar & transparent, aber NICHT pickbar.
 * Material wird pro Mesh geklont, Original gespeichert für Wiederherstellung.
 */
export function setObjectGhost(obj, opacity = 0.15) {
    if (!obj) return;
    obj.traverse((ch) => {
        if (!ch.isMesh) return;

        // Pick deaktivieren (durchklicken ermöglichen)
        ch.layers.disable(1);

        // Originale sichern (einmalig)
        if (!ch.userData.__ghostBackup) {
            const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
            ch.userData.__ghostBackup = mats.map((m) => (m && m.clone ? m.clone() : m));
        }

        // Transparente Klone setzen
        const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
        const ghostMats = mats.map((m) => {
            if (!m) return m;
            const cloned = m.clone ? m.clone() : m;
            cloned.transparent = true;
            cloned.opacity = opacity;
            cloned.depthWrite = false; // bessere Durchsicht
            return cloned;
        });
        ch.material = Array.isArray(ch.material) ? ghostMats : ghostMats[0];

        // Sichtbar lassen (Render on), nur eben „ghosted“
        ch.visible = true;
    });
}

/**
 * Ghost-Zustand zurücksetzen: Originalmaterialien wiederherstellen + pickbar machen.
 */
export function clearObjectGhost(obj) {
    if (!obj) return;
    obj.traverse((ch) => {
        if (!ch.isMesh) return;

        const backup = ch.userData.__ghostBackup;
        if (backup) {
            // Originalmateriale zurück
            ch.material = Array.isArray(ch.material) ? backup : backup[0];
            delete ch.userData.__ghostBackup;
        } else {
            // Fallback: zumindest Transparenz ausschalten
            const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
            mats.forEach((m) => {
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
 * Gruppensichtbarkeit (booleans in state.groupStates) – nutzt obige Objektfunktionen.
 */
export function setGroupVisible(group, visible) {
    const arr = state.groups[group] || [];
    arr.forEach((root) => {
        if (visible) showObject(root);
        else hideObject(root);
    });
    state.groupStates[group] = !!visible;
}
