// ui-color.js
// 🎨 Erstellt für jede anatomische Gruppe ein Farbwahl-Element, mit dem der Benutzer die Farbe aller zugehörigen Modelle ändern kann.

import { state } from '../state.js';                      // 🔁 Globaler Zustand (z. B. Farben, Gruppen)
import { updateModelColors } from '../modelLoader/color.js'; // 🎨 Funktion, die Farben in der Szene aktualisiert

/**
 * Initialisiert die Farbauswahl-UI für jede anatomische Gruppe.
 * Erstellt <input type="color"> Elemente dynamisch und bindet sie mit Update-Logik.
 */
export function setupColorUI() {
  const container = document.getElementById('color-controls');
  if (!container) {
    console.warn('⚠️ Kein Element mit ID "color-controls" gefunden.');
    return;
  }

  // 🔁 Für jede verfügbare Gruppe ein eigenes Farbfeld erstellen
  state.availableGroups.forEach(group => {
    const wrapper = document.createElement('div');
    wrapper.className = 'color-control';

    // 🏷️ Beschriftung
    const label = document.createElement('label');
    label.htmlFor = `${group}-color`;
    label.textContent = group;

    // 🎨 Farbauswahlfeld
    const input = document.createElement('input');
    input.type = 'color';
    input.id = `${group}-color`;
    input.className = 'group-color';

    // 🟢 Initialwert aus aktuellem Zustand extrahieren
    const hex = '#' + state.colors[group].toString(16).padStart(6, '0'); // z. B. "#ff0000"
    input.value = hex;

    // 📌 Event: Farbe wurde geändert
    input.addEventListener('input', () => {
      const colorValue = parseInt(input.value.replace('#', ''), 16); // z. B. "#ff0000" → 0xff0000
      updateModelColors(group, colorValue);                          // ✅ Neue Farbe anwenden
      console.log(`🔄 Farbe für Gruppe "${group}" aktualisiert: ${input.value}`);
    });

    // 🔧 Zusammenbauen und ins DOM einfügen
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  });

  // 🟢 Bestätigung in Konsole
  console.log('🎨 setupColorUI: Dynamische Farbfelder initialisiert.');
}
