// js/loaders/gltfLoaderFactory.js
// Erzeugt einen vorkonfigurierten GLTFLoader mit DRACOLoader.
// Vorteil: Alle GLB-Loads benutzen dieselben Einstellungen (Decoder-Pfad, WASM, Manager).

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { dracoPath } from '../core/path.js';        // zentrale Pfadquelle

/**
 * Erzeugt einen GLTFLoader mit angebundenem DRACOLoader.
 * @param {Object} [options]
 * @param {THREE.LoadingManager} [options.manager] - optionaler LoadingManager
 * @param {'wasm'|'js'} [options.decoderType='wasm'] - DRACO-Decoder bevorzugt als WASM
 * @returns {GLTFLoader} konfigurierter Loader; zugehöriger DRACO-Loader hängt als loader._draco
 */
export function createGLTFLoader(options = {}) {
  const { manager, decoderType = 'wasm' } = options;

  // 1) ECHTEN GLTFLoader instanzieren (keine Rekursion!)
  const gltfLoader = new GLTFLoader(manager);

  // 2) DRACO konfigurieren
  const draco = new DRACOLoader(manager);
  draco.setDecoderPath(dracoPath());              // z. B. '/draco/' oder '/<BASE>/draco/'
  draco.setDecoderConfig({ type: decoderType });  // 'wasm' bevorzugt

  // 3) DRACO an GLTF hängen
  gltfLoader.setDRACOLoader(draco);

  // 4) Referenz merken (für späteres dispose)
  gltfLoader._draco = draco;

  return gltfLoader;
}

/**
 * Entsorgt Ressourcen, die der Loader hält (insb. DRACO-Worker/Decoder).
 * Hinweis: GLTFLoader selbst hat kein dispose(), daher entsorgen wir hier den DRACO-Teil.
 * @param {GLTFLoader} loader
 */
export function disposeGLTFLoader(loader) {
  try {
    loader?._draco?.dispose();
    // optionale Aufräumarbeiten, falls du eigene Worker/Manager registrierst
  } catch (e) {
    console.warn('DRACO dispose warning:', e);
  }
}
