// js/modelLoader/index.js
export * from './core.js';
export * from './progress.js';
export * from './cleanup.js';
export * from './groups.js';
export { removeModelsByGroupOrSubgroup, removeModelByFilename } from './cleanup.js';
export { restoreGroupState } from './groups.js';

// export * from './appearance.js';  ← Entfernen oder gezielt exportieren
// export * from './color.js';       ← Entfernen oder gezielt exportieren

// 🔧 gezielter Export bei Namenskonflikt:
export { updateModelColors, updateGroupVisibility } from './appearance.js';
// Falls du aus color.js etwas brauchst, z. B.:
export { updateModelColors as updateModelColorsFromColorUI } from './color.js';

