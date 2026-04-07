import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { setModelVisibility } from '../features/visibility.js';
import { state } from '../store/state.js';

const DEFAULT_STRUCTURAL_GROUPS = ['bones', 'teeth', 'cartilage', 'ligaments'];

let isolationSnapshot = null;
let isolatedModel = null;

function saveVisibilitySnapshot() {
  const snapshot = {};

  for (const [group, models] of Object.entries(state.groups || {})) {
    for (const model of models) {
      snapshot[`${group}::${model.uuid}`] = model.visible;
    }
  }

  return snapshot;
}

function restoreVisibilitySnapshot(snapshot) {
  for (const [group, models] of Object.entries(state.groups || {})) {
    for (const model of models) {
      const key = `${group}::${model.uuid}`;
      if (key in snapshot) {
        setModelVisibility(model, snapshot[key]);
      }
    }
  }
}

function removeIsolationActionBar() {
  document.getElementById('isolation-actions')?.remove();
}

function showIsolationActionBar(actionBar = {}) {
  removeIsolationActionBar();

  const {
    primaryLabel = '← Zurück zur Gesamtansicht',
    onPrimary = () => exitIsolatedView(),
    secondaryLabel = '',
    onSecondary = null
  } = actionBar;

  const container = document.createElement('div');
  container.id = 'isolation-actions';

  const primaryButton = document.createElement('button');
  primaryButton.className = 'isolation-action-btn isolation-action-btn--primary';
  primaryButton.textContent = primaryLabel;
  primaryButton.addEventListener('click', onPrimary);
  container.appendChild(primaryButton);

  if (secondaryLabel && typeof onSecondary === 'function') {
    const secondaryButton = document.createElement('button');
    secondaryButton.className = 'isolation-action-btn isolation-action-btn--secondary';
    secondaryButton.textContent = secondaryLabel;
    secondaryButton.addEventListener('click', onSecondary);
    container.appendChild(secondaryButton);
  }

  document.body.appendChild(container);
}

export function enterIsolatedView(model, options = {}) {
  if (!model) {
    return false;
  }

  const {
    structuralGroups = DEFAULT_STRUCTURAL_GROUPS,
    storeSnapshot = true,
    showBackButton = true,
    actionBar = null
  } = options;

  if (storeSnapshot) {
    isolationSnapshot = saveVisibilitySnapshot();
  }

  isolatedModel = model;

  for (const models of Object.values(state.groups || {})) {
    for (const entry of models) {
      setModelVisibility(entry, false);
    }
  }

  for (const group of structuralGroups) {
    for (const entry of state.groups?.[group] || []) {
      setModelVisibility(entry, true);
    }
  }

  setModelVisibility(model, true);

  if (showBackButton) {
    showIsolationActionBar(actionBar || undefined);
  } else {
    removeIsolationActionBar();
  }

  renderer.render(scene, camera);
  return true;
}

export function exitIsolatedView() {
  if (isolationSnapshot) {
    restoreVisibilitySnapshot(isolationSnapshot);
    isolationSnapshot = null;
  }

  isolatedModel = null;
  removeIsolationActionBar();
  renderer.render(scene, camera);
}

export function getIsolatedModel() {
  return isolatedModel;
}
