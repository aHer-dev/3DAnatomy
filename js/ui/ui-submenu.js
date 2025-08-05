// ui-submenu.js

import { state } from '../state.js';
import { loadGroup, unloadGroup } from '../modelLoader/index.js';
import { removeModelsByGroupOrSubgroup, removeModelByFilename } from '../modelLoader/index.js';
import { getMeta } from '../utils.js';
import { scene, loader } from '../init.js';
import { updateGroupVisibility } from '../modelLoader/index.js';

export function setupSubmenuUI() {
  const container = document.getElementById('submenu-container');
  if (!container) {
    console.warn('⚠️ Kein Container mit ID "submenu-container" gefunden.');
    return;
  }

  getMeta().then(meta => {
    const groups = state.availableGroups || Object.keys(state.groups);

    groups.forEach(group => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'group-block';

      const groupCheckbox = document.createElement('input');
      groupCheckbox.type = 'checkbox';
      groupCheckbox.id = `group-${group}`;

      const groupLabel = document.createElement('label');
      groupLabel.textContent = group;
      groupLabel.htmlFor = groupCheckbox.id;

      groupCheckbox.addEventListener('change', async () => {
  try {
    if (groupCheckbox.checked) {
      await loadGroup(group); // ✅ ersetzt loadModels(...)
    } else {
      await unloadGroup(group); // ✅ ersetzt removeModelsByGroupOrSubgroup(...)
    }
    updateGroupVisibility(group);
  } catch (err) {
    console.error(`❌ Fehler beim Umschalten der Gruppe "${group}":`, err);
  }
});

      groupDiv.appendChild(groupCheckbox);
      groupDiv.appendChild(groupLabel);

      const moreBtn = document.createElement('button');
      moreBtn.textContent = 'mehr...';

      let expanded = false;
      let subList = null;

      moreBtn.addEventListener('click', () => {
        if (!expanded) {
          subList = buildSubList(entriesBySubgroup(meta, group), group);
          groupDiv.appendChild(subList);
          moreBtn.textContent = 'weniger';
        } else {
          if (subList) groupDiv.removeChild(subList);
          moreBtn.textContent = 'mehr...';
        }
        expanded = !expanded;
      });

      groupDiv.appendChild(moreBtn);
      container.appendChild(groupDiv);
    });
  });
}

// 🔍 Gruppiere Metadaten nach Subgruppe (Fallback = „Allgemein“)
function entriesBySubgroup(meta, group) {
  const entries = meta.filter(e => e.group === group);
  const bySub = {};

  entries.forEach(entry => {
    const sub = entry.subgroup || 'Allgemein';
    if (!bySub[sub]) bySub[sub] = [];
    bySub[sub].push(entry);
  });

  return bySub;
}

// 📋 Baue die Untergruppen-Liste mit Checkboxen
function buildSubList(subgroups, group) {
  const subContainer = document.createElement('div');
  subContainer.className = 'subgroup-list';

  Object.entries(subgroups)
    .sort(([a], [b]) => a.localeCompare(b)) // 🔠 Subgruppen alphabetisch sortieren
    .forEach(([sub, entries]) => {
      entries.sort((a, b) => a.label.localeCompare(b.label)); // 🔠 Modelle alphabetisch sortieren

      const subLabel = document.createElement('div');
      subLabel.textContent = sub;
      subLabel.className = 'subgroup-name';

      const entryList = document.createElement('ul');

      entries.forEach(entry => {
        const li = document.createElement('li');

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = `entry-${entry.fma}`;

        const label = document.createElement('label');
        label.htmlFor = cb.id;
        label.textContent = entry.label;

        cb.addEventListener('change', async () => {
          try {
            if (cb.checked) {
              await loadModels([entry], group, false, scene, loader);
            } else {
             removeModelByFilename(entry.filename, group); // ✅ korrekt
            }
            updateGroupVisibility(group);
          } catch (err) {
            console.error(`❌ Fehler beim (De-)Laden von "${entry.label}":`, err);
          }
        });

        li.appendChild(cb);
        li.appendChild(label);
        entryList.appendChild(li);
      });

      subContainer.appendChild(subLabel);
      subContainer.appendChild(entryList);
    });

  return subContainer;
}
