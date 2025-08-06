// app.js

// 🔧 Imports
import * as utils from './js/utils.js';
import { initializeGroupsFromMeta } from './js/utils.js';
import { loadModels } from './js/modelLoader/index.js';
import { setupUI } from './js/ui/ui-init.js';
import { setupInteractions } from './js/interaction.js';
import {
  THREE,
  initThree,
  scene,
  camera,
  controls,
  renderer,
  loader
} from './js/init.js';
import { state } from './js/state.js';
import { setCameraToDefault } from './js/cameraUtils.js';
import { showLoadingBar, hideLoadingBar } from './js/modelLoader/progress.js';

console.log('📦 app.js geladen, basePath:', utils.basePath);

// 📁 Statische Assets (Sticker, Favicon)
function setupStaticAssets() {
  const basePath = utils.basePath || '';
  ['loading-sticker', 'go-sticker', 'live-loading-sticker'].forEach(id => {
    const img = document.getElementById(id);
    if (img) img.src = `${basePath}/images/${id}.png`;
  });

  const faviconLink = document.querySelector('link[rel="icon"]');
  if (faviconLink) faviconLink.href = `${basePath}/favicon.ico`;
}

// 🚀 Hauptstart der Anwendung
async function startApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const isDevMode = urlParams.get('dev') === '1';

  setupStaticAssets();

  const initialScreen = document.getElementById('initial-loading-screen');
  initialScreen.style.backgroundColor = state.defaultSettings.loadingScreenColor;
  initialScreen.style.display = 'flex';

  initThree();
  setupUI();
  setupInteractions();
  await initializeGroupsFromMeta();

  console.log('✅ Metadaten geladen:', Object.keys(state.groupedMeta).length, 'Gruppen');

  if (isDevMode) {
    console.log('🔧 Developer-Modus: Lade alle Gruppen...');
    for (const group of state.availableGroups) {
      const entries = state.groupedMeta[group] || [];
      if (entries.length) {
        console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${group}"...`);
        await loadModels(entries, group, true, scene, loader, camera, controls, renderer);
      }
    }
  } else {
    const group = 'bones';
    const entries = state.groupedMeta[group] || [];
    if (entries.length) {
      console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${group}"...`);
      await loadModels(entries, group, true, scene, loader, camera, controls, renderer);
    }
  }

  initialScreen.style.opacity = '0';
  setTimeout(() => initialScreen.style.display = 'none', 500);

  const splashScreen = document.getElementById('splash-screen');
  splashScreen.style.display = 'flex';
  splashScreen.classList.add('visible');
}

// 🎯 Splashscreen beenden
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

// 📦 Manuelles Nachladen weiterer Gruppen (z. B. Muskeln)
function setupDynamicGroupLoading() {
  document.getElementById('load-muscles-btn')?.addEventListener('click', async () => {
    try {
      const muscleEntries = state.groupedMeta['muscles'] || [];
      if (muscleEntries.length) {
        showLoadingBar();
        await loadModels(muscleEntries, 'muscles', true, scene, loader, camera, controls, renderer);
        hideLoadingBar();
      }
    } catch (err) {
      console.error('❌ Fehler beim Laden von "muscles":', err);
      hideLoadingBar();
    }
  });
}

// 🎬 Render-Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// 🔁 DOM fertig → Initialisierung
document.addEventListener('DOMContentLoaded', () => {
  console.log('▶️ DOM vollständig geladen – Starte App');
  setupSplashScreenExit();
  setupDynamicGroupLoading();
  startApp();
  animate();
});
