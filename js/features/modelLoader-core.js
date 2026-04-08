// ============================================
// modelLoader-core.js – stabile Version (Shadows + sRGB Fix)
// ============================================

import * as THREE from 'three';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { controls } from '../core/controls.js';
import { fitCameraToScene } from '../core/cameraUtils.js';
import { modelPath, withBase } from '../core/path.js';
import { registerPickables } from '../features/selection.js';
import { getShadowFlagsForGroup } from '../features/appearance.js';
import { updateModelColors } from '../modelLoader/color.js';
import { state } from '../store/state.js';
import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';
import { setGroupVisibility, showObject, hideObject, setModelVisibility } from '../features/visibility.js';
import { showLoadingBar, hideLoadingBar, updateLoadingBar } from '../modelLoader/progress.js';

// ✅ IMPORT CONFIG für dynamische Performance-Werte
import { getConfig } from '../config/config.js';

// ✅ IMPORT RESOURCE MANAGER für Caching
import { loadWithManager } from '../core/resourceManager.js';



// ✅ GLOBAL LOADER-POOL für bessere Performance
const LOADER_POOL = [];
const MAX_LOADERS = 3;
const RESPONSIVE_BATCH_GROUPS = new Set(['muscles', 'skin_hair']);

function getPooledLoader() {
  if (LOADER_POOL.length === 0) {
    for (let i = 0; i < MAX_LOADERS; i++) {
      LOADER_POOL.push(createGLTFLoader());
    }
  }
  return LOADER_POOL[Math.floor(Math.random() * LOADER_POOL.length)];
}

function getResponsiveBatchSize(groupName, defaultBatchSize, entryCount) {
  const safeDefault = Math.max(1, defaultBatchSize || 1);
  const groupKey = typeof groupName === 'string' ? groupName.toLowerCase() : '';
  if (RESPONSIVE_BATCH_GROUPS.has(groupKey)) {
    return Math.min(safeDefault, 2);
  }
  if (entryCount >= 200) {
    return Math.min(safeDefault, 2);
  }
  if (entryCount >= 80) {
    return Math.min(safeDefault, 3);
  }
  return safeDefault;
}

function shouldYieldBetweenBatches(entryCount, batchSize) {
  return entryCount > batchSize;
}

function waitForBrowserBreather() {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}



// 🔆 Schatten + sRGB Fix für geladene Modelle
function prepareForShadows(root, groupName = root?.userData?.group) {
  const { castShadow, receiveShadow } = getShadowFlagsForGroup(groupName);
  root.traverse((o) => {
    if (!o.isMesh) return;

    // Schatten nur für ausgewählte Gruppen aktivieren
    o.castShadow = castShadow;
    o.receiveShadow = receiveShadow;

    // sRGB nur für „farbige“ Texturen
    const m = o.material;
    if (!m) return;
    if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
    if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
    // (Normal-/Roughness-/Metalness-/AO-Maps bleiben linear, daher kein colorSpace-Set)
  });
  return root;
}


const materialCache = new Map();

function getOrCreateMaterial(color, opacity = 1) {
  const key = `${color}_${opacity}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshLambertMaterial({
      color: color,
      opacity: opacity,
      transparent: opacity < 1
    }));
  }
  return materialCache.get(key);
}



/**
 * Mehrere Modelle einer Gruppe laden (in Batches)
 */
export async function loadModels(entries, group, centerCamera, scene, loader, camera, controls, renderer) {
  if (!entries?.length) {
    console.warn(`⚠️ Keine Modelle für Gruppe "${group}" gefunden.`);
    return;
  }

  showLoadingBar();
  const errors = [];
  let loaded = 0;
  const configuredBatchSize = getConfig('performance.batchSize', 3);
  const batchSize = getResponsiveBatchSize(group, configuredBatchSize, entries.length);
  const useResourceManager = getConfig('features.resourceManager', false);
  const yieldBetweenBatches = shouldYieldBetweenBatches(entries.length, batchSize);

  console.log(`🔄 Lade ${entries.length} Modelle für "${group}" (Batch: ${batchSize}/${configuredBatchSize}, Cache: ${useResourceManager}, Yield: ${yieldBetweenBatches})`);



  console.time(`loadGroup-${group}`);

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (entry) => {
        try {
          await loadSingleModel(entry, group, scene, loader);
          loaded++;
          updateLoadingBar(Math.round((loaded / entries.length) * 100));
        } catch (err) {
          console.error(`❌ Fehler bei ${entry?.id ?? 'unbekannt'}:`, err);
          errors.push({ id: entry?.id, error: err });
        }
      })
    );

    if (yieldBetweenBatches && i + batchSize < entries.length) {
      if (typeof window !== 'undefined') window.requestRender?.();
      await waitForBrowserBreather();
    }
  }

  console.timeEnd(`loadGroup-${group}`);
  hideLoadingBar();

  if (errors.length) {
    console.warn(`⚠️ ${errors.length} Modelle fehlerhaft in Gruppe "${group}":`, errors);
  }

  console.log(`✅ Gruppe "${group}" vollständig geladen! (${loaded} Modelle)`);

  if (centerCamera) {
    try {
      await fitCameraToScene(camera, controls, renderer, scene);
    } catch (err) {
      console.error('❌ Fehler beim Zentrieren der Kamera:', err);
    }
  }
}



/**
 * Genau EIN Modell laden und in Szene + State einhängen
 */
export function loadSingleModel(entry, group, scene, loader) {
  return new Promise((resolve) => {
    try {
      // 1) Variante ermitteln
      const current = entry?.model?.current || 'draco';
      const variant = entry?.model?.variants?.[current];

      // 2) Dateiname mit Fallbacks
      const candidates = [
        variant?.filename, entry?.filename,
        variant?.file, entry?.file,
        variant?.url, entry?.url,
        variant?.src, entry?.src,
      ].filter(v => typeof v === 'string' && v.length > 0);

      const pickBasename = (s) => { try { return s.split('/').pop(); } catch { return s; } };
      const filename = candidates.length ? pickBasename(candidates[0]) : null;

      if (!filename) {
        console.warn(`⚠️ loadSingleModel: Eintrag "${entry?.id ?? 'unbekannt'}" ohne filename – übersprungen.`);
        resolve(null); return;
      }

      // 3) URL bauen
      const variantPath = (variant?.path ?? '').toString().replace(/^\/+|\/+$/g, '');
      const effectiveGroup = group || entry?.classification?.group || 'other';

      const url = variantPath
        ? withBase(`models/${variantPath}/${filename}`)
        : modelPath(filename, effectiveGroup);

      // 4) Laden
      loader.load(
        url,
        (gltf) => {
          const model = gltf?.scene;
          if (!model) {
            console.warn(`⚠️ loadSingleModel: Kein scene-Objekt in GLTF: ${filename}`);
            resolve(null); return;
          }

          // 5) Meta anheften
          const baseName = filename.replace(/\.[^/.]+$/, '');
          model.name = entry?.id || baseName;
          model.userData.meta = entry;
          model.userData.group = effectiveGroup;
          model.userData.isModelRoot = true; // wichtig für getModelRoot()
          model.userData.entry = entry;      // direkter Zugriff im Info-Panel

          // 6) Schatten & Farbraum vorbereiten (🔆)
          prepareForShadows(model, effectiveGroup);

          // 7) Layers (0: Render, 1: Pick)
          model.traverse((ch) => {
            if (!ch.isObject3D) return;
            ch.layers.enable(0);
            ch.layers.enable(1);
          });

          // 8) Pickables registrieren
          registerPickables(model);

          // 9) In State registrieren
          if (!state.groups[effectiveGroup]) state.groups[effectiveGroup] = [];
          state.groups[effectiveGroup].push(model);
          state.modelsByName?.set?.(model, model.name);

          // 10) In Szene einhängen
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
 * Gruppe per Namen laden (nutzt Meta/State)
 */
function applyGroupColor(mesh, groupName) {
  const groupConfig = getConfig().groups?.[groupName];
  if (groupConfig && groupConfig.color) {
    mesh.material = mesh.material.clone();          // kein Shared-Material
    mesh.material.color.setHex(groupConfig.color);  // Farbe setzen
    mesh.material.needsUpdate = false;              // für Farbwechsel nicht nötig
  }
}

// Ensure proper lighting for muscles (nur einmal hinzufügen)
let __lightsAdded = false;
function ensureMuscleLighting(scene) {
  if (__lightsAdded) return;
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  scene.add(ambientLight, directionalLight);
  __lightsAdded = true;
}

/**
 * Gruppe per Namen laden (nutzt Meta/State)
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

    // ✅ FIX: Farbe für ALLE Gruppen anwenden, nicht nur bones/teeth
    const hex = state.colors?.[groupName] ??
      state.defaultSettings?.colors?.[groupName] ??
      state.defaultSettings?.colors?.default;

    if (hex != null) {
      updateModelColors(groupName, hex);
      console.log(`🎨 Farbe für "${groupName}" gesetzt: 0x${hex.toString(16)}`);
    }

    console.log(`✅ loadGroupByName: Gruppe "${groupName}" geladen (${entries.length} Modelle)`);
  } catch (err) {
    console.error(`❌ loadGroupByName: Fehler beim Laden von "${groupName}":`, err);
  }
}


/**
 * Sichtbarkeitszustand einer Gruppe wiederherstellen
 * (Kompatibilität – eigentlicher Ort: groups.js)
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

  // Object: pro Modell
  if (saved && typeof saved === 'object') {
    for (const model of models) {
      const on = saved[model?.name] !== false;
      if (on) showObject(model); else hideObject(model);
    }
    return;
  }

  // Default: alles anzeigen
  for (const model of models) showObject(model);
}
