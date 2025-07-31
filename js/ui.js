import * as THREE from './three.module.js';
import { loadModels } from './modelLoader.js';
import { getMeta } from './utils.js';
import { state } from './state.js';
import { scene, camera, renderer } from './init.js';
import { hideInfoPanel } from './interaction.js';
import { loader } from './init.js'; // Füge loader hinzu (neben scene, camera, etc.)
import { highlightObject, showInfoPanel } from './interaction.js';


export function setupUI() {
  console.log('setupUI gestartet');
  // Initial alle Dropdowns schließen
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    dropdown.classList.remove('active');
    const button = dropdown.querySelector('.dropdown-button');
    if (button) {
      button.textContent = button.textContent.replace(/▲/, '▼');
    }
    const content = dropdown.querySelector('.dropdown-content');
    if (content) {
      content.style.display = 'none';
    }
  });

  // Hamburger-Menü Toggle
  const menuIcon = document.getElementById('menu-icon');
  const controlsPanel = document.getElementById('controls');

  if (menuIcon && controlsPanel) {
    controlsPanel.style.display = 'none'; // Initial closed
    menuIcon.classList.remove('open'); // Icon als Balken
    menuIcon.addEventListener('click', () => {
      const isOpen = controlsPanel.style.display === 'block';
      controlsPanel.style.display = isOpen ? 'none' : 'block';
      menuIcon.classList.toggle('open');
      console.log(`Hamburger-Klick: Panel jetzt ${controlsPanel.style.display}`);
      if (isOpen) {
        console.log('Menü geschlossen – Zustände persistent');
      } else {
        ['muscles', 'bones', 'tendons', 'other'].forEach(groupName => {
          restoreGroupState(groupName);
        });
        console.log('Menü geöffnet – Zustände restauriert');
      }
    });
  } else {
    console.error('menu-icon oder controls nicht gefunden');
  }

  // Info-Panel Close
  document.getElementById('info-close')?.addEventListener('click', hideInfoPanel);

  // Gruppen-Dropdown-Buttons
  document.querySelectorAll('.sub-dropdown-button').forEach(button => {
    const groupName = button.dataset.group;
    button.addEventListener('click', async () => {
      const subDropdown = document.getElementById(`${groupName}-sub-dropdown`);
      const isOpen = subDropdown.style.display === 'block';
      subDropdown.style.display = isOpen ? 'none' : 'block';
      button.textContent = button.textContent.replace(/▼|▲/, isOpen ? '▼' : '▲');

      if (!isOpen) {
        await generateSubDropdown(groupName);
      }
    });
  });

  // Reset-Button
  document.getElementById('reset-button')?.addEventListener('click', resetAll);

  // Suchleiste
  const searchBar = document.getElementById('search-bar');
  const searchResults = document.getElementById('search-results');

  searchBar?.addEventListener('input', async () => {
    const searchTerm = searchBar.value.toLowerCase().trim();
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';

    if (searchTerm === '') return;

    const meta = await getMeta();
    const results = meta.filter(
      entry =>
        entry.label.toLowerCase().includes(searchTerm) ||
        entry.fma.toLowerCase().includes(searchTerm)
    );

    if (results.length === 0) {
      console.log('Keine Ergebnisse gefunden.');
      return;
    }

    results.forEach(result => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.textContent = `${result.label} (${result.group}${result.side ? ', ' + result.side : ''})`;
      item.dataset.entry = JSON.stringify(result);

      item.addEventListener('click', async () => {
        const entry = JSON.parse(item.dataset.entry);
        await loadModels([entry], entry.group, true, scene, loader);

        const model = state.groups[entry.group].find(
          m => state.modelNames.get(m) === entry.label
        );
        if (model) {
          highlightObject(model);
          showInfoPanel(entry, model);
          console.log(`Modell ${entry.label} geladen und ausgewählt.`);
        } else {
          console.warn(`Modell ${entry.label} konnte nicht gefunden werden nach Laden.`);
        }

        searchResults.style.display = 'none';
        searchBar.value = '';
      });

      searchResults.appendChild(item);
    });

    searchResults.style.display = 'block';
    console.log(`Gefundene Ergebnisse: ${results.length}`);
  });

  document.addEventListener('click', event => {
    if (!searchBar.contains(event.target) && !searchResults.contains(event.target)) {
      searchResults.style.display = 'none';
    }
  });

  document.getElementById('lighting-slider')?.addEventListener('input', e => {
    const intensity = parseFloat(e.target.value);
    scene.children.forEach(child => {
      if (child instanceof THREE.DirectionalLight)
        child.intensity = intensity * (child.position.y === 1 ? 0.5 : child.position.x === -1 ? 0.6 : 0.8);
      else if (child instanceof THREE.AmbientLight) child.intensity = intensity * 0.3;
    });
  });

  ['bones', 'muscles', 'tendons', 'other'].forEach(group => {
    const colorInput = document.getElementById(`${group}-color`);
    if (colorInput) {
      const initialHex = state.colors[group].toString(16).padStart(6, '0');
      colorInput.value = `#${initialHex}`;
      console.log(`Initiale Farbe für ${group} gesetzt: #${initialHex}`);

      colorInput.addEventListener('input', e => {
        const newColorStr = e.target.value.slice(1);
        const newColorHex = parseInt(newColorStr, 16);
        if (isNaN(newColorHex)) {
          console.error(`Ungültige Farbe für ${group}: ${e.target.value}`);
          return;
        }

        state.colors[group] = newColorHex;
        console.log(`Farbe für ${group} geändert zu: 0x${newColorStr}`);

        const models = state.groups[group] || [];
        if (models.length === 0) {
          console.warn(`Keine Modelle in Gruppe ${group} geladen – Farbe nicht angewendet.`);
        } else {
          models.forEach(model => {
            model.traverse(child => {
              if (child.isMesh && child.material) {
                child.material.color.setHex(newColorHex);
                child.material.needsUpdate = true;
                console.log(`Material von ${child.name || 'Mesh'} upgedatet.`);
              }
            });
          });
        }

        renderer.render(scene, camera);
      });
    } else {
      console.error(`Farb-Input für ${group} (#${group}-color) nicht gefunden! Überprüfe HTML.`);
    }
  });

  document.getElementById('background-slider')?.addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    const color = new THREE.Color().setHSL(value, 0.5, 0.5);
    scene.background = color;
    renderer.render(scene, camera);
  });

  document.getElementById('room-color')?.addEventListener('input', e => {
    const color = new THREE.Color(e.target.value);
    const brightness = 1 - parseFloat(document.getElementById('room-brightness').value);
    scene.background = color.multiplyScalar(brightness);
    renderer.render(scene, camera);
  });

  document.getElementById('room-brightness')?.addEventListener('input', e => {
    const brightness = 1 - parseFloat(e.target.value);
    const currentColor = new THREE.Color(document.getElementById('room-color').value);
    scene.background = currentColor.multiplyScalar(brightness);
    renderer.render(scene, camera);
  });

  document.querySelectorAll('.dropdown-button:not([data-group])').forEach(button => {
    button.addEventListener('click', () => {
      const dropdown = button.closest('.dropdown');
      const isActive = dropdown.classList.contains('active');

      console.log('Dropdown geklickt:', button.textContent.trim(), 'Status vor Toggle:', isActive ? 'offen' : 'geschlossen');

      dropdown.classList.toggle('active');
      button.textContent = button.textContent.replace(/▼|▲/, isActive ? '▼' : '▲');

      const content = dropdown.querySelector('.dropdown-content');
      if (content) {
        content.style.display = isActive ? 'none' : 'block';
        console.log('Content Display nach manuellem Set:', content.style.display);
      } else {
        console.log('Content nicht gefunden');
      }
    });
  });

  // Screenshot
  document.getElementById('screenshot-button')?.addEventListener('click', () => {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'screenshot.png';
    link.click();
    console.log('Screenshot gemacht.');
  });

  // Exportieren: Generiere Base64-Code nur für geladene Strukturen und lade als Text-Datei herunter
// Exportieren: Generiere Base64-Code nur für geladene Strukturen und lade als Text-Datei herunter
document.getElementById('export-button')?.addEventListener('click', async () => {
  const serializableState = {
    loadedModels: {}
  };

  Object.keys(state.groups).forEach(group => {
    serializableState.loadedModels[group] = state.groups[group]
      .filter(model => model.visible)
      .map(model => state.modelNames.get(model))
      .filter(Boolean);
  });

  const jsonStr = JSON.stringify(serializableState);
  const code = btoa(jsonStr);

  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'settings_code.txt';
  link.click();
  URL.revokeObjectURL(url);
  console.log('Strukturen als Code exportiert:', code);
});

// Laden aus File-Upload (automatisch bei Auswahl, einzigster Weg)
document.getElementById('load-file')?.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    // Clean den Code: Entferne alle Whitespace
    const code = e.target.result.replace(/\s+/g, '');
    console.log('Geladener Code (gereinigt):', code);

    if (!code) {
      alert('Datei ist leer oder ungültig!');
      return;
    }

    try {
      const jsonStr = atob(code);
      const loadedState = JSON.parse(jsonStr);

      Object.keys(state.groups).forEach(group => {
        state.groups[group].forEach(model => scene.remove(model));
        state.groups[group] = [];
      });
      state.modelNames.clear();

      const meta = await getMeta();
      for (const [group, labels] of Object.entries(loadedState.loadedModels)) {
        const entries = meta.filter(entry => labels.includes(entry.label) && entry.group === group);
        if (entries.length > 0) {
          await loadModels(entries, group, true, scene, loader);
        }
      }

      fitCameraToSkeleton();
      renderer.render(scene, camera);
      console.log('Strukturen geladen aus Datei.');
    } catch (error) {
      console.error('Fehler beim Laden der Datei:', error);
      alert('Ungültige Datei! Bitte überprüfen.');
    }
  };
  reader.onerror = () => {
    alert('Fehler beim Lesen der Datei!');
  };
  reader.readAsText(file);
});

  // Laden aus Code-Input (manuell eingeben)
  document.getElementById('load-settings')?.addEventListener('click', () => loadFromCode());

  // Laden aus File-Upload (automatisch bei Auswahl)
  document.getElementById('load-file')?.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const code = e.target.result.replace(/\s+/g, '');
      loadFromCode(code);
    };
    reader.onerror = () => {
      alert('Fehler beim Lesen der Datei!');
    };
    reader.readAsText(file);
  });

  // Hilfsfunktion: Lade aus Code (verwendet von beiden)
  async function loadFromCode(providedCode = null) {
    let code = providedCode || document.getElementById('load-code').value.replace(/\s+/g, '');
    if (!code) {
      alert('Bitte einen gültigen Code eingeben oder Datei auswählen!');
      return;
    }

    console.log('Geladener Code (gereinigt):', code);

    try {
      const jsonStr = atob(code);
      const loadedState = JSON.parse(jsonStr);

      Object.keys(state.groups).forEach(group => {
        state.groups[group].forEach(model => scene.remove(model));
        state.groups[group] = [];
      });
      state.modelNames.clear();

      const meta = await getMeta();
      for (const [group, labels] of Object.entries(loadedState.loadedModels)) {
        const entries = meta.filter(entry => labels.includes(entry.label) && entry.group === group);
        if (entries.length > 0) {
          await loadModels(entries, group, true, scene, loader);
        }
      }

      fitCameraToSkeleton();
      renderer.render(scene, camera);
      console.log('Strukturen geladen aus Code.');
      alert('Strukturen erfolgreich geladen!');
    } catch (error) {
      console.error('Fehler beim Laden des Codes:', error);
      alert('Ungültiger Code! Bitte überprüfen.');
    }
  }

  // Kamera an alle sichtbaren Strukturen anpassen
  function fitCameraToSkeleton() {
    const box = new THREE.Box3();
    
    Object.values(state.groups).flat().forEach(model => {
      if (model.visible) {
        box.expandByObject(model);
      }
    });

    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      camera.position.set(0, center.y, size * 0.75);
      camera.lookAt(center);
      if (controls && controls.target) {
        controls.target.copy(center);
        controls.update();
      }
      renderer.render(scene, camera);
      console.log('Kamera auf alle Strukturen gefittet:', camera.position);
    } else {
      console.warn('Keine Strukturen geladen – Kamera nicht angepasst.');
    }
  }
}

async function generateSubDropdown(groupName) {
  const meta = await getMeta();
  const container = document.getElementById(`${groupName}-subgroups`) || document.createElement('div');
  container.id = `${groupName}-subgroups`;
  container.innerHTML = '';

  // Neu: All/Clear-Buttons für die gesamte Gruppe
  const groupButtons = document.createElement('div');
  groupButtons.className = 'group-buttons';
  const loadAllBtn = document.createElement('button');
  loadAllBtn.textContent = 'Load All';
  loadAllBtn.addEventListener('click', async () => {
    const entries = meta.filter(entry => entry.group === groupName);
if (entries.length === 0) {
  console.warn(`Keine Modelle für ${groupName} – Button deaktivieren?`);
  return; // Oder disable Button
}
await loadModels(entries, groupName, true, scene, loader);
    // Checkboxen updaten (alle checked)
    document.querySelectorAll(`#${groupName}-subgroups input.item-checkbox`).forEach(cb => cb.checked = true);
  });
  const clearAllBtn = document.createElement('button');
  clearAllBtn.textContent = 'Clear All';
  clearAllBtn.addEventListener('click', async () => {
    const entries = meta.filter(entry => entry.group === groupName);
    await loadModels(entries, groupName, false, scene, loader);
    // Checkboxen updaten (alle unchecked)
    document.querySelectorAll(`#${groupName}-subgroups input.item-checkbox`).forEach(cb => cb.checked = false);
  });
  groupButtons.appendChild(loadAllBtn);
  groupButtons.appendChild(clearAllBtn);
  container.appendChild(groupButtons);

  // Bestehender Code für Subgruppen...
  const subgroups = [...new Set(meta.filter(entry => entry.group === groupName).map(entry => entry.subgroup || 'Allgemein'))].sort();
subgroups.forEach(subgroup => {
  const subButton = document.createElement('button');
  subButton.className = 'subgroup-button';
  subButton.textContent = `${subgroup} ▼`;
  subButton.dataset.subgroup = subgroup;
  subButton.addEventListener('click', async () => {
    const detailedListId = `detailed-list-${groupName}-${subgroup}`;
    let detailedList = document.getElementById(detailedListId);
    const isVisible = detailedList?.classList.contains('visible');

    if (isVisible) {
      detailedList.classList.remove('visible');
      subButton.textContent = subButton.textContent.replace('▲', '▼');
    } else {
      if (!detailedList) {
        // Generiere, wenn nicht existent
        await generateDetailedList(groupName, subgroup);
        detailedList = document.getElementById(detailedListId);
      } else {
        // Wenn existent, aktualisiere Toggle-Button-Text (Effizienz)
        const toggleSubBtn = detailedList.querySelector('.toggle-all-button');
        if (toggleSubBtn) {
          const subEntries = meta.filter(e => e.group === groupName && (e.subgroup === subgroup || (subgroup === 'Allgemein' && !e.subgroup)));
          const subLoaded = subEntries.every(entry => state.groups[groupName].some(model => state.modelNames.get(model) === entry.label));
          toggleSubBtn.textContent = subLoaded ? 'Clear All (Sub)' : 'Load All (Sub)';
        }
      }
      // Immer sichtbar machen
      detailedList.classList.add('visible');
      subButton.textContent = subButton.textContent.replace('▼', '▲');
    }
  });
  container.appendChild(subButton);
});

  document.getElementById(`${groupName}-sub-dropdown`).appendChild(container);
  restoreSubgroupStates(groupName);

  //Screenshot
  document.getElementById('screenshot-button')?.addEventListener('click', () => {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'screenshot.png';
  link.click();
  console.log('Screenshot gemacht.');
});

// Speichern
document.getElementById('save-settings')?.addEventListener('click', () => {
  const settings = JSON.stringify(state); // State speichern
  const blob = new Blob([settings], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'settings.json';
  link.click();
  console.log('Einstellungen gespeichert.');
});

// Laden (aus Datei oder Code – für Code brauchst du <input type="file"> oder Textfeld)
document.getElementById('load-settings')?.addEventListener('click', () => {
  const code = document.getElementById('load-code').value;
  if (code) {
    const newState = JSON.parse(code);
    Object.assign(state, newState);
    // Modelle neu laden basierend auf state
    Object.keys(state.groups).forEach(group => {
      loadModels(/* basierend auf state */);
    });
    console.log('Einstellungen geladen.');
  }
});


}

async function generateDetailedList(groupName, subgroup) {
  const meta = await getMeta();
  const container = document.getElementById(`${groupName}-subgroups`);
  let list = document.getElementById(`detailed-list-${groupName}-${subgroup}`);
  if (!list) {
    list = document.createElement('div');
    list.id = `detailed-list-${groupName}-${subgroup}`;
    list.className = 'more-muscles-list';
    const subButton = container.querySelector(`button[data-subgroup="${subgroup}"]`);
    subButton.after(list);
  } else {
    list.innerHTML = ''; // Leeren, falls aktualisiert
  }

  // Toggle-Button (unverändert)
  const toggleSubBtn = document.createElement('button');
  toggleSubBtn.className = 'toggle-all-button';
  const subEntries = meta.filter(e => e.group === groupName && (e.subgroup === subgroup || (subgroup === 'Allgemein' && !e.subgroup)));
  let subLoaded = subEntries.every(entry => state.groups[groupName].some(model => state.modelNames.get(model) === entry.label));
  toggleSubBtn.textContent = subLoaded ? 'Clear All (Sub)' : 'Load All (Sub)';
 toggleSubBtn.addEventListener('click', async () => {
  const visible = toggleSubBtn.textContent === 'Load All (Sub)'; // Explizit deklarieren
  await loadModels(subEntries, groupName, visible, scene, loader);
  list.querySelectorAll('input.item-checkbox').forEach(cb => cb.checked = visible);
  toggleSubBtn.textContent = visible ? 'Clear All (Sub)' : 'Load All (Sub)';
});
  list.appendChild(toggleSubBtn); // Zuerst Button anhängen

  // Neu: Sortiere die Einträge – right vor left, dann nach FMA aufsteigend
  const filtered = subEntries.sort((a, b) => {
    // Primär: right vor left
    if (a.side !== b.side) {
      return a.side === 'right' ? -1 : 1;
    }
    // Sekundär: Nach FMA-ID (aufsteigend, extrahiere Zahl für numerische Sortierung)
    const fmaA = parseInt(a.fma.replace(/\D/g, '')) || 0;
    const fmaB = parseInt(b.fma.replace(/\D/g, '')) || 0;
    return fmaA - fmaB;
  });

  // Checkboxen generieren (nach Button)
  filtered.forEach(entry => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-checkbox';
    checkbox.dataset.filename = entry.filename;
    checkbox.checked = state.subgroupStates[groupName]?.[subgroup]?.[entry.filename] ?? subLoaded;
    checkbox.addEventListener('change', async () => {
      await loadModels([entry], groupName, checkbox.checked, scene, loader);
      if (!state.subgroupStates[groupName]) state.subgroupStates[groupName] = {};
      if (!state.subgroupStates[groupName][subgroup]) state.subgroupStates[groupName][subgroup] = {};
      state.subgroupStates[groupName][subgroup][entry.filename] = checkbox.checked;
      // Update Toggle-Button
      subLoaded = filtered.every(entry => state.subgroupStates[groupName][subgroup]?.[entry.filename] ?? false);
      toggleSubBtn.textContent = subLoaded ? 'Clear All (Sub)' : 'Load All (Sub)';
    });
    label.appendChild(checkbox);
    label.append(` ${entry.label} (${entry.side || 'none'})`);
    list.appendChild(label); // Nach Button anhängen
  });

  // Initial sichtbar machen (falls neu generiert)
  list.classList.add('visible');
}

function restoreGroupState(groupName) {
  // Restauriere offene Sub-Dropdowns und laden
  if (state.groupStates[groupName]?.open) {
    const button = document.querySelector(`.sub-dropdown-button[data-group="${groupName}"]`);
    const subDropdown = document.getElementById(`${groupName}-sub-dropdown`);
    if (button && subDropdown) {
      subDropdown.style.display = 'block';
      button.textContent = button.textContent.replace('▼', '▲');
      generateSubDropdown(groupName); // Rekursiv Substates restaurieren
    }
  }
}

function restoreSubgroupStates(groupName) {
  Object.keys(state.subgroupStates[groupName] || {}).forEach(subgroup => {
    if (Object.values(state.subgroupStates[groupName][subgroup]).some(checked => checked)) {
      const subButton = document.querySelector(`#${groupName}-subgroups .subgroup-button[data-subgroup="${subgroup}"]`);
      if (subButton) {
        subButton.click(); // Öffnet und zeigt Liste (inkl. Checkboxen)
      }
    }
  });
}

function resetAll() {
  // Alle Modelle entfernen
  Object.keys(state.groups).forEach(groupName => {
    state.groups[groupName].forEach(model => scene.remove(model));
    state.groups[groupName] = [];
  });
  state.modelNames.clear();
  state.currentlySelected = null;

  // Zustände zurücksetzen
  state.groupStates = { bones: {}, muscles: {}, tendons: {}, other: {} };
  state.subgroupStates = { bones: {}, muscles: {}, tendons: {}, other: {} };
  state.clickCounts = { bones: 0, muscles: 0, tendons: 0, other: 0 };

  // Slider/Defaults zurücksetzen (sichere Version ohne ?. )
  const transparencySlider = document.getElementById('transparency-slider');
  if (transparencySlider) transparencySlider.value = state.defaultSettings.transparency;

  const lightingSlider = document.getElementById('lighting-slider');
  if (lightingSlider) lightingSlider.value = state.defaultSettings.lighting;

  const backgroundSlider = document.getElementById('background-slider');
  if (backgroundSlider) backgroundSlider.value = state.defaultSettings.background;

  // Raum-Farbe und Helligkeit auf Schwarz und dunkel zurücksetzen
  const roomColor = document.getElementById('room-color');
  if (roomColor) roomColor.value = '#000000'; // Standard: Schwarz

  const roomBrightness = document.getElementById('room-brightness');
  if (roomBrightness) roomBrightness.value = 1; // value=1 -> brightness=0 (dunkel)

  // Farben reset und UI-Inputs aktualisieren
  state.colors = { ...state.defaultSettings.colors };
  ['bones', 'muscles', 'tendons', 'other'].forEach(group => {
    const colorInput = document.getElementById(`${group}-color`);
    if (colorInput) {
      const hex = state.colors[group].toString(16).padStart(6, '0');
      colorInput.value = `#${hex}`;
    }
  });

  // Szene-Hintergrund auf Schwarz zurücksetzen (brightness=0 macht es komplett dunkel/schwarz)
  const defaultColor = new THREE.Color('#000000');
  const defaultBrightness = 0; // Dunkel
  scene.background = defaultColor.multiplyScalar(defaultBrightness);

  // Beleuchtung auf Initialwerte zurücksetzen
  scene.children.forEach(child => {
    if (child instanceof THREE.DirectionalLight) {
      // Setze Initial-Intensitäten (passe an deine init.js an)
      if (child.position.x === 1 && child.position.y === 1 && child.position.z === 1) child.intensity = 0.8;
      if (child.position.x === -1 && child.position.y === 1 && child.position.z === -1) child.intensity = 0.6;
      if (child.position.y === 1) child.intensity = 0.5;
    } else if (child instanceof THREE.AmbientLight) {
      child.intensity = 0.3; // Oder deinen Standard-Wert
    }
  });

  // UI aktualisieren (Submenüs schließen, Checkboxen deaktivieren)
  document.querySelectorAll('.sub-dropdown').forEach(drop => drop.style.display = 'none');
  document.querySelectorAll('.more-muscles-list').forEach(list => list.classList.remove('visible'));
  document.querySelectorAll('input.item-checkbox').forEach(cb => cb.checked = false);

  // Alle Dropdowns nach Reset schließen
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    dropdown.classList.remove('active');
    const button = dropdown.querySelector('.dropdown-button');
    if (button) {
      button.textContent = button.textContent.replace(/▲/, '▼');
    }
  });

  // Skelett (Bones) automatisch laden, wie im Anfangszustand
  (async () => {
    const meta = await getMeta();
    const bonesEntries = meta.filter(entry => entry.group === 'bones');
    if (bonesEntries.length > 0) {
      await loadModels(bonesEntries, 'bones', true, scene, loader);
      console.log('Skelett nach Reset neu geladen.');
    } else {
      console.warn('Keine Bones-Modelle verfügbar – Skelett nicht geladen.');
    }
  })();

  // Szene rendern (um Änderungen sichtbar zu machen)
  if (renderer) {
    renderer.render(scene, camera);
  } else {
    console.warn('Renderer nicht verfügbar – Szene nicht gerendert.');
  }

  console.log('Reset ausgeführt – App im Anfangszustand mit Skelett.');
}