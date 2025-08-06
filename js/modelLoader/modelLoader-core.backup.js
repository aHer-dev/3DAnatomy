// modelLoader-core.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js';
import { getModelPath } from '../utils.js';
import { state } from '../state.js';
import { showLoadingBar, updateLoadingBar, hideLoadingBar } from './modelLoader-progress.js';


/**
 * Lädt mehrere Modelle anhand der gegebenen Meta-Entries.
 * @param {Array} entries - Liste von Metaeinträgen
 * @param {string} group - Gruppenname (z. B. "bones")
 * @param {boolean} centerCamera - Ob nach dem ersten Modell Kamera gesetzt werden soll
 * @param {THREE.Scene} scene
 * @param {THREE.GLTFLoader} loader
 */
export async function loadModels(entries, group, centerCamera, scene, loader, camera, controls, renderer) {
  if (!Array.isArray(entries) || entries.length === 0) return;

  showLoadingBar();

  // 📦 Paralleles Laden aller Modelle
  await Promise.all(entries.map(async (entry, i) => {
    try {
      await loadSingleModel(entry, group, scene, loader, camera, controls, i === 0 && centerCamera);
    } catch (err) {
      console.warn(`⚠️ Modell ${entry.id} konnte nicht geladen werden:`, err);
    }
  }));

  hideLoadingBar();

  // 🧭 Kamera zentrieren nach erstem Modell
  if (centerCamera) {
    fitCameraToScene(camera, controls, renderer, scene);
  }

  // 📋 Log zum Abschluss
  console.log(`✅ Gruppe "${group}" vollständig geladen! (${state.groups[group]?.length || 0} Modelle)`);
}

/**
 * Lädt ein einzelnes Modell anhand des Meta-Eintrags.
 * @param {Object} entry - Metaeintrag mit model.filename, model.path, etc.
 * @param {string} group - z. B. "bones"
 * @param {THREE.Scene} scene
 * @param {THREE.GLTFLoader} loader
 * @param {boolean} focusCamera - Kamera ggf. auf das Modell zentrieren
 */
export async function loadSingleModel(entry, group, scene, loader, camera, controls, focusCamera = false) {
  return new Promise((resolve, reject) => {
    // 🔒 Sicherheitsprüfung: Variantenstruktur vorhanden
    const currentVariant = entry.model.current || state.defaultSettings.modelVariant || 'draco';
    const variant = entry.model.variants?.[currentVariant];

    if (!variant || !variant.filename || !variant.path) {
      console.warn('⚠️ Ungültiger Modell-Variant-Eintrag bei:', entry.id, '| Variante:', currentVariant);
      resolve(); // Überspringen, aber Promise auflösen, um loadModels fortzusetzen
      return;
    }

    // 🧠 Pfad- und Dateiname aus der gewählten Variante
    const filename = variant.filename;
    const subfolder = variant.path;
    const url = `models/${subfolder}/${filename}`.replace(/\/+/g, '/');

    // 🧪 Debug-Ausgabe (nur 1 Log)
    console.log('📦 Lade Modell:', { id: entry.id, filename, group, path: subfolder, url });

    // 🔍 Duplikat-Prüfung VOR dem Hinzufügen
    if (state.groups[group]?.some(m => m.name === filename)) {
      console.warn(`⚠️ Modell ${filename} bereits geladen – übersprungen.`);
      resolve();
      return;
    }

    // 🧠 Modell laden
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        if (!model) {
          reject(new Error(`⚠️ Kein scene-Objekt in GLTF: ${filename}`));
          return;
        }

        // 🌈 Material anwenden
        model.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: state.colors[group] || entry.model.default_color || state.defaultSettings.defaultColor || 0xcccccc, // Fallback aus state
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
        state.groups[group] = state.groups[group] || []; // Sicherstellen, dass Array existiert
        state.groups[group].push(model);
        state.modelNames.set(model, entry.labels?.en || filename);
        state.groupStates[group][filename] = true;

        // ➕ Szene hinzufügen
        scene.add(model);

        // 🎯 Kamera zentrieren, wenn focusCamera=true
        if (focusCamera) {
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          camera.position.set(center.x, center.y + 1, center.z + 2); // Heuristische Position
          camera.lookAt(center);
          controls.target.copy(center);
          controls.update();
        }

        resolve();
      },
      undefined,
      (error) => {
        console.warn(`❌ Fehler beim Laden von ${url}:`, error);
        reject(error);
      }
    );
  });
}