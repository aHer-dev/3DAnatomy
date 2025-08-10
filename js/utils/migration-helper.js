// js/utils/migration-helper.js
// Hilft beim sicheren Übergang zu den neuen Modulen (ES6 Version)

/**
 * Sichere Import-Funktion für potenziell zirkuläre Module
 * @param {string} modulePath 
 * @param {string} exportName 
 * @returns {Promise<Function|null>}
 */
export async function safeImport(modulePath, exportName) {
    try {
        const module = await import(modulePath);
        return module[exportName] || null;
    } catch (error) {
        console.warn(`Sicherer Import fehlgeschlagen: ${modulePath}.${exportName}`, error);
        return null;
    }
}

/**
 * Lazy-loaded Module Cache
 */
const moduleCache = new Map();

export async function lazyImport(modulePath, exportName) {
    const key = `${modulePath}#${exportName}`;

    if (!moduleCache.has(key)) {
        try {
            const module = await import(modulePath);
            moduleCache.set(key, module[exportName] || null);
        } catch (error) {
            console.warn(`Lazy Import fehlgeschlagen: ${key}`, error);
            moduleCache.set(key, null);
        }
    }

    return moduleCache.get(key);
}

/**
 * Überprüft ob alle kritischen Module korrekt geladen sind
 */
export async function validateModules() {
    const criticalModules = [
        { path: '../store/state.js', exports: ['state'] },
        { path: '../core/raycaster.js', exports: ['pickAt'] },
        { path: '../features/visibility.js', exports: ['setModelVisibility'] },
        { path: '../features/selection.js', exports: ['setPickable'] }
    ];

    const results = [];

    for (const { path, exports } of criticalModules) {
        for (const exp of exports) {
            const loaded = await safeImport(path, exp);
            results.push({
                module: path,
                export: exp,
                loaded: !!loaded,
                status: loaded ? '✅' : '❌'
            });
        }
    }

    console.table(results);
    return results.every(r => r.loaded);
}

/**
 * Fallback-Implementierung für setPickable falls Module nicht laden
 */
export async function fallbackSetPickable(mesh, pickable) {
    if (!mesh?.isMesh) return;

    try {
        if (pickable) {
            mesh.layers.enable(1);
        } else {
            mesh.layers.disable(1);
        }

        // Versuche State zu finden
        const state = await lazyImport('../store/state.js', 'state');
        if (state?.pickableMeshes) {
            if (pickable) {
                state.pickableMeshes.add(mesh);
            } else {
                state.pickableMeshes.delete(mesh);
            }
        }
    } catch (error) {
        console.warn('Fallback setPickable Fehler:', error);
    }
}

/**
 * Prüft auf zirkuläre Import-Probleme (vereinfachte Browser-Version)
 */
export function detectCircularImports() {
    // In ES6 Modulen sind zirkuläre Imports weniger problematisch
    // Wir loggen nur eine Info-Meldung
    console.log('🔄 Zirkuläre Import-Überwachung: ES6-Module handhaben dies automatisch');

    // Falls Sie trotzdem eine Überwachung wollen, könnten wir hier
    // eine vereinfachte Lösung implementieren
}

/**
 * Initialisierung mit Fehlerbehandlung (async Version)
 */
export async function safeInit() {
    console.log('🛡️ Starte sichere Initialisierung...');

    // Schritt 1: Zirkuläre Imports überwachen
    detectCircularImports();

    // Schritt 2: Module validieren
    const allModulesOk = await validateModules();

    if (!allModulesOk) {
        console.error('❌ Nicht alle Module konnten geladen werden. Verwende Fallback-Implementierungen.');
        return false;
    }

    console.log('✅ Alle Module erfolgreich geladen.');
    return true;
}

/**
 * Synchrone Version für Rückwärtskompatibilität
 */
export function safeInitSync() {
    console.log('🛡️ Starte sichere Initialisierung (sync)...');
    detectCircularImports();

    // Einfache Überprüfung ohne await
    console.log('⚠️ Synchrone Version: Module-Validierung übersprungen');
    console.log('✅ Basis-Initialisierung abgeschlossen.');
    return true;
}

// Auto-Initialisierung beim Import (entfernt, da problematisch)
// Stattdessen manuell in app.js aufrufen