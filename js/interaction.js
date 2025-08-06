import { THREE } from './init.js';
import { scene, camera, renderer } from './init.js';
// Kamera-Utilities (zentriert alle Modelle, setzt Standard-Position)
import { setCameraToDefault, fitCameraToScene } from './cameraUtils.js';
import { state } from './state.js';
import { getMeta } from './utils.js';

export function setupInteractions() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Initial closed (Panel nicht sichtbar)
  const controls = document.getElementById('controls');
  if (controls) {
    controls.style.display = 'none';
    console.log('Panel initial closed gesetzt');
  }

  // Click-Event auf Canvas für Model-Selection
  renderer.domElement.addEventListener('click', onClick, false);

  async function onClick(event) {
    event.preventDefault();
    console.log('Klick erkannt – Starte Raycaster...');

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    console.log('Intersects gefunden:', intersects.length); // Sollte >0 sein, wenn Modell getroffen

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      console.log('Getroffenes Objekt:', selectedObject.name || selectedObject.type);

      let model = selectedObject;
      while (model && !state.modelNames.has(model)) {
        model = model.parent;
      }
      console.log('Gefundenes Parent-Model:', model ? 'Ja' : 'Nein');

      if (model && state.modelNames.has(model)) {
        const label = state.modelNames.get(model);
        console.log('Modell-Label:', label);

        try {
          const meta = (await getMeta()).find(entry => entry.label === label);
          console.log('Meta gefunden:', meta ? 'Ja' : 'Nein');

          if (meta) {
            console.log('Rufe highlightObject auf...');
            highlightObject(model);
            console.log('Rufe showInfoPanel auf...');
            showInfoPanel(meta, model);
          } else {
            console.log('Kein Meta – Panel nicht gezeigt');
          }
        } catch (error) {
          console.error('Fehler bei Meta-Suche:', error);
        }
      } else {
        console.log('Kein valides Modell – Panel nicht gezeigt');
      }
    } else {
      //console.log('Kein Intersect – Klick auf Hintergrund? Panel nicht gezeigt');
    }
  }
}

function showInfoPanel(meta, selectedModel) {
  console.log('showInfoPanel gestartet mit Meta:', meta.label, 'und Model:', selectedModel);

  const infoContent = document.getElementById('info-content');
  if (!infoContent) {
    console.error('info-content Element nicht gefunden');
    return;
  }

  // Leere den Inhalt
  infoContent.innerHTML = '';

  // Header mit Überschrift und Schließen-Symbol in einer Zeile
  const header = document.getElementById('info-header');
  header.innerHTML = '';
  const headline = document.createElement('h3');
  headline.textContent = `${meta.label}`;
  headline.style.display = 'inline-block'; // In einer Zeile
  headline.style.margin = '0 10px 10px 0'; // Abstand rechts
  headline.style.fontSize = '18px'; // Größer
  headline.style.fontWeight = 'bold'; // Dicker
  header.appendChild(headline);

  const closeButton = document.createElement('button');
  closeButton.id = 'info-close';
  closeButton.textContent = '✖';
  closeButton.style.display = 'inline-block'; // In einer Zeile
  closeButton.style.float = 'right'; // Rechts ausrichten
  closeButton.addEventListener('click', hideInfoPanel);
  header.appendChild(closeButton);

  // Details-Dropdown Button "Details anzeigen"
  const detailsButton = document.createElement('button');
  detailsButton.className = 'details-dropdown-button';
  detailsButton.textContent = 'Details anzeigen ▼';
  detailsButton.addEventListener('click', () => {
    const detailsContent = document.getElementById('details-content');
    const isOpen = detailsContent.style.display === 'block';
    detailsContent.style.display = isOpen ? 'none' : 'block';
    detailsButton.textContent = isOpen ? 'Details anzeigen ▼' : 'Details ausblenden ▲';
  });
  infoContent.appendChild(detailsButton);

  // Details-Content (versteckt initial, mit Scroll-Stil)
  const detailsContent = document.createElement('div');
  detailsContent.id = 'details-content';
  detailsContent.style.display = 'none';
  detailsContent.innerHTML = `
    ${meta.fma ? `<p><strong>FMA-ID:</strong> ${meta.fma}</p>` : ''}
    ${meta.group ? `<p><strong>Gruppe:</strong> ${meta.group}</p>` : ''}
    ${meta.subgroup && meta.subgroup !== 'none' ? `<p><strong>Subgruppe:</strong> ${meta.subgroup}</p>` : ''}
    ${meta.side && meta.side !== 'none' ? `<p><strong>Seite:</strong> ${meta.side}</p>` : ''}
    ${meta.info?.origin ? `<p><strong>Ursprung:</strong> ${meta.info.origin}</p>` : ''}
    ${meta.info?.insertion ? `<p><strong>Ansatz:</strong> ${meta.info.insertion}</p>` : ''}
    ${meta.info?.function ? `<p><strong>Funktion:</strong> ${meta.info.function}</p>` : ''}
  `;
  infoContent.appendChild(detailsContent);

  // Bearbeitungs-Section "Struktur bearbeiten"
  const editSection = document.createElement('div');
  editSection.id = 'edit-controls';
  editSection.innerHTML = `
    <h3>Struktur bearbeiten</h3>
    <label>Farbe: <input type="color" id="edit-color"></label>
    <label>Transparenz: <input type="range" id="edit-opacity" min="0" max="1" step="0.01" value="1"></label>
    <button id="edit-toggle-visible">Verstecken/Anzeigen</button>
  `;
  infoContent.appendChild(editSection);

  // Add-to-Set Button
  const addButton = document.createElement('button');
  addButton.id = 'add-to-set';
  addButton.textContent = 'Zur Sammlung';
  addButton.addEventListener('click', () => {
    if (!state.setStructures.some(e => e.label === meta.label && e.group === meta.group)) {
      state.setStructures.push(meta);
      const list = document.getElementById('set-structures-list');
      if (list.style.display === 'block') {
        const item = document.createElement('div');
        item.className = 'set-item';
        item.textContent = `${meta.label} (${meta.group})`;
        item.addEventListener('click', () => {
          highlightObject(selectedModel);
          showInfoPanel(meta, selectedModel);
        });
        list.appendChild(item);
      }
    }
  });
  infoContent.appendChild(addButton);

  // Event-Listener für Edit-Controls (unverändert)
  const colorInput = document.getElementById('edit-color');
  const opacitySlider = document.getElementById('edit-opacity');
  const toggleButton = document.getElementById('edit-toggle-visible');

  if (selectedModel) {
    selectedModel.traverse(child => {
      if (child.isMesh && child.material) {
        colorInput.value = '#' + child.material.color.getHexString();
        opacitySlider.value = child.material.opacity || 1;
        toggleButton.textContent = child.visible ? 'Verstecken' : 'Anzeigen';
      }
    });
  }

  colorInput.addEventListener('input', (e) => {
    const newColor = new THREE.Color(e.target.value);
    if (selectedModel) {
      selectedModel.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.color.set(newColor);
          child.material.needsUpdate = true;
        }
      });
    }
  });

  opacitySlider.addEventListener('input', (e) => {
    const opacity = parseFloat(e.target.value);
    if (selectedModel) {
      selectedModel.traverse(child => {
        if (child.isMesh && child.material) {
          const currentColor = child.material.color ? child.material.color.clone() : new THREE.Color(0xffffff);
          let newMat = new THREE.MeshStandardMaterial({
            color: currentColor,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide,
            depthWrite: opacity < 1 ? false : true
          });
          if (Array.isArray(child.material)) {
            child.material = child.material.map(() => newMat.clone());
          } else {
            child.material = newMat;
          }
          child.material.needsUpdate = true;
        }
      });
      renderer.render(scene, camera);
    }
  });

  toggleButton.addEventListener('click', () => {
    if (selectedModel) {
      selectedModel.visible = !selectedModel.visible;
      toggleButton.textContent = selectedModel.visible ? 'Verstecken' : 'Anzeigen';
    }
  });

  // Panel sichtbar machen (unverändert)
  const infoPanel = document.getElementById('info-panel');
  if (!infoPanel) {
    console.error('info-panel Element nicht gefunden – Kann nicht zeigen');
    return;
  }

  console.log('Vor Klassen-Update:', {
    classes: infoPanel.classList.toString(),
    display: infoPanel.style.display,
    opacity: infoPanel.style.opacity
  });
  infoPanel.classList.remove('hidden');
  infoPanel.classList.add('visible');
  infoPanel.style.display = 'block';
  console.log('Nach Klassen-Update:', {
    classes: infoPanel.classList.toString(),
    display: infoPanel.style.display,
    opacity: infoPanel.style.opacity,
    boundingRect: infoPanel.getBoundingClientRect()
  });
  renderer.render(scene, camera);
}

export function hideInfoPanel() {
  const infoPanel = document.getElementById('info-panel');
  infoPanel.classList.add('hidden');
  infoPanel.classList.remove('visible');
  document.getElementById('info-content').innerHTML = '';

  // De-highlight on close (traverse for groups)
  if (state.currentlySelected) {
    state.currentlySelected.traverse(child => {
      if (child.isMesh && child.material && child.material.emissive) {
        child.material.emissive.setHex(0x000000);
      }
    });
    state.currentlySelected = null;
  }
}



function highlightObject(object) {
  // De-highlight previous (traverse for groups)
  if (state.currentlySelected) {
    state.currentlySelected.traverse(child => {
      if (child.isMesh && child.material && child.material.emissive) {
        child.material.emissive.setHex(0x000000);
      }
    });
  }

  // Highlight new (traverse for groups)
  object.traverse(child => {
    if (child.isMesh && child.material && child.material.emissive) {
      child.material.emissive.setHex(0x222222);
    }
  });

  state.currentlySelected = object;
}

export { highlightObject, showInfoPanel };

window.toggleLicense = function () {
  const dropdown = document.getElementById('license-dropdown');
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';

};