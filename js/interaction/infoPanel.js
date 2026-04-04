// infoPanel.js

import { state } from '../store/state.js';
import { dispatch, StateActions } from '../store/state.js';
import { getModelName, removeFromMultiSelect, clearMultiSelect, getMultiSelectedArray } from './multiSelect.js';

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function pickLabel(meta, order = ['de', 'en', 'la']) {
    const labels = meta?.labels || {};
    for (const k of order) {
        const v = (labels[k] || '').trim();
        if (v) return v;
    }
    return meta?.id || 'Unbekannt';
}

function readDescription(meta, order = ['de', 'en']) {
    const desc = meta?.info?.description || {};
    for (const k of order) {
        const v = (desc[k] || '').trim();
        if (v) return v;
    }
    return '';
}

// ─── Panel-Sichtbarkeit ──────────────────────────────────────────────────────

function _getPanel() { return document.getElementById('info-panel'); }
function _getContent() { return document.getElementById('info-content'); }

function _showPanel() {
    const p = _getPanel();
    if (p) { p.classList.remove('hidden'); p.classList.add('visible'); }
}

function _hidePanel() {
    const p = _getPanel();
    if (p) { p.classList.add('hidden'); p.classList.remove('visible'); p.classList.remove('info-panel--multi'); }
}

// ─── Swipe-down zum Schließen (Mobile) ───────────────────────────────────────

function _initSwipeToClose() {
    const panel = _getPanel();
    if (!panel || panel._swipeInitialized) return;
    panel._swipeInitialized = true;

    let startY = 0;
    let startTime = 0;

    panel.addEventListener('touchstart', e => {
        startY = e.touches[0].clientY;
        startTime = Date.now();
        panel.style.transition = 'none';
    }, { passive: true });

    panel.addEventListener('touchmove', e => {
        const dy = e.touches[0].clientY - startY;
        if (dy > 0) panel.style.transform = `translateY(${dy}px)`;
    }, { passive: true });

    panel.addEventListener('touchend', e => {
        const dy = e.changedTouches[0].clientY - startY;
        const dt = Date.now() - startTime;
        panel.style.transition = '';
        panel.style.transform = '';

        // Schließen wenn > 80px nach unten oder schneller Swipe (>80px/s)
        if (dy > 80 || (dy > 30 && dy / dt > 0.4)) {
            hideInfoPanel();
        }
    }, { passive: true });
}

// ─── Einzelauswahl ───────────────────────────────────────────────────────────

export function showInfoPanel(meta, selectedModel) {
    if (!meta && selectedModel?.userData?.meta) meta = selectedModel.userData.meta;
    if (!meta) {
        console.warn('Info-Panel: Kein Meta – Panel wird nicht gezeigt.');
        return;
    }

    const infoContent = _getContent();
    if (!infoContent) return;
    infoContent.innerHTML = '';

    // Titel
    const title = document.createElement('h3');
    title.textContent = pickLabel(meta, ['de', 'en', 'la']);
    infoContent.appendChild(title);

    // Latein
    const latin = (meta?.labels?.la || '').trim();
    if (latin) {
        const laLine = document.createElement('div');
        laLine.setAttribute('lang', 'la');
        laLine.style.cssText = 'font-style:italic;opacity:0.9;margin-top:-4px;';
        laLine.textContent = latin;
        infoContent.appendChild(laLine);
    }

    // Beschreibung
    const descText = readDescription(meta, ['de', 'en']);
    if (descText) {
        const details = document.createElement('p');
        details.textContent = descText;
        infoContent.appendChild(details);
    }

    // Edit-Controls
    const editDiv = document.createElement('div');
    editDiv.id = 'edit-controls';
    infoContent.appendChild(editDiv);

    try {
        import('./editPanel.js').then(({ buildEditPanel }) => {
            buildEditPanel?.(editDiv, selectedModel);
        }).catch(() => {});
    } catch (e) {}

    _showPanel();
    _initSwipeToClose();
}

// ─── Mehrfachauswahl ─────────────────────────────────────────────────────────

const _isMobile = () => window.innerWidth <= 768;

export function showMultiSelectPanel(models) {
    const infoContent = _getContent();
    if (!infoContent) return;
    infoContent.innerHTML = '';

    function rebuildPanel() {
        const current = getMultiSelectedArray();
        if (current.length === 0) { hideInfoPanel(); return; }
        showMultiSelectPanel(current);
    }

    if (_isMobile()) {
        _showMultiSelectMobile(infoContent, models, rebuildPanel);
    } else {
        _showMultiSelectDesktop(infoContent, models, rebuildPanel);
    }

    _getPanel()?.classList.toggle('info-panel--multi', _isMobile());
    _showPanel();
}

function _showMultiSelectMobile(infoContent, models, rebuildPanel) {
    // Nur Anzahl + 3 kompakte Buttons
    const header = document.createElement('div');
    header.className = 'multi-select-header';
    header.textContent = `${models.length} ausgewählt`;
    infoContent.appendChild(header);

    const editDiv = document.createElement('div');
    editDiv.id = 'edit-controls';
    infoContent.appendChild(editDiv);

    import('./editPanel.js').then(({ buildMultiEditPanel }) => {
        buildMultiEditPanel?.(editDiv, models, rebuildPanel);
        // Farbe + Transparenz auf Mobile verstecken
        editDiv.querySelectorAll('.multi-edit-row').forEach(el => el.style.display = 'none');
    }).catch(() => {});
}

function _showMultiSelectDesktop(infoContent, models, rebuildPanel) {
    const header = document.createElement('div');
    header.className = 'multi-select-header';
    header.textContent = `Mehrfachauswahl (${models.length})`;
    infoContent.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'multi-select-list';

    for (const model of models) {
        const li = document.createElement('li');
        li.className = 'multi-select-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'multi-select-item-name';
        nameSpan.textContent = getModelName(model);
        nameSpan.title = getModelName(model);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'multi-select-item-remove';
        removeBtn.textContent = '×';
        removeBtn.title = 'Aus Auswahl entfernen';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromMultiSelect(model);
            rebuildPanel();
        });

        li.appendChild(nameSpan);
        li.appendChild(removeBtn);
        list.appendChild(li);
    }
    infoContent.appendChild(list);

    const editDiv = document.createElement('div');
    editDiv.id = 'edit-controls';
    infoContent.appendChild(editDiv);

    import('./editPanel.js').then(({ buildMultiEditPanel }) => {
        buildMultiEditPanel?.(editDiv, models, rebuildPanel);
    }).catch(() => {});
}

// ─── Panel schließen ─────────────────────────────────────────────────────────

export function hideInfoPanel() {
    const infoContent = _getContent();

    _hidePanel();
    if (infoContent) infoContent.innerHTML = '';

    // Highlight Einzelauswahl zurücksetzen
    const root = state.selected?.root ?? null;
    if (root) {
        root.traverse(child => {
            if (child.isMesh && child.material?.emissive) {
                child.material.emissive.setHex(0x000000);
            }
        });
        dispatch(StateActions.CLEAR_SELECTION, {});
    }

    // currentlySelected zurücksetzen
    if (state.selected) state.selected.root = null;
}
