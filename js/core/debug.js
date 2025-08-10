// ============================================
// 6. DEBUG MANAGER - core/debug.js
// ============================================
class DebugManager {
    constructor() {
        this.enabled = localStorage.getItem('debug') === 'true' ||
            new URLSearchParams(window.location.search).has('debug');
        this.categories = new Set();
    }

    log(category, ...args) {
        if (!this.enabled) return;

        this.categories.add(category);
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [${category.toUpperCase()}]`, ...args);
    }

    enable() {
        this.enabled = true;
        localStorage.setItem('debug', 'true');
        console.log('🐛 Debug-Modus aktiviert');
    }

    disable() {
        this.enabled = false;
        localStorage.removeItem('debug');
        console.log('🐛 Debug-Modus deaktiviert');
    }

    showStats(stateManager) {
        if (!this.enabled) return;

        const stats = {
            'Geladene Gruppen': Object.keys(stateManager._state.groups).filter(
                g => stateManager._state.groups[g].length > 0
            ).length,
            'Pickable Meshes': stateManager._state.pickableMeshes.size,
            'Meta-Einträge': stateManager._state.meta?.length || 0,
            'Sammlung': stateManager._state.collection.length,
            'Debug-Kategorien': Array.from(this.categories).join(', ')
        };

        if (performance.memory) {
            stats['Memory (MB)'] = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
        }

        console.table(stats);
    }

    exportErrorLog(errorManager) {
        if (!this.enabled) return;

        const data = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            errors: errorManager.getErrors(),
            categories: Array.from(this.categories)
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-log-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

export const debug = new DebugManager();