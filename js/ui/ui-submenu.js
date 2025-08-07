// js/ui/ui-submenu.js
// 📂 Erstellt ein dynamisches Submenü für anatomische Gruppen mit Subgruppen und Einzelmodell-Checkboxen

import { scene } from '../scene.js';
import { state } from '../state.js';
import { getMeta } from '../utils.js';
import { loadGroup, unloadGroup, updateGroupVisibility, loadModels, removeModelByFilename } from '../modelLoader/index.js';

// === 🔧 Hauptfunktion zum Initialisieren des Submenüs
export async function setupSubmenuUI() {
  const submenuContainer = document.getElementById('submenu-container');
  if (!submenuContainer) {
    console.warn('⚠️ Kein Container mit ID "submenu-container" gefunden.');
    return;
  }

  const meta = await getMeta();
  const groups = state.availableGroups || Object.keys(state.groups);

  groups.forEach(group => {
    const groupBlock = createGroupBlock(group, meta);
    submenuContainer.appendChild(groupBlock);
  });
}

// === 🧱 Erstellt UI-Block für eine Hauptgruppe
function createGroupBlock(group, meta) {
  const container = document.createElement('div');
  container.className = 'group-block';

  const checkbox = createGroupCheckbox(group);
  const label = createGroupLabel(group, checkbox);
  const toggleBtn = createToggleButton(group, meta, container);

  container.appendChild(checkbox);
  container.appendChild(label);
  container.appendChild(toggleBtn);

  return container;
}

// === 🔘 Checkbox zum (De-)Laden einer Hauptgruppe
function createGroupCheckbox(group) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `group-${group}`;

  checkbox.addEventListener('change', async () => {
    try {
      if (checkbox.checked) {
        await loadGroup(group);
      } else {
        await unloadGroup(group);
      }
      updateGroupVisibility(group);
    } catch (err) {
      console.error(`❌ Fehler beim Umschalten der Gruppe "${group}":`, err);
    }
  });

  return checkbox;
}

// === 🏷️ Label für die Hauptgruppen-Checkbox
function createGroupLabel(group, checkbox) {
  const label = document.createElement('label');
  label.textContent = group;
  label.htmlFor = checkbox.id;
  return label;
}

// === ⏬ Button zum Ein-/Ausklappen der Untergruppen-Liste
function createToggleButton(group, meta, parentContainer) {
  const button = document.createElement('button');
  button.textContent = 'mehr...';

  let expanded = false;
  let subListElement = null;

  button.addEventListener('click', () => {
    if (!expanded) {
      const subgroups = groupMetaBySubgroup(meta, group);
      subListElement = buildSubgroupList(subgroups, group);
      parentContainer.appendChild(subListElement);
      button.textContent = 'weniger';
    } else {
      if (subListElement) parentContainer.removeChild(subListElement);
      button.textContent = 'mehr...';
    }
    expanded = !expanded;
  });

  return button;
}

// === 📁 Gruppiert Meta-Einträge nach Subgruppe
function groupMetaBySubgroup(meta, group) {
  const grouped = {};
  meta
    .filter(entry => entry.group === group)
    .forEach(entry => {
      const sub = entry.subgroup || 'Allgemein';
      if (!grouped[sub]) grouped[sub] = [];
      grouped[sub].push(entry);
    });
  return grouped;
}

// === 🧩 Baut die HTML-Liste der Subgruppen und Modelle mit Checkboxen
function buildSubgroupList(subgroups, group) {
  const container = document.createElement('div');
  container.className = 'subgroup-list';

  Object.entries(subgroups)
    .sort(([a], [b]) => a.localeCompare(b)) // Subgruppen alphabetisch
    .forEach(([subgroupName, entries]) => {
      entries.sort((a, b) => a.label.localeCompare(b.label)); // Modelle alphabetisch

      const subgroupLabel = document.createElement('div');
      subgroupLabel.textContent = subgroupName;
      subgroupLabel.className = 'subgroup-name';

      const modelList = document.createElement('ul');
      entries.forEach(entry => {
        const listItem = createModelCheckbox(entry, group);
        modelList.appendChild(listItem);
      });

      container.appendChild(subgroupLabel);
      container.appendChild(modelList);
    });

  return container;
}

// === ✅ Checkbox für ein einzelnes Modell
function createModelCheckbox(entry, group) {
  const li = document.createElement('li');

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = `entry-${entry.fma}`;

  const label = document.createElement('label');
  label.textContent = entry.label;
  label.htmlFor = cb.id;

  cb.addEventListener('change', async () => {
    try {
      if (cb.checked) {
        await loadModels([entry], group, false, scene); // Nur dieses Modell
      } else {
        removeModelByFilename(entry.filename, group);
      }
      updateGroupVisibility(group);
    } catch (err) {
      console.error(`❌ Fehler bei "${entry.label}":`, err);
    }
  });

  li.appendChild(cb);
  li.appendChild(label);
  return li;
}
