// /ui/setupGroupLoadEvents.js
import { loadGroup, unloadGroup, isGroupLoaded } from '../modelLoader/groups.js';

/**
 * Fügt allen Hauptgruppen-Buttons EventListener hinzu.
 */
export function setupGroupLoadEvents() {
    const groupsToHandle = ['bones', 'muscles', 'ligaments'];

    groupsToHandle.forEach(group => {
        const btn = document.getElementById(`btn-load-${group}`);
        if (!btn) {
            console.warn(`⚠️ Button für Gruppe ${group} nicht gefunden.`);
            return;
        }

        btn.addEventListener('click', async () => {
            const loaded = isGroupLoaded(group);
            if (loaded) {
                await unloadGroup(group);
                console.log(`🔻 Gruppe "${group}" entladen.`);
            } else {
                await loadGroup(group, null, true); // null für alle Subgruppen
                console.log(`🔺 Gruppe "${group}" geladen.`);
            }
        });
    });
}
