// js/ui/submenu/buildSubgroupList.js
import { createModelCheckbox } from './createModelCheckbox.js';

/**
 * Baut eine DOM-Liste aus Subgruppen + Einzelmodell-Checkboxen
 * @param {Object} groupedSubgroups – Subgruppen-Objekt (z. B. { 'arm': [meta1, meta2] })
 * @param {string} group – Anatomische Hauptgruppe (z. B. "muscles")
 * @returns {HTMLElement} – Container-Element mit allen Subgruppen
 */
export function buildSubgroupList(groupedSubgroups, group) {
    const container = document.createElement('div');
    container.className = 'subgroup-list';

    Object.entries(groupedSubgroups)
        .sort(([a], [b]) => a.localeCompare(b)) // Alphabetisch sortieren
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
