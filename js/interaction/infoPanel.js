// infoPanel.js

import { state } from '../store/state.js';
import { dispatch, StateActions } from '../store/state.js';



function pickLabel(meta, order = ['de', 'en', 'la']) {
    // Wählt das erste nicht-leere Label gemäß Reihenfolge
    const labels = meta?.labels || {};
    for (const k of order) {
        const v = (labels[k] || '').trim();
        if (v) return v;
    }
    return meta?.id || 'Unbekannt';
}

function readDescription(meta, order = ['de', 'en']) {
    // Liest Beschreibung aus meta.info.description.{de|en}
    const desc = meta?.info?.description || {};
    for (const k of order) {
        const v = (desc[k] || '').trim();
        if (v) return v;
    }
    return '';
}

export function showInfoPanel(meta, selectedModel) {
    // 1) Fallback: Meta vom Modell holen, falls nicht übergeben
    if (!meta && selectedModel?.userData?.meta) {
        meta = selectedModel.userData.meta;
    }
    if (!meta) {
        console.warn('Info-Panel: Kein Meta für Auswahl – Panel wird nicht gezeigt.');
        return;
    }

    // 2) DOM-Elemente sichern
    const infoPanel = document.getElementById('info-panel');
    const infoContent = document.getElementById('info-content');
    if (!infoPanel || !infoContent) {
        console.error('❌ Info-Panel oder Info-Content nicht gefunden.');
        return;
    }
    infoContent.innerHTML = '';

    // 3) Titel (bevorzugt DE → EN → LA); klarer Haupttitel
    const title = document.createElement('h3');
    title.textContent = pickLabel(meta, ['de', 'en', 'la']); // kannst du bei Bedarf auf ['la','de','en'] umstellen
    infoContent.appendChild(title);

    // 4) Latein separat & dezent (kursiv) anzeigen, wenn vorhanden
    const latin = (meta?.labels?.la || '').trim();
    if (latin) {
        const laLine = document.createElement('div');
        laLine.setAttribute('lang', 'la');
        laLine.style.fontStyle = 'italic';
        laLine.style.opacity = '0.9';
        laLine.style.marginTop = '-4px';
        laLine.textContent = latin;
        infoContent.appendChild(laLine);
    }

    // 5) Beschreibung aus der richtigen Quelle holen (meta.info.description.{de|en})
    const descText = readDescription(meta, ['de', 'en']);
    const details = document.createElement('p');
    infoContent.appendChild(details);

    // 6) Optional: Edit-/Appearance-Controls weiterverwenden (dein bestehender Code)
    const editDiv = document.createElement('div');
    editDiv.id = 'edit-controls';
    infoContent.appendChild(editDiv);

    // Falls du diese Funktion im Modul hast:
    try {
        // lazy import, damit diese Datei unabhängig bleibt, wenn editPanel nicht existiert
        import('./editPanel.js').then(({ buildEditPanel }) => {
            buildEditPanel?.(editDiv, selectedModel);
        }).catch(() => {/* still & safe */ });
    } catch (e) { /* no-op */ }

    // 7) Panel sichtbar
    infoPanel.classList.remove('hidden');
    infoPanel.classList.add('visible');
}

export function hideInfoPanel() {
    const infoPanel = document.getElementById('info-panel');
    const infoContent = document.getElementById('info-content');

    if (infoPanel) {
        infoPanel.classList.add('hidden');
        infoPanel.classList.remove('visible');
    }
    if (infoContent) {
        infoContent.innerHTML = '';
    }

    // ✨ neu: null-sicher lesen
    const root = state.selected?.root ?? null;
    if (root) {
        root.traverse(child => {
            if (child.isMesh && child.material?.emissive) {
                child.material.emissive.setHex(0x000000);
            }
        });
        // ✨ neu: sauber über Action zurücksetzen
        dispatch(StateActions.CLEAR_SELECTION, {});
    }
}