// ============================================
// js/core/performanceMonitor.js - Sichere Performance-Überwachung
// ============================================

import { config } from './config.js';

/**
 * 📊 Performance Monitor (optional aktivierbar)
 * Überwacht FPS, Memory und andere Performance-Metriken
 * WICHTIG: Nur laden, wenn DEBUG aktiviert ist!
 */
export class PerformanceMonitor {
    constructor() {
        this.enabled = false;
        this.stats = null;
        this.memoryUsage = [];
        this.frameTime = [];
        this.warningThresholds = {
            lowFPS: 30,
            highMemory: 0.8,   // 80%
            highFrameTime: 33  // >33ms = <30fps
        };

        this.frameCounter = 0;
        this.lastFPSCheck = performance.now();
        this.currentFPS = 60;
        this.lastFrameTime = undefined;

        this.memoryInterval = null;
        this.warningInterval = null;
        this.handleVisibility = null;

        console.log('📊 PerformanceMonitor initialisiert (deaktiviert)');
    }

    /**
     * ⚡ Aktiviert den Performance Monitor
     */
    async enable() {
        if (this.enabled) return;

        // Debug-Gate: nur aktivieren, wenn konfiguriert
        const allow =
            (typeof config?.get === 'function' && (config.get('debug.enablePerformanceMonitor') || config.get('debug.performanceMonitor')))
            || false;
        if (!allow) {
            console.log('📊 PerformanceMonitor nicht aktiviert (DEBUG aus).');
            return;
        }

        try {
            // WICHTIG: Pfad muss zur Import-Map passen.
            // In deiner HTML-Importmap steht:
            //   "three/addons/": "./node_modules/three/examples/jsm/"
            // Deshalb hier:
            const { default: Stats } = await import('three/addons/libs/stats.module.js');

            this.stats = new Stats();
            this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
            this.stats.dom.style.position = 'fixed';
            this.stats.dom.style.top = '10px';
            this.stats.dom.style.left = '10px';
            this.stats.dom.style.zIndex = '10000';
            document.body.appendChild(this.stats.dom);

            this.enabled = true;
            this.startMonitoring();

            // Optional: bei Tab-Wechsel pausieren/fortsetzen
            this.handleVisibility = () => {
                if (!this.enabled) return;
                if (document.hidden) this.stopMonitoring();
                else this.startMonitoring();
            };
            document.addEventListener('visibilitychange', this.handleVisibility, { passive: true });

            console.log('📊 PerformanceMonitor aktiviert');
        } catch (error) {
            console.warn('⚠️ Stats.js konnte nicht geladen werden:', error);
            console.log('📊 Fallback: Einfaches Performance-Monitoring ohne Panel');
            this.enabled = true;
            this.startMonitoring();
        }
    }

    /**
     * 🛑 Deaktiviert den Performance Monitor
     */
    disable() {
        if (!this.enabled) return;

        if (this.stats?.dom?.parentNode) {
            this.stats.dom.parentNode.removeChild(this.stats.dom);
        }

        this.stopMonitoring();
        this.enabled = false;
        this.stats = null;

        if (this.handleVisibility) {
            document.removeEventListener('visibilitychange', this.handleVisibility);
            this.handleVisibility = null;
        }

        console.log('📊 PerformanceMonitor deaktiviert');
    }

    /**
     * 🔄 Startet die Überwachung
     */
    startMonitoring() {
        // Memory-Monitoring (falls verfügbar)
        if (performance?.memory && !this.memoryInterval) {
            this.memoryInterval = setInterval(() => {
                this.recordMemoryUsage();
            }, 1000);
        }

        // Performance-Warnings
        if (!this.warningInterval) {
            this.warningInterval = setInterval(() => {
                this.checkPerformanceWarnings();
            }, 5000);
        }
    }

    /**
     * ⏹️ Stoppt die Überwachung
     */
    stopMonitoring() {
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
            this.memoryInterval = null;
        }

        if (this.warningInterval) {
            clearInterval(this.warningInterval);
            this.warningInterval = null;
        }
    }

    /**
     * 🔄 Update-Funktion (im Render-Loop aufrufen)
     */
    update() {
        if (!this.enabled) return;

        if (this.stats) this.stats.update();
        this.updateFPS();
        this.recordFrameTime();
    }

    /**
     * 📈 FPS-Messung
     */
    updateFPS() {
        this.frameCounter++;
        const now = performance.now();

        if (now - this.lastFPSCheck > 1000) {
            this.currentFPS = Math.round((this.frameCounter * 1000) / (now - this.lastFPSCheck));
            this.frameCounter = 0;
            this.lastFPSCheck = now;
        }
    }

    /**
     * ⏱️ Frame-Time aufzeichnen
     */
    recordFrameTime() {
        const now = performance.now();
        if (this.lastFrameTime !== undefined) {
            const frameTime = now - this.lastFrameTime;
            this.frameTime.push({ time: now, duration: frameTime });
            if (this.frameTime.length > 60) this.frameTime.shift(); // nur letzte 60 Frames
        }
        this.lastFrameTime = now;
    }

    /**
     * 💾 Memory-Usage aufzeichnen
     */
    recordMemoryUsage() {
        if (!performance?.memory) return;

        const usage = {
            time: Date.now(),
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
        };

        this.memoryUsage.push(usage);
        if (this.memoryUsage.length > 1000) this.memoryUsage.shift(); // nur letzte 1000 Einträge
    }

    /**
     * ⚠️ Performance-Warnungen prüfen
     */
    checkPerformanceWarnings() {
        const logPerf = typeof config?.get === 'function' ? config.get('debug.logPerformance') : false;
        if (!logPerf) return;

        // Low FPS Warning
        if (this.currentFPS < this.warningThresholds.lowFPS) {
            console.warn(`⚠️ Niedrige FPS: ${this.currentFPS} (< ${this.warningThresholds.lowFPS})`);
        }

        // Memory Warning
        if (performance?.memory) {
            const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
            if (usage > this.warningThresholds.highMemory) {
                console.warn(`⚠️ Hoher Speicherverbrauch: ${(usage * 100).toFixed(1)}% (> ${this.warningThresholds.highMemory * 100}%)`);
            }
        }

        // High Frame-Time Warning
        if (this.frameTime.length > 0) {
            const avgFrameTime = this.frameTime.reduce((sum, f) => sum + f.duration, 0) / this.frameTime.length;
            if (avgFrameTime > this.warningThresholds.highFrameTime) {
                console.warn(`⚠️ Hohe Frame-Zeit: ${avgFrameTime.toFixed(1)}ms (> ${this.warningThresholds.highFrameTime}ms)`);
            }
        }
    }

    /**
     * 📊 Aktuelle Statistiken abrufen
     */
    getStats() {
        const stats = {
            enabled: this.enabled,
            fps: this.currentFPS,
            frameCount: this.frameCounter
        };

        if (performance?.memory) {
            const m = performance.memory;
            stats.memory = {
                used: m.usedJSHeapSize,
                total: m.totalJSHeapSize,
                limit: m.jsHeapSizeLimit,
                usagePercent: Math.round((m.usedJSHeapSize / m.jsHeapSizeLimit) * 100)
            };
        }

        if (this.frameTime.length > 0) {
            const arr = this.frameTime.map(f => f.duration);
            stats.frameTime = {
                avg: arr.reduce((a, b) => a + b, 0) / arr.length,
                min: Math.min(...arr),
                max: Math.max(...arr),
                samples: arr.length
            };
        }

        return stats;
    }

    /**
     * 🔎 Verlauf des Speichers (Kopie)
     */
    getMemoryHistory() {
        return this.memoryUsage.slice();
    }
}

// Singleton-Instanz exportieren
export const performanceMonitor = new PerformanceMonitor();
