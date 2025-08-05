// modelLoader-appearance.js
import { state } from '../state.js';

/**
 * Aktualisiert die Farbe aller Modelle einer bestimmten Gruppe.
 * @param {string} group - z. B. "muscles"
 */
export function updateModelColors(group) {
  const models = state.groups[group];
  const newColor = state.colors[group] || 0xff0000;

  if (!models || models.length === 0) {
    console.warn(`⚠️ Keine Modelle in Gruppe "${group}" für Farbänderung.`);
    return;
  }

  models.forEach(model => {
    model.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.color.setHex(newColor);
      }
    });
  });

  console.log(`🎨 Farbe für Gruppe "${group}" aktualisiert:`, newColor.toString(16));
}

/**
 * Setzt die Sichtbarkeit aller Modelle einer Gruppe auf Basis von state.groupStates.
 * @param {string} group
 */
export function updateGroupVisibility(group) {
  const models = state.groups[group];

  if (!models || models.length === 0) {
    console.warn(`⚠️ Keine Modelle in Gruppe "${group}" zur Sichtbarkeitskontrolle.`);
    return;
  }

  models.forEach(model => {
    const visible = state.groupStates[group][model.name] !== false;
    model.visible = visible;
  });

  console.log(`👁 Sichtbarkeit für Gruppe "${group}" aktualisiert.`);
}
