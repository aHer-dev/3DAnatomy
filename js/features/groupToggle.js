import { state } from '../store/state.js';
import { loadGroupByName } from './modelLoader-core.js';
import { scene } from '../core/scene.js';
import { disposeObject3D } from '../modelLoader/cleanup.js';
import { unregisterPickables } from './selection.js';

// Track welche Gruppen geladen sind
const loadedGroups = new Map();

export async function toggleGroup(groupName) {
    const isLoaded = loadedGroups.get(groupName) || false;

    if (isLoaded) {
        // ENTLADEN
        console.log(`🔻 Entlade Gruppe "${groupName}"...`);

        const models = state.groups[groupName] || [];
        for (const model of models) {
            // Pickables entfernen
            unregisterPickables(model);

            // Aus Szene entfernen
            scene.remove(model);

            // Speicher freigeben
            disposeObject3D(model);
        }

        // State aufräumen
        state.groups[groupName] = [];
        state.groupStates[groupName] = false;
        loadedGroups.set(groupName, false);

        // Button-Stil aktualisieren
        const btn = document.getElementById(`btn-load-${groupName}`);
        if (btn) {
            btn.style.backgroundColor = '';
            btn.textContent = groupName.charAt(0).toUpperCase() + groupName.slice(1) + ' ▼';
        }

        console.log(`✅ Gruppe "${groupName}" entladen`);

    } else {
        // LADEN
        console.log(`🔺 Lade Gruppe "${groupName}"...`);

        await loadGroupByName(groupName, { centerCamera: false });
        state.groupStates[groupName] = true;
        loadedGroups.set(groupName, true);

        // Button-Stil aktualisieren
        const btn = document.getElementById(`btn-load-${groupName}`);
        if (btn) {
            btn.style.backgroundColor = '#2a5a2a';
            btn.textContent = '✓ ' + groupName.charAt(0).toUpperCase() + groupName.slice(1) + ' ▼';
        }

        console.log(`✅ Gruppe "${groupName}" geladen`);
    }

    return !isLoaded;
}

// Event-Listener für alle Gruppen-Buttons
export function setupGroupToggle() {
    const groups = [
        'bones', 'teeth', 'muscles', 'tendons', 'arteries',
        'brain', 'cartilage', 'ear', 'eyes', 'glands',
        'heart', 'ligaments', 'lungs', 'nerves', 'organs',
        'skin_hair', 'veins'
    ];

    groups.forEach(group => {
        const btn = document.getElementById(`btn-load-${group}`);
        if (btn) {
            // Entferne alte Listener
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            // Neuer Toggle-Listener
            newBtn.addEventListener('click', () => toggleGroup(group));
        }
    });

    // Bones und Teeth als geladen markieren (da beim Start geladen)
    loadedGroups.set('bones', true);
    loadedGroups.set('teeth', true);
}