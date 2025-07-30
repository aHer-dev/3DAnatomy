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
        // Beim Öffnen: Alle Modelle laden (falls nicht schon)
        const meta = await getMeta();
        const entries = meta.filter(entry => entry.group === groupName);
        if (entries.length > 0 && state.groups[groupName].length === 0) {
          await loadModels(entries, groupName, true, scene, loader);
        }
        await generateSubDropdown(groupName);
      }
    });
  });

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
  document.getElementById(`${groupName}-sub-dropdown`).appendChild(container);

  const subgroups = [...new Set(meta.filter(entry => entry.group === groupName).map(entry => entry.subgroup || 'Allgemein'))].sort();

  subgroups.forEach(subgroup => {
    const subButton = document.createElement('button');
    subButton.className = 'subgroup-button';
    subButton.textContent = `${subgroup} ▼`;
    subButton.dataset.subgroup = subgroup;
    subButton.addEventListener('click', async () => {
      const detailedList = document.getElementById(`detailed-list-${groupName}-${subgroup}`);
      const isVisible = detailedList?.classList.contains('visible');
      if (isVisible) {
        detailedList.classList.remove('visible');
        subButton.textContent = subButton.textContent.replace('▲', '▼');
      } else {
        await generateDetailedList(groupName, subgroup);
        document.getElementById(`detailed-list-${groupName}-${subgroup}`).classList.add('visible');
        subButton.textContent = subButton.textContent.replace('▼', '▲');
      }
    });
    container.appendChild(subButton);
  });

  // Restauriere Zustände
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
  }
  list.innerHTML = '';

  const filtered = meta.filter(e => e.group === groupName && (e.subgroup === subgroup || (subgroup === 'Allgemein' && !e.subgroup)));
  filtered.forEach(entry => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-checkbox';
    checkbox.dataset.filename = entry.filename;
    checkbox.checked = state.subgroupStates[groupName]?.[subgroup]?.[entry.filename] ?? true; // Default an
    checkbox.addEventListener('change', async () => {
      await loadModels([entry], groupName, checkbox.checked, scene, loader);
      // Speichere Zustand
      if (!state.subgroupStates[groupName]) state.subgroupStates[groupName] = {};
      if (!state.subgroupStates[groupName][subgroup]) state.subgroupStates[groupName][subgroup] = {};
      state.subgroupStates[groupName][subgroup][entry.filename] = checkbox.checked;
    });
    label.appendChild(checkbox);
    label.append(` ${entry.label} (${entry.side || 'none'})`);
    list.appendChild(label);
  });
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
        subButton.click(); // Öffne und lade Liste
      }
    }
  });
}
