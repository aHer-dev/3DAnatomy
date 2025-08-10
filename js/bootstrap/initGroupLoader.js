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

    // optional: Aliasse für alte Button-IDs
    const alias = { tendons: 'ligaments' };

    // Binde an alles, was die Meta hergibt
    const groups = state.availableGroups || [];
    let bound = 0;

    // 1) Buttons mit id="btn-load-<group>" binden
    for (const g of groups) {
        const btn = document.getElementById(`btn-load-${g}`);
        if (!btn) continue;
        btn.addEventListener('click', async () => {
            const entries = state.groupedMeta[g] || [];
            if (!entries.length) return;
            try {
                btn.disabled = true;
                showLoadingBar();
                await loadModels(entries, g, true, scene, loader, camera, controls, renderer);
            } catch (e) {
                console.error(`Fehler beim Laden von "${g}"`, e);
            } finally {
                hideLoadingBar();
                btn.disabled = false;
            }
        });
        bound++;
    }

    // 2) Legacy-Buttons (z.B. #btn-load-tendons) auf Aliasse mappen
    for (const legacy in alias) {
        const target = alias[legacy];
        const btn = document.getElementById(`btn-load-${legacy}`);
        if (!btn || !groups.includes(target)) continue;
        btn.addEventListener('click', async () => {
            const entries = state.groupedMeta[target] || [];
            if (!entries.length) return;
            try {
                btn.disabled = true;
                showLoadingBar();
                await loadModels(entries, target, true, scene, loader, camera, controls, renderer);
            } catch (e) {
                console.error(`Fehler beim Laden von "${target}"`, e);
            } finally {
                hideLoadingBar();
                btn.disabled = false;
            }
        });
        bound++;
    }

    console.log(`📦 Dynamisches Gruppenladen initialisiert (gebundene Buttons: ${bound}).`);
}