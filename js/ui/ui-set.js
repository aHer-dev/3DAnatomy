/**
 * @file ui-set.js
 * @description Ermöglicht dem Nutzer, anatomische Strukturen zu einer persönlichen Sammlung (Set) hinzuzufügen,
 * alle Muskeln auf einmal zu laden und Einträge aus dem Set wieder zu entfernen.
 */
import * as THREE from 'three';
import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';
import { modelPath } from '../core/path.js';
import {
  hideAllManagedModels,
  setModelVisibility
} from '../features/visibilityManager.js';  // WICHTIG: hideAllManagedModels importieren!
import { setModelColor, setModelOpacity } from '../features/appearance.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { controls } from '../core/controls.js';
import { state } from '../store/stateManager.js';
import { loadModels, showLoadingBar, hideLoadingBar } from '../modelLoader/index.js';

/**
 * Initialisiert das UI-System zur Verwaltung von Sets (Sammlungen).
 */
export function setupSetUI() {
  console.log('setupSetUI aufgerufen');

  const loader = createGLTFLoader();

  const setupGroupButton = (buttonId, groupName) => {
    const button = document.getElementById(buttonId);
    if (!button) {
      console.warn(`⚠️ Button ${buttonId} nicht gefunden.`);
      return;
    }
    console.log(`Button ${buttonId} gefunden, füge Listener hinzu...`);
    button.addEventListener('click', async () => {
      try {
        button.disabled = true;
        const entries = state.groupedMeta[groupName] || [];
        if (entries.length) {
          console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${groupName}"...`);
          showLoadingBar();
          await loadModels(entries, groupName, true, scene, loader, camera, controls, renderer);
          hideLoadingBar();
        }
      } catch (err) {
        console.error(`❌ Fehler beim Laden von ${groupName}:`, err);
        hideLoadingBar();
      } finally {
        button.disabled = false;
      }
    });
  };

  // Alle Gruppen aus meta.json
  const groups = [
    'bones', 'muscles', 'tendons', 'arteries', 'brain', 'cartilage',
    'ear', 'eyes', 'glands', 'heart', 'ligaments', 'lungs',
    'nerves', 'organs', 'skin_hair', 'teeth', 'veins'
  ];

  groups.forEach(group => setupGroupButton(`btn-load-${group}`, group));

  const addButton = document.getElementById('btn-add-to-set');
  const setList = document.getElementById('set-list');

  if (!addButton || !setList) {
    console.warn('⚠️ Set-UI: btn-add-to-set oder set-list nicht gefunden.');
    return;
  }

  addButton.addEventListener('click', () => {
    const selected = state.currentlySelected;
    if (!selected) {
      alert("Bitte zuerst eine Struktur auswählen.");
      return;
    }

    // Prüfe ob bereits in der Sammlung
    const alreadyInSet = state.collection.find(item => item.model === selected);
    if (alreadyInSet) {
      alert("Diese Struktur ist bereits in deiner Sammlung.");
      return;
    }

    const meta = selected.userData?.meta;
    if (!meta) {
      alert("Fehler: Struktur enthält keine Metadaten.");
      return;
    }

    // Füge zur Sammlung hinzu mit aktuellen Eigenschaften
    state.collection.push({
      model: selected,
      meta: meta,
      color: selected.material?.color?.getHex() || 0xcccccc,
      opacity: selected.material?.opacity || 1,
      visible: selected.visible
    });

    refreshSetList();
    console.log('✅ Zur Sammlung hinzugefügt:', meta.id || meta.labels?.en);
  });

  function refreshSetList() {
    setList.innerHTML = '';
    state.collection.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'set-entry';
      div.textContent = item.meta?.labels?.en || item.meta?.id || 'Unbekannt';

      // Doppelklick zum Entfernen
      div.addEventListener('dblclick', () => {
        state.collection.splice(index, 1);
        refreshSetList();
        console.log('🗑️ Aus Sammlung entfernt:', item.meta?.id);
      });

      setList.appendChild(div);
    });

    updateCollectionUI();
  }

  console.log('📦 Sammlungssystem und Gruppen-Buttons aktiviert.');
}

/**
 * Rendert die Liste der gespeicherten Modelle in der Sammlung (UI)
 */
export function updateCollectionUI() {
  const collectionList = document.getElementById('set-list');
  if (!collectionList) {
    console.error('❌ Collection-List Container (#set-list) nicht gefunden');
    return;
  }

  if (state.collection.length === 0) {
    collectionList.innerHTML = '<p style="color: #888; font-style: italic;">Keine Modelle in der Sammlung.</p>';
    return;
  }

  console.log('✅ Sammlung gerendert:', state.collection.length, 'Modelle');
}

/**
 * Schaltet die Szene um: Zeigt nur Sammlungs-Modelle mit gespeicherten Zuständen
 */
export function showCollectionInScene() {
  console.log('🔄 Szene umschalten auf Sammlung...');

  // Verstecke alle anderen Modelle
  hideAllManagedModels();

  // Zeige nur Sammlungs-Modelle
  state.collection.forEach(item => {
    const model = item.model;

    // Wende gespeicherte Eigenschaften an
    if (item.color !== undefined) {
      setModelColor(model, item.color);
    }
    if (item.opacity !== undefined) {
      setModelOpacity(model, item.opacity);
    }

    // Mache sichtbar und klickbar
    setModelVisibility(model, true);

    // Stelle sicher dass Layer gesetzt sind
    model.traverse(obj => {
      if (obj.isMesh || obj.isGroup) {
        obj.layers.enable(0); // Render Layer
        obj.layers.enable(1); // Pick Layer
      }
    });
  });

  renderer.render(scene, camera);
  console.log('✅ Sammlung in Szene angezeigt:', state.collection.length, 'Modelle');
}

/**
 * Leert die Sammlung
 */
export function clearCollection() {
  state.collection = [];
  updateCollectionUI();
  hideAllManagedModels();
  renderer.render(scene, camera);
  console.log('🗑️ Sammlung geleert.');
}

// === EVENT LISTENERS ===

// Event-Listener für "Sammlung anzeigen"
const showCollectionBtn = document.querySelector('#btn-show-set');
if (showCollectionBtn) {
  showCollectionBtn.addEventListener('click', () => {
    console.log('🖱️ Sammlung anzeigen geklickt');
    updateCollectionUI();
    showCollectionInScene();
  });
} else {
  console.warn('⚠️ Button (#btn-show-set) nicht gefunden');
}

// Event-Listener für "Sammlung leeren"
const clearCollectionBtn = document.querySelector('#btn-clear-set');
if (clearCollectionBtn) {
  clearCollectionBtn.addEventListener('click', clearCollection);
} else {
  console.warn('⚠️ Button (#btn-clear-set) nicht gefunden');
}

// Event-Listener für "Sammlung exportieren"
const exportBtn = document.querySelector('#btn-export-set');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    if (state.collection.length === 0) {
      alert('Die Sammlung ist leer.');
      return;
    }

    // Erstelle Export-Daten
    const exportData = {
      version: '1.0',
      date: new Date().toISOString(),
      collection: state.collection.map(item => ({
        id: item.meta?.id,
        labels: item.meta?.labels,
        color: item.color,
        opacity: item.opacity,
        visible: item.visible
      }))
    };

    // Download als JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anatomie-sammlung-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('📥 Sammlung exportiert:', state.collection.length, 'Modelle');
  });
}

// Event-Listener für "Screenshot"
const screenshotBtn = document.querySelector('#btn-screenshot');
if (screenshotBtn) {
  screenshotBtn.addEventListener('click', () => {
    // Rendere einmal für Screenshot
    renderer.render(scene, camera);

    // Canvas zu Bild konvertieren
    const canvas = renderer.domElement;
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anatomie-screenshot-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });

    console.log('📸 Screenshot erstellt');
  });
}