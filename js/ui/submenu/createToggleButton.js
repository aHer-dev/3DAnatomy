// js/ui/submenu/createToggleButton.js
import { groupMetaBySubgroup } from './groupMetaBySubgroup.js';
import { buildSubgroupList } from './buildSubgroupList.js';

/**
 * Erstellt den "mehr..."-Button für eine anatomische Gruppe.
 * Bei Klick werden Untergruppen angezeigt/ausgeblendet.
 * @param {string} group – z. B. "muscles"
 * @param {Array} meta – vollständige Metadaten
 * @param {HTMLElement} parentContainer – Container, in den Subgruppen eingefügt werden
 * @returns {HTMLButtonElement}
 */
export function createToggleButton(group, meta, parentContainer) {
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
