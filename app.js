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
  setupStaticAssets();
  const initialScreen = document.getElementById('initial-loading-screen');
  initialScreen.style.backgroundColor = state.defaultSettings.loadingScreenColor;
  initialScreen.style.display = 'flex';

  initThree();
  setupUI();
  setupInteractions();
  await initializeGroupsFromMeta();
  console.log('✅ Metadaten geladen:', Object.keys(state.groupedMeta).length, 'Gruppen');

  // Nur 'bones' zunächst laden
  const group = 'bones';
  const entries = state.groupedMeta[group] || [];
  if (entries.length) {
    console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${group}"...`);
    await loadModels(entries, group, true, scene, loader, camera, controls, renderer);
  }

  initialScreen.style.opacity = '0';
  setTimeout(() => initialScreen.style.display = 'none', 500);

  const splashScreen = document.getElementById('splash-screen');
  splashScreen.style.display = 'flex';
  splashScreen.classList.add('visible');

  // Event-Listener für weitere Gruppen
  document.getElementById('load-muscles-btn')?.addEventListener('click', async () => {
    try {
      const muscleEntries = state.groupedMeta['muscles'] || [];
      if (muscleEntries.length) {
        showLoadingBar();
        await loadModels(muscleEntries, 'muscles', true, scene, loader, camera, controls, renderer);
        hideLoadingBar(); // Sicherstellen, dass Ladebalken ausgeblendet wird
      }
    } catch (err) {
      console.error('Fehler beim Laden von muscles:', err);
      hideLoadingBar();
    }
  });
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
console.log('▶️ Starte App')
startApp();