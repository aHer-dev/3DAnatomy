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
import { getConfig } from '../config/config.js';    // liest ui.colors
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

import { setupUI } from '../ui/ui-init.js';
import { updateModelColors } from '../modelLoader/color.js';

import { getResourceManager } from '../core/resourceManager.js';
import { updatePerformanceMonitor } from '../debug/performanceMonitor.js';
import '../bootstrap/initSplashScreen.js';     // initialisiert Splash-Exit
import '../utils/migration-helper.js';         // sichere Initialisierung/Logs

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
            // defaultSettings.colors beherbergt die "Werksfarben"
            state.defaultSettings = state.defaultSettings || {};
            state.defaultSettings.colors = {
                ...(state.defaultSettings.colors || {}),
                ...cfgColors
            };

            // state.colors sind die "aktuell wirksamen" Farben (UI kann sie ändern)
            state.colors = {
                ...(state.colors || {}),
                ...state.defaultSettings.colors
            };
        }


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


        ['bones', 'teeth'].forEach(g => {
            const hex =
                (state.colors && state.colors[g]) ??
                (state.defaultSettings?.colors && state.defaultSettings.colors[g]) ??
                state.defaultSettings?.colors?.default;
            if (hex != null) updateModelColors(g, hex);
        });

        requestShadowUpdate();
        freezeShadows();

        hideLoadingBar();

        // 6) Auto-Optimizer (wie gehabt) …

        // 7) Zustände & Interaktion
        // restoreAllGroupStates();
        setupInteractions();
        initResizeHandler();
        initCameraView();
        setupGroupToggle();

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
        pmrem.compileEquirectangularShader(); // WICHTIG: Shader vorkompilieren

        const hdrUrl = 'env/default.hdr';
        const hdr = await new RGBELoader().loadAsync(hdrUrl);

        // FIX: HDR korrekt verarbeiten
        hdr.mapping = THREE.EquirectangularReflectionMapping;

        const envTex = pmrem.fromEquirectangular(hdr).texture;
        hdr.dispose();
        pmrem.dispose(); // WICHTIG: PMREM aufräumen

        // FIX: Intensität reduzieren für HDR
        scene.environment = envTex;
        scene.environmentIntensity = 0.3; // NEU: Intensität stark reduzieren
        scene.background = null; // Hintergrund bleibt schwarz

        // FIX: Tone Mapping anpassen für HDR
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.5; // Reduziert von 1.0

        console.log('✅ HDR-Environment aktiv (reduzierte Intensität)');
    } catch (e) {
        console.warn('Kein HDR geladen - weiter ohne Environment.', e?.message);
        // Fallback: Nur Lichter verwenden
        scene.environment = null;
        scene.environmentIntensity = 0;
    }
}