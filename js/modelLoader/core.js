// modelLoader-core.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js';
import { getModelPath } from '../utils.js';
import { state } from '../state.js';
import { showLoadingBar, updateLoadingBar, hideLoadingBar } from './progress.js';
import { fitCameraToScene } from '../cameraUtils.js';


/**
 * Lädt mehrere Modelle anhand der gegebenen Meta-Entries.
 * @param {Array} entries - Liste von Metaeinträgen
 * @param {string} group - Gruppenname (z. B. "bones")
 * @param {boolean} centerCamera - Ob nach dem ersten Modell Kamera gesetzt werden soll
 * @param {THREE.Scene} scene
 * @param {THREE.GLTFLoader} loader
 */
export async function loadModels(entries, group, centerCamera, scene, loader, camera, controls, renderer)
 {
  if (!entries?.length) {
    console.warn(`Keine Modelle für Gruppe "${group}" gefunden.`);
    return;
  }

  showLoadingBar(); // ✅ Ladebalken zeigen

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    try {
      await loadSingleModel(entry, group, scene, loader, i === 0 && centerCamera);
    } catch (err) {
      console.error(`❌ Fehler beim Laden von ${entry.filename}:`, err);
    }

    // ✅ Ladefortschritt aktualisieren
    const percent = Math.round(((i + 1) / entries.length) * 100);
    updateLoadingBar(percent);
  }

  hideLoadingBar(); // ✅ Ladebalken ausblenden
  
if (centerCamera) {
  fitCameraToScene(camera, controls, renderer, scene);
}
  console.log(`✅ Alle Modelle für Gruppe "${group}" geladen.`);
}

/**
 * Lädt ein einzelnes Modell anhand des Meta-Eintrags.
 * @param {Object} entry - Metaeintrag mit .filename, .label usw.
 * @param {string} group
 * @param {THREE.Scene} scene
 * @param {THREE.GLTFLoader} loader
 * @param {boolean} focusCamera - Kamera auf erstes Modell zentrieren
 */
export async function loadSingleModel(entry, group, scene, loader, focusCamera = false) {
  const url = getModelPath(entry.filename, group);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      gltf => {
        const model = gltf.scene;
        if (!model) {
          reject(`⚠️ Kein scene-Objekt in GLTF: ${entry.filename}`);
          return;
        }

        // Material und Farbe setzen
        model.traverse(child => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: state.colors[group] || 0xB31919,
              transparent: true,
              opacity: state.transparency || 1,
            });
          }
        });

        // Modell benennen & in State speichern
        model.name = entry.filename;
        model.userData = { meta: entry }; // Info-Panel später
        state.groups[group].push(model);
        state.modelNames.set(model, entry.label);
        state.groupStates[group][entry.filename] = true;

        scene.add(model);

        // Kamera ggf. auf erstes Modell zentrieren

        resolve();
      },
      undefined,
      error => {
        console.warn(`Fehler beim Laden von ${url}:`, error);
        reject(error);
      }
    );
  });
}
