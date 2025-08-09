import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';
import { modelPath } from '../core/path.js';

const gltf = createGLTFLoader();



// Robust gegen verschiedene Metafelder (filename, file, src, url, path, name)
function resolveModelURL(entry) {
    const group = entry?.classification?.group ?? entry?.group ?? '';

    const raw =
        entry?.path || entry?.src || entry?.url ||
        entry?.filename || entry?.file || entry?.name || null;

    if (!raw) {
        console.error('❌ Meta ohne Dateiname/Pfad:', entry);
        throw new Error(`Meta ohne Dateiname/Pfad (id=${entry?.id || entry?.labels?.en || 'unknown'})`);
    }

    // Vollqualifiziert/absolut? Direkt verwenden
    if (/^https?:\/\//.test(raw) || raw.startsWith('/')) return raw;

    // Relativ: über modelPath zusammenbauen (berücksichtigt group)
    return modelPath(raw, group);
}

export function loadEntry(entry) {
    const url = resolveModelURL(entry);
    return new Promise((resolve, reject) => {
        gltf.load(
            url,
            (g) => {
                const root = g.scene || g.scenes?.[0];
                resolve(root);
            },
            undefined,
            reject
        );
    });
}



/** Gibt Geometrien, Materialien und Texturen rekursiv frei */
export function disposeObject3D(root) {
    if (!root) return;
    root.traverse((n) => {
        if (!n.isMesh) return;
        n.geometry?.dispose?.();
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        for (const m of mats) {
            if (!m) continue;
            // generisch alle Texture-Properties entsorgen
            for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose?.(); }
            m.dispose?.();
        }
    });
  }

// modelLoader-core
export { loadModels, loadSingleModel } from '../features/modelLoader-core.js';

// progress
export { showLoadingBar, hideLoadingBar } from './progress.js';

// cleanup
export { removeModelsByGroupOrSubgroup, removeModelByFilename } from './cleanup.js';

// groups
export {
    loadGroup,
    unloadGroup,
    updateGroupVisibility,
    restoreGroupState
} from '../features/groups.js';

// appearance
export { setModelColor, setModelOpacity, setModelVisibility } from '../features/appearance.js';

// Optional: color.js, falls du dort eine UI-spezifische Funktion hast
export { updateModelColors as updateModelColorsFromColorUI } from './color.js';
