/**
 * @file ui-set.js
 * @description Ermöglicht dem Nutzer, anatomische Strukturen zu einer persönlichen Sammlung (Set) hinzuzufügen,
 * alle Muskeln auf einmal zu laden und Einträge aus dem Set wieder zu entfernen.
 */
import * as THREE from 'three';
import { createGLTFLoader /*, disposeGLTFLoader*/ } from '../loaders/gltfLoaderFactory.js';
import { modelPath } from '../core/path.js';
import { hideAllManagedModels } from '../features/visibility.js';
import { setModelColor, setModelOpacity } from '../features/appearance.js'; // Importiere Appearance-Helper
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { controls } from '../core/controls.js';
import { state } from '../store/state.js';
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
  const groups = ['bones', 'muscles', 'tendons', 'arteries', 'brain', 'cartilage', 'ear', 'eyes', 'glands', 'heart', 'ligaments', 'lungs', 'nerves', 'organs', 'skin_hair', 'teeth', 'veins'];
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
    const label = state.modelNames.get(selected);
    const alreadyInSet = state.setStructures.find(s => s.label === label);
    if (alreadyInSet) {
      alert("Diese Struktur ist bereits in deiner Sammlung.");
      return;
    }
    const meta = selected.userData?.meta;
    if (!meta) {
      alert("Fehler: Struktur enthält keine Metadaten.");
      return;
    }
    state.setStructures.push(meta);
    refreshSetList();
  });

  function refreshSetList() {
    setList.innerHTML = '';
    state.setStructures.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'set-entry';
      item.textContent = entry.label || entry.id;
      item.addEventListener('dblclick', () => {
        state.setStructures.splice(index, 1);
        refreshSetList();
      });
      setList.appendChild(item);
    });
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

  collectionList.innerHTML = '';
  if (state.collection.length === 0) {
    collectionList.innerHTML = '<p>Keine Modelle in der Sammlung.</p>';
    return;
  }

  state.collection.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.meta.labels?.en || item.model.name || 'Unbekannt';
    collectionList.appendChild(li);
  });
  console.log('✅ Sammlung gerendert:', state.collection.length, 'Modelle');
}


/**
 * Schaltet die Szene um: Zeigt nur Sammlungs-Modelle mit gespeicherten Zuständen
 */
export function showCollectionInScene() {
  console.log('🔄 Szene umschalten auf Sammlung...');
  hideAllModels(); // Verstecke alles

  // Setze Layers für alle Modelle zurück
  scene.traverse(obj => {
    if (obj.isMesh || obj.isGroup) {
      obj.layers.disable(0); // Alle deaktivieren
    }
  });

  state.collection.forEach(item => {
    const model = item.model;
    setModelColor(model, item.color);
    setModelOpacity(model, item.opacity);
    setModelVisibility(model, true); // Immer sichtbar machen, unabhängig von gespeichertem visible
    model.layers.enable(0); // Sicherstellen, dass Sammlungs-Modelle klickbar sind
  });

  renderer.render(scene, camera);
  console.log('✅ Sammlung in Szene angezeigt:', state.collection.length, 'Modelle');
}


/**
/**
 * Leert die Sammlung
 */
export function clearCollection() {
  state.collection = [];
  updateCollectionUI();
  hideAllModels();
  renderer.render(scene, camera);
  console.log('🗑️ Sammlung geleert.');
}



// Event-Listener für "Sammlung anzeigen"
const showCollectionBtn = document.querySelector('#btn-show-set');
if (showCollectionBtn) {
  showCollectionBtn.addEventListener('click', () => {
    console.log('🖱️ Sammlung anzeigen geklickt');
    updateCollectionUI(); // UI-Liste aktualisieren
    showCollectionInScene(); // Szene umschalten
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