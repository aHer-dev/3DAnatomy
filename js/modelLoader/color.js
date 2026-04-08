import { state } from '../store/state.js';

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
  const resolved = (hexColor ?? state.colors?.[group] ?? state.defaultSettings?.colors?.[group] ?? state.defaultSettings?.defaultColor ?? 0xcccccc);
  state.groups[group].forEach(model => {
    model.traverse(child => {
      if (child.isMesh && child.material) child.material.color.setHex(resolved);
    });
  });
  state.colors[group] = resolved;
  console.log(`🎨 Farbe für Gruppe "${group}" gesetzt: 0x${resolved.toString(16).padStart(6, '0')}`);
}


/**
 * Setzt die Farbe einer Gruppe auf den gespeicherten Standardwert zurück.
 * @param {string} group
 */
export function resetGroupColor(group) {
  const defaultColor = state.defaultSettings.resetColors?.[group] ?? state.defaultSettings.colors[group];
  if (defaultColor === undefined) {
    console.warn(`⚠️ Keine Standardfarbe für Gruppe "${group}" definiert.`);
    return;
  }
  updateModelColors(group, defaultColor);
}
