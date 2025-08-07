import { setupSearchUI } from './ui-search.js';
import { setupColorUI } from './ui-color.js';
import { setupSetUI } from './ui-set.js';
import { setupResetUI } from './ui-reset.js';
import { setupSubmenuUI } from './ui-submenu.js';
import { setupExportUI } from './ui-export.js';
import { setupControlsUI } from './ui-controls.js';
import { setupRoomUI } from './ui-room.js';
import { setupLoadingUI } from './ui-loading.js';
import { toggleLicense } from './license.js';
import { licenseHTML } from './licenseContent.js';

// import { loadModels } from '../modelLoader/index.js'; // Nicht nötig hier – in app.js

export function setupUI() {
  try {
    setupSearchUI();
    setupColorUI();
    setupSetUI();
    setupResetUI();
    setupSubmenuUI();
    setupExportUI();
    setupControlsUI();
    setupRoomUI();
    setupLoadingUI();

    const toggleButton = document.getElementById('btn-toggle-license');
    const licenseInfo = document.getElementById('license-info');
    
    if (licenseInfo) {
      licenseInfo.innerHTML = licenseHTML || '<p>⚠️ Lizenztext fehlt</p>';
    }

    if (toggleButton) {
      toggleButton.addEventListener('click', toggleLicense);
    }
  } catch (err) {
    console.error('❌ Fehler bei UI-Setup:', err);
  }
}