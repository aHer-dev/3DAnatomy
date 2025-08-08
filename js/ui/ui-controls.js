// ui-controls.js
// 🔧 Steuert das Ein- und Ausblenden des Seitenpanels mit UI-Kontrolle und stellt den Zustand anatomischer Gruppen wieder her

import { state } from '../store/state.js'; // Globale Zustandsverwaltung
import { restoreGroupState } from '../modelLoader/index.js'; // Funktion zur Wiederherstellung der Sichtbarkeitszustände

/**
 * Initialisiert die Benutzeroberflächen-Steuerung (Burger-Menü und Panel).
 * Sorgt dafür, dass das Panel ein-/ausgeblendet werden kann und Gruppenstatus wiederhergestellt wird.
 */
export function setupControlsUI() {
  const menuIcon = document.getElementById('menu-icon');
  const controlsPanel = document.getElementById('controls');
  if (!menuIcon || !controlsPanel) {
    console.warn('⚠️ ui-controls: Menü-Icon oder Panel fehlt.');
    return;
  }

  // 🔧 Initialzustand: Panel ausblenden, Icon-Zustand zurücksetzen
  controlsPanel.style.display = 'none';
  menuIcon.classList.remove('open');

  // 📌 Event Listener: Beim Klick auf das Menü-Icon
  menuIcon.addEventListener('click', () => {
    // ➕ Prüfe, ob das Panel aktuell offen ist
    const isOpen = controlsPanel.style.display === 'block';
    console.log('Controls Display:', controlsPanel.style.display);
    // 🔁 Toggle Sichtbarkeit und Icon-Zustand
    controlsPanel.style.display = isOpen ? 'none' : 'block';
    menuIcon.classList.toggle('open');

    if (!isOpen) {
      // 📦 Wenn Panel geöffnet wird, stelle Sichtbarkeitszustände für Gruppen wieder her
      ['muscles', 'bones', 'tendons', 'other'].forEach(group => {
        restoreGroupState(group);
      });
      console.log('🔄 Panel geöffnet – Zustände restauriert');
    } else {
      console.log('📦 Panel geschlossen');
    }
  });

  // ✅ Logge erfolgreiche Initialisierung
  console.log('☰ ui-controls initialisiert.');
}
