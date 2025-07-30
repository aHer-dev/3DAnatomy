import * as THREE from './three.module.js';
import { loadModels } from './modelLoader.js';
import { getMeta } from './utils.js';
import { state } from './state.js';
import { scene, loader } from './init.js';

export function setupUI() {
  console.log('setupUI gestartet');

  // Hamburger-Menü Toggle – Panel startet closed
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
    });
  } else {
    console.error('menu-icon oder controls nicht gefunden');
  }

  const infoPanel = document.getElementById('info-panel');
  const infoClose = document.getElementById('info-close');
  if (!infoPanel || !infoClose) {
    console.error('info-panel oder info-close nicht gefunden');
  } else {
    console.log('info-panel und info-close gefunden');
    infoClose.addEventListener('click', hideInfoPanel);
  }

  ['bones', 'muscles', 'tendons', 'other'].forEach(groupName => {
    const checkbox = document.getElementById(groupName);
    if (!checkbox) {
      console.error(`Checkbox für ${groupName} nicht gefunden`);
      return;
    }

    console.log(`Initialisiere Gruppe: ${groupName}`);
    checkbox.addEventListener('click', async (e) => {
      e.preventDefault(); // Verhindere default Checkbox-Toggle
      console.log(`Klick auf ${groupName}, aktueller Count: ${state.clickCounts[groupName]}`);

      const subDropdown = document.getElementById(`${groupName}-sub-dropdown`);
      if (!subDropdown) {
        console.error(`Sub-Dropdown für ${groupName} nicht gefunden`);
        return;
      }

      try {
        // Inkrementiere bei jedem Klick (modulo 4)
        state.clickCounts[groupName] = (state.clickCounts[groupName] + 1) % 4;
        let clickCount = state.clickCounts[groupName];
        console.log(`Neuer Click-Count für ${groupName}: ${clickCount}`);

        // Schließe andere Submenüs
        ['bones', 'muscles', 'tendons', 'other'].forEach(id => {
          if (id !== groupName) {
            const otherDropdown = document.getElementById(`${id}-sub-dropdown`);
            const otherCheckbox = document.getElementById(id);
            if (otherDropdown) otherDropdown.style.display = 'none';
            if (otherCheckbox) otherCheckbox.checked = false;
            state.clickCounts[id] = 0;
          }
        });

        const meta = await getMeta();
        const entries = meta.filter(entry => entry.group === groupName);
        console.log(`📊 Entries für ${groupName}: ${entries.length} gefunden`);

        if (clickCount === 1) { // Klick 1: Load + Open Submenü
          subDropdown.style.display = 'block';
          checkbox.checked = true;
          await generateSubDropdown(groupName);
          // Prüfe, ob Subgruppen aktiviert sind
          const activeSubgroups = Array.from(document.querySelectorAll(`#${groupName}-subgroups input:checked`)).map(cb => cb.dataset.subgroup);
          if (entries.length > 0 && activeSubgroups.length === 0) { // Nur laden, wenn keine Subgruppen aktiv
            console.log(`🚀 Starte Laden aller Modelle für ${groupName}`);
            await loadModels(entries, groupName, true, scene, loader);
          } else {
            console.log(`ℹ️ Modelle für ${groupName} übersprungen (Subgruppen aktiv: ${activeSubgroups})`);
          }
        } else if (clickCount === 2) { // Klick 2: Unload + Keep Submenü
          subDropdown.style.display = 'block';
          checkbox.checked = false;
          if (entries.length > 0) {
            console.log(`🛑 Starte Ausblenden aller Modelle für ${groupName}`);
            await loadModels(entries, groupName, false, scene, loader);
            state.groups[groupName] = []; // Sicherstellen, dass state.groups geleert wird
          } else {
            console.warn(`⚠️ Keine Modelle für ${groupName} zum Ausblenden`);
          }
        } else if (clickCount === 3) { // Klick 3: Minimize Submenü
          subDropdown.style.display = 'none';
          checkbox.checked = false;
          console.log(`📌 Submenü für ${groupName} minimiert`);
        } else if (clickCount === 0) { // Klick 4: Reset + Load + Open
          subDropdown.style.display = 'block';
          checkbox.checked = true;
          await generateSubDropdown(groupName);
          // Reset Subgruppen-Checkboxen
          document.querySelectorAll(`#${groupName}-subgroups input`).forEach(cb => cb.checked = false);
          if (entries.length > 0) {
            console.log(`🔄 Reset: Starte Laden aller Modelle für ${groupName}`);
            state.groups[groupName] = []; // Leere vorher, um doppeltes Laden zu verhindern
            await loadModels(entries, groupName, true, scene, loader);
          }
          state.clickCounts[groupName] = 0; // Reset für sauberen Loop
        }
      } catch (error) {
        console.error(`Fehler im Klick-Handler für ${groupName}:`, error);
      }
    });
  });

  // Initial aktives Dropdown – closed
  // const dropdown = document.querySelector('.dropdown');
  // if (dropdown) {
  //   console.log('Dropdown gefunden, setze .active');
  //   dropdown.classList.add('active');
  // } else {
  //   console.error('Dropdown nicht gefunden');
  // }

  // Suchleiste
  const searchBar = document.getElementById('search-bar');
  if (searchBar) {
    console.log('search-bar gefunden');
    searchBar.addEventListener('input', async () => {
      const searchTerm = searchBar.value.toLowerCase();
      const meta = await getMeta();
      const results = meta.filter(entry =>
        entry.label.toLowerCase().includes(searchTerm) ||
        entry.fma.toLowerCase().includes(searchTerm)
      );
      console.log(`Suchergebnisse für "${searchTerm}":`, results.map(r => r.label));
      results.forEach(result => loadModels([result], result.group, true, scene, loader));
    });
  } else {
    console.error('search-bar nicht gefunden');
  }

  // Transparenz-Slider
  const transparencySlider = document.getElementById('transparency-slider');
  if (transparencySlider) {
    transparencySlider.addEventListener('input', (e) => {
      const transparency = parseFloat(e.target.value);
      Object.values(state.groups).flat().forEach(model => {
        model.traverse(child => {
          if (child.isMesh) {
            child.material.transparent = true;
            child.material.opacity = transparency;
          }
        });
      });
    });
  } else {
    console.error('transparency-slider nicht gefunden');
  }

  // Licht-Slider
  const lightingSlider = document.getElementById('lighting-slider');
  if (lightingSlider) {
    lightingSlider.addEventListener('input', (e) => {
      const intensity = parseFloat(e.target.value);
      scene.children.forEach(child => {
        if (child instanceof THREE.DirectionalLight) {
          child.intensity = intensity * (child.position.y === 1 ? 0.5 : child.position.x === -1 ? 0.6 : 0.8);
        } else if (child instanceof THREE.AmbientLight) {
          child.intensity = intensity * 0.3;
        }
      });
    });
  } else {
    console.error('lighting-slider nicht gefunden');
  }

  // Hintergrund-Slider
  const backgroundSlider = document.getElementById('background-slider');
  if (backgroundSlider) {
    backgroundSlider.addEventListener('input', (e) => {
      const opacity = parseFloat(e.target.value);
      document.body.style.backgroundColor = `rgba(51, 51, 51, ${opacity})`;
    });
  }

  document.querySelectorAll('.dropdown-button').forEach(button => {
    button.addEventListener('click', () => {
      const dropdown = button.closest('.dropdown');
      document.querySelectorAll('.dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
      });
      dropdown.classList.toggle('active');
      console.log(`Dropdown-Button geklickt: ${button.textContent}, jetzt active: ${dropdown.classList.contains('active')}`);
    });
  });
}

async function generateDetailedList(groupName, subgroup) {
  console.log(`Generating detailed list for ${groupName} - ${subgroup}`);
  const meta = await getMeta();
  const container = document.querySelector(`#${groupName}-subgroups .subgroup-line[data-subgroup="${subgroup}"]`);
  if (!container) {
    console.error(`Container for ${subgroup} not found`);
    return;
  }

  // Filtere Entries für diese Subgruppe
  let filtered = meta.filter(e => e.group === groupName && 
    (e.subgroup === subgroup || (subgroup === 'Allgemein' && e.subgroup === 'none')));

  // Sortiere: Zuerst right (von oben nach unten = FMA aufsteigend), dann left
  filtered.sort((a, b) => {
    if (a.side !== b.side) {
      return a.side === 'right' ? -1 : 1; // right vor left
    }
    // Sortiere nach FMA-Code aufsteigend (niedrig = "oben"? Anpasse bei Bedarf zu FJ: a.fj.localeCompare(b.fj))
    const fmaA = parseInt(a.fma.replace(/\D/g, '')) || 0;
    const fmaB = parseInt(b.fma.replace(/\D/g, '')) || 0;
    return fmaA - fmaB;
  });

  // Erstelle die Liste (nur wenn nicht existent)
  let list = document.getElementById(`detailed-list-${groupName}-${subgroup}`);
  if (!list) {
    list = document.createElement('div');
    list.className = 'more-muscles-list'; // Nutze bestehende CSS
    list.id = `detailed-list-${groupName}-${subgroup}`;
    container.appendChild(list);
  } else {
    list.innerHTML = ''; // Aktualisiere bei Bedarf
  }

  filtered.forEach(entry => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-checkbox';
    checkbox.dataset.filename = entry.filename;
    checkbox.addEventListener('change', async () => {
      await loadModels([entry], groupName, checkbox.checked, scene, loader);
    });
    label.appendChild(checkbox);
    label.append(` ${entry.label} (${entry.side})`); // Zeige side für Klarheit
    list.appendChild(label);
  });
}

export async function generateSubDropdown(groupName) {
  console.log(`📦 generateSubDropdown aufgerufen für ${groupName}`);
  const meta = await getMeta();
  const container = document.getElementById(`${groupName}-subgroups`);
  container.innerHTML = '';

  const subgroups = [...new Set(
    meta
      .filter(entry => entry.group === groupName)
      .map(entry => entry.subgroup === 'none' ? 'Allgemein' : entry.subgroup)
  )].sort();
  console.log(`📋 Gefundene Subgruppen für ${groupName}:`, subgroups);

  subgroups.forEach(subgroup => {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'subgroup-line';
    lineDiv.dataset.subgroup = subgroup; // Für Query

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.group = groupName;
    checkbox.dataset.subgroup = subgroup;
    checkbox.className = 'subgroup-checkbox';

    checkbox.addEventListener('change', async () => {
      console.log(`☑️ Subgroup checkbox: ${subgroup}, Checked = ${checkbox.checked}`);
      const meta = await getMeta();
      const entries = meta.filter(entry =>
        entry.group === groupName &&
        (entry.subgroup === subgroup || (subgroup === 'Allgemein' && entry.subgroup === 'none'))
      );
      await loadModels(entries, groupName, checkbox.checked, scene, loader);

      // Optional: Sync individuelle Checkboxes (bei All on: check all, bei off: uncheck all)
      const detailedList = document.getElementById(`detailed-list-${groupName}-${subgroup}`);
      if (detailedList) {
        detailedList.querySelectorAll('input.item-checkbox').forEach(cb => {
          cb.checked = checkbox.checked;
        });
      }
    });

    label.appendChild(checkbox);
    label.append(` ${subgroup}`);
    lineDiv.appendChild(label);

    // Füge More-Button hinzu (toggle detailed list)
const moreButton = document.createElement('button');
moreButton.className = 'more-button';
moreButton.textContent = 'More';
moreButton.addEventListener('click', async () => {  // async hinzufügen
  const listId = `detailed-list-${groupName}-${subgroup}`;
  const list = document.getElementById(listId);
  
  if (list && list.classList.contains('visible')) {
    list.classList.remove('visible');
  } else {
    if (!list) {
      await generateDetailedList(groupName, subgroup);  // await hinzufügen
    }
    const updatedList = document.getElementById(listId);
    if (updatedList) {
      updatedList.classList.add('visible');
    }
  }
});
lineDiv.appendChild(moreButton);

    container.appendChild(lineDiv);
    console.log(`✅ Subgruppen-Zeile mit More-Button hinzugefügt: ${subgroup}`);
  });
}

function hideInfoPanel() {
  const infoPanel = document.getElementById('info-panel');
  infoPanel.classList.remove('visible');
  document.getElementById('info-content').innerHTML = '';
  if (state.currentlySelected?.material?.emissive) {
    state.currentlySelected.material.emissive.setHex(0x000000);
  }
  state.currentlySelected = null;
}