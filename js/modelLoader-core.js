// modelLoader-core.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js';
import { getModelPath } from './utils.js';
import { state } from './state.js';
import { showLoadingBar, updateLoadingBar, hideLoadingBar } from './modelLoader-progress.js';


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

  if (!entry?.model?.filename) {
    console.warn(`⛔ Modell ohne gültigen Dateinamen übersprungen:`, entry?.id || entry);
    continue;
  }

  try {
    await loadSingleModel(entry, group, scene, loader, i === 0 && centerCamera);
  } catch (err) {
    console.error(`❌ Fehler beim Laden von ${entry.model?.filename || 'unbekannt'}:`, err);
  }
}

  hideLoadingBar(); // ✅ Ladebalken ausblenden

  console.log(`✅ Alle Modelle für Gruppe "${group}" geladen.`);
}

/**
 * Lädt ein einzelnes Modell anhand des Meta-Eintrags.
 * @param {Object} entry - Metaeintrag mit model.filename, model.path, etc.
 * @param {string} group - z. B. "bones"
 * @param {THREE.Scene} scene
 * @param {THREE.GLTFLoader} loader
 * @param {boolean} focusCamera - Kamera ggf. auf das Modell zentrieren
 */
export async function loadSingleModel(entry, group, scene, loader, focusCamera = false) {
  return new Promise((resolve, reject) => {
    // 🧠 Schritt 1: Validierung
    const filename = entry?.model?.filename;
    if (!filename) {
      console.warn("⛔ Kein gültiger filename in Entry:", entry?.id || entry);
      resolve(); // Modell überspringen
      return;
    }

    // 🧠 Schritt 2: Fallback-Logik für den Pfad
    const subfolder = entry.model.path || group;
    const url = (`models/${subfolder}/${filename}`).replace(/\/+/g, '/');

    // 🧪 Debug-Ausgabe
    console.log("📦 Lade Modell:", {
      id: entry.id,
      filename,
      group,
      path: subfolder,
      url
    });

    // 🧠 Schritt 3: Modell laden
    loader.load(
      url,
      gltf => {
        const model = gltf.scene;
        if (!model) {
          reject(new Error(`⚠️ Kein scene-Objekt in GLTF: ${filename}`));
          return;
        }

        // 🌈 Material anwenden
        model.traverse(child => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: state.colors[group] || entry.model.default_color || 0xB31919,
              transparent: true,
              opacity: state.transparency ?? 1,
            });
          }
        });

        // 🔧 Transformationen setzen
        if (Array.isArray(entry.model.rotation)) {
          model.rotation.set(...entry.model.rotation);
        }
        if (Array.isArray(entry.model.scale)) {
          model.scale.set(...entry.model.scale);
        }

        // 🧠 Metadaten und Name setzen
        model.name = filename;
        model.userData = { meta: entry };

        // 💾 Modell in State speichern
        state.groups[group].push(model);
        state.modelNames.set(model, entry.labels?.en || filename);
        state.groupStates[group][filename] = true;

        // ➕ Szene hinzufügen
        scene.add(model);

        // TODO: Kamera ggf. zentrieren
        resolve();
      },
      undefined,
      error => {
        console.warn(`❌ Fehler beim Laden von ${url}:`, error);
        reject(error);
      }
    );
  });
}