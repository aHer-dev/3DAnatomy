// js/bootstrap/initSplashScreen.js
// 🖼️ Initialisiert das Entfernen des Splashscreens bei Benutzerinteraktion

/**
 * Wartet auf Benutzerinteraktion und blendet dann den Splashscreen aus.
 */
export function initSplashScreenExit() {
    const splashScreen = document.getElementById('splash-screen');
    const liveSticker = document.getElementById('live-loading-sticker');

    if (!splashScreen || !liveSticker) {
        console.error('❌ Splashscreen-Elemente nicht gefunden.');
        return;
    }

    // Optional: Benutzer muss klicken, um App zu starten (z. B. Datenschutz/Audio)
    splashScreen.addEventListener('click', () => {
        splashScreen.classList.add('hidden');
        splashScreen.setAttribute('aria-hidden', 'true');
        console.log('👋 Splashscreen ausgeblendet');
    });

    console.log('🖼️ Splashscreen-Exit initialisiert');
}
