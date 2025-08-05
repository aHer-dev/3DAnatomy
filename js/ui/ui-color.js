// ui-color.js
import { state } from '../state.js';
import { updateModelColors } from '../modelLoader/color.js';

export function setupColorUI() {
  const container = document.getElementById('color-controls');
  if (!container) {
    console.warn('⚠️ Kein Element mit ID "color-controls" gefunden.');
    return;
  }

  state.availableGroups.forEach(group => {
    const wrapper = document.createElement('div');
    wrapper.className = 'color-control';

    const label = document.createElement('label');
    label.htmlFor = `${group}-color`;
    label.textContent = group;

    const input = document.createElement('input');
    input.type = 'color';
    input.id = `${group}-color`;
    input.className = 'group-color';

    const hex = '#' + state.colors[group].toString(16).padStart(6, '0');
    input.value = hex;

    input.addEventListener('input', () => {
  const colorValue = parseInt(input.value.replace('#', ''), 16);
  updateModelColors(group, colorValue);
      console.log(`🔄 Farbe für Gruppe "${group}" aktualisiert: ${input.value}`);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  });

  console.log('🎨 setupColorUI: Dynamische Farbfelder initialisiert.');
}
