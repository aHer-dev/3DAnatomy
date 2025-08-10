// ui-controls.js
// 🔧 Steuert das Ein- und Ausblenden des Seitenpanels mit UI-Kontrolle und stellt den Zustand anatomischer Gruppen wieder her

import { state } from '../store/stateManager.js'; // Globale Zustandsverwaltung
import { restoreGroupState } from '../features/groups.js'; // Funktion zur Wiederherstellung der Sichtbarkeitszustände

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
    const isOpen = controlsPanel.style.display === 'block';

    // Toggle Sichtbarkeit + Icon
    controlsPanel.style.display = isOpen ? 'none' : 'block';
    menuIcon.classList.toggle('open');

    if (!isOpen) {
      // 🌟 Nur gültige Gruppen restoren
      const groups = state.availableGroups || [];
      groups.forEach(g => restoreGroupState(g));
      console.log('🔄 Panel geöffnet – Zustände restauriert:', groups);
    } else {
      console.log('📦 Panel geschlossen');
    }
  });

  // ✅ Logge erfolgreiche Initialisierung
  console.log('☰ ui-controls initialisiert.');
}
