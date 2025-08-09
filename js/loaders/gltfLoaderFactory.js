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

export function createGLTFLoader() {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(dracoPath());        // z. B. "./draco/"
  draco.setDecoderConfig({ type: 'wasm' }); // schneller; Browser fällt zur Not auf JS zurück
  loader.setDRACOLoader(draco);
  return loader;
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
