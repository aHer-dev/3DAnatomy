import * as THREE from './js/three.module.js';
import { initThree, scene, camera, controls, renderer } from './js/init.js';
import * as state from './js/state.js';
import * as utils from './js/utils.js';
import { loadModels } from './js/modelLoader.js';
import { setupUI } from './js/ui.js';
import { setupInteractions } from './js/interaction.js';

async function main() {
  console.log('app.js geladen, basePath:', utils.basePath);

  initThree();
  console.log('UI wird initialisiert...');
  setupUI();

  console.log('Interaktionen werden initialisiert...');
  setupInteractions();

  try {
    console.log('Hole Metadaten...');
    const meta = await utils.getMeta();
    console.log('Metadaten geladen:', meta?.length);

    const bonesEntries = meta.filter(entry => entry.group === 'bones');
    console.log('Bones-Einträge:', bonesEntries.length);

    await loadModels(bonesEntries, 'bones', true);

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
  console.error('Fehler in der Hauptinitialisierung:', error?.message ?? error, error);
  alert('Fehler beim Starten der App. Prüfe die Konsole für Details.');
});
