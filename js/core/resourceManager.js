// ============================================
// js/core/resourceManager.js - Sichere Speicherverwaltung
// ============================================

import { config } from './config.js';

/**
 * 🛡️ Sichere Resource-Verwaltung ohne App-Crash
 * Verwaltet Modelle, Texturen und andere Ressourcen im Speicher
 */
export class ResourceManager {
    constructor() {
        this.cache = new Map();
        this.size = 0;
        this.maxSize = config.get('performance.memoryLimit') || 512 * 1024 * 1024; // 512MB default
        this.enabled = false; // ← Standardmäßig DEAKTIVIERT

        // Statistiken
        this.stats = {
            totalLoaded: 0,
            totalEvicted: 0,
            cacheHits: 0,
            cacheMisses: 0,
            currentSize: 0
        };

        console.log('💾 ResourceManager initialisiert (deaktiviert)');
    }

    /**
     * 🎛️ Aktiviert den Resource Manager
     */
    enable() {
        this.enabled = true;
        this.setupGarbageCollection();
        console.log('⚡ ResourceManager aktiviert');
    }

    /**
     * 🛑 Deaktiviert den Resource Manager
     */
    disable() {
        this.enabled = false;
        this.clearGarbageCollection();
        console.log('🔄 ResourceManager deaktiviert');
    }

    /**
     * 📦 Lädt eine Ressource (mit Caching falls aktiviert)
     */
    async load(url, loader) {
        if (!this.enabled) {
            // Direkt laden ohne Caching
            return await this.fetchResource(url, loader);
        }

        // Cache prüfen
        if (this.cache.has(url)) {
            this.stats.cacheHits++;
            const cached = this.cache.get(url);
            cached.lastAccessed = Date.now();
            console.log(`📋 Cache Hit: ${url}`);
            return cached.resource;
        }

        // Neu laden
        this.stats.cacheMisses++;
        const resource = await this.fetchResource(url, loader);

        if (resource) {
            this.add(url, resource);
        }

        return resource;
    }

    /**
     * 🔄 Tatsächliches Laden der Ressource
     */
    async fetchResource(url, loader) {
        try {
            return new Promise((resolve, reject) => {
                if (!loader || typeof loader.load !== 'function') {
                    reject(new Error('Ungültiger Loader'));
                    return;
                }

                loader.load(
                    url,
                    (resource) => {
                        console.log(`✅ Ressource geladen: ${url}`);
                        resolve(resource);
                    },
                    undefined, // onProgress
                    (error) => {
                        console.warn(`⚠️ Ladefehler: ${url}`, error);
                        reject(error);
                    }
                );
            });
        } catch (error) {
            console.error(`❌ fetchResource Fehler: ${url}`, error);
            throw error;
        }
    }

    /**
     * ➕ Fügt Ressource zum Cache hinzu
     */
    add(url, resource) {
        if (!this.enabled) return;

        const size = this.estimateSize(resource);
        const entry = {
            resource,
            size,
            url,
            addedAt: Date.now(),
            lastAccessed: Date.now()
        };

        // Speicher-Check vor dem Hinzufügen
        while (this.size + size > this.maxSize && this.cache.size > 0) {
            this.evictLeastRecentlyUsed();
        }

        // Hinzufügen
        this.cache.set(url, entry);
        this.size += size;
        this.stats.totalLoaded++;
        this.stats.currentSize = this.size;

        console.log(`📦 Cached: ${url} (${this.formatBytes(size)})`);
    }

    /**
     * ➖ Entfernt Ressource aus Cache
     */
    remove(url) {
        if (!this.cache.has(url)) return false;

        const entry = this.cache.get(url);
        this.size -= entry.size;
        this.cache.delete(url);
        this.stats.currentSize = this.size;

        // Ressource sicher disposen
        this.disposeResource(entry.resource);

        console.log(`🗑️ Removed from cache: ${url}`);
        return true;
    }

    /**
     * 🧹 LRU-Eviction (Least Recently Used)
     */
    evictLeastRecentlyUsed() {
        if (this.cache.size === 0) return;

        let oldestUrl = null;
        let oldestTime = Date.now();

        for (const [url, entry] of this.cache) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestUrl = url;
            }
        }

        if (oldestUrl) {
            this.remove(oldestUrl);
            this.stats.totalEvicted++;
            console.log(`🧹 Evicted LRU: ${oldestUrl}`);
        }
    }

    /**
     * 📏 Schätzt Speichergröße einer Ressource
     */
    estimateSize(resource) {
        try {
            if (!resource) return 0;

            let size = 0;

            // GLTF Scene
            if (resource.scene) {
                resource.scene.traverse((child) => {
                    if (child.geometry) {
                        size += this.estimateGeometrySize(child.geometry);
                    }
                    if (child.material) {
                        size += this.estimateMaterialSize(child.material);
                    }
                });
                return size;
            }

            // Geometry
            if (resource.geometry) {
                return this.estimateGeometrySize(resource.geometry);
            }

            // Texture
            if (resource.image) {
                const img = resource.image;
                return (img.width || 512) * (img.height || 512) * 4; // RGBA
            }

            // Fallback
            return 1024; // 1KB default

        } catch (error) {
            console.warn('⚠️ Size estimation failed:', error);
            return 1024;
        }
    }

    /**
     * 📐 Geometry-Größe schätzen
     */
    estimateGeometrySize(geometry) {
        if (!geometry.attributes) return 0;

        let size = 0;
        for (const attributeName in geometry.attributes) {
            const attribute = geometry.attributes[attributeName];
            size += attribute.array.byteLength || 0;
        }

        if (geometry.index) {
            size += geometry.index.array.byteLength || 0;
        }

        return size;
    }

    /**
     * 🎨 Material-Größe schätzen
     */
    estimateMaterialSize(material) {
        let size = 0;

        // Texturen durchgehen
        for (const prop in material) {
            const value = material[prop];
            if (value && value.isTexture && value.image) {
                const img = value.image;
                size += (img.width || 512) * (img.height || 512) * 4;
            }
        }

        return size || 1024;
    }

    /**
     * 🗑️ Sichere Ressourcen-Entsorgung
     */
    disposeResource(resource) {
        try {
            if (!resource) return;

            // GLTF Scene
            if (resource.scene) {
                resource.scene.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                return;
            }

            // Einzelne Ressourcen
            if (resource.dispose && typeof resource.dispose === 'function') {
                resource.dispose();
            }

        } catch (error) {
            console.warn('⚠️ Dispose-Fehler:', error);
        }
    }

    /**
     * 🧹 Automatische Garbage Collection
     */
    setupGarbageCollection() {
        const interval = config.get('performance.garbageCollectInterval') || 30000;

        this.gcInterval = setInterval(() => {
            this.performGarbageCollection();
        }, interval);
    }

    clearGarbageCollection() {
        if (this.gcInterval) {
            clearInterval(this.gcInterval);
            this.gcInterval = null;
        }
    }

    performGarbageCollection() {
        if (!this.enabled) return;

        const before = this.cache.size;
        const threshold = Date.now() - (5 * 60 * 1000); // 5 Minuten alt

        for (const [url, entry] of this.cache) {
            if (entry.lastAccessed < threshold) {
                this.remove(url);
            }
        }

        const removed = before - this.cache.size;
        if (removed > 0) {
            console.log(`🧹 GC: ${removed} alte Ressourcen entfernt`);
        }
    }

    /**
     * 📊 Statistiken abrufen
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            memorySizeMB: Math.round(this.size / (1024 * 1024) * 100) / 100,
            maxSizeMB: Math.round(this.maxSize / (1024 * 1024) * 100) / 100,
            enabled: this.enabled
        };
    }

    /**
     * 🧹 Cache komplett leeren
     */
    clear() {
        for (const [url] of this.cache) {
            this.remove(url);
        }
        console.log('🧹 Resource Cache geleert');
    }

    /**
     * 📏 Bytes formatieren
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Globale Instanz
export const resourceManager = new ResourceManager();

// Browser-Console Tools
if (typeof window !== 'undefined' && config.get('debug.enableConsoleCommands')) {
    window.resourceManager = {
        enable: () => resourceManager.enable(),
        disable: () => resourceManager.disable(),
        stats: () => console.table(resourceManager.getStats()),
        clear: () => resourceManager.clear()
    };

    console.log('💾 ResourceManager-Commands: window.resourceManager.enable/disable/stats/clear');
}