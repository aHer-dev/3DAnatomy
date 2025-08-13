import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';
import { modelPath } from '../core/path.js';

const gltf = createGLTFLoader();



// Robust gegen verschiedene Metafelder (filename, file, src, url, path, name)
function resolveModelURL(entry) {
    if (!entry || !entry.model) {
        throw new Error(`Meta ohne model-Block (id=${entry?.id ?? 'unknown'})`);
    }

    // 1) Aktuelle Variante bestimmen (Schema 1.1)
    const current = entry.model.current || 'draco';
    const variant = entry.model.variants?.[current];

    // 2) Kandidaten für Dateinamen sammeln (neu → alt)
    const nameCandidates = [
        variant?.filename,                // neues Schema
        entry.model?.asset?.file,         // asset.file (Schema 1.1)
        entry.filename, entry.file,       // ältere Felder
        variant?.url, entry?.url,         // absolute/relative URL als Notnagel
        variant?.src, entry?.src
    ].filter(v => typeof v === 'string' && v.length > 0);

    // 3) Kandidaten für Pfad sammeln (nur Ordner)
    const pathCandidates = [
        (variant?.path ?? '').toString(),          // neues Schema: z.B. "teeth"
        (entry.model?.asset?.path ?? '').toString()
    ].filter(p => typeof p === 'string');

    // 4) Fallback: asset.url direkt verwenden, falls vorhanden (kompletter Pfad)
    const directUrl = entry.model?.asset?.url;
    const hasDirectUrl = typeof directUrl === 'string' && directUrl.length > 0;

    // 5) Entscheidung
    if (hasDirectUrl && !nameCandidates.length) {
        // asset.url ist bereits komplett (z.B. "teeth/FJ1252.glb" oder absolut)
        return directUrl;
    }

    // 6) Dateiname extrahieren (Basename)
    const pickBasename = s => {
        try { return s.split('/').pop(); } catch { return s; }
    };
    const filename = nameCandidates.length ? pickBasename(nameCandidates[0]) : null;

    if (!filename) {
        console.error('❌ Meta ohne Dateiname/Pfad:', entry);
        throw new Error(`Meta ohne Dateiname/Pfad (id=${entry?.id ?? 'unknown'})`);
    }

    // 7) Pfad bauen:
    //    a) Varianten-Pfad, wenn vorhanden (bevorzugt)
    //    b) sonst model.asset.path
    //    c) sonst aus group ableiten (legacy-Verhalten)
    const clean = s => s.replace(/^\/+|\/+$/g, '');
    const group = entry.classification?.group || entry.group || 'other';

    let folder = clean(pathCandidates[0] || '');
    if (!folder) folder = group;

    // 8) Finale URL (relativ zum Webroot / deiner Base)
    //    entspricht der Logik in modelLoader-core.js
    const url = folder ? `models/${folder}/${filename}` : `models/${filename}`;
    return url;
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


// progress
export { showLoadingBar, hideLoadingBar } from './progress.js';

// cleanup
export { removeModelsByGroupOrSubgroup, removeModelByFilename } from './cleanup.js';




// Optional: color.js, falls du dort eine UI-spezifische Funktion hast
export { updateModelColors as updateModelColorsFromColorUI } from './color.js';
