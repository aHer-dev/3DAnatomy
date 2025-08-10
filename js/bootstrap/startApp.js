// ============================================
// 8. AKTUALISIERTE STARTAPP - bootstrap/startApp.js
// ============================================
import { App } from '../core/app.js';
import { debug } from '../core/debug.js';

let appInstance = null;

export async function startApp() {
    if (appInstance) {
        console.warn('App bereits initialisiert');
        return appInstance;
    }

    const initialScreen = document.getElementById('initial-loading-screen');
    if (initialScreen) {
        initialScreen.style.display = 'flex';
    }

    try {
        debug.log('bootstrap', '🚀 Starte Anwendung...');

        appInstance = new App();
        await appInstance.init(); // wirft jetzt bei Fehler

        // Für Debugging verfügbar machen
        if (debug.enabled) {
            window.__app = appInstance;
            console.log('🐛 App-Instanz verfügbar unter window.__app');
        }

        debug.log('bootstrap', '✅ Anwendung erfolgreich gestartet');
        return appInstance;
    } catch (error) {
        console.error('❌ App-Start fehlgeschlagen:', error);
        if (appInstance && typeof appInstance.dispose === 'function') {
            appInstance.dispose();
        }
        appInstance = null;
        throw error; // <<< wichtig: an index.html zurück
    } finally {
        // Ladescreen fade-out nur, wenn init erfolgreich war (optional):
        if (initialScreen && appInstance) {
            initialScreen.style.opacity = '0';
            setTimeout(() => {
                initialScreen.style.display = 'none';
            }, 500);
        }
    }
}

export function getApp() {
    return appInstance;
}

export function resetApp() {
    if (appInstance) {
        return appInstance.reset();
    }
}

export function disposeApp() {
    if (appInstance) {
        appInstance.dispose();
        appInstance = null;
    }
}