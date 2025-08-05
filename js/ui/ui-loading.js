// ui-loading.js
import { state } from '../state.js';

export function setupLoadingUI() {
  const loadingColorPicker = document.createElement('input');
  loadingColorPicker.type = 'color';
  loadingColorPicker.id = 'loading-color';
  loadingColorPicker.value = state.defaultSettings.loadingScreenColor;

  loadingColorPicker.addEventListener('input', (e) => {
    state.loadingScreenColor = e.target.value;
    const screen = document.getElementById('initial-loading-screen');
    if (screen) screen.style.backgroundColor = e.target.value;
  });

  const container = document.getElementById('room-dropdown-content');
  if (container) {
    const label = document.createElement('label');
    label.textContent = 'Ladefarbe: ';
    label.appendChild(loadingColorPicker);
    container.appendChild(label);
  } else {
    console.warn('⚠️ ui-loading: room-dropdown-content nicht gefunden.');
  }

  console.log('⏳ ui-loading initialisiert.');
}
