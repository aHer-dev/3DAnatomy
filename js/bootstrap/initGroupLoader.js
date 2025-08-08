// js/bootstrap/initGroupLoader.js
// 📦 Initialisiert das dynamische Laden anatomischer Gruppen (z. B. Muskeln) durch Buttons

import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';
import { loadModels, showLoadingBar, hideLoadingBar } from '../modelLoader/index.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { controls } from '../core/controls.js';
import { state } from '../store/state.js';

/**
 * Fügt EventListener zu Gruppenbuttons hinzu (z. B. Muskeln).
 * Ladeprozess mit DRACO-Kompression und Fortschrittsanzeige.
 */
export function initDynamicGroupLoading() {
    const loader = createGLTFLoader();
    

    const buttonGroupMap = {
        'muscles': 'btn-load-muscles',
        'ligaments': 'btn-load-ligaments',
        'tendons': 'btn-load-tendons',
        // weitere Gruppen bei Bedarf ergänzen...
    };

    Object.entries(buttonGroupMap).forEach(([group, buttonId]) => {
        const button = document.getElementById(buttonId);
        if (!button) {
            console.warn(`⚠️ Button für Gruppe "${group}" (${buttonId}) nicht gefunden.`);
            return;
        }

        button.addEventListener('click', async () => {
            const entries = state.groupedMeta[group] || [];
            if (!entries.length) {
                console.warn(`⚠️ Keine Modelle für Gruppe "${group}" in groupedMeta gefunden.`);
                return;
            }

            try {
                button.disabled = true;
                showLoadingBar();
                console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${group}"...`);
                await loadModels(entries, group, true, scene, loader, camera, controls, renderer);
                hideLoadingBar();
            } catch (err) {
                console.error(`❌ Fehler beim Laden der Gruppe "${group}":`, err);
                hideLoadingBar();
            } finally {
                button.disabled = false;
            }
        });
    });

    console.log('📦 Dynamisches Gruppenladen initialisiert.');
}