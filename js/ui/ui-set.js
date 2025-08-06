// ui-set.js
// 📦 Ermöglicht dem Nutzer, anatomische Strukturen zu einer persönlichen Sammlung (Set) hinzuzufügen,
// alle Muskeln auf einmal zu laden und Einträge aus dem Set wieder zu entfernen.

import { state } from '../state.js';                                // 🔁 Globaler Zustand
import { loadModels, showLoadingBar, hideLoadingBar } from '../modelLoader/index.js'; // 🔄 Modell-Ladevorgänge & Ladeanzeige
import { scene, loader, camera, controls, renderer } from '../init.js';               // 🌐 3D-Szene, Kamera, Renderer usw.

/**
 * Initialisiert das UI-System zur Verwaltung von Sets (Sammlungen).
 * Bietet: Einzelne Struktur hinzufügen, alle Muskeln laden, Liste aktualisieren, Einträge löschen.
 */
export function setupSetUI() {
  console.log('setupSetUI aufgerufen');

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
        console.error(`Fehler beim Laden von ${groupName}:`, err);
        hideLoadingBar();
      } finally {
        button.disabled = false;
      }
    });
  };

  // Alle Gruppen aus /models/
  const groups = ['bones', 'muscles', 'tendons', 'arteries', 'brain', 'cartilage', 'ear', 'eyes', 'glands', 'heart', 'ligaments', 'lungs', 'nerves', 'organs', 'skin_hair', 'teeth', 'veins'];
  groups.forEach(group => setupGroupButton(`load-${group}-btn`, group));

  const addButton = document.getElementById('add-to-set-button');
  const setList = document.getElementById('set-list');
  if (!addButton || !setList) {
    console.warn('⚠️ Set-UI: add-to-set-button oder set-list nicht gefunden.');
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