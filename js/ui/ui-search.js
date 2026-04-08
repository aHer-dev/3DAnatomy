// ui-search.js
// 🔍 Sucht anatomische Strukturen anhand ihrer Labels oder FMA-ID und lädt sie in die Szene.

// In js/ui/ui-search.js
import * as THREE from 'three';
import { scene } from '../core/scene.js'; // Ersetzt init.js
import { controls } from '../core/controls.js'; // Falls für Interaktionen nötig

// ... Rest des Code
import { state } from '../store/state.js';                        // 🔁 Globaler App-Zustand              
import { getMeta } from '../utils/index.js';                     // 📄 Lädt Metadaten der Modelle
import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';
import { highlightModel } from '../interaction/highlightModel.js';
import { showInfoPanel } from '../interaction/infoPanel.js';
import { getStructureDisplayLabel, getStructureSearchText, renderStructureLabel } from '../utils/anatomyLabels.js';

import { loadModels } from '../features/modelLoader-core.js'; 

/**
 * Initialisiert die Suchleiste und verbindet sie mit einem Ergebnis-Popup.
 * Bei Auswahl wird das Modell geladen, hervorgehoben und das Info-Panel geöffnet.
 */
export function setupSearchUI() {
  const searchBar = document.getElementById('search-bar');           // 🔍 Texteingabe für Suche
  if (searchBar) {
    searchBar.setAttribute('type', 'search');
    searchBar.setAttribute('inputmode', 'search');
  }
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
      getStructureSearchText(entry).includes(searchTerm)
    );

    // 📦 Für jeden Treffer ein visuelles Listenelement erzeugen
    results.forEach(result => {
      const group = result.classification?.group || result.group || 'other';
      const displayLabel = getStructureDisplayLabel(result);
      const item = document.createElement('div');
      item.className = 'search-item';
      renderStructureLabel(item, `${displayLabel} (${group})`);
      item.dataset.entry = JSON.stringify(result);                 // Speichere vollständigen Eintrag für später

      // 📌 Klick auf ein Suchergebnis: lade, zeige und fokussiere Modell
      item.addEventListener('click', async () => {
        const entry = JSON.parse(item.dataset.entry);
        const entryGroup = entry.classification?.group || entry.group || 'other';
        const loader = createGLTFLoader();

        // 🧲 Modell in Szene laden
        await loadModels([entry], entryGroup, true, scene, loader);

        // 🟢 Modellobjekt im geladenen Zustand finden
        const model = state.groups[entryGroup]?.find(
          m => (m.userData?.meta?.id || m.userData?.entry?.id || m.name) === entry.id
        );

        if (model) {
          highlightModel(model);              // ✨ Modell hervorheben
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
