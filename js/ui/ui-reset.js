// js/ui/ui-reset.js - VOLLSTÄNDIGE CARTILAGE-INTEGRATION

import { state } from '../store/state.js';
import { dispatch, StateActions } from '../store/state.js';
import { hideInfoPanel } from '../interaction/infoPanel.js';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { updateModelColors } from '../modelLoader/color.js';
import { loadGroupByName } from '../features/modelLoader-core.js';
import { setModelOpacity } from '../features/appearance.js';
import { setCameraToDefault } from '../core/cameraUtils.js';
import { getConfig } from '../config/config.js';
import { setModelVisibility, showModel } from '../features/visibility.js';
import { registerPickables, unregisterPickables } from '../features/selection.js';
import { clearMultiSelect } from '../interaction/multiSelect.js';
import { exitIsolatedView } from '../interaction/isolationView.js';
import { disposeObject3D } from '../modelLoader/cleanup.js';
import { syncToolbarLayerButtons } from './toolbar.js';

// ✅ STANDARD-GRUPPEN ZENTRAL DEFINIERT
const STANDARD_GROUPS = ['bones', 'teeth', 'cartilage'];

// ---------------------------------------------------------------
// 1) LEICHTER RESET: Kamera auf Config-Defaults (Button #btn-reset)
// ---------------------------------------------------------------
export function setupResetUI() {
  const btn = document.getElementById('btn-reset');
  if (!btn) {
    console.warn('Reset-Button (#btn-reset) nicht gefunden');
    return;
  }

  // Tastenkürzel-Hilfe
  const shortcutsBtn = document.getElementById('btn-shortcuts');
  const shortcutsTip = document.getElementById('shortcuts-tip');
  if (shortcutsBtn && shortcutsTip) {
    shortcutsBtn.addEventListener('mouseenter', () => {
      const r = shortcutsBtn.getBoundingClientRect();
      shortcutsTip.style.left = `${r.left + r.width / 2}px`;
      shortcutsTip.style.top = `${r.top - 8}px`;
      shortcutsTip.style.transform = 'translate(-50%, -100%)';
      shortcutsTip.classList.add('visible');
      shortcutsTip.setAttribute('aria-hidden', 'false');
    });
    shortcutsBtn.addEventListener('mouseleave', () => {
      shortcutsTip.classList.remove('visible');
      shortcutsTip.setAttribute('aria-hidden', 'true');
    });
    shortcutsBtn.addEventListener('click', () => {
      const visible = shortcutsTip.classList.toggle('visible');
      shortcutsTip.setAttribute('aria-hidden', String(!visible));
    });
  }

  const colorBtn = document.getElementById('btn-reset-colors');
  if (colorBtn) {
    colorBtn.addEventListener('click', () => {
      resetColors();
      renderer.render(scene, camera);
    }, { passive: true });
  }

  setupAppGuideUI(colorBtn, shortcutsTip);

  btn.addEventListener('click', async () => {
    try {
      console.log('🔄 Schneller Reset gestartet...');
      await resetToDefaultView();
      setCameraToDefault(camera, controls);
      if (typeof controls?.saveState === 'function') controls.saveState();
      renderer.render(scene, camera);
      console.log('✅ Reset: Ansicht zurückgesetzt');
    } catch (error) {
      console.error('❌ Schneller Reset fehlgeschlagen:', error);
    }
  }, { passive: true });
}

function setupAppGuideUI(anchorBtn, shortcutsTip) {
  if (!anchorBtn) return;

  let guideBtn = document.getElementById('btn-app-guide');
  if (!guideBtn) {
    guideBtn = document.createElement('button');
    guideBtn.id = 'btn-app-guide';
    guideBtn.type = 'button';
    guideBtn.setAttribute('aria-label', 'App-Anleitung anzeigen');
    guideBtn.textContent = 'Anleitung';
    anchorBtn.insertAdjacentElement('afterend', guideBtn);
  }

  let modal = document.getElementById('app-guide-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'app-guide-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div id="app-guide-box" role="dialog" aria-modal="true" aria-labelledby="app-guide-title">
        <button id="app-guide-close" type="button" aria-label="Schließen">✕</button>
        <h2 id="app-guide-title">🫀 So nutzt du 3D Anatomy</h2>

        <div class="app-guide-step">
          <div class="app-guide-icon">1</div>
          <div>
            <strong>Strukturen laden</strong>
            <p>Über die Buttons im Menü lädst du Knochen, Muskeln, Organe und weitere Ebenen in die Szene.</p>
          </div>
        </div>

        <div class="app-guide-step">
          <div class="app-guide-icon">2</div>
          <div>
            <strong>Modelle antippen</strong>
            <p>Tippe oder klicke auf eine Struktur, um sie auszuwählen und das Bearbeitungs- oder Info-Panel zu öffnen.</p>
          </div>
        </div>

        <div class="app-guide-step">
          <div class="app-guide-icon">3</div>
          <div>
            <strong>Isolieren, verstecken, einfärben</strong>
            <p>Im Panel kannst du einzelne Modelle ausblenden, in Einzelansicht zeigen, transparent machen oder farblich hervorheben.</p>
          </div>
        </div>

        <div class="app-guide-step">
          <div class="app-guide-icon">4</div>
          <div>
            <strong>Kamera bewegen</strong>
            <p>Mit Maus oder Finger kannst du drehen, zoomen und verschieben, um dir die Anatomie aus jedem Winkel anzusehen.</p>
          </div>
        </div>

        <div class="app-guide-step">
          <div class="app-guide-icon">5</div>
          <div>
            <strong>Reset richtig nutzen</strong>
            <p><em>Reset</em> bringt dich zurück zur Startansicht. <em>Reset Farbe</em> setzt nur die Farben wieder auf den Ausgangszustand.</p>
          </div>
        </div>

        <div class="app-guide-step">
          <div class="app-guide-icon">💡</div>
          <div>
            <strong>Tipp</strong>
            <p>Lade zuerst nur wenige Ebenen und arbeite dich dann schrittweise tiefer hinein. So bleibt die Szene übersichtlich.</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  if (guideBtn.dataset.bound === 'true') return;
  guideBtn.dataset.bound = 'true';

  const closeBtn = modal.querySelector('#app-guide-close');

  const openGuide = () => {
    shortcutsTip?.classList.remove('visible');
    shortcutsTip?.setAttribute('aria-hidden', 'true');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeGuide = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  guideBtn.addEventListener('click', openGuide);
  closeBtn?.addEventListener('click', closeGuide);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeGuide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) {
      closeGuide();
    }
  });
}

function isMuskelfinderDeeplinkActive() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('source') === 'muskelfinder'
      || params.has('muscleKey')
      || params.has('muscle');
  } catch (error) {
    return false;
  }
}

function clearMuskelfinderDeeplinkParams() {
  try {
    const url = new URL(window.location.href);
    ['muscleKey', 'muscle', 'source', 'returnTo'].forEach((key) => {
      url.searchParams.delete(key);
    });
    const search = url.searchParams.toString();
    window.history.replaceState({}, '', `${url.pathname}${search ? `?${search}` : ''}${url.hash}`);
  } catch (error) {
    console.warn('⚠️ Deeplink-Parameter konnten nicht entfernt werden:', error);
  }
}

async function resetToDefaultView() {
  exitIsolatedView();
  hideInfoPanel?.();
  clearMultiSelect();
  dispatch(StateActions.CLEAR_SELECTION, {});

  if (state.modes) {
    state.modes.collection = false;
  }

  const loadedGroups = Object.keys(state.groups || {});

  for (const groupName of loadedGroups) {
    if (STANDARD_GROUPS.includes(groupName)) continue;

    const models = state.groups[groupName] || [];
    if (!models.length) continue;

    for (const model of models) {
      unregisterPickables(model);
      scene.remove(model);
      disposeObject3D(model);
    }

    state.groups[groupName] = [];
    state.groupStates[groupName] = false;
  }

  for (const groupName of STANDARD_GROUPS) {
    if (!state.groups[groupName]?.length) {
      await loadGroupByName(groupName, { centerCamera: false });
    }

    dispatch(StateActions.SET_GROUP_VISIBILITY, {
      group: groupName,
      visible: true
    });

    (state.groups[groupName] || []).forEach((model) => {
      setModelOpacity(model, 1);
      showModel(model);
    });
  }

  resetAllButtonStates();
  syncToolbarLayerButtons();

  if (isMuskelfinderDeeplinkActive()) {
    clearMuskelfinderDeeplinkParams();
  }

  console.log('✅ Startansicht mit bones, teeth und cartilage wiederhergestellt');
}

function ensureOnlyBasicGroupsVisible() {
  Object.keys(state.groups || {}).forEach(groupName => {
    const models = state.groups[groupName] || [];

    // ✅ ALLE STANDARD-GRUPPEN prüfen
    const shouldBeVisible = STANDARD_GROUPS.includes(groupName);

    models.forEach(model => {
      if (model && model.parent) { // Nur wenn Modell noch in Szene
        setModelVisibility(model, shouldBeVisible);

        // Debug
        if (!shouldBeVisible && model.visible) {
          console.warn(`⚠️ Gruppe "${groupName}" sollte unsichtbar sein, ist aber sichtbar!`);
        }
        if (shouldBeVisible && !model.visible) {
          console.warn(`⚠️ Gruppe "${groupName}" sollte sichtbar sein, ist aber unsichtbar!`);
        }
      }
    });
  });
}

// ---------------------------------------------------------------
// 2) VOLLSTÄNDIGER RESET: Alles neu laden
// ---------------------------------------------------------------
export async function resetApp() {
  console.log('🔄 Vollständiger Reset gestartet...');
  console.log('📋 Standard-Gruppen:', STANDARD_GROUPS);

  showResetLoadingOverlay();

  try {
    hideInfoPanel?.();

    // SCHRITT 1: Sammlung KOMPLETT leeren
    updateResetProgress('Leere Sammlung...', 10);
    state.collection = [];

    // SCHRITT 2: Auswahl zurücksetzen
    state.selected = { root: null, mesh: null, point: null, meta: null };
    dispatch(StateActions.CLEAR_SELECTION, {});

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

    console.log(`🗑️ ${toRemove.length} Modelle entfernt`);

    // SCHRITT 4: State VOLLSTÄNDIG zurücksetzen
    updateResetProgress('Setze Gruppenstatus zurück...', 30);

    // FIX: Alle Gruppen-Arrays leeren
    Object.keys(state.groups || {}).forEach(groupName => {
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

    // ✅ SCHRITT 5: ALLE STANDARD-GRUPPEN neu laden
    console.log('📦 Lade Standard-Gruppen:', STANDARD_GROUPS);

    let progressStep = 40;
    const stepSize = 40 / STANDARD_GROUPS.length; // 40% für das Laden verteilen

    for (const groupName of STANDARD_GROUPS) {
      updateResetProgress(`Lade ${groupName}...`, progressStep);

      try {
        await loadGroupByName(groupName, { centerCamera: false });
        state.groupStates[groupName] = true;
        console.log(`✅ ${groupName} geladen`);
      } catch (err) {
        console.error(`❌ Fehler beim Laden von "${groupName}":`, err);
      }

      progressStep += stepSize;
    }

    // SCHRITT 6: UI-Buttons zurücksetzen
    updateResetProgress('Aktualisiere UI...', 85);
    resetAllButtonStates();

    // SCHRITT 7: GroupToggle zurücksetzen
    resetGroupToggleStates();

    // SCHRITT 8: Kamera zurücksetzen
    updateResetProgress('Setze Ansicht zurück...', 90);
    setCameraToDefault(camera, controls);
    if (typeof controls?.saveState === 'function') controls.saveState();

    // SCHRITT 9: Sicherstellen dass NUR Standard-Gruppen sichtbar sind
    updateResetProgress('Finalisiere...', 95);
    ensureOnlyBasicGroupsVisible();

    updateResetProgress('Fertig!', 100);
    await new Promise(resolve => setTimeout(resolve, 500));

    renderer.render(scene, camera);

    console.log('✅ Reset abgeschlossen - Standard-Gruppen:', STANDARD_GROUPS);
    debugResetState();

  } catch (err) {
    console.error('❌ Fehler beim Reset:', err);
  } finally {
    hideResetLoadingOverlay();
  }
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

    // ✅ STANDARD-GRUPPEN-CHECK
    const isStandardGroup = STANDARD_GROUPS.includes(group);

    if (isStandardGroup) {
      btn.style.backgroundColor = '#2a5a2a';
      btn.textContent = '✓ ' + group.charAt(0).toUpperCase() + group.slice(1) + ' ▼';
      console.log(`🟢 Button "${group}" als geladen markiert`);
    } else {
      btn.style.backgroundColor = '';
      btn.textContent = group.charAt(0).toUpperCase() + group.slice(1) + ' ▼';
    }
  });
}

function resetGroupToggleStates() {
  try {
  
    // ✅ EVENT MIT ALLEN STANDARD-GRUPPEN senden
    const resetEvent = new CustomEvent('resetGroupStates', {
      detail: { loadedGroups: STANDARD_GROUPS }
    });
    document.dispatchEvent(resetEvent);

  } catch (err) {
    console.warn('⚠️ GroupToggle Reset fehlgeschlagen:', err);
  }
}

function resetColors() {
  const defaults = state?.defaultSettings?.resetColors || state?.defaultSettings?.colors || {};

  Object.keys(defaults).forEach(groupName => {
    const hex = defaults[groupName] ?? 0xcccccc;
     dispatch(StateActions.SET_GROUP_COLOR, { 
group: groupName,
color: hex
});

    // Nur wenn Gruppe geladen ist, Farbe anwenden
    if (state.groups[groupName]?.length > 0) {
      updateModelColors(groupName, hex);
      console.log(`🎨 Farbe für ${groupName} zurückgesetzt: 0x${hex.toString(16)}`);
    }

    // UI-Element aktualisieren
    const input = document.getElementById(`${groupName}-color`);
    if (input) {
      input.value = '#' + hex.toString(16).padStart(6, '0');
    }
  });
}

export function debugResetState() {
  console.log('\n=== RESET DEBUG ===');

  // Geladene Gruppen
  const loadedGroups = {};
  Object.entries(state.groups || {}).forEach(([group, models]) => {
    if (models && models.length > 0) {
      loadedGroups[group] = models.length;
    }
  });
  console.log('📦 Geladene Gruppen:', loadedGroups);

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
  console.log('👁️ Sichtbare Modelle:', visibleGroups);

  // State
  console.log('🔧 GroupStates:', state.groupStates);
  console.log('📋 Collection:', state.collection.length, 'Items');
  console.log('🎯 Collection Mode:', state.modes?.collection);

  // Standard-Gruppen Check
  console.log('📌 Standard-Gruppen sollten geladen sein:', STANDARD_GROUPS);
  STANDARD_GROUPS.forEach(group => {
    const loaded = state.groups[group]?.length > 0;
    const visible = visibleGroups[group] > 0;
    console.log(`  ${group}: geladen=${loaded}, sichtbar=${visible}`);
  });

  // GroupToggle
  if (window.groupToggleLoadedGroups) {
    const toggleStates = [];
    window.groupToggleLoadedGroups.forEach((isLoaded, group) => {
      if (isLoaded) toggleStates.push(group);
    });
    console.log('🔄 GroupToggle Loaded:', toggleStates);
  }

  console.log('=== END DEBUG ===\n');
}

// Loading-Overlay Funktionen
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

    // CSS für Spinner hinzufügen
    const style = document.createElement('style');
    style.textContent = `
      .loading-content {
        text-align: center;
        color: white;
        max-width: 300px;
      }
      
      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 3px solid #333;
        border-top: 3px solid #4CAF50;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .loading-bar {
        width: 100%;
        height: 8px;
        background: #333;
        border-radius: 4px;
        overflow: hidden;
        margin-top: 15px;
      }
      
      .loading-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        transition: width 0.3s ease;
        width: 0%;
      }
      
      .loading-content h3 {
        margin: 0 0 10px 0;
        font-size: 24px;
      }
      
      .loading-content p {
        margin: 0;
        font-size: 14px;
        opacity: 0.8;
      }
    `;

    if (!document.querySelector('#reset-loading-styles')) {
      style.id = 'reset-loading-styles';
      document.head.appendChild(style);
    }

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
