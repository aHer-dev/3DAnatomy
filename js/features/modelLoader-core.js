/**
 * @file modelLoader-core.js
 * @description Lädt GLTF-Modelle in Gruppen, zeigt Ladefortschritt an und zentriert optional die Kamera.
 */
import * as THREE from 'three';

// --- Core ---
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { controls } from '../core/controls.js';
import { fitCameraToScene } from '../core/cameraUtils.js';
import { modelPath, withBase } from '../core/path.js';

// --- State ---
import { state } from '../store/state.js';

// --- Loader ---
import { createGLTFLoader /* , disposeGLTFLoader */ } from '../loaders/gltfLoaderFactory.js';

// --- Features (Sichtbarkeit) ---
import { setGroupVisible, showObject, hideObject } from '../features/visibility.js';

// --- Progress UI ---
import { showLoadingBar, hideLoadingBar, updateLoadingBar } from '../modelLoader/progress.js';


   export async function loadModels(entries, group, centerCamera, scene, loader, camera, controls, renderer) {
     if (!entries?.length) {
       console.warn(`⚠️ Keine Modelle für Gruppe "${group}" gefunden.`);
       return;
     }

     showLoadingBar();
     const errors = [];
     let loaded = 0;
     const batchSize = 2;  // GELADENE MODELLE PRO ZYKLUS WENIGER SCHONT VRAM ETC

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

/**
 * Lädt genau EIN Modell (ein Eintrag aus meta.json) und fügt es der Szene hinzu.
 * - Robust gegen fehlende/abweichende Dateifelder
 * - Nutzt variants[current].path, wenn vorhanden (z. B. 'teeth', 'muscles/arm')
 * - Setzt Layer 0 (Render) + 1 (Pick) standardmäßig aktiv
 * - ⚠️ Überspringt Einträge ohne Dateiangabe (Warnung), statt die Gruppe zu crashen
 *
 * @param {object} entry   - Meta-Eintrag (mind. id, classification?, model?)
 * @param {string} group   - Gruppenname (Fallback, falls kein variants.path)
 * @param {THREE.Scene} scene
 * @param {GLTFLoader} loader
 * @returns {Promise<THREE.Object3D|null>} - Das geladene Root-Objekt oder null (bei Skip/Fehler)
 */
export function loadSingleModel(entry, group, scene, loader /* , camera, controls */) {
  return new Promise((resolve) => {
    try {
      // 1) Aktuelle Variante aus der Meta ermitteln (kann fehlen -> null)
      const current = entry?.model?.current;
      const variant = current ? entry?.model?.variants?.[current] : null;

      // 2) Mögliche Dateifeldernamen (erste gültige nehmen)
      const candidates = [
        variant?.filename,
        entry?.filename,
        variant?.file,
        entry?.file,
        variant?.url,
        entry?.url,
        variant?.src,
        entry?.src,
      ].filter(v => typeof v === 'string' && v.length > 0);

      // 3) Basename extrahieren, falls URL enthalten ist (…/foo/bar.glb -> bar.glb)
      const pickBasename = (s) => {
        try { return s.split('/').pop(); } catch { return s; }
      };
      const filename = candidates.length ? pickBasename(candidates[0]) : null;

      // 4) Falls KEIN Dateiname -> nur warnen und überspringen (kein Reject, kein Crash)
      if (!filename) {
        console.warn(`⚠️ loadSingleModel: Eintrag "${entry?.id ?? 'unbekannt'}" ohne filename/url – wird übersprungen.`);
        resolve(null);
        return;
      }

      // 5) URL bauen:
      //    - Wenn variant.path existiert, nutzen wir das (z. B. 'teeth', 'muscles/arm')
      //    - Sonst dein Standard: models/<group>/<filename>
      const variantPath = (variant?.path ?? '').toString().replace(/^\/+|\/+$/g, '');
      const effectiveGroup = (group ?? entry?.classification?.group ?? 'other').toString();
      const url = variantPath
        ? withBase(`models/${variantPath}/${filename}`)  // z. B. models/teeth/FJ123.glb
        : modelPath(filename, effectiveGroup);          // z. B. models/bones/FJ123.glb

      // 6) Laden
      loader.load(
        url,
        (gltf) => {
          const model = gltf?.scene;
          if (!model) {
            console.warn(`⚠️ loadSingleModel: Kein scene-Objekt in GLTF: ${filename} – skip`);
            resolve(null);
            return;
          }

          // ➕ Meta & stabiler Name am Root (macht Klick→Info trivial)
          const baseName = filename.replace(/\.[^/.]+$/, ''); // 'FJ3368001.glb' -> 'FJ3368001'
          model.name = entry?.id || baseName;
          model.userData.meta = entry;

          // ➕ in state.groups registrieren (wichtig für restoreGroupState & UI)
          (state.groups[group] ||= []).push(model);



          // 7) Standard-Layer aktivieren: Render (0) + Pick (1)
          model.traverse((ch) => {
            if (!ch.isObject3D) return;
            ch.layers.enable(0); // Render
            ch.layers.enable(1); // Pick
          });

          // 8) Optionale Benennung (hilft beim Debuggen/Info-Panel)
          model.name = entry?.id || filename;

          // 9) Zur Szene hinzufügen
          scene.add(model);

          resolve(model); // ✅ erfolgreich geladen
        },
        undefined, // onProgress (optional)
        (err) => {
          console.warn(`⚠️ loadSingleModel: Ladefehler bei "${entry?.id ?? filename}" → wird übersprungen:`, err);
          resolve(null); // ⚠️ Fehler beim Einzelmodell: nicht crashen, sondern skip
        }
      );
    } catch (e) {
      console.warn(`⚠️ loadSingleModel: Unerwarteter Fehler bei "${entry?.id ?? 'unbekannt'}" – skip:`, e);
      resolve(null);
    }
  });
   }

   // --- Helper: komplette Gruppe per Namen laden -------------------------------
// Lädt alle Einträge einer Gruppe aus state.groupedMeta via loadModels()
// Optional: centerCamera = true, um danach zu zentrieren
// Optional: loaderReuse: vorhandene GLTFLoader-Instanz wiederverwenden
export async function loadGroupByName(
  groupName,
  { centerCamera = false, loaderReuse = null } = {}
) {
  try {
    const entries = state.groupedMeta?.[groupName] || [];
    console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${groupName}"...`);
    if (!entries.length) {
      console.warn(`⚠️ loadGroupByName: Keine Einträge für Gruppe "${groupName}" gefunden.`);
      return;
    }

    // Eine Loader-Instanz für diesen Ladevorgang
    const loader = loaderReuse ?? createGLTFLoader();

    // Delegieren: eigentliche Arbeit macht loadModels()
    await loadModels(entries, groupName, centerCamera, scene, loader, camera, controls, renderer);

    console.log(`✅ loadGroupByName: Gruppe "${groupName}" geladen (${entries.length} Modelle)`);
  } catch (err) {
    console.error(`❌ loadGroupByName: Fehler beim Laden von "${groupName}":`, err);
  }
}

export function restoreGroupState(groupName) {
  // Ungültiger Name → no-op
  if (!groupName || typeof groupName !== 'string') return;

  // Falls die Gruppe noch nicht initialisiert ist → no-op (keine Warnung)
  const models = state.groups?.[groupName];
  const saved = state.groupStates?.[groupName];
  if (!Array.isArray(models)) return;

  // Fall A: kompletter Gruppen-Flag (boolean)
  if (typeof saved === 'boolean') {
    setGroupVisible(groupName, saved);
    return;
  }

  // Fall B: Map je Modellname (object) – default pro Modell: sichtbar
  if (saved && typeof saved === 'object') {
    for (const model of models) {
      const on = saved[model?.name] !== false; // default: true
      if (on) showObject(model); else hideObject(model);
    }
    return;
  }

  // Fallback: kein gespeicherter Zustand → alles anzeigen
  for (const model of models) showObject(model);
}