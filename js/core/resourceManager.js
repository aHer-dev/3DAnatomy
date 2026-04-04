// js/core/resourceManager.js - ERWEITERTE VERSION für besseres Caching

import { getConfig, isFeatureEnabled } from '../config/config.js';

/**
 * 🚀 VERBESSERTER RESOURCE MANAGER mit intelligenterem Caching
 */
class AdvancedResourceManager {
    constructor() {
        this.enabled = isFeatureEnabled('resourceManager');
        this.debug = getConfig('features.resourceManagerConfig.debugLogs', false);
        this.maxMemoryMB = getConfig('features.resourceManagerConfig.maxMemoryMB', 200);
        this.autoCleanup = getConfig('features.resourceManagerConfig.autoCleanup', true);

        // ✅ ERWEITERTE CACHE-STRATEGIEN
        this.cache = new Map();
        this.memoryUsage = 0;
        this.maxMemoryBytes = this.maxMemoryMB * 1024 * 1024;

        // ✅ NEUE: Persistente Metadaten (überleben Page-Reload)
        this.persistentCache = this.initPersistentCache();

        // ✅ NEUE: Preload-Queue für wichtige Modelle
        this.preloadQueue = [];
        this.isPreloading = false;

        // Statistiken
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            memoryUsage: 0,
            itemsInCache: 0,
            cleanupOperations: 0,
            preloadCount: 0,
            avgLoadTime: 0
        };

        this.logStatus();
        this.startPreloadWorker();
    }

    /**
     * ✅ NEUE: Persistenter Cache mit IndexedDB (für Metadaten)
     */
    initPersistentCache() {
        try {
            // Einfacher localStorage-basierter Cache für Metadaten
            const cached = localStorage.getItem('anatomy-cache-meta');
            return cached ? JSON.parse(cached) : {};
        } catch (error) {
            console.warn('⚠️ Persistenter Cache nicht verfügbar:', error);
            return {};
        }
    }

    /**
     * ✅ ERWEITERTE LOAD-METHODE mit intelligentem Caching
     */
    async load(url, loader, options = {}) {
        this.stats.totalRequests++;
        const startTime = performance.now();

        try {
            // Prüfe persistenten Cache zuerst
            if (this.enabled && this.persistentCache[url]) {
                console.log(`💾 Persistenter Cache Hit: ${url}`);
                this.stats.cacheHits++;
                return this.getCachedResource(url);
            }

            // Memory-Cache Check
            if (this.enabled && this.cache.has(url)) {
                this.stats.cacheHits++;
                if (this.debug) console.log(`🔥 Memory Cache Hit: ${url}`);

                const resource = this.getCachedResource(url);
                this.updateAvgLoadTime(startTime);
                return resource;
            }

            // Standard-Loading
            this.stats.cacheMisses++;
            const resource = await this.loadResource(url, loader, options);

            // ✅ INTELLIGENTES CACHING basierend auf Dateigröße und Häufigkeit
            if (this.enabled && resource && this.shouldCache(url, resource)) {
                await this.addToCache(url, resource);
                this.updatePersistentCache(url, { lastAccessed: Date.now(), size: this.estimateResourceSize(resource) });
            }

            this.updateAvgLoadTime(startTime);
            return resource;

        } catch (error) {
            console.warn(`⚠️ ResourceManager: Ladefehler für ${url}:`, error.message);
            throw error;
        }
    }

    /**
     * ✅ NEUE: Entscheidet ob Resource gecacht werden soll
     */
    shouldCache(url, resource) {
        // Kleine Dateien immer cachen
        const size = this.estimateResourceSize(resource);
        if (size < 1024 * 1024) return true; // < 1MB

        // Wichtige Dateitypen bevorzugen
        if (url.includes('/bones/') || url.includes('/teeth/')) return true;
        if (url.includes('_draco.glb')) return true; // Draco-komprimierte Dateien

        // Häufig verwendete Dateien
        const accessCount = this.persistentCache[url]?.accessCount || 0;
        if (accessCount > 2) return true;

        // Große Dateien nur bei genug Speicher
        return (this.memoryUsage + size) < (this.maxMemoryBytes * 0.8);
    }

    /**
     * ✅ NEUE: Preload wichtiger Modelle im Hintergrund
     */
    addToPreloadQueue(urls) {
        if (!Array.isArray(urls)) urls = [urls];

        urls.forEach(url => {
            if (!this.preloadQueue.includes(url) && !this.cache.has(url)) {
                this.preloadQueue.push(url);
            }
        });

        if (!this.isPreloading) {
            this.processPreloadQueue();
        }
    }

    /**
     * ✅ NEUE: Preload-Worker
     */
    async processPreloadQueue() {
        if (this.preloadQueue.length === 0 || this.isPreloading) return;

        this.isPreloading = true;
        console.log(`🔄 Starte Preload von ${this.preloadQueue.length} Modellen...`);

        while (this.preloadQueue.length > 0) {
            const url = this.preloadQueue.shift();

            try {
                // Nur laden wenn nicht bereits im Cache und Speicher verfügbar
                if (!this.cache.has(url) && this.memoryUsage < (this.maxMemoryBytes * 0.7)) {
                    const { createGLTFLoader } = await import('../loaders/gltfLoaderFactory.js');
                    const loader = createGLTFLoader();

                    await this.load(url, loader);
                    this.stats.preloadCount++;

                    if (this.debug) console.log(`📦 Preloaded: ${url}`);
                }

                // Kleine Pause zwischen Preloads
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.warn(`⚠️ Preload fehlgeschlagen: ${url}`, error);
            }
        }

        this.isPreloading = false;
        console.log(`✅ Preload abgeschlossen (${this.stats.preloadCount} Modelle)`);
    }

    /**
     * ✅ NEUE: Worker für automatischen Preload
     */
    startPreloadWorker() {
        if (!this.enabled) return;

        // Nach 5 Sekunden wichtige Modelle preloaden
        setTimeout(() => {
            const importantModels = [
                'models/bones/skeleton_base.glb',
                'models/teeth/dental_arch.glb',
                // Weitere wichtige Grundmodelle...
            ];

            this.addToPreloadQueue(importantModels);
        }, 5000);
    }

    /**
     * Standard Resource Loading (unverändert)
     */
    async loadResource(url, loader, options) {
        return new Promise((resolve, reject) => {
            if (!loader || typeof loader.load !== 'function') {
                reject(new Error(`Ungültiger Loader für ${url}`));
                return;
            }

            loader.load(
                url,
                (resource) => {
                    if (this.debug) console.log(`✅ Loaded: ${url}`);
                    resolve(resource);
                },
                options.onProgress || undefined,
                (error) => {
                    console.warn(`❌ Load failed: ${url}`, error);
                    reject(error);
                }
            );
        });
    }

    /**
     * ✅ VERBESSERTE addToCache mit intelligentem Memory Management
     */
    async addToCache(url, resource) {
        if (!this.enabled) return;

        try {
            const size = this.estimateResourceSize(resource);

            // Memory-Check vor dem Hinzufügen
            if (this.autoCleanup) {
                await this.ensureMemorySpace(size);
            }

            // Resource cachen
            const cacheEntry = {
                resource,
                size,
                timestamp: Date.now(),
                lastAccessed: Date.now(),
                accessCount: 1,
                url: url,
                importance: this.calculateImportance(url) // Neue Wichtigkeits-Bewertung
            };

            this.cache.set(url, cacheEntry);
            this.memoryUsage += size;
            this.stats.memoryUsage = this.memoryUsage;
            this.stats.itemsInCache = this.cache.size;

            if (this.debug) {
                console.log(`📦 Cached: ${url} (${this.formatBytes(size)}) - Total: ${this.formatBytes(this.memoryUsage)}`);
            }

        } catch (error) {
            console.warn(`⚠️ Cache-Fehler für ${url}:`, error);
        }
    }

    /**
     * ✅ NEUE: Berechnet Wichtigkeit einer Resource
     */
    calculateImportance(url) {
        let score = 0;

        // Basis-Anatomie ist wichtiger
        if (url.includes('/bones/')) score += 100;
        if (url.includes('/teeth/')) score += 90;
        if (url.includes('/muscles/')) score += 70;

        // Draco-komprimierte Dateien bevorzugen
        if (url.includes('_draco.glb')) score += 20;

        // Häufigkeit aus persistentem Cache
        const persistent = this.persistentCache[url];
        if (persistent) {
            score += Math.min(persistent.accessCount || 0, 50);
        }

        return score;
    }

    /**
     * ✅ VERBESSERTE ensureMemorySpace mit Wichtigkeits-basiertem Cleanup
     */
    async ensureMemorySpace(requiredSize) {
        if (this.memoryUsage + requiredSize <= this.maxMemoryBytes) {
            return;
        }

        if (this.debug) {
            console.log(`🧹 Memory cleanup needed: ${this.formatBytes(this.memoryUsage + requiredSize)} > ${this.formatBytes(this.maxMemoryBytes)}`);
        }

        // Sortiere nach Wichtigkeit (niedrigste zuerst)
        const entries = Array.from(this.cache.entries())
            .map(([url, entry]) => [url, { ...entry, importance: entry.importance || this.calculateImportance(url) }])
            .sort((a, b) => {
                // Primär: Wichtigkeit
                const importanceDiff = a[1].importance - b[1].importance;
                if (importanceDiff !== 0) return importanceDiff;

                // Sekundär: Letzter Zugriff
                return a[1].lastAccessed - b[1].lastAccessed;
            });

        let freedMemory = 0;
        let removedItems = 0;

        for (const [url, entry] of entries) {
            if (this.memoryUsage - freedMemory + requiredSize <= this.maxMemoryBytes) {
                break;
            }

            this.removeFromCache(url);
            freedMemory += entry.size;
            removedItems++;
        }

        this.stats.cleanupOperations++;

        if (this.debug) {
            console.log(`🧹 Cleanup: ${removedItems} items removed, ${this.formatBytes(freedMemory)} freed`);
        }
    }

    /**
     * ✅ NEUE: Persistenten Cache aktualisieren
     */
    updatePersistentCache(url, metadata) {
        try {
            if (!this.persistentCache[url]) {
                this.persistentCache[url] = { accessCount: 0 };
            }

            Object.assign(this.persistentCache[url], metadata);
            this.persistentCache[url].accessCount++;

            // Speichere in localStorage (max. 1000 Einträge)
            const keys = Object.keys(this.persistentCache);
            if (keys.length > 1000) {
                // Entferne älteste Einträge
                keys.sort((a, b) => (this.persistentCache[a].lastAccessed || 0) - (this.persistentCache[b].lastAccessed || 0))
                    .slice(0, 200)
                    .forEach(key => delete this.persistentCache[key]);
            }

            localStorage.setItem('anatomy-cache-meta', JSON.stringify(this.persistentCache));
        } catch (error) {
            console.warn('⚠️ Persistent Cache Update fehlgeschlagen:', error);
        }
    }

    /**
     * ✅ NEUE: Durchschnittliche Ladezeit berechnen
     */
    updateAvgLoadTime(startTime) {
        const loadTime = performance.now() - startTime;
        this.stats.avgLoadTime = this.stats.avgLoadTime === 0 ?
            loadTime :
            (this.stats.avgLoadTime * 0.9 + loadTime * 0.1); // Exponential smoothing
    }

    /**
     * Cached Resource abrufen (mit Zugriffs-Update)
     */
    getCachedResource(url) {
        const entry = this.cache.get(url);
        if (entry) {
            entry.lastAccessed = Date.now();
            entry.accessCount++;
            this.updatePersistentCache(url, { lastAccessed: Date.now() });
            return entry.resource;
        }
        return null;
    }

    /**
     * Resource aus Cache entfernen
     */
    removeFromCache(url) {
        const entry = this.cache.get(url);
        if (entry) {
            this.disposeResource(entry.resource);
            this.memoryUsage -= entry.size;
            this.cache.delete(url);
            this.stats.memoryUsage = this.memoryUsage;
            this.stats.itemsInCache = this.cache.size;
        }
    }

    /**
     * ✅ ERWEITERTE Statistiken
     */
    getStats() {
        const hitRate = this.stats.totalRequests > 0 ?
            Math.round((this.stats.cacheHits / this.stats.totalRequests) * 100) : 0;

        return {
            ...this.stats,
            enabled: this.enabled,
            maxMemoryMB: this.maxMemoryMB,
            currentMemoryMB: Math.round(this.memoryUsage / 1024 / 1024),
            memoryUsagePercent: Math.round((this.memoryUsage / this.maxMemoryBytes) * 100),
            cacheHitRate: hitRate,
            avgLoadTimeMs: Math.round(this.stats.avgLoadTime),
            preloadQueueLength: this.preloadQueue.length,
            persistentCacheSize: Object.keys(this.persistentCache).length
        };
    }

    // Restliche Methoden bleiben unverändert...
    estimateResourceSize(resource) {
        try {
            if (!resource) return 0;

            if (resource.scene) {
                return this.estimateSceneSize(resource.scene);
            }

            if (resource.image) {
                const img = resource.image;
                return (img.width || 512) * (img.height || 512) * 4;
            }

            if (resource.attributes) {
                let size = 0;
                for (const attr of Object.values(resource.attributes)) {
                    size += attr.array ? attr.array.byteLength : 0;
                }
                return size;
            }

            return 1024;

        } catch (error) {
            return 1024;
        }
    }

    estimateSceneSize(scene) {
        let totalSize = 0;

        try {
            scene.traverse((child) => {
                if (child.geometry?.attributes) {
                    for (const attr of Object.values(child.geometry.attributes)) {
                        totalSize += attr.array?.byteLength || 0;
                    }
                }

                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    for (const mat of materials) {
                        if (mat.map?.image) {
                            const img = mat.map.image;
                            totalSize += (img.width || 512) * (img.height || 512) * 4;
                        }
                    }
                }
            });
        } catch (error) {
            console.warn('⚠️ Scene-Größenschätzung fehlgeschlagen:', error);
            return 10240;
        }

        return totalSize;
    }

    disposeResource(resource) {
        try {
            if (resource?.dispose) {
                resource.dispose();
            }

            if (resource?.scene) {
                resource.scene.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            mat.dispose();
                            Object.keys(mat).forEach(key => {
                                if (mat[key]?.dispose) mat[key].dispose();
                            });
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('⚠️ Dispose-Fehler:', error);
        }
    }

    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(1)} ${units[i]}`;
    }

    logStatus() {
        const status = this.enabled ? '✅ AKTIV' : '📊 MONITORING-ONLY';
        console.log(`🗄️ Advanced Resource Manager: ${status} (Limit: ${this.maxMemoryMB}MB)`);
    }

    setEnabled(enabled) {
        if (enabled === this.enabled) return;

        this.enabled = enabled;

        if (!enabled) {
            this.clearCache();
            console.log('🗄️ Resource Manager deaktiviert - Cache geleert');
        } else {
            console.log('🗄️ Resource Manager aktiviert');
        }
    }

    clearCache() {
        for (const url of this.cache.keys()) {
            this.removeFromCache(url);
        }
        console.log(`🧹 Cache geleert (${this.cache.size} Items)`);
    }
}

// Globale Instanz
let globalResourceManager = null;

export function getResourceManager() {
    if (!globalResourceManager) {
        globalResourceManager = new AdvancedResourceManager();
    }
    return globalResourceManager;
}

export async function loadWithManager(url, loader, options = {}) {
    const manager = getResourceManager();
    return manager.load(url, loader, options);
}

export function preloadImportantModels(urls) {
    const manager = getResourceManager();
    manager.addToPreloadQueue(urls);
}

export function enableResourceManager() {
    const manager = getResourceManager();
    manager.setEnabled(true);
}

export function disableResourceManager() {
    const manager = getResourceManager();
    manager.setEnabled(false);
}

export function getResourceStats() {
    const manager = getResourceManager();
    return manager.getStats();
}