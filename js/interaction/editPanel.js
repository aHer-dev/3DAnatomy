// js/interaction/editPanel.js
import * as THREE from 'three';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { setModelColor, setModelOpacity } from '../features/appearance.js';
import { toggleModelVisibility, isModelVisible } from '../features/visibility.js';
import { state } from '../store/state.js';

/**
 * Baut die UI-Controls (Farbe, Transparenz, Sichtbarkeit) für das gewählte Modell.
 * @param {HTMLElement} container
 * @param {THREE.Object3D} selectedModel
 */
export function buildEditPanel(container, selectedModel) {
    if (!selectedModel || !container) {
        console.warn('buildEditPanel: Kein Modell oder Container angegeben');
        return;
    }

    container.innerHTML = `
    <label>Farbe:
      <input type="color" id="edit-color" />
    </label>
    <label>Transparenz:
      <input type="range" id="edit-opacity" min="0" max="1" step="0.01" value="1" />
    </label>
    <button id="edit-toggle-visible">Verstecken/Anzeigen</button>
    <button id="edit-add-to-set">Zum Set hinzufügen</button>
  `;

    const colorInput = container.querySelector('#edit-color');
    const opacitySlider = container.querySelector('#edit-opacity');
    const toggleButton = container.querySelector('#edit-toggle-visible');
    const addToSetButton = container.querySelector('#edit-add-to-set');

    // Initialwerte spiegeln
    let initialColor = '#ffffff';
    let initialOpacity = 1;
    let initialVisible = isModelVisible(selectedModel);

    selectedModel.traverse(child => {
        if (child.isMesh && child.material) {
            initialColor = '#' + child.material.color.getHexString();
            initialOpacity = child.material.opacity ?? 1;
        }
    });

    if (colorInput) colorInput.value = initialColor;
    if (opacitySlider) opacitySlider.value = initialOpacity;
    if (toggleButton) toggleButton.textContent = initialVisible ? 'Verstecken' : 'Anzeigen';

    // Farbe ändern
    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            const newColor = new THREE.Color(e.target.value);
            setModelColor(selectedModel, newColor);
            renderer.render(scene, camera);
        });
    }

    // Transparenz ändern
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            const opacity = parseFloat(e.target.value);
            setModelOpacity(selectedModel, opacity);
            renderer.render(scene, camera);
        });
    }

    // Sichtbarkeit umschalten
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            toggleModelVisibility(selectedModel);
            const nowVisible = isModelVisible(selectedModel);
            toggleButton.textContent = nowVisible ? 'Verstecken' : 'Anzeigen';
            renderer.render(scene, camera);
        });
    }

    // Zum Set hinzufügen (inkl. Zustände)
    if (addToSetButton) {
        // vorherige Listener entfernen, falls Panel mehrfach aufgebaut wird
        const freshBtn = addToSetButton.cloneNode(true);
        addToSetButton.replaceWith(freshBtn);

        freshBtn.addEventListener('click', () => {
            if (state.collection.some(item => item.model === selectedModel)) {
                console.warn('Modell bereits in der Sammlung.');
                return;
            }

            let currentColor = new THREE.Color(0xffffff);
            let currentOpacity = 1;
            const currentVisible = isModelVisible(selectedModel);

            selectedModel.traverse(child => {
                if (child.isMesh && child.material) {
                    currentColor = child.material.color.clone();
                    currentOpacity = child.material.opacity ?? 1;
                }
            });

            state.collection.push({
                model: selectedModel,
                meta: selectedModel.userData.meta,
                color: currentColor,
                opacity: currentOpacity,
                visible: currentVisible
            });

            console.log(`"${selectedModel.name}" zur Sammlung hinzugefügt.`);
        });
    }

    renderer.render(scene, camera);
}

// WICHTIG: KEIN weiterer Code außerhalb der Funktion!
