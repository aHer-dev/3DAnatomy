// js/ui/submenu/createModelCheckbox.js
import { scene } from '../../scene.js';
import { loadModels, removeModelByFilename, updateGroupVisibility } from '../../modelLoader/index.js';

/**
 * Erstellt eine Checkbox für ein einzelnes anatomisches Modell.
 * @param {Object} entry – Meta-Eintrag (inkl. label, filename, etc.)
 * @param {string} group – Zugehörige anatomische Gruppe
 * @returns {HTMLLIElement} – Checkbox mit Label im Listenelement
 */
export function createModelCheckbox(entry, group) {
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
                await loadModels([entry], group, false, scene); // nur dieses Modell laden
            } else {
                removeModelByFilename(entry.filename, group);   // nur dieses Modell entfernen
            }
            updateGroupVisibility(group); // Sichtbarkeit neu berechnen
        } catch (err) {
            console.error(`❌ Fehler bei "${entry.label}":`, err);
        }
    });

    li.appendChild(cb);
    li.appendChild(label);
    return li;
}
