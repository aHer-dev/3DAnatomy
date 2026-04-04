// js/bootstrap/initGroupLoader.js - MIT TOGGLE-FUNKTIONALITÄT

import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';
import { loadModels } from '../features/modelLoader-core.js';
import { showLoadingBar, hideLoadingBar } from '../modelLoader/progress.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { controls } from '../core/controls.js';
import { state } from '../store/state.js';
import { disposeObject3D } from '../modelLoader/cleanup.js';
import { unregisterPickables } from '../features/selection.js';

/**
 * ✅ Button-Animation 
 */
function setButtonLoading(button, groupName, isLoading) {
    if (!button) return;

    console.log(`🎬 setButtonLoading: ${groupName}, loading: ${isLoading}`);

    if (isLoading) {
        button.disabled = true;
        button.style.setProperty('background', 'linear-gradient(135deg, #4A9EFF, #FF7A4A)');
        button.style.setProperty('color', 'white', 'important');
        button.style.opacity = '0.8';
        button.textContent = `⏳ Lade ${groupName}...`;
        console.log(`🟠 Button "${groupName}" auf Loading gesetzt`);
    } else {
        button.disabled = false;
        button.style.setProperty('background', 'linear-gradient(135deg, #4A9EFF, #FF7A4A)');
        button.style.setProperty('color', 'white', 'important');
        button.style.opacity = '1';
        button.textContent = `🟢 ${groupName.charAt(0).toUpperCase() + groupName.slice(1)} ▼`;
        console.log(`🟢 Button "${groupName}" auf Success gesetzt`);
    }
}

/**
 * ✅ Button für Entladen
 */
function setButtonUnloading(button, groupName) {
    if (!button) return;

    console.log(`🎬 setButtonUnloading: ${groupName}`);

    button.disabled = true;
    button.style.setProperty('background-color', '#ff5722', 'important'); // Orange-rot
    button.style.setProperty('color', 'white', 'important');
    button.style.opacity = '0.8';
    button.textContent = `🗑️ Entlade ${groupName}...`;
    console.log(`🟠 Button "${groupName}" auf Unloading gesetzt`);
}

/**
 * ✅ Button zurücksetzen (nicht geladen)
 */
function setButtonUnloaded(button, groupName) {
    if (!button) return;

    console.log(`🎬 setButtonUnloaded: ${groupName}`);

    button.disabled = false;
    button.style.removeProperty('background-color');
    button.style.removeProperty('color');
    button.style.opacity = '1';
    button.textContent = `${groupName.charAt(0).toUpperCase() + groupName.slice(1)} ▼`;
    console.log(`⚪ Button "${groupName}" zurückgesetzt`);
}

/**
 * ✅ Toast
 */
function showToast(message, type = 'loading') {
    const oldToast = document.getElementById('loading-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.id = 'loading-toast';
    toast.textContent = message;

    const colors = {
        loading: '#FF7A4A',
        success: '#4A9EFF',
        unloading: '#ff5722',
        unloaded: '#9e9e9e'
    };

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.loading};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;

    document.body.appendChild(toast);
    return toast;
}

function hideToast() {
    const toast = document.getElementById('loading-toast');
    if (toast) toast.remove();
}

/**
 * Gruppe entladen – ohne Button-Animation (für Toolbar)
 */
export async function unloadGroupSilent(groupName) {
    const models = state.groups[groupName] || [];
    if (!models.length) return;

    for (const model of models) {
        unregisterPickables(model);
        scene.remove(model);
        disposeObject3D(model);
    }
    state.groups[groupName] = [];
    state.groupStates[groupName] = false;
}

/**
 * ✅ GRUPPE ENTLADEN
 */
async function unloadGroupWithAnimation(groupName, button) {
    console.log(`🗑️ unloadGroupWithAnimation: ${groupName}`);

    if (button.disabled) {
        console.warn(`⚠️ Button ${groupName} ist bereits disabled`);
        return;
    }

    const models = state.groups[groupName] || [];
    if (models.length === 0) {
        console.log(`ℹ️ Gruppe ${groupName} ist bereits entladen`);
        return;
    }

    console.log(`🗑️ Entlade ${models.length} Modelle für "${groupName}"`);

    try {
        // ✅ ENTLADE-ANIMATION
        setButtonUnloading(button, groupName);
        showToast(`Entlade ${groupName} (${models.length} Modelle)...`, 'unloading');

        // Kurze Pause für Animation
        await new Promise(resolve => setTimeout(resolve, 200));

        // Modelle entladen
        for (const model of models) {
            unregisterPickables(model);
            scene.remove(model);
            disposeObject3D(model);
        }

        // State zurücksetzen
        state.groups[groupName] = [];
        state.groupStates[groupName] = false;

        console.log(`✅ "${groupName}" erfolgreich entladen`);

        // ✅ ENTLADE-ERFOLG
        setButtonUnloaded(button, groupName);
        hideToast();
        showToast(`${groupName} entladen!`, 'unloaded');

        setTimeout(() => hideToast(), 2000);

    } catch (err) {
        console.error(`❌ Fehler beim Entladen von "${groupName}":`, err);

        button.disabled = false;
        button.style.setProperty('background-color', '#d32f2f', 'important');
        button.style.setProperty('color', 'white', 'important');
        button.textContent = `❌ Fehler: ${groupName}`;

        hideToast();
        showToast(`Fehler beim Entladen von ${groupName}!`, 'unloading');

        setTimeout(() => {
            setButtonLoading(button, groupName, false); // Zurück zu "geladen"
            hideToast();
        }, 3000);
    }
}

/**
 * ✅ GRUPPE LADEN
 */
async function loadGroupWithAnimation(groupName, button) {
    console.log(`🚀 loadGroupWithAnimation: ${groupName}`);

    if (button.disabled) {
        console.warn(`⚠️ Button ${groupName} ist bereits disabled`);
        return;
    }

    const entries = state.groupedMeta?.[groupName] || [];
    if (!entries.length) {
        console.warn(`⚠️ Keine Modelle für "${groupName}" gefunden`);
        alert(`Keine Modelle für "${groupName}" verfügbar.`);
        return;
    }

    console.log(`📦 Lade ${entries.length} Modelle für "${groupName}"`);

    try {
        // ✅ LADE-ANIMATION
        setButtonLoading(button, groupName, true);
        showToast(`Lade ${groupName} (${entries.length} Modelle)...`, 'loading');

        // Kurze Pause für Animation
        await new Promise(resolve => setTimeout(resolve, 100));

        showLoadingBar();

        const loader = createGLTFLoader();
        await loadModels(
            entries,
            groupName,
            false,
            scene,
            loader,
            camera,
            controls,
            renderer
        );

        state.groupStates[groupName] = true;

        // ✅ FARBE ANWENDEN (wichtig!)
        const hex = state.colors?.[groupName] ??
            state.defaultSettings?.colors?.[groupName] ??
            state.defaultSettings?.colors?.default;

        if (hex != null) {
            const { updateModelColors } = await import('../modelLoader/color.js');
            updateModelColors(groupName, hex);
            console.log(`🎨 Farbe für "${groupName}" angewendet: 0x${hex.toString(16)}`);
        }

        console.log(`✅ "${groupName}" erfolgreich geladen`);

        // ✅ ERFOLGS-ANIMATION
        setButtonLoading(button, groupName, false);
        hideToast();
        showToast(`${groupName} erfolgreich geladen!`, 'success');

        setTimeout(() => hideToast(), 3000);

    } catch (err) {
        console.error(`❌ Fehler beim Laden von "${groupName}":`, err);

        button.disabled = false;
        button.style.setProperty('background-color', '#d32f2f', 'important');
        button.style.setProperty('color', 'white', 'important');
        button.textContent = `❌ Fehler: ${groupName}`;

        hideToast();
        showToast(`Fehler beim Laden von ${groupName}!`, 'loading');

        setTimeout(() => {
            setButtonUnloaded(button, groupName);
            hideToast();
        }, 5000);

        alert(`Fehler beim Laden von "${groupName}": ${err.message}`);
    } finally {
        hideLoadingBar();
    }
}

/**
 * ✅ TOGGLE-FUNKTION (Laden oder Entladen)
 */
async function toggleGroupWithAnimation(groupName, button) {
    console.log(`🔄 toggleGroupWithAnimation: ${groupName}`);

    // Prüfen ob Gruppe geladen ist
    const isLoaded = state.groups[groupName]?.length > 0;

    if (isLoaded) {
        console.log(`📤 Gruppe ${groupName} ist geladen → entladen`);
        await unloadGroupWithAnimation(groupName, button);
    } else {
        console.log(`📥 Gruppe ${groupName} ist nicht geladen → laden`);
        await loadGroupWithAnimation(groupName, button);
    }
}

/**
 * ✅ HAUPTFUNKTION: Event-Listener mit Toggle
 */
export function initDynamicGroupLoading() {
    const buttonGroups = [
        'bones', 'muscles', 'tendons', 'ligaments',
        'arteries', 'brain', 'cartilage', 'ear',
        'eyes', 'glands', 'heart', 'lungs',
        'nerves', 'organs', 'skin_hair', 'teeth', 'veins'
    ];

    console.log('🔗 Binde Gruppen-Buttons mit Toggle-Animation...');

    buttonGroups.forEach(groupName => {
        const btnId = `btn-load-${groupName}`;
        const btn = document.getElementById(btnId);

        if (!btn) {
            console.warn(`⚠️ Button nicht gefunden: ${btnId}`);
            return;
        }

        // ✅ ALLE bestehenden Event-Listener entfernen
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        console.log(`🧹 Event-Listener für ${btnId} zurückgesetzt`);

        // ✅ TOGGLE-Event-Listener hinzufügen
        newBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            console.log(`🖱️ TOGGLE-KLICK auf ${groupName}`);

            await toggleGroupWithAnimation(groupName, newBtn);
        });

        // ✅ INITIAL-STATUS setzen basierend auf bereits geladenen Gruppen
        const isCurrentlyLoaded = state.groups[groupName]?.length > 0;
        if (isCurrentlyLoaded) {
            setButtonLoading(newBtn, groupName, false); // Grün = geladen
            console.log(`📌 Button ${groupName} als bereits geladen markiert`);
        } else {
            setButtonUnloaded(newBtn, groupName); // Normal = nicht geladen
        }

        console.log(`✅ Toggle-Event-Listener gebunden: ${btnId}`);
    });

    console.log('🎬 Alle Buttons mit Toggle-Animation konfiguriert');

    // Debug-Funktionen
    if (typeof window !== 'undefined') {
        window.testToggle = async (groupName = 'muscles') => {
            const btn = document.getElementById(`btn-load-${groupName}`);
            if (btn) {
                console.log('🧪 Teste Toggle-Animation...');
                await toggleGroupWithAnimation(groupName, btn);
            }
        };

        window.testLoad = async (groupName = 'muscles') => {
            const btn = document.getElementById(`btn-load-${groupName}`);
            if (btn) {
                console.log('🧪 Teste Lade-Animation...');
                await loadGroupWithAnimation(groupName, btn);
            }
        };

        window.testUnload = async (groupName = 'muscles') => {
            const btn = document.getElementById(`btn-load-${groupName}`);
            if (btn) {
                console.log('🧪 Teste Entlade-Animation...');
                await unloadGroupWithAnimation(groupName, btn);
            }
        };

        console.log('🧪 Debug verfügbar:');
        console.log('  window.testToggle("muscles") - Toggle testen');
        console.log('  window.testLoad("muscles") - Laden testen');
        console.log('  window.testUnload("muscles") - Entladen testen');
    }
}