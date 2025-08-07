// 🔧 Imports
import { scene } from './js/scene.js';
import { camera } from './js/camera.js';
import { renderer } from './js/renderer.js';
import { controls } from './js/controls.js';
import * as utils from './js/utils.js';
import { initializeGroupsFromMeta } from './js/utils.js';
import { loadModels } from './js/modelLoader/index.js';
import { setupUI } from './js/ui/ui-init.js';
import { setupInteractions } from './js/interaction.js';
import { state } from './js/state.js';
import { setCameraToDefault } from './js/cameraUtils.js';
import { showLoadingBar, hideLoadingBar } from './js/modelLoader/progress.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { dracoLoader } from './js/modelLoader/dracoLoader.js'; // Neu: Zentraler Draco-Loader
import { lightFront, lightBack, lightTop, ambientLight } from './js/lights.js';

console.log('📦 app.js geladen, basePath:', utils.basePath);

// 📁 Statische Assets (Sticker, Favicon) – Für UX-Loading-Bilder
function setupStaticAssets() {
  const basePath = utils.basePath || '';
  ['loading-sticker', 'live-loading-sticker'].forEach(id => {
    const img = document.getElementById(id);
    if (img) img.src = `${basePath}/images/${id}.png`;
  });

  const faviconLink = document.querySelector('link[rel="icon"]');
  if (faviconLink) faviconLink.href = `${basePath}/favicon.ico`;
}

// 🚀 Hauptstart der Anwendung – Asynchron für Laden-Warten
async function startApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const isDevMode = urlParams.get('dev') === '1';

  setupStaticAssets();

  const initialScreen = document.getElementById('initial-loading-screen');
  if (!initialScreen) {
    console.error('❌ Initial-Loading-Screen nicht gefunden');
    return;
  }
  initialScreen.style.backgroundColor = state.defaultSettings.loadingScreenColor;
  initialScreen.style.display = 'flex';

  setupUI();
  setupInteractions();
  await initializeGroupsFromMeta();

  console.log('✅ Metadaten geladen:', Object.keys(state.groupedMeta).length, 'Gruppen');

  // Erstelle Loader mit zentralem Draco
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  try {
    if (isDevMode) {
      console.log('🔧 Developer-Modus: Lade alle Gruppen...');
      for (const group of state.availableGroups) {
        const entries = state.groupedMeta[group] || [];
        if (entries.length) {
          showLoadingBar();
          console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${group}"...`);
          await loadModels(entries, group, true, scene, loader, camera, controls, renderer);
          hideLoadingBar();
        }
      }
    } else {
      const group = 'bones';
      const entries = state.groupedMeta[group] || [];
      if (entries.length) {
        showLoadingBar();
        console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${group}"...`);
        await loadModels(entries, group, true, scene, loader, camera, controls, renderer);
        hideLoadingBar();
      }
    }
  } catch (err) {
    console.error('❌ Fehler beim Modell-Laden:', err);
    hideLoadingBar();
  }

  // Verstecke Initial-Screen mit Fade-Out (UX: Sanft)
  initialScreen.style.opacity = '0';
  setTimeout(() => initialScreen.style.display = 'none', 500);

  // UX: Zentrierte Startansicht
  setCameraToDefault(camera, controls);

  // Lichtquellen initialisieren
  window.addEventListener('resize', () => {
    const container = document.getElementById('container');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  // Starte Render-Loop
  animate();
}

// 🎯 Splashscreen beenden – UX: Klick zum Start
function setupSplashScreenExit() {

  const splashScreen = document.getElementById('splash-screen');
  const liveSticker = document.getElementById('live-loading-sticker');

  if (!splashScreen) {
    console.error('❌ Splash-Screen nicht gefunden');
    return;
  }
}

// 📦 Manuelles Nachladen weiterer Gruppen (z. B. Muskeln) – Skalierbar
function setupDynamicGroupLoading() {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  const musclesBtn = document.getElementById('btn-load-muscles'); // War 'load-muscles-btn'
  if (!musclesBtn) {
    console.warn('⚠️ Load-Muscles-Button nicht gefunden');
    return;
  }
  musclesBtn.addEventListener('click', async () => {

    try {
      const muscleEntries = state.groupedMeta['muscles'] || [];
      if (muscleEntries.length) {
        showLoadingBar();
        await loadModels(muscleEntries, 'muscles', true, scene, loader, camera, controls, renderer);
        hideLoadingBar();
      } else {
        console.warn('⚠️ Keine Muskel-Modelle in groupedMeta gefunden');
      }
    } catch (err) {
      console.error('❌ Fehler beim Laden von "muscles":', err);
      hideLoadingBar();
    }
  });
}

// 🎬 Render-Loop – Für flüssige 3D (OrbitControls + Render)
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
});