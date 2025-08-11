// ============================================
// SCHRITT 3: js/debug/performanceMonitor.js
// Minimaler, crashsicherer Performance Monitor  
// ============================================

import { getConfig, isFeatureEnabled } from '../config/config.js';

/**
 * MINIMALER PERFORMANCE MONITOR
 * - Läuft immer im Hintergrund (sammelt Daten)
 * - UI nur wenn aktiviert
 * - Kann niemals crashen
 */
class MinimalPerformanceMonitor {
    constructor() {
        // Feature-Status
        this.enabled = isFeatureEnabled('performanceMonitor');
        this.showFPS = getConfig('features.performanceConfig.showFPS', true);
        this.showMemory = getConfig('features.performanceConfig.showMemory', true);
        this.autoWarnings = getConfig('features.performanceConfig.autoWarnings', true);
        this.position = getConfig('features.performanceConfig.position', 'top-left');

        // Performance-Daten (immer sammeln)
        this.frameHistory = [];
        this.memoryHistory = [];
        this.currentFPS = 60;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;

        // Warnung-System
        this.warningThresholds = {
            lowFPS: 30,
            highMemory: getConfig('performance.memoryWarningThreshold', 80) // Prozent
        };
        this.lastWarningTime = 0;
        this.warningCooldown = 5000; // 5 Sekunden

        // UI-Elemente (nur wenn aktiviert)
        this.statsPanel = null;
        this.fallbackStats = null;

        this.initialize();
    }

    /**
     * INITIALISIERUNG
     */
    initialize() {
        try {
            if (this.enabled) {
                this.createStatsUI();
            }

            this.logStatus();

        } catch (error) {
            console.warn('⚠️ Performance Monitor Initialisierung fehlgeschlagen:', error);
            // Nicht kritisch - Monitor läuft ohne UI weiter
        }
    }

    /**
     * STATS-UI ERSTELLEN
     * Versucht verschiedene Ansätze, crasht nie
     */
    async createStatsUI() {
        // Versuche Stats.js zu laden
        const statsLoaded = await this.tryLoadStatsJS();

        if (!statsLoaded) {
            // Fallback zu einfacher HTML-Anzeige
            this.createFallbackUI();
        }
    }

    /**
     * STATS.JS LADEN (OPTIONAL)
     */
    async tryLoadStatsJS() {
        const importPaths = [
            'three/examples/jsm/libs/stats.module.js',
            'three/addons/libs/stats.module.js',
            '../lib/stats.min.js'
        ];

        for (const path of importPaths) {
            try {
                const module = await import(path);
                const Stats = module.default;

                this.statsPanel = new Stats();
                this.setupStatsPanel();

                console.log('📊 Stats.js erfolgreich geladen');
                return true;

            } catch (error) {
                // Nächsten Pfad versuchen
                continue;
            }
        }

        return false;
    }

    /**
     * STATS-PANEL SETUP
     */
    setupStatsPanel() {
        if (!this.statsPanel) return;

        try {
            this.statsPanel.showPanel(0); // FPS Panel

            // Positionierung
            const positions = {
                'top-left': { top: '10px', left: '10px' },
                'top-right': { top: '10px', right: '10px' },
                'bottom-left': { bottom: '10px', left: '10px' },
                'bottom-right': { bottom: '10px', right: '10px' }
            };

            const pos = positions[this.position] || positions['top-left'];

            Object.assign(this.statsPanel.dom.style, {
                position: 'fixed',
                zIndex: '10000',
                ...pos
            });

            document.body.appendChild(this.statsPanel.dom);

        } catch (error) {
            console.warn('⚠️ Stats-Panel Setup fehlgeschlagen:', error);
            this.createFallbackUI();
        }
    }

    /**
     * FALLBACK-UI ERSTELLEN
     * Einfache HTML-Anzeige falls Stats.js nicht verfügbar
     */
    createFallbackUI() {
        try {
            const panel = document.createElement('div');
            panel.id = 'performance-monitor';

            // Positionierung
            const positions = {
                'top-left': 'top: 10px; left: 10px;',
                'top-right': 'top: 10px; right: 10px;',
                'bottom-left': 'bottom: 10px; left: 10px;',
                'bottom-right': 'bottom: 10px; right: 10px;'
            };

            const positionCSS = positions[this.position] || positions['top-left'];

            panel.style.cssText = `
        position: fixed;
        ${positionCSS}
        background: rgba(0, 0, 0, 0.8);
        color: #00ff00;
        padding: 8px 12px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        border-radius: 4px;
        z-index: 10000;
        pointer-events: none;
        min-width: 120px;
      `;

            // Inhalt
            const content = [];
            if (this.showFPS) content.push('<div>FPS: <span id="fps-value">60</span></div>');
            if (this.showMemory) content.push('<div>MEM: <span id="memory-value">0 MB</span></div>');

            panel.innerHTML = content.join('');
            document.body.appendChild(panel);
            this.fallbackStats = panel;

            console.log('📊 Fallback Performance Monitor erstellt');

        } catch (error) {
            console.warn('⚠️ Fallback-UI Erstellung fehlgeschlagen:', error);
            // Auch nicht kritisch - Monitor läuft ohne UI
        }
    }

    /**
     * UPDATE-METHODE (wird vom Render-Loop aufgerufen)
     * WICHTIG: Darf niemals crashen!
     */
    update() {
        try {
            // Performance-Daten sammeln (immer)
            this.collectPerformanceData();

            // UI-Updates (nur wenn aktiviert und vorhanden)
            if (this.enabled) {
                this.updateUI();
            }

            // Warnungen prüfen (wenn aktiviert)
            if (this.autoWarnings) {
                this.checkPerformanceWarnings();
            }

        } catch (error) {
            // Silent fail - Performance Monitor darf niemals die App crashen
            console.warn('⚠️ Performance Monitor Update-Fehler (wird ignoriert):', error);
        }
    }

    /**
     * PERFORMANCE-DATEN SAMMELN
     * Läuft immer im Hintergrund
     */
    collectPerformanceData() {
        const now = performance.now();

        // FPS berechnen
        this.frameCount++;
        const deltaTime = now - this.lastFrameTime;

        if (deltaTime >= 1000) { // Jede Sekunde
            this.currentFPS = Math.round((this.frameCount * 1000) / deltaTime);
            this.frameCount = 0;
            this.lastFrameTime = now;

            // Frame-History aktualisieren (letzte 60 Sekunden)
            this.frameHistory.push({ time: now, fps: this.currentFPS });
            if (this.frameHistory.length > 60) {
                this.frameHistory.shift();
            }
        }

        // Memory-Daten sammeln (alle 2 Sekunden)
        if (performance.memory && now - (this.lastMemoryCheck || 0) > 2000) {
            this.lastMemoryCheck = now;

            const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            this.memoryHistory.push({ time: now, memoryMB });

            // Memory-History begrenzen (letzte 5 Minuten)
            if (this.memoryHistory.length > 150) {
                this.memoryHistory.shift();
            }
        }
    }

    /**
     * UI AKTUALISIEREN
     */
    updateUI() {
        try {
            // Stats.js Panel
            if (this.statsPanel) {
                this.statsPanel.update();
            }

            // Fallback-UI
            if (this.fallbackStats) {
                this.updateFallbackUI();
            }

        } catch (error) {
            // UI-Fehler sind nicht kritisch
            console.warn('⚠️ UI-Update Fehler:', error);
        }
    }

    /**
     * FALLBACK-UI AKTUALISIEREN
     */
    updateFallbackUI() {
        if (!this.fallbackStats) return;

        try {
            // FPS aktualisieren
            const fpsElement = this.fallbackStats.querySelector('#fps-value');
            if (fpsElement) {
                fpsElement.textContent = this.currentFPS;
                fpsElement.style.color = this.currentFPS < 30 ? '#ff4444' : '#00ff00';
            }

            // Memory aktualisieren
            const memoryElement = this.fallbackStats.querySelector('#memory-value');
            if (memoryElement && performance.memory) {
                const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                const totalMB = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
                const percent = Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100);

                memoryElement.textContent = `${memoryMB}/${totalMB}MB (${percent}%)`;
                memoryElement.style.color = percent > 80 ? '#ff4444' : '#00ff00';
            }

        } catch (error) {
            // Fallback-UI Fehler ignorieren
        }
    }

    /**
     * PERFORMANCE-WARNUNGEN PRÜFEN
     */
    checkPerformanceWarnings() {
        const now = Date.now();

        // Cooldown prüfen
        if (now - this.lastWarningTime < this.warningCooldown) return;

        try {
            // FPS-Warnung
            if (this.currentFPS < this.warningThresholds.lowFPS) {
                console.warn(`🐌 Niedrige Performance: ${this.currentFPS} FPS`);
                this.lastWarningTime = now;
                return;
            }

            // Memory-Warnung
            if (performance.memory) {
                const memoryPercent = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
                if (memoryPercent > this.warningThresholds.highMemory) {
                    console.warn(`🧠 Hoher Memory-Verbrauch: ${memoryPercent.toFixed(1)}%`);
                    this.lastWarningTime = now;
                    return;
                }
            }

        } catch (error) {
            // Warning-Check Fehler ignorieren
        }
    }

    /**
     * STATUS LOGGEN
     */
    logStatus() {
        const status = this.enabled ? '✅ AKTIV' : '📊 DATEN-SAMMLUNG';
        console.log(`📊 Performance Monitor: ${status}`);

        if (this.enabled) {
            const features = [];
            if (this.showFPS) features.push('FPS');
            if (this.showMemory) features.push('Memory');
            if (this.autoWarnings) features.push('Warnings');
            console.log(`   └─ Features: ${features.join(', ')} @ ${this.position}`);
        }
    }

    /**
     * FEATURE AKTIVIEREN/DEAKTIVIEREN
     */
    setEnabled(enabled) {
        if (enabled === this.enabled) return;

        this.enabled = enabled;

        if (enabled) {
            this.createStatsUI();
            console.log('📊 Performance Monitor UI aktiviert');
        } else {
            this.hideUI();
            console.log('📊 Performance Monitor UI deaktiviert (Datensammlung läuft weiter)');
        }
    }

    /**
     * UI VERSTECKEN
     */
    hideUI() {
        try {
            if (this.statsPanel?.dom) {
                this.statsPanel.dom.style.display = 'none';
            }

            if (this.fallbackStats) {
                this.fallbackStats.style.display = 'none';
            }
        } catch (error) {
            console.warn('⚠️ UI-Hide Fehler:', error);
        }
    }

    /**
     * UI ANZEIGEN
     */
    showUI() {
        try {
            if (this.statsPanel?.dom) {
                this.statsPanel.dom.style.display = 'block';
            }

            if (this.fallbackStats) {
                this.fallbackStats.style.display = 'block';
            } else if (this.enabled) {
                // UI erstellen falls noch nicht vorhanden
                this.createStatsUI();
            }
        } catch (error) {
            console.warn('⚠️ UI-Show Fehler:', error);
        }
    }

    /**
     * PERFORMANCE-BERICHT GENERIEREN
     */
    generateReport() {
        try {
            const report = {
                currentFPS: this.currentFPS,
                averageFPS: this.calculateAverageFPS(),
                memoryUsageMB: performance.memory ?
                    Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A',
                memoryLimitMB: performance.memory ?
                    Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) : 'N/A',
                frameHistoryLength: this.frameHistory.length,
                memoryHistoryLength: this.memoryHistory.length,
                enabled: this.enabled,
                warnings: {
                    lowFPS: this.warningThresholds.lowFPS,
                    highMemory: this.warningThresholds.highMemory
                }
            };

            return report;

        } catch (error) {
            console.warn('⚠️ Report-Generation Fehler:', error);
            return { error: 'Report-Generation fehlgeschlagen' };
        }
    }

    /**
     * DURCHSCHNITTLICHE FPS BERECHNEN
     */
    calculateAverageFPS() {
        if (this.frameHistory.length === 0) return this.currentFPS;

        try {
            const sum = this.frameHistory.reduce((total, frame) => total + frame.fps, 0);
            return Math.round(sum / this.frameHistory.length);
        } catch (error) {
            return this.currentFPS;
        }
    }

    /**
     * CLEANUP
     */
    dispose() {
        try {
            if (this.statsPanel?.dom?.parentNode) {
                this.statsPanel.dom.parentNode.removeChild(this.statsPanel.dom);
            }

            if (this.fallbackStats?.parentNode) {
                this.fallbackStats.parentNode.removeChild(this.fallbackStats.parentNode);
            }

            // Daten-Arrays leeren
            this.frameHistory.length = 0;
            this.memoryHistory.length = 0;

            console.log('🧹 Performance Monitor cleanup completed');

        } catch (error) {
            console.warn('⚠️ Cleanup-Fehler:', error);
        }
    }
}

// ===================
// GLOBALE INSTANZ (Singleton Pattern)
// ===================
let globalPerformanceMonitor = null;

/**
 * PERFORMANCE MONITOR ERSTELLEN/ABRUFEN
 */
export function getPerformanceMonitor() {
    if (!globalPerformanceMonitor) {
        globalPerformanceMonitor = new MinimalPerformanceMonitor();
    }
    return globalPerformanceMonitor;
}

/**
 * EINFACHE API FÜR RENDER-LOOP
 * Rufen Sie diese Funktion in Ihrem Render-Loop auf
 */
export function updatePerformanceMonitor() {
    try {
        const monitor = getPerformanceMonitor();
        monitor.update();
    } catch (error) {
        // Silent fail - darf niemals den Render-Loop brechen
    }
}

/**
 * MONITOR-KONTROLLE
 */
export function enablePerformanceMonitor() {
    const monitor = getPerformanceMonitor();
    monitor.setEnabled(true);
}

export function disablePerformanceMonitor() {
    const monitor = getPerformanceMonitor();
    monitor.setEnabled(false);
}

export function showPerformanceUI() {
    const monitor = getPerformanceMonitor();
    monitor.showUI();
}

export function hidePerformanceUI() {
    const monitor = getPerformanceMonitor();
    monitor.hideUI();
}

export function getPerformanceReport() {
    const monitor = getPerformanceMonitor();
    return monitor.generateReport();
}