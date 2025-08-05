// ui-controls.js
import { state } from '../state.js';
import { restoreGroupState } from '../modelLoader/index.js';

export function setupControlsUI() {
  const menuIcon = document.getElementById('menu-icon');
  const controlsPanel = document.getElementById('controls');

  if (!menuIcon || !controlsPanel) {
    console.warn('⚠️ ui-controls: Menü-Icon oder Panel fehlt.');
    return;
  }

  controlsPanel.style.display = 'none';
  menuIcon.classList.remove('open');

  menuIcon.addEventListener('click', () => {
    const isOpen = controlsPanel.style.display === 'block';
    controlsPanel.style.display = isOpen ? 'none' : 'block';
    menuIcon.classList.toggle('open');

    if (!isOpen) {
      ['muscles', 'bones', 'tendons', 'other'].forEach(group => {
        restoreGroupState(group);
      });
      console.log('🔄 Panel geöffnet – Zustände restauriert');
    } else {
      console.log('📦 Panel geschlossen');
    }
  });

  console.log('☰ ui-controls initialisiert.');
}
