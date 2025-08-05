// ui-export.js
import { state } from '../state.js';

export function setupExportUI() {
  const exportBtn = document.getElementById('export-set-button');
  const importInput = document.getElementById('import-set-file');

  if (!exportBtn || !importInput) {
    console.warn('⚠️ Export-UI: Button oder File-Input fehlt.');
    return;
  }

  // Export als JSON-Datei
  exportBtn.addEventListener('click', () => {
    const data = {
      setStructures: state.setStructures,
      colors: state.colors,
      availableGroups: state.availableGroups
      // Du kannst hier beliebig erweitern
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '3DAnatomie_Set.json';
    a.click();
    URL.revokeObjectURL(url);

    console.log('📤 Sammlung exportiert.');
  });

  // Import aus Datei
  importInput.addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);

        // Struktur importieren
        if (Array.isArray(data.setStructures)) {
          state.setStructures = data.setStructures;
        }

        if (typeof data.colors === 'object') {
          state.colors = data.colors;
        }

        console.log('📥 Sammlung importiert.');
      } catch (err) {
        alert('❌ Fehler beim Importieren der Datei.');
      }
    };

    reader.readAsText(file);
  });
}
