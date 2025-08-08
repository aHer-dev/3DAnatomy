// modelLoader-core
export { loadModels, loadSingleModel } from '../features/modelLoader-core.js';

// progress
export { showLoadingBar, hideLoadingBar } from './progress.js';

// cleanup
export { removeModelsByGroupOrSubgroup, removeModelByFilename } from './cleanup.js';

// groups
export {
    loadGroup,
    unloadGroup,
    updateGroupVisibility,
    restoreGroupState
} from '../features/groups.js';

// appearance
export { setModelColor, setModelOpacity, setModelVisibility } from '../features/appearance.js';

// Optional: color.js, falls du dort eine UI-spezifische Funktion hast
export { updateModelColors as updateModelColorsFromColorUI } from './color.js';
