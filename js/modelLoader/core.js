/**
 * @file modelLoader-core.js
 * @description Lädt GLTF-Modelle in Gruppen, zeigt Ladefortschritt an und zentriert optional die Kamera.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js';
import { getModelPath } from '../utils.js';
import { state } from '../state.js';
import { showLoadingBar, updateLoadingBar, hideLoadingBar } from './progress.js';
import { fitCameraToScene } from '../cameraUtils.js';

/**
 * Lädt mehrere Modelle anhand der übergebenen Meta-Einträge.
 * Zeigt einen Ladebalken für den Fortschritt und zentriert die Kamera optional nach dem Laden.
 *
 * @param {Array<Object>} entries - Meta-Daten zu den Modellen (enthält filename, path, rotation, scale, labels).
 * @param {string} group - Gruppenname, unter dem die Modelle in state.groups abgelegt werden.
 * @param {boolean} centerCamera - Wenn true, wird nach dem Laden der ersten Datei die Kamera passend gesetzt.
 * @param {THREE.Scene} scene - Szene, in die die Modelle eingefügt werden.
 * @param {THREE.GLTFLoader} loader - GLTFLoader zum Einlesen der Dateien.
 * @param {THREE.Camera} camera - Kamera, die ggf. neu positioniert wird.
 * @param {THREE.OrbitControls} controls - Steuerung für die Kamera, um fitCameraToScene zu ermöglichen.
 * @param {THREE.Renderer} renderer - Renderer, um die Szene neu zu zeichnen.
 */
export async function loadModels(entries, group, centerCamera, scene, loader, camera, controls, renderer) {
  // Abbruch, falls keine Einträge übergeben wurden
  if (!Array.isArray(entries) || entries.length === 0) {
    console.warn(`Keine Modelle für Gruppe "${group}" gefunden.`);
    return;
  }

  // Ladebalken einblenden
  showLoadingBar();

// Alle Modelle nacheinander laden
for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  const currentVariant = entry.model.current || state.defaultSettings.modelVariant || 'draco';
  const variant = entry.model.variants?.[currentVariant];

  if (!variant || !variant.filename || !variant.path) {
    console.warn(`⛔ Kein gültiger Modell-Pfad für Eintrag ${entry.id} (${currentVariant}). Übersprungen.`);
    continue;
  }

  const filename = variant.filename;

  console.log("🧩 Lade Modell:", entry.id, filename);

  try {
    await loadSingleModel(entry, group, scene, loader, camera, controls, i === 0 && centerCamera);

    // 📏 Debug: BoundingBox und Mittelpunkt
    const lastModel = state.groups[group][state.groups[group].length - 1];
    const box = new THREE.Box3().setFromObject(lastModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log("📐 Modell:", filename, "– Größe:", size, "Zentrum:", center);

    // Optional Kameraausrichtung
    if (i === 0) {
      fitCameraToScene(camera, controls, renderer, scene);
    }

  } catch (err) {
    console.error(`❌ Fehler beim Laden von ${filename}:`, err);
  }

  updateLoadingBar(Math.round(((i + 1) / entries.length) * 100));
}


  // Ladebalken ausblenden
  hideLoadingBar();

  // Kamera passend zur Szene setzen, falls gewünscht
  if (centerCamera) {
    fitCameraToScene(camera, controls, renderer, scene);
  }

  console.log(`Alle Modelle für Gruppe "${group}" geladen.`);
}

/**
 * Lädt ein einzelnes GLTF-Modell und fügt es der Szene hinzu.
 * Wendet Material, Transformationen und Metadaten an.
 *
 * @param {Object} entry - Meta-Eintrag mit Feldern: model.filename, model.path, model.rotation, model.scale, labels
 * @param {string} group - Name der Gruppe, in die das Modell einsortiert wird.
 * @param {THREE.Scene} scene - Zielszene für das Modell.
 * @param {THREE.GLTFLoader} loader - Loader-Instanz zum Einlesen der Datei.
 * @param {boolean} focusCamera - Wenn true, könnte hier die Kamera auf das Modell positioniert werden.
 * @returns {Promise<void>} Promise, die beim Abschluss des Ladevorgangs aufgelöst wird.
 */
export function loadSingleModel(entry, group, scene, loader, camera, controls, focusCamera = false) {
  return new Promise((resolve, reject) => {
    // 🔒 Sicherheitsprüfung: Variantenstruktur vorhanden?
    const variant = entry?.model?.variants?.[entry?.model?.current];
    if (!variant || !variant.filename || !variant.path) {
      console.warn("⛔ Modell ohne gültige Variantenstruktur übersprungen:", entry?.id || entry);
      resolve();
      return;
    }

    // ✅ Pfad korrekt zusammensetzen
    const filename = variant.filename;
    const path = variant.path;
    const url = `models/${path}/${filename}`.replace(/\/+/g, '/');

    // 📦 Modell laden
    loader.load(
      url,
      gltf => {
        const model = gltf.scene;
        if (!model) {
          reject(new Error(`Kein scene-Objekt in GLTF: ${filename}`));
          return;
        }

        // 🎨 Material anwenden
        model.traverse(child => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: state.colors[group] || entry.model.default_color || 0xB31919,
              transparent: true,
              opacity: 1 // Du kannst das später dynamisch anpassen
            });
          }
        });

        // 🔁 Rotation & Skalierung aus Metadaten setzen
        if (Array.isArray(entry.model.rotation)) {
          model.rotation.set(...entry.model.rotation);
        }
        if (Array.isArray(entry.model.scale)) {
          model.scale.set(...entry.model.scale);
        } else {
          model.scale.set(1, 1, 1); // Fallback
        }

        // 🏷️ Metadaten zuweisen
        model.name = filename;
        model.userData = { meta: entry };
        state.groups[group].push(model);
        state.modelNames.set(model, entry.labels?.en || filename);
        state.groupStates[group][filename] = true;

        // ➕ Modell zur Szene hinzufügen
        scene.add(model);

        // 📐 Debug-Info: Bounding-Box
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        console.log("📐 Modell:", entry.id || filename, "– Größe:", size, "Zentrum:", center);

        // 🎯 Optional Kamera-Ausrichtung
        if (focusCamera) {
          // Kamera auf das erste Modell fokussieren
          camera.position.set(center.x, center.y + 1, center.z + 2); // einfache heuristische Position
          camera.lookAt(center);
          controls.target.copy(center);
          controls.update();
        }

        resolve(); // 🟢 Versprochenes Ergebnis liefern
      },
      undefined,
      error => {
        console.warn(`❌ Fehler beim Laden von ${url}:`, error);
        reject(error);
      }
    );
  });
}

