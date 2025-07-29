// app.js
import { initThree, scene, camera, controls } from './js/init.js';
import * as state from './js/state.js';
import * as utils from './js/utils.js';
import { loadModels } from './js/modelLoader.js';
import { setupUI } from './js/ui.js';
import { setupInteractions } from './js/interaction.js';
import * as THREE from './three.module.js';

async function main() {
  console.log('app.js geladen, basePath:', utils.basePath);

  // 1. Initialisiere Three.js
  initThree();

  // 2. Initialisiere UI-Elemente
  setupUI();

  // 3. Initialisiere Interaktionen
  setupInteractions();

  // 4. Lade initial die Bones-Gruppe
  try {
    const meta = await utils.getMeta();
    const bonesEntries = meta.filter(entry => entry.group === 'bones');
    await loadModels(bonesEntries, 'bones', true);

    // Kameraposition anpassen
    setTimeout(() => {
      const box = new THREE.Box3().setFromObject(scene);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = box.getSize(new THREE.Vector3()).length();
      const distance = size * 1;
      camera.position.set(center.x, center.y, center.z + distance);
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();
      console.log('Kamera auf Zentrum ausgerichtet:', center);
    }, 100);
  } catch (error) {
    console.error('Fehler beim initialen Laden der Bones-Gruppe:', error);
    alert('Fehler beim Laden der Bones-Gruppe. Prüfe die Dateistruktur.');
  }
}

main().catch(error => {
  console.error('Fehler in der Hauptinitialisierung:', error);
  alert('Fehler beim Starten der App. Prüfe die Konsole für Details.');
});