import * as THREE from 'three';

import { dataPath } from '../core/path.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { requestShadowUpdate, freezeShadows } from '../core/renderer.js';
import { animateCameraTo, focusOnObject } from '../core/cameraUtils.js';
import { applyGroupMaterialTweaks } from '../features/appearance.js';
import { loadGroupByName, loadSingleModel } from '../features/modelLoader-core.js';
import { setModelVisibility } from '../features/visibility.js';
import { highlightModel } from '../interaction/highlightModel.js';
import { showInfoPanel } from '../interaction/infoPanel.js';
import { enterIsolatedView, exitIsolatedView } from '../interaction/isolationView.js';
import { isMuskelfinderPreviewMode } from './muskelfinderPreview.js';
import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';
import { updateModelColors } from '../modelLoader/color.js';
import { state } from '../store/state.js';

const MAP_URL = dataPath('muskelfinder-map.json');
const STRUCTURAL_GROUPS = ['bones', 'teeth', 'cartilage', 'ligaments'];
const PREFERRED_MUSCLE_SIDE = 'right';

let mappingPromise = null;

const focusBounds = new THREE.Box3();
const tempBounds = new THREE.Box3();
const focusCenter = new THREE.Vector3();
const focusSize = new THREE.Vector3();

function normalizeLabel(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—-]/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^m\s+/, 'musculus ');
}

function emitDeeplinkEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function createResult(request) {
  return {
    ok: false,
    request,
    group: null,
    matchedBy: null,
    reason: null,
    resolvedIds: [],
    loadedIds: [],
    focus: null
  };
}

function storeResult(result) {
  window.__muskelfinderDeeplink = result;
  return result;
}

function getRequestedTarget() {
  const params = new URLSearchParams(window.location.search);
  const muscleKey = params.get('muscleKey')?.trim() || '';
  const muscle = params.get('muscle')?.trim() || '';
  const source = params.get('source')?.trim() || '';
  const returnTo = sanitizeReturnUrl(params.get('returnTo')?.trim() || '');

  if (!muscleKey && !muscle) {
    return null;
  }

  return {
    muscleKey: muscleKey || null,
    muscle: muscle || null,
    source: source || null,
    returnTo: returnTo || null
  };
}

function sanitizeReturnUrl(value = '') {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(value, window.location.href);
    const isAllowedProtocol = url.protocol === 'http:' || url.protocol === 'https:';
    const isSameOrigin = url.origin === window.location.origin;
    return isAllowedProtocol && isSameOrigin ? url.toString() : '';
  } catch (error) {
    return '';
  }
}

function clearMuskelfinderDeeplinkParams() {
  const url = new URL(window.location.href);
  ['muscleKey', 'muscle', 'source', 'returnTo'].forEach((key) => {
    url.searchParams.delete(key);
  });

  const search = url.searchParams.toString();
  const nextUrl = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
  window.history.replaceState({}, '', nextUrl);
}

function buildIsolationActionBar(request) {
  if (request?.source !== 'muskelfinder') {
    return null;
  }

  return {
    primaryLabel: '← Zurück zum Muskelfinder',
    onPrimary: () => {
      if (request?.returnTo) {
        window.location.href = request.returnTo;
        return;
      }

      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      clearMuskelfinderDeeplinkParams();
      exitIsolatedView();
    }
  };
}

async function getMapping() {
  if (!mappingPromise) {
    mappingPromise = fetch(MAP_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Mapping konnte nicht geladen werden (${response.status})`);
        }
        return response.json();
      })
      .catch((error) => {
        console.warn('⚠️ Muskelfinder-Mapping nicht verfügbar:', error);
        return { version: 1, entries: [] };
      });
  }

  return mappingPromise;
}

function uniqueEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const id = entry?.id || '';
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function getEntrySide(entry) {
  const explicit = String(entry?.classification?.side || '').trim().toLowerCase();
  if (explicit) {
    return explicit;
  }

  const english = String(entry?.labels?.en || '').trim().toLowerCase();
  if (/\bright\b/.test(english)) {
    return 'right';
  }
  if (/\bleft\b/.test(english)) {
    return 'left';
  }

  return '';
}

function preferEntrySide(entries, preferredSide) {
  if (!preferredSide) {
    return entries;
  }

  const preferred = entries.filter((entry) => getEntrySide(entry) === preferredSide);
  return preferred.length ? preferred : entries;
}

function resolveMetaMatchesByLabel(label, group = 'muscles') {
  const target = normalizeLabel(label);
  if (!target) {
    return [];
  }

  return (state.groupedMeta?.[group] || []).filter((entry) => {
    const labels = [
      entry?.labels?.la,
      entry?.labels?.en,
      entry?.labels?.de
    ];
    return labels.some((candidate) => normalizeLabel(candidate) === target);
  });
}

function resolveFromMapping(request, mapping) {
  const entries = Array.isArray(mapping?.entries) ? mapping.entries : [];

  if (request.muscleKey) {
    const keyMatch = entries.find((entry) => entry.muscleKey === request.muscleKey);
    if (keyMatch) {
      return { entry: keyMatch, matchedBy: 'muscleKey' };
    }
  }

  if (!request.muscle) {
    return null;
  }

  const target = normalizeLabel(request.muscle);
  const nameMatch = entries.find((entry) => {
    const names = [
      entry.latinLabel,
      ...(Array.isArray(entry.muskelfinderNames) ? entry.muskelfinderNames : [])
    ];
    return names.some((name) => normalizeLabel(name) === target);
  });

  return nameMatch ? { entry: nameMatch, matchedBy: 'mappingName' } : null;
}

function resolveTargetEntries(request, mapping) {
  const mapped = resolveFromMapping(request, mapping);

  if (mapped?.entry) {
    const group = mapped.entry.group || 'muscles';
    const byId = (mapped.entry.ids || [])
      .map((id) => state.metaById?.[id] || null)
      .filter(Boolean);

    if (byId.length) {
      return {
        group,
        matchedBy: mapped.matchedBy,
        entries: preferEntrySide(uniqueEntries(byId), PREFERRED_MUSCLE_SIDE)
      };
    }

    const fallbackLabel =
      mapped.entry.latinLabel ||
      mapped.entry.muskelfinderNames?.[0] ||
      request.muscle;

    const fallbackMatches = resolveMetaMatchesByLabel(fallbackLabel, group);
    if (fallbackMatches.length) {
      return {
        group,
        matchedBy: mapped.matchedBy,
        entries: preferEntrySide(uniqueEntries(fallbackMatches), PREFERRED_MUSCLE_SIDE)
      };
    }
  }

  if (!request.muscle) {
    return { group: null, matchedBy: null, entries: [] };
  }

  const directMatches = resolveMetaMatchesByLabel(request.muscle, 'muscles');
  return {
    group: directMatches[0]?.classification?.group || null,
    matchedBy: directMatches.length ? 'metaLabel' : null,
    entries: preferEntrySide(uniqueEntries(directMatches), PREFERRED_MUSCLE_SIDE)
  };
}

function findLoadedModel(entry, group) {
  return (state.groups?.[group] || []).find(
    (model) => model?.userData?.meta?.id === entry.id
  ) || null;
}

async function ensureEntryModelLoaded(entry, fallbackGroup, loader) {
  const group = entry?.classification?.group || fallbackGroup || 'other';
  let model = findLoadedModel(entry, group);

  if (!model) {
    model = await loadSingleModel(entry, group, scene, loader);
  }

  if (model) {
    setModelVisibility(model, true);
  }

  return model;
}

async function ensureStructuralContextLoaded() {
  for (const group of STRUCTURAL_GROUPS) {
    if (!state.groups?.[group]?.length) {
      await loadGroupByName(group, { centerCamera: false });
    }

    state.groupStates[group] = true;
    applyGroupMaterialTweaks(group);

    const hex =
      state.colors?.[group] ??
      state.defaultSettings?.colors?.[group] ??
      state.defaultSettings?.defaultColor;

    if (hex != null) {
      updateModelColors(group, hex);
    }

    for (const model of state.groups?.[group] || []) {
      setModelVisibility(model, true);
    }
  }
}

function applyResolvedGroupState(groups) {
  groups.forEach((group) => {
    state.groupStates[group] = true;
    applyGroupMaterialTweaks(group);

    const hex =
      state.colors?.[group] ??
      state.defaultSettings?.colors?.[group] ??
      state.defaultSettings?.defaultColor;

    if (hex != null) {
      updateModelColors(group, hex);
    }
  });

  requestShadowUpdate();
  freezeShadows();
}

function focusOnModels(models) {
  if (!models.length) {
    return null;
  }

  if (models.length === 1) {
    return focusOnObject(camera, controls, models[0], 1.7);
  }

  focusBounds.makeEmpty();

  models.forEach((model) => {
    tempBounds.setFromObject(model);
    if (!tempBounds.isEmpty()) {
      focusBounds.union(tempBounds);
    }
  });

  if (focusBounds.isEmpty()) {
    return null;
  }

  focusBounds.getCenter(focusCenter);
  focusBounds.getSize(focusSize);

  const radius = Math.max(focusSize.x, focusSize.y, focusSize.z) * 1.7;
  const direction = camera.position.clone().sub(controls.target);

  if (direction.lengthSq() < 1e-6) {
    direction.set(0.45, 0.15, 1);
  }

  camera.up.set(0, 1, 0);

  const newPosition = focusCenter
    .clone()
    .add(direction.normalize().multiplyScalar(Math.max(radius, 0.6)));

  animateCameraTo(camera, controls, newPosition, focusCenter.clone(), 650);

  return {
    center: focusCenter.clone(),
    radius
  };
}

export async function handleMuskelfinderDeeplink() {
  const request = getRequestedTarget();
  if (!request) {
    return null;
  }
  const previewMode = isMuskelfinderPreviewMode();

  const result = storeResult(createResult(request));

  try {
    await ensureStructuralContextLoaded();

    const mapping = await getMapping();
    const resolution = resolveTargetEntries(request, mapping);

    result.group = resolution.group;
    result.matchedBy = resolution.matchedBy;
    result.resolvedIds = resolution.entries.map((entry) => entry.id);

    if (!resolution.entries.length) {
      result.reason = 'not-found';
      console.warn('⚠️ Kein 3D-Ziel fuer Muskelfinder-Deep-Link gefunden:', request);
      emitDeeplinkEvent('muskelfinderDeeplinkFailed', result);
      return storeResult(result);
    }

    const loader = createGLTFLoader();
    const models = [];

    for (const entry of resolution.entries) {
      const model = await ensureEntryModelLoaded(entry, resolution.group, loader);
      if (model) {
        models.push(model);
        result.loadedIds.push(entry.id);
      }
    }

    if (!models.length) {
      result.reason = 'load-failed';
      console.warn('⚠️ Deep-Link aufgeloest, aber Modelle konnten nicht geladen werden:', request);
      emitDeeplinkEvent('muskelfinderDeeplinkFailed', result);
      return storeResult(result);
    }

    const groups = [
      ...new Set(
        resolution.entries.map(
          (entry) => entry?.classification?.group || resolution.group || 'other'
        )
      )
    ];

    applyResolvedGroupState(groups);

    const isolationActionBar = buildIsolationActionBar(request);
    enterIsolatedView(models[0], {
      structuralGroups: STRUCTURAL_GROUPS,
      storeSnapshot: true,
      showBackButton: true,
      actionBar: isolationActionBar
    });

    if (!previewMode) {
      highlightModel(models[0]);
      showInfoPanel(models[0]?.userData?.meta || resolution.entries[0], models[0]);
    }

    const focus = focusOnModels(models);
    if (focus) {
      result.focus = {
        center: focus.center.toArray(),
        radius: focus.radius
      };
    }

    result.ok = true;
    window.requestRender?.();

    emitDeeplinkEvent('muskelfinderDeeplinkResolved', result);
    return storeResult(result);
  } catch (error) {
    result.reason = 'error';
    result.error = error?.message || String(error);
    console.error('❌ Fehler im Muskelfinder-Deep-Link:', error);
    emitDeeplinkEvent('muskelfinderDeeplinkFailed', result);
    return storeResult(result);
  }
}
