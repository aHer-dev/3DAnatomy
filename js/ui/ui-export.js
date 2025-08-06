// ui-export.js
// 📤📥 Zuständig für den Export und Import des aktuellen Zustands (Sets & Farben) über JSON-Dateien

import { state } from '../state.js'; // 🔁 Zugriff auf globale Zustände (Sets, Farben, Gruppen)

/**
 * Initialisiert die Export-/Import-Funktionen der Benutzeroberfläche.
 * Ermöglicht das Herunterladen und Wiederherstellen des aktuellen Datenzustands.
 */
export function setupExportUI() {
  // 🧭 Referenzen zu UI-Elementen: Export-Button & Import-File-Input
  const exportBtn = document.getElementById('btn-export-set');
  const importInput = document.getElementById('input-import-set');
  if (!exportBtn || !importInput) {
    console.warn('⚠️ Export-UI: Button oder File-Input fehlt.');
    return;
  }

  // 📤 EXPORT-VORGANG
  exportBtn.addEventListener('click', () => {
    // 🗃️ Datenstruktur, die exportiert werden soll
    const data = {
      setStructures: state.setStructures,       // Strukturierte Sets
      colors: state.colors,                     // Aktuelle Farbkonfiguration
      availableGroups: state.availableGroups    // (Optional) verfügbare anatomische Gruppen
      // ➕ Hier kannst du beliebig weitere State-Daten hinzufügen
    };

    // 🧱 JSON als Blob erzeugen (Textdatei im Browser)
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    // 📎 Temporäre URL für den Download erstellen
    const url = URL.createObjectURL(blob);

    // ⬇️ Simulierter Klick auf ein <a>-Element mit Download-Link
    const a = document.createElement('a');
    a.href = url;
    a.download = '3DAnatomie_Set.json'; // Name der exportierten Datei
    a.click();

    // 🧹 Aufräumen
    URL.revokeObjectURL(url);

    console.log('📤 Sammlung exportiert.');
  });

  // 📥 IMPORT-VORGANG
  importInput.addEventListener('change', event => {
    const file = event.target.files[0]; // Erstes ausgewähltes File
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result); // 📄 JSON-Daten einlesen

        // ✅ Daten in den State übernehmen (wenn gültig)
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

    // 📖 Datei als Text lesen (wird in reader.onload verarbeitet)
    reader.readAsText(file);
  });
}
