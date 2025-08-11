// js/bootstrap/startApp.js
// 🚀 Orchestriert den vollständigen Start der Anwendung

// ============================================
// 🎛️ RENDER-OPTIMIERUNG KONFIGURATION
// ============================================
const RENDER_OPTIMIZATION = {
    enabled: false,              // ← HIER EIN/AUS: true für Mobile-Optimierung
    autoActivate: true,          // ← Auto-Aktivierung bei schlechter Performance
    frustumCulling: true,        // ← Nur sichtbare Objekte rendern
    lod: true,                   // ← Level-of-Detail basierend auf Entfernung
    debugStats: false            // ← Performance-Stats in Console ausgeben
};
// ============================================

import * as THREE from 'three'; // ⬅️ nötig für PMREM etc.

import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { renderer, requestShadowUpdate, freezeShadows/*, thawShadows*/ } from '../core/renderer.js';

import {
    defaultAppearance as appearance,
    applyRendererAppearance,
    applyEnvIntensity,
    applyGroupMaterialTweaks
} from '../features/appearance.js';

import { state } from '../store/state.js';
import { initializeGroupsFromMeta } from '../data/meta.js';
import { restoreAllGroupStates } from '../features/groups.js';

import { showLoadingBar, hideLoadingBar } from '../modelLoader/progress.js';
import { loadGroupByName } from '../features/modelLoader-core.js';

import { setupInteractions } from '../interaction/index.js';
import { setupBasicLights, getLightRig, fitShadowFrustumToScene } from '../lights.js';

import { initStaticAssets } from './initStaticAssets.js';
import { initResizeHandler } from './initResizeHandler.js';
import { initCameraView } from './initCameraView.js';

import { setupUI } from '../ui/ui-init.js';
import { retuneCameraClipping } from '../utils/cameraClipping.js';

import { getResourceManager } from '../core/resourceManager.js';
import { updatePerformanceMonitor } from '../debug/performanceMonitor.js';

// --- RENDER-OPTIMIERUNG (optional) ---
let renderOptimizer = null;
let useOptimization = false;



// Conditional Import - nur laden wenn Optimierung aktiviert
async function loadOptimizer() {
    if (!RENDER_OPTIMIZATION.enabled && !RENDER_OPTIMIZATION.autoActivate) {
        return null;
    }

    try {
        const { createOptimizer } = await import('../core/renderOptimizer.js');
        return createOptimizer(camera, scene, renderer);
    } catch (err) {
        console.warn('⚠️ Render-Optimizer konnte nicht geladen werden:', err);
        return null;
    }
}


/**
 * Render-Funktion mit optionaler Optimierung
 */
function renderFrame() {
    // 🎛️ OPTIMIERUNG: Nur ausführen wenn aktiviert
    if (useOptimization && renderOptimizer) {
        renderOptimizer.optimize();

        // Debug-Stats (optional)
        if (RENDER_OPTIMIZATION.debugStats && Math.random() < 0.01) { // Nur jedes 100. Frame
            renderOptimizer.debugLog();
        }
    }

    // Standard-Rendering
    renderer.render(scene, camera);
}

/**
 * Hauptinitialisierung der App – ruft Setup-Module auf und lädt erste Modelle.
 */
export async function startApp() {
    initStaticAssets();

    const initialScreen = document.getElementById('initial-loading-screen');
    if (!initialScreen) { console.error('❌ Initial-Loading-Screen nicht gefunden'); return; }
    initialScreen.style.backgroundColor = state.defaultSettings.loadingScreenColor;
    initialScreen.style.display = 'flex';

    try {
        // 1) Meta
        await initializeGroupsFromMeta();
        console.log('✅ Metadaten geladen:', Object.keys(state.groupedMeta).length, 'Gruppen');

        // 2) Licht + (optional) HDR
        setupBasicLights(scene);
        await tryApplyEnvironment(renderer);

        // 3) UI
        setupUI?.();

        // 4) (optional) Optimizer laden/konfigurieren – unverändert …
        // if (RENDER_OPTIMIZATION.enabled || RENDER_OPTIMIZATION.autoActivate) { … }

        // 5) Initiale Gruppen laden
        showLoadingBar();
        await loadGroupByName('bones', { centerCamera: true });
        state.groupStates.bones = true;

        await loadGroupByName('teeth', { centerCamera: false });
        state.groupStates.teeth = true;


        // 5a) Schattenfähigkeiten für bereits geladene Objekte setzen
        scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

        // 5b) Shadow-Frustum ans Motiv anpassen (falls Helper vorhanden)
        const rig = getLightRig?.();
        if (rig?.key) fitShadowFrustumToScene(rig.key, scene);

        // … nach loadGroupByName('bones') und ('teeth'):
        const cfg = state?.defaultSettings?.appearance || appearance;

        applyRendererAppearance(renderer, cfg);
        applyEnvIntensity(scene, cfg);
        applyGroupMaterialTweaks('bones', state.groups, cfg);
        applyGroupMaterialTweaks('teeth', state.groups, cfg);

        requestShadowUpdate();
        freezeShadows();

        hideLoadingBar();

        // 6) Auto-Optimizer (wie gehabt) …

        // 7) Zustände & Interaktion
        restoreAllGroupStates();
        setupInteractions();
        initResizeHandler();
        initCameraView();

        // 8) Render-Loop (wie gehabt)
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            updatePerformanceMonitor(); // ← Diese eine Zeile hinzufügen
            renderer.render(scene, camera);
        }
        animate();

        console.log('🚀 App erfolgreich gestartet');
        // optional Debug:
        // window.app = { state, scene, camera, controls, renderer };
    } catch (err) {
        console.error('❌ Fehler beim App-Start:', err);
        hideLoadingBar();
    } finally {
        initialScreen.style.opacity = '0';
        setTimeout(() => (initialScreen.style.display = 'none'), 500);
    }

    const resourceManager = getResourceManager();
    console.log('📊 Resource Manager Status:', resourceManager.getStats());
}

// ============================================
// 🎛️ SCHNELL-KONFIGURATION FÜR ENTWICKLUNG
// ============================================

/**
 * Aktiviert Optimierung sofort (für Testing)
 */
export function enableRenderOptimization() {
    if (window.renderOptimizer) {
        window.renderOptimizer.enable();
    } else {
        console.warn('⚠️ Optimizer nicht verfügbar - RENDER_OPTIMIZATION.enabled auf true setzen');
    }
}

/**
 * Deaktiviert Optimierung sofort
 */
export function disableRenderOptimization() {
    if (window.renderOptimizer) {
        window.renderOptimizer.disable();
    }
}

/**
 * Zeigt Performance-Stats
 */
export function showRenderStats() {
    if (window.renderOptimizer) {
        console.table(window.renderOptimizer.stats());
    } else {
        console.log('📊 Render-Optimizer nicht aktiv');
    }
}


async function tryApplyEnvironment(renderer) {
    try {
        const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
        const pmrem = new THREE.PMREMGenerator(renderer);
        const hdrUrl = 'env/default.hdr';
        const hdr = await new RGBELoader().loadAsync(hdrUrl);
        const envTex = pmrem.fromEquirectangular(hdr).texture;
        hdr.dispose();
        scene.environment = envTex;
        scene.background = null;
        console.log('HDR-Environment aktiv');
    } catch (e) {
        console.warn('Kein HDR geladen (ok) – weiter ohne Environment.', e?.message);
    }
}