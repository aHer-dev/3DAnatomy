// app.js
import * as THREE from './js/three.module.js';
import * as utils from './js/utils.js';
import { loadModels } from './js/modelLoader.js';
import { setupUI } from './js/ui.js';
import { setupInteractions } from './js/interaction.js';
import { initThree, scene, camera, controls, renderer, loader } from './js/init.js';
import { state } from './js/state.js';

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

  await loadModels(bonesEntries, 'bones', true, scene, loader); // <- Übergib Szene und Loader

  // Dynamische Kamera-Anpassung nach Laden
  function fitCameraToSkeleton() {
    const box = new THREE.Box3();
    state.groups.bones.forEach(model => {
      box.expandByObject(model); // BoundingBox des gesamten Skeletts
    });

    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      camera.position.set(0, center.y, size * 0.75); // Frontal, Abstand 1.5x Größe
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
})();

