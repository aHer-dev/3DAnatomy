// app.js

import * as THREE from './js/three.module.js';
import * as utils from './js/utils.js';
import { loadModels } from './js/modelLoader.js';
import { setupUI } from './js/ui.js';
import { setupInteractions } from './js/interaction.js';
import { initThree, scene, camera, controls, renderer, loader } from './js/init.js';
import { state } from './js/state.js';
import { fitCameraToModels } from './js/cameraUtils.js';

console.log('app.js geladen, basePath:', utils.basePath);

// Dynamische Imports (setze src mit basePath)
const basePath = utils.basePath || ''; // Fallback, falls utils undefiniert

// Setze src für Sticker
const stickerIds = ['loading-sticker', 'go-sticker', 'live-loading-sticker'];
stickerIds.forEach(id => {
  const img = document.getElementById(id);
  if (img) {
    img.src = basePath + '/images/' + id + '.png';
  } else {
    console.error(`Image-Element ${id} nicht gefunden!`);
  }
});

// Optional: Für favicon (füge <link rel="icon" id="favicon-link" href=""> in HTML <head>)
const faviconLink = document.getElementById('favicon-link');
if (faviconLink) {
  faviconLink.href = basePath + '/favicon.ico';
} else {
  console.warn('Favicon-Link nicht gefunden – ignoriere.');
}


// Lade- und Splash-Screen Elemente
const initialScreen = document.getElementById('initial-loading-screen');
const splashScreen = document.getElementById('splash-screen');
const goSticker = document.getElementById('go-sticker');

// Initial: Ladebildschirm anzeigen (mit Hintergrund, Modell unsichtbar – Szene rendert noch nicht voll)
initialScreen.style.backgroundColor = state.defaultSettings.loadingScreenColor;
initialScreen.style.display = 'flex';

// UI & Interaktionen vorbereiten (vor Laden, um UI bereit zu haben)
console.log('UI wird initialisiert...');
setupUI();

console.log('Interaktionen werden initialisiert...');
setupInteractions();

// Render-Loop starten (aber initial rendert er nur den leeren Raum, bis Modelle geladen)
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// App initialisieren und Modelle laden (in einem async-Block)
(async () => {
  initThree();

  console.log('Hole Metadaten...');
  const meta = await utils.getMeta();
  console.log('Metadaten geladen:', meta.length);

  const bonesEntries = meta.filter(entry => entry.group === 'bones');
  console.log('Bones-Einträge:', bonesEntries.length);

  console.log('Skelett wird geladen...');
  if (bonesEntries.length > 0) {
    await loadModels(bonesEntries, 'bones', true, scene, loader);
    console.log('Skelett geladen.');
  }

  fitCameraToModels(camera, controls, state.groups.bones, renderer, scene);


  // Ladebildschirm ausblenden (Fade-Out), Modell wird sichtbar
  initialScreen.style.opacity = '0';
  setTimeout(() => initialScreen.style.display = 'none', 500);

  // Splash-Screen einblenden (GO-Sticker wartet auf Klick)
  splashScreen.style.display = 'flex'; // Neu: Setze display explizit, um Sichtbarkeit zu erzwingen
  splashScreen.classList.add('visible');
})();

// Splash-Screen Klick → ausblenden, alle Sticker weg, App startet (Modell sichtbar, UI aktiv)
goSticker?.addEventListener('click', () => {
  splashScreen.style.opacity = '0';
  setTimeout(() => {
    splashScreen.style.display = 'none';
    // Sicherstellen, dass Live-Sticker auch weg ist (Fallback)
    document.getElementById('live-loading-sticker').style.display = 'none';
  }, 500);
});