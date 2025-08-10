// js/interaction/editPanel.js
import * as THREE from 'three';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { setModelColor, setModelOpacity } from '../features/appearance.js';
import { toggleModelVisibility, isModelVisible } from '../features/visibility.js';
import { state } from '../store/state.js';



// WeakMap zur Speicherung von Event-Listenern
const listeners = new WeakMap();

/**
 * Entfernt alle vorhandenen Event-Listener für ein Element
 * @param {HTMLElement} element 
 */
function removeElementListeners(element) {
    const handler = listeners.get(element);
    if (handler) {
        element.removeEventListener('input', handler.input);
        element.removeEventListener('click', handler.click);
        listeners.delete(element);
    }
}

/**
 * Baut die UI-Controls für das ausgewählte Modell
 * @param {HTMLElement} container 
 * @param {THREE.Object3D} selectedModel 
 */
export function buildEditPanel(container, selectedModel) {
    if (!selectedModel || !container) {
        console.warn('buildEditPanel: Kein Modell oder Container angegeben');
        return;
    }

    // Vorherige Listener bereinigen
    container.querySelectorAll('input, button').forEach(removeElementListeners);

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

    if (colorInput) {
        colorInput.value = initialColor;
        const colorHandler = (e) => {
            const newColor = new THREE.Color(e.target.value);
            setModelColor(selectedModel, newColor);
            renderer.render(scene, camera);
        };
        colorInput.addEventListener('input', colorHandler);
        listeners.set(colorInput, { input: colorHandler });
    }

    if (opacitySlider) {
        opacitySlider.value = initialOpacity;
        const opacityHandler = (e) => {
            const opacity = parseFloat(e.target.value);
            setModelOpacity(selectedModel, opacity);
            renderer.render(scene, camera);
        };
        opacitySlider.addEventListener('input', opacityHandler);
        listeners.set(opacitySlider, { input: opacityHandler });
    }

    if (toggleButton) {
        toggleButton.textContent = initialVisible ? 'Verstecken' : 'Anzeigen';
        const toggleHandler = () => {
            toggleModelVisibility(selectedModel);
            const nowVisible = isModelVisible(selectedModel);
            toggleButton.textContent = nowVisible ? 'Verstecken' : 'Anzeigen';
            renderer.render(scene, camera);
        };
        toggleButton.addEventListener('click', toggleHandler);
        listeners.set(toggleButton, { click: toggleHandler });
    }

    if (addToSetButton) {
        const addToSetHandler = () => {
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
        };
        addToSetButton.addEventListener('click', addToSetHandler);
        listeners.set(addToSetButton, { click: addToSetHandler });
    }

    renderer.render(scene, camera);
}

/**
 * Bereinigt alle Event-Listener im Edit-Panel
 * @param {HTMLElement} container 
 */
export function cleanupEditPanel(container) {
    if (!container) return;

    container.querySelectorAll('input, button').forEach(removeElementListeners);
    container.innerHTML = ''; // Optional: Container leeren
}

// WICHTIG: KEIN weiterer Code außerhalb der Funktion!
