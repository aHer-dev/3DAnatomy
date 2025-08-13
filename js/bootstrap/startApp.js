// js/bootstrap/startApp.js - IMPORT FIX

// ============================================
// 🎛️ RENDER-OPTIMIERUNG KONFIGURATION
// ============================================
const RENDER_OPTIMIZATION = {
    enabled: false,
    autoActivate: true,
    frustumCulling: true,
    lod: true,
    debugStats: false
};

import * as THREE from 'three';

import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { renderer, requestShadowUpdate, freezeShadows } from '../core/renderer.js';

import {
    defaultAppearance as appearance,
    applyRendererAppearance,
    applyEnvIntensity,
    applyGroupMaterialTweaks
} from '../features/appearance.js';

import { state } from '../store/state.js';
import { getConfig } from '../config/config.js';
import { initializeGroupsFromMeta } from '../data/meta.js';
import { restoreAllGroupStates } from '../features/groups.js';

import { showLoadingBar, hideLoadingBar } from '../modelLoader/progress.js';
import { loadGroupByName } from '../features/modelLoader-core.js';
import { setupGroupToggle } from '../features/groupToggle.js';
import { setupInteractions } from '../interaction/index.js';
import { setupBasicLights, getLightRig, fitShadowFrustumToScene } from '../lights.js';

import { initStaticAssets } from './initStaticAssets.js';
import { initResizeHandler } from './initResizeHandler.js';
import { initCameraView } from './initCameraView.js';

// ✅ FEHLENDER IMPORT HINZUGEFÜGT
import { initDynamicGroupLoading } from './initGroupLoader.js';

import { setupUI } from '../ui/ui-init.js';
import { updateModelColors } from '../modelLoader/color.js';

import { getResourceManager } from '../core/resourceManager.js';
import { updatePerformanceMonitor } from '../debug/performanceMonitor.js';
import '../bootstrap/initSplashScreen.js';
import '../utils/migration-helper.js';

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
    if (useOptimization && renderOptimizer) {
        renderOptimizer.optimize();

        if (RENDER_OPTIMIZATION.debugStats && Math.random() < 0.01) {
            renderOptimizer.debugLog();
        }
    }

    renderer.render(scene, camera);
}

/**
 * Hauptinitialisierung der App
 */
export async function startApp() {
    initStaticAssets();

    const initialScreen = document.getElementById('initial-loading-screen');
    if (!initialScreen) { console.error('❌ Initial-Loading-Screen nicht gefunden'); return; }
    initialScreen.style.backgroundColor = getConfig('ui.theme.loadingScreen', '#0B1020');
    initialScreen.style.display = 'flex';

    try {
        // 1) Meta
        await initializeGroupsFromMeta();
        console.log('✅ Metadaten geladen:', Object.keys(state.groupedMeta).length, 'Gruppen');

        // 2) Licht + (optional) HDR
        setupBasicLights(scene);
        await tryApplyEnvironment(renderer);

        const cfgColors = getConfig('ui.colors', null);

        // 2) In den State spiegeln, ohne existierende Defaults zu überschreiben
        if (cfgColors) {
            state.defaultSettings = state.defaultSettings || {};
            state.defaultSettings.colors = {
                ...(state.defaultSettings.colors || {}),
                ...cfgColors
            };

            state.colors = {
                ...(state.colors || {}),
                ...state.defaultSettings.colors
            };
        }

        // 3) UI
        setupUI?.();

        // 4) Initiale Gruppen laden
        showLoadingBar();

        console.log('🦴 Lade Standard-Gruppen: bones, teeth, cartilage...');

        await loadGroupByName('bones', { centerCamera: true });
        state.groupStates.bones = true;
        console.log('✅ Bones geladen');

        await loadGroupByName('teeth', { centerCamera: false });
        state.groupStates.teeth = true;
        console.log('✅ Teeth geladen');

        await loadGroupByName('cartilage', { centerCamera: false });
        state.groupStates.cartilage = true;
        console.log('✅ Cartilage geladen');

        // 5a) Schattenfähigkeiten für bereits geladene Objekte setzen
        scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

        // 5b) Shadow-Frustum ans Motiv anpassen
        const rig = getLightRig?.();
        if (rig?.key) fitShadowFrustumToScene(rig.key, scene);

        // Material-Tweaks für alle Standard-Gruppen
        const cfg = state?.defaultSettings?.appearance || appearance;

        applyRendererAppearance(renderer, cfg);
        applyEnvIntensity(scene, cfg);

        applyGroupMaterialTweaks('bones', state.groups, cfg);
        applyGroupMaterialTweaks('teeth', state.groups, cfg);
        applyGroupMaterialTweaks('cartilage', state.groups, cfg);

        // Farben für alle drei Gruppen setzen
        ['bones', 'teeth', 'cartilage'].forEach(g => {
            const hex =
                (state.colors && state.colors[g]) ??
                (state.defaultSettings?.colors && state.defaultSettings.colors[g]) ??
                state.defaultSettings?.colors?.default;
            if (hex != null) updateModelColors(g, hex);
        });

        requestShadowUpdate();
        freezeShadows();
        hideLoadingBar();

        // 6) Zustände & Interaktion (OHNE setupGroupToggle!)
        setupInteractions();
        initResizeHandler();
        initCameraView();

        // ❌ setupGroupToggle(); // ← DEAKTIVIERT! Überschreibt Animation

        // ✅ 7) BUTTON-ANIMATION ALS LETZTES (damit nichts mehr überschreibt)
        console.log('🎬 Initialisiere Button-Animationen als letztes...');
        initDynamicGroupLoading(); // ← Jetzt funktioniert es!

        // 8) Render-Loop
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            updatePerformanceMonitor();
            renderer.render(scene, camera);
        }
        animate();

        console.log('🚀 App erfolgreich gestartet mit Button-Animationen');

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

// Bestehende Funktionen...
export function enableRenderOptimization() {
    if (window.renderOptimizer) {
        window.renderOptimizer.enable();
    } else {
        console.warn('⚠️ Optimizer nicht verfügbar - RENDER_OPTIMIZATION.enabled auf true setzen');
    }
}

export function disableRenderOptimization() {
    if (window.renderOptimizer) {
        window.renderOptimizer.disable();
    }
}

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
        pmrem.compileEquirectangularShader();

        const hdrUrl = 'env/default.hdr';
        const hdr = await new RGBELoader().loadAsync(hdrUrl);

        hdr.mapping = THREE.EquirectangularReflectionMapping;

        const envTex = pmrem.fromEquirectangular(hdr).texture;
        hdr.dispose();
        pmrem.dispose();

        scene.environment = envTex;
        scene.environmentIntensity = 0.3;
        scene.background = null;

        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.5;

        console.log('✅ HDR-Environment aktiv (reduzierte Intensität)');
    } catch (e) {
        console.warn('Kein HDR geladen - weiter ohne Environment.', e?.message);
        scene.environment = null;
        scene.environmentIntensity = 0;
    }
}