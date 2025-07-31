// app.js

import * as THREE from './js/three.module.js';
import * as utils from './js/utils.js';
import { loadModels } from './js/modelLoader.js';
import { setupUI } from './js/ui.js';
import { setupInteractions } from './js/interaction.js';
import { initThree, scene, camera, controls, renderer, loader } from './js/init.js';
import { state } from './js/state.js';

console.log('app.js geladen, basePath:', utils.basePath);

// Dynamische Imports (setze src mit basePath)
const basePath = utils.basePath || ''; // Fallback, falls utils undefiniert

// Setze src für Sticker
const stickerIds = ['loading-sticker', 'go-sticker'];
stickerIds.forEach(id => {
  const img = document.getElementById(id);
  if (img) {
    img.src = basePath + '/images/' + id + '.png'; // Dynamisch: id + '.png' für Einfachheit
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
initialScreen.style.backgroundColor = state.loadingScreenColor;
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

  // Dynamische Kamera-Anpassung nach Laden
  function fitCameraToSkeleton() {
    const box = new THREE.Box3();
    state.groups.bones.forEach(model => {
      box.expandByObject(model); // BoundingBox des gesamten Skeletts
    });

    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      camera.position.set(0, center.y, size * 0.75); // Frontal, Abstand 0.75x Größe
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();
      renderer.render(scene, camera); // Sofort rendern
      console.log('Kamera auf Skelett gefittet:', camera.position);
    } else {
      console.warn('Kein Skelett geladen – Kamera nicht angepasst.');
    }
  }

  fitCameraToSkeleton(); // Aufruf nach Bones-Laden

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