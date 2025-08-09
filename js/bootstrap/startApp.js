// js/bootstrap/startApp.js
// 🚀 Orchestriert den vollständigen Start der Anwendung



// --- Core-System ---
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { renderer } from '../core/renderer.js';
import { modelPath } from '../core/path.js';

// --- State & Daten ---
import { state } from '../store/state.js';
import { initializeGroupsFromMeta } from '../data/meta.js';

// --- Loader ---
import { createGLTFLoader /*, disposeGLTFLoader*/ } from '../loaders/gltfLoaderFactory.js';
import { loadModels } from '../modelLoader/index.js';
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

// --- Utils ---
import { initializeGroupsFromMeta as initializeGroupsFromUtils } from '../utils/index.js';



/**
 * Hauptinitialisierung der App – ruft Setup-Module auf und lädt erste Modelle.
 */
export async function startApp() {
    initStaticAssets();

    const initialScreen = document.getElementById('initial-loading-screen');
    if (!initialScreen) {
        console.error('❌ Initial-Loading-Screen nicht gefunden');
        return;
    }
    initialScreen.style.backgroundColor = state.defaultSettings.loadingScreenColor;
    initialScreen.style.display = 'flex';

    setupUI();

    await initializeGroupsFromMeta();             // setzt state.groupedMeta, state.availableGroups

    await loadGroupByName('bones', { centerCamera: true });  // initial sichtbar
    state.groupStates['bones'] = true;

    await loadGroupByName('teeth');               // initial sichtbar
    state.groupStates['teeth'] = true;

    setupInteractions();
    initResizeHandler();

    await initializeGroupsFromMeta();
    console.log('✅ Metadaten geladen:', Object.keys(state.groupedMeta).length, 'Gruppen');

    // Initiale Gruppe laden (z. B. Knochen)
    const loader = createGLTFLoader();

    try {
        const autoLoadGroups = ['bones', 'teeth'];
        for (const group of autoLoadGroups) {
            const entries = state.groupedMeta[group] || [];
            if (entries.length) {
                showLoadingBar();
                console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${group}"...`);
                await loadModels(entries, group, true, scene, loader, camera, controls, renderer);
                hideLoadingBar();
            }
        } // ✅ ← schließende Klammer für for()
    } catch (err) {
        console.error('❌ Fehler beim Modell-Laden:', err);
        hideLoadingBar();
    }

    // Splashscreen ausblenden
    initialScreen.style.opacity = '0';
    setTimeout(() => (initialScreen.style.display = 'none'), 500);
    initCameraView();
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

}
