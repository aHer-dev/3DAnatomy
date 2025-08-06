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
  // 🔍 UI-Elemente referenzieren
  const addButton = document.getElementById('add-to-set-button');     // Button: zur Sammlung hinzufügen
  const setList = document.getElementById('set-list');                // Liste: gesammelte Einträge anzeigen
  const loadMusclesBtn = document.getElementById('load-muscles-btn'); // Button: alle Muskeln laden

  // ❌ Grundprüfung: Sind Buttons und Liste vorhanden?
  if (!addButton || !setList) {
    console.warn('⚠️ Set-UI: Button oder Liste nicht gefunden.');
    return;
  }

  if (!loadMusclesBtn) {
    console.warn('⚠️ load-muscles-btn nicht gefunden.');
  } else {
    // 📌 Klick auf „Alle Muskeln laden“-Button
    loadMusclesBtn.addEventListener('click', async () => {
      try {
        const muscleEntries = state.groupedMeta['muscles'] || [];

        if (muscleEntries.length) {
          showLoadingBar(); // Ladeanzeige einblenden
          await loadModels(muscleEntries, 'muscles', true, scene, loader, camera, controls, renderer);
          hideLoadingBar(); // Ladeanzeige ausblenden
        }
      } catch (err) {
        console.error('Fehler beim Laden von muscles:', err);
        hideLoadingBar();
      }
    });
  }

  // 📌 Klick auf „Zur Sammlung hinzufügen“-Button
  addButton.addEventListener('click', () => {
    const selected = state.currentlySelected;

    if (!selected) {
      alert("Bitte zuerst eine Struktur auswählen.");
      return;
    }

    const label = state.modelNames.get(selected);

    // 🔁 Prüfen, ob bereits vorhanden
    const alreadyInSet = state.setStructures.find(s => s.label === label);
    if (alreadyInSet) {
      alert("Diese Struktur ist bereits in deiner Sammlung.");
      return;
    }

    // 🧾 Prüfen, ob Struktur Metadaten hat
    const meta = selected.userData?.meta;
    if (!meta) {
      alert("Fehler: Struktur enthält keine Metadaten.");
      return;
    }

    // ✅ Hinzufügen zur Sammlung
    state.setStructures.push(meta);
    refreshSetList();
  });

  /**
   * 🔄 Aktualisiert die Anzeige der gespeicherten Strukturen im Set.
   * Zeigt alle Labels als Liste an, erlaubt Löschen per Doppelklick.
   */
  function refreshSetList() {
    setList.innerHTML = ''; // Vorherige Liste leeren

    state.setStructures.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'set-entry';
      item.textContent = entry.label;

      // 🗑️ Eintrag durch Doppelklick entfernen
      item.addEventListener('dblclick', () => {
        state.setStructures.splice(index, 1);
        refreshSetList(); // Liste neu aufbauen
      });

      setList.appendChild(item);
    });
  }

  // ✅ Erfolgsmeldung
  console.log('📦 Sammlungssystem aktiviert.');
}
