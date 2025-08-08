// js/bootstrap/startApp.js
// 🚀 Orchestriert den vollständigen Start der Anwendung

import { initStaticAssets } from './initStaticAssets.js';
import { initResizeHandler } from './initResizeHandler.js';
import { initCameraView } from './initCameraView.js';
import { setupUI } from '../ui/ui-init.js';
import { initializeGroupsFromMeta } from '../utils/index.js';
import { showLoadingBar, hideLoadingBar } from '../modelLoader/progress.js';
import { loadModels } from '../modelLoader/index.js';
import { state } from '../state.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { dracoLoader } from '../modelLoader/dracoLoader.js';
import { scene } from '../scene.js';
import { camera } from '../camera.js';
import { controls } from '../controls.js';
import { renderer } from '../renderer.js';
import { setupInteractions } from '../interaction/index.js';


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
    setupInteractions();
    initResizeHandler();

    await initializeGroupsFromMeta();
    console.log('✅ Metadaten geladen:', Object.keys(state.groupedMeta).length, 'Gruppen');

    // Initiale Gruppe laden (z. B. Knochen)
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

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
