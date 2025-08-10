import { createGLTFLoader } from '../modelLoader/gltfLoaderFactory.js';
import { modelPath } from '../core/path.js';

const loader = createGLTFLoader();



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

/**
 * Lädt ein Modell basierend auf meta.entry.model.asset.url
 * @param {object} entry - Eintrag aus meta.json (enthält .model.asset.url)
 * @returns {Promise<THREE.Object3D>} Root des GLTF
 */
export async function loadEntry(entry) {
    // 1) Quelle bestimmen – NUR die atomare, migrierte URL nutzen
    const url = entry?.model?.asset?.url;
    if (!url) throw new Error(`loadEntry: missing model.asset.url for ${entry?.id}`);

    // 2) GLTF laden
    const gltf = await loader.loadAsync(`models/${url}`); // dein Pfad-Prefix ggf. anpassen
    const root = gltf.scene;

    // 3) Markierungen fürs Picking & Info-Panel
    root.userData.isModelRoot = true;
    root.userData.entry = entry;          // ← wichtig fürs Info-Panel

    // 4) Optional: Name setzen, falls leer (hilft beim Debuggen)
    if (!root.name) root.name = entry.model?.root_name || entry.model?.asset?.file || entry.id;

    return root;
}



/** Gibt Geometrien, Materialien und Texturen rekursiv frei */
export function disposeObject3D(obj) {
    obj.traverse(n => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) {
            if (Array.isArray(n.material)) n.material.forEach(m => m.dispose());
            else n.material.dispose();
        }
    });
}


// progress
export { showLoadingBar, hideLoadingBar } from './progress.js';

// cleanup
export { removeModelsByGroupOrSubgroup, removeModelByFilename } from './cleanup.js';

// groups
export {
    loadGroup,
    unloadGroup,
    setGroupVisibility,
    restoreGroupState
} from '../features/groups.js';

// appearance

// Optional: color.js, falls du dort eine UI-spezifische Funktion hast
export { updateModelColors as updateModelColorsFromColorUI } from './color.js';
