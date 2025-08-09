// ============================================
// modelLoader-core.js - KORRIGIERTE VERSION
// ============================================
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
import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';

// --- Features (Sichtbarkeit) - KORRIGIERTE IMPORTS ---
import {
  setGroupVisibility,  // nicht setGroupVisible!
  showObject,
  hideObject,
  setModelVisibility
} from '../features/visibility.js';

// --- Progress UI ---
import { showLoadingBar, hideLoadingBar, updateLoadingBar } from '../modelLoader/progress.js';

/**
 * Lädt mehrere Modelle einer Gruppe
 */
export async function loadModels(entries, group, centerCamera, scene, loader, camera, controls, renderer) {
  if (!entries?.length) {
    console.warn(`⚠️ Keine Modelle für Gruppe "${group}" gefunden.`);
    return;
  }

  showLoadingBar();
  const errors = [];
  let loaded = 0;
  const batchSize = 2;

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

  if (errors.length) {
    console.error(`⚠️ ${errors.length} Modelle fehlerhaft in Gruppe "${group}":`, errors);
  }

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
 * Lädt genau EIN Modell und fügt es der Szene hinzu
 */
export function loadSingleModel(entry, group, scene, loader) {
  return new Promise((resolve) => {
    try {
      // 1) Aktuelle Variante ermitteln
      const current = entry?.model?.current || 'draco';
      const variant = entry?.model?.variants?.[current];

      // 2) Dateiname extrahieren (mit Fallbacks für alte Meta-Struktur)
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

      const pickBasename = (s) => {
        try { return s.split('/').pop(); } catch { return s; }
      };

      const filename = candidates.length ? pickBasename(candidates[0]) : null;

      // 3) Ohne Dateiname → überspringen
      if (!filename) {
        console.warn(`⚠️ loadSingleModel: Eintrag "${entry?.id ?? 'unbekannt'}" ohne filename – wird übersprungen.`);
        resolve(null);
        return;
      }

      // 4) URL bauen mit variant.path (aus neuer Meta-Struktur)
      const variantPath = (variant?.path ?? '').toString().replace(/^\/+|\/+$/g, '');
      const effectiveGroup = group || entry?.classification?.group || 'other';

      const url = variantPath
        ? withBase(`models/${variantPath}/${filename}`)
        : modelPath(filename, effectiveGroup);

      // 5) Laden
      loader.load(
        url,
        (gltf) => {
          const model = gltf?.scene;
          if (!model) {
            console.warn(`⚠️ loadSingleModel: Kein scene-Objekt in GLTF: ${filename}`);
            resolve(null);
            return;
          }

          // Meta-Daten am Model speichern
          const baseName = filename.replace(/\.[^/.]+$/, '');
          model.name = entry?.id || baseName;
          model.userData.meta = entry;
          model.userData.group = effectiveGroup;

          // In state.groups registrieren
          if (!state.groups[effectiveGroup]) {
            state.groups[effectiveGroup] = [];
          }
          state.groups[effectiveGroup].push(model);

          // Model-Name-Mapping speichern
          if (state.modelsByName) {
            state.modelsByName.set(model, model.name);
          }

          // Layer aktivieren
          model.traverse((ch) => {
            if (!ch.isObject3D) return;
            ch.layers.enable(0); // Render
            ch.layers.enable(1); // Pick
          });

          // Zur Szene hinzufügen
          scene.add(model);

          resolve(model);
        },
        undefined, // onProgress
        (err) => {
          console.warn(`⚠️ loadSingleModel: Ladefehler bei "${entry?.id ?? filename}":`, err);
          resolve(null);
        }
      );
    } catch (e) {
      console.warn(`⚠️ loadSingleModel: Unerwarteter Fehler bei "${entry?.id ?? 'unbekannt'}":`, e);
      resolve(null);
    }
  });
}

/**
 * Helper: Gruppe per Namen laden
 */
export async function loadGroupByName(groupName, { centerCamera = false, loaderReuse = null } = {}) {
  try {
    const entries = state.groupedMeta?.[groupName] || [];
    console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${groupName}"...`);

    if (!entries.length) {
      console.warn(`⚠️ loadGroupByName: Keine Einträge für Gruppe "${groupName}" gefunden.`);
      return;
    }

    const loader = loaderReuse ?? createGLTFLoader();
    await loadModels(entries, groupName, centerCamera, scene, loader, camera, controls, renderer);
    console.log(`✅ loadGroupByName: Gruppe "${groupName}" geladen (${entries.length} Modelle)`);

  } catch (err) {
    console.error(`❌ loadGroupByName: Fehler beim Laden von "${groupName}":`, err);
  }
}

/**
 * Stellt den Sichtbarkeitszustand einer Gruppe wieder her
 * HINWEIS: Diese Funktion sollte eigentlich aus groups.js kommen,
 * aber für Abwärtskompatibilität behalten wir sie hier
 */
export function restoreGroupState(groupName) {
  if (!groupName || typeof groupName !== 'string') return;
  if (!(groupName in state.groups)) return;

  const models = state.groups?.[groupName];
  const saved = state.groupStates?.[groupName];

  if (!Array.isArray(models)) return;

  // Boolean: gesamte Gruppe
  if (typeof saved === 'boolean') {
    setGroupVisibility(groupName, saved);
    return;
  }

  // Object: einzelne Modelle
  if (saved && typeof saved === 'object') {
    for (const model of models) {
      const on = saved[model?.name] !== false;
      if (on) showObject(model);
      else hideObject(model);
    }
    return;
  }

  // Default: alles anzeigen
  for (const model of models) showObject(model);
}