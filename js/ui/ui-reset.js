// js/ui/ui-reset.js
// Aufgabe:
// 1) setupResetUI(): Bindet den Button #btn-reset so, dass die Kamera auf die
//    in der Config definierten Defaults zurückgesetzt wird.
// 2) resetApp(): Führt einen "vollen" Reset durch: Szene leeren, Basisgruppen
//    neu laden, Sammlung wiederherstellen, Gruppenfarben auf Defaults setzen.

import { state } from '../store/state.js';
import { hideInfoPanel } from '../interaction/infoPanel.js';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { updateModelColors } from '../modelLoader/color.js';
import { loadGroupByName } from '../features/modelLoader-core.js';
import { setCameraToDefault } from '../core/cameraUtils.js';
import { getConfig } from '../config/config.js';
import { setModelVisibility } from '../features/visibility.js';
import { registerPickables, unregisterPickables } from '../features/selection.js';
import { disposeObject3D } from '../modelLoader/cleanup.js';



// ---------------------------------------------------------------
// 1) LEICHTER RESET: Kamera auf Config-Defaults (Button #btn-reset)
// ---------------------------------------------------------------
export function setupResetUI() {
  const btn = document.getElementById('btn-reset');
  if (!btn) {
    console.warn('Reset-Button (#btn-reset) nicht gefunden');
    return;
  }

  btn.addEventListener('click', () => {
    // FIX: Nicht alle Modelle sichtbar machen!
    // Stattdessen nur die gewünschten Gruppen
    resetToDefaultView();

    // Kamera auf Config-Defaults
    setCameraToDefault(camera, controls);
    if (typeof controls?.saveState === 'function') controls.saveState();

    renderer.render(scene, camera);
    console.log('✅ Reset: Ansicht zurückgesetzt');
  }, { passive: true });
}

function resetToDefaultView() {
  // Alle Gruppen durchgehen
  Object.keys(state.groups || {}).forEach(groupName => {
    const models = state.groups[groupName] || [];

    // NUR bones und teeth sichtbar machen
    const shouldBeVisible = (groupName === 'bones' || groupName === 'teeth');

    models.forEach(model => {
      setModelVisibility(model, shouldBeVisible);
      if (shouldBeVisible) {
        registerPickables(model);
      } else {
        unregisterPickables(model);
      }
    });

    // State entsprechend setzen
    state.groupStates[groupName] = shouldBeVisible;
  });

  // Sammlung-Modus verlassen
  if (state.modes) {
    state.modes.collection = false;
  }
}

function ensureOnlyBasicGroupsVisible() {
  Object.keys(state.groups || {}).forEach(groupName => {
    const models = state.groups[groupName] || [];
    const shouldBeVisible = (groupName === 'bones' || groupName === 'teeth');

    models.forEach(model => {
      if (model && model.parent) { // Nur wenn Modell noch in Szene
        setModelVisibility(model, shouldBeVisible);

        // Debug
        if (!shouldBeVisible && model.visible) {
          console.warn(`⚠️ Gruppe "${groupName}" sollte unsichtbar sein, ist aber sichtbar!`);
        }
      }
    });
  });
}



export async function resetApp() {
  console.log('🔄 Reset gestartet (zurück zu bones + teeth)...');

  showResetLoadingOverlay();

  try {
    hideInfoPanel?.();

    // SCHRITT 1: Sammlung KOMPLETT leeren
    updateResetProgress('Leere Sammlung...', 10);
    state.collection = [];

    // SCHRITT 2: Auswahl zurücksetzen
    state.selected = { root: null, mesh: null, point: null, meta: null };
    state.currentlySelected = null;

    // SCHRITT 3: ALLE Modelle aus Szene entfernen und entsorgen
    updateResetProgress('Räume Szene komplett auf...', 20);
    const toRemove = [];
    scene.traverse(child => {
      if (child.userData?.isModelRoot) {
        toRemove.push(child);
      }
    });

    // FIX: Modelle wirklich entsorgen, nicht nur aus Szene entfernen
    for (const obj of toRemove) {
      unregisterPickables(obj);
      scene.remove(obj);
      disposeObject3D(obj); // Speicher freigeben
    }

    // SCHRITT 4: State VOLLSTÄNDIG zurücksetzen
    updateResetProgress('Setze Gruppenstatus zurück...', 30);

    // FIX: Alle Gruppen-Arrays leeren
    Object.keys(state.groups || {}).forEach(groupName => {
      // Array leeren, nicht nur neu zuweisen
      if (state.groups[groupName]) {
        state.groups[groupName].length = 0;
      }
      state.groupStates[groupName] = false;
    });

    // Pickable-Set leeren
    state.pickableMeshes?.clear?.();

    // Sammlungsmodus definitiv aus
    if (state.modes) {
      state.modes.collection = false;
    }

    // SCHRITT 5: NUR bones und teeth neu laden
    updateResetProgress('Lade Basis-Skelett...', 50);

    try {
      await loadGroupByName('bones', { centerCamera: false });
      state.groupStates.bones = true;

      await loadGroupByName('teeth', { centerCamera: false });
      state.groupStates.teeth = true;
    } catch (err) {
      console.error('❌ Fehler beim Laden der Basis-Gruppen:', err);
    }

    // SCHRITT 6: UI-Buttons zurücksetzen
    updateResetProgress('Aktualisiere UI...', 70);
    resetAllButtonStates();

    // SCHRITT 7: GroupToggle zurücksetzen
    resetGroupToggleStates();

    // SCHRITT 8: Farben zurücksetzen
    updateResetProgress('Setze Farben zurück...', 85);
    resetColors();

    // SCHRITT 9: Kamera zurücksetzen
    setCameraToDefault(camera, controls);
    if (typeof controls?.saveState === 'function') controls.saveState();

    // SCHRITT 10: Sicherstellen dass NUR bones/teeth sichtbar sind
    updateResetProgress('Finalisiere...', 95);
    ensureOnlyBasicGroupsVisible();

    updateResetProgress('Fertig!', 100);
    await new Promise(resolve => setTimeout(resolve, 500));

    renderer.render(scene, camera);

    console.log('✅ Reset abgeschlossen: NUR bones + teeth');
    debugResetState();

  } catch (err) {
    console.error('❌ Fehler beim Reset:', err);
  } finally {
    hideResetLoadingOverlay();
  }
}

function showResetLoadingOverlay() {
  let overlay = document.getElementById('reset-loading-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'reset-loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <h3>Reset läuft</h3>
        <p id="reset-progress-text">Bereite vor...</p>
        <div class="loading-bar">
          <div id="reset-progress-fill" class="loading-bar-fill"></div>
        </div>
      </div>
    `;

    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;

    document.body.appendChild(overlay);
  }

  overlay.style.display = 'flex';
}

function updateResetProgress(text, percent) {
  const textEl = document.getElementById('reset-progress-text');
  const fillEl = document.getElementById('reset-progress-fill');

  if (textEl) textEl.textContent = text;
  if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

function hideResetLoadingOverlay() {
  const overlay = document.getElementById('reset-loading-overlay');
  if (overlay) overlay.style.display = 'none';
}


function resetAllButtonStates() {
  const allGroups = [
    'bones', 'teeth', 'muscles', 'tendons', 'arteries', 'brain',
    'cartilage', 'ear', 'eyes', 'glands', 'heart', 'ligaments',
    'lungs', 'nerves', 'organs', 'skin_hair', 'veins'
  ];

  allGroups.forEach(group => {
    const btn = document.getElementById(`btn-load-${group}`);
    if (!btn) return;

    const isBasicGroup = (group === 'bones' || group === 'teeth');

    if (isBasicGroup) {
      // Bones und Teeth als geladen markieren
      btn.style.backgroundColor = '#2a5a2a';
      btn.textContent = '✓ ' + group.charAt(0).toUpperCase() + group.slice(1) + ' ▼';
    } else {
      // Alle anderen als NICHT geladen markieren
      btn.style.backgroundColor = '';
      btn.textContent = group.charAt(0).toUpperCase() + group.slice(1) + ' ▼';
    }
  });
}
// Hilfsfunktion: gespeicherte Sammlung wieder auf geladene Modelle mappen
// ---------------------------------------------------------------



export function debugResetState() {
  console.log('\n=== RESET DEBUG ===');

  // Geladene Gruppen
  const loadedGroups = {};
  Object.entries(state.groups || {}).forEach(([group, models]) => {
    if (models && models.length > 0) {
      loadedGroups[group] = models.length;
    }
  });
  console.log('Geladene Gruppen:', loadedGroups);

  // Sichtbare Gruppen
  const visibleGroups = {};
  Object.entries(state.groups || {}).forEach(([group, models]) => {
    let visibleCount = 0;
    (models || []).forEach(model => {
      if (model && model.visible) visibleCount++;
    });
    if (visibleCount > 0) {
      visibleGroups[group] = visibleCount;
    }
  });
  console.log('Sichtbare Modelle:', visibleGroups);

  // State
  console.log('GroupStates:', state.groupStates);
  console.log('Collection:', state.collection.length, 'Items');
  console.log('Collection Mode:', state.modes?.collection);

  // GroupToggle
  if (window.groupToggleLoadedGroups) {
    const toggleStates = [];
    window.groupToggleLoadedGroups.forEach((isLoaded, group) => {
      if (isLoaded) toggleStates.push(group);
    });
    console.log('GroupToggle Loaded:', toggleStates);
  }

  console.log('=== END DEBUG ===\n');
}


function resetGroupToggleStates() {
  try {
    // GroupToggle Map zurücksetzen
    if (window.groupToggleLoadedGroups) {
      window.groupToggleLoadedGroups.clear();
      window.groupToggleLoadedGroups.set('bones', true);
      window.groupToggleLoadedGroups.set('teeth', true);
      console.log('✅ GroupToggle States zurückgesetzt');
    }

    // Event senden
    const resetEvent = new CustomEvent('resetGroupStates', {
      detail: { loadedGroups: ['bones', 'teeth'] }
    });
    document.dispatchEvent(resetEvent);

  } catch (err) {
    console.warn('⚠️ GroupToggle Reset fehlgeschlagen:', err);
  }
}

function resetColors() {
  const defaults = state?.defaultSettings?.colors || {};

  Object.keys(defaults).forEach(groupName => {
    const hex = defaults[groupName] ?? 0xcccccc;
    state.colors[groupName] = hex;

    // Nur wenn Gruppe geladen ist, Farbe anwenden
    if (state.groups[groupName]?.length > 0) {
      updateModelColors(groupName, hex);
    }

    // UI-Element aktualisieren
    const input = document.getElementById(`${groupName}-color`);
    if (input) {
      input.value = '#' + hex.toString(16).padStart(6, '0');
    }
  });
}