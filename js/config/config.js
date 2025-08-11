//  ! BUG - AKTIVIERUNG BEINFLUST CANVAS
// SCHRITT 1: config.js (Zentrale Konfiguration)
// Erstellen Sie: js/config/config.js
// ============================================

/**
 * SOLO-ENTWICKLER KONFIGURATION
 * Ein zentraler Ort für alle Einstellungen
 * WICHTIG: Alle Features sind standardmäßig AUS!
 */
export const APP_CONFIG = {
    // ===================
    // ENTWICKLUNGSMODUS
    // ===================
    development: {
        enabled: false,              // Debug-Features verfügbar machen
        verbose: false,             // Ausführliche Logs
        showWarnings: true          // Warnungen anzeigen
    },

    // ===================
    // FEATURE-SCHALTER (ALLE AUS!)
    // ===================
    features: {
        // 8.1 Zentrale Konfiguration ✅ (diese Datei)
        centralConfig: true,

        // 8.2 Resource Manager
        resourceManager: false,      // ← HIER: true zum Aktivieren
        resourceManagerConfig: {
            enabled: false,           // Doppelte Sicherheit
            maxMemoryMB: 100,         // 100MB Speicherlimit
            autoCleanup: true,        // Automatisches Aufräumen
            debugLogs: false          // Memory-Logs
        },

        // 8.3 Performance Monitor  
        performanceMonitor: false,   // ← HIER: true zum Aktivieren
        performanceConfig: {
            enabled: true,           // Doppelte Sicherheit
            showFPS: true,            // FPS-Anzeige
            showMemory: true,         // Memory-Anzeige
            autoWarnings: true,       // Performance-Warnungen
            position: 'bottom-right'      // Position der Stats
        },

        // Bestehende Features (Ihre aktuellen)
        renderOptimization: false,   // Ihr bestehendes Feature
        debugControls: true         // Konsole-Commands (sicher)
    },

    // ===================
    // PFAD-KONFIGURATION (aus Ihrer path.js)
    // ===================
    paths: {
        models: 'models',
        textures: 'textures',
        draco: 'draco',
        data: 'data',
        assets: 'assets'
    },

    // ===================
    // PERFORMANCE-EINSTELLUNGEN
    // ===================
    performance: {
        // Model Loading (aus Ihrem bestehenden Code)
        batchSize: 2,              // Parallel geladene Modelle
        maxModelsInMemory: 50,     // Memory-Limit für Modelle

        // Rendering
        maxFPS: 60,               // FPS-Limit
        adaptiveQuality: false,    // Qualität an Performance anpassen

        // Memory Management
        memoryWarningThreshold: 80,  // % vor Warnung
        autoGarbageCollection: false // Automatisches Cleanup
    },

    // ===================
    // UI-EINSTELLUNGEN  
    // ===================
    ui: {
        mobileBreakpoint: 768,
        animationDuration: 300,
        debounceDelay: 150,

        // Loading
        showLoadingBar: true,
        splashScreenDelay: 500,

        // Debug UI
        showDebugPanel: false,      // Debug-Panel anzeigen
debugPanelPosition: 'bottom-right',
    

        // 🔵 THEME: globale Farben für Szene & Splash
        theme: {
            background: '#0B1020', // ← Szenen-Hintergrund (THREE.Scene.background)
            loadingScreen: '#0B1020' // ← Farbe des Splash/Loading-Screens
        },

    // Standard-Kamera-Ausrichtung (Start & Reset)
        cameraDefaults: {
            // Position der Kamera [x, y, z] in Weltkoordinaten
            position: [-0.5, 1.3 , 1.3],
            // Zielpunkt (OrbitControls.target), typ. Körpermitte
            target: [0.0, 0.9, 0.0]
        },

    // Default-Farben pro anatomischer Gruppe (Hex ohne # als Number)
    // alles optional – fehlende Gruppen fallen auf default zurück
        colors: {
            default: 0xCCCCCC, // generischer Fallback
            bones: 0xE8E6DD, // leicht warmes Knochenweiß
            teeth: 0xFFFFFF,  // klinisch weiß
            muscles: 0xFF7F7F, 
            nerves: 0xFFD166, 
            //... beliebig erweiterbar
        }


},
};

/**
 * SICHERE CONFIG-FUNKTION
 * Holt Werte mit Fallbacks - kann niemals crashen
 */
export function getConfig(path, fallback = null) {
    try {
        // Pfad wie "features.resourceManager" aufteilen
        const keys = path.split('.');
        let value = APP_CONFIG;

        // Durch verschachtelte Objekte navigieren
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                console.warn(`⚠️ Config "${path}" nicht gefunden, verwende Fallback:`, fallback);
                return fallback;
            }
        }

        return value;
    } catch (error) {
        console.warn(`⚠️ Config-Fehler bei "${path}":`, error);
        return fallback;
    }
}

/**
 * CONFIG ÜBERSCHREIBEN (für Tests/Debugging)
 * Sicher - kann bestehende Struktur nicht brechen
 */
export function setConfig(path, value) {
    try {
        const keys = path.split('.');
        let target = APP_CONFIG;

        // Bis zum vorletzten Key navigieren
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in target) || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }

        // Wert setzen
        const finalKey = keys[keys.length - 1];
        target[finalKey] = value;

        console.log(`📝 Config "${path}" geändert zu:`, value);
        return true;
    } catch (error) {
        console.error(`❌ Config-Fehler bei "${path}":`, error);
        return false;
    }
}

/**
 * FEATURE-STATUS PRÜFEN (Doppelte Sicherheit)
 * Prüft sowohl den Hauptschalter als auch den Feature-eigenen Schalter
 */
export function isFeatureEnabled(featureName) {
    try {
        // Haupt-Feature-Schalter
        const mainSwitch = getConfig(`features.${featureName}`, false);

        // Feature-eigene Konfiguration (falls vorhanden)
        const featureConfig = getConfig(`features.${featureName}Config.enabled`, true);

        // Beide müssen true sein
        const enabled = mainSwitch && featureConfig;

        if (getConfig('development.verbose', false)) {
            console.log(`🎛️ Feature "${featureName}": main=${mainSwitch}, config=${featureConfig}, result=${enabled}`);
        }

        return enabled;
    } catch (error) {
        console.warn(`⚠️ Feature-Check Fehler für "${featureName}":`, error);
        return false;
    }
}

/**
 * DEVELOPMENT-HELPERS (nur wenn Development-Modus an)
 */
export function getDevHelpers() {
    if (!getConfig('development.enabled', false)) {
        return null;
    }

    return {
        // Config anzeigen
        showConfig: () => console.table(APP_CONFIG),

        // Feature aktivieren/deaktivieren
        enableFeature: (name) => setConfig(`features.${name}`, true),
        disableFeature: (name) => setConfig(`features.${name}`, false),

        // Performance-Info
        getPerformanceConfig: () => getConfig('performance', {}),

        // Alle aktiven Features anzeigen
        listActiveFeatures: () => {
            const features = getConfig('features', {});
            const active = Object.entries(features)
                .filter(([key, value]) => value === true && !key.endsWith('Config'))
                .map(([key]) => key);
            console.log('🎯 Aktive Features:', active);
            return active;
        }
    };
}





// ===================
// EXPORT FÜR EXTERNE NUTZUNG
// ===================

// Haupt-Config-Objekt (read-only für externe)
export default APP_CONFIG;

// Häufig verwendete Konfigurationen als direkte Exports
export const PATHS = APP_CONFIG.paths;
export const PERFORMANCE = APP_CONFIG.performance;
export const UI_CONFIG = APP_CONFIG.ui;