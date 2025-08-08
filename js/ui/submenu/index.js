import { getMeta } from '../../utils/index.js';
// Richtig (innerhalb js/ui/submenu/index.js)
import { createGroupBlock } from './createGroupBlock.js';


import { state } from '../../store/state.js';

/**
 * Initialisiert das dynamische Submenü (nur optionale Gruppen)
 */
export async function setupSubmenuUI() {
    const container = document.getElementById('submenu-container');
    if (!container) {
        console.warn('⚠️ Kein Container mit ID "submenu-container" gefunden.');
        return;
    }

    const meta = await getMeta();
    const hiddenGroups = ['bones', 'teeth', 'muscles', 'ligaments'];
    const submenuGroups = state.availableGroups.filter(
        g => !hiddenGroups.includes(g)
    );

    submenuGroups.forEach(group => {
        const block = createGroupBlock(group, meta);
        container.appendChild(block);
    });

    console.log('📦 Submenü aufgebaut für Gruppen:', submenuGroups);
}
