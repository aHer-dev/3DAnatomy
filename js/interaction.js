// js/interaction.js
import { scene, camera } from './init.js';
import { modelNames, currentlySelected } from './state.js';
import { getMeta } from './utils.js';

export function setupInteractions() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      const selectedModel = clickedObject.parent;
      const modelLabel = modelNames.get(selectedModel);

      if (modelLabel) {
        getMeta().then(meta => {
          const entry = meta.find(e => e.label === modelLabel);
          if (entry) {
            showInfoPanel(entry);
            highlightObject(clickedObject);
          }
        });
      }
    } else {
      hideInfoPanel();
    }
  });
}

function showInfoPanel(meta) {
  const infoContent = document.getElementById('info-content');
  infoContent.innerHTML = `
    <p><strong>Label:</strong> ${meta.label}</p>
    ${meta.fma ? `<p><strong>FMA-ID:</strong> ${meta.fma}</p>` : ''}
    ${meta.group ? `<p><strong>Gruppe:</strong> ${meta.group}</p>` : ''}
    ${meta.subgroup && meta.subgroup !== 'none' ? `<p><strong>Subgruppe:</strong> ${meta.subgroup}</p>` : ''}
    ${meta.side && meta.side !== 'none' ? `<p><strong>Seite:</strong> ${meta.side}</p>` : ''}
    ${meta.info?.origin ? `<p><strong>Ursprung:</strong> ${meta.info.origin}</p>` : ''}
    ${meta.info?.insertion ? `<p><strong>Ansatz:</strong> ${meta.info.insertion}</p>` : ''}
    ${meta.info?.function ? `<p><strong>Funktion:</strong> ${meta.info.function}</p>` : ''}
  `;
  document.getElementById('info-panel').classList.add('visible');
}

function hideInfoPanel() {
  const infoPanel = document.getElementById('info-panel');
  infoPanel.classList.remove('visible');
  document.getElementById('info-content').innerHTML = '';
  if (currentlySelected?.material?.emissive) {
    currentlySelected.material.emissive.setHex(0x000000);
  }
  currentlySelected = null;
}

function highlightObject(object) {
  if (currentlySelected) {
    currentlySelected.material.emissive?.setHex(0x000000);
  }
  if (object.material.emissive) {
    object.material.emissive.setHex(0x222222);
  }
  currentlySelected = object;
}