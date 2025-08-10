// ============================================
// js/core/renderOptimizer.js - Mobile-Optimierung (optional)
// ============================================

import * as THREE from 'three';

/**
 * Render-Optimierung für große Szenen (2300+ Modelle)
 * Kann bei Bedarf aktiviert werden für Mobile/Tablet
 */
export class RenderOptimizer {
    constructor(camera, scene, renderer) {
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;

        // Optimierung-Status
        this.enabled = false;
        this.frustumCullingEnabled = false;
        this.lodEnabled = false;

        // Performance-Tracking
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            culledObjects: 0,
            renderTime: 0
        };

        // Frustum Culling
        this.frustum = new THREE.Frustum();
        this.cameraMatrix = new THREE.Matrix4();

        // LOD System
        this.lodLevels = {
            high: { distance: 50, enabled: true },
            medium: { distance: 100, enabled: true },
            low: { distance: 200, enabled: true },
            hidden: { distance: 300, enabled: true }
        };

        // Performance Monitoring
        this.frameCounter = 0;
        this.lastFPSCheck = performance.now();
        this.currentFPS = 60;

        console.log('🚀 RenderOptimizer initialisiert (deaktiviert)');
    }

    /**
     * Aktiviert die Optimierung (für Mobile/Performance-Probleme)
     */
    enable(options = {}) {
        this.enabled = true;
        this.frustumCullingEnabled = options.frustumCulling !== false;
        this.lodEnabled = options.lod !== false;

        console.log('⚡ RenderOptimizer aktiviert:', {
            frustumCulling: this.frustumCullingEnabled,
            lod: this.lodEnabled
        });
    }

    /**
     * Deaktiviert die Optimierung (Standard für Desktop)
     */
    disable() {
        this.enabled = false;
        this.frustumCullingEnabled = false;
        this.lodEnabled = false;

        // Alle Objekte wieder sichtbar machen
        this.scene.traverse(child => {
            if (child.isMesh && child.userData.originallyVisible !== false) {
                child.visible = true;
            }
        });

        console.log('🔄 RenderOptimizer deaktiviert - alle Objekte sichtbar');
    }

    /**
     * Führt die Optimierung vor dem Rendern durch
     * Wird vom Render-Loop aufgerufen
     */
    optimize() {
        if (!this.enabled) return;

        const startTime = performance.now();

        this.updateStats();
        this.updateFrustum();

        let visible = 0;
        let culled = 0;

        this.scene.traverse(child => {
            if (!child.isMesh) return;

            const wasVisible = child.visible;
            child.userData.originallyVisible = wasVisible;

            // Frustum Culling
            if (this.frustumCullingEnabled) {
                const inFrustum = this.frustum.intersectsObject(child);
                if (!inFrustum) {
                    child.visible = false;
                    culled++;
                    return;
                }
            }

            // LOD System
            if (this.lodEnabled) {
                const distance = this.camera.position.distanceTo(child.position);
                const shouldBeVisible = this.calculateLODVisibility(child, distance);
                child.visible = shouldBeVisible && wasVisible;
            }

            if (child.visible) visible++;
            else culled++;
        });

        this.stats.visibleObjects = visible;
        this.stats.culledObjects = culled;
        this.stats.renderTime = performance.now() - startTime;
    }

    /**
     * Aktualisiert die Frustum-Matrix
     */
    updateFrustum() {
        if (!this.frustumCullingEnabled) return;

        this.cameraMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    }

    /**
     * Berechnet LOD-Sichtbarkeit basierend auf Entfernung
     */
    calculateLODVisibility(object, distance) {
        if (!this.lodEnabled) return true;

        // Anatomie-spezifische LOD-Regeln
        const importance = object.userData.meta?.importance || 'medium';

        switch (importance) {
            case 'critical':
                return distance < this.lodLevels.hidden.distance;

            case 'high':
                return distance < this.lodLevels.low.distance;

            case 'medium':
                return distance < this.lodLevels.medium.distance;

            case 'low':
                return distance < this.lodLevels.high.distance;

            default:
                return distance < this.lodLevels.medium.distance;
        }
    }

    /**
     * Aktualisiert Performance-Statistiken
     */
    updateStats() {
        this.frameCounter++;
        const now = performance.now();

        if (now - this.lastFPSCheck > 1000) {
            this.currentFPS = Math.round(this.frameCounter * 1000 / (now - this.lastFPSCheck));
            this.frameCounter = 0;
            this.lastFPSCheck = now;
        }

        this.stats.totalObjects = 0;
        this.scene.traverse(child => {
            if (child.isMesh) this.stats.totalObjects++;
        });
    }

    /**
     * Automatische Aktivierung basierend auf Performance
     */
    autoOptimize() {
        const shouldOptimize =
            this.currentFPS < 30 ||
            this.stats.totalObjects > 1000 ||
            this.isMobileDevice();

        if (shouldOptimize && !this.enabled) {
            console.log('🔧 Auto-Optimierung aktiviert (Performance/Mobile erkannt)');
            this.enable();
        }
    }

    /**
     * Erkennt Mobile Geräte
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        ) || window.innerWidth < 768;
    }

    /**
     * Gibt aktuelle Performance-Statistiken zurück
     */
    getStats() {
        return {
            ...this.stats,
            fps: this.currentFPS,
            enabled: this.enabled,
            optimizations: {
                frustumCulling: this.frustumCullingEnabled,
                lod: this.lodEnabled
            }
        };
    }

    /**
     * Konfiguriert LOD-Distanzen
     */
    configureLOD(levels) {
        this.lodLevels = { ...this.lodLevels, ...levels };
        console.log('🎚️ LOD-Level konfiguriert:', this.lodLevels);
    }

    /**
     * Debug-Ausgabe für Performance-Monitoring
     */
    debugLog() {
        if (!this.enabled) return;

        console.log('📊 RenderOptimizer Stats:', this.getStats());
    }
}

/**
 * Einfache Funktionen für bestehenden Code
 */
let globalOptimizer = null;

export function createOptimizer(camera, scene, renderer) {
    globalOptimizer = new RenderOptimizer(camera, scene, renderer);
    return globalOptimizer;
}

export function optimizeRender() {
    if (globalOptimizer) {
        globalOptimizer.optimize();
    }
}

export function enableOptimization(options) {
    if (globalOptimizer) {
        globalOptimizer.enable(options);
    }
}

export function disableOptimization() {
    if (globalOptimizer) {
        globalOptimizer.disable();
    }
}

export function getOptimizerStats() {
    return globalOptimizer ? globalOptimizer.getStats() : null;
}