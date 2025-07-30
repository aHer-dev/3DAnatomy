import * as THREE from './three.module.js';
import { loadModels } from './modelLoader.js';
import { getMeta } from './utils.js';
import { state } from './state.js';
import { scene, loader } from './init.js';
import { hideInfoPanel } from './interaction.js';

export function setupUI() {
  console.log('setupUI gestartet');

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
      // Menü geschlossen – Zustände bleiben persistent (kein Reset!)
      console.log('Menü geschlossen – Zustände persistent');
    } else {
      // Menü geöffnet – Zustände restaurieren
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
      await generateSubDropdown(groupName); // Generiert Subgruppen + All/Clear-Buttons
    }
  });
});

// Reset-Button
document.getElementById('reset-button')?.addEventListener('click', resetAll);

  // Suchleiste (unverändert)
  const searchBar = document.getElementById('search-bar');
  searchBar?.addEventListener('input', async () => {
    const searchTerm = searchBar.value.toLowerCase();
    const meta = await getMeta();
    const results = meta.filter(entry =>
      entry.label.toLowerCase().includes(searchTerm) ||
      entry.fma.toLowerCase().includes(searchTerm)
    );
    results.forEach(result => loadModels([result], result.group, true, scene, loader));
  });

  // Slider (unverändert)
  document.getElementById('transparency-slider')?.addEventListener('input', (e) => {
    const transparency = parseFloat(e.target.value);
    Object.values(state.groups).flat().forEach(model => {
      model.traverse(child => {
        if (child.isMesh) child.material.opacity = transparency;
      });
    });
  });

  document.getElementById('lighting-slider')?.addEventListener('input', (e) => {
    const intensity = parseFloat(e.target.value);
    scene.children.forEach(child => {
      if (child instanceof THREE.DirectionalLight) child.intensity = intensity * (child.position.y === 1 ? 0.5 : child.position.x === -1 ? 0.6 : 0.8);
      else if (child instanceof THREE.AmbientLight) child.intensity = intensity * 0.3;
    });
  });

  document.getElementById('background-slider')?.addEventListener('input', (e) => {
    const opacity = parseFloat(e.target.value);
    document.body.style.backgroundColor = `rgba(51, 51, 51, ${opacity})`;
  });

  // Dropdown-Toggle für andere Sections
  document.querySelectorAll('.dropdown-button:not([data-group])').forEach(button => {
    button.addEventListener('click', () => {
      const dropdown = button.closest('.dropdown');
      dropdown.classList.toggle('active');
    });
  });
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
    const visible = toggleSubBtn.textContent === 'Load All (Sub)';
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

  // Slider/Defaults zurücksetzen
  document.getElementById('transparency-slider').value = state.defaultSettings.transparency;
  document.getElementById('lighting-slider').value = state.defaultSettings.lighting;
  document.getElementById('background-slider').value = state.defaultSettings.background;
  state.colors = { ...state.defaultSettings.colors }; // Farben reset

  // UI aktualisieren (Submenüs schließen, Checkboxen deaktivieren)
  document.querySelectorAll('.sub-dropdown').forEach(drop => drop.style.display = 'none');
  document.querySelectorAll('.more-muscles-list').forEach(list => list.classList.remove('visible'));
  document.querySelectorAll('input.item-checkbox').forEach(cb => cb.checked = false);

  // Szene rendern (um Änderungen sichtbar zu machen)
  renderer.render(scene, camera);

  console.log('Reset ausgeführt – App im Anfangszustand');
}