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
import { isMuskelfinderPreviewMode } from '../integration/muskelfinderPreview.js';


import { loadGroupByName } from '../features/modelLoader-core.js';
import { setupGroupToggle } from '../features/groupToggle.js';
import { setupInteractions } from '../interaction/index.js';
import { setupBasicLights, getLightRig, fitShadowFrustumToScene } from '../lights.js';

import { initStaticAssets } from './initStaticAssets.js';
import { initResizeHandler } from './initResizeHandler.js';
import { initCameraView } from './initCameraView.js';
import { handleMuskelfinderDeeplink } from '../integration/muskelfinderDeeplink.js';
import { hideInfoPanel } from '../interaction/infoPanel.js';

// ✅ FEHLENDER IMPORT HINZUGEFÜGT
import { initDynamicGroupLoading } from './initGroupLoader.js';

import { setupUI } from '../ui/ui-init.js';
import { updateModelColors } from '../modelLoader/color.js';

import { getResourceManager } from '../core/resourceManager.js';
import { updatePerformanceMonitor } from '../debug/performanceMonitor.js';
import { showLoadingCircle, updateLoadingCircle, hideLoadingCircle } from '../modelLoader/progress.js';
import '../utils/migration-helper.js';
import { lifecycle } from '../core/lifecycle.js';


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

function placeExtrasIntoDropdown(essentials = ['bones', 'muscles', 'cartilage']) {
    const controls = document.getElementById('controls');
    if (!controls) return;

    // Dropdown-Container anlegen, falls nicht vorhanden
    let dd = document.getElementById('dropdown-extra');
    if (!dd) {
        dd = document.createElement('div');
        dd.className = 'dropdown';
        dd.id = 'dropdown-extra';

        const toggle = document.createElement('button');
        toggle.id = 'btn-load-extra';          // behält dein "btn-load-" Präfix
        toggle.textContent = 'Weitere Strukturen';
        toggle.addEventListener('click', () => dd.classList.toggle('active'));

        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';      // nutzt deine vorhandene CSS

        dd.appendChild(toggle);
        dd.appendChild(menu);
        controls.appendChild(dd);              // ans Ende von #controls
    }

    const menu = dd.querySelector('.dropdown-menu');

    // Alle vorhandenen Load-Buttons einsammeln und „Nicht-Essentials“ ins Dropdown schieben
    const all = Array.from(controls.querySelectorAll('button[id^="btn-load-"]'));
    for (const btn of all) {
        const id = btn.id || '';
        if (id === 'btn-load-extra') continue; // der Dropdown-Button selbst
        const group = id.replace('btn-load-', '');
        if (!essentials.includes(group)) {
            menu.appendChild(btn);               // verschieben = Event-Handler bleiben erhalten
        }
    }
}

// --- Demand-Rendering: nur rendern wenn sich etwas geändert hat ---
let _needsRender = true;
let _loopKeepAliveFrames = 0;
let _controlsInteracting = false;
let _loopEventsBound = false;
const DEFAULT_RENDER_BURST = 2;
const CONTROL_START_FRAMES = 8;
const CONTROL_SETTLE_FRAMES = 24;
const CONTROL_CHANGE_FRAMES = 4;

function ensureLoopRunning() {
    if (stopLoop) return;

    stopLoop = lifecycle.startLoop(() => {
        const shouldUpdateControls = _controlsInteracting || _loopKeepAliveFrames > 0;
        const controlsChanged = shouldUpdateControls ? !!controls.update?.() : false;

        if (controlsChanged) {
            _needsRender = true;
            _loopKeepAliveFrames = Math.max(_loopKeepAliveFrames, DEFAULT_RENDER_BURST);
        }

        if (_needsRender) {
            _needsRender = false;
            updatePerformanceMonitor?.();
            renderer.render(scene, camera);
        }

        if (_loopKeepAliveFrames > 0) {
            _loopKeepAliveFrames--;
        }

        if (_controlsInteracting || _loopKeepAliveFrames > 0 || _needsRender) {
            return true;
        }

        stopLoop = null;
        return false;
    });
}

export function requestRender(frames = DEFAULT_RENDER_BURST) {
    _needsRender = true;
    _loopKeepAliveFrames = Math.max(_loopKeepAliveFrames, frames);
    ensureLoopRunning();
}
// Auch global verfügbar machen (für Module ohne direkten Import)
if (typeof window !== 'undefined') window.requestRender = requestRender;

// --- zentraler Render-Loop (einzig) ---
let stopLoop = null;
function bindLoopEvents() {
    if (_loopEventsBound) return;
    _loopEventsBound = true;

    lifecycle.on(controls, 'change', () => requestRender(CONTROL_CHANGE_FRAMES));
    lifecycle.on(controls, 'start', () => {
        _controlsInteracting = true;
        requestRender(CONTROL_START_FRAMES);
    });
    lifecycle.on(controls, 'end', () => {
        _controlsInteracting = false;
        requestRender(CONTROL_SETTLE_FRAMES);
    });
}

function startLoop() {
    bindLoopEvents();
    requestRender(CONTROL_START_FRAMES);
}

// Sauberes Cleanup beim Verlassen/Navigieren
window.addEventListener('beforeunload', () => {
    stopLoop?.();
    lifecycle.dispose();
}, { once: true });

/**
 * Hauptinitialisierung der App
 */
export async function startApp() {
    const previewMode = isMuskelfinderPreviewMode();
    window.__DISABLE_PROGRESS_OVERLAY = true;
    showLoadingCircle({ label: 'Strukturen werden geladen…' });
    renderer.domElement.style.visibility = 'hidden';
    updateLoadingCircle(5);   // kleiner Startwert, damit man den Kreis sieht
    initStaticAssets();

    // Loading-Screen wurde entfernt – tolerant bleiben
    const initialScreen = document.getElementById('initial-loading-screen');
    if (initialScreen) {
        initialScreen.style.backgroundColor = getConfig('ui.theme.loadingScreen', '#0B1020');
        initialScreen.style.display = 'flex';
    }

    try {
        // 1) Metadaten
        await initializeGroupsFromMeta();

        // 2) Licht + (optional) HDR
        setupBasicLights(scene);
        await tryApplyEnvironment(renderer);
        updateLoadingCircle(35);

        // 3) Farben aus Config in den State übernehmen (ohne Defaults zu überschreiben)
        const cfgColors = getConfig('ui.colors', null);
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

        // Originalfarben für "Reset Farbe" einmalig festhalten.
        state.defaultSettings.resetColors = {
            ...(state.defaultSettings.colors || {})
        };

        // 4) UI initialisieren
        if (!previewMode) {
            setupUI?.();
        }
        updateLoadingCircle(45);

        // Nur die drei Essentials oben lassen – Rest ins Dropdown
        if (!previewMode) {
            placeExtrasIntoDropdown(['bones', 'muscles']);
        }

        // 5) Initiale Gruppen laden

        await loadGroupByName('bones', { centerCamera: true });
        state.groupStates.bones = true;
        updateLoadingCircle(65);

        await loadGroupByName('teeth', { centerCamera: false });
        state.groupStates.teeth = true;
        updateLoadingCircle(80);

        await loadGroupByName('cartilage', { centerCamera: false });
        state.groupStates.cartilage = true;
        updateLoadingCircle(95);

        // 6) Schatten & Material-Tweaks
        const rig = getLightRig?.();
        if (rig?.key) fitShadowFrustumToScene(rig.key, scene);

        const cfg = state?.defaultSettings?.appearance || appearance;
        applyRendererAppearance(renderer, cfg);
        applyEnvIntensity(scene, cfg);

        applyGroupMaterialTweaks('bones', cfg);
        applyGroupMaterialTweaks('teeth', cfg);
        applyGroupMaterialTweaks('cartilage', cfg);

        // 7) Farben anwenden
        ['bones', 'teeth', 'cartilage'].forEach(g => {
            const hex =
                (state.colors && state.colors[g]) ??
                (state.defaultSettings?.colors && state.defaultSettings.colors[g]) ??
                state.defaultSettings?.colors?.default;
            if (hex != null) updateModelColors(g, hex);
        });

        requestShadowUpdate();
        freezeShadows();

        // 8) Interaktionen & Resize
        if (!previewMode) {
            setupInteractions();

            lifecycle.on(controls, 'change', () => {
                const panel = document.getElementById('info-panel');
                if (panel?.classList.contains('visible')) {
                    hideInfoPanel();
                }
            });
        }

        initResizeHandler();
        initCameraView();

        // Deeplink erst nach dem Standard-Kamera-Setup anwenden, damit
        // der Fokus nicht direkt wieder vom Default-View ueberschrieben wird.
        await handleMuskelfinderDeeplink();

        // 9) Button-Animationen erst ganz am Ende
        if (!previewMode) {
            initDynamicGroupLoading();
        }

        // 10) Render-Loop (zentral)
        // ✅ Jetzt ist wirklich alles fertig → 100 % setzen
        updateLoadingCircle(100);

        // ⏳ Warte, bis das Overlay (mit „Willkommen!“) wirklich weg ist …
        document.addEventListener('circleOverlayHidden', () => {
            // … dann Canvas sichtbar machen und zentralen Loop starten
            renderer.domElement.style.visibility = 'visible';
            startLoop(); // <-- hier statt 'animate()'
        }, { once: true });


    } catch (err) {
        console.error('❌ Fehler beim App-Start:', err);
    } finally {
        // Optional: Resource-Manager-Status loggen
        const resourceManager = getResourceManager?.();
        if (resourceManager) {
        }

        // Falls der entfernte Initial-Screen doch existiert, sanft ausblenden
        if (initialScreen) {
            initialScreen.style.opacity = '0';
            setTimeout(() => (initialScreen.style.display = 'none'), 500);
        }
    }
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
        // toneMappingExposure wird von setupRoomUI gesetzt – hier nicht überschreiben

    } catch (e) {
        console.warn('Kein HDR geladen - weiter ohne Environment.', e?.message);
        scene.environment = null;
        scene.environmentIntensity = 0;
    }
    updateLoadingCircle(25);   // nur Fortschritt, NICHT schließen
}
// ============================================
// LOADING SCREEN INTEGRATION
// Füge diese Funktionen zu deiner app.js oder startApp.js hinzu
// ============================================

/**
 * Loading Screen Manager
 */
class LoadingScreenManager {
    constructor() {
        this.currentProgress = 0;
        this.targetProgress = 0;
        this.animationFrame = null;
        this.startTime = Date.now();
        this.modelCount = 0;
        this.loadedCount = 0;
    }

    /**
     * Initialisiert den Loading Screen
     * @param {number} totalModels - Anzahl der zu ladenden Modelle
     */
    init(totalModels = 100) {
        this.modelCount = totalModels;
        this.loadedCount = 0;
        
        const loadingScreen = document.getElementById('initial-loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.style.opacity = '1';
        }
        
        // Starte sanfte Animation
        this.animateProgress();
    }

    /**
     * Aktualisiert den Fortschritt
     * @param {number} percent - Fortschritt in Prozent (0-100)
     */
    setProgress(percent) {
        this.targetProgress = Math.min(100, Math.max(0, percent));
        
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) {
            progressBar.style.setProperty('--progress', `${this.targetProgress}%`);
        }
        
        if (progressText) {
            this.updateProgressText(this.targetProgress);
        }
    }

    /**
     * Erhöht den Fortschritt basierend auf geladenen Modellen
     */
    incrementProgress() {
        this.loadedCount++;
        const percent = Math.round((this.loadedCount / this.modelCount) * 100);
        this.setProgress(percent);
    }

    /**
     * Aktualisiert den Fortschrittstext basierend auf Prozentsatz
     */
    updateProgressText(percent) {
        const progressText = document.getElementById('progress-text');
        if (!progressText) return;

        let text = '';
        if (percent < 10) {
            text = 'Initialisiere System';
        } else if (percent < 25) {
            text = 'Lade Umgebung';
        } else if (percent < 40) {
            text = 'Bereite Renderer vor';
        } else if (percent < 60) {
            text = 'Lade Skelett-Modelle';
        } else if (percent < 75) {
            text = 'Lade Texturen';
        } else if (percent < 90) {
            text = 'Finalisiere Modelle';
        } else if (percent < 100) {
            text = 'Fast fertig';
        } else {
            text = 'Bereit!';
        }

        progressText.innerHTML = `${text}<span class="loading-dots"></span>`;
    }

    /**
     * Sanfte Animation des Fortschrittsbalkens
     */
    animateProgress() {
        const animate = () => {
            if (this.currentProgress < this.targetProgress) {
                this.currentProgress += (this.targetProgress - this.currentProgress) * 0.1;
                
                const progressBar = document.getElementById('progress-bar');
                if (progressBar) {
                    progressBar.style.setProperty('--progress', `${Math.round(this.currentProgress)}%`);
                }
                
                if (Math.abs(this.targetProgress - this.currentProgress) > 0.5) {
                    this.animationFrame = requestAnimationFrame(animate);
                }
            }
        };
        
        animate();
    }

    /**
     * Versteckt den Loading Screen mit Animation
     * @param {number} delay - Verzögerung in ms
     */
    hide(delay = 500) {
        setTimeout(() => {
            const loadingScreen = document.getElementById('initial-loading-screen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    if (this.animationFrame) {
                        cancelAnimationFrame(this.animationFrame);
                    }
                }, 500);
            }
            
            // Log Ladezeit
            const loadTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
        }, delay);
    }

    /**
     * Zeigt Live-Loading Indicator für dynamisches Laden
     */
    showLiveLoader() {
        const liveLoader = document.getElementById('live-loading-sticker');
        if (liveLoader) {
            liveLoader.style.display = 'block';
            liveLoader.style.opacity = '1';
        }
    }

    /**
     * Versteckt Live-Loading Indicator
     */
    hideLiveLoader() {
        const liveLoader = document.getElementById('live-loading-sticker');
        if (liveLoader) {
            liveLoader.style.opacity = '0';
            setTimeout(() => {
                liveLoader.style.display = 'none';
            }, 300);
        }
    }
}

// ============================================
// INTEGRATION IN DEINE BESTEHENDE APP
// ============================================

// Globale Instanz erstellen
const loadingScreen = new LoadingScreenManager();

// In deiner startApp() Funktion:
export async function startAppWithLoadingScreen() {
    try {
        // Loading Screen initialisieren
        loadingScreen.init(3); // 3 Hauptgruppen zu laden
        
        // Initialisierung
        loadingScreen.setProgress(10);
        await initializeGroupsFromMeta();
        updateLoadingCircle(20);
        
        // Lichter setup
        loadingScreen.setProgress(20);
        setupBasicLights(scene);
        
        // UI Setup
        loadingScreen.setProgress(30);
        setupUI();
        
        // Erste Gruppe laden
        loadingScreen.setProgress(40);
        showLoadingBar(); // Dein existierender Loading Bar
        
        await loadGroupByName('bones', { centerCamera: true });
        loadingScreen.setProgress(60);
        updateLoadingCircle(65);
        
        await loadGroupByName('teeth', { centerCamera: false });
        loadingScreen.setProgress(80);
        updateLoadingCircle(80);

        await loadGroupByName('cartilage', { centerCamera: false });
        loadingScreen.setProgress(95);
        updateLoadingCircle(95);
        // Finale Setups
        setupInteractions();
        initResizeHandler();
        initCameraView();
        
        // Loading komplett
        loadingScreen.setProgress(100);
        
        // Render Loop starten
        animate();
        
        // Loading Screen ausblenden
        loadingScreen.hide(800); // 800ms Verzögerung für "Bereit!" Anzeige
        
    } catch (err) {
        console.error('❌ Fehler beim App-Start:', err);
    } finally {
        // Kreis zuverlässig schließen – auch bei Fehler
              try { updateLoadingCircle(100); } catch { }
              try { hideLoadingCircle(); } catch { }
    }
}

// ============================================
// HELPER FUNKTIONEN FÜR DYNAMISCHES LADEN
// ============================================

/**
 * Wrapper für loadGroupByName mit Loading Indicator
 */
export async function loadGroupWithIndicator(groupName, options = {}) {
    loadingScreen.showLiveLoader();
    
    try {
        await loadGroupByName(groupName, options);
    } finally {
        loadingScreen.hideLiveLoader();
    }
}

/**
 * Batch Loading mit Progress
 */
export async function loadMultipleGroups(groups) {
    const total = groups.length;
    
    for (let i = 0; i < total; i++) {
        const progress = Math.round(((i + 1) / total) * 100);
        loadingScreen.setProgress(progress);
        
        await loadGroupByName(groups[i], { centerCamera: false });
    }
}

// ============================================
// EXPORT FÜR VERWENDUNG IN ANDEREN MODULEN
// ============================================

// Für direkte Verwendung in anderen Files:
window.loadingScreenManager = loadingScreen;

// Oder als ES6 Export:
export { loadingScreen };

// Beispiel Verwendung in anderen Modulen:
// window.loadingScreenManager.showLiveLoader();
// await loadSomeModel();
// window.loadingScreenManager.hideLiveLoader();
