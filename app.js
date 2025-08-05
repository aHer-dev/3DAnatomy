// app.js

// 🔧 Imports
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js';                  // Wird z. B. für Box3 benötigt
import * as utils from './js/utils.js';                         // getMeta(), basePath usw.
import { initializeGroupsFromMeta } from './js/utils.js';       // Gruppenstruktur aus Meta erzeugen
import { loadModels } from './js/modelLoader/index.js';         // Model-Ladefunktion
import { setupUI } from './js/ui/ui-init.js';                   // UI-Initialisierung
import { setupInteractions } from './js/interaction.js';        // UI-Interaktion
import { initThree, scene, camera, controls, renderer, loader } from './js/init.js'; // Three.js Setup
import { state } from './js/state.js';
import { setCameraToDefault } from './js/cameraUtils.js';

console.log('📦 app.js geladen, basePath:', utils.basePath);

//
// =========================
// 🔧 Statische Assets setzen (Sticker, Favicon, etc.)
// =========================
function setupStaticAssets() {
  const basePath = utils.basePath || '';

  ['loading-sticker', 'go-sticker', 'live-loading-sticker'].forEach(id => {
    const img = document.getElementById(id);
    if (img) img.src = `${basePath}/images/${id}.png`;
    else console.warn(`❌ Image-Element ${id} nicht gefunden`);
  });

  const faviconLink = document.getElementById('favicon-link');
  if (faviconLink) {
    faviconLink.href = `${basePath}/favicon.ico`;
  } else {
    console.warn('⚠️ Favicon-Link nicht gefunden');
  }
}

//
// =========================
// 🚀 Hauptstart der Anwendung
// =========================
async function startApp() {
  setupStaticAssets(); // Setzt Bilder und Icons für Ladeanzeigen

  // 🟪 Ladebildschirm anzeigen
  const initialScreen = document.getElementById('initial-loading-screen');
  initialScreen.style.backgroundColor = state.defaultSettings.loadingScreenColor;
  initialScreen.style.display = 'flex';

  // 🛠️ Three.js Grundstruktur vorbereiten (Szene, Kamera, Licht, Renderer)
  initThree();

  // 💡 Benutzeroberfläche und Events vorbereiten
  setupUI();
  setupInteractions();

  // 🧠 Gruppenstruktur aus Metadaten initialisieren (für state.availableGroups)
  await initializeGroupsFromMeta();
  //state.availableGroups = ['test']; // 🚨 Nur Gruppe "test" aktivieren

  // 📊 Metadaten laden
  const meta = await utils.getMeta();
  console.log('✅ Metadaten geladen:', meta.length);

  // 📦 Modelle gruppenweise laden
  for (const group of state.availableGroups) {
    const entries = meta.filter(entry => entry.group === group);
    if (entries.length === 0) continue;

    console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${group}"...`);
    await loadModels(entries, group, true, scene, loader, camera, controls, renderer);


  }


  // 🧼 Ladebildschirm ausblenden
  initialScreen.style.opacity = '0';
  setTimeout(() => initialScreen.style.display = 'none', 500);

  // 🎬 Splashscreen anzeigen
  const splashScreen = document.getElementById('splash-screen');
  splashScreen.style.display = 'flex';
  splashScreen.classList.add('visible');
}

//
// =========================
// 🎬 Render-Loop
// =========================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

//
// =========================
// 🎯 Interaktion: Splashscreen beenden
// =========================
function setupSplashScreenExit() {
  const goSticker = document.getElementById('go-sticker');
  const splashScreen = document.getElementById('splash-screen');
  const liveSticker = document.getElementById('live-loading-sticker');

  goSticker?.addEventListener('click', () => {
    splashScreen.style.opacity = '0';
    setTimeout(() => {
      splashScreen.style.display = 'none';
      if (liveSticker) liveSticker.style.display = 'none';
    }, 500);
  });
}

// Initialisierung starten
setupSplashScreenExit();
startApp();