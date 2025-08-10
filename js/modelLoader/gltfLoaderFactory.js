// js/loaders/gltfLoaderFactory.js
// Zweck: Einen vorkonfigurierten GLTFLoader erzeugen – optional mit DRACO (WASM/JS).
// Vorteil: Einheitliche Konfiguration für ALLE GLB-Loads (Decoder-Pfad, Manager, etc.).

// WICHTIG:
// - Entweder nutzt du eine Import-Map mit "three/addons/": "./node_modules/three/examples/jsm/"
//   ODER du legst GLTFLoader/DRACOLoader lokal unter js/vendor/jsm/loaders/ ab und passt die Importe an.
import { GLTFLoader } from '../three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from '../three/addons/loaders/DRACOLoader.js';

import { dracoPath } from '../core/path.js'; // zentraasdddddquelle (sollte einen RELATIVEN, öffentlich erreichbaren Pfad liefern, z. B. "./draco/")

/**
 * Normalisiert einen Basis-Pfad auf ein Format mit genau einem Slash am Ende.
 * @param {string} p
 * @returns {string}
 */
function withTrailingSlash(p) {
    if (!p) return './draco/';
    return p.endsWith('/') ? p : p + '/';
}

/**
 * Erzeugt einen GLTFLoader mit optionalem DRACO-Decoder.
 * @param {Object} [options]
 * @param {import('three').LoadingManager} [options.manager]        - Optionaler LoadingManager
 * @param {'wasm'|'js'|false} [options.decoderType='wasm']         - 'wasm' bevorzugt; 'js' als Fallback; false = kein Draco
 * @param {string} [options.decoderPath]                            - Überschreibt dracoPath(); muss öffentlich erreichbar sein (relativ zu index.html)
 * @returns {GLTFLoader}
 */
export function createGLTFLoader(options = {}) {
    const {
        manager = undefined,
        decoderType = 'wasm',      // Standard: WASM (schneller). Setze auf 'js' oder false, wenn du kein Draco brauchst.
        decoderPath = undefined,   // optional eigene Pfadangabe, sonst dracoPath()
    } = options;

    // GLTFLoader optional mit eigenem LoadingManager
    const loader = new GLTFLoader(manager);

    // Falls Draco nicht gewünscht/verfügbar: sofort zurück
    if (decoderType === false) {
        return loader;
    }

    // DRACO initialisieren
    const draco = new DRACOLoader();

    // Pfadquelle: erst options.decoderPath, sonst zentrale Funktion dracoPath()
    const base = withTrailingSlash(decoderPath ?? dracoPath());
    draco.setDecoderPath(base);

    // Decoder-Konfiguration: 'wasm' oder 'js'
    // Hinweis: Für 'wasm' müssen die Dateien draco_decoder.wasm und draco_wasm_wrapper.js im Pfad liegen.
    // Für 'js' genügen draco_decoder.js (und evtl. draco_decoder.wasm nicht).
    if (decoderType === 'wasm') {
        draco.setDecoderConfig({ type: 'wasm' });
        // Optional lädt DRACOLoader intern benötigte Assets vor:
        // draco.preload();
    } else if (decoderType === 'js') {
        draco.setDecoderConfig({ type: 'js' });
    } else {
        console.warn('[GLTF] Unbekannter decoderType, erwarte "wasm", "js" oder false. Fällt auf "wasm" zurück.');
        draco.setDecoderConfig({ type: 'wasm' });
    }

    // DRACO an GLTFLoader hängen
    loader.setDRACOLoader(draco);

    // Saubere Referenz für spätere Entsorgung:
    // Wir hängen den DRACO-Loader NICHT als "privates" Feld von three an,
    // sondern definieren ein eigenes, nicht-enumerables Property.
    Object.defineProperty(loader, '__draco', {
        value: draco,
        writable: false,
        enumerable: false,
        configurable: true,
    });

    return loader;
}

/**
 * Entsorgt Ressourcen (insb. DRACO-Decoder/Worker), die an diesem Loader hängen.
 * @param {GLTFLoader} loader
 */
export function disposeGLTFLoader(loader) {
    try {
        // Unsere eigene Referenz verwenden (siehe oben)
        if (loader && loader.__draco && typeof loader.__draco.dispose === 'function') {
            loader.__draco.dispose();
        }
        // Weitere Aufräumarbeiten können hier ergänzt werden (z. B. Meshopt-Worker, KTX2-Transcoder etc.).
    } catch (e) {
        console.warn('[GLTF] DRACO dispose warning:', e);
    }
}
