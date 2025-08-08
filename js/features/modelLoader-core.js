/**
    * @file modelLoader-core.js
    * @description Lädt GLTF-Modelle in Gruppen, zeigt Ladefortschritt an und zentriert optional die Kamera.
    */
   import * as THREE from 'three';
   import { createGLTFLoader /*, disposeGLTFLoader*/ } from '../loaders/gltfLoaderFactory.js';
   import { modelPath } from '../core/path.js';
   import { scene } from '../core/scene.js';
   import { camera } from '../core/camera.js';
   import { renderer } from '../core/renderer.js';
   import { controls } from '../core/controls.js';
   import { state } from '../store/state.js';
   import { showLoadingBar, hideLoadingBar, updateLoadingBar } from '../modelLoader/progress.js';
   import { fitCameraToScene } from '../core/cameraUtils.js';

   export async function loadModels(entries, group, centerCamera, scene, loader, camera, controls, renderer) {
     if (!entries?.length) {
       console.warn(`⚠️ Keine Modelle für Gruppe "${group}" gefunden.`);
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
             console.error(`❌ Fehler bei ${entry.id}:`, err);
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
       try {
         fitCameraToScene(camera, controls, renderer, scene);
       } catch (err) {
         console.error('❌ Fehler beim Zentrieren der Kamera:', err);
       }
     }
   }

   export async function loadSingleModel(entry, group, scene, loader, camera, controls) {
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

      // console.log('📦 Lade Modell:', { id: entry.id, filename, group, path, url });

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

           

           model.traverse(child => {
             if (child.isMesh || child.type === 'Group') {
               state.modelNames.set(child, entry.labels?.en || filename);
             }
           });


           state.groupStates[group] = state.groupStates[group] || {};
           state.groupStates[group][filename] = true;

           scene.add(model);

           if (!window.process || !window.process.env || window.process.env.NODE_ENV !== 'production') {
             const box = new THREE.Box3().setFromObject(model);
             const size = box.getSize(new THREE.Vector3());
             const center = box.getCenter(new THREE.Vector3());
             //console.log("📐 Modell:", entry.id || filename, "– Größe:", size, "Zentrum:", center);
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

   // --- Helper: komplette Gruppe per Namen laden -------------------------------
// Lädt alle Einträge einer Gruppe aus state.groupedMeta via loadModels()
// Optional: centerCamera = true, um danach zu zentrieren
// Optional: loaderReuse: vorhandene GLTFLoader-Instanz wiederverwenden
  export async function loadGroupByName(groupName, { centerCamera = false, loaderReuse = null } = {}) {
  try {
    const entries = state.groupedMeta?.[groupName] || [];
    if (!entries.length) {
      console.warn(`⚠️ loadGroupByName: Keine Einträge für Gruppe "${groupName}" gefunden.`);
      return;
    }

    // Falls kein Loader gereicht wurde → frische Factory (Best Practice: 1 Loader pro Ladevorgang ok)
    const loader = loaderReuse ?? createGLTFLoader();

    await loadModels(entries, groupName, centerCamera, scene, loader, camera, controls, renderer);
    console.log(`✅ loadGroupByName: Gruppe "${groupName}" geladen (${entries.length} Modelle)`);
  } catch (err) {
    console.error(`❌ loadGroupByName: Fehler beim Laden von "${groupName}":`, err);
  }
  }