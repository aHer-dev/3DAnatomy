// app.js
import * as utils from './js/utils.js';
import { loadModels } from './js/modelLoader.js';
import { setupUI } from './js/ui.js';
import { setupInteractions } from './js/interaction.js';
import { initThree, scene, camera, controls, renderer, loader } from './js/init.js';

console.log('app.js geladen, basePath:', utils.basePath);

initThree();

console.log('UI wird initialisiert...');
setupUI();
//document.getElementById('controls').style.display = 'block'; // Für Testing; entferne für Prod der macht  essichtbar 

console.log('Interaktionen werden initialisiert...');
setupInteractions();

// Render-Loop starten
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Modelle laden
(async () => {
  console.log('Hole Metadaten...');
  const meta = await utils.getMeta();
  console.log('Metadaten geladen:', meta.length);

  const bonesEntries = meta.filter(entry => entry.group === 'bones');
  console.log('Bones-Einträge:', bonesEntries.length);

  await loadModels(bonesEntries, 'bones', true, scene, loader); // <- Übergib Szene und Loader, falls nötig
})();

