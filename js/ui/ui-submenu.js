// ui-submenu.js
// 📂 Erstellt ein dynamisches Submenü für anatomische Gruppen mit Checkbox-Steuerung (Gruppen, Subgruppen, einzelne Modelle)
import { scene } from '../scene.js';
import { state } from '../state.js';
import { loadGroup, unloadGroup, updateGroupVisibility, loadModels, removeModelByFilename } from '../modelLoader/index.js';
import { getMeta } from '../utils.js';


/**
 * Initialisiert das UI-Menü für anatomische Hauptgruppen (z. B. muscles, bones)
 * mit ausklappbaren Untergruppen und Checkboxen zum gezielten (De-)Laden.
 */
export function setupSubmenuUI() {
const submenuContainer = document.getElementById('submenu-container');
  if (!submenuContainer) {
    console.warn('⚠️ Kein Container mit ID "submenu-container" gefunden.');
    return;
  }

  // 📄 Lade alle Metadaten (für Untergruppen etc.)
  getMeta().then(meta => {
    const groups = state.availableGroups || Object.keys(state.groups);

    groups.forEach(group => {
      // 📦 UI-Block für jede Hauptgruppe erstellen
      const groupDiv = document.createElement('div');
      groupDiv.className = 'group-block';

      // ✅ Hauptgruppen-Checkbox
      const groupCheckbox = document.createElement('input');
      groupCheckbox.type = 'checkbox';
      groupCheckbox.id = `group-${group}`;

      const groupLabel = document.createElement('label');
      groupLabel.textContent = group;
      groupLabel.htmlFor = groupCheckbox.id;

      // 📌 Klick-Handler für Hauptgruppen-Checkbox
      groupCheckbox.addEventListener('change', async () => {
        try {
          if (groupCheckbox.checked) {
            await loadGroup(group);         // Lade gesamte Gruppe
          } else {
            await unloadGroup(group);       // Entferne gesamte Gruppe
          }
          updateGroupVisibility(group);     // Sichtbarkeitsstatus aktualisieren
        } catch (err) {
          console.error(`❌ Fehler beim Umschalten der Gruppe "${group}":`, err);
        }
      });

      groupDiv.appendChild(groupCheckbox);
      groupDiv.appendChild(groupLabel);

      // 🔽 Button zum Ein-/Ausklappen der Untergruppenliste
      const moreBtn = document.createElement('button');
      moreBtn.textContent = 'mehr...';

      let expanded = false;
      let subList = null;

      // 📌 Klick-Handler für „mehr...“ / „weniger“
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

// 🔍 Hilfsfunktion: Gruppiere Metadaten einer Hauptgruppe nach Subgruppe
function entriesBySubgroup(meta, group) {
  const entries = meta.filter(e => e.group === group);
  const bySub = {};

  entries.forEach(entry => {
    const sub = entry.subgroup || 'Allgemein'; // Fallback, falls keine Subgruppe vorhanden
    if (!bySub[sub]) bySub[sub] = [];
    bySub[sub].push(entry);
  });

  return bySub; // { "Oberarm": [...], "Unterarm": [...], "Allgemein": [...] }
}

// 📋 Erzeugt eine HTML-Liste aller Untergruppen und deren Modelle mit Checkboxen
function buildSubList(subgroups, group) {
  const subContainer = document.createElement('div');
  subContainer.className = 'subgroup-list';

  Object.entries(subgroups)
    .sort(([a], [b]) => a.localeCompare(b)) // 🔠 Subgruppen alphabetisch sortieren
    .forEach(([sub, entries]) => {
      // 🔠 Modelle innerhalb der Subgruppe alphabetisch sortieren
      entries.sort((a, b) => a.label.localeCompare(b.label));

      // 🏷️ Untergruppenname anzeigen
      const subLabel = document.createElement('div');
      subLabel.textContent = sub;
      subLabel.className = 'subgroup-name';

      // 📋 Liste aller Modelle in dieser Subgruppe
      const entryList = document.createElement('ul');

      entries.forEach(entry => {
        const li = document.createElement('li');

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = `entry-${entry.fma}`;

        const label = document.createElement('label');
        label.htmlFor = cb.id;
        label.textContent = entry.label;

        // 📌 Einzelmodell laden / entladen
        cb.addEventListener('change', async () => {
          try {
            if (cb.checked) {
              await loadModels([entry], group, false, scene, loader); // Nur 1 Modell laden
            } else {
              removeModelByFilename(entry.filename, group);           // Nur 1 Modell entfernen
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
