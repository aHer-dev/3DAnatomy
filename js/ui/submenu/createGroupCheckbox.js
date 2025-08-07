// js/ui/submenu/createGroupCheckbox.js
import { loadGroup, unloadGroup, updateGroupVisibility } from '../../modelLoader/index.js';

/**
 * Erstellt eine Checkbox für eine anatomische Hauptgruppe (z. B. muscles).
 * @param {string} group – Name der Gruppe
 * @returns {HTMLInputElement} – DOM-Element der Checkbox
 */
export function createGroupCheckbox(group) {
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
