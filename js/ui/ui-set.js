// ui-set.js
import { state } from '../state.js';
import { loadModels, showLoadingBar, hideLoadingBar } from '../modelLoader/index.js';
import { scene, loader, camera, controls, renderer } from '../init.js';

export function setupSetUI() {
  const addButton = document.getElementById('add-to-set-button');
  const setList = document.getElementById('set-list');
  const loadMusclesBtn = document.getElementById('load-muscles-btn');

  if (!addButton || !setList) {
    console.warn('⚠️ Set-UI: Button oder Liste nicht gefunden.');
    return;
  }

  if (!loadMusclesBtn) {
    console.warn('⚠️ load-muscles-btn nicht gefunden.');
  } else {
    loadMusclesBtn.addEventListener('click', async () => {
      try {
        const muscleEntries = state.groupedMeta['muscles'] || [];
        if (muscleEntries.length) {
          showLoadingBar();
          await loadModels(muscleEntries, 'muscles', true, scene, loader, camera, controls, renderer);
          hideLoadingBar();
        }
      } catch (err) {
        console.error('Fehler beim Laden von muscles:', err);
        hideLoadingBar();
      }
    });
  }

  // Klick auf "Zur Sammlung hinzufügen"
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

  // Hilfsfunktion zum Anzeigen der Set-Liste
  function refreshSetList() {
    setList.innerHTML = '';

    state.setStructures.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'set-entry';
      item.textContent = entry.label;

      // Doppelklick = entfernen
      item.addEventListener('dblclick', () => {
        state.setStructures.splice(index, 1);
        refreshSetList();
      });

      setList.appendChild(item);
    });
  }

  console.log('📦 Sammlungssystem aktiviert.');
}