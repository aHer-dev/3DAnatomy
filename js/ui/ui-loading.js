// ui-loading.js
// ⏳ Ermöglicht es dem Benutzer, die Hintergrundfarbe des Ladebildschirms über einen Farbwähler zu ändern.

import { state } from '../store/stateManager.js'; // 🔁 Zugriff auf globale Zustände, z. B. defaultSettings und loadingScreenColor

/**
 * Initialisiert die UI-Komponente zum Ändern der Ladebildschirmfarbe.
 * Fügt einen <input type="color"> in ein Dropdown-Menü ein, der live den Ladehintergrund anpasst.
 */
export function setupLoadingUI() {
  // 🎨 Erzeuge einen Farbwähler (input type="color")
  const loadingColorPicker = document.createElement('input');
  loadingColorPicker.type = 'color';                       // Eingabefeld für Farben (z. B. #ff0000)
  loadingColorPicker.id = 'loading-color';                // ID für spätere Referenz
  loadingColorPicker.value = state.defaultSettings.loadingScreenColor; // Initialwert aus dem globalen Zustand

  // 🔁 Wenn Benutzer eine neue Farbe auswählt …
  loadingColorPicker.addEventListener('input', (e) => {
    const newColor = e.target.value;

    // 🧠 Aktuellen Zustand aktualisieren
    state.loadingScreenColor = newColor;

    // 🎯 Ladebildschirm visuell aktualisieren
    const screen = document.getElementById('initial-loading-screen');
    if (screen) screen.style.backgroundColor = newColor;
  });

  // 📦 Einfügeort finden: <div id="room-dropdown-content">
  const container = document.getElementById('room-dropdown-content');

  if (container) {
    // 🏷️ Label + Farbwähler zusammenbauen
    const label = document.createElement('label');
    label.textContent = 'Ladefarbe: ';           // Text vor dem Farbwähler
    label.appendChild(loadingColorPicker);       // Farbwähler dem Label hinzufügen
    container.appendChild(label);                // Label dem Container anhängen
  } else {
    // ⚠️ Fehler, wenn Zielcontainer nicht existiert
    console.warn('⚠️ ui-loading: room-dropdown-content nicht gefunden.');
  }

  // 🟢 Erfolgsmeldung in Konsole
  console.log('⏳ ui-loading initialisiert.');
}
