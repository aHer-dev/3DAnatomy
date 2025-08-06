/**
 * @file modelLoader-core.js
 * @description Lädt GLTF-Modelle in Gruppen, zeigt Ladefortschritt an und zentriert optional die Kamera.
 */
import { THREE, scene, camera, renderer, loader, controls } from '../init.js';
import { state } from '../state.js';
import { showLoadingBar, updateLoadingBar, hideLoadingBar } from './progress.js';
import { fitCameraToScene } from '../cameraUtils.js';

export async function loadModels(entries, group, centerCamera, scene, loader, camera, controls, renderer) {
  if (!entries?.length) {
    console.warn(`Keine Modelle für Gruppe "${group}" gefunden.`);
    return;
  }

  showLoadingBar();
  const errors = [];
  let loaded = 0;
  const batchSize = navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency * 2, 20) : 10;

  console.time(`loadGroup-${group}`);
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (entry) => {
        try {
          await loadSingleModel(entry, group, scene, loader, camera, controls);
          loaded++;
          updateLoadingBar(Math.round((loaded / entries.length) * 100));
        } catch (err) {
          console.error(`Fehler bei ${entry.id}:`, err);
          errors.push({ id: entry.id, error: err });
        }
      })
    );
  }
  console.timeEnd(`loadGroup-${group}`);

  hideLoadingBar();
  if (errors.length) console.error(`⚠️ ${errors.length} Modelle fehlerhaft in Gruppe "${group}":`, errors);
  console.log(`✅ Gruppe "${group}" vollständig geladen! (${loaded} Modelle)`);

  if (centerCamera) {
    fitCameraToScene(camera, controls, renderer, scene);
  }
}

export function loadSingleModel(entry, group, scene, loader, camera, controls) {
  return new Promise((resolve, reject) => {
    const variant = entry?.model?.variants?.[entry?.model?.current];
    if (!variant || !variant.filename || !variant.path) {
      console.warn("⛔ Modell ohne gültige Variantenstruktur übersprungen:", entry?.id || entry);
      resolve();
      return;
    }

    const filename = variant.filename;
    const path = variant.path;
    const url = `models/${path}/${filename}`.replace(/\/+/g, '/');

    if (state.groups[group]?.some(m => m.name === filename)) {
      console.warn(`⚠️ Modell ${filename} bereits geladen – übersprungen.`);
      resolve();
      return;
    }

    console.log('📦 Lade Modell:', { id: entry.id, filename, group, path, url });

    loader.load(
      url,
      gltf => {
        const model = gltf.scene;
        if (!model) {
          reject(new Error(`Kein scene-Objekt in GLTF: ${filename}`));
          return;
        }

        model.traverse(child => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: state.colors[group] || entry.model.default_color || state.defaultSettings.defaultColor,
              transparent: true,
              opacity: state.transparency ?? 1,
            });
          }
        });

        if (Array.isArray(entry.model.rotation)) {
          model.rotation.set(...entry.model.rotation);
        }
        if (Array.isArray(entry.model.scale)) {
          model.scale.set(...entry.model.scale);
        } else {
          model.scale.set(1, 1, 1);
        }

        model.name = filename;
        model.userData = { meta: entry };
        state.groups[group] = state.groups[group] || [];
        state.groups[group].push(model);
        state.modelNames.set(model, entry.labels?.en || filename);
        state.groupStates[group] = state.groupStates[group] || {};
        state.groupStates[group][filename] = true;

        scene.add(model);

        if (!window.process || !window.process.env || window.process.env.NODE_ENV !== 'production') {
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          console.log("📐 Modell:", entry.id || filename, "– Größe:", size, "Zentrum:", center);
        }

        resolve();
      },
      undefined,
      error => {
        console.warn(`❌ Fehler beim Laden von ${url}:`, error);
        reject(error);
      },
      { signal: AbortSignal.timeout(10000) }
    );
  });
}