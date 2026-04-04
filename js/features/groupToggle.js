
// groupToggle.js - ERWEITERTE VERSION
import { state, dispatch, StateActions } from '../store/state.js';
import { loadGroupByName } from './modelLoader-core.js';
import { scene } from '../core/scene.js';
import { disposeObject3D } from '../modelLoader/cleanup.js';
import { unregisterPickables } from './selection.js';




export async function toggleGroup(groupName) {
    const isLoaded = state.groups[groupName]?.length > 0;

    if (isLoaded) {
        // ENTLADEN
        console.log(`🔻 Entlade Gruppe "${groupName}"...`);

        const models = state.groups[groupName] || [];
        for (const model of models) {
            unregisterPickables(model);
            scene.remove(model);
            disposeObject3D(model);
        }

dispatch(StateActions.UNLOAD_GROUP, { group: groupName });
dispatch(StateActions.SET_GROUP_VISIBILITY, { 
    group: groupName,
    visible: false
});

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
        dispatch(StateActions.SET_GROUP_VISIBILITY, { 
group: groupName,
visible: true
});

        const btn = document.getElementById(`btn-load-${groupName}`);
        if (btn) {
            btn.style.backgroundColor = '#2a5a2a';
            btn.textContent = '✓ ' + groupName.charAt(0).toUpperCase() + groupName.slice(1) + ' ▼';
        }

        console.log(`✅ Gruppe "${groupName}" geladen`);
    }

    return !isLoaded;
}

export function setupGroupToggle() {
    const groups = [
        'bones', 'teeth', 'muscles', 'tendons', 'arteries',
        'brain', 'cartilage', 'ear', 'eyes', 'glands',
        'heart', 'ligaments', 'lungs', 'nerves', 'organs',
        'skin_hair', 'veins'
    ];

    groups.forEach(group => {
        const btn = document.getElementById(`btn-load-${group}`);
        if (!btn) return;
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => toggleGroup(group));
    });

    // ❌ Nichts mit loadedGroups initialisieren oder resetten
    // ❌ Kein resetGroupStates-Listener nötig
}

// Debug: „geladene“ Gruppen aus dem Store ableiten
export function getLoadedGroupsDebug() {
    return Object.keys(state.groups).filter(g => (state.groups[g]?.length ?? 0) > 0);
}