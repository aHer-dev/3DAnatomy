// ui-room.js
// 🌌 Ermöglicht dem Nutzer, die Hintergrundfarbe und -helligkeit der 3D-Szene live zu verändern

import { THREE, scene, renderer, camera } from '../init.js';

/**
 * Initialisiert die UI-Elemente zur Anpassung der Raumfarbe und Helligkeit.
 * Ändert live den Scene-Background anhand des Farbwerts + Brightness.
 */
export function setupRoomUI() {
  // 🔍 HTML-Elemente referenzieren
  const colorPicker = document.getElementById('room-color');              // Farbwahl-Element (#RRGGBB)
  const brightnessSlider = document.getElementById('room-brightness');    // Helligkeit (Range 0–1)
  const roomContent = document.getElementById('room-dropdown-content');   // UI-Container

  // ❌ Abbruch, falls Elemente nicht gefunden werden
  if (!colorPicker || !brightnessSlider || !roomContent) {
    console.warn('⚠️ ui-room: Farb-/Helligkeitselemente fehlen.');
    return;
  }

  /**
   * 🔄 Aktualisiert die Hintergrundfarbe der Szene.
   * Kombiniert die gewählte Farbe mit der eingestellten Helligkeit via HSL-Korrektur.
   */
  function updateRoomColor() {
    const baseColor = new THREE.Color(colorPicker.value);       // Basisfarbe aus Farbwähler
    const brightness = parseFloat(brightnessSlider.value);      // Helligkeit als Zahl (0.0–1.0)

    // 🎨 Umrechnen in HSL, Helligkeit anpassen
    const hsl = baseColor.getHSL({ h: 0, s: 0, l: 0 });
    hsl.l = Math.max(0, Math.min(1, hsl.l + (brightness - 0.5))); // l = Lichtanteil (zwischen 0 und 1)
    baseColor.setHSL(hsl.h, hsl.s, hsl.l);                      // Zurück in RGB wandeln

    // 🌌 Szene-Hintergrundfarbe setzen und neu rendern
    scene.background = baseColor;
    renderer.render(scene, camera);
  }

  // 📌 Event-Listener verbinden Eingabefelder mit Updatefunktion
  colorPicker.addEventListener('input', updateRoomColor);
  brightnessSlider.addEventListener('input', updateRoomColor);

  // 🟢 Erfolgsmeldung
  console.log('🌌 ui-room initialisiert.');
}
