// ui-music.js
// 🎵 Steuert Hintergrundmusik und die Anzeige eines Lizenzfensters

/**
 * Initialisiert die Musiksteuerung und das Lizenzfenster in der Benutzeroberfläche.
 * Bindet Klick-Events für Play/Pause und Lizenzanzeige.
 */
export function setupMusicUI() {
  // 🔍 Referenzen auf relevante DOM-Elemente holen
  const audio = document.getElementById('background-music');     // <audio>-Element für Hintergrundmusik
  const toggleBtn = document.getElementById('toggle-music');     // Button zum An-/Ausschalten der Musik
  const licenseBtn = document.getElementById('show-license');    // Button zum Anzeigen der Lizenz
  const licenseBox = document.getElementById('license-box');     // Element, in dem Lizenztext angezeigt wird

  // ❌ Falls eines der Elemente fehlt, gib Warnung aus und brich ab
  if (!audio || !toggleBtn || !licenseBox || !licenseBtn) {
    console.warn('⚠️ Musik/Lizenz-UI: Elemente fehlen.');
    return;
  }

  // 🎵 Musikumschalter (Play / Pause)
  toggleBtn.addEventListener('click', () => {
    if (audio.paused) {
      // ▶️ Musik starten
      audio.volume = 0.4;           // Lautstärke moderat setzen
      audio.loop = true;            // Endlosschleife aktivieren
      audio.play();                 // Musik abspielen
      toggleBtn.textContent = '🔇'; // Button-Text zu „Mute“-Symbol ändern
    } else {
      // ⏸️ Musik pausieren
      audio.pause();
      toggleBtn.textContent = '🔊'; // Button-Text zu „Lautsprecher“-Symbol ändern
    }
  });

  // 📜 Lizenzanzeige ein-/ausblenden
  licenseBtn.addEventListener('click', () => {
    licenseBox.classList.toggle('visible'); // CSS-Klasse „visible“ toggeln
  });

  // 🟢 Erfolgsmeldung in der Konsole
  console.log('🎵 Musik & Lizenzsteuerung aktiviert.');
}
