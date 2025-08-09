// js/bootstrap/startApp.js
// 🚀 Orchestriert den vollständigen Start der Anwendung



// --- Core-System ---
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { renderer } from '../core/renderer.js';


// --- State & Daten ---
import { state } from '../store/state.js';
import { initializeGroupsFromMeta } from '../data/meta.js';
import { restoreAllGroupStates } from '../features/groups.js';


// --- Loader ---

import { showLoadingBar, hideLoadingBar } from '../modelLoader/progress.js';
import { loadGroupByName } from '../features/modelLoader-core.js';

// --- Features ---
import { setupInteractions } from '../interaction/index.js';

// --- Bootstrap ---
import { initStaticAssets } from './initStaticAssets.js';
import { initResizeHandler } from './initResizeHandler.js';
import { initCameraView } from './initCameraView.js';

// --- UI ---
import { setupUI } from '../ui/ui-init.js';





/**
 * Hauptinitialisierung der App – ruft Setup-Module auf und lädt erste Modelle.
 */
export async function startApp() {
    initStaticAssets();

    // Splash Screen
    const initialScreen = document.getElementById('initial-loading-screen');
    if (!initialScreen) {
        console.error('❌ Initial-Loading-Screen nicht gefunden');
        return;
    }
    initialScreen.style.backgroundColor = state.defaultSettings.loadingScreenColor;
    initialScreen.style.display = 'flex';

    try {
        // 1) Meta laden und State initialisieren
        await initializeGroupsFromMeta();
        console.log('✅ Metadaten geladen:', Object.keys(state.groupedMeta).length, 'Gruppen');

        // 2) UI Setup
        setupUI?.();

        // 3) Initiale Gruppen laden
        showLoadingBar();

        await loadGroupByName('bones', { centerCamera: true });
        state.groupStates.bones = true;

        await loadGroupByName('teeth');
        state.groupStates.teeth = true;

        hideLoadingBar();

        // 4) Gespeicherte Zustände wiederherstellen
        restoreAllGroupStates();

        // 5) Interaktionen & Resize
        setupInteractions();
        initResizeHandler();
        initCameraView();

        // 6) Render Loop
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

    } catch (err) {
        console.error('❌ Fehler beim App-Start:', err);
        hideLoadingBar();
    } finally {
        // Splash ausblenden
        initialScreen.style.opacity = '0';
        setTimeout(() => (initialScreen.style.display = 'none'), 500);
    }
}
  
