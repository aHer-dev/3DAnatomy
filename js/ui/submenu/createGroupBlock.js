// js/ui/submenu/createGroupBlock.js
import { createGroupCheckbox } from './createGroupCheckbox.js';
import { createToggleButton } from './createToggleButton.js';

/**
 * Erstellt einen Block für eine anatomische Hauptgruppe im Submenü.
 * @param {string} group – Gruppenname (z. B. "muscles")
 * @param {Array} meta – Komplette Metadatenliste
 * @returns {HTMLElement} – Container mit Checkbox + Label + Toggle-Button
 */
export function createGroupBlock(group, meta) {
    const container = document.createElement('div');
    container.className = 'group-block';

    const checkbox = createGroupCheckbox(group);
    const label = document.createElement('label');
    label.textContent = group;
    label.htmlFor = checkbox.id;

    const toggleBtn = createToggleButton(group, meta, container);

    container.appendChild(checkbox);
    container.appendChild(label);
    container.appendChild(toggleBtn);

    return container;
}
