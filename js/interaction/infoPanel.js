// infoPanel.js
import * as THREE from 'three';
import { state } from '../store/state.js';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { buildEditPanel } from './editPanel.js';
import { setModelColor, setModelOpacity } from '../features/appearance.js';

export function showInfoPanel(meta, selectedModel) {
    const infoPanel = document.getElementById('info-panel');
    const infoContent = document.getElementById('info-content');

    if (!infoPanel || !infoContent) {
        console.error('❌ Info-Panel oder Info-Content nicht gefunden:', {
            infoPanel: !!infoPanel,
            infoContent: !!infoContent,
        });
        return;
    }

    infoContent.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = meta.labels?.en || meta.id || 'Unbekannt';
    infoContent.appendChild(title);

    const details = document.createElement('p');
    details.textContent = meta.description || 'Keine Beschreibung verfügbar.';
    infoContent.appendChild(details);

    const editDiv = document.createElement('div');
    editDiv.id = 'edit-controls';
    infoContent.appendChild(editDiv);
    buildEditPanel(editDiv, selectedModel);  // Hier werden Initialwerte + Listener gesetzt

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

    if (state.currentlySelected) {
        state.currentlySelected.traverse(child => {
            if (child.isMesh && child.material?.emissive) {
                child.material.emissive.setHex(0x000000);
            }
        });
        state.currentlySelected = null;
    }
}