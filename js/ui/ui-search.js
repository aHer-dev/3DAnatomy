// ui-search.js
// 🔍 Sucht anatomische Strukturen anhand ihrer Labels oder FMA-ID und lädt sie in die Szene.

// In js/ui/ui-search.js
import * as THREE from 'three';
import { scene } from '../scene.js'; // Ersetzt init.js
import { controls } from '../controls.js'; // Falls für Interaktionen nötig

// ... Rest des Code
import { state } from '../state.js';                        // 🔁 Globaler App-Zustand              
import { getMeta } from '../utils/index.js';                     // 📄 Lädt Metadaten der Modelle
import { highlightModel } from '../interaction/highlightModel.js';
import { showInfoPanel } from '../interaction/infoPanel.js';

import { loadModels } from '../modelLoader/index.js';      // 🔄 Funktion zum Laden einzelner Modelle

/**
 * Initialisiert die Suchleiste und verbindet sie mit einem Ergebnis-Popup.
 * Bei Auswahl wird das Modell geladen, hervorgehoben und das Info-Panel geöffnet.
 */
export function setupSearchUI() {
  const searchBar = document.getElementById('search-bar');           // 🔍 Texteingabe für Suche
  const searchResults = document.getElementById('search-results');   // 📋 Ergebnisliste unter der Suche

  // ⌨️ Reaktion auf Eingabe in der Suchleiste
  searchBar?.addEventListener('input', async () => {
    const searchTerm = searchBar.value.toLowerCase().trim();         // Benutzereingabe, kleingeschrieben + getrimmt
    searchResults.innerHTML = '';                                    // Ergebnisliste leeren
    searchResults.style.display = 'none';                            // Ergebnisliste zunächst ausblenden

    if (searchTerm === '') return;                                   // 🛑 Kein Suchbegriff = keine Suche

    const meta = await getMeta();                                    // 🔍 Alle verfügbaren Metadaten laden

    // 📎 Filtere alle passenden Einträge nach Label oder FMA-ID
    const results = meta.filter(entry =>
      entry.label.toLowerCase().includes(searchTerm) ||
      entry.fma.toLowerCase().includes(searchTerm)
    );

    // 📦 Für jeden Treffer ein visuelles Listenelement erzeugen
    results.forEach(result => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.textContent = `${result.label} (${result.group})`;      // z. B. „Biceps brachii (muscles)“
      item.dataset.entry = JSON.stringify(result);                 // Speichere vollständigen Eintrag für später

      // 📌 Klick auf ein Suchergebnis: lade, zeige und fokussiere Modell
      item.addEventListener('click', async () => {
        const entry = JSON.parse(item.dataset.entry);

        // 🧲 Modell in Szene laden
        await loadModels([entry], entry.group, true, scene, loader);

        // 🟢 Modellobjekt im geladenen Zustand finden
        const model = state.groups[entry.group]?.find(
          m => state.modelNames.get(m) === entry.label
        );

        if (model) {
          highlightObject(model);             // ✨ Modell hervorheben
          showInfoPanel(entry, model);        // 🧾 Info-Fenster öffnen
        }

        // 🧹 UI zurücksetzen
        searchResults.style.display = 'none';
        searchBar.value = '';
      });

      // 📋 Ergebnis zur Liste hinzufügen
      searchResults.appendChild(item);
    });

    // 📤 Ergebnisliste nur anzeigen, wenn es Treffer gibt
    if (results.length > 0) {
      searchResults.style.display = 'block';
    }
  });
}
