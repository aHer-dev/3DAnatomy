// ui-set.js
import { state } from '../state.js';

export function setupSetUI() {
  const addButton = document.getElementById('add-to-set-button');
  const setList = document.getElementById('set-list');

  if (!addButton || !setList) {
    console.warn('⚠️ Set-UI: Button oder Liste nicht gefunden.');
    return;
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