// ============================================
// js/core/performanceMonitor.js - Sichere Performance-Überwachung
// ============================================

import { config } from './config.js';

/**
 * 📊 Performance Monitor (optional aktivierbar)
 * Überwacht FPS, Memory und andere Performance-Metriken
 * WICHTIG: Nur laden wenn DEBUG aktiviert ist!
 */
export class PerformanceMonitor {
    constructor() {
        this.enabled = false;
        this.stats = null;
        this.memoryUsage = [];
        this.frameTime = [];
        this.warningThresholds = {
            lowFPS: 30,
            highMemory: 0.8, // 80%
            highFrameTime: 33 // >33ms = <30fps
        };

        this.frameCounter = 0;
        this.lastFPSCheck = performance.now();
        this.currentFPS = 60;

        console.log('📊 PerformanceMonitor initialisiert (deaktiviert)');
    }

    /**
     * ⚡ Aktiviert den Performance Monitor
     */
    async enable() {
        if (this.enabled) return;

        try {
            // Stats.js nur laden wenn wirklich benötigt
            const { default: Stats } = await import('three/examples/jsm/libs/stats.module.js');

            this.stats = new Stats();
            this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb

            // Stats-Panel styling
            this.stats.dom.style.position = 'fixed';
            this.stats.dom.style.top = '10px';
            this.stats.dom.style.left = '10px';
            this.stats.dom.style.zIndex = '10000';

            document.body.appendChild(this.stats.dom);

            this.enabled = true;
            this.startMonitoring();

            console.log('📊 PerformanceMonitor aktiviert');

        } catch (error) {
            console.warn('⚠️ Stats.js konnte nicht geladen werden:', error);
            console.log('📊 Fallback: Einfaches Performance-Monitoring');
            this.enabled = true;
            this.startMonitoring();
        }
    }

    /**
     * 🛑 Deaktiviert den Performance Monitor
     */
    disable() {
        if (!this.enabled) return;

        if (this.stats && this.stats.dom && this.stats.dom.parentNode) {
            this.stats.dom.parentNode.removeChild(this.stats.dom);
        }

        this.stopMonitoring();
        this.enabled = false;
        this.stats = null;

        console.log('📊 PerformanceMonitor deaktiviert');
    }

    /**
     * 🔄 Startet die Überwachung
     */
    startMonitoring() {
        // Memory-Monitoring (falls verfügbar)
        if (performance.memory) {
            this.memoryInterval = setInterval(() => {
                this.recordMemoryUsage();
            }, 1000);
        }

        // Performance-Warnings
        this.warningInterval = setInterval(() => {
            this.checkPerformanceWarnings();
        }, 5000);
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
     * 🔄 Update-Funktion (wird vom Render-Loop aufgerufen)
     */
    update() {
        if (!this.enabled) return;

        // Stats.js Update
        if (this.stats) {
            this.stats.update();
        }

        // Eigene FPS-Messung
        this.updateFPS();

        // Frame-Time messen
        this.recordFrameTime();
    }

    /**
     * 📈 FPS-Messung
     */
    updateFPS() {
        this.frameCounter++;
        const now = performance.now();

        if (now - this.lastFPSCheck > 1000) {
            this.currentFPS = Math.round(this.frameCounter * 1000 / (now - this.lastFPSCheck));
            this.frameCounter = 0;
            this.lastFPSCheck = now;
        }
    }

    /**
     * ⏱️ Frame-Time aufzeichnen
     */
    recordFrameTime() {
        const now = performance.now();
        if (this.lastFrameTime) {
            const frameTime = now - this.lastFrameTime;
            this.frameTime.push({
                time: now,
                duration: frameTime
            });

            // Nur letzte 60 Frames behalten
            if (this.frameTime.length > 60) {
                this.frameTime.shift();
            }
        }
        this.lastFrameTime = now;
    }

    /**
     * 💾 Memory-Usage aufzeichnen
     */
    recordMemoryUsage() {
        if (!performance.memory) return;

        const usage = {
            time: Date.now(),
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
        };

        this.memoryUsage.push(usage);

        // Nur letzte 1000 Einträge behalten
        if (this.memoryUsage.length > 1000) {
            this.memoryUsage.shift();
        }
    }

    /**
     * ⚠️ Performance-Warnungen prüfen
     */
    checkPerformanceWarnings() {
        if (!config.get('debug.logPerformance')) return;

        // Low FPS Warning
        if (this.currentFPS < this.warningThresholds.lowFPS) {
            console.warn(`⚠️ Niedrige FPS: ${this.currentFPS} (< ${this.warningThresholds.lowFPS})`);
        }

        // Memory Warning
        if (performance.memory) {
            const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
            if (usage > this.warningThresholds.highMemory) {
                console.warn(`⚠️ Hoher Speicherverbrauch: ${(usage * 100).toFixed(1)}% (> ${this.warningThresholds.highMemory * 100}%)`);
            }
        }

        // High Frame-Time Warning
        if (this.frameTime.length > 0) {
            const avgFrameTime = this.frameTime.reduce((sum, frame) => sum + frame.duration, 0) / this.frameTime.length;
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

        // Memory-Infos (falls verfügbar)
        if (performance.memory) {
            const memory = performance.memory;
            stats.memory = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                usagePercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
            };
        }

        // Frame-Time-Statistiken
        if (this.frameTime.length > 0) {
            const frameTimes = this.frameTime.map(f => f.duration);
            stats.frameTime = {
                avg: frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length,
                min: Math.min(...frameTimes),
                max: Math.max(...frameTimes),
                samples: frameTimes.length
            };
        }

        return stats;
    }

    getMemoryHistory() {
        return this.memoryUsage.slice(); // Kopie zurückgeben
    }
