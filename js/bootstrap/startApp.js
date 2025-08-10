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

        // 3) 🎛️ RENDER-OPTIMIZER Setup (falls aktiviert)
        if (RENDER_OPTIMIZATION.enabled || RENDER_OPTIMIZATION.autoActivate) {
            console.log('🔧 Lade Render-Optimizer...');
            renderOptimizer = await loadOptimizer();

            if (renderOptimizer) {
                // Sofort aktivieren falls enabled=true
                if (RENDER_OPTIMIZATION.enabled) {
                    renderOptimizer.enable({
                        frustumCulling: RENDER_OPTIMIZATION.frustumCulling,
                        lod: RENDER_OPTIMIZATION.lod
                    });
                    useOptimization = true;
                    console.log('⚡ Render-Optimierung aktiviert');
                }

                // Browser-Console Tools bereitstellen
                window.renderOptimizer = {
                    enable: () => {
                        renderOptimizer.enable({
                            frustumCulling: RENDER_OPTIMIZATION.frustumCulling,
                            lod: RENDER_OPTIMIZATION.lod
                        });
                        useOptimization = true;
                        console.log('⚡ Render-Optimierung manuell aktiviert');
                    },
                    disable: () => {
                        renderOptimizer.disable();
                        useOptimization = false;
                        console.log('🔄 Render-Optimierung deaktiviert');
                    },
                    stats: () => renderOptimizer.getStats(),
                    auto: () => {
                        renderOptimizer.autoOptimize();
                        useOptimization = renderOptimizer.enabled;
                    }
                };

                console.log('🎮 Optimizer-Controls verfügbar: window.renderOptimizer.enable/disable/stats/auto');
            }
        } else {
            console.log('📱 Render-Optimierung deaktiviert (Desktop-Modus)');
        }

        // 4) Initiale Gruppen laden
        showLoadingBar();

        await loadGroupByName('bones', { centerCamera: true });
        state.groupStates.bones = true;

        await loadGroupByName('teeth');
        state.groupStates.teeth = true;

        hideLoadingBar();

        // 5) 🎛️ AUTO-OPTIMIERUNG: Nach dem Laden prüfen
        if (RENDER_OPTIMIZATION.autoActivate && renderOptimizer && !useOptimization) {
            // Kurz warten, dann Performance prüfen
            setTimeout(() => {
                renderOptimizer.autoOptimize();
                useOptimization = renderOptimizer.enabled;

                if (useOptimization) {
                    console.log('🤖 Auto-Optimierung aktiviert (Performance/Mobile erkannt)');
                }
            }, 2000);
        }

        // 6) Gespeicherte Zustände wiederherstellen
        restoreAllGroupStates();

        // 7) Interaktionen & Resize
        setupInteractions();
        initResizeHandler();
        initCameraView();

        // 8) 🎛️ RENDER LOOP mit optionaler Optimierung
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderFrame(); // ← Verwendet optimierte Render-Funktion
        }
        animate();

        console.log('🚀 App erfolgreich gestartet');

    } catch (err) {
        console.error('❌ Fehler beim App-Start:', err);
        hideLoadingBar();
    } finally {
        // Splash ausblenden
        initialScreen.style.opacity = '0';
        setTimeout(() => (initialScreen.style.display = 'none'), 500);
    }
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