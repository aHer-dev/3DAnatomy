// ============================================
// SCHRITT 2: js/core/resourceManager.js  
// Minimaler, crashsicherer Resource Manager
// ============================================

import { getConfig, isFeatureEnabled } from '../config/config.js';

/**
 * MINIMALER RESOURCE MANAGER
 * - Startet im "Monitor-Only" Modus
 * - Kann schrittweise aktiviert werden
 * - Bricht niemals die bestehende App
 */
class MinimalResourceManager {
    constructor() {
        // Feature-Status prüfen
        this.enabled = isFeatureEnabled('resourceManager');
        this.debug = getConfig('features.resourceManagerConfig.debugLogs', false);
        this.maxMemoryMB = getConfig('features.resourceManagerConfig.maxMemoryMB', 100);
        this.autoCleanup = getConfig('features.resourceManagerConfig.autoCleanup', true);

        // Cache für Ressourcen (nur wenn aktiviert)
        this.cache = new Map();
        this.memoryUsage = 0;
        this.maxMemoryBytes = this.maxMemoryMB * 1024 * 1024;

        // Statistiken (immer sammeln für Monitoring)
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            memoryUsage: 0,
            itemsInCache: 0,
            cleanupOperations: 0
        };

        this.logStatus();
    }

    /**
     * HAUPT-LOAD-METHODE
     * Wrapper um bestehende Loader - bricht nichts
     */
    async load(url, loader, options = {}) {
        this.stats.totalRequests++;

        try {
            // Cache-Check (nur wenn aktiviert)
            if (this.enabled && this.cache.has(url)) {
                this.stats.cacheHits++;
                if (this.debug) console.log(`📦 Cache Hit: ${url}`);
                return this.getCachedResource(url);
            }

            // Standard-Loading (wie bisher)
            this.stats.cacheMisses++;
            const resource = await this.loadResource(url, loader, options);

            // In Cache speichern (nur wenn aktiviert und erfolgreich)
            if (this.enabled && resource) {
                this.addToCache(url, resource);
            }

            return resource;

        } catch (error) {
            // Fehler weiterwerfen - normale Error-Behandlung
            console.warn(`⚠️ ResourceManager: Ladefehler für ${url}:`, error.message);
            throw error;
        }
    }

    /**
     * STANDARD-RESOURCE-LOADING
     * Verwendet den bereitgestellten Loader (Ihre bestehenden Loader)
     */
    async loadResource(url, loader, options) {
        return new Promise((resolve, reject) => {
            // Validierung
            if (!loader || typeof loader.load !== 'function') {
                reject(new Error(`Ungültiger Loader für ${url}`));
                return;
            }

            // Loading mit dem originalen Loader
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
     * RESOURCE ZUM CACHE HINZUFÜGEN
     * Mit automatischem Memory Management
     */
    addToCache(url, resource) {
        if (!this.enabled) return;

        try {
            const size = this.estimateResourceSize(resource);

            // Memory-Check vor dem Hinzufügen
            if (this.autoCleanup) {
                this.ensureMemorySpace(size);
            }

            // Resource cachen
            const cacheEntry = {
                resource,
                size,
                timestamp: Date.now(),
                lastAccessed: Date.now(),
                accessCount: 0
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
            // Fehler hier brechen die App nicht - Resource wird nur nicht gecacht
        }
    }

    /**
     * CACHED RESOURCE ABRUFEN
     */
    getCachedResource(url) {
        const entry = this.cache.get(url);
        if (entry) {
            entry.lastAccessed = Date.now();
            entry.accessCount++;
            return entry.resource;
        }
        return null;
    }

    /**
     * MEMORY SPACE SICHERSTELLEN
     * Entfernt alte Resources wenn Memory-Limit erreicht
     */
    ensureMemorySpace(requiredSize) {
        if (this.memoryUsage + requiredSize <= this.maxMemoryBytes) {
            return; // Genug Speicher verfügbar
        }

        if (this.debug) {
            console.log(`🧹 Memory cleanup needed: ${this.formatBytes(this.memoryUsage + requiredSize)} > ${this.formatBytes(this.maxMemoryBytes)}`);
        }

        // Sortiere nach "least recently used"
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        // Entferne alte Einträge bis genug Platz frei ist
        let freedMemory = 0;
        let removedItems = 0;

        for (const [url, entry] of entries) {
            if (this.memoryUsage - freedMemory + requiredSize <= this.maxMemoryBytes) {
                break; // Genug Platz geschaffen
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
     * RESOURCE AUS CACHE ENTFERNEN
     */
    removeFromCache(url) {
        const entry = this.cache.get(url);
        if (entry) {
            // Three.js Resources sauber entsorgen
            this.disposeResource(entry.resource);

            this.memoryUsage -= entry.size;
            this.cache.delete(url);
            this.stats.memoryUsage = this.memoryUsage;
            this.stats.itemsInCache = this.cache.size;
        }
    }

    /**
     * RESOURCE-GRÖSSE SCHÄTZEN
     * Einfache Schätzung für verschiedene Ressourcentypen
     */
    estimateResourceSize(resource) {
        try {
            if (!resource) return 0;

            // GLTF/GLB
            if (resource.scene) {
                return this.estimateSceneSize(resource.scene);
            }

            // Texture
            if (resource.image) {
                const img = resource.image;
                return (img.width || 512) * (img.height || 512) * 4; // RGBA
            }

            // Geometry
            if (resource.attributes) {
                let size = 0;
                for (const attr of Object.values(resource.attributes)) {
                    size += attr.array ? attr.array.byteLength : 0;
                }
                return size;
            }

            // Fallback
            return 1024; // 1KB Schätzung

        } catch (error) {
            return 1024; // Sichere Schätzung
        }
    }

    /**
     * SCENE-GRÖSSE SCHÄTZEN
     */
    estimateSceneSize(scene) {
        let totalSize = 0;

        try {
            scene.traverse((child) => {
                // Geometry
                if (child.geometry?.attributes) {
                    for (const attr of Object.values(child.geometry.attributes)) {
                        totalSize += attr.array?.byteLength || 0;
                    }
                }

                // Textures
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
            return 10240; // 10KB Fallback
        }

        return totalSize;
    }

    /**
     * RESOURCE SAUBER ENTSORGEN
     */
    disposeResource(resource) {
        try {
            // Three.js dispose pattern
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
                            // Textures entsorgen
                            Object.keys(mat).forEach(key => {
                                if (mat[key]?.dispose) mat[key].dispose();
                            });
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('⚠️ Dispose-Fehler:', error);
            // Fehler hier sind nicht kritisch
        }
    }

    /**
     * BYTES FORMATIEREN
     */
    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(1)} ${units[i]}`;
    }

    /**
     * STATUS LOGGEN
     */
    logStatus() {
        const status = this.enabled ? '✅ AKTIV' : '📊 MONITORING-ONLY';
        console.log(`🗄️ Resource Manager: ${status} (Limit: ${this.maxMemoryMB}MB)`);
    }

    /**
     * FEATURE AKTIVIEREN/DEAKTIVIEREN
     */
    setEnabled(enabled) {
        if (enabled === this.enabled) return;

        this.enabled = enabled;

        if (!enabled) {
            // Cache leeren wenn deaktiviert
            this.clearCache();
            console.log('🗄️ Resource Manager deaktiviert - Cache geleert');
        } else {
            console.log('🗄️ Resource Manager aktiviert');
        }
    }

    /**
     * CACHE LEEREN
     */
    clearCache() {
        for (const url of this.cache.keys()) {
            this.removeFromCache(url);
        }
        console.log(`🧹 Cache geleert (${this.cache.size} Items)`);
    }

    /**
     * STATISTIKEN ABRUFEN
     */
    getStats() {
        return {
            ...this.stats,
            enabled: this.enabled,
            maxMemoryMB: this.maxMemoryMB,
            currentMemoryMB: Math.round(this.memoryUsage / 1024 / 1024),
            memoryUsagePercent: Math.round((this.memoryUsage / this.maxMemoryBytes) * 100),
            cacheHitRate: this.stats.totalRequests > 0 ?
                Math.round((this.stats.cacheHits / this.stats.totalRequests) * 100) : 0
        };
    }
}

// ===================
// GLOBALE INSTANZ (Singleton Pattern)
// ===================
let globalResourceManager = null;

/**
 * RESOURCE MANAGER ERSTELLEN/ABRUFEN
 */
export function getResourceManager() {
    if (!globalResourceManager) {
        globalResourceManager = new MinimalResourceManager();
    }
    return globalResourceManager;
}

/**
 * EINFACHE API FÜR BESTEHENDEN CODE
 * Kann direkt anstelle Ihrer bestehenden Loader verwendet werden
 */
export async function loadWithManager(url, loader, options = {}) {
    const manager = getResourceManager();
    return manager.load(url, loader, options);
}

/**
 * MANAGER-KONTROLLE
 */
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