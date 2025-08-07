// js/interaction/infoPanel.js
import * as THREE from 'three';
import { state } from '../state.js';
import { renderer } from '../renderer.js';
import { scene } from '../scene.js';
import { highlightModel } from './highlightModel.js';
import { buildEditPanel } from './editPanel.js';

export function showInfoPanel(meta, selectedModel) {
    const infoContent = document.getElementById('info-content');
    const infoPanel = document.getElementById('info-panel');
    const header = document.getElementById('info-header');

    if (!infoContent || !infoPanel || !header) {
        console.error('❌ InfoPanel DOM-Elemente fehlen');
        return;
    }

    // Panel sichtbar machen
    infoPanel.classList.remove('hidden');
    infoPanel.classList.add('visible');
    infoPanel.style.display = 'block';

    // Inhalte zurücksetzen
    infoContent.innerHTML = '';
    header.innerHTML = '';

    // === 🧠 Titelzeile ===
    const title = document.createElement('h3');
    title.textContent = meta.label;
    header.appendChild(title);

    const close = document.createElement('button');
    close.textContent = '✖';
    close.setAttribute('aria-label', 'Info schließen');
    close.addEventListener('click', hideInfoPanel);
    header.appendChild(close);

    // === 📄 Details ===
    const details = document.createElement('div');
    details.id = 'details-content';
    details.style.display = 'block';
    details.innerHTML = `
    ${meta.fma ? `<p><strong>FMA-ID:</strong> ${meta.fma}</p>` : ''}
    ${meta.group ? `<p><strong>Gruppe:</strong> ${meta.group}</p>` : ''}
    ${meta.subgroup ? `<p><strong>Subgruppe:</strong> ${meta.subgroup}</p>` : ''}
    ${meta.side ? `<p><strong>Seite:</strong> ${meta.side}</p>` : ''}
    ${meta.info?.origin ? `<p><strong>Ursprung:</strong> ${meta.info.origin}</p>` : ''}
    ${meta.info?.insertion ? `<p><strong>Ansatz:</strong> ${meta.info.insertion}</p>` : ''}
    ${meta.info?.function ? `<p><strong>Funktion:</strong> ${meta.info.function}</p>` : ''}
  `;
    infoContent.appendChild(details);



    const editDiv = document.createElement('div');
    infoContent.appendChild(editDiv);
    buildEditPanel(editDiv, selectedModel);


    // === 🔧 Editierfunktionen ===
    const colorInput = editDiv.querySelector('#edit-color');
    const opacitySlider = editDiv.querySelector('#edit-opacity');
    const toggleButton = editDiv.querySelector('#edit-toggle-visible');

    if (selectedModel) {
        selectedModel.traverse(child => {
            if (child.isMesh && child.material) {
                colorInput.value = '#' + child.material.color.getHexString();
                opacitySlider.value = child.material.opacity || 1;
                toggleButton.textContent = child.visible ? 'Verstecken' : 'Anzeigen';
            }
        });
    }

    colorInput.addEventListener('input', e => {
        const color = new THREE.Color(e.target.value);
        selectedModel.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.color.set(color);
                child.material.needsUpdate = true;
            }
        });
    });

    opacitySlider.addEventListener('input', e => {
        const opacity = parseFloat(e.target.value);
        selectedModel.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.transparent = opacity < 1;
                child.material.opacity = opacity;
                child.material.depthWrite = opacity >= 1;
                child.material.needsUpdate = true;
            }
        });
        renderer.render(scene, camera);
    });

    toggleButton.addEventListener('click', () => {
        selectedModel.visible = !selectedModel.visible;
        toggleButton.textContent = selectedModel.visible ? 'Verstecken' : 'Anzeigen';
    });
}

export function hideInfoPanel() {
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
        infoPanel.classList.add('hidden');
        infoPanel.classList.remove('visible');
    }

    const infoContent = document.getElementById('info-content');
    if (infoContent) {
        infoContent.innerHTML = '';
    }

    // 🧼 De-highlight beim Schließen
    if (state.currentlySelected) {
        state.currentlySelected.traverse(child => {
            if (child.isMesh && child.material?.emissive) {
                child.material.emissive.setHex(0x000000);
            }
        });
        state.currentlySelected = null;
    }
}
