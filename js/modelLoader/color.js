// js/modelLoader/color.js

import { state } from '../state.js';

/**
 * Setzt die Farbe aller Modelle einer Gruppe neu.
 * @param {string} group - Gruppenname (z. B. 'bones')
 * @param {number} hexColor - Neue Farbe als Hexwert (z. B. 0xff0000)
 */
export function updateModelColors(group, hexColor) {
  if (!state.groups[group]) {
    console.warn(`⚠️ Gruppe "${group}" nicht gefunden im State.`);
    return;
  }

  state.groups[group].forEach(model => {
    model.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.color.setHex(hexColor);
      }
    });
  });

  // Speichere neue Farbe im State
  state.colors[group] = hexColor;
  state.defaultSettings.colors[group] = hexColor;

  console.log(`🎨 Farbe für Gruppe "${group}" gesetzt:`, hexColor.toString(16));
}

/**
 * Setzt die Farbe einer Gruppe auf den gespeicherten Standardwert zurück.
 * @param {string} group
 */
export function resetGroupColor(group) {
  const defaultColor = state.defaultSettings.colors[group];
  if (defaultColor === undefined) {
    console.warn(`⚠️ Keine Standardfarbe für Gruppe "${group}" definiert.`);
    return;
  }
  updateModelColors(group, defaultColor);
}
