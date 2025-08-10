// ============================================
// js/core/config.js - Zentrale App-Konfiguration (crashsicher)
// ============================================

/**
 * 🎛️ HAUPT-KONFIGURATION
 * Alle Einstellungen an einem Ort - sicher änderbar ohne App-Crash
 */
export const CONFIG = {
    // 🚀 Performance-Einstellungen
    performance: {
        maxModelsInMemory: 200,        // Maximale Modelle gleichzeitig im Speicher
        batchSize: 5,                  // Modelle parallel laden (nicht zu hoch!)
        textureMaxSize: 2048,          // Maximale Textur-Größe (2K für Mobile)
        enableOctree: false,           // Spatial Partitioning (experimentell)
        enableLOD: false,              // Level of Detail (über RenderOptimizer)
        enableInstancing: false,       // Geometry Instancing (für identische Modelle)
        memoryLimit: 512 * 1024 * 1024, // 512MB Speicher-Limit
        garbageCollectInterval: 30000   // GC alle 30 Sekunden
    },

    // 📁 Pfad-Konfiguration  
    paths: {
        models: 'models',
        textures: 'textures',
        draco: 'draco',
        data: 'data',
        assets: 'assets'
    },

    // 📱 UI-Einstellungen
    ui: {
        mobileBreakpoint: 768,         // Pixel-Grenze für Mobile-Detection
        animationDuration: 300,        // Standard-Animation-Dauer (ms)
        debounceDelay: 150,           // Input-Debounce (ms)
        loadingBarThrottle: 50,       // Loading-Bar Update-Intervall (ms)
        tooltipDelay: 500             // Tooltip-Verzögerung (ms)
    },

    // 🔧 Debug & Development
    debug: {
        enabled: false,               // ← MASTER DEBUG SWITCH
        showStats: false,             // FPS/Memory Stats anzeigen
        logRaycast: false,           // Raycast-Events loggen
        showBoundingBoxes: false,    // Wireframe Bounding Boxes
        logModelLoading: true,       // Model-Load Events
        logPerformance: false,       // Performance-Warnings
        enableConsoleCommands: true  // window.app Debug-Commands
    },

    // 🎮 Interaktion
    interaction: {
        doubleClickDelay: 300,       // Doppelklick-Erkennung (ms)
        hoverDelay: 100,             // Hover-Delay (ms)
        enableTouch: true,           // Touch-Gesten aktivieren
        enableKeyboard: true,        // Keyboard-Shortcuts
        enableMouse: true            // Maus-Interaktion
    },

    // 🎨 Rendering
    rendering: {
        antialias: true,             // WebGL Antialiasing
        shadowMapSize: 2048,         // Shadow Map Auflösung
        pixelRatio: 'auto',          // 'auto', 1, 2, etc.
        toneMappingExposure: 1.0,    // HDR Tone Mapping
        enableShadows: false,        // Schatten (Performance-Impact!)
        backgroundAlpha: 1.0         // Background-Transparenz
    }
};

/**
 * 🛡️ SICHERE KONFIGURATION - verhindert Crashes
 */
export class SafeConfig {
    constructor(baseConfig = CONFIG) {
        this.config = this.deepClone(baseConfig);
        this.validators = new Map();
        this.changeListeners = new Set();

        this.setupValidators();
        console.log('🔧 SafeConfig initialisiert');
    }

    /**
     * Tiefe Kopie der Konfiguration (verhindert Referenz-Probleme)
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        const cloned = {};
        for (const key in obj) {
            cloned[key] = this.deepClone(obj[key]);
        }
        return cloned;
    }

    /**
     * Validatoren für kritische Werte
     */
    setupValidators() {
        this.validators.set('performance.batchSize', (value) => {
            if (typeof value !== 'number' || value < 1 || value > 20) {
                throw new Error('batchSize muss zwischen 1 und 20 liegen');
            }
        });

        this.validators.set('performance.maxModelsInMemory', (value) => {
            if (typeof value !== 'number' || value < 10 || value > 5000) {
                throw new Error('maxModelsInMemory muss zwischen 10 und 5000 liegen');
            }
        });

        this.validators.set('ui.mobileBreakpoint', (value) => {
            if (typeof value !== 'number' || value < 320 || value > 2048) {
                throw new Error('mobileBreakpoint muss zwischen 320 und 2048 liegen');
            }
        });
    }

    /**
     * Sicheres Setzen von Konfigurationswerten
     */
    set(path, value) {
        try {
            // Validator prüfen
            if (this.validators.has(path)) {
                this.validators.get(path)(value);
            }

            // Pfad aufteilen und setzen
            const keys = path.split('.');
            let current = this.config;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in current)) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }

            const oldValue = current[keys[keys.length - 1]];
            current[keys[keys.length - 1]] = value;

            // Change-Listener benachrichtigen
            this.notifyListeners(path, value, oldValue);

            console.log(`🔧 Config updated: ${path} = ${value}`);
            return true;

        } catch (error) {
            console.error(`❌ Config-Fehler bei ${path}:`, error.message);
            return false;
        }
    }

    /**
     * Sicheres Lesen von Konfigurationswerten
     */
    get(path) {
        try {
            const keys = path.split('.');
            let current = this.config;

            for (const key of keys) {
                if (current === null || current === undefined) {
                    return undefined;
                }
                current = current[key];
            }

            return current;
        } catch (error) {
            console.warn(`⚠️ Config-Zugriff fehlgeschlagen: ${path}`);
            return undefined;
        }
    }

    /**
     * Change-Listener registrieren
     */
    onChange(callback) {
        this.changeListeners.add(callback);
        return () => this.changeListeners.delete(callback); // Cleanup-Funktion
    }

    /**
     * Listener benachrichtigen
     */
    notifyListeners(path, newValue, oldValue) {
        for (const listener of this.changeListeners) {
            try {
                listener(path, newValue, oldValue);
            } catch (error) {
                console.error('❌ Config-Listener Fehler:', error);
            }
        }
    }

    /**
     * Komplette Konfiguration zurückgeben (schreibgeschützt)
     */
    getAll() {
        return this.deepClone(this.config);
    }

    /**
     * Konfiguration zurücksetzen
     */
    reset() {
        this.config = this.deepClone(CONFIG);
        console.log('🔄 Konfiguration zurückgesetzt');
    }

    /**
     * Debug-Ausgabe
     */
    debug() {
        console.group('🔧 SafeConfig Debug');
        console.log('Current Config:', this.config);
        console.log('Validators:', Array.from(this.validators.keys()));
        console.log('Listeners:', this.changeListeners.size);
        console.groupEnd();
    }
}

// Globale Instanz (Singleton)
export const config = new SafeConfig();

// Browser-Console Commands (falls Debug aktiviert)
if (typeof window !== 'undefined' && CONFIG.debug.enableConsoleCommands) {
    window.appConfig = {
        get: (path) => config.get(path),
        set: (path, value) => config.set(path, value),
        debug: () => config.debug(),
        reset: () => config.reset()
    };

    console.log('🎮 Config-Commands verfügbar: window.appConfig.get/set/debug/reset');
}

// Shortcut-Exports für häufig verwendete Werte
export const PERFORMANCE = () => config.get('performance');
export const DEBUG = () => config.get('debug');
export const UI = () => config.get('ui');
export const PATHS = () => config.get('paths');