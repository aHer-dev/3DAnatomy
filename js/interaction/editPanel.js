// js/interaction/editPanel.js
import * as THREE from 'three';
import { renderer } from '../renderer.js';
import { scene } from '../scene.js';

/**
 * Erstellt und bindet den Editierbereich für ein ausgewähltes Modell
 * @param {HTMLElement} container – DOM-Element, in das editiert wird
 * @param {THREE.Object3D} selectedModel – aktuell ausgewähltes Modell
 */
export function buildEditPanel(container, selectedModel) {
    if (!selectedModel || !container) return;

    container.innerHTML = `
    <label>Farbe: <input type="color" id="edit-color" /></label>
    <label>Transparenz: <input type="range" id="edit-opacity" min="0" max="1" step="0.01" value="1" /></label>
    <button id="edit-toggle-visible">Verstecken/Anzeigen</button>
  `;

    const colorInput = container.querySelector('#edit-color');
    const opacitySlider = container.querySelector('#edit-opacity');
    const toggleButton = container.querySelector('#edit-toggle-visible');

    selectedModel.traverse(child => {
        if (child.isMesh && child.material) {
            colorInput.value = '#' + child.material.color.getHexString();
            opacitySlider.value = child.material.opacity ?? 1;
            toggleButton.textContent = child.visible ? 'Verstecken' : 'Anzeigen';
        }
    });

    colorInput.addEventListener('input', e => {
        const newColor = new THREE.Color(e.target.value);
        selectedModel.traverse(child => {
            if (child.isMesh && child.material) {
                setModelColor(selectedModel, newColor);
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
