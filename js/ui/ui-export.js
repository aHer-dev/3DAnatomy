// ui-export.js
// 📤📥 Zuständig für den Export und Import des aktuellen Zustands (Sets & Farben) über JSON-Dateien

import { state } from '../store/state.js'; // 🔁 Zugriff auf globale Zustände (Sets, Farben, Gruppen)

/**
 * Initialisiert die Export-/Import-Funktionen der Benutzeroberfläche.
 * Ermöglicht das Herunterladen und Wiederherstellen des aktuellen Datenzustands.
 */
export function setupExportUI() {
  const exportBtn = document.getElementById('btn-export-set');
  const importInput = document.getElementById('input-import-set');

  if (!exportBtn || !importInput) {
    console.warn('⚠️ Export-UI: Button oder File-Input fehlt.');
    return;
  }

  // EXPORT (unverändert)
  exportBtn.addEventListener('click', () => {
    const data = {
      version: '2.0',
      timestamp: Date.now(),
      collection: state.collection.map(item => ({
        id: item.model?.userData?.meta?.id || item.id,
        name: item.name || item.model?.name,
        group: item.model?.userData?.group,
        // ✅ WICHTIG: Individuelle Einstellungen speichern
        color: item.color || extractModelColor(item.model),
        opacity: item.opacity || extractModelOpacity(item.model),
        visible: item.visible !== false,
        meta: item.meta
      })),
      colors: state.colors // Aktuelle Farben
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anatomie-sammlung-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('📤 Sammlung exportiert:', state.collection.length, 'Objekte');
  });

  // IMPORT - VERBESSERT
  importInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const data = JSON.parse(e.target.result);
        console.log('📥 Importiere Sammlung...', data);

        // Sammlung leeren
        state.collection = [];

        // Für jedes gespeicherte Objekt
        for (const savedItem of data.collection) {
          // Prüfen ob Gruppe geladen ist, sonst laden
          const groupName = savedItem.group;
          if (groupName && (!state.groups[groupName] || state.groups[groupName].length === 0)) {
            console.log(`📦 Lade Gruppe "${groupName}" für Import...`);
            await loadGroupByName(groupName, { centerCamera: false });
          }

          // Modell in geladenen Gruppen finden
          let foundModel = null;
          for (const group of Object.values(state.groups)) {
            for (const model of group) {
              const modelId = model.userData?.meta?.id || model.name;
              if (modelId === savedItem.id) {
                foundModel = model;
                break;
              }
            }
            if (foundModel) break;
          }

          if (foundModel) {
            // ✅ WICHTIG: Gespeicherte Einstellungen anwenden
            if (savedItem.color) {
              setModelColor(foundModel, savedItem.color);
            }
            if (savedItem.opacity !== undefined) {
              setModelOpacity(foundModel, savedItem.opacity);
            }
            setModelVisibility(foundModel, savedItem.visible);

            // Zur Sammlung hinzufügen mit allen Einstellungen
            state.collection.push({
              model: foundModel,
              id: savedItem.id,
              name: savedItem.name,
              meta: savedItem.meta,
              color: savedItem.color,
              opacity: savedItem.opacity,
              visible: savedItem.visible
            });
          } else {
            console.warn(`⚠️ Modell ${savedItem.id} nicht gefunden`);
          }
        }

        // UI aktualisieren
        updateCollectionUI();
        console.log('✅ Import abgeschlossen:', state.collection.length, 'Objekte');
        alert(`✅ ${state.collection.length} Objekte importiert!`);

      } catch (err) {
        console.error('❌ Import-Fehler:', err);
        alert('❌ Fehler beim Importieren der Datei.');
      }
    };
    reader.readAsText(file);
  });
}



function extractModelColor(model) {
  if (!model) return null;
  let color = null;
  model.traverse(child => {
    if (child.isMesh && child.material && !color) {
      color = child.material.color.getHex();
    }
  });
  return color;
}

function extractModelOpacity(model) {
  if (!model) return 1;
  let opacity = 1;
  model.traverse(child => {
    if (child.isMesh && child.material) {
      opacity = child.material.opacity || 1;
    }
  });
  return opacity;
}